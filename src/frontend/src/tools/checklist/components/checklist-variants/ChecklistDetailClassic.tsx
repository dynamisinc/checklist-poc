/**
 * Classic Checklist Detail View
 *
 * Variant A: "Classic Checklist"
 * Ultra-minimal design mimicking a paper checklist.
 *
 * Key differences from Control:
 * - No card wrappers - simple list with dividers
 * - Compact header with inline progress
 * - Actions hidden in menus
 * - Completion shown as subtle badges
 * - More items visible per screen
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  IconButton,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Divider,
} from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faCopy,
} from '@fortawesome/free-solid-svg-icons';
import { ChecklistItemClassic } from './ChecklistItemClassic';
import { ItemNotesDialog } from '../ItemNotesDialog';
import { ChecklistProgressBar } from '../ChecklistProgressBar';
import { usePermissions } from '../../../../shared/hooks/usePermissions';
import type { ChecklistInstanceDto, ChecklistItemDto } from '../../services/checklistService';

interface ChecklistDetailClassicProps {
  checklist: ChecklistInstanceDto;
  onToggleComplete: (itemId: string, currentStatus: boolean) => Promise<void>;
  onStatusChange: (itemId: string, newStatus: string) => Promise<void>;
  onSaveNotes: (itemId: string, notes: string) => Promise<void>;
  onCopy: (mode: 'clone-clean' | 'clone-direct') => void;
  isProcessing: (itemId: string) => boolean;
  /** ID of the item to highlight (from landing page navigation) */
  highlightedItemId?: string | null;
  /** Whether highlight animation is active */
  isHighlighting?: boolean;
  /** Ref callback to attach to items for scroll-to behavior */
  getItemRef?: (itemId: string) => (element: HTMLElement | null) => void;
}

