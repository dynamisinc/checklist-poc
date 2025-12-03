/**
 * Chat Page
 *
 * Full-page chat view with tabbed channel navigation.
 * Displays all event channels with support for external platform
 * integration (GroupMe, etc.)
 *
 * Route: /chat
 * Breadcrumb: Home / Events / [Event Name] / Chat
 *
 * Related User Stories:
 * - UC-001: Auto-Create Default Channels (channel tabs)
 * - UC-014: Full-page chat view with tabbed channels
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
  Skeleton,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Chip,
  Tooltip,
} from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faComments,
  faExclamationTriangle,
  faBullhorn,
  faHashtag,
  faUserGroup,
  faEllipsisV,
  faLink,
  faLinkSlash,
  faExternalLinkAlt,
  faInfoCircle,
} from '@fortawesome/free-solid-svg-icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useEvents } from '../../../shared/events';
import { EventChat } from '../components/EventChat';
import { chatService } from '../services/chatService';
import { useExternalMessagingConfig } from '../hooks/useExternalMessagingConfig';
import CobraStyles from '../../../theme/CobraStyles';
import { CobraPrimaryButton } from '../../../theme/styledComponents';
import { useTheme, Theme } from '@mui/material/styles';
import type { ChatThreadDto, ExternalChannelMappingDto } from '../types/chat';
import { ChannelType, ExternalPlatform, PlatformInfo, isChannelType } from '../types/chat';

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
 * Get color for channel tab
 */
