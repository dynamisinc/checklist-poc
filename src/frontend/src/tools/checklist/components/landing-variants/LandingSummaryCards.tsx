/**
 * Summary Cards Landing Page
 *
 * A glanceable dashboard with summary statistics and drill-down capability.
 * Shows key numbers at a glance with quick actions prominent.
 *
 * Philosophy: "Glanceable summary with easy drill-down"
 *
 * Target Users: Users who want quick status overview before diving in
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Container,
  Typography,
  Box,
  Stack,
  CircularProgress,
  Card,
  CardContent,
  CardActionArea,
  Grid,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Divider,
  Alert,
} from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCircle,
  faChevronRight,
  faClipboardList,
  faListCheck,
  faCircleCheck,
} from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';
import { useChecklists } from '../../hooks/useChecklists';
import { usePermissions } from '../../../../shared/hooks/usePermissions';
import { useEvents } from '../../../../shared/events';
import { TemplatePickerDialog } from '../TemplatePickerDialog';
import { ChecklistVisibilityToggle, getStoredVisibilityPreference } from '../ChecklistVisibilityToggle';
import { CobraNewButton } from '../../../../theme/styledComponents';
import CobraStyles from '../../../../theme/CobraStyles';
import { cobraTheme } from '../../../../theme/cobraTheme';
import { toast } from 'react-toastify';
import type { ChecklistInstanceDto, ChecklistItemDto } from '../../services/checklistService';

interface IncompleteItem {
  item: ChecklistItemDto;
  checklist: ChecklistInstanceDto;
}

/**
 * Summary Cards Landing Page Component
 */
