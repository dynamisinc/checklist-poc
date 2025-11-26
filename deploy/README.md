# Deployment Resources

This folder contains all deployment-related scripts and configuration for the Checklist POC.

## Folder Structure

```
deploy/
├── azure-config.json          # Azure resource configuration
├── azure-config.schema.json   # JSON schema for config validation
├── scripts/
│   ├── deploy.ps1                        # Main deployment script
│   ├── deploy-to-azure.ps1               # Alternative Azure deployment
│   ├── setup-azure-resources.ps1         # Create new Azure resources
│   └── setup-azure-resources-existing-sql.ps1  # Use existing SQL server
└── sql/
    ├── recreate-sql-user.sql      # Create/recreate SQL auth user
    ├── setup-sql-auth-secure.sql  # SQL auth user setup
    └── setup-sql-entra-access.sql # Entra ID (AAD) access setup
```

## Quick Start

1. **First-time setup with existing SQL Server:**
   ```powershell
   ./deploy/scripts/setup-azure-resources-existing-sql.ps1
   ```

2. **Deploy application:**
   ```powershell
   ./deploy/scripts/deploy.ps1
   ```

3. **Set up SQL authentication:**
   - Run `deploy/sql/recreate-sql-user.sql` in Azure SQL Query Editor

## Current Deployment

- **App Service:** https://checklist-poc-app.azurewebsites.net
- **Resource Group:** c5-poc-eastus2-rg
- **SQL Server:** sql-c5seeder-eastus2.database.windows.net
- **Database:** ChecklistPOC

## Documentation

See `/docs/` folder for detailed guides:
- `AZURE_DEPLOYMENT.md` - Full deployment guide
- `DEPLOYMENT_QUICK_START.md` - Quick start guide
- `DEPLOYMENT_EXISTING_SQL.md` - Using existing SQL server
- `DEPLOYMENT_WORKFLOWS.md` - CI/CD workflows
