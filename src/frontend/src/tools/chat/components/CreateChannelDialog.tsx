/**
 * CreateChannelDialog Component
 *
 * Dialog for creating new internal channels within an event.
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    if (!saving) {
      setName('');
      setDescription('');
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
        channelType: ChannelType.Custom,
      });

      toast.success(`Channel "${channel.name}" created`);
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
        <CobraSaveButton
          onClick={handleCreate}
          isSaving={saving}
          disabled={!name.trim()}
        >
          Create Channel
        </CobraSaveButton>
      </DialogActions>
    </Dialog>
  );
};

export default CreateChannelDialog;
