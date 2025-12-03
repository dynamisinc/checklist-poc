using CobraAPI.Shared.Positions.Models.DTOs;

namespace CobraAPI.Shared.Positions.Services;

/// <summary>
/// Service interface for position management.
/// Positions represent roles within an organization (e.g., ICS positions).
/// </summary>
public interface IPositionService
{
    /// <summary>
    /// Gets all active positions for the current organization.
    /// Returns positions in the user's preferred language with fallback to source language.
    /// </summary>
    Task<List<ViewPositionDto>> GetPositionsAsync();

    /// <summary>
    /// Gets a specific position by ID.
    /// </summary>
    Task<ViewPositionDto?> GetPositionAsync(Guid id);

    /// <summary>
    /// Gets multiple positions by their IDs.
    /// </summary>
    Task<List<ViewPositionDto>> GetPositionsAsync(List<Guid> ids);

    /// <summary>
    /// Creates a new position.
    /// </summary>
    /// <returns>The ID of the created position.</returns>
    Task<Guid> CreatePositionAsync(PositionDto position);

    /// <summary>
    /// Updates an existing position.
    /// </summary>
    Task UpdatePositionAsync(Guid id, PositionDto position);

    /// <summary>
    /// Soft deletes a position.
    /// </summary>
    Task DeletePositionAsync(Guid id);

    /// <summary>
    /// Seeds the default ICS positions for an organization.
    /// Called during organization setup.
    /// </summary>
    Task SeedDefaultPositionsAsync(Guid organizationId, string createdBy);
}
