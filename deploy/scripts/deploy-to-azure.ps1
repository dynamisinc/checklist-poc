# Azure Deployment Script for Checklist POC
# Run this script from the repository root to deploy to Azure

param(
    [Parameter(Mandatory=$true)]
    [string]$ResourceGroup,

    [Parameter(Mandatory=$true)]
    [string]$AppName,

    [Parameter(Mandatory=$true)]
    [string]$SqlServer,

    [Parameter(Mandatory=$true)]
    [string]$SqlDatabase,

    [Parameter(Mandatory=$false)]
    [string]$SqlAdminUser,

    [string]$Location = "eastus",

    [switch]$SkipBuild,

    [switch]$SkipMigrations
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Checklist POC - Azure Deployment" -ForegroundColor Cyan
Write-Host "  (Using Entra ID Authentication)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Build Frontend
if (-not $SkipBuild) {
    Write-Host "[1/7] Building React Frontend..." -ForegroundColor Yellow
    Push-Location src\frontend

    if (-not (Test-Path "node_modules")) {
        Write-Host "  Installing npm packages..." -ForegroundColor Gray
        npm install
    }

    Write-Host "  Running production build..." -ForegroundColor Gray
    npm run build

    if ($LASTEXITCODE -ne 0) {
        Pop-Location
        throw "Frontend build failed"
    }

    Pop-Location
    Write-Host "  ✓ Frontend built successfully" -ForegroundColor Green
} else {
    Write-Host "[1/7] Skipping frontend build (--SkipBuild)" -ForegroundColor Gray
}

# Step 2: Copy Frontend to Backend wwwroot
Write-Host "[2/7] Copying frontend to backend wwwroot..." -ForegroundColor Yellow

$wwwrootPath = "src\backend\ChecklistAPI\wwwroot"
if (Test-Path $wwwrootPath) {
    Remove-Item -Path $wwwrootPath -Recurse -Force
}

New-Item -ItemType Directory -Path $wwwrootPath -Force | Out-Null
Copy-Item -Path "src\frontend\dist\*" -Destination $wwwrootPath -Recurse -Force

Write-Host "  ✓ Frontend copied to wwwroot" -ForegroundColor Green

# Step 3: Publish .NET Application
if (-not $SkipBuild) {
    Write-Host "[3/7] Publishing .NET application..." -ForegroundColor Yellow
    Push-Location src\backend\ChecklistAPI

    dotnet publish -c Release -o publish

    if ($LASTEXITCODE -ne 0) {
        Pop-Location
        throw ".NET publish failed"
    }

    Pop-Location
    Write-Host "  ✓ .NET app published" -ForegroundColor Green
} else {
    Write-Host "[3/7] Skipping .NET publish (--SkipBuild)" -ForegroundColor Gray
}

# Step 4: Create Deployment ZIP
Write-Host "[4/7] Creating deployment package..." -ForegroundColor Yellow

$publishPath = "src\backend\ChecklistAPI\publish"
$zipPath = "src\backend\ChecklistAPI\deploy.zip"

if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
}

Compress-Archive -Path "$publishPath\*" -DestinationPath $zipPath -Force

Write-Host "  ✓ Deployment ZIP created" -ForegroundColor Green

# Step 5: Deploy to Azure App Service
Write-Host "[5/7] Deploying to Azure App Service..." -ForegroundColor Yellow

Write-Host "  Resource Group: $ResourceGroup" -ForegroundColor Gray
Write-Host "  App Name: $AppName" -ForegroundColor Gray

# Use Kudu API for more reliable deployment
$publishProfile = az webapp deployment list-publishing-profiles `
    --resource-group $ResourceGroup `
    --name $AppName `
    --query "[?publishMethod=='ZipDeploy'].[userName,userPWD]" `
    --output tsv

$username = $publishProfile.Split("`t")[0]
$password = $publishProfile.Split("`t")[1]

Write-Host "  Uploading deployment package..." -ForegroundColor Gray

$deployUrl = "https://$AppName.scm.azurewebsites.net/api/zipdeploy"
$base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($username):$($password)"))

try {
    $response = Invoke-RestMethod -Uri $deployUrl -Method Post `
        -InFile $zipPath `
        -Headers @{Authorization=("Basic {0}" -f $base64Auth)} `
        -ContentType "application/zip" `
        -TimeoutSec 300

    Write-Host "  ✓ Deployed to Azure" -ForegroundColor Green
} catch {
    throw "Azure deployment failed: $_"
}

# Step 6: Database Migrations (Auto-applied on app startup)
if (-not $SkipMigrations) {
    Write-Host "[6/7] Database migrations..." -ForegroundColor Yellow
    Write-Host "  ✓ Migrations will auto-apply when app starts (configured in Program.cs)" -ForegroundColor Green
    Write-Host "  Note: Using Entra ID managed identity authentication" -ForegroundColor Gray
} else {
    Write-Host "[6/7] Skipping migration check" -ForegroundColor Gray
}

# Step 7: Get App URL
Write-Host "[7/7] Getting app URL..." -ForegroundColor Yellow

$appUrl = az webapp show `
    --resource-group $ResourceGroup `
    --name $AppName `
    --query defaultHostName `
    --output tsv

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Deployment Successful!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Your app is live at:" -ForegroundColor Cyan
Write-Host "  https://$appUrl" -ForegroundColor White
Write-Host ""
Write-Host "API Swagger UI:" -ForegroundColor Cyan
Write-Host "  https://$appUrl/swagger" -ForegroundColor White
Write-Host ""
Write-Host "Monitor logs:" -ForegroundColor Cyan
Write-Host "  az webapp log tail --name $AppName --resource-group $ResourceGroup" -ForegroundColor White
Write-Host ""
