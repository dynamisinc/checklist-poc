# Testing Guide - Checklist POC Backend

## Overview
This guide walks through testing all the backend API endpoints we just created.

## Prerequisites
- .NET 10 SDK installed
- SQL Server running locally
- Database migrations applied
- Backend running on http://localhost:5000 or https://localhost:5001

## Step 1: Restore Packages and Build

```powershell
cd C:\code\checklist-poc\src\backend\ChecklistAPI

# Restore NuGet packages (includes Application Insights)
dotnet restore

# Build the project
dotnet build

# Should show no errors
```

## Step 2: Apply Seed Data

```powershell
# From project root
cd C:\code\checklist-poc

# Load seed data into database
sqlcmd -S localhost -d ChecklistPOC -i database\seed-templates.sql -E -C

# You should see:
# - 3 templates created (Safety, ICS Forms, Logistics)
# - 34 total template items (7 + 12 + 15)
# - Verification query showing item counts
# - "Seed data loaded successfully!" message
```

## Step 3: Start the Backend API

```powershell
cd C:\code\checklist-poc\src\backend\ChecklistAPI

# Run with hot reload
dotnet watch run

# API will start on:
# - HTTP:  http://localhost:5000
# - HTTPS: https://localhost:5001
# - Swagger UI: https://localhost:5001/swagger
```

## Step 4: Run Automated Integration Tests (Recommended)

The fastest way to test all endpoints is using the PowerShell integration test script:

```powershell
# From project root
cd C:\code\checklist-poc\tests\integration

# Run the integration tests
.\test-templates-api.ps1

# For verbose output:
.\test-templates-api.ps1 -Verbose

# To test a different URL:
.\test-templates-api.ps1 -BaseUrl "https://localhost:5001"
```

**What it tests:**
- ✅ GET /api/templates - Get all templates
- ✅ GET /api/templates/{id} - Get single template by ID
- ✅ GET /api/templates/category/{category} - Get templates by category
- ✅ POST /api/templates - Create new template
- ✅ PUT /api/templates/{id} - Update template
- ✅ POST /api/templates/{id}/duplicate - Duplicate template
- ✅ DELETE /api/templates/{id} - Archive template (soft delete)
- ✅ GET /api/templates/archived - Get archived templates (Admin only)
- ✅ POST /api/templates/{id}/restore - Restore archived template (Admin only)
- ✅ DELETE /api/templates/{id}/permanent - Permanent delete (Admin only)

**Expected output:**
```
Total Tests: ~40-50
Passed:      ~40-50
Failed:      0
Pass Rate:   100%
```

If any tests fail, the script will show detailed error messages.

---

## Step 5: Manual Testing with Swagger UI (Optional)

Open your browser to: **https://localhost:5001/swagger**

### Test 1: GET All Templates
1. Expand `GET /api/templates`
2. Click "Try it out"
3. Click "Execute"
4. **Expected Result**:
   - Status 200
   - Array of 3 templates (Safety Briefing, IC Initial Actions, Shelter Opening)
   - Each template includes its items

### Test 2: GET Single Template
1. Copy a template ID from the previous response
2. Expand `GET /api/templates/{id}`
3. Click "Try it out"
4. Paste the template ID
5. Click "Execute"
6. **Expected Result**:
   - Status 200
   - Single template with all its items in DisplayOrder

### Test 3: GET Templates by Category
1. Expand `GET /api/templates/category/{category}`
2. Click "Try it out"
3. Enter "Safety" as the category
4. Click "Execute"
5. **Expected Result**:
   - Status 200
   - Array with 1 template (Daily Safety Briefing)

### Test 4: POST Create New Template
1. Expand `POST /api/templates`
2. Click "Try it out"
3. Replace the example JSON with:

```json
{
  "name": "Test Template - Hurricane Prep",
  "description": "Testing template creation",
  "category": "Operations",
  "tags": "test, hurricane, preparation",
  "items": [
    {
      "itemText": "Stage emergency generators at key facilities",
      "itemType": "checkbox",
      "displayOrder": 10,
      "statusOptions": null,
      "notes": "Test with fuel before deployment"
    },
    {
      "itemText": "Pre-position water and MRE supplies",
      "itemType": "status",
      "displayOrder": 20,
      "statusOptions": "[\"Not Started\", \"In Progress\", \"Complete\"]",
      "notes": null
    }
  ]
}
```

