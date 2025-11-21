using ChecklistAPI.Data;
using ChecklistAPI.Models.Entities;
using ChecklistAPI.Services;
using ChecklistAPI.Tests.Helpers;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace ChecklistAPI.Tests.Services;

/// <summary>
/// Unit tests for AnalyticsService
/// Tests dashboard analytics generation, metrics calculation, and data aggregation
/// </summary>
public class AnalyticsServiceTests : IDisposable
{
    private readonly ChecklistDbContext _context;
    private readonly Mock<ILogger<AnalyticsService>> _mockLogger;
    private readonly AnalyticsService _service;
    private readonly string _testUser = "test@test.com";

    public AnalyticsServiceTests()
    {
        _context = TestDbContextFactory.CreateInMemoryContext();
        _mockLogger = new Mock<ILogger<AnalyticsService>>();
        _service = new AnalyticsService(_context, _mockLogger.Object);
    }

    public void Dispose()
    {
        _context.Dispose();
    }

    #region Overview Statistics Tests

    [Fact]
    public async Task GetDashboardAsync_ReturnsCorrectTotalCounts_WhenDataExists()
    {
        // Arrange
        await SeedCompleteData();

        // Act
        var result = await _service.GetDashboardAsync();

        // Assert
        Assert.Equal(3, result.Overview.TotalTemplates); // 3 non-archived templates
        Assert.Equal(5, result.Overview.TotalChecklistInstances); // 5 non-archived instances
        Assert.Equal(4, result.Overview.TotalLibraryItems); // 4 non-archived items
    }

    [Fact]
    public async Task GetDashboardAsync_ExcludesArchivedItems_FromAllCounts()
    {
        // Arrange
        await SeedDataWithArchivedItems();

        // Act
        var result = await _service.GetDashboardAsync();

        // Assert
        // Should only count non-archived items
        Assert.Equal(2, result.Overview.TotalTemplates);
        Assert.Equal(2, result.Overview.TotalChecklistInstances);
        Assert.Equal(2, result.Overview.TotalLibraryItems);
    }

    [Fact]
    public async Task GetDashboardAsync_CalculatesActiveTemplates_Correctly()
    {
        // Arrange
        await SeedCompleteData();

        // Act
        var result = await _service.GetDashboardAsync();

        // Assert
        // Templates with at least one instance
        Assert.Equal(2, result.Overview.ActiveTemplates);
    }

    [Fact]
    public async Task GetDashboardAsync_CalculatesUnusedTemplates_Correctly()
    {
        // Arrange
        await SeedCompleteData();

        // Act
        var result = await _service.GetDashboardAsync();

        // Assert
        // Templates with zero instances
        Assert.Equal(1, result.Overview.UnusedTemplates);
    }

    [Fact]
    public async Task GetDashboardAsync_ReturnsZeroCounts_WhenDatabaseIsEmpty()
    {
        // Act
        var result = await _service.GetDashboardAsync();

        // Assert
        Assert.Equal(0, result.Overview.TotalTemplates);
        Assert.Equal(0, result.Overview.TotalChecklistInstances);
        Assert.Equal(0, result.Overview.TotalLibraryItems);
        Assert.Equal(0, result.Overview.ActiveTemplates);
        Assert.Equal(0, result.Overview.UnusedTemplates);
    }

    #endregion

    #region Most Used Templates Tests

    [Fact]
    public async Task GetDashboardAsync_ReturnsMostUsedTemplates_OrderedByUsageCount()
    {
        // Arrange
        await SeedCompleteData();

        // Act
        var result = await _service.GetDashboardAsync();

        // Assert
        Assert.Equal(2, result.MostUsedTemplates.Count);
        // First should have higher usage count
        Assert.True(result.MostUsedTemplates[0].UsageCount >= result.MostUsedTemplates[1].UsageCount);
    }

    [Fact]
    public async Task GetDashboardAsync_MostUsedTemplates_ExcludesUnusedTemplates()
    {
        // Arrange
        await SeedCompleteData();

        // Act
        var result = await _service.GetDashboardAsync();

        // Assert
        Assert.All(result.MostUsedTemplates, t => Assert.True(t.UsageCount > 0));
    }

    [Fact]
    public async Task GetDashboardAsync_MostUsedTemplates_LimitsToTop5()
    {
        // Arrange
        await SeedManyTemplatesWithInstances(10);

        // Act
        var result = await _service.GetDashboardAsync();

        // Assert
        Assert.True(result.MostUsedTemplates.Count <= 5);
    }

