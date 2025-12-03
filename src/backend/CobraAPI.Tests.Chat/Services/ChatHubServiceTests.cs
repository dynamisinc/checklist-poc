using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace CobraAPI.Tests.Chat.Services;

/// <summary>
/// Unit tests for ChatHubService.
/// Tests SignalR broadcast methods for real-time chat updates.
/// </summary>
public class ChatHubServiceTests
{
    private readonly Mock<IHubContext<ChatHub>> _mockHubContext;
    private readonly Mock<IHubClients> _mockClients;
    private readonly Mock<IClientProxy> _mockClientProxy;
    private readonly Mock<ILogger<ChatHubService>> _mockLogger;
    private readonly ChatHubService _service;

    // Test IDs
    private static readonly Guid TestEventId = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
    private static readonly Guid TestChannelId = Guid.Parse("cccccccc-cccc-cccc-cccc-cccccccccccc");
    private static readonly Guid TestMessageId = Guid.Parse("dddddddd-dddd-dddd-dddd-dddddddddddd");

    public ChatHubServiceTests()
    {
        _mockHubContext = new Mock<IHubContext<ChatHub>>();
        _mockClients = new Mock<IHubClients>();
        _mockClientProxy = new Mock<IClientProxy>();
        _mockLogger = new Mock<ILogger<ChatHubService>>();

        // Setup hub context to return clients mock
        _mockHubContext.Setup(x => x.Clients).Returns(_mockClients.Object);

        // Setup clients to return client proxy for any group
        _mockClients.Setup(x => x.Group(It.IsAny<string>())).Returns(_mockClientProxy.Object);

        _service = new ChatHubService(
            _mockHubContext.Object,
            _mockLogger.Object);
    }

    #region BroadcastMessageToEventAsync Tests

    [Fact]
    public async Task BroadcastMessageToEventAsync_SendsToCorrectGroup()
    {
        // Arrange
        var message = CreateTestMessage();
        var expectedGroup = $"event-{TestEventId}";

        // Act
        await _service.BroadcastMessageToEventAsync(TestEventId, message);

        // Assert
        _mockClients.Verify(x => x.Group(expectedGroup), Times.Once);
    }

    [Fact]
    public async Task BroadcastMessageToEventAsync_SendsCorrectEventName()
    {
        // Arrange
        var message = CreateTestMessage();

        // Act
        await _service.BroadcastMessageToEventAsync(TestEventId, message);

        // Assert
        _mockClientProxy.Verify(
            x => x.SendCoreAsync(
                "ReceiveChatMessage",
                It.Is<object[]>(args => args.Length == 1 && args[0] is ChatMessageDto),
                default),
            Times.Once);
    }

    [Fact]
    public async Task BroadcastMessageToEventAsync_SendsMessageDto()
    {
        // Arrange
        var message = CreateTestMessage();
        object[]? capturedArgs = null;

        _mockClientProxy.Setup(x => x.SendCoreAsync(
                "ReceiveChatMessage",
                It.IsAny<object[]>(),
                default))
            .Callback<string, object[], CancellationToken>((_, args, _) => capturedArgs = args)
            .Returns(Task.CompletedTask);

        // Act
        await _service.BroadcastMessageToEventAsync(TestEventId, message);

        // Assert
        Assert.NotNull(capturedArgs);
        Assert.Single(capturedArgs);
        var sentMessage = Assert.IsType<ChatMessageDto>(capturedArgs[0]);
        Assert.Equal(message.Id, sentMessage.Id);
        Assert.Equal(message.Message, sentMessage.Message);
    }

    #endregion

    #region BroadcastChannelConnectedAsync Tests

    [Fact]
    public async Task BroadcastChannelConnectedAsync_SendsToCorrectGroup()
    {
        // Arrange
        var channel = CreateTestExternalChannel();
        var expectedGroup = $"event-{TestEventId}";

        // Act
        await _service.BroadcastChannelConnectedAsync(TestEventId, channel);

        // Assert
        _mockClients.Verify(x => x.Group(expectedGroup), Times.Once);
    }

    [Fact]
    public async Task BroadcastChannelConnectedAsync_SendsCorrectEventName()
    {
        // Arrange
        var channel = CreateTestExternalChannel();

        // Act
        await _service.BroadcastChannelConnectedAsync(TestEventId, channel);

        // Assert
        _mockClientProxy.Verify(
            x => x.SendCoreAsync(
                "ExternalChannelConnected",
                It.Is<object[]>(args => args.Length == 1 && args[0] is ExternalChannelMappingDto),
                default),
            Times.Once);
    }

    #endregion

    #region BroadcastChannelDisconnectedAsync Tests

