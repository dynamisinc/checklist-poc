/**
 * Compact Cards Checklist Detail View
 *
 * Variant B: "Compact Cards"
 * Keeps card structure but reduces visual weight significantly.
 *
 * Key differences from Control:
 * - Much smaller padding (8px vs 16px)
 * - No shadows, thin borders only
 * - Actions collapsed into single menu button
 * - Status shown as colored dot + label
 * - More items visible per screen
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  IconButton,
  Card,
  Checkbox,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Select,
  FormControl,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Divider,
  Stack,
} from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faCopy,
  faEllipsisVertical,
  faNoteSticky,
  faCircleInfo,
  faCheck,
  faCircle,
} from '@fortawesome/free-solid-svg-icons';
import { ItemNotesDialog } from '../ItemNotesDialog';
import { ChecklistProgressBarCompact } from '../ChecklistProgressBar';
import type { ChecklistInstanceDto, ChecklistItemDto } from '../../services/checklistService';
import type { StatusOption } from '../../types';
import { c5Colors } from '../../theme/c5Theme';

interface ChecklistDetailCompactProps {
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

/**
 * Parse status options from JSON
 */
const parseStatusOptions = (config?: string | null): StatusOption[] => {
  if (!config) return [];
  try {
    return (JSON.parse(config) as StatusOption[]).sort((a, b) => a.order - b.order);
  } catch {
    return [];
  }
};

/**
 * Get status indicator color
 */
const getStatusColor = (status: string | undefined, options: StatusOption[]): string => {
  if (!status) return '#9E9E9E'; // Gray for unset
  const opt = options.find(o => o.label === status);
  if (opt?.isCompletion) return c5Colors.green; // Dark green for completed
  return c5Colors.cobaltBlue;
};

/**
 * Compact Item Card Component
 */
