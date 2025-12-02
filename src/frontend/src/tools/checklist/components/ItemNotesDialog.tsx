/**
 * ItemNotesDialog Component
 *
 * Modal dialog for adding or editing notes on checklist items.
 * Features:
 * - Multiline text input with 2000 character limit
 * - Character counter
 * - Save/Cancel buttons (48x48px minimum per C5 standards)
 * - Validation and error handling
 *
 * User Story 3.3: Add Notes to Items
 */

import React, { useState, useEffect } from 'react';
import {
  DialogActions,
  Typography,
  Box,
  Stack,
} from '@mui/material';
import {
  CobraDialog,
  CobraTextField,
  CobraSaveButton,
  CobraLinkButton,
} from '../../../theme/styledComponents';
import CobraStyles from '../../../theme/CobraStyles';

/**
 * Props for ItemNotesDialog
 */
interface ItemNotesDialogProps {
  open: boolean;
  itemText: string;
  currentNotes?: string | null;
  onSave: (notes: string) => Promise<void>;
  onCancel: () => void;
  saving?: boolean;
}

/**
 * Maximum character limit for notes (matches backend)
 */
const MAX_NOTES_LENGTH = 2000;

/**
 * ItemNotesDialog Component
 */
export const ItemNotesDialog: React.FC<ItemNotesDialogProps> = ({
  open,
  itemText,
  currentNotes,
  onSave,
  onCancel,
  saving = false,
}) => {
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Initialize notes when dialog opens
  useEffect(() => {
    if (open) {
      setNotes(currentNotes || '');
      setError(null);
    }
  }, [open, currentNotes]);

  // Handle save
  const handleSave = async () => {
    // Validate length
    if (notes.length > MAX_NOTES_LENGTH) {
      setError(`Notes cannot exceed ${MAX_NOTES_LENGTH} characters`);
      return;
    }

    try {
      await onSave(notes.trim());
      // Dialog will close via parent component state change
    } catch (err) {
      // Error already handled by hook, just show generic message
      setError('Failed to save notes. Please try again.');
    }
  };

  // Handle cancel
  const handleCancel = () => {
    setNotes('');
    setError(null);
    onCancel();
  };

  // Calculate character count and color
  const charCount = notes.length;
  const isNearLimit = charCount > MAX_NOTES_LENGTH * 0.9; // 90% threshold
  const isOverLimit = charCount > MAX_NOTES_LENGTH;
  const charCountColor = isOverLimit
    ? 'error'
    : isNearLimit
      ? 'warning.main'
      : 'text.secondary';

  return (
    <CobraDialog
      open={open}
      onClose={handleCancel}
      title={currentNotes ? 'Edit Note' : 'Add Note'}
      contentWidth="600px"
    >
      <Stack spacing={CobraStyles.Spacing.FormFields}>
        {/* Item text context */}
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            p: 1.5,
            backgroundColor: (theme) => theme.palette.background.default,
            borderRadius: 1,
            fontStyle: 'italic',
          }}
        >
          Item: "{itemText}"
        </Typography>

        {/* Notes input */}
        <CobraTextField
          label="Notes"
          multiline
          rows={6}
          fullWidth
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          error={isOverLimit || !!error}
          helperText={
            error || (isOverLimit && `Character limit exceeded (${MAX_NOTES_LENGTH} max)`)
          }
          placeholder="Add notes, observations, or additional details..."
          autoFocus
          disabled={saving}
        />

        {/* Character counter */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Typography
            variant="caption"
            sx={{
              color: charCountColor,
              fontWeight: isNearLimit ? 'bold' : 'normal',
            }}
          >
            {charCount.toLocaleString()} / {MAX_NOTES_LENGTH.toLocaleString()} characters
          </Typography>
        </Box>

        <DialogActions>
          <CobraLinkButton onClick={handleCancel} disabled={saving}>
            Cancel
          </CobraLinkButton>
          <CobraSaveButton onClick={handleSave} disabled={isOverLimit} isSaving={saving}>
            Save
          </CobraSaveButton>
        </DialogActions>
      </Stack>
    </CobraDialog>
  );
};
