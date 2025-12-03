using CobraAPI.Core.Models;
using Microsoft.EntityFrameworkCore;

namespace CobraAPI.Core.Middleware;

/// <summary>
/// MockUserMiddleware - Simulates authentication for POC development
///
/// Purpose:
///   Provides a mock authenticated user context without requiring
///   real authentication infrastructure (Azure AD, OAuth, etc.).
///   This is ONLY for POC demonstration purposes.
///
/// How It Works:
///   1. Reads mock user settings from appsettings.json (MockAuth section)
///   2. Creates a UserContext with configured user details
///   3. Resolves position names to position IDs from the database
///   4. Injects UserContext into HttpContext.Items for controller access
///   5. Logs user context creation for debugging
///
/// Production Replacement:
///   In production, replace this with real authentication middleware that:
///   - Validates JWT tokens or OAuth claims
///   - Extracts user info from claims
///   - Integrates with Azure AD or similar
///
/// Configuration (appsettings.json):
///   {
///     "MockAuth": {
///       "Enabled": true,
///       "DefaultUser": "admin@cobra.mil",
///       "DefaultPosition": "Incident Commander"
///     }
///   }
///
/// Usage in Controllers:
///   var userContext = HttpContext.Items["UserContext"] as UserContext;
///
/// Author: Checklist POC Team
/// Last Modified: 2025-11-19
/// </summary>
public class MockUserMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<MockUserMiddleware> _logger;
    private readonly IConfiguration _configuration;
    private readonly IServiceScopeFactory _scopeFactory;

    public MockUserMiddleware(
        RequestDelegate next,
        ILogger<MockUserMiddleware> logger,
        IConfiguration configuration,
        IServiceScopeFactory scopeFactory)
    {
        _next = next;
        _logger = logger;
        _configuration = configuration;
        _scopeFactory = scopeFactory;
    }

    /// <summary>
    /// Processes the HTTP request and injects mock user context
    /// </summary>
    /// <param name="context">Current HTTP context</param>
    public async Task InvokeAsync(HttpContext context)
    {
        // Check if mock auth is enabled
        var mockAuthEnabled = _configuration.GetValue<bool>("MockAuth:Enabled", true);

        if (mockAuthEnabled)
        {
            // Try to read from custom headers first (for testing), then fall back to config
            var email = context.Request.Headers["X-User-Email"].FirstOrDefault()
                        ?? _configuration["MockAuth:DefaultUser"]
                        ?? "admin@cobra.mil";

            var fullName = context.Request.Headers["X-User-FullName"].FirstOrDefault()
                           ?? ExtractNameFromEmail(email);

            var positionHeader = context.Request.Headers["X-User-Position"].FirstOrDefault()
                           ?? _configuration["MockAuth:DefaultPosition"]
                           ?? "Incident Commander";

            // Parse positions - can be comma-separated for multiple positions
            var positions = positionHeader
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .ToList();

            // Primary position is the first one
            var position = positions.FirstOrDefault() ?? "Incident Commander";

            var isAdminStr = context.Request.Headers["X-User-IsAdmin"].FirstOrDefault();
            var isAdmin = !string.IsNullOrEmpty(isAdminStr) && bool.Parse(isAdminStr);

            // If no header provided, default to true for POC
            if (string.IsNullOrEmpty(isAdminStr))
            {
                isAdmin = true; // POC: All mock users are admins by default
            }

            // Parse permission role from header (Readonly, Contributor, Manage, SystemAdmin)
            var roleStr = context.Request.Headers["X-User-Role"].FirstOrDefault();
            var role = PermissionRole.Contributor; // Default to Contributor
            if (!string.IsNullOrEmpty(roleStr))
            {
                if (Enum.TryParse<PermissionRole>(roleStr, true, out var parsedRole))
                {
                    role = parsedRole;
                }
                else
                {
                    _logger.LogWarning("Invalid role value '{Role}', defaulting to Contributor", roleStr);
                }
            }

            // Check for SysAdmin - requires explicit header OR session-based authentication
            var isSysAdminStr = context.Request.Headers["X-User-IsSysAdmin"].FirstOrDefault();
            var isSysAdmin = !string.IsNullOrEmpty(isSysAdminStr) && bool.Parse(isSysAdminStr);

            // Organization ID - POC uses a fixed default organization
            // In production, this would come from the authenticated user's claims
            var defaultOrgId = Guid.Parse("00000000-0000-0000-0000-000000000001");
            var orgIdStr = context.Request.Headers["X-User-OrganizationId"].FirstOrDefault();
            var organizationId = !string.IsNullOrEmpty(orgIdStr) && Guid.TryParse(orgIdStr, out var parsedOrgId)
                ? parsedOrgId
                : defaultOrgId;

            // Resolve position names to position IDs from the database
            var positionIds = new List<Guid>();
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var dbContext = scope.ServiceProvider.GetRequiredService<CobraDbContext>();

                // Find positions by matching translation names (case-insensitive)
                var positionEntities = await dbContext.Positions
                    .Include(p => p.Translations)
                    .Where(p => p.OrganizationId == organizationId && p.IsActive)
                    .ToListAsync();

                foreach (var positionName in positions)
                {
                    var matchingPosition = positionEntities.FirstOrDefault(p =>
                        p.Translations.Any(t =>
                            t.Name.Equals(positionName, StringComparison.OrdinalIgnoreCase)));

                    if (matchingPosition != null)
                    {
                        positionIds.Add(matchingPosition.Id);
                    }
                }
            }
            catch (Exception ex)
            {
                // Log but don't fail - positions may not exist in DB yet
                _logger.LogWarning(ex,
                    "Failed to resolve position IDs from database. Position-based channel filtering may not work.");
            }

            // Create mock user context
            var userContext = new UserContext
            {
                Email = email,
                FullName = fullName,
                Position = position,
                Positions = positions,
                PositionIds = positionIds,
                IsAdmin = isAdmin,
                IsSysAdmin = isSysAdmin,
                Role = role,
                OrganizationId = organizationId,
                CurrentEventId = null, // Could be set from query string in future
                CurrentOperationalPeriod = null
            };

            // Inject into HttpContext for controller access
            context.Items["UserContext"] = userContext;

            // Log for debugging
            _logger.LogInformation(
                "Mock user context created: {Email} (Positions: {Positions}, PositionIds: {PositionIds}, Role: {Role}, SysAdmin: {IsSysAdmin})",
                userContext.Email,
                string.Join(", ", userContext.Positions),
                string.Join(", ", userContext.PositionIds),
                userContext.Role,
                userContext.IsSysAdmin
            );
        }
        else
        {
            _logger.LogWarning("MockAuth is disabled but no real auth is configured!");
        }

        // Continue to next middleware
        await _next(context);
    }

    /// <summary>
    /// Extracts a display name from an email address
    /// Example: "john.smith@cobra.mil" -> "John Smith"
    /// </summary>
    private string ExtractNameFromEmail(string email)
    {
        if (string.IsNullOrEmpty(email))
            return "Unknown User";

        // Get the local part before @
        var localPart = email.Split('@')[0];

        // Replace dots/underscores with spaces and title case
        var name = localPart.Replace('.', ' ').Replace('_', ' ');
        return System.Globalization.CultureInfo.CurrentCulture.TextInfo.ToTitleCase(name);
    }
}
