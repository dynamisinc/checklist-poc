using System.Text.Json;
using ChecklistAPI.Data;
using ChecklistAPI.Models;
using ChecklistAPI.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace ChecklistAPI.Services.Helpers;

/// <summary>
/// ChecklistProgressHelper - Helper for progress calculation logic
///
/// Purpose:
///   Handles progress tracking calculations for checklists.
///   Extracted from ChecklistService to keep files under 250 lines.
///
/// Single Responsibility:
///   ONLY handles progress calculation.
///   Calculates: ProgressPercentage, CompletedItems, RequiredItemsCompleted.
///
/// Dependencies:
///   - ChecklistDbContext: Database access
///   - ILogger: Logging
///
/// Design Pattern:
///   - Static methods (no state)
///   - Called by ChecklistService and item completion endpoints
///   - Updates entity in-place
///
/// Calculation Rules:
///   - ProgressPercentage = (CompletedItems / TotalItems) * 100
///   - CompletedItems = count of completed items (checkbox or status)
///     * Checkbox items: IsCompleted == true
///     * Status items: CurrentStatus matches a status with isCompletion == true in StatusConfiguration
///   - RequiredItemsCompleted = count of required items that are complete
///
/// Author: Checklist POC Team
/// Last Modified: 2025-11-20
/// </summary>
public static class ChecklistProgressHelper
{
    /// <summary>
    /// Recalculates and updates progress for a checklist
    /// Call this after any item completion status changes
    /// </summary>
    /// <param name="context">Database context</param>
    /// <param name="logger">Logger instance</param>
    /// <param name="checklistId">Checklist to recalculate</param>
    public static async Task RecalculateProgressAsync(
        ChecklistDbContext context,
        ILogger logger,
        Guid checklistId)
    {
        logger.LogInformation(
            "Recalculating progress for checklist {ChecklistId}",
            checklistId);

        var checklist = await context.ChecklistInstances
            .Include(c => c.Items)
            .FirstOrDefaultAsync(c => c.Id == checklistId);

        if (checklist == null)
        {
            logger.LogWarning(
                "Checklist {ChecklistId} not found for progress calculation",
                checklistId);
            return;
        }

        CalculateProgress(checklist);

        await context.SaveChangesAsync();

        logger.LogInformation(
            "Updated progress for checklist {ChecklistId}: {Progress}% ({Completed}/{Total})",
            checklistId,
            checklist.ProgressPercentage,
            checklist.CompletedItems,
            checklist.TotalItems);
    }

    /// <summary>
    /// Calculates progress for a checklist (does not save to database)
    /// Used internally and by creation methods
    /// </summary>
    /// <param name="checklist">Checklist entity to calculate progress for</param>
    public static void CalculateProgress(ChecklistInstance checklist)
    {
        // Calculate progress metrics
        checklist.TotalItems = checklist.Items.Count;
        checklist.CompletedItems = checklist.Items.Count(i => IsItemComplete(i));
        checklist.RequiredItems = checklist.Items.Count(i => i.IsRequired);
        checklist.RequiredItemsCompleted = checklist.Items.Count(
            i => i.IsRequired && IsItemComplete(i));

        // Calculate percentage (0-100, rounded to 2 decimal places)
        checklist.ProgressPercentage = checklist.TotalItems > 0
            ? Math.Round((decimal)checklist.CompletedItems / checklist.TotalItems * 100, 2)
            : 0;
    }

    /// <summary>
    /// Determines if a checklist item is complete
    /// Handles both checkbox and status item types
    /// </summary>
    /// <param name="item">The checklist item to check</param>
    /// <returns>True if item is complete, false otherwise</returns>
    private static bool IsItemComplete(ChecklistItem item)
    {
        // Checkbox items: check IsCompleted flag
        if (item.ItemType == "checkbox")
        {
            return item.IsCompleted == true;
        }

        // Status items: check if current status is a completion status
        if (item.ItemType == "status")
        {
            // If no status configuration, item cannot be complete
            if (string.IsNullOrEmpty(item.StatusConfiguration))
            {
                return false;
            }

            // If no current status set, item is not complete
            if (string.IsNullOrEmpty(item.CurrentStatus))
            {
                return false;
            }

            try
            {
                // Parse JSON configuration
                var statusOptions = JsonSerializer.Deserialize<List<StatusOption>>(
                    item.StatusConfiguration,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                if (statusOptions == null || statusOptions.Count == 0)
                {
                    return false;
                }

                // Find the current status in the configuration
                var currentStatusConfig = statusOptions.FirstOrDefault(
                    s => s.Label.Equals(item.CurrentStatus, StringComparison.OrdinalIgnoreCase));

                // Item is complete if current status has isCompletion = true
                return currentStatusConfig?.IsCompletion == true;
            }
            catch (JsonException)
            {
                // Invalid JSON configuration - treat as not complete
                return false;
            }
        }

        // Unknown item type - not complete
        return false;
    }
}