export const LandingSummaryCards: React.FC = () => {
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

  // Listen for profile, event, and visibility preference changes
  useEffect(() => {
    const handleProfileChanged = () => {
      if (currentEvent?.id) {
        fetchChecklistsByEvent(currentEvent.id, false, showAllChecklists);
      } else {
        fetchMyChecklists(false);
      }
    };
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
    window.addEventListener('profileChanged', handleProfileChanged);
    window.addEventListener('eventChanged', handleEventChanged);
    window.addEventListener('visibilityPreferenceChanged', handleVisibilityPreferenceChanged as EventListener);
    return () => {
      window.removeEventListener('profileChanged', handleProfileChanged);
      window.removeEventListener('eventChanged', handleEventChanged);
      window.removeEventListener('visibilityPreferenceChanged', handleVisibilityPreferenceChanged as EventListener);
    };
  }, [currentEvent?.id, fetchMyChecklists, fetchChecklistsByEvent, showAllChecklists]);

  // Calculate statistics
  const stats = useMemo(() => {
    let totalItems = 0;
    let completedItems = 0;
    let incompleteItems: IncompleteItem[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let completedToday = 0;

    checklists.forEach((checklist) => {
      if (checklist.items) {
        checklist.items.forEach((item) => {
          totalItems++;
          const status = item.currentStatus || '';
          const isCompleted =
            item.isCompleted ||
            status.toLowerCase() === 'completed' ||
            status.toLowerCase() === 'n/a';

          if (isCompleted) {
            completedItems++;
            if (item.completedAt) {
              const completedDate = new Date(item.completedAt);
              completedDate.setHours(0, 0, 0, 0);
              if (completedDate.getTime() === today.getTime()) {
                completedToday++;
              }
            }
          } else {
            incompleteItems.push({ item, checklist });
          }
        });
      }
    });

    // Sort incomplete items
    incompleteItems = incompleteItems.sort((a, b) => {
      const checklistCompare = a.checklist.name.localeCompare(b.checklist.name);
      if (checklistCompare !== 0) return checklistCompare;
      return (a.item.displayOrder || 0) - (b.item.displayOrder || 0);
    });

    return {
      totalChecklists: checklists.length,
      totalItems,
      completedItems,
      incompleteCount: totalItems - completedItems,
      completedToday,
      incompleteItems,
      overallProgress: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0,
    };
  }, [checklists]);

  // Navigation handlers
  const handleItemClick = (checklistId: string, itemId: string) => {
    navigate(`/checklists/${checklistId}?highlightItem=${itemId}`);
  };

  const handleViewAllChecklists = () => {
    navigate('/checklists?landing=control');
  };

  const handleViewIncomplete = () => {
    // Navigate to control variant filtered by incomplete
    navigate('/checklists?landing=control&filter=incomplete');
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

      if (!response.ok) throw new Error('Failed to create checklist');
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
      <Container maxWidth="lg">
        <Stack
          spacing={2}
          padding={CobraStyles.Padding.MainWindow}
          alignItems="center"
          justifyContent="center"
          sx={{ minHeight: '50vh' }}
        >
          <CircularProgress />
          <Typography>Loading dashboard...</Typography>
        </Stack>
      </Container>
    );
  }

  // Error state
  if (error) {
    return (
      <Container maxWidth="lg">
        <Stack spacing={2} padding={CobraStyles.Padding.MainWindow}>
          <Alert severity="error">{error}</Alert>
        </Stack>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Stack spacing={3} padding={CobraStyles.Padding.MainWindow}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h4">My Checklists</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {/* Visibility Toggle - Only visible for Manage role */}
            <ChecklistVisibilityToggle
              showAll={showAllChecklists}
              onChange={setShowAllChecklists}
              disabled={loading}
            />
            {permissions.canCreateInstance && (
              <CobraNewButton onClick={() => setTemplatePickerOpen(true)}>
                Create Checklist
              </CobraNewButton>
            )}
          </Box>
        </Box>

        {/* Summary Cards */}
        <Grid container spacing={2}>
          {/* Incomplete Items Card */}
          <Grid item xs={12} sm={4}>
            <Card
              sx={{
                height: '100%',
                borderLeft: `4px solid ${
                  stats.incompleteCount > 0
                    ? cobraTheme.palette.warning.main
                    : cobraTheme.palette.success.main
                }`,
              }}
            >
              <CardActionArea
                onClick={handleViewIncomplete}
                sx={{ height: '100%' }}
                disabled={stats.incompleteCount === 0}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <FontAwesomeIcon
                      icon={faListCheck}
                      style={{
                        color:
                          stats.incompleteCount > 0
                            ? cobraTheme.palette.warning.main
                            : cobraTheme.palette.success.main,
                      }}
                    />
                    <Typography variant="body2" color="text.secondary">
                      Incomplete Items
                    </Typography>
                  </Box>
                  <Typography
                    variant="h2"
                    sx={{
                      fontWeight: 300,
                      color:
                        stats.incompleteCount > 0
                          ? cobraTheme.palette.warning.dark
                          : cobraTheme.palette.success.dark,
                    }}
                  >
                    {stats.incompleteCount}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {stats.incompleteCount > 0 ? 'Click to view' : 'All caught up!'}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>

          {/* Active Checklists Card */}
          <Grid item xs={12} sm={4}>
            <Card
              sx={{
                height: '100%',
                borderLeft: `4px solid ${cobraTheme.palette.primary.main}`,
              }}
            >
              <CardActionArea onClick={handleViewAllChecklists} sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <FontAwesomeIcon
                      icon={faClipboardList}
                      style={{ color: cobraTheme.palette.primary.main }}
                    />
                    <Typography variant="body2" color="text.secondary">
                      Active Checklists
                    </Typography>
                  </Box>
                  <Typography
                    variant="h2"
                    sx={{ fontWeight: 300, color: cobraTheme.palette.primary.dark }}
                  >
                    {stats.totalChecklists}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Click to view all
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>

          {/* Completed Today Card */}
          <Grid item xs={12} sm={4}>
            <Card
              sx={{
                height: '100%',
                borderLeft: `4px solid ${cobraTheme.palette.success.main}`,
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <FontAwesomeIcon
                    icon={faCircleCheck}
                    style={{ color: cobraTheme.palette.success.main }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    Completed Today
                  </Typography>
                </Box>
                <Typography
                  variant="h2"
                  sx={{ fontWeight: 300, color: cobraTheme.palette.success.dark }}
                >
                  {stats.completedToday}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {stats.overallProgress}% overall completion
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Incomplete Items Preview */}
        {stats.incompleteItems.length > 0 && (
          <Box>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Items Needing Attention
            </Typography>
            <Paper variant="outlined">
              <List disablePadding>
                {stats.incompleteItems.slice(0, 5).map(({ item, checklist }, index) => (
                  <React.Fragment key={`${checklist.id}-${item.id}`}>
                    {index > 0 && <Divider />}
                    <ListItem disablePadding>
                      <ListItemButton
                        onClick={() => handleItemClick(checklist.id, item.id)}
                        sx={{ py: 1.5 }}
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
                          primaryTypographyProps={{ variant: 'body1' }}
                          secondaryTypographyProps={{ variant: 'caption' }}
                        />
                        <FontAwesomeIcon
                          icon={faChevronRight}
                          style={{ color: cobraTheme.palette.text.secondary }}
                        />
                      </ListItemButton>
                    </ListItem>
                  </React.Fragment>
                ))}
              </List>
              {stats.incompleteItems.length > 5 && (
                <Box
                  sx={{
                    p: 1.5,
                    textAlign: 'center',
                    backgroundColor: cobraTheme.palette.action.hover,
                    borderTop: `1px solid ${cobraTheme.palette.divider}`,
                    cursor: 'pointer',
                  }}
                  onClick={handleViewIncomplete}
                >
                  <Typography variant="body2" color="primary">
                    View all {stats.incompleteItems.length} items
                  </Typography>
                </Box>
              )}
            </Paper>
          </Box>
        )}

        {/* Empty State */}
        {stats.totalChecklists === 0 && (
          <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
            <FontAwesomeIcon
              icon={faClipboardList}
              size="3x"
              style={{ color: cobraTheme.palette.text.disabled, marginBottom: 16 }}
            />
            <Typography variant="h6" color="text.secondary">
              No checklists yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Create your first checklist to get started
            </Typography>
            {permissions.canCreateInstance && (
              <CobraNewButton onClick={() => setTemplatePickerOpen(true)}>
                Create Checklist
              </CobraNewButton>
            )}
          </Paper>
        )}

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
