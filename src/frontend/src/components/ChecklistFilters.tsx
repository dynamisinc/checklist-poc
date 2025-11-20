/**
 * ChecklistFilters Component (Option B: Collapsible)
 *
 * Collapsible filter panel with search-first UX:
 * - Full-width search bar (always visible)
 * - Filters hidden behind button with badge showing active count
 * - Click to expand/collapse filter panel
 * - "Clear All" button for quick reset
 *
 * Filters are applied client-side for responsive UX.
 */

import React, { useState } from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  FormControlLabel,
  Switch,
  SelectChangeEvent,
  TextField,
  InputAdornment,
  Button,
  Collapse,
  Paper,
} from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilter, faSearch, faXmark, faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons';
import type { ChecklistInstanceDto } from '../services/checklistService';

/**
 * Completion status filter options
 */
export type CompletionStatusFilter = 'all' | 'not-started' | 'in-progress' | 'completed';

/**
 * Props for ChecklistFilters
 */
interface ChecklistFiltersProps {
  checklists: ChecklistInstanceDto[];
  selectedOperationalPeriod: string | null;
  selectedCompletionStatus: CompletionStatusFilter;
  showArchived: boolean;
  searchQuery: string;
  onOperationalPeriodChange: (periodId: string | null) => void;
  onCompletionStatusChange: (status: CompletionStatusFilter) => void;
  onShowArchivedChange: (show: boolean) => void;
  onSearchQueryChange: (query: string) => void;
}

/**
 * Get unique operational periods from checklists
 */
const getOperationalPeriods = (checklists: ChecklistInstanceDto[]) => {
  const periods = new Map<string, string>(); // id -> name

  checklists.forEach((checklist) => {
    if (checklist.operationalPeriodId && checklist.operationalPeriodName) {
      periods.set(checklist.operationalPeriodId, checklist.operationalPeriodName);
    }
  });

  return Array.from(periods.entries()).map(([id, name]) => ({ id, name }));
};

/**
 * Get completion status category for a checklist
 */
export const getCompletionCategory = (
  progressPercentage: number
): CompletionStatusFilter => {
  if (progressPercentage === 0) return 'not-started';
  if (progressPercentage === 100) return 'completed';
  return 'in-progress';
};

/**
 * ChecklistFilters Component
 */