const getChannelColor = (channel: ChatThreadDto, theme: Theme) => {
  if (channel.color) {
    return channel.color;
  }

  if (isChannelType(channel.channelType, ChannelType.External) && channel.externalChannel) {
    const platformKey = channel.externalChannel.platform as ExternalPlatform;
    const platformInfo = PlatformInfo[platformKey];
    if (platformInfo) {
      return platformInfo.color;
    }
  }

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

/**
 * Chat Page Component
 */
export const ChatPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const theme = useTheme();
  const { currentEvent, loading: eventLoading } = useEvents();
  const { isConfigured: externalMessagingConfigured } = useExternalMessagingConfig();

  // Get channel ID from URL query parameter if present
  const channelFromUrl = searchParams.get('channel');

  // Channel state
  const [channels, setChannels] = useState<ChatThreadDto[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(channelFromUrl);
  const [channelsLoading, setChannelsLoading] = useState(true);
  const [channelsError, setChannelsError] = useState<string | null>(null);

  // External channels state
  const [externalChannels, setExternalChannels] = useState<ExternalChannelMappingDto[]>([]);
  const [channelMenuAnchor, setChannelMenuAnchor] = useState<null | HTMLElement>(null);

  // Load channels when event changes
  const loadChannels = useCallback(async () => {
    if (!currentEvent) return;

    try {
      setChannelsLoading(true);
      setChannelsError(null);
      const [channelsData, externalData] = await Promise.all([
        chatService.getChannels(currentEvent.id),
        chatService.getExternalChannels(currentEvent.id),
      ]);
      setChannels(channelsData);
      setExternalChannels(externalData);

      // Select channel from URL or default to first channel
      if (channelsData.length > 0) {
        if (channelFromUrl && channelsData.some((c) => c.id === channelFromUrl)) {
          // Channel from URL exists, keep it selected
          setSelectedChannelId(channelFromUrl);
        } else if (!selectedChannelId) {
          // No channel selected, default to first
          setSelectedChannelId(channelsData[0].id);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load channels';
      setChannelsError(message);
      console.error('Failed to load channels:', err);
    } finally {
      setChannelsLoading(false);
    }
  }, [currentEvent, selectedChannelId, channelFromUrl]);

  useEffect(() => {
    loadChannels();
  }, [loadChannels]);

  // Reset selection when event changes
  useEffect(() => {
    setSelectedChannelId(null);
    setChannels([]);
  }, [currentEvent?.id]);

  // Get selected channel
  const selectedChannel = channels.find((c) => c.id === selectedChannelId) || null;

  // Handle tab change - also update URL
  const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
    setSelectedChannelId(newValue);
    // Update URL with selected channel (replace to avoid history pollution)
    setSearchParams({ channel: newValue }, { replace: true });
  };

  // Get active external channels
  const activeChannels = externalChannels.filter((c) => c.isActive);
  const hasGroupMeChannel = activeChannels.some(
    (c) => c.platform === ExternalPlatform.GroupMe
  );

  // Create GroupMe channel
  const handleCreateGroupMeChannel = async () => {
    if (!currentEvent) return;
    setChannelMenuAnchor(null);
    try {
      const channel = await chatService.createExternalChannel(currentEvent.id, {
        platform: ExternalPlatform.GroupMe,
        customGroupName: currentEvent.name,
      });
      setExternalChannels((prev) => {
        if (prev.some((c) => c.id === channel.id)) {
          return prev;
        }
        return [...prev, channel];
      });
      // Reload channels to get the new external channel in the list
      loadChannels();
      toast.success('GroupMe channel connected! Share the link with external team members.');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create GroupMe channel';
      toast.error(errorMsg);
    }
  };

  // Disconnect external channel
  const handleDisconnectChannel = async (channelId: string) => {
    if (!currentEvent) return;
    try {
      await chatService.deactivateExternalChannel(currentEvent.id, channelId);
      setExternalChannels((prev) => prev.filter((c) => c.id !== channelId));
      toast.success('External channel disconnected');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to disconnect channel';
      toast.error(errorMsg);
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
            Please select an event to access the chat.
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

  return (
    <Container
      maxWidth={false}
      disableGutters
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      <Stack
        spacing={2}
        padding={CobraStyles.Padding.MainWindow}
        sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
      >
        {/* Info Banner - subtle gray with good contrast */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 2,
            py: 1,
            backgroundColor: theme.palette.grey[100],
            borderRadius: 1,
            border: `1px solid ${theme.palette.grey[300]}`,
          }}
        >
          <FontAwesomeIcon
            icon={faInfoCircle}
            style={{ color: theme.palette.text.secondary, fontSize: 14 }}
          />
          <Typography variant="body2" color="text.secondary">
            Chat with your team in real-time. Connect external channels like GroupMe
            to include field personnel who don't have access to COBRA.
          </Typography>
        </Box>

        {/* Channel Tabs and Actions Row */}
        <Box sx={{ maxWidth: 900, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 2,
            }}
          >
            {/* Channel Tabs */}
            <Box sx={{ flex: 1, borderBottom: 1, borderColor: 'divider' }}>
              {channelsLoading ? (
                <Box sx={{ display: 'flex', gap: 1, py: 1 }}>
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} variant="rounded" width={100} height={32} />
                  ))}
                </Box>
              ) : channelsError ? null : channels.length > 0 ? (
                <Tabs
                  value={selectedChannelId || false}
                  onChange={handleTabChange}
                  variant="scrollable"
                  scrollButtons="auto"
                  sx={{
                    '& .MuiTab-root': {
                      textTransform: 'none',
                      minHeight: 42,
                      fontWeight: 500,
                    },
                  }}
                >
                  {channels.map((channel) => {
                    const icon = getChannelIcon(channel);
                    const color = getChannelColor(channel, theme);
                    const isSelected = channel.id === selectedChannelId;

                    return (
                      <Tab
                        key={channel.id}
                        value={channel.id}
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <FontAwesomeIcon
                              icon={icon}
                              style={{
                                fontSize: 14,
                                color: isSelected ? color : theme.palette.text.secondary,
                              }}
                            />
                            <span>{channel.name}</span>
                          </Box>
                        }
                        sx={{
                          '&.Mui-selected': {
                            color: color,
                          },
                        }}
                      />
                    );
                  })}
                </Tabs>
              ) : null}
            </Box>

            {/* External Channels & Menu - only show if external messaging is configured */}
            {externalMessagingConfigured && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 2 }}>
                {/* Connected channel chips */}
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
                  {!hasGroupMeChannel && activeChannels.length === 0 && (
                    <MenuItem disabled>
                      <Typography variant="caption" color="text.secondary">
                        No external channels
                      </Typography>
                    </MenuItem>
                  )}
                </Menu>
              </Box>
            )}
          </Box>

          {/* Error state */}
          {channelsError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {channelsError}
            </Alert>
          )}

          {/* No channels state */}
          {!channelsLoading && !channelsError && channels.length === 0 && (
            <Alert severity="info" sx={{ mb: 2 }}>
              No channels available for this event.
            </Alert>
          )}

          {/* Chat Component */}
          {selectedChannel ? (
            <EventChat
              eventId={currentEvent.id}
              eventName={currentEvent.name}
              channelId={selectedChannel.id}
              channelName={selectedChannel.name}
              channelType={selectedChannel.channelType}
            />
          ) : !channelsLoading && channels.length === 0 ? (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: 300,
                border: `1px dashed ${theme.palette.divider}`,
                borderRadius: 1,
              }}
            >
              <Typography variant="body2" color="text.secondary">
                No channels to display
              </Typography>
            </Box>
          ) : null}
        </Box>
      </Stack>
    </Container>
  );
};

export default ChatPage;
