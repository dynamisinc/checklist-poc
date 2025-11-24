-- ============================================================================
-- Checklist POC - Seed Data for Checklist Instances
-- ============================================================================
-- Creates sample checklist instances from existing templates:
--   1. Active Safety Briefing checklist (partially complete)
--   2. Active IC Initial Actions checklist (not started)
--   3. Active Shelter Opening checklist (nearly complete)
--   4. Archived checklist (complete)
--
-- IMPORTANT: Run seed-templates.sql first to create templates
-- ============================================================================

USE ChecklistPOC;
GO

-- Clear existing checklist seed data if re-running
DELETE FROM ChecklistItems;
DELETE FROM ChecklistInstances;
GO

-- ============================================================================
-- Get Template IDs (created by seed-templates.sql)
-- ============================================================================
DECLARE @SafetyBriefingTemplateId UNIQUEIDENTIFIER;
DECLARE @ICActionsTemplateId UNIQUEIDENTIFIER;
DECLARE @ShelterTemplateId UNIQUEIDENTIFIER;

SELECT @SafetyBriefingTemplateId = Id FROM Templates WHERE Name = 'Daily Safety Briefing';
SELECT @ICActionsTemplateId = Id FROM Templates WHERE Name = 'Incident Commander Initial Actions';
SELECT @ShelterTemplateId = Id FROM Templates WHERE Name = 'Emergency Shelter Opening Checklist';

IF @SafetyBriefingTemplateId IS NULL OR @ICActionsTemplateId IS NULL OR @ShelterTemplateId IS NULL
BEGIN
    RAISERROR('Templates not found. Run seed-templates.sql first.', 16, 1);
    RETURN;
END

PRINT 'Found templates:';
PRINT '  Safety Briefing: ' + CAST(@SafetyBriefingTemplateId AS VARCHAR(50));
PRINT '  IC Initial Actions: ' + CAST(@ICActionsTemplateId AS VARCHAR(50));
PRINT '  Shelter Opening: ' + CAST(@ShelterTemplateId AS VARCHAR(50));

-- ============================================================================
-- Checklist 1: Safety Briefing - OP 1 (Partially Complete - 3/7 items)
-- ============================================================================
DECLARE @Checklist1Id UNIQUEIDENTIFIER = NEWID();
DECLARE @EventId VARCHAR(100) = 'HURRICANE-2025-001';
DECLARE @EventName VARCHAR(200) = 'Hurricane Milton Response - November 2025';

INSERT INTO ChecklistInstances (
    Id, Name, TemplateId,
    EventId, EventName,
    OperationalPeriodName,
    AssignedPositions,
    ProgressPercentage, TotalItems, CompletedItems, RequiredItems, RequiredItemsCompleted,
    IsArchived,
    CreatedBy, CreatedByPosition, CreatedAt
)
VALUES (
    @Checklist1Id,
    'Safety Briefing - Nov 20, 2025 - Day Shift',
    @SafetyBriefingTemplateId,
    @EventId, @EventName,
    'November 20, 2025 - Day Shift (06:00-18:00)',
    'Safety Officer,Incident Commander', -- Only visible to these positions
    42.86, -- 3/7 = 42.86%
    7, 3, 7, 3,
    0,
    'sarah.jackson@cobra.mil', 'Safety Officer', DATEADD(HOUR, -2, GETUTCDATE())
);

-- Copy items from template and mark some as complete
DECLARE @TemplateItemCursor CURSOR;
DECLARE @TemplateItemId UNIQUEIDENTIFIER;
DECLARE @ItemText VARCHAR(500);
DECLARE @ItemType VARCHAR(50);
DECLARE @DisplayOrder INT;
DECLARE @IsRequired BIT;
DECLARE @StatusConfiguration VARCHAR(MAX);
DECLARE @DefaultNotes VARCHAR(1000);
DECLARE @ItemCounter INT = 0;

SET @TemplateItemCursor = CURSOR FOR
SELECT Id, ItemText, ItemType, DisplayOrder, IsRequired, StatusConfiguration, DefaultNotes
FROM TemplateItems
WHERE TemplateId = @SafetyBriefingTemplateId
ORDER BY DisplayOrder;

OPEN @TemplateItemCursor;
FETCH NEXT FROM @TemplateItemCursor INTO @TemplateItemId, @ItemText, @ItemType, @DisplayOrder, @IsRequired, @StatusConfiguration, @DefaultNotes;

