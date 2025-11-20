# Soft Delete Pattern - Templates & Checklists

## Overview

The Checklist POC implements a **soft delete pattern** for both templates and checklist instances. This provides safety, auditability, and recoverability for accidentally deleted data.

## Why Soft Delete?

### User Protection
- **Prevents accidental data loss** - Users can recover from mistakes
- **30-day undo window** - Gives time to realize deletion was unintended
- **Forgiving UX** - Critical for infrequent users under stress (ICS operators)

### Audit & Compliance
- **Complete audit trail** - WHO deleted WHAT and WHEN
- **Regulatory compliance** - Many industries require retention of deleted records
- **Historical tracking** - Understand what templates/checklists were used and when

### Operational Safety
- **Emergency recovery** - Admins can restore critical templates during incidents
- **Template evolution** - Track how templates change over time
- **Reference preservation** - Old checklists reference deleted templates

## Implementation

### Database Schema

Both `Templates` and `ChecklistInstances` tables include:

```sql
-- Soft delete fields
IsArchived       BIT           NOT NULL DEFAULT 0,
ArchivedBy       NVARCHAR(255) NULL,
ArchivedAt       DATETIME2     NULL,
```

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       User Delete Action                        │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
         ┌────────────────────────────┐
         │  DELETE /api/templates/{id} │
         │         (Soft Delete)        │
         └────────────┬─────────────────┘
                      │
                      ▼
              ┌───────────────────┐
              │ Set IsArchived=1  │
              │ Set ArchivedBy    │
              │ Set ArchivedAt    │
              └───────────────────┘
                      │
        ┌─────────────┴──────────────┐
        │                            │
        ▼                            ▼
┌──────────────┐           ┌─────────────────┐
│ Hidden from  │           │  Audit trail    │
│ normal lists │           │  preserved      │
└──────────────┘           └─────────────────┘
        │                            │
        └─────────────┬──────────────┘
                      │
          ┌───────────┴────────────┐
          │                        │
          ▼                        ▼
  ┌──────────────┐      ┌──────────────────────┐
  │ Admin views  │      │ Admin can restore OR │
  │ in Archived  │      │ permanently delete   │
  │    section   │      └──────────────────────┘
  └──────────────┘
```

## API Endpoints

### Templates API

#### For All Users

```http
DELETE /api/templates/{id}
```
**Soft delete (archive) a template**
- Sets `IsArchived = true`
- Records `ArchivedBy` and `ArchivedAt`
- Template disappears from active lists
- Returns `204 No Content`

---

#### Admin-Only Operations

```http
GET /api/templates/archived
```
**Get all archived templates**
- Only accessible by admins (`IsAdmin = true`)
- Returns list of archived templates
- Returns `403 Forbidden` for non-admins

```http
POST /api/templates/{id}/restore
```
**Restore an archived template**
- Sets `IsArchived = false`
- Clears `ArchivedBy` and `ArchivedAt`
- Template reappears in active lists
- Returns `204 No Content`
- Returns `403 Forbidden` for non-admins

```http
DELETE /api/templates/{id}/permanent
```
**PERMANENTLY delete a template**
- **CANNOT BE UNDONE!**
- Deletes template and all items from database
- Only for cleaning up old/test data
- Comprehensive audit logging (WARN level)
- Returns `204 No Content`
- Returns `403 Forbidden` for non-admins

---

### Checklist Instances API

The same pattern applies to checklist instances:

```http
DELETE /api/checklists/{id}           # Soft delete (archive)
GET /api/checklists/archived          # Get archived (Admin only)
POST /api/checklists/{id}/restore     # Restore (Admin only)
DELETE /api/checklists/{id}/permanent # Permanent delete (Admin only)
```

## Authorization

### User Context

The mock user middleware provides:

```csharp
public class UserContext
{
    public string Email { get; set; }
    public string FullName { get; set; }
    public string Position { get; set; }
    public bool IsAdmin { get; set; }  // ← Controls admin operations
}
```

### Admin Detection (POC)

For the POC, admins are identified by:

```csharp
// In MockUserMiddleware.cs
IsAdmin = position.Contains("Commander", StringComparison.OrdinalIgnoreCase) ||
          position.Contains("Chief", StringComparison.OrdinalIgnoreCase) ||
          position.Contains("Admin", StringComparison.OrdinalIgnoreCase)
