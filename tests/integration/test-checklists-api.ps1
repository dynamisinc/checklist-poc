# ============================================================================
# Checklist POC - Checklists API Integration Test Script
# ============================================================================
# Tests all 10 endpoints of the ChecklistsController
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

# Test data storage
$script:TemplateId = $null
$script:ChecklistId = $null
$script:ArchivedChecklistId = $null

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
        [int]$ExpectedStatusCode = 200,
        [hashtable]$Headers = @{}
    )

    $uri = "$BaseUrl$Endpoint"
    Write-TestInfo "$Method $uri"

    try {
        $defaultHeaders = @{
            "X-User-Email" = "test-user@cobra.mil"
            "X-User-Position" = "Safety Officer"
        }

        # Merge custom headers with defaults
        foreach ($key in $Headers.Keys) {
            $defaultHeaders[$key] = $Headers[$key]
        }

        $params = @{
            Uri = $uri
            Method = $Method
            ContentType = "application/json"
            Headers = $defaultHeaders
            SkipCertificateCheck = $true
        }

        if ($Body) {
            $params.Body = ($Body | ConvertTo-Json -Depth 10)
            Write-TestInfo "Request Body: $($params.Body)"
        }

        $response = Invoke-RestMethod @params -StatusCodeVariable statusCode

        Write-TestInfo "Status Code: $statusCode"

        if ($statusCode -eq $ExpectedStatusCode) {
            return @{
                Success = $true
                StatusCode = $statusCode
                Data = $response
            }
        } else {
            return @{
                Success = $false
                StatusCode = $statusCode
                Error = "Expected $ExpectedStatusCode, got $statusCode"
            }
        }
    }
    catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-TestInfo "Exception Status Code: $statusCode"
        Write-TestInfo "Exception Message: $($_.Exception.Message)"

        if ($statusCode -eq $ExpectedStatusCode) {
            return @{
                Success = $true
                StatusCode = $statusCode
                Data = $null
            }
        }

        return @{
            Success = $false
            StatusCode = $statusCode
            Error = $_.Exception.Message
        }
    }
}

# ============================================================================
# Test Setup - Create Template for Testing
# ============================================================================

function Initialize-TestData {
    Write-TestHeader "Setting Up Test Data"

    Write-TestStep "Creating test template for checklist instantiation"

    $templateBody = @{
        name = "Integration Test Template"
        description = "Template for integration testing checklists"
        category = "Testing"
        tags = "integration, test, automated"
        items = @(
            @{
                itemText = "Test Item 1 - Required"
                itemType = "checkbox"
                displayOrder = 10
                notes = "This is a required test item"
            },
            @{
                itemText = "Test Item 2 - Status"
                itemType = "status"
                displayOrder = 20
                statusOptions = "[`"Not Started`", `"In Progress`", `"Complete`"]"
                notes = "Status dropdown item"
            },
            @{
                itemText = "Test Item 3 - Optional"
                itemType = "checkbox"
                displayOrder = 30
                notes = "Optional test item"
            }
        )
    }

    $result = Invoke-ApiRequest -Method POST -Endpoint "/api/templates" -Body $templateBody -ExpectedStatusCode 201

    if ($result.Success) {
        $script:TemplateId = $result.Data.id
        Write-TestPass "Created test template: $($script:TemplateId)"
        Write-TestInfo "Template has $($result.Data.items.Count) items"
    } else {
        Write-TestFail "Failed to create test template" -Details $result.Error
        throw "Cannot continue tests without template"
    }
}

# ============================================================================
# Test 1: POST /api/checklists - Create Checklist from Template
# ============================================================================

