import React, { useState } from "react";
import {
  Box,
  Typography,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Tooltip,
} from "@mui/material";
import {
  ChatMessageDto,
  ExternalPlatform,
  PlatformInfo,
} from "../../types/chat.types";

/**
 * Props for the ChatMessage component.
 */
interface ChatMessageProps {
  /** The message data to display */
  message: ChatMessageDto;

  /** Whether this message was sent by the current user */
  isOwnMessage: boolean;

  /** Current user's ID for comparison */
  currentUserId: string;

  /** Callback when user wants to promote message to logbook */
  onPromoteToLogbook?: (messageId: string) => void;

  /** Callback when user wants to copy message text */
  onCopyMessage?: (message: string) => void;
}

/**
 * Extracts initials from a display name.
 * Handles names like "John Smith" -> "JS" or "Mike Chen (GroupMe)" -> "MC"
 */
const getInitials = (name: string): string => {
  // Remove platform suffix like "(GroupMe)"
  const cleanName = name.replace(/\s*\([^)]*\)\s*$/, "").trim();
  const parts = cleanName.split(" ").filter((p) => p.length > 0);

  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();

  return (
    parts[0].charAt(0).toUpperCase() +
    parts[parts.length - 1].charAt(0).toUpperCase()
  );
};

/**
 * Formats a timestamp for display.
 * Shows time for today, date + time for older messages.
 */
const formatTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  const timeStr = date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  if (isToday) {
    return timeStr;
  }

  const dateStr = date.toLocaleDateString([], {
    month: "numeric",
    day: "numeric",
    year: "numeric",
  });

  return `${dateStr}, ${timeStr}`;
};

/**
 * Gets the avatar background color based on sender.
 * External messages get platform-specific colors.
 * COBRA messages get colors based on name hash.
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
    "#7C4DFF", // Purple (like in screenshot)
    "#FF9800", // Orange
    "#4CAF50", // Green
    "#2196F3", // Blue
    "#E91E63", // Pink
    "#00BCD4", // Cyan
    "#795548", // Brown
    "#607D8B", // Blue Grey
  ];

  let hash = 0;
  const name = message.createdBy;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
};

/**
 * ChatMessage component displays a single chat message.
 * Handles both native COBRA messages and external platform messages (GroupMe, etc.).
 *
 * Visual differences for external messages:
 * - Platform indicator chip
 * - Platform-colored avatar
 * - "(via Platform)" suffix on sender name
 */
