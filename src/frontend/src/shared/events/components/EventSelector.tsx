/**
 * EventSelector Component
 *
 * Displays the current event in the header with a dropdown to:
 * - View and switch between available events
 * - Create a new event
 *
 * Part of the event management feature for the POC.
 */

import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Button,
  Menu,
  MenuItem,
  Typography,
  Divider,
  ListItemIcon,
  ListItemText,
  Chip,
  CircularProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChevronDown,
  faCircle,
  faPlus,
  faBoxArchive,
} from '@fortawesome/free-solid-svg-icons';
import { useEvents } from '../hooks/useEvents';
import { usePermissions } from '../../hooks/usePermissions';
import { getIconFromName, getEventTypeColor } from '../../../utils/iconMapping';
import type { Event } from '../types';

interface EventSelectorProps {
  onCreateEventClick: () => void;
}

/**
 * EventSelector Component
 */
export const EventSelector: React.FC<EventSelectorProps> = ({ onCreateEventClick }) => {
  const { events, currentEvent, loading, selectEvent, archiveEvent } = useEvents();
  const permissions = usePermissions();
  const navigate = useNavigate();
  const location = useLocation();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [archiveConfirmEvent, setArchiveConfirmEvent] = useState<Event | null>(null);

  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSelectEvent = (event: Event) => {
    selectEvent(event);
    handleClose();

    // If we're on an event landing page, navigate to the new event's page
    if (location.pathname.startsWith('/events/')) {
      navigate(`/events/${event.id}`);
    }
  };

  const handleCreateEvent = () => {
    handleClose();
    onCreateEventClick();
  };

  const handleArchiveClick = (event: Event, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent selecting the event
    handleClose();
    setArchiveConfirmEvent(event);
  };

  const handleConfirmArchive = async () => {
    if (archiveConfirmEvent) {
      await archiveEvent(archiveConfirmEvent.id);
      setArchiveConfirmEvent(null);
    }
  };

  const handleCancelArchive = () => {
    setArchiveConfirmEvent(null);
  };

  // Display text when no event is selected
  const displayName = currentEvent?.name || 'No Event Selected';
  const displayCategory = currentEvent?.primaryCategory?.name || '';

  return (
    <>
      <Button
        onClick={handleClick}
        sx={{
          color: '#FFFACD',
          textTransform: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          py: 0.5,
          px: 1.5,
          borderRadius: 1,
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
          },
        }}
      >
        {currentEvent && (
          <FontAwesomeIcon
            icon={getIconFromName(currentEvent.primaryCategory?.iconName, currentEvent.eventType)}
            style={{ color: getEventTypeColor(currentEvent.eventType) }}
          />
        )}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 'bold',
              lineHeight: 1.2,
              maxWidth: 200,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {displayName}
          </Typography>
          {displayCategory && (
            <Typography variant="caption" sx={{ opacity: 0.8, lineHeight: 1.2 }}>
              {displayCategory}
            </Typography>
          )}
        </Box>
        <FontAwesomeIcon icon={faChevronDown} size="sm" />
      </Button>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            minWidth: 320,
            maxWidth: 400,
            maxHeight: 500,
          },
        }}
      >
        {/* Header */}
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 'bold' }}>
            Switch Event
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Select an active event or create a new one
          </Typography>
        </Box>

        <Divider />

        {/* Loading state */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={24} />
          </Box>
        )}

        {/* Events list */}
        {!loading && events.length > 0 && (
          <Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
            {events.map((event) => {
              const isSelected = currentEvent?.id === event.id;
              const categoryIcon = getIconFromName(event.primaryCategory?.iconName, event.eventType);
              const typeColor = getEventTypeColor(event.eventType);

              return (
                <MenuItem
                  key={event.id}
                  onClick={() => handleSelectEvent(event)}
                  selected={isSelected}
                  sx={{
                    py: 1.5,
                    '&.Mui-selected': {
                      backgroundColor: 'rgba(0, 32, 194, 0.08)',
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <FontAwesomeIcon icon={categoryIcon} style={{ color: typeColor }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: isSelected ? 'bold' : 'normal' }}>
                          {event.name}
                        </Typography>
                        {isSelected && (
                          <FontAwesomeIcon
                            icon={faCircle}
                            style={{ fontSize: 8, color: '#4caf50' }}
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <Chip
                          label={event.eventType}
                          size="small"
                          sx={{
                            height: 18,
                            fontSize: '0.65rem',
                            backgroundColor: typeColor,
                            color: 'white',
                          }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {event.primaryCategory?.name}
                        </Typography>
                      </Box>
                    }
                  />
                  {permissions.canManageArchivedChecklists && (
                    <IconButton
                      size="small"
                      onClick={(e) => handleArchiveClick(event, e)}
                      sx={{
                        ml: 1,
                        opacity: 0.6,
                        '&:hover': {
                          opacity: 1,
                          color: 'warning.main',
                        },
                      }}
                      title="Archive event"
                    >
                      <FontAwesomeIcon icon={faBoxArchive} size="sm" />
                    </IconButton>
                  )}
                </MenuItem>
              );
            })}
          </Box>
        )}

        {/* No events message */}
        {!loading && events.length === 0 && (
          <Box sx={{ px: 2, py: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No events found. Create one to get started.
            </Typography>
          </Box>
        )}

        <Divider />

        {/* Create new event */}
        <MenuItem onClick={handleCreateEvent} sx={{ py: 1.5 }}>
          <ListItemIcon sx={{ minWidth: 36 }}>
            <FontAwesomeIcon icon={faPlus} style={{ color: '#0020C2' }} />
          </ListItemIcon>
          <ListItemText
            primary={
              <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#0020C2' }}>
                Create New Event
              </Typography>
            }
          />
        </MenuItem>
      </Menu>

      {/* Archive Confirmation Dialog */}
      <Dialog
        open={archiveConfirmEvent !== null}
        onClose={handleCancelArchive}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Archive Event</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to archive "{archiveConfirmEvent?.name}"?
            This will hide the event from the active events list.
            Checklists associated with this event will remain accessible.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelArchive}>Cancel</Button>
          <Button onClick={handleConfirmArchive} color="warning" variant="contained">
            Archive
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