```

**Production**: Replace with real role-based authorization (Azure AD groups, etc.)

### Authorization Checks

```csharp
// In TemplatesController.cs
public async Task<IActionResult> PermanentlyDeleteTemplate(Guid id)
{
    var userContext = GetUserContext();

    if (!userContext.IsAdmin)
    {
        _logger.LogError(
            "Non-admin user {User} attempted permanent delete of template {TemplateId}",
            userContext.Email,
            id);
        return Forbid(); // Returns HTTP 403
    }

    // ... perform deletion
}
```

## Service Layer Implementation

### Soft Delete (Archive)

```csharp
public async Task<bool> ArchiveTemplateAsync(Guid id, UserContext userContext)
{
    var template = await _context.Templates.FindAsync(id);

    if (template == null)
        return false;

    template.IsArchived = true;
    template.ArchivedBy = userContext.Email;
    template.ArchivedAt = DateTime.UtcNow;

    await _context.SaveChangesAsync();

    _logger.LogInformation("Archived template {TemplateId}", id);
    return true;
}
```

### Restore

```csharp
public async Task<bool> RestoreTemplateAsync(Guid id, UserContext userContext)
{
    var template = await _context.Templates.FindAsync(id);

    if (template == null)
        return false;

    template.IsArchived = false;
    template.ArchivedBy = null;
    template.ArchivedAt = null;
    template.LastModifiedBy = userContext.Email;
    template.LastModifiedByPosition = userContext.Position;
    template.LastModifiedAt = DateTime.UtcNow;

    await _context.SaveChangesAsync();

    _logger.LogInformation("Restored template {TemplateId}", id);
    return true;
}
```

### Permanent Delete

```csharp
public async Task<bool> PermanentlyDeleteTemplateAsync(Guid id, UserContext userContext)
{
    _logger.LogWarning(
        "PERMANENT DELETE requested for template {TemplateId} by {User} (Admin: {IsAdmin})",
        id,
        userContext.Email,
        userContext.IsAdmin);

    if (!userContext.IsAdmin)
    {
        throw new UnauthorizedAccessException(
            "Only administrators can permanently delete templates");
    }

    var template = await _context.Templates
        .Include(t => t.Items)
        .FirstOrDefaultAsync(t => t.Id == id);

    if (template == null)
        return false;

    // CRITICAL: Log what we're about to delete
    _logger.LogWarning(
        "PERMANENTLY DELETING template {TemplateId} '{TemplateName}' with {ItemCount} items by admin {User}",
        id,
        template.Name,
        template.Items.Count,
        userContext.Email);

    _context.Templates.Remove(template);
    await _context.SaveChangesAsync();

    _logger.LogWarning("Template {TemplateId} permanently deleted", id);
    return true;
}
```

## Logging Strategy

### Soft Delete
- **Level**: `Information`
- **Why**: Normal operation, not destructive

```
[Information] Archiving template {TemplateId} by {User}
[Information] Archived template {TemplateId}
```

### Restore
- **Level**: `Information`
- **Why**: Recoverable operation

```
[Information] Restoring archived template {TemplateId} by {User}
[Information] Restored template {TemplateId}
```

### Permanent Delete
- **Level**: `Warning`
- **Why**: Irreversible, needs audit trail, should be rare

```
[Warning] PERMANENT DELETE requested for template {TemplateId} by {User} (Admin: True)
[Warning] PERMANENTLY DELETING template {TemplateId} 'Daily Safety Briefing' with 7 items by admin admin@cobra.mil
[Warning] Template {TemplateId} permanently deleted
```

### Unauthorized Attempts
- **Level**: `Error`
- **Why**: Security concern

```
[Error] Non-admin user regular-user@cobra.mil attempted permanent delete of template {TemplateId}
[Error] Unauthorized permanent delete attempt by non-admin user {User}
```

## Query Patterns

### Exclude Archived by Default

```csharp
// ✅ CORRECT: Filters out archived templates
public async Task<List<TemplateDto>> GetAllTemplatesAsync(bool includeInactive = false)
{
    var query = _context.Templates
        .Include(t => t.Items.OrderBy(i => i.DisplayOrder))
        .Where(t => !t.IsArchived); // ← Always filter archived

    if (!includeInactive)
    {
        query = query.Where(t => t.IsActive);
    }

    return await query.ToListAsync();
}
```

### Get Archived Only (Admin)

```csharp
public async Task<List<TemplateDto>> GetArchivedTemplatesAsync()
{
    var templates = await _context.Templates
        .Include(t => t.Items)
        .Where(t => t.IsArchived) // ← Only archived
        .OrderBy(t => t.ArchivedAt) // ← Oldest first
        .AsNoTracking()
        .ToListAsync();

    return templates.Select(MapToDto).ToList();
}
```

### Get By ID (Regardless of Archive Status)

```csharp
// May need to retrieve archived items for restore/admin operations
public async Task<TemplateDto?> GetTemplateByIdAsync(Guid id)
{
    // Does NOT filter by IsArchived
    var template = await _context.Templates
        .Include(t => t.Items)
        .FirstOrDefaultAsync(t => t.Id == id);

    return template == null ? null : MapToDto(template);
}
```

## Frontend UX Patterns

### Template Library Page

**For Regular Users:**
```
┌─────────────────────────────────────────┐
│  Template Library                       │
│  ┌─────────────────────────────────┐   │
│  │ Daily Safety Briefing          │   │
│  │ Category: Safety               │   │
│  │ [Use] [Edit] [Delete]          │   │
│  └─────────────────────────────────┘   │
│                                         │
│  [Delete] → Confirms → Archives         │
│  (Hides from this list)                │
└─────────────────────────────────────────┘
```

**For Admins:**
```
┌─────────────────────────────────────────┐
│  Template Library      [View Archived]  │ ← Admin button
│  ┌─────────────────────────────────┐   │
│  │ Daily Safety Briefing          │   │
│  │ [Use] [Edit] [Delete]          │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘

