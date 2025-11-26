-- SQL Script to recreate SQL authentication user for ChecklistPOC database
-- Run this in Azure SQL Query Editor as the Entra ID admin
-- Generated: 2025-11-25

USE [ChecklistPOC];
GO

-- Drop existing user if it exists
IF EXISTS (SELECT * FROM sys.database_principals WHERE name = 'checklistapp')
BEGIN
    DROP USER [checklistapp];
    PRINT 'Existing user dropped';
END
GO

-- Create SQL user with new password
CREATE USER [checklistapp] WITH PASSWORD = 'yCL7T7ibzAAD_2025#';
GO

-- Grant necessary permissions for EF Core migrations
ALTER ROLE db_datareader ADD MEMBER [checklistapp];
ALTER ROLE db_datawriter ADD MEMBER [checklistapp];
ALTER ROLE db_ddladmin ADD MEMBER [checklistapp];
GRANT CREATE TABLE TO [checklistapp];
GRANT ALTER ON SCHEMA::dbo TO [checklistapp];
GO

SELECT 'SQL User recreated successfully with new password' AS Result;
GO
