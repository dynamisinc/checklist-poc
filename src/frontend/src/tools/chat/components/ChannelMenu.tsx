/**
 * ChannelMenu Component
 *
 * Reusable menu for external channel operations.
 * Used in both ChatPage (full page) and ChatSidebar to provide
 * consistent UI for connecting/disconnecting external channels.
 *
 * Features:
 * - Connect GroupMe channel (creates new external channel)
 * - Link Teams to existing channel
 * - View/disconnect connected channels
 * - Platform-specific icons and colors
 *
 * Related User Stories:
 * - UC-013: External platform integration
 */

import React from 'react';
import {
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  Chip,
  Tooltip,
  IconButton,
  Box,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faEllipsisV,
  faLink,
  faLinkSlash,
  faExternalLinkAlt,
} from '@fortawesome/free-solid-svg-icons';
import type { ExternalChannelMappingDto, ChatThreadDto } from '../types/chat';
import { ExternalPlatform } from '../types/chat';
import { getPlatformIcon, getPlatformColor, getPlatformName } from '../utils/platformUtils';
import type { ExternalMessagingConfig } from '../hooks/useExternalMessagingConfig';

interface ChannelMenuProps {
  /** External messaging configuration */
  config: ExternalMessagingConfig;
  /** Active external channel mappings */
  activeChannels: ExternalChannelMappingDto[];
  /** Currently selected channel (for Teams linking) */
  selectedChannel?: ChatThreadDto | null;
  /** Handler for creating a GroupMe channel */
  onCreateGroupMe: () => void;
  /** Handler for opening Teams dialog */
  onOpenTeamsDialog: () => void;
  /** Handler for disconnecting a channel */
  onDisconnectChannel: (channelId: string) => void;
  /** Whether to show connected channel chips */
  showChips?: boolean;
  /** Whether component is in compact mode (sidebar) */
  compact?: boolean;
}

/**
 * Connected channel chip component.
 */
