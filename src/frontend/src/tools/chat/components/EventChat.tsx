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
import { CobraTextField } from '../../../theme/styledComponents';
import { ChatMessage } from './ChatMessage';
import { chatService } from '../services/chatService';
import { getCurrentUser } from '../../../core/services/api';
import { useChatHub } from '../hooks/useChatHub';
import type {
  ChatMessageDto,
  ChatThreadDto,
  ExternalChannelMappingDto,
} from '../types/chat';
import { ExternalPlatform, PlatformInfo, ChannelType } from '../types/chat';

interface EventChatProps {
  eventId: string;
  eventName?: string;
  /** Specific channel ID to load (if not provided, loads default event chat) */
  channelId?: string;
  /** Channel name for display */
  channelName?: string;
  /** Channel type for permission checks */
  channelType?: ChannelType;
  /** Compact mode for sidebar - hides header, adjusts heights */
  compact?: boolean;
}

export const EventChat: React.FC<EventChatProps> = ({
  eventId,
  eventName,
  channelId,
  channelName,
  channelType,
  compact = false,
}) => {
  const theme = useTheme();
  const currentUser = getCurrentUser();

  // Check if user can send messages (announcements channel is read-only for non-admin users)
  // TODO: Implement proper permission check based on user roles
  const canSendMessages = channelType !== ChannelType.Announcements;
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

  // SignalR handlers for real-time updates
  const handleReceiveChatMessage = useCallback((message: ChatMessageDto) => {
    // Skip if message is from current user (we already added it optimistically)
    if (message.createdBy === currentUser.email && !message.isExternalMessage) {
      return;
    }
    setMessages((prev) => {
      // Avoid duplicates
      if (prev.some((m) => m.id === message.id)) {
        return prev;
      }
      return [...prev, message];
    });
  }, [currentUser.email]);

  const handleExternalChannelConnected = useCallback((channel: ExternalChannelMappingDto) => {
    setExternalChannels((prev) => {
      if (prev.some((c) => c.id === channel.id)) {
        return prev;
      }
      return [...prev, channel];
    });
  }, []);

  const handleExternalChannelDisconnected = useCallback((channelId: string) => {
    setExternalChannels((prev) => prev.filter((c) => c.id !== channelId));
  }, []);

  // SignalR connection
  const { joinEventChat, leaveEventChat } = useChatHub({
    onReceiveChatMessage: handleReceiveChatMessage,
    onExternalChannelConnected: handleExternalChannelConnected,
    onExternalChannelDisconnected: handleExternalChannelDisconnected,
  });

  // Scroll to bottom of messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Load chat data
  const loadChatData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // If channelId is provided, load that specific channel; otherwise load default
      let threadData: ChatThreadDto;
      if (channelId) {
        threadData = await chatService.getChannel(eventId, channelId);
      } else {
        threadData = await chatService.getEventChatThread(eventId);
      }

      const channelsData = await chatService.getExternalChannels(eventId);

      setThread(threadData);
      setExternalChannels(channelsData);

      if (threadData?.id) {
        const messagesData = await chatService.getMessages(eventId, threadData.id);
        setMessages(messagesData || []);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load chat';
      setError(message);
      console.error('Failed to load chat:', err);
    } finally {
      setLoading(false);
    }
  }, [eventId, channelId]);

  // Send message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !thread?.id || sending || !canSendMessages) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    setSending(true);

    try {
      const sentMessage = await chatService.sendMessage(eventId, thread.id, messageText);
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
      const channel = await chatService.createExternalChannel(eventId, {
        platform: ExternalPlatform.GroupMe,
        customGroupName: eventName || `Event ${eventId}`,
      });
      // Only add if not already in the list (backend returns existing if one exists)
      setExternalChannels((prev) => {
        if (prev.some((c) => c.id === channel.id)) {
          return prev;
        }
        return [...prev, channel];
      });
      toast.success('GroupMe channel connected! Share the link with external team members.');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create GroupMe channel';
      toast.error(errorMsg);
    }
  };

  // Disconnect channel
  const handleDisconnectChannel = async (channelId: string) => {
    try {
      await chatService.deactivateExternalChannel(eventId, channelId);
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

  // Join SignalR group for real-time updates
  useEffect(() => {
    joinEventChat(eventId);
    return () => {
      leaveEventChat(eventId);
    };
  }, [eventId, joinEventChat, leaveEventChat]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Get active channels
  const activeChannels = externalChannels.filter((c) => c.isActive);

  // Check if GroupMe is already connected (only one GroupMe channel per event)
  const hasGroupMeChannel = activeChannels.some(
    (c) => c.platform === ExternalPlatform.GroupMe
  );

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
        minHeight: compact ? 0 : 500,
        maxHeight: compact ? '100%' : 'calc(100vh - 200px)',
        border: compact ? 'none' : `1px solid ${theme.palette.divider}`,
        borderRadius: compact ? 0 : 1,
        overflow: 'hidden',
        backgroundColor: '#fff',
      }}
    >
      {/* Header - hidden in compact mode since sidebar has its own header */}
      {!compact && (
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
              {channelName || 'Event Chat'}
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
              const platformKey = channel.platform as ExternalPlatform;
              const platformInfo = PlatformInfo[platformKey] || null;

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
              {/* Only show Connect GroupMe if not already connected */}
              {!hasGroupMeChannel && (
                <MenuItem onClick={handleCreateGroupMeChannel}>
                  <ListItemIcon>
                    <FontAwesomeIcon icon={faLink} />
                  </ListItemIcon>
                  <ListItemText>Connect GroupMe</ListItemText>
                </MenuItem>
              )}
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
                      <ListItemText>Disconnect {channel.externalGroupName}</ListItemText>
                    </MenuItem>
                  ))}
                </>
              )}
            </Menu>
          </Box>
        </Box>
      )}

      {/* Messages area - white background like COBRA 5 */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          py: 2,
          backgroundColor: '#fff',
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
                isOwnMessage={message.createdBy === currentUser.email}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </Box>

      {/* Input area - COBRA 5 style */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          p: 2,
          borderTop: `1px solid ${theme.palette.divider}`,
          backgroundColor: '#fff',
        }}
      >
        {canSendMessages ? (
          <>
            <CobraTextField
              inputRef={inputRef}
              fullWidth
              size="small"
              placeholder=""
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={sending}
              multiline
              maxRows={3}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 1,
                  backgroundColor: '#fff',
                },
              }}
            />
            <IconButton
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || sending}
              sx={{
                color: !newMessage.trim() || sending
                  ? theme.palette.grey[400]
                  : theme.palette.text.secondary,
                '&:hover': {
                  backgroundColor: 'transparent',
                  color: theme.palette.primary.main,
                },
              }}
            >
              {sending ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <FontAwesomeIcon icon={faPaperPlane} />
              )}
            </IconButton>
          </>
        ) : (
          <Typography
            variant="body2"
            sx={{
              color: theme.palette.text.secondary,
              fontStyle: 'italic',
              textAlign: 'center',
              width: '100%',
              py: 0.5,
            }}
          >
            This channel is read-only
          </Typography>
        )}
      </Box>
    </Paper>
  );
};

export default EventChat;
