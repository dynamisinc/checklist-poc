/**
 * CreateChannelDialog Component
 *
 * Dialog for creating new internal channels within an event.
 * Supports optional position restriction - when a position is selected,
 * only users assigned to that position can see the channel.
 *
 * Related User Stories:
 * - UC-004: Manually Create Internal Channel
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Typography,
  FormHelperText,
  Box,
  Autocomplete,
  CircularProgress,
} from '@mui/material';
import { toast } from 'react-toastify';
import {
  CobraTextField,
  CobraSaveButton,
  CobraLinkButton,
} from '../../../theme/styledComponents';
import CobraStyles from '../../../theme/CobraStyles';
import { chatService } from '../services/chatService';
import { ChannelType } from '../types/chat';
import type { ChatThreadDto } from '../types/chat';
import { usePositions } from '../../../shared/positions';

interface CreateChannelDialogProps {
  open: boolean;
  onClose: () => void;
  eventId: string;
  onChannelCreated: (channel: ChatThreadDto) => void;
}

export const CreateChannelDialog: React.FC<CreateChannelDialogProps> = ({
  open,
  onClose,
  eventId,
  onChannelCreated,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPositionId, setSelectedPositionId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { positions, loading: positionsLoading } = usePositions();

  const handleClose = () => {
    if (!saving) {
      setName('');
      setDescription('');
      setSelectedPositionId(null);
      setError(null);
      onClose();
    }
  };

  const handleCreate = async () => {
    // Validate
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Channel name is required');
      return;
    }

    if (trimmedName.length > 50) {
      setError('Channel name must be 50 characters or less');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const channel = await chatService.createChannel(eventId, {
        name: trimmedName,
        description: description.trim() || undefined,
        channelType: selectedPositionId ? ChannelType.Position : ChannelType.Custom,
        positionId: selectedPositionId || undefined,
      });

      const successMessage = selectedPositionId
        ? `Channel "${channel.name}" created (restricted to ${positions.find((p) => p.id === selectedPositionId)?.name || 'selected position'})`
        : `Channel "${channel.name}" created`;
      toast.success(successMessage);
      onChannelCreated(channel);
      handleClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create channel';
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && name.trim()) {
      e.preventDefault();
      handleCreate();
    }
  };

  // Find selected position for display
  const selectedPosition = positions.find((p) => p.id === selectedPositionId) || null;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h6" fontWeight={600}>
          Create Channel
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Create a new channel for team discussions
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={CobraStyles.Spacing.FormFields} sx={{ pt: 1 }}>
          <CobraTextField
            label="Channel Name"
            placeholder="e.g., Logistics, Safety Team"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
            onKeyDown={handleKeyDown}
            fullWidth
            required
            autoFocus
            error={!!error}
            inputProps={{ maxLength: 50 }}
          />

          <CobraTextField
            label="Description (optional)"
            placeholder="What is this channel for?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            rows={2}
            inputProps={{ maxLength: 200 }}
          />

          {/* Position Restriction - Autocomplete allows free text entry */}
          <Autocomplete
            options={positions}
            getOptionLabel={(option) => (typeof option === 'string' ? option : option.name)}
            value={selectedPosition}
            onChange={(_, newValue) => {
              if (newValue && typeof newValue !== 'string') {
                setSelectedPositionId(newValue.id);
              } else {
                setSelectedPositionId(null);
              }
            }}
            loading={positionsLoading}
            renderInput={(params) => (
              <CobraTextField
                {...params}
                label="Restrict to Position (optional)"
                placeholder="Select a position or leave empty for all users"
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {positionsLoading ? <CircularProgress color="inherit" size={20} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
            renderOption={(props, option) => (
              <Box component="li" {...props} key={option.id}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {option.color && (
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        backgroundColor: option.color,
                        flexShrink: 0,
                      }}
                    />
                  )}
                  <Typography variant="body2">{option.name}</Typography>
                </Box>
              </Box>
            )}
            isOptionEqualToValue={(option, value) => option.id === value?.id}
            clearOnEscape
            blurOnSelect
          />

          {selectedPositionId && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: -1 }}>
              Only users assigned to this position will see this channel. Users with Manage role
              can see all channels.
            </Typography>
          )}

          {error && (
            <FormHelperText error sx={{ mx: 0 }}>
              {error}
            </FormHelperText>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <CobraLinkButton onClick={handleClose} disabled={saving}>
          Cancel
        </CobraLinkButton>
        <CobraSaveButton onClick={handleCreate} isSaving={saving} disabled={!name.trim()}>
          Create Channel
        </CobraSaveButton>
      </DialogActions>
    </Dialog>
  );
};

export default CreateChannelDialog;