export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  isOwnMessage,
  currentUserId,
  onPromoteToLogbook,
  onCopyMessage,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(anchorEl);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleCopy = () => {
    onCopyMessage?.(message.message);
    handleMenuClose();
  };

  const handlePromoteToLogbook = () => {
    onPromoteToLogbook?.(message.id);
    handleMenuClose();
  };

  // Build display name with platform indicator for external messages
  const displayName = message.isExternalMessage
    ? `${message.externalSenderName || "Unknown"}`
    : message.createdBy;

  const platformSuffix =
    message.isExternalMessage && message.externalSource
      ? ` (${message.externalSource})`
      : "";

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: isOwnMessage ? "row-reverse" : "row",
        alignItems: "flex-start",
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
              : "COBRA user"
          }
        >
          <Avatar
            sx={{
              width: 36,
              height: 36,
              bgcolor: getAvatarColor(message),
              fontSize: "0.875rem",
              fontWeight: 600,
            }}
          >
            {getInitials(displayName)}
          </Avatar>
        </Tooltip>
      )}

      {/* Message Content */}
      <Box
        sx={{
          maxWidth: "75%",
          minWidth: 100,
        }}
      >
        {/* Header: Name + Timestamp + Platform Indicator */}
        {!isOwnMessage && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              mb: 0.25,
            }}
          >
            <Typography
              variant="caption"
              sx={{
                fontWeight: 500,
                color: "text.primary",
              }}
            >
              {displayName}
              <Typography
                component="span"
                variant="caption"
                sx={{ color: "text.secondary", ml: 0.5 }}
              >
                {platformSuffix}
              </Typography>
            </Typography>

            <Typography
              variant="caption"
              sx={{ color: "text.secondary", fontSize: "0.7rem" }}
            >
              {formatTimestamp(message.created)}
            </Typography>

            {/* External platform chip */}
            {message.isExternalMessage && message.externalSource && (
              <Chip
                size="small"
                label={message.externalSource}
                sx={{
                  height: 18,
                  fontSize: "0.65rem",
                  bgcolor: `${getAvatarColor(message)}20`,
                  color: getAvatarColor(message),
                  "& .MuiChip-label": { px: 1 },
                }}
              />
            )}

            {/* Promoted indicator */}
            {message.promotedToLogbookEntryId && (
              <Chip
                size="small"
                label="In Logbook"
                icon={
                  <i
                    className="fa-light fa-book"
                    style={{ fontSize: "0.65rem" }}
                  />
                }
                sx={{
                  height: 18,
                  fontSize: "0.65rem",
                  bgcolor: "#E8F5E9",
                  color: "#2E7D32",
                  "& .MuiChip-label": { px: 0.5 },
                  "& .MuiChip-icon": { ml: 0.5 },
                }}
              />
            )}
          </Box>
        )}

        {/* Message bubble */}
        <Box
          sx={{
            position: "relative",
            bgcolor: isOwnMessage ? "#E3F2FD" : "#F5F5F5",
            borderRadius: 2,
            px: 1.5,
            py: 1,
            "&:hover .message-actions": {
              opacity: 1,
            },
          }}
        >
          {/* Own message timestamp (right-aligned) */}
          {isOwnMessage && (
            <Typography
              variant="caption"
              sx={{
                display: "block",
                textAlign: "right",
                color: "text.secondary",
                fontSize: "0.7rem",
                mb: 0.5,
              }}
            >
              {formatTimestamp(message.created)}
            </Typography>
          )}

          <Typography
            variant="body2"
            sx={{
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
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
                maxWidth: "100%",
                maxHeight: 200,
                borderRadius: 1,
                mt: 1,
                cursor: "pointer",
              }}
              onClick={() =>
                window.open(message.externalAttachmentUrl, "_blank")
              }
            />
          )}

          {/* Action menu button (appears on hover) */}
          <Box
            className="message-actions"
            sx={{
              position: "absolute",
              top: 4,
              right: 4,
              opacity: 0,
              transition: "opacity 0.2s",
            }}
          >
            <IconButton
              size="small"
              onClick={handleMenuOpen}
              sx={{ width: 24, height: 24 }}
            >
              <i
                className="fa-light fa-ellipsis-vertical"
                style={{ fontSize: "0.875rem" }}
              />
            </IconButton>
          </Box>
        </Box>
      </Box>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={menuOpen}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <MenuItem onClick={handleCopy}>
          <ListItemIcon>
            <i className="fa-light fa-copy" style={{ fontSize: "1rem" }} />
          </ListItemIcon>
          <ListItemText>Copy Message</ListItemText>
        </MenuItem>

        {!message.promotedToLogbookEntryId && (
          <MenuItem onClick={handlePromoteToLogbook}>
            <ListItemIcon>
              <i className="fa-light fa-book" style={{ fontSize: "1rem" }} />
            </ListItemIcon>
            <ListItemText>Create Logbook Entry</ListItemText>
          </MenuItem>
        )}

        {message.promotedToLogbookEntryId && (
          <MenuItem
            onClick={() => {
              // Navigate to logbook entry
              handleMenuClose();
            }}
          >
            <ListItemIcon>
              <i
                className="fa-light fa-arrow-up-right-from-square"
                style={{ fontSize: "1rem" }}
              />
            </ListItemIcon>
            <ListItemText>View Logbook Entry</ListItemText>
          </MenuItem>
        )}
      </Menu>
    </Box>
  );
};

export default ChatMessage;