function Test-CreateChecklistFromTemplate {
    Write-TestHeader "Test 1: POST /api/checklists - Create Checklist from Template"

    Write-TestStep "Creating checklist from template"

    $body = @{
        templateId = $script:TemplateId
        name = "Test Checklist - Safety Briefing"
        eventId = "EVENT-001"
        eventName = "Hurricane Response 2025"
        operationalPeriodId = "OP-001"
        operationalPeriodName = "Nov 20, 2025 - Day Shift"
        assignedPositions = "Safety Officer,Incident Commander"
    }

    $result = Invoke-ApiRequest -Method POST -Endpoint "/api/checklists" -Body $body -ExpectedStatusCode 201

    if ($result.Success) {
        $script:ChecklistId = $result.Data.id
        Write-TestPass "Created checklist: $($script:ChecklistId)"

        # Verify response structure
        if ($result.Data.name -eq $body.name) {
            Write-TestPass "Checklist name matches request"
        } else {
            Write-TestFail "Checklist name mismatch"
        }

        if ($result.Data.eventId -eq $body.eventId) {
            Write-TestPass "Event ID matches request"
        } else {
            Write-TestFail "Event ID mismatch"
        }

        if ($result.Data.items.Count -eq 3) {
            Write-TestPass "Checklist has 3 items from template"
        } else {
            Write-TestFail "Item count mismatch (expected 3, got $($result.Data.items.Count))"
        }

        if ($result.Data.progressPercentage -eq 0) {
            Write-TestPass "Progress initialized to 0%"
        } else {
            Write-TestFail "Progress not initialized correctly"
        }

        if ($result.Data.totalItems -eq 3) {
            Write-TestPass "TotalItems set correctly"
        } else {
            Write-TestFail "TotalItems incorrect"
        }

        if ($result.Data.createdBy) {
            Write-TestPass "CreatedBy populated from user context"
        } else {
            Write-TestFail "CreatedBy not populated"
        }
    } else {
        Write-TestFail "Failed to create checklist" -Details $result.Error
    }
}

# ============================================================================
# Test 2: GET /api/checklists/{id} - Get Single Checklist
# ============================================================================

function Test-GetChecklistById {
    Write-TestHeader "Test 2: GET /api/checklists/{id} - Get Single Checklist"

    Write-TestStep "Retrieving checklist by ID"

    $result = Invoke-ApiRequest -Method GET -Endpoint "/api/checklists/$($script:ChecklistId)"

    if ($result.Success) {
        Write-TestPass "Retrieved checklist successfully"

        if ($result.Data.id -eq $script:ChecklistId) {
            Write-TestPass "Checklist ID matches"
        } else {
            Write-TestFail "Checklist ID mismatch"
        }

        if ($result.Data.items -and $result.Data.items.Count -gt 0) {
            Write-TestPass "Checklist includes items"
        } else {
            Write-TestFail "Checklist missing items"
        }

        # Verify items are ordered by DisplayOrder
        $ordered = $true
        for ($i = 0; $i -lt ($result.Data.items.Count - 1); $i++) {
            if ($result.Data.items[$i].displayOrder -gt $result.Data.items[$i + 1].displayOrder) {
                $ordered = $false
                break
            }
        }

        if ($ordered) {
            Write-TestPass "Items ordered by DisplayOrder"
        } else {
            Write-TestFail "Items not properly ordered"
        }
    } else {
        Write-TestFail "Failed to retrieve checklist" -Details $result.Error
    }

    Write-TestStep "Testing 404 for non-existent checklist"
    $randomId = [Guid]::NewGuid()
    $result = Invoke-ApiRequest -Method GET -Endpoint "/api/checklists/$randomId" -ExpectedStatusCode 404

    if ($result.Success) {
        Write-TestPass "Returns 404 for non-existent checklist"
    } else {
        Write-TestFail "Should return 404 for non-existent checklist"
    }
}

# ============================================================================
# Test 3: GET /api/checklists/my-checklists - Position-Based Filtering
# ============================================================================

