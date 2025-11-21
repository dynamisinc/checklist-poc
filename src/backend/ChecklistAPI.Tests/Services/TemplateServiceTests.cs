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
/// Unit tests for TemplateService
/// Tests all CRUD operations, filtering, soft delete, and business logic
/// </summary>
public class TemplateServiceTests : IDisposable
{
    private readonly ChecklistDbContext _context;
    private readonly Mock<ILogger<TemplateService>> _mockLogger;
    private readonly TemplateService _service;
    private readonly UserContext _testUser;
    private readonly UserContext _adminUser;

    public TemplateServiceTests()
    {
        _context = TestDbContextFactory.CreateInMemoryContext();
        _mockLogger = new Mock<ILogger<TemplateService>>();
        _service = new TemplateService(_context, _mockLogger.Object);
        _testUser = TestUserContextFactory.CreateTestUser();
        _adminUser = TestUserContextFactory.CreateAdminUser();
    }

    public void Dispose()
    {
        _context.Dispose();
    }

    #region GetAllTemplatesAsync Tests

    [Fact]
    public async Task GetAllTemplatesAsync_ReturnsOnlyActiveNonArchivedTemplates_ByDefault()
    {
        // Arrange
        await SeedTestTemplates();

        // Act
        var result = await _service.GetAllTemplatesAsync(includeInactive: false);

        // Assert
        Assert.Equal(2, result.Count); // Only active, non-archived templates
        Assert.All(result, t => Assert.True(t.IsActive));
        Assert.All(result, t => Assert.False(t.IsArchived));
    }

    [Fact]
    public async Task GetAllTemplatesAsync_ReturnsInactiveTemplates_WhenIncludeInactiveIsTrue()
    {
        // Arrange
        await SeedTestTemplates();

        // Act
        var result = await _service.GetAllTemplatesAsync(includeInactive: true);

        // Assert
        Assert.Equal(3, result.Count); // Active + inactive, but not archived
        Assert.Contains(result, t => !t.IsActive);
    }

    [Fact]
    public async Task GetAllTemplatesAsync_ExcludesArchivedTemplates_Always()
    {
        // Arrange
        await SeedTestTemplates();

        // Act
        var resultWithInactive = await _service.GetAllTemplatesAsync(includeInactive: true);
        var resultWithoutInactive = await _service.GetAllTemplatesAsync(includeInactive: false);

        // Assert
        Assert.DoesNotContain(resultWithInactive, t => t.IsArchived);
        Assert.DoesNotContain(resultWithoutInactive, t => t.IsArchived);
    }

    [Fact]
    public async Task GetAllTemplatesAsync_ReturnsSortedByCategoryThenName()
    {
        // Arrange
        await _context.Templates.AddAsync(new Template
        {
            Id = Guid.NewGuid(),
            Name = "B Template",
            Category = "Safety",
            IsActive = true,
            CreatedBy = "test@test.com"
        });
        await _context.Templates.AddAsync(new Template
        {
            Id = Guid.NewGuid(),
            Name = "A Template",
            Category = "Safety",
            IsActive = true,
            CreatedBy = "test@test.com"
        });
        await _context.Templates.AddAsync(new Template
        {
            Id = Guid.NewGuid(),
            Name = "C Template",
            Category = "ICS",
            IsActive = true,
            CreatedBy = "test@test.com"
        });
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetAllTemplatesAsync();

        // Assert
        Assert.Equal("ICS", result[0].Category);
        Assert.Equal("Safety", result[1].Category);
        Assert.Equal("A Template", result[1].Name); // Alphabetical within category
        Assert.Equal("B Template", result[2].Name);
    }

    [Fact]
    public async Task GetAllTemplatesAsync_ReturnsEmptyList_WhenNoTemplates()
    {
        // Act
        var result = await _service.GetAllTemplatesAsync();

        // Assert
        Assert.Empty(result);
    }

    [Fact]
    public async Task GetAllTemplatesAsync_IncludesTemplateItems_OrderedByDisplayOrder()
    {
        // Arrange
        var templateId = Guid.NewGuid();
        var template = new Template
        {
            Id = templateId,
            Name = "Test Template",
            Category = "Safety",
            IsActive = true,
            CreatedBy = "test@test.com"
        };
        template.Items.Add(new TemplateItem
        {
            Id = Guid.NewGuid(),
            TemplateId = templateId,
            ItemText = "Second Item",
            DisplayOrder = 2
        });
        template.Items.Add(new TemplateItem
        {
            Id = Guid.NewGuid(),
            TemplateId = templateId,
            ItemText = "First Item",
            DisplayOrder = 1
        });
        await _context.Templates.AddAsync(template);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetAllTemplatesAsync();

        // Assert
        Assert.Single(result);
        Assert.Equal(2, result[0].Items.Count);
        Assert.Equal("First Item", result[0].Items[0].ItemText);
        Assert.Equal("Second Item", result[0].Items[1].ItemText);
    }

    #endregion

    #region GetTemplateByIdAsync Tests

