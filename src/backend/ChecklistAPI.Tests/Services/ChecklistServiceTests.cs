using ChecklistAPI.Data;
using ChecklistAPI.Hubs;
using ChecklistAPI.Models;
using ChecklistAPI.Models.DTOs;
using ChecklistAPI.Models.Entities;
using ChecklistAPI.Services;
using ChecklistAPI.Tests.Helpers;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace ChecklistAPI.Tests.Services;

/// <summary>
/// Unit tests for ChecklistService
/// Tests all CRUD operations, progress tracking, filtering, and business logic
/// </summary>
public class ChecklistServiceTests : IDisposable
{
    private readonly ChecklistDbContext _context;
    private readonly Mock<ILogger<ChecklistService>> _mockLogger;
    private readonly Mock<IHubContext<ChecklistHub>> _mockHubContext;
    private readonly ChecklistService _service;
    private readonly UserContext _testUser;
    private readonly UserContext _adminUser;
    private Guid _templateId;

    // Test operational period IDs
    private static readonly Guid TestOpPeriod1Id = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid TestOpPeriodNewId = Guid.Parse("22222222-2222-2222-2222-222222222222");

    // Test event IDs
    private static readonly Guid TestEvent1Id = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
    private static readonly Guid TestEventTestId = Guid.Parse("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");
    private static readonly Guid TestEventUpdatedId = Guid.Parse("cccccccc-cccc-cccc-cccc-cccccccccccc");
    private static readonly Guid TestEvent2Id = Guid.Parse("dddddddd-dddd-dddd-dddd-dddddddddddd");
    private static readonly Guid TestEvent3Id = Guid.Parse("eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee");

    public ChecklistServiceTests()
    {
        _context = TestDbContextFactory.CreateInMemoryContext();
        _mockLogger = new Mock<ILogger<ChecklistService>>();
        _mockHubContext = new Mock<IHubContext<ChecklistHub>>();

        // Setup mock hub context
        var mockClients = new Mock<IHubClients>();
        var mockClientProxy = new Mock<IClientProxy>();
        mockClients.Setup(c => c.Group(It.IsAny<string>())).Returns(mockClientProxy.Object);
        mockClients.Setup(c => c.All).Returns(mockClientProxy.Object);
        _mockHubContext.Setup(h => h.Clients).Returns(mockClients.Object);

        _service = new ChecklistService(_context, _mockLogger.Object, _mockHubContext.Object);
        _testUser = TestUserContextFactory.CreateTestUser(
            position: "Safety Officer");
        _adminUser = TestUserContextFactory.CreateAdminUser();
    }

    public void Dispose()
    {
        _context.Dispose();
    }

    #region GetMyChecklistsAsync Tests

    [Fact]
    public async Task GetMyChecklistsAsync_ReturnsOnlyChecklistsForUserPosition()
    {
        // Arrange
        await SeedTestData();
        var opsUser = TestUserContextFactory.CreateTestUser(position: "Operations Section Chief");

        // Act
        var result = await _service.GetMyChecklistsAsync(opsUser, includeArchived: false);

        // Assert
        Assert.Equal(2, result.Count); // Operations checklist + General checklist (null AssignedPositions)
        Assert.Contains(result, c => c.AssignedPositions == "Operations Section Chief");
        Assert.Contains(result, c => c.AssignedPositions == null || c.AssignedPositions == string.Empty);
    }

    [Fact]
    public async Task GetMyChecklistsAsync_ReturnsAllChecklists_WhenAssignedPositionsIsNull()
    {
        // Arrange
        await SeedTestData();

        // Act
        var result = await _service.GetMyChecklistsAsync(_testUser, includeArchived: false);

        // Assert
        Assert.Equal(2, result.Count); // Safety Officer checklist + null AssignedPositions checklist
    }

    [Fact]
    public async Task GetMyChecklistsAsync_ExcludesArchivedChecklists_ByDefault()
    {
        // Arrange
        await SeedTestData();

        // Act
        var result = await _service.GetMyChecklistsAsync(_testUser, includeArchived: false);

        // Assert
        Assert.DoesNotContain(result, c => c.IsArchived);
    }

    [Fact]
    public async Task GetMyChecklistsAsync_IncludesArchivedChecklists_WhenRequested()
    {
        // Arrange
        await SeedTestData();

        // Act
        var result = await _service.GetMyChecklistsAsync(_adminUser, includeArchived: true);

        // Assert
        Assert.Contains(result, c => c.IsArchived);
    }

    #endregion

    #region GetChecklistByIdAsync Tests

