/**
 * Progressive Disclosure Checklist Detail View
 *
 * Variant C: "Progressive Disclosure"
 * Ultra-minimal by default, expand items to see full details.
 *
 * Key differences from Control:
 * - Default: Just checkbox + text + expand chevron
 * - Single tap expands to show notes, status, metadata
 * - Only one item expanded at a time (accordion)
 * - Keeps all functionality but hides complexity
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  IconButton,
  Checkbox,
  Collapse,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  Button,
  Stack,
  Paper,
  Divider,
} from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faCopy,
  faChevronDown,
  faChevronUp,
  faCheck,
  faSave,
} from '@fortawesome/free-solid-svg-icons';
import { ChecklistProgressBar } from '../ChecklistProgressBar';
import { usePermissions } from '../../../../shared/hooks/usePermissions';
import type { ChecklistInstanceDto, ChecklistItemDto } from '../../services/checklistService';
import type { StatusOption } from '../../../../types';
import { c5Colors } from '../../../../theme/c5Theme';

interface ChecklistDetailProgressiveProps {
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
 * Progressive Item Component - Expandable accordion style
 */
const ProgressiveItem: React.FC<{
  item: ChecklistItemDto;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onToggleComplete: (itemId: string, currentStatus: boolean) => void;
  onStatusChange: (itemId: string, newStatus: string) => void;
  onSaveNotes: (itemId: string, notes: string) => void;
  isProcessing: boolean;
  isHighlighted?: boolean;
  itemRef?: (element: HTMLElement | null) => void;
}> = ({
  item,
  isExpanded,
  onToggleExpand,
  onToggleComplete,
  onStatusChange,
  onSaveNotes,
  isProcessing,
  isHighlighted,
  itemRef,
}) => {
  const { canInteractWithItems } = usePermissions();
  const [editedNotes, setEditedNotes] = useState(item.notes || '');
  const [notesChanged, setNotesChanged] = useState(false);
  const statusOptions = parseStatusOptions(item.statusConfiguration);

  const handleNotesChange = (value: string) => {
    setEditedNotes(value);
    setNotesChanged(value !== (item.notes || ''));
  };

  const handleSaveNotes = () => {
    onSaveNotes(item.id, editedNotes);
    setNotesChanged(false);
  };

  // Reset notes when item changes
  React.useEffect(() => {
    setEditedNotes(item.notes || '');
    setNotesChanged(false);
  }, [item.notes]);

  return (
    <Box
      ref={itemRef}
      sx={{
        borderBottom: '1px solid',
        borderColor: 'divider',
        backgroundColor: item.isCompleted ? 'action.hover' : 'background.paper',
        // Highlight animation when navigating from landing page
        ...(isHighlighted && {
          animation: 'highlightPulse 1s ease-in-out infinite',
          borderRadius: 1,
        }),
      }}
    >
      {/* Collapsed Row - Always visible */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          py: 1.5,
          px: 2,
          cursor: 'pointer',
          minHeight: 56,
          '&:hover': {
            backgroundColor: 'action.selected',
          },
        }}
        onClick={onToggleExpand}
      >
        {/* Checkbox (click stops propagation to allow toggling) */}
        {item.itemType === 'checkbox' && (
          <Checkbox
            checked={item.isCompleted || false}
            onChange={(e) => {
              e.stopPropagation();
              onToggleComplete(item.id, item.isCompleted || false);
            }}
            disabled={isProcessing || !canInteractWithItems}
            onClick={(e) => e.stopPropagation()}
            sx={{
              p: 0.5,
              '& .MuiSvgIcon-root': { fontSize: 26 },
            }}
          />
        )}

        {/* Status indicator for status items */}
        {item.itemType === 'status' && (
          <Box
            sx={{
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {item.currentStatus ? (
              <FontAwesomeIcon
                icon={faCheck}
                style={{
                  color: statusOptions.find(o => o.label === item.currentStatus)?.isCompletion
                    ? c5Colors.green
                    : c5Colors.cobaltBlue,
                  fontSize: 16,
                }}
              />
            ) : (
              <Box
                sx={{
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  border: '2px solid',
                  borderColor: 'divider',
                }}
              />
            )}
          </Box>
        )}

        {/* Item text */}
        <Typography
          variant="body1"
          sx={{
            flex: 1,
            color: item.isCompleted ? 'text.secondary' : 'text.primary',
          }}
        >
          {item.itemText}
          {item.isRequired && (
            <Typography component="span" color="error" sx={{ ml: 0.5 }}>
              *
            </Typography>
          )}
        </Typography>

        {/* Indicators */}
        {item.notes && (
          <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
            📝
          </Typography>
        )}

        {item.isCompleted && item.itemType === 'checkbox' && (
          <Typography variant="caption" color="success.main" sx={{ mr: 1 }}>
            ✓ {item.completedBy?.split(' ')[0]}
          </Typography>
        )}

        {item.itemType === 'status' && item.currentStatus && (
          <Typography variant="caption" color="primary" sx={{ mr: 1 }}>
            {item.currentStatus}
          </Typography>
        )}

        {/* Expand chevron */}
        <FontAwesomeIcon
          icon={isExpanded ? faChevronUp : faChevronDown}
          style={{ fontSize: 14, color: '#666' }}
        />
      </Box>

      {/* Expanded Content */}
      <Collapse in={isExpanded}>
        <Box
          sx={{
            px: 2,
            pb: 2,
            pt: 1,
            ml: item.itemType === 'checkbox' ? 5 : 6,
            borderLeft: '3px solid',
            borderColor: 'primary.main',
            backgroundColor: 'background.default',
          }}
        >
          {/* Status dropdown (for status items) */}
          {item.itemType === 'status' && (
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={item.currentStatus || ''}
                onChange={(e) => onStatusChange(item.id, e.target.value)}
                label="Status"
                disabled={isProcessing || !canInteractWithItems}
              >
                <MenuItem value="">
                  <em>(Not set)</em>
                </MenuItem>
                {statusOptions.map((opt) => (
                  <MenuItem key={opt.label} value={opt.label}>
                    {opt.label}
                    {opt.isCompletion && ' ✓'}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {/* Notes editor - show read-only for readonly users */}
          <TextField
            label="Notes"
            multiline
            rows={2}
            fullWidth
            size="small"
            value={editedNotes}
            onChange={(e) => handleNotesChange(e.target.value)}
            placeholder={canInteractWithItems ? "Add notes about this item..." : "No notes"}
            sx={{ mb: 1 }}
            disabled={!canInteractWithItems}
          />

          {notesChanged && canInteractWithItems && (
            <Button
              size="small"
              variant="contained"
              startIcon={<FontAwesomeIcon icon={faSave} />}
              onClick={handleSaveNotes}
              disabled={isProcessing}
              sx={{ mb: 2 }}
            >
              Save Notes
            </Button>
          )}

          {/* Metadata */}
          <Divider sx={{ my: 1 }} />
          <Stack spacing={0.5}>
            {item.isCompleted && item.completedBy && (
              <Typography variant="caption" color="text.secondary">
                Completed: {new Date(item.completedAt!).toLocaleString()} by{' '}
                {item.completedBy} ({item.completedByPosition})
              </Typography>
            )}
            {item.lastModifiedBy && (
              <Typography variant="caption" color="text.secondary">
                Modified: {new Date(item.lastModifiedAt!).toLocaleString()} by{' '}
                {item.lastModifiedBy}
              </Typography>
            )}
            <Typography variant="caption" color="text.secondary">
              Created: {new Date(item.createdAt).toLocaleString()}
            </Typography>
          </Stack>
        </Box>
      </Collapse>
    </Box>
  );
};

export const ChecklistDetailProgressive: React.FC<ChecklistDetailProgressiveProps> = ({
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
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  const handleToggleExpand = (itemId: string) => {
    setExpandedItemId((prev) => (prev === itemId ? null : itemId));
  };

  const progressPercentage = Number(checklist.progressPercentage);

  return (
    <Container maxWidth={false} disableGutters sx={{ py: 2, px: 2 }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <IconButton onClick={() => navigate('/checklists/dashboard')} size="small">
          <FontAwesomeIcon icon={faArrowLeft} />
        </IconButton>

        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            {checklist.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {checklist.eventName}
            {checklist.operationalPeriodName && ` • ${checklist.operationalPeriodName}`}
          </Typography>
        </Box>

        {/* Copy button - only show for users who can interact */}
        {canInteractWithItems && (
          <IconButton size="small" onClick={() => onCopy('clone-clean')}>
            <FontAwesomeIcon icon={faCopy} />
          </IconButton>
        )}
      </Stack>

      {/* Progress */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
          <Typography variant="body2" color="text.secondary">
            Progress
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {checklist.completedItems}/{checklist.totalItems} items
          </Typography>
        </Box>
        <ChecklistProgressBar
          value={progressPercentage}
          height={24}
          showPercentage={true}
        />
        {checklist.requiredItems > 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            Required: {checklist.requiredItemsCompleted}/{checklist.requiredItems}
          </Typography>
        )}
      </Box>

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

      {/* Instruction hint */}
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: 'block', mb: 1, fontStyle: 'italic' }}
      >
        {canInteractWithItems
          ? 'Tap an item to expand details and add notes'
          : 'Tap an item to view details'}
      </Typography>

      {/* Items */}
      <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
        {checklist.items.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">No items in this checklist</Typography>
          </Box>
        ) : (
          checklist.items.map((item) => (
            <ProgressiveItem
              key={item.id}
              item={item}
              isExpanded={expandedItemId === item.id}
              onToggleExpand={() => handleToggleExpand(item.id)}
              onToggleComplete={onToggleComplete}
              onStatusChange={onStatusChange}
              onSaveNotes={onSaveNotes}
              isProcessing={isProcessing(item.id)}
              isHighlighted={highlightedItemId === item.id && isHighlighting}
              itemRef={getItemRef?.(item.id)}
            />
          ))
        )}
      </Paper>
    </Container>
  );
};
