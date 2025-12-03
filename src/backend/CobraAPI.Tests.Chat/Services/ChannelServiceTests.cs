using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace CobraAPI.Tests.Chat.Services;

/// <summary>
/// Unit tests for ChannelService.
/// Tests channel CRUD operations, archive/restore, and message archival.
/// </summary>
public class ChannelServiceTests : IDisposable
{
    private readonly CobraDbContext _context;
    private readonly Mock<IHttpContextAccessor> _mockHttpContextAccessor;
    private readonly Mock<ILogger<ChannelService>> _mockLogger;
    private readonly ChannelService _service;
    private readonly UserContext _testUser;

    // Test event IDs
    private static readonly Guid TestEventId = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
    private static readonly Guid TestEvent2Id = Guid.Parse("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");

    public ChannelServiceTests()
    {
        _context = TestDbContextFactory.CreateInMemoryContext();
        _mockHttpContextAccessor = new Mock<IHttpContextAccessor>();
        _mockLogger = new Mock<ILogger<ChannelService>>();

        _testUser = TestUserContextFactory.CreateManagerUser();

        // Setup HttpContext to return the test user
        var httpContext = new DefaultHttpContext();
        httpContext.Items["UserContext"] = _testUser;
        _mockHttpContextAccessor.Setup(x => x.HttpContext).Returns(httpContext);

        _service = new ChannelService(
            _context,
            _mockHttpContextAccessor.Object,
            _mockLogger.Object);
    }

    public void Dispose()
    {
        _context.Dispose();
    }

    #region GetEventChannelsAsync Tests

    [Fact]
    public async Task GetEventChannelsAsync_ReturnsActiveChannels_OrderedByDisplayOrder()
    {
        // Arrange
        await SeedEventWithChannels();

        // Act
        var result = await _service.GetEventChannelsAsync(TestEventId);

        // Assert
        Assert.Equal(3, result.Count);
        Assert.Equal(0, result[0].DisplayOrder);
        Assert.Equal(1, result[1].DisplayOrder);
        Assert.Equal(2, result[2].DisplayOrder);
    }

    [Fact]
    public async Task GetEventChannelsAsync_ExcludesInactiveChannels()
    {
        // Arrange
        await SeedEventWithChannels();

        // Archive one channel
        var channel = _context.ChatThreads.First(c => c.EventId == TestEventId && c.Name == "Custom Channel");
        channel.IsActive = false;
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetEventChannelsAsync(TestEventId);

        // Assert
        Assert.Equal(2, result.Count);
        Assert.DoesNotContain(result, c => c.Name == "Custom Channel");
    }

    [Fact]
    public async Task GetEventChannelsAsync_ReturnsEmptyList_WhenNoChannels()
    {
        // Arrange
        await SeedEvent();

        // Act
        var result = await _service.GetEventChannelsAsync(TestEventId);

        // Assert
        Assert.Empty(result);
    }

    [Fact]
    public async Task GetEventChannelsAsync_IncludesMessageCount()
    {
        // Arrange
        await SeedEventWithChannelsAndMessages();

        // Act
        var result = await _service.GetEventChannelsAsync(TestEventId);

        // Assert
        var eventChat = result.First(c => c.Name == "Event Chat");
        Assert.Equal(5, eventChat.MessageCount);
    }

    [Fact]
    public async Task GetEventChannelsAsync_IncludesLastMessageInfo()
    {
        // Arrange
        await SeedEventWithChannelsAndMessages();

        // Act
        var result = await _service.GetEventChannelsAsync(TestEventId);

        // Assert
        var eventChat = result.First(c => c.Name == "Event Chat");
        Assert.NotNull(eventChat.LastMessageAt);
        Assert.Equal("Test User", eventChat.LastMessageSender);
    }

    [Fact]
    public async Task GetEventChannelsAsync_ReturnsOnlyChannelsForSpecifiedEvent()
    {
        // Arrange
        await SeedMultipleEventsWithChannels();

        // Act
        var result = await _service.GetEventChannelsAsync(TestEventId);

        // Assert
        Assert.All(result, c => Assert.Equal(TestEventId, c.EventId));
    }

