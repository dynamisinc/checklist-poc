# PowerShell script to update App Service connection string
# Run this after creating the SQL user

$resourceGroup = "c5-poc-eastus2-rg"
$appName = "checklist-poc-app"
$connectionString = "Server=tcp:sql-c5seeder-eastus2.database.windows.net,1433;Initial Catalog=ChecklistPOC;User ID=checklistapp;Password=ChecklistApp2025!;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;"

Write-Host "Updating connection string for $appName..." -ForegroundColor Yellow

# Use Azure PowerShell to set connection string
az webapp config connection-string delete `
    --resource-group $resourceGroup `
    --name $appName `
    --setting-names DefaultConnection

az webapp config connection-string set `
    --resource-group $resourceGroup `
    --name $appName `
    --connection-string-type SQLAzure `
    --settings "DefaultConnection=$connectionString"

Write-Host "Connection string updated successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Restarting app..." -ForegroundColor Yellow
az webapp restart --resource-group $resourceGroup --name $appName

Write-Host "Done! Test the API:" -ForegroundColor Green
Write-Host "  https://checklist-poc-app.azurewebsites.net/api/templates" -ForegroundColor White
