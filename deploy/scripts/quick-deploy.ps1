<#
.SYNOPSIS
    Quick deployment script using git push with Kudu sync for reliable deployments.

.DESCRIPTION
    Builds frontend, copies to wwwroot, commits, pushes to Azure via git,
    and syncs assets to the served wwwroot via Kudu API.

    This handles the "dual wwwroot" issue where git deploys to one location
    but ASP.NET serves from another (due to mixed deployment methods).

.PARAMETER Message
    Optional commit message. Defaults to "deploy: <timestamp>".

.PARAMETER SkipBuild
    Skip frontend build (use existing dist folder).

.PARAMETER SkipTests
    Skip running backend tests.

.PARAMETER SkipKuduSync
    Skip Kudu API sync (only git push, no asset sync).

.EXAMPLE
    .\quick-deploy.ps1

.EXAMPLE
    .\quick-deploy.ps1 -Message "fix: bug description"

.EXAMPLE
    .\quick-deploy.ps1 -SkipBuild -SkipTests

.EXAMPLE
    .\quick-deploy.ps1 -SkipKuduSync
#>

param(
    [string]$Message = "",
    [switch]$SkipBuild,
    [switch]$SkipTests,
    [switch]$SkipKuduSync
)

# Note: Don't use "Stop" - git warnings on stderr cause false failures
$ErrorActionPreference = "Continue"

# Configuration
$AppName = "checklist-poc-app"
$ResourceGroup = "c5-poc-eastus2-rg"
$KuduBaseUrl = "https://$AppName.scm.azurewebsites.net"

# Paths
$RepoRoot = (Get-Item $PSScriptRoot).Parent.Parent.FullName
$FrontendDir = Join-Path $RepoRoot "src\frontend"
$WwwrootDir = Join-Path $RepoRoot "src\backend\ChecklistAPI\wwwroot"
$DistDir = Join-Path $FrontendDir "dist"
$AppUrl = "https://$AppName.azurewebsites.net"

function Write-Step($step, $total, $text) {
    Write-Host "[$step/$total] $text" -ForegroundColor Yellow
}

function Write-Success($text) {
    Write-Host "  $text" -ForegroundColor Green
}

function Write-Info($text) {
    Write-Host "  $text" -ForegroundColor Gray
}

function Write-Warning($text) {
    Write-Host "  WARNING: $text" -ForegroundColor Magenta
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Quick Deploy to Azure" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Set-Location $RepoRoot

$totalSteps = 7
if ($SkipKuduSync) { $totalSteps = 6 }

# 1. Verify Azure remote
Write-Step 1 $totalSteps "Checking git remote..."
$remotes = git remote 2>&1
$hasAzure = $remotes | Where-Object { $_ -eq "azure" }
if (-not $hasAzure) {
    Write-Host "ERROR: Azure remote not configured." -ForegroundColor Red
    Write-Host "Add it with: git remote add azure <your-azure-git-url>" -ForegroundColor Gray
    exit 1
}
Write-Success "Azure remote configured"

# 2. Run tests (optional)
if (-not $SkipTests) {
    Write-Step 2 $totalSteps "Running tests..."
    Push-Location (Join-Path $RepoRoot "src\backend")
    $testOutput = dotnet test --verbosity quiet 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Tests failed!" -ForegroundColor Red
        Pop-Location
        exit 1
    }
    Pop-Location
    Write-Success "All tests passed"
} else {
    Write-Step 2 $totalSteps "Skipping tests"
}

# 3. Build frontend
if (-not $SkipBuild) {
    Write-Step 3 $totalSteps "Building frontend..."
    Push-Location $FrontendDir

    if (-not (Test-Path "node_modules")) {
        Write-Info "Installing dependencies..."
        npm install 2>&1 | Out-Null
    }

    npm run build 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Build failed!" -ForegroundColor Red
        Pop-Location
        exit 1
    }
    Pop-Location
    Write-Success "Frontend built"
} else {
    Write-Step 3 $totalSteps "Skipping build"
}

# 4. Copy to wwwroot (IMPORTANT: clean first!)
Write-Step 4 $totalSteps "Copying to wwwroot..."
if (Test-Path $WwwrootDir) {
    Remove-Item "$WwwrootDir\*" -Recurse -Force -ErrorAction SilentlyContinue
}
Copy-Item "$DistDir\*" $WwwrootDir -Recurse -Force

$jsFiles = Get-ChildItem "$WwwrootDir\assets\*.js" -ErrorAction SilentlyContinue
$jsFile = ($jsFiles | Select-Object -First 1).Name
Write-Success "Copied (bundle: $jsFile)"

