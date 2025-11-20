namespace ChecklistAPI.Models.Entities;

public class ChecklistItem
{
    public Guid Id { get; set; }
    public Guid ChecklistInstanceId { get; set; }
    public Guid TemplateItemId { get; set; }
    public string ItemText { get; set; } = string.Empty;
    public string ItemType { get; set; } = string.Empty;
    public int DisplayOrder { get; set; }
    public bool IsRequired { get; set; } = false;
    
    // Checkbox fields
    public bool? IsCompleted { get; set; }
    public string? CompletedBy { get; set; }
    public string? CompletedByPosition { get; set; }
    public DateTime? CompletedAt { get; set; }
    
    // Status dropdown fields
    public string? CurrentStatus { get; set; }

    /// <summary>
    /// JSON configuration for status options (only used when ItemType = "status")
    /// Copied from TemplateItem when checklist instance is created
    /// Format: [{"label":"Not Started","isCompletion":false,"order":1}, ...]
    /// </summary>
    public string? StatusConfiguration { get; set; }

    public string? AllowedPositions { get; set; }

    // Notes
    public string? Notes { get; set; }

    // Audit
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string? LastModifiedBy { get; set; }
    public string? LastModifiedByPosition { get; set; }
    public DateTime? LastModifiedAt { get; set; }
    
    // Navigation
    public ChecklistInstance ChecklistInstance { get; set; } = null!;
}
