/**
 * Platform Utilities
 *
 * Shared utilities for handling external platform icons and colors.
 * Centralizes logic for platform display info to ensure consistency
 * across ChatPage, ChannelList, ChatSidebar, and ChatMessage components.
 *
 * IMPORTANT: The backend uses JsonStringEnumConverter, so platform values
 * may come as strings ("Teams", "GroupMe") or numbers (3, 1). These utilities
 * handle both cases.
 */

import {
  faCommentDots,
  faCommentSms,
  faComments,
  faBullhorn,
  faHashtag,
  faUserGroup,
} from '@fortawesome/free-solid-svg-icons';
import { faMicrosoft, faSlack } from '@fortawesome/free-brands-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import type { Theme } from '@mui/material/styles';
import type { ChatThreadDto } from '../types/chat';
import { ExternalPlatform, PlatformInfo, ChannelType, isChannelType } from '../types/chat';

/**
 * Normalizes platform value to ExternalPlatform enum.
 * Handles both string values from API ("Teams", "GroupMe") and numeric enum values (3, 1).
 */
export const normalizePlatform = (
  platform: ExternalPlatform | string | number
): ExternalPlatform | null => {
  // Already a valid enum number
  if (typeof platform === 'number' && platform in ExternalPlatform) {
    return platform as ExternalPlatform;
  }

  // String value - look up by name
  if (typeof platform === 'string') {
    const enumValue = ExternalPlatform[platform as keyof typeof ExternalPlatform];
    if (enumValue !== undefined) {
      return enumValue;
    }
  }

  return null;
};

/**
 * Gets the FontAwesome icon for an external platform.
 * Handles both string and numeric platform values.
 */
export const getPlatformIcon = (
  platform: ExternalPlatform | string | number
): IconDefinition => {
  const normalized = normalizePlatform(platform);

  switch (normalized) {
    case ExternalPlatform.GroupMe:
      return faCommentDots;
    case ExternalPlatform.Signal:
      return faCommentSms;
    case ExternalPlatform.Teams:
      return faMicrosoft;
    case ExternalPlatform.Slack:
      return faSlack;
    default:
      return faCommentDots;
  }
};

/**
 * Gets the display color for an external platform.
 * Handles both string and numeric platform values.
 */
export const getPlatformColor = (
  platform: ExternalPlatform | string | number
): string => {
  const normalized = normalizePlatform(platform);
  if (normalized !== null && PlatformInfo[normalized]) {
    return PlatformInfo[normalized].color;
  }
  return '#666'; // Default gray
};

/**
 * Gets the display name for an external platform.
 * Handles both string and numeric platform values.
 */
export const getPlatformName = (
  platform: ExternalPlatform | string | number
): string => {
  const normalized = normalizePlatform(platform);
  if (normalized !== null && PlatformInfo[normalized]) {
    return PlatformInfo[normalized].name;
  }

  // Fallback to string representation if possible
  if (typeof platform === 'string') {
    return platform;
  }

  return 'Unknown';
};

/**
 * Icon name to FontAwesome icon mapping for channel icons.
 */
const iconNameMap: Record<string, IconDefinition> = {
  comments: faComments,
  bullhorn: faBullhorn,
  hashtag: faHashtag,
  'user-group': faUserGroup,
};

/**
 * Maps a channel icon name string to a FontAwesome icon definition.
 */
export const iconNameToIcon = (iconName: string): IconDefinition => {
  return iconNameMap[iconName] ?? faHashtag;
};

/**
 * Gets the appropriate icon for a chat channel based on its type and metadata.
 * - Uses custom iconName if provided
 * - For External channels with externalChannel data, uses platform icon
 * - Falls back to type-based default icons
 */
export const getChannelIcon = (channel: ChatThreadDto): IconDefinition => {
  // Use custom icon if provided
  if (channel.iconName) {
    return iconNameToIcon(channel.iconName);
  }

  // External channels use platform-specific icons
  if (isChannelType(channel.channelType, ChannelType.External) && channel.externalChannel) {
    return getPlatformIcon(channel.externalChannel.platform);
  }

  // Default icons by channel type
  if (isChannelType(channel.channelType, ChannelType.Internal)) {
    return faComments;
  }
  if (isChannelType(channel.channelType, ChannelType.Announcements)) {
    return faBullhorn;
  }
  if (isChannelType(channel.channelType, ChannelType.External)) {
    return faCommentDots; // Fallback if no externalChannel
  }
  if (isChannelType(channel.channelType, ChannelType.Position)) {
    return faUserGroup;
  }
  // Custom or default
  return faHashtag;
};

/**
 * Gets the display color for a chat channel based on its type and metadata.
 * - Uses custom color if provided
 * - For External channels with externalChannel data, uses platform color
 * - Falls back to theme-based default colors
 */
export const getChannelColor = (channel: ChatThreadDto, theme: Theme): string => {
  // Use custom color if provided
  if (channel.color) {
    return channel.color;
  }

  // External channels use platform colors
  if (isChannelType(channel.channelType, ChannelType.External) && channel.externalChannel) {
    return getPlatformColor(channel.externalChannel.platform);
  }

  // Default colors by channel type
  if (isChannelType(channel.channelType, ChannelType.Internal)) {
    return theme.palette.primary.main;
  }
  if (isChannelType(channel.channelType, ChannelType.Announcements)) {
    return theme.palette.warning.main;
  }
  if (isChannelType(channel.channelType, ChannelType.Position)) {
    return theme.palette.info.main;
  }
  // Custom or default
  return theme.palette.text.secondary;
};