    [Fact]
    public async Task GetDashboardAsync_MostUsedTemplates_ReturnsEmptyList_WhenNoTemplatesHaveInstances()
    {
        // Arrange
        await SeedTemplatesWithoutInstances();

        // Act
        var result = await _service.GetDashboardAsync();

        // Assert
        Assert.Empty(result.MostUsedTemplates);
    }

    [Fact]
    public async Task GetDashboardAsync_MostUsedTemplates_IncludesAllRequiredFields()
    {
        // Arrange
        await SeedCompleteData();

        // Act
        var result = await _service.GetDashboardAsync();

        // Assert
        var template = result.MostUsedTemplates.First();
        Assert.NotEqual(Guid.Empty, template.Id);
        Assert.NotEmpty(template.Name);
        Assert.NotEmpty(template.Category);
        Assert.True(template.UsageCount > 0);
        Assert.NotEqual(default(DateTime), template.CreatedAt);
        Assert.NotEmpty(template.CreatedBy);
    }

    #endregion

    #region Never Used Templates Tests

    [Fact]
    public async Task GetDashboardAsync_ReturnsNeverUsedTemplates_WithZeroInstances()
    {
        // Arrange
        await SeedCompleteData();

        // Act
        var result = await _service.GetDashboardAsync();

        // Assert
        Assert.Single(result.NeverUsedTemplates);
        Assert.All(result.NeverUsedTemplates, t => Assert.Equal(0, t.UsageCount));
    }

    [Fact]
    public async Task GetDashboardAsync_NeverUsedTemplates_OrderedByCreatedAtDescending()
    {
        // Arrange
        await SeedUnusedTemplatesWithDifferentDates();

        // Act
        var result = await _service.GetDashboardAsync();

        // Assert
        // Should be ordered with most recent first
        for (int i = 0; i < result.NeverUsedTemplates.Count - 1; i++)
        {
            Assert.True(result.NeverUsedTemplates[i].CreatedAt >= result.NeverUsedTemplates[i + 1].CreatedAt);
        }
    }

    [Fact]
    public async Task GetDashboardAsync_NeverUsedTemplates_LimitsToTop5()
    {
        // Arrange
        await SeedManyUnusedTemplates(10);

        // Act
        var result = await _service.GetDashboardAsync();

        // Assert
        Assert.True(result.NeverUsedTemplates.Count <= 5);
    }

    [Fact]
    public async Task GetDashboardAsync_NeverUsedTemplates_ReturnsEmptyList_WhenAllTemplatesAreUsed()
    {
        // Arrange
        await SeedOnlyUsedTemplates();

        // Act
        var result = await _service.GetDashboardAsync();

        // Assert
        Assert.Empty(result.NeverUsedTemplates);
    }

    #endregion

    #region Most Popular Library Items Tests

    [Fact]
    public async Task GetDashboardAsync_ReturnsMostPopularLibraryItems_OrderedByUsageCount()
    {
        // Arrange
        await SeedCompleteData();

        // Act
        var result = await _service.GetDashboardAsync();

        // Assert
        // Should be ordered by usage count descending
        for (int i = 0; i < result.MostPopularLibraryItems.Count - 1; i++)
        {
            Assert.True(result.MostPopularLibraryItems[i].UsageCount >= result.MostPopularLibraryItems[i + 1].UsageCount);
        }
    }

    [Fact]
    public async Task GetDashboardAsync_MostPopularLibraryItems_ExcludesArchivedItems()
    {
        // Arrange
        await SeedLibraryItemsWithArchived();

        // Act
        var result = await _service.GetDashboardAsync();

        // Assert
        // Should not include archived items
        Assert.DoesNotContain(result.MostPopularLibraryItems, i => i.ItemText.Contains("Archived"));
    }

    [Fact]
    public async Task GetDashboardAsync_MostPopularLibraryItems_ExcludesItemsWithZeroUsage()
    {
        // Arrange
        await SeedLibraryItemsWithZeroUsage();

        // Act
        var result = await _service.GetDashboardAsync();

        // Assert
        Assert.All(result.MostPopularLibraryItems, i => Assert.True(i.UsageCount > 0));
    }