    #endregion

    #region GetChannelAsync Tests

    [Fact]
    public async Task GetChannelAsync_ReturnsChannel_WhenExists()
    {
        // Arrange
        await SeedEventWithChannels();
        var channel = _context.ChatThreads.First(c => c.EventId == TestEventId);

        // Act
        var result = await _service.GetChannelAsync(channel.Id);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(channel.Id, result.Id);
        Assert.Equal(channel.Name, result.Name);
    }

    [Fact]
    public async Task GetChannelAsync_ReturnsNull_WhenNotExists()
    {
        // Arrange
        await SeedEvent();

        // Act
        var result = await _service.GetChannelAsync(Guid.NewGuid());

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task GetChannelAsync_ReturnsNull_WhenChannelIsInactive()
    {
        // Arrange
        await SeedEventWithChannels();
        var channel = _context.ChatThreads.First(c => c.EventId == TestEventId);
        channel.IsActive = false;
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetChannelAsync(channel.Id);

        // Assert
        Assert.Null(result);
    }

    #endregion

    #region CreateChannelAsync Tests

    [Fact]
    public async Task CreateChannelAsync_CreatesChannel_WithCorrectProperties()
    {
        // Arrange
        await SeedEvent();
        var request = new CreateChannelRequest
        {
            EventId = TestEventId,
            Name = "New Channel",
            Description = "A new custom channel",
            ChannelType = ChannelType.Custom,
            IconName = "hashtag",
            Color = "#ff0000"
        };

        // Act
        var result = await _service.CreateChannelAsync(request);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("New Channel", result.Name);
        Assert.Equal("A new custom channel", result.Description);
        Assert.Equal(ChannelType.Custom, result.ChannelType);
        Assert.Equal("hashtag", result.IconName);
        Assert.Equal("#ff0000", result.Color);
        Assert.False(result.IsDefaultEventThread);
        Assert.True(result.IsActive);
    }

    [Fact]
    public async Task CreateChannelAsync_AssignsNextDisplayOrder()
    {
        // Arrange
        await SeedEventWithChannels(); // Creates 3 channels with orders 0, 1, 2

        var request = new CreateChannelRequest
        {
            EventId = TestEventId,
            Name = "Fourth Channel",
            ChannelType = ChannelType.Custom
        };

        // Act
        var result = await _service.CreateChannelAsync(request);

        // Assert
        Assert.Equal(3, result.DisplayOrder); // Next after 0, 1, 2
    }

    [Fact]
    public async Task CreateChannelAsync_SetsCreatedByToCurrentUser()
    {
        // Arrange
        await SeedEvent();
        var request = new CreateChannelRequest
        {
            EventId = TestEventId,
            Name = "New Channel",
            ChannelType = ChannelType.Custom
        };

        // Act
        var result = await _service.CreateChannelAsync(request);

        // Assert
        var dbChannel = await _context.ChatThreads.FindAsync(result.Id);
        Assert.NotNull(dbChannel);
        Assert.Equal(_testUser.Email, dbChannel.CreatedBy);
    }

    [Fact]
    public async Task CreateChannelAsync_PersistsToDatabase()
    {
        // Arrange
        await SeedEvent();
        var request = new CreateChannelRequest
        {
            EventId = TestEventId,
            Name = "Persisted Channel",
            ChannelType = ChannelType.Custom
        };

        // Act
        var result = await _service.CreateChannelAsync(request);

        // Assert
        var dbChannel = await _context.ChatThreads.FindAsync(result.Id);
        Assert.NotNull(dbChannel);
        Assert.Equal("Persisted Channel", dbChannel.Name);
    }

    #endregion

    #region CreateDefaultChannelsAsync Tests

    [Fact]
    public async Task CreateDefaultChannelsAsync_CreatesEventChatAndAnnouncements()
    {
        // Arrange
        await SeedEvent();

        // Act
        await _service.CreateDefaultChannelsAsync(TestEventId, "creator@test.com");

        // Assert
        var channels = _context.ChatThreads.Where(c => c.EventId == TestEventId).ToList();
        Assert.Equal(2, channels.Count);
        Assert.Contains(channels, c => c.Name == "Event Chat" && c.IsDefaultEventThread);
        Assert.Contains(channels, c => c.Name == "Announcements" && c.ChannelType == ChannelType.Announcements);
    }

    [Fact]
    public async Task CreateDefaultChannelsAsync_SetsCorrectDisplayOrders()
    {
        // Arrange
        await SeedEvent();

        // Act
        await _service.CreateDefaultChannelsAsync(TestEventId, "creator@test.com");

        // Assert
        var eventChat = _context.ChatThreads.First(c => c.Name == "Event Chat" && c.EventId == TestEventId);
        var announcements = _context.ChatThreads.First(c => c.Name == "Announcements" && c.EventId == TestEventId);
        Assert.Equal(0, eventChat.DisplayOrder);
        Assert.Equal(1, announcements.DisplayOrder);
    }

    [Fact]
    public async Task CreateDefaultChannelsAsync_SetsCreatedByCorrectly()
    {
        // Arrange
        await SeedEvent();
        var createdBy = "specific-user@test.com";

        // Act
        await _service.CreateDefaultChannelsAsync(TestEventId, createdBy);

        // Assert
        var channels = _context.ChatThreads.Where(c => c.EventId == TestEventId).ToList();
        Assert.All(channels, c => Assert.Equal(createdBy, c.CreatedBy));
    }

    #endregion

    #region UpdateChannelAsync Tests

    [Fact]
    public async Task UpdateChannelAsync_UpdatesName()
    {
        // Arrange
        await SeedEventWithChannels();
        var channel = _context.ChatThreads.First(c => c.EventId == TestEventId && c.Name == "Custom Channel");
        var request = new UpdateChannelRequest { Name = "Updated Name" };

        // Act
        var result = await _service.UpdateChannelAsync(channel.Id, request);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("Updated Name", result.Name);
    }

    [Fact]
    public async Task UpdateChannelAsync_UpdatesOnlyProvidedFields()
    {
        // Arrange
        await SeedEventWithChannels();
        var channel = _context.ChatThreads.First(c => c.EventId == TestEventId && c.Name == "Custom Channel");
        var originalDescription = channel.Description;
        var request = new UpdateChannelRequest { Name = "New Name" };

        // Act
        var result = await _service.UpdateChannelAsync(channel.Id, request);

        // Assert
        Assert.Equal("New Name", result!.Name);
        Assert.Equal(originalDescription, result.Description); // Unchanged
    }

    [Fact]
    public async Task UpdateChannelAsync_ReturnsNull_WhenChannelNotFound()
    {
        // Arrange
        await SeedEvent();
        var request = new UpdateChannelRequest { Name = "Updated" };

        // Act
        var result = await _service.UpdateChannelAsync(Guid.NewGuid(), request);

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task UpdateChannelAsync_ReturnsNull_WhenChannelIsInactive()
    {
        // Arrange
        await SeedEventWithChannels();
        var channel = _context.ChatThreads.First(c => c.EventId == TestEventId && c.Name == "Custom Channel");
        channel.IsActive = false;
        await _context.SaveChangesAsync();
        var request = new UpdateChannelRequest { Name = "Updated" };

        // Act
        var result = await _service.UpdateChannelAsync(channel.Id, request);

        // Assert
        Assert.Null(result);
    }

    #endregion

    #region ReorderChannelsAsync Tests

    [Fact]
    public async Task ReorderChannelsAsync_UpdatesDisplayOrders()
    {
        // Arrange
        await SeedEventWithChannels();
        var channels = _context.ChatThreads.Where(c => c.EventId == TestEventId && c.IsActive).OrderBy(c => c.DisplayOrder).ToList();
        var newOrder = new List<Guid> { channels[2].Id, channels[0].Id, channels[1].Id };

        // Act
        await _service.ReorderChannelsAsync(TestEventId, newOrder);

        // Assert
        await _context.Entry(channels[0]).ReloadAsync();
        await _context.Entry(channels[1]).ReloadAsync();
        await _context.Entry(channels[2]).ReloadAsync();

        Assert.Equal(1, channels[0].DisplayOrder);
        Assert.Equal(2, channels[1].DisplayOrder);
        Assert.Equal(0, channels[2].DisplayOrder);
    }

    #endregion

    #region DeleteChannelAsync Tests

    [Fact]
    public async Task DeleteChannelAsync_SoftDeletesChannel()
    {
        // Arrange
        await SeedEventWithChannels();
        var channel = _context.ChatThreads.First(c => c.EventId == TestEventId && c.Name == "Custom Channel");

        // Act
        var result = await _service.DeleteChannelAsync(channel.Id);

        // Assert
        Assert.True(result);
        await _context.Entry(channel).ReloadAsync();
        Assert.False(channel.IsActive);
    }

    [Fact]
    public async Task DeleteChannelAsync_ReturnsFalse_WhenChannelNotFound()
    {
        // Arrange
        await SeedEvent();

        // Act
        var result = await _service.DeleteChannelAsync(Guid.NewGuid());

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task DeleteChannelAsync_ReturnsFalse_ForDefaultEventChannel()
    {
        // Arrange
        await SeedEventWithChannels();
        var defaultChannel = _context.ChatThreads.First(c => c.EventId == TestEventId && c.IsDefaultEventThread);

        // Act
        var result = await _service.DeleteChannelAsync(defaultChannel.Id);

        // Assert
        Assert.False(result);
        await _context.Entry(defaultChannel).ReloadAsync();
        Assert.True(defaultChannel.IsActive); // Still active
    }

    [Fact]
    public async Task DeleteChannelAsync_ReturnsFalse_ForExternalChannel()
    {
        // Arrange
        await SeedEventWithExternalChannel();
        var externalChannel = _context.ChatThreads.First(c => c.EventId == TestEventId && c.ChannelType == ChannelType.External);

        // Act
        var result = await _service.DeleteChannelAsync(externalChannel.Id);

        // Assert
        Assert.False(result);
        await _context.Entry(externalChannel).ReloadAsync();
        Assert.True(externalChannel.IsActive);
    }

    #endregion

    #region GetArchivedChannelsAsync Tests

    [Fact]
    public async Task GetArchivedChannelsAsync_ReturnsOnlyArchivedChannels()
    {
        // Arrange
        await SeedEventWithArchivedChannels();

        // Act
        var result = await _service.GetArchivedChannelsAsync(TestEventId);

        // Assert
        Assert.Single(result);
        Assert.Equal("Archived Channel", result[0].Name);
    }

    [Fact]
    public async Task GetArchivedChannelsAsync_ExcludesPermanentlyDeletedChannels()
    {
        // Arrange
        await SeedEventWithArchivedChannels();

        // Add a permanently deleted channel (with [DELETED] prefix)
        var deletedChannel = new ChatThread
        {
            Id = Guid.NewGuid(),
            EventId = TestEventId,
            Name = "[DELETED] Old Channel",
            ChannelType = ChannelType.Custom,
            IsActive = false,
            CreatedBy = "test@test.com",
            CreatedAt = DateTime.UtcNow
        };
        _context.ChatThreads.Add(deletedChannel);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetArchivedChannelsAsync(TestEventId);

        // Assert
        Assert.Single(result); // Only "Archived Channel", not "[DELETED] Old Channel"
        Assert.DoesNotContain(result, c => c.Name.StartsWith("[DELETED]"));
    }

    [Fact]
    public async Task GetArchivedChannelsAsync_ReturnsEmptyList_WhenNoArchivedChannels()
    {
        // Arrange
        await SeedEventWithChannels();

        // Act
        var result = await _service.GetArchivedChannelsAsync(TestEventId);

        // Assert
        Assert.Empty(result);
    }

    #endregion

    #region RestoreChannelAsync Tests

    [Fact]
    public async Task RestoreChannelAsync_RestoresArchivedChannel()
    {
        // Arrange
        await SeedEventWithArchivedChannels();
        var archivedChannel = _context.ChatThreads.First(c => c.EventId == TestEventId && !c.IsActive);

        // Act
        var result = await _service.RestoreChannelAsync(archivedChannel.Id);

        // Assert
        Assert.NotNull(result);
        Assert.True(result.IsActive);
        await _context.Entry(archivedChannel).ReloadAsync();
        Assert.True(archivedChannel.IsActive);
    }

    [Fact]
    public async Task RestoreChannelAsync_AssignsNextDisplayOrder()
    {
        // Arrange
        await SeedEventWithArchivedChannels();
        var archivedChannel = _context.ChatThreads.First(c => c.EventId == TestEventId && !c.IsActive);

        // Act
        var result = await _service.RestoreChannelAsync(archivedChannel.Id);

        // Assert
        // Active channels have orders 0, 1, 2, so restored should be 3
        Assert.Equal(3, result!.DisplayOrder);
    }

    [Fact]
    public async Task RestoreChannelAsync_ReturnsNull_WhenChannelNotFound()
    {
        // Arrange
        await SeedEvent();

        // Act
        var result = await _service.RestoreChannelAsync(Guid.NewGuid());

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task RestoreChannelAsync_ReturnsNull_WhenChannelIsActive()
    {
        // Arrange
        await SeedEventWithChannels();
        var activeChannel = _context.ChatThreads.First(c => c.EventId == TestEventId && c.IsActive);

        // Act
        var result = await _service.RestoreChannelAsync(activeChannel.Id);

        // Assert
        Assert.Null(result);
    }

    #endregion

    #region PermanentDeleteChannelAsync Tests

    [Fact]
    public async Task PermanentDeleteChannelAsync_MarksChannelAsDeleted()
    {
        // Arrange
        await SeedEventWithArchivedChannels();
        var archivedChannel = _context.ChatThreads.First(c => c.EventId == TestEventId && !c.IsActive && !c.IsDefaultEventThread);

        // Act
        var result = await _service.PermanentDeleteChannelAsync(archivedChannel.Id);

        // Assert
        Assert.True(result);
        await _context.Entry(archivedChannel).ReloadAsync();
        Assert.StartsWith("[DELETED]", archivedChannel.Name);
        Assert.Contains(_testUser.Email, archivedChannel.Description!);
    }

    [Fact]
    public async Task PermanentDeleteChannelAsync_ReturnsFalse_ForDefaultEventChannel()
    {
        // Arrange
        await SeedEventWithChannels();
        var defaultChannel = _context.ChatThreads.First(c => c.EventId == TestEventId && c.IsDefaultEventThread);

        // Act
        var result = await _service.PermanentDeleteChannelAsync(defaultChannel.Id);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task PermanentDeleteChannelAsync_ReturnsFalse_ForAnnouncementsChannel()
    {
        // Arrange
        await SeedEventWithChannels();
        var announcements = _context.ChatThreads.First(c => c.EventId == TestEventId && c.ChannelType == ChannelType.Announcements);

        // Act
        var result = await _service.PermanentDeleteChannelAsync(announcements.Id);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task PermanentDeleteChannelAsync_ReturnsFalse_WhenChannelNotFound()
    {
        // Arrange
        await SeedEvent();

        // Act
        var result = await _service.PermanentDeleteChannelAsync(Guid.NewGuid());

        // Assert
        Assert.False(result);
    }

    #endregion

    #region ArchiveAllMessagesAsync Tests

    [Fact]
    public async Task ArchiveAllMessagesAsync_ArchivesAllMessages()
    {
        // Arrange
        var channelId = await SeedEventWithChannelsAndMessages();

        // Act
        var result = await _service.ArchiveAllMessagesAsync(channelId);

        // Assert
        Assert.Equal(5, result);
        var activeMessages = _context.ChatMessages.Count(m => m.ChatThreadId == channelId && m.IsActive);
        Assert.Equal(0, activeMessages);
    }

    [Fact]
    public async Task ArchiveAllMessagesAsync_ReturnsZero_WhenNoMessages()
    {
        // Arrange
        await SeedEventWithChannels();
        var channel = _context.ChatThreads.First(c => c.EventId == TestEventId);

        // Act
        var result = await _service.ArchiveAllMessagesAsync(channel.Id);

        // Assert
        Assert.Equal(0, result);
    }

    #endregion

    #region ArchiveMessagesOlderThanAsync Tests

    [Fact]
    public async Task ArchiveMessagesOlderThanAsync_ArchivesOldMessages()
    {
        // Arrange
        var channelId = await SeedEventWithChannelsAndMessagesWithDates();

        // Act
        var result = await _service.ArchiveMessagesOlderThanAsync(channelId, 7);

        // Assert
        Assert.Equal(3, result); // 3 messages older than 7 days
    }

    [Fact]
    public async Task ArchiveMessagesOlderThanAsync_KeepsRecentMessages()
    {
        // Arrange
        var channelId = await SeedEventWithChannelsAndMessagesWithDates();

        // Act
        await _service.ArchiveMessagesOlderThanAsync(channelId, 7);

        // Assert
        var activeMessages = _context.ChatMessages.Count(m => m.ChatThreadId == channelId && m.IsActive);
        Assert.Equal(2, activeMessages); // 2 recent messages remain active
    }

    [Fact]
    public async Task ArchiveMessagesOlderThanAsync_ReturnsZero_WhenNoOldMessages()
    {
        // Arrange
        var channelId = await SeedEventWithChannelsAndMessages(); // All messages created now

        // Act
        var result = await _service.ArchiveMessagesOlderThanAsync(channelId, 1);

        // Assert
        Assert.Equal(0, result);
    }

    #endregion

    #region GetAllEventChannelsAsync Tests

    [Fact]
    public async Task GetAllEventChannelsAsync_IncludesArchived_WhenTrue()
    {
        // Arrange
        await SeedEventWithArchivedChannels();

        // Act
        var result = await _service.GetAllEventChannelsAsync(TestEventId, includeArchived: true);

        // Assert
        Assert.Equal(4, result.Count); // 3 active + 1 archived
    }

    [Fact]
    public async Task GetAllEventChannelsAsync_ExcludesArchived_WhenFalse()
    {
        // Arrange
        await SeedEventWithArchivedChannels();

        // Act
        var result = await _service.GetAllEventChannelsAsync(TestEventId, includeArchived: false);

        // Assert
        Assert.Equal(3, result.Count); // Only active
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

    private async Task SeedEventWithChannels()
    {
        await SeedEvent();

        var channels = new List<ChatThread>
        {
            new ChatThread
            {
                Id = Guid.NewGuid(),
                EventId = TestEventId,
                Name = "Event Chat",
                ChannelType = ChannelType.Internal,
                DisplayOrder = 0,
                IsDefaultEventThread = true,
                IsActive = true,
                CreatedBy = "test@test.com",
                CreatedAt = DateTime.UtcNow
            },
            new ChatThread
            {
                Id = Guid.NewGuid(),
                EventId = TestEventId,
                Name = "Announcements",
                ChannelType = ChannelType.Announcements,
                DisplayOrder = 1,
                IsDefaultEventThread = false,
                IsActive = true,
                CreatedBy = "test@test.com",
                CreatedAt = DateTime.UtcNow
            },
            new ChatThread
            {
                Id = Guid.NewGuid(),
                EventId = TestEventId,
                Name = "Custom Channel",
                Description = "A custom channel",
                ChannelType = ChannelType.Custom,
                DisplayOrder = 2,
                IsDefaultEventThread = false,
                IsActive = true,
                CreatedBy = "test@test.com",
                CreatedAt = DateTime.UtcNow
            }
        };

        _context.ChatThreads.AddRange(channels);
        await _context.SaveChangesAsync();
    }

    private async Task<Guid> SeedEventWithChannelsAndMessages()
    {
        await SeedEventWithChannels();

        var channel = _context.ChatThreads.First(c => c.EventId == TestEventId && c.IsDefaultEventThread);

        for (int i = 0; i < 5; i++)
        {
            var message = new ChatMessage
            {
                Id = Guid.NewGuid(),
                ChatThreadId = channel.Id,
                Message = $"Message {i + 1}",
                SenderDisplayName = "Test User",
                IsActive = true,
                CreatedBy = "test@test.com",
                CreatedAt = DateTime.UtcNow.AddMinutes(i)
            };
            _context.ChatMessages.Add(message);
        }
        await _context.SaveChangesAsync();

        return channel.Id;
    }

    private async Task<Guid> SeedEventWithChannelsAndMessagesWithDates()
    {
        await SeedEventWithChannels();

        var channel = _context.ChatThreads.First(c => c.EventId == TestEventId && c.IsDefaultEventThread);

        // 3 old messages (older than 7 days)
        for (int i = 0; i < 3; i++)
        {
            var message = new ChatMessage
            {
                Id = Guid.NewGuid(),
                ChatThreadId = channel.Id,
                Message = $"Old Message {i + 1}",
                SenderDisplayName = "Test User",
                IsActive = true,
                CreatedBy = "test@test.com",
                CreatedAt = DateTime.UtcNow.AddDays(-10 - i)
            };
            _context.ChatMessages.Add(message);
        }

        // 2 recent messages
        for (int i = 0; i < 2; i++)
        {
            var message = new ChatMessage
            {
                Id = Guid.NewGuid(),
                ChatThreadId = channel.Id,
                Message = $"Recent Message {i + 1}",
                SenderDisplayName = "Test User",
                IsActive = true,
                CreatedBy = "test@test.com",
                CreatedAt = DateTime.UtcNow.AddDays(-i)
            };
            _context.ChatMessages.Add(message);
        }

        await _context.SaveChangesAsync();

        return channel.Id;
    }

    private async Task SeedEventWithArchivedChannels()
    {
        await SeedEventWithChannels();

        // Add an archived channel
        var archivedChannel = new ChatThread
        {
            Id = Guid.NewGuid(),
            EventId = TestEventId,
            Name = "Archived Channel",
            ChannelType = ChannelType.Custom,
            DisplayOrder = 99,
            IsDefaultEventThread = false,
            IsActive = false,
            CreatedBy = "test@test.com",
            CreatedAt = DateTime.UtcNow.AddDays(-30)
        };
        _context.ChatThreads.Add(archivedChannel);
        await _context.SaveChangesAsync();
    }

    private async Task SeedEventWithExternalChannel()
    {
        await SeedEventWithChannels();

        var externalMapping = new ExternalChannelMapping
        {
            Id = Guid.NewGuid(),
            EventId = TestEventId,
            Platform = ExternalPlatform.GroupMe,
            ExternalGroupId = "ext-group-123",
            ExternalGroupName = "External Group",
            IsActive = true,
            CreatedBy = "test@test.com",
            CreatedAt = DateTime.UtcNow
        };
        _context.ExternalChannelMappings.Add(externalMapping);

        var externalChannel = new ChatThread
        {
            Id = Guid.NewGuid(),
            EventId = TestEventId,
            Name = "GroupMe Channel",
            ChannelType = ChannelType.External,
            DisplayOrder = 3,
            IsDefaultEventThread = false,
            IsActive = true,
            CreatedBy = "test@test.com",
            CreatedAt = DateTime.UtcNow,
            ExternalChannelMappingId = externalMapping.Id
        };
        _context.ChatThreads.Add(externalChannel);
        await _context.SaveChangesAsync();
    }

    private async Task SeedMultipleEventsWithChannels()
    {
        await SeedEventWithChannels();

        // Add second event with channels
        var event2 = new Event
        {
            Id = TestEvent2Id,
            Name = "Test Event 2",
            IsActive = true,
            CreatedBy = "test@test.com"
        };
        _context.Events.Add(event2);

        var event2Channel = new ChatThread
        {
            Id = Guid.NewGuid(),
            EventId = TestEvent2Id,
            Name = "Event 2 Chat",
            ChannelType = ChannelType.Internal,
            DisplayOrder = 0,
            IsDefaultEventThread = true,
            IsActive = true,
            CreatedBy = "test@test.com",
            CreatedAt = DateTime.UtcNow
        };
        _context.ChatThreads.Add(event2Channel);
        await _context.SaveChangesAsync();
    }

    #endregion
}