    [Fact]
    public async Task BroadcastChannelDisconnectedAsync_SendsToCorrectGroup()
    {
        // Arrange
        var expectedGroup = $"event-{TestEventId}";

        // Act
        await _service.BroadcastChannelDisconnectedAsync(TestEventId, TestChannelId);

        // Assert
        _mockClients.Verify(x => x.Group(expectedGroup), Times.Once);
    }

    [Fact]
    public async Task BroadcastChannelDisconnectedAsync_SendsChannelId()
    {
        // Act
        await _service.BroadcastChannelDisconnectedAsync(TestEventId, TestChannelId);

        // Assert
        _mockClientProxy.Verify(
            x => x.SendCoreAsync(
                "ExternalChannelDisconnected",
                It.Is<object[]>(args => args.Length == 1 && (Guid)args[0] == TestChannelId),
                default),
            Times.Once);
    }

    #endregion

    #region BroadcastChannelCreatedAsync Tests

    [Fact]
    public async Task BroadcastChannelCreatedAsync_SendsToCorrectGroup()
    {
        // Arrange
        var channel = CreateTestChannel();
        var expectedGroup = $"event-{TestEventId}";

        // Act
        await _service.BroadcastChannelCreatedAsync(TestEventId, channel);

        // Assert
        _mockClients.Verify(x => x.Group(expectedGroup), Times.Once);
    }

    [Fact]
    public async Task BroadcastChannelCreatedAsync_SendsCorrectEventName()
    {
        // Arrange
        var channel = CreateTestChannel();

        // Act
        await _service.BroadcastChannelCreatedAsync(TestEventId, channel);

        // Assert
        _mockClientProxy.Verify(
            x => x.SendCoreAsync(
                "ChannelCreated",
                It.Is<object[]>(args => args.Length == 1 && args[0] is ChatThreadDto),
                default),
            Times.Once);
    }

    [Fact]
    public async Task BroadcastChannelCreatedAsync_SendsChannelDto()
    {
        // Arrange
        var channel = CreateTestChannel();
        object[]? capturedArgs = null;

        _mockClientProxy.Setup(x => x.SendCoreAsync(
                "ChannelCreated",
                It.IsAny<object[]>(),
                default))
            .Callback<string, object[], CancellationToken>((_, args, _) => capturedArgs = args)
            .Returns(Task.CompletedTask);

        // Act
        await _service.BroadcastChannelCreatedAsync(TestEventId, channel);

        // Assert
        Assert.NotNull(capturedArgs);
        Assert.Single(capturedArgs);
        var sentChannel = Assert.IsType<ChatThreadDto>(capturedArgs[0]);
        Assert.Equal(channel.Id, sentChannel.Id);
        Assert.Equal(channel.Name, sentChannel.Name);
    }

    #endregion

    #region BroadcastChannelArchivedAsync Tests

    [Fact]
    public async Task BroadcastChannelArchivedAsync_SendsToCorrectGroup()
    {
        // Arrange
        var expectedGroup = $"event-{TestEventId}";

        // Act
        await _service.BroadcastChannelArchivedAsync(TestEventId, TestChannelId);

        // Assert
        _mockClients.Verify(x => x.Group(expectedGroup), Times.Once);
    }

    [Fact]
    public async Task BroadcastChannelArchivedAsync_SendsCorrectEventName()
    {
        // Act
        await _service.BroadcastChannelArchivedAsync(TestEventId, TestChannelId);

        // Assert
        _mockClientProxy.Verify(
            x => x.SendCoreAsync(
                "ChannelArchived",
                It.Is<object[]>(args => args.Length == 1),
                default),
            Times.Once);
    }

    [Fact]
    public async Task BroadcastChannelArchivedAsync_SendsChannelId()
    {
        // Act
        await _service.BroadcastChannelArchivedAsync(TestEventId, TestChannelId);

        // Assert
        _mockClientProxy.Verify(
            x => x.SendCoreAsync(
                "ChannelArchived",
                It.Is<object[]>(args => (Guid)args[0] == TestChannelId),
                default),
            Times.Once);
    }

    #endregion

    #region BroadcastChannelRestoredAsync Tests

    [Fact]
    public async Task BroadcastChannelRestoredAsync_SendsToCorrectGroup()
    {
        // Arrange
        var channel = CreateTestChannel();
        var expectedGroup = $"event-{TestEventId}";

        // Act
        await _service.BroadcastChannelRestoredAsync(TestEventId, channel);

        // Assert
        _mockClients.Verify(x => x.Group(expectedGroup), Times.Once);
    }

    [Fact]
    public async Task BroadcastChannelRestoredAsync_SendsCorrectEventName()
    {
        // Arrange
        var channel = CreateTestChannel();

        // Act
        await _service.BroadcastChannelRestoredAsync(TestEventId, channel);

        // Assert
        _mockClientProxy.Verify(
            x => x.SendCoreAsync(
                "ChannelRestored",
                It.Is<object[]>(args => args.Length == 1 && args[0] is ChatThreadDto),
                default),
            Times.Once);
    }

