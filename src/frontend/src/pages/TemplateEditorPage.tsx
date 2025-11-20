/**
 * Template Editor Page
 *
 * Create new templates or edit existing ones.
 * Features:
 * - Template metadata (name, description, category)
 * - Visual item builder with drag-and-drop
 * - Status configuration for status items
 * - Preview mode
 * - Full validation before save
 *
 * Routes:
 * - /templates/new - Create new template
 * - /templates/:id/edit - Edit existing template
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  TextField,
  Button,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Divider,
} from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faPlus, faSave } from '@fortawesome/free-solid-svg-icons';
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
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { toast } from 'react-toastify';
import { TemplateItemEditor, type TemplateItemFormData } from '../components/TemplateItemEditor';
import { ItemType, TemplateCategory } from '../types';
import { templateService } from '../services/templateService';

/**
 * Generate a temporary ID for new items
 */
const generateTempId = (): string => {
  return `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Template Editor Page Component
 */
export const TemplateEditorPage: React.FC = () => {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const isEditMode = !!templateId;

  // Loading states
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TemplateCategory | ''>('');
  const [items, setItems] = useState<TemplateItemFormData[]>([]);

  // UI state
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Validation
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Load template for editing
  useEffect(() => {
    if (isEditMode && templateId) {
      loadTemplate(templateId);
    }
  }, [isEditMode, templateId]);

  const loadTemplate = async (id: string) => {
    try {
      setLoading(true);
      const template = await templateService.getTemplateById(id);

      setName(template.name);
      setDescription(template.description || '');
      setCategory(template.category);

      // Convert template items to form data
      const formItems: TemplateItemFormData[] = template.items?.map((item) => ({
        id: item.id,
        itemText: item.itemText,
        itemType: item.itemType,
        displayOrder: item.displayOrder,
        isRequired: item.isRequired,
        statusConfiguration: item.statusConfiguration
          ? JSON.parse(item.statusConfiguration)
          : [],
        allowedPositions: item.allowedPositions
          ? JSON.parse(item.allowedPositions)
          : [],
        defaultNotes: item.defaultNotes || '',
      })) || [];

      setItems(formItems);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load template');
      navigate('/templates');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    const newItem: TemplateItemFormData = {
      id: generateTempId(),
      itemText: '',
      itemType: ItemType.CHECKBOX,
      displayOrder: (items.length + 1) * 10,
      isRequired: false,
      statusConfiguration: [],
      allowedPositions: [],
      defaultNotes: '',
    };
    setItems([...items, newItem]);
    // Auto-expand new items
    setExpandedItems((prev) => new Set(prev).add(newItem.id));
  };

  const handleUpdateItem = (id: string, updates: Partial<TemplateItemFormData>) => {
    setItems(items.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  };

  const handleRemoveItem = (id: string) => {
    const updated = items.filter((item) => item.id !== id);
    // Recalculate display order
    const reordered = updated.map((item, idx) => ({
      ...item,
      displayOrder: (idx + 1) * 10,
    }));
    setItems(reordered);
    // Remove from expanded set
    setExpandedItems((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleMoveUp = (id: string) => {
    const index = items.findIndex((item) => item.id === id);
    if (index <= 0) return;

    const reordered = [...items];
    [reordered[index - 1], reordered[index]] = [reordered[index], reordered[index - 1]];

    // Update display order
    const withUpdatedOrder = reordered.map((item, idx) => ({
      ...item,
      displayOrder: (idx + 1) * 10,
    }));
    setItems(withUpdatedOrder);
  };

  const handleMoveDown = (id: string) => {
    const index = items.findIndex((item) => item.id === id);
    if (index < 0 || index >= items.length - 1) return;

    const reordered = [...items];
    [reordered[index], reordered[index + 1]] = [reordered[index + 1], reordered[index]];

    // Update display order
    const withUpdatedOrder = reordered.map((item, idx) => ({
      ...item,
      displayOrder: (idx + 1) * 10,
    }));
    setItems(withUpdatedOrder);
  };

  const handleToggleExpand = (id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleExpandAll = () => {
    setExpandedItems(new Set(items.map((item) => item.id)));
  };

  const handleCollapseAll = () => {
    setExpandedItems(new Set());
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);

      const reordered = arrayMove(items, oldIndex, newIndex);
      // Update display order
      const withUpdatedOrder = reordered.map((item, idx) => ({
        ...item,
        displayOrder: (idx + 1) * 10,
      }));
      setItems(withUpdatedOrder);
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Template metadata validation
    if (!name.trim()) {
      newErrors.name = 'Template name is required';
    }
    if (!category) {
      newErrors.category = 'Category is required';
    }
    if (items.length === 0) {
      newErrors.items = 'At least one item is required';
    }

    // Item validation
    items.forEach((item, index) => {
      if (!item.itemText.trim()) {
        newErrors[`item-${index}-text`] = `Item #${index + 1}: Item text is required`;
      }
      if (item.itemType === ItemType.STATUS && item.statusConfiguration.length === 0) {
        newErrors[`item-${index}-status`] = `Item #${index + 1}: At least one status option is required`;
      }
      if (item.itemType === ItemType.STATUS) {
        const hasCompletion = item.statusConfiguration.some((opt) => opt.isCompletion);
        if (!hasCompletion) {
          newErrors[`item-${index}-completion`] = `Item #${index + 1}: At least one status must count as complete`;
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      toast.error('Please fix validation errors before saving');
      return;
    }

    try {
      setSaving(true);

      // Prepare request data
      const requestData = {
        name: name.trim(),
        description: description.trim(),
        category: category as TemplateCategory,
        tags: '', // Empty string - tags field not yet implemented in UI
        items: items.map((item) => ({
          itemText: item.itemText.trim(),
          itemType: item.itemType,
          displayOrder: item.displayOrder,
          isRequired: item.isRequired,
          statusConfiguration:
            item.itemType === ItemType.STATUS && item.statusConfiguration.length > 0
              ? JSON.stringify(item.statusConfiguration)
              : null,
          allowedPositions:
            item.allowedPositions.length > 0
              ? JSON.stringify(item.allowedPositions)
              : null,
          defaultNotes: item.defaultNotes.trim() || null,
        })),
      };

      if (isEditMode && templateId) {
        await templateService.updateTemplate(templateId, requestData);
        toast.success('Template updated successfully!');
      } else {
        await templateService.createTemplate(requestData);
        toast.success('Template created successfully!');
      }

      navigate('/templates');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (confirm('Are you sure? Any unsaved changes will be lost.')) {
      navigate('/templates');
    }
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 2, mb: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Button
          variant="text"
          startIcon={<FontAwesomeIcon icon={faArrowLeft} />}
          onClick={handleCancel}
        >
          Back
        </Button>
        <Typography variant="h4">
          {isEditMode ? 'Edit Template' : 'Create New Template'}
        </Typography>
      </Box>

      {/* Template Metadata */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Template Information
        </Typography>

        <TextField
          fullWidth
          label="Template Name"
          placeholder="e.g., Daily Safety Briefing"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          error={!!errors.name}
          helperText={errors.name}
          sx={{ mb: 2 }}
        />

        <TextField
          fullWidth
          label="Description (Optional)"
          placeholder="Describe when and how to use this template"
          multiline
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          sx={{ mb: 2 }}
        />

        <FormControl fullWidth required error={!!errors.category}>
          <InputLabel>Category</InputLabel>
          <Select
            value={category}
            onChange={(e) => setCategory(e.target.value as TemplateCategory)}
            label="Category"
          >
            {Object.values(TemplateCategory).map((cat) => (
              <MenuItem key={cat} value={cat}>
                {cat}
              </MenuItem>
            ))}
          </Select>
          {errors.category && (
            <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
              {errors.category}
            </Typography>
          )}
        </FormControl>
      </Paper>

      {/* Items Section */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Checklist Items
          </Typography>
          {items.length > 0 && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                size="small"
                variant="outlined"
                onClick={handleExpandAll}
              >
                Expand All
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={handleCollapseAll}
              >
                Collapse All
              </Button>
            </Box>
          )}
        </Box>

        {errors.items && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errors.items}
          </Alert>
        )}

        {Object.keys(errors)
          .filter((key) => key.startsWith('item-'))
          .map((key) => (
            <Alert key={key} severity="error" sx={{ mb: 1 }}>
              {errors[key]}
            </Alert>
          ))}

        {/* Items List with Drag and Drop */}
        {items.length > 0 && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
              {items.map((item, index) => (
                <TemplateItemEditor
                  key={item.id}
                  item={item}
                  index={index}
                  totalItems={items.length}
                  onUpdate={handleUpdateItem}
                  onRemove={handleRemoveItem}
                  onMoveUp={handleMoveUp}
                  onMoveDown={handleMoveDown}
                  isExpanded={expandedItems.has(item.id)}
                  onToggleExpand={handleToggleExpand}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}

        {/* Add Item Button */}
        <Button
          variant="outlined"
          size="large"
          fullWidth
          startIcon={<FontAwesomeIcon icon={faPlus} />}
          onClick={handleAddItem}
          sx={{
            py: 2,
            borderStyle: 'dashed',
            borderWidth: 2,
            '&:hover': {
              borderStyle: 'dashed',
              borderWidth: 2,
            },
          }}
        >
          Add Item
        </Button>
      </Box>

      <Divider sx={{ my: 3 }} />

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
        <Button variant="text" onClick={handleCancel} disabled={saving}>
          Cancel
        </Button>
        <Button
          variant="contained"
          startIcon={<FontAwesomeIcon icon={faSave} />}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : isEditMode ? 'Save Changes' : 'Create Template'}
        </Button>
      </Box>
    </Container>
  );
};
