/**
 * ChecklistFilters Component
 *
 * Filter controls for My Checklists page:
 * - Operational Period dropdown
 * - Completion Status dropdown (All, Not Started, In Progress, Completed)
 * - Show Archived toggle (optional)
 *
 * Filters are applied client-side for responsive UX.
 */

import React from 'react';
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
} from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilter, faSearch, faXmark } from '@fortawesome/free-solid-svg-icons';
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

  // Calculate filter counts
  const periodCount = operationalPeriods.length;
  const hasFilters =
    selectedOperationalPeriod !== null ||
    selectedCompletionStatus !== 'all' ||
    showArchived ||
    searchQuery.length > 0;

  return (
    <Box sx={{ mb: 3 }}>
      {/* Search bar - full width */}
      <Box sx={{ mb: 2 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search checklists by name..."
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <FontAwesomeIcon icon={faSearch} style={{ fontSize: '1rem' }} />
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
                    '&:hover': { opacity: 0.7 },
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
      </Box>

      {/* Filter controls row */}
      <Box
        sx={{
          display: 'flex',
          gap: 2,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        {/* Filter icon + label */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FontAwesomeIcon icon={faFilter} style={{ fontSize: '1rem' }} />
          <strong>Filters:</strong>
          {hasFilters && (
            <Chip
              label="Active"
              size="small"
              color="primary"
              sx={{ height: 20, fontSize: '0.7rem' }}
            />
          )}
        </Box>

      {/* Operational Period filter */}
      {periodCount > 0 && (
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel id="period-filter-label">Operational Period</InputLabel>
          <Select
            labelId="period-filter-label"
            value={selectedOperationalPeriod || 'all'}
            onChange={handlePeriodChange}
            label="Operational Period"
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
      <FormControl size="small" sx={{ minWidth: 180 }}>
        <InputLabel id="status-filter-label">Completion Status</InputLabel>
        <Select
          labelId="status-filter-label"
          value={selectedCompletionStatus}
          onChange={handleStatusChange}
          label="Completion Status"
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
          label="Show Archived"
          sx={{ ml: 1 }}
        />
      </Box>
    </Box>
  );
};