    [Fact]
    public async Task GetDashboardAsync_MostPopularLibraryItems_LimitsToTop5()
    {
        // Arrange
        await SeedManyLibraryItems(10);

        // Act
        var result = await _service.GetDashboardAsync();

        // Assert
        Assert.True(result.MostPopularLibraryItems.Count <= 5);
    }

    [Fact]
    public async Task GetDashboardAsync_MostPopularLibraryItems_ReturnsEmptyList_WhenNoItemsHaveUsage()
    {
        // Arrange
        await SeedLibraryItemsWithZeroUsage();

        // Act
        var result = await _service.GetDashboardAsync();

        // Assert
        Assert.Empty(result.MostPopularLibraryItems);
    }

    [Fact]
    public async Task GetDashboardAsync_MostPopularLibraryItems_IncludesAllRequiredFields()
    {
        // Arrange
        await SeedCompleteData();

        // Act
        var result = await _service.GetDashboardAsync();

        // Assert
        var item = result.MostPopularLibraryItems.First();
        Assert.NotEqual(Guid.Empty, item.Id);
        Assert.NotEmpty(item.ItemText);
        Assert.NotEmpty(item.Category);
        Assert.NotEmpty(item.ItemType);
        Assert.True(item.UsageCount > 0);
    }

    #endregion

    #region Recently Created Templates Tests

    [Fact]
    public async Task GetDashboardAsync_ReturnsRecentlyCreatedTemplates_OrderedByCreatedAtDescending()
    {
        // Arrange
        await SeedTemplatesWithDifferentDates();

        // Act
        var result = await _service.GetDashboardAsync();

        // Assert
        // Should be ordered with most recent first
        for (int i = 0; i < result.RecentlyCreatedTemplates.Count - 1; i++)
        {
            Assert.True(result.RecentlyCreatedTemplates[i].CreatedAt >= result.RecentlyCreatedTemplates[i + 1].CreatedAt);
        }
    }

    [Fact]
    public async Task GetDashboardAsync_RecentlyCreatedTemplates_ExcludesArchivedTemplates()
    {
        // Arrange
        await SeedTemplatesWithArchived();

        // Act
        var result = await _service.GetDashboardAsync();

        // Assert
        Assert.DoesNotContain(result.RecentlyCreatedTemplates, t => t.IsArchived);
    }

    [Fact]
    public async Task GetDashboardAsync_RecentlyCreatedTemplates_LimitsToLast5()
    {
        // Arrange
        await SeedManyTemplates(10);

        // Act
        var result = await _service.GetDashboardAsync();

        // Assert
        Assert.True(result.RecentlyCreatedTemplates.Count <= 5);
    }

    [Fact]
    public async Task GetDashboardAsync_RecentlyCreatedTemplates_IncludesTemplateItems()
    {
        // Arrange
        await SeedTemplatesWithItems();

        // Act
        var result = await _service.GetDashboardAsync();

        // Assert
        var templateWithItems = result.RecentlyCreatedTemplates.First();
        Assert.NotEmpty(templateWithItems.Items);
    }

    [Fact]
    public async Task GetDashboardAsync_RecentlyCreatedTemplates_ReturnsEmptyList_WhenNoTemplates()
    {
        // Act
        var result = await _service.GetDashboardAsync();

        // Assert
        Assert.Empty(result.RecentlyCreatedTemplates);
    }

    [Fact]
    public async Task GetDashboardAsync_RecentlyCreatedTemplates_ReturnsFewerThan5_WhenLessExist()
    {
        // Arrange
        await SeedFewTemplates(3);

        // Act
        var result = await _service.GetDashboardAsync();

        // Assert
        Assert.Equal(3, result.RecentlyCreatedTemplates.Count);
    }

    #endregion

    #region Helper Methods

