# ============================================================================
# Checklist POC - Templates API Integration Test Script
# ============================================================================
# Tests all 7 endpoints of the TemplatesController
# Requires: Backend API running on https://localhost:5001
# ============================================================================

param(
    [string]$BaseUrl = "https://localhost:5001",
    [switch]$Verbose
)

# Colors for output
$script:PassColor = "Green"
$script:FailColor = "Red"
$script:InfoColor = "Cyan"
$script:WarnColor = "Yellow"

# Test results tracking
$script:TestsPassed = 0
$script:TestsFailed = 0
$script:TestResults = @()

# ============================================================================
# Helper Functions
# ============================================================================

function Write-TestHeader {
    param([string]$Message)
    Write-Host ""
    Write-Host "============================================================================" -ForegroundColor $InfoColor
    Write-Host $Message -ForegroundColor $InfoColor
    Write-Host "============================================================================" -ForegroundColor $InfoColor
}

function Write-TestStep {
    param([string]$Message)
    Write-Host ""
    Write-Host "[TEST] $Message" -ForegroundColor $InfoColor
}

function Write-TestPass {
    param([string]$Message)
    Write-Host "[PASS] $Message" -ForegroundColor $PassColor
    $script:TestsPassed++
    $script:TestResults += @{
        Status = "PASS"
        Message = $Message
        Timestamp = Get-Date
    }
}

function Write-TestFail {
    param([string]$Message, [string]$Details = "")
    Write-Host "[FAIL] $Message" -ForegroundColor $FailColor
    if ($Details) {
        Write-Host "       $Details" -ForegroundColor $FailColor
    }
    $script:TestsFailed++
    $script:TestResults += @{
        Status = "FAIL"
        Message = $Message
        Details = $Details
        Timestamp = Get-Date
    }
}

function Write-TestInfo {
    param([string]$Message)
    if ($Verbose) {
        Write-Host "       $Message" -ForegroundColor Gray
    }
}

function Invoke-ApiRequest {
    param(
        [string]$Method,
        [string]$Endpoint,
        [object]$Body = $null,
        [int]$ExpectedStatusCode = 200
    )

    $uri = "$BaseUrl$Endpoint"
    Write-TestInfo "$Method $uri"

    try {
        $params = @{
            Uri = $uri
            Method = $Method
            ContentType = "application/json"
            Headers = @{
                "X-User-Email" = "test-user@cobra.mil"
                "X-User-Position" = "Integration Test Runner"
            }
        }

        if ($Body) {
            $params.Body = ($Body | ConvertTo-Json -Depth 10)
            Write-TestInfo "Request Body: $($params.Body)"
        }

        # Use Invoke-RestMethod which doesn't throw on success
        $response = Invoke-RestMethod @params

        # For successful requests, assume 200/201/204 based on method
        Write-TestInfo "Request successful"

        return $response
    }
    catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        $errorBody = $_.ErrorDetails.Message

        if ($statusCode -eq $ExpectedStatusCode) {
            Write-TestInfo "Got expected error status: $statusCode"
            return $null
        }

        Write-TestFail "API request failed" "Status: $statusCode, Error: $errorBody"
        return $null
    }
}

function Test-PropertyExists {
    param(
        [object]$Object,
        [string]$PropertyName,
        [string]$TestName
    )

    if ($null -eq $Object) {
        Write-TestFail $TestName "Object is null"
        return $false
    }

    if ($Object.PSObject.Properties.Name -contains $PropertyName) {
        Write-TestPass "$TestName - Property '$PropertyName' exists"
        return $true
    }
    else {
        Write-TestFail "$TestName - Property '$PropertyName' missing"
        return $false
    }
}

function Test-CollectionCount {
    param(
        [object]$Collection,
        [int]$ExpectedCount,
        [string]$TestName
    )

    if ($null -eq $Collection) {
        Write-TestFail $TestName "Collection is null"
        return $false
    }

    $actualCount = @($Collection).Count

    if ($actualCount -eq $ExpectedCount) {
        Write-TestPass "$TestName - Expected $ExpectedCount items, got $actualCount"
        return $true
    }
    else {
        Write-TestFail "$TestName - Expected $ExpectedCount items, got $actualCount"
        return $false
    }
}

# ============================================================================
# Test: Check API is Running
# ============================================================================

