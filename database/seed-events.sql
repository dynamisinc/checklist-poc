-- ============================================================================
-- Checklist POC - Seed Data for Events and Event Categories
-- ============================================================================
-- Creates base event categories and sample events needed for checklists.
--
-- Based on: docs/references/EventCategories_Focused_List.md
-- Sources: FEMA Disaster Declaration Summaries, THIRA/SPR Guide CPG 201,
--          ICS/NIMS Incident Complexity Guide, HSEEP
--
-- IMPORTANT: Run this file FIRST before seed-checklists.sql and
-- seed-operational-periods.sql
-- ============================================================================

USE COBRAPOC;
SET QUOTED_IDENTIFIER ON;
GO

-- Clear existing event data if re-running
DELETE FROM Events;
DELETE FROM EventCategories;
GO

-- ============================================================================
-- Event Categories - 49 Categories from Focused List
-- ============================================================================

-- ============================================================================
-- UNPLANNED: Natural Disasters - Weather (8 categories)
-- ============================================================================
DECLARE @HurricaneId UNIQUEIDENTIFIER = '11111111-1111-1111-1111-111111111001';
DECLARE @TornadoId UNIQUEIDENTIFIER = '11111111-1111-1111-1111-111111111002';
DECLARE @SevereStormId UNIQUEIDENTIFIER = '11111111-1111-1111-1111-111111111003';
DECLARE @WinterStormId UNIQUEIDENTIFIER = '11111111-1111-1111-1111-111111111004';
DECLARE @IceStormId UNIQUEIDENTIFIER = '11111111-1111-1111-1111-111111111005';
DECLARE @ExtremeHeatId UNIQUEIDENTIFIER = '11111111-1111-1111-1111-111111111006';
DECLARE @ExtremeColdId UNIQUEIDENTIFIER = '11111111-1111-1111-1111-111111111007';
DECLARE @HighWindId UNIQUEIDENTIFIER = '11111111-1111-1111-1111-111111111008';

-- ============================================================================
-- UNPLANNED: Natural Disasters - Geological (4 categories)
-- ============================================================================
DECLARE @EarthquakeId UNIQUEIDENTIFIER = '11111111-1111-1111-1111-111111111010';
DECLARE @TsunamiId UNIQUEIDENTIFIER = '11111111-1111-1111-1111-111111111011';
DECLARE @VolcanoId UNIQUEIDENTIFIER = '11111111-1111-1111-1111-111111111012';
DECLARE @LandslideId UNIQUEIDENTIFIER = '11111111-1111-1111-1111-111111111013';

-- ============================================================================
-- UNPLANNED: Natural Disasters - Hydrological (3 categories)
-- ============================================================================
DECLARE @FloodId UNIQUEIDENTIFIER = '11111111-1111-1111-1111-111111111020';
DECLARE @FlashFloodId UNIQUEIDENTIFIER = '11111111-1111-1111-1111-111111111021';
DECLARE @DroughtId UNIQUEIDENTIFIER = '11111111-1111-1111-1111-111111111022';

-- ============================================================================
-- Natural Disasters - Wildfire (2 categories - 1 Planned, 1 Unplanned)
-- ============================================================================
DECLARE @WildfireId UNIQUEIDENTIFIER = '11111111-1111-1111-1111-111111111030';
DECLARE @PrescribedBurnId UNIQUEIDENTIFIER = '11111111-1111-1111-1111-111111111031';

-- ============================================================================
-- UNPLANNED: Technological Hazards (4 categories)
-- ============================================================================
DECLARE @HazmatId UNIQUEIDENTIFIER = '11111111-1111-1111-1111-111111111040';
DECLARE @NuclearId UNIQUEIDENTIFIER = '11111111-1111-1111-1111-111111111041';
DECLARE @ChemicalId UNIQUEIDENTIFIER = '11111111-1111-1111-1111-111111111042';
DECLARE @GasLeakId UNIQUEIDENTIFIER = '11111111-1111-1111-1111-111111111043';

-- ============================================================================
-- UNPLANNED: Infrastructure Failures (4 categories)
-- ============================================================================
DECLARE @PowerOutageId UNIQUEIDENTIFIER = '11111111-1111-1111-1111-111111111050';
DECLARE @DamFailureId UNIQUEIDENTIFIER = '11111111-1111-1111-1111-111111111051';
DECLARE @BuildingCollapseId UNIQUEIDENTIFIER = '11111111-1111-1111-1111-111111111052';
DECLARE @WaterSystemId UNIQUEIDENTIFIER = '11111111-1111-1111-1111-111111111053';