function Test-GetMyChecklists {
    Write-TestHeader "Test 3: GET /api/checklists/my-checklists - Position-Based Filtering"

    Write-TestStep "Getting checklists for Safety Officer"

    $result = Invoke-ApiRequest -Method GET -Endpoint "/api/checklists/my-checklists"

    if ($result.Success) {
        Write-TestPass "Retrieved checklists for current user"

        if ($result.Data.Count -gt 0) {
            Write-TestPass "Found at least one checklist visible to Safety Officer"
        } else {
            Write-TestFail "No checklists found for Safety Officer"
        }

        # Verify position filtering
        $safetyOfficerChecklist = $result.Data | Where-Object { $_.assignedPositions -like "*Safety Officer*" }
        if ($safetyOfficerChecklist) {
            Write-TestPass "Checklist assigned to Safety Officer is visible"
        } else {
            Write-TestFail "Position filtering may not be working correctly"
        }
    } else {
        Write-TestFail "Failed to retrieve checklists" -Details $result.Error
    }

    Write-TestStep "Testing with different position (Operations Section Chief)"

    $opsHeaders = @{
        "X-User-Position" = "Operations Section Chief"
    }

    $result = Invoke-ApiRequest -Method GET -Endpoint "/api/checklists/my-checklists" -Headers $opsHeaders

    if ($result.Success) {
        Write-TestPass "Retrieved checklists for Operations Section Chief"

        # Should not see Safety Officer checklist
        $safetyChecklist = $result.Data | Where-Object { $_.assignedPositions -eq "Safety Officer,Incident Commander" }
        if (-not $safetyChecklist) {
            Write-TestPass "Position filtering correctly excludes checklists not assigned to user"
        } else {
            Write-TestFail "Position filtering not working - seeing checklists from other positions"
        }
    } else {
        Write-TestFail "Failed to retrieve checklists for different position"
    }
}

# ============================================================================
# Test 4: GET /api/checklists/event/{eventId} - Event Filtering
# ============================================================================

function Test-GetChecklistsByEvent {
    Write-TestHeader "Test 4: GET /api/checklists/event/{eventId} - Event Filtering"

    Write-TestStep "Getting checklists for EVENT-001"

    $result = Invoke-ApiRequest -Method GET -Endpoint "/api/checklists/event/EVENT-001"

    if ($result.Success) {
        Write-TestPass "Retrieved checklists for EVENT-001"

        if ($result.Data.Count -gt 0) {
            Write-TestPass "Found checklists for event"

            # Verify all checklists belong to this event
            $allMatch = $true
            foreach ($checklist in $result.Data) {
                if ($checklist.eventId -ne "EVENT-001") {
                    $allMatch = $false
                    break
                }
            }

            if ($allMatch) {
                Write-TestPass "All returned checklists belong to EVENT-001"
            } else {
                Write-TestFail "Some checklists belong to wrong event"
            }
        }
    } else {
        Write-TestFail "Failed to retrieve checklists by event" -Details $result.Error
    }

    Write-TestStep "Testing with non-existent event"

    $result = Invoke-ApiRequest -Method GET -Endpoint "/api/checklists/event/NONEXISTENT"

    if ($result.Success -and $result.Data.Count -eq 0) {
        Write-TestPass "Returns empty array for non-existent event"
    } else {
        Write-TestFail "Should return empty array for non-existent event"
    }
}

# ============================================================================
# Test 5: GET /api/checklists/event/{eventId}/period/{periodId} - Op Period Filtering
# ============================================================================

function Test-GetChecklistsByOperationalPeriod {
    Write-TestHeader "Test 5: GET /api/checklists/event/{eventId}/period/{periodId} - Op Period Filtering"

    Write-TestStep "Getting checklists for EVENT-001, OP-001"

    $result = Invoke-ApiRequest -Method GET -Endpoint "/api/checklists/event/EVENT-001/period/OP-001"

    if ($result.Success) {
        Write-TestPass "Retrieved checklists for operational period"

        if ($result.Data.Count -gt 0) {
            Write-TestPass "Found checklists for operational period"

            # Verify all checklists belong to this op period
            $allMatch = $true
            foreach ($checklist in $result.Data) {
                if ($checklist.operationalPeriodId -ne "OP-001") {
                    $allMatch = $false
                    break
                }
            }

            if ($allMatch) {
                Write-TestPass "All checklists belong to OP-001"
            } else {
                Write-TestFail "Some checklists belong to wrong operational period"
            }
        }
    } else {
        Write-TestFail "Failed to retrieve checklists by operational period" -Details $result.Error
    }
}

# ============================================================================
# Test 6: PUT /api/checklists/{id} - Update Checklist Metadata
# ============================================================================

