import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Box,
  Typography,
  Chip,
} from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import { itemLibraryService } from '../services/itemLibraryService';
import type { TemplateItemFormData } from './TemplateItemEditor';
import { ItemType } from '../types';

interface SaveToLibraryDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  /** Template item data to pre-fill the form */
  itemData: TemplateItemFormData;
}

/**
 * SaveToLibraryDialog Component
 *
 * Dialog for saving a template item to the library for reuse.
 */
export const SaveToLibraryDialog: React.FC<SaveToLibraryDialogProps> = ({
  open,
  onClose,
  onSaved,
  itemData,
}) => {
  const [itemText, setItemText] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');
  const [isRequiredByDefault, setIsRequiredByDefault] = useState(false);
  const [saving, setSaving] = useState(false);

  // Pre-fill form when dialog opens
  useEffect(() => {
    if (open) {
      setItemText(itemData.itemText);
      setCategory(''); // User must select category
      setTags('');
      setIsRequiredByDefault(itemData.isRequired);
    }
  }, [open, itemData]);

  const handleSave = async () => {
    // Validation
    if (!itemText.trim()) {
      toast.error('Item text is required');
      return;
    }
    if (!category.trim()) {
      toast.error('Category is required');
      return;
    }

    try {
      setSaving(true);

      // Parse tags
      const tagArray = tags
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);

      await itemLibraryService.createLibraryItem({
        itemText: itemText.trim(),
        itemType: itemData.itemType,
        category: category.trim(),
        statusConfiguration:
          itemData.itemType === ItemType.STATUS && itemData.statusConfiguration.length > 0
            ? JSON.stringify(itemData.statusConfiguration)
            : undefined,
        allowedPositions:
          itemData.allowedPositions.length > 0
            ? JSON.stringify(itemData.allowedPositions)
            : undefined,
        defaultNotes: itemData.defaultNotes.trim() || undefined,
        tags: tagArray.length > 0 ? tagArray : undefined,
        isRequiredByDefault,
      });

      toast.success('Item saved to library!');
      onSaved();
      handleClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save item';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setItemText('');
    setCategory('');
    setTags('');
    setIsRequiredByDefault(false);
    onClose();
  };

  // Common categories
  const commonCategories = [
    'Safety',
    'Operations',
    'Planning',
    'Logistics',
    'Finance/Admin',
    'Communications',
    'Medical',
    'Transportation',
    'Equipment',
    'Documentation',
    'Other',
  ];

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FontAwesomeIcon icon={faSave} />
          <Typography variant="h6" component="span">
            Save Item to Library
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {/* Item Text */}
          <TextField
            fullWidth
            label="Item Text"
            value={itemText}
            onChange={(e) => setItemText(e.target.value)}
            required
            multiline
            rows={2}
          />

          {/* Item Type (Read-only) */}
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              Item Type
            </Typography>
            <Chip
              label={itemData.itemType === ItemType.CHECKBOX ? 'Checkbox' : 'Status Dropdown'}
              size="small"
              color="primary"
            />
          </Box>

          {/* Category */}
          <FormControl fullWidth required>
            <InputLabel>Category</InputLabel>
            <Select
              value={category}
              label="Category"
              onChange={(e) => setCategory(e.target.value)}
            >
              {commonCategories.map((cat) => (
                <MenuItem key={cat} value={cat}>
                  {cat}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Tags */}
          <TextField
            fullWidth
            label="Tags (comma separated)"
            placeholder="safety, daily, equipment"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            helperText="Tags help with searching and filtering"
          />

          {/* Is Required by Default */}
          <FormControlLabel
            control={
              <Checkbox
                checked={isRequiredByDefault}
                onChange={(e) => setIsRequiredByDefault(e.target.checked)}
              />
            }
            label="Mark as 'Required' by default when added to templates"
          />

          {/* Info about what's included */}
          <Box sx={{ backgroundColor: '#f5f5f5', p: 2, borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              The following will also be saved from this item:
            </Typography>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {itemData.itemType === ItemType.STATUS && (
                <li>
                  <Typography variant="caption">
                    Status configuration ({itemData.statusConfiguration.length} options)
                  </Typography>
                </li>
              )}
              {itemData.allowedPositions.length > 0 && (
                <li>
                  <Typography variant="caption">
                    Allowed positions ({itemData.allowedPositions.length} positions)
                  </Typography>
                </li>
              )}
              {itemData.defaultNotes && (
                <li>
                  <Typography variant="caption">Default notes</Typography>
                </li>
              )}
              {itemData.itemType === ItemType.CHECKBOX &&
                itemData.statusConfiguration.length === 0 &&
                itemData.allowedPositions.length === 0 &&
                !itemData.defaultNotes && (
                  <li>
                    <Typography variant="caption" fontStyle="italic">
                      No additional configuration
                    </Typography>
                  </li>
                )}
            </ul>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose} variant="text" disabled={saving}>
          Cancel
        </Button>
        <Button onClick={handleSave} variant="contained" disabled={saving}>
          {saving ? 'Saving...' : 'Save to Library'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