-- ============================================================================
-- UNPLANNED: Public Health (4 categories)
-- ============================================================================
DECLARE @PandemicId UNIQUEIDENTIFIER = '11111111-1111-1111-1111-111111111060';
DECLARE @DiseaseOutbreakId UNIQUEIDENTIFIER = '11111111-1111-1111-1111-111111111061';
DECLARE @MassCasualtyId UNIQUEIDENTIFIER = '11111111-1111-1111-1111-111111111062';
DECLARE @FoodContaminationId UNIQUEIDENTIFIER = '11111111-1111-1111-1111-111111111063';

-- ============================================================================
-- UNPLANNED: Civil / Security (5 categories)
-- ============================================================================
DECLARE @TerrorismId UNIQUEIDENTIFIER = '11111111-1111-1111-1111-111111111070';
DECLARE @ActiveShooterId UNIQUEIDENTIFIER = '11111111-1111-1111-1111-111111111071';
DECLARE @CivilUnrestId UNIQUEIDENTIFIER = '11111111-1111-1111-1111-111111111072';
DECLARE @BombThreatId UNIQUEIDENTIFIER = '11111111-1111-1111-1111-111111111073';
DECLARE @HostageId UNIQUEIDENTIFIER = '11111111-1111-1111-1111-111111111074';

-- ============================================================================
-- UNPLANNED: Cyber Incidents (2 categories)
-- ============================================================================
DECLARE @CyberAttackId UNIQUEIDENTIFIER = '11111111-1111-1111-1111-111111111080';
DECLARE @RansomwareId UNIQUEIDENTIFIER = '11111111-1111-1111-1111-111111111081';

-- ============================================================================
-- UNPLANNED: Transportation (4 categories)
-- ============================================================================
DECLARE @AviationId UNIQUEIDENTIFIER = '11111111-1111-1111-1111-111111111090';
DECLARE @RailId UNIQUEIDENTIFIER = '11111111-1111-1111-1111-111111111091';
DECLARE @MaritimeId UNIQUEIDENTIFIER = '11111111-1111-1111-1111-111111111092';
DECLARE @VehicleMCIId UNIQUEIDENTIFIER = '11111111-1111-1111-1111-111111111093';

-- ============================================================================
-- UNPLANNED: Search and Rescue (2 categories)
-- ============================================================================
DECLARE @SARWildernessId UNIQUEIDENTIFIER = '11111111-1111-1111-1111-111111111100';
DECLARE @SARUrbanId UNIQUEIDENTIFIER = '11111111-1111-1111-1111-111111111101';

-- ============================================================================
-- PLANNED: Exercises (3 categories)
-- ============================================================================
DECLARE @TTXId UNIQUEIDENTIFIER = '11111111-1111-1111-1111-111111111110';
DECLARE @FuncExerciseId UNIQUEIDENTIFIER = '11111111-1111-1111-1111-111111111111';
DECLARE @FullScaleId UNIQUEIDENTIFIER = '11111111-1111-1111-1111-111111111112';

-- ============================================================================
-- PLANNED: Special Events (4 categories)
-- ============================================================================
DECLARE @MassGatheringId UNIQUEIDENTIFIER = '11111111-1111-1111-1111-111111111120';
DECLARE @SportingEventId UNIQUEIDENTIFIER = '11111111-1111-1111-1111-111111111121';
DECLARE @VIPVisitId UNIQUEIDENTIFIER = '11111111-1111-1111-1111-111111111122';
DECLARE @ParadeId UNIQUEIDENTIFIER = '11111111-1111-1111-1111-111111111123';


