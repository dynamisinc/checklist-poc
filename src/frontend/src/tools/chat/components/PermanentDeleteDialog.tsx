/**
 * PermanentDeleteDialog Component
 *
 * Warning dialog for permanently deleting a channel.
 * This action cannot be undone without direct database access.
 *
 * Related User Stories:
 * - UC-026: Chat Administration Dashboard
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Typography,
  Box,
  Alert,
  TextField,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import {
  CobraDeleteButton,
  CobraLinkButton,
} from '../../../theme/styledComponents';
import CobraStyles from '../../../theme/CobraStyles';
import { chatService } from '../services/chatService';
import type { ChatThreadDto } from '../types/chat';

interface PermanentDeleteDialogProps {
  open: boolean;
  onClose: () => void;
  channel: ChatThreadDto | null;
  eventId: string;
  onChannelDeleted: (channelId: string) => void;
}

export const PermanentDeleteDialog: React.FC<PermanentDeleteDialogProps> = ({
  open,
  onClose,
  channel,
  eventId,
  onChannelDeleted,
}) => {
  const theme = useTheme();
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const handleClose = () => {
    if (!deleting) {
      setConfirmText('');
      onClose();
    }
  };

  const handleDelete = async () => {
    if (!channel) return;

    try {
      setDeleting(true);
      await chatService.permanentDeleteChannel(eventId, channel.id);
      toast.success(`Channel "${channel.name}" permanently deleted`);
      onChannelDeleted(channel.id);
      handleClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete channel';
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  };

  if (!channel) return null;

  const confirmationRequired = 'DELETE';
  const isConfirmed = confirmText.toUpperCase() === confirmationRequired;

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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <FontAwesomeIcon
            icon={faTrash}
            style={{ color: theme.palette.error.main, fontSize: 20 }}
          />
          <Typography variant="h6" fontWeight={600}>
            Permanently Delete Channel
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={CobraStyles.Spacing.FormFields} sx={{ pt: 1 }}>
          <Alert
            severity="error"
            icon={<FontAwesomeIcon icon={faExclamationTriangle} />}
            sx={{ '& .MuiAlert-message': { width: '100%' } }}
          >
            <Typography variant="body2" fontWeight={600} gutterBottom>
              This action cannot be undone!
            </Typography>
            <Typography variant="body2">
              Permanently deleting the channel <strong>"{channel.name}"</strong> will:
            </Typography>
            <Box component="ul" sx={{ m: 0, pl: 2, mt: 1 }}>
              <li>
                <Typography variant="body2">
                  Remove the channel from this event permanently
                </Typography>
              </li>
              <li>
                <Typography variant="body2">
                  Require direct database access (SQL) to recover
                </Typography>
              </li>
              <li>
                <Typography variant="body2">
                  Hide all {channel.messageCount} messages from the event
                </Typography>
              </li>
            </Box>
          </Alert>

          <Typography variant="body2" color="text.secondary">
            To confirm, type <strong>{confirmationRequired}</strong> below:
          </Typography>

          <TextField
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={confirmationRequired}
            fullWidth
            size="small"
            autoComplete="off"
            sx={{
              '& .MuiOutlinedInput-root': {
                '&.Mui-focused': {
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: isConfirmed ? theme.palette.error.main : undefined,
                  },
                },
              },
            }}
          />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <CobraLinkButton onClick={handleClose} disabled={deleting}>
          Cancel
        </CobraLinkButton>
        <CobraDeleteButton
          onClick={handleDelete}
          disabled={deleting || !isConfirmed}
          startIcon={
            deleting ? undefined : (
              <FontAwesomeIcon icon={faTrash} style={{ fontSize: 14 }} />
            )
          }
        >
          {deleting ? 'Deleting...' : 'Delete Permanently'}
        </CobraDeleteButton>
      </DialogActions>
    </Dialog>
  );
};

export default PermanentDeleteDialog;
