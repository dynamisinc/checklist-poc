namespace CobraAPI.Shared.Positions.Models.DTOs;

/// <summary>
/// DTO for creating or updating a position.
/// </summary>
public class PositionDto
{
    /// <summary>
    /// The name of the position.
    /// </summary>
    public required string Name { get; set; }

    /// <summary>
    /// Optional description.
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// Optional FontAwesome icon name.
    /// </summary>
    public string? IconName { get; set; }

    /// <summary>
    /// Optional hex color code.
    /// </summary>
    public string? Color { get; set; }
}

/// <summary>
/// DTO for viewing a position (read-only).
/// </summary>
public class ViewPositionDto
{
    /// <summary>
    /// The position ID.
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// The translated name in the user's language.
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// The translated description in the user's language.
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// FontAwesome icon name for display.
    /// </summary>
    public string? IconName { get; set; }

    /// <summary>
    /// Hex color code for display.
    /// </summary>
    public string? Color { get; set; }

    /// <summary>
    /// Display order for sorting.
    /// </summary>
    public int DisplayOrder { get; set; }
}
