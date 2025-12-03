using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace CobraAPI.Tests.Chat.Services;

/// <summary>
/// Unit tests for ChatService
/// Tests chat thread management, message operations, and SignalR integration
/// </summary>
public class ChatServiceTests : IDisposable
{
    private readonly CobraDbContext _context;
    private readonly Mock<IExternalMessagingService> _mockExternalMessagingService;
    private readonly Mock<IChatHubService> _mockChatHubService;
    private readonly Mock<IHttpContextAccessor> _mockHttpContextAccessor;
    private readonly Mock<IServiceProvider> _mockServiceProvider;
    private readonly Mock<IServiceScope> _mockServiceScope;
    private readonly Mock<IServiceScopeFactory> _mockServiceScopeFactory;
    private readonly Mock<ILogger<ChatService>> _mockLogger;
    private readonly ChatService _service;
    private readonly UserContext _testUser;

    // Test event IDs
    private static readonly Guid TestEventId = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
    private static readonly Guid TestEvent2Id = Guid.Parse("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");

    public ChatServiceTests()
    {
        _context = TestDbContextFactory.CreateInMemoryContext();
        _mockExternalMessagingService = new Mock<IExternalMessagingService>();
        _mockChatHubService = new Mock<IChatHubService>();
        _mockHttpContextAccessor = new Mock<IHttpContextAccessor>();
        _mockServiceProvider = new Mock<IServiceProvider>();
        _mockServiceScope = new Mock<IServiceScope>();
        _mockServiceScopeFactory = new Mock<IServiceScopeFactory>();
        _mockLogger = new Mock<ILogger<ChatService>>();

        _testUser = TestUserContextFactory.CreateTestUser();

        // Setup HttpContext to return the test user
        var httpContext = new DefaultHttpContext();
        httpContext.Items["UserContext"] = _testUser;
        _mockHttpContextAccessor.Setup(x => x.HttpContext).Returns(httpContext);

        // Setup service provider to create scope and resolve IExternalMessagingService
        var scopeServiceProvider = new Mock<IServiceProvider>();
        scopeServiceProvider.Setup(x => x.GetService(typeof(IExternalMessagingService)))
            .Returns(_mockExternalMessagingService.Object);
        _mockServiceScope.Setup(x => x.ServiceProvider).Returns(scopeServiceProvider.Object);
        _mockServiceScopeFactory.Setup(x => x.CreateScope()).Returns(_mockServiceScope.Object);
        _mockServiceProvider.Setup(x => x.GetService(typeof(IServiceScopeFactory)))
            .Returns(_mockServiceScopeFactory.Object);

        _service = new ChatService(
            _context,
            _mockChatHubService.Object,
            _mockHttpContextAccessor.Object,
            _mockServiceProvider.Object,
            _mockLogger.Object);
    }

    public void Dispose()
    {
        _context.Dispose();
    }

    #region GetOrCreateEventChatThreadAsync Tests

