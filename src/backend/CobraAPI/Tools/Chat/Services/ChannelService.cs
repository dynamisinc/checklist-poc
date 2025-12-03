using Microsoft.EntityFrameworkCore;
using CobraAPI.Core.Data;
using CobraAPI.Core.Models;

namespace CobraAPI.Tools.Chat.Services;

/// <summary>
/// Service for managing chat channels within events.
/// Handles CRUD operations and default channel creation.
/// </summary>
public class ChannelService : IChannelService
{
    private readonly CobraDbContext _dbContext;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly ILogger<ChannelService> _logger;

    public ChannelService(
        CobraDbContext dbContext,
        IHttpContextAccessor httpContextAccessor,
        ILogger<ChannelService> logger)
    {
        _dbContext = dbContext;
        _httpContextAccessor = httpContextAccessor;
        _logger = logger;
    }

    private UserContext GetUserContext()
    {
        return _httpContextAccessor.HttpContext?.Items["UserContext"] as UserContext
               ?? throw new UnauthorizedAccessException("User context not found");
    }

    /// <inheritdoc />
    public async Task<List<ChatThreadDto>> GetEventChannelsAsync(Guid eventId)
    {
        var channels = await _dbContext.ChatThreads
            .Include(ct => ct.ExternalChannelMapping)
            .Include(ct => ct.Messages.Where(m => m.IsActive))
            .Where(ct => ct.EventId == eventId && ct.IsActive)
            .OrderBy(ct => ct.DisplayOrder)
            .ThenBy(ct => ct.CreatedAt)
            .ToListAsync();

        return channels.Select(MapToDto).ToList();
    }

    /// <inheritdoc />
    public async Task<ChatThreadDto?> GetChannelAsync(Guid channelId)
    {
        var channel = await _dbContext.ChatThreads
            .Include(ct => ct.ExternalChannelMapping)
            .Include(ct => ct.Messages.Where(m => m.IsActive))
            .Where(ct => ct.Id == channelId && ct.IsActive)
            .FirstOrDefaultAsync();

        return channel != null ? MapToDto(channel) : null;
    }

    /// <inheritdoc />
    public async Task<ChatThreadDto> CreateChannelAsync(CreateChannelRequest request)
    {
        var userContext = GetUserContext();
        var now = DateTime.UtcNow;

        // Get max display order for this event
        var maxOrder = await _dbContext.ChatThreads
            .Where(ct => ct.EventId == request.EventId && ct.IsActive)
            .MaxAsync(ct => (int?)ct.DisplayOrder) ?? -1;

        var channel = new ChatThread
        {
            Id = Guid.NewGuid(),
            EventId = request.EventId,
            Name = request.Name,
            Description = request.Description,
            ChannelType = request.ChannelType,
            DisplayOrder = maxOrder + 1,
            IconName = request.IconName,
            Color = request.Color,
            IsDefaultEventThread = false,
            IsActive = true,
            CreatedBy = userContext.Email,
            CreatedAt = now
        };

        _dbContext.ChatThreads.Add(channel);
        await _dbContext.SaveChangesAsync();

        _logger.LogInformation(
            "Created channel {ChannelId} '{Name}' of type {Type} for event {EventId}",
            channel.Id, channel.Name, channel.ChannelType, request.EventId);

        return MapToDto(channel);
    }

    /// <inheritdoc />
    public async Task CreateDefaultChannelsAsync(Guid eventId, string createdBy)
    {
        var now = DateTime.UtcNow;

        var defaultChannels = new List<ChatThread>
        {
            new ChatThread
            {
                Id = Guid.NewGuid(),
                EventId = eventId,
                Name = "Event Chat",
                Description = "General event discussion for all participants",
                ChannelType = ChannelType.Internal,
                DisplayOrder = 0,
                IconName = "comments",
                IsDefaultEventThread = true,
                IsActive = true,
                CreatedBy = createdBy,
                CreatedAt = now
            },
            new ChatThread
            {
                Id = Guid.NewGuid(),
                EventId = eventId,
                Name = "Announcements",
                Description = "Important announcements from event leadership",
                ChannelType = ChannelType.Announcements,
                DisplayOrder = 1,
                IconName = "bullhorn",
                IsDefaultEventThread = false,
                IsActive = true,
                CreatedBy = createdBy,
                CreatedAt = now
            }
        };

        _dbContext.ChatThreads.AddRange(defaultChannels);
        await _dbContext.SaveChangesAsync();

        _logger.LogInformation(
            "Created {Count} default channels for event {EventId}",
            defaultChannels.Count, eventId);
    }

