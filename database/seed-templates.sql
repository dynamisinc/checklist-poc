-- ============================================================================
-- Checklist POC - Seed Data for Templates
-- ============================================================================
-- Creates 3 sample templates for POC demonstration:
--   1. Daily Safety Briefing (7 checkbox items)
--   2. Incident Commander Initial Actions (12 mixed items)
--   3. Shelter Opening Checklist (15 items with status dropdowns)
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
    CreatedBy, CreatedByPosition, CreatedAt,
    RecommendedPositions, EventCategories, UsageCount, LastUsedAt
)
VALUES (
    @SafetyBriefingId,
    'Daily Safety Briefing',
    'Standardized safety briefing checklist to be conducted at the start of each operational period. Ensures all team members are aware of safety protocols and hazards.',
    'Safety',
    'daily, safety, briefing, operational period',
    1, 0,
    'admin@cobra.mil', 'Incident Commander', GETUTCDATE(),
    '["Safety Officer", "Incident Commander", "Operations Section Chief"]',
    '["All Hazards", "Hurricane", "Wildfire", "Flood", "Earthquake"]',
    42,
    DATEADD(DAY, -2, GETUTCDATE())
);

-- Safety Briefing Items (all checkbox type)
INSERT INTO TemplateItems (Id, TemplateId, ItemText, ItemType, DisplayOrder, IsRequired, StatusConfiguration, DefaultNotes, CreatedAt)
VALUES
    (NEWID(), @SafetyBriefingId, 'Review weather forecast and conditions for operational period', 'checkbox', 10, 0, NULL, 'Check NOAA weather radio and local forecasts', GETUTCDATE()),
    (NEWID(), @SafetyBriefingId, 'Identify and brief all known hazards in operational area', 'checkbox', 20, 0, NULL, 'Include environmental, structural, and operational hazards', GETUTCDATE()),
    (NEWID(), @SafetyBriefingId, 'Verify all personnel have required PPE and safety equipment', 'checkbox', 30, 0, NULL, 'Hard hats, safety vests, gloves, eye protection as needed', GETUTCDATE()),
    (NEWID(), @SafetyBriefingId, 'Confirm emergency communication procedures and radio channels', 'checkbox', 40, 0, NULL, 'Test radios and establish check-in intervals', GETUTCDATE()),
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
    CreatedBy, CreatedByPosition, CreatedAt,
    RecommendedPositions, EventCategories, UsageCount, LastUsedAt
)
VALUES (
    @ICInitialActionsId,
    'Incident Commander Initial Actions',
    'Critical actions for Incident Commanders during the first operational period of a new incident. Establishes command structure and operational priorities.',
    'ICS Forms',
    'incident commander, initial actions, ICS, command',
    1, 0,
    'admin@cobra.mil', 'Incident Commander', GETUTCDATE(),
    '["Incident Commander"]',
    '["All Hazards", "Hurricane", "Wildfire", "Flood", "Earthquake", "Tornado"]',
    156,
    DATEADD(DAY, -1, GETUTCDATE())
);