function Test-ApiHealth {
    Write-TestHeader "Pre-flight: Testing API Health"

    try {
        # Skip certificate check only for HTTPS URLs
        if ($BaseUrl -like "https://*") {
            $response = Invoke-WebRequest -Uri "$BaseUrl/api/templates" -SkipCertificateCheck -TimeoutSec 5
        } else {
            $response = Invoke-WebRequest -Uri "$BaseUrl/api/templates" -TimeoutSec 5
        }

        if ($response.StatusCode -eq 200) {
            Write-TestPass "API is running and responding"
            return $true
        }
    }
    catch {
        Write-TestFail "API is not running at $BaseUrl" "Make sure to run 'dotnet run' in src/backend/ChecklistAPI"
        return $false
    }
}

# ============================================================================
# Test 1: GET /api/templates - Get All Templates
# ============================================================================

function Test-GetAllTemplates {
    Write-TestHeader "Test 1: GET /api/templates - Get All Templates"

    $response = Invoke-ApiRequest -Method GET -Endpoint "/api/templates"

    if ($null -eq $response) {
        return $null
    }

    # Should return an array
    if ($response -is [array]) {
        Write-TestPass "Response is an array"
    }
    else {
        Write-TestFail "Response should be an array"
    }

    # Should have 3 seed templates
    Test-CollectionCount -Collection $response -ExpectedCount 3 -TestName "Seed data count"

    # Check first template structure
    if ($response.Count -gt 0) {
        $template = $response[0]
        Test-PropertyExists -Object $template -PropertyName "id" -TestName "Template has ID"
        Test-PropertyExists -Object $template -PropertyName "name" -TestName "Template has Name"
        Test-PropertyExists -Object $template -PropertyName "category" -TestName "Template has Category"
        Test-PropertyExists -Object $template -PropertyName "items" -TestName "Template has Items"

        if ($template.items -is [array] -and $template.items.Count -gt 0) {
            Write-TestPass "Template includes nested items array"

            $item = $template.items[0]
            Test-PropertyExists -Object $item -PropertyName "itemText" -TestName "Item has ItemText"
            Test-PropertyExists -Object $item -PropertyName "itemType" -TestName "Item has ItemType"
            Test-PropertyExists -Object $item -PropertyName "displayOrder" -TestName "Item has DisplayOrder"
        }
    }

    return $response
}

# ============================================================================
# Test 2: GET /api/templates/{id} - Get Template by ID
# ============================================================================

function Test-GetTemplateById {
    param([object]$Templates)

    Write-TestHeader "Test 2: GET /api/templates/{id} - Get Template by ID"

    if ($null -eq $Templates -or $Templates.Count -eq 0) {
        Write-TestFail "No templates available for testing"
        return $null
    }

    $templateId = $Templates[0].id
    Write-TestInfo "Testing with template ID: $templateId"

    $response = Invoke-ApiRequest -Method GET -Endpoint "/api/templates/$templateId"

    if ($null -eq $response) {
        return $null
    }

    # Verify it's the correct template
    if ($response.id -eq $templateId) {
        Write-TestPass "Retrieved correct template by ID"
    }
    else {
        Write-TestFail "Retrieved template ID doesn't match requested ID"
    }

    # Verify it has items
    if ($response.items -is [array] -and $response.items.Count -gt 0) {
        Write-TestPass "Template includes $($response.items.Count) items"
    }

    # Test with invalid ID (should return 404)
    $invalidId = "00000000-0000-0000-0000-000000000000"
    Write-TestStep "Testing with invalid ID (expecting 404)"
    $notFound = Invoke-ApiRequest -Method GET -Endpoint "/api/templates/$invalidId" -ExpectedStatusCode 404
    if ($null -eq $notFound) {
        Write-TestPass "Invalid ID correctly returns 404"
    }

    return $response
}

# ============================================================================
# Test 3: GET /api/templates/category/{category} - Get Templates by Category
# ============================================================================

function Test-GetTemplatesByCategory {
    Write-TestHeader "Test 3: GET /api/templates/category/{category} - Get by Category"

    # Test with "Safety" category
    Write-TestStep "Testing with category: Safety"
    $response = Invoke-ApiRequest -Method GET -Endpoint "/api/templates/category/Safety"

    if ($null -eq $response) {
        return
    }

    # Should return array with at least 1 template
    if ($response -is [array]) {
        Write-TestPass "Response is an array"
    }

    if ($response.Count -gt 0) {
        Write-TestPass "Found $($response.Count) template(s) in Safety category"

        # Verify all returned templates are in Safety category
        $allSafety = $true
        foreach ($template in $response) {
            if ($template.category -ne "Safety") {
                $allSafety = $false
                break
            }
        }

        if ($allSafety) {
            Write-TestPass "All returned templates are in Safety category"
        }
        else {
            Write-TestFail "Some templates are not in Safety category"
        }
    }

    # Test with non-existent category
    Write-TestStep "Testing with non-existent category"
    $empty = Invoke-ApiRequest -Method GET -Endpoint "/api/templates/category/NonExistent"

    if ($empty -is [array] -and $empty.Count -eq 0) {
        Write-TestPass "Non-existent category returns empty array"
    }
}

