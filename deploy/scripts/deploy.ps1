# Simplified Deployment Script - Reads from azure-config.json
# Usage: .\deploy.ps1 [-SetupOnly] [-DeployOnly] [-SkipBuild] [-SkipMigrations]

param(
    [switch]$SetupOnly,     # Only create Azure resources (first time)
    [switch]$DeployOnly,    # Only deploy app (skip resource creation)
    [switch]$SkipBuild,     # Skip frontend/backend build
    [switch]$SkipMigrations, # Skip database migrations
    [string]$ConfigFile = "azure-config.json"
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Checklist POC - Azure Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Load configuration
if (-not (Test-Path $ConfigFile)) {
    throw "Configuration file not found: $ConfigFile"
}

Write-Host "Loading configuration from $ConfigFile..." -ForegroundColor Yellow
$config = Get-Content $ConfigFile | ConvertFrom-Json

# Display configuration
Write-Host "Configuration:" -ForegroundColor Cyan
Write-Host "  Resource Group: $($config.resourceGroup)" -ForegroundColor Gray
Write-Host "  Location: $($config.location)" -ForegroundColor Gray
Write-Host "  App Name: $($config.appName)" -ForegroundColor Gray
Write-Host "  SQL Server: $($config.sqlServer)" -ForegroundColor Gray
Write-Host "  SQL Database: $($config.sqlDatabase)" -ForegroundColor Gray
Write-Host "  App Service OS: $($config.appServiceOS)" -ForegroundColor Gray
Write-Host ""

# Validate app name
if ($config.appName -eq "checklist-poc-CHANGE-ME") {
    throw "Please update 'appName' in $ConfigFile with a unique name"
}

# Get SQL password from environment variable or prompt
$sqlPassword = $env:AZURE_SQL_PASSWORD
if (-not $sqlPassword) {
    $sqlPasswordSecure = Read-Host "Enter SQL Server password" -AsSecureString
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($sqlPasswordSecure)
    $sqlPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
    [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($BSTR)
} else {
    Write-Host "Using SQL password from environment variable AZURE_SQL_PASSWORD" -ForegroundColor Green
}

$sqlPasswordSecure = ConvertTo-SecureString $sqlPassword -AsPlainText -Force

# Check if logged in to Azure
Write-Host "Checking Azure CLI authentication..." -ForegroundColor Yellow
$account = az account show 2>$null | ConvertFrom-Json
if (-not $account) {
    Write-Host "Not logged in to Azure. Running 'az login'..." -ForegroundColor Yellow
    az login
    $account = az account show | ConvertFrom-Json
}
Write-Host "  ✓ Logged in as: $($account.user.name)" -ForegroundColor Green
Write-Host "  ✓ Subscription: $($account.name)" -ForegroundColor Green
Write-Host ""

# Setup phase (create Azure resources)
if (-not $DeployOnly) {
    Write-Host "========================================" -ForegroundColor Yellow
    Write-Host "  Phase 1: Setup Azure Resources" -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Yellow
    Write-Host ""

    & .\setup-azure-resources-existing-sql.ps1 `
        -ResourceGroup $config.resourceGroup `
        -AppName $config.appName `
        -ExistingSqlServer $config.sqlServer `
        -SqlDatabase $config.sqlDatabase `
        -SqlAdminUser $config.sqlAdminUser `
        -SqlAdminPassword $sqlPasswordSecure `
        -Location $config.location `
        -AppServiceOS $config.appServiceOS `
        -EnableApplicationInsights:$config.enableApplicationInsights

    if ($LASTEXITCODE -ne 0) {
        throw "Setup failed"
    }

    Write-Host ""
}

if ($SetupOnly) {
    Write-Host "Setup complete! Run without -SetupOnly to deploy the app." -ForegroundColor Green
    exit 0
}

# Deploy phase (build and deploy application)
if (-not $SetupOnly) {
    Write-Host "========================================" -ForegroundColor Yellow
    Write-Host "  Phase 2: Deploy Application" -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Yellow
    Write-Host ""

    & .\deploy-to-azure.ps1 `
        -ResourceGroup $config.resourceGroup `
        -AppName $config.appName `
        -SqlServer $config.sqlServer `
        -SqlDatabase $config.sqlDatabase `
        -SqlAdminUser $config.sqlAdminUser `
        -SqlAdminPassword $sqlPasswordSecure `
        -SkipBuild:$SkipBuild `
        -SkipMigrations:$SkipMigrations

    if ($LASTEXITCODE -ne 0) {
        throw "Deployment failed"
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Your app is live at:" -ForegroundColor Cyan
Write-Host "  https://$($config.appName).azurewebsites.net" -ForegroundColor White
Write-Host ""
Write-Host "Next time, just run: .\deploy.ps1 -DeployOnly" -ForegroundColor Yellow
Write-Host ""