WHILE @@FETCH_STATUS = 0
BEGIN
    SET @ItemCounter = @ItemCounter + 1;

    -- Mark first 3 items as complete
    IF @ItemCounter <= 3
    BEGIN
        INSERT INTO ChecklistItems (
            Id, ChecklistInstanceId, TemplateItemId,
            ItemText, ItemType, DisplayOrder, IsRequired,
            IsCompleted, CompletedBy, CompletedByPosition, CompletedAt,
            CurrentStatus, StatusConfiguration,
            CreatedAt
        )
        VALUES (
            NEWID(), @Checklist1Id, @TemplateItemId,
            @ItemText, @ItemType, @DisplayOrder, @IsRequired,
            1, 'sarah.jackson@cobra.mil', 'Safety Officer', DATEADD(MINUTE, -(@ItemCounter * 5), GETUTCDATE()),
            NULL, @StatusConfiguration,
            DATEADD(HOUR, -2, GETUTCDATE())
        );
    END
    ELSE
    BEGIN
        -- Remaining items not completed
        INSERT INTO ChecklistItems (
            Id, ChecklistInstanceId, TemplateItemId,
            ItemText, ItemType, DisplayOrder, IsRequired,
            IsCompleted,
            CurrentStatus, StatusConfiguration,
            CreatedAt
        )
        VALUES (
            NEWID(), @Checklist1Id, @TemplateItemId,
            @ItemText, @ItemType, @DisplayOrder, @IsRequired,
            NULL,
            NULL, @StatusConfiguration,
            DATEADD(HOUR, -2, GETUTCDATE())
        );
    END

    FETCH NEXT FROM @TemplateItemCursor INTO @TemplateItemId, @ItemText, @ItemType, @DisplayOrder, @IsRequired, @StatusConfiguration, @DefaultNotes;
END

CLOSE @TemplateItemCursor;
DEALLOCATE @TemplateItemCursor;

PRINT 'Created Checklist 1: Safety Briefing (42.86% complete, 3/7 items)';

-- ============================================================================
-- Checklist 2: IC Initial Actions - OP 1 (Not Started - 0/12 items)
-- ============================================================================
DECLARE @Checklist2Id UNIQUEIDENTIFIER = NEWID();

INSERT INTO ChecklistInstances (
    Id, Name, TemplateId,
    EventId, EventName,
    OperationalPeriodName,
    AssignedPositions,
    ProgressPercentage, TotalItems, CompletedItems, RequiredItems, RequiredItemsCompleted,
    IsArchived,
    CreatedBy, CreatedByPosition, CreatedAt
)
VALUES (
    @Checklist2Id,
    'IC Initial Actions - Hurricane Milton',
    @ICActionsTemplateId,
    @EventId, @EventName,
    'November 20, 2025 - Day Shift (06:00-18:00)',
    NULL, -- Visible to all positions
    0.00, -- Not started
    12, 0, 12, 0,
    0,
    'james.rodriguez@cobra.mil', 'Incident Commander', DATEADD(HOUR, -1, GETUTCDATE())
);

-- Copy all items as not completed
SET @TemplateItemCursor = CURSOR FOR
SELECT Id, ItemText, ItemType, DisplayOrder, IsRequired, StatusConfiguration, DefaultNotes
FROM TemplateItems
WHERE TemplateId = @ICActionsTemplateId
ORDER BY DisplayOrder;

OPEN @TemplateItemCursor;
FETCH NEXT FROM @TemplateItemCursor INTO @TemplateItemId, @ItemText, @ItemType, @DisplayOrder, @IsRequired, @StatusConfiguration, @DefaultNotes;

WHILE @@FETCH_STATUS = 0
BEGIN
    INSERT INTO ChecklistItems (
        Id, ChecklistInstanceId, TemplateItemId,
        ItemText, ItemType, DisplayOrder, IsRequired,
        IsCompleted,
        CurrentStatus, StatusConfiguration,
        CreatedAt
    )
    VALUES (
        NEWID(), @Checklist2Id, @TemplateItemId,
        @ItemText, @ItemType, @DisplayOrder, @IsRequired,
        NULL,
        NULL, @StatusConfiguration,
        DATEADD(HOUR, -1, GETUTCDATE())
    );

    FETCH NEXT FROM @TemplateItemCursor INTO @TemplateItemId, @ItemText, @ItemType, @DisplayOrder, @IsRequired, @StatusConfiguration, @DefaultNotes;