    [Fact]
    public async Task GetTemplateByIdAsync_ReturnsTemplate_WhenExists()
    {
        // Arrange
        var templateId = Guid.NewGuid();
        await _context.Templates.AddAsync(new Template
        {
            Id = templateId,
            Name = "Test Template",
            Category = "Safety",
            IsActive = true,
            CreatedBy = "test@test.com"
        });
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetTemplateByIdAsync(templateId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(templateId, result.Id);
        Assert.Equal("Test Template", result.Name);
    }

    [Fact]
    public async Task GetTemplateByIdAsync_ReturnsNull_WhenNotFound()
    {
        // Act
        var result = await _service.GetTemplateByIdAsync(Guid.NewGuid());

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task GetTemplateByIdAsync_ReturnsArchivedTemplate()
    {
        // Arrange
        var templateId = Guid.NewGuid();
        await _context.Templates.AddAsync(new Template
        {
            Id = templateId,
            Name = "Archived Template",
            Category = "Safety",
            IsActive = true,
            IsArchived = true,
            CreatedBy = "test@test.com"
        });
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetTemplateByIdAsync(templateId);

        // Assert
        Assert.NotNull(result);
        Assert.True(result.IsArchived);
    }

    #endregion

    #region GetTemplatesByCategoryAsync Tests

    [Fact]
    public async Task GetTemplatesByCategoryAsync_ReturnsTemplatesInCategory()
    {
        // Arrange
        await SeedTestTemplates();

        // Act
        var result = await _service.GetTemplatesByCategoryAsync("Safety");

        // Assert - Only active, non-archived templates in Safety category
        Assert.Single(result); // Only "Active Safety Template" (not inactive or archived)
        Assert.All(result, t => Assert.Equal("Safety", t.Category));
        Assert.All(result, t => Assert.True(t.IsActive));
        Assert.All(result, t => Assert.False(t.IsArchived));
    }

    [Fact]
    public async Task GetTemplatesByCategoryAsync_IsCaseInsensitive()
    {
        // Arrange
        await SeedTestTemplates();

        // Act
        var resultLower = await _service.GetTemplatesByCategoryAsync("safety");
        var resultUpper = await _service.GetTemplatesByCategoryAsync("SAFETY");
        var resultMixed = await _service.GetTemplatesByCategoryAsync("SaFeTy");

        // Assert - Only active, non-archived Safety templates (excludes inactive)
        Assert.Single(resultLower);
        Assert.Single(resultUpper);
        Assert.Single(resultMixed);
    }

    [Fact]
    public async Task GetTemplatesByCategoryAsync_ExcludesArchivedAndInactive()
    {
        // Arrange
        await SeedTestTemplates();

        // Act
        var result = await _service.GetTemplatesByCategoryAsync("Safety");

        // Assert
        Assert.All(result, t => Assert.True(t.IsActive));
        Assert.All(result, t => Assert.False(t.IsArchived));
    }

    [Fact]
    public async Task GetTemplatesByCategoryAsync_ReturnsEmptyList_WhenNoCategoryMatch()
    {
        // Arrange
        await SeedTestTemplates();

        // Act
        var result = await _service.GetTemplatesByCategoryAsync("NonExistent");

        // Assert
        Assert.Empty(result);
    }

    #endregion

    #region CreateTemplateAsync Tests

    [Fact]
    public async Task CreateTemplateAsync_CreatesTemplateSuccessfully()
    {
        // Arrange
        var request = new CreateTemplateRequest
        {
            Name = "New Template",
            Description = "Test Description",
            Category = "Safety",
            Tags = "emergency,safety",
            Items = new List<CreateTemplateItemRequest>
            {
                new CreateTemplateItemRequest
                {
                    ItemText = "Item 1",
                    ItemType = "Checkbox",
                    DisplayOrder = 1
                }
            }
        };

        // Act
        var result = await _service.CreateTemplateAsync(request, _testUser);

        // Assert
        Assert.NotNull(result);
        Assert.NotEqual(Guid.Empty, result.Id);
        Assert.Equal("New Template", result.Name);
        Assert.Equal("Test Description", result.Description);
        Assert.Equal("Safety", result.Category);
        Assert.Equal("emergency,safety", result.Tags);
        Assert.True(result.IsActive);
        Assert.False(result.IsArchived);
        Assert.Equal(_testUser.Email, result.CreatedBy);
        Assert.Equal(_testUser.Position, result.CreatedByPosition);
        Assert.Single(result.Items);
    }

    [Fact]
    public async Task CreateTemplateAsync_CreatesTemplateItems_WithCorrectOrder()
    {
        // Arrange
        var request = new CreateTemplateRequest
        {
            Name = "New Template",
            Category = "Safety",
            Items = new List<CreateTemplateItemRequest>
            {
                new CreateTemplateItemRequest
                {
                    ItemText = "Third",
                    DisplayOrder = 3
                },
                new CreateTemplateItemRequest
                {
                    ItemText = "First",
                    DisplayOrder = 1
                },
                new CreateTemplateItemRequest
                {
                    ItemText = "Second",
                    DisplayOrder = 2
                }
            }
        };

        // Act
        var result = await _service.CreateTemplateAsync(request, _testUser);

        // Assert
        Assert.Equal(3, result.Items.Count);
        Assert.Equal("First", result.Items[0].ItemText);
        Assert.Equal("Second", result.Items[1].ItemText);
        Assert.Equal("Third", result.Items[2].ItemText);
    }

    [Fact]
    public async Task CreateTemplateAsync_PersistsToDatabase()
    {
        // Arrange
        var request = new CreateTemplateRequest
        {
            Name = "Persisted Template",
            Category = "Safety",
            Items = new List<CreateTemplateItemRequest>()
        };

        // Act
        var result = await _service.CreateTemplateAsync(request, _testUser);

        // Assert - Query database directly to verify persistence
        var dbTemplate = await _context.Templates.FindAsync(result.Id);
        Assert.NotNull(dbTemplate);
        Assert.Equal("Persisted Template", dbTemplate.Name);
    }

    [Fact]
    public async Task CreateTemplateAsync_CreatesManualTemplate_ByDefault()
    {
        // Arrange
        var request = new CreateTemplateRequest
        {
            Name = "Manual Template",
            Category = "Safety",
            Items = new List<CreateTemplateItemRequest>()
            // No TemplateType specified - should default to Manual
        };

        // Act
        var result = await _service.CreateTemplateAsync(request, _testUser);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(ChecklistAPI.Models.Enums.TemplateType.Manual, result.TemplateType);
        Assert.Null(result.AutoCreateForCategories);
        Assert.Null(result.RecurrenceConfig);
    }

    [Fact]
    public async Task CreateTemplateAsync_CreatesAutoCreateTemplate_WithCategories()
    {
        // Arrange
        var categories = new[] { "Hurricane", "Flood", "Wildfire" };
        var request = new CreateTemplateRequest
        {
            Name = "Auto-Create Safety Briefing",
            Category = "Safety",
            TemplateType = ChecklistAPI.Models.Enums.TemplateType.AutoCreate,
            AutoCreateForCategories = System.Text.Json.JsonSerializer.Serialize(categories),
            Items = new List<CreateTemplateItemRequest>()
        };

        // Act
        var result = await _service.CreateTemplateAsync(request, _testUser);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(ChecklistAPI.Models.Enums.TemplateType.AutoCreate, result.TemplateType);
        Assert.NotNull(result.AutoCreateForCategories);

        var savedCategories = System.Text.Json.JsonSerializer.Deserialize<string[]>(result.AutoCreateForCategories);
        Assert.NotNull(savedCategories);
        Assert.Equal(3, savedCategories.Length);
        Assert.Contains("Hurricane", savedCategories);
        Assert.Contains("Flood", savedCategories);
        Assert.Contains("Wildfire", savedCategories);
    }

    [Fact]
    public async Task CreateTemplateAsync_CreatesRecurringTemplate_WithConfig()
    {
        // Arrange
        var recurringConfig = "{\"frequency\": \"daily\", \"startTime\": \"08:00\"}";
        var request = new CreateTemplateRequest
        {
            Name = "Daily Briefing",
            Category = "Operations",
            TemplateType = ChecklistAPI.Models.Enums.TemplateType.Recurring,
            RecurrenceConfig = recurringConfig,
            Items = new List<CreateTemplateItemRequest>()
        };

        // Act
        var result = await _service.CreateTemplateAsync(request, _testUser);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(ChecklistAPI.Models.Enums.TemplateType.Recurring, result.TemplateType);
        Assert.NotNull(result.RecurrenceConfig);
        Assert.Equal(recurringConfig, result.RecurrenceConfig);
    }

    #endregion

    #region UpdateTemplateAsync Tests

    [Fact]
    public async Task UpdateTemplateAsync_UpdatesTemplateSuccessfully()
    {
        // Arrange
        var templateId = await CreateTestTemplate("Original Name", "Original Description");
        var request = new UpdateTemplateRequest
        {
            Name = "Updated Name",
            Description = "Updated Description",
            Category = "ICS",
            Tags = "updated,tags",
            IsActive = false,
            Items = new List<CreateTemplateItemRequest>
            {
                new CreateTemplateItemRequest
                {
                    ItemText = "Updated Item",
                    DisplayOrder = 1
                }
            }
        };

        // Act
        var result = await _service.UpdateTemplateAsync(templateId, request, _testUser);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("Updated Name", result.Name);
        Assert.Equal("Updated Description", result.Description);
        Assert.Equal("ICS", result.Category);
        Assert.Equal("updated,tags", result.Tags);
        Assert.False(result.IsActive);
        Assert.Equal(_testUser.Email, result.LastModifiedBy);
        Assert.Equal(_testUser.Position, result.LastModifiedByPosition);
        Assert.NotNull(result.LastModifiedAt);
    }

    [Fact]
    public async Task UpdateTemplateAsync_ReplacesAllItems()
    {
        // Arrange
        var templateId = await CreateTestTemplateWithItems(3);
        var request = new UpdateTemplateRequest
        {
            Name = "Updated Template",
            Category = "Safety",
            IsActive = true,
            Items = new List<CreateTemplateItemRequest>
            {
                new CreateTemplateItemRequest
                {
                    ItemText = "New Item 1",
                    DisplayOrder = 1
                },
                new CreateTemplateItemRequest
                {
                    ItemText = "New Item 2",
                    DisplayOrder = 2
                }
            }
        };

        // Act
        var result = await _service.UpdateTemplateAsync(templateId, request, _testUser);

        // Assert
        Assert.Equal(2, result!.Items.Count);
        Assert.Equal("New Item 1", result.Items[0].ItemText);
        Assert.Equal("New Item 2", result.Items[1].ItemText);

        // Verify old items are removed from database
        var dbTemplate = await _context.Templates.FindAsync(templateId);
        Assert.Equal(2, _context.TemplateItems.Count(i => i.TemplateId == templateId));
    }

    [Fact]
    public async Task UpdateTemplateAsync_ReturnsNull_WhenTemplateNotFound()
    {
        // Arrange
        var request = new UpdateTemplateRequest
        {
            Name = "Updated",
            Category = "Safety",
            IsActive = true,
            Items = new List<CreateTemplateItemRequest>()
        };

        // Act
        var result = await _service.UpdateTemplateAsync(Guid.NewGuid(), request, _testUser);

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task UpdateTemplateAsync_UpdatesTemplateType_ToAutoCreate()
    {
        // Arrange - Create Manual template
        var templateId = await CreateTestTemplate("Manual Template", "Description");
        var categories = new[] { "Hurricane", "Flood" };
        var request = new UpdateTemplateRequest
        {
            Name = "Manual Template",
            Category = "Safety",
            IsActive = true,
            TemplateType = ChecklistAPI.Models.Enums.TemplateType.AutoCreate,
            AutoCreateForCategories = System.Text.Json.JsonSerializer.Serialize(categories),
            Items = new List<CreateTemplateItemRequest>()
        };

        // Act
        var result = await _service.UpdateTemplateAsync(templateId, request, _testUser);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(ChecklistAPI.Models.Enums.TemplateType.AutoCreate, result.TemplateType);
        Assert.NotNull(result.AutoCreateForCategories);

        var savedCategories = System.Text.Json.JsonSerializer.Deserialize<string[]>(result.AutoCreateForCategories);
        Assert.NotNull(savedCategories);
        Assert.Equal(2, savedCategories.Length);
        Assert.Contains("Hurricane", savedCategories);
        Assert.Contains("Flood", savedCategories);
    }

    [Fact]
    public async Task UpdateTemplateAsync_ClearsAutoCreateCategories_WhenChangingToManual()
    {
        // Arrange - Create AutoCreate template
        var categories = new[] { "Hurricane" };
        var templateId = await CreateAutoCreateTemplate("Auto Template", categories);

        var request = new UpdateTemplateRequest
        {
            Name = "Now Manual Template",
            Category = "Safety",
            IsActive = true,
            TemplateType = ChecklistAPI.Models.Enums.TemplateType.Manual,
            AutoCreateForCategories = null, // Clear categories
            Items = new List<CreateTemplateItemRequest>()
        };

        // Act
        var result = await _service.UpdateTemplateAsync(templateId, request, _testUser);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(ChecklistAPI.Models.Enums.TemplateType.Manual, result.TemplateType);
        Assert.Null(result.AutoCreateForCategories);
    }

    #endregion

    #region ArchiveTemplateAsync Tests

    [Fact]
    public async Task ArchiveTemplateAsync_ArchivesTemplateSuccessfully()
    {
        // Arrange
        var templateId = await CreateTestTemplate("Template to Archive");

        // Act
        var result = await _service.ArchiveTemplateAsync(templateId, _testUser);

        // Assert
        Assert.True(result);

        var archivedTemplate = await _context.Templates.FindAsync(templateId);
        Assert.NotNull(archivedTemplate);
        Assert.True(archivedTemplate.IsArchived);
        Assert.Equal(_testUser.Email, archivedTemplate.ArchivedBy);
        Assert.NotNull(archivedTemplate.ArchivedAt);
    }

    [Fact]
    public async Task ArchiveTemplateAsync_ReturnsFalse_WhenTemplateNotFound()
    {
        // Act
        var result = await _service.ArchiveTemplateAsync(Guid.NewGuid(), _testUser);

        // Assert
        Assert.False(result);
    }

    #endregion

    #region RestoreTemplateAsync Tests

    [Fact]
    public async Task RestoreTemplateAsync_RestoresArchivedTemplate()
    {
        // Arrange
        var templateId = await CreateTestTemplate("Archived Template");
        await _service.ArchiveTemplateAsync(templateId, _testUser);

        // Act
        var result = await _service.RestoreTemplateAsync(templateId, _testUser);

        // Assert
        Assert.True(result);

        var restoredTemplate = await _context.Templates.FindAsync(templateId);
        Assert.NotNull(restoredTemplate);
        Assert.False(restoredTemplate.IsArchived);
        Assert.Null(restoredTemplate.ArchivedBy);
        Assert.Null(restoredTemplate.ArchivedAt);
        Assert.Equal(_testUser.Email, restoredTemplate.LastModifiedBy);
        Assert.NotNull(restoredTemplate.LastModifiedAt);
    }

    [Fact]
    public async Task RestoreTemplateAsync_ReturnsFalse_WhenTemplateNotFound()
    {
        // Act
        var result = await _service.RestoreTemplateAsync(Guid.NewGuid(), _testUser);

        // Assert
        Assert.False(result);
    }

    #endregion

    #region PermanentlyDeleteTemplateAsync Tests

    [Fact]
    public async Task PermanentlyDeleteTemplateAsync_DeletesTemplate_WhenUserIsAdmin()
    {
        // Arrange
        var templateId = await CreateTestTemplateWithItems(2);

        // Act
        var result = await _service.PermanentlyDeleteTemplateAsync(templateId, _adminUser);

        // Assert
        Assert.True(result);

        var deletedTemplate = await _context.Templates.FindAsync(templateId);
        Assert.Null(deletedTemplate);

        // Verify items are also deleted (cascade)
        var itemCount = _context.TemplateItems.Count(i => i.TemplateId == templateId);
        Assert.Equal(0, itemCount);
    }

    [Fact]
    public async Task PermanentlyDeleteTemplateAsync_ThrowsUnauthorized_WhenUserIsNotAdmin()
    {
        // Arrange
        var templateId = await CreateTestTemplate("Template to Delete");

        // Act & Assert
        var exception = await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _service.PermanentlyDeleteTemplateAsync(templateId, _testUser));

        Assert.Equal("Only administrators can permanently delete templates", exception.Message);

        // Verify template still exists
        var template = await _context.Templates.FindAsync(templateId);
        Assert.NotNull(template);
    }

    [Fact]
    public async Task PermanentlyDeleteTemplateAsync_ReturnsFalse_WhenTemplateNotFound()
    {
        // Act
        var result = await _service.PermanentlyDeleteTemplateAsync(Guid.NewGuid(), _adminUser);

        // Assert
        Assert.False(result);
    }

    #endregion

    #region GetArchivedTemplatesAsync Tests

    [Fact]
    public async Task GetArchivedTemplatesAsync_ReturnsOnlyArchivedTemplates()
    {
        // Arrange
        await SeedTestTemplates();

        // Act
        var result = await _service.GetArchivedTemplatesAsync();

        // Assert
        Assert.Single(result);
        Assert.All(result, t => Assert.True(t.IsArchived));
    }

    [Fact]
    public async Task GetArchivedTemplatesAsync_ReturnsEmptyList_WhenNoArchivedTemplates()
    {
        // Arrange
        await CreateTestTemplate("Active Template");

        // Act
        var result = await _service.GetArchivedTemplatesAsync();

        // Assert
        Assert.Empty(result);
    }

    [Fact]
    public async Task GetArchivedTemplatesAsync_OrdersByArchivedAt()
    {
        // Arrange
        var template1Id = await CreateTestTemplate("First Archived");
        await _service.ArchiveTemplateAsync(template1Id, _testUser);
        await Task.Delay(100); // Ensure different timestamps

        var template2Id = await CreateTestTemplate("Second Archived");
        await _service.ArchiveTemplateAsync(template2Id, _testUser);

        // Act
        var result = await _service.GetArchivedTemplatesAsync();

        // Assert
        Assert.Equal(2, result.Count);
        Assert.Equal("First Archived", result[0].Name);
        Assert.Equal("Second Archived", result[1].Name);
    }

    #endregion

    #region DuplicateTemplateAsync Tests

    [Fact]
    public async Task DuplicateTemplateAsync_CreatesExactCopy_WithNewName()
    {
        // Arrange
        var originalId = await CreateTestTemplateWithItems(3);
        var original = await _service.GetTemplateByIdAsync(originalId);

        // Act
        var duplicate = await _service.DuplicateTemplateAsync(
            originalId,
            "Duplicated Template",
            _testUser);

        // Assert
        Assert.NotNull(duplicate);
        Assert.NotEqual(originalId, duplicate.Id);
        Assert.Equal("Duplicated Template", duplicate.Name);
        Assert.Equal(original!.Description, duplicate.Description);
        Assert.Equal(original.Category, duplicate.Category);
        Assert.Equal(original.Tags, duplicate.Tags);
        Assert.True(duplicate.IsActive);
        Assert.False(duplicate.IsArchived);
        Assert.Equal(_testUser.Email, duplicate.CreatedBy);
        Assert.Equal(3, duplicate.Items.Count);
    }

    [Fact]
    public async Task DuplicateTemplateAsync_CopiesAllItems_WithNewIds()
    {
        // Arrange
        var originalId = await CreateTestTemplateWithItems(2);
        var original = await _service.GetTemplateByIdAsync(originalId);

        // Act
        var duplicate = await _service.DuplicateTemplateAsync(
            originalId,
            "Duplicated Template",
            _testUser);

        // Assert
        Assert.Equal(original!.Items.Count, duplicate!.Items.Count);

        for (int i = 0; i < original.Items.Count; i++)
        {
            Assert.NotEqual(original.Items[i].Id, duplicate.Items[i].Id);
            Assert.Equal(original.Items[i].ItemText, duplicate.Items[i].ItemText);
            Assert.Equal(original.Items[i].DisplayOrder, duplicate.Items[i].DisplayOrder);
            Assert.Equal(original.Items[i].ItemType, duplicate.Items[i].ItemType);
        }
    }

    [Fact]
    public async Task DuplicateTemplateAsync_ReturnsNull_WhenOriginalNotFound()
    {
        // Act
        var result = await _service.DuplicateTemplateAsync(
            Guid.NewGuid(),
            "New Name",
            _testUser);

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task DuplicateTemplateAsync_CopiesTemplateType_AndConfiguration()
    {
        // Arrange - Create AutoCreate template
        var categories = new[] { "Hurricane", "Wildfire" };
        var originalId = await CreateAutoCreateTemplate("Original Auto-Create", categories);

        // Act
        var duplicate = await _service.DuplicateTemplateAsync(
            originalId,
            "Duplicated Auto-Create",
            _testUser);

        // Assert
        Assert.NotNull(duplicate);
        Assert.Equal("Duplicated Auto-Create", duplicate.Name);
        Assert.Equal(ChecklistAPI.Models.Enums.TemplateType.AutoCreate, duplicate.TemplateType);
        Assert.NotNull(duplicate.AutoCreateForCategories);

        var savedCategories = System.Text.Json.JsonSerializer.Deserialize<string[]>(duplicate.AutoCreateForCategories);
        Assert.NotNull(savedCategories);
        Assert.Equal(2, savedCategories.Length);
        Assert.Contains("Hurricane", savedCategories);
        Assert.Contains("Wildfire", savedCategories);
    }

    [Fact]
    public async Task DuplicateTemplateAsync_CopiesRecurringConfig()
    {
        // Arrange - Create Recurring template
        var recurringConfig = "{\"frequency\": \"daily\", \"time\": \"09:00\"}";
        var originalId = await CreateRecurringTemplate("Daily Ops Briefing", recurringConfig);

        // Act
        var duplicate = await _service.DuplicateTemplateAsync(
            originalId,
            "Copy of Daily Ops Briefing",
            _testUser);

        // Assert
        Assert.NotNull(duplicate);
        Assert.Equal(ChecklistAPI.Models.Enums.TemplateType.Recurring, duplicate.TemplateType);
        Assert.NotNull(duplicate.RecurrenceConfig);
        Assert.Equal(recurringConfig, duplicate.RecurrenceConfig);
    }

    #endregion

    #region GetTemplateSuggestionsAsync Tests

    [Fact]
    public async Task GetTemplateSuggestionsAsync_ReturnsTemplates_OrderedByRelevanceScore()
    {
        // Arrange - Create templates with different metadata
        var position = "Safety Officer";
        var eventCategory = "Fire";

        // Template 1: Perfect match (position + event category + recent + popular)
        var template1 = new Template
        {
            Id = Guid.NewGuid(),
            Name = "Perfect Match Template",
            Category = "Safety",
            IsActive = true,
            IsArchived = false,
            CreatedBy = "test@test.com",
            CreatedByPosition = "Test Position",
            RecommendedPositions = System.Text.Json.JsonSerializer.Serialize(new[] { "Safety Officer", "Operations Chief" }),
            EventCategories = System.Text.Json.JsonSerializer.Serialize(new[] { "Fire", "Hazmat" }),
            UsageCount = 25,
            LastUsedAt = DateTime.UtcNow.AddDays(-5)
        };

        // Template 2: Position match only
        var template2 = new Template
        {
            Id = Guid.NewGuid(),
            Name = "Position Match Template",
            Category = "Safety",
            IsActive = true,
            IsArchived = false,
            CreatedBy = "test@test.com",
            CreatedByPosition = "Test Position",
            RecommendedPositions = System.Text.Json.JsonSerializer.Serialize(new[] { "Safety Officer" }),
            UsageCount = 10
        };

        // Template 3: Event category match only
        var template3 = new Template
        {
            Id = Guid.NewGuid(),
            Name = "Event Category Match Template",
            Category = "Operations",
            IsActive = true,
            IsArchived = false,
            CreatedBy = "test@test.com",
            CreatedByPosition = "Test Position",
            EventCategories = System.Text.Json.JsonSerializer.Serialize(new[] { "Fire" }),
            UsageCount = 15
        };

        // Template 4: Popular but no matches
        var template4 = new Template
        {
            Id = Guid.NewGuid(),
            Name = "Popular Template",
            Category = "General",
            IsActive = true,
            IsArchived = false,
            CreatedBy = "test@test.com",
            CreatedByPosition = "Test Position",
            UsageCount = 40
        };

        await _context.Templates.AddRangeAsync(template1, template2, template3, template4);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetTemplateSuggestionsAsync(position, eventCategory, limit: 10);

        // Assert
        Assert.Equal(4, result.Count);

        // Template 1 should be first (position + event category + recent + popular = highest score)
        Assert.Equal(template1.Id, result[0].Id);

        // Template 2 should be second (position match = 1000 + popularity)
        Assert.Equal(template2.Id, result[1].Id);

        // Template 3 should be third (event category match = 500 + popularity)
        Assert.Equal(template3.Id, result[2].Id);

        // Template 4 should be fourth (only popularity = 80)
        Assert.Equal(template4.Id, result[3].Id);
    }

    [Fact]
    public async Task GetTemplateSuggestionsAsync_PositionMatchHasHighestPriority()
    {
        // Arrange
        var position = "Planning Section Chief";

        // Template with position match but low usage
        var template1 = new Template
        {
            Id = Guid.NewGuid(),
            Name = "Position Match Low Usage",
            Category = "Planning",
            IsActive = true,
            IsArchived = false,
            CreatedBy = "test@test.com",
            CreatedByPosition = "Test Position",
            RecommendedPositions = System.Text.Json.JsonSerializer.Serialize(new[] { "Planning Section Chief" }),
            UsageCount = 1
        };

        // Template with high usage but no position match
        var template2 = new Template
        {
            Id = Guid.NewGuid(),
            Name = "High Usage No Match",
            Category = "General",
            IsActive = true,
            IsArchived = false,
            CreatedBy = "test@test.com",
            CreatedByPosition = "Test Position",
            UsageCount = 50,
            LastUsedAt = DateTime.UtcNow.AddDays(-1)
        };

        await _context.Templates.AddRangeAsync(template1, template2);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetTemplateSuggestionsAsync(position, limit: 10);

        // Assert
        Assert.Equal(2, result.Count);
        // Position match should be first despite lower usage
        Assert.Equal(template1.Id, result[0].Id);
        Assert.Equal(template2.Id, result[1].Id);
    }

    [Fact]
    public async Task GetTemplateSuggestionsAsync_ExcludesInactiveAndArchivedTemplates()
    {
        // Arrange
        var position = "Safety Officer";

        // Active template
        var activeTemplate = new Template
        {
            Id = Guid.NewGuid(),
            Name = "Active Template",
            Category = "Safety",
            IsActive = true,
            IsArchived = false,
            CreatedBy = "test@test.com",
            CreatedByPosition = "Test Position",
            RecommendedPositions = System.Text.Json.JsonSerializer.Serialize(new[] { "Safety Officer" })
        };

        // Inactive template
        var inactiveTemplate = new Template
        {
            Id = Guid.NewGuid(),
            Name = "Inactive Template",
            Category = "Safety",
            IsActive = false,
            IsArchived = false,
            CreatedBy = "test@test.com",
            CreatedByPosition = "Test Position",
            RecommendedPositions = System.Text.Json.JsonSerializer.Serialize(new[] { "Safety Officer" })
        };

        // Archived template
        var archivedTemplate = new Template
        {
            Id = Guid.NewGuid(),
            Name = "Archived Template",
            Category = "Safety",
            IsActive = true,
            IsArchived = true,
            ArchivedBy = "test@test.com",
            ArchivedAt = DateTime.UtcNow,
            CreatedBy = "test@test.com",
            CreatedByPosition = "Test Position",
            RecommendedPositions = System.Text.Json.JsonSerializer.Serialize(new[] { "Safety Officer" })
        };

        await _context.Templates.AddRangeAsync(activeTemplate, inactiveTemplate, archivedTemplate);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetTemplateSuggestionsAsync(position, limit: 10);

        // Assert
        Assert.Single(result);
        Assert.Equal(activeTemplate.Id, result[0].Id);
    }

    [Fact]
    public async Task GetTemplateSuggestionsAsync_RespectsLimitParameter()
    {
        // Arrange
        var position = "Operations Chief";

        // Create 15 templates
        for (int i = 1; i <= 15; i++)
        {
            var template = new Template
            {
                Id = Guid.NewGuid(),
                Name = $"Template {i}",
                Category = "Operations",
                IsActive = true,
                IsArchived = false,
                CreatedBy = "test@test.com",
                CreatedByPosition = "Test Position",
                UsageCount = i // Different usage counts for sorting
            };
            await _context.Templates.AddAsync(template);
        }
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetTemplateSuggestionsAsync(position, limit: 5);

        // Assert
        Assert.Equal(5, result.Count);
    }

    [Fact]
    public async Task GetTemplateSuggestionsAsync_RecencyScoreDecreases_OverTime()
    {
        // Arrange
        var position = "Logistics Chief";

        // Recently used template (5 days ago)
        var recentTemplate = new Template
        {
            Id = Guid.NewGuid(),
            Name = "Recent Template",
            Category = "Logistics",
            IsActive = true,
            IsArchived = false,
            CreatedBy = "test@test.com",
            CreatedByPosition = "Test Position",
            LastUsedAt = DateTime.UtcNow.AddDays(-5),
            UsageCount = 10
        };

        // Older template (25 days ago)
        var olderTemplate = new Template
        {
            Id = Guid.NewGuid(),
            Name = "Older Template",
            Category = "Logistics",
            IsActive = true,
            IsArchived = false,
            CreatedBy = "test@test.com",
            CreatedByPosition = "Test Position",
            LastUsedAt = DateTime.UtcNow.AddDays(-25),
            UsageCount = 10 // Same usage count
        };

        // Very old template (40 days ago - should get 0 recency score)
        var veryOldTemplate = new Template
        {
            Id = Guid.NewGuid(),
            Name = "Very Old Template",
            Category = "Logistics",
            IsActive = true,
            IsArchived = false,
            CreatedBy = "test@test.com",
            CreatedByPosition = "Test Position",
            LastUsedAt = DateTime.UtcNow.AddDays(-40),
            UsageCount = 10
        };

        await _context.Templates.AddRangeAsync(recentTemplate, olderTemplate, veryOldTemplate);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetTemplateSuggestionsAsync(position, limit: 10);

        // Assert
        Assert.Equal(3, result.Count);
        // Recent template should be first (higher recency score)
        Assert.Equal(recentTemplate.Id, result[0].Id);
        // Older template should be second
        Assert.Equal(olderTemplate.Id, result[1].Id);
        // Very old template should be third (no recency bonus)
        Assert.Equal(veryOldTemplate.Id, result[2].Id);
    }

    [Fact]
    public async Task GetTemplateSuggestionsAsync_CaseInsensitivePositionMatching()
    {
        // Arrange
        var position = "safety officer"; // lowercase

        var template = new Template
        {
            Id = Guid.NewGuid(),
            Name = "Safety Template",
            Category = "Safety",
            IsActive = true,
            IsArchived = false,
            CreatedBy = "test@test.com",
            CreatedByPosition = "Test Position",
            RecommendedPositions = System.Text.Json.JsonSerializer.Serialize(new[] { "Safety Officer" }) // PascalCase
        };

        await _context.Templates.AddAsync(template);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetTemplateSuggestionsAsync(position, limit: 10);

        // Assert
        Assert.Single(result);
        Assert.Equal(template.Id, result[0].Id);
    }

    #endregion

    #region Create/Update with Metadata Tests

    [Fact]
    public async Task CreateTemplateAsync_SavesRecommendedPositions_AndEventCategories()
    {
        // Arrange
        var positions = new[] { "Safety Officer", "Operations Chief" };
        var eventCategories = new[] { "Fire", "Hazmat", "Earthquake" };

        var request = new CreateTemplateRequest
        {
            Name = "Multi-Hazard Safety Template",
            Description = "Comprehensive safety checklist for multiple event types",
            Category = "Safety",
            Tags = "safety, multi-hazard",
            RecommendedPositions = System.Text.Json.JsonSerializer.Serialize(positions),
            EventCategories = System.Text.Json.JsonSerializer.Serialize(eventCategories),
            Items = new List<CreateTemplateItemRequest>()
        };

        // Act
        var result = await _service.CreateTemplateAsync(request, _testUser);

        // Assert
        Assert.NotNull(result);
        Assert.NotNull(result.RecommendedPositions);
        Assert.NotNull(result.EventCategories);

        var savedPositions = System.Text.Json.JsonSerializer.Deserialize<string[]>(result.RecommendedPositions);
        var savedCategories = System.Text.Json.JsonSerializer.Deserialize<string[]>(result.EventCategories);

        Assert.NotNull(savedPositions);
        Assert.Equal(2, savedPositions.Length);
        Assert.Contains("Safety Officer", savedPositions);
        Assert.Contains("Operations Chief", savedPositions);

        Assert.NotNull(savedCategories);
        Assert.Equal(3, savedCategories.Length);
        Assert.Contains("Fire", savedCategories);
        Assert.Contains("Hazmat", savedCategories);
        Assert.Contains("Earthquake", savedCategories);

        // Verify usage metadata defaults
        Assert.Equal(0, result.UsageCount);
        Assert.Null(result.LastUsedAt);
    }

    [Fact]
    public async Task UpdateTemplateAsync_UpdatesRecommendedPositions_AndEventCategories()
    {
        // Arrange - Create template with initial metadata
        var templateId = await CreateTestTemplate("Template to Update");

        var newPositions = new[] { "Logistics Chief", "Planning Chief" };
        var newCategories = new[] { "Flood", "Hurricane" };

        var request = new UpdateTemplateRequest
        {
            Name = "Updated Template",
            Category = "Logistics",
            IsActive = true,
            RecommendedPositions = System.Text.Json.JsonSerializer.Serialize(newPositions),
            EventCategories = System.Text.Json.JsonSerializer.Serialize(newCategories),
            Items = new List<CreateTemplateItemRequest>()
        };

        // Act
        var result = await _service.UpdateTemplateAsync(templateId, request, _testUser);

        // Assert
        Assert.NotNull(result);
        Assert.NotNull(result.RecommendedPositions);
        Assert.NotNull(result.EventCategories);

        var savedPositions = System.Text.Json.JsonSerializer.Deserialize<string[]>(result.RecommendedPositions);
        var savedCategories = System.Text.Json.JsonSerializer.Deserialize<string[]>(result.EventCategories);

        Assert.NotNull(savedPositions);
        Assert.Equal(2, savedPositions.Length);
        Assert.Contains("Logistics Chief", savedPositions);
        Assert.Contains("Planning Chief", savedPositions);

        Assert.NotNull(savedCategories);
        Assert.Equal(2, savedCategories.Length);
        Assert.Contains("Flood", savedCategories);
        Assert.Contains("Hurricane", savedCategories);
    }

    [Fact]
    public async Task DuplicateTemplateAsync_ResetsUsageMetadata()
    {
        // Arrange - Create template with usage metadata
        var templateId = Guid.NewGuid();
        var originalTemplate = new Template
        {
            Id = templateId,
            Name = "Popular Template",
            Category = "Safety",
            IsActive = true,
            IsArchived = false,
            CreatedBy = "test@test.com",
            CreatedByPosition = "Test Position",
            UsageCount = 50,
            LastUsedAt = DateTime.UtcNow.AddDays(-2),
            RecommendedPositions = System.Text.Json.JsonSerializer.Serialize(new[] { "Safety Officer" }),
            EventCategories = System.Text.Json.JsonSerializer.Serialize(new[] { "Fire" })
        };

        await _context.Templates.AddAsync(originalTemplate);
        await _context.SaveChangesAsync();

        // Act
        var duplicate = await _service.DuplicateTemplateAsync(
            templateId,
            "Duplicated Popular Template",
            _testUser);

        // Assert
        Assert.NotNull(duplicate);

        // Usage metadata should be reset
        Assert.Equal(0, duplicate.UsageCount);
        Assert.Null(duplicate.LastUsedAt);

        // But recommendation metadata should be copied
        Assert.Equal(originalTemplate.RecommendedPositions, duplicate.RecommendedPositions);
        Assert.Equal(originalTemplate.EventCategories, duplicate.EventCategories);
    }

    [Fact]
    public async Task DuplicateTemplateAsync_CopiesAllMetadataFields()
    {
        // Arrange
        var positions = new[] { "Operations Chief", "Safety Officer" };
        var eventCategories = new[] { "Wildfire", "Flood" };
        var autoCreateCategories = new[] { "Wildfire" };

        var templateId = Guid.NewGuid();
        var originalTemplate = new Template
        {
            Id = templateId,
            Name = "Complex Template",
            Description = "Template with all metadata",
            Category = "Operations",
            Tags = "wildfire, flood, operations",
            IsActive = true,
            IsArchived = false,
            CreatedBy = "test@test.com",
            CreatedByPosition = "Test Position",
            TemplateType = ChecklistAPI.Models.Enums.TemplateType.AutoCreate,
            AutoCreateForCategories = System.Text.Json.JsonSerializer.Serialize(autoCreateCategories),
            RecommendedPositions = System.Text.Json.JsonSerializer.Serialize(positions),
            EventCategories = System.Text.Json.JsonSerializer.Serialize(eventCategories),
            UsageCount = 25,
            LastUsedAt = DateTime.UtcNow.AddDays(-5)
        };

        await _context.Templates.AddAsync(originalTemplate);
        await _context.SaveChangesAsync();

        // Act
        var duplicate = await _service.DuplicateTemplateAsync(
            templateId,
            "Duplicated Complex Template",
            _testUser);

        // Assert
        Assert.NotNull(duplicate);
        Assert.Equal("Duplicated Complex Template", duplicate.Name);
        Assert.Equal(originalTemplate.Description, duplicate.Description);
        Assert.Equal(originalTemplate.Category, duplicate.Category);
        Assert.Equal(originalTemplate.Tags, duplicate.Tags);
        Assert.Equal(originalTemplate.TemplateType, duplicate.TemplateType);
        Assert.Equal(originalTemplate.AutoCreateForCategories, duplicate.AutoCreateForCategories);
        Assert.Equal(originalTemplate.RecommendedPositions, duplicate.RecommendedPositions);
        Assert.Equal(originalTemplate.EventCategories, duplicate.EventCategories);

        // Usage metadata should be reset
        Assert.Equal(0, duplicate.UsageCount);
        Assert.Null(duplicate.LastUsedAt);
    }

    #endregion

    #region Helper Methods

    /// <summary>
    /// Seeds database with test templates covering various scenarios
    /// </summary>
    private async Task SeedTestTemplates()
    {
        var templates = new List<Template>
        {
            // Active, non-archived template (Safety)
            new Template
            {
                Id = Guid.NewGuid(),
                Name = "Active Safety Template",
                Description = string.Empty,
                Category = "Safety",
                IsActive = true,
                IsArchived = false,
                CreatedBy = "seed@test.com",
                CreatedByPosition = "Test Position"
            },
            // Active, non-archived template (ICS)
            new Template
            {
                Id = Guid.NewGuid(),
                Name = "Active ICS Template",
                Description = string.Empty,
                Category = "ICS",
                IsActive = true,
                IsArchived = false,
                CreatedBy = "seed@test.com",
                CreatedByPosition = "Test Position"
            },
            // Inactive, non-archived template
            new Template
            {
                Id = Guid.NewGuid(),
                Name = "Inactive Template",
                Description = string.Empty,
                Category = "Safety",
                IsActive = false,
                IsArchived = false,
                CreatedBy = "seed@test.com",
                CreatedByPosition = "Test Position"
            },
            // Archived template
            new Template
            {
                Id = Guid.NewGuid(),
                Name = "Archived Template",
                Description = string.Empty,
                Category = "Safety",
                IsActive = true,
                IsArchived = true,
                ArchivedBy = "seed@test.com",
                ArchivedAt = DateTime.UtcNow,
                CreatedBy = "seed@test.com",
                CreatedByPosition = "Test Position"
            }
        };

        await _context.Templates.AddRangeAsync(templates);
        await _context.SaveChangesAsync();
    }

    /// <summary>
    /// Creates a simple test template
    /// </summary>
    private async Task<Guid> CreateTestTemplate(
        string name,
        string? description = null)
    {
        var template = new Template
        {
            Id = Guid.NewGuid(),
            Name = name,
            Description = description ?? string.Empty,
            Category = "Safety",
            IsActive = true,
            CreatedBy = "test@test.com",
            CreatedByPosition = "Test Position"
        };

        await _context.Templates.AddAsync(template);
        await _context.SaveChangesAsync();

        return template.Id;
    }

    /// <summary>
    /// Creates a test template with specified number of items
    /// </summary>
    private async Task<Guid> CreateTestTemplateWithItems(int itemCount)
    {
        var templateId = Guid.NewGuid();
        var template = new Template
        {
            Id = templateId,
            Name = "Template with Items",
            Category = "Safety",
            IsActive = true,
            CreatedBy = "test@test.com"
        };

        for (int i = 1; i <= itemCount; i++)
        {
            template.Items.Add(new TemplateItem
            {
                Id = Guid.NewGuid(),
                TemplateId = templateId,
                ItemText = $"Item {i}",
                DisplayOrder = i
            });
        }

        await _context.Templates.AddAsync(template);
        await _context.SaveChangesAsync();

        return templateId;
    }

    /// <summary>
    /// Creates an AutoCreate template with specified incident categories
    /// </summary>
    private async Task<Guid> CreateAutoCreateTemplate(string name, string[] categories)
    {
        var templateId = Guid.NewGuid();
        var template = new Template
        {
            Id = templateId,
            Name = name,
            Category = "Safety",
            IsActive = true,
            CreatedBy = "test@test.com",
            CreatedByPosition = "Test Position",
            TemplateType = ChecklistAPI.Models.Enums.TemplateType.AutoCreate,
            AutoCreateForCategories = System.Text.Json.JsonSerializer.Serialize(categories)
        };

        await _context.Templates.AddAsync(template);
        await _context.SaveChangesAsync();

        return templateId;
    }

    /// <summary>
    /// Creates a Recurring template with specified configuration
    /// </summary>
    private async Task<Guid> CreateRecurringTemplate(string name, string recurringConfig)
    {
        var templateId = Guid.NewGuid();
        var template = new Template
        {
            Id = templateId,
            Name = name,
            Category = "Operations",
            IsActive = true,
            CreatedBy = "test@test.com",
            CreatedByPosition = "Test Position",
            TemplateType = ChecklistAPI.Models.Enums.TemplateType.Recurring,
            RecurrenceConfig = recurringConfig
        };

        await _context.Templates.AddAsync(template);
        await _context.SaveChangesAsync();

        return templateId;
    }

    #endregion
}