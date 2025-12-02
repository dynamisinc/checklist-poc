/**
 * CreateChecklistDialog Component
 *
 * Multi-purpose dialog for creating checklists:
 * - From template (fresh instance)
 * - From existing checklist - clean copy (reset status)
 * - From existing checklist - direct copy (preserve status)
 *
 * Smart defaults minimize user friction:
 * - Event ID/Name pulled from C5 context (not user input)
 * - Pre-fills name with sensible defaults
 * - Hides advanced options (positions) unless needed
 *
 * User Stories:
 * - 2.1: Create Checklist from Template
 * - 2.6: Clone Checklist (both modes)
 */

import React, { useState, useEffect } from 'react';
import {
  DialogActions,
  Typography,
  Box,
  Alert,
  Collapse,
  Stack,
  FormControlLabel,
  Checkbox,
  FormGroup,
  FormLabel,
} from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons';
import {
  CobraDialog,
  CobraTextField,
  CobraSaveButton,
  CobraLinkButton,
  CobraSecondaryButton,
} from '../../../theme/styledComponents';
import CobraStyles from '../../../theme/CobraStyles';
import { ICS_POSITIONS } from '../../../types';

/**
 * Mode of checklist creation
 */
export type ChecklistCreationMode = 'from-template' | 'clone-clean' | 'clone-direct';

/**
 * Props for CreateChecklistDialog
 */
interface CreateChecklistDialogProps {
  open: boolean;
  mode: ChecklistCreationMode;

  // For template mode
  templateId?: string;
  templateName?: string;

  // For clone modes
  sourceChecklistId?: string;
  sourceChecklistName?: string;

  // Event context (from C5 - not user-editable)
  eventId: string;
  eventName: string;

  // Default values (smart defaults)
  defaultOperationalPeriodId?: string;
  defaultOperationalPeriodName?: string;

  onSave: (data: ChecklistCreationData) => Promise<void>;
  onCancel: () => void;
  saving?: boolean;
}

/**
 * Data for checklist creation
 */
export interface ChecklistCreationData {
  mode: ChecklistCreationMode;
  name: string;
  eventId: string;
  eventName: string;
  operationalPeriodId?: string;
  operationalPeriodName?: string;
  assignedPositions?: string;

  // For template mode
  templateId?: string;

  // For clone modes
  sourceChecklistId?: string;
  preserveStatus?: boolean; // Only for clone modes
}

/**
 * CreateChecklistDialog Component
 */
