/**
 * ChatSidebar Component
 *
 * A resizable sidebar for event chat that appears on the right side of the screen.
 * Features:
 * - Draggable resize handle on the left edge
 * - Accordion-style channel list
 * - Channel selection with message view
 * - Persisted width via ChatSidebarContext
 *
 * Related User Stories:
 * - UC-001: Auto-Create Default Channels
 * - UC-012: Access event channels via accordion sidebar
 * - UC-014: Full-page chat view with tabbed channels
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faXmark,
  faExpand,
  faGripLinesVertical,
  faChevronLeft,
  faWifi,
  faExclamationTriangle,
} from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useChatSidebar } from '../contexts/ChatSidebarContext';
import { useEvents } from '../../../shared/events';
import { EventChat } from './EventChat';
import { ChannelList } from './ChannelList';
import { ChannelMenu } from './ChannelMenu';
import { TeamsChannelDialog } from './TeamsChannelDialog';
import { chatService } from '../services/chatService';
import { useExternalMessagingConfig } from '../hooks/useExternalMessagingConfig';
import { useChatHub } from '../hooks/useChatHub';
import type { ChatThreadDto, ExternalChannelMappingDto } from '../types/chat';
import { ExternalPlatform } from '../types/chat';

export const ChatSidebar: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { currentEvent } = useEvents();
  const {
    isOpen,
    closeSidebar,
    width,
    setWidth,
  } = useChatSidebar();
  const externalMessagingConfig = useExternalMessagingConfig();
  const { isConfigured: externalMessagingConfigured } = externalMessagingConfig;
  const { connectionState } = useChatHub();

  // Channel state
  const [selectedChannel, setSelectedChannel] = useState<ChatThreadDto | null>(null);
  const [showChannelList, setShowChannelList] = useState(true);
  // Key to force ChannelList refresh when external channels are connected/disconnected
  const [channelListRefreshKey, setChannelListRefreshKey] = useState(0);

  // External channels state
  const [externalChannels, setExternalChannels] = useState<ExternalChannelMappingDto[]>([]);

  // Resize state
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Reset selected channel when event changes
  useEffect(() => {
    setSelectedChannel(null);
    setShowChannelList(true);
  }, [currentEvent?.id]);

  // Reset selected channel when profile changes (position or account change)
  // This ensures we don't show a channel the user can no longer access
  useEffect(() => {
    const handleProfileChange = () => {
      console.log('[ChatSidebar] Profile changed, resetting selected channel');
      setSelectedChannel(null);
      setShowChannelList(true);
    };
    window.addEventListener('profileChanged', handleProfileChange);
    window.addEventListener('accountChanged', handleProfileChange);
    return () => {
      window.removeEventListener('profileChanged', handleProfileChange);
      window.removeEventListener('accountChanged', handleProfileChange);
    };
  }, []);

  // Load external channels when event changes
  useEffect(() => {
    const loadExternalChannels = async () => {
      if (!currentEvent) return;
      try {
        const data = await chatService.getExternalChannels(currentEvent.id);
        setExternalChannels(data);
      } catch (err) {
        console.error('Failed to load external channels:', err);
      }
    };
    loadExternalChannels();
  }, [currentEvent?.id]);

  // Get active external channels
  const activeChannels = externalChannels.filter((c) => c.isActive);

  // Teams dialog state
  const [teamsDialogOpen, setTeamsDialogOpen] = useState(false);

  // Create GroupMe channel
  const handleCreateGroupMeChannel = async () => {
    if (!currentEvent) return;
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
      // Refresh channel list to show new external channel
      setChannelListRefreshKey((prev) => prev + 1);
      toast.success('GroupMe channel connected! Share the link with external team members.');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create GroupMe channel';
      toast.error(errorMsg);
    }
  };

  // Open Teams channel dialog
  const handleOpenTeamsDialog = () => {
    setTeamsDialogOpen(true);
  };

  // Handle Teams channel linked to existing COBRA channel (callback from dialog)
  const handleTeamsChannelLinked = (updatedChannel: ChatThreadDto) => {
    // Update selected channel if it's the one that was linked
    if (selectedChannel?.id === updatedChannel.id) {
      setSelectedChannel(updatedChannel);
    }
    // Refresh channel list and external channels
    setChannelListRefreshKey((prev) => prev + 1);
    setTeamsDialogOpen(false);
    toast.success(`Teams linked to "${updatedChannel.name}"! Messages will sync bidirectionally.`);
  };

  // Disconnect external channel
  const handleDisconnectChannel = async (channelId: string) => {
    if (!currentEvent) return;
    try {
      await chatService.deactivateExternalChannel(currentEvent.id, channelId);
      setExternalChannels((prev) => prev.filter((c) => c.id !== channelId));
      // Refresh channel list to remove deactivated external channel
      setChannelListRefreshKey((prev) => prev + 1);
      toast.success('External channel disconnected');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to disconnect channel';
      toast.error(errorMsg);
    }
  };

  // Handle channel selection
  const handleChannelSelect = useCallback((channel: ChatThreadDto) => {
    setSelectedChannel(channel);
    setShowChannelList(false);
  }, []);

  // Handle back to channel list
  const handleBackToChannels = useCallback(() => {
    setShowChannelList(true);
  }, []);

  // Handle mouse down on resize handle
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  // Handle mouse move during resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      // Calculate new width from right edge of screen
      const newWidth = window.innerWidth - e.clientX;
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      // Prevent text selection while resizing
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'ew-resize';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isResizing, setWidth]);

  // Open full chat page
  const handleExpandToFullPage = () => {
    navigate('/chat/dashboard');
  };

  if (!isOpen) {
    return null;
  }

  return (
    <Box
      ref={sidebarRef}
      sx={{
        position: 'fixed',
        top: theme.cssStyling.headerHeight,
        right: 0,
        bottom: 0,
        width: width,
        backgroundColor: theme.palette.background.paper,
        borderLeft: `1px solid ${theme.palette.divider}`,
        display: 'flex',
        flexDirection: 'column',
        zIndex: theme.zIndex.drawer,
        boxShadow: '-2px 0 8px rgba(0, 0, 0, 0.1)',
      }}
    >
      {/* Resize Handle */}
      <Box
        onMouseDown={handleMouseDown}
        sx={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 8,
          cursor: 'ew-resize',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: isResizing ? theme.palette.action.hover : 'transparent',
          '&:hover': {
            backgroundColor: theme.palette.action.hover,
          },
          transition: 'background-color 0.2s',
          zIndex: 1,
        }}
      >
        <FontAwesomeIcon
          icon={faGripLinesVertical}
          style={{
            fontSize: 10,
            color: theme.palette.text.secondary,
            opacity: isResizing ? 1 : 0.5,
          }}
        />
      </Box>

      {/* Header - matches Breadcrumb height, with subtle distinction */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1,
          borderBottom: `1px solid ${theme.palette.divider}`,
          backgroundColor: theme.palette.background.paper,
          height: 40,
          boxSizing: 'border-box',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {!showChannelList && selectedChannel && (
            <Tooltip title="Back to channels">
              <IconButton size="small" onClick={handleBackToChannels}>
                <FontAwesomeIcon icon={faChevronLeft} style={{ fontSize: 12 }} />
              </IconButton>
            </Tooltip>
          )}
          <Typography
            sx={{
              fontSize: 14,
              fontWeight: 600,
              color: theme.palette.text.primary,
            }}
          >
            {showChannelList ? 'Event Chat' : selectedChannel?.name || 'Chat'}
          </Typography>
          {/* Connection status indicator */}
          {connectionState !== 'connected' && (
            <Tooltip
              title={
                connectionState === 'reconnecting'
                  ? 'Reconnecting to real-time updates...'
                  : connectionState === 'connecting'
                    ? 'Connecting...'
                    : 'Disconnected - messages may be delayed'
              }
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  color:
                    connectionState === 'reconnecting'
                      ? theme.palette.warning.main
                      : theme.palette.error.main,
                }}
              >
                <FontAwesomeIcon
                  icon={connectionState === 'reconnecting' ? faWifi : faExclamationTriangle}
                  style={{ fontSize: 10 }}
                />
              </Box>
            </Tooltip>
          )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {/* External channel menu - only show if external messaging is configured */}
          {externalMessagingConfigured && (
            <ChannelMenu
              config={externalMessagingConfig}
              activeChannels={activeChannels}
              onCreateGroupMe={handleCreateGroupMeChannel}
              onOpenTeamsDialog={handleOpenTeamsDialog}
              onDisconnectChannel={handleDisconnectChannel}
              showChips={false}
              compact
            />
          )}

          <Tooltip title="Open full chat page">
            <IconButton size="small" onClick={handleExpandToFullPage}>
              <FontAwesomeIcon icon={faExpand} style={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Close chat">
            <IconButton size="small" onClick={closeSidebar}>
              <FontAwesomeIcon icon={faXmark} style={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Content */}
      <Box
        sx={{
          flex: 1,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {currentEvent ? (
          <>
            {showChannelList ? (
              // Channel list view
              <Box sx={{ flex: 1, overflowY: 'auto' }}>
                <ChannelList
                  eventId={currentEvent.id}
                  selectedChannelId={selectedChannel?.id}
                  onChannelSelect={handleChannelSelect}
                  compact
                  refreshKey={channelListRefreshKey}
                />
              </Box>
            ) : selectedChannel ? (
              // Chat view for selected channel
              <EventChat
                eventId={currentEvent.id}
                eventName={currentEvent.name}
                channelId={selectedChannel.id}
                channelName={selectedChannel.name}
                channelType={selectedChannel.channelType}
                compact
              />
            ) : (
              // Fallback - default event chat
              <EventChat
                eventId={currentEvent.id}
                eventName={currentEvent.name}
                compact
              />
            )}
          </>
        ) : (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              p: 3,
              color: 'text.secondary',
              textAlign: 'center',
            }}
          >
            <Typography variant="body2" sx={{ mb: 1 }}>
              No event selected
            </Typography>
            <Typography variant="caption">
              Select an event to view the chat
            </Typography>
          </Box>
        )}
      </Box>

      {/* Footer with width indicator (visible during resize) */}
      {isResizing && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 8,
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: '#fff',
            px: 1.5,
            py: 0.5,
            borderRadius: 1,
            fontSize: '0.75rem',
          }}
        >
          {width}px
        </Box>
      )}

      {/* Teams Channel Dialog - Links Teams to the currently selected channel */}
      {currentEvent && (
        <TeamsChannelDialog
          open={teamsDialogOpen}
          onClose={() => setTeamsDialogOpen(false)}
          eventId={currentEvent.id}
          targetChannelId={selectedChannel?.id}
          targetChannelName={selectedChannel?.name}
          onChannelLinked={handleTeamsChannelLinked}
        />
      )}
    </Box>
  );
};

export default ChatSidebar;
