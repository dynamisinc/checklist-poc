namespace CobraAPI.Shared.Positions.Models.Entities;

/// <summary>
/// Stores translated name and description for a Position.
/// Each position can have translations in multiple languages.
/// </summary>
public class PositionTranslation
{
    /// <summary>
    /// The position this translation belongs to.
    /// </summary>
    public Guid PositionId { get; set; }

    /// <summary>
    /// Navigation property to the parent position.
    /// </summary>
    public Position Position { get; set; } = null!;

    /// <summary>
    /// The language this translation is for.
    /// </summary>
    public Guid LanguageId { get; set; }

    /// <summary>
    /// The translated name of the position.
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Optional translated description.
    /// </summary>
    public string? Description { get; set; }
}