export const ChecklistDetailClassic: React.FC<ChecklistDetailClassicProps> = ({
  checklist,
  onToggleComplete,
  onStatusChange,
  onSaveNotes,
  onCopy,
  isProcessing,
  highlightedItemId,
  isHighlighting,
  getItemRef,
}) => {
  const navigate = useNavigate();
  const { canInteractWithItems, isReadonly } = usePermissions();

  // Notes dialog state
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ChecklistItemDto | null>(null);

  // Info dialog state
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);
  const [viewingItem, setViewingItem] = useState<ChecklistItemDto | null>(null);

  
  const handleOpenNotes = (item: ChecklistItemDto) => {
    setEditingItem(item);
    setNotesDialogOpen(true);
  };

  const handleCloseNotes = () => {
    setNotesDialogOpen(false);
    setEditingItem(null);
  };

  const handleSaveNotes = async (notes: string) => {
    if (editingItem) {
      await onSaveNotes(editingItem.id, notes);
      handleCloseNotes();
    }
  };

  const handleViewInfo = (item: ChecklistItemDto) => {
    setViewingItem(item);
    setInfoDialogOpen(true);
  };

  const progressPercentage = Number(checklist.progressPercentage);

  return (
    <Container maxWidth={false} disableGutters sx={{ py: 2, px: 2 }}>
      {/* Compact Header */}
      <Box sx={{ mb: 2 }}>
        {/* Title row */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <IconButton
            onClick={() => navigate('/checklists/dashboard')}
            size="small"
            sx={{ mr: 0.5 }}
          >
            <FontAwesomeIcon icon={faArrowLeft} />
          </IconButton>

          <Typography variant="h5" sx={{ flex: 1, fontWeight: 600 }}>
            {checklist.name}
          </Typography>

          {/* Copy button - only show for users who can interact */}
          {canInteractWithItems && (
            <IconButton
              size="small"
              onClick={() => onCopy('clone-clean')}
              title="Copy checklist"
            >
              <FontAwesomeIcon icon={faCopy} />
            </IconButton>
          )}
        </Box>

        {/* Context line */}
        <Typography variant="body2" color="text.secondary" sx={{ ml: 5 }}>
          {checklist.eventName}
          {checklist.operationalPeriodName && ` • ${checklist.operationalPeriodName}`}
        </Typography>
      </Box>

      {/* Inline Progress Bar */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          mb: 2,
          py: 1,
          px: 2,
          backgroundColor: 'background.paper',
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ flex: 1 }}>
          <ChecklistProgressBar
            value={progressPercentage}
            height={20}
            showPercentage={true}
          />
        </Box>
        <Typography
          variant="body2"
          sx={{
            fontWeight: 600,
            minWidth: 80,
            textAlign: 'right',
          }}
        >
          {checklist.completedItems}/{checklist.totalItems}
        </Typography>
      </Box>

      {/* Required items indicator */}
      {checklist.requiredItems > 0 && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', mb: 2, ml: 2 }}
        >
          Required: {checklist.requiredItemsCompleted}/{checklist.requiredItems} complete
        </Typography>
      )}

      {/* Readonly Mode Banner */}
      {isReadonly && (
        <Box
          sx={{
            backgroundColor: '#FFF3E0',
            border: '1px solid #FFB74D',
            borderRadius: 1,
            p: 1.5,
            mb: 2,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            <strong>View Only:</strong> You are viewing this checklist in read-only mode.
          </Typography>
        </Box>
      )}

      {/* Items List - Simple paper container */}
      <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
        {checklist.items.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">
              No items in this checklist
            </Typography>
          </Box>
        ) : (
          checklist.items.map((item) => (
            <ChecklistItemClassic
              key={item.id}
              item={item}
              onToggleComplete={onToggleComplete}
              onStatusChange={onStatusChange}
              onOpenNotes={handleOpenNotes}
              onViewInfo={handleViewInfo}
              isProcessing={isProcessing(item.id)}
              isHighlighted={highlightedItemId === item.id && isHighlighting}
              itemRef={getItemRef?.(item.id)}
            />
          ))
        )}
      </Paper>

      {/* Notes Dialog */}
      {editingItem && (
        <ItemNotesDialog
          open={notesDialogOpen}
          itemText={editingItem.itemText}
          currentNotes={editingItem.notes}
          onSave={handleSaveNotes}
          onCancel={handleCloseNotes}
          saving={isProcessing(editingItem.id)}
        />
      )}

      {/* Item Info Dialog */}
      <Dialog
        open={infoDialogOpen}
        onClose={() => setInfoDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Item Details</DialogTitle>
        <DialogContent>
          {viewingItem && (
            <Box sx={{ pt: 1 }}>
              <Typography variant="body1" sx={{ mb: 2, fontWeight: 500 }}>
                {viewingItem.itemText}
              </Typography>

              <Divider sx={{ my: 2 }} />

              {/* Completion info */}
              {viewingItem.itemType === 'checkbox' && viewingItem.isCompleted && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  <strong>Completed:</strong>{' '}
                  {new Date(viewingItem.completedAt!).toLocaleString()}
                  {' by '}
                  {viewingItem.completedBy} ({viewingItem.completedByPosition})
                </Typography>
              )}

              {/* Status info */}
              {viewingItem.itemType === 'status' && viewingItem.currentStatus && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  <strong>Current Status:</strong> {viewingItem.currentStatus}
                </Typography>
              )}

              {/* Notes */}
              {viewingItem.notes && (
                <Box sx={{ mt: 2, p: 2, backgroundColor: 'action.hover', borderRadius: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Notes:
                  </Typography>
                  <Typography variant="body2">{viewingItem.notes}</Typography>
                </Box>
              )}

              {/* Last modified */}
              {viewingItem.lastModifiedBy && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
                  Last modified: {new Date(viewingItem.lastModifiedAt!).toLocaleString()}
                  {' by '}{viewingItem.lastModifiedBy}
                </Typography>
              )}

              {/* Created */}
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                Created: {new Date(viewingItem.createdAt).toLocaleString()}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInfoDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};
