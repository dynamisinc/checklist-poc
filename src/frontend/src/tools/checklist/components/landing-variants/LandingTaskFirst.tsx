/**
 * Task-First Minimal Landing Page
 *
 * A streamlined landing experience focused on immediate action.
 * Shows incomplete items first with single-tap navigation to complete them.
 *
 * Philosophy: "What needs my attention right now?"
 *
 * Target Users: Operators who need quick task completion under stress
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Container,
  Typography,
  Box,
  Stack,
  CircularProgress,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Chip,
  Paper,
  Divider,
  Alert,
} from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCircle,
  faCheckCircle,
  faChevronRight,
  faClipboardList,
  faExclamationTriangle,
} from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';
import { useChecklists } from '../../hooks/useChecklists';
import { usePermissions } from '../../../../shared/hooks/usePermissions';
import { useEvents } from '../../../../shared/events';
import { TemplatePickerDialog } from '../TemplatePickerDialog';
import { ChecklistVisibilityToggle, getStoredVisibilityPreference } from '../ChecklistVisibilityToggle';
import { CobraNewButton, CobraSecondaryButton } from '../../../../theme/styledComponents';
import CobraStyles from '../../../../theme/CobraStyles';
import { cobraTheme } from '../../../../theme/cobraTheme';
import { toast } from 'react-toastify';
import type { ChecklistInstanceDto, ChecklistItemDto } from '../../services/checklistService';

interface IncompleteItem {
  item: ChecklistItemDto;
  checklist: ChecklistInstanceDto;
}

/**
 * Task-First Minimal Landing Page Component
 */
