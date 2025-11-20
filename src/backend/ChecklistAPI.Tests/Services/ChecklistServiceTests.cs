using ChecklistAPI.Data;
using ChecklistAPI.Models;
using ChecklistAPI.Models.DTOs;
using ChecklistAPI.Models.Entities;
using ChecklistAPI.Services;
using ChecklistAPI.Tests.Helpers;
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
    private readonly ChecklistService _service;
    private readonly UserContext _testUser;
    private readonly UserContext _adminUser;
    private Guid _templateId;

    public ChecklistServiceTests()
    {
        _context = TestDbContextFactory.CreateInMemoryContext();
        _mockLogger = new Mock<ILogger<ChecklistService>>();
        _service = new ChecklistService(_context, _mockLogger.Object);
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
        Assert.Single(result); // Only checklist assigned to Operations Section Chief
        Assert.Contains("Operations", result[0].AssignedPositions);
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
        var result = await _service.GetChecklistsByEventAsync("EVENT-001", includeArchived: false);

        // Assert
        Assert.Equal(2, result.Count);
        Assert.All(result, c => Assert.Equal("EVENT-001", c.EventId));
    }

    [Fact]
    public async Task GetChecklistsByEventAsync_ExcludesArchivedByDefault()
    {
        // Arrange
        await SeedTestData();

        // Act
        var result = await _service.GetChecklistsByEventAsync("EVENT-001", includeArchived: false);

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
            "EVENT-001",
            "OP-001",
            includeArchived: false);

        // Assert
        Assert.Single(result);
        Assert.Equal("OP-001", result[0].OperationalPeriodId);
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
            EventId = "EVENT-TEST",
            EventName = "Test Event"
        };

        // Act
        var result = await _service.CreateFromTemplateAsync(request, _testUser);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("Test Checklist", result.Name);
        Assert.Equal("EVENT-TEST", result.EventId);
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
            EventId = "EVENT-TEST",
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
            EventId = "EVENT-TEST",
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
            EventId = "EVENT-TEST",
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
            EventId = "EVENT-TEST",
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
            EventId = "EVENT-UPDATED",
            EventName = "Updated Event",
            OperationalPeriodId = "OP-NEW",
            OperationalPeriodName = "New Period"
        };

        // Act
        var result = await _service.UpdateChecklistAsync(checklistId, request, _testUser);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("Updated Name", result.Name);
        Assert.Equal("EVENT-UPDATED", result.EventId);
        Assert.Equal("OP-NEW", result.OperationalPeriodId);
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
            EventId = "EVENT-001",
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

    #region CloneChecklistAsync Tests

    [Fact]
    public async Task CloneChecklistAsync_CreatesNewChecklistWithSameItems()
    {
        // Arrange
        await SeedTestData();
        var originalId = _context.ChecklistInstances.First().Id;

        // Act
        var result = await _service.CloneChecklistAsync(originalId, "Cloned Checklist", _testUser);

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
        var result = await _service.CloneChecklistAsync(originalId, "Cloned", _testUser);

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
        var result = await _service.CloneChecklistAsync(Guid.NewGuid(), "Clone", _testUser);

        // Assert
        Assert.Null(result);
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
            StatusOptions = "[\"Not Started\", \"In Progress\", \"Complete\"]"
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
            EventId = "EVENT-001",
            EventName = "Test Event",
            OperationalPeriodId = "OP-001",
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
            EventId = "EVENT-001",
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
            EventId = "EVENT-001",
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
            EventId = "EVENT-001",
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
