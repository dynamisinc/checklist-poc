-- ============================================================================
-- Checklist POC - Updated Seed Data with JSON Status Configuration
-- ============================================================================
-- Creates 3 sample templates with NEW StatusOption JSON format
-- ============================================================================

USE ChecklistPOC;
GO

-- Clear existing seed data if re-running
DELETE FROM TemplateItems;
DELETE FROM Templates;
GO

-- ============================================================================
-- Template 1: Daily Safety Briefing (Simple checkbox list)
-- ============================================================================
DECLARE @SafetyBriefingId UNIQUEIDENTIFIER = NEWID();

INSERT INTO Templates (
    Id, Name, Description, Category, Tags,
    IsActive, IsArchived,
    CreatedBy, CreatedByPosition, CreatedAt
)
VALUES (
    @SafetyBriefingId,
    'Daily Safety Briefing',
    'Standardized safety briefing checklist to be conducted at the start of each operational period. Ensures all team members are aware of safety protocols and hazards.',
    'Safety',
    'daily, safety, briefing, operational period',
    1, 0,
    'admin@cobra.mil', 'Incident Commander', GETUTCDATE()
);

-- Safety Briefing Items (all checkbox type)
INSERT INTO TemplateItems (Id, TemplateId, ItemText, ItemType, DisplayOrder, IsRequired, StatusConfiguration, DefaultNotes, CreatedAt)
VALUES
    (NEWID(), @SafetyBriefingId, 'Review weather forecast and conditions for operational period', 'checkbox', 10, 0, NULL, 'Check NOAA weather radio and local forecasts', GETUTCDATE()),
    (NEWID(), @SafetyBriefingId, 'Identify and brief all known hazards in operational area', 'checkbox', 20, 1, NULL, 'Include environmental, structural, and operational hazards', GETUTCDATE()),
    (NEWID(), @SafetyBriefingId, 'Verify all personnel have required PPE and safety equipment', 'checkbox', 30, 1, NULL, 'Hard hats, safety vests, gloves, eye protection as needed', GETUTCDATE()),
    (NEWID(), @SafetyBriefingId, 'Confirm emergency communication procedures and radio channels', 'checkbox', 40, 1, NULL, 'Test radios and establish check-in intervals', GETUTCDATE()),
    (NEWID(), @SafetyBriefingId, 'Review evacuation routes and accountability procedures', 'checkbox', 50, 0, NULL, 'Designate assembly areas and accountability managers', GETUTCDATE()),
    (NEWID(), @SafetyBriefingId, 'Brief medical emergency procedures and first aid locations', 'checkbox', 60, 0, NULL, 'Identify nearest medical facilities and trauma centers', GETUTCDATE()),
    (NEWID(), @SafetyBriefingId, 'Document safety briefing attendance and any concerns raised', 'checkbox', 70, 0, NULL, 'All personnel must sign attendance roster', GETUTCDATE());

-- ============================================================================
-- Template 2: Incident Commander Initial Actions (Mixed item types)
-- ============================================================================
DECLARE @ICInitialActionsId UNIQUEIDENTIFIER = NEWID();

INSERT INTO Templates (
    Id, Name, Description, Category, Tags,
    IsActive, IsArchived,
    CreatedBy, CreatedByPosition, CreatedAt
)
VALUES (
    @ICInitialActionsId,
    'Incident Commander Initial Actions',
    'Critical actions for Incident Commanders during the first operational period of a new incident. Establishes command structure and operational priorities.',
    'ICS Forms',
    'incident commander, initial actions, ICS, command',
    1, 0,
    'admin@cobra.mil', 'Incident Commander', GETUTCDATE()
);