-- IC Initial Actions Items (mix of checkbox and status)
-- StatusConfiguration uses full StatusOption format: [{label, isCompletion, order}, ...]
INSERT INTO TemplateItems (Id, TemplateId, ItemText, ItemType, DisplayOrder, IsRequired, StatusConfiguration, DefaultNotes, CreatedAt)
VALUES
    (NEWID(), @ICInitialActionsId, 'Establish command and assume Incident Commander role', 'checkbox', 10, 0, NULL, 'Notify EOC and relevant authorities', GETUTCDATE()),
    (NEWID(), @ICInitialActionsId, 'Complete initial situation assessment', 'status', 20, 0, '[{"label":"Not Started","isCompletion":false,"order":1},{"label":"In Progress","isCompletion":false,"order":2},{"label":"Completed","isCompletion":true,"order":3},{"label":"Delayed","isCompletion":false,"order":4}]', 'Document findings in ICS 201', GETUTCDATE()),
    (NEWID(), @ICInitialActionsId, 'Determine incident priorities and strategic objectives', 'status', 30, 0, '[{"label":"Not Started","isCompletion":false,"order":1},{"label":"In Progress","isCompletion":false,"order":2},{"label":"Completed","isCompletion":true,"order":3}]', NULL, GETUTCDATE()),
    (NEWID(), @ICInitialActionsId, 'Establish Incident Command Post (ICP) location', 'checkbox', 40, 0, NULL, 'Ensure adequate space, communications, and safety', GETUTCDATE()),
    (NEWID(), @ICInitialActionsId, 'Request additional resources as needed', 'status', 50, 0, '[{"label":"Not Needed","isCompletion":true,"order":1},{"label":"Requested","isCompletion":false,"order":2},{"label":"En Route","isCompletion":false,"order":3},{"label":"On Scene","isCompletion":true,"order":4}]', 'Use ICS 213 for resource requests', GETUTCDATE()),
    (NEWID(), @ICInitialActionsId, 'Designate Safety Officer', 'checkbox', 60, 0, NULL, 'Brief on authority and responsibilities', GETUTCDATE()),
    (NEWID(), @ICInitialActionsId, 'Establish unified command if multi-jurisdictional', 'status', 70, 0, '[{"label":"N/A","isCompletion":true,"order":1},{"label":"Needed","isCompletion":false,"order":2},{"label":"In Progress","isCompletion":false,"order":3},{"label":"Established","isCompletion":true,"order":4}]', NULL, GETUTCDATE()),
    (NEWID(), @ICInitialActionsId, 'Determine operational period length', 'checkbox', 80, 0, NULL, 'Typically 12 or 24 hours for initial period', GETUTCDATE()),
    (NEWID(), @ICInitialActionsId, 'Initiate Incident Action Plan (IAP) development', 'status', 90, 0, '[{"label":"Not Started","isCompletion":false,"order":1},{"label":"In Progress","isCompletion":false,"order":2},{"label":"Completed","isCompletion":true,"order":3}]', 'Complete ICS 202, 203, 204 as minimum', GETUTCDATE()),
    (NEWID(), @ICInitialActionsId, 'Establish communication plan and radio frequencies', 'checkbox', 100, 0, NULL, 'Complete ICS 205', GETUTCDATE()),
    (NEWID(), @ICInitialActionsId, 'Conduct initial command and general staff meeting', 'checkbox', 110, 0, NULL, 'Brief on situation, objectives, and organization', GETUTCDATE()),
    (NEWID(), @ICInitialActionsId, 'Submit initial situation report to EOC/higher authority', 'status', 120, 0, '[{"label":"Not Started","isCompletion":false,"order":1},{"label":"In Progress","isCompletion":false,"order":2},{"label":"Submitted","isCompletion":true,"order":3},{"label":"Acknowledged","isCompletion":true,"order":4}]', 'Include ICS 201', GETUTCDATE());

-- ============================================================================
-- Template 3: Shelter Opening Checklist (Status-heavy for tracking)
-- ============================================================================
DECLARE @ShelterOpeningId UNIQUEIDENTIFIER = NEWID();

INSERT INTO Templates (
    Id, Name, Description, Category, Tags,
    IsActive, IsArchived,
    CreatedBy, CreatedByPosition, CreatedAt,
    RecommendedPositions, EventCategories, UsageCount, LastUsedAt
)
VALUES (
    @ShelterOpeningId,
    'Emergency Shelter Opening Checklist',
    'Comprehensive checklist for opening and activating an emergency shelter facility. Use this template when standing up a Red Cross shelter or county-managed evacuation center.',
    'Logistics',
    'shelter, evacuation, logistics, facility',
    1, 0,
    'admin@cobra.mil', 'Logistics Section Chief', GETUTCDATE(),
    '["Logistics Section Chief", "Shelter Manager"]',
    '["Hurricane", "Flood", "Wildfire", "Tornado", "Evacuation"]',
    89,
    DATEADD(DAY, -5, GETUTCDATE())
);