INSERT INTO EventCategories (Id, Code, Name, EventType, SubGroup, DisplayOrder, IsActive, IconName)
VALUES
    -- ============================================================================
    -- UNPLANNED: Natural Disasters - Weather (8)
    -- ============================================================================
    (@HurricaneId, 'HURRICANE', 'Hurricane / Tropical Storm', 'Unplanned', 'Natural Disasters - Weather', 1, 1, 'fa-hurricane'),
    (@TornadoId, 'TORNADO', 'Tornado', 'Unplanned', 'Natural Disasters - Weather', 2, 1, 'fa-tornado'),
    (@SevereStormId, 'SEVERE_STORM', 'Severe Thunderstorm', 'Unplanned', 'Natural Disasters - Weather', 3, 1, 'fa-cloud-bolt'),
    (@WinterStormId, 'WINTER_STORM', 'Winter Storm / Blizzard', 'Unplanned', 'Natural Disasters - Weather', 4, 1, 'fa-snowflake'),
    (@IceStormId, 'ICE_STORM', 'Ice Storm', 'Unplanned', 'Natural Disasters - Weather', 5, 1, 'fa-icicles'),
    (@ExtremeHeatId, 'EXTREME_HEAT', 'Extreme Heat Event', 'Unplanned', 'Natural Disasters - Weather', 6, 1, 'fa-temperature-high'),
    (@ExtremeColdId, 'EXTREME_COLD', 'Extreme Cold Event', 'Unplanned', 'Natural Disasters - Weather', 7, 1, 'fa-temperature-low'),
    (@HighWindId, 'HIGH_WIND', 'High Wind Event', 'Unplanned', 'Natural Disasters - Weather', 8, 1, 'fa-wind'),

    -- ============================================================================
    -- UNPLANNED: Natural Disasters - Geological (4)
    -- ============================================================================
    (@EarthquakeId, 'EARTHQUAKE', 'Earthquake', 'Unplanned', 'Natural Disasters - Geological', 10, 1, 'fa-house-crack'),
    (@TsunamiId, 'TSUNAMI', 'Tsunami', 'Unplanned', 'Natural Disasters - Geological', 11, 1, 'fa-water'),
    (@VolcanoId, 'VOLCANO', 'Volcanic Eruption', 'Unplanned', 'Natural Disasters - Geological', 12, 1, 'fa-volcano'),
    (@LandslideId, 'LANDSLIDE', 'Landslide / Mudslide', 'Unplanned', 'Natural Disasters - Geological', 13, 1, 'fa-hill-rockslide'),

    -- ============================================================================
    -- UNPLANNED: Natural Disasters - Hydrological (3)
    -- ============================================================================
    (@FloodId, 'FLOOD', 'Flood', 'Unplanned', 'Natural Disasters - Hydrological', 20, 1, 'fa-house-flood-water'),
    (@FlashFloodId, 'FLASH_FLOOD', 'Flash Flood', 'Unplanned', 'Natural Disasters - Hydrological', 21, 1, 'fa-water'),
    (@DroughtId, 'DROUGHT', 'Drought', 'Unplanned', 'Natural Disasters - Hydrological', 22, 1, 'fa-sun-plant-wilt'),

    -- ============================================================================
    -- Natural Disasters - Wildfire (2 - mixed Planned/Unplanned)
    -- ============================================================================
    (@WildfireId, 'WILDFIRE', 'Wildfire', 'Unplanned', 'Natural Disasters - Wildfire', 30, 1, 'fa-fire'),
    (@PrescribedBurnId, 'PRESCRIBED_BURN', 'Prescribed Burn', 'Planned', 'Natural Disasters - Wildfire', 31, 1, 'fa-fire-flame-simple'),

    -- ============================================================================
    -- UNPLANNED: Technological Hazards (4)
    -- ============================================================================
    (@HazmatId, 'HAZMAT', 'Hazardous Materials Release', 'Unplanned', 'Technological Hazards', 40, 1, 'fa-biohazard'),
    (@NuclearId, 'NUCLEAR', 'Nuclear / Radiological Incident', 'Unplanned', 'Technological Hazards', 41, 1, 'fa-radiation'),
    (@ChemicalId, 'CHEMICAL', 'Chemical Spill / Release', 'Unplanned', 'Technological Hazards', 42, 1, 'fa-flask-vial'),
    (@GasLeakId, 'GAS_LEAK', 'Natural Gas Leak / Explosion', 'Unplanned', 'Technological Hazards', 43, 1, 'fa-burst'),

    -- ============================================================================
    -- UNPLANNED: Infrastructure Failures (4)
    -- ============================================================================
    (@PowerOutageId, 'POWER_OUTAGE', 'Power Outage / Grid Failure', 'Unplanned', 'Infrastructure Failures', 50, 1, 'fa-plug-circle-xmark'),
    (@DamFailureId, 'DAM_FAILURE', 'Dam / Levee Failure', 'Unplanned', 'Infrastructure Failures', 51, 1, 'fa-water'),
    (@BuildingCollapseId, 'BUILDING_COLLAPSE', 'Building / Structure Collapse', 'Unplanned', 'Infrastructure Failures', 52, 1, 'fa-building-circle-xmark'),
    (@WaterSystemId, 'WATER_SYSTEM', 'Water System Failure', 'Unplanned', 'Infrastructure Failures', 53, 1, 'fa-faucet-drip'),

    -- ============================================================================
    -- UNPLANNED: Public Health (4)
    -- ============================================================================
    (@PandemicId, 'PANDEMIC', 'Pandemic / Epidemic', 'Unplanned', 'Public Health', 60, 1, 'fa-virus'),
    (@DiseaseOutbreakId, 'DISEASE_OUTBREAK', 'Disease Outbreak', 'Unplanned', 'Public Health', 61, 1, 'fa-viruses'),
    (@MassCasualtyId, 'MASS_CASUALTY', 'Mass Casualty Incident', 'Unplanned', 'Public Health', 62, 1, 'fa-truck-medical'),
    (@FoodContaminationId, 'FOOD_CONTAMINATION', 'Food / Water Contamination', 'Unplanned', 'Public Health', 63, 1, 'fa-utensils'),

    -- ============================================================================
    -- UNPLANNED: Civil / Security (5)
    -- ============================================================================
    (@TerrorismId, 'TERRORISM', 'Terrorist Attack', 'Unplanned', 'Civil / Security', 70, 1, 'fa-explosion'),
    (@ActiveShooterId, 'ACTIVE_SHOOTER', 'Active Shooter / Threat', 'Unplanned', 'Civil / Security', 71, 1, 'fa-crosshairs'),
    (@CivilUnrestId, 'CIVIL_UNREST', 'Civil Disturbance / Unrest', 'Unplanned', 'Civil / Security', 72, 1, 'fa-people-group'),
    (@BombThreatId, 'BOMB_THREAT', 'Bomb Threat / IED', 'Unplanned', 'Civil / Security', 73, 1, 'fa-bomb'),
    (@HostageId, 'HOSTAGE', 'Hostage / Barricade Situation', 'Unplanned', 'Civil / Security', 74, 1, 'fa-handcuffs'),

    -- ============================================================================
    -- UNPLANNED: Cyber Incidents (2)
    -- ============================================================================
    (@CyberAttackId, 'CYBER_ATTACK', 'Cyber Attack / Data Breach', 'Unplanned', 'Cyber Incidents', 80, 1, 'fa-shield-virus'),
    (@RansomwareId, 'RANSOMWARE', 'Ransomware Attack', 'Unplanned', 'Cyber Incidents', 81, 1, 'fa-lock'),

    -- ============================================================================
    -- UNPLANNED: Transportation (4)
    -- ============================================================================
    (@AviationId, 'AVIATION', 'Aviation Incident', 'Unplanned', 'Transportation', 90, 1, 'fa-plane-slash'),
    (@RailId, 'RAIL', 'Rail Incident', 'Unplanned', 'Transportation', 91, 1, 'fa-train'),
    (@MaritimeId, 'MARITIME', 'Maritime Incident', 'Unplanned', 'Transportation', 92, 1, 'fa-ship'),
    (@VehicleMCIId, 'VEHICLE_MCI', 'Vehicle Mass Casualty Incident', 'Unplanned', 'Transportation', 93, 1, 'fa-car-burst'),

    -- ============================================================================
    -- UNPLANNED: Search and Rescue (2)
    -- ============================================================================
    (@SARWildernessId, 'SAR_WILDERNESS', 'Wilderness Search and Rescue', 'Unplanned', 'Search and Rescue', 100, 1, 'fa-person-hiking'),
    (@SARUrbanId, 'SAR_URBAN', 'Urban Search and Rescue', 'Unplanned', 'Search and Rescue', 101, 1, 'fa-magnifying-glass-location'),

    -- ============================================================================
    -- PLANNED: Exercises (3)
    -- ============================================================================
    (@TTXId, 'TTX', 'Tabletop Exercise', 'Planned', 'Planned Events - Exercises', 110, 1, 'fa-users'),
    (@FuncExerciseId, 'FUNC_EXERCISE', 'Functional Exercise', 'Planned', 'Planned Events - Exercises', 111, 1, 'fa-clipboard-check'),
    (@FullScaleId, 'FULL_SCALE', 'Full-Scale Exercise', 'Planned', 'Planned Events - Exercises', 112, 1, 'fa-people-arrows'),

    -- ============================================================================
    -- PLANNED: Special Events (4)
    -- ============================================================================
    (@MassGatheringId, 'MASS_GATHERING', 'Mass Gathering / Concert / Festival', 'Planned', 'Planned Events - Special Events', 120, 1, 'fa-ticket'),
    (@SportingEventId, 'SPORTING_EVENT', 'Sporting Event', 'Planned', 'Planned Events - Special Events', 121, 1, 'fa-futbol'),
    (@VIPVisitId, 'VIP_VISIT', 'VIP / Dignitary Visit', 'Planned', 'Planned Events - Special Events', 122, 1, 'fa-user-tie'),
    (@ParadeId, 'PARADE', 'Parade / March', 'Planned', 'Planned Events - Special Events', 123, 1, 'fa-flag');