Clicking [View Archived] →

┌─────────────────────────────────────────┐
│  Archived Templates    [Back to Active] │
│  ┌─────────────────────────────────┐   │
│  │ Old Template (Archived)        │   │
│  │ Deleted: 2024-11-15            │   │
│  │ By: john.doe@cobra.mil         │   │
│  │ [Restore] [Delete Permanently] │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

### Delete Confirmation Dialog

**Soft Delete (All Users):**
```
┌─────────────────────────────────────────┐
│  Delete Template?                       │
│                                         │
│  Are you sure you want to delete        │
│  "Daily Safety Briefing"?               │
│                                         │
│  This template will be archived and     │
│  can be restored by an administrator.   │
│                                         │
│  [Cancel]              [Delete]         │
└─────────────────────────────────────────┘
```

**Permanent Delete (Admin Only):**
```
┌─────────────────────────────────────────┐
│  ⚠️  PERMANENTLY Delete Template?       │
│                                         │
│  This action CANNOT BE UNDONE!          │
│                                         │
│  Template: "Old Test Template"          │
│  Archived: 2024-10-01                   │
│  Items: 5                               │
│                                         │
│  Type "DELETE" to confirm:              │
│  [________________]                     │
│                                         │
│  [Cancel]    [Permanently Delete]       │
└─────────────────────────────────────────┘
```

## Testing

### Test Scenarios

