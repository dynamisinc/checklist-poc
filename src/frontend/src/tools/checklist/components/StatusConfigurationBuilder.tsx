/**
 * Status Configuration Builder Component
 *
 * Allows users to configure status options for status-type checklist items.
 * Features:
 * - Add/remove status options
 * - Toggle completion flag (which statuses count toward progress)
 * - Drag-and-drop reordering
 * - Validation (at least one completion status required)
 */

import React, { useState } from 'react';
import {
  Box,
  IconButton,
  Typography,
  Checkbox,
  FormControlLabel,
  Alert,
} from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrash, faGripVertical } from '@fortawesome/free-solid-svg-icons';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cobraTheme } from '../../../theme/cobraTheme';
import { CobraTextField, CobraSecondaryButton } from '../../../theme/styledComponents';
import type { StatusOption } from '../../../types';

interface StatusConfigurationBuilderProps {
  value: StatusOption[];
  onChange: (statusOptions: StatusOption[]) => void;
  error?: string;
}

/**
 * Sortable Status Option Row
 */
interface StatusOptionRowProps {
  option: StatusOption;
  index: number;
  onUpdate: (index: number, field: keyof StatusOption, value: any) => void;
  onRemove: (index: number) => void;
}

const StatusOptionRow: React.FC<StatusOptionRowProps> = ({
  option,
  index,
  onUpdate,
  onRemove,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: option.order.toString() });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Box
      ref={setNodeRef}
      style={style}
      sx={{
        display: 'flex',
        gap: 1,
        mb: 1,
        p: 1.5,
        backgroundColor: 'white',
        border: '1px solid #e0e0e0',
        borderRadius: 1,
        alignItems: 'center',
      }}
    >
      {/* Drag Handle */}
      <Box
        {...attributes}
        {...listeners}
        sx={{
          cursor: 'grab',
          color: cobraTheme.palette.text.secondary,
          display: 'flex',
          alignItems: 'center',
          '&:active': {
            cursor: 'grabbing',
          },
        }}
      >
        <FontAwesomeIcon icon={faGripVertical} />
      </Box>

      {/* Status Label */}
      <CobraTextField
        size="small"
        value={option.label}
        onChange={(e) => onUpdate(index, 'label', e.target.value)}
        placeholder="Status name"
        sx={{ flexGrow: 1 }}
      />

      {/* Completion Checkbox */}
      <FormControlLabel
        control={
          <Checkbox
            checked={option.isCompletion}
            onChange={(e) => onUpdate(index, 'isCompletion', e.target.checked)}
            sx={{
              color: cobraTheme.palette.buttonPrimary.main,
              '&.Mui-checked': {
                color: cobraTheme.palette.success.main,
              },
            }}
          />
        }
        label={
          <Typography variant="body2" sx={{ fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
            Counts as complete
          </Typography>
        }
        sx={{ mr: 0 }}
      />

      {/* Remove Button */}
      <IconButton
        size="small"
        onClick={() => onRemove(index)}
        sx={{ color: cobraTheme.palette.buttonDelete.main }}
      >
        <FontAwesomeIcon icon={faTrash} />
      </IconButton>
    </Box>
  );
};

/**
 * Status Configuration Builder Component
 */
export const StatusConfigurationBuilder: React.FC<StatusConfigurationBuilderProps> = ({
  value,
  onChange,
  error,
}) => {
  const [localOptions, setLocalOptions] = useState<StatusOption[]>(value);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Update parent when local state changes
  React.useEffect(() => {
    setLocalOptions(value);
  }, [value]);

  const handleAdd = () => {
    const newOrder = Math.max(...localOptions.map((o) => o.order), 0) + 1;
    const newOption: StatusOption = {
      label: '',
      isCompletion: false,
      order: newOrder,
    };
    const updated = [...localOptions, newOption];
    setLocalOptions(updated);
    onChange(updated);
  };

  const handleUpdate = (index: number, field: keyof StatusOption, value: any) => {
    const updated = [...localOptions];
    updated[index] = { ...updated[index], [field]: value };
    setLocalOptions(updated);
    onChange(updated);
  };

  const handleRemove = (index: number) => {
    const updated = localOptions.filter((_, i) => i !== index);
    // Reorder after removal
    const reordered = updated.map((opt, idx) => ({ ...opt, order: idx + 1 }));
    setLocalOptions(reordered);
    onChange(reordered);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = localOptions.findIndex((opt) => opt.order.toString() === active.id);
      const newIndex = localOptions.findIndex((opt) => opt.order.toString() === over.id);

      const reordered = arrayMove(localOptions, oldIndex, newIndex);
      // Update order property to match new positions
      const withUpdatedOrder = reordered.map((opt, idx) => ({ ...opt, order: idx + 1 }));
      setLocalOptions(withUpdatedOrder);
      onChange(withUpdatedOrder);
    }
  };

  const hasCompletionStatus = localOptions.some((opt) => opt.isCompletion);

  return (
    <Box>
      <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold' }}>
        Status Options
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
        Define the status values for this item. Mark which statuses count as "complete" for progress tracking.
      </Typography>

      {/* Status Options List */}
      {localOptions.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={localOptions.map((opt) => opt.order.toString())}
            strategy={verticalListSortingStrategy}
          >
            {localOptions.map((option, index) => (
              <StatusOptionRow
                key={option.order}
                option={option}
                index={index}
                onUpdate={handleUpdate}
                onRemove={handleRemove}
              />
            ))}
          </SortableContext>
        </DndContext>
      )}

      {/* Add Button */}
      <CobraSecondaryButton
        size="small"
        startIcon={<FontAwesomeIcon icon={faPlus} />}
        onClick={handleAdd}
        sx={{ mt: 1 }}
      >
        Add Status Option
      </CobraSecondaryButton>

      {/* Validation Messages */}
      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {localOptions.length > 0 && !hasCompletionStatus && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          At least one status should be marked as "Counts as complete" for progress tracking.
        </Alert>
      )}

      {localOptions.length === 0 && (
        <Alert severity="info" sx={{ mt: 2 }}>
          Add at least one status option for this item.
        </Alert>
      )}
    </Box>
  );
};