PRINT 'Created 49 event categories from Focused List';

-- ============================================================================
-- Events
-- ============================================================================
-- Sample events for POC demonstration

-- POC Demo Event - used by checklists and operational periods
DECLARE @DefaultEventId UNIQUEIDENTIFIER = '00000000-0000-0000-0000-000000000001';
DECLARE @HurricaneEventId UNIQUEIDENTIFIER = '22222222-2222-2222-2222-222222222002';
DECLARE @EarthquakeEventId UNIQUEIDENTIFIER = '22222222-2222-2222-2222-222222222003';
DECLARE @TrainingEventId UNIQUEIDENTIFIER = '22222222-2222-2222-2222-222222222004';
DECLARE @WildfireEventId UNIQUEIDENTIFIER = '22222222-2222-2222-2222-222222222005';

INSERT INTO Events (Id, Name, EventType, PrimaryCategoryId, AdditionalCategoryIds, IsActive, IsArchived, CreatedBy, CreatedAt)
VALUES
    -- Default POC Event (Unplanned - Hurricane for demo)
    (@DefaultEventId,
     'POC Demo Event',
     'Unplanned',
     @HurricaneId,
     NULL,
     1, 0,
     'system@cobra.mil',
     GETUTCDATE()),

    -- Active Hurricane event (Unplanned)
    (@HurricaneEventId,
     'Hurricane Milton Response - November 2025',
     'Unplanned',
     @HurricaneId,
     NULL,
     1, 0,
     'james.rodriguez@cobra.mil',
     DATEADD(DAY, -5, GETUTCDATE())),

    -- Active Wildfire event (Unplanned)
    (@WildfireEventId,
     'Wildfire - Northern Region',
     'Unplanned',
     @WildfireId,
     NULL,
     1, 0,
     'sarah.jackson@cobra.mil',
     DATEADD(DAY, -3, GETUTCDATE())),

    -- Training exercise event (Planned)
    (@TrainingEventId,
     'EOC Full-Scale Exercise 2025',
     'Planned',
     @FullScaleId,
     NULL,
     1, 0,
     'sarah.jackson@cobra.mil',
     DATEADD(DAY, -10, GETUTCDATE())),

    -- Archived earthquake event (Unplanned)
    (@EarthquakeEventId,
     'Earthquake Response - October 2025',
     'Unplanned',
     @EarthquakeId,
     NULL,
     0, 1,
     'maria.chen@cobra.mil',
     DATEADD(MONTH, -1, GETUTCDATE()));

