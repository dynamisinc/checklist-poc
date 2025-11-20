# Templates API Integration Test Script

## Overview

Automated PowerShell integration test script for the Checklist POC Templates API. Tests all 7 CRUD endpoints with comprehensive validation.

## Quick Start

```powershell
# 1. Ensure backend API is running
cd src/backend/ChecklistAPI
dotnet run

# 2. In another terminal, run the tests
cd C:\code\checklist-poc
.\test-templates-api.ps1
```

## Usage

### Basic Usage
```powershell
.\test-templates-api.ps1
```

### Verbose Output
```powershell
.\test-templates-api.ps1 -Verbose
```
Shows detailed HTTP request/response information for debugging.

### Custom API URL
```powershell
.\test-templates-api.ps1 -BaseUrl "https://localhost:5001"
```

## What It Tests

### 1. GET /api/templates
- Returns array of templates
- Includes nested items
- Verifies seed data (3 templates, 34 items)

### 2. GET /api/templates/{id}
- Retrieves specific template by ID
- Returns 404 for invalid ID

### 3. GET /api/templates/category/{category}
- Filters templates by category
- Returns empty array for non-existent category

### 4. POST /api/templates
- Creates new template with items
- Returns 201 Created
- Validates audit fields (createdBy, createdAt)

### 5. PUT /api/templates/{id}
- Updates template properties and items
- Validates lastModifiedBy, lastModifiedAt

### 6. POST /api/templates/{id}/duplicate
- Creates duplicate with new name
- Copies all items from original
- Returns 201 Created

### 7. DELETE /api/templates/{id}
- Archives template (soft delete)
- Returns 204 No Content
- Verifies template no longer in active list

## Expected Output

```
╔════════════════════════════════════════════════════════════════════════════╗
║                                                                            ║
║           Checklist POC - Templates API Integration Tests                 ║
║                                                                            ║
╚════════════════════════════════════════════════════════════════════════════╝

Base URL: https://localhost:5001
Started:  2025-11-19 14:30:00

============================================================================
Pre-flight: Testing API Health
============================================================================

[PASS] API is running and Swagger UI is accessible

============================================================================
Test 1: GET /api/templates - Get All Templates
============================================================================

[PASS] Response is an array
[PASS] Seed data count - Expected 3 items, got 3
[PASS] Template has ID
[PASS] Template has Name
[PASS] Template has Category
[PASS] Template has Items
[PASS] Template includes nested items array
...

============================================================================
Test Summary
============================================================================

Total Tests: 28
Passed:      28
Failed:      0
Pass Rate:   100%
```

## Exit Codes

- **0**: All tests passed
- **1**: One or more tests failed or API not running

## Features

✅ **Color-coded output** - Green for pass, red for fail, cyan for info
✅ **Detailed error messages** - Shows HTTP status codes and error details
✅ **Test isolation** - Each test creates/modifies its own data
✅ **Comprehensive validation** - Checks response structure, data types, and values
✅ **User attribution testing** - Verifies createdBy/lastModifiedBy fields
✅ **Negative testing** - Tests invalid IDs and non-existent categories

## Requirements

- **PowerShell 7+** (or Windows PowerShell 5.1)
- **Backend API running** on specified URL
- **Seed data loaded** (3 templates from seed-templates.sql)

## Troubleshooting

### API Not Running
```
ERROR: API is not running. Please start the backend API first.
Run: cd src/backend/ChecklistAPI && dotnet run
```

**Solution**: Start the backend API in another terminal window.

### SSL Certificate Errors
The script uses `-SkipCertificateCheck` to bypass self-signed certificate warnings in local development.

### Test Failures
Check the API console output for error details. The script will show:
- HTTP status code
- Error message from API
- Expected vs actual values

### Seed Data Missing
If tests fail with "Expected 3 items, got 0":
```powershell
sqlcmd -S localhost -d ChecklistPOC -i database\seed-templates.sql -E -C
```

## Integration with CI/CD

This script is designed to be CI/CD friendly:

```yaml
# Example GitHub Actions workflow
- name: Run Integration Tests
  run: |
    cd src/backend/ChecklistAPI
    dotnet run &
    API_PID=$!
    sleep 10
    cd ../../../
    pwsh ./test-templates-api.ps1
    kill $API_PID
```

```yaml
# Example Azure DevOps pipeline
- task: PowerShell@2
  displayName: 'Run API Integration Tests'
  inputs:
    filePath: 'test-templates-api.ps1'
    arguments: '-BaseUrl https://localhost:5001'
    failOnStderr: true
```

## Future Enhancements

Potential additions:
- [ ] Performance timing for each endpoint
- [ ] Concurrent request testing
- [ ] JSON schema validation
- [ ] HTML test report generation
- [ ] Integration with test frameworks (Pester)
- [ ] Database state verification queries

## Contributing

When adding new endpoints:
1. Add a new `Test-*` function following the naming convention
2. Call the function in the main execution section
3. Update the test count in documentation

## Related Files

- `docs/TESTING_GUIDE.md` - Complete testing documentation
- `database/seed-templates.sql` - Seed data required for tests
- `src/backend/ChecklistAPI/Controllers/TemplatesController.cs` - API being tested
