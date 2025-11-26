# Azure Resources Setup Script
# Creates all necessary Azure resources for Checklist POC deployment

param(
    [Parameter(Mandatory=$true)]
    [string]$ResourceGroup,

    [Parameter(Mandatory=$true)]
    [string]$AppName,

    [Parameter(Mandatory=$true)]
    [string]$SqlServer,

    [Parameter(Mandatory=$true)]
    [string]$SqlDatabase,

    [Parameter(Mandatory=$true)]
    [string]$SqlAdminUser,

    [Parameter(Mandatory=$true)]
    [SecureString]$SqlAdminPassword,

    [string]$Location = "eastus",

    [ValidateSet("Linux", "Windows")]
    [string]$AppServiceOS = "Linux",

    [switch]$EnableApplicationInsights
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Azure Resources Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Convert SecureString password to plain text
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($SqlAdminPassword)
$SqlPasswordPlain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

# Step 1: Create Resource Group
Write-Host "[1/6] Creating resource group..." -ForegroundColor Yellow
Write-Host "  Name: $ResourceGroup" -ForegroundColor Gray
Write-Host "  Location: $Location" -ForegroundColor Gray

az group create `
    --name $ResourceGroup `
    --location $Location

if ($LASTEXITCODE -ne 0) {
    throw "Failed to create resource group"
}

Write-Host "  ✓ Resource group created" -ForegroundColor Green

# Step 2: Create SQL Server
Write-Host "[2/6] Creating Azure SQL Server..." -ForegroundColor Yellow
Write-Host "  Server Name: $SqlServer" -ForegroundColor Gray
Write-Host "  Admin User: $SqlAdminUser" -ForegroundColor Gray

az sql server create `
    --name $SqlServer `
    --resource-group $ResourceGroup `
    --location $Location `
    --admin-user $SqlAdminUser `
    --admin-password $SqlPasswordPlain

if ($LASTEXITCODE -ne 0) {
    throw "Failed to create SQL Server"
}

Write-Host "  ✓ SQL Server created" -ForegroundColor Green

# Step 3: Configure SQL Server Firewall
Write-Host "[3/6] Configuring SQL Server firewall..." -ForegroundColor Yellow

# Allow Azure services
az sql server firewall-rule create `
    --resource-group $ResourceGroup `
    --server $SqlServer `
    --name AllowAzureServices `
    --start-ip-address 0.0.0.0 `
    --end-ip-address 0.0.0.0

# Add your current IP
Write-Host "  Getting your public IP..." -ForegroundColor Gray
try {
    $myIp = (Invoke-WebRequest -Uri "https://api.ipify.org" -UseBasicParsing).Content.Trim()
    Write-Host "  Your IP: $myIp" -ForegroundColor Gray

    az sql server firewall-rule create `
        --resource-group $ResourceGroup `
        --server $SqlServer `
        --name AllowClientIP `
        --start-ip-address $myIp `
        --end-ip-address $myIp

    Write-Host "  ✓ Firewall configured" -ForegroundColor Green
} catch {
    Write-Warning "  Could not detect your IP. Add manually if needed."
}

# Step 4: Create SQL Database (Serverless Free Tier)
Write-Host "[4/6] Creating Azure SQL Database (Serverless Free Tier)..." -ForegroundColor Yellow
Write-Host "  Database: $SqlDatabase" -ForegroundColor Gray
Write-Host "  Edition: GeneralPurpose (Serverless)" -ForegroundColor Gray
Write-Host "  Capacity: 1 vCore (100K vCore seconds/month FREE)" -ForegroundColor Gray

az sql db create `
    --resource-group $ResourceGroup `
    --server $SqlServer `
    --name $SqlDatabase `
    --edition GeneralPurpose `
    --compute-model Serverless `
    --family Gen5 `
    --capacity 1 `
    --auto-pause-delay 60 `
    --min-capacity 0.5 `
    --backup-storage-redundancy Local

if ($LASTEXITCODE -ne 0) {
    throw "Failed to create SQL Database"
}

Write-Host "  ✓ SQL Database created" -ForegroundColor Green
Write-Host "  Note: Auto-pauses after 60 minutes of inactivity" -ForegroundColor Gray

# Step 5: Create App Service Plan
Write-Host "[5/6] Creating App Service Plan..." -ForegroundColor Yellow

$appServicePlan = "$AppName-plan"
Write-Host "  Plan Name: $appServicePlan" -ForegroundColor Gray
Write-Host "  OS: $AppServiceOS" -ForegroundColor Gray
Write-Host "  SKU: B1 (Basic)" -ForegroundColor Gray

if ($AppServiceOS -eq "Linux") {
    Write-Host "  Estimated Cost: ~`$13/month" -ForegroundColor Gray
    az appservice plan create `
        --name $appServicePlan `
        --resource-group $ResourceGroup `
        --location $Location `
        --is-linux `
        --sku B1
} else {
    Write-Host "  Estimated Cost: ~`$55/month" -ForegroundColor Gray
    az appservice plan create `
        --name $appServicePlan `
        --resource-group $ResourceGroup `
        --location $Location `
        --sku B1
}

if ($LASTEXITCODE -ne 0) {
    throw "Failed to create App Service Plan"
}

Write-Host "  ✓ App Service Plan created" -ForegroundColor Green

# Step 6: Create Web App
Write-Host "[6/6] Creating Web App..." -ForegroundColor Yellow
Write-Host "  App Name: $AppName" -ForegroundColor Gray

if ($AppServiceOS -eq "Linux") {
    az webapp create `
        --resource-group $ResourceGroup `
        --plan $appServicePlan `
        --name $AppName `
        --runtime "DOTNET|10.0"
} else {
    az webapp create `
        --resource-group $ResourceGroup `
        --plan $appServicePlan `
        --name $AppName `
        --runtime "DOTNET:10"
}

if ($LASTEXITCODE -ne 0) {
    throw "Failed to create Web App"
}

# Enable HTTPS only
az webapp update `
    --resource-group $ResourceGroup `
    --name $AppName `
    --https-only true

Write-Host "  ✓ Web App created" -ForegroundColor Green

# Step 7: Configure App Settings
Write-Host "[7/7] Configuring application settings..." -ForegroundColor Yellow

# Build connection string
$connectionString = "Server=tcp:$SqlServer.database.windows.net,1433;Initial Catalog=$SqlDatabase;User ID=$SqlAdminUser;Password=$SqlPasswordPlain;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;"

az webapp config connection-string set `
    --resource-group $ResourceGroup `
    --name $AppName `
    --connection-string-type SQLAzure `
    --settings DefaultConnection="$connectionString"

az webapp config appsettings set `
    --resource-group $ResourceGroup `
    --name $AppName `
    --settings `
        ASPNETCORE_ENVIRONMENT=Production `
        WEBSITE_RUN_FROM_PACKAGE=0

Write-Host "  ✓ App settings configured" -ForegroundColor Green

# Optional: Application Insights
if ($EnableApplicationInsights) {
    Write-Host "[Bonus] Setting up Application Insights..." -ForegroundColor Yellow

    $insightsName = "$AppName-insights"

    az monitor app-insights component create `
        --app $insightsName `
        --location $Location `
        --resource-group $ResourceGroup `
        --application-type web

    $insightsKey = az monitor app-insights component show `
        --app $insightsName `
        --resource-group $ResourceGroup `
        --query connectionString `
        --output tsv

    az webapp config appsettings set `
        --resource-group $ResourceGroup `
        --name $AppName `
        --settings APPLICATIONINSIGHTS_CONNECTION_STRING="$insightsKey"

    Write-Host "  ✓ Application Insights configured" -ForegroundColor Green
}

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Azure Resources Created!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Resource Group:" -ForegroundColor Cyan
Write-Host "  $ResourceGroup" -ForegroundColor White
Write-Host ""
Write-Host "SQL Server:" -ForegroundColor Cyan
Write-Host "  Server: $SqlServer.database.windows.net" -ForegroundColor White
Write-Host "  Database: $SqlDatabase" -ForegroundColor White
Write-Host "  Admin: $SqlAdminUser" -ForegroundColor White
Write-Host ""
Write-Host "Web App:" -ForegroundColor Cyan
Write-Host "  Name: $AppName" -ForegroundColor White
Write-Host "  URL: https://$AppName.azurewebsites.net" -ForegroundColor White
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Run: .\deploy-to-azure.ps1 -ResourceGroup '$ResourceGroup' -AppName '$AppName' -SqlServer '$SqlServer' -SqlDatabase '$SqlDatabase' -SqlAdminUser '$SqlAdminUser' -SqlAdminPassword (ConvertTo-SecureString 'YOUR_PASSWORD' -AsPlainText -Force)" -ForegroundColor White
Write-Host "  2. Visit: https://$AppName.azurewebsites.net" -ForegroundColor White
Write-Host ""

# Get connection string for reference
Write-Host "Connection String (for reference):" -ForegroundColor Cyan
Write-Host $connectionString -ForegroundColor Gray
Write-Host ""

# Cost estimate
Write-Host "Estimated Monthly Cost:" -ForegroundColor Yellow
if ($AppServiceOS -eq "Linux") {
    Write-Host "  App Service (B1 Linux): ~`$13" -ForegroundColor White
} else {
    Write-Host "  App Service (B1 Windows): ~`$55" -ForegroundColor White
}
Write-Host "  SQL Database (Serverless Free Tier): `$0-5" -ForegroundColor White
if ($EnableApplicationInsights) {
    Write-Host "  Application Insights: `$0-2" -ForegroundColor White
}
Write-Host "  TOTAL: ~`$15-20/month (Linux) or ~`$57-62/month (Windows)" -ForegroundColor White
Write-Host ""

# Clean up sensitive data
[System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($BSTR)
