/**
 * RestoreChannelDialog Component
 *
 * Confirmation dialog for restoring archived channels.
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
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRotateLeft, faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import {
  CobraPrimaryButton,
  CobraLinkButton,
} from '../../../theme/styledComponents';
import CobraStyles from '../../../theme/CobraStyles';
import { chatService } from '../services/chatService';
import type { ChatThreadDto } from '../types/chat';

interface RestoreChannelDialogProps {
  open: boolean;
  onClose: () => void;
  channel: ChatThreadDto | null;
  eventId: string;
  onChannelRestored: (channel: ChatThreadDto) => void;
}

export const RestoreChannelDialog: React.FC<RestoreChannelDialogProps> = ({
  open,
  onClose,
  channel,
  eventId,
  onChannelRestored,
}) => {
  const theme = useTheme();
  const [restoring, setRestoring] = useState(false);

  const handleClose = () => {
    if (!restoring) {
      onClose();
    }
  };

  const handleRestore = async () => {
    if (!channel) return;

    try {
      setRestoring(true);
      const restoredChannel = await chatService.restoreChannel(eventId, channel.id);
      onChannelRestored(restoredChannel);
      handleClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to restore channel';
      toast.error(message);
    } finally {
      setRestoring(false);
    }
  };

  if (!channel) return null;

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
            icon={faRotateLeft}
            style={{ color: theme.palette.success.main, fontSize: 20 }}
          />
          <Typography variant="h6" fontWeight={600}>
            Restore Channel
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={CobraStyles.Spacing.FormFields} sx={{ pt: 1 }}>
          <Typography variant="body1">
            Are you sure you want to restore the channel{' '}
            <strong>"{channel.name}"</strong>?
          </Typography>

          <Alert
            severity="info"
            icon={<FontAwesomeIcon icon={faInfoCircle} />}
            sx={{ '& .MuiAlert-message': { width: '100%' } }}
          >
            <Typography variant="body2" fontWeight={500} gutterBottom>
              What happens when you restore:
            </Typography>
            <Box component="ul" sx={{ m: 0, pl: 2 }}>
              <li>
                <Typography variant="body2">
                  The channel will be visible again in the channel list
                </Typography>
              </li>
              <li>
                <Typography variant="body2">
                  All previous messages will be accessible
                </Typography>
              </li>
              <li>
                <Typography variant="body2">
                  Team members can resume using the channel
                </Typography>
              </li>
            </Box>
          </Alert>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <CobraLinkButton onClick={handleClose} disabled={restoring}>
          Cancel
        </CobraLinkButton>
        <CobraPrimaryButton
          onClick={handleRestore}
          disabled={restoring}
          startIcon={
            restoring ? undefined : (
              <FontAwesomeIcon icon={faRotateLeft} style={{ fontSize: 14 }} />
            )
          }
        >
          {restoring ? 'Restoring...' : 'Restore Channel'}
        </CobraPrimaryButton>
      </DialogActions>
    </Dialog>
  );
};

export default RestoreChannelDialog;
