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

  /** ID of the chat thread/channel this message belongs to */
  chatThreadId: string;

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
 * Chat thread/channel summary information.
 * Extended with channel type and metadata for multi-channel support.
 */
export interface ChatThreadDto {
  id: string;
  eventId: string;
  name: string;
  description?: string;
  channelType: ChannelType;
  channelTypeName: string;
  isDefaultEventThread: boolean;
  displayOrder: number;
  iconName?: string;
  color?: string;
  /** For Position channels, the full ICS position name for filtering */
  positionName?: string;
  messageCount: number;
  createdAt: string;
  /** Whether the channel is active (false = archived) */
  isActive?: boolean;
  /** Timestamp of the last message in this channel (null if no messages) */
  lastMessageAt?: string;
  /** Display name of the sender of the last message (null if no messages) */
  lastMessageSender?: string;
  /** For External channels, the linked external channel details */
  externalChannel?: ExternalChannelMappingDto;
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
 * Platform display information including icon identifiers.
 * Icons are FontAwesome icon names (without 'fa' prefix).
 */
export interface PlatformDisplayInfo {
  name: string;
  color: string;
  /** FontAwesome icon name - use 'brands' icons for platforms */
  icon: string;
  /** Icon type: 'brands' for fa-brands, 'solid' for fa-solid */
  iconType: 'brands' | 'solid';
}

/**
 * Maps platform enum to display information.
 */
export const PlatformInfo: Record<ExternalPlatform, PlatformDisplayInfo> = {
  [ExternalPlatform.GroupMe]: {
    name: 'GroupMe',
    color: '#00aff0',
    icon: 'comment-dots', // No official GroupMe icon, use chat bubble
    iconType: 'solid',
  },
  [ExternalPlatform.Signal]: {
    name: 'Signal',
    color: '#3a76f0',
    icon: 'comment-sms', // Signal-like messaging icon
    iconType: 'solid',
  },
  [ExternalPlatform.Teams]: {
    name: 'Teams',
    color: '#6264a7',
    icon: 'microsoft', // Microsoft brand icon
    iconType: 'brands',
  },
  [ExternalPlatform.Slack]: {
    name: 'Slack',
    color: '#4a154b',
    icon: 'slack', // Official Slack brand icon
    iconType: 'brands',
  },
};

/**
 * Channel types matching backend enum.
 * Supports internal COBRA channels, external platforms, and custom groups.
 */
export enum ChannelType {
  /** Default internal COBRA channel */
  Internal = 0,
  /** Announcements channel (read-only for most users) */
  Announcements = 1,
  /** External platform integration (GroupMe, Teams, etc.) */
  External = 2,
  /** Position-based channel (e.g., "Logistics", "Operations") */
  Position = 3,
  /** Custom named group */
  Custom = 4,
}

/**
 * Helper to check if a channel type matches one of the expected types.
 * Handles the string/number mismatch when backend uses JsonStringEnumConverter.
 *
 * @example
 * // Check if channel is External
 * if (isChannelType(channel.channelType, ChannelType.External)) { ... }
 *
 * // Check if channel is Internal or Announcements
 * if (isChannelType(channel.channelType, ChannelType.Internal, ChannelType.Announcements)) { ... }
 */
export const isChannelType = (
  channelType: ChannelType | string,
  ...types: ChannelType[]
): boolean => {
  return types.some((type) => {
    // Direct numeric match
    if (channelType === type) return true;
    // String match (API returns "Internal" but enum is 0)
    if (typeof channelType === 'string' && channelType === ChannelType[type]) return true;
    return false;
  });
};

/**
 * Channel display information for sidebar/tabs.
 * Extensible for internal, external, position, and custom channels.
 */
export interface ChannelDisplayInfo {
  id: string;
  name: string;
  type: ChannelType;
  /** Platform enum if external channel */
  platform?: ExternalPlatform;
  /** Custom icon name if position/custom channel */
  customIcon?: string;
  /** Icon type for custom icon */
  customIconType?: 'solid' | 'regular' | 'light';
  /** Color override for the channel */
  color?: string;
  /** Whether channel is currently active/connected */
  isActive: boolean;
  /** Number of unread messages (if tracked) */
  unreadCount?: number;
}

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

/**
 * Request payload for creating a new channel.
 */
export interface CreateChannelRequest {
  eventId: string;
  name: string;
  description?: string;
  channelType: ChannelType;
  iconName?: string;
  color?: string;
  /**
   * Optional position ID for Position channels.
   * When set, only users assigned to this position can see the channel.
   */
  positionId?: string;
}

/**
 * Request payload for updating a channel.
 */
export interface UpdateChannelRequest {
  name?: string;
  description?: string;
  iconName?: string;
  color?: string;
}
