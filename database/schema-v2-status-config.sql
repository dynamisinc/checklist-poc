-- ============================================================================
-- Checklist POC - Database Schema V2 (Status Configuration)
-- ============================================================================
-- SQL Server 2019+ compatible
-- BREAKING CHANGE: StatusOptions replaced with StatusConfiguration (JSON)
-- ============================================================================

USE ChecklistPOC;
GO

-- Drop existing tables (clean setup)
IF OBJECT_ID('ChecklistItems', 'U') IS NOT NULL DROP TABLE ChecklistItems;
IF OBJECT_ID('ChecklistInstances', 'U') IS NOT NULL DROP TABLE ChecklistInstances;
IF OBJECT_ID('OperationalPeriods', 'U') IS NOT NULL DROP TABLE OperationalPeriods;
IF OBJECT_ID('TemplateItems', 'U') IS NOT NULL DROP TABLE TemplateItems;
IF OBJECT_ID('Templates', 'U') IS NOT NULL DROP TABLE Templates;
GO

-- ============================================================================
-- Templates Table
-- ============================================================================
CREATE TABLE Templates (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    Name NVARCHAR(200) NOT NULL,
    Description NVARCHAR(1000),
    Category NVARCHAR(50) NOT NULL,
    Tags NVARCHAR(500),
    IsActive BIT NOT NULL DEFAULT 1,
    IsArchived BIT NOT NULL DEFAULT 0,
    ArchivedBy NVARCHAR(200),
    ArchivedAt DATETIME2,

    -- Audit fields
    CreatedBy NVARCHAR(200) NOT NULL,
    CreatedByPosition NVARCHAR(100) NOT NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    LastModifiedBy NVARCHAR(200),
    LastModifiedByPosition NVARCHAR(100),
    LastModifiedAt DATETIME2,

    INDEX IX_Templates_Category (Category),
    INDEX IX_Templates_IsActive_IsArchived (IsActive, IsArchived)
);
GO

-- ============================================================================
-- TemplateItems Table
-- ============================================================================
CREATE TABLE TemplateItems (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    TemplateId UNIQUEIDENTIFIER NOT NULL,
    ItemText NVARCHAR(500) NOT NULL,
    ItemType NVARCHAR(20) NOT NULL, -- 'checkbox' or 'status'
    DisplayOrder INT NOT NULL,
    IsRequired BIT NOT NULL DEFAULT 0,

    -- NEW: JSON configuration for status options
    -- Format: [{"label":"Not Started","isCompletion":false,"order":1}, ...]
    StatusConfiguration NVARCHAR(MAX),

    AllowedPositions NVARCHAR(MAX),
    DefaultNotes NVARCHAR(1000),
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),

    CONSTRAINT FK_TemplateItems_Template FOREIGN KEY (TemplateId)
        REFERENCES Templates(Id) ON DELETE CASCADE,

    INDEX IX_TemplateItems_TemplateId_DisplayOrder (TemplateId, DisplayOrder)
);
GO

-- ============================================================================
-- OperationalPeriods Table
-- ============================================================================
CREATE TABLE OperationalPeriods (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    Name NVARCHAR(200) NOT NULL,
    EventId NVARCHAR(50) NOT NULL,
    EventName NVARCHAR(200) NOT NULL,
    Description NVARCHAR(1000),
    StartTime DATETIME2 NOT NULL,
    EndTime DATETIME2,
    IsCurrent BIT NOT NULL DEFAULT 0,
    IsArchived BIT NOT NULL DEFAULT 0,
    ArchivedBy NVARCHAR(200),
    ArchivedAt DATETIME2,

    -- Audit
    CreatedBy NVARCHAR(200) NOT NULL,
    CreatedByPosition NVARCHAR(100) NOT NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    LastModifiedBy NVARCHAR(200),
    LastModifiedByPosition NVARCHAR(100),
    LastModifiedAt DATETIME2,

    INDEX IX_OperationalPeriods_EventId (EventId),
    INDEX IX_OperationalPeriods_EventId_IsCurrent (EventId, IsCurrent),
    INDEX IX_OperationalPeriods_IsArchived (IsArchived)
);
GO