-- IC Initial Actions Items (mix of checkbox and status) - NEW JSON FORMAT
INSERT INTO TemplateItems (Id, TemplateId, ItemText, ItemType, DisplayOrder, IsRequired, StatusConfiguration, DefaultNotes, CreatedAt)
VALUES
    (NEWID(), @ICInitialActionsId, 'Establish command and assume Incident Commander role', 'checkbox', 10, 1, NULL, 'Notify EOC and relevant authorities', GETUTCDATE()),

    (NEWID(), @ICInitialActionsId, 'Complete initial situation assessment', 'status', 20, 1,
     '[{"label":"Not Started","isCompletion":false,"order":1},{"label":"In Progress","isCompletion":false,"order":2},{"label":"Completed","isCompletion":true,"order":3},{"label":"Delayed","isCompletion":false,"order":4}]',
     'Document findings in ICS 201', GETUTCDATE()),

    (NEWID(), @ICInitialActionsId, 'Determine incident priorities and strategic objectives', 'status', 30, 1,
     '[{"label":"Not Started","isCompletion":false,"order":1},{"label":"In Progress","isCompletion":false,"order":2},{"label":"Completed","isCompletion":true,"order":3}]',
     NULL, GETUTCDATE()),

    (NEWID(), @ICInitialActionsId, 'Establish Incident Command Post (ICP) location', 'checkbox', 40, 1, NULL, 'Ensure adequate space, communications, and safety', GETUTCDATE()),

    (NEWID(), @ICInitialActionsId, 'Request additional resources as needed', 'status', 50, 0,
     '[{"label":"Not Needed","isCompletion":true,"order":1},{"label":"Requested","isCompletion":false,"order":2},{"label":"En Route","isCompletion":false,"order":3},{"label":"On Scene","isCompletion":true,"order":4}]',
     'Use ICS 213 for resource requests', GETUTCDATE()),

    (NEWID(), @ICInitialActionsId, 'Designate Safety Officer', 'checkbox', 60, 1, NULL, 'Brief on authority and responsibilities', GETUTCDATE()),

    (NEWID(), @ICInitialActionsId, 'Establish unified command if multi-jurisdictional', 'status', 70, 0,
     '[{"label":"N/A","isCompletion":true,"order":1},{"label":"Needed","isCompletion":false,"order":2},{"label":"In Progress","isCompletion":false,"order":3},{"label":"Established","isCompletion":true,"order":4}]',
     NULL, GETUTCDATE()),

    (NEWID(), @ICInitialActionsId, 'Determine operational period length', 'checkbox', 80, 0, NULL, 'Typically 12 or 24 hours for initial period', GETUTCDATE()),

    (NEWID(), @ICInitialActionsId, 'Initiate Incident Action Plan (IAP) development', 'status', 90, 1,
     '[{"label":"Not Started","isCompletion":false,"order":1},{"label":"In Progress","isCompletion":false,"order":2},{"label":"Completed","isCompletion":true,"order":3}]',
     'Complete ICS 202, 203, 204 as minimum', GETUTCDATE()),

    (NEWID(), @ICInitialActionsId, 'Establish communication plan and radio frequencies', 'checkbox', 100, 1, NULL, 'Complete ICS 205', GETUTCDATE()),

    (NEWID(), @ICInitialActionsId, 'Conduct initial command and general staff meeting', 'checkbox', 110, 0, NULL, 'Brief on situation, objectives, and organization', GETUTCDATE()),

    (NEWID(), @ICInitialActionsId, 'Submit initial situation report to EOC/higher authority', 'status', 120, 1,
     '[{"label":"Not Started","isCompletion":false,"order":1},{"label":"In Progress","isCompletion":false,"order":2},{"label":"Submitted","isCompletion":false,"order":3},{"label":"Acknowledged","isCompletion":true,"order":4}]',
     'Include ICS 201', GETUTCDATE());

-- ============================================================================
-- Template 3: Emergency Shelter Opening Checklist (Status-heavy)
-- ============================================================================
DECLARE @ShelterOpeningId UNIQUEIDENTIFIER = NEWID();

INSERT INTO Templates (
    Id, Name, Description, Category, Tags,
    IsActive, IsArchived,
    CreatedBy, CreatedByPosition, CreatedAt
)
VALUES (
    @ShelterOpeningId,
    'Emergency Shelter Opening Checklist',
    'Comprehensive checklist for opening and activating an emergency shelter facility. Use this template when standing up a Red Cross shelter or county-managed evacuation center.',
    'Logistics',
    'shelter, evacuation, logistics, facility',
    1, 0,
    'admin@cobra.mil', 'Logistics Section Chief', GETUTCDATE()
);

