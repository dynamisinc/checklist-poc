/**
 * EventChat Component
 *
 * Message display and compose component for a specific channel.
 * Focused on viewing messages and sending - external channel management
 * is handled at the page/sidebar level (ChatPage, ChatSidebar).
 *
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
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import { CobraTextField } from '../../../theme/styledComponents';
import { ChatMessage } from './ChatMessage';
import { chatService } from '../services/chatService';
import { getCurrentUser } from '../../../core/services/api';
import { useChatHub } from '../hooks/useChatHub';
import { usePermissions } from '../../../shared/hooks';
import type { ChatMessageDto, ChatThreadDto } from '../types/chat';
import { ChannelType } from '../types/chat';

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
  channelId,
  channelName,
  channelType,
  compact = false,
}) => {
  const theme = useTheme();
  const currentUser = getCurrentUser();
  const { canPostToAnnouncements } = usePermissions();

  // Check if user can send messages based on channel type and permissions
  // Announcements channel requires Manage role, other channels allow all users
  const canSendMessages =
    channelType === ChannelType.Announcements ? canPostToAnnouncements : true;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // State
  const [thread, setThread] = useState<ChatThreadDto | null>(null);
  const [messages, setMessages] = useState<ChatMessageDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');

  // SignalR handlers for real-time updates
  const handleReceiveChatMessage = useCallback(
    (message: ChatMessageDto) => {
      // Only handle messages for this specific thread/channel
      if (message.chatThreadId !== thread?.id) {
        return;
      }

      setMessages((prev) => {
        // Avoid duplicates (message already added locally or via previous SignalR)
        if (prev.some((m) => m.id === message.id)) {
          return prev;
        }
        return [...prev, message];
      });
    },
    [thread?.id]
  );

  // SignalR connection
  const { joinEventChat, leaveEventChat } = useChatHub({
    onReceiveChatMessage: handleReceiveChatMessage,
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

      setThread(threadData);

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
          <Typography variant="subtitle1" fontWeight={600}>
            {channelName || 'Event Chat'}
          </Typography>
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
            <Typography variant="caption">Start the conversation</Typography>
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
                color:
                  !newMessage.trim() || sending
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