    private async Task SeedCompleteData()
    {
        // Templates
        var template1 = new Template
        {
            Id = Guid.NewGuid(),
            Name = "Safety Template",
            Category = "Safety",
            IsActive = true,
            CreatedBy = _testUser,
            CreatedAt = DateTime.UtcNow.AddDays(-10),
            IsArchived = false
        };
        var template2 = new Template
        {
            Id = Guid.NewGuid(),
            Name = "ICS Template",
            Category = "ICS",
            IsActive = true,
            CreatedBy = _testUser,
            CreatedAt = DateTime.UtcNow.AddDays(-5),
            IsArchived = false
        };
        var template3 = new Template
        {
            Id = Guid.NewGuid(),
            Name = "Unused Template",
            Category = "Operations",
            IsActive = true,
            CreatedBy = _testUser,
            CreatedAt = DateTime.UtcNow.AddDays(-1),
            IsArchived = false
        };

        await _context.Templates.AddRangeAsync(template1, template2, template3);

        // Checklist instances
        var instances = new List<ChecklistInstance>
        {
            new ChecklistInstance
            {
                Id = Guid.NewGuid(),
                TemplateId = template1.Id,
                Name = "Instance 1",
                EventId = "Event-001",
                CreatedBy = _testUser,
                CreatedAt = DateTime.UtcNow.AddDays(-8),
                IsArchived = false
            },
            new ChecklistInstance
            {
                Id = Guid.NewGuid(),
                TemplateId = template1.Id,
                Name = "Instance 2",
                EventId = "Event-001",
                CreatedBy = _testUser,
                CreatedAt = DateTime.UtcNow.AddDays(-7),
                IsArchived = false
            },
            new ChecklistInstance
            {
                Id = Guid.NewGuid(),
                TemplateId = template1.Id,
                Name = "Instance 3",
                EventId = "Event-001",
                CreatedBy = _testUser,
                CreatedAt = DateTime.UtcNow.AddDays(-6),
                IsArchived = false
            },
            new ChecklistInstance
            {
                Id = Guid.NewGuid(),
                TemplateId = template2.Id,
                Name = "Instance 4",
                EventId = "Event-002",
                CreatedBy = _testUser,
                CreatedAt = DateTime.UtcNow.AddDays(-4),
                IsArchived = false
            },
            new ChecklistInstance
            {
                Id = Guid.NewGuid(),
                TemplateId = template2.Id,
                Name = "Instance 5",
                EventId = "Event-002",
                CreatedBy = _testUser,
                CreatedAt = DateTime.UtcNow.AddDays(-3),
                IsArchived = false
            }
        };

        await _context.ChecklistInstances.AddRangeAsync(instances);

        // Library items
        var libraryItems = new List<ItemLibraryEntry>
        {
            new ItemLibraryEntry
            {
                Id = Guid.NewGuid(),
                ItemText = "Popular Item 1",
                ItemType = "checkbox",
                Category = "Safety",
                UsageCount = 10,
                CreatedBy = _testUser,
                CreatedAt = DateTime.UtcNow.AddDays(-20),
                IsArchived = false
            },
            new ItemLibraryEntry
            {
                Id = Guid.NewGuid(),
                ItemText = "Popular Item 2",
                ItemType = "checkbox",
                Category = "ICS",
                UsageCount = 8,
                CreatedBy = _testUser,
                CreatedAt = DateTime.UtcNow.AddDays(-15),
                IsArchived = false
            },
            new ItemLibraryEntry
            {
                Id = Guid.NewGuid(),
                ItemText = "Popular Item 3",
                ItemType = "status",
                Category = "Operations",
                UsageCount = 5,
                CreatedBy = _testUser,
                CreatedAt = DateTime.UtcNow.AddDays(-10),
                IsArchived = false
            },
            new ItemLibraryEntry
            {
                Id = Guid.NewGuid(),
                ItemText = "Unpopular Item",
                ItemType = "checkbox",
                Category = "Logistics",
                UsageCount = 0,
                CreatedBy = _testUser,
                CreatedAt = DateTime.UtcNow.AddDays(-5),
                IsArchived = false
            }
        };

        await _context.ItemLibraryEntries.AddRangeAsync(libraryItems);
        await _context.SaveChangesAsync();
    }

