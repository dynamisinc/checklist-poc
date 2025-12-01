namespace ChecklistAPI.Models.Entities;

/// <summary>
/// Represents a chat thread within an event.
/// Each event has one default thread; additional threads may be created for specific purposes.
/// </summary>
public class ChatThread
{
    public Guid Id { get; set; }

    public Guid EventId { get; set; }

    public Event Event { get; set; } = null!;

    /// <summary>
    /// Whether this is the default event-wide chat thread.
    /// Each event should have exactly one default thread.
    /// </summary>
    public bool IsDefaultEventThread { get; set; }

    /// <summary>
    /// Display name for the thread.
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Whether this thread is active (soft delete flag).
    /// </summary>
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// Collection of messages in this thread.
    /// </summary>
    public ICollection<ChatMessage> Messages { get; set; } = new List<ChatMessage>();

    // Audit fields
    public string CreatedBy { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string? LastModifiedBy { get; set; }
    public DateTime? LastModifiedAt { get; set; }
}