-- Shelter Opening Items (status-heavy for granular tracking) - NEW JSON FORMAT
INSERT INTO TemplateItems (Id, TemplateId, ItemText, ItemType, DisplayOrder, IsRequired, StatusConfiguration, DefaultNotes, CreatedAt)
VALUES
    (NEWID(), @ShelterOpeningId, 'Facility inspection and safety assessment', 'status', 10, 1,
     '[{"label":"Not Started","isCompletion":false,"order":1},{"label":"In Progress","isCompletion":false,"order":2},{"label":"Passed","isCompletion":true,"order":3},{"label":"Failed","isCompletion":false,"order":4}]',
     'Check structural integrity, fire systems, exits', GETUTCDATE()),

    (NEWID(), @ShelterOpeningId, 'Utilities verification (power, water, HVAC)', 'status', 20, 1,
     '[{"label":"Not Checked","isCompletion":false,"order":1},{"label":"Checking","isCompletion":false,"order":2},{"label":"All Operational","isCompletion":true,"order":3},{"label":"Partial","isCompletion":false,"order":4}]',
     'Contact facility manager if issues', GETUTCDATE()),

    (NEWID(), @ShelterOpeningId, 'Set up registration and intake area', 'status', 30, 1,
     '[{"label":"Not Started","isCompletion":false,"order":1},{"label":"In Progress","isCompletion":false,"order":2},{"label":"Complete","isCompletion":true,"order":3}]',
     'Tables, forms, laptops, signage', GETUTCDATE()),

    (NEWID(), @ShelterOpeningId, 'Establish sleeping areas and cot setup', 'status', 40, 1,
     '[{"label":"Not Started","isCompletion":false,"order":1},{"label":"Setting Up","isCompletion":false,"order":2},{"label":"Complete","isCompletion":true,"order":3}]',
     'Maintain 3ft spacing per ARC standards', GETUTCDATE()),

    (NEWID(), @ShelterOpeningId, 'Food service area preparation', 'status', 50, 1,
     '[{"label":"Not Started","isCompletion":false,"order":1},{"label":"In Progress","isCompletion":false,"order":2},{"label":"Ready","isCompletion":true,"order":3},{"label":"N/A","isCompletion":true,"order":4}]',
     'Coordinate with mass care lead', GETUTCDATE()),

    (NEWID(), @ShelterOpeningId, 'Medical/first aid station setup', 'status', 60, 1,
     '[{"label":"Not Started","isCompletion":false,"order":1},{"label":"In Progress","isCompletion":false,"order":2},{"label":"Staffed","isCompletion":true,"order":3}]',
     'Ensure medical supplies and trained personnel', GETUTCDATE()),

    (NEWID(), @ShelterOpeningId, 'Communications equipment test', 'checkbox', 70, 1, NULL, 'Radios, phones, internet, fax', GETUTCDATE()),

    (NEWID(), @ShelterOpeningId, 'Post emergency evacuation routes and safety signage', 'checkbox', 80, 1, NULL, 'Include accessible routes', GETUTCDATE()),

    (NEWID(), @ShelterOpeningId, 'Accessibility accommodations for individuals with disabilities', 'status', 90, 1,
     '[{"label":"Not Assessed","isCompletion":false,"order":1},{"label":"Assessing","isCompletion":false,"order":2},{"label":"Ready","isCompletion":true,"order":3}]',
     'ADA compliance required', GETUTCDATE()),

    (NEWID(), @ShelterOpeningId, 'Pet-friendly area setup (if applicable)', 'status', 100, 0,
     '[{"label":"N/A","isCompletion":true,"order":1},{"label":"Not Started","isCompletion":false,"order":2},{"label":"Ready","isCompletion":true,"order":3}]',
     'Separate from sleeping areas', GETUTCDATE()),

    (NEWID(), @ShelterOpeningId, 'Security and access control procedures', 'checkbox', 110, 1, NULL, 'Coordinate with law enforcement if needed', GETUTCDATE()),

    (NEWID(), @ShelterOpeningId, 'Staff briefing and role assignments', 'checkbox', 120, 1, NULL, 'Review shift schedules and responsibilities', GETUTCDATE()),

    (NEWID(), @ShelterOpeningId, 'Notify EOC and public information officer of shelter status', 'status', 130, 1,
     '[{"label":"Not Sent","isCompletion":false,"order":1},{"label":"Sent","isCompletion":false,"order":2},{"label":"Acknowledged","isCompletion":true,"order":3}]',
     'Include capacity and special accommodations', GETUTCDATE()),

    (NEWID(), @ShelterOpeningId, 'Open shelter doors and begin accepting evacuees', 'checkbox', 140, 1, NULL, 'Document opening time', GETUTCDATE()),

    (NEWID(), @ShelterOpeningId, 'Begin logging shelter population and resource usage', 'checkbox', 150, 1, NULL, 'Update EOC every 4 hours minimum', GETUTCDATE());

GO

PRINT 'Updated seed data with JSON status configuration loaded successfully!';
PRINT 'Templates created: 3';
PRINT '  - Daily Safety Briefing (7 items, all checkbox)';
PRINT '  - Incident Commander Initial Actions (12 items, mixed)';
PRINT '  - Emergency Shelter Opening Checklist (15 items, status-heavy)';