    [Fact]
    public async Task BroadcastChannelRestoredAsync_SendsChannelDto()
    {
        // Arrange
        var channel = CreateTestChannel();
        object[]? capturedArgs = null;

        _mockClientProxy.Setup(x => x.SendCoreAsync(
                "ChannelRestored",
                It.IsAny<object[]>(),
                default))
            .Callback<string, object[], CancellationToken>((_, args, _) => capturedArgs = args)
            .Returns(Task.CompletedTask);

        // Act
        await _service.BroadcastChannelRestoredAsync(TestEventId, channel);

        // Assert
        Assert.NotNull(capturedArgs);
        Assert.Single(capturedArgs);
        var sentChannel = Assert.IsType<ChatThreadDto>(capturedArgs[0]);
        Assert.Equal(channel.Id, sentChannel.Id);
    }

    #endregion

    #region BroadcastChannelDeletedAsync Tests

    [Fact]
    public async Task BroadcastChannelDeletedAsync_SendsToCorrectGroup()
    {
        // Arrange
        var expectedGroup = $"event-{TestEventId}";

        // Act
        await _service.BroadcastChannelDeletedAsync(TestEventId, TestChannelId);

        // Assert
        _mockClients.Verify(x => x.Group(expectedGroup), Times.Once);
    }

    [Fact]
    public async Task BroadcastChannelDeletedAsync_SendsCorrectEventName()
    {
        // Act
        await _service.BroadcastChannelDeletedAsync(TestEventId, TestChannelId);

        // Assert
        _mockClientProxy.Verify(
            x => x.SendCoreAsync(
                "ChannelDeleted",
                It.Is<object[]>(args => args.Length == 1),
                default),
            Times.Once);
    }

    [Fact]
    public async Task BroadcastChannelDeletedAsync_SendsChannelId()
    {
        // Act
        await _service.BroadcastChannelDeletedAsync(TestEventId, TestChannelId);

        // Assert
        _mockClientProxy.Verify(
            x => x.SendCoreAsync(
                "ChannelDeleted",
                It.Is<object[]>(args => (Guid)args[0] == TestChannelId),
                default),
            Times.Once);
    }

    #endregion

    #region Group Name Tests

    [Fact]
    public async Task AllBroadcasts_UseConsistentGroupNaming()
    {
        // Arrange
        var expectedGroup = $"event-{TestEventId}";
        var message = CreateTestMessage();
        var channel = CreateTestChannel();
        var externalChannel = CreateTestExternalChannel();

        // Act - call all broadcast methods
        await _service.BroadcastMessageToEventAsync(TestEventId, message);
        await _service.BroadcastChannelConnectedAsync(TestEventId, externalChannel);
        await _service.BroadcastChannelDisconnectedAsync(TestEventId, TestChannelId);
        await _service.BroadcastChannelCreatedAsync(TestEventId, channel);
        await _service.BroadcastChannelArchivedAsync(TestEventId, TestChannelId);
        await _service.BroadcastChannelRestoredAsync(TestEventId, channel);
        await _service.BroadcastChannelDeletedAsync(TestEventId, TestChannelId);

        // Assert - all should use same group format
        _mockClients.Verify(x => x.Group(expectedGroup), Times.Exactly(7));
    }

    #endregion

    #region Helper Methods

    private ChatMessageDto CreateTestMessage()
    {
        return new ChatMessageDto
        {
            Id = TestMessageId,
            ChatThreadId = TestChannelId,
            Message = "Test message",
            SenderDisplayName = "Test User",
            CreatedBy = "test@test.com",
            CreatedAt = DateTime.UtcNow,
            IsExternalMessage = false
        };
    }

    private ChatThreadDto CreateTestChannel()
    {
        return new ChatThreadDto
        {
            Id = TestChannelId,
            EventId = TestEventId,
            Name = "Test Channel",
            ChannelType = ChannelType.Custom,
            ChannelTypeName = "Custom",
            IsDefaultEventThread = false,
            DisplayOrder = 0,
            MessageCount = 0,
            CreatedAt = DateTime.UtcNow,
            IsActive = true
        };
    }

    private ExternalChannelMappingDto CreateTestExternalChannel()
    {
        return new ExternalChannelMappingDto
        {
            Id = Guid.NewGuid(),
            EventId = TestEventId,
            Platform = ExternalPlatform.GroupMe,
            PlatformName = "GroupMe",
            ExternalGroupId = "ext-123",
            ExternalGroupName = "External Group",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
    }

    #endregion
}