    /// <inheritdoc />
    public async Task<ChatThreadDto?> UpdateChannelAsync(Guid channelId, UpdateChannelRequest request)
    {
        var channel = await _dbContext.ChatThreads
            .Include(ct => ct.ExternalChannelMapping)
            .FirstOrDefaultAsync(ct => ct.Id == channelId && ct.IsActive);

        if (channel == null)
        {
            return null;
        }

        // Update only provided fields
        if (request.Name != null)
        {
            channel.Name = request.Name;
        }

        if (request.Description != null)
        {
            channel.Description = request.Description;
        }

        if (request.IconName != null)
        {
            channel.IconName = request.IconName;
        }

        if (request.Color != null)
        {
            channel.Color = request.Color;
        }

        await _dbContext.SaveChangesAsync();

        _logger.LogInformation("Updated channel {ChannelId}", channelId);

        return MapToDto(channel);
    }

    /// <inheritdoc />
    public async Task ReorderChannelsAsync(Guid eventId, List<Guid> orderedChannelIds)
    {
        var channels = await _dbContext.ChatThreads
            .Where(ct => ct.EventId == eventId && ct.IsActive)
            .ToListAsync();

        for (int i = 0; i < orderedChannelIds.Count; i++)
        {
            var channel = channels.FirstOrDefault(c => c.Id == orderedChannelIds[i]);
            if (channel != null)
            {
                channel.DisplayOrder = i;
            }
        }

        await _dbContext.SaveChangesAsync();

        _logger.LogInformation(
            "Reordered {Count} channels for event {EventId}",
            orderedChannelIds.Count, eventId);
    }

    /// <inheritdoc />
    public async Task<bool> DeleteChannelAsync(Guid channelId)
    {
        var channel = await _dbContext.ChatThreads
            .FirstOrDefaultAsync(ct => ct.Id == channelId && ct.IsActive);

        if (channel == null)
        {
            return false;
        }

        // Cannot delete default event channel
        if (channel.IsDefaultEventThread)
        {
            _logger.LogWarning(
                "Cannot delete default event channel {ChannelId}",
                channelId);
            return false;
        }

        // Cannot delete external channels (should be deactivated via external channel mapping)
        if (channel.ChannelType == ChannelType.External)
        {
            _logger.LogWarning(
                "Cannot delete external channel {ChannelId}. Deactivate the external mapping instead.",
                channelId);
            return false;
        }

        // Soft delete
        channel.IsActive = false;
        await _dbContext.SaveChangesAsync();

        _logger.LogInformation("Deleted (soft) channel {ChannelId}", channelId);

        return true;
    }

    /// <inheritdoc />
    public async Task<List<ChatThreadDto>> GetAllEventChannelsAsync(Guid eventId, bool includeArchived = true)
    {
        var query = _dbContext.ChatThreads
            .Include(ct => ct.ExternalChannelMapping)
            .Include(ct => ct.Messages.Where(m => m.IsActive))
            .Where(ct => ct.EventId == eventId);

        if (!includeArchived)
        {
            query = query.Where(ct => ct.IsActive);
        }

        var channels = await query
            .OrderBy(ct => ct.DisplayOrder)
            .ThenBy(ct => ct.CreatedAt)
            .ToListAsync();

        return channels.Select(MapToDto).ToList();
    }

    /// <inheritdoc />
    public async Task<List<ChatThreadDto>> GetArchivedChannelsAsync(Guid eventId)
    {
        var channels = await _dbContext.ChatThreads
            .Include(ct => ct.ExternalChannelMapping)
            .Include(ct => ct.Messages.Where(m => m.IsActive))
            .Where(ct => ct.EventId == eventId && !ct.IsActive)
            // Exclude permanently deleted channels (those with [DELETED] prefix)
            .Where(ct => !ct.Name.StartsWith("[DELETED]"))
            .OrderBy(ct => ct.Name)
            .ToListAsync();

        return channels.Select(MapToDto).ToList();
    }

    /// <inheritdoc />
    public async Task<ChatThreadDto?> RestoreChannelAsync(Guid channelId)
    {
        var channel = await _dbContext.ChatThreads
            .Include(ct => ct.ExternalChannelMapping)
            .FirstOrDefaultAsync(ct => ct.Id == channelId && !ct.IsActive);

        if (channel == null)
        {
            _logger.LogWarning("Cannot restore channel {ChannelId}: not found or not archived", channelId);
            return null;
        }

        // Get max display order for this event to place restored channel at end
        var maxOrder = await _dbContext.ChatThreads
            .Where(ct => ct.EventId == channel.EventId && ct.IsActive)
            .MaxAsync(ct => (int?)ct.DisplayOrder) ?? -1;

        channel.IsActive = true;
        channel.DisplayOrder = maxOrder + 1;
        await _dbContext.SaveChangesAsync();

        _logger.LogInformation("Restored channel {ChannelId} '{Name}'", channelId, channel.Name);

        return MapToDto(channel);
    }

