/**
 * Template Item Editor Component
 *
 * Edits a single template item with all its configuration.
 * Features:
 * - Item text, type (checkbox/status), required flag
 * - Status configuration builder (for status items)
 * - Advanced options: position restrictions, default notes
 * - Drag handle for reordering
 * - Delete button
 */

import React, { useState } from 'react';
import {
  Box,
  TextField,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Checkbox,
  IconButton,
  Paper,
  Typography,
  Collapse,
  Button,
  Autocomplete,
  Chip,
} from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faGripVertical,
  faTrash,
  faChevronDown,
  faChevronUp,
  faArrowUp,
  faArrowDown,
  faSave,
} from '@fortawesome/free-solid-svg-icons';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { c5Colors } from '../theme/c5Theme';
import { StatusConfigurationBuilder } from './StatusConfigurationBuilder';
import { ItemType, DEFAULT_STATUS_OPTIONS, ICS_POSITIONS, type StatusOption } from '../types';

export interface TemplateItemFormData {
  id: string; // Temporary ID for new items (guid for existing)
  itemText: string;
  itemType: ItemType;
  displayOrder: number;
  isRequired: boolean;
  statusConfiguration: StatusOption[];
  allowedPositions: string[];
  defaultNotes: string;
}

interface TemplateItemEditorProps {
  item: TemplateItemFormData;
  index: number;
  totalItems: number;
  onUpdate: (id: string, updates: Partial<TemplateItemFormData>) => void;
  onRemove: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
  onSaveToLibrary?: (item: TemplateItemFormData) => void;
}

/**
 * Template Item Editor Component
 */