    [Fact]
    public async Task GetChecklistByIdAsync_ReturnsChecklist_WhenExists()
    {
        // Arrange
        await SeedTestData();
        var checklistId = _context.ChecklistInstances.First().Id;

        // Act
        var result = await _service.GetChecklistByIdAsync(checklistId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(checklistId, result.Id);
        Assert.NotEmpty(result.Items);
    }

    [Fact]
    public async Task GetChecklistByIdAsync_ReturnsNull_WhenNotExists()
    {
        // Act
        var result = await _service.GetChecklistByIdAsync(Guid.NewGuid());

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task GetChecklistByIdAsync_IncludesItemsOrderedByDisplayOrder()
    {
        // Arrange
        await SeedTestData();
        var checklistId = _context.ChecklistInstances.First().Id;

        // Act
        var result = await _service.GetChecklistByIdAsync(checklistId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(3, result.Items.Count);
        Assert.True(result.Items[0].DisplayOrder < result.Items[1].DisplayOrder);
        Assert.True(result.Items[1].DisplayOrder < result.Items[2].DisplayOrder);
    }

    #endregion

    #region GetChecklistsByEventAsync Tests

    [Fact]
    public async Task GetChecklistsByEventAsync_ReturnsOnlyChecklistsForEvent()
    {
        // Arrange
        await SeedTestData();

        // Act
        var result = await _service.GetChecklistsByEventAsync(TestEvent1Id, _adminUser, includeArchived: false, showAll: true);

        // Assert
        Assert.Equal(3, result.Count); // Safety, Operations, and General checklists (excluding archived) - showAll bypasses position filtering
        Assert.All(result, c => Assert.Equal(TestEvent1Id, c.EventId));
    }

    [Fact]
    public async Task GetChecklistsByEventAsync_ExcludesArchivedByDefault()
    {
        // Arrange
        await SeedTestData();

        // Act
        var result = await _service.GetChecklistsByEventAsync(TestEvent1Id, _adminUser, includeArchived: false);

        // Assert
        Assert.DoesNotContain(result, c => c.IsArchived);
    }

    #endregion

    #region GetChecklistsByOperationalPeriodAsync Tests

    [Fact]
    public async Task GetChecklistsByOperationalPeriodAsync_ReturnsOnlyChecklistsForPeriod()
    {
        // Arrange
        await SeedTestData();

        // Act
        var result = await _service.GetChecklistsByOperationalPeriodAsync(
            TestEvent1Id,
            TestOpPeriod1Id,
            includeArchived: false);

        // Assert
        Assert.Single(result);
        Assert.Equal(TestOpPeriod1Id, result[0].OperationalPeriodId);
    }

    #endregion

    #region CreateFromTemplateAsync Tests

    [Fact]
    public async Task CreateFromTemplateAsync_CreatesChecklistWithAllItems()
    {
        // Arrange
        await SeedTestTemplate();
        var request = new CreateFromTemplateRequest
        {
            TemplateId = _templateId,
            Name = "Test Checklist",
            EventId = TestEventTestId,
            EventName = "Test Event"
        };

        // Act
        var result = await _service.CreateFromTemplateAsync(request, _testUser);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("Test Checklist", result.Name);
        Assert.Equal(TestEventTestId, result.EventId);
        Assert.Equal(3, result.Items.Count); // Same as template
        Assert.Equal(_testUser.Email, result.CreatedBy);
        Assert.Equal(_testUser.Position, result.CreatedByPosition);
    }

    [Fact]
    public async Task CreateFromTemplateAsync_InitializesProgressToZero()
    {
        // Arrange
        await SeedTestTemplate();
        var request = new CreateFromTemplateRequest
        {
            TemplateId = _templateId,
            EventId = TestEventTestId,
            EventName = "Test Event"
        };

        // Act
        var result = await _service.CreateFromTemplateAsync(request, _testUser);

        // Assert
        Assert.Equal(0, result.ProgressPercentage);
        Assert.Equal(0, result.CompletedItems);
        Assert.Equal(3, result.TotalItems);
        Assert.Equal(2, result.RequiredItems); // 2 required items in template
        Assert.Equal(0, result.RequiredItemsCompleted);
    }

    [Fact]
    public async Task CreateFromTemplateAsync_GeneratesDefaultName_WhenNameNotProvided()
    {
        // Arrange
        await SeedTestTemplate();
        var request = new CreateFromTemplateRequest
        {
            TemplateId = _templateId,
            EventId = TestEventTestId,
            EventName = "Test Event"
        };

        // Act
        var result = await _service.CreateFromTemplateAsync(request, _testUser);

        // Assert
        Assert.Contains("Test Template", result.Name);
        Assert.Contains(DateTime.UtcNow.Year.ToString(), result.Name);
    }

    [Fact]
    public async Task CreateFromTemplateAsync_ThrowsException_WhenTemplateNotFound()
    {
        // Arrange
        var request = new CreateFromTemplateRequest
        {
            TemplateId = Guid.NewGuid(),
            EventId = TestEventTestId,
            EventName = "Test Event"
        };

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _service.CreateFromTemplateAsync(request, _testUser));
    }

    [Fact]
    public async Task CreateFromTemplateAsync_ThrowsException_WhenTemplateIsInactive()
    {
        // Arrange
        await SeedTestTemplate();
        var template = await _context.Templates.FindAsync(_templateId);
        template!.IsActive = false;
        await _context.SaveChangesAsync();

        var request = new CreateFromTemplateRequest
        {
            TemplateId = _templateId,
            EventId = TestEventTestId,
            EventName = "Test Event"
        };

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _service.CreateFromTemplateAsync(request, _testUser));
    }

    #endregion

    #region UpdateChecklistAsync Tests

    [Fact]
    public async Task UpdateChecklistAsync_UpdatesMetadata()
    {
        // Arrange
        await SeedTestData();
        var checklistId = _context.ChecklistInstances.First().Id;
        var request = new UpdateChecklistRequest
        {
            Name = "Updated Name",
            EventId = TestEventUpdatedId,
            EventName = "Updated Event",
            OperationalPeriodId = TestOpPeriodNewId,
            OperationalPeriodName = "New Period"
        };

        // Act
        var result = await _service.UpdateChecklistAsync(checklistId, request, _testUser);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("Updated Name", result.Name);
        Assert.Equal(TestEventUpdatedId, result.EventId);
        Assert.Equal(TestOpPeriodNewId, result.OperationalPeriodId);
        Assert.Equal(_testUser.Email, result.LastModifiedBy);
        Assert.Equal(_testUser.Position, result.LastModifiedByPosition);
        Assert.NotNull(result.LastModifiedAt);
    }

    [Fact]
    public async Task UpdateChecklistAsync_ReturnsNull_WhenChecklistNotFound()
    {
        // Arrange
        var request = new UpdateChecklistRequest
        {
            Name = "Updated",
            EventId = TestEvent1Id,
            EventName = "Event"
        };

        // Act
        var result = await _service.UpdateChecklistAsync(Guid.NewGuid(), request, _testUser);

        // Assert
        Assert.Null(result);
    }

    #endregion

    #region ArchiveChecklistAsync Tests

    [Fact]
    public async Task ArchiveChecklistAsync_SetsIsArchivedToTrue()
    {
        // Arrange
        await SeedTestData();
        var checklistId = _context.ChecklistInstances.First(c => !c.IsArchived).Id;

        // Act
        var result = await _service.ArchiveChecklistAsync(checklistId, _testUser);

        // Assert
        Assert.True(result);
        var checklist = await _context.ChecklistInstances.FindAsync(checklistId);
        Assert.True(checklist!.IsArchived);
        Assert.Equal(_testUser.Email, checklist.ArchivedBy);
        Assert.NotNull(checklist.ArchivedAt);
    }

    [Fact]
    public async Task ArchiveChecklistAsync_ReturnsFalse_WhenChecklistNotFound()
    {
        // Act
        var result = await _service.ArchiveChecklistAsync(Guid.NewGuid(), _testUser);

        // Assert
        Assert.False(result);
    }

    #endregion

    #region RestoreChecklistAsync Tests

    [Fact]
    public async Task RestoreChecklistAsync_SetsIsArchivedToFalse()
    {
        // Arrange
        await SeedTestData();
        var checklistId = _context.ChecklistInstances.First(c => c.IsArchived).Id;

        // Act
        var result = await _service.RestoreChecklistAsync(checklistId, _adminUser);

        // Assert
        Assert.True(result);
        var checklist = await _context.ChecklistInstances.FindAsync(checklistId);
        Assert.False(checklist!.IsArchived);
        Assert.Null(checklist.ArchivedBy);
        Assert.Null(checklist.ArchivedAt);
    }

    #endregion

    #region GetArchivedChecklistsAsync Tests

    [Fact]
    public async Task GetArchivedChecklistsAsync_ReturnsOnlyArchivedChecklists()
    {
        // Arrange
        await SeedTestData();

        // Act
        var result = await _service.GetArchivedChecklistsAsync();

        // Assert
        Assert.Single(result);
        Assert.All(result, c => Assert.True(c.IsArchived));
    }

    #endregion

    #region RecalculateProgressAsync Tests

    [Fact]
    public async Task RecalculateProgressAsync_UpdatesProgressCorrectly_WithAllItemsIncomplete()
    {
        // Arrange
        await SeedTestData();
        var checklistId = _context.ChecklistInstances.First().Id;

        // Ensure all items are incomplete
        var checklist = await _context.ChecklistInstances
            .Include(c => c.Items)
            .FirstAsync(c => c.Id == checklistId);
        foreach (var item in checklist.Items)
        {
            item.IsCompleted = false;
        }
        await _context.SaveChangesAsync();

        // Act
        await _service.RecalculateProgressAsync(checklistId);

        // Assert
        var updated = await _context.ChecklistInstances.FindAsync(checklistId);
        Assert.NotNull(updated);
        Assert.Equal(0, updated.ProgressPercentage);
        Assert.Equal(0, updated.CompletedItems);
        Assert.Equal(0, updated.RequiredItemsCompleted);
        Assert.Equal(3, updated.TotalItems);
        Assert.Equal(2, updated.RequiredItems);
    }

    [Fact]
    public async Task RecalculateProgressAsync_UpdatesProgressCorrectly_WithAllItemsComplete()
    {
        // Arrange
        await SeedTestData();
        var checklistId = _context.ChecklistInstances.First().Id;

        // Mark all items complete
        var checklist = await _context.ChecklistInstances
            .Include(c => c.Items)
            .FirstAsync(c => c.Id == checklistId);
        foreach (var item in checklist.Items)
        {
            item.IsCompleted = true;
        }
        await _context.SaveChangesAsync();

        // Act
        await _service.RecalculateProgressAsync(checklistId);

        // Assert
        var updated = await _context.ChecklistInstances.FindAsync(checklistId);
        Assert.NotNull(updated);
        Assert.Equal(100, updated.ProgressPercentage);
        Assert.Equal(3, updated.CompletedItems);
        Assert.Equal(2, updated.RequiredItemsCompleted);
        Assert.Equal(3, updated.TotalItems);
        Assert.Equal(2, updated.RequiredItems);
    }

    [Fact]
    public async Task RecalculateProgressAsync_UpdatesProgressCorrectly_WithPartialCompletion()
    {
        // Arrange
        await SeedTestData();
        var checklistId = _context.ChecklistInstances.First().Id;

        // Mark first item complete (1 out of 3 = 33.33%)
        var checklist = await _context.ChecklistInstances
            .Include(c => c.Items)
            .FirstAsync(c => c.Id == checklistId);
        checklist.Items.First().IsCompleted = true;
        await _context.SaveChangesAsync();

        // Act
        await _service.RecalculateProgressAsync(checklistId);

        // Assert
        var updated = await _context.ChecklistInstances.FindAsync(checklistId);
        Assert.NotNull(updated);
        Assert.Equal(33.33m, updated.ProgressPercentage); // Rounded to 2 decimal places
        Assert.Equal(1, updated.CompletedItems);
        Assert.Equal(1, updated.RequiredItemsCompleted); // First item is required
        Assert.Equal(3, updated.TotalItems);
        Assert.Equal(2, updated.RequiredItems);
    }

    [Fact]
    public async Task RecalculateProgressAsync_DistinguishesRequiredVsOptionalItems()
    {
        // Arrange
        await SeedTestData();
        var checklistId = _context.ChecklistInstances.First().Id;

        // Mark only the optional item complete (third item, IsRequired = false)
        var checklist = await _context.ChecklistInstances
            .Include(c => c.Items)
            .FirstAsync(c => c.Id == checklistId);
        var optionalItem = checklist.Items.OrderBy(i => i.DisplayOrder).Last();
        optionalItem.IsCompleted = true;
        await _context.SaveChangesAsync();

        // Act
        await _service.RecalculateProgressAsync(checklistId);

        // Assert
        var updated = await _context.ChecklistInstances.FindAsync(checklistId);
        Assert.NotNull(updated);
        Assert.Equal(33.33m, updated.ProgressPercentage); // 1 out of 3 items
        Assert.Equal(1, updated.CompletedItems);
        Assert.Equal(0, updated.RequiredItemsCompleted); // Optional item doesn't count
        Assert.Equal(2, updated.RequiredItems);
    }

    [Fact]
    public async Task RecalculateProgressAsync_HandlesChecklistWithNoItems()
    {
        // Arrange
        await SeedTestTemplate();
        var emptyChecklist = new ChecklistInstance
        {
            Id = Guid.NewGuid(),
            Name = "Empty Checklist",
            TemplateId = _templateId,
            EventId = TestEvent2Id,
            EventName = "Empty Event",
            CreatedBy = "test@test.com",
            CreatedByPosition = "Safety Officer",
            Items = new List<ChecklistItem>()
        };
        _context.ChecklistInstances.Add(emptyChecklist);
        await _context.SaveChangesAsync();

        // Act
        await _service.RecalculateProgressAsync(emptyChecklist.Id);

        // Assert
        var updated = await _context.ChecklistInstances.FindAsync(emptyChecklist.Id);
        Assert.NotNull(updated);
        Assert.Equal(0, updated.ProgressPercentage);
        Assert.Equal(0, updated.CompletedItems);
        Assert.Equal(0, updated.RequiredItemsCompleted);
        Assert.Equal(0, updated.TotalItems);
        Assert.Equal(0, updated.RequiredItems);
    }

    [Fact]
    public async Task RecalculateProgressAsync_DoesNotThrow_WhenChecklistNotFound()
    {
        // Arrange
        var nonExistentId = Guid.NewGuid();

        // Act & Assert - Should not throw
        await _service.RecalculateProgressAsync(nonExistentId);

        // Verify warning was logged
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Warning,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString().Contains("not found")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    [Fact]
    public async Task RecalculateProgressAsync_RoundsToTwoDecimalPlaces()
    {
        // Arrange
        await SeedTestTemplate();
        var checklistId = Guid.NewGuid();
        var checklist = new ChecklistInstance
        {
            Id = checklistId,
            Name = "Rounding Test Checklist",
            TemplateId = _templateId,
            EventId = TestEvent3Id,
            EventName = "Rounding Test",
            CreatedBy = "test@test.com",
            CreatedByPosition = "Safety Officer",
            Items = new List<ChecklistItem>()
        };

        // Add 7 items (1/7 = 14.285714...%)
        for (int i = 0; i < 7; i++)
        {
            checklist.Items.Add(new ChecklistItem
            {
                Id = Guid.NewGuid(),
                ChecklistInstanceId = checklistId,
                TemplateItemId = Guid.NewGuid(),
                ItemText = $"Item {i + 1}",
                ItemType = "checkbox",
                DisplayOrder = (i + 1) * 10,
                IsRequired = false,
                IsCompleted = i == 0 // Only first item complete
            });
        }

        _context.ChecklistInstances.Add(checklist);
        await _context.SaveChangesAsync();

        // Act
        await _service.RecalculateProgressAsync(checklistId);

        // Assert
        var updated = await _context.ChecklistInstances.FindAsync(checklistId);
        Assert.NotNull(updated);
        Assert.Equal(14.29m, updated.ProgressPercentage); // Should be rounded to 14.29, not 14.285714
        Assert.Equal(1, updated.CompletedItems);
        Assert.Equal(7, updated.TotalItems);
    }

    [Fact]
    public async Task RecalculateProgressAsync_PersistsChangesToDatabase()
    {
        // Arrange
        await SeedTestData();
        var checklistId = _context.ChecklistInstances.First().Id;

        // Mark an item complete
        var checklist = await _context.ChecklistInstances
            .Include(c => c.Items)
            .FirstAsync(c => c.Id == checklistId);
        checklist.Items.First().IsCompleted = true;
        await _context.SaveChangesAsync();

        // Act
        await _service.RecalculateProgressAsync(checklistId);

        // Detach the entity to force a fresh load from the database
        _context.Entry(checklist).State = EntityState.Detached;

        // Assert - Load fresh from database
        var persisted = await _context.ChecklistInstances.FindAsync(checklistId);
        Assert.NotNull(persisted);
        Assert.Equal(33.33m, persisted.ProgressPercentage);
        Assert.Equal(1, persisted.CompletedItems);
    }

    #endregion

    #region CloneChecklistAsync Tests

    [Fact]
    public async Task CloneChecklistAsync_CreatesNewChecklistWithSameItems()
    {
        // Arrange
        await SeedTestData();
        var originalId = _context.ChecklistInstances.First().Id;

        // Act
        var result = await _service.CloneChecklistAsync(originalId, "Cloned Checklist", preserveStatus: false, _testUser);

        // Assert
        Assert.NotNull(result);
        Assert.NotEqual(originalId, result.Id);
        Assert.Equal("Cloned Checklist", result.Name);
        Assert.Equal(3, result.Items.Count);
        Assert.Equal(_testUser.Email, result.CreatedBy);
    }

    [Fact]
    public async Task CloneChecklistAsync_ResetsCompletionStatus()
    {
        // Arrange
        await SeedTestData();
        var originalId = _context.ChecklistInstances.First().Id;

        // Act
        var result = await _service.CloneChecklistAsync(originalId, "Cloned", preserveStatus: false, _testUser);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(0, result.ProgressPercentage);
        Assert.Equal(0, result.CompletedItems);
        Assert.All(result.Items, i => Assert.Null(i.IsCompleted));
    }

    [Fact]
    public async Task CloneChecklistAsync_ReturnsNull_WhenChecklistNotFound()
    {
        // Act
        var result = await _service.CloneChecklistAsync(Guid.NewGuid(), "Clone", preserveStatus: false, _testUser);

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task CloneChecklistAsync_PreservesStatus_WhenPreserveStatusIsTrue()
    {
        // Arrange
        await SeedTestData();

        // Mark items complete on original
        var checklist = await _context.ChecklistInstances
            .Include(c => c.Items)
            .FirstAsync();
        foreach (var item in checklist.Items)
        {
            item.IsCompleted = true;
            item.CompletedBy = "original@test.com";
            item.CompletedAt = DateTime.UtcNow.AddHours(-1);
            item.Notes = "Original notes";
        }
        checklist.CompletedItems = 3;
        checklist.ProgressPercentage = 100;
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.CloneChecklistAsync(checklist.Id, "Preserved Clone", preserveStatus: true, _testUser);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(100, result.ProgressPercentage);
        Assert.Equal(3, result.CompletedItems);
        Assert.All(result.Items, i => Assert.True(i.IsCompleted));
        Assert.All(result.Items, i => Assert.Equal("original@test.com", i.CompletedBy));
        Assert.All(result.Items, i => Assert.Equal("Original notes", i.Notes));
    }

    [Fact]
    public async Task CloneChecklistAsync_OverridesAssignedPositions_WhenProvided()
    {
        // Arrange
        await SeedTestData();
        var originalId = _context.ChecklistInstances.First().Id;
        var newPositions = "Planning Section Chief,Logistics Section Chief";

        // Act
        var result = await _service.CloneChecklistAsync(
            originalId,
            "Clone With New Positions",
            preserveStatus: false,
            _testUser,
            assignedPositions: newPositions);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(newPositions, result.AssignedPositions);
    }

    [Fact]
    public async Task CloneChecklistAsync_InheritsAssignedPositions_WhenNotProvided()
    {
        // Arrange
        await SeedTestData();
        var original = _context.ChecklistInstances.First(c => c.AssignedPositions != null);

        // Act
        var result = await _service.CloneChecklistAsync(
            original.Id,
            "Clone Inheriting Positions",
            preserveStatus: false,
            _testUser);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(original.AssignedPositions, result.AssignedPositions);
    }

    #endregion

    #region GetChecklistsByEventAsync Additional Tests

    [Fact]
    public async Task GetChecklistsByEventAsync_IncludesArchivedChecklists_WhenRequested()
    {
        // Arrange
        await SeedTestData();

        // Act
        var result = await _service.GetChecklistsByEventAsync(TestEvent1Id, _adminUser, includeArchived: true, showAll: true);

        // Assert
        Assert.Equal(4, result.Count); // All 4 checklists including archived - showAll bypasses position filtering
        Assert.Contains(result, c => c.IsArchived);
    }

    [Fact]
    public async Task GetChecklistsByEventAsync_ReturnsEmptyList_WhenEventHasNoChecklists()
    {
        // Arrange
        await SeedTestData();
        var emptyEventId = Guid.NewGuid();

        // Act
        var result = await _service.GetChecklistsByEventAsync(emptyEventId, _adminUser, includeArchived: false);

        // Assert
        Assert.Empty(result);
    }

    #endregion

    #region RestoreChecklistAsync Additional Tests

    [Fact]
    public async Task RestoreChecklistAsync_ReturnsFalse_WhenChecklistNotFound()
    {
        // Act
        var result = await _service.RestoreChecklistAsync(Guid.NewGuid(), _adminUser);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task RestoreChecklistAsync_SetsLastModifiedFields()
    {
        // Arrange
        await SeedTestData();
        var archivedChecklist = _context.ChecklistInstances.First(c => c.IsArchived);

        // Act
        var result = await _service.RestoreChecklistAsync(archivedChecklist.Id, _adminUser);

        // Assert
        Assert.True(result);
        var restored = await _context.ChecklistInstances.FindAsync(archivedChecklist.Id);
        Assert.NotNull(restored);
        Assert.Equal(_adminUser.Email, restored.LastModifiedBy);
        Assert.Equal(_adminUser.Position, restored.LastModifiedByPosition);
        Assert.NotNull(restored.LastModifiedAt);
    }

    #endregion

    #region CreateFromTemplateAsync Additional Tests

    [Fact]
    public async Task CreateFromTemplateAsync_SetsAssignedPositions_WhenProvided()
    {
        // Arrange
        await SeedTestTemplate();
        var request = new CreateFromTemplateRequest
        {
            TemplateId = _templateId,
            Name = "Assigned Checklist",
            EventId = TestEventTestId,
            EventName = "Test Event",
            AssignedPositions = "Safety Officer,Incident Commander"
        };

        // Act
        var result = await _service.CreateFromTemplateAsync(request, _testUser);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("Safety Officer,Incident Commander", result.AssignedPositions);
    }

    [Fact]
    public async Task CreateFromTemplateAsync_SetsOperationalPeriod_WhenProvided()
    {
        // Arrange
        await SeedTestTemplate();
        var opPeriodId = Guid.NewGuid();
        var request = new CreateFromTemplateRequest
        {
            TemplateId = _templateId,
            Name = "Period Checklist",
            EventId = TestEventTestId,
            EventName = "Test Event",
            OperationalPeriodId = opPeriodId,
            OperationalPeriodName = "Day Shift - Nov 29"
        };

        // Act
        var result = await _service.CreateFromTemplateAsync(request, _testUser);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(opPeriodId, result.OperationalPeriodId);
        Assert.Equal("Day Shift - Nov 29", result.OperationalPeriodName);
    }

    [Fact]
    public async Task CreateFromTemplateAsync_IncrementsTemplateUsageCount()
    {
        // Arrange
        await SeedTestTemplate();
        var template = await _context.Templates.FindAsync(_templateId);
        var originalUsageCount = template!.UsageCount;

        var request = new CreateFromTemplateRequest
        {
            TemplateId = _templateId,
            EventId = TestEventTestId,
            EventName = "Test Event"
        };

        // Act
        await _service.CreateFromTemplateAsync(request, _testUser);

        // Assert
        var updatedTemplate = await _context.Templates.FindAsync(_templateId);
        Assert.Equal(originalUsageCount + 1, updatedTemplate!.UsageCount);
        Assert.NotNull(updatedTemplate.LastUsedAt);
    }

    [Fact]
    public async Task CreateFromTemplateAsync_ThrowsException_WhenTemplateIsArchived()
    {
        // Arrange
        await SeedTestTemplate();
        var template = await _context.Templates.FindAsync(_templateId);
        template!.IsArchived = true;
        await _context.SaveChangesAsync();

        var request = new CreateFromTemplateRequest
        {
            TemplateId = _templateId,
            EventId = TestEventTestId,
            EventName = "Test Event"
        };

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _service.CreateFromTemplateAsync(request, _testUser));
    }

    #endregion

    #region Helper Methods

    private async Task SeedTestTemplate()
    {
        _templateId = Guid.NewGuid();
        var template = new Template
        {
            Id = _templateId,
            Name = "Test Template",
            Category = "Safety",
            IsActive = true,
            CreatedBy = "admin@test.com",
            CreatedByPosition = "Admin"
        };

        template.Items.Add(new TemplateItem
        {
            Id = Guid.NewGuid(),
            TemplateId = _templateId,
            ItemText = "Item 1",
            ItemType = "checkbox",
            DisplayOrder = 10,
            IsRequired = true
        });

        template.Items.Add(new TemplateItem
        {
            Id = Guid.NewGuid(),
            TemplateId = _templateId,
            ItemText = "Item 2",
            ItemType = "status",
            DisplayOrder = 20,
            IsRequired = true,
            StatusConfiguration = "[{\"label\":\"Not Started\",\"isCompletion\":false,\"order\":1},{\"label\":\"In Progress\",\"isCompletion\":false,\"order\":2},{\"label\":\"Complete\",\"isCompletion\":true,\"order\":3}]"
        });

        template.Items.Add(new TemplateItem
        {
            Id = Guid.NewGuid(),
            TemplateId = _templateId,
            ItemText = "Item 3",
            ItemType = "checkbox",
            DisplayOrder = 30,
            IsRequired = false
        });

        await _context.Templates.AddAsync(template);
        await _context.SaveChangesAsync();
    }

    private async Task SeedTestData()
    {
        await SeedTestTemplate();

        // Checklist 1: Assigned to Safety Officer
        var checklist1 = new ChecklistInstance
        {
            Id = Guid.NewGuid(),
            Name = "Safety Checklist",
            TemplateId = _templateId,
            EventId = TestEvent1Id,
            EventName = "Test Event",
            OperationalPeriodId = TestOpPeriod1Id,
            AssignedPositions = "Safety Officer",
            CreatedBy = "test@test.com",
            CreatedByPosition = "Safety Officer",
            TotalItems = 3,
            CompletedItems = 0,
            RequiredItems = 2,
            ProgressPercentage = 0
        };

        checklist1.Items.Add(new ChecklistItem
        {
            Id = Guid.NewGuid(),
            ChecklistInstanceId = checklist1.Id,
            TemplateItemId = Guid.NewGuid(),
            ItemText = "Item 1",
            ItemType = "checkbox",
            DisplayOrder = 10,
            IsRequired = true
        });

        checklist1.Items.Add(new ChecklistItem
        {
            Id = Guid.NewGuid(),
            ChecklistInstanceId = checklist1.Id,
            TemplateItemId = Guid.NewGuid(),
            ItemText = "Item 2",
            ItemType = "checkbox",
            DisplayOrder = 20,
            IsRequired = true
        });

        checklist1.Items.Add(new ChecklistItem
        {
            Id = Guid.NewGuid(),
            ChecklistInstanceId = checklist1.Id,
            TemplateItemId = Guid.NewGuid(),
            ItemText = "Item 3",
            ItemType = "checkbox",
            DisplayOrder = 30,
            IsRequired = false
        });

        // Checklist 2: Assigned to Operations Section Chief
        var checklist2 = new ChecklistInstance
        {
            Id = Guid.NewGuid(),
            Name = "Operations Checklist",
            TemplateId = _templateId,
            EventId = TestEvent1Id,
            EventName = "Test Event",
            AssignedPositions = "Operations Section Chief",
            CreatedBy = "ops@test.com",
            CreatedByPosition = "Operations Section Chief",
            TotalItems = 3,
            CompletedItems = 0,
            RequiredItems = 2,
            ProgressPercentage = 0
        };

        checklist2.Items.Add(new ChecklistItem
        {
            Id = Guid.NewGuid(),
            ChecklistInstanceId = checklist2.Id,
            TemplateItemId = Guid.NewGuid(),
            ItemText = "Item 1",
            ItemType = "checkbox",
            DisplayOrder = 10,
            IsRequired = true
        });

        checklist2.Items.Add(new ChecklistItem
        {
            Id = Guid.NewGuid(),
            ChecklistInstanceId = checklist2.Id,
            TemplateItemId = Guid.NewGuid(),
            ItemText = "Item 2",
            ItemType = "checkbox",
            DisplayOrder = 20,
            IsRequired = true
        });

        checklist2.Items.Add(new ChecklistItem
        {
            Id = Guid.NewGuid(),
            ChecklistInstanceId = checklist2.Id,
            TemplateItemId = Guid.NewGuid(),
            ItemText = "Item 3",
            ItemType = "checkbox",
            DisplayOrder = 30,
            IsRequired = false
        });

        // Checklist 3: Visible to all (null AssignedPositions)
        var checklist3 = new ChecklistInstance
        {
            Id = Guid.NewGuid(),
            Name = "General Checklist",
            TemplateId = _templateId,
            EventId = TestEvent1Id,
            EventName = "Test Event",
            AssignedPositions = null, // Visible to all
            CreatedBy = "admin@test.com",
            CreatedByPosition = "Incident Commander",
            TotalItems = 3,
            CompletedItems = 0,
            RequiredItems = 2,
            ProgressPercentage = 0
        };

        checklist3.Items.Add(new ChecklistItem
        {
            Id = Guid.NewGuid(),
            ChecklistInstanceId = checklist3.Id,
            TemplateItemId = Guid.NewGuid(),
            ItemText = "Item 1",
            ItemType = "checkbox",
            DisplayOrder = 10,
            IsRequired = true
        });

        checklist3.Items.Add(new ChecklistItem
        {
            Id = Guid.NewGuid(),
            ChecklistInstanceId = checklist3.Id,
            TemplateItemId = Guid.NewGuid(),
            ItemText = "Item 2",
            ItemType = "checkbox",
            DisplayOrder = 20,
            IsRequired = true
        });

        checklist3.Items.Add(new ChecklistItem
        {
            Id = Guid.NewGuid(),
            ChecklistInstanceId = checklist3.Id,
            TemplateItemId = Guid.NewGuid(),
            ItemText = "Item 3",
            ItemType = "checkbox",
            DisplayOrder = 30,
            IsRequired = false
        });

        // Checklist 4: Archived
        var checklist4 = new ChecklistInstance
        {
            Id = Guid.NewGuid(),
            Name = "Archived Checklist",
            TemplateId = _templateId,
            EventId = TestEvent1Id,
            EventName = "Test Event",
            AssignedPositions = null,
            IsArchived = true,
            ArchivedBy = "admin@test.com",
            ArchivedAt = DateTime.UtcNow,
            CreatedBy = "admin@test.com",
            CreatedByPosition = "Incident Commander",
            TotalItems = 3,
            CompletedItems = 0,
            RequiredItems = 2,
            ProgressPercentage = 0
        };

        checklist4.Items.Add(new ChecklistItem
        {
            Id = Guid.NewGuid(),
            ChecklistInstanceId = checklist4.Id,
            TemplateItemId = Guid.NewGuid(),
            ItemText = "Item 1",
            ItemType = "checkbox",
            DisplayOrder = 10,
            IsRequired = true
        });

        checklist4.Items.Add(new ChecklistItem
        {
            Id = Guid.NewGuid(),
            ChecklistInstanceId = checklist4.Id,
            TemplateItemId = Guid.NewGuid(),
            ItemText = "Item 2",
            ItemType = "checkbox",
            DisplayOrder = 20,
            IsRequired = true
        });

        checklist4.Items.Add(new ChecklistItem
        {
            Id = Guid.NewGuid(),
            ChecklistInstanceId = checklist4.Id,
            TemplateItemId = Guid.NewGuid(),
            ItemText = "Item 3",
            ItemType = "checkbox",
            DisplayOrder = 30,
            IsRequired = false
        });

        await _context.ChecklistInstances.AddRangeAsync(
            checklist1, checklist2, checklist3, checklist4);
        await _context.SaveChangesAsync();
    }

    #endregion
}
