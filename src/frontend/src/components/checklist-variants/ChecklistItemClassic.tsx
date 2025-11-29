/**
 * Classic Checklist Item Component
 *
 * Ultra-minimal item rendering for the "Classic Checklist" variant.
 * Mimics a paper checklist - simple, scannable, familiar.
 *
 * Features:
 * - Single line layout (checkbox + text + completion badge)
 * - No cards, shadows, or heavy visual elements
 * - Actions revealed on hover/tap via subtle icon
 * - Status items show inline pill selector
 */

import React, { useState } from 'react';
import {
  Box,
  Checkbox,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Select,
  FormControl,
} from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faEllipsisVertical,
  faNoteSticky,
  faCircleInfo,
  faCheck,
} from '@fortawesome/free-solid-svg-icons';
import type { ChecklistItemDto } from '../../services/checklistService';
import type { StatusOption } from '../../types';
import { c5Colors } from '../../theme/c5Theme';

interface ChecklistItemClassicProps {
  item: ChecklistItemDto;
  onToggleComplete: (itemId: string, currentStatus: boolean) => void;
  onStatusChange: (itemId: string, newStatus: string) => void;
  onOpenNotes: (item: ChecklistItemDto) => void;
  onViewInfo: (item: ChecklistItemDto) => void;
  isProcessing: boolean;
  /** Whether this item should be highlighted */
  isHighlighted?: boolean;
  /** Ref callback for scroll-to behavior */
  itemRef?: (element: HTMLElement | null) => void;
}

/**
 * Parse status configuration from JSON string
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
 * Get completion status display
 */
const getCompletionDisplay = (item: ChecklistItemDto) => {
  if (item.itemType === 'checkbox' && item.isCompleted) {
    // Show who completed it (abbreviated)
    const name = item.completedBy?.split(' ')[0] || 'Done';
    return { label: name, bgColor: c5Colors.green, textColor: c5Colors.white };
  }
  if (item.itemType === 'status' && item.currentStatus) {
    const options = parseStatusOptions(item.statusConfiguration);
    const current = options.find(o => o.label === item.currentStatus);
    if (current?.isCompletion) {
      return { label: item.currentStatus, bgColor: c5Colors.green, textColor: c5Colors.white };
    }
    return { label: item.currentStatus, bgColor: c5Colors.cobaltBlue, textColor: c5Colors.white };
  }
  return null;
};

export const ChecklistItemClassic: React.FC<ChecklistItemClassicProps> = ({
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
  const [isHovered, setIsHovered] = useState(false);

  const completionDisplay = getCompletionDisplay(item);
  const statusOptions = parseStatusOptions(item.statusConfiguration);
  const hasNotes = Boolean(item.notes);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  return (
    <Box
      ref={itemRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        py: 1.5,
        px: 1,
        borderBottom: '1px solid',
        borderColor: 'divider',
        backgroundColor: item.isCompleted ? 'action.hover' : 'transparent',
        transition: 'background-color 0.15s',
        '&:hover': {
          backgroundColor: 'action.selected',
        },
        // Touch-friendly minimum height
        minHeight: 56,
        // Highlight animation when navigating from landing page
        ...(isHighlighted && {
          animation: 'highlightPulse 1s ease-in-out infinite',
          borderRadius: 1,
        }),
      }}
    >
      {/* Checkbox (for checkbox items) */}
      {item.itemType === 'checkbox' && (
        <Checkbox
          checked={item.isCompleted || false}
          onChange={() => onToggleComplete(item.id, item.isCompleted || false)}
          disabled={isProcessing}
          sx={{
            p: 0.5,
            '& .MuiSvgIcon-root': {
              fontSize: 28, // Large for touch
            },
          }}
        />
      )}

      {/* Status dropdown (for status items) - compact inline */}
      {item.itemType === 'status' && (
        <FormControl size="small" sx={{ minWidth: 120, maxWidth: 150 }}>
          <Select
            value={item.currentStatus || ''}
            onChange={(e) => onStatusChange(item.id, e.target.value)}
            disabled={isProcessing}
            displayEmpty
            sx={{
              fontSize: '0.875rem',
              '& .MuiSelect-select': {
                py: 0.75,
              },
            }}
          >
            <MenuItem value="">
              <em>—</em>
            </MenuItem>
            {statusOptions.map((opt) => (
              <MenuItem key={opt.label} value={opt.label}>
                {opt.label}
                {opt.isCompletion && (
                  <FontAwesomeIcon
                    icon={faCheck}
                    style={{ marginLeft: 8, color: c5Colors.green, fontSize: 12 }}
                  />
                )}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      {/* Item text */}
      <Typography
        variant="body1"
        sx={{
          flex: 1,
          color: item.isCompleted ? 'text.secondary' : 'text.primary',
          // No strikethrough - just color change
        }}
      >
        {item.itemText}
        {item.isRequired && (
          <Typography component="span" color="error" sx={{ ml: 0.5 }}>
            *
          </Typography>
        )}
      </Typography>

      {/* Notes indicator (always visible if has notes) */}
      {hasNotes && (
        <Chip
          icon={<FontAwesomeIcon icon={faNoteSticky} style={{ fontSize: 12 }} />}
          label="Note"
          size="small"
          variant="outlined"
          onClick={() => onOpenNotes(item)}
          sx={{
            height: 24,
            fontSize: '0.75rem',
            cursor: 'pointer',
          }}
        />
      )}

      {/* Completion badge (right side) */}
      {completionDisplay && (
        <Chip
          icon={<FontAwesomeIcon icon={faCheck} style={{ fontSize: 10 }} />}
          label={completionDisplay.label}
          size="small"
          sx={{
            height: 24,
            fontSize: '0.75rem',
            backgroundColor: completionDisplay.bgColor,
            color: completionDisplay.textColor,
            '& .MuiChip-icon': {
              color: completionDisplay.textColor,
            },
          }}
        />
      )}

      {/* Actions menu (visible on hover or always on mobile) */}
      <IconButton
        size="small"
        onClick={handleMenuOpen}
        sx={{
          opacity: isHovered ? 1 : 0.3,
          transition: 'opacity 0.15s',
          // Always visible on touch devices
          '@media (hover: none)': {
            opacity: 1,
          },
        }}
      >
        <FontAwesomeIcon icon={faEllipsisVertical} />
      </IconButton>

      {/* Actions dropdown menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem
          onClick={() => {
            onOpenNotes(item);
            handleMenuClose();
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
            handleMenuClose();
          }}
        >
          <ListItemIcon>
            <FontAwesomeIcon icon={faCircleInfo} />
          </ListItemIcon>
          <ListItemText>View Details</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
};