export const TemplateItemEditor: React.FC<TemplateItemEditorProps> = ({
  item,
  index,
  totalItems,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  isExpanded,
  onToggleExpand,
  onSaveToLibrary,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleTypeChange = (newType: string) => {
    const updates: Partial<TemplateItemFormData> = {
      itemType: newType as ItemType,
    };

    // If switching to status type and no status config, add defaults
    if (newType === ItemType.STATUS && item.statusConfiguration.length === 0) {
      updates.statusConfiguration = DEFAULT_STATUS_OPTIONS;
    }

    // If switching away from status, clear status config
    if (newType === ItemType.CHECKBOX) {
      updates.statusConfiguration = [];
    }

    onUpdate(item.id, updates);
  };

  return (
    <Paper
      ref={setNodeRef}
      style={style}
      elevation={2}
      sx={{
        p: 2,
        mb: 2,
        border: `2px solid ${c5Colors.silverWhite}`,
        '&:hover': {
          borderColor: c5Colors.cobaltBlue,
        },
      }}
    >
      {/* Header Row */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          mb: isExpanded ? 2 : 0,
          cursor: 'pointer',
          '&:hover': {
            backgroundColor: '#F5F5F5',
          },
          p: 1,
          ml: -1,
          mr: -1,
          borderRadius: 1,
        }}
        onClick={() => onToggleExpand(item.id)}
      >
        {/* Drag Handle */}
        <Box
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          sx={{
            cursor: 'grab',
            color: c5Colors.dimGray,
            display: 'flex',
            alignItems: 'center',
            '&:active': {
              cursor: 'grabbing',
            },
          }}
        >
          <FontAwesomeIcon icon={faGripVertical} size="lg" />
        </Box>

        {/* Expand/Collapse Icon */}
        <IconButton size="small" sx={{ p: 0.5 }}>
          <FontAwesomeIcon icon={isExpanded ? faChevronUp : faChevronDown} size="sm" />
        </IconButton>

        {/* Item Number and Summary */}
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
            Item #{index + 1}
          </Typography>
          {!isExpanded && (
            <Typography variant="body2" color="text.secondary" sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '500px',
            }}>
              {item.itemText || '(No text)'}
              {' • '}
              <Chip
                label={item.itemType === ItemType.CHECKBOX ? 'Checkbox' : 'Status'}
                size="small"
                sx={{ height: '20px', fontSize: '0.7rem' }}
              />
              {item.isRequired && (
                <Chip
                  label="Required"
                  size="small"
                  color="primary"
                  sx={{ height: '20px', fontSize: '0.7rem', ml: 0.5 }}
                />
              )}
            </Typography>
          )}
        </Box>

        {/* Move Up/Down Buttons */}
        <Box onClick={(e) => e.stopPropagation()} sx={{ display: 'flex', gap: 0.5 }}>
          <IconButton
            size="small"
            onClick={() => onMoveUp(item.id)}
            disabled={index === 0}
            title="Move up"
          >
            <FontAwesomeIcon icon={faArrowUp} size="sm" />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => onMoveDown(item.id)}
            disabled={index === totalItems - 1}
            title="Move down"
          >
            <FontAwesomeIcon icon={faArrowDown} size="sm" />
          </IconButton>
        </Box>

        {/* Save to Library Button */}
        {onSaveToLibrary && (
          <Box onClick={(e) => e.stopPropagation()}>
            <IconButton
              size="small"
              onClick={() => onSaveToLibrary(item)}
              sx={{ color: c5Colors.cobaltBlue }}
              title="Save to library"
            >
              <FontAwesomeIcon icon={faSave} />
            </IconButton>
          </Box>
        )}

        {/* Delete Button */}
        <Box onClick={(e) => e.stopPropagation()}>
          <IconButton
            size="small"
            onClick={() => onRemove(item.id)}
            sx={{ color: c5Colors.lavaRed }}
            title="Remove item"
          >
            <FontAwesomeIcon icon={faTrash} />
          </IconButton>
        </Box>
      </Box>

      {/* Collapsible Content */}
      <Collapse in={isExpanded}>
        {/* Item Text */}
        <TextField
          fullWidth
          label="Item Text"
          placeholder="e.g., Verify all personnel have safety equipment"
          value={item.itemText}
          onChange={(e) => onUpdate(item.id, { itemText: e.target.value })}
          required
          sx={{ mb: 2 }}
        />

      {/* Item Type */}
      <FormControl component="fieldset" sx={{ mb: 2 }}>
        <FormLabel component="legend">Item Type</FormLabel>
        <RadioGroup
          row
          value={item.itemType}
          onChange={(e) => handleTypeChange(e.target.value)}
        >
          <FormControlLabel
            value={ItemType.CHECKBOX}
            control={<Radio />}
            label="Checkbox (Simple yes/no completion)"
          />
          <FormControlLabel
            value={ItemType.STATUS}
            control={<Radio />}
            label="Status (Multiple status options)"
          />
        </RadioGroup>
      </FormControl>

      {/* Required Checkbox */}
      <FormControlLabel
        control={
          <Checkbox
            checked={item.isRequired}
            onChange={(e) => onUpdate(item.id, { isRequired: e.target.checked })}
          />
        }
        label="This item is required to complete the checklist"
        sx={{ mb: 2 }}
      />

      {/* Status Configuration (only for status type) */}
      {item.itemType === ItemType.STATUS && (
        <Box sx={{ mb: 2, p: 2, backgroundColor: '#F5F5F5', borderRadius: 1 }}>
          <StatusConfigurationBuilder
            value={item.statusConfiguration}
            onChange={(statusOptions) => onUpdate(item.id, { statusConfiguration: statusOptions })}
            error={
              item.statusConfiguration.length === 0
                ? 'At least one status option is required'
                : undefined
            }
          />
        </Box>
      )}

      {/* Advanced Options Toggle */}
      <Button
        size="small"
        onClick={() => setShowAdvanced(!showAdvanced)}
        startIcon={
          <FontAwesomeIcon icon={showAdvanced ? faChevronUp : faChevronDown} />
        }
        sx={{ mb: 1 }}
      >
        Advanced Options
      </Button>

      {/* Advanced Options Section */}
      <Collapse in={showAdvanced}>
        <Box sx={{ p: 2, backgroundColor: '#FAFAFA', borderRadius: 1 }}>
          {/* Allowed Positions */}
          <Autocomplete
            multiple
            options={ICS_POSITIONS as unknown as string[]}
            value={item.allowedPositions}
            onChange={(_, newValue) => onUpdate(item.id, { allowedPositions: newValue })}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Allowed Positions (Optional)"
                placeholder="Select positions..."
                helperText="Leave empty to allow all positions"
              />
            )}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  label={option}
                  {...getTagProps({ index })}
                  sx={{ backgroundColor: c5Colors.whiteBlue }}
                />
              ))
            }
            sx={{ mb: 2 }}
          />

          {/* Default Notes */}
          <TextField
            fullWidth
            label="Default Notes (Optional)"
            placeholder="e.g., Check with logistics coordinator before marking complete"
            multiline
            rows={2}
            value={item.defaultNotes}
            onChange={(e) => onUpdate(item.id, { defaultNotes: e.target.value })}
            helperText="These notes will appear on checklist items by default"
          />
        </Box>
      </Collapse>
      </Collapse>
    </Paper>
  );
};