# 5. Commit
Write-Step 5 $totalSteps "Committing changes..."
$null = git add -A 2>&1

$hasChanges = git status --porcelain 2>&1 | Out-String
if ([string]::IsNullOrWhiteSpace($hasChanges)) {
    Write-Info "No changes to commit"
} else {
    if ([string]::IsNullOrWhiteSpace($Message)) {
        $Message = "deploy: $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
    }
    $null = git commit -m $Message 2>&1
    Write-Success "Committed: $Message"
}

# 6. Push to Azure (MUST be master, not main!)
Write-Step 6 $totalSteps "Pushing to Azure (master branch)..."
$pushOutput = git push azure HEAD:master 2>&1 | Out-String
if ($pushOutput -match "Everything up-to-date") {
    Write-Info "Already up to date"
} elseif ($pushOutput -match "error:|fatal:") {
    Write-Host "ERROR: Push failed!" -ForegroundColor Red
    Write-Host $pushOutput -ForegroundColor Red
    exit 1
} else {
    Write-Success "Pushed to Azure"
}

# 7. Sync assets via Kudu API (handles dual wwwroot issue)
if (-not $SkipKuduSync) {
    Write-Step 7 $totalSteps "Syncing assets via Kudu API..."

    # Get publishing credentials from Azure
    Write-Info "Getting deployment credentials..."
    try {
        $creds = az webapp deployment list-publishing-credentials `
            --name $AppName `
            --resource-group $ResourceGroup `
            --query "{username:publishingUserName, password:publishingPassword}" `
            --output json 2>$null | ConvertFrom-Json

        if (-not $creds) {
            Write-Warning "Could not get credentials. Skipping Kudu sync."
            Write-Warning "Frontend may not update if dual wwwroot issue exists."
        } else {
            $kuduCreds = "$($creds.username):$($creds.password)"
            $authHeader = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($kuduCreds))

            # Get list of assets to sync
            $assetsDir = Join-Path $WwwrootDir "assets"
            if (Test-Path $assetsDir) {
                $localAssets = Get-ChildItem $assetsDir -File

                foreach ($asset in $localAssets) {
                    $fileName = $asset.Name
                    $localPath = $asset.FullName
                    $kuduUrl = "$KuduBaseUrl/api/vfs/site/wwwroot/wwwroot/assets/$fileName"

                    Write-Info "Uploading $fileName..."

                    try {
                        # Upload file to Kudu
                        $response = Invoke-WebRequest -Uri $kuduUrl -Method PUT `
                            -InFile $localPath `
                            -Headers @{
                                "Authorization" = "Basic $authHeader"
                                "If-Match" = "*"
                            } `
                            -ContentType "application/octet-stream" `
                            -TimeoutSec 120 `
                            -ErrorAction Stop

                    } catch {
                        Write-Warning "Failed to upload $fileName : $_"
                    }
                }

                # Also sync index.html
                $indexPath = Join-Path $WwwrootDir "index.html"
                if (Test-Path $indexPath) {
                    $kuduUrl = "$KuduBaseUrl/api/vfs/site/wwwroot/wwwroot/index.html"
                    Write-Info "Uploading index.html..."
                    try {
                        Invoke-WebRequest -Uri $kuduUrl -Method PUT `
                            -InFile $indexPath `
                            -Headers @{
                                "Authorization" = "Basic $authHeader"
                                "If-Match" = "*"
                            } `
                            -ContentType "text/html" `
                            -TimeoutSec 60 `
                            -ErrorAction Stop | Out-Null
                    } catch {
                        Write-Warning "Failed to upload index.html: $_"
                    }
                }

                Write-Success "Assets synced to served wwwroot"
            } else {
                Write-Warning "No assets directory found"
            }
        }
    } catch {
        Write-Warning "Kudu sync failed: $_"
        Write-Warning "You may need to manually sync if frontend doesn't update."
    }
}

# Done
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "App: $AppUrl" -ForegroundColor White
Write-Host "API: $AppUrl/swagger" -ForegroundColor White
Write-Host ""
Write-Host "Verify with: curl $AppUrl/api/templates" -ForegroundColor Gray
Write-Host ""

# Quick verification
Write-Host "Running quick verification..." -ForegroundColor Gray
Start-Sleep -Seconds 3
try {
    $response = Invoke-WebRequest -Uri "$AppUrl/api/templates" -Method GET -TimeoutSec 10 -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "API responding correctly (200 OK)" -ForegroundColor Green
    }
} catch {
    Write-Host "API check failed - app may still be starting up" -ForegroundColor Yellow
    Write-Host "Try again in a few seconds: curl $AppUrl/api/templates" -ForegroundColor Gray
}