4. Click "Execute"
5. **Expected Result**:
   - Status 201 Created
   - Response includes generated ID and timestamps
   - CreatedBy = "admin@cobra.mil" (from mock middleware)
   - CreatedByPosition = "Incident Commander"

### Test 5: PUT Update Template
1. Copy the ID from the template you just created
2. Expand `PUT /api/templates/{id}`
3. Click "Try it out"
4. Paste the template ID
5. Modify the request JSON (change name, add an item, etc.):

```json
{
  "name": "Test Template - Hurricane Prep (UPDATED)",
  "description": "Updated description to test PUT endpoint",
  "category": "Operations",
  "tags": "test, hurricane, preparation, updated",
  "isActive": true,
  "items": [
    {
      "itemText": "Stage emergency generators at key facilities",
      "itemType": "checkbox",
      "displayOrder": 10,
      "statusOptions": null,
      "notes": "Test with fuel before deployment"
    },
    {
      "itemText": "Pre-position water and MRE supplies",
      "itemType": "status",
      "displayOrder": 20,
      "statusOptions": "[\"Not Started\", \"In Progress\", \"Complete\"]",
      "notes": null
    },
    {
      "itemText": "NEW ITEM - Coordinate with county EOC",
      "itemType": "checkbox",
      "displayOrder": 30,
      "statusOptions": null,
      "notes": "Added via update"
    }
  ]
}
```

6. Click "Execute"
7. **Expected Result**:
   - Status 200 OK
   - Response shows updated name and new item
   - LastModifiedBy and LastModifiedAt are populated

### Test 6: POST Duplicate Template
1. Get the ID of one of the seed templates (e.g., Safety Briefing)
2. Expand `POST /api/templates/{id}/duplicate`
3. Click "Try it out"
4. Paste the template ID
5. Enter request body:

```json
{
  "newName": "Daily Safety Briefing - Copy for Testing"
}
```

6. Click "Execute"
7. **Expected Result**:
   - Status 201 Created
   - New template with new ID
   - All items copied from original
   - CreatedBy shows current user

### Test 7: DELETE Archive Template
1. Get the ID of the template you created or duplicated
2. Expand `DELETE /api/templates/{id}`
3. Click "Try it out"
4. Paste the template ID
5. Click "Execute"
6. **Expected Result**:
   - Status 204 No Content
7. Try to GET that template again - should still return it but with IsArchived = true
8. Try GET all templates - archived template should NOT appear in the list

## Step 5: Test with PowerShell (Alternative to Swagger)

```powershell
# Get all templates
Invoke-RestMethod -Uri "http://localhost:5000/api/templates" -Method GET | ConvertTo-Json -Depth 10

# Get single template (replace {id} with actual GUID)
Invoke-RestMethod -Uri "http://localhost:5000/api/templates/{id}" -Method GET | ConvertTo-Json -Depth 10

# Get by category
Invoke-RestMethod -Uri "http://localhost:5000/api/templates/category/Safety" -Method GET | ConvertTo-Json -Depth 10

# Create template
$body = @{
    name = "PowerShell Test Template"
    description = "Created via PowerShell"
    category = "Testing"
    tags = "powershell, test"
    items = @(
        @{
            itemText = "Test item 1"
            itemType = "checkbox"
            displayOrder = 10
        }
    )
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Uri "http://localhost:5000/api/templates" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body | ConvertTo-Json -Depth 10
```

## Step 6: Verify Logging

### Console Logs
Check the console where `dotnet watch run` is running. You should see:

```
info: ChecklistAPI.Middleware.MockUserMiddleware[0]
      Mock user context created: admin@cobra.mil (Incident Commander)

info: ChecklistAPI.Services.TemplateService[0]
      Fetching all templates (includeInactive: False)

info: ChecklistAPI.Services.TemplateService[0]
      Retrieved 3 templates

info: ChecklistAPI.Controllers.TemplatesController[0]
      Template {id} created by admin@cobra.mil
```

### Application Insights (if configured)
If you created an App Insights resource:

1. Go to Azure Portal
2. Navigate to your App Insights resource
3. Click "Live Metrics" - should show requests in real-time
4. Click "Logs" and run:

```kusto
requests
| where timestamp > ago(1h)
| project timestamp, name, resultCode, duration
| order by timestamp desc
```

