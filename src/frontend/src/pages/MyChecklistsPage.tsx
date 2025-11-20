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

import { useEffect, useState, useMemo } from 'react';
import {
  Container,
  Typography,
  Box,
  CircularProgress,
  Grid,
  Button,
  Collapse,
} from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons';
import { useChecklists } from '../hooks/useChecklists';
import { useOperationalPeriodGrouping } from '../hooks/useOperationalPeriodGrouping';
import { ChecklistCard } from '../components/ChecklistCard';
import { SectionHeader } from '../components/SectionHeader';
import {
  ChecklistFilters,
  getCompletionCategory,
  type CompletionStatusFilter,
} from '../components/ChecklistFilters';

/**
 * My Checklists Page Component
 */
export const MyChecklistsPage: React.FC = () => {
  const { checklists, loading, error, fetchMyChecklists } = useChecklists();
  const [showPreviousPeriods, setShowPreviousPeriods] = useState(false);

  // Filter state
  const [selectedOperationalPeriod, setSelectedOperationalPeriod] = useState<string | null>(null);
  const [selectedCompletionStatus, setSelectedCompletionStatus] = useState<CompletionStatusFilter>('all');
  const [showArchived, setShowArchived] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

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

  // Group filtered checklists by operational period
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

  // Fetch checklists on mount and when showArchived changes
  useEffect(() => {
    fetchMyChecklists(showArchived);
  }, [fetchMyChecklists, showArchived]);

  // Loading state
  if (loading && checklists.length === 0) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Loading your checklists...</Typography>
      </Container>
    );
  }

  // Error state
  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Typography color="error" variant="h6">
          Error loading checklists
        </Typography>
        <Typography color="error">{error}</Typography>
      </Container>
    );
  }

  // Empty state
  if (checklists.length === 0) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h5" color="text.secondary">
            No checklists assigned
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
            You don't have any active checklists assigned to your position.
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Page Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ mb: 1 }}>
          My Checklists
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {totalChecklists} checklist{totalChecklists !== 1 ? 's' : ''} assigned
          to your position
          {checklists.length !== totalChecklists && (
            <> ({checklists.length} total, {totalChecklists} matching filters)</>
          )}
        </Typography>
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
          <Button
            variant="text"
            onClick={() => setShowPreviousPeriods(!showPreviousPeriods)}
            endIcon={
              <FontAwesomeIcon
                icon={showPreviousPeriods ? faChevronUp : faChevronDown}
              />
            }
            sx={{
              mb: 2,
              textTransform: 'none',
              fontSize: '1rem',
              minHeight: 48,
              minWidth: 48,
            }}
          >
            {showPreviousPeriods ? 'Hide' : 'Show'} {previousSections.length}{' '}
            Previous Operational Period{previousSections.length !== 1 ? 's' : ''}
          </Button>

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

      {/* Show all checklists in ungrouped view if no sections */}
      {!currentSection && !incidentSection && previousSections.length === 0 && (
        <Box>
          <Typography variant="h6" sx={{ mb: 2 }}>
            All Checklists
          </Typography>
          <Grid container spacing={3}>
            {checklists.map((checklist) => (
              <Grid item xs={12} sm={6} md={4} key={checklist.id}>
                <ChecklistCard checklist={checklist} />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Container>
  );
};
