-- ============================================================================
-- Checklist POC - Database Schema
-- ============================================================================
-- SQL Server 2019+ compatible
-- Includes: Templates, Checklists, Items, Status History, Notes, and Audit
-- ============================================================================

-- Drop existing tables (for clean POC setup)
IF OBJECT_ID('ItemNotes', 'U') IS NOT NULL DROP TABLE ItemNotes;
IF OBJECT_ID('ItemStatusHistory', 'U') IS NOT NULL DROP TABLE ItemStatusHistory;
IF OBJECT_ID('ChecklistItems', 'U') IS NOT NULL DROP TABLE ChecklistItems;
IF OBJECT_ID('ChecklistInstances', 'U') IS NOT NULL DROP TABLE ChecklistInstances;
IF OBJECT_ID('TemplateItems', 'U') IS NOT NULL DROP TABLE TemplateItems;
IF OBJECT_ID('Templates', 'U') IS NOT NULL DROP TABLE Templates;
IF OBJECT_ID('AuditLog', 'U') IS NOT NULL DROP TABLE AuditLog;

-- ============================================================================
-- Templates Table
-- ============================================================================
CREATE TABLE Templates (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    Name NVARCHAR(200) NOT NULL,
    Description NVARCHAR(1000),
    Category NVARCHAR(50) NOT NULL, -- ICS Forms, Safety, Operations, etc.
    Tags NVARCHAR(500), -- Comma-separated or JSON array
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
    
    -- Indexes
    INDEX IX_Templates_Category (Category),
    INDEX IX_Templates_IsActive_IsArchived (IsActive, IsArchived),
    INDEX IX_Templates_CreatedAt (CreatedAt DESC)
);

