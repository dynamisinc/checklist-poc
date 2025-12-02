/**
 * Role-Adaptive Dashboard Landing Page
 *
 * A tabbed interface that serves different user personas:
 * - My Tasks: Personal task list (operators)
 * - Team Overview: All checklists across positions (leadership)
 * - Insights: Blocking items, overdue, metrics (analysts)
 *
 * Philosophy: "Different users get what they need without separate pages"
 *
 * Target Users: Mixed roles in same organization
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Container,
  Typography,
  Box,
  Stack,
  CircularProgress,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Divider,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  LinearProgress,
  Card,
  CardContent,
  Grid,
} from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCircle,
  faCheckCircle,
  faChevronRight,
  faListCheck,
  faUsers,
  faChartLine,
  faClock,
  faBan,
} from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';
import { useChecklists } from '../../hooks/useChecklists';
import { usePermissions } from '../../../../hooks/usePermissions';
import { useEvents } from '../../../../shared/events';
import { TemplatePickerDialog } from '../TemplatePickerDialog';
import { ChecklistVisibilityToggle, getStoredVisibilityPreference } from '../ChecklistVisibilityToggle';
import { CobraNewButton } from '../../../../theme/styledComponents';
import CobraStyles from '../../../../theme/CobraStyles';
import { cobraTheme } from '../../../../theme/cobraTheme';
import { toast } from 'react-toastify';
import type { ChecklistInstanceDto, ChecklistItemDto } from '../../services/checklistService';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ py: 2 }}>{children}</Box>}
    </div>
  );
};

interface IncompleteItem {
  item: ChecklistItemDto;
  checklist: ChecklistInstanceDto;
}

/**
 * Role-Adaptive Dashboard Landing Page Component
 */