END

CLOSE @TemplateItemCursor;
DEALLOCATE @TemplateItemCursor;

PRINT 'Created Checklist 2: IC Initial Actions (0% complete, 0/12 items)';

-- ============================================================================
-- Checklist 3: Shelter Opening - OP 2 (Nearly Complete - 14/15 items)
-- ============================================================================
DECLARE @Checklist3Id UNIQUEIDENTIFIER = NEWID();

INSERT INTO ChecklistInstances (
    Id, Name, TemplateId,
    EventId, EventName,
    OperationalPeriodName,
    AssignedPositions,
    ProgressPercentage, TotalItems, CompletedItems, RequiredItems, RequiredItemsCompleted,
    IsArchived,
    CreatedBy, CreatedByPosition, CreatedAt
)
VALUES (
    @Checklist3Id,
    'Shelter Opening - Oakwood Community Center',
    @ShelterTemplateId,
    @EventId, @EventName,
    'November 20, 2025 - Night Shift (18:00-06:00)',
    'Logistics Section Chief,Incident Commander', -- Position-filtered
    93.33, -- 14/15 = 93.33%
    15, 14, 15, 14,
    0,
    'maria.chen@cobra.mil', 'Logistics Section Chief', DATEADD(HOUR, -3, GETUTCDATE())
);

-- Copy items from template and mark 14/15 as complete
SET @ItemCounter = 0;
SET @TemplateItemCursor = CURSOR FOR
SELECT Id, ItemText, ItemType, DisplayOrder, IsRequired, StatusConfiguration, DefaultNotes
FROM TemplateItems
WHERE TemplateId = @ShelterTemplateId
ORDER BY DisplayOrder;

OPEN @TemplateItemCursor;
FETCH NEXT FROM @TemplateItemCursor INTO @TemplateItemId, @ItemText, @ItemType, @DisplayOrder, @IsRequired, @StatusConfiguration, @DefaultNotes;

WHILE @@FETCH_STATUS = 0
BEGIN
    SET @ItemCounter = @ItemCounter + 1;

    -- Leave last item incomplete
    IF @ItemCounter < 15
    BEGIN
        INSERT INTO ChecklistItems (
            Id, ChecklistInstanceId, TemplateItemId,
            ItemText, ItemType, DisplayOrder, IsRequired,
            IsCompleted, CompletedBy, CompletedByPosition, CompletedAt,
            CurrentStatus, StatusConfiguration,
            CreatedAt
        )
        VALUES (
            NEWID(), @Checklist3Id, @TemplateItemId,
            @ItemText, @ItemType, @DisplayOrder, @IsRequired,
            1, 'maria.chen@cobra.mil', 'Logistics Section Chief', DATEADD(MINUTE, -(@ItemCounter * 3), GETUTCDATE()),
            'Complete', @StatusConfiguration,
            DATEADD(HOUR, -3, GETUTCDATE())
        );
    END
    ELSE
    BEGIN
        -- Last item still in progress
        INSERT INTO ChecklistItems (
            Id, ChecklistInstanceId, TemplateItemId,
            ItemText, ItemType, DisplayOrder, IsRequired,
            IsCompleted,
            CurrentStatus, StatusConfiguration,
            CreatedAt
        )
        VALUES (
            NEWID(), @Checklist3Id, @TemplateItemId,
            @ItemText, @ItemType, @DisplayOrder, @IsRequired,
            NULL,
            'In Progress', @StatusConfiguration,
            DATEADD(HOUR, -3, GETUTCDATE())
        );
    END

    FETCH NEXT FROM @TemplateItemCursor INTO @TemplateItemId, @ItemText, @ItemType, @DisplayOrder, @IsRequired, @StatusConfiguration, @DefaultNotes;
END

CLOSE @TemplateItemCursor;
DEALLOCATE @TemplateItemCursor;

PRINT 'Created Checklist 3: Shelter Opening (93.33% complete, 14/15 items)';

-- ============================================================================
-- Checklist 4: Archived Safety Briefing - Previous Day (Complete - 7/7 items)
-- ============================================================================
DECLARE @Checklist4Id UNIQUEIDENTIFIER = NEWID();