-- ============================================================================
-- TemplateItems Table
-- ============================================================================
CREATE TABLE TemplateItems (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    TemplateId UNIQUEIDENTIFIER NOT NULL,
    ItemText NVARCHAR(500) NOT NULL,
    ItemType NVARCHAR(20) NOT NULL, -- 'checkbox' or 'status_dropdown'
    DisplayOrder INT NOT NULL,
    IsRequired BIT NOT NULL DEFAULT 0,
    
    -- Status dropdown configuration (stored as JSON)
    StatusOptions NVARCHAR(MAX), -- JSON array of status options
    
    -- Position restrictions (null = all positions can edit)
    AllowedPositions NVARCHAR(MAX), -- JSON array of position names
    
    -- Optional default notes
    DefaultNotes NVARCHAR(1000),
    
    -- Audit
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    
    CONSTRAINT FK_TemplateItems_Template FOREIGN KEY (TemplateId) 
        REFERENCES Templates(Id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX IX_TemplateItems_TemplateId (TemplateId),
    INDEX IX_TemplateItems_DisplayOrder (TemplateId, DisplayOrder)
);

-- ============================================================================
-- ChecklistInstances Table
-- ============================================================================
CREATE TABLE ChecklistInstances (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    Name NVARCHAR(200) NOT NULL,
    TemplateId UNIQUEIDENTIFIER NOT NULL,
    
    -- Event context (REQUIRED for FEMA compliance)
    EventId NVARCHAR(50) NOT NULL, -- Mock GUIDs for POC
    EventName NVARCHAR(200) NOT NULL,
    
    -- Optional operational period
    OperationalPeriodId NVARCHAR(50),
    OperationalPeriodName NVARCHAR(200),
    
    -- Position assignments (JSON array)
    AssignedPositions NVARCHAR(500), -- JSON array of position names
    
    -- Calculated fields (denormalized for performance)
    ProgressPercentage DECIMAL(5,2) NOT NULL DEFAULT 0,
    TotalItems INT NOT NULL DEFAULT 0,
    CompletedItems INT NOT NULL DEFAULT 0,
    RequiredItems INT NOT NULL DEFAULT 0,
    RequiredItemsCompleted INT NOT NULL DEFAULT 0,
    
    -- Archive status
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
    
    CONSTRAINT FK_ChecklistInstances_Template FOREIGN KEY (TemplateId) 
        REFERENCES Templates(Id),
    
    -- Indexes
    INDEX IX_ChecklistInstances_EventId (EventId),
    INDEX IX_ChecklistInstances_OperationalPeriodId (OperationalPeriodId),
    INDEX IX_ChecklistInstances_CreatedAt (CreatedAt DESC),
    INDEX IX_ChecklistInstances_IsArchived (IsArchived)
);

-- ============================================================================
-- ChecklistItems Table
-- ============================================================================
CREATE TABLE ChecklistItems (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    ChecklistInstanceId UNIQUEIDENTIFIER NOT NULL,
    TemplateItemId UNIQUEIDENTIFIER NOT NULL, -- Reference to original template item
    ItemText NVARCHAR(500) NOT NULL,
    ItemType NVARCHAR(20) NOT NULL,
    DisplayOrder INT NOT NULL,
    IsRequired BIT NOT NULL DEFAULT 0,
    
    -- Checkbox fields
    IsCompleted BIT,
    CompletedBy NVARCHAR(200),
    CompletedByPosition NVARCHAR(100),
    CompletedAt DATETIME2,
    
    -- Status dropdown fields
    CurrentStatus NVARCHAR(50),
    StatusOptions NVARCHAR(MAX), -- JSON array (copied from template)
    
    -- Position restrictions
    AllowedPositions NVARCHAR(MAX), -- JSON array
    
    -- Audit
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    LastModifiedBy NVARCHAR(200),
    LastModifiedByPosition NVARCHAR(100),
    LastModifiedAt DATETIME2,
    
    CONSTRAINT FK_ChecklistItems_Instance FOREIGN KEY (ChecklistInstanceId) 
        REFERENCES ChecklistInstances(Id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX IX_ChecklistItems_InstanceId (ChecklistInstanceId),
    INDEX IX_ChecklistItems_DisplayOrder (ChecklistInstanceId, DisplayOrder),
    INDEX IX_ChecklistItems_Completed (ChecklistInstanceId, IsCompleted),
    INDEX IX_ChecklistItems_LastModified (LastModifiedAt DESC)
);

-- ============================================================================
-- ItemStatusHistory Table
-- ============================================================================
CREATE TABLE ItemStatusHistory (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    ChecklistItemId UNIQUEIDENTIFIER NOT NULL,
    PreviousStatus NVARCHAR(50),
    NewStatus NVARCHAR(50) NOT NULL,
    ChangedBy NVARCHAR(200) NOT NULL,
    ChangedByPosition NVARCHAR(100) NOT NULL,
    ChangedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    
    CONSTRAINT FK_ItemStatusHistory_Item FOREIGN KEY (ChecklistItemId) 
        REFERENCES ChecklistItems(Id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX IX_ItemStatusHistory_ItemId (ChecklistItemId),
    INDEX IX_ItemStatusHistory_ChangedAt (ChangedAt DESC)
);

-- ============================================================================
-- ItemNotes Table
-- ============================================================================
CREATE TABLE ItemNotes (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    ChecklistItemId UNIQUEIDENTIFIER NOT NULL,
    NoteText NVARCHAR(1000) NOT NULL,
    CreatedBy NVARCHAR(200) NOT NULL,
    CreatedByPosition NVARCHAR(100) NOT NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    EditedBy NVARCHAR(200),
    EditedAt DATETIME2,
    IsEdited BIT NOT NULL DEFAULT 0,
    
    CONSTRAINT FK_ItemNotes_Item FOREIGN KEY (ChecklistItemId) 
        REFERENCES ChecklistItems(Id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX IX_ItemNotes_ItemId (ChecklistItemId),
    INDEX IX_ItemNotes_CreatedAt (CreatedAt DESC)
);

-- ============================================================================
-- AuditLog Table (for compliance)
-- ============================================================================
CREATE TABLE AuditLog (
    Id BIGINT IDENTITY(1,1) PRIMARY KEY,
    EntityType NVARCHAR(50) NOT NULL, -- 'Template', 'Checklist', 'Item', etc.
    EntityId UNIQUEIDENTIFIER NOT NULL,
    ActionType NVARCHAR(50) NOT NULL, -- 'Create', 'Update', 'Delete', 'Complete', etc.
    UserId NVARCHAR(200) NOT NULL,
    UserPosition NVARCHAR(100) NOT NULL,
    EventId NVARCHAR(50), -- Context if applicable
    Timestamp DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    BeforeValue NVARCHAR(MAX), -- JSON snapshot before change
    AfterValue NVARCHAR(MAX), -- JSON snapshot after change
    IpAddress NVARCHAR(50),
    UserAgent NVARCHAR(500),
    
    -- Indexes
    INDEX IX_AuditLog_EntityType_EntityId (EntityType, EntityId),
    INDEX IX_AuditLog_UserId (UserId),
    INDEX IX_AuditLog_Timestamp (Timestamp DESC),
    INDEX IX_AuditLog_EventId (EventId)
);

-- ============================================================================
-- Computed Column Functions
-- ============================================================================

-- Update checklist progress (call after item changes)
GO
CREATE OR ALTER PROCEDURE UpdateChecklistProgress
    @ChecklistInstanceId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @TotalItems INT;
    DECLARE @CompletedItems INT;
    DECLARE @RequiredItems INT;
    DECLARE @RequiredCompleted INT;
    DECLARE @ProgressPercentage DECIMAL(5,2);
    
    -- Count total items
    SELECT @TotalItems = COUNT(*)
    FROM ChecklistItems
    WHERE ChecklistInstanceId = @ChecklistInstanceId;
    
    -- Count completed items (checkbox OR status dropdown with countsAsComplete)
    SELECT @CompletedItems = COUNT(*)
    FROM ChecklistItems
    WHERE ChecklistInstanceId = @ChecklistInstanceId
        AND (
            (ItemType = 'checkbox' AND IsCompleted = 1)
            OR (ItemType = 'status_dropdown' AND CurrentStatus IN 
                (SELECT value FROM OPENJSON(StatusOptions) 
                 WHERE JSON_VALUE(value, '$.countsAsComplete') = 'true'))
        );
    
    -- Count required items
    SELECT @RequiredItems = COUNT(*)
    FROM ChecklistItems
    WHERE ChecklistInstanceId = @ChecklistInstanceId
        AND IsRequired = 1;
    
    -- Count completed required items
    SELECT @RequiredCompleted = COUNT(*)
    FROM ChecklistItems
    WHERE ChecklistInstanceId = @ChecklistInstanceId
        AND IsRequired = 1
        AND (
            (ItemType = 'checkbox' AND IsCompleted = 1)
            OR (ItemType = 'status_dropdown' AND CurrentStatus IN 
                (SELECT value FROM OPENJSON(StatusOptions) 
                 WHERE JSON_VALUE(value, '$.countsAsComplete') = 'true'))
        );
    
    -- Calculate percentage
    IF @TotalItems > 0
        SET @ProgressPercentage = CAST(@CompletedItems AS DECIMAL(5,2)) / @TotalItems * 100;
    ELSE
        SET @ProgressPercentage = 0;
    
    -- Update checklist instance
    UPDATE ChecklistInstances
    SET TotalItems = @TotalItems,
        CompletedItems = @CompletedItems,
        RequiredItems = @RequiredItems,
        RequiredItemsCompleted = @RequiredCompleted,
        ProgressPercentage = @ProgressPercentage,
        LastModifiedAt = GETUTCDATE()
    WHERE Id = @ChecklistInstanceId;
END;
GO

-- ============================================================================
-- Audit Logging Procedure
-- ============================================================================
CREATE OR ALTER PROCEDURE LogAuditEvent
    @EntityType NVARCHAR(50),
    @EntityId UNIQUEIDENTIFIER,
    @ActionType NVARCHAR(50),
    @UserId NVARCHAR(200),
    @UserPosition NVARCHAR(100),
    @EventId NVARCHAR(50) = NULL,
    @BeforeValue NVARCHAR(MAX) = NULL,
    @AfterValue NVARCHAR(MAX) = NULL,
    @IpAddress NVARCHAR(50) = NULL,
    @UserAgent NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    INSERT INTO AuditLog (
        EntityType, EntityId, ActionType, UserId, UserPosition,
        EventId, BeforeValue, AfterValue, IpAddress, UserAgent, Timestamp
    )
    VALUES (
        @EntityType, @EntityId, @ActionType, @UserId, @UserPosition,
        @EventId, @BeforeValue, @AfterValue, @IpAddress, @UserAgent, GETUTCDATE()
    );
END;
GO

-- ============================================================================
-- Sample Views for Reporting
-- ============================================================================

-- View: Active checklists with progress
CREATE OR ALTER VIEW vw_ActiveChecklists AS
SELECT 
    ci.Id,
    ci.Name,
    ci.EventName,
    ci.OperationalPeriodName,
    ci.ProgressPercentage,
    ci.CompletedItems,
    ci.TotalItems,
    ci.RequiredItemsCompleted,
    ci.RequiredItems,
    ci.AssignedPositions,
    ci.CreatedBy,
    ci.CreatedByPosition,
    ci.CreatedAt,
    ci.LastModifiedAt,
    t.Name AS TemplateName,
    t.Category AS TemplateCategory
FROM ChecklistInstances ci
INNER JOIN Templates t ON ci.TemplateId = t.Id
WHERE ci.IsArchived = 0;
GO

-- View: Recently modified items (last 30 minutes)
CREATE OR ALTER VIEW vw_RecentlyModifiedItems AS
SELECT 
    ci.Id AS ChecklistId,
    ci.Name AS ChecklistName,
    i.Id AS ItemId,
    i.ItemText,
    i.ItemType,
    i.IsCompleted,
    i.CurrentStatus,
    i.LastModifiedBy,
    i.LastModifiedByPosition,
    i.LastModifiedAt
FROM ChecklistItems i
INNER JOIN ChecklistInstances ci ON i.ChecklistInstanceId = ci.Id
WHERE i.LastModifiedAt >= DATEADD(MINUTE, -30, GETUTCDATE())
    AND ci.IsArchived = 0;
GO

-- ============================================================================
-- Grant Permissions (adjust for your environment)
-- ============================================================================
-- For POC, using db_owner. In production, use more restrictive roles.
-- GRANT SELECT, INSERT, UPDATE, DELETE ON SCHEMA::dbo TO ChecklistAppUser;
-- GRANT EXECUTE ON SCHEMA::dbo TO ChecklistAppUser;

PRINT 'Database schema created successfully!';
PRINT 'Run seed-data.sql next to populate sample templates and mock data.';
