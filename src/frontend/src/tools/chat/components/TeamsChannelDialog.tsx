/**
 * TeamsChannelDialog Component
 *
 * A dialog for selecting and linking a Teams connector to a COBRA channel.
 * Shows available Teams connectors where the bot is installed.
 *
 * Uses the event-level available-teams-connectors endpoint which shows
 * whether each connector is already linked to a channel in this event.
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
  Chip,
} from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMicrosoft } from '@fortawesome/free-brands-svg-icons';
import { faLink } from '@fortawesome/free-solid-svg-icons';
import { formatDistanceToNow } from 'date-fns';
import { CobraDialog, CobraPrimaryButton, CobraLinkButton } from '../../../theme/styledComponents';
import { chatService, type AvailableTeamsConnector } from '../services/chatService';
import type { ChatThreadDto } from '../types/chat';

interface TeamsChannelDialogProps {
  open: boolean;
  onClose: () => void;
  eventId: string;
  /** The target channel to link Teams to. */
  targetChannelId?: string;
  /** The name of the target channel (for display purposes). */
  targetChannelName?: string;
  /** Callback when Teams is linked to a channel. */
  onChannelLinked?: (channel: ChatThreadDto) => void;
}

export const TeamsChannelDialog: React.FC<TeamsChannelDialogProps> = ({
  open,
  onClose,
  eventId,
  targetChannelId,
  targetChannelName,
  onChannelLinked,
}) => {
  const [connectors, setConnectors] = useState<AvailableTeamsConnector[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedConnector, setSelectedConnector] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  // Load available Teams connectors when dialog opens
  useEffect(() => {
    if (!open || !eventId) return;

    const loadConnectors = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await chatService.getAvailableTeamsConnectors(eventId);
        setConnectors(data);
        setSelectedConnector(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load Teams connectors';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    loadConnectors();
  }, [open, eventId]);

  const handleConnect = async () => {
    if (!selectedConnector || !targetChannelId) return;

    const connector = connectors.find(c => c.conversationId === selectedConnector);
    if (!connector) return;

    setConnecting(true);
    setError(null);

    try {
      const updatedChannel = await chatService.linkTeamsToChannel(
        eventId,
        targetChannelId,
        connector.conversationId
      );
      onChannelLinked?.(updatedChannel);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to link Teams channel';
      setError(message);
    } finally {
      setConnecting(false);
    }
  };

  const dialogTitle = `Link Teams to "${targetChannelName || 'Channel'}"`;
  const buttonText = connecting ? 'Linking...' : 'Link Channel';

  // Filter to show unlinked connectors first, then linked ones
  const sortedConnectors = [...connectors].sort((a, b) => {
    if (a.isLinkedToThisEvent !== b.isLinkedToThisEvent) {
      return a.isLinkedToThisEvent ? 1 : -1;
    }
    return 0;
  });

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
              Loading Teams connectors...
            </Typography>
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : connectors.length === 0 ? (
          <Alert severity="info">
            <Typography variant="body2" gutterBottom>
              No Teams connectors available.
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
              Select a Teams connector to sync with "{targetChannelName || 'this channel'}".
              Messages will be bidirectionally synced.
            </Typography>
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                Messages sent in this channel will appear in Teams, and Teams messages will appear here.
              </Typography>
            </Alert>
            <List sx={{ bgcolor: 'background.paper', borderRadius: 1 }}>
              {sortedConnectors.map((connector) => (
                <ListItemButton
                  key={connector.conversationId}
                  selected={selectedConnector === connector.conversationId}
                  onClick={() => setSelectedConnector(connector.conversationId)}
                  disabled={connector.isLinkedToThisEvent}
                  sx={{
                    border: '1px solid',
                    borderColor: selectedConnector === connector.conversationId
                      ? 'primary.main'
                      : 'divider',
                    borderRadius: 1,
                    mb: 1,
                    opacity: connector.isLinkedToThisEvent ? 0.6 : 1,
                  }}
                >
                  <ListItemIcon>
                    <FontAwesomeIcon
                      icon={faMicrosoft}
                      style={{ fontSize: 20, color: '#6264a7' }}
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {connector.displayName || 'Teams Conversation'}
                        {connector.isLinkedToThisEvent && (
                          <Chip
                            icon={<FontAwesomeIcon icon={faLink} style={{ fontSize: 10 }} />}
                            label={`Linked to ${connector.linkedChannelName}`}
                            size="small"
                            color="success"
                            sx={{ height: 20, fontSize: 10 }}
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Typography variant="caption" component="span" color="text.secondary">
                        {connector.lastActivityAt
                          ? `Active ${formatDistanceToNow(new Date(connector.lastActivityAt), { addSuffix: true })}`
                          : 'No recent activity'}
                        {connector.installedByName && ` • Installed by ${connector.installedByName}`}
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
          disabled={!selectedConnector || connecting || !targetChannelId}
        >
          {buttonText}
        </CobraPrimaryButton>
      </Box>
    </CobraDialog>
  );
};

export default TeamsChannelDialog;
