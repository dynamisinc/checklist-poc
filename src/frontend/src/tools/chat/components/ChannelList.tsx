/**
 * ChannelList Component
 *
 * Displays event channels in an accordion-style list.
 * Supports Internal, Announcements, External, and Custom channel types.
 *
 * Related User Stories:
 * - UC-001: Auto-Create Default Channels
 * - UC-012: Access event channels via accordion sidebar
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Skeleton,
  Collapse,
  IconButton,
  Tooltip,
  Badge,
  Menu,
  MenuItem,
  ListItemIcon as MenuItemIcon,
} from '@mui/material';
import { useTheme, Theme } from '@mui/material/styles';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faComments,
  faCommentDots,
  faCommentSms,
  faBullhorn,
  faChevronDown,
  faChevronRight,
  faPlus,
  faHashtag,
  faUserGroup,
  faEllipsisVertical,
  faBoxArchive,
  faStar,
  faCogs,
  faClipboardList,
  faTruck,
  faDollarSign,
  faShieldHalved,
  faHandshake,
} from '@fortawesome/free-solid-svg-icons';
import { faMicrosoft, faSlack } from '@fortawesome/free-brands-svg-icons';
import { chatService } from '../services/chatService';
import { useExternalMessagingConfig } from '../hooks/useExternalMessagingConfig';
import type { ChatThreadDto } from '../types/chat';
import { ChannelType, ExternalPlatform, PlatformInfo, isChannelType } from '../types/chat';
import { CreateChannelDialog } from './CreateChannelDialog';
import { ArchiveChannelDialog } from './ArchiveChannelDialog';

interface ChannelListProps {
  eventId: string;
  selectedChannelId?: string;
  onChannelSelect: (channel: ChatThreadDto) => void;
  compact?: boolean;
  /** Key to force a refresh of channels (increment to reload) */
  refreshKey?: number;
}

/**
 * Map icon name string to FontAwesome icon definition
 */
