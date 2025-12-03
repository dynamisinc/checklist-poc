namespace CobraAPI.Shared.Positions.Models.Entities;

/// <summary>
/// Represents a position (role) within an organization.
/// Positions are organization-specific and translatable.
/// Examples: "Incident Commander", "Operations Section Chief", "Safety Officer"
/// </summary>
public class Position
{
    public Guid Id { get; set; }

    /// <summary>
    /// The organization this position belongs to.
    /// </summary>
    public Guid OrganizationId { get; set; }

    /// <summary>
    /// The source language for the position name (for translation fallback).
    /// </summary>
    public Guid SourceLanguageId { get; set; }

    /// <summary>
    /// Whether this position is active (soft delete support).
    /// </summary>
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// Optional icon name for display (FontAwesome icon name).
    /// </summary>
    public string? IconName { get; set; }

    /// <summary>
    /// Optional color for display (hex color code).
    /// </summary>
    public string? Color { get; set; }

    /// <summary>
    /// Display order for sorting positions.
    /// </summary>
    public int DisplayOrder { get; set; }

    /// <summary>
    /// Translations for this position (name, description in different languages).
    /// </summary>
    public ICollection<PositionTranslation> Translations { get; set; } = new List<PositionTranslation>();

    // Audit fields
    public string CreatedBy { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string? ModifiedBy { get; set; }
    public DateTime? ModifiedAt { get; set; }
}
