namespace ChecklistAPI.Models.Entities;

public class TemplateItem
{
    public Guid Id { get; set; }
    public Guid TemplateId { get; set; }
    public string ItemText { get; set; } = string.Empty;
    public string ItemType { get; set; } = string.Empty;
    public int DisplayOrder { get; set; }
    public bool IsRequired { get; set; } = false;

    /// <summary>
    /// JSON configuration for status options (only used when ItemType = "status")
    /// Format: [{"label":"Not Started","isCompletion":false,"order":1}, ...]
    /// </summary>
    public string? StatusConfiguration { get; set; }

    public string? AllowedPositions { get; set; }
    public string? DefaultNotes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Template Template { get; set; } = null!;
}