const CompactItemCard: React.FC<{
  item: ChecklistItemDto;
  onToggleComplete: (itemId: string, currentStatus: boolean) => void;
  onStatusChange: (itemId: string, newStatus: string) => void;
  onOpenNotes: (item: ChecklistItemDto) => void;
  onViewInfo: (item: ChecklistItemDto) => void;
  isProcessing: boolean;
  isHighlighted?: boolean;
  itemRef?: (element: HTMLElement | null) => void;
}> = ({
  item,
  onToggleComplete,
  onStatusChange,
  onOpenNotes,
  onViewInfo,
  isProcessing,
  isHighlighted,
  itemRef,
}) => {
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const statusOptions = parseStatusOptions(item.statusConfiguration);
  const hasNotes = Boolean(item.notes);

  return (
    <Card
      ref={itemRef}
      variant="outlined"
      sx={{
        mb: 1,
        p: 1,
        backgroundColor: item.isCompleted ? 'action.hover' : 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        // No shadow for compact feel
        boxShadow: 'none',
        // Highlight animation when navigating from landing page
        ...(isHighlighted && {
          animation: 'highlightPulse 1s ease-in-out infinite',
        }),
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {/* Checkbox items */}
        {item.itemType === 'checkbox' && (
          <Checkbox
            checked={item.isCompleted || false}
            onChange={() => onToggleComplete(item.id, item.isCompleted || false)}
            disabled={isProcessing}
            size="small"
            sx={{
              p: 0.5,
              '& .MuiSvgIcon-root': { fontSize: 22 },
            }}
          />
        )}

        {/* Status items - colored dot indicator */}
        {item.itemType === 'status' && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 100 }}>
            <FontAwesomeIcon
              icon={faCircle}
              style={{
                fontSize: 10,
                color: getStatusColor(item.currentStatus, statusOptions),
              }}
            />
            <FormControl size="small" sx={{ minWidth: 90 }}>
              <Select
                value={item.currentStatus || ''}
                onChange={(e) => onStatusChange(item.id, e.target.value)}
                disabled={isProcessing}
                displayEmpty
                variant="standard"
                sx={{
                  fontSize: '0.8rem',
                  '&:before': { borderBottom: 'none' },
                  '&:hover:before': { borderBottom: 'none' },
                }}
              >
                <MenuItem value="" sx={{ fontSize: '0.8rem' }}>
                  <em>—</em>
                </MenuItem>
                {statusOptions.map((opt) => (
                  <MenuItem key={opt.label} value={opt.label} sx={{ fontSize: '0.8rem' }}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        )}

        {/* Item text */}
        <Typography
          variant="body2"
          sx={{
            flex: 1,
            color: item.isCompleted ? 'text.secondary' : 'text.primary',
            fontSize: '0.875rem',
          }}
        >
          {item.itemText}
          {item.isRequired && (
            <Typography component="span" color="error" sx={{ ml: 0.5 }}>
              *
            </Typography>
          )}
        </Typography>

        {/* Notes badge (if has notes) */}
        {hasNotes && (
          <Chip
            size="small"
            icon={<FontAwesomeIcon icon={faNoteSticky} style={{ fontSize: 10 }} />}
            label=""
            sx={{
              height: 20,
              width: 28,
              '& .MuiChip-label': { px: 0 },
            }}
          />
        )}

        {/* Completion indicator */}
        {item.isCompleted && item.itemType === 'checkbox' && (
          <FontAwesomeIcon
            icon={faCheck}
            style={{ fontSize: 14, color: c5Colors.green }}
          />
        )}

        {/* Menu button */}
        <IconButton
          size="small"
          onClick={(e) => setMenuAnchor(e.currentTarget)}
          sx={{ p: 0.5 }}
        >
          <FontAwesomeIcon icon={faEllipsisVertical} style={{ fontSize: 14 }} />
        </IconButton>

        {/* Actions menu */}
        <Menu
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor)}
          onClose={() => setMenuAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <MenuItem
            onClick={() => {
              onOpenNotes(item);
              setMenuAnchor(null);
            }}
          >
            <ListItemIcon>
              <FontAwesomeIcon icon={faNoteSticky} />
            </ListItemIcon>
            <ListItemText>{hasNotes ? 'Edit Note' : 'Add Note'}</ListItemText>
          </MenuItem>
          <MenuItem
            onClick={() => {
              onViewInfo(item);
              setMenuAnchor(null);
            }}
          >
            <ListItemIcon>
              <FontAwesomeIcon icon={faCircleInfo} />
            </ListItemIcon>
            <ListItemText>View Details</ListItemText>
          </MenuItem>
        </Menu>
      </Box>
    </Card>
  );
};

export const ChecklistDetailCompact: React.FC<ChecklistDetailCompactProps> = ({
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

  // Dialog states
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ChecklistItemDto | null>(null);
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);
  const [viewingItem, setViewingItem] = useState<ChecklistItemDto | null>(null);

  const handleOpenNotes = (item: ChecklistItemDto) => {
    setEditingItem(item);
    setNotesDialogOpen(true);
  };

  const handleSaveNotes = async (notes: string) => {
    if (editingItem) {
      await onSaveNotes(editingItem.id, notes);
      setNotesDialogOpen(false);
      setEditingItem(null);
    }
  };

  const handleViewInfo = (item: ChecklistItemDto) => {
    setViewingItem(item);
    setInfoDialogOpen(true);
  };

  const progressPercentage = Number(checklist.progressPercentage);

  return (
    <Container maxWidth="md" sx={{ py: 2 }}>
      {/* Compact Header */}
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <IconButton onClick={() => navigate('/checklists')} size="small">
          <FontAwesomeIcon icon={faArrowLeft} />
        </IconButton>

        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
            {checklist.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {checklist.eventName}
            {checklist.operationalPeriodName && ` • ${checklist.operationalPeriodName}`}
          </Typography>
        </Box>

        <IconButton size="small" onClick={() => onCopy('clone-clean')}>
          <FontAwesomeIcon icon={faCopy} />
        </IconButton>
      </Stack>

      {/* Compact Progress */}
      <Box sx={{ mb: 2 }}>
        <ChecklistProgressBarCompact value={progressPercentage} width="100%" />
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, textAlign: 'right' }}>
          {checklist.completedItems}/{checklist.totalItems} items
        </Typography>
      </Box>

      {/* Items */}
      {checklist.items.length === 0 ? (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">No items</Typography>
        </Box>
      ) : (
        checklist.items.map((item) => (
          <CompactItemCard
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

      {/* Notes Dialog */}
      {editingItem && (
        <ItemNotesDialog
          open={notesDialogOpen}
          itemText={editingItem.itemText}
          currentNotes={editingItem.notes}
          onSave={handleSaveNotes}
          onCancel={() => setNotesDialogOpen(false)}
          saving={isProcessing(editingItem.id)}
        />
      )}

      {/* Info Dialog */}
      <Dialog open={infoDialogOpen} onClose={() => setInfoDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Item Details</DialogTitle>
        <DialogContent>
          {viewingItem && (
            <Box sx={{ pt: 1 }}>
              <Typography variant="body1" sx={{ mb: 2, fontWeight: 500 }}>
                {viewingItem.itemText}
              </Typography>
              <Divider sx={{ my: 2 }} />
              {viewingItem.isCompleted && viewingItem.completedBy && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  <strong>Completed:</strong> {new Date(viewingItem.completedAt!).toLocaleString()}
                  {' by '}{viewingItem.completedBy}
                </Typography>
              )}
              {viewingItem.notes && (
                <Box sx={{ mt: 2, p: 2, backgroundColor: 'action.hover', borderRadius: 1 }}>
                  <Typography variant="caption" color="text.secondary">Notes:</Typography>
                  <Typography variant="body2">{viewingItem.notes}</Typography>
                </Box>
              )}
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