    private async Task SeedDataWithArchivedItems()
    {
        // Non-archived templates
        var template1 = new Template
        {
            Id = Guid.NewGuid(),
            Name = "Active Template 1",
            Category = "Safety",
            IsActive = true,
            CreatedBy = _testUser,
            CreatedAt = DateTime.UtcNow,
            IsArchived = false
        };
        var template2 = new Template
        {
            Id = Guid.NewGuid(),
            Name = "Active Template 2",
            Category = "ICS",
            IsActive = true,
            CreatedBy = _testUser,
            CreatedAt = DateTime.UtcNow,
            IsArchived = false
        };

        await _context.Templates.AddRangeAsync(template1, template2);

        // Archived template
        await _context.Templates.AddAsync(new Template
        {
            Id = Guid.NewGuid(),
            Name = "Archived Template",
            Category = "Operations",
            IsActive = false,
            CreatedBy = _testUser,
            CreatedAt = DateTime.UtcNow,
            IsArchived = true,
            ArchivedBy = _testUser,
            ArchivedAt = DateTime.UtcNow
        });

        await _context.SaveChangesAsync();

        // Non-archived instances
        await _context.ChecklistInstances.AddRangeAsync(
            new ChecklistInstance
            {
                Id = Guid.NewGuid(),
                TemplateId = template1.Id,
                Name = "Active Instance 1",
                EventId = "Event-001",
                CreatedBy = _testUser,
                CreatedAt = DateTime.UtcNow,
                IsArchived = false
            },
            new ChecklistInstance
            {
                Id = Guid.NewGuid(),
                TemplateId = template1.Id,
                Name = "Active Instance 2",
                EventId = "Event-001",
                CreatedBy = _testUser,
                CreatedAt = DateTime.UtcNow,
                IsArchived = false
            }
        );

        // Archived instance
        await _context.ChecklistInstances.AddAsync(new ChecklistInstance
        {
            Id = Guid.NewGuid(),
            TemplateId = template1.Id,
            Name = "Archived Instance",
            EventId = "Event-001",
            CreatedBy = _testUser,
            CreatedAt = DateTime.UtcNow,
            IsArchived = true,
            ArchivedBy = _testUser,
            ArchivedAt = DateTime.UtcNow
        });

        // Non-archived library items
        await _context.ItemLibraryEntries.AddRangeAsync(
            new ItemLibraryEntry
            {
                Id = Guid.NewGuid(),
                ItemText = "Active Item 1",
                ItemType = "checkbox",
                Category = "Safety",
                UsageCount = 5,
                CreatedBy = _testUser,
                CreatedAt = DateTime.UtcNow,
                IsArchived = false
            },
            new ItemLibraryEntry
            {
                Id = Guid.NewGuid(),
                ItemText = "Active Item 2",
                ItemType = "checkbox",
                Category = "ICS",
                UsageCount = 3,
                CreatedBy = _testUser,
                CreatedAt = DateTime.UtcNow,
                IsArchived = false
            }
        );

        // Archived library item
        await _context.ItemLibraryEntries.AddAsync(new ItemLibraryEntry
        {
            Id = Guid.NewGuid(),
            ItemText = "Archived Item",
            ItemType = "checkbox",
            Category = "Operations",
            UsageCount = 10,
            CreatedBy = _testUser,
            CreatedAt = DateTime.UtcNow,
            IsArchived = true,
            ArchivedBy = _testUser,
            ArchivedAt = DateTime.UtcNow
        });

        await _context.SaveChangesAsync();
    }

    private async Task SeedTemplatesWithoutInstances()
    {
        await _context.Templates.AddRangeAsync(
            new Template
            {
                Id = Guid.NewGuid(),
                Name = "Template 1",
                Category = "Safety",
                IsActive = true,
                CreatedBy = _testUser,
                CreatedAt = DateTime.UtcNow,
                IsArchived = false
            },
            new Template
            {
                Id = Guid.NewGuid(),
                Name = "Template 2",
                Category = "ICS",
                IsActive = true,
                CreatedBy = _testUser,
                CreatedAt = DateTime.UtcNow,
                IsArchived = false
            }
        );

        await _context.SaveChangesAsync();
    }

    private async Task SeedManyTemplatesWithInstances(int count)
    {
        var templates = new List<Template>();
        var instances = new List<ChecklistInstance>();

        for (int i = 0; i < count; i++)
        {
            var template = new Template
            {
                Id = Guid.NewGuid(),
                Name = $"Template {i + 1}",
                Category = "Safety",
                IsActive = true,
                CreatedBy = _testUser,
                CreatedAt = DateTime.UtcNow.AddDays(-i),
                IsArchived = false
            };
            templates.Add(template);

            // Create varying number of instances for each template
            for (int j = 0; j < (count - i); j++)
            {
                instances.Add(new ChecklistInstance
                {
                    Id = Guid.NewGuid(),
                    TemplateId = template.Id,
                    Name = $"Instance {j + 1}",
                    EventId = "Event-001",
                    CreatedBy = _testUser,
                    CreatedAt = DateTime.UtcNow,
                    IsArchived = false
                });
            }
        }

        await _context.Templates.AddRangeAsync(templates);
        await _context.ChecklistInstances.AddRangeAsync(instances);
        await _context.SaveChangesAsync();
    }