-- ============================================================================
-- ChecklistInstances Table
-- ============================================================================
CREATE TABLE ChecklistInstances (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    Name NVARCHAR(200) NOT NULL,
    TemplateId UNIQUEIDENTIFIER NOT NULL,

    -- Event context
    EventId NVARCHAR(50) NOT NULL,
    EventName NVARCHAR(200) NOT NULL,

    -- Optional operational period (FK with SET NULL)
    OperationalPeriodId UNIQUEIDENTIFIER,
    OperationalPeriodName NVARCHAR(200),

    AssignedPositions NVARCHAR(500),

    -- Progress tracking (denormalized)
    ProgressPercentage DECIMAL(5,2) NOT NULL DEFAULT 0,
    TotalItems INT NOT NULL DEFAULT 0,
    CompletedItems INT NOT NULL DEFAULT 0,
    RequiredItems INT NOT NULL DEFAULT 0,
    RequiredItemsCompleted INT NOT NULL DEFAULT 0,

    -- Archive
    IsArchived BIT NOT NULL DEFAULT 0,
    ArchivedBy NVARCHAR(200),
    ArchivedAt DATETIME2,

    -- Audit
    CreatedBy NVARCHAR(200) NOT NULL,
    CreatedByPosition NVARCHAR(100) NOT NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    LastModifiedBy NVARCHAR(200),
    LastModifiedByPosition NVARCHAR(100),
    LastModifiedAt DATETIME2,

    CONSTRAINT FK_ChecklistInstances_OperationalPeriod FOREIGN KEY (OperationalPeriodId)
        REFERENCES OperationalPeriods(Id) ON DELETE SET NULL,

    INDEX IX_ChecklistInstances_EventId (EventId),
    INDEX IX_ChecklistInstances_OperationalPeriodId (OperationalPeriodId),
    INDEX IX_ChecklistInstances_IsArchived (IsArchived)
);
GO

-- ============================================================================
-- ChecklistItems Table
-- ============================================================================
CREATE TABLE ChecklistItems (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    ChecklistInstanceId UNIQUEIDENTIFIER NOT NULL,
    TemplateItemId UNIQUEIDENTIFIER NOT NULL,
    ItemText NVARCHAR(500) NOT NULL,
    ItemType NVARCHAR(20) NOT NULL,
    DisplayOrder INT NOT NULL,
    IsRequired BIT NOT NULL DEFAULT 0,

    -- Checkbox fields
    IsCompleted BIT,
    CompletedBy NVARCHAR(200),
    CompletedByPosition NVARCHAR(100),
    CompletedAt DATETIME2,

    -- Status fields
    CurrentStatus NVARCHAR(100),

    -- NEW: JSON configuration (copied from TemplateItem)
    StatusConfiguration NVARCHAR(MAX),

    AllowedPositions NVARCHAR(MAX),
    Notes NVARCHAR(2000),

    -- Audit
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    LastModifiedBy NVARCHAR(200),
    LastModifiedByPosition NVARCHAR(100),
    LastModifiedAt DATETIME2,

    CONSTRAINT FK_ChecklistItems_ChecklistInstance FOREIGN KEY (ChecklistInstanceId)
        REFERENCES ChecklistInstances(Id) ON DELETE CASCADE,

    INDEX IX_ChecklistItems_ChecklistInstanceId_DisplayOrder (ChecklistInstanceId, DisplayOrder),
    INDEX IX_ChecklistItems_LastModifiedAt (LastModifiedAt)
);
GO

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Template 1: Safety Briefing
DECLARE @SafetyTemplateId UNIQUEIDENTIFIER = NEWID();

INSERT INTO Templates (Id, Name, Description, Category, Tags, IsActive, CreatedBy, CreatedByPosition, CreatedAt)
VALUES (
    @SafetyTemplateId,
    'Daily Safety Briefing',
    'Standard safety briefing checklist for all operational periods',
    'Safety',
    'safety,briefing,daily',
    1,
    'admin@cobra.gov',
    'System Administrator',
    GETUTCDATE()
);

-- Safety Template Items with JSON StatusConfiguration
INSERT INTO TemplateItems (Id, TemplateId, ItemText, ItemType, DisplayOrder, IsRequired, StatusConfiguration, CreatedAt)
VALUES
    (NEWID(), @SafetyTemplateId, 'Review weather conditions', 'checkbox', 1, 1, NULL, GETUTCDATE()),
    (NEWID(), @SafetyTemplateId, 'Verify PPE availability', 'checkbox', 2, 1, NULL, GETUTCDATE()),
    (NEWID(), @SafetyTemplateId, 'Check first aid kit inventory', 'status', 3, 1,
        '[{"label":"Not Checked","isCompletion":false,"order":1},{"label":"In Progress","isCompletion":false,"order":2},{"label":"Complete","isCompletion":true,"order":3},{"label":"Needs Restocking","isCompletion":false,"order":4}]',
        GETUTCDATE()),
    (NEWID(), @SafetyTemplateId, 'Review emergency evacuation routes', 'checkbox', 4, 1, NULL, GETUTCDATE()),
    (NEWID(), @SafetyTemplateId, 'Document hazard identification', 'status', 5, 0,
        '[{"label":"Not Started","isCompletion":false,"order":1},{"label":"In Progress","isCompletion":false,"order":2},{"label":"Documented","isCompletion":true,"order":3}]',
        GETUTCDATE());