const ConnectedChip: React.FC<{
  channel: ExternalChannelMappingDto;
  compact?: boolean;
  onDisconnect?: () => void;
}> = ({ channel, compact, onDisconnect }) => {
  const platformName = getPlatformName(channel.platform);
  const platformColor = getPlatformColor(channel.platform);

  if (compact) {
    return (
      <Chip
        size="small"
        label={platformName}
        sx={{
          height: 20,
          fontSize: 10,
          backgroundColor: `${platformColor}20`,
          color: platformColor,
        }}
        onClick={() => {
          if (channel.shareUrl) {
            window.open(channel.shareUrl, '_blank');
          }
        }}
        icon={
          channel.shareUrl ? (
            <FontAwesomeIcon icon={faExternalLinkAlt} style={{ fontSize: 8 }} />
          ) : undefined
        }
      />
    );
  }

  return (
    <Chip
      size="small"
      label={platformName}
      onDelete={onDisconnect}
      deleteIcon={
        <Tooltip title="Disconnect channel">
          <span>
            <FontAwesomeIcon icon={faLinkSlash} style={{ fontSize: 10 }} />
          </span>
        </Tooltip>
      }
      sx={{
        backgroundColor: `${platformColor}20`,
        color: platformColor,
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
};

export const ChannelMenu: React.FC<ChannelMenuProps> = ({
  config,
  activeChannels,
  selectedChannel,
  onCreateGroupMe,
  onOpenTeamsDialog,
  onDisconnectChannel,
  showChips = true,
  compact = false,
}) => {
  const theme = useTheme();
  const [menuAnchor, setMenuAnchor] = React.useState<null | HTMLElement>(null);

  const hasGroupMeChannel = activeChannels.some(
    (c) => c.platform === ExternalPlatform.GroupMe
  );

  const handleMenuOpen = (e: React.MouseEvent<HTMLElement>) => {
    setMenuAnchor(e.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleCreateGroupMe = () => {
    handleMenuClose();
    onCreateGroupMe();
  };

  const handleOpenTeams = () => {
    handleMenuClose();
    onOpenTeamsDialog();
  };

  const handleDisconnect = (channelId: string) => {
    handleMenuClose();
    onDisconnectChannel(channelId);
  };

  // Determine if Teams linking should be disabled
  const teamsDisabled =
    !config.teams.isConnected ||
    !selectedChannel ||
    selectedChannel.externalChannel !== null;

  // Get Teams menu item secondary text
  const getTeamsSecondary = () => {
    if (!config.teams.isConnected) {
      return 'Bot not available';
    }
    if (config.teams.availableConversations === 0) {
      return 'No channels available';
    }
    if (selectedChannel?.externalChannel) {
      return `Linked to ${selectedChannel.externalChannel.platformName}`;
    }
    return `${config.teams.availableConversations} channel(s) available`;
  };

  // Get Teams menu item primary text
  const getTeamsPrimary = () => {
    if (selectedChannel?.externalChannel) {
      return 'Teams Already Linked';
    }
    if (selectedChannel) {
      return `Link Teams to "${selectedChannel.name}"`;
    }
    return 'Link Teams to Channel';
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {/* Connected channel chips */}
      {showChips &&
        activeChannels.map((channel) => (
          <ConnectedChip
            key={channel.id}
            channel={channel}
            compact={compact}
            onDisconnect={compact ? undefined : () => onDisconnectChannel(channel.id)}
          />
        ))}

      {/* Menu button */}
      <Tooltip title={compact ? 'External channels' : 'Channel options'}>
        <IconButton size="small" onClick={handleMenuOpen}>
          <FontAwesomeIcon icon={faEllipsisV} style={{ fontSize: compact ? 12 : 14 }} />
        </IconButton>
      </Tooltip>

      {/* Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        {/* GroupMe option */}
        {!hasGroupMeChannel && config.groupMe.isConfigured && (
          <MenuItem onClick={handleCreateGroupMe}>
            <ListItemIcon>
              <FontAwesomeIcon icon={faLink} />
            </ListItemIcon>
            <ListItemText>Connect GroupMe</ListItemText>
          </MenuItem>
        )}

        {/* Teams option */}
        {config.teams.isConfigured && (
          <MenuItem onClick={handleOpenTeams} disabled={teamsDisabled}>
            <ListItemIcon>
              <FontAwesomeIcon icon={faLink} />
            </ListItemIcon>
            <ListItemText
              primary={compact ? 'Connect Teams' : getTeamsPrimary()}
              secondary={compact ? (
                !config.teams.isConnected
                  ? 'Bot not available'
                  : config.teams.availableConversations === 0
                    ? 'No channels available'
                    : `${config.teams.availableConversations} channel(s)`
              ) : getTeamsSecondary()}
            />
          </MenuItem>
        )}

        {/* Connected channels section */}
        {activeChannels.length > 0 && (
          <>
            <Divider />
            <MenuItem disabled>
              <Typography variant="caption" color="text.secondary">
                Connected Channels
              </Typography>
            </MenuItem>
            {activeChannels.map((channel) => {
              const platformIcon = getPlatformIcon(channel.platform);
              const platformColor = getPlatformColor(channel.platform);

              return (
                <MenuItem key={channel.id} onClick={() => handleDisconnect(channel.id)}>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <FontAwesomeIcon
                      icon={platformIcon}
                      style={{
                        color: platformColor,
                        fontSize: 16,
                      }}
                    />
                  </ListItemIcon>
                  <ListItemText>Disconnect {channel.externalGroupName}</ListItemText>
                  <FontAwesomeIcon
                    icon={faLinkSlash}
                    style={{
                      color: theme.palette.text.secondary,
                      fontSize: 12,
                      marginLeft: 8,
                    }}
                  />
                </MenuItem>
              );
            })}
          </>
        )}

        {/* Empty state */}
        {!hasGroupMeChannel &&
          !config.teams.isConfigured &&
          activeChannels.length === 0 && (
            <MenuItem disabled>
              <Typography variant="caption" color="text.secondary">
                No external channels
              </Typography>
            </MenuItem>
          )}
      </Menu>
    </Box>
  );
};

export default ChannelMenu;
