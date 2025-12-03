using Microsoft.EntityFrameworkCore;
using CobraAPI.Core.Data;
using CobraAPI.Tools.Chat.Services;
using System.Text.Json;

namespace CobraAPI.Shared.Events.Services;

/// <summary>
/// Service for managing events (incidents/operations)
/// </summary>
public class EventService : IEventService
{
    private readonly CobraDbContext _context;
    private readonly IChannelService _channelService;
    private readonly ILogger<EventService> _logger;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public EventService(
        CobraDbContext context,
        IChannelService channelService,
        ILogger<EventService> logger,
        IHttpContextAccessor httpContextAccessor)
    {
        _context = context;
        _channelService = channelService;
        _logger = logger;
        _httpContextAccessor = httpContextAccessor;
    }

    private string GetCurrentUser()
    {
        return _httpContextAccessor.HttpContext?.Items["UserName"]?.ToString() ?? "Unknown User";
    }

    public async Task<List<EventDto>> GetEventsAsync(string? eventType = null, bool activeOnly = true)
    {
        _logger.LogInformation(
            "Getting events with filters - EventType: {EventType}, ActiveOnly: {ActiveOnly}",
            eventType, activeOnly);

        var query = _context.Events
            .Include(e => e.PrimaryCategory)
            .Where(e => !e.IsArchived)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(eventType))
        {
            query = query.Where(e => e.EventType.ToLower() == eventType.ToLower());
        }

        if (activeOnly)
        {
            query = query.Where(e => e.IsActive);
        }

        var events = await query
            .OrderByDescending(e => e.CreatedAt)
            .ToListAsync();

        _logger.LogInformation("Found {Count} events", events.Count);

