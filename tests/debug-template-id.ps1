$template = Invoke-RestMethod -Uri 'http://localhost:5000/api/templates' -Headers @{'X-User-Email'='admin@cobra.mil'; 'X-User-FullName'='Admin User'; 'X-User-Position'='Incident Commander'; 'X-User-IsAdmin'='true'} | Select-Object -First 1
Write-Host "Template ID: '$($template.id)'"
Write-Host "ID Type: $($template.id.GetType().Name)"
Write-Host "ID Length: $($template.id.Length)"
Write-Host "ID as bytes: $([System.Text.Encoding]::UTF8.GetBytes($template.id) -join ',')"
