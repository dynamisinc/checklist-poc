# Azure Resources Setup Script - Using Existing SQL Server
# Creates Azure resources for Checklist POC using your existing SQL Server

param(
    [Parameter(Mandatory=$true)]
    [string]$ResourceGroup,

    [Parameter(Mandatory=$true)]
    [string]$AppName,

    [Parameter(Mandatory=$true)]
    [string]$ExistingSqlServer,

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
Write-Host "  (Using Existing SQL Server)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Convert SecureString password to plain text
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($SqlAdminPassword)
$SqlPasswordPlain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

# Step 1: Get existing SQL Server info
Write-Host "[1/6] Verifying existing SQL Server..." -ForegroundColor Yellow
Write-Host "  Server Name: $ExistingSqlServer" -ForegroundColor Gray

$sqlServerInfo = az sql server show `
    --name $ExistingSqlServer `
    --resource-group $ResourceGroup `
    --output json | ConvertFrom-Json

if ($LASTEXITCODE -ne 0) {
    throw "SQL Server '$ExistingSqlServer' not found in resource group '$ResourceGroup'"
}

Write-Host "  ✓ SQL Server found" -ForegroundColor Green
Write-Host "  Location: $($sqlServerInfo.location)" -ForegroundColor Gray
Write-Host "  FQDN: $($sqlServerInfo.fullyQualifiedDomainName)" -ForegroundColor Gray

# Update location to match SQL Server
$Location = $sqlServerInfo.location
Write-Host "  Using SQL Server location: $Location" -ForegroundColor Gray

# Step 2: Configure SQL Server Firewall (if needed)
Write-Host "[2/6] Checking SQL Server firewall..." -ForegroundColor Yellow

# Check if Azure services rule exists
$azureServicesRule = az sql server firewall-rule show `
    --resource-group $ResourceGroup `
    --server $ExistingSqlServer `
    --name AllowAzureServices `
    --output json 2>$null | ConvertFrom-Json

if (-not $azureServicesRule) {
    Write-Host "  Adding Azure services firewall rule..." -ForegroundColor Gray
    az sql server firewall-rule create `
        --resource-group $ResourceGroup `
        --server $ExistingSqlServer `
        --name AllowAzureServices `
        --start-ip-address 0.0.0.0 `
        --end-ip-address 0.0.0.0
    Write-Host "  ✓ Azure services rule added" -ForegroundColor Green
} else {
    Write-Host "  ✓ Azure services rule already exists" -ForegroundColor Green
}

# Add your current IP (optional)
try {
    $myIp = (Invoke-WebRequest -Uri "https://api.ipify.org" -UseBasicParsing).Content.Trim()
    Write-Host "  Your IP: $myIp" -ForegroundColor Gray

    $clientRule = az sql server firewall-rule show `
        --resource-group $ResourceGroup `
        --server $ExistingSqlServer `
        --name AllowClientIP `
        --output json 2>$null | ConvertFrom-Json

    if (-not $clientRule) {
        az sql server firewall-rule create `
            --resource-group $ResourceGroup `
            --server $ExistingSqlServer `
            --name AllowClientIP `
            --start-ip-address $myIp `
            --end-ip-address $myIp
        Write-Host "  ✓ Your IP added to firewall" -ForegroundColor Green
    } else {
        Write-Host "  ✓ Client IP rule already exists" -ForegroundColor Green
    }
} catch {
    Write-Warning "  Could not detect your IP. Add manually if needed."
}

# Step 3: Create SQL Database (Serverless Free Tier)
Write-Host "[3/6] Creating Azure SQL Database (Serverless Free Tier)..." -ForegroundColor Yellow
Write-Host "  Database: $SqlDatabase" -ForegroundColor Gray
Write-Host "  Edition: GeneralPurpose (Serverless)" -ForegroundColor Gray
Write-Host "  Capacity: 1 vCore (100K vCore seconds/month FREE)" -ForegroundColor Gray

# Check if database already exists
$existingDb = az sql db show `
    --resource-group $ResourceGroup `
    --server $ExistingSqlServer `
    --name $SqlDatabase `
    --output json 2>$null | ConvertFrom-Json

if ($existingDb) {
    Write-Host "  ⚠ Database '$SqlDatabase' already exists" -ForegroundColor Yellow
    $confirm = Read-Host "  Do you want to continue using the existing database? (Y/N)"
    if ($confirm -ne 'Y' -and $confirm -ne 'y') {
        throw "Deployment cancelled by user"
    }
    Write-Host "  ✓ Using existing database" -ForegroundColor Green
} else {
    az sql db create `
        --resource-group $ResourceGroup `
        --server $ExistingSqlServer `
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
}

# Step 4: Create App Service Plan
Write-Host "[4/6] Creating App Service Plan..." -ForegroundColor Yellow

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

# Step 5: Create Web App
Write-Host "[5/6] Creating Web App..." -ForegroundColor Yellow
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

# Step 6: Configure App Settings
Write-Host "[6/6] Configuring application settings..." -ForegroundColor Yellow

# Build connection string
$connectionString = "Server=tcp:$ExistingSqlServer.database.windows.net,1433;Initial Catalog=$SqlDatabase;User ID=$SqlAdminUser;Password=$SqlPasswordPlain;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;"

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
Write-Host "SQL Server (Existing):" -ForegroundColor Cyan
Write-Host "  Server: $ExistingSqlServer.database.windows.net" -ForegroundColor White
Write-Host "  Database: $SqlDatabase (NEW)" -ForegroundColor White
Write-Host "  Admin: $SqlAdminUser" -ForegroundColor White
Write-Host ""
Write-Host "Web App:" -ForegroundColor Cyan
Write-Host "  Name: $AppName" -ForegroundColor White
Write-Host "  URL: https://$AppName.azurewebsites.net" -ForegroundColor White
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Run: .\deploy-to-azure.ps1 -ResourceGroup '$ResourceGroup' -AppName '$AppName' -SqlServer '$ExistingSqlServer' -SqlDatabase '$SqlDatabase' -SqlAdminUser '$SqlAdminUser' -SqlAdminPassword (ConvertTo-SecureString 'YOUR_PASSWORD' -AsPlainText -Force)" -ForegroundColor White
Write-Host "  2. Visit: https://$AppName.azurewebsites.net" -ForegroundColor White
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
Write-Host "  TOTAL: ~`$13-20/month (Linux) or ~`$55-62/month (Windows)" -ForegroundColor White
Write-Host ""
Write-Host "  Note: Using existing SQL Server - no additional server costs!" -ForegroundColor Green
Write-Host ""

# Clean up sensitive data
[System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($BSTR)