function Test-UpdateChecklist {
    Write-TestHeader "Test 6: PUT /api/checklists/{id} - Update Checklist Metadata"

    Write-TestStep "Updating checklist metadata"

    $updateBody = @{
        name = "UPDATED - Test Checklist"
        eventId = "EVENT-001"
        eventName = "Hurricane Response 2025 (Updated)"
        operationalPeriodId = "OP-002"
        operationalPeriodName = "Nov 21, 2025 - Night Shift"
        assignedPositions = "Safety Officer,Operations Section Chief"
    }

    $result = Invoke-ApiRequest -Method PUT -Endpoint "/api/checklists/$($script:ChecklistId)" -Body $updateBody

    if ($result.Success) {
        Write-TestPass "Updated checklist successfully"

        if ($result.Data.name -eq $updateBody.name) {
            Write-TestPass "Name updated correctly"
        } else {
            Write-TestFail "Name not updated"
        }

        if ($result.Data.operationalPeriodId -eq $updateBody.operationalPeriodId) {
            Write-TestPass "Operational period updated"
        } else {
            Write-TestFail "Operational period not updated"
        }

        if ($result.Data.lastModifiedBy) {
            Write-TestPass "LastModifiedBy populated"
        } else {
            Write-TestFail "LastModifiedBy not populated"
        }

        if ($result.Data.lastModifiedAt) {
            Write-TestPass "LastModifiedAt populated"
        } else {
            Write-TestFail "LastModifiedAt not populated"
        }
    } else {
        Write-TestFail "Failed to update checklist" -Details $result.Error
    }

    Write-TestStep "Testing 404 for non-existent checklist"
    $randomId = [Guid]::NewGuid()
    $result = Invoke-ApiRequest -Method PUT -Endpoint "/api/checklists/$randomId" -Body $updateBody -ExpectedStatusCode 404

    if ($result.Success) {
        Write-TestPass "Returns 404 when updating non-existent checklist"
    } else {
        Write-TestFail "Should return 404 for non-existent checklist"
    }
}

# ============================================================================
# Test 7: POST /api/checklists/{id}/clone - Clone Checklist
# ============================================================================

function Test-CloneChecklist {
    Write-TestHeader "Test 7: POST /api/checklists/{id}/clone - Clone Checklist"

    Write-TestStep "Cloning checklist"

    $cloneBody = @{
        newName = "CLONED - Test Checklist"
    }

    $result = Invoke-ApiRequest -Method POST -Endpoint "/api/checklists/$($script:ChecklistId)/clone" -Body $cloneBody -ExpectedStatusCode 201

    if ($result.Success) {
        Write-TestPass "Cloned checklist successfully"

        if ($result.Data.id -ne $script:ChecklistId) {
            Write-TestPass "Clone has different ID"
        } else {
            Write-TestFail "Clone has same ID as original"
        }

        if ($result.Data.name -eq $cloneBody.newName) {
            Write-TestPass "Clone has new name"
        } else {
            Write-TestFail "Clone name not set correctly"
        }

        if ($result.Data.items.Count -eq 3) {
            Write-TestPass "Clone has same number of items"
        } else {
            Write-TestFail "Clone item count mismatch"
        }

        if ($result.Data.progressPercentage -eq 0) {
            Write-TestPass "Clone progress reset to 0%"
        } else {
            Write-TestFail "Clone progress not reset"
        }

        if ($result.Data.completedItems -eq 0) {
            Write-TestPass "Clone completion status reset"
        } else {
            Write-TestFail "Clone completion status not reset"
        }
    } else {
        Write-TestFail "Failed to clone checklist" -Details $result.Error
    }

    Write-TestStep "Testing 404 for non-existent checklist"
    $randomId = [Guid]::NewGuid()
    $result = Invoke-ApiRequest -Method POST -Endpoint "/api/checklists/$randomId/clone" -Body $cloneBody -ExpectedStatusCode 404

    if ($result.Success) {
        Write-TestPass "Returns 404 when cloning non-existent checklist"
    } else {
        Write-TestFail "Should return 404 for non-existent checklist"
    }
}

# ============================================================================
# Test 8: DELETE /api/checklists/{id} - Archive Checklist
# ============================================================================