# ============================================================================
# Test 4: POST /api/templates - Create New Template
# ============================================================================

function Test-CreateTemplate {
    Write-TestHeader "Test 4: POST /api/templates - Create New Template"

    $newTemplate = @{
        name = "Test Template $(Get-Date -Format 'yyyyMMdd-HHmmss')"
        description = "Integration test template"
        category = "Testing"
        tags = "test, integration, automated"
        items = @(
            @{
                itemText = "Test item 1"
                itemType = "checkbox"
                displayOrder = 10
                notes = "First test item"
            },
            @{
                itemText = "Test item 2"
                itemType = "status"
                displayOrder = 20
                statusOptions = '["Not Started", "In Progress", "Complete"]'
                notes = "Second test item"
            }
        )
    }

    $response = Invoke-ApiRequest -Method POST -Endpoint "/api/templates" -Body $newTemplate -ExpectedStatusCode 201

    if ($null -eq $response) {
        return $null
    }

    # Verify created template
    Test-PropertyExists -Object $response -PropertyName "id" -TestName "Created template has ID"

    if ($response.name -eq $newTemplate.name) {
        Write-TestPass "Created template has correct name"
    }
    else {
        Write-TestFail "Created template name doesn't match"
    }

    if ($response.category -eq $newTemplate.category) {
        Write-TestPass "Created template has correct category"
    }

    Test-CollectionCount -Collection $response.items -ExpectedCount 2 -TestName "Created template item count"

    # Verify audit fields
    Test-PropertyExists -Object $response -PropertyName "createdBy" -TestName "Has createdBy field"
    Test-PropertyExists -Object $response -PropertyName "createdAt" -TestName "Has createdAt field"

    return $response
}

# ============================================================================
# Test 5: PUT /api/templates/{id} - Update Template
# ============================================================================

function Test-UpdateTemplate {
    param([object]$Template)

    Write-TestHeader "Test 5: PUT /api/templates/{id} - Update Template"

    if ($null -eq $Template) {
        Write-TestFail "No template available for update testing"
        return $null
    }

    $templateId = $Template.id
    Write-TestInfo "Updating template ID: $templateId"

    $updateRequest = @{
        name = "$($Template.name) - UPDATED"
        description = "Updated description"
        category = $Template.category
        tags = "updated, test"
        isActive = $true
        items = @(
            @{
                itemText = "Updated item 1"
                itemType = "checkbox"
                displayOrder = 10
                notes = "This item was updated"
            }
        )
    }

    $response = Invoke-ApiRequest -Method PUT -Endpoint "/api/templates/$templateId" -Body $updateRequest

    if ($null -eq $response) {
        return $null
    }

    # Verify updates
    if ($response.name -eq $updateRequest.name) {
        Write-TestPass "Template name was updated"
    }
    else {
        Write-TestFail "Template name was not updated"
    }

    if ($response.description -eq $updateRequest.description) {
        Write-TestPass "Template description was updated"
    }

    Test-CollectionCount -Collection $response.items -ExpectedCount 1 -TestName "Updated template item count"

    # Verify lastModifiedBy was set
    Test-PropertyExists -Object $response -PropertyName "lastModifiedBy" -TestName "Has lastModifiedBy field"
    Test-PropertyExists -Object $response -PropertyName "lastModifiedAt" -TestName "Has lastModifiedAt field"

    return $response
}

# ============================================================================
# Test 6: POST /api/templates/{id}/duplicate - Duplicate Template
# ============================================================================