## Step 7: Verify Database Changes

```sql
-- Check templates in database
SELECT
    Name,
    Category,
    IsActive,
    IsArchived,
    CreatedBy,
    CreatedByPosition,
    CreatedAt,
    LastModifiedBy,
    LastModifiedAt
FROM Templates
ORDER BY CreatedAt DESC;

-- Check template items
SELECT
    t.Name AS TemplateName,
    ti.ItemText,
    ti.ItemType,
    ti.DisplayOrder,
    ti.StatusOptions
FROM Templates t
INNER JOIN TemplateItems ti ON t.Id = ti.TemplateId
ORDER BY t.Name, ti.DisplayOrder;

-- Verify user attribution (FEMA compliance)
SELECT
    'All templates have CreatedBy' AS CheckName,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS Result
FROM Templates
WHERE CreatedBy IS NULL OR CreatedBy = '';

SELECT
    'All templates have CreatedByPosition' AS CheckName,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS Result
FROM Templates
WHERE CreatedByPosition IS NULL OR CreatedByPosition = '';
```

## Expected Test Results Summary

| Test | Expected Result | Notes |
|------|----------------|-------|
| GET all templates | 3 templates returned | Seed data loaded |
| GET single template | Template with items | Items ordered by DisplayOrder |
| GET by category | Filtered results | Case-insensitive |
| POST create | 201 Created | User attribution automatic |
| PUT update | 200 OK | LastModified fields populated |
| Duplicate | 201 Created | New ID, same items |
| DELETE archive | 204 No Content | Soft delete, not removed |

## Troubleshooting

### Issue: Validation errors on POST/PUT
**Solution**: Check that:
- `itemType` is exactly "checkbox" or "status"
- `displayOrder` is a positive integer
- Required fields are not empty

### Issue: 404 Not Found on GET
**Solution**:
- Verify template ID is a valid GUID
- Check if template is archived (won't show in GET all by default)

### Issue: No user attribution
**Solution**:
- Check that MockUserMiddleware is registered in Program.cs
- Verify middleware is called BEFORE UseAuthorization()
- Check appsettings.json has MockAuth:Enabled = true

### Issue: Database connection errors
**Solution**:
- Verify SQL Server is running
- Check connection string in appsettings.json
- Ensure database "ChecklistPOC" exists
- Run migrations: `dotnet ef database update`

## Next Steps

Once all tests pass:
1. ✅ Backend API is fully functional
2. ✅ Ready for frontend integration
3. Next: Create frontend components to consume these APIs
4. Next: Implement SignalR hub for real-time updates
5. Next: Create ChecklistInstance CRUD operations

## Troubleshooting the Integration Tests

### Common Issues

**"API is not running"**
```powershell
# Make sure the backend is running:
cd src/backend/ChecklistAPI
dotnet run
```

**SSL Certificate Errors**
- The script uses `-SkipCertificateCheck` to bypass local dev cert issues
- This is normal for local development with self-signed certificates

**Test Failures**
- Check the console output where the API is running for error details
- Look for Application Insights telemetry in the logs
- Failed tests will show the HTTP status code and error message

**Seed Data Missing**
```powershell
# Re-run the seed script:
sqlcmd -S localhost -d ChecklistPOC -i database\seed-templates.sql -E -C
```

---

## Monitoring Logs During Tests

When running the integration tests, watch the API console output for structured logging:

**Expected log output:**
```
[Information] Fetching all templates (includeInactive: False)
[Information] Retrieved 3 templates
[Information] Fetching template {templateId}
[Information] Creating template 'Test Template...' by test-user@cobra.mil (Integration Test Runner)
[Information] Created template {templateId} with 2 items
[Information] Updating template {templateId} by test-user@cobra.mil
[Information] Updated template {templateId} with 1 items
[Information] Duplicating template {templateId} as 'DUPLICATE - ...'
[Information] Duplicated template {originalId} to {newId}
[Information] Archiving template {templateId} by test-user@cobra.mil
[Information] Archived template {templateId}
```

All operations include user attribution (createdBy, lastModifiedBy) from the mock user headers.

---

## Questions or Issues?

- Check Application Insights logs for detailed error tracking
- Review console output for service-layer logging
- Use SQL Profiler to see generated queries
- Swagger UI includes schema documentation for all DTOs
- Run tests with `-Verbose` flag for detailed HTTP request/response info
