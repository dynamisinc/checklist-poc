# First, let's archive a specific template
$templates = Invoke-RestMethod -Uri 'http://localhost:5000/api/templates' -Headers @{'X-User-Email'='admin@cobra.mil'; 'X-User-FullName'='Admin User'; 'X-User-Position'='Incident Commander'; 'X-User-IsAdmin'='true'}
$templateToArchive = $templates[0]
Write-Host "Archiving template: $($templateToArchive.id)"
Write-Host "Template name: $($templateToArchive.name)"

# Archive it
Invoke-RestMethod -Method DELETE -Uri "http://localhost:5000/api/templates/$($templateToArchive.id)" -Headers @{'X-User-Email'='admin@cobra.mil'; 'X-User-FullName'='Admin User'; 'X-User-Position'='Incident Commander'; 'X-User-IsAdmin'='true'}

# Now get archived templates
Write-Host "`nFetching archived templates..."
$archived = Invoke-RestMethod -Uri 'http://localhost:5000/api/templates/archived' -Headers @{'X-User-Email'='admin@cobra.mil'; 'X-User-FullName'='Admin User'; 'X-User-Position'='Incident Commander'; 'X-User-IsAdmin'='true'}

Write-Host "Archived response type: $($archived.GetType().Name)"
Write-Host "Is array: $($archived -is [array])"
Write-Host "Count: $(if ($archived -is [array]) { $archived.Count } else { 1 })"

if ($archived -is [array] -and $archived.Count -gt 0) {
    Write-Host "`nFirst archived template:"
    Write-Host "  ID: $($archived[0].id)"
    Write-Host "  Name: $($archived[0].name)"
    Write-Host "  IsArchived: $($archived[0].isArchived)"
    Write-Host "  ArchivedBy: $($archived[0].archivedBy)"

    Write-Host "`nSearching for template ID: $($templateToArchive.id)"
    $found = $archived | Where-Object { $_.id -eq $templateToArchive.id }
    Write-Host "Found: $($null -ne $found)"
    if ($found) {
        Write-Host "  Found ID: $($found.id)"
    }
} elseif ($archived) {
    Write-Host "`nSingle archived template:"
    Write-Host "  ID: $($archived.id)"
    Write-Host "  Name: $($archived.name)"
}