    [Fact]
    public async Task GetOrCreateEventChatThreadAsync_ReturnsExistingThread_WhenThreadExists()
    {
        // Arrange
        await SeedEventWithChatThread();

        // Act
        var result = await _service.GetOrCreateEventChatThreadAsync(TestEventId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(TestEventId, result.EventId);
        Assert.True(result.IsDefaultEventThread);
        Assert.Equal("Event Chat", result.Name);
    }

    [Fact]
    public async Task GetOrCreateEventChatThreadAsync_CreatesNewThread_WhenNoThreadExists()
    {
        // Arrange
        await SeedEvent();

        // Act
        var result = await _service.GetOrCreateEventChatThreadAsync(TestEventId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(TestEventId, result.EventId);
        Assert.True(result.IsDefaultEventThread);
        Assert.Equal("Event Chat", result.Name);
        Assert.Equal(0, result.MessageCount);

        // Verify thread was persisted
        var dbThread = await _context.ChatThreads.FindAsync(result.Id);
        Assert.NotNull(dbThread);
        Assert.Equal(_testUser.Email, dbThread.CreatedBy);
    }

    [Fact]
    public async Task GetOrCreateEventChatThreadAsync_ReturnsCorrectMessageCount()
    {
        // Arrange
        await SeedEventWithChatThreadAndMessages(messageCount: 5);

        // Act
        var result = await _service.GetOrCreateEventChatThreadAsync(TestEventId);

        // Assert
        Assert.Equal(5, result.MessageCount);
    }

    [Fact]
    public async Task GetOrCreateEventChatThreadAsync_ExcludesInactiveMessages_FromCount()
    {
        // Arrange
        var threadId = await SeedEventWithChatThreadAndMessages(messageCount: 5);

        // Mark 2 messages as inactive
        var messages = _context.ChatMessages.Where(m => m.ChatThreadId == threadId).Take(2).ToList();
        foreach (var msg in messages)
        {
            msg.IsActive = false;
        }
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetOrCreateEventChatThreadAsync(TestEventId);

        // Assert
        Assert.Equal(3, result.MessageCount); // Only active messages counted
    }

    [Fact]
    public async Task GetOrCreateEventChatThreadAsync_IgnoresInactiveThreads()
    {
        // Arrange
        await SeedEvent();
        var inactiveThread = new ChatThread
        {
            Id = Guid.NewGuid(),
            EventId = TestEventId,
            Name = "Inactive Thread",
            IsDefaultEventThread = true,
            IsActive = false,
            CreatedBy = "test@test.com"
        };
        _context.ChatThreads.Add(inactiveThread);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetOrCreateEventChatThreadAsync(TestEventId);

        // Assert - Should create a new thread since the existing one is inactive
        Assert.NotEqual(inactiveThread.Id, result.Id);
        Assert.True(result.IsDefaultEventThread);
    }

    #endregion

    #region GetMessagesAsync Tests

    [Fact]
    public async Task GetMessagesAsync_ReturnsMessages_OrderedByCreatedAt()
    {
        // Arrange
        var threadId = await SeedEventWithChatThreadAndMessages(messageCount: 5);

        // Act
        var result = await _service.GetMessagesAsync(threadId);

        // Assert
        Assert.Equal(5, result.Count);
        for (int i = 1; i < result.Count; i++)
        {
            Assert.True(result[i].CreatedAt >= result[i - 1].CreatedAt);
        }
    }

    [Fact]
    public async Task GetMessagesAsync_ReturnsEmptyList_WhenNoMessages()
    {
        // Arrange
        await SeedEventWithChatThread();
        var thread = _context.ChatThreads.First();

        // Act
        var result = await _service.GetMessagesAsync(thread.Id);

        // Assert
        Assert.Empty(result);
    }

    [Fact]
    public async Task GetMessagesAsync_ExcludesInactiveMessages()
    {
        // Arrange
        var threadId = await SeedEventWithChatThreadAndMessages(messageCount: 5);

        // Mark 2 messages as inactive
        var messages = _context.ChatMessages.Where(m => m.ChatThreadId == threadId).Take(2).ToList();
        foreach (var msg in messages)
        {
            msg.IsActive = false;
        }
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetMessagesAsync(threadId);

        // Assert
        Assert.Equal(3, result.Count);
    }

    [Fact]
    public async Task GetMessagesAsync_RespectsSkipAndTake()
    {
        // Arrange
        var threadId = await SeedEventWithChatThreadAndMessages(messageCount: 10);

        // Act
        var result = await _service.GetMessagesAsync(threadId, skip: 2, take: 3);

        // Assert
        Assert.Equal(3, result.Count);
    }

    [Fact]
    public async Task GetMessagesAsync_IncludesExternalMessageMetadata()
    {
        // Arrange
        var threadId = await SeedEventWithChatThread();
        var externalMessage = new ChatMessage
        {
            Id = Guid.NewGuid(),
            ChatThreadId = threadId,
            Message = "External message",
            SenderDisplayName = "External User",
            IsActive = true,
            CreatedBy = "system",
            CreatedAt = DateTime.UtcNow,
            ExternalSource = ExternalPlatform.GroupMe,
            ExternalSenderName = "GroupMe User",
            ExternalMessageId = "ext-123"
        };
        _context.ChatMessages.Add(externalMessage);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetMessagesAsync(threadId);

        // Assert
        var msg = result.First();
        Assert.True(msg.IsExternalMessage);
        Assert.Equal("GroupMe", msg.ExternalSource);
        Assert.Equal("GroupMe User", msg.ExternalSenderName);
    }

    #endregion

    #region SendMessageAsync Tests

    [Fact]
    public async Task SendMessageAsync_CreatesMessage_AndPersistsToDatabase()
    {
        // Arrange
        var threadId = await SeedEventWithChatThread();
        var message = "Hello, world!";

        // Act
        var result = await _service.SendMessageAsync(TestEventId, threadId, message);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(message, result.Message);
        Assert.Equal(_testUser.FullName, result.SenderDisplayName);
        Assert.Equal(_testUser.Email, result.CreatedBy);
        Assert.False(result.IsExternalMessage);

        // Verify persisted
        var dbMessage = await _context.ChatMessages.FindAsync(result.Id);
        Assert.NotNull(dbMessage);
        Assert.Equal(message, dbMessage.Message);
    }

    [Fact]
    public async Task SendMessageAsync_BroadcastsViaSignalR()
    {
        // Arrange
        var threadId = await SeedEventWithChatThread();

        // Act
        await _service.SendMessageAsync(TestEventId, threadId, "Test message");

        // Assert
        _mockChatHubService.Verify(
            x => x.BroadcastMessageToEventAsync(
                TestEventId,
                It.Is<ChatMessageDto>(dto => dto.Message == "Test message")),
            Times.Once);
    }

    [Fact]
    public async Task SendMessageAsync_ForwardsToExternalChannels()
    {
        // Arrange
        var threadId = await SeedEventWithChatThread();
        var message = "Test broadcast";

        // Act
        await _service.SendMessageAsync(TestEventId, threadId, message);

        // Wait briefly for the background task
        await Task.Delay(100);

        // Assert
        _mockExternalMessagingService.Verify(
            x => x.BroadcastToExternalChannelsAsync(
                TestEventId,
                _testUser.FullName,
                message),
            Times.Once);
    }

    [Fact]
    public async Task SendMessageAsync_SetsCorrectAuditFields()
    {
        // Arrange
        var threadId = await SeedEventWithChatThread();
        var beforeSend = DateTime.UtcNow;

        // Act
        var result = await _service.SendMessageAsync(TestEventId, threadId, "Test");

        // Assert
        Assert.Equal(_testUser.Email, result.CreatedBy);
        Assert.True(result.CreatedAt >= beforeSend);
    }

    #endregion

    #region CreateExternalMessageAsync Tests

    [Fact]
    public async Task CreateExternalMessageAsync_CreatesMessage_WithExternalMetadata()
    {
        // Arrange
        var threadId = await SeedEventWithChatThread();
        var mappingId = Guid.NewGuid();
        var externalMessageId = "groupme-msg-123";
        var senderName = "External User";
        var senderId = "user-456";
        var message = "Hello from GroupMe";
        var attachmentUrl = "https://example.com/image.png";
        var externalTimestamp = DateTime.UtcNow.AddMinutes(-5);

        // Act
        var result = await _service.CreateExternalMessageAsync(
            threadId,
            TestEventId,
            ExternalPlatform.GroupMe,
            externalMessageId,
            senderName,
            senderId,
            message,
            attachmentUrl,
            externalTimestamp,
            mappingId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(message, result.Message);
        Assert.Equal(senderName, result.SenderDisplayName);
        Assert.True(result.IsExternalMessage);
        Assert.Equal("GroupMe", result.ExternalSource);
        Assert.Equal(senderName, result.ExternalSenderName);
        Assert.Equal(attachmentUrl, result.ExternalAttachmentUrl);

        // Verify persisted
        var dbMessage = await _context.ChatMessages.FindAsync(result.Id);
        Assert.NotNull(dbMessage);
        Assert.Equal(ExternalPlatform.GroupMe, dbMessage.ExternalSource);
        Assert.Equal(externalMessageId, dbMessage.ExternalMessageId);
        Assert.Equal(senderId, dbMessage.ExternalSenderId);
        Assert.Equal(mappingId, dbMessage.ExternalChannelMappingId);
    }

    [Fact]
    public async Task CreateExternalMessageAsync_BroadcastsViaSignalR()
    {
        // Arrange
        var threadId = await SeedEventWithChatThread();

        // Act
        await _service.CreateExternalMessageAsync(
            threadId,
            TestEventId,
            ExternalPlatform.GroupMe,
            "ext-123",
            "Sender",
            "user-1",
            "Message",
            null,
            null,
            Guid.NewGuid());

        // Assert
        _mockChatHubService.Verify(
            x => x.BroadcastMessageToEventAsync(
                TestEventId,
                It.Is<ChatMessageDto>(dto => dto.IsExternalMessage == true)),
            Times.Once);
    }

    [Fact]
    public async Task CreateExternalMessageAsync_SetsCreatedByToSystem()
    {
        // Arrange
        var threadId = await SeedEventWithChatThread();

        // Act
        var result = await _service.CreateExternalMessageAsync(
            threadId,
            TestEventId,
            ExternalPlatform.GroupMe,
            "ext-123",
            "Sender",
            null,
            "Message",
            null,
            null,
            Guid.NewGuid());

        // Assert
        Assert.Equal("system", result.CreatedBy);
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

    private async Task<Guid> SeedEventWithChatThread()
    {
        await SeedEvent();

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

    private async Task<Guid> SeedEventWithChatThreadAndMessages(int messageCount)
    {
        var threadId = await SeedEventWithChatThread();

        for (int i = 0; i < messageCount; i++)
        {
            var message = new ChatMessage
            {
                Id = Guid.NewGuid(),
                ChatThreadId = threadId,
                Message = $"Message {i + 1}",
                SenderDisplayName = "Test User",
                IsActive = true,
                CreatedBy = "test@test.com",
                CreatedAt = DateTime.UtcNow.AddMinutes(i)
            };
            _context.ChatMessages.Add(message);
        }
        await _context.SaveChangesAsync();

        return threadId;
    }

    #endregion
}
