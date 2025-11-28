import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Chip,
  CircularProgress,
  Alert,
  Divider,
  List,
  ListItem,
  Stack,
} from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faEdit, faCopy, faCheckSquare, faListCheck } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import { templateService } from '../services/templateService';
import type { Template, TemplateItem, ItemType, StatusOption } from '../types';
import { cobraTheme } from '../theme/cobraTheme';
import {
  CobraLinkButton,
  CobraSecondaryButton,
  CobraPrimaryButton,
} from '../theme/styledComponents';
import CobraStyles from '../theme/CobraStyles';

/**
 * TemplatePreviewPage Component
 *
 * Read-only preview of a template showing all metadata and items.
 * Allows users to understand what they'll get before creating a checklist.
 */
export const TemplatePreviewPage: React.FC = () => {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();

  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!templateId) {
      setError('No template ID provided');
      setLoading(false);
      return;
    }

    const fetchTemplate = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await templateService.getTemplateById(templateId);
        setTemplate(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load template';
        setError(message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    };

    fetchTemplate();
  }, [templateId]);

  const parseStatusConfiguration = (statusConfiguration?: string | null): StatusOption[] => {
    if (!statusConfiguration) return [];
    try {
      const parsed = JSON.parse(statusConfiguration);
      // Handle both formats: array of strings or array of StatusOption objects
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

  const parseAllowedPositions = (allowedPositions?: string | null): string[] => {
    if (!allowedPositions) return [];
    try {
      const parsed = JSON.parse(allowedPositions);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      // Fallback: try comma-separated
      return allowedPositions.split(',').map(p => p.trim()).filter(Boolean);
    }
  };

  const getItemTypeLabel = (itemType: ItemType): string => {
    return itemType === 'checkbox' ? 'Checkbox' : 'Status Dropdown';
  };

  if (loading) {
    return (
      <Box sx={{ maxWidth: 1000, mx: 'auto' }}>
        <Stack spacing={3} padding={CobraStyles.Padding.MainWindow} sx={{ display: 'flex', justifyContent: 'center', minHeight: '60vh' }}>
          <CircularProgress />
        </Stack>
      </Box>
    );
  }

  if (error || !template) {
    return (
      <Box sx={{ maxWidth: 1000, mx: 'auto' }}>
        <Stack spacing={3} padding={CobraStyles.Padding.MainWindow}>
          <Alert severity="error">
            {error || 'Template not found'}
          </Alert>
          <CobraSecondaryButton
            startIcon={<FontAwesomeIcon icon={faArrowLeft} />}
            onClick={() => navigate('/templates')}
          >
            Back to Templates
          </CobraSecondaryButton>
        </Stack>
      </Box>
    );
  }

  const requiredItemCount = template.items?.filter(item => item.isRequired).length || 0;
  const totalItemCount = template.items?.length || 0;
  const allPositions = new Set<string>();
  template.items?.forEach(item => {
    const positions = parseAllowedPositions(item.allowedPositions);
    positions.forEach(pos => allPositions.add(pos));
  });

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto' }}>
      <Stack spacing={3} padding={CobraStyles.Padding.MainWindow}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <CobraLinkButton
            startIcon={<FontAwesomeIcon icon={faArrowLeft} />}
            onClick={() => navigate('/templates')}
          >
            Back
          </CobraLinkButton>
          <Typography variant="h4" sx={{ flexGrow: 1 }}>
            Template Preview
          </Typography>
          <CobraSecondaryButton
            startIcon={<FontAwesomeIcon icon={faCopy} />}
            onClick={() => navigate(`/templates/${templateId}/duplicate`)}
          >
            Duplicate
          </CobraSecondaryButton>
          <CobraPrimaryButton
            startIcon={<FontAwesomeIcon icon={faEdit} />}
            onClick={() => navigate(`/templates/${templateId}/edit`)}
          >
            Edit Template
          </CobraPrimaryButton>
        </Box>

        {/* Template Metadata */}
        <Paper sx={{ p: 3 }}>
        <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold' }}>
          {template.name}
        </Typography>

        {template.description && (
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            {template.description}
          </Typography>
        )}

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
          <Chip
            label={template.category}
            color="primary"
            variant="outlined"
          />
          {template.tags && template.tags.trim().length > 0 &&
            template.tags.split(',').map(tag => tag.trim()).filter(Boolean).map(tag => (
              <Chip key={tag} label={tag} size="small" />
            ))
          }
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Stats */}
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Total Items
            </Typography>
            <Typography variant="h6">
              {totalItemCount}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Required Items
            </Typography>
            <Typography variant="h6" color={requiredItemCount > 0 ? cobraTheme.palette.buttonPrimary.main : 'text.secondary'}>
              {requiredItemCount}
            </Typography>
          </Box>
          {allPositions.size > 0 && (
            <Box>
              <Typography variant="caption" color="text.secondary">
                Positions
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                {Array.from(allPositions).map(pos => (
                  <Chip key={pos} label={pos} size="small" variant="outlined" />
                ))}
              </Box>
            </Box>
          )}
        </Box>
        </Paper>

        {/* Items List */}
        <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <FontAwesomeIcon icon={faListCheck} />
          Checklist Items ({totalItemCount})
        </Typography>

        {totalItemCount === 0 ? (
          <Alert severity="info">
            This template has no items yet.
          </Alert>
        ) : (
          <List sx={{ p: 0 }}>
            {template.items?.map((item: TemplateItem, index: number) => {
              const statusOptions = parseStatusConfiguration(item.statusConfiguration);
              const positions = parseAllowedPositions(item.allowedPositions);

              return (
                <React.Fragment key={item.id}>
                  {index > 0 && <Divider />}
                  <ListItem
                    sx={{
                      py: 2,
                      px: 0,
                      alignItems: 'flex-start',
                      flexDirection: 'column',
                    }}
                  >
                    {/* Item Header */}
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', width: '100%', mb: 1 }}>
                      <Box sx={{ mr: 2, minWidth: 40 }}>
                        <Chip
                          label={`#${index + 1}`}
                          size="small"
                          sx={{ fontWeight: 'bold' }}
                        />
                      </Box>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="body1" sx={{ fontWeight: item.isRequired ? 'bold' : 'normal' }}>
                          {item.itemText}
                          {item.isRequired && (
                            <Chip
                              label="Required"
                              size="small"
                              color="primary"
                              sx={{ ml: 1 }}
                            />
                          )}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Item Details */}
                    <Box sx={{ pl: 7, width: '100%' }}>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                        <Chip
                          icon={<FontAwesomeIcon icon={item.itemType === 'checkbox' ? faCheckSquare : faListCheck} />}
                          label={getItemTypeLabel(item.itemType)}
                          size="small"
                          variant="outlined"
                        />
                        {positions.length > 0 && (
                          <Chip
                            label={`Positions: ${positions.join(', ')}`}
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </Box>

                      {/* Status Configuration */}
                      {item.itemType === 'status' && statusOptions.length > 0 && (
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                            Status Options:
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                            {statusOptions.map(option => (
                              <Chip
                                key={option.label}
                                label={option.label}
                                size="small"
                                color={option.isCompletion ? 'success' : 'default'}
                                variant={option.isCompletion ? 'filled' : 'outlined'}
                              />
                            ))}
                          </Box>
                        </Box>
                      )}

                      {/* Default Notes */}
                      {item.defaultNotes && (
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                            Default Notes:
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                            {item.defaultNotes}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </ListItem>
                </React.Fragment>
              );
            })}
          </List>
        )}
        </Paper>
      </Stack>
    </Box>
  );
};
