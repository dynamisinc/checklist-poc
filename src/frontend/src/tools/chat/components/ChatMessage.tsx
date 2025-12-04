/**
 * ChatMessage Component
 *
 * Displays a single chat message matching COBRA 5 design.
 * - Other users: Avatar + name/timestamp + message (left-aligned)
 * - Own messages: Timestamp + message (right-aligned, cyan color)
 * - External messages: Platform icon badge on avatar
 */

import React from 'react';
import { Box, Typography, Avatar, Tooltip, Badge } from '@mui/material';
import { useTheme, styled } from '@mui/material/styles';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { ChatMessageDto } from '../types/chat';
import { getPlatformIcon, getPlatformColor } from '../utils/platformUtils';

/**
 * Styled badge for platform icon overlay on avatar.
 */
const PlatformBadge = styled(Badge)<{ platformcolor: string }>(
  ({ platformcolor }) => ({
    '& .MuiBadge-badge': {
      backgroundColor: platformcolor,
      color: '#fff',
      width: 18,
      height: 18,
      minWidth: 18,
      borderRadius: '50%',
      border: '2px solid #fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '0.6rem',
      right: -2,
      bottom: -2,
    },
  })
);

interface ChatMessageProps {
  message: ChatMessageDto;
  isOwnMessage: boolean;
}

/**
 * Extracts initials from a display name.
 */
const getInitials = (name: string): string => {
  const cleanName = name.replace(/\s*\([^)]*\)\s*$/, '').trim();
  const parts = cleanName.split(' ').filter((p) => p.length > 0);

  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();

  return (
    parts[0].charAt(0).toUpperCase() +
    parts[parts.length - 1].charAt(0).toUpperCase()
  );
};

/**
 * Formats a timestamp for display (COBRA 5 style: "MM/DD/YYYY, H:MM:SS AM/PM")
 */
const formatTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp);

  const dateStr = date.toLocaleDateString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
  });

  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  return `${dateStr}, ${timeStr}`;
};

/**
 * Avatar colors matching COBRA 5 palette
 */
const avatarColors = [
  '#9C27B0', // Purple (KL)
  '#00BCD4', // Cyan (MG)
  '#7E57C2', // Light purple (KH)
  '#3F51B5', // Blue (JS)
  '#E91E63', // Pink
  '#FF9800', // Orange
  '#4CAF50', // Green
  '#607D8B', // Blue grey
];

/**
 * Gets avatar color based on sender name (consistent hash).
 */
const getAvatarColor = (message: ChatMessageDto): string => {
  if (message.isExternalMessage && message.externalSource) {
    // Use shared utility that handles string/number enum values
    const color = getPlatformColor(message.externalSource);
    if (color !== '#666') {
      return color;
    }
  }

  // Generate consistent color from name
  let hash = 0;
  const name = message.senderDisplayName;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  return avatarColors[Math.abs(hash) % avatarColors.length];
};

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  isOwnMessage,
}) => {
  const theme = useTheme();

  const displayName = message.isExternalMessage
    ? message.externalSenderName || 'Unknown'
    : message.senderDisplayName;

  const platformSuffix =
    message.isExternalMessage && message.externalSource
      ? ` (via ${message.externalSource})`
      : '';

  // Get platform color for external messages using shared utility
  const externalPlatformColor = message.isExternalMessage && message.externalSource
    ? getPlatformColor(message.externalSource)
    : null;

  /**
   * Renders the avatar, with platform badge overlay for external messages.
   */
  const renderAvatar = () => {
    const avatar = (
      <Avatar
        sx={{
          width: 36,
          height: 36,
          bgcolor: getAvatarColor(message),
          fontSize: '0.85rem',
          fontWeight: 600,
          flexShrink: 0,
        }}
      >
        {getInitials(displayName)}
      </Avatar>
    );

    // Wrap with platform badge for external messages
    if (message.isExternalMessage && message.externalSource && externalPlatformColor) {
      return (
        <PlatformBadge
          platformcolor={externalPlatformColor}
          overlap="circular"
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          badgeContent={
            <FontAwesomeIcon
              icon={getPlatformIcon(message.externalSource)}
              style={{ fontSize: '0.5rem' }}
            />
          }
        >
          {avatar}
        </PlatformBadge>
      );
    }

    return avatar;
  };

  // Own message - right aligned, cyan colored
  if (isOwnMessage) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          mb: 2,
          px: 2,
        }}
      >
        {/* Timestamp */}
        <Typography
          variant="caption"
          sx={{
            color: theme.palette.text.secondary,
            fontSize: '0.75rem',
            mb: 0.5,
          }}
        >
          {formatTimestamp(message.createdAt)}
        </Typography>

        {/* Message text - cyan colored */}
        <Typography
          variant="body2"
          sx={{
            color: '#00BCD4', // Cyan color matching screenshot
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            maxWidth: '80%',
            textAlign: 'right',
          }}
        >
          {message.message}
        </Typography>
      </Box>
    );
  }

  // Other users' messages - left aligned with avatar
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1.5,
        mb: 2,
        px: 2,
      }}
    >
      {/* Avatar with platform badge for external messages */}
      <Tooltip
        title={
          message.isExternalMessage
            ? `External user via ${message.externalSource}`
            : 'COBRA user'
        }
      >
        <Box sx={{ flexShrink: 0 }}>{renderAvatar()}</Box>
      </Tooltip>

      {/* Message Content */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {/* Name and timestamp header */}
        <Typography
          variant="caption"
          sx={{
            color: theme.palette.text.secondary,
            fontSize: '0.75rem',
            display: 'block',
            mb: 0.5,
          }}
        >
          {displayName}
          {platformSuffix} {formatTimestamp(message.createdAt)}
        </Typography>

        {/* Message text */}
        <Typography
          variant="body2"
          sx={{
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            color: theme.palette.text.primary,
          }}
        >
          {message.message}
        </Typography>

        {/* External attachment (image) */}
        {message.externalAttachmentUrl && (
          <Box
            component="img"
            src={message.externalAttachmentUrl}
            alt="Attached image"
            sx={{
              maxWidth: '100%',
              maxHeight: 200,
              borderRadius: 1,
              mt: 1,
              cursor: 'pointer',
            }}
            onClick={() => window.open(message.externalAttachmentUrl, '_blank')}
          />
        )}
      </Box>
    </Box>
  );
};

export default ChatMessage;
