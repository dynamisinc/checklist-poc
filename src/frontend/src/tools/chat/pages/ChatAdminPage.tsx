/**
 * Chat Administration Page
 *
 * Administration view for managing event channels.
 * Shows active channels, archived channels, and channel management actions.
 *
 * Route: /chat (admin view via breadcrumb)
 * Dashboard: /chat/dashboard (normal user experience)
 *
 * Related User Stories:
 * - UC-026: Chat Administration Dashboard
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Box,
  Stack,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faComments,
  faExclamationTriangle,
  faBullhorn,
  faHashtag,
  faUserGroup,
  faEllipsisVertical,
  faBoxArchive,
  faRotateLeft,
  faTrash,
  faClock,
  faMessage,
  faCalendarMinus,
  faCommentDots,
  faCommentSms,
} from '@fortawesome/free-solid-svg-icons';
import {
  faMicrosoft,
  faSlack,
} from '@fortawesome/free-brands-svg-icons';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { useEvents } from '../../../shared/events';
import { usePermissions } from '../../../shared/hooks/usePermissions';
import { chatService } from '../services/chatService';
import { useChatHub } from '../hooks/useChatHub';
import CobraStyles from '../../../theme/CobraStyles';
import {
  CobraPrimaryButton,
  CobraNewButton,
} from '../../../theme/styledComponents';
import type { ChatThreadDto, ChatMessageDto } from '../types/chat';
import { ChannelType, ExternalPlatform, PlatformInfo, isChannelType } from '../types/chat';
import { CreateChannelDialog } from '../components/CreateChannelDialog';
import { ArchiveChannelDialog } from '../components/ArchiveChannelDialog';
import { RestoreChannelDialog } from '../components/RestoreChannelDialog';
import { PermanentDeleteDialog } from '../components/PermanentDeleteDialog';

/**
 * Get icon for channel based on type
 */
const getChannelIcon = (channel: ChatThreadDto) => {
  if (channel.iconName) {
    switch (channel.iconName) {
      case 'comments':
        return faComments;
      case 'bullhorn':
        return faBullhorn;
      case 'hashtag':
        return faHashtag;
      case 'user-group':
        return faUserGroup;
      default:
        return faHashtag;
    }
  }

  switch (channel.channelType) {
    case ChannelType.Internal:
      return faComments;
    case ChannelType.Announcements:
      return faBullhorn;
    case ChannelType.Position:
      return faUserGroup;
    case ChannelType.External:
    case ChannelType.Custom:
    default:
      return faHashtag;
  }
};

/**
 * Get icon for external platform
 */
