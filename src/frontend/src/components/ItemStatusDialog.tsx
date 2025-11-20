/**
 * ItemStatusDialog Component
 *
 * Modal dialog for updating the status of status-type checklist items.
 * Features:
 * - Dropdown/Select with available status options
 * - Validation of status against allowed options
 * - Save/Cancel buttons (48x48px minimum per C5 standards)
 * - Error handling for invalid or missing status options
 *
 * User Story 3.2: Update Status Items
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
  Alert,
} from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faListCheck } from '@fortawesome/free-solid-svg-icons';
import type { StatusOption } from '../types';
import { c5Colors } from '../theme/c5Theme';

/**
 * Props for ItemStatusDialog
 */
interface ItemStatusDialogProps {
  open: boolean;
  itemText: string;
  currentStatus?: string | null;
  statusConfiguration?: string | null; // JSON string of StatusOption[]
  onSave: (status: string) => Promise<void>;
  onCancel: () => void;
  saving?: boolean;
}

/**
 * Parse status configuration from JSON string
 */
const parseStatusConfiguration = (statusConfiguration?: string | null): StatusOption[] => {
  if (!statusConfiguration) return [];
  try {
    const parsed = JSON.parse(statusConfiguration);
    // Sort by order
    return (parsed as StatusOption[]).sort((a, b) => a.order - b.order);
  } catch (error) {
    console.error('Failed to parse status configuration:', error);
    return [];
  }
};

/**
 * ItemStatusDialog Component
 */
export const ItemStatusDialog: React.FC<ItemStatusDialogProps> = ({
  open,
  itemText,
  currentStatus,
  statusConfiguration,
  onSave,
  onCancel,
  saving = false,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Parse available options
  const availableOptions = parseStatusConfiguration(statusConfiguration);
  const hasOptions = availableOptions.length > 0;

  // Initialize selected status when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedStatus(currentStatus || '');
      setError(null);
    }
  }, [open, currentStatus]);

  // Handle save
  const handleSave = async () => {
    // Validate status is selected
    if (!selectedStatus || selectedStatus.trim().length === 0) {
      setError('Please select a status');
      return;
    }

    // Validate status is in allowed options
    if (hasOptions && !availableOptions.some(opt => opt.label === selectedStatus)) {
      setError(
        `"${selectedStatus}" is not a valid status option. Please select from the dropdown.`
      );
      return;
    }

    try {
      await onSave(selectedStatus);
      // Dialog will close via parent component state change
    } catch (err) {
      // Error already handled by hook, just show generic message
      setError('Failed to update status. Please try again.');
    }
  };

  // Handle cancel
  const handleCancel = () => {
    setSelectedStatus('');
    setError(null);
    onCancel();
  };

  // Check if status has changed
  const hasChanged = selectedStatus !== (currentStatus || '');

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          minHeight: 350,
        },
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FontAwesomeIcon
            icon={faListCheck}
            style={{ fontSize: '1.25rem' }}
          />
          <Typography variant="h6">Update Status</Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        {/* Item text context */}
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mb: 3,
            p: 1.5,
            backgroundColor: '#F5F5F5',
            borderRadius: 1,
            fontStyle: 'italic',
          }}
        >
          Item: "{itemText}"
        </Typography>

        {/* No options warning */}
        {!hasOptions && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            No status options defined for this item. You can enter a custom
            status, but this may indicate a configuration issue.
          </Alert>
        )}

        {/* Status dropdown/input */}
        <FormControl fullWidth error={!!error}>
          <InputLabel id="status-select-label">Status</InputLabel>
          <Select
            labelId="status-select-label"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            label="Status"
            disabled={saving}
            sx={{
              '& .MuiOutlinedInput-notchedOutline': {
                borderWidth: 2,
              },
            }}
          >
            {/* Show current status if it's not in options */}
            {currentStatus && !availableOptions.some(opt => opt.label === currentStatus) && (
              <MenuItem value={currentStatus}>
                {currentStatus} (current)
              </MenuItem>
            )}

            {/* Show available options */}
            {availableOptions.map((option) => (
              <MenuItem key={option.label} value={option.label}>
                {option.label}
                {option.isCompletion && (
                  <Typography
                    component="span"
                    sx={{
                      ml: 1,
                      fontSize: '0.75rem',
                      color: c5Colors.successGreen,
                      fontWeight: 'bold',
                    }}
                  >
                    ✓
                  </Typography>
                )}
              </MenuItem>
            ))}

            {/* Empty option to clear status */}
            <MenuItem value="">
              <em>(Clear status)</em>
            </MenuItem>
          </Select>

          {/* Error message */}
          {error && (
            <Typography
              variant="caption"
              color="error"
              sx={{ mt: 1, display: 'block' }}
            >
              {error}
            </Typography>
          )}
        </FormControl>

        {/* Current status display */}
        {currentStatus && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 2 }}
          >
            Current status: <strong>{currentStatus}</strong>
          </Typography>
        )}

        {/* Available options hint */}
        {hasOptions && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mt: 2, display: 'block' }}
          >
            {availableOptions.length} option{availableOptions.length !== 1 ? 's' : ''}{' '}
            available
          </Typography>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          variant="text"
          onClick={handleCancel}
          disabled={saving}
          sx={{
            minWidth: 100,
            minHeight: 48, // C5 minimum touch target
          }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving || !hasChanged}
          sx={{
            minWidth: 100,
            minHeight: 48, // C5 minimum touch target
          }}
        >
          {saving ? 'Saving...' : 'Update Status'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
