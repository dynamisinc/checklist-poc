using ChecklistAPI.Data;
using ChecklistAPI.Models.DTOs;
using ChecklistAPI.Models.Entities;
using ChecklistAPI.Services;
using ChecklistAPI.Tests.Helpers;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Moq;
using System.Text.Json;
using Xunit;

namespace ChecklistAPI.Tests.Services;

/// <summary>
/// Unit tests for ItemLibraryService
/// Tests all CRUD operations, filtering, sorting, soft delete, and business logic
/// </summary>
public class ItemLibraryServiceTests : IDisposable
{
    private readonly ChecklistDbContext _context;
    private readonly Mock<ILogger<ItemLibraryService>> _mockLogger;
    private readonly Mock<IHttpContextAccessor> _mockHttpContextAccessor;
    private readonly ItemLibraryService _service;
    private readonly string _testUser = "test@test.com";

    public ItemLibraryServiceTests()
    {
        _context = TestDbContextFactory.CreateInMemoryContext();
        _mockLogger = new Mock<ILogger<ItemLibraryService>>();
        _mockHttpContextAccessor = new Mock<IHttpContextAccessor>();

        // Setup mock user context
        var mockHttpContext = new Mock<HttpContext>();
        var items = new Dictionary<object, object?>
        {
            ["UserName"] = _testUser
        };
        mockHttpContext.Setup(c => c.Items).Returns(items);
        _mockHttpContextAccessor.Setup(a => a.HttpContext).Returns(mockHttpContext.Object);

        _service = new ItemLibraryService(_context, _mockLogger.Object, _mockHttpContextAccessor.Object);
    }

    public void Dispose()
    {
        _context.Dispose();
    }

    #region GetLibraryItemsAsync Tests

    [Fact]
    public async Task GetLibraryItemsAsync_ReturnsAllNonArchivedItems_WhenNoFilters()
    {
        // Arrange
        await SeedTestItems();

        // Act
        var result = await _service.GetLibraryItemsAsync();

        // Assert
        Assert.Equal(4, result.Count); // 4 non-archived items
        Assert.All(result, item => Assert.NotNull(item));
    }

    [Fact]
    public async Task GetLibraryItemsAsync_ExcludesArchivedItems_Always()
    {
        // Arrange
        await SeedTestItems();

        // Act
        var result = await _service.GetLibraryItemsAsync();

        // Assert
        Assert.DoesNotContain(result, item => item.Id == GetArchivedItemId());
    }

    [Fact]
    public async Task GetLibraryItemsAsync_FiltersByCategory_WhenCategoryProvided()
    {
        // Arrange
        await SeedTestItems();

        // Act
        var result = await _service.GetLibraryItemsAsync(category: "Safety");

        // Assert
        Assert.Equal(2, result.Count);
        Assert.All(result, item => Assert.Equal("Safety", item.Category));
    }

    [Fact]
    public async Task GetLibraryItemsAsync_FiltersByItemType_WhenItemTypeProvided()
    {
        // Arrange
        await SeedTestItems();

        // Act
        var result = await _service.GetLibraryItemsAsync(itemType: "status");

        // Assert
        Assert.Single(result);
        Assert.All(result, item => Assert.Equal("status", item.ItemType));
    }

    [Fact]
    public async Task GetLibraryItemsAsync_SearchesItemText_WhenSearchTextProvided()
    {
        // Arrange
        await SeedTestItems();

        // Act
        var result = await _service.GetLibraryItemsAsync(searchText: "PPE");

        // Assert
        Assert.Single(result);
        Assert.Contains("PPE", result[0].ItemText);
    }

