/**
 * My Checklists Page
 *
 * Landing page showing all checklists assigned to the current user's position.
 * Groups checklists by operational period with temporal hierarchy:
 * - Current Operational Period (most prominent)
 * - Incident-Level Checklists (always visible)
 * - Previous Operational Periods (collapsible)
 *
 * User Story 2.3: View My Checklists
 */

import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Container,
  Typography,
  Box,
  CircularProgress,
  Grid,
  Collapse,
  Stack,
  Badge,
  Fade,
} from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faChevronUp, faBell } from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';
import { useChecklists } from '../hooks/useChecklists';
import { useOperationalPeriodGrouping } from '../hooks/useOperationalPeriodGrouping';
import { usePermissions } from '../hooks/usePermissions';
import { useChecklistHub, type ChecklistCreatedEvent } from '../hooks/useChecklistHub';
import { useEvents } from '../hooks/useEvents';
import { ChecklistCard } from '../components/ChecklistCard';
import { SectionHeader } from '../components/SectionHeader';
import {
  ChecklistFilters,
  getCompletionCategory,
  type CompletionStatusFilter,
} from '../components/ChecklistFilters';
import { TemplatePickerDialog } from '../components/TemplatePickerDialog';
import { ChecklistVisibilityToggle, getStoredVisibilityPreference } from '../components/ChecklistVisibilityToggle';
import { CobraNewButton, CobraSecondaryButton } from '../theme/styledComponents';
import CobraStyles from '../theme/CobraStyles';
import { cobraTheme } from '../theme/cobraTheme';
import { toast } from 'react-toastify';

/**
 * My Checklists Page Component
 */