function Test-ArchiveChecklist {
    Write-TestHeader "Test 8: DELETE /api/checklists/{id} - Archive Checklist (Soft Delete)"

    Write-TestStep "Creating checklist to archive"

    $createBody = @{
        templateId = $script:TemplateId
        name = "Checklist To Archive"
        eventId = "EVENT-001"
        eventName = "Test Event"
    }

    $createResult = Invoke-ApiRequest -Method POST -Endpoint "/api/checklists" -Body $createBody -ExpectedStatusCode 201

    if ($createResult.Success) {
        $script:ArchivedChecklistId = $createResult.Data.id
        Write-TestPass "Created checklist to archive"

        Write-TestStep "Archiving checklist"

        $result = Invoke-ApiRequest -Method DELETE -Endpoint "/api/checklists/$($script:ArchivedChecklistId)" -ExpectedStatusCode 204

        if ($result.Success) {
            Write-TestPass "Archived checklist successfully (204 No Content)"

            Write-TestStep "Verifying checklist is archived"

            $getResult = Invoke-ApiRequest -Method GET -Endpoint "/api/checklists/$($script:ArchivedChecklistId)"

            if ($getResult.Success -and $getResult.Data.isArchived) {
                Write-TestPass "Checklist IsArchived flag set to true"
            } else {
                Write-TestFail "Checklist not properly archived"
            }

            if ($getResult.Data.archivedBy) {
                Write-TestPass "ArchivedBy populated"
            } else {
                Write-TestFail "ArchivedBy not populated"
            }

            Write-TestStep "Verifying archived checklist excluded from my-checklists"

            $listResult = Invoke-ApiRequest -Method GET -Endpoint "/api/checklists/my-checklists"

            $foundArchived = $listResult.Data | Where-Object { $_.id -eq $script:ArchivedChecklistId }
            if (-not $foundArchived) {
                Write-TestPass "Archived checklist not in my-checklists list"
            } else {
                Write-TestFail "Archived checklist still visible in list"
            }
        } else {
            Write-TestFail "Failed to archive checklist" -Details $result.Error
        }
    } else {
        Write-TestFail "Failed to create checklist for archiving"
    }

    Write-TestStep "Testing 404 for non-existent checklist"
    $randomId = [Guid]::NewGuid()
    $result = Invoke-ApiRequest -Method DELETE -Endpoint "/api/checklists/$randomId" -ExpectedStatusCode 404

    if ($result.Success) {
        Write-TestPass "Returns 404 when archiving non-existent checklist"
    } else {
        Write-TestFail "Should return 404 for non-existent checklist"
    }
}

# ============================================================================
# Test 9: GET /api/checklists/archived - Get Archived Checklists (Admin Only)
# ============================================================================

function Test-GetArchivedChecklists {
    Write-TestHeader "Test 9: GET /api/checklists/archived - Get Archived Checklists (Admin Only)"

    Write-TestStep "Testing non-admin access (should be forbidden)"

    $result = Invoke-ApiRequest -Method GET -Endpoint "/api/checklists/archived" -ExpectedStatusCode 403

    if ($result.Success) {
        Write-TestPass "Non-admin user receives 403 Forbidden"
    } else {
        Write-TestFail "Non-admin should receive 403 Forbidden"
    }

    Write-TestStep "Testing admin access"

    $adminHeaders = @{
        "X-User-Email" = "admin@cobra.mil"
        "X-User-Position" = "Incident Commander"
    }

    $result = Invoke-ApiRequest -Method GET -Endpoint "/api/checklists/archived" -Headers $adminHeaders

    if ($result.Success) {
        Write-TestPass "Admin user can access archived checklists"

        if ($result.Data.Count -gt 0) {
            Write-TestPass "Found archived checklists"

            # Verify all are archived
            $allArchived = $true
            foreach ($checklist in $result.Data) {
                if (-not $checklist.isArchived) {
                    $allArchived = $false
                    break
                }
            }

            if ($allArchived) {
                Write-TestPass "All returned checklists are archived"
            } else {
                Write-TestFail "Some non-archived checklists in results"
            }
        }
    } else {
        Write-TestFail "Admin failed to access archived checklists"
    }
}

# ============================================================================
# Test 10: POST /api/checklists/{id}/restore - Restore Archived Checklist (Admin Only)
# ============================================================================