    /// <inheritdoc />
    public async Task<bool> PermanentDeleteChannelAsync(Guid channelId)
    {
        var userContext = GetUserContext();
        var channel = await _dbContext.ChatThreads
            .FirstOrDefaultAsync(ct => ct.Id == channelId);

        if (channel == null)
        {
            return false;
        }

        // Cannot permanently delete default event channel
        if (channel.IsDefaultEventThread)
        {
            _logger.LogWarning(
                "Cannot permanently delete default event channel {ChannelId}",
                channelId);
            return false;
        }

        // Cannot permanently delete Announcements channel
        if (channel.ChannelType == ChannelType.Announcements)
        {
            _logger.LogWarning(
                "Cannot permanently delete Announcements channel {ChannelId}",
                channelId);
            return false;
        }

        // Mark as permanently deleted (set special flag or delete entirely)
        // For audit compliance, we keep the record but mark it as removed from event
        // This is a "logical" permanent delete - data remains for SQL recovery
        channel.IsActive = false;
        channel.Name = $"[DELETED] {channel.Name}";
        channel.Description = $"Permanently deleted by {userContext.Email} at {DateTime.UtcNow:u}. Original description: {channel.Description}";

        await _dbContext.SaveChangesAsync();

        _logger.LogInformation(
            "Permanently deleted channel {ChannelId} by {User}",
            channelId, userContext.Email);

        return true;
    }

    /// <inheritdoc />
    public async Task<int> ArchiveAllMessagesAsync(Guid channelId)
    {
        var messages = await _dbContext.ChatMessages
            .Where(m => m.ChatThreadId == channelId && m.IsActive)
            .ToListAsync();

        if (messages.Count == 0)
        {
            return 0;
        }

        foreach (var message in messages)
        {
            message.IsActive = false;
        }

        await _dbContext.SaveChangesAsync();

        _logger.LogInformation(
            "Archived {Count} messages in channel {ChannelId}",
            messages.Count, channelId);

        return messages.Count;
    }

    /// <inheritdoc />
    public async Task<int> ArchiveMessagesOlderThanAsync(Guid channelId, int olderThanDays)
    {
        var cutoffDate = DateTime.UtcNow.AddDays(-olderThanDays);

        var messages = await _dbContext.ChatMessages
            .Where(m => m.ChatThreadId == channelId && m.IsActive && m.CreatedAt < cutoffDate)
            .ToListAsync();

        if (messages.Count == 0)
        {
            return 0;
        }

        foreach (var message in messages)
        {
            message.IsActive = false;
        }

        await _dbContext.SaveChangesAsync();

        _logger.LogInformation(
            "Archived {Count} messages older than {Days} days in channel {ChannelId}",
            messages.Count, olderThanDays, channelId);

        return messages.Count;
    }

    /// <summary>
    /// Ensures a DateTime is specified as UTC kind for proper JSON serialization.
    /// EF Core retrieves DateTime from SQL Server without kind specified.
    /// </summary>
    private static DateTime SpecifyUtc(DateTime dateTime)
    {
        return DateTime.SpecifyKind(dateTime, DateTimeKind.Utc);
    }

    /// <summary>
    /// Maps a ChatThread entity to ChatThreadDto.
    /// </summary>
    private static ChatThreadDto MapToDto(ChatThread ct)
    {
        // Get the last message (most recent by CreatedAt)
        var lastMessage = ct.Messages?
            .Where(m => m.IsActive)
            .OrderByDescending(m => m.CreatedAt)
            .FirstOrDefault();

        return new ChatThreadDto
        {
            Id = ct.Id,
            EventId = ct.EventId,
            Name = ct.Name,
            Description = ct.Description,
            ChannelType = ct.ChannelType,
            ChannelTypeName = ct.ChannelType.ToString(),
            IsDefaultEventThread = ct.IsDefaultEventThread,
            DisplayOrder = ct.DisplayOrder,
            IconName = ct.IconName,
            Color = ct.Color,
            MessageCount = ct.Messages?.Count(m => m.IsActive) ?? 0,
            CreatedAt = SpecifyUtc(ct.CreatedAt),
            IsActive = ct.IsActive,
            LastMessageAt = lastMessage != null ? SpecifyUtc(lastMessage.CreatedAt) : null,
            LastMessageSender = lastMessage != null
                ? (lastMessage.IsExternalMessage
                    ? lastMessage.ExternalSenderName ?? lastMessage.SenderDisplayName
                    : lastMessage.SenderDisplayName)
                : null,
            ExternalChannel = ct.ExternalChannelMapping != null
                ? new ExternalChannelMappingDto
                {
                    Id = ct.ExternalChannelMapping.Id,
                    EventId = ct.ExternalChannelMapping.EventId,
                    Platform = ct.ExternalChannelMapping.Platform,
                    PlatformName = ct.ExternalChannelMapping.Platform.ToString(),
                    ExternalGroupId = ct.ExternalChannelMapping.ExternalGroupId,
                    ExternalGroupName = ct.ExternalChannelMapping.ExternalGroupName,
                    ShareUrl = ct.ExternalChannelMapping.ShareUrl,
                    IsActive = ct.ExternalChannelMapping.IsActive,
                    CreatedAt = SpecifyUtc(ct.ExternalChannelMapping.CreatedAt)
                }
                : null
        };
    }
}