INSERT INTO ChecklistInstances (
    Id, Name, TemplateId,
    EventId, EventName,
    OperationalPeriodName,
    AssignedPositions,
    ProgressPercentage, TotalItems, CompletedItems, RequiredItems, RequiredItemsCompleted,
    IsArchived, ArchivedBy, ArchivedAt,
    CreatedBy, CreatedByPosition, CreatedAt
)
VALUES (
    @Checklist4Id,
    'Safety Briefing - Nov 19, 2025 - Day Shift (ARCHIVED)',
    @SafetyBriefingTemplateId,
    @EventId, @EventName,
    'November 19, 2025 - Day Shift (06:00-18:00)',
    'Safety Officer,Incident Commander',
    100.00, -- Complete
    7, 7, 7, 7,
    1, 'james.rodriguez@cobra.mil', DATEADD(HOUR, -6, GETUTCDATE()),
    'sarah.jackson@cobra.mil', 'Safety Officer', DATEADD(DAY, -1, GETUTCDATE())
);

-- Copy all items as completed
SET @TemplateItemCursor = CURSOR FOR
SELECT Id, ItemText, ItemType, DisplayOrder, IsRequired, StatusConfiguration, DefaultNotes
FROM TemplateItems
WHERE TemplateId = @SafetyBriefingTemplateId
ORDER BY DisplayOrder;

OPEN @TemplateItemCursor;
FETCH NEXT FROM @TemplateItemCursor INTO @TemplateItemId, @ItemText, @ItemType, @DisplayOrder, @IsRequired, @StatusConfiguration, @DefaultNotes;

WHILE @@FETCH_STATUS = 0
BEGIN
    INSERT INTO ChecklistItems (
        Id, ChecklistInstanceId, TemplateItemId,
        ItemText, ItemType, DisplayOrder, IsRequired,
        IsCompleted, CompletedBy, CompletedByPosition, CompletedAt,
        CurrentStatus, StatusConfiguration,
        CreatedAt
    )
    VALUES (
        NEWID(), @Checklist4Id, @TemplateItemId,
        @ItemText, @ItemType, @DisplayOrder, @IsRequired,
        1, 'sarah.jackson@cobra.mil', 'Safety Officer', DATEADD(DAY, -1, GETUTCDATE()),
        NULL, @StatusConfiguration,
        DATEADD(DAY, -1, GETUTCDATE())
    );

    FETCH NEXT FROM @TemplateItemCursor INTO @TemplateItemId, @ItemText, @ItemType, @DisplayOrder, @IsRequired, @StatusConfiguration, @DefaultNotes;
END

CLOSE @TemplateItemCursor;
DEALLOCATE @TemplateItemCursor;

PRINT 'Created Checklist 4: Archived Safety Briefing (100% complete, 7/7 items)';

-- ============================================================================
-- Verification Queries
-- ============================================================================

PRINT '';
PRINT '============================================================================';
PRINT 'Checklist Seed Data Summary';
PRINT '============================================================================';

SELECT
    Name,
    EventId,
    OperationalPeriodName,
    AssignedPositions,
    ProgressPercentage,
    CAST(CompletedItems AS VARCHAR) + '/' + CAST(TotalItems AS VARCHAR) AS Completion,
    IsArchived,
    CreatedBy
FROM ChecklistInstances
ORDER BY CreatedAt DESC;

DECLARE @TotalCount INT, @ActiveCount INT, @ArchivedCount INT, @ItemCount INT;
SELECT @TotalCount = COUNT(*) FROM ChecklistInstances;
SELECT @ActiveCount = COUNT(*) FROM ChecklistInstances WHERE IsArchived = 0;
SELECT @ArchivedCount = COUNT(*) FROM ChecklistInstances WHERE IsArchived = 1;
SELECT @ItemCount = COUNT(*) FROM ChecklistItems;

PRINT '';
PRINT 'Total Checklists: ' + CAST(@TotalCount AS VARCHAR);
PRINT 'Active Checklists: ' + CAST(@ActiveCount AS VARCHAR);
PRINT 'Archived Checklists: ' + CAST(@ArchivedCount AS VARCHAR);
PRINT 'Total Checklist Items: ' + CAST(@ItemCount AS VARCHAR);

PRINT '';
PRINT '============================================================================';
PRINT 'Checklist seed data loaded successfully!';
PRINT '============================================================================';

GO