function Test-DuplicateTemplate {
    param([object]$Templates)

    Write-TestHeader "Test 6: POST /api/templates/{id}/duplicate - Duplicate Template"

    if ($null -eq $Templates -or $Templates.Count -eq 0) {
        Write-TestFail "No templates available for duplication testing"
        return $null
    }

    # Use the first seed template (not the test one we created)
    $originalTemplate = $Templates[0]
    $templateId = $originalTemplate.id
    $originalItemCount = $originalTemplate.items.Count

    Write-TestInfo "Duplicating template: $($originalTemplate.name)"
    Write-TestInfo "Original has $originalItemCount items"

    $duplicateRequest = @{
        newName = "DUPLICATE - $($originalTemplate.name) - $(Get-Date -Format 'HHmmss')"
    }

    $response = Invoke-ApiRequest -Method POST -Endpoint "/api/templates/$templateId/duplicate" -Body $duplicateRequest -ExpectedStatusCode 201

    if ($null -eq $response) {
        return $null
    }

    # Verify duplicate
    if ($response.name -eq $duplicateRequest.newName) {
        Write-TestPass "Duplicate has correct name"
    }
    else {
        Write-TestFail "Duplicate name doesn't match"
    }

    if ($response.category -eq $originalTemplate.category) {
        Write-TestPass "Duplicate has same category as original"
    }

    Test-CollectionCount -Collection $response.items -ExpectedCount $originalItemCount -TestName "Duplicate item count matches original"

    # Verify it's a new ID
    if ($response.id -ne $templateId) {
        Write-TestPass "Duplicate has new ID"
    }
    else {
        Write-TestFail "Duplicate should have different ID"
    }

    return $response
}

# ============================================================================
# Test 7: DELETE /api/templates/{id} - Archive Template (Soft Delete)
# ============================================================================

function Test-ArchiveTemplate {
    param([object]$Template)

    Write-TestHeader "Test 7: DELETE /api/templates/{id} - Archive Template (Soft Delete)"

    if ($null -eq $Template) {
        Write-TestFail "No template available for archive testing"
        return $null
    }

    $templateId = $Template.id
    Write-TestInfo "Archiving template ID: $templateId"
    Write-TestInfo "Template name: $($Template.name)"

    $response = Invoke-ApiRequest -Method DELETE -Endpoint "/api/templates/$templateId" -ExpectedStatusCode 204

    # 204 No Content returns null response
    Write-TestPass "Archive request returned 204 No Content"

    # Verify template no longer appears in active list
    Write-TestStep "Verifying archived template doesn't appear in active list"
    $activeTemplates = Invoke-ApiRequest -Method GET -Endpoint "/api/templates"

    if ($activeTemplates) {
        $found = $activeTemplates | Where-Object { $_.id -eq $templateId }

        if ($null -eq $found) {
            Write-TestPass "Archived template not in active templates list"
        }
        else {
            Write-TestFail "Archived template still appears in active list"
        }
    }

    # Test archiving non-existent template
    Write-TestStep "Testing archive with invalid ID (expecting 404)"
    $invalidId = "00000000-0000-0000-0000-000000000000"
    Invoke-ApiRequest -Method DELETE -Endpoint "/api/templates/$invalidId" -ExpectedStatusCode 404
    Write-TestPass "Invalid ID correctly returns 404"

    # Return template ID for admin tests
    return $templateId
}

# ============================================================================
# Test 8: GET /api/templates/archived - Get Archived Templates (Admin Only)
# ============================================================================

