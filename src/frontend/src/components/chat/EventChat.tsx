/**
 * EventChat Component
 *
 * Main chat container for event-level communication.
 * Supports bi-directional messaging with external platforms (GroupMe, etc.)
 * Uses SignalR for real-time updates.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  IconButton,
  CircularProgress,
  Alert,
  Tooltip,
  Chip,
  Badge,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPaperPlane,
  faLink,
  faLinkSlash,
  faExternalLinkAlt,
  faEllipsisV,
  faUsers,
} from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import { CobraTextField } from '../../theme/styledComponents';
import { ChatMessage } from './ChatMessage';
import { chatService } from '../../services/chatService';
import { useUserContext } from '../../contexts/UserContext';
import type {
  ChatMessageDto,
  ChatThreadDto,
  ExternalChannelMappingDto,
} from '../../types/chat';
import { ExternalPlatform, PlatformInfo } from '../../types/chat';

interface EventChatProps {
  eventId: string;
  eventName?: string;
}

export const EventChat: React.FC<EventChatProps> = ({ eventId, eventName }) => {
  const theme = useTheme();
  const { userContext } = useUserContext();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // State
  const [thread, setThread] = useState<ChatThreadDto | null>(null);
  const [messages, setMessages] = useState<ChatMessageDto[]>([]);
  const [externalChannels, setExternalChannels] = useState<ExternalChannelMappingDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [channelMenuAnchor, setChannelMenuAnchor] = useState<null | HTMLElement>(null);

  // Scroll to bottom of messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Load chat data
  const loadChatData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [threadData, channelsData] = await Promise.all([
        chatService.getEventChatThread(eventId),
        chatService.getExternalChannels(eventId),
      ]);

      setThread(threadData);
      setExternalChannels(channelsData);

      if (threadData?.id) {
        const messagesData = await chatService.getMessages(threadData.id);
        setMessages(messagesData);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load chat';
      setError(message);
      console.error('Failed to load chat:', err);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  // Send message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !thread?.id || sending) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    setSending(true);

    try {
      const sentMessage = await chatService.sendMessage(thread.id, messageText);
      setMessages((prev) => [...prev, sentMessage]);
      scrollToBottom();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to send message';
      toast.error(errorMsg);
      setNewMessage(messageText); // Restore message on error
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  // Handle key press for sending
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Create GroupMe channel
  const handleCreateGroupMeChannel = async () => {
    setChannelMenuAnchor(null);
    try {
      const channel = await chatService.createExternalChannel(
        eventId,
        ExternalPlatform.GroupMe,
        eventName || `Event ${eventId}`
      );
      setExternalChannels((prev) => [...prev, channel]);
      toast.success('GroupMe channel created! Share the link with external team members.');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create GroupMe channel';
      toast.error(errorMsg);
    }
  };

  // Disconnect channel
  const handleDisconnectChannel = async (channelId: string) => {
    try {
      await chatService.deactivateExternalChannel(channelId);
      setExternalChannels((prev) => prev.filter((c) => c.id !== channelId));
      toast.success('External channel disconnected');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to disconnect channel';
      toast.error(errorMsg);
    }
  };

  // Initial load
  useEffect(() => {
    loadChatData();
  }, [loadChatData]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Get active channels
  const activeChannels = externalChannels.filter((c) => c.isActive);

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: 400,
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Paper
      elevation={0}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 400,
        maxHeight: 600,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1.5,
          borderBottom: `1px solid ${theme.palette.divider}`,
          backgroundColor: theme.palette.background.default,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="subtitle1" fontWeight={600}>
            Event Chat
          </Typography>
          {activeChannels.length > 0 && (
            <Tooltip title={`${activeChannels.length} external channel(s) connected`}>
              <Badge badgeContent={activeChannels.length} color="primary">
                <FontAwesomeIcon icon={faUsers} style={{ opacity: 0.7 }} />
              </Badge>
            </Tooltip>
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* External channel chips */}
          {activeChannels.map((channel) => {
            const platform = ExternalPlatform[channel.platform as keyof typeof ExternalPlatform];
            const platformInfo = platform ? PlatformInfo[platform] : null;

            return (
              <Chip
                key={channel.id}
                size="small"
                label={platformInfo?.name || channel.platform}
                onDelete={() => handleDisconnectChannel(channel.id)}
                deleteIcon={
                  <Tooltip title="Disconnect channel">
                    <span>
                      <FontAwesomeIcon icon={faLinkSlash} style={{ fontSize: 10 }} />
                    </span>
                  </Tooltip>
                }
                sx={{
                  backgroundColor: `${platformInfo?.color || '#666'}20`,
                  color: platformInfo?.color || '#666',
                  '& .MuiChip-deleteIcon': {
                    color: 'inherit',
                    opacity: 0.7,
                    '&:hover': { opacity: 1 },
                  },
                }}
                onClick={() => {
                  if (channel.shareUrl) {
                    window.open(channel.shareUrl, '_blank');
                  }
                }}
                icon={
                  channel.shareUrl ? (
                    <FontAwesomeIcon icon={faExternalLinkAlt} style={{ fontSize: 10 }} />
                  ) : undefined
                }
              />
            );
          })}

          {/* Channel menu */}
          <IconButton
            size="small"
            onClick={(e) => setChannelMenuAnchor(e.currentTarget)}
          >
            <FontAwesomeIcon icon={faEllipsisV} />
          </IconButton>
          <Menu
            anchorEl={channelMenuAnchor}
            open={Boolean(channelMenuAnchor)}
            onClose={() => setChannelMenuAnchor(null)}
          >
            <MenuItem onClick={handleCreateGroupMeChannel}>
              <ListItemIcon>
                <FontAwesomeIcon icon={faLink} />
              </ListItemIcon>
              <ListItemText>Connect GroupMe</ListItemText>
            </MenuItem>
            {activeChannels.length > 0 && (
              <>
                <Divider />
                <MenuItem disabled>
                  <Typography variant="caption" color="text.secondary">
                    Connected Channels
                  </Typography>
                </MenuItem>
                {activeChannels.map((channel) => (
                  <MenuItem
                    key={channel.id}
                    onClick={() => handleDisconnectChannel(channel.id)}
                  >
                    <ListItemIcon>
                      <FontAwesomeIcon icon={faLinkSlash} />
                    </ListItemIcon>
                    <ListItemText>Disconnect {channel.platform}</ListItemText>
                  </MenuItem>
                ))}
              </>
            )}
          </Menu>
        </Box>
      </Box>

      {/* Messages area */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          py: 1,
          backgroundColor: theme.palette.background.paper,
        }}
      >
        {messages.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'text.secondary',
            }}
          >
            <Typography variant="body2">No messages yet</Typography>
            <Typography variant="caption">
              Start the conversation or connect an external channel
            </Typography>
          </Box>
        ) : (
          <>
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                isOwnMessage={message.senderId === userContext?.userId}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </Box>

      {/* Input area */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 1,
          p: 1.5,
          borderTop: `1px solid ${theme.palette.divider}`,
          backgroundColor: theme.palette.background.default,
        }}
      >
        <CobraTextField
          inputRef={inputRef}
          fullWidth
          size="small"
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={sending}
          multiline
          maxRows={3}
          sx={{
            '& .MuiInputBase-root': {
              borderRadius: 2,
            },
          }}
        />
        <IconButton
          color="primary"
          onClick={handleSendMessage}
          disabled={!newMessage.trim() || sending}
          sx={{
            backgroundColor: theme.palette.primary.main,
            color: 'white',
            '&:hover': {
              backgroundColor: theme.palette.primary.dark,
            },
            '&.Mui-disabled': {
              backgroundColor: theme.palette.grey[300],
              color: theme.palette.grey[500],
            },
          }}
        >
          {sending ? (
            <CircularProgress size={20} color="inherit" />
          ) : (
            <FontAwesomeIcon icon={faPaperPlane} />
          )}
        </IconButton>
      </Box>
    </Paper>
  );
};

export default EventChat;
