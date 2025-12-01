using ChecklistAPI.Models.Entities;

namespace ChecklistAPI.Models.DTOs;

/// <summary>
/// Extended DTO for chat messages that includes external message metadata.
/// This DTO is used for both API responses and SignalR broadcasts.
/// </summary>
public class ChatMessageDto
{
    public Guid Id { get; set; }
    public DateTime CreatedAt { get; set; }
    public string CreatedBy { get; set; } = string.Empty;
    public string SenderDisplayName { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;

    // External message fields
    public bool IsExternalMessage { get; set; }
    public string? ExternalSource { get; set; }
    public string? ExternalSenderName { get; set; }
    public string? ExternalAttachmentUrl { get; set; }
}

/// <summary>
/// Chat thread summary information.
/// </summary>
public class ChatThreadDto
{
    public Guid Id { get; set; }
    public Guid EventId { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsDefaultEventThread { get; set; }
    public int MessageCount { get; set; }
    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// DTO for creating an external channel mapping.
/// </summary>
public class CreateExternalChannelRequest
{
    public Guid EventId { get; set; }
    public ExternalPlatform Platform { get; set; }
    public string? CustomGroupName { get; set; }
}

/// <summary>
/// DTO for external channel mapping details.
/// </summary>
public class ExternalChannelMappingDto
{
    public Guid Id { get; set; }
    public Guid EventId { get; set; }
    public ExternalPlatform Platform { get; set; }
    public string PlatformName { get; set; } = string.Empty;
    public string ExternalGroupId { get; set; } = string.Empty;
    public string ExternalGroupName { get; set; } = string.Empty;
    public string? ShareUrl { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// Request to send a chat message.
/// </summary>
public class SendMessageRequest
{
    public string Message { get; set; } = string.Empty;
}