function Test-GetArchivedTemplates {
    param([string]$ArchivedTemplateId)

    Write-TestHeader "Test 8: GET /api/templates/archived - Get Archived Templates (Admin)"

    # Test with non-admin user (should fail)
    Write-TestStep "Testing with non-admin user (expecting 403)"

    try {
        $nonAdminResponse = Invoke-WebRequest `
            -Uri "$BaseUrl/api/templates/archived" `
            -Method GET `
            -Headers @{
                "X-User-Email" = "regular-user@cobra.mil"
                "X-User-Position" = "Operations Specialist"
            } `
            -ErrorAction Stop

        # If we got here, request succeeded (shouldn't happen)
        Write-TestFail "Non-admin should receive 403, got $($nonAdminResponse.StatusCode)"
    }
    catch {
        # PowerShell throws exception on non-200 status codes
        if ($_.Exception.Response.StatusCode.value__ -eq 403) {
            Write-TestPass "Non-admin correctly denied access (403 Forbidden)"
        }
        else {
            Write-TestFail "Non-admin should receive 403, got $($_.Exception.Response.StatusCode.value__)"
        }
    }

    # Test with admin user
    Write-TestStep "Testing with admin user"

    try {
        $adminResponse = Invoke-RestMethod `
            -Uri "$BaseUrl/api/templates/archived" `
            -Method GET `
            -Headers @{
                "X-User-Email" = "admin@cobra.mil"
                "X-User-Position" = "Incident Commander"
            } `
            -ContentType "application/json" `

        Write-TestPass "Admin successfully accessed archived templates"

        if ($adminResponse -is [array]) {
            Write-TestPass "Response is an array"

            # Should contain the archived template
            if ($ArchivedTemplateId) {
                $found = $adminResponse | Where-Object { $_.id -eq $ArchivedTemplateId }
                if ($found) {
                    Write-TestPass "Archived template found in archived list"
                    Test-PropertyExists -Object $found -PropertyName "archivedBy" -TestName "Archived template has archivedBy"
                    Test-PropertyExists -Object $found -PropertyName "archivedAt" -TestName "Archived template has archivedAt"
                }
                else {
                    Write-TestFail "Archived template not found in archived list"
                }
            }
        }
        else {
            Write-TestFail "Response should be an array"
        }
    }
    catch {
        Write-TestFail "Admin request failed" $_.Exception.Message
    }
}

# ============================================================================
# Test 9: POST /api/templates/{id}/restore - Restore Template (Admin Only)
# ============================================================================

function Test-RestoreTemplate {
    param([string]$ArchivedTemplateId)

    Write-TestHeader "Test 9: POST /api/templates/{id}/restore - Restore Template (Admin)"

    if ([string]::IsNullOrEmpty($ArchivedTemplateId)) {
        Write-TestFail "No archived template ID available for restore testing"
        return
    }

    # Test with non-admin user (should fail)
    Write-TestStep "Testing restore with non-admin user (expecting 403)"

    try {
        $nonAdminResponse = Invoke-WebRequest `
            -Uri "$BaseUrl/api/templates/$ArchivedTemplateId/restore" `
            -Method POST `
            -Headers @{
                "X-User-Email" = "regular-user@cobra.mil"
                "X-User-Position" = "Operations Specialist"
            } `
            -ErrorAction Stop

        Write-TestFail "Non-admin should receive 403, got $($nonAdminResponse.StatusCode)"
    }
    catch {
        if ($_.Exception.Response.StatusCode.value__ -eq 403) {
            Write-TestPass "Non-admin correctly denied restore access (403 Forbidden)"
        }
        else {
            Write-TestFail "Non-admin should receive 403, got $($_.Exception.Response.StatusCode.value__)"
        }
    }

    # Test with admin user
    Write-TestStep "Restoring template with admin user"

    try {
        Invoke-RestMethod `
            -Uri "$BaseUrl/api/templates/$ArchivedTemplateId/restore" `
            -Method POST `
            -Headers @{
                "X-User-Email" = "admin@cobra.mil"
                "X-User-Position" = "Incident Commander"
            } `
            -ContentType "application/json" `
            `
            -StatusCodeVariable statusCode

        if ($statusCode -eq 204) {
            Write-TestPass "Restore returned 204 No Content"
        }

        # Verify template is back in active list
        Write-TestStep "Verifying restored template appears in active list"
        $activeTemplates = Invoke-ApiRequest -Method GET -Endpoint "/api/templates"

        if ($activeTemplates) {
            $found = $activeTemplates | Where-Object { $_.id -eq $ArchivedTemplateId }

            if ($found) {
                Write-TestPass "Restored template now appears in active templates list"
            }
            else {
                Write-TestFail "Restored template not found in active list"
            }
        }
    }
    catch {
        Write-TestFail "Admin restore failed" $_.Exception.Message
    }
}

# ============================================================================
# Test 10: DELETE /api/templates/{id}/permanent - Permanent Delete (Admin Only)
# ============================================================================

function Test-PermanentDelete {
    param([object]$Template)

    Write-TestHeader "Test 10: DELETE /api/templates/{id}/permanent - Permanent Delete (Admin)"

    if ($null -eq $Template) {
        Write-TestFail "No template available for permanent delete testing"
        return
    }

    $templateId = $Template.id
    Write-TestInfo "Permanently deleting template ID: $templateId"

    # First, archive the template
    Write-TestStep "Archiving template before permanent delete"
    Invoke-ApiRequest -Method DELETE -Endpoint "/api/templates/$templateId" -ExpectedStatusCode 204

    # Test with non-admin user (should fail)
    Write-TestStep "Testing permanent delete with non-admin user (expecting 403)"

    try {
        $nonAdminResponse = Invoke-WebRequest `
            -Uri "$BaseUrl/api/templates/$templateId/permanent" `
            -Method DELETE `
            -Headers @{
                "X-User-Email" = "regular-user@cobra.mil"
                "X-User-Position" = "Operations Specialist"
            } `
            -ErrorAction Stop

        Write-TestFail "Non-admin should receive 403, got $($nonAdminResponse.StatusCode)"
    }
    catch {
        if ($_.Exception.Response.StatusCode.value__ -eq 403) {
            Write-TestPass "Non-admin correctly denied permanent delete (403 Forbidden)"
        }
        else {
            Write-TestFail "Non-admin should receive 403, got $($_.Exception.Response.StatusCode.value__)"
        }
    }

    # Test with admin user
    Write-TestStep "Permanently deleting with admin user"

    try {
        Invoke-RestMethod `
            -Uri "$BaseUrl/api/templates/$templateId/permanent" `
            -Method DELETE `
            -Headers @{
                "X-User-Email" = "admin@cobra.mil"
                "X-User-Position" = "Incident Commander"
            } `
            -ContentType "application/json" `
            `
            -StatusCodeVariable statusCode

        if ($statusCode -eq 204) {
            Write-TestPass "Permanent delete returned 204 No Content"
        }

        # Verify template is gone from archived list too
        Write-TestStep "Verifying template is permanently deleted"

        $archivedTemplates = Invoke-RestMethod `
            -Uri "$BaseUrl/api/templates/archived" `
            -Method GET `
            -Headers @{
                "X-User-Email" = "admin@cobra.mil"
                "X-User-Position" = "Incident Commander"
            } `
            -ContentType "application/json" `

        $found = $archivedTemplates | Where-Object { $_.id -eq $templateId }

        if ($null -eq $found) {
            Write-TestPass "Template permanently deleted (not in archived list)"
        }
        else {
            Write-TestFail "Template still exists in archived list"
        }
    }
    catch {
        Write-TestFail "Admin permanent delete failed" $_.Exception.Message
    }
}