export const LandingRoleAdaptive: React.FC = () => {
  const navigate = useNavigate();
  const { checklists, loading, error, fetchMyChecklists, fetchAllChecklists, allChecklists, fetchChecklistsByEvent } =
    useChecklists();
  const permissions = usePermissions();
  const { currentEvent } = useEvents();
  const [activeTab, setActiveTab] = useState(0);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [showAllChecklists, setShowAllChecklists] = useState(getStoredVisibilityPreference);

  // Helper function to fetch checklists
  const fetchChecklists = () => {
    if (currentEvent?.id) {
      fetchChecklistsByEvent(currentEvent.id, false, showAllChecklists);
    } else {
      fetchMyChecklists(false);
    }
    // Fetch all checklists for team overview (if user has permission)
    if (permissions.canViewAllInstances) {
      fetchAllChecklists(false);
    }
  };

  // Fetch data on mount and when event changes
  useEffect(() => {
    fetchChecklists();
  }, [currentEvent?.id, permissions.canViewAllInstances, showAllChecklists]);

  // Listen for profile, event, and visibility preference changes
  useEffect(() => {
    const handleProfileChanged = () => {
      fetchChecklists();
    };
    const handleEventChanged = () => {
      const storedEvent = localStorage.getItem('currentEvent');
      if (storedEvent) {
        const event = JSON.parse(storedEvent);
        fetchChecklistsByEvent(event.id, false, showAllChecklists);
      } else {
        fetchMyChecklists(false);
      }
      if (permissions.canViewAllInstances) {
        fetchAllChecklists(false);
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
  }, [fetchMyChecklists, fetchAllChecklists, fetchChecklistsByEvent, permissions.canViewAllInstances, showAllChecklists]);

  // Extract incomplete items from my checklists
  const incompleteItems = useMemo((): IncompleteItem[] => {
    const items: IncompleteItem[] = [];
    checklists.forEach((checklist) => {
      if (checklist.items) {
        checklist.items.forEach((item) => {
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
    return items.sort((a, b) => {
      const checklistCompare = a.checklist.name.localeCompare(b.checklist.name);
      if (checklistCompare !== 0) return checklistCompare;
      return (a.item.displayOrder || 0) - (b.item.displayOrder || 0);
    });
  }, [checklists]);

  // Team overview data (all checklists)
  const teamData = useMemo(() => {
    const checklistsToUse = allChecklists.length > 0 ? allChecklists : checklists;
    return checklistsToUse.map((c) => ({
      ...c,
      progress: c.progressPercentage || 0,
    }));
  }, [allChecklists, checklists]);

  // Insights data
  const insightsData = useMemo(() => {
    const checklistsToAnalyze = allChecklists.length > 0 ? allChecklists : checklists;

    const blockedItems: IncompleteItem[] = [];
    const inProgressItems: IncompleteItem[] = [];
    let totalItems = 0;
    let completedItems = 0;

    checklistsToAnalyze.forEach((checklist) => {
      if (checklist.items) {
        checklist.items.forEach((item) => {
          totalItems++;
          const status = item.currentStatus || '';
          if (item.isCompleted || status.toLowerCase() === 'completed') {
            completedItems++;
          }
          if (status.toLowerCase() === 'blocked') {
            blockedItems.push({ item, checklist });
          }
          if (status.toLowerCase() === 'in progress') {
            inProgressItems.push({ item, checklist });
          }
        });
      }
    });

    return {
      blockedItems,
      inProgressItems,
      totalItems,
      completedItems,
      completionRate: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0,
      totalChecklists: checklistsToAnalyze.length,
    };
  }, [allChecklists, checklists]);

  // Navigation handlers
  const handleItemClick = (checklistId: string, itemId: string) => {
    navigate(`/checklists/${checklistId}?highlightItem=${itemId}`);
  };

  const handleChecklistClick = (checklistId: string) => {
    navigate(`/checklists/${checklistId}`);
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
      <Stack spacing={2} padding={CobraStyles.Padding.MainWindow}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h4">Dashboard</Typography>
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

        {/* Tabs */}
        <Paper variant="outlined">
          <Tabs
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            sx={{
              borderBottom: 1,
              borderColor: 'divider',
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 500,
                minHeight: 48,
              },
            }}
          >
            <Tab
              icon={<FontAwesomeIcon icon={faListCheck} />}
              iconPosition="start"
              label={`My Tasks (${incompleteItems.length})`}
            />
            <Tab
              icon={<FontAwesomeIcon icon={faUsers} />}
              iconPosition="start"
              label={`Team Overview (${teamData.length})`}
            />
            <Tab
              icon={<FontAwesomeIcon icon={faChartLine} />}
              iconPosition="start"
              label="Insights"
            />
          </Tabs>

          {/* My Tasks Tab */}
          <TabPanel value={activeTab} index={0}>
            {incompleteItems.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <FontAwesomeIcon
                  icon={faCheckCircle}
                  size="2x"
                  style={{ color: cobraTheme.palette.success.main, marginBottom: 16 }}
                />
                <Typography variant="h6">All caught up!</Typography>
                <Typography color="text.secondary">No items need your attention.</Typography>
              </Box>
            ) : (
              <List disablePadding>
                {incompleteItems.slice(0, 15).map(({ item, checklist }, index) => (
                  <React.Fragment key={`${checklist.id}-${item.id}`}>
                    {index > 0 && <Divider />}
                    <ListItem disablePadding>
                      <ListItemButton onClick={() => handleItemClick(checklist.id, item.id)}>
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <FontAwesomeIcon icon={faCircle} size="xs" />
                        </ListItemIcon>
                        <ListItemText primary={item.itemText} secondary={checklist.name} />
                        {item.currentStatus && item.currentStatus !== 'Not Started' && (
                          <Chip label={item.currentStatus} size="small" sx={{ mr: 1 }} />
                        )}
                        <FontAwesomeIcon icon={faChevronRight} />
                      </ListItemButton>
                    </ListItem>
                  </React.Fragment>
                ))}
              </List>
            )}
          </TabPanel>

          {/* Team Overview Tab */}
          <TabPanel value={activeTab} index={1}>
            {teamData.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography color="text.secondary">No checklists to display.</Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Checklist</TableCell>
                      <TableCell>Position</TableCell>
                      <TableCell>Progress</TableCell>
                      <TableCell>Last Activity</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {teamData.map((checklist) => (
                      <TableRow
                        key={checklist.id}
                        hover
                        sx={{ cursor: 'pointer' }}
                        onClick={() => handleChecklistClick(checklist.id)}
                      >
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>
                            {checklist.name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={checklist.assignedPositions || 'All'} size="small" />
                        </TableCell>
                        <TableCell sx={{ minWidth: 150 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={checklist.progress}
                              sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                            />
                            <Typography variant="caption" sx={{ minWidth: 35 }}>
                              {checklist.progress}%
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {checklist.lastModifiedAt
                              ? new Date(checklist.lastModifiedAt).toLocaleString()
                              : '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <FontAwesomeIcon icon={faChevronRight} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </TabPanel>

          {/* Insights Tab */}
          <TabPanel value={activeTab} index={2}>
            <Box sx={{ p: 2 }}>
              {/* Summary Cards */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6} md={3}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h3" color="primary">
                        {insightsData.totalChecklists}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Active Checklists
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h3" color="success.main">
                        {insightsData.completionRate}%
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Overall Completion
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Card
                    variant="outlined"
                    sx={{
                      borderColor:
                        insightsData.blockedItems.length > 0
                          ? cobraTheme.palette.error.main
                          : undefined,
                    }}
                  >
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography
                        variant="h3"
                        color={insightsData.blockedItems.length > 0 ? 'error' : 'text.secondary'}
                      >
                        {insightsData.blockedItems.length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Blocked Items
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h3" color="warning.main">
                        {insightsData.inProgressItems.length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        In Progress
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* Blocked Items Alert */}
              {insightsData.blockedItems.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography
                    variant="subtitle1"
                    sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}
                  >
                    <FontAwesomeIcon icon={faBan} style={{ color: cobraTheme.palette.error.main }} />
                    Blocked Items Requiring Attention
                  </Typography>
                  <Paper variant="outlined">
                    <List disablePadding>
                      {insightsData.blockedItems.map(({ item, checklist }, index) => (
                        <React.Fragment key={`blocked-${checklist.id}-${item.id}`}>
                          {index > 0 && <Divider />}
                          <ListItem disablePadding>
                            <ListItemButton onClick={() => handleItemClick(checklist.id, item.id)}>
                              <ListItemIcon>
                                <FontAwesomeIcon
                                  icon={faBan}
                                  style={{ color: cobraTheme.palette.error.main }}
                                />
                              </ListItemIcon>
                              <ListItemText primary={item.itemText} secondary={checklist.name} />
                              <FontAwesomeIcon icon={faChevronRight} />
                            </ListItemButton>
                          </ListItem>
                        </React.Fragment>
                      ))}
                    </List>
                  </Paper>
                </Box>
              )}

              {/* In Progress Items */}
              {insightsData.inProgressItems.length > 0 && (
                <Box>
                  <Typography
                    variant="subtitle1"
                    sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}
                  >
                    <FontAwesomeIcon
                      icon={faClock}
                      style={{ color: cobraTheme.palette.warning.main }}
                    />
                    Items In Progress
                  </Typography>
                  <Paper variant="outlined">
                    <List disablePadding>
                      {insightsData.inProgressItems.slice(0, 5).map(({ item, checklist }, index) => (
                        <React.Fragment key={`progress-${checklist.id}-${item.id}`}>
                          {index > 0 && <Divider />}
                          <ListItem disablePadding>
                            <ListItemButton onClick={() => handleItemClick(checklist.id, item.id)}>
                              <ListItemIcon>
                                <FontAwesomeIcon
                                  icon={faClock}
                                  style={{ color: cobraTheme.palette.warning.main }}
                                />
                              </ListItemIcon>
                              <ListItemText primary={item.itemText} secondary={checklist.name} />
                              <FontAwesomeIcon icon={faChevronRight} />
                            </ListItemButton>
                          </ListItem>
                        </React.Fragment>
                      ))}
                    </List>
                  </Paper>
                </Box>
              )}

              {insightsData.blockedItems.length === 0 && insightsData.inProgressItems.length === 0 && (
                <Alert severity="success">
                  No blocking issues! All items are either completed or not started.
                </Alert>
              )}
            </Box>
          </TabPanel>
        </Paper>

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
