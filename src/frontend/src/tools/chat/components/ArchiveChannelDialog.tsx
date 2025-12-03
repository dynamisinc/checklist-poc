/**
 * ArchiveChannelDialog Component
 *
 * Confirmation dialog for archiving internal channels.
 * Archived channels are hidden from the active channel list but messages remain accessible.
 *
 * Related User Stories:
 * - UC-008: Delete/Archive Internal Channel
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
import { faArchive, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import {
  CobraDeleteButton,
  CobraLinkButton,
} from '../../../theme/styledComponents';
import CobraStyles from '../../../theme/CobraStyles';
import { chatService } from '../services/chatService';
import type { ChatThreadDto } from '../types/chat';
import { ChannelType, isChannelType } from '../types/chat';

interface ArchiveChannelDialogProps {
  open: boolean;
  onClose: () => void;
  channel: ChatThreadDto | null;
  eventId: string;
  onChannelArchived: (channelId: string) => void;
}

/**
 * Checks if a channel can be archived based on UC-008 requirements.
 * Default channels (Internal, Announcements) cannot be archived.
 */
const canArchiveChannel = (channel: ChatThreadDto): boolean => {
  // Default event channels cannot be archived
  if (channel.isDefaultEventThread) {
    return false;
  }
  // External channels are managed via disconnect, not archive
  if (isChannelType(channel.channelType, ChannelType.External)) {
    return false;
  }
  // Announcements channel cannot be archived
  if (isChannelType(channel.channelType, ChannelType.Announcements)) {
    return false;
  }
  return true;
};

/**
 * Gets the reason why a channel cannot be archived.
 */
const getCannotArchiveReason = (channel: ChatThreadDto): string => {
  if (channel.isDefaultEventThread) {
    return 'Default event channels cannot be archived.';
  }
  if (isChannelType(channel.channelType, ChannelType.External)) {
    return 'External channels should be disconnected instead of archived.';
  }
  if (isChannelType(channel.channelType, ChannelType.Announcements)) {
    return 'The Announcements channel cannot be archived.';
  }
  return '';
};

export const ArchiveChannelDialog: React.FC<ArchiveChannelDialogProps> = ({
  open,
  onClose,
  channel,
  eventId,
  onChannelArchived,
}) => {
  const theme = useTheme();
  const [archiving, setArchiving] = useState(false);

  const handleClose = () => {
    if (!archiving) {
      onClose();
    }
  };

  const handleArchive = async () => {
    if (!channel) return;

    try {
      setArchiving(true);
      await chatService.deleteChannel(eventId, channel.id);
      toast.success(`Channel "${channel.name}" archived`);
      onChannelArchived(channel.id);
      handleClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to archive channel';
      toast.error(message);
    } finally {
      setArchiving(false);
    }
  };

  if (!channel) return null;

  const canArchive = canArchiveChannel(channel);
  const cannotArchiveReason = getCannotArchiveReason(channel);

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
            icon={faArchive}
            style={{ color: theme.palette.warning.main, fontSize: 20 }}
          />
          <Typography variant="h6" fontWeight={600}>
            Archive Channel
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={CobraStyles.Spacing.FormFields} sx={{ pt: 1 }}>
          {canArchive ? (
            <>
              <Typography variant="body1">
                Are you sure you want to archive the channel{' '}
                <strong>"{channel.name}"</strong>?
              </Typography>

              <Alert
                severity="info"
                icon={<FontAwesomeIcon icon={faExclamationTriangle} />}
                sx={{ '& .MuiAlert-message': { width: '100%' } }}
              >
                <Typography variant="body2" fontWeight={500} gutterBottom>
                  What happens when you archive:
                </Typography>
                <Box component="ul" sx={{ m: 0, pl: 2 }}>
                  <li>
                    <Typography variant="body2">
                      The channel will be hidden from the active channel list
                    </Typography>
                  </li>
                  <li>
                    <Typography variant="body2">
                      All messages in this channel will remain accessible for audit/review
                    </Typography>
                  </li>
                  <li>
                    <Typography variant="body2">
                      This action can be undone by an administrator
                    </Typography>
                  </li>
                </Box>
              </Alert>
            </>
          ) : (
            <Alert severity="warning">
              <Typography variant="body2">
                <strong>Cannot archive this channel.</strong>
              </Typography>
              <Typography variant="body2">{cannotArchiveReason}</Typography>
            </Alert>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <CobraLinkButton onClick={handleClose} disabled={archiving}>
          Cancel
        </CobraLinkButton>
        {canArchive && (
          <CobraDeleteButton
            onClick={handleArchive}
            disabled={archiving}
            startIcon={
              archiving ? undefined : (
                <FontAwesomeIcon icon={faArchive} style={{ fontSize: 14 }} />
              )
            }
          >
            {archiving ? 'Archiving...' : 'Archive Channel'}
          </CobraDeleteButton>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ArchiveChannelDialog;
