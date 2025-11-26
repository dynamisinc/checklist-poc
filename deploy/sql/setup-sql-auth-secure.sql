-- SQL Script to create traditional SQL authentication user for ChecklistPOC database
-- Run this in Azure SQL Query Editor as the Entra ID admin
-- Generated: 2025-11-25

USE [ChecklistPOC];
GO

-- Create SQL user with strong password
CREATE USER [checklistapp] WITH PASSWORD = 'iNV6DMls!@Y6OoMo';
GO

-- Grant necessary permissions for EF Core migrations
ALTER ROLE db_datareader ADD MEMBER [checklistapp];
ALTER ROLE db_datawriter ADD MEMBER [checklistapp];
ALTER ROLE db_ddladmin ADD MEMBER [checklistapp];
GRANT CREATE TABLE TO [checklistapp];
GRANT ALTER ON SCHEMA::dbo TO [checklistapp];
GO

SELECT 'SQL User created successfully' AS Result;
GO
