/**
 * System Settings Service Implementation
 *
 * Manages customer-level configuration settings.
 * Secrets are stored with optional encryption (simplified for POC).
 */

using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using CobraAPI.Core.Data;

namespace CobraAPI.Core.Services;

public class SystemSettingsService : ISystemSettingsService
{
    private readonly CobraDbContext _context;
    private readonly ILogger<SystemSettingsService> _logger;

    // Mask pattern for secrets
    private const string SecretMask = "••••••••";

    public SystemSettingsService(
        CobraDbContext context,
        ILogger<SystemSettingsService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<List<SystemSettingDto>> GetAllSettingsAsync(SettingCategory? category = null)
    {
        var query = _context.SystemSettings.AsNoTracking();

        if (category.HasValue)
        {
            query = query.Where(s => s.Category == category.Value);
        }

        var settings = await query
            .OrderBy(s => s.Category)
            .ThenBy(s => s.SortOrder)
            .ThenBy(s => s.DisplayName)
            .ToListAsync();

        return settings.Select(MapToDto).ToList();
    }

    public async Task<SystemSettingDto?> GetSettingByKeyAsync(string key)
    {
        var setting = await _context.SystemSettings
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Key == key);

        return setting != null ? MapToDto(setting) : null;
    }

    public async Task<string?> GetSettingValueAsync(string key)
    {
        var setting = await _context.SystemSettings
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Key == key && s.IsEnabled);

        if (setting == null || string.IsNullOrEmpty(setting.Value))
        {
            return null;
        }