export const CreateChecklistDialog: React.FC<CreateChecklistDialogProps> = ({
  open,
  mode,
  templateId,
  templateName,
  sourceChecklistId,
  sourceChecklistName,
  eventId,
  eventName,
  defaultOperationalPeriodId,
  defaultOperationalPeriodName,
  onSave,
  onCancel,
  saving = false,
}) => {
  // Form state
  const [name, setName] = useState('');
  const [operationalPeriodName, setOperationalPeriodName] = useState(defaultOperationalPeriodName || '');
  const [selectedPositions, setSelectedPositions] = useState<string[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form when dialog opens
  useEffect(() => {
    if (open) {
      // Reset form
      setError(null);

      // Set default name
      if (mode === 'from-template') {
        setName(templateName ? `${templateName} - ${new Date().toLocaleDateString()}` : '');
      } else if (mode === 'clone-clean' || mode === 'clone-direct') {
        setName(sourceChecklistName ? `${sourceChecklistName} (Copy)` : '');
      }

      // Set defaults
      setOperationalPeriodName(defaultOperationalPeriodName || '');
      setSelectedPositions([]);
      setShowAdvanced(false);
    }
  }, [open, mode, templateName, sourceChecklistName, defaultOperationalPeriodName]);

  // Handle save
  const handleSave = async () => {
    // Validation
    if (!name.trim()) {
      setError('Checklist name is required');
      return;
    }

    if (mode === 'from-template' && !templateId) {
      setError('Template ID is missing');
      return;
    }

    if ((mode === 'clone-clean' || mode === 'clone-direct') && !sourceChecklistId) {
      setError('Source checklist ID is missing');
      return;
    }

    // Build data object (eventId/eventName from C5 context)
    const data: ChecklistCreationData = {
      mode,
      name: name.trim(),
      eventId,
      eventName,
      operationalPeriodId: defaultOperationalPeriodId,
      operationalPeriodName: operationalPeriodName.trim() || undefined,
      assignedPositions: selectedPositions.length > 0 ? selectedPositions.join(', ') : undefined,
    };

    if (mode === 'from-template') {
      data.templateId = templateId;
    } else {
      data.sourceChecklistId = sourceChecklistId;
      data.preserveStatus = mode === 'clone-direct';
    }

    try {
      await onSave(data);
      // Dialog will close via parent state change
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create checklist');
    }
  };

  // Handle cancel
  const handleCancel = () => {
    setError(null);
    onCancel();
  };

  // Get dialog title based on mode
  const getDialogTitle = () => {
    switch (mode) {
      case 'from-template':
        return 'Create Checklist from Template';
      case 'clone-clean':
        return 'Copy Checklist (Clean Copy)';
      case 'clone-direct':
        return 'Copy Checklist (Direct Copy)';
      default:
        return 'Create Checklist';
    }
  };

  // Get dialog description based on mode
  const getDialogDescription = () => {
    const eventInfo = `Event: ${eventName}`;
    switch (mode) {
      case 'from-template':
        return `Creating new checklist from template "${templateName}" for ${eventInfo}`;
      case 'clone-clean':
        return `Creating clean copy (all items reset) from "${sourceChecklistName}" for ${eventInfo}`;
      case 'clone-direct':
        return `Creating direct copy (preserves all status and notes) from "${sourceChecklistName}" for ${eventInfo}`;
      default:
        return '';
    }
  };

  return (
    <CobraDialog
      open={open}
      onClose={handleCancel}
      title={getDialogTitle()}
      contentWidth="600px"
    >
      <Stack spacing={CobraStyles.Spacing.FormFields}>
        {/* Description */}
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            p: 1.5,
            backgroundColor: (theme) => theme.palette.background.default,
            borderRadius: 1,
          }}
        >
          {getDialogDescription()}
        </Typography>

        {/* Error message */}
        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Name field */}
        <CobraTextField
          fullWidth
          label="Checklist Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={saving}
          required
          autoFocus
          helperText="Give this checklist a unique name"
        />

        {/* Operational Period (Optional) */}
        <CobraTextField
          fullWidth
          label="Operational Period Name (Optional)"
          value={operationalPeriodName}
          onChange={(e) => setOperationalPeriodName(e.target.value)}
          disabled={saving}
          helperText="Leave blank for incident-level checklist"
        />

        {/* Advanced Options */}
        <Box>
          <CobraSecondaryButton
            size="small"
            onClick={() => setShowAdvanced(!showAdvanced)}
            endIcon={<FontAwesomeIcon icon={showAdvanced ? faChevronUp : faChevronDown} />}
          >
            Advanced Options
          </CobraSecondaryButton>

          <Collapse in={showAdvanced}>
            <Box sx={{ mt: 2 }}>
              <FormLabel component="legend" sx={{ mb: 1, fontWeight: 500, fontSize: '0.875rem' }}>
                Assigned Positions (Optional)
              </FormLabel>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                Leave all unchecked to make visible to all positions
              </Typography>
              <FormGroup sx={{ maxHeight: 200, overflowY: 'auto' }}>
                {ICS_POSITIONS.map((position) => (
                  <FormControlLabel
                    key={position}
                    control={
                      <Checkbox
                        checked={selectedPositions.includes(position)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedPositions((prev) => [...prev, position]);
                          } else {
                            setSelectedPositions((prev) => prev.filter((p) => p !== position));
                          }
                        }}
                        disabled={saving}
                        size="small"
                      />
                    }
                    label={<Typography variant="body2">{position}</Typography>}
                    sx={{ mx: 0 }}
                  />
                ))}
              </FormGroup>
            </Box>
          </Collapse>
        </Box>

        <DialogActions>
          <CobraLinkButton onClick={handleCancel} disabled={saving}>
            Cancel
          </CobraLinkButton>
          <CobraSaveButton onClick={handleSave} isSaving={saving}>
            {saving ? 'Creating...' : 'Create Checklist'}
          </CobraSaveButton>
        </DialogActions>
      </Stack>
    </CobraDialog>
  );
};