        return events.Select(MapToDto).ToList();
    }

    public async Task<EventDto?> GetEventByIdAsync(Guid id)
    {
        _logger.LogInformation("Getting event by ID: {Id}", id);

        var eventEntity = await _context.Events
            .Include(e => e.PrimaryCategory)
            .FirstOrDefaultAsync(e => e.Id == id && !e.IsArchived);

        if (eventEntity == null)
        {
            _logger.LogWarning("Event not found: {Id}", id);
            return null;
        }

        return MapToDto(eventEntity);
    }

    public async Task<EventDto> CreateEventAsync(CreateEventRequest request)
    {
        var currentUser = GetCurrentUser();
        _logger.LogInformation(
            "Creating event - Name: {Name}, EventType: {EventType}, by {User}",
            request.Name, request.EventType, currentUser);

        // Validate that the category matches the event type
        var category = await _context.EventCategories
            .FirstOrDefaultAsync(c => c.Id == request.PrimaryCategoryId);

        if (category == null)
        {
            throw new ArgumentException($"Category with ID {request.PrimaryCategoryId} not found");
        }

        if (!string.Equals(category.EventType, request.EventType, StringComparison.OrdinalIgnoreCase))
        {
            throw new ArgumentException(
                $"Category '{category.Name}' is for {category.EventType} events, " +
                $"but event type is {request.EventType}");
        }

        // Validate additional categories if provided
        string? additionalCategoryIds = null;
        if (request.AdditionalCategoryIds?.Any() == true)
        {
            var additionalCategories = await _context.EventCategories
                .Where(c => request.AdditionalCategoryIds.Contains(c.Id))
                .ToListAsync();

            // All additional categories should exist
            if (additionalCategories.Count != request.AdditionalCategoryIds.Count)
            {
                throw new ArgumentException("One or more additional categories not found");
            }

            additionalCategoryIds = JsonSerializer.Serialize(request.AdditionalCategoryIds);
        }

        // Normalize event type to Title case (Planned/Unplanned) to match seed data
        var normalizedEventType = request.EventType.ToLower() switch
        {
            "planned" => "Planned",
            "unplanned" => "Unplanned",
            _ => request.EventType // Keep as-is if not recognized
        };

        var eventEntity = new Event
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            EventType = normalizedEventType,
            PrimaryCategoryId = request.PrimaryCategoryId,
            AdditionalCategoryIds = additionalCategoryIds,
            IsActive = true,
            IsArchived = false,
            CreatedBy = currentUser,
            CreatedAt = DateTime.UtcNow
        };

        _context.Events.Add(eventEntity);
        await _context.SaveChangesAsync();

        // Create default channels for the new event
        await _channelService.CreateDefaultChannelsAsync(eventEntity.Id, currentUser);

        // Reload with includes
        await _context.Entry(eventEntity)
            .Reference(e => e.PrimaryCategory)
            .LoadAsync();

        _logger.LogInformation("Created event: {Id} - {Name}", eventEntity.Id, eventEntity.Name);

        return MapToDto(eventEntity);
    }

    public async Task<EventDto> UpdateEventAsync(Guid id, UpdateEventRequest request)
    {
        var currentUser = GetCurrentUser();
        _logger.LogInformation("Updating event {Id} by {User}", id, currentUser);

        var eventEntity = await _context.Events
            .Include(e => e.PrimaryCategory)
            .FirstOrDefaultAsync(e => e.Id == id && !e.IsArchived);

        if (eventEntity == null)
        {
            throw new KeyNotFoundException($"Event {id} not found");
        }

        // Validate that the new category matches the event type
        var category = await _context.EventCategories
            .FirstOrDefaultAsync(c => c.Id == request.PrimaryCategoryId);

        if (category == null)
        {
            throw new ArgumentException($"Category with ID {request.PrimaryCategoryId} not found");
        }

        if (category.EventType != eventEntity.EventType)
        {
            throw new ArgumentException(
                $"Category '{category.Name}' is for {category.EventType} events, " +
                $"but this event is {eventEntity.EventType}");
        }

        // Update additional categories
        string? additionalCategoryIds = null;
        if (request.AdditionalCategoryIds?.Any() == true)
        {
            additionalCategoryIds = JsonSerializer.Serialize(request.AdditionalCategoryIds);
        }

        eventEntity.Name = request.Name;
        eventEntity.PrimaryCategoryId = request.PrimaryCategoryId;
        eventEntity.AdditionalCategoryIds = additionalCategoryIds;
        eventEntity.IsActive = request.IsActive;
        eventEntity.LastModifiedBy = currentUser;
        eventEntity.LastModifiedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        // Reload category
        await _context.Entry(eventEntity)
            .Reference(e => e.PrimaryCategory)
            .LoadAsync();

        _logger.LogInformation("Updated event: {Id} - {Name}", eventEntity.Id, eventEntity.Name);

        return MapToDto(eventEntity);
    }

    public async Task ArchiveEventAsync(Guid id)
    {
        var currentUser = GetCurrentUser();
        _logger.LogInformation("Archiving event {Id} by {User}", id, currentUser);

        var eventEntity = await _context.Events
            .FirstOrDefaultAsync(e => e.Id == id && !e.IsArchived);

        if (eventEntity == null)
        {
            throw new KeyNotFoundException($"Event {id} not found");
        }

        eventEntity.IsArchived = true;
        eventEntity.ArchivedBy = currentUser;
        eventEntity.ArchivedAt = DateTime.UtcNow;
        eventEntity.LastModifiedBy = currentUser;
        eventEntity.LastModifiedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Archived event: {Id}", id);
    }

    public async Task RestoreEventAsync(Guid id)
    {
        var currentUser = GetCurrentUser();
        _logger.LogInformation("Restoring event {Id} by {User}", id, currentUser);

        var eventEntity = await _context.Events
            .FirstOrDefaultAsync(e => e.Id == id && e.IsArchived);

        if (eventEntity == null)
        {
            throw new KeyNotFoundException($"Archived event {id} not found");
        }

        eventEntity.IsArchived = false;
        eventEntity.ArchivedBy = null;
        eventEntity.ArchivedAt = null;
        eventEntity.LastModifiedBy = currentUser;
        eventEntity.LastModifiedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Restored event: {Id}", id);
    }

    public async Task DeleteEventAsync(Guid id)
    {
        var currentUser = GetCurrentUser();
        _logger.LogInformation("Permanently deleting event {Id} by {User}", id, currentUser);

        var eventEntity = await _context.Events
            .FirstOrDefaultAsync(e => e.Id == id);

        if (eventEntity == null)
        {
            throw new KeyNotFoundException($"Event {id} not found");
        }

        // Check if event has associated checklists
        var hasChecklists = await _context.ChecklistInstances
            .AnyAsync(c => c.EventId == id);

        if (hasChecklists)
        {
            throw new InvalidOperationException(
                "Cannot delete event with associated checklists. Archive it instead.");
        }

        _context.Events.Remove(eventEntity);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Permanently deleted event: {Id}", id);
    }

    public async Task SetEventActiveAsync(Guid id, bool isActive)
    {
        var currentUser = GetCurrentUser();
        _logger.LogInformation("Setting event {Id} active={Active} by {User}", id, isActive, currentUser);

        var eventEntity = await _context.Events
            .FirstOrDefaultAsync(e => e.Id == id && !e.IsArchived);

        if (eventEntity == null)
        {
            throw new KeyNotFoundException($"Event {id} not found");
        }

        eventEntity.IsActive = isActive;
        eventEntity.LastModifiedBy = currentUser;
        eventEntity.LastModifiedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Set event {Id} active={Active}", id, isActive);
    }

    private static EventDto MapToDto(Event eventEntity)
    {
        List<Guid>? additionalCategoryIds = null;
        if (!string.IsNullOrEmpty(eventEntity.AdditionalCategoryIds))
        {
            try
            {
                additionalCategoryIds = JsonSerializer.Deserialize<List<Guid>>(eventEntity.AdditionalCategoryIds);
            }
            catch
            {
                // Ignore deserialization errors
            }
        }

        return new EventDto
        {
            Id = eventEntity.Id,
            Name = eventEntity.Name,
            EventType = eventEntity.EventType,
            PrimaryCategoryId = eventEntity.PrimaryCategoryId,
            PrimaryCategory = eventEntity.PrimaryCategory != null
                ? new EventCategoryDto
                {
                    Id = eventEntity.PrimaryCategory.Id,
                    Code = eventEntity.PrimaryCategory.Code,
                    Name = eventEntity.PrimaryCategory.Name,
                    EventType = eventEntity.PrimaryCategory.EventType,
                    SubGroup = eventEntity.PrimaryCategory.SubGroup,
                    DisplayOrder = eventEntity.PrimaryCategory.DisplayOrder,
                    IsActive = eventEntity.PrimaryCategory.IsActive,
                    IconName = eventEntity.PrimaryCategory.IconName
                }
                : null,
            AdditionalCategoryIds = additionalCategoryIds,
            IsActive = eventEntity.IsActive,
            IsArchived = eventEntity.IsArchived,
            CreatedBy = eventEntity.CreatedBy,
            CreatedAt = eventEntity.CreatedAt,
            LastModifiedBy = eventEntity.LastModifiedBy,
            LastModifiedAt = eventEntity.LastModifiedAt
        };
    }
}
