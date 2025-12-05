<#
.SYNOPSIS
    Resets the COBRA-APP-POC database and applies all seed data.

.DESCRIPTION
    This script:
    1. Drops the existing database (if exists)
    2. Applies all EF Core migrations to recreate schema
    3. Runs seed SQL scripts in the correct order

    Use this for a clean slate during POC development/testing.

.PARAMETER ServerInstance
    SQL Server instance name. Default: localhost

.PARAMETER SkipMigrations
    Skip EF migrations (use if already applied). Just runs seed scripts.

.EXAMPLE
    .\reset-and-seed.ps1

.EXAMPLE
    .\reset-and-seed.ps1 -ServerInstance "(localdb)\MSSQLLocalDB"

.EXAMPLE
    .\reset-and-seed.ps1 -SkipMigrations
#>

param(
    [string]$ServerInstance = "localhost",
    [switch]$SkipMigrations
)

$ErrorActionPreference = "Stop"

# Paths
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Join-Path (Split-Path -Parent $ScriptDir) "src\backend\CobraAPI"
$DatabaseName = "COBRAPOC"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  COBRA POC - Database Reset & Seed" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Server: $ServerInstance" -ForegroundColor Gray
Write-Host "Database: $DatabaseName" -ForegroundColor Gray
Write-Host ""

# Step 1: Drop and recreate database via EF Core
$totalSteps = 7  # 2 migration steps + 5 seed scripts
if (-not $SkipMigrations) {
    Write-Host "[1/$totalSteps] Dropping existing database..." -ForegroundColor Yellow
    Push-Location $BackendDir

    try {
        # Stop any running instances first
        Write-Host "  Stopping any running API instances..." -ForegroundColor Gray
        Get-Process -Name "CobraAPI" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2

        $dropResult = dotnet ef database drop --force 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  Database dropped" -ForegroundColor Green
        } else {
            Write-Host "  Database may not exist (continuing)" -ForegroundColor Gray
        }
    } catch {
        Write-Host "  Database may not exist (continuing)" -ForegroundColor Gray
    }

    Write-Host "[2/$totalSteps] Applying EF Core migrations..." -ForegroundColor Yellow
    $migrateResult = dotnet ef database update 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Migration failed!" -ForegroundColor Red
        Write-Host $migrateResult -ForegroundColor Red
        Pop-Location
        exit 1
    }
    Write-Host "  Migrations applied" -ForegroundColor Green

    Pop-Location
} else {
    Write-Host "[1/$totalSteps] Skipping database drop (--SkipMigrations)" -ForegroundColor Gray
    Write-Host "[2/$totalSteps] Skipping migrations (--SkipMigrations)" -ForegroundColor Gray
}

# Step 2: Run seed scripts in order
$seedScripts = @(
    @{ Name = "Events & Categories"; File = "seed-events.sql" },
    @{ Name = "Templates"; File = "seed-templates.sql" },
    @{ Name = "Item Library"; File = "seed-item-library.sql" },
    @{ Name = "Checklists"; File = "seed-checklists.sql" },
    @{ Name = "Operational Periods"; File = "seed-operational-periods.sql" }
)
$stepNum = 3
foreach ($script in $seedScripts) {
    $scriptPath = Join-Path $ScriptDir $script.File

    if (-not (Test-Path $scriptPath)) {
        Write-Host "[$stepNum/$totalSteps] Skipping $($script.Name) - file not found" -ForegroundColor Gray
        $stepNum++
        continue
    }

    Write-Host "[$stepNum/$totalSteps] Seeding $($script.Name)..." -ForegroundColor Yellow

    try {
        $result = sqlcmd -S $ServerInstance -d $DatabaseName -i $scriptPath -b 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  WARNING: $($script.File) had errors" -ForegroundColor Magenta
            Write-Host $result -ForegroundColor Gray
        } else {
            Write-Host "  $($script.Name) seeded" -ForegroundColor Green
        }
    } catch {
        Write-Host "  ERROR: Failed to run $($script.File)" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
    }

    $stepNum++
}

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Database Reset Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Quick verification
Write-Host "Verifying seed data..." -ForegroundColor Gray
$verifyQuery = @"
SELECT 'Events' AS [Table], COUNT(*) AS [Count] FROM Events
UNION ALL SELECT 'EventCategories', COUNT(*) FROM EventCategories
UNION ALL SELECT 'Templates', COUNT(*) FROM Templates
UNION ALL SELECT 'TemplateItems', COUNT(*) FROM TemplateItems
UNION ALL SELECT 'ItemLibrary', COUNT(*) FROM ItemLibrary
UNION ALL SELECT 'ChecklistInstances', COUNT(*) FROM ChecklistInstances
UNION ALL SELECT 'ChecklistItems', COUNT(*) FROM ChecklistItems
UNION ALL SELECT 'OperationalPeriods', COUNT(*) FROM OperationalPeriods
"@

$verifyResult = sqlcmd -S $ServerInstance -d $DatabaseName -Q $verifyQuery -h -1 -W 2>&1
Write-Host ""
Write-Host "Table Counts:" -ForegroundColor Cyan
Write-Host $verifyResult
Write-Host ""

Write-Host "To start the API:" -ForegroundColor Gray
Write-Host "  cd src\backend\CobraAPI && dotnet run" -ForegroundColor White
Write-Host ""
Write-Host "API will be available at:" -ForegroundColor Gray
Write-Host "  http://localhost:5000" -ForegroundColor White
Write-Host "  http://localhost:5000/swagger" -ForegroundColor White
Write-Host ""
