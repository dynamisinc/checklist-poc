-- Grant Entra ID Managed Identity Access to SQL Database
-- Run this script while connected to ChecklistPOC database as Entra ID admin

-- Create a user for the managed identity
CREATE USER [checklist-poc-app] FROM EXTERNAL PROVIDER;

-- Grant necessary permissions for Entity Framework Core
ALTER ROLE db_datareader ADD MEMBER [checklist-poc-app];
ALTER ROLE db_datawriter ADD MEMBER [checklist-poc-app];
ALTER ROLE db_ddladmin ADD MEMBER [checklist-poc-app];

-- Grant additional permissions for migrations
GRANT CREATE TABLE TO [checklist-poc-app];
GRANT ALTER ON SCHEMA::dbo TO [checklist-poc-app];
GRANT EXECUTE TO [checklist-poc-app];
GRANT VIEW DEFINITION TO [checklist-poc-app];

-- Verify permissions
SELECT
    dp.name AS UserName,
    dp.type_desc AS UserType,
    r.name AS RoleName
FROM sys.database_principals dp
LEFT JOIN sys.database_role_members drm ON dp.principal_id = drm.member_principal_id
LEFT JOIN sys.database_principals r ON drm.role_principal_id = r.principal_id
WHERE dp.name = 'checklist-poc-app';