const getPlatformIcon = (platform: ExternalPlatform) => {
  switch (platform) {
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
 * Check if a channel can be archived
 */
const canArchiveChannel = (channel: ChatThreadDto): boolean => {
  if (channel.isDefaultEventThread) return false;
  if (isChannelType(channel.channelType, ChannelType.External)) return false;
  if (isChannelType(channel.channelType, ChannelType.Announcements)) return false;
  return true;
};

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
};

/**
 * Chat Admin Page Component
 */
export const ChatAdminPage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { currentEvent, loading: eventLoading } = useEvents();
  const permissions = usePermissions();

  // Check if user can manage channels (Manage role)
  const canManageChannels = permissions.isManage;

  // Tab state
  const [tabIndex, setTabIndex] = useState(0);

  // Channel state
  const [activeChannels, setActiveChannels] = useState<ChatThreadDto[]>([]);
  const [archivedChannels, setArchivedChannels] = useState<ChatThreadDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [permanentDeleteDialogOpen, setPermanentDeleteDialogOpen] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<ChatThreadDto | null>(null);

  // Menu state
  const [menuAnchor, setMenuAnchor] = useState<{
    element: HTMLElement;
    channel: ChatThreadDto;
  } | null>(null);

  // Load channels
  const loadChannels = useCallback(async () => {
    if (!currentEvent) return;

    try {
      setLoading(true);
      setError(null);
      const [active, archived] = await Promise.all([
        chatService.getChannels(currentEvent.id),
        chatService.getArchivedChannels(currentEvent.id),
      ]);
      setActiveChannels(active);
      setArchivedChannels(archived);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load channels';
      setError(message);
      console.error('Failed to load channels:', err);
    } finally {
      setLoading(false);
    }
  }, [currentEvent]);

  useEffect(() => {
    loadChannels();
  }, [loadChannels]);

  // SignalR hub handlers for real-time updates
  const handleChannelCreatedHub = useCallback((channel: ChatThreadDto) => {
    setActiveChannels((prev) => {
      // Avoid duplicates
      if (prev.some((c) => c.id === channel.id)) return prev;
      return [...prev, channel];
    });
  }, []);

  const handleChannelArchivedHub = useCallback((channelId: string) => {
    const channel = activeChannels.find((c) => c.id === channelId);
    if (channel) {
      setActiveChannels((prev) => prev.filter((c) => c.id !== channelId));
      setArchivedChannels((prev) => [...prev, { ...channel, isActive: false }]);
    }
  }, [activeChannels]);

  const handleChannelRestoredHub = useCallback((channel: ChatThreadDto) => {
    setArchivedChannels((prev) => prev.filter((c) => c.id !== channel.id));
    setActiveChannels((prev) => {
      if (prev.some((c) => c.id === channel.id)) return prev;
      return [...prev, channel];
    });
  }, []);

  const handleChannelDeletedHub = useCallback((channelId: string) => {
    // Remove from both lists (it may be in archived)
    setArchivedChannels((prev) => prev.filter((c) => c.id !== channelId));
    setActiveChannels((prev) => prev.filter((c) => c.id !== channelId));
  }, []);

  const handleMessageReceivedHub = useCallback((message: ChatMessageDto) => {
    // Update the channel's message count and last activity
    setActiveChannels((prev) =>
      prev.map((channel) => {
        if (channel.id === message.chatThreadId) {
          return {
            ...channel,
            messageCount: channel.messageCount + 1,
            lastMessageAt: message.createdAt,
            lastMessageSender: message.senderDisplayName,
          };
        }
        return channel;
      })
    );
  }, []);

  // Connect to SignalR hub
  const { joinEventChat, leaveEventChat } = useChatHub({
    onReceiveChatMessage: handleMessageReceivedHub,
    onChannelCreated: handleChannelCreatedHub,
    onChannelArchived: handleChannelArchivedHub,
    onChannelRestored: handleChannelRestoredHub,
    onChannelDeleted: handleChannelDeletedHub,
    onReconnected: loadChannels, // Refresh data on reconnect
  });

  // Join event chat group when event changes
  useEffect(() => {
    if (currentEvent?.id) {
      joinEventChat(currentEvent.id);
      return () => {
        leaveEventChat(currentEvent.id);
      };
    }
  }, [currentEvent?.id, joinEventChat, leaveEventChat]);

  // Menu handlers
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, channel: ChatThreadDto) => {
    event.stopPropagation();
    setMenuAnchor({ element: event.currentTarget, channel });
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  // Channel handlers
  const handleChannelCreated = (channel: ChatThreadDto) => {
    setActiveChannels((prev) => [...prev, channel]);
  };

  const handleArchiveClick = () => {
    if (menuAnchor) {
      setSelectedChannel(menuAnchor.channel);
      setArchiveDialogOpen(true);
      handleMenuClose();
    }
  };

  const handleChannelArchived = (channelId: string) => {
    const channel = activeChannels.find((c) => c.id === channelId);
    if (channel) {
      setActiveChannels((prev) => prev.filter((c) => c.id !== channelId));
      setArchivedChannels((prev) => [...prev, { ...channel, isActive: false }]);
    }
  };

  const handleRestoreClick = (channel: ChatThreadDto) => {
    setSelectedChannel(channel);
    setRestoreDialogOpen(true);
  };

  const handleChannelRestored = (channel: ChatThreadDto) => {
    setArchivedChannels((prev) => prev.filter((c) => c.id !== channel.id));
    setActiveChannels((prev) => [...prev, channel]);
    toast.success(`Channel "${channel.name}" restored`);
  };

  const handlePermanentDeleteClick = (channel: ChatThreadDto) => {
    setSelectedChannel(channel);
    setPermanentDeleteDialogOpen(true);
  };

  const handleChannelPermanentlyDeleted = (channelId: string) => {
    setArchivedChannels((prev) => prev.filter((c) => c.id !== channelId));
  };

  const handleGoToChat = (channelId?: string) => {
    // Navigate to the chat dashboard, optionally with a channel selected
    navigate('/chat/dashboard' + (channelId ? `?channel=${channelId}` : ''));
  };

  const handleArchiveAllMessages = async () => {
    if (!menuAnchor || !currentEvent) return;
    const channel = menuAnchor.channel;
    handleMenuClose();

    try {
      const count = await chatService.archiveAllMessages(currentEvent.id, channel.id);
      if (count > 0) {
        toast.success(`Archived ${count} message${count !== 1 ? 's' : ''} from "${channel.name}"`);
        // Reload channels to update message counts
        loadChannels();
      } else {
        toast.info('No messages to archive');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to archive messages';
      toast.error(message);
    }
  };

  const handleArchiveMessagesOlderThan = async (days: number) => {
    if (!menuAnchor || !currentEvent) return;
    const channel = menuAnchor.channel;
    handleMenuClose();

    try {
      const count = await chatService.archiveMessagesOlderThan(currentEvent.id, channel.id, days);
      if (count > 0) {
        toast.success(`Archived ${count} message${count !== 1 ? 's' : ''} older than ${days} day${days !== 1 ? 's' : ''} from "${channel.name}"`);
        // Reload channels to update message counts
        loadChannels();
      } else {
        toast.info(`No messages older than ${days} day${days !== 1 ? 's' : ''} to archive`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to archive messages';
      toast.error(message);
    }
  };

  if (eventLoading) {
    return (
      <Container maxWidth={false} disableGutters>
        <Stack
          spacing={2}
          padding={CobraStyles.Padding.MainWindow}
          alignItems="center"
          justifyContent="center"
          sx={{ minHeight: '50vh' }}
        >
          <CircularProgress />
          <Typography>Loading...</Typography>
        </Stack>
      </Container>
    );
  }

  if (!currentEvent) {
    return (
      <Container maxWidth={false} disableGutters>
        <Stack spacing={3} padding={CobraStyles.Padding.MainWindow}>
          <Alert severity="warning" icon={<FontAwesomeIcon icon={faExclamationTriangle} />}>
            Please select an event to access chat administration.
          </Alert>
          <Box>
            <CobraPrimaryButton onClick={() => navigate('/events')}>
              Go to Events
            </CobraPrimaryButton>
          </Box>
        </Stack>
      </Container>
    );
  }

  /**
   * Format a date string safely, handling timezone issues.
   * Backend sends UTC dates; we parse and format them for local display.
   */
  const formatTimeAgo = (dateString: string | undefined): string => {
    if (!dateString) return 'No messages';
    try {
      // Parse ISO string (UTC from backend) - date-fns parseISO handles this correctly
      const date = parseISO(dateString);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return 'Unknown';
    }
  };

  const renderChannelRow = (channel: ChatThreadDto, isArchived = false) => {
    const icon = getChannelIcon(channel);
    // Show actions menu if user has manage permissions (for archive messages options)
    const showActionsMenu = canManageChannels && !isArchived;
    // Only show archived actions if user has manage permissions
    const showArchivedActions = canManageChannels && isArchived;

    return (
      <TableRow
        key={channel.id}
        hover
        sx={{
          cursor: 'pointer',
          '&:hover': { backgroundColor: theme.palette.action.hover },
        }}
        onClick={() => !isArchived && handleGoToChat(channel.id)}
      >
        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <FontAwesomeIcon
              icon={icon}
              style={{ color: theme.palette.text.secondary, fontSize: 16 }}
            />
            <Box>
              <Typography variant="body2" fontWeight={500}>
                {channel.name}
              </Typography>
              {channel.description && (
                <Typography variant="caption" color="text.secondary">
                  {channel.description}
                </Typography>
              )}
            </Box>
          </Box>
        </TableCell>
        <TableCell>
          <Chip
            size="small"
            label={channel.channelTypeName}
            sx={{
              fontSize: 11,
              height: 22,
              backgroundColor: theme.palette.grey[100],
            }}
          />
        </TableCell>
        <TableCell align="center">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'center' }}>
            <FontAwesomeIcon
              icon={faMessage}
              style={{ fontSize: 12, color: theme.palette.text.secondary }}
            />
            <Typography variant="body2">{channel.messageCount}</Typography>
          </Box>
        </TableCell>
        <TableCell>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <FontAwesomeIcon
                icon={faClock}
                style={{ fontSize: 12, color: theme.palette.text.secondary }}
              />
              <Typography variant="body2" color="text.secondary">
                {formatTimeAgo(channel.lastMessageAt)}
              </Typography>
            </Box>
            {channel.lastMessageSender && (
              <Typography variant="caption" color="text.secondary" sx={{ ml: 2.25 }}>
                by {channel.lastMessageSender}
              </Typography>
            )}
          </Box>
        </TableCell>
        <TableCell align="center">
          {channel.externalChannel ? (
            <Tooltip title={PlatformInfo[channel.externalChannel.platform as ExternalPlatform]?.name || 'External'}>
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  backgroundColor: `${PlatformInfo[channel.externalChannel.platform as ExternalPlatform]?.color || '#666'}15`,
                }}
              >
                <FontAwesomeIcon
                  icon={getPlatformIcon(channel.externalChannel.platform as ExternalPlatform)}
                  style={{
                    fontSize: 14,
                    color: PlatformInfo[channel.externalChannel.platform as ExternalPlatform]?.color || '#666',
                  }}
                />
              </Box>
            </Tooltip>
          ) : null}
        </TableCell>
        {canManageChannels && (
          <TableCell align="right" onClick={(e) => e.stopPropagation()}>
            {showArchivedActions ? (
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                <Tooltip title="Restore channel">
                  <IconButton
                    size="small"
                    onClick={() => handleRestoreClick(channel)}
                    sx={{ color: theme.palette.success.main }}
                  >
                    <FontAwesomeIcon icon={faRotateLeft} style={{ fontSize: 14 }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Permanently delete">
                  <IconButton
                    size="small"
                    onClick={() => handlePermanentDeleteClick(channel)}
                    sx={{ color: theme.palette.error.main }}
                  >
                    <FontAwesomeIcon icon={faTrash} style={{ fontSize: 14 }} />
                  </IconButton>
                </Tooltip>
              </Box>
            ) : showActionsMenu ? (
              <IconButton size="small" onClick={(e) => handleMenuOpen(e, channel)}>
                <FontAwesomeIcon icon={faEllipsisVertical} style={{ fontSize: 14 }} />
              </IconButton>
            ) : null}
          </TableCell>
        )}
      </TableRow>
    );
  };

  return (
    <Container maxWidth={false} disableGutters>
      <Stack spacing={2} padding={CobraStyles.Padding.MainWindow}>
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Typography variant="h5" fontWeight={600}>
            Chat Channels
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <CobraPrimaryButton onClick={() => handleGoToChat()}>
              Go to Chat
            </CobraPrimaryButton>
            {canManageChannels && (
              <CobraNewButton onClick={() => setCreateDialogOpen(true)}>
                New Channel
              </CobraNewButton>
            )}
          </Box>
        </Box>

        {/* Error state */}
        {error && (
          <Alert severity="error">
            {error}
          </Alert>
        )}

        {/* Loading state */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* Tabs */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs
                value={tabIndex}
                onChange={(_, newValue) => setTabIndex(newValue)}
                sx={{
                  '& .MuiTab-root': {
                    textTransform: 'none',
                    fontWeight: 500,
                  },
                }}
              >
                <Tab
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <span>Active Channels</span>
                      <Chip
                        size="small"
                        label={activeChannels.length}
                        sx={{ height: 20, fontSize: 11 }}
                      />
                    </Box>
                  }
                />
                {canManageChannels && (
                  <Tab
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <span>Archived Channels</span>
                        {archivedChannels.length > 0 && (
                          <Chip
                            size="small"
                            label={archivedChannels.length}
                            sx={{ height: 20, fontSize: 11 }}
                          />
                        )}
                      </Box>
                    }
                  />
                )}
              </Tabs>
            </Box>

            {/* Active Channels Tab */}
            <TabPanel value={tabIndex} index={0}>
              {activeChannels.length === 0 ? (
                <Alert severity="info">
                  No active channels. {canManageChannels ? 'Create a new channel to get started.' : ''}
                </Alert>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Channel</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell align="center">Messages</TableCell>
                        <TableCell>Last Activity</TableCell>
                        <TableCell>External</TableCell>
                        {canManageChannels && <TableCell align="right">Actions</TableCell>}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {activeChannels.map((channel) => renderChannelRow(channel))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </TabPanel>

            {/* Archived Channels Tab - only show for Manage role */}
            {canManageChannels && (
              <TabPanel value={tabIndex} index={1}>
                {archivedChannels.length === 0 ? (
                  <Alert severity="info">
                    No archived channels.
                  </Alert>
                ) : (
                  <TableContainer component={Paper} variant="outlined">
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Channel</TableCell>
                          <TableCell>Type</TableCell>
                          <TableCell align="center">Messages</TableCell>
                          <TableCell>Last Activity</TableCell>
                          <TableCell>External</TableCell>
                          <TableCell align="right">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {archivedChannels.map((channel) => renderChannelRow(channel, true))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </TabPanel>
            )}
          </>
        )}

        {/* Context Menu for Active Channels */}
        <Menu
          anchorEl={menuAnchor?.element}
          open={Boolean(menuAnchor)}
          onClose={handleMenuClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
        >
          <MenuItem onClick={handleArchiveAllMessages}>
            <ListItemIcon>
              <FontAwesomeIcon icon={faMessage} style={{ fontSize: 14 }} />
            </ListItemIcon>
            <ListItemText>Archive All Messages</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => handleArchiveMessagesOlderThan(7)}>
            <ListItemIcon>
              <FontAwesomeIcon icon={faCalendarMinus} style={{ fontSize: 14 }} />
            </ListItemIcon>
            <ListItemText>Archive Messages Older Than 7 Days</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => handleArchiveMessagesOlderThan(30)}>
            <ListItemIcon>
              <FontAwesomeIcon icon={faCalendarMinus} style={{ fontSize: 14 }} />
            </ListItemIcon>
            <ListItemText>Archive Messages Older Than 30 Days</ListItemText>
          </MenuItem>
          {menuAnchor?.channel && canArchiveChannel(menuAnchor.channel) && (
            <>
              <Divider />
              <MenuItem onClick={handleArchiveClick}>
                <ListItemIcon>
                  <FontAwesomeIcon icon={faBoxArchive} style={{ fontSize: 14 }} />
                </ListItemIcon>
                <ListItemText>Archive Channel</ListItemText>
              </MenuItem>
            </>
          )}
        </Menu>

        {/* Create Channel Dialog */}
        <CreateChannelDialog
          open={createDialogOpen}
          onClose={() => setCreateDialogOpen(false)}
          eventId={currentEvent.id}
          onChannelCreated={handleChannelCreated}
        />

        {/* Archive Channel Dialog */}
        <ArchiveChannelDialog
          open={archiveDialogOpen}
          onClose={() => {
            setArchiveDialogOpen(false);
            setSelectedChannel(null);
          }}
          channel={selectedChannel}
          eventId={currentEvent.id}
          onChannelArchived={handleChannelArchived}
        />

        {/* Restore Channel Dialog */}
        <RestoreChannelDialog
          open={restoreDialogOpen}
          onClose={() => {
            setRestoreDialogOpen(false);
            setSelectedChannel(null);
          }}
          channel={selectedChannel}
          eventId={currentEvent.id}
          onChannelRestored={handleChannelRestored}
        />

        {/* Permanent Delete Dialog */}
        <PermanentDeleteDialog
          open={permanentDeleteDialogOpen}
          onClose={() => {
            setPermanentDeleteDialogOpen(false);
            setSelectedChannel(null);
          }}
          channel={selectedChannel}
          eventId={currentEvent.id}
          onChannelDeleted={handleChannelPermanentlyDeleted}
        />
      </Stack>
    </Container>
  );
};

export default ChatAdminPage;