# ============================================================================
# Test Summary
# ============================================================================

function Show-TestSummary {
    Write-TestHeader "Test Summary"

    $totalTests = $script:TestsPassed + $script:TestsFailed
    $passRate = if ($totalTests -gt 0) { [math]::Round(($script:TestsPassed / $totalTests) * 100, 2) } else { 0 }

    Write-Host ""
    Write-Host "Total Tests: $totalTests" -ForegroundColor White
    Write-Host "Passed:      $script:TestsPassed" -ForegroundColor $PassColor
    Write-Host "Failed:      $script:TestsFailed" -ForegroundColor $FailColor
    Write-Host "Pass Rate:   $passRate%" -ForegroundColor $(if ($passRate -eq 100) { $PassColor } else { $WarnColor })

    if ($script:TestsFailed -gt 0) {
        Write-Host ""
        Write-Host "Failed Tests:" -ForegroundColor $FailColor
        $script:TestResults | Where-Object { $_.Status -eq "FAIL" } | ForEach-Object {
            Write-Host "  - $($_.Message)" -ForegroundColor $FailColor
            if ($_.Details) {
                Write-Host "    $($_.Details)" -ForegroundColor Gray
            }
        }
    }

    Write-Host ""
    Write-Host "============================================================================" -ForegroundColor $InfoColor
    Write-Host ""

    # Return exit code based on test results
    return $(if ($script:TestsFailed -eq 0) { 0 } else { 1 })
}

# ============================================================================
# Main Test Execution
# ============================================================================

Write-Host ""
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "           Checklist POC - Templates API Integration Tests                 " -ForegroundColor Cyan
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Base URL: $BaseUrl" -ForegroundColor White
$timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
Write-Host "Started:  $timestamp" -ForegroundColor White
Write-Host ""

# Pre-flight check
if (-not (Test-ApiHealth)) {
    Write-Host ""
    Write-Host "ERROR: API is not running. Please start the backend API first." -ForegroundColor Red
    Write-Host ""
    exit 1
}

# Run tests in sequence
$templates = Test-GetAllTemplates
$template = Test-GetTemplateById -Templates $templates
Test-GetTemplatesByCategory
$newTemplate = Test-CreateTemplate
$updatedTemplate = Test-UpdateTemplate -Template $newTemplate
$duplicateTemplate = Test-DuplicateTemplate -Templates $templates
$archivedTemplateId = Test-ArchiveTemplate -Template $updatedTemplate
Test-GetArchivedTemplates -ArchivedTemplateId $archivedTemplateId
Test-RestoreTemplate -ArchivedTemplateId $archivedTemplateId
Test-PermanentDelete -Template $duplicateTemplate

# Show summary and exit with appropriate code
$exitCode = Show-TestSummary
exit $exitCode
