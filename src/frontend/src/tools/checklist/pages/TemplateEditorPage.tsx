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
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Divider,
  Chip,
  OutlinedInput,
  FormHelperText,
  Stack,
} from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faPlus, faSave, faBoxArchive } from '@fortawesome/free-solid-svg-icons';
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
import { AddFromLibraryDialog } from '../components/AddFromLibraryDialog';
import { SaveToLibraryDialog } from '../components/SaveToLibraryDialog';
import { ItemType, TemplateCategory, TemplateType, ICS_INCIDENT_TYPES, type ItemLibraryEntry, type StatusOption } from '../../../types';
import { templateService } from '../services/templateService';
import { itemLibraryService } from '../services/itemLibraryService';
import {
  CobraTextField,
  CobraSecondaryButton,
  CobraSaveButton,
  CobraLinkButton,
} from '../../../theme/styledComponents';
import CobraStyles from '../../../theme/CobraStyles';

/**
 * Generate a temporary ID for new items
 */
const generateTempId = (): string => {
  return `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Parse statusConfiguration from API which can be either:
 * - Array of strings: ["Not Started", "In Progress", "Completed"]
 * - Array of StatusOption objects: [{label, isCompletion, order}]
 */
const parseStatusConfiguration = (statusConfiguration?: string | null): StatusOption[] => {
  if (!statusConfiguration) return [];
  try {
    const parsed = JSON.parse(statusConfiguration);
    if (Array.isArray(parsed)) {
      if (parsed.length === 0) return [];
      // Check if first element is a string (simple format) or object (full format)
      if (typeof parsed[0] === 'string') {
        // Convert simple string array to StatusOption array
        return parsed.map((label: string, index: number) => ({
          label,
          isCompletion: label.toLowerCase().includes('complete') || label.toLowerCase().includes('done'),
          order: index,
        }));
      } else {
        // Already in StatusOption format
        return (parsed as StatusOption[]).sort((a, b) => a.order - b.order);
      }
    }
    return [];
  } catch (error) {
    console.error('Failed to parse status configuration:', error);
    return [];
  }
};

/**
 * Template Editor Page Component
 */
export const TemplateEditorPage: React.FC = () => {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const isDuplicateMode = location.pathname.includes('/duplicate');
  const isEditMode = !!templateId && !isDuplicateMode;
  const shouldLoadTemplate = !!templateId; // Load for both edit and duplicate

  // Loading states
  const [loading, setLoading] = useState(shouldLoadTemplate);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TemplateCategory | ''>('');
  const [templateType, setTemplateType] = useState<TemplateType>(TemplateType.MANUAL);
  const [autoCreateCategories, setAutoCreateCategories] = useState<string[]>([]);
  const [items, setItems] = useState<TemplateItemFormData[]>([]);

  // UI state
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Library dialog state
  const [addFromLibraryOpen, setAddFromLibraryOpen] = useState(false);
  const [saveToLibraryOpen, setSaveToLibraryOpen] = useState(false);
  const [itemToSaveToLibrary, setItemToSaveToLibrary] = useState<TemplateItemFormData | null>(null);

  // Validation
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [warnings, setWarnings] = useState<string[]>([]);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Load template for editing or duplicating
  useEffect(() => {
    if (shouldLoadTemplate && templateId) {
      loadTemplate(templateId, isDuplicateMode);
    }
  }, [shouldLoadTemplate, templateId, isDuplicateMode]);

  // Update warnings when items change
  useEffect(() => {
    const newWarnings = getTemplateWarnings();
    setWarnings(newWarnings);
  }, [items]);

  const loadTemplate = async (id: string, isDuplicate: boolean) => {
    try {
      setLoading(true);
      const template = await templateService.getTemplateById(id);

      // In duplicate mode, append " (Copy)" to name
      setName(isDuplicate ? `${template.name} (Copy)` : template.name);
      setDescription(template.description || '');
      setCategory(template.category);
      setTemplateType(template.templateType ?? TemplateType.MANUAL);
      setAutoCreateCategories(
        template.autoCreateForCategories
          ? JSON.parse(template.autoCreateForCategories)
          : []
      );

      // Convert template items to form data
      const formItems: TemplateItemFormData[] = template.items?.map((item) => ({
        // In duplicate mode, replace IDs with temp IDs so they're treated as new
        id: isDuplicate ? generateTempId() : item.id,
        itemText: item.itemText,
        itemType: item.itemType,
        displayOrder: item.displayOrder,
        isRequired: item.isRequired,
        statusConfiguration: parseStatusConfiguration(item.statusConfiguration),
        allowedPositions: item.allowedPositions
          ? JSON.parse(item.allowedPositions)
          : [],
        defaultNotes: item.defaultNotes || '',
      })) || [];

      setItems(formItems);

      // In duplicate mode, auto-expand all items for review
      if (isDuplicate) {
        setExpandedItems(new Set(formItems.map(item => item.id)));
      }
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

  const handleAddFromLibrary = (libraryItems: ItemLibraryEntry[]) => {
    // Convert library items to template items
    const newItems: TemplateItemFormData[] = libraryItems.map((libItem) => ({
      id: generateTempId(),
      itemText: libItem.itemText,
      itemType: libItem.itemType as ItemType,
      displayOrder: (items.length + libraryItems.indexOf(libItem) + 1) * 10,
      isRequired: libItem.isRequiredByDefault,
      statusConfiguration: parseStatusConfiguration(libItem.statusConfiguration),
      allowedPositions: libItem.allowedPositions ? JSON.parse(libItem.allowedPositions) : [],
      defaultNotes: libItem.defaultNotes || '',
    }));

    // Add to items list
    setItems([...items, ...newItems]);

    // Auto-expand new items
    const newItemIds = newItems.map((item) => item.id);
    setExpandedItems((prev) => {
      const next = new Set(prev);
      newItemIds.forEach((id) => next.add(id));
      return next;
    });

    // Increment usage count for each library item
    libraryItems.forEach((libItem) => {
      itemLibraryService.incrementUsageCount(libItem.id).catch((err) => {
        console.error('Failed to increment usage count:', err);
      });
    });

    toast.success(`Added ${libraryItems.length} item${libraryItems.length > 1 ? 's' : ''} from library`);
  };

  const handleSaveToLibrary = (item: TemplateItemFormData) => {
    setItemToSaveToLibrary(item);
    setSaveToLibraryOpen(true);
  };

  const handleSavedToLibrary = () => {
    // Refresh could happen here if needed
    toast.success('Item saved to library!');
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

  /**
   * Generate non-blocking warnings to help users create better templates
   */
  const getTemplateWarnings = (): string[] => {
    const newWarnings: string[] = [];

    if (items.length === 0) {
      return newWarnings; // No warnings if no items yet
    }

    // Warning 1: No required items
    const hasRequiredItems = items.some((item) => item.isRequired);
    if (!hasRequiredItems) {
      newWarnings.push(
        'No items are marked as "Required". Consider marking critical items as required to ensure they are completed.'
      );
    }

    // Warning 2: All items same type
    const checkboxCount = items.filter((item) => item.itemType === ItemType.CHECKBOX).length;
    const statusCount = items.filter((item) => item.itemType === ItemType.STATUS).length;
    if (items.length > 1 && checkboxCount === items.length) {
      newWarnings.push(
        'All items are checkboxes. Consider using status dropdowns for tasks that require multi-step tracking or additional context.'
      );
    } else if (items.length > 1 && statusCount === items.length) {
      newWarnings.push(
        'All items are status dropdowns. Consider using checkboxes for simple yes/no tasks to improve usability.'
      );
    }

    // Warning 3: Duplicate item text
    const itemTexts = items.map((item) => item.itemText.trim().toLowerCase());
    const duplicates = itemTexts.filter((text, index) => itemTexts.indexOf(text) !== index);
    if (duplicates.length > 0) {
      newWarnings.push(
        'Some items have identical text. Consider making item descriptions more specific to avoid confusion.'
      );
    }

    // Warning 4: Very short or unclear item text
    const shortItems = items.filter((item) => item.itemText.trim().length < 10);
    if (shortItems.length > 0) {
      newWarnings.push(
        `${shortItems.length} item${shortItems.length > 1 ? 's have' : ' has'} very short descriptions (less than 10 characters). Consider adding more context for clarity.`
      );
    }

    // Warning 5: Many items without position restrictions (could lead to confusion)
    if (items.length >= 10) {
      const itemsWithoutPositions = items.filter((item) => item.allowedPositions.length === 0);
      if (itemsWithoutPositions.length === items.length) {
        newWarnings.push(
          'None of your items have position restrictions. For large templates, consider assigning items to specific ICS positions to avoid confusion.'
        );
      }
    }

    return newWarnings;
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
        templateType,
        autoCreateForCategories:
          templateType === TemplateType.AUTO_CREATE && autoCreateCategories.length > 0
            ? JSON.stringify(autoCreateCategories)
            : undefined,
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
      <Container maxWidth="md">
        <Stack spacing={3} padding={CobraStyles.Padding.MainWindow} sx={{ display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Stack>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Stack spacing={3} padding={CobraStyles.Padding.MainWindow}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <CobraLinkButton
            startIcon={<FontAwesomeIcon icon={faArrowLeft} />}
            onClick={handleCancel}
          >
            Back
          </CobraLinkButton>
          <Typography variant="h4">
            {isEditMode ? 'Edit Template' : isDuplicateMode ? 'Duplicate Template' : 'Create New Template'}
          </Typography>
        </Box>

        {/* Template Metadata */}
        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Template Information
          </Typography>

          <Stack spacing={CobraStyles.Spacing.FormFields}>
            <CobraTextField
              fullWidth
              label="Template Name"
              placeholder="e.g., Daily Safety Briefing"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              error={!!errors.name}
              helperText={errors.name}
            />

            <CobraTextField
              fullWidth
              label="Description (Optional)"
              placeholder="Describe when and how to use this template"
              multiline
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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

            <Divider />

            <Typography variant="h6">
              Template Type
            </Typography>

            <FormControl fullWidth>
          <InputLabel>How should checklists be created from this template?</InputLabel>
          <Select
            value={templateType}
            onChange={(e) => {
              setTemplateType(e.target.value as TemplateType);
              // Clear auto-create categories if switching away from AUTO_CREATE
              if (e.target.value !== TemplateType.AUTO_CREATE) {
                setAutoCreateCategories([]);
              }
            }}
            label="How should checklists be created from this template?"
          >
            <MenuItem value={TemplateType.MANUAL}>
              <Box>
                <Typography variant="body1" fontWeight="medium">Manual (Default)</Typography>
                <Typography variant="caption" color="text.secondary">
                  Users manually create checklists from the template library
                </Typography>
              </Box>
            </MenuItem>
            <MenuItem value={TemplateType.AUTO_CREATE}>
              <Box>
                <Typography variant="body1" fontWeight="medium">Auto-Create on Incident Type</Typography>
                <Typography variant="caption" color="text.secondary">
                  Automatically creates when event matches selected incident types
                </Typography>
              </Box>
            </MenuItem>
            <MenuItem value={TemplateType.RECURRING}>
              <Box>
                <Typography variant="body1" fontWeight="medium">Recurring (Future Feature)</Typography>
                <Typography variant="caption" color="text.secondary">
                  Creates checklists on a schedule (daily, per-shift, etc.)
                </Typography>
              </Box>
            </MenuItem>
          </Select>
          <FormHelperText>
            {templateType === TemplateType.MANUAL && 'This is the default. Users will select this template from the library when creating checklists.'}
            {templateType === TemplateType.AUTO_CREATE && 'Checklist will be automatically created when an event matches the selected incident type(s).'}
            {templateType === TemplateType.RECURRING && 'Recurring templates are not yet implemented in this POC.'}
          </FormHelperText>
        </FormControl>

            {/* Auto-Create Categories - Only shown when AUTO_CREATE is selected */}
            {templateType === TemplateType.AUTO_CREATE && (
              <FormControl fullWidth>
            <InputLabel>Incident Types for Auto-Creation</InputLabel>
            <Select
              multiple
              value={autoCreateCategories}
              onChange={(e) => setAutoCreateCategories(typeof e.target.value === 'string' ? [e.target.value] : e.target.value)}
              input={<OutlinedInput label="Incident Types for Auto-Creation" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip key={value} label={value} size="small" />
                  ))}
                </Box>
              )}
            >
              {ICS_INCIDENT_TYPES.map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>
              Select one or more incident types. When an event is assigned one of these types, a checklist will be automatically created from this template.
            </FormHelperText>
          </FormControl>
            )}
          </Stack>
        </Paper>

        {/* Items Section */}
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Checklist Items
            </Typography>
            {items.length > 0 && (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <CobraSecondaryButton
                  size="small"
                  onClick={handleExpandAll}
                >
                  Expand All
                </CobraSecondaryButton>
                <CobraSecondaryButton
                  size="small"
                  onClick={handleCollapseAll}
                >
                  Collapse All
                </CobraSecondaryButton>
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

          {/* Template Quality Warnings (non-blocking) */}
          {warnings.length > 0 && (
            <Box sx={{ mb: 2 }}>
              {warnings.map((warning, index) => (
                <Alert key={index} severity="warning" sx={{ mb: 1 }}>
                  {warning}
                </Alert>
              ))}
            </Box>
          )}

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
                  onSaveToLibrary={handleSaveToLibrary}
                />
              ))}
            </SortableContext>
          </DndContext>
          )}

          {/* Add Item Buttons */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <CobraSecondaryButton
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
            </CobraSecondaryButton>
            <CobraSecondaryButton
              size="large"
              fullWidth
              startIcon={<FontAwesomeIcon icon={faBoxArchive} />}
              onClick={() => setAddFromLibraryOpen(true)}
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
              Add from Library
            </CobraSecondaryButton>
          </Box>
        </Box>

        <Divider />

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <CobraLinkButton onClick={handleCancel} disabled={saving}>
            Cancel
          </CobraLinkButton>
          <CobraSaveButton
            startIcon={<FontAwesomeIcon icon={faSave} />}
            onClick={handleSave}
            isSaving={saving}
          >
            {isEditMode ? 'Save Changes' : 'Create Template'}
          </CobraSaveButton>
        </Box>

        {/* Add from Library Dialog */}
        <AddFromLibraryDialog
          open={addFromLibraryOpen}
          onClose={() => setAddFromLibraryOpen(false)}
          onAdd={handleAddFromLibrary}
        />

        {/* Save to Library Dialog */}
        {itemToSaveToLibrary && (
          <SaveToLibraryDialog
            open={saveToLibraryOpen}
            onClose={() => {
              setSaveToLibraryOpen(false);
              setItemToSaveToLibrary(null);
            }}
            onSaved={handleSavedToLibrary}
            itemData={itemToSaveToLibrary}
          />
        )}
      </Stack>
    </Container>
  );
};