#### Soft Delete
```powershell
# Create test template
POST /api/templates
{
  "name": "Test Template",
  "category": "Testing",
  "items": [...]
}

# Soft delete
DELETE /api/templates/{id}
→ Returns 204 No Content

# Verify it's hidden
GET /api/templates
→ Template NOT in results

# Verify it still exists in database
SELECT * FROM Templates WHERE Id = '{id}'
→ IsArchived = 1, ArchivedBy populated
```

#### Restore (Admin)
```powershell
# Set admin header
X-User-Position: Incident Commander

# Restore template
POST /api/templates/{id}/restore
→ Returns 204 No Content

# Verify it's visible again
GET /api/templates
→ Template IS in results
```

#### Permanent Delete (Admin)
```powershell
# Archive first
DELETE /api/templates/{id}

# Permanent delete (admin)
DELETE /api/templates/{id}/permanent
→ Returns 204 No Content

# Verify it's gone from database
SELECT * FROM Templates WHERE Id = '{id}'
→ No results
```

#### Authorization
```powershell
# Non-admin user tries permanent delete
X-User-Position: Operations Specialist

DELETE /api/templates/{id}/permanent
→ Returns 403 Forbidden
```

## Migration from Other Patterns

### If You Currently Have Hard Deletes

1. **Add columns to database:**
```sql
ALTER TABLE Templates ADD IsArchived BIT NOT NULL DEFAULT 0;
ALTER TABLE Templates ADD ArchivedBy NVARCHAR(255) NULL;
ALTER TABLE Templates ADD ArchivedAt DATETIME2 NULL;

CREATE INDEX IX_Templates_IsArchived ON Templates(IsArchived);
```

2. **Update all queries to filter archived:**
```csharp
// Before
var templates = await _context.Templates.ToListAsync();

// After
var templates = await _context.Templates
    .Where(t => !t.IsArchived)
    .ToListAsync();
```

3. **Replace DELETE calls with soft delete logic**

4. **Add admin endpoints for restore/permanent delete**

## Production Considerations

### Automatic Cleanup

Consider a scheduled job to permanently delete old archived records:

```csharp
// Example: Delete templates archived > 1 year ago
public async Task CleanupOldArchivedTemplatesAsync()
{
    var cutoff = DateTime.UtcNow.AddYears(-1);

    var oldArchived = await _context.Templates
        .Where(t => t.IsArchived && t.ArchivedAt < cutoff)
        .ToListAsync();

    _logger.LogInformation(
        "Auto-cleanup: Permanently deleting {Count} templates archived before {Cutoff}",
        oldArchived.Count,
        cutoff);

    _context.Templates.RemoveRange(oldArchived);
    await _context.SaveChangesAsync();
}
```

### Role-Based Authorization

Replace `IsAdmin` check with proper RBAC:

```csharp
// Example with ASP.NET Core Authorization
[Authorize(Policy = "AdminOnly")]
[HttpDelete("{id:guid}/permanent")]
public async Task<IActionResult> PermanentlyDeleteTemplate(Guid id)
{
    // User.IsInRole("Admin") already verified by [Authorize]
    // ...
}
```

### Application Insights Tracking

Permanent deletes should trigger alerts:

```csharp
_telemetryClient.TrackEvent("PermanentTemplateDelete", new Dictionary<string, string>
{
    { "TemplateId", id.ToString() },
    { "TemplateName", template.Name },
    { "AdminEmail", userContext.Email },
    { "ItemCount", template.Items.Count.ToString() }
});
```

## Benefits Summary

✅ **User Safety**: Accidental deletes are recoverable
✅ **Compliance**: Full audit trail of deletions
✅ **Flexibility**: Admins can restore or permanently remove
✅ **Data Integrity**: Referenced templates remain accessible
✅ **Emergency Recovery**: Critical data can be restored quickly
✅ **Operational Clarity**: Clear separation of regular vs admin operations

## Related Documentation

- `docs/CODING_STANDARDS.md` - Coding conventions
- `docs/TESTING_GUIDE.md` - Testing procedures
- `CLAUDE.md` - Project overview and architecture