PRINT 'Created 5 events';

-- ============================================================================
-- Output Event IDs for other seed scripts
-- ============================================================================
PRINT '';
PRINT '============================================================================';
PRINT 'Event Seed Data Summary';
PRINT '============================================================================';
PRINT '';
PRINT 'Event Categories by SubGroup:';

SELECT SubGroup, EventType, COUNT(*) AS CategoryCount
FROM EventCategories
WHERE IsActive = 1
GROUP BY SubGroup, EventType
ORDER BY SubGroup, EventType;

PRINT '';
PRINT 'Use these Event IDs in other seed scripts:';
PRINT '  Default POC Event:   ' + CAST(@DefaultEventId AS VARCHAR(50));
PRINT '  Hurricane Milton:    ' + CAST(@HurricaneEventId AS VARCHAR(50));
PRINT '  Wildfire:            ' + CAST(@WildfireEventId AS VARCHAR(50));
PRINT '  Training Exercise:   ' + CAST(@TrainingEventId AS VARCHAR(50));
PRINT '  Earthquake (archived): ' + CAST(@EarthquakeEventId AS VARCHAR(50));
PRINT '';

SELECT Id, Name, EventType, IsActive, IsArchived, CreatedBy
FROM Events
ORDER BY CreatedAt DESC;

PRINT '';
PRINT '============================================================================';
PRINT 'Event seed data loaded successfully!';
PRINT '============================================================================';

GO
