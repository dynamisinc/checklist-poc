/**
 * System Settings DTOs
 *
 * Data transfer objects for system settings API operations.
 * Secrets are masked in responses unless explicitly requested.
 */

using System.ComponentModel.DataAnnotations;

namespace CobraAPI.Admin.Models;

/// <summary>
/// DTO for displaying system settings (values may be masked for secrets)
/// </summary>
public record SystemSettingDto
{
    public Guid Id { get; init; }
    public string Key { get; init; } = string.Empty;
    public string Value { get; init; } = string.Empty;
    public SettingCategory Category { get; init; }
    public string CategoryName => Category.ToString();
    public string DisplayName { get; init; } = string.Empty;
    public string? Description { get; init; }
    public bool IsSecret { get; init; }
    public bool IsEnabled { get; init; }
    public int SortOrder { get; init; }
    public string ModifiedBy { get; init; } = string.Empty;
    public DateTime ModifiedAt { get; init; }
    public bool HasValue { get; init; }
}

/// <summary>
/// DTO for creating a new system setting
/// </summary>
public record CreateSystemSettingRequest
{
    [Required]
    [MaxLength(100)]
    public string Key { get; init; } = string.Empty;

    public string Value { get; init; } = string.Empty;

    [Required]
    public SettingCategory Category { get; init; }

    [Required]
    [MaxLength(200)]
    public string DisplayName { get; init; } = string.Empty;

    [MaxLength(500)]
    public string? Description { get; init; }

    public bool IsSecret { get; init; }

    public bool IsEnabled { get; init; } = true;

    public int SortOrder { get; init; }
}

/// <summary>
/// DTO for updating an existing system setting
/// </summary>
public record UpdateSystemSettingRequest
{
    public string? Value { get; init; }

    [MaxLength(200)]
    public string? DisplayName { get; init; }

    [MaxLength(500)]
    public string? Description { get; init; }

    public bool? IsEnabled { get; init; }

    public int? SortOrder { get; init; }
}

/// <summary>
/// DTO for updating just the value of a setting
/// </summary>
public record UpdateSettingValueRequest
{
    [Required]
    public string Value { get; init; } = string.Empty;
}

/// <summary>
/// Predefined setting keys for easy reference
/// </summary>
public static class SystemSettingKeys
{
    // Integration settings
    public const string GroupMeAccessToken = "GroupMe.AccessToken";
    public const string GroupMeBaseUrl = "GroupMe.BaseUrl";
    // Note: GroupMeWebhookBaseUrl is NOT stored in database - it comes from appsettings.json

    // AI settings (future)
    public const string OpenAiApiKey = "OpenAI.ApiKey";
    public const string OpenAiOrganizationId = "OpenAI.OrganizationId";
    public const string AzureOpenAiEndpoint = "AzureOpenAI.Endpoint";
    public const string AzureOpenAiApiKey = "AzureOpenAI.ApiKey";
    public const string AzureOpenAiDeploymentName = "AzureOpenAI.DeploymentName";

    // System settings
    public const string SystemMaintenanceMode = "System.MaintenanceMode";
}
