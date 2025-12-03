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
} from '@mui/material';
import { useTheme, Theme } from '@mui/material/styles';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faComments,
  faBullhorn,
  faChevronDown,
  faChevronRight,
  faPlus,
  faHashtag,
  faUserGroup,
} from '@fortawesome/free-solid-svg-icons';
import { chatService } from '../services/chatService';
import type { ChatThreadDto } from '../types/chat';
import { ChannelType, ExternalPlatform, PlatformInfo } from '../types/chat';

interface ChannelListProps {
  eventId: string;
  selectedChannelId?: string;
  onChannelSelect: (channel: ChatThreadDto) => void;
  compact?: boolean;
}

/**
 * Get icon for channel based on type and metadata
 */
const getChannelIcon = (channel: ChatThreadDto) => {
  // Use custom icon if provided
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

  // Default icons by type
  switch (channel.channelType) {
    case ChannelType.Internal:
      return faComments;
    case ChannelType.Announcements:
      return faBullhorn;
    case ChannelType.External:
      return faComments; // Will be overridden by platform icon
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
  if (channel.channelType === ChannelType.External && channel.externalChannel) {
    const platformKey = channel.externalChannel.platform as ExternalPlatform;
    const platformInfo = PlatformInfo[platformKey];
    if (platformInfo) {
      return platformInfo.color;
    }
  }

  // Default colors by type
  switch (channel.channelType) {
    case ChannelType.Internal:
      return theme.palette.primary.main;
    case ChannelType.Announcements:
      return theme.palette.warning.main;
    case ChannelType.Position:
      return theme.palette.info.main;
    case ChannelType.Custom:
    default:
      return theme.palette.text.secondary;
  }
};

export const ChannelList: React.FC<ChannelListProps> = ({
  eventId,
  selectedChannelId,
  onChannelSelect,
  compact = false,
}) => {
  const theme = useTheme();
  const [channels, setChannels] = useState<ChatThreadDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    internal: true,
    external: true,
    custom: false,
  });

  // Load channels
  const loadChannels = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await chatService.getChannels(eventId);
      setChannels(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load channels';
      setError(message);
      console.error('Failed to load channels:', err);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadChannels();
  }, [loadChannels]);

  // Toggle section expansion
  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Group channels by type
  const internalChannels = channels.filter(
    (c) => c.channelType === ChannelType.Internal || c.channelType === ChannelType.Announcements
  );
  const externalChannels = channels.filter((c) => c.channelType === ChannelType.External);
  const otherChannels = channels.filter(
    (c) => c.channelType === ChannelType.Position || c.channelType === ChannelType.Custom
  );

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
      </ListItemButton>
    );
  };

  const renderSection = (
    title: string,
    sectionKey: string,
    sectionChannels: ChatThreadDto[],
    showAddButton = false
  ) => {
    if (sectionChannels.length === 0 && !showAddButton) return null;

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
                  // TODO: Open create channel dialog
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
            {sectionChannels.map(renderChannelItem)}
          </List>
        </Collapse>
      </Box>
    );
  };

  return (
    <Box sx={{ py: 1 }}>
      {renderSection('Channels', 'internal', internalChannels)}
      {renderSection('External', 'external', externalChannels)}
      {renderSection('Groups', 'custom', otherChannels, true)}

      {channels.length === 0 && (
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            No channels available
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default ChannelList;
