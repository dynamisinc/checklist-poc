using Microsoft.EntityFrameworkCore;
using CobraAPI.Core.Data;
using CobraAPI.Core.Models;
using CobraAPI.Shared.Positions.Models.DTOs;
using CobraAPI.Shared.Positions.Models.Entities;

namespace CobraAPI.Shared.Positions.Services;

/// <summary>
/// Service for position management.
/// </summary>
public class PositionService : IPositionService
{
    private readonly CobraDbContext _dbContext;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly ILogger<PositionService> _logger;

    // Default ICS positions with icons and colors
    private static readonly List<(string Name, string Description, string Icon, string Color, int Order)> DefaultIcsPositions = new()
    {
        ("Incident Commander", "Command staff coordination", "star", "#0020C2", 1),
        ("Operations Section Chief", "Operations section coordination", "cogs", "#E42217", 2),
        ("Planning Section Chief", "Planning section coordination", "clipboard-list", "#4CAF50", 3),
        ("Logistics Section Chief", "Logistics section coordination", "truck", "#FF9800", 4),
        ("Finance/Admin Section Chief", "Finance and administration coordination", "dollar-sign", "#9C27B0", 5),
        ("Safety Officer", "Safety officer coordination", "shield-halved", "#F44336", 6),
        ("Public Information Officer", "Public information coordination", "bullhorn", "#2196F3", 7),
        ("Liaison Officer", "Liaison officer coordination", "handshake", "#00BCD4", 8),
    };

    // POC: Use a fixed "default" language ID for simplicity
    private static readonly Guid DefaultLanguageId = Guid.Parse("00000000-0000-0000-0000-000000000001");

    public PositionService(
        CobraDbContext dbContext,
        IHttpContextAccessor httpContextAccessor,
        ILogger<PositionService> logger)
    {
        _dbContext = dbContext;
        _httpContextAccessor = httpContextAccessor;
        _logger = logger;
    }

    private UserContext GetCurrentUser()
    {
        return _httpContextAccessor.HttpContext?.Items["UserContext"] as UserContext
            ?? throw new InvalidOperationException("User context not found");
    }

    /// <inheritdoc />
    public async Task<List<ViewPositionDto>> GetPositionsAsync()
    {
        var user = GetCurrentUser();

        // Get positions for the current organization
        // POC: For simplicity, we're using a single language
        var positions = await _dbContext.Positions
            .Include(p => p.Translations)
            .Where(p => p.OrganizationId == user.OrganizationId && p.IsActive)
            .OrderBy(p => p.DisplayOrder)
            .ThenBy(p => p.Translations.First().Name)
            .ToListAsync();

        return positions.Select(MapToViewDto).ToList();
    }

    /// <inheritdoc />
    public async Task<ViewPositionDto?> GetPositionAsync(Guid id)
    {
        var position = await _dbContext.Positions
            .Include(p => p.Translations)
            .FirstOrDefaultAsync(p => p.Id == id && p.IsActive);

        return position != null ? MapToViewDto(position) : null;
    }

    /// <inheritdoc />
    public async Task<List<ViewPositionDto>> GetPositionsAsync(List<Guid> ids)
    {
        var positions = await _dbContext.Positions
            .Include(p => p.Translations)
            .Where(p => ids.Contains(p.Id) && p.IsActive)
            .OrderBy(p => p.DisplayOrder)
            .ToListAsync();

        return positions.Select(MapToViewDto).ToList();
    }

    /// <inheritdoc />
    public async Task<Guid> CreatePositionAsync(PositionDto positionDto)
    {
        var user = GetCurrentUser();
        var positionId = Guid.NewGuid();

        // Get the next display order
        var maxOrder = await _dbContext.Positions
            .Where(p => p.OrganizationId == user.OrganizationId && p.IsActive)
            .MaxAsync(p => (int?)p.DisplayOrder) ?? 0;

        var position = new Position
        {
            Id = positionId,
            OrganizationId = user.OrganizationId,
            SourceLanguageId = DefaultLanguageId,
            IsActive = true,
            IconName = positionDto.IconName,
            Color = positionDto.Color,
            DisplayOrder = maxOrder + 1,
            CreatedBy = user.Email,
            CreatedAt = DateTime.UtcNow,
        };

        var translation = new PositionTranslation
        {
            PositionId = positionId,
            LanguageId = DefaultLanguageId,
            Name = positionDto.Name,
            Description = positionDto.Description,
        };

        _dbContext.Positions.Add(position);
        _dbContext.PositionTranslations.Add(translation);
        await _dbContext.SaveChangesAsync();

        _logger.LogInformation("Created position {Name} with ID {Id}", positionDto.Name, positionId);

        return positionId;
    }