const iconNameToIcon = (iconName: string) => {
  const iconMap: Record<string, typeof faComments> = {
    comments: faComments,
    bullhorn: faBullhorn,
    hashtag: faHashtag,
    'user-group': faUserGroup,
    star: faStar,
    cogs: faCogs,
    'clipboard-list': faClipboardList,
    truck: faTruck,
    'dollar-sign': faDollarSign,
    'shield-halved': faShieldHalved,
    handshake: faHandshake,
  };
  return iconMap[iconName] ?? faHashtag;
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
 * Get icon for channel based on type and metadata
 */
const getChannelIcon = (channel: ChatThreadDto) => {
  // Use custom icon if provided
  if (channel.iconName) {
    return iconNameToIcon(channel.iconName);
  }

  // External channels use platform-specific icons
  if (isChannelType(channel.channelType, ChannelType.External) && channel.externalChannel) {
    return getPlatformIcon(channel.externalChannel.platform);
  }

  // Default icons by type
  switch (channel.channelType) {
    case ChannelType.Internal:
      return faComments;
    case ChannelType.Announcements:
      return faBullhorn;
    case ChannelType.External:
      return faCommentDots; // Fallback if no externalChannel
    case ChannelType.Position:
      return faUserGroup;
    case ChannelType.Custom:
    default:
      return faHashtag;
  }
};

/**
 * Get color for channel
 */
const getChannelColor = (channel: ChatThreadDto, theme: Theme) => {
  // Use custom color if provided
  if (channel.color) {
    return channel.color;
  }

  // External channels use platform colors
  if (isChannelType(channel.channelType, ChannelType.External) && channel.externalChannel) {
    const platformKey = channel.externalChannel.platform as ExternalPlatform;
    const platformInfo = PlatformInfo[platformKey];
    if (platformInfo) {
      return platformInfo.color;
    }
  }

  // Default colors by type
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

export const ChannelList: React.FC<ChannelListProps> = ({
  eventId,
  selectedChannelId,
  onChannelSelect,
  compact = false,
  refreshKey = 0,
}) => {
  const theme = useTheme();
  const { isConfigured: externalMessagingConfigured } = useExternalMessagingConfig();
  const [channels, setChannels] = useState<ChatThreadDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    internal: true,
    position: true,
    external: true,
    custom: false,
  });
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [channelToArchive, setChannelToArchive] = useState<ChatThreadDto | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<{ element: HTMLElement; channel: ChatThreadDto } | null>(null);

  // Load channels (uses user-visible endpoint to filter position channels by user's positions)
  const loadChannels = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // Use the user-visible endpoint which filters position channels by user's assigned positions
      const data = await chatService.getUserVisibleChannels(eventId);
      setChannels(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load channels';
      setError(message);
      console.error('[ChannelList] Failed to load channels:', err);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadChannels();
  }, [loadChannels, refreshKey]);

  // Refresh channels when profile changes (position or account change)
  useEffect(() => {
    const handleProfileChange = () => {
      console.log('[ChannelList] Profile changed, refreshing channels');
      loadChannels();
    };
    window.addEventListener('profileChanged', handleProfileChange);
    window.addEventListener('accountChanged', handleProfileChange);
    return () => {
      window.removeEventListener('profileChanged', handleProfileChange);
      window.removeEventListener('accountChanged', handleProfileChange);
    };
  }, [loadChannels]);

  // Toggle section expansion
  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Handle channel created - add to list and select it
  const handleChannelCreated = (channel: ChatThreadDto) => {
    setChannels((prev) => [...prev, channel]);
    // Expand the custom section to show the new channel
    setExpandedSections((prev) => ({ ...prev, custom: true }));
    // Auto-select the new channel
    onChannelSelect(channel);
  };

  // Handle channel archived - remove from list
  const handleChannelArchived = (channelId: string) => {
    setChannels((prev) => prev.filter((c) => c.id !== channelId));
    // If the archived channel was selected, clear selection
    if (selectedChannelId === channelId) {
      // Select the first remaining channel if available
      const remaining = channels.filter((c) => c.id !== channelId);
      if (remaining.length > 0) {
        onChannelSelect(remaining[0]);
      }
    }
  };

  // Menu handlers
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, channel: ChatThreadDto) => {
    event.stopPropagation();
    setMenuAnchor({ element: event.currentTarget, channel });
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleArchiveClick = () => {
    if (menuAnchor) {
      setChannelToArchive(menuAnchor.channel);
      setArchiveDialogOpen(true);
      handleMenuClose();
    }
  };

  // Check if a channel can be archived (for menu display)
  const canArchiveChannel = (channel: ChatThreadDto): boolean => {
    if (channel.isDefaultEventThread) return false;
    if (isChannelType(channel.channelType, ChannelType.External)) return false;
    if (isChannelType(channel.channelType, ChannelType.Announcements)) return false;
    return true;
  };

  // Group channels by type (using shared isChannelType helper for string/number enum handling)
  const internalChannels = channels.filter(
    (c) => isChannelType(c.channelType, ChannelType.Internal, ChannelType.Announcements)
  );
  const positionChannels = channels.filter((c) => isChannelType(c.channelType, ChannelType.Position));
  const externalChannels = channels.filter((c) => isChannelType(c.channelType, ChannelType.External));
  const customChannels = channels.filter((c) => isChannelType(c.channelType, ChannelType.Custom));

  if (loading) {
    return (
      <Box sx={{ p: compact ? 1 : 2 }}>
        {[1, 2, 3].map((i) => (
          <Skeleton
            key={i}
            variant="rectangular"
            height={36}
            sx={{ mb: 1, borderRadius: 1 }}
          />
        ))}
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" color="error">
          {error}
        </Typography>
      </Box>
    );
  }

  const renderChannelItem = (channel: ChatThreadDto) => {
    const isSelected = channel.id === selectedChannelId;
    const icon = getChannelIcon(channel);
    const color = getChannelColor(channel, theme);
    const showMenu = canArchiveChannel(channel);

    return (
      <ListItemButton
        key={channel.id}
        selected={isSelected}
        onClick={() => onChannelSelect(channel)}
        sx={{
          borderRadius: 1,
          mb: 0.5,
          py: compact ? 0.75 : 1,
          px: compact ? 1.5 : 2,
          '&.Mui-selected': {
            backgroundColor: `${color}15`,
            '&:hover': {
              backgroundColor: `${color}25`,
            },
          },
          '&:hover': {
            backgroundColor: theme.palette.action.hover,
            '& .channel-menu-button': {
              opacity: 1,
            },
          },
        }}
      >
        <ListItemIcon sx={{ minWidth: 32 }}>
          <FontAwesomeIcon
            icon={icon}
            style={{
              fontSize: compact ? 14 : 16,
              color: isSelected ? color : theme.palette.text.secondary,
            }}
          />
        </ListItemIcon>
        <ListItemText
          primary={channel.name}
          secondary={!compact && channel.description ? channel.description : undefined}
          primaryTypographyProps={{
            fontSize: compact ? 13 : 14,
            fontWeight: isSelected ? 600 : 400,
            color: isSelected ? color : theme.palette.text.primary,
            noWrap: true,
          }}
          secondaryTypographyProps={{
            fontSize: 11,
            noWrap: true,
          }}
        />
        {channel.messageCount > 0 && (
          <Badge
            badgeContent={channel.messageCount}
            color="default"
            max={99}
            sx={{
              mr: showMenu ? 0.5 : 0,
              '& .MuiBadge-badge': {
                fontSize: 10,
                height: 16,
                minWidth: 16,
                backgroundColor: theme.palette.grey[200],
                color: theme.palette.text.secondary,
              },
            }}
          />
        )}
        {showMenu && (
          <IconButton
            className="channel-menu-button"
            size="small"
            onClick={(e) => handleMenuOpen(e, channel)}
            sx={{
              p: 0.5,
              opacity: 0,
              transition: 'opacity 0.15s',
              '&:hover': {
                backgroundColor: theme.palette.action.hover,
              },
            }}
          >
            <FontAwesomeIcon
              icon={faEllipsisVertical}
              style={{ fontSize: 12, color: theme.palette.text.secondary }}
            />
          </IconButton>
        )}
      </ListItemButton>
    );
  };

  const renderSection = (
    title: string,
    sectionKey: string,
    sectionChannels: ChatThreadDto[],
    options: { showAddButton?: boolean; alwaysShow?: boolean; emptyMessage?: string } = {}
  ) => {
    const { showAddButton = false, alwaysShow = false, emptyMessage } = options;
    if (sectionChannels.length === 0 && !showAddButton && !alwaysShow) return null;

    const isExpanded = expandedSections[sectionKey];

    return (
      <Box key={sectionKey} sx={{ mb: 1 }}>
        <Box
          onClick={() => toggleSection(sectionKey)}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: compact ? 1.5 : 2,
            py: 0.5,
            cursor: 'pointer',
            '&:hover': {
              backgroundColor: theme.palette.action.hover,
            },
            borderRadius: 1,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FontAwesomeIcon
              icon={isExpanded ? faChevronDown : faChevronRight}
              style={{ fontSize: 10, color: theme.palette.text.secondary }}
            />
            <Typography
              variant="overline"
              sx={{
                fontSize: 10,
                fontWeight: 600,
                color: theme.palette.text.secondary,
                letterSpacing: '0.08em',
              }}
            >
              {title}
            </Typography>
          </Box>
          {showAddButton && (
            <Tooltip title={`Add ${title.toLowerCase()} channel`}>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  setCreateDialogOpen(true);
                }}
                sx={{ p: 0.5 }}
              >
                <FontAwesomeIcon
                  icon={faPlus}
                  style={{ fontSize: 10, color: theme.palette.text.secondary }}
                />
              </IconButton>
            </Tooltip>
          )}
        </Box>
        <Collapse in={isExpanded}>
          <List dense disablePadding sx={{ px: compact ? 0.5 : 1 }}>
            {sectionChannels.length > 0 ? (
              sectionChannels.map(renderChannelItem)
            ) : emptyMessage ? (
              <Typography
                variant="body2"
                sx={{
                  px: compact ? 1.5 : 2,
                  py: 1,
                  color: theme.palette.text.secondary,
                  fontStyle: 'italic',
                  fontSize: 12,
                }}
              >
                {emptyMessage}
              </Typography>
            ) : null}
          </List>
        </Collapse>
      </Box>
    );
  };

  return (
    <Box sx={{ py: 1 }}>
      {renderSection('Channels', 'internal', internalChannels, {
        alwaysShow: true,
        emptyMessage: 'No channels available',
      })}
      {/* Position channels section - only show if user has position channels visible */}
      {positionChannels.length > 0 &&
        renderSection('My Sections', 'position', positionChannels, {
          alwaysShow: false,
          emptyMessage: undefined,
        })}
      {/* Only show External section if external messaging is configured by admin */}
      {externalMessagingConfigured &&
        renderSection('External', 'external', externalChannels, {
          alwaysShow: true,
          emptyMessage: 'No external channels connected',
        })}
      {renderSection('Groups', 'custom', customChannels, { showAddButton: true })}


      {/* Create Channel Dialog */}
      <CreateChannelDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        eventId={eventId}
        onChannelCreated={handleChannelCreated}
      />

      {/* Archive Channel Dialog */}
      <ArchiveChannelDialog
        open={archiveDialogOpen}
        onClose={() => {
          setArchiveDialogOpen(false);
          setChannelToArchive(null);
        }}
        channel={channelToArchive}
        eventId={eventId}
        onChannelArchived={handleChannelArchived}
      />

      {/* Channel Context Menu */}
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
        slotProps={{
          paper: {
            sx: {
              minWidth: 150,
              boxShadow: theme.shadows[4],
            },
          },
        }}
      >
        <MenuItem
          onClick={handleArchiveClick}
          sx={{
            color: theme.palette.warning.main,
            '&:hover': {
              backgroundColor: `${theme.palette.warning.main}10`,
            },
          }}
        >
          <MenuItemIcon sx={{ color: 'inherit', minWidth: 32 }}>
            <FontAwesomeIcon icon={faBoxArchive} style={{ fontSize: 14 }} />
          </MenuItemIcon>
          <ListItemText
            primary="Archive"
            primaryTypographyProps={{ fontSize: 14 }}
          />
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default ChannelList;
