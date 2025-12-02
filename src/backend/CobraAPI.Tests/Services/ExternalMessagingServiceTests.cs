using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;
using CobraAPI.Tools.Chat.ExternalPlatforms;

namespace CobraAPI.Tests.Services;

/// <summary>
/// Unit tests for ExternalMessagingService
/// Tests external channel management, webhook processing, and outbound messaging
/// </summary>
public class ExternalMessagingServiceTests : IDisposable
{
    private readonly CobraDbContext _context;
    private readonly Mock<IGroupMeApiClient> _mockGroupMeClient;
    private readonly Mock<IChatHubService> _mockChatHubService;
    private readonly Mock<IHttpContextAccessor> _mockHttpContextAccessor;
    private readonly Mock<ILogger<ExternalMessagingService>> _mockLogger;
    private readonly Mock<IServiceProvider> _mockServiceProvider;
    private readonly ExternalMessagingService _service;
    private readonly UserContext _testUser;

    // Test IDs
    private static readonly Guid TestEventId = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
    private static readonly Guid TestMappingId = Guid.Parse("cccccccc-cccc-cccc-cccc-cccccccccccc");

    public ExternalMessagingServiceTests()
    {
        _context = TestDbContextFactory.CreateInMemoryContext();
        _mockGroupMeClient = new Mock<IGroupMeApiClient>();
        _mockChatHubService = new Mock<IChatHubService>();
        _mockHttpContextAccessor = new Mock<IHttpContextAccessor>();
        _mockLogger = new Mock<ILogger<ExternalMessagingService>>();
        _mockServiceProvider = new Mock<IServiceProvider>();

        _testUser = TestUserContextFactory.CreateTestUser();

        // Setup HttpContext to return the test user
        var httpContext = new DefaultHttpContext();
        httpContext.Items["UserContext"] = _testUser;
        _mockHttpContextAccessor.Setup(x => x.HttpContext).Returns(httpContext);

        _service = new ExternalMessagingService(
            _context,
            _mockGroupMeClient.Object,
            _mockChatHubService.Object,
            _mockHttpContextAccessor.Object,
            _mockLogger.Object,
            _mockServiceProvider.Object);
    }

    public void Dispose()
    {
        _context.Dispose();
    }

    #region CreateExternalChannelAsync Tests

    [Fact]
    public async Task CreateExternalChannelAsync_CreatesGroupMeGroup_AndBot()
    {
        // Arrange
        await SeedEvent();

        _mockGroupMeClient
            .Setup(x => x.CreateGroupAsync(It.IsAny<string>()))
            .ReturnsAsync(new GroupMeGroup { GroupId = "gm-group-123", ShareUrl = "https://groupme.com/join/abc" });

        _mockGroupMeClient
            .Setup(x => x.CreateBotAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<Guid>()))
            .ReturnsAsync(new GroupMeBot { BotId = "bot-456" });

        var request = new CreateExternalChannelRequest
        {
            EventId = TestEventId,
            Platform = ExternalPlatform.GroupMe
        };