        return setting.Value;
    }

    public async Task<SystemSettingDto> CreateSettingAsync(CreateSystemSettingRequest request, string modifiedBy)
    {
        // Check for duplicate key
        var existing = await _context.SystemSettings
            .FirstOrDefaultAsync(s => s.Key == request.Key);

        if (existing != null)
        {
            throw new InvalidOperationException($"Setting with key '{request.Key}' already exists.");
        }

        var setting = new SystemSetting
        {
            Id = Guid.NewGuid(),
            Key = request.Key,
            Value = request.Value,
            Category = request.Category,
            DisplayName = request.DisplayName,
            Description = request.Description,
            IsSecret = request.IsSecret,
            IsEnabled = request.IsEnabled,
            SortOrder = request.SortOrder,
            ModifiedBy = modifiedBy,
            ModifiedAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow
        };

        _context.SystemSettings.Add(setting);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Created system setting: {Key} by {ModifiedBy}", setting.Key, modifiedBy);

        return MapToDto(setting);
    }

    public async Task<SystemSettingDto?> UpdateSettingAsync(string key, UpdateSystemSettingRequest request, string modifiedBy)
    {
        var setting = await _context.SystemSettings
            .FirstOrDefaultAsync(s => s.Key == key);

        if (setting == null)
        {
            return null;
        }

        // Update fields if provided
        if (request.Value != null)
        {
            setting.Value = request.Value;
        }

        if (request.DisplayName != null)
        {
            setting.DisplayName = request.DisplayName;
        }

        if (request.Description != null)
        {
            setting.Description = request.Description;
        }

        if (request.IsEnabled.HasValue)
        {
            setting.IsEnabled = request.IsEnabled.Value;
        }

        if (request.SortOrder.HasValue)
        {
            setting.SortOrder = request.SortOrder.Value;
        }

        setting.ModifiedBy = modifiedBy;
        setting.ModifiedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Updated system setting: {Key} by {ModifiedBy}", key, modifiedBy);

        return MapToDto(setting);
    }

    public async Task<SystemSettingDto?> UpdateSettingValueAsync(string key, string value, string modifiedBy)
    {
        var setting = await _context.SystemSettings
            .FirstOrDefaultAsync(s => s.Key == key);

        if (setting == null)
        {
            return null;
        }

        setting.Value = value;
        setting.ModifiedBy = modifiedBy;
        setting.ModifiedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Updated system setting value: {Key} by {ModifiedBy}", key, modifiedBy);

        return MapToDto(setting);
    }

    public async Task<bool> DeleteSettingAsync(string key)
    {
        var setting = await _context.SystemSettings
            .FirstOrDefaultAsync(s => s.Key == key);

        if (setting == null)
        {
            return false;
        }

        _context.SystemSettings.Remove(setting);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Deleted system setting: {Key}", key);

        return true;
    }

    public async Task<bool> HasSettingAsync(string key)
    {
        return await _context.SystemSettings
            .AnyAsync(s => s.Key == key && s.IsEnabled && !string.IsNullOrEmpty(s.Value));
    }

    public async Task InitializeDefaultSettingsAsync(string modifiedBy)
    {
        var defaultSettings = new List<SystemSetting>
        {
            // GroupMe integration settings
            new SystemSetting
            {
                Id = Guid.NewGuid(),
                Key = SystemSettingKeys.GroupMeAccessToken,
                Value = "",
                Category = SettingCategory.Integration,
                DisplayName = "GroupMe Access Token",
                Description = "API access token for GroupMe integration. Get this from dev.groupme.com.",
                IsSecret = true,
                IsEnabled = true,
                SortOrder = 1,
                ModifiedBy = modifiedBy,
                ModifiedAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow
            },
            // Note: GroupMe.WebhookBaseUrl is NOT stored in database - it comes from appsettings.json
            // This is infrastructure configuration, not a user-configurable setting.
            // The Admin UI displays the computed webhook callback URL as read-only.

            // Future AI settings
            new SystemSetting
            {
                Id = Guid.NewGuid(),
                Key = SystemSettingKeys.OpenAiApiKey,
                Value = "",
                Category = SettingCategory.AI,
                DisplayName = "OpenAI API Key",
                Description = "API key for OpenAI services. Used for COBRA AI features.",
                IsSecret = true,
                IsEnabled = false, // Disabled until AI features are implemented
                SortOrder = 1,
                ModifiedBy = modifiedBy,
                ModifiedAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow
            },
            new SystemSetting
            {
                Id = Guid.NewGuid(),
                Key = SystemSettingKeys.AzureOpenAiEndpoint,
                Value = "",
                Category = SettingCategory.AI,
                DisplayName = "Azure OpenAI Endpoint",
                Description = "Endpoint URL for Azure OpenAI service.",
                IsSecret = false,
                IsEnabled = false,
                SortOrder = 2,
                ModifiedBy = modifiedBy,
                ModifiedAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow
            },
            new SystemSetting
            {
                Id = Guid.NewGuid(),
                Key = SystemSettingKeys.AzureOpenAiApiKey,
                Value = "",
                Category = SettingCategory.AI,
                DisplayName = "Azure OpenAI API Key",
                Description = "API key for Azure OpenAI service.",
                IsSecret = true,
                IsEnabled = false,
                SortOrder = 3,
                ModifiedBy = modifiedBy,
                ModifiedAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow
            }
        };

        foreach (var setting in defaultSettings)
        {
            var exists = await _context.SystemSettings.AnyAsync(s => s.Key == setting.Key);
            if (!exists)
            {
                _context.SystemSettings.Add(setting);
                _logger.LogInformation("Initialized default setting: {Key}", setting.Key);
            }
        }

        await _context.SaveChangesAsync();
    }

    private SystemSettingDto MapToDto(SystemSetting setting)
    {
        return new SystemSettingDto
        {
            Id = setting.Id,
            Key = setting.Key,
            // Mask secret values
            Value = setting.IsSecret && !string.IsNullOrEmpty(setting.Value) ? SecretMask : setting.Value,
            Category = setting.Category,
            DisplayName = setting.DisplayName,
            Description = setting.Description,
            IsSecret = setting.IsSecret,
            IsEnabled = setting.IsEnabled,
            SortOrder = setting.SortOrder,
            ModifiedBy = setting.ModifiedBy,
            ModifiedAt = setting.ModifiedAt,
            HasValue = !string.IsNullOrEmpty(setting.Value)
        };
    }
}