    /// <inheritdoc />
    public async Task UpdatePositionAsync(Guid id, PositionDto positionDto)
    {
        var user = GetCurrentUser();

        var position = await _dbContext.Positions
            .Include(p => p.Translations)
            .FirstOrDefaultAsync(p => p.Id == id && p.IsActive);

        if (position == null)
        {
            throw new KeyNotFoundException($"Position {id} not found");
        }

        // Update position properties
        position.IconName = positionDto.IconName;
        position.Color = positionDto.Color;
        position.ModifiedBy = user.Email;
        position.ModifiedAt = DateTime.UtcNow;

        // Update or create translation
        var translation = position.Translations.FirstOrDefault(t => t.LanguageId == DefaultLanguageId);
        if (translation != null)
        {
            translation.Name = positionDto.Name;
            translation.Description = positionDto.Description;
        }
        else
        {
            _dbContext.PositionTranslations.Add(new PositionTranslation
            {
                PositionId = id,
                LanguageId = DefaultLanguageId,
                Name = positionDto.Name,
                Description = positionDto.Description,
            });
        }

        await _dbContext.SaveChangesAsync();

        _logger.LogInformation("Updated position {Id} to {Name}", id, positionDto.Name);
    }

    /// <inheritdoc />
    public async Task DeletePositionAsync(Guid id)
    {
        var position = await _dbContext.Positions.FindAsync(id);
        if (position == null)
        {
            throw new KeyNotFoundException($"Position {id} not found");
        }

        // Soft delete
        position.IsActive = false;
        position.ModifiedBy = GetCurrentUser().Email;
        position.ModifiedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync();

        _logger.LogInformation("Soft deleted position {Id}", id);
    }

    /// <inheritdoc />
    public async Task SeedDefaultPositionsAsync(Guid organizationId, string createdBy)
    {
        // Check if positions already exist for this organization
        var existingCount = await _dbContext.Positions
            .CountAsync(p => p.OrganizationId == organizationId && p.IsActive);

        if (existingCount > 0)
        {
            _logger.LogInformation("Organization {OrganizationId} already has {Count} positions, skipping seed",
                organizationId, existingCount);
            return;
        }

        foreach (var (name, description, icon, color, order) in DefaultIcsPositions)
        {
            var positionId = Guid.NewGuid();

            var position = new Position
            {
                Id = positionId,
                OrganizationId = organizationId,
                SourceLanguageId = DefaultLanguageId,
                IsActive = true,
                IconName = icon,
                Color = color,
                DisplayOrder = order,
                CreatedBy = createdBy,
                CreatedAt = DateTime.UtcNow,
            };

            var translation = new PositionTranslation
            {
                PositionId = positionId,
                LanguageId = DefaultLanguageId,
                Name = name,
                Description = description,
            };

            _dbContext.Positions.Add(position);
            _dbContext.PositionTranslations.Add(translation);
        }

        await _dbContext.SaveChangesAsync();

        _logger.LogInformation("Seeded {Count} default ICS positions for organization {OrganizationId}",
            DefaultIcsPositions.Count, organizationId);
    }

    private static ViewPositionDto MapToViewDto(Position position)
    {
        // Get the first translation (POC uses single language)
        var translation = position.Translations.FirstOrDefault();

        return new ViewPositionDto
        {
            Id = position.Id,
            Name = translation?.Name ?? "Unknown",
            Description = translation?.Description,
            IconName = position.IconName,
            Color = position.Color,
            DisplayOrder = position.DisplayOrder,
        };
    }
}
