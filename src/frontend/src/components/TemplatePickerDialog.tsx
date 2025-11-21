/**
 * TemplatePickerDialog Component
 *
 * Phase 1: Basic template selection dialog
 * - Shows list of active templates
 * - Allows user to select one and create checklist
 *
 * Phase 2 (Future): Smart suggestions
 * - Position-based recommendations
 * - Event category matching
 * - Recently used templates
 * - Usage statistics
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  List,
  ListItemButton,
  ListItemText,
  Typography,
  Box,
  CircularProgress,
  Chip,
  Divider,
} from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck } from '@fortawesome/free-solid-svg-icons';
import { c5Colors } from '../theme/c5Theme';
import type { Template } from '../types';

interface TemplatePickerDialogProps {
  open: boolean;
  onClose: () => void;
  onCreateChecklist: (templateId: string, checklistName: string) => Promise<void>;
}

/**
 * TemplatePickerDialog Component
 */
export const TemplatePickerDialog: React.FC<TemplatePickerDialogProps> = ({
  open,
  onClose,
  onCreateChecklist,
}) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [checklistName, setChecklistName] = useState('');
  const [creating, setCreating] = useState(false);

  // Fetch templates when dialog opens
  useEffect(() => {
    if (open) {
      fetchTemplates();
    } else {
      // Reset state when dialog closes
      setSelectedTemplate(null);
      setChecklistName('');
      setError(null);
    }
  }, [open]);

  // Auto-populate checklist name when template is selected
  useEffect(() => {
    if (selectedTemplate && !checklistName) {
      setChecklistName(selectedTemplate.name);
    }
  }, [selectedTemplate]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch active templates from API
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/templates?includeArchived=false`);
      if (!response.ok) {
        throw new Error('Failed to load templates');
      }

      const data: Template[] = await response.json();

      // Filter to only active templates
      const activeTemplates = data.filter(t => t.isActive && !t.isArchived);

      setTemplates(activeTemplates);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load templates';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!selectedTemplate || !checklistName.trim()) {
      return;
    }

    try {
      setCreating(true);
      await onCreateChecklist(selectedTemplate.id, checklistName.trim());
      onClose();
    } catch (err) {
      // Error handling is done in parent component
      console.error('Failed to create checklist:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleCancel = () => {
    if (!creating) {
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          minHeight: 500,
        },
      }}
    >
      <DialogTitle>
        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
          Create Checklist from Template
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Select a template and give your checklist a name
        </Typography>
      </DialogTitle>

      <DialogContent dividers>
        {/* Loading State */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {/* Error State */}
        {error && (
          <Box sx={{ py: 2 }}>
            <Typography color="error" variant="body2">
              {error}
            </Typography>
            <Button onClick={fetchTemplates} sx={{ mt: 1 }}>
              Retry
            </Button>
          </Box>
        )}

        {/* Template List */}
        {!loading && !error && (
          <>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
              Available Templates ({templates.length})
            </Typography>

            {templates.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                No templates available. Contact an administrator to create templates.
              </Typography>
            ) : (
              <List sx={{ maxHeight: 300, overflowY: 'auto', mb: 2 }}>
                {templates.map((template) => (
                  <ListItemButton
                    key={template.id}
                    selected={selectedTemplate?.id === template.id}
                    onClick={() => setSelectedTemplate(template)}
                    sx={{
                      border: '1px solid',
                      borderColor: selectedTemplate?.id === template.id ? c5Colors.cobaltBlue : 'divider',
                      borderRadius: 1,
                      mb: 1,
                      backgroundColor: selectedTemplate?.id === template.id ? c5Colors.whiteBlue : 'transparent',
                      '&:hover': {
                        backgroundColor: selectedTemplate?.id === template.id ? c5Colors.whiteBlue : 'action.hover',
                      },
                    }}
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                            {template.name}
                          </Typography>
                          {selectedTemplate?.id === template.id && (
                            <FontAwesomeIcon icon={faCheck} color={c5Colors.cobaltBlue} />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                            {template.description || 'No description'}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                            {template.category && (
                              <Chip label={template.category} size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
                            )}
                            <Chip label={`${template.items.length} items`} size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
                          </Box>
                        </Box>
                      }
                    />
                  </ListItemButton>
                ))}
              </List>
            )}

            {/* Checklist Name Input */}
            {selectedTemplate && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                  Checklist Name
                </Typography>
                <TextField
                  fullWidth
                  value={checklistName}
                  onChange={(e) => setChecklistName(e.target.value)}
                  placeholder="Enter checklist name"
                  autoFocus
                  helperText="You can customize the name or keep the template name"
                  sx={{ mb: 1 }}
                />
              </>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleCancel} disabled={creating}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleCreate}
          disabled={!selectedTemplate || !checklistName.trim() || creating}
          sx={{
            backgroundColor: c5Colors.cobaltBlue,
            minHeight: 48,
            minWidth: 120,
            fontWeight: 'bold',
            '&:hover': {
              backgroundColor: c5Colors.cobaltBlue,
              opacity: 0.9,
            },
          }}
        >
          {creating ? <CircularProgress size={24} color="inherit" /> : 'Create Checklist'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