export const MyChecklistsPage: React.FC = () => {
  const navigate = useNavigate();
  const { checklists, loading, error, fetchMyChecklists, fetchChecklistsByEvent } = useChecklists();
  const { currentEvent } = useEvents();
  const permissions = usePermissions();
  const [showPreviousPeriods, setShowPreviousPeriods] = useState(false);

  // Template picker dialog state
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);

  // Filter state
  const [selectedOperationalPeriod, setSelectedOperationalPeriod] = useState<string | null>(null);
  const [selectedCompletionStatus, setSelectedCompletionStatus] = useState<CompletionStatusFilter>('all');
  const [showArchived, setShowArchived] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showAllChecklists, setShowAllChecklists] = useState(getStoredVisibilityPreference);

  // Real-time updates state
  const [newChecklistsCount, setNewChecklistsCount] = useState(0);
  const [showNewChecklistsBadge, setShowNewChecklistsBadge] = useState(false);

  // Get current user position for filtering SignalR events
  const currentUserPosition = useMemo(() => {
    const storedProfile = localStorage.getItem('mockUserProfile');
    const profile = storedProfile ? JSON.parse(storedProfile) : null;
    return profile?.positions?.[0] || 'Unknown';
  }, []);

  // Handle real-time checklist creation events
  const handleChecklistCreated = useCallback((data: ChecklistCreatedEvent) => {
    console.log('[MyChecklistsPage] Received ChecklistCreated event:', data);

    // Check if this checklist is visible to current user's position
    const isVisibleToMe = !data.positions ||
      data.positions.split(',').map(p => p.trim()).includes(currentUserPosition);

    if (isVisibleToMe) {
      // Increment new checklists counter
      setNewChecklistsCount(prev => prev + 1);
      setShowNewChecklistsBadge(true);

      // Show toast notification
      toast.info(
        `New checklist created: "${data.checklistName}" by ${data.createdBy}`,
        {
          autoClose: 5000,
          onClick: () => {
            // Clicking toast refreshes the list
            handleRefreshChecklists();
          }
        }
      );
    }
  }, [currentUserPosition]);

  // Initialize SignalR connection with handlers
  useChecklistHub({
    onChecklistCreated: handleChecklistCreated,
  });

  // Refresh checklists and clear badge
  const handleRefreshChecklists = useCallback(() => {
    if (currentEvent?.id) {
      fetchChecklistsByEvent(currentEvent.id, showArchived, showAllChecklists);
    } else {
      fetchMyChecklists(showArchived);
    }
    setNewChecklistsCount(0);
    setShowNewChecklistsBadge(false);
  }, [currentEvent?.id, fetchChecklistsByEvent, fetchMyChecklists, showArchived, showAllChecklists]);

  // Apply filters to checklists
  const filteredChecklists = useMemo(() => {
    let filtered = checklists;

    // Filter by search query (case-insensitive)
    if (searchQuery.trim().length > 0) {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = filtered.filter((c) =>
        c.name.toLowerCase().includes(lowerQuery)
      );
    }

    // Filter by operational period
    if (selectedOperationalPeriod) {
      if (selectedOperationalPeriod === 'incident-level') {
        // Show only incident-level checklists (no operational period)
        filtered = filtered.filter((c) => !c.operationalPeriodId);
      } else {
        // Show only checklists in selected operational period
        filtered = filtered.filter((c) => c.operationalPeriodId === selectedOperationalPeriod);
      }
    }

    // Filter by completion status
    if (selectedCompletionStatus !== 'all') {
      filtered = filtered.filter(
        (c) => getCompletionCategory(Number(c.progressPercentage)) === selectedCompletionStatus
      );
    }

    // Filter archived (if not showing archived, exclude them)
    // Note: Assuming isArchived field exists on ChecklistInstanceDto
    // If not, we'll need to fetch archived separately

    return filtered;
  }, [checklists, searchQuery, selectedOperationalPeriod, selectedCompletionStatus]);

  // Detect if any operational periods exist
  // If NO periods exist (all checklists have NULL operationalPeriodId), hide grouping
  const hasOperationalPeriods = useMemo(() => {
    return checklists.some((c) => c.operationalPeriodId !== null && c.operationalPeriodId !== '');
  }, [checklists]);

  // Group filtered checklists by operational period (only used if periods exist)
  // TODO: Get currentOperationalPeriodId from C5 context when available
  const {
    currentSection,
    incidentSection,
    previousSections,
    totalChecklists,
  } = useOperationalPeriodGrouping(filteredChecklists, {
    currentOperationalPeriodId: undefined, // Will come from C5 context
    sortPreviousByDate: true,
  });

  // Fetch checklists on mount, when event changes, or when filters change
  useEffect(() => {
    if (currentEvent?.id) {
      fetchChecklistsByEvent(currentEvent.id, showArchived, showAllChecklists);
    } else {
      fetchMyChecklists(showArchived);
    }
  }, [currentEvent?.id, fetchChecklistsByEvent, fetchMyChecklists, showArchived, showAllChecklists]);

  // Listen for profile changes and event changes to refetch (without remounting)
  useEffect(() => {
    const handleProfileChanged = () => {
      console.log('[MyChecklistsPage] Profile changed, refetching checklists...');
      handleRefreshChecklists();
    };

    const handleEventChanged = () => {
      console.log('[MyChecklistsPage] Event changed, refetching checklists...');
      // The useEffect with currentEvent?.id dependency will handle this
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
  }, [handleRefreshChecklists]);

  /**
   * Handle creating a new checklist from a template
   */
  const handleCreateChecklist = async (templateId: string, checklistName: string) => {
    try {
      // Require an event to be selected
      if (!currentEvent) {
        toast.error('Please select an event before creating a checklist');
        return null;
      }

      // Get current user position from localStorage (mock auth)
      const storedProfile = localStorage.getItem('mockUserProfile');
      const profile = storedProfile ? JSON.parse(storedProfile) : null;
      const position = profile?.positions?.[0] || 'Unknown';

      // Create checklist from template with current event
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/checklists`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Email': 'user@example.com', // Mock auth
          'X-User-Position': position,
        },
        body: JSON.stringify({
          templateId,
          name: checklistName,
          eventId: currentEvent.id,
          eventName: currentEvent.name,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checklist');
      }

      const newChecklist = await response.json();

      toast.success(`Checklist "${checklistName}" created successfully`);

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
          <Typography>Loading your checklists...</Typography>
        </Stack>
      </Container>
    );
  }

  // Error state
  if (error) {
    return (
      <Container maxWidth="lg">
        <Stack spacing={2} padding={CobraStyles.Padding.MainWindow}>
          <Typography color="error" variant="h6">
            Error loading checklists
          </Typography>
          <Typography color="error">{error}</Typography>
        </Stack>
      </Container>
    );
  }

  // Empty state
  if (checklists.length === 0) {
    return (
      <Container maxWidth="lg">
        <Stack spacing={3} padding={CobraStyles.Padding.MainWindow}>
          {/* Page Header with Create Button */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="h4" sx={{ mb: 1 }}>
                My Checklists
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {currentEvent
                  ? `No checklists for "${currentEvent.name}"`
                  : showAllChecklists ? 'No checklists in this event' : 'No checklists assigned to your position'}
              </Typography>
            </Box>

            {/* Action Buttons */}
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
              {/* Visibility Toggle - Only visible for Manage role */}
              <ChecklistVisibilityToggle
                showAll={showAllChecklists}
                onChange={setShowAllChecklists}
                disabled={loading}
              />

              {/* New Checklists Notification Badge */}
              <Fade in={showNewChecklistsBadge}>
                <CobraSecondaryButton
                  onClick={handleRefreshChecklists}
                  startIcon={
                    <Badge
                      badgeContent={newChecklistsCount}
                      color="error"
                      sx={{
                        '& .MuiBadge-badge': {
                          fontSize: '0.7rem',
                          height: 18,
                          minWidth: 18,
                        }
                      }}
                    >
                      <FontAwesomeIcon icon={faBell} />
                    </Badge>
                  }
                  sx={{
                    backgroundColor: cobraTheme.palette.action.selected,
                    animation: 'pulse 2s ease-in-out infinite',
                    '@keyframes pulse': {
                      '0%, 100%': { opacity: 1 },
                      '50%': { opacity: 0.7 },
                    }
                  }}
                >
                  {newChecklistsCount === 1 ? 'New Checklist' : `${newChecklistsCount} New Checklists`}
                </CobraSecondaryButton>
              </Fade>

              {/* Create Checklist Button - Contributors and Manage roles */}
              {permissions.canCreateInstance && (
                <CobraNewButton onClick={() => setTemplatePickerOpen(true)}>
                  Create Checklist
                </CobraNewButton>
              )}
            </Box>
          </Box>

        {/* Empty State Message */}
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h5" color="text.secondary">
            {currentEvent ? 'No checklists for this event' : 'No checklists assigned'}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
            {currentEvent
              ? `There are no checklists created for "${currentEvent.name}" yet.`
              : "You don't have any active checklists assigned to your position."}
          </Typography>
          {permissions.canCreateInstance && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Click "Create Checklist" above to get started.
            </Typography>
          )}
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
  }

  return (
    <Container maxWidth="lg">
      <Stack spacing={3} padding={CobraStyles.Padding.MainWindow}>
        {/* Page Header */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h4" sx={{ mb: 1 }}>
              My Checklists
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {totalChecklists} checklist{totalChecklists !== 1 ? 's' : ''}
              {currentEvent ? ` for "${currentEvent.name}"` : showAllChecklists ? '' : ' assigned to your position'}
              {checklists.length !== totalChecklists && (
                <> ({checklists.length} total, {totalChecklists} matching filters)</>
              )}
            </Typography>
          </Box>

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
            {/* Visibility Toggle - Only visible for Manage role */}
            <ChecklistVisibilityToggle
              showAll={showAllChecklists}
              onChange={setShowAllChecklists}
              disabled={loading}
            />

            {/* New Checklists Notification Badge */}
            <Fade in={showNewChecklistsBadge}>
              <CobraSecondaryButton
                onClick={handleRefreshChecklists}
                startIcon={
                  <Badge
                    badgeContent={newChecklistsCount}
                    color="error"
                    sx={{
                      '& .MuiBadge-badge': {
                        fontSize: '0.7rem',
                        height: 18,
                        minWidth: 18,
                      }
                    }}
                  >
                    <FontAwesomeIcon icon={faBell} />
                  </Badge>
                }
                sx={{
                  backgroundColor: cobraTheme.palette.action.selected,
                  animation: 'pulse 2s ease-in-out infinite',
                  '@keyframes pulse': {
                    '0%, 100%': { opacity: 1 },
                    '50%': { opacity: 0.7 },
                  }
                }}
              >
                {newChecklistsCount === 1 ? 'New Checklist' : `${newChecklistsCount} New Checklists`}
              </CobraSecondaryButton>
            </Fade>

            {/* Create Checklist Button - Contributors and Manage roles */}
            {permissions.canCreateInstance && (
              <CobraNewButton onClick={() => setTemplatePickerOpen(true)}>
                Create Checklist
              </CobraNewButton>
            )}
          </Box>
        </Box>

      {/* Filters */}
      {checklists.length > 0 && (
        <ChecklistFilters
          checklists={checklists}
          selectedOperationalPeriod={selectedOperationalPeriod}
          selectedCompletionStatus={selectedCompletionStatus}
          showArchived={showArchived}
          searchQuery={searchQuery}
          onOperationalPeriodChange={setSelectedOperationalPeriod}
          onCompletionStatusChange={setSelectedCompletionStatus}
          onShowArchivedChange={setShowArchived}
          onSearchQueryChange={setSearchQuery}
        />
      )}

      {/* NO OPERATIONAL PERIODS - Show flat list without grouping */}
      {!hasOperationalPeriods && filteredChecklists.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Showing all checklists (no operational periods configured)
          </Typography>
          <Grid container spacing={3}>
            {filteredChecklists.map((checklist) => (
              <Grid item xs={12} sm={6} md={4} key={checklist.id}>
                <ChecklistCard checklist={checklist} />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* OPERATIONAL PERIODS EXIST - Show grouped sections */}
      {hasOperationalPeriods && (
        <>
          {/* Current Operational Period Section */}
          {currentSection && (
        <Box sx={{ mb: 4 }}>
          <SectionHeader
            type="current"
            title={currentSection.operationalPeriodName || 'Current Period'}
            subtitle="Active operational period - focus here"
            checklistCount={currentSection.checklists.length}
            averageProgress={currentSection.averageProgress}
          />

          {currentSection.checklists.length === 0 ? (
            <Typography
              color="text.secondary"
              sx={{ py: 3, textAlign: 'center' }}
            >
              No checklists in current operational period
            </Typography>
          ) : (
            <Grid container spacing={3}>
              {currentSection.checklists.map((checklist) => (
                <Grid item xs={12} sm={6} md={4} key={checklist.id}>
                  <ChecklistCard checklist={checklist} />
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}

      {/* Incident-Level Checklists Section */}
      {incidentSection && (
        <Box sx={{ mb: 4 }}>
          <SectionHeader
            type="incident"
            title="Incident-Level Checklists"
            subtitle="Applies to entire event - not tied to operational period"
            checklistCount={incidentSection.checklists.length}
            averageProgress={incidentSection.averageProgress}
          />

          {incidentSection.checklists.length === 0 ? (
            <Typography
              color="text.secondary"
              sx={{ py: 3, textAlign: 'center' }}
            >
              No incident-level checklists
            </Typography>
          ) : (
            <Grid container spacing={3}>
              {incidentSection.checklists.map((checklist) => (
                <Grid item xs={12} sm={6} md={4} key={checklist.id}>
                  <ChecklistCard checklist={checklist} />
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}

      {/* Previous Operational Periods Section */}
      {previousSections.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <CobraSecondaryButton
            size="small"
            onClick={() => setShowPreviousPeriods(!showPreviousPeriods)}
            endIcon={
              <FontAwesomeIcon
                icon={showPreviousPeriods ? faChevronUp : faChevronDown}
              />
            }
          >
            {showPreviousPeriods ? 'Hide' : 'Show'} {previousSections.length}{' '}
            Previous Operational Period{previousSections.length !== 1 ? 's' : ''}
          </CobraSecondaryButton>

          <Collapse in={showPreviousPeriods}>
            {previousSections.map((section) => (
              <Box key={section.operationalPeriodId} sx={{ mb: 4 }}>
                <SectionHeader
                  type="previous"
                  title={section.operationalPeriodName || 'Previous Period'}
                  checklistCount={section.checklists.length}
                  averageProgress={section.averageProgress}
                />

                <Grid container spacing={3}>
                  {section.checklists.map((checklist) => (
                    <Grid item xs={12} sm={6} md={4} key={checklist.id}>
                      <ChecklistCard checklist={checklist} />
                    </Grid>
                  ))}
                </Grid>
              </Box>
            ))}
          </Collapse>
        </Box>
      )}

          {/* Empty state when filters applied */}
          {filteredChecklists.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography variant="h6" color="text.secondary">
                No checklists match your filters
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Try adjusting your search or filter criteria
              </Typography>
            </Box>
          )}
        </>
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
