/**
 * TeamsChannelDialog Component
 *
 * A dialog for selecting and connecting a Teams channel to a COBRA channel.
 * Shows available Teams conversations where the bot is installed.
 *
 * When targetChannelId is provided, links Teams to that existing channel.
 * When not provided, falls back to creating a new External-type channel (legacy behavior).
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  List,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  CircularProgress,
  Alert,
} from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMicrosoft } from '@fortawesome/free-brands-svg-icons';
import { CobraDialog, CobraPrimaryButton, CobraLinkButton } from '../../../theme/styledComponents';
import { chatService, type TeamsConversation } from '../services/chatService';
import type { ChatThreadDto, ExternalChannelMappingDto } from '../types/chat';

interface TeamsChannelDialogProps {
  open: boolean;
  onClose: () => void;
  eventId: string;
  /** The target channel to link Teams to. If not provided, creates a new External channel. */
  targetChannelId?: string;
  /** The name of the target channel (for display purposes). */
  targetChannelName?: string;
  /** Callback when channel is connected (legacy - for when creating new External channel). */
  onChannelConnected?: (channel: ExternalChannelMappingDto) => void;
  /** Callback when Teams is linked to an existing channel. */
  onChannelLinked?: (channel: ChatThreadDto) => void;
}

export const TeamsChannelDialog: React.FC<TeamsChannelDialogProps> = ({
  open,
  onClose,
  eventId,
  targetChannelId,
  targetChannelName,
  onChannelConnected,
  onChannelLinked,
}) => {
  const [conversations, setConversations] = useState<TeamsConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  // Determine mode based on whether targetChannelId is provided
  const isLinkMode = !!targetChannelId;

  // Load available Teams conversations when dialog opens
  useEffect(() => {
    if (!open) return;

    const loadConversations = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await chatService.getTeamsConversations();
        setConversations(data);
        setSelectedConversation(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load Teams channels';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    loadConversations();
  }, [open]);

  const handleConnect = async () => {
    if (!selectedConversation) return;

    const conversation = conversations.find(c => c.conversationId === selectedConversation);
    if (!conversation) return;

    setConnecting(true);
    setError(null);

    try {
      if (isLinkMode && targetChannelId) {
        // Link Teams to existing channel
        const updatedChannel = await chatService.linkTeamsToChannel(
          eventId,
          targetChannelId,
          conversation.conversationId
        );
        onChannelLinked?.(updatedChannel);
        onClose();
      } else {
        // Legacy: Create new External channel
        const channel = await chatService.createTeamsChannelMapping(
          eventId,
          conversation.conversationId,
          `Teams: ${conversation.channelId}`
        );
        onChannelConnected?.(channel);
        onClose();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect Teams channel';
      setError(message);
    } finally {
      setConnecting(false);
    }
  };

  const dialogTitle = isLinkMode
    ? `Link Teams to "${targetChannelName || 'Channel'}"`
    : 'Connect Teams Channel';

  const instructionText = isLinkMode
    ? `Select a Teams conversation to sync with "${targetChannelName || 'this channel'}". Messages will be bidirectionally synced.`
    : 'Select a Teams channel to connect to this event:';

  const buttonText = isLinkMode
    ? connecting ? 'Linking...' : 'Link Channel'
    : connecting ? 'Connecting...' : 'Connect Channel';

  return (
    <CobraDialog
      open={open}
      onClose={onClose}
      title={dialogTitle}
      contentWidth="500px"
    >
      <Box sx={{ minHeight: 200 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
            <CircularProgress size={32} />
            <Typography sx={{ ml: 2 }} color="text.secondary">
              Loading Teams channels...
            </Typography>
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : conversations.length === 0 ? (
          <Alert severity="info">
            <Typography variant="body2" gutterBottom>
              No Teams channels available.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              To connect a Teams channel:
              <ol style={{ margin: '8px 0', paddingLeft: '20px' }}>
                <li>Install the COBRA bot in your Teams channel</li>
                <li>Send a message in the channel to activate the bot</li>
                <li>Return here to link the channel</li>
              </ol>
            </Typography>
          </Alert>
        ) : (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {instructionText}
            </Typography>
            {isLinkMode && (
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  Messages sent in this channel will appear in Teams, and Teams messages will appear here.
                </Typography>
              </Alert>
            )}
            <List sx={{ bgcolor: 'background.paper', borderRadius: 1 }}>
              {conversations.map((conv) => (
                <ListItemButton
                  key={conv.conversationId}
                  selected={selectedConversation === conv.conversationId}
                  onClick={() => setSelectedConversation(conv.conversationId)}
                  sx={{
                    border: '1px solid',
                    borderColor: selectedConversation === conv.conversationId
                      ? 'primary.main'
                      : 'divider',
                    borderRadius: 1,
                    mb: 1,
                  }}
                >
                  <ListItemIcon>
                    <FontAwesomeIcon
                      icon={faMicrosoft}
                      style={{ fontSize: 20, color: '#6264a7' }}
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={conv.channelId === 'msteams' ? 'Teams Conversation' : conv.channelId}
                    secondary={
                      <Typography variant="caption" component="span" color="text.secondary">
                        {conv.conversationId.substring(0, 30)}...
                      </Typography>
                    }
                  />
                </ListItemButton>
              ))}
            </List>
          </>
        )}
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
        <CobraLinkButton onClick={onClose}>
          Cancel
        </CobraLinkButton>
        <CobraPrimaryButton
          onClick={handleConnect}
          disabled={!selectedConversation || connecting}
        >
          {buttonText}
        </CobraPrimaryButton>
      </Box>
    </CobraDialog>
  );
};

export default TeamsChannelDialog;