function Test-RestoreChecklist {
    Write-TestHeader "Test 10: POST /api/checklists/{id}/restore - Restore Archived Checklist (Admin Only)"

    Write-TestStep "Testing non-admin restore (should be forbidden)"

    $result = Invoke-ApiRequest -Method POST -Endpoint "/api/checklists/$($script:ArchivedChecklistId)/restore" -ExpectedStatusCode 403

    if ($result.Success) {
        Write-TestPass "Non-admin user receives 403 Forbidden"
    } else {
        Write-TestFail "Non-admin should receive 403 Forbidden"
    }

    Write-TestStep "Testing admin restore"

    $adminHeaders = @{
        "X-User-Email" = "admin@cobra.mil"
        "X-User-Position" = "Incident Commander"
    }

    $result = Invoke-ApiRequest -Method POST -Endpoint "/api/checklists/$($script:ArchivedChecklistId)/restore" -Headers $adminHeaders -ExpectedStatusCode 204

    if ($result.Success) {
        Write-TestPass "Admin successfully restored checklist (204 No Content)"

        Write-TestStep "Verifying checklist is no longer archived"

        $getResult = Invoke-ApiRequest -Method GET -Endpoint "/api/checklists/$($script:ArchivedChecklistId)"

        if ($getResult.Success -and -not $getResult.Data.isArchived) {
            Write-TestPass "Checklist IsArchived flag set to false"
        } else {
            Write-TestFail "Checklist still shows as archived"
        }

        if (-not $getResult.Data.archivedBy -and -not $getResult.Data.archivedAt) {
            Write-TestPass "Archive audit fields cleared"
        } else {
            Write-TestFail "Archive audit fields not cleared"
        }
    } else {
        Write-TestFail "Admin failed to restore checklist"
    }

    Write-TestStep "Testing 404 for non-existent checklist"
    $randomId = [Guid]::NewGuid()
    $result = Invoke-ApiRequest -Method POST -Endpoint "/api/checklists/$randomId/restore" -Headers $adminHeaders -ExpectedStatusCode 404

    if ($result.Success) {
        Write-TestPass "Returns 404 when restoring non-existent checklist"
    } else {
        Write-TestFail "Should return 404 for non-existent checklist"
    }
}

# ============================================================================
# Main Execution
# ============================================================================

Write-TestHeader "Checklist POC - Checklists API Integration Tests"
Write-Host "Base URL: $BaseUrl" -ForegroundColor $InfoColor
Write-Host "Start Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor $InfoColor

try {
    # Setup
    Initialize-TestData

    # Run all tests
    Test-CreateChecklistFromTemplate
    Test-GetChecklistById
    Test-GetMyChecklists
    Test-GetChecklistsByEvent
    Test-GetChecklistsByOperationalPeriod
    Test-UpdateChecklist
    Test-CloneChecklist
    Test-ArchiveChecklist
    Test-GetArchivedChecklists
    Test-RestoreChecklist

    # Summary
    Write-TestHeader "Test Summary"
    Write-Host ""
    Write-Host "Total Tests: $($script:TestsPassed + $script:TestsFailed)" -ForegroundColor $InfoColor
    Write-Host "Passed:      $($script:TestsPassed)" -ForegroundColor $PassColor
    Write-Host "Failed:      $($script:TestsFailed)" -ForegroundColor $FailColor

    $passRate = [math]::Round(($script:TestsPassed / ($script:TestsPassed + $script:TestsFailed)) * 100, 2)
    Write-Host "Pass Rate:   $passRate%" -ForegroundColor $(if ($passRate -ge 95) { $PassColor } elseif ($passRate -ge 80) { $WarnColor } else { $FailColor })

    Write-Host ""
    Write-Host "End Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor $InfoColor

    if ($script:TestsFailed -gt 0) {
        Write-Host ""
        Write-Host "Failed Tests:" -ForegroundColor $FailColor
        $script:TestResults | Where-Object { $_.Status -eq "FAIL" } | ForEach-Object {
            Write-Host "  - $($_.Message)" -ForegroundColor $FailColor
            if ($_.Details) {
                Write-Host "    $($_.Details)" -ForegroundColor Gray
            }
        }
        exit 1
    }

    exit 0
}
catch {
    Write-Host ""
    Write-Host "FATAL ERROR: $($_.Exception.Message)" -ForegroundColor $FailColor
    Write-Host $_.ScriptStackTrace -ForegroundColor Gray
    exit 1
}