export const ChecklistFilters: React.FC<ChecklistFiltersProps> = ({
  checklists,
  selectedOperationalPeriod,
  selectedCompletionStatus,
  showArchived,
  searchQuery,
  onOperationalPeriodChange,
  onCompletionStatusChange,
  onShowArchivedChange,
  onSearchQueryChange,
}) => {
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const operationalPeriods = getOperationalPeriods(checklists);

  // Handle operational period change
  const handlePeriodChange = (event: SelectChangeEvent<string>) => {
    const value = event.target.value;
    onOperationalPeriodChange(value === 'all' ? null : value);
  };

  // Handle completion status change
  const handleStatusChange = (event: SelectChangeEvent<string>) => {
    onCompletionStatusChange(event.target.value as CompletionStatusFilter);
  };

  // Handle clear search
  const handleClearSearch = () => {
    onSearchQueryChange('');
  };

  // Handle clear all filters
  const handleClearAllFilters = () => {
    onOperationalPeriodChange(null);
    onCompletionStatusChange('all');
    onShowArchivedChange(false);
    onSearchQueryChange('');
  };

  // Calculate active filter count (excluding search since it's always visible)
  const activeFilterCount =
    (selectedOperationalPeriod !== null ? 1 : 0) +
    (selectedCompletionStatus !== 'all' ? 1 : 0) +
    (showArchived ? 1 : 0);

  const hasActiveFilters = activeFilterCount > 0 || searchQuery.length > 0;
  const periodCount = operationalPeriods.length;

  return (
    <Box sx={{ mb: 3 }}>
      {/* Search bar + Filters button (always visible) */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search checklists by name..."
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <FontAwesomeIcon icon={faSearch} style={{ fontSize: '1rem', color: '#666' }} />
              </InputAdornment>
            ),
            endAdornment: searchQuery.length > 0 && (
              <InputAdornment position="end">
                <Box
                  onClick={handleClearSearch}
                  sx={{
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    color: '#666',
                    '&:hover': { color: '#000' },
                  }}
                >
                  <FontAwesomeIcon icon={faXmark} style={{ fontSize: '1rem' }} />
                </Box>
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              backgroundColor: 'white',
            },
          }}
        />

        {/* Filters button with badge */}
        <Button
          variant="outlined"
          onClick={() => setFiltersExpanded(!filtersExpanded)}
          startIcon={<FontAwesomeIcon icon={faFilter} />}
          endIcon={<FontAwesomeIcon icon={filtersExpanded ? faChevronUp : faChevronDown} />}
          sx={{
            minWidth: 140,
            minHeight: 40,
            whiteSpace: 'nowrap',
            borderColor: activeFilterCount > 0 ? 'primary.main' : 'grey.400',
            color: activeFilterCount > 0 ? 'primary.main' : 'text.primary',
            fontWeight: activeFilterCount > 0 ? 'bold' : 'normal',
          }}
        >
          Filters
          {activeFilterCount > 0 && (
            <Chip
              label={activeFilterCount}
              size="small"
              color="primary"
              sx={{ ml: 1, height: 20, fontSize: '0.7rem' }}
            />
          )}
        </Button>
      </Box>

      {/* Collapsible filter panel */}
      <Collapse in={filtersExpanded}>
        <Paper
          elevation={2}
          sx={{
            p: 3,
            backgroundColor: '#FAFAFA',
            border: '1px solid #E0E0E0',
            borderRadius: 2,
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {/* Operational Period filter */}
            {periodCount > 0 && (
              <FormControl fullWidth size="small">
                <InputLabel id="period-filter-label">Operational Period</InputLabel>
                <Select
                  labelId="period-filter-label"
                  value={selectedOperationalPeriod || 'all'}
                  onChange={handlePeriodChange}
                  label="Operational Period"
                  sx={{
                    backgroundColor: 'white',
                  }}
                >
                  <MenuItem value="all">
                    <em>All Periods ({checklists.length})</em>
                  </MenuItem>
                  {operationalPeriods.map((period) => (
                    <MenuItem key={period.id} value={period.id}>
                      {period.name}
                    </MenuItem>
                  ))}
                  <MenuItem value="incident-level">
                    <em>Incident-Level (No Period)</em>
                  </MenuItem>
                </Select>
              </FormControl>
            )}

            {/* Completion Status filter */}
            <FormControl fullWidth size="small">
              <InputLabel id="status-filter-label">Completion Status</InputLabel>
              <Select
                labelId="status-filter-label"
                value={selectedCompletionStatus}
                onChange={handleStatusChange}
                label="Completion Status"
                sx={{
                  backgroundColor: 'white',
                }}
              >
                <MenuItem value="all">
                  <em>All ({checklists.length})</em>
                </MenuItem>
                <MenuItem value="not-started">Not Started (0%)</MenuItem>
                <MenuItem value="in-progress">In Progress (1-99%)</MenuItem>
                <MenuItem value="completed">Completed (100%)</MenuItem>
              </Select>
            </FormControl>

            {/* Show Archived toggle */}
            <FormControlLabel
              control={
                <Switch
                  checked={showArchived}
                  onChange={(e) => onShowArchivedChange(e.target.checked)}
                  size="small"
                />
              }
              label="Show Archived Checklists"
            />

            {/* Action buttons */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
              <Button
                variant="text"
                onClick={handleClearAllFilters}
                disabled={!hasActiveFilters}
                sx={{ minHeight: 40 }}
              >
                Clear All Filters
              </Button>
              <Button
                variant="text"
                onClick={() => setFiltersExpanded(false)}
                sx={{ minHeight: 40 }}
              >
                Close
              </Button>
            </Box>
          </Box>
        </Paper>
      </Collapse>
    </Box>
  );
};
