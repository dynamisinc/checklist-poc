-- ==========================================
-- Seed Data: Operational Periods
-- ==========================================
-- Creates test operational periods for POC testing
-- Allows testing of period grouping in frontend
--
-- IMPORTANT: Run these first:
--   1. seed-events.sql (creates Events and EventCategories)
--   2. seed-templates.sql (creates Templates)
--   3. seed-checklists.sql (creates ChecklistInstances)
--
-- USAGE: Run this AFTER applying the above seed data
-- ==========================================

USE COBRAPOC;
GO

-- Get the Event ID for Hurricane Milton (created by seed-events.sql)
DECLARE @EventId UNIQUEIDENTIFIER;
SELECT @EventId = Id FROM Events WHERE Name = 'Hurricane Milton Response - November 2025';

IF @EventId IS NULL
BEGIN
    RAISERROR('Event not found. Run seed-events.sql first.', 16, 1);
    RETURN;
END

PRINT 'Using Event ID: ' + CAST(@EventId AS VARCHAR(50));

DECLARE @CreatedBy NVARCHAR(255) = 'System Seed';
DECLARE @UtcNow DATETIME2 = GETUTCDATE();

-- Clear existing test operational periods (if running multiple times)
DELETE FROM OperationalPeriods WHERE CreatedBy = 'System Seed';

-- ==========================================
-- Operational Period 1: Morning Shift (completed)
-- ==========================================
DECLARE @OP1_Id UNIQUEIDENTIFIER = NEWID();
DECLARE @OP1_StartTime DATETIME2 = DATEADD(day, -1, DATEADD(hour, 6, CAST(CAST(GETUTCDATE() AS DATE) AS DATETIME2)));
DECLARE @OP1_EndTime DATETIME2 = DATEADD(day, -1, DATEADD(hour, 18, CAST(CAST(GETUTCDATE() AS DATE) AS DATETIME2)));

INSERT INTO OperationalPeriods (
    Id, EventId, Name, StartTime, EndTime, IsCurrent, Description,
    IsArchived, ArchivedBy, ArchivedAt, CreatedBy, CreatedAt
)
VALUES (
    @OP1_Id,
    @EventId,
    'OP 1 - Morning Shift (0600-1800)',
    @OP1_StartTime,
    @OP1_EndTime,
    0, -- Not current
    'First operational period - morning shift during initial response',
    0, -- Not archived
    NULL,
    NULL,
    'System Seed',
    GETUTCDATE()
);

PRINT 'Created OP 1 - Morning Shift (Past)';

-- ==========================================
-- Operational Period 2: Night Shift (completed)
-- ==========================================
DECLARE @OP2_Id UNIQUEIDENTIFIER = NEWID();
DECLARE @OP2_StartTime DATETIME2 = DATEADD(day, -1, DATEADD(hour, 18, CAST(CAST(GETUTCDATE() AS DATE) AS DATETIME2)));
DECLARE @OP2_EndTime DATETIME2 = DATEADD(hour, 6, CAST(CAST(GETUTCDATE() AS DATE) AS DATETIME2));

INSERT INTO OperationalPeriods (
    Id, EventId, Name, StartTime, EndTime, IsCurrent, Description,
    IsArchived, ArchivedBy, ArchivedAt, CreatedBy, CreatedAt
)
VALUES (
    @OP2_Id,
    @EventId,
    'OP 2 - Night Shift (1800-0600)',
    @OP2_StartTime,
    @OP2_EndTime,
    0, -- Not current
    'Second operational period - night shift',
    0, -- Not archived
    NULL,
    NULL,
    'System Seed',
    GETUTCDATE()
);

PRINT 'Created OP 2 - Night Shift (Past)';

-- ==========================================
-- Operational Period 3: Current Morning Shift (ACTIVE)
-- ==========================================
DECLARE @OP3_Id UNIQUEIDENTIFIER = NEWID();
DECLARE @OP3_StartTime DATETIME2 = DATEADD(hour, 6, CAST(CAST(GETUTCDATE() AS DATE) AS DATETIME2));

INSERT INTO OperationalPeriods (
    Id, EventId, Name, StartTime, EndTime, IsCurrent, Description,
    IsArchived, ArchivedBy, ArchivedAt, CreatedBy, CreatedAt
)
VALUES (
    @OP3_Id,
    @EventId,
    'OP 3 - Current Shift (0600-1800)',
    @OP3_StartTime,
    NULL, -- Still active, no end time
    1, -- CURRENT PERIOD
    'Active operational period - focus here',
    0, -- Not archived
    NULL,
    NULL,
    'System Seed',
    GETUTCDATE()
);

PRINT 'Created OP 3 - Current Shift (ACTIVE)';

-- ==========================================
-- Associate existing checklists with operational periods
-- ==========================================
-- This simulates checklists created during different operational periods

-- Update a few checklists to belong to OP 1 (past)
UPDATE TOP (2) ChecklistInstances
SET
    OperationalPeriodId = @OP1_Id,
    OperationalPeriodName = 'OP 1 - Morning Shift (0600-1800)'
WHERE OperationalPeriodId IS NULL
  AND EventId = @EventId;

PRINT 'Associated 2 checklists with OP 1';

-- Update a few checklists to belong to OP 2 (past)
UPDATE TOP (2) ChecklistInstances
SET
    OperationalPeriodId = @OP2_Id,
    OperationalPeriodName = 'OP 2 - Night Shift (1800-0600)'
WHERE OperationalPeriodId IS NULL
  AND EventId = @EventId;

PRINT 'Associated 2 checklists with OP 2';

-- Update a few checklists to belong to OP 3 (current)
UPDATE TOP (3) ChecklistInstances
SET
    OperationalPeriodId = @OP3_Id,
    OperationalPeriodName = 'OP 3 - Current Shift (0600-1800)'
WHERE OperationalPeriodId IS NULL
  AND EventId = @EventId;

PRINT 'Associated 3 checklists with OP 3 (current)';

-- Leave remaining checklists with NULL OperationalPeriodId (incident-level)
PRINT 'Remaining checklists are incident-level (no specific operational period)';

-- ==========================================
-- Summary Report
-- ==========================================
SELECT
    'Operational Periods' AS [Type],
    COUNT(*) AS [Count]
FROM OperationalPeriods
WHERE CreatedBy = 'System Seed'

UNION ALL

SELECT
    'Checklists in OP 1' AS [Type],
    COUNT(*) AS [Count]
FROM ChecklistInstances
WHERE OperationalPeriodName LIKE '%OP 1%'

UNION ALL

SELECT
    'Checklists in OP 2' AS [Type],
    COUNT(*) AS [Count]
FROM ChecklistInstances
WHERE OperationalPeriodName LIKE '%OP 2%'

UNION ALL

SELECT
    'Checklists in OP 3 (Current)' AS [Type],
    COUNT(*) AS [Count]
FROM ChecklistInstances
WHERE OperationalPeriodName LIKE '%OP 3%'

UNION ALL

SELECT
    'Incident-Level Checklists' AS [Type],
    COUNT(*) AS [Count]
FROM ChecklistInstances
WHERE OperationalPeriodId IS NULL
  AND EventId = @EventId;

GO

PRINT '';
PRINT '========================================';
PRINT 'Operational Periods Seed Data Complete!';
PRINT '========================================';
PRINT 'You can now test period grouping in the frontend.';
PRINT 'To switch current period, use the admin API endpoint:';
PRINT '  POST /api/operational-periods/{id}/set-current';
GO