export const LandingTaskFirst: React.FC = () => {
  const navigate = useNavigate();
  const { checklists, loading, error, fetchMyChecklists, fetchChecklistsByEvent } = useChecklists();
  const permissions = usePermissions();
  const { currentEvent } = useEvents();
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [showAllChecklists, setShowAllChecklists] = useState(getStoredVisibilityPreference);

  // Fetch checklists filtered by current event
  useEffect(() => {
    if (currentEvent?.id) {
      fetchChecklistsByEvent(currentEvent.id, false, showAllChecklists);
    } else {
      fetchMyChecklists(false);
    }
  }, [currentEvent?.id, fetchChecklistsByEvent, fetchMyChecklists, showAllChecklists]);

  // Listen for event changes and visibility preference changes
  useEffect(() => {
    const handleEventChanged = () => {
      const storedEvent = localStorage.getItem('currentEvent');
      if (storedEvent) {
        const event = JSON.parse(storedEvent);
        fetchChecklistsByEvent(event.id, false, showAllChecklists);
      } else {
        fetchMyChecklists(false);
      }
    };
    const handleVisibilityPreferenceChanged = (e: CustomEvent<boolean>) => {
      setShowAllChecklists(e.detail);
    };
    window.addEventListener('eventChanged', handleEventChanged);
    window.addEventListener('visibilityPreferenceChanged', handleVisibilityPreferenceChanged as EventListener);
    return () => {
      window.removeEventListener('eventChanged', handleEventChanged);
      window.removeEventListener('visibilityPreferenceChanged', handleVisibilityPreferenceChanged as EventListener);
    };
  }, [fetchChecklistsByEvent, fetchMyChecklists, showAllChecklists]);

  // Extract all incomplete items across all checklists
  const incompleteItems = useMemo((): IncompleteItem[] => {
    const items: IncompleteItem[] = [];

    checklists.forEach((checklist) => {
      if (checklist.items) {
        checklist.items.forEach((item) => {
          // Item is incomplete if not completed (checkbox) or status is not final
          const status = item.currentStatus || '';
          const isIncomplete =
            !item.isCompleted &&
            status.toLowerCase() !== 'completed' &&
            status.toLowerCase() !== 'n/a';

          if (isIncomplete) {
            items.push({ item, checklist });
          }
        });
      }
    });

    // Sort by checklist name, then item order
    return items.sort((a, b) => {
      const checklistCompare = a.checklist.name.localeCompare(b.checklist.name);
      if (checklistCompare !== 0) return checklistCompare;
      return (a.item.displayOrder || 0) - (b.item.displayOrder || 0);
    });
  }, [checklists]);

  // Count completed today
  const completedToday = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let count = 0;
    checklists.forEach((checklist) => {
      if (checklist.items) {
        checklist.items.forEach((item) => {
          if (item.isCompleted && item.completedAt) {
            const completedDate = new Date(item.completedAt);
            completedDate.setHours(0, 0, 0, 0);
            if (completedDate.getTime() === today.getTime()) {
              count++;
            }
          }
        });
      }
    });
    return count;
  }, [checklists]);

  // Navigate to checklist detail with item highlighted
  const handleItemClick = (checklistId: string, itemId: string) => {
    navigate(`/checklists/${checklistId}?highlightItem=${itemId}`);
  };

  // Navigate to all checklists (current page in control variant)
  const handleViewAll = () => {
    navigate('/checklists?landing=control');
  };

  // Handle creating a new checklist
  const handleCreateChecklist = async (templateId: string, checklistName: string) => {
    try {
      const storedProfile = localStorage.getItem('mockUserProfile');
      const profile = storedProfile ? JSON.parse(storedProfile) : null;
      const position = profile?.positions?.[0] || 'Unknown';

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/checklists`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Email': 'user@example.com',
          'X-User-Position': position,
        },
        body: JSON.stringify({
          templateId,
          name: checklistName,
          eventId: currentEvent?.id,
          eventName: currentEvent?.name,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checklist');
      }

      const newChecklist = await response.json();
      toast.success(`Checklist "${checklistName}" created`);
      // Navigate to the new checklist
      navigate(`/checklists/${newChecklist.id}`);
      return newChecklist;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create checklist';
      toast.error(message);
      throw err;
    }
  };

  // Loading state
  if (loading && checklists.length === 0) {
    return (
      <Container maxWidth="md">
        <Stack
          spacing={2}
          padding={CobraStyles.Padding.MainWindow}
          alignItems="center"
          justifyContent="center"
          sx={{ minHeight: '50vh' }}
        >
          <CircularProgress />
          <Typography>Loading your tasks...</Typography>
        </Stack>
      </Container>
    );
  }

  // Error state
  if (error) {
    return (
      <Container maxWidth="md">
        <Stack spacing={2} padding={CobraStyles.Padding.MainWindow}>
          <Alert severity="error">{error}</Alert>
        </Stack>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Stack spacing={3} padding={CobraStyles.Padding.MainWindow}>
        {/* Header with attention count */}
        <Box>
          {incompleteItems.length > 0 ? (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                p: 2,
                backgroundColor: cobraTheme.palette.warning.light,
                borderRadius: 1,
                border: `1px solid ${cobraTheme.palette.warning.main}`,
              }}
            >
              <FontAwesomeIcon
                icon={faExclamationTriangle}
                size="lg"
                style={{ color: cobraTheme.palette.warning.dark }}
              />
              <Typography variant="h6" sx={{ fontWeight: 500 }}>
                {incompleteItems.length} item{incompleteItems.length !== 1 ? 's' : ''} need
                {incompleteItems.length === 1 ? 's' : ''} your attention
              </Typography>
            </Box>
          ) : (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                p: 2,
                backgroundColor: cobraTheme.palette.success.light,
                borderRadius: 1,
                border: `1px solid ${cobraTheme.palette.success.main}`,
              }}
            >
              <FontAwesomeIcon
                icon={faCheckCircle}
                size="lg"
                style={{ color: cobraTheme.palette.success.dark }}
              />
              <Typography variant="h6" sx={{ fontWeight: 500 }}>
                All caught up! No items need attention.
              </Typography>
            </Box>
          )}
        </Box>

        {/* Quick Stats with Visibility Toggle */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', gap: 3, alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              <strong>{checklists.length}</strong> active checklist
              {checklists.length !== 1 ? 's' : ''}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>{completedToday}</strong> completed today
            </Typography>
          </Box>
          {/* Visibility Toggle - Only visible for Manage role */}
          <ChecklistVisibilityToggle
            showAll={showAllChecklists}
            onChange={setShowAllChecklists}
            disabled={loading}
          />
        </Box>

        {/* Incomplete Items List */}
        {incompleteItems.length > 0 && (
          <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
            <List disablePadding>
              {incompleteItems.slice(0, 10).map(({ item, checklist }, index) => (
                <React.Fragment key={`${checklist.id}-${item.id}`}>
                  {index > 0 && <Divider />}
                  <ListItem disablePadding>
                    <ListItemButton
                      onClick={() => handleItemClick(checklist.id, item.id)}
                      sx={{
                        py: 1.5,
                        '&:hover': {
                          backgroundColor: cobraTheme.palette.action.hover,
                        },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <FontAwesomeIcon
                          icon={faCircle}
                          size="xs"
                          style={{ color: cobraTheme.palette.text.secondary }}
                        />
                      </ListItemIcon>
                      <ListItemText
                        primary={item.itemText}
                        secondary={checklist.name}
                        primaryTypographyProps={{
                          variant: 'body1',
                          sx: { fontWeight: 400 },
                        }}
                        secondaryTypographyProps={{
                          variant: 'caption',
                        }}
                      />
                      {item.currentStatus && item.currentStatus !== 'Not Started' && (
                        <Chip
                          label={item.currentStatus}
                          size="small"
                          sx={{
                            mr: 1,
                            backgroundColor:
                              item.currentStatus === 'In Progress'
                                ? cobraTheme.palette.warning.light
                                : item.currentStatus === 'Blocked'
                                  ? cobraTheme.palette.error.light
                                  : cobraTheme.palette.action.selected,
                          }}
                        />
                      )}
                      <FontAwesomeIcon
                        icon={faChevronRight}
                        style={{ color: cobraTheme.palette.text.secondary }}
                      />
                    </ListItemButton>
                  </ListItem>
                </React.Fragment>
              ))}
            </List>

            {incompleteItems.length > 10 && (
              <Box
                sx={{
                  p: 1.5,
                  textAlign: 'center',
                  backgroundColor: cobraTheme.palette.action.hover,
                  borderTop: `1px solid ${cobraTheme.palette.divider}`,
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  + {incompleteItems.length - 10} more items
                </Typography>
              </Box>
            )}
          </Paper>
        )}

        {/* Action Buttons */}
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            justifyContent: 'center',
            pt: 2,
          }}
        >
          {permissions.canCreateInstance && (
            <CobraNewButton onClick={() => setTemplatePickerOpen(true)}>
              Create New Checklist
            </CobraNewButton>
          )}
          <CobraSecondaryButton
            onClick={handleViewAll}
            startIcon={<FontAwesomeIcon icon={faClipboardList} />}
          >
            View All Checklists ({checklists.length})
          </CobraSecondaryButton>
        </Box>

        {/* Template Picker Dialog */}
        <TemplatePickerDialog
          open={templatePickerOpen}
          onClose={() => setTemplatePickerOpen(false)}
          onCreateChecklist={handleCreateChecklist}
        />
      </Stack>
    </Container>
  );
};
