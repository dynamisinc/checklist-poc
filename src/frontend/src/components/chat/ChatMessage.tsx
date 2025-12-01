/**
 * ChatMessage Component
 *
 * Displays a single chat message with support for external platform messages.
 * Shows visual indicators for messages from GroupMe and other platforms.
 */

import React from 'react';
import { Box, Typography, Avatar, Chip, Tooltip } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import type { ChatMessageDto } from '../../types/chat';
import { PlatformInfo, ExternalPlatform } from '../../types/chat';

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
 * Formats a timestamp for display.
 */
const formatTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  const timeStr = date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });

  if (isToday) {
    return timeStr;
  }

  const dateStr = date.toLocaleDateString([], {
    month: 'numeric',
    day: 'numeric',
  });

  return `${dateStr}, ${timeStr}`;
};

/**
 * Gets avatar color based on message source.
 */
const getAvatarColor = (message: ChatMessageDto): string => {
  if (message.isExternalMessage && message.externalSource) {
    const platform =
      ExternalPlatform[message.externalSource as keyof typeof ExternalPlatform];
    if (platform && PlatformInfo[platform]) {
      return PlatformInfo[platform].color;
    }
  }

  // Generate consistent color from name
  const colors = [
    '#7C4DFF',
    '#FF9800',
    '#4CAF50',
    '#2196F3',
    '#E91E63',
    '#00BCD4',
    '#795548',
    '#607D8B',
  ];

  let hash = 0;
  const name = message.senderDisplayName;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
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
      ? ` (${message.externalSource})`
      : '';

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: isOwnMessage ? 'row-reverse' : 'row',
        alignItems: 'flex-start',
        gap: 1,
        mb: 1.5,
        px: 1,
      }}
    >
      {/* Avatar */}
      {!isOwnMessage && (
        <Tooltip
          title={
            message.isExternalMessage
              ? `External user via ${message.externalSource}`
              : 'COBRA user'
          }
        >
          <Avatar
            sx={{
              width: 36,
              height: 36,
              bgcolor: getAvatarColor(message),
              fontSize: '0.875rem',
              fontWeight: 600,
            }}
          >
            {getInitials(displayName)}
          </Avatar>
        </Tooltip>
      )}

      {/* Message Content */}
      <Box sx={{ maxWidth: '75%', minWidth: 100 }}>
        {/* Header */}
        {!isOwnMessage && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
            <Typography variant="caption" sx={{ fontWeight: 500 }}>
              {displayName}
              <Typography
                component="span"
                variant="caption"
                sx={{ color: 'text.secondary', ml: 0.5 }}
              >
                {platformSuffix}
              </Typography>
            </Typography>

            <Typography
              variant="caption"
              sx={{ color: 'text.secondary', fontSize: '0.7rem' }}
            >
              {formatTimestamp(message.createdAt)}
            </Typography>

            {/* External platform chip */}
            {message.isExternalMessage && message.externalSource && (
              <Chip
                size="small"
                label={message.externalSource}
                sx={{
                  height: 18,
                  fontSize: '0.65rem',
                  bgcolor: `${getAvatarColor(message)}20`,
                  color: getAvatarColor(message),
                  '& .MuiChip-label': { px: 1 },
                }}
              />
            )}
          </Box>
        )}

        {/* Message bubble */}
        <Box
          sx={{
            bgcolor: isOwnMessage
              ? theme.palette.primary.light
              : theme.palette.grey[100],
            borderRadius: 2,
            px: 1.5,
            py: 1,
          }}
        >
          {/* Own message timestamp */}
          {isOwnMessage && (
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                textAlign: 'right',
                color: 'text.secondary',
                fontSize: '0.7rem',
                mb: 0.5,
              }}
            >
              {formatTimestamp(message.createdAt)}
            </Typography>
          )}

          <Typography
            variant="body2"
            sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
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
              onClick={() =>
                window.open(message.externalAttachmentUrl, '_blank')
              }
            />
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default ChatMessage;