    private async Task SeedUnusedTemplatesWithDifferentDates()
    {
        await _context.Templates.AddRangeAsync(
            new Template
            {
                Id = Guid.NewGuid(),
                Name = "Recent Unused",
                Category = "Safety",
                IsActive = true,
                CreatedBy = _testUser,
                CreatedAt = DateTime.UtcNow.AddDays(-1),
                IsArchived = false
            },
            new Template
            {
                Id = Guid.NewGuid(),
                Name = "Old Unused",
                Category = "ICS",
                IsActive = true,
                CreatedBy = _testUser,
                CreatedAt = DateTime.UtcNow.AddDays(-10),
                IsArchived = false
            },
            new Template
            {
                Id = Guid.NewGuid(),
                Name = "Middle Unused",
                Category = "Operations",
                IsActive = true,
                CreatedBy = _testUser,
                CreatedAt = DateTime.UtcNow.AddDays(-5),
                IsArchived = false
            }
        );

        await _context.SaveChangesAsync();
    }

    private async Task SeedManyUnusedTemplates(int count)
    {
        var templates = new List<Template>();

        for (int i = 0; i < count; i++)
        {
            templates.Add(new Template
            {
                Id = Guid.NewGuid(),
                Name = $"Unused Template {i + 1}",
                Category = "Safety",
                IsActive = true,
                CreatedBy = _testUser,
                CreatedAt = DateTime.UtcNow.AddDays(-i),
                IsArchived = false
            });
        }

        await _context.Templates.AddRangeAsync(templates);
        await _context.SaveChangesAsync();
    }

    private async Task SeedOnlyUsedTemplates()
    {
        var template = new Template
        {
            Id = Guid.NewGuid(),
            Name = "Used Template",
            Category = "Safety",
            IsActive = true,
            CreatedBy = _testUser,
            CreatedAt = DateTime.UtcNow,
            IsArchived = false
        };

        await _context.Templates.AddAsync(template);
        await _context.ChecklistInstances.AddAsync(new ChecklistInstance
        {
            Id = Guid.NewGuid(),
            TemplateId = template.Id,
            Name = "Instance",
            EventId = "Event-001",
            CreatedBy = _testUser,
            CreatedAt = DateTime.UtcNow,
            IsArchived = false
        });

        await _context.SaveChangesAsync();
    }

    private async Task SeedLibraryItemsWithArchived()
    {
        await _context.ItemLibraryEntries.AddRangeAsync(
            new ItemLibraryEntry
            {
                Id = Guid.NewGuid(),
                ItemText = "Active Item",
                ItemType = "checkbox",
                Category = "Safety",
                UsageCount = 5,
                CreatedBy = _testUser,
                CreatedAt = DateTime.UtcNow,
                IsArchived = false
            },
            new ItemLibraryEntry
            {
                Id = Guid.NewGuid(),
                ItemText = "Archived Item",
                ItemType = "checkbox",
                Category = "ICS",
                UsageCount = 10,
                CreatedBy = _testUser,
                CreatedAt = DateTime.UtcNow,
                IsArchived = true,
                ArchivedBy = _testUser,
                ArchivedAt = DateTime.UtcNow
            }
        );

        await _context.SaveChangesAsync();
    }

    private async Task SeedLibraryItemsWithZeroUsage()
    {
        await _context.ItemLibraryEntries.AddRangeAsync(
            new ItemLibraryEntry
            {
                Id = Guid.NewGuid(),
                ItemText = "Unused Item 1",
                ItemType = "checkbox",
                Category = "Safety",
                UsageCount = 0,
                CreatedBy = _testUser,
                CreatedAt = DateTime.UtcNow,
                IsArchived = false
            },
            new ItemLibraryEntry
            {
                Id = Guid.NewGuid(),
                ItemText = "Unused Item 2",
                ItemType = "status",
                Category = "ICS",
                UsageCount = 0,
                CreatedBy = _testUser,
                CreatedAt = DateTime.UtcNow,
                IsArchived = false
            }
        );

        await _context.SaveChangesAsync();
    }

