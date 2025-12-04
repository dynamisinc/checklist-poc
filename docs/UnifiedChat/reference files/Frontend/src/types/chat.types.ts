/**
 * Chat message data transfer object.
 * Supports both native COBRA messages and external platform messages.
 */
export interface ChatMessageDto {
  /** Unique identifier for the message */
  id: string;

  /** Timestamp when the message was created in COBRA */
  created: string;

  /** Display name of the sender (COBRA user or external sender) */
  createdBy: string;

  /** COBRA user ID (system user ID for external messages) */
  createdById: string;

  /** Message content */
  message: string;

  /** True if this message originated from an external platform */
  isExternalMessage: boolean;

  /** Platform name if external (e.g., "GroupMe", "Signal") */
  externalSource?: string;

  /** External sender's display name */
  externalSenderName?: string;

  /** URL to attached image (if any) */
  externalAttachmentUrl?: string;

  /** If promoted to logbook, the entry ID */
  promotedToLogbookEntryId?: string;
}

/**
 * External channel mapping representing a link between a COBRA event
 * and an external messaging platform group.
 */
export interface ExternalChannelMappingDto {
  id: string;
  eventId: string;
  platform: ExternalPlatform;
  externalGroupId: string;
  externalGroupName: string;
  shareUrl?: string;
  isActive: boolean;
  created: string;
}

/**
 * Supported external messaging platforms.
 */
export enum ExternalPlatform {
  GroupMe = 1,
  Signal = 2,
  Teams = 3,
  Slack = 4,
}

/**
 * Maps platform enum to display information.
 */
export const PlatformInfo: Record<
  ExternalPlatform,
  { name: string; icon: string; color: string }
> = {
  [ExternalPlatform.GroupMe]: {
    name: "GroupMe",
    icon: "fa-light fa-comment-dots",
    color: "#00aff0",
  },
  [ExternalPlatform.Signal]: {
    name: "Signal",
    icon: "fa-light fa-shield-check",
    color: "#3a76f0",
  },
  [ExternalPlatform.Teams]: {
    name: "Teams",
    icon: "fa-light fa-users",
    color: "#6264a7",
  },
  [ExternalPlatform.Slack]: {
    name: "Slack",
    icon: "fa-light fa-hashtag",
    color: "#4a154b",
  },
};

/**
 * Request payload for promoting a chat message to a logbook entry.
 */
export interface PromoteToLogbookRequest {
  chatMessageId: string;
  additionalNotes?: string;
  categoryId?: string;
}

/**
 * Chat thread summary information.
 */
export interface ViewChatThreadDto {
  id: string;
  messageCount: number;
}

/**
 * SignalR notification payload for new chat messages.
 */
export interface ChatMessageNotification {
  type: "ChatMessageCreated";
  payload: ChatMessageDto;
}
