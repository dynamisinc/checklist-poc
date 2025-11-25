-- SQL Script to create traditional SQL authentication user for ChecklistPOC database
-- Run this in Azure SQL Query Editor as the Entra ID admin

USE [ChecklistPOC];
GO

-- Create SQL login (run in master database first if needed)
-- Then create user in ChecklistPOC database
CREATE USER [checklistapp] WITH PASSWORD = 'ChecklistApp2025!';
GO

-- Grant necessary permissions
ALTER ROLE db_datareader ADD MEMBER [checklistapp];
ALTER ROLE db_datawriter ADD MEMBER [checklistapp];
ALTER ROLE db_ddladmin ADD MEMBER [checklistapp];
GRANT CREATE TABLE TO [checklistapp];
GRANT ALTER ON SCHEMA::dbo TO [checklistapp];
GO

SELECT 'SQL User created successfully' AS Result;
GO