    private async Task SeedManyLibraryItems(int count)
    {
        var items = new List<ItemLibraryEntry>();

        for (int i = 0; i < count; i++)
        {
            items.Add(new ItemLibraryEntry
            {
                Id = Guid.NewGuid(),
                ItemText = $"Library Item {i + 1}",
                ItemType = "checkbox",
                Category = "Safety",
                UsageCount = count - i, // Varying usage counts
                CreatedBy = _testUser,
                CreatedAt = DateTime.UtcNow,
                IsArchived = false
            });
        }

        await _context.ItemLibraryEntries.AddRangeAsync(items);
        await _context.SaveChangesAsync();
    }

    private async Task SeedTemplatesWithDifferentDates()
    {
        await _context.Templates.AddRangeAsync(
            new Template
            {
                Id = Guid.NewGuid(),
                Name = "Newest Template",
                Category = "Safety",
                IsActive = true,
                CreatedBy = _testUser,
                CreatedAt = DateTime.UtcNow,
                IsArchived = false
            },
            new Template
            {
                Id = Guid.NewGuid(),
                Name = "Middle Template",
                Category = "ICS",
                IsActive = true,
                CreatedBy = _testUser,
                CreatedAt = DateTime.UtcNow.AddDays(-5),
                IsArchived = false
            },
            new Template
            {
                Id = Guid.NewGuid(),
                Name = "Oldest Template",
                Category = "Operations",
                IsActive = true,
                CreatedBy = _testUser,
                CreatedAt = DateTime.UtcNow.AddDays(-10),
                IsArchived = false
            }
        );

        await _context.SaveChangesAsync();
    }

    private async Task SeedTemplatesWithArchived()
    {
        await _context.Templates.AddRangeAsync(
            new Template
            {
                Id = Guid.NewGuid(),
                Name = "Active Template",
                Category = "Safety",
                IsActive = true,
                CreatedBy = _testUser,
                CreatedAt = DateTime.UtcNow,
                IsArchived = false
            },
            new Template
            {
                Id = Guid.NewGuid(),
                Name = "Archived Template",
                Category = "ICS",
                IsActive = false,
                CreatedBy = _testUser,
                CreatedAt = DateTime.UtcNow.AddDays(-1),
                IsArchived = true,
                ArchivedBy = _testUser,
                ArchivedAt = DateTime.UtcNow
            }
        );

        await _context.SaveChangesAsync();
    }

    private async Task SeedManyTemplates(int count)
    {
        var templates = new List<Template>();

        for (int i = 0; i < count; i++)
        {
            templates.Add(new Template
            {
                Id = Guid.NewGuid(),
                Name = $"Template {i + 1}",
                Category = "Safety",
                IsActive = true,
                CreatedBy = _testUser,
                CreatedAt = DateTime.UtcNow.AddDays(-i),
                IsArchived = false
            });
        }

        await _context.Templates.AddRangeAsync(templates);
        await _context.SaveChangesAsync();
    }

    private async Task SeedTemplatesWithItems()
    {
        var template = new Template
        {
            Id = Guid.NewGuid(),
            Name = "Template With Items",
            Category = "Safety",
            IsActive = true,
            CreatedBy = _testUser,
            CreatedAt = DateTime.UtcNow,
            IsArchived = false
        };

        template.Items.Add(new TemplateItem
        {
            Id = Guid.NewGuid(),
            TemplateId = template.Id,
            ItemText = "Item 1",
            ItemType = "checkbox",
            DisplayOrder = 10,
            IsRequired = true
        });

        template.Items.Add(new TemplateItem
        {
            Id = Guid.NewGuid(),
            TemplateId = template.Id,
            ItemText = "Item 2",
            ItemType = "status",
            DisplayOrder = 20,
            IsRequired = false,
            StatusConfiguration = "{\"statuses\":[]}"
        });

        await _context.Templates.AddAsync(template);
        await _context.SaveChangesAsync();
    }

    private async Task SeedFewTemplates(int count)
    {
        var templates = new List<Template>();

        for (int i = 0; i < count; i++)
        {
            templates.Add(new Template
            {
                Id = Guid.NewGuid(),
                Name = $"Template {i + 1}",
                Category = "Safety",
                IsActive = true,
                CreatedBy = _testUser,
                CreatedAt = DateTime.UtcNow.AddDays(-i),
                IsArchived = false
            });
        }

        await _context.Templates.AddRangeAsync(templates);
        await _context.SaveChangesAsync();
    }

    #endregion
}