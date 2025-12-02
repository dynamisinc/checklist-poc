/**
 * Chat Types
 *
 * TypeScript interfaces for the chat feature.
 * Supports both native COBRA messages and external platform messages (GroupMe, etc.).
 */

/**
 * Chat message data transfer object.
 * Supports both native COBRA messages and external platform messages.
 */
export interface ChatMessageDto {
  /** Unique identifier for the message */
  id: string;

  /** Timestamp when the message was created in COBRA */
  createdAt: string;

  /** Email/identifier of the message creator */
  createdBy: string;

  /** Display name of the sender (COBRA user or external sender) */
  senderDisplayName: string;

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
}

/**
 * Chat thread summary information.
 */
export interface ChatThreadDto {
  id: string;
  eventId: string;
  name: string;
  isDefaultEventThread: boolean;
  messageCount: number;
  createdAt: string;
}

/**
 * External channel mapping representing a link between a COBRA event
 * and an external messaging platform group.
 */
export interface ExternalChannelMappingDto {
  id: string;
  eventId: string;
  platform: ExternalPlatform;
  platformName: string;
  externalGroupId: string;
  externalGroupName: string;
  shareUrl?: string;
  isActive: boolean;
  createdAt: string;
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
  { name: string; color: string }
> = {
  [ExternalPlatform.GroupMe]: {
    name: 'GroupMe',
    color: '#00aff0',
  },
  [ExternalPlatform.Signal]: {
    name: 'Signal',
    color: '#3a76f0',
  },
  [ExternalPlatform.Teams]: {
    name: 'Teams',
    color: '#6264a7',
  },
  [ExternalPlatform.Slack]: {
    name: 'Slack',
    color: '#4a154b',
  },
};

/**
 * Request payload for sending a chat message.
 */
export interface SendMessageRequest {
  message: string;
}

/**
 * Request payload for creating an external channel.
 */
export interface CreateExternalChannelRequest {
  platform: ExternalPlatform;
  customGroupName?: string;
}
