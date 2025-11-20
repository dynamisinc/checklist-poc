-- Simple checklist seed data (avoiding cursor issues)
USE ChecklistPOC;
GO

-- Clear existing data
DELETE FROM ChecklistItems;
DELETE FROM ChecklistInstances;
GO

-- Get template IDs
DECLARE @SafetyBriefingTemplateId UNIQUEIDENTIFIER;
SELECT @SafetyBriefingTemplateId = Id FROM Templates WHERE Name = 'Daily Safety Briefing';

-- Get current operational period ID
DECLARE @CurrentOpPeriodId UNIQUEIDENTIFIER;
DECLARE @CurrentOpPeriodName NVARCHAR(200);
SELECT @CurrentOpPeriodId = Id, @CurrentOpPeriodName = Name
FROM OperationalPeriods
WHERE IsCurrent = 1;

-- Create a simple active checklist
DECLARE @Checklist1Id UNIQUEIDENTIFIER = NEWID();

INSERT INTO ChecklistInstances (
    Id, Name, TemplateId,
    EventId, EventName,
    OperationalPeriodId, OperationalPeriodName,
    AssignedPositions,
    ProgressPercentage, TotalItems, CompletedItems, RequiredItems, RequiredItemsCompleted,
    IsArchived,
    CreatedBy, CreatedByPosition, CreatedAt
)
VALUES (
    @Checklist1Id,
    'Daily Safety Briefing - Incident Response',
    @SafetyBriefingTemplateId,
    'INCIDENT-2025-001', 'Multi-Agency Response Exercise',
    @CurrentOpPeriodId, @CurrentOpPeriodName,
    'Safety Officer',
    42.86, 7, 3, 7, 3,
    0,
    'sarah.jackson@cobra.mil', 'Safety Officer', DATEADD(HOUR, -2, GETUTCDATE())
);

-- Copy items from template with some marked complete
INSERT INTO ChecklistItems (
    Id, ChecklistInstanceId, TemplateItemId,
    ItemText, ItemType, DisplayOrder, IsRequired,
    IsCompleted, CompletedBy, CompletedByPosition, CompletedAt,
    CurrentStatus, StatusOptions, Notes,
    CreatedAt
)
SELECT
    NEWID(),
    @Checklist1Id,
    ti.Id,
    ti.ItemText,
    ti.ItemType,
    ti.DisplayOrder,
    ti.IsRequired,
    CASE WHEN ti.DisplayOrder <= 30 THEN 1 ELSE NULL END, -- First 3 items complete
    CASE WHEN ti.DisplayOrder <= 30 THEN 'sarah.jackson@cobra.mil' ELSE NULL END,
    CASE WHEN ti.DisplayOrder <= 30 THEN 'Safety Officer' ELSE NULL END,
    CASE WHEN ti.DisplayOrder <= 30 THEN DATEADD(MINUTE, -(ti.DisplayOrder / 10 * 5), GETUTCDATE()) ELSE NULL END,
    NULL,
    ti.StatusOptions,
    NULL,
    GETUTCDATE()
FROM TemplateItems ti
WHERE ti.TemplateId = @SafetyBriefingTemplateId
ORDER BY ti.DisplayOrder;

PRINT 'Created 1 active checklist with 7 items (3 completed)';

-- Verify
SELECT
    ci.Name,
    ci.EventId,
    ci.AssignedPositions,
    ci.ProgressPercentage,
    CAST(ci.CompletedItems AS VARCHAR) + '/' + CAST(ci.TotalItems AS VARCHAR) AS Completion,
    COUNT(it.Id) AS ActualItemCount
FROM ChecklistInstances ci
LEFT JOIN ChecklistItems it ON ci.Id = it.ChecklistInstanceId
WHERE ci.IsArchived = 0
GROUP BY ci.Name, ci.EventId, ci.AssignedPositions, ci.ProgressPercentage, ci.CompletedItems, ci.TotalItems;

PRINT 'Seed data loaded successfully!';