    [Fact]
    public async Task GetLibraryItemsAsync_SearchesTags_WhenSearchTextProvided()
    {
        // Arrange
        await SeedTestItems();

        // Act
        var result = await _service.GetLibraryItemsAsync(searchText: "equipment");

        // Assert
        Assert.NotEmpty(result);
        Assert.All(result, item => Assert.Contains("equipment", item.Tags ?? "", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public async Task GetLibraryItemsAsync_SearchIsCaseInsensitive()
    {
        // Arrange
        await SeedTestItems();

        // Act
        var resultLower = await _service.GetLibraryItemsAsync(searchText: "ppe");
        var resultUpper = await _service.GetLibraryItemsAsync(searchText: "PPE");

        // Assert
        Assert.Equal(resultLower.Count, resultUpper.Count);
    }

    [Fact]
    public async Task GetLibraryItemsAsync_CombinesFilters_WhenMultipleProvided()
    {
        // Arrange
        await SeedTestItems();

        // Act
        var result = await _service.GetLibraryItemsAsync(
            category: "Safety",
            itemType: "checkbox",
            searchText: "check");

        // Assert
        Assert.NotEmpty(result);
        Assert.All(result, item =>
        {
            Assert.Equal("Safety", item.Category);
            Assert.Equal("checkbox", item.ItemType);
        });
    }

    [Fact]
    public async Task GetLibraryItemsAsync_SortsByRecent_ByDefault()
    {
        // Arrange
        await SeedTestItems();

        // Act
        var result = await _service.GetLibraryItemsAsync();

        // Assert
        // Most recent should be first
        for (int i = 0; i < result.Count - 1; i++)
        {
            Assert.True(result[i].CreatedAt >= result[i + 1].CreatedAt);
        }
    }

    [Fact]
    public async Task GetLibraryItemsAsync_SortsByPopular_WhenRequested()
    {
        // Arrange
        await SeedTestItems();

        // Act
        var result = await _service.GetLibraryItemsAsync(sortBy: "popular");

        // Assert
        // Most popular should be first
        for (int i = 0; i < result.Count - 1; i++)
        {
            Assert.True(result[i].UsageCount >= result[i + 1].UsageCount);
        }
    }

    [Fact]
    public async Task GetLibraryItemsAsync_SortsByAlphabetical_WhenRequested()
    {
        // Arrange
        await SeedTestItems();

        // Act
        var result = await _service.GetLibraryItemsAsync(sortBy: "alphabetical");

        // Assert
        // Should be sorted A-Z
        for (int i = 0; i < result.Count - 1; i++)
        {
            Assert.True(string.Compare(result[i].ItemText, result[i + 1].ItemText, StringComparison.Ordinal) <= 0);
        }
    }

    [Fact]
    public async Task GetLibraryItemsAsync_ReturnsEmptyList_WhenNoMatches()
    {
        // Arrange
        await SeedTestItems();

        // Act
        var result = await _service.GetLibraryItemsAsync(searchText: "NonExistentItem");

        // Assert
        Assert.Empty(result);
    }

    #endregion

    #region GetLibraryItemByIdAsync Tests

    [Fact]
    public async Task GetLibraryItemByIdAsync_ReturnsItem_WhenExists()
    {
        // Arrange
        var itemId = await SeedSingleItem();

        // Act
        var result = await _service.GetLibraryItemByIdAsync(itemId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(itemId, result.Id);
    }

    [Fact]
    public async Task GetLibraryItemByIdAsync_ReturnsNull_WhenNotFound()
    {
        // Act
        var result = await _service.GetLibraryItemByIdAsync(Guid.NewGuid());

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task GetLibraryItemByIdAsync_ReturnsNull_WhenItemIsArchived()
    {
        // Arrange
        await SeedTestItems();
        var archivedId = GetArchivedItemId();

        // Act
        var result = await _service.GetLibraryItemByIdAsync(archivedId);

        // Assert
        Assert.Null(result);
    }

    #endregion

    #region CreateLibraryItemAsync Tests

    [Fact]
    public async Task CreateLibraryItemAsync_CreatesItem_WithValidData()
    {
        // Arrange
        var request = new CreateItemLibraryEntryRequest(
            ItemText: "Test Item",
            ItemType: "checkbox",
            Category: "Safety",
            StatusConfiguration: null,
            AllowedPositions: null,
            DefaultNotes: null,
            Tags: new[] { "test", "safety" },
            IsRequiredByDefault: false
        );

        // Act
        var result = await _service.CreateLibraryItemAsync(request);

        // Assert
        Assert.NotNull(result);
        Assert.NotEqual(Guid.Empty, result.Id);
        Assert.Equal("Test Item", result.ItemText);
        Assert.Equal("checkbox", result.ItemType);
        Assert.Equal("Safety", result.Category);
        Assert.Equal(_testUser, result.CreatedBy);
        Assert.Equal(0, result.UsageCount);
    }

    [Fact]
    public async Task CreateLibraryItemAsync_TrimsWhitespace_FromTextFields()
    {
        // Arrange
        var request = new CreateItemLibraryEntryRequest(
            ItemText: "  Test Item  ",
            ItemType: "checkbox",
            Category: "  Safety  ",
            StatusConfiguration: null,
            AllowedPositions: null,
            DefaultNotes: null,
            Tags: null,
            IsRequiredByDefault: false
        );

        // Act
        var result = await _service.CreateLibraryItemAsync(request);

        // Assert
        Assert.Equal("Test Item", result.ItemText);
        Assert.Equal("Safety", result.Category);
    }

    [Fact]
    public async Task CreateLibraryItemAsync_SerializesTags_WhenProvided()
    {
        // Arrange
        var tags = new[] { "tag1", "tag2", "tag3" };
        var request = new CreateItemLibraryEntryRequest(
            ItemText: "Test Item",
            ItemType: "checkbox",
            Category: "Safety",
            StatusConfiguration: null,
            AllowedPositions: null,
            DefaultNotes: null,
            Tags: tags,
            IsRequiredByDefault: false
        );

        // Act
        var result = await _service.CreateLibraryItemAsync(request);

        // Assert
        Assert.NotNull(result.Tags);
        var deserializedTags = JsonSerializer.Deserialize<string[]>(result.Tags);
        Assert.Equal(tags, deserializedTags);
    }

    [Fact]
    public async Task CreateLibraryItemAsync_SetsTagsToNull_WhenEmptyArray()
    {
        // Arrange
        var request = new CreateItemLibraryEntryRequest(
            ItemText: "Test Item",
            ItemType: "checkbox",
            Category: "Safety",
            StatusConfiguration: null,
            AllowedPositions: null,
            DefaultNotes: null,
            Tags: Array.Empty<string>(),
            IsRequiredByDefault: false
        );

        // Act
        var result = await _service.CreateLibraryItemAsync(request);

        // Assert
        Assert.Null(result.Tags);
    }

    [Fact]
    public async Task CreateLibraryItemAsync_SetsCreatedByToCurrentUser()
    {
        // Arrange
        var request = new CreateItemLibraryEntryRequest(
            ItemText: "Test Item",
            ItemType: "checkbox",
            Category: "Safety",
            StatusConfiguration: null,
            AllowedPositions: null,
            DefaultNotes: null,
            Tags: null,
            IsRequiredByDefault: false
        );

        // Act
        var result = await _service.CreateLibraryItemAsync(request);

        // Assert
        Assert.Equal(_testUser, result.CreatedBy);
    }

    [Fact]
    public async Task CreateLibraryItemAsync_SetsIsArchivedToFalse()
    {
        // Arrange
        var request = new CreateItemLibraryEntryRequest(
            ItemText: "Test Item",
            ItemType: "checkbox",
            Category: "Safety",
            StatusConfiguration: null,
            AllowedPositions: null,
            DefaultNotes: null,
            Tags: null,
            IsRequiredByDefault: false
        );

        // Act
        var result = await _service.CreateLibraryItemAsync(request);

        // Assert
        var dbItem = await _context.ItemLibraryEntries.FindAsync(result.Id);
        Assert.NotNull(dbItem);
        Assert.False(dbItem.IsArchived);
    }

    #endregion

    #region UpdateLibraryItemAsync Tests

    [Fact]
    public async Task UpdateLibraryItemAsync_UpdatesItem_WithValidData()
    {
        // Arrange
        var itemId = await SeedSingleItem();
        var request = new UpdateItemLibraryEntryRequest(
            ItemText: "Updated Item",
            ItemType: "status",
            Category: "Logistics",
            StatusConfiguration: "{\"statuses\":[]}",
            AllowedPositions: null,
            DefaultNotes: "Updated notes",
            Tags: new[] { "updated" },
            IsRequiredByDefault: true
        );

        // Act
        var result = await _service.UpdateLibraryItemAsync(itemId, request);

        // Assert
        Assert.Equal("Updated Item", result.ItemText);
        Assert.Equal("status", result.ItemType);
        Assert.Equal("Logistics", result.Category);
        Assert.Equal("Updated notes", result.DefaultNotes);
        Assert.True(result.IsRequiredByDefault);
        Assert.Equal(_testUser, result.LastModifiedBy);
        Assert.NotNull(result.LastModifiedAt);
    }

    [Fact]
    public async Task UpdateLibraryItemAsync_ThrowsException_WhenItemNotFound()
    {
        // Arrange
        var request = new UpdateItemLibraryEntryRequest(
            ItemText: "Updated Item",
            ItemType: "checkbox",
            Category: "Safety",
            StatusConfiguration: null,
            AllowedPositions: null,
            DefaultNotes: null,
            Tags: null,
            IsRequiredByDefault: false
        );

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(
            async () => await _service.UpdateLibraryItemAsync(Guid.NewGuid(), request)
        );
    }

    [Fact]
    public async Task UpdateLibraryItemAsync_ThrowsException_WhenItemIsArchived()
    {
        // Arrange
        await SeedTestItems();
        var archivedId = GetArchivedItemId();
        var request = new UpdateItemLibraryEntryRequest(
            ItemText: "Updated Item",
            ItemType: "checkbox",
            Category: "Safety",
            StatusConfiguration: null,
            AllowedPositions: null,
            DefaultNotes: null,
            Tags: null,
            IsRequiredByDefault: false
        );

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(
            async () => await _service.UpdateLibraryItemAsync(archivedId, request)
        );
    }

    [Fact]
    public async Task UpdateLibraryItemAsync_UpdatesTags_WhenProvided()
    {
        // Arrange
        var itemId = await SeedSingleItem();
        var newTags = new[] { "new1", "new2" };
        var request = new UpdateItemLibraryEntryRequest(
            ItemText: "Test Item",
            ItemType: "checkbox",
            Category: "Safety",
            StatusConfiguration: null,
            AllowedPositions: null,
            DefaultNotes: null,
            Tags: newTags,
            IsRequiredByDefault: false
        );

        // Act
        var result = await _service.UpdateLibraryItemAsync(itemId, request);

        // Assert
        Assert.NotNull(result.Tags);
        var deserializedTags = JsonSerializer.Deserialize<string[]>(result.Tags);
        Assert.Equal(newTags, deserializedTags);
    }

    #endregion

    #region IncrementUsageCountAsync Tests

    [Fact]
    public async Task IncrementUsageCountAsync_IncrementsCount_WhenItemExists()
    {
        // Arrange
        var itemId = await SeedSingleItem();
        var originalItem = await _context.ItemLibraryEntries.FindAsync(itemId);
        var originalCount = originalItem!.UsageCount;

        // Act
        await _service.IncrementUsageCountAsync(itemId);

        // Assert
        var updatedItem = await _context.ItemLibraryEntries.FindAsync(itemId);
        Assert.Equal(originalCount + 1, updatedItem!.UsageCount);
    }

    [Fact]
    public async Task IncrementUsageCountAsync_IncrementsMultipleTimes()
    {
        // Arrange
        var itemId = await SeedSingleItem();

        // Act
        await _service.IncrementUsageCountAsync(itemId);
        await _service.IncrementUsageCountAsync(itemId);
        await _service.IncrementUsageCountAsync(itemId);

        // Assert
        var item = await _context.ItemLibraryEntries.FindAsync(itemId);
        Assert.Equal(3, item!.UsageCount);
    }

    [Fact]
    public async Task IncrementUsageCountAsync_DoesNotThrow_WhenItemNotFound()
    {
        // Act & Assert - Should not throw
        await _service.IncrementUsageCountAsync(Guid.NewGuid());
    }

    [Fact]
    public async Task IncrementUsageCountAsync_WorksOnArchivedItems()
    {
        // Arrange
        await SeedTestItems();
        var archivedId = GetArchivedItemId();
        var originalItem = await _context.ItemLibraryEntries.FindAsync(archivedId);
        var originalCount = originalItem!.UsageCount;

        // Act
        await _service.IncrementUsageCountAsync(archivedId);

        // Assert
        var updatedItem = await _context.ItemLibraryEntries.FindAsync(archivedId);
        Assert.Equal(originalCount + 1, updatedItem!.UsageCount);
    }

    #endregion

    #region ArchiveLibraryItemAsync Tests

    [Fact]
    public async Task ArchiveLibraryItemAsync_ArchivesItem_WhenExists()
    {
        // Arrange
        var itemId = await SeedSingleItem();

        // Act
        await _service.ArchiveLibraryItemAsync(itemId);

        // Assert
        var item = await _context.ItemLibraryEntries.FindAsync(itemId);
        Assert.NotNull(item);
        Assert.True(item.IsArchived);
        Assert.Equal(_testUser, item.ArchivedBy);
        Assert.NotNull(item.ArchivedAt);
    }

    [Fact]
    public async Task ArchiveLibraryItemAsync_ThrowsException_WhenItemNotFound()
    {
        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(
            async () => await _service.ArchiveLibraryItemAsync(Guid.NewGuid())
        );
    }

    [Fact]
    public async Task ArchiveLibraryItemAsync_ThrowsException_WhenAlreadyArchived()
    {
        // Arrange
        await SeedTestItems();
        var archivedId = GetArchivedItemId();

        // Act & Assert
        var exception = await Assert.ThrowsAsync<InvalidOperationException>(
            async () => await _service.ArchiveLibraryItemAsync(archivedId)
        );
        Assert.Contains("already archived", exception.Message);
    }

    #endregion

    #region RestoreLibraryItemAsync Tests

    [Fact]
    public async Task RestoreLibraryItemAsync_RestoresItem_WhenArchived()
    {
        // Arrange
        await SeedTestItems();
        var archivedId = GetArchivedItemId();

        // Act
        await _service.RestoreLibraryItemAsync(archivedId);

        // Assert
        var item = await _context.ItemLibraryEntries.FindAsync(archivedId);
        Assert.NotNull(item);
        Assert.False(item.IsArchived);
        Assert.Null(item.ArchivedBy);
        Assert.Null(item.ArchivedAt);
    }

    [Fact]
    public async Task RestoreLibraryItemAsync_ThrowsException_WhenItemNotFound()
    {
        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(
            async () => await _service.RestoreLibraryItemAsync(Guid.NewGuid())
        );
    }

    [Fact]
    public async Task RestoreLibraryItemAsync_ThrowsException_WhenNotArchived()
    {
        // Arrange
        var itemId = await SeedSingleItem();

        // Act & Assert
        var exception = await Assert.ThrowsAsync<InvalidOperationException>(
            async () => await _service.RestoreLibraryItemAsync(itemId)
        );
        Assert.Contains("not archived", exception.Message);
    }

    #endregion

    #region DeleteLibraryItemAsync Tests

    [Fact]
    public async Task DeleteLibraryItemAsync_DeletesItem_WhenExists()
    {
        // Arrange
        var itemId = await SeedSingleItem();

        // Act
        await _service.DeleteLibraryItemAsync(itemId);

        // Assert
        var item = await _context.ItemLibraryEntries.FindAsync(itemId);
        Assert.Null(item);
    }

    [Fact]
    public async Task DeleteLibraryItemAsync_ThrowsException_WhenItemNotFound()
    {
        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(
            async () => await _service.DeleteLibraryItemAsync(Guid.NewGuid())
        );
    }

    [Fact]
    public async Task DeleteLibraryItemAsync_DeletesArchivedItems()
    {
        // Arrange
        await SeedTestItems();
        var archivedId = GetArchivedItemId();

        // Act
        await _service.DeleteLibraryItemAsync(archivedId);

        // Assert
        var item = await _context.ItemLibraryEntries.FindAsync(archivedId);
        Assert.Null(item);
    }

    #endregion

    #region Helper Methods

    private async Task SeedTestItems()
    {
        var items = new List<ItemLibraryEntry>
        {
            // Safety items
            new ItemLibraryEntry
            {
                Id = Guid.NewGuid(),
                ItemText = "Check PPE availability",
                ItemType = "checkbox",
                Category = "Safety",
                Tags = JsonSerializer.Serialize(new[] { "safety", "equipment" }),
                UsageCount = 5,
                CreatedBy = _testUser,
                CreatedAt = DateTime.UtcNow.AddDays(-5),
                IsArchived = false
            },
            new ItemLibraryEntry
            {
                Id = Guid.NewGuid(),
                ItemText = "Verify safety briefing complete",
                ItemType = "checkbox",
                Category = "Safety",
                Tags = JsonSerializer.Serialize(new[] { "safety", "briefing" }),
                UsageCount = 10,
                CreatedBy = _testUser,
                CreatedAt = DateTime.UtcNow.AddDays(-10),
                IsArchived = false
            },
            // ICS items
            new ItemLibraryEntry
            {
                Id = Guid.NewGuid(),
                ItemText = "Confirm ICS positions assigned",
                ItemType = "checkbox",
                Category = "ICS",
                Tags = JsonSerializer.Serialize(new[] { "ics", "positions" }),
                UsageCount = 3,
                CreatedBy = _testUser,
                CreatedAt = DateTime.UtcNow.AddDays(-3),
                IsArchived = false
            },
            // Status item
            new ItemLibraryEntry
            {
                Id = Guid.NewGuid(),
                ItemText = "Equipment status check",
                ItemType = "status",
                Category = "Logistics",
                StatusConfiguration = "{\"statuses\":[\"Available\",\"In Use\",\"Maintenance\"]}",
                Tags = JsonSerializer.Serialize(new[] { "logistics", "equipment" }),
                UsageCount = 7,
                CreatedBy = _testUser,
                CreatedAt = DateTime.UtcNow.AddDays(-7),
                IsArchived = false
            },
            // Archived item
            new ItemLibraryEntry
            {
                Id = Guid.NewGuid(),
                ItemText = "Archived item",
                ItemType = "checkbox",
                Category = "Other",
                UsageCount = 0,
                CreatedBy = _testUser,
                CreatedAt = DateTime.UtcNow.AddDays(-20),
                IsArchived = true,
                ArchivedBy = _testUser,
                ArchivedAt = DateTime.UtcNow.AddDays(-1)
            }
        };

        await _context.ItemLibraryEntries.AddRangeAsync(items);
        await _context.SaveChangesAsync();
    }

    private async Task<Guid> SeedSingleItem()
    {
        var item = new ItemLibraryEntry
        {
            Id = Guid.NewGuid(),
            ItemText = "Test Item",
            ItemType = "checkbox",
            Category = "Safety",
            Tags = JsonSerializer.Serialize(new[] { "test" }),
            UsageCount = 0,
            CreatedBy = _testUser,
            CreatedAt = DateTime.UtcNow,
            IsArchived = false
        };

        await _context.ItemLibraryEntries.AddAsync(item);
        await _context.SaveChangesAsync();

        return item.Id;
    }

    private Guid GetArchivedItemId()
    {
        return _context.ItemLibraryEntries
            .First(i => i.IsArchived).Id;
    }

    #endregion
}