-- Shelter Opening Items (mostly status for detailed tracking)
-- StatusConfiguration uses full StatusOption format: [{label, isCompletion, order}, ...]
INSERT INTO TemplateItems (Id, TemplateId, ItemText, ItemType, DisplayOrder, IsRequired, StatusConfiguration, DefaultNotes, CreatedAt)
VALUES
    (NEWID(), @ShelterOpeningId, 'Complete facility safety inspection', 'status', 10, 0, '[{"label":"Not Started","isCompletion":false,"order":1},{"label":"In Progress","isCompletion":false,"order":2},{"label":"Completed","isCompletion":true,"order":3},{"label":"Failed - Do Not Occupy","isCompletion":false,"order":4}]', 'Check for structural damage, hazardous materials, utilities', GETUTCDATE()),
    (NEWID(), @ShelterOpeningId, 'Verify utilities are functional (power, water, HVAC)', 'status', 20, 0, '[{"label":"Not Verified","isCompletion":false,"order":1},{"label":"Partial","isCompletion":false,"order":2},{"label":"Fully Functional","isCompletion":true,"order":3},{"label":"Non-Functional","isCompletion":false,"order":4}]', NULL, GETUTCDATE()),
    (NEWID(), @ShelterOpeningId, 'Set up registration and intake area', 'status', 30, 0, '[{"label":"Not Started","isCompletion":false,"order":1},{"label":"In Progress","isCompletion":false,"order":2},{"label":"Complete","isCompletion":true,"order":3}]', 'Tables, chairs, forms, computers if available', GETUTCDATE()),
    (NEWID(), @ShelterOpeningId, 'Establish dormitory areas and sleeping arrangements', 'status', 40, 0, '[{"label":"Not Started","isCompletion":false,"order":1},{"label":"In Progress","isCompletion":false,"order":2},{"label":"Complete","isCompletion":true,"order":3}]', 'Separate areas for families, singles, accessible needs', GETUTCDATE()),
    (NEWID(), @ShelterOpeningId, 'Stock supplies (cots, blankets, hygiene kits, water)', 'status', 50, 0, '[{"label":"Not Started","isCompletion":false,"order":1},{"label":"Partial","isCompletion":false,"order":2},{"label":"Fully Stocked","isCompletion":true,"order":3}]', 'Minimum 3-day supply for expected capacity', GETUTCDATE()),
    (NEWID(), @ShelterOpeningId, 'Set up feeding operations and food service area', 'status', 60, 0, '[{"label":"Not Started","isCompletion":false,"order":1},{"label":"In Progress","isCompletion":false,"order":2},{"label":"Operational","isCompletion":true,"order":3}]', 'Coordinate with Red Cross or food vendor', GETUTCDATE()),
    (NEWID(), @ShelterOpeningId, 'Establish medical area and first aid station', 'status', 70, 0, '[{"label":"Not Started","isCompletion":false,"order":1},{"label":"Set Up","isCompletion":false,"order":2},{"label":"Staffed and Operational","isCompletion":true,"order":3}]', 'Stock first aid supplies, AED, medications storage', GETUTCDATE()),
    (NEWID(), @ShelterOpeningId, 'Post shelter rules and emergency procedures signage', 'checkbox', 80, 0, NULL, 'Include evacuation routes, rules, phone numbers', GETUTCDATE()),
    (NEWID(), @ShelterOpeningId, 'Test fire alarm and emergency systems', 'status', 90, 0, '[{"label":"Not Tested","isCompletion":false,"order":1},{"label":"Tested - Pass","isCompletion":true,"order":2},{"label":"Tested - Fail","isCompletion":false,"order":3}]', 'Document results and notify building owner if failed', GETUTCDATE()),
    (NEWID(), @ShelterOpeningId, 'Assign staff roles and brief all shelter workers', 'status', 100, 0, '[{"label":"Not Started","isCompletion":false,"order":1},{"label":"In Progress","isCompletion":false,"order":2},{"label":"Complete","isCompletion":true,"order":3}]', 'Shelter manager, registration, dormitory, feeding, security', GETUTCDATE()),
    (NEWID(), @ShelterOpeningId, 'Activate communications (phones, internet, radio)', 'status', 110, 0, '[{"label":"Not Started","isCompletion":false,"order":1},{"label":"Partial","isCompletion":false,"order":2},{"label":"Fully Operational","isCompletion":true,"order":3}]', 'Test all systems before declaring shelter open', GETUTCDATE()),
    (NEWID(), @ShelterOpeningId, 'Coordinate with law enforcement for security', 'status', 120, 0, '[{"label":"Not Needed","isCompletion":true,"order":1},{"label":"Requested","isCompletion":false,"order":2},{"label":"On Site","isCompletion":true,"order":3}]', 'May not be needed for small shelters', GETUTCDATE()),
    (NEWID(), @ShelterOpeningId, 'Set up childcare and activities area', 'status', 130, 0, '[{"label":"Not Needed","isCompletion":true,"order":1},{"label":"In Progress","isCompletion":false,"order":2},{"label":"Complete","isCompletion":true,"order":3}]', 'Toys, books, activities for children', GETUTCDATE()),
    (NEWID(), @ShelterOpeningId, 'Notify EOC and public that shelter is open', 'status', 140, 0, '[{"label":"Not Ready","isCompletion":false,"order":1},{"label":"Ready","isCompletion":false,"order":2},{"label":"Notification Sent","isCompletion":true,"order":3}]', 'Provide address, capacity, accessible status', GETUTCDATE()),
    (NEWID(), @ShelterOpeningId, 'Begin accepting evacuees and documenting intake', 'status', 150, 0, '[{"label":"Not Started","isCompletion":false,"order":1},{"label":"Accepting Evacuees","isCompletion":true,"order":2}]', 'Track numbers for situation reports', GETUTCDATE());

GO

-- ============================================================================
-- Verification Query
-- ============================================================================
SELECT
    t.Name AS TemplateName,
    t.Category,
    COUNT(ti.Id) AS ItemCount,
    SUM(CASE WHEN ti.ItemType = 'checkbox' THEN 1 ELSE 0 END) AS CheckboxItems,
    SUM(CASE WHEN ti.ItemType = 'status' THEN 1 ELSE 0 END) AS StatusItems
FROM Templates t
LEFT JOIN TemplateItems ti ON t.Id = ti.TemplateId
GROUP BY t.Name, t.Category
ORDER BY t.Category, t.Name;

PRINT 'Seed data loaded successfully!';
PRINT 'Templates created:';
PRINT '  1. Daily Safety Briefing (7 checkbox items)';
PRINT '  2. Incident Commander Initial Actions (12 mixed items)';
PRINT '  3. Emergency Shelter Opening Checklist (15 status items)';