        // Act
        var result = await _service.CreateExternalChannelAsync(request);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(TestEventId, result.EventId);
        Assert.Equal(ExternalPlatform.GroupMe, result.Platform);
        Assert.Equal("GroupMe", result.PlatformName);
        Assert.Equal("gm-group-123", result.ExternalGroupId);
        Assert.True(result.IsActive);
        Assert.Contains("COBRA:", result.ExternalGroupName);
    }

    [Fact]
    public async Task CreateExternalChannelAsync_UsesCustomGroupName_WhenProvided()
    {
        // Arrange
        await SeedEvent();

        _mockGroupMeClient
            .Setup(x => x.CreateGroupAsync(It.IsAny<string>()))
            .ReturnsAsync(new GroupMeGroup { GroupId = "gm-group-123" });

        _mockGroupMeClient
            .Setup(x => x.CreateBotAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<Guid>()))
            .ReturnsAsync(new GroupMeBot { BotId = "bot-456" });

        var request = new CreateExternalChannelRequest
        {
            EventId = TestEventId,
            Platform = ExternalPlatform.GroupMe,
            CustomGroupName = "My Custom Group"
        };

        // Act
        var result = await _service.CreateExternalChannelAsync(request);

        // Assert
        Assert.Equal("My Custom Group", result.ExternalGroupName);

        _mockGroupMeClient.Verify(
            x => x.CreateGroupAsync("My Custom Group"),
            Times.Once);
    }

    [Fact]
    public async Task CreateExternalChannelAsync_PersistsMapping_ToDatabase()
    {
        // Arrange
        await SeedEvent();

        _mockGroupMeClient
            .Setup(x => x.CreateGroupAsync(It.IsAny<string>()))
            .ReturnsAsync(new GroupMeGroup { GroupId = "gm-group-123", ShareUrl = "https://share.url" });

        _mockGroupMeClient
            .Setup(x => x.CreateBotAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<Guid>()))
            .ReturnsAsync(new GroupMeBot { BotId = "bot-456" });

        var request = new CreateExternalChannelRequest
        {
            EventId = TestEventId,
            Platform = ExternalPlatform.GroupMe
        };

        // Act
        var result = await _service.CreateExternalChannelAsync(request);

        // Assert
        var dbMapping = await _context.ExternalChannelMappings.FindAsync(result.Id);
        Assert.NotNull(dbMapping);
        Assert.Equal("gm-group-123", dbMapping.ExternalGroupId);
        Assert.Equal("bot-456", dbMapping.BotId);
        Assert.NotEmpty(dbMapping.WebhookSecret);
        Assert.Equal(_testUser.Email, dbMapping.CreatedBy);
    }

    [Fact]
    public async Task CreateExternalChannelAsync_BroadcastsChannelConnected()
    {
        // Arrange
        await SeedEvent();

        _mockGroupMeClient
            .Setup(x => x.CreateGroupAsync(It.IsAny<string>()))
            .ReturnsAsync(new GroupMeGroup { GroupId = "gm-group-123" });

        _mockGroupMeClient
            .Setup(x => x.CreateBotAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<Guid>()))
            .ReturnsAsync(new GroupMeBot { BotId = "bot-456" });

        var request = new CreateExternalChannelRequest
        {
            EventId = TestEventId,
            Platform = ExternalPlatform.GroupMe
        };

        // Act
        await _service.CreateExternalChannelAsync(request);

        // Assert
        _mockChatHubService.Verify(
            x => x.BroadcastChannelConnectedAsync(
                TestEventId,
                It.Is<ExternalChannelMappingDto>(dto => dto.Platform == ExternalPlatform.GroupMe)),
            Times.Once);
    }

    [Fact]
    public async Task CreateExternalChannelAsync_ThrowsKeyNotFoundException_WhenEventNotFound()
    {
        // Arrange - no event seeded

        var request = new CreateExternalChannelRequest
        {
            EventId = Guid.NewGuid(),
            Platform = ExternalPlatform.GroupMe
        };

        // Act & Assert
        await Assert.ThrowsAsync<KeyNotFoundException>(
            () => _service.CreateExternalChannelAsync(request));
    }

    [Fact]
    public async Task CreateExternalChannelAsync_ThrowsUnauthorized_WhenNoUserContext()
    {
        // Arrange
        _mockHttpContextAccessor.Setup(x => x.HttpContext).Returns((HttpContext?)null);

        var request = new CreateExternalChannelRequest
        {
            EventId = TestEventId,
            Platform = ExternalPlatform.GroupMe
        };

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _service.CreateExternalChannelAsync(request));
    }

    #endregion

    #region GetEventChannelMappingsAsync Tests

    [Fact]
    public async Task GetEventChannelMappingsAsync_ReturnsActiveMappings()
    {
        // Arrange
        await SeedEventWithChannelMapping();

        // Act
        var result = await _service.GetEventChannelMappingsAsync(TestEventId);

        // Assert
        Assert.Single(result);
        Assert.Equal(TestMappingId, result[0].Id);
        Assert.Equal(TestEventId, result[0].EventId);
        Assert.Equal(ExternalPlatform.GroupMe, result[0].Platform);
        Assert.True(result[0].IsActive);
    }

    [Fact]
    public async Task GetEventChannelMappingsAsync_ExcludesInactiveMappings()
    {
        // Arrange
        await SeedEventWithChannelMapping(isActive: false);

        // Act
        var result = await _service.GetEventChannelMappingsAsync(TestEventId);

        // Assert
        Assert.Empty(result);
    }

    [Fact]
    public async Task GetEventChannelMappingsAsync_ReturnsEmptyList_WhenNoMappings()
    {
        // Arrange
        await SeedEvent();

        // Act
        var result = await _service.GetEventChannelMappingsAsync(TestEventId);

        // Assert
        Assert.Empty(result);
    }

    [Fact]
    public async Task GetEventChannelMappingsAsync_ReturnsOnlyMappingsForSpecifiedEvent()
    {
        // Arrange
        await SeedEventWithChannelMapping();

        // Add another event with its own mapping
        var otherEventId = Guid.NewGuid();
        _context.Events.Add(new Event
        {
            Id = otherEventId,
            Name = "Other Event",
            IsActive = true,
            CreatedBy = "test@test.com"
        });
        _context.ExternalChannelMappings.Add(new ExternalChannelMapping
        {
            Id = Guid.NewGuid(),
            EventId = otherEventId,
            Platform = ExternalPlatform.GroupMe,
            ExternalGroupId = "other-group",
            ExternalGroupName = "Other Group",
            BotId = "other-bot",
            WebhookSecret = "secret",
            IsActive = true,
            CreatedBy = "test@test.com"
        });
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetEventChannelMappingsAsync(TestEventId);

        // Assert
        Assert.Single(result);
        Assert.Equal(TestEventId, result[0].EventId);
    }

    #endregion

    #region DeactivateChannelAsync Tests

    [Fact]
    public async Task DeactivateChannelAsync_SetsIsActiveToFalse()
    {
        // Arrange
        await SeedEventWithChannelMapping();

        // Act
        await _service.DeactivateChannelAsync(TestMappingId);

        // Assert
        var mapping = await _context.ExternalChannelMappings.FindAsync(TestMappingId);
        Assert.NotNull(mapping);
        Assert.False(mapping.IsActive);
        Assert.Equal(_testUser.Email, mapping.LastModifiedBy);
        Assert.NotNull(mapping.LastModifiedAt);
    }

    [Fact]
    public async Task DeactivateChannelAsync_BroadcastsChannelDisconnected()
    {
        // Arrange
        await SeedEventWithChannelMapping();

        // Act
        await _service.DeactivateChannelAsync(TestMappingId);

        // Assert
        _mockChatHubService.Verify(
            x => x.BroadcastChannelDisconnectedAsync(TestEventId, TestMappingId),
            Times.Once);
    }

    [Fact]
    public async Task DeactivateChannelAsync_ArchivesExternalGroup_WhenRequested()
    {
        // Arrange
        await SeedEventWithChannelMapping();

        // Act
        await _service.DeactivateChannelAsync(TestMappingId, archiveExternalGroup: true);

        // Assert
        _mockGroupMeClient.Verify(x => x.DestroyBotAsync("bot-123"), Times.Once);
        _mockGroupMeClient.Verify(x => x.ArchiveGroupAsync("gm-group-123"), Times.Once);
    }

    [Fact]
    public async Task DeactivateChannelAsync_DoesNotArchiveExternalGroup_ByDefault()
    {
        // Arrange
        await SeedEventWithChannelMapping();

        // Act
        await _service.DeactivateChannelAsync(TestMappingId);

        // Assert
        _mockGroupMeClient.Verify(x => x.DestroyBotAsync(It.IsAny<string>()), Times.Never);
        _mockGroupMeClient.Verify(x => x.ArchiveGroupAsync(It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task DeactivateChannelAsync_ThrowsKeyNotFoundException_WhenMappingNotFound()
    {
        // Arrange - no mapping seeded

        // Act & Assert
        await Assert.ThrowsAsync<KeyNotFoundException>(
            () => _service.DeactivateChannelAsync(Guid.NewGuid()));
    }

    #endregion

    #region ProcessGroupMeWebhookAsync Tests

    [Fact]
    public async Task ProcessGroupMeWebhookAsync_IgnoresBotMessages()
    {
        // Arrange
        await SeedEventWithChannelMappingAndChatThread();

        var payload = new GroupMeWebhookPayload
        {
            GroupId = "gm-group-123",
            MessageId = "msg-123",
            SenderType = "bot", // Bot message
            SenderName = "COBRA",
            Text = "Test"
        };

        // Act
        await _service.ProcessGroupMeWebhookAsync(TestMappingId, payload);

        // Assert - No message should be created
        Assert.Empty(_context.ChatMessages);
    }

    [Fact]
    public async Task ProcessGroupMeWebhookAsync_IgnoresDuplicateMessages()
    {
        // Arrange
        var threadId = await SeedEventWithChannelMappingAndChatThread();

        // Add an existing message with the same external ID
        _context.ChatMessages.Add(new ChatMessage
        {
            Id = Guid.NewGuid(),
            ChatThreadId = threadId,
            Message = "Existing message",
            SenderDisplayName = "User",
            IsActive = true,
            CreatedBy = "system",
            ExternalMessageId = "msg-123"
        });
        await _context.SaveChangesAsync();

        var payload = new GroupMeWebhookPayload
        {
            GroupId = "gm-group-123",
            MessageId = "msg-123", // Same ID
            SenderType = "user",
            SenderName = "User",
            Text = "Duplicate"
        };

        // Act
        await _service.ProcessGroupMeWebhookAsync(TestMappingId, payload);

        // Assert - Only one message should exist
        Assert.Single(_context.ChatMessages);
    }

    [Fact]
    public async Task ProcessGroupMeWebhookAsync_ValidatesGroupId()
    {
        // Arrange
        await SeedEventWithChannelMappingAndChatThread();

        var payload = new GroupMeWebhookPayload
        {
            GroupId = "wrong-group-id", // Different from mapping's group
            MessageId = "msg-123",
            SenderType = "user",
            SenderName = "User",
            Text = "Test"
        };

        // Act
        await _service.ProcessGroupMeWebhookAsync(TestMappingId, payload);

        // Assert - No message should be created
        Assert.Empty(_context.ChatMessages);
    }

    [Fact]
    public async Task ProcessGroupMeWebhookAsync_IgnoresInactiveMappings()
    {
        // Arrange
        var threadId = await SeedEventWithChannelMappingAndChatThread(mappingIsActive: false);

        var payload = new GroupMeWebhookPayload
        {
            GroupId = "gm-group-123",
            MessageId = "msg-123",
            SenderType = "user",
            SenderName = "User",
            Text = "Test"
        };

        // Act
        await _service.ProcessGroupMeWebhookAsync(TestMappingId, payload);

        // Assert - No message should be created
        Assert.Empty(_context.ChatMessages);
    }

    #endregion

    #region BroadcastToExternalChannelsAsync Tests

    [Fact]
    public async Task BroadcastToExternalChannelsAsync_SendsToAllActiveChannels()
    {
        // Arrange
        await SeedEvent();

        // Add multiple active channels
        _context.ExternalChannelMappings.Add(new ExternalChannelMapping
        {
            Id = Guid.NewGuid(),
            EventId = TestEventId,
            Platform = ExternalPlatform.GroupMe,
            ExternalGroupId = "group-1",
            ExternalGroupName = "Group 1",
            BotId = "bot-1",
            WebhookSecret = "secret",
            IsActive = true,
            CreatedBy = "test@test.com"
        });
        _context.ExternalChannelMappings.Add(new ExternalChannelMapping
        {
            Id = Guid.NewGuid(),
            EventId = TestEventId,
            Platform = ExternalPlatform.GroupMe,
            ExternalGroupId = "group-2",
            ExternalGroupName = "Group 2",
            BotId = "bot-2",
            WebhookSecret = "secret",
            IsActive = true,
            CreatedBy = "test@test.com"
        });
        await _context.SaveChangesAsync();

        // Act
        await _service.BroadcastToExternalChannelsAsync(TestEventId, "John Doe", "Hello!");

        // Assert
        _mockGroupMeClient.Verify(
            x => x.PostBotMessageAsync("bot-1", "[John Doe] Hello!"),
            Times.Once);
        _mockGroupMeClient.Verify(
            x => x.PostBotMessageAsync("bot-2", "[John Doe] Hello!"),
            Times.Once);
    }

    [Fact]
    public async Task BroadcastToExternalChannelsAsync_ExcludesInactiveChannels()
    {
        // Arrange
        await SeedEvent();

        // Add one active and one inactive channel
        _context.ExternalChannelMappings.Add(new ExternalChannelMapping
        {
            Id = Guid.NewGuid(),
            EventId = TestEventId,
            Platform = ExternalPlatform.GroupMe,
            ExternalGroupId = "group-1",
            ExternalGroupName = "Active Group",
            BotId = "bot-active",
            WebhookSecret = "secret",
            IsActive = true,
            CreatedBy = "test@test.com"
        });
        _context.ExternalChannelMappings.Add(new ExternalChannelMapping
        {
            Id = Guid.NewGuid(),
            EventId = TestEventId,
            Platform = ExternalPlatform.GroupMe,
            ExternalGroupId = "group-2",
            ExternalGroupName = "Inactive Group",
            BotId = "bot-inactive",
            WebhookSecret = "secret",
            IsActive = false,
            CreatedBy = "test@test.com"
        });
        await _context.SaveChangesAsync();

        // Act
        await _service.BroadcastToExternalChannelsAsync(TestEventId, "User", "Message");

        // Assert
        _mockGroupMeClient.Verify(
            x => x.PostBotMessageAsync("bot-active", It.IsAny<string>()),
            Times.Once);
        _mockGroupMeClient.Verify(
            x => x.PostBotMessageAsync("bot-inactive", It.IsAny<string>()),
            Times.Never);
    }

    [Fact]
    public async Task BroadcastToExternalChannelsAsync_FormatsMessageCorrectly()
    {
        // Arrange
        await SeedEventWithChannelMapping();

        // Act
        await _service.BroadcastToExternalChannelsAsync(TestEventId, "Jane Smith", "Test message");

        // Assert
        _mockGroupMeClient.Verify(
            x => x.PostBotMessageAsync("bot-123", "[Jane Smith] Test message"),
            Times.Once);
    }

    [Fact]
    public async Task BroadcastToExternalChannelsAsync_ContinuesOnError()
    {
        // Arrange
        await SeedEvent();

        _context.ExternalChannelMappings.Add(new ExternalChannelMapping
        {
            Id = Guid.NewGuid(),
            EventId = TestEventId,
            Platform = ExternalPlatform.GroupMe,
            ExternalGroupId = "group-1",
            ExternalGroupName = "Group 1",
            BotId = "bot-failing",
            WebhookSecret = "secret",
            IsActive = true,
            CreatedBy = "test@test.com"
        });
        _context.ExternalChannelMappings.Add(new ExternalChannelMapping
        {
            Id = Guid.NewGuid(),
            EventId = TestEventId,
            Platform = ExternalPlatform.GroupMe,
            ExternalGroupId = "group-2",
            ExternalGroupName = "Group 2",
            BotId = "bot-working",
            WebhookSecret = "secret",
            IsActive = true,
            CreatedBy = "test@test.com"
        });
        await _context.SaveChangesAsync();

        // First bot throws exception
        _mockGroupMeClient
            .Setup(x => x.PostBotMessageAsync("bot-failing", It.IsAny<string>()))
            .ThrowsAsync(new Exception("API error"));

        // Act
        await _service.BroadcastToExternalChannelsAsync(TestEventId, "User", "Message");

        // Assert - Second bot should still be called
        _mockGroupMeClient.Verify(
            x => x.PostBotMessageAsync("bot-working", It.IsAny<string>()),
            Times.Once);
    }

    #endregion

    #region Helper Methods

    private async Task SeedEvent()
    {
        var eventEntity = new Event
        {
            Id = TestEventId,
            Name = "Test Event",
            IsActive = true,
            CreatedBy = "test@test.com"
        };
        _context.Events.Add(eventEntity);
        await _context.SaveChangesAsync();
    }

    private async Task SeedEventWithChannelMapping(bool isActive = true)
    {
        await SeedEvent();

        var mapping = new ExternalChannelMapping
        {
            Id = TestMappingId,
            EventId = TestEventId,
            Platform = ExternalPlatform.GroupMe,
            ExternalGroupId = "gm-group-123",
            ExternalGroupName = "Test Group",
            BotId = "bot-123",
            WebhookSecret = "secret-123",
            IsActive = isActive,
            CreatedBy = "test@test.com"
        };
        _context.ExternalChannelMappings.Add(mapping);
        await _context.SaveChangesAsync();
    }

    private async Task<Guid> SeedEventWithChannelMappingAndChatThread(bool mappingIsActive = true)
    {
        await SeedEventWithChannelMapping(mappingIsActive);

        var thread = new ChatThread
        {
            Id = Guid.NewGuid(),
            EventId = TestEventId,
            Name = "Event Chat",
            IsDefaultEventThread = true,
            IsActive = true,
            CreatedBy = "test@test.com"
        };
        _context.ChatThreads.Add(thread);
        await _context.SaveChangesAsync();

        return thread.Id;
    }

    #endregion
}