-- Template 2: ICS 201 Form
DECLARE @ICS201TemplateId UNIQUEIDENTIFIER = NEWID();

INSERT INTO Templates (Id, Name, Description, Category, Tags, IsActive, CreatedBy, CreatedByPosition, CreatedAt)
VALUES (
    @ICS201TemplateId,
    'ICS 201 - Incident Briefing',
    'Initial incident briefing form checklist (ICS 201)',
    'ICS Forms',
    'ics,ics201,briefing',
    1,
    'admin@cobra.gov',
    'System Administrator',
    GETUTCDATE()
);

INSERT INTO TemplateItems (Id, TemplateId, ItemText, ItemType, DisplayOrder, IsRequired, StatusConfiguration, CreatedAt)
VALUES
    (NEWID(), @ICS201TemplateId, 'Document incident name and number', 'checkbox', 1, 1, NULL, GETUTCDATE()),
    (NEWID(), @ICS201TemplateId, 'Map preparation status', 'status', 2, 1,
        '[{"label":"Not Started","isCompletion":false,"order":1},{"label":"Draft","isCompletion":false,"order":2},{"label":"Complete","isCompletion":true,"order":3},{"label":"Approved","isCompletion":true,"order":4}]',
        GETUTCDATE()),
    (NEWID(), @ICS201TemplateId, 'Identify current situation', 'checkbox', 3, 1, NULL, GETUTCDATE()),
    (NEWID(), @ICS201TemplateId, 'Initial response objectives', 'status', 4, 1,
        '[{"label":"Not Defined","isCompletion":false,"order":1},{"label":"Draft","isCompletion":false,"order":2},{"label":"Finalized","isCompletion":true,"order":3}]',
        GETUTCDATE()),
    (NEWID(), @ICS201TemplateId, 'Current organization chart', 'status', 5, 1,
        '[{"label":"Not Started","isCompletion":false,"order":1},{"label":"In Progress","isCompletion":false,"order":2},{"label":"Complete","isCompletion":true,"order":3}]',
        GETUTCDATE()),
    (NEWID(), @ICS201TemplateId, 'Resources summary', 'checkbox', 6, 0, NULL, GETUTCDATE());

-- Template 3: Logistics Section
DECLARE @LogisticsTemplateId UNIQUEIDENTIFIER = NEWID();

INSERT INTO Templates (Id, Name, Description, Category, Tags, IsActive, CreatedBy, CreatedByPosition, CreatedAt)
VALUES (
    @LogisticsTemplateId,
    'Logistics Section Setup',
    'Initial setup checklist for Logistics Section',
    'Operations',
    'logistics,setup,resources',
    1,
    'admin@cobra.gov',
    'System Administrator',
    GETUTCDATE()
);

INSERT INTO TemplateItems (Id, TemplateId, ItemText, ItemType, DisplayOrder, IsRequired, StatusConfiguration, CreatedAt)
VALUES
    (NEWID(), @LogisticsTemplateId, 'Establish supply chain', 'checkbox', 1, 1, NULL, GETUTCDATE()),
    (NEWID(), @LogisticsTemplateId, 'Communications equipment status', 'status', 2, 1,
        '[{"label":"Not Checked","isCompletion":false,"order":1},{"label":"Testing","isCompletion":false,"order":2},{"label":"Operational","isCompletion":true,"order":3},{"label":"Needs Repair","isCompletion":false,"order":4}]',
        GETUTCDATE()),
    (NEWID(), @LogisticsTemplateId, 'Verify vehicle availability', 'checkbox', 3, 1, NULL, GETUTCDATE()),
    (NEWID(), @LogisticsTemplateId, 'Food service arrangement status', 'status', 4, 0,
        '[{"label":"Not Arranged","isCompletion":false,"order":1},{"label":"In Progress","isCompletion":false,"order":2},{"label":"Confirmed","isCompletion":true,"order":3}]',
        GETUTCDATE()),
    (NEWID(), @LogisticsTemplateId, 'Medical services coordination', 'status', 5, 1,
        '[{"label":"Not Started","isCompletion":false,"order":1},{"label":"Contacting","isCompletion":false,"order":2},{"label":"Confirmed","isCompletion":true,"order":3},{"label":"On-Site","isCompletion":true,"order":4}]',
        GETUTCDATE());

PRINT 'Schema V2 with Status Configuration created successfully!';
PRINT 'Templates: 3';
PRINT 'Template Items: 16';
PRINT 'Status items now use JSON configuration with isCompletion flags';
GO
