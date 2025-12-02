/**
 * TemplatePickerDialog Component
 *
 * Phase 2: Smart template suggestions
 * - Position-based recommendations
 * - Event category matching (future)
 * - Recently used templates
 * - Usage statistics and popularity
 * - Template type indicators (MANUAL, AUTO_CREATE, RECURRING)
 *
 * Phase 3: Mobile optimization
 * - Bottom sheet on mobile devices
 * - Standard dialog on desktop
 * - Touch-optimized UI elements
 * - Responsive layouts
 */

import React, { useState, useEffect } from 'react';
import {
  DialogActions,
  List,
  ListItemButton,
  ListItemText,
  Typography,
  Box,
  CircularProgress,
  Chip,
  Divider,
  Collapse,
  useTheme,
  useMediaQuery,
  Stack,
} from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faChevronDown, faChevronUp, faStar, faClock } from '@fortawesome/free-solid-svg-icons';
import { cobraTheme } from '../../../theme/cobraTheme';
import { TemplateType, type Template } from '../../../types';
import { BottomSheet } from './BottomSheet';
import {
  CobraDialog,
  CobraTextField,
  CobraPrimaryButton,
  CobraLinkButton,
  CobraSecondaryButton,
} from '../../../theme/styledComponents';
import CobraStyles from '../../../theme/CobraStyles';

interface TemplatePickerDialogProps {
  open: boolean;
  onClose: () => void;
  onCreateChecklist: (templateId: string, checklistName: string) => Promise<void>;
}

/**
 * TemplatePickerDialog Component with Smart Suggestions and Responsive Design
 */
export const TemplatePickerDialog: React.FC<TemplatePickerDialogProps> = ({
  open,
  onClose,
  onCreateChecklist,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm')); // <600px

  const [suggestedTemplates, setSuggestedTemplates] = useState<Template[]>([]);
  const [allTemplates, setAllTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [checklistName, setChecklistName] = useState('');
  const [creating, setCreating] = useState(false);
  const [showAllTemplates, setShowAllTemplates] = useState(false);

  // Fetch templates when dialog opens
  useEffect(() => {
    if (open) {
      fetchTemplates();
    } else {
      // Reset state when dialog closes
      setSelectedTemplate(null);
      setChecklistName('');
      setError(null);
      setShowAllTemplates(false);
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

      // Get user position from localStorage (ProfileMenu)
      const storedProfile = localStorage.getItem('mockUserProfile');
      const profile = storedProfile ? JSON.parse(storedProfile) : null;
      const position = profile?.positions?.[0] || 'Unknown';

      // Fetch smart suggestions based on position
      const suggestionsResponse = await fetch(
        `${import.meta.env.VITE_API_URL}/api/templates/suggestions?position=${encodeURIComponent(position)}&limit=10`
      );

      if (suggestionsResponse.ok) {
        const suggestions: Template[] = await suggestionsResponse.json();
        setSuggestedTemplates(suggestions.filter(t => t.templateType === TemplateType.MANUAL));
      } else {
        console.warn('Failed to fetch suggestions, falling back to all templates');
      }

      // Fetch all templates as fallback
      const allResponse = await fetch(
        `${import.meta.env.VITE_API_URL}/api/templates?includeArchived=false`
      );

      if (!allResponse.ok) {
        throw new Error('Failed to load templates');
      }

      const allData: Template[] = await allResponse.json();
      const manualTemplates = allData.filter(
        t => t.isActive && !t.isArchived && t.templateType === TemplateType.MANUAL
      );
      setAllTemplates(manualTemplates);

      // If suggestions failed or empty, show all templates expanded
      if (suggestedTemplates.length === 0) {
        setShowAllTemplates(true);
      }
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

  /**
   * Check if template matches user's position
   */
  const matchesPosition = (template: Template): boolean => {
    if (!template.recommendedPositions) return false;

    try {
      const storedProfile = localStorage.getItem('mockUserProfile');
      const profile = storedProfile ? JSON.parse(storedProfile) : null;
      const userPosition = profile?.positions?.[0] || '';

      const positions: string[] = JSON.parse(template.recommendedPositions);
      return positions.some(p => p.toLowerCase() === userPosition.toLowerCase());
    } catch {
      return false;
    }
  };

  /**
   * Check if template was recently used (within 30 days)
   */
  const isRecentlyUsed = (template: Template): boolean => {
    if (!template.lastUsedAt) return false;

    const lastUsed = new Date(template.lastUsedAt);
    const daysAgo = (Date.now() - lastUsed.getTime()) / (1000 * 60 * 60 * 24);
    return daysAgo <= 30;
  };

  /**
   * Format relative time for last used
   */
  const formatLastUsed = (template: Template): string => {
    if (!template.lastUsedAt) return '';

    const lastUsed = new Date(template.lastUsedAt);
    const daysAgo = Math.floor((Date.now() - lastUsed.getTime()) / (1000 * 60 * 60 * 24));

    if (daysAgo === 0) return 'today';
    if (daysAgo === 1) return 'yesterday';
    if (daysAgo < 7) return `${daysAgo} days ago`;
    if (daysAgo < 30) return `${Math.floor(daysAgo / 7)} weeks ago`;
    return `${Math.floor(daysAgo / 30)} months ago`;
  };

  /**
   * Render a single template item
   */
  const renderTemplateItem = (template: Template) => {
    const positionMatch = matchesPosition(template);
    const recentlyUsed = isRecentlyUsed(template);
    const isPopular = template.usageCount >= 5;

    return (
      <ListItemButton
        key={template.id}
        selected={selectedTemplate?.id === template.id}
        onClick={() => setSelectedTemplate(template)}
        sx={{
          border: '1px solid',
          borderColor: selectedTemplate?.id === template.id ? cobraTheme.palette.buttonPrimary.main : 'divider',
          borderRadius: 1,
          mb: 1,
          backgroundColor: selectedTemplate?.id === template.id ? cobraTheme.palette.action.selected : 'transparent',
          '&:hover': {
            backgroundColor: selectedTemplate?.id === template.id ? cobraTheme.palette.action.selected : 'action.hover',
          },
        }}
      >
        <ListItemText
          primary={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                {template.name}
              </Typography>
              {selectedTemplate?.id === template.id && (
                <FontAwesomeIcon icon={faCheck} color={cobraTheme.palette.buttonPrimary.main} />
              )}
            </Box>
          }
          secondary={
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                {template.description || 'No description'}
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                {/* Position match badge */}
                {positionMatch && (
                  <Chip
                    label="Matches your position"
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: '0.7rem',
                      backgroundColor: cobraTheme.palette.success.main,
                      color: 'white',
                      fontWeight: 'bold',
                    }}
                  />
                )}

                {/* Category badge */}
                {template.category && (
                  <Chip label={template.category} size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
                )}

                {/* Item count */}
                <Chip label={`${template.items.length} items`} size="small" sx={{ height: 20, fontSize: '0.7rem' }} />

                {/* Popularity indicator */}
                {isPopular && (
                  <Chip
                    icon={<FontAwesomeIcon icon={faStar} style={{ fontSize: '0.6rem', marginLeft: 4 }} />}
                    label={`Used ${template.usageCount}x`}
                    size="small"
                    sx={{ height: 20, fontSize: '0.7rem' }}
                  />
                )}

                {/* Recently used indicator */}
                {recentlyUsed && (
                  <Chip
                    icon={<FontAwesomeIcon icon={faClock} style={{ fontSize: '0.6rem', marginLeft: 4 }} />}
                    label={`Used ${formatLastUsed(template)}`}
                    size="small"
                    sx={{ height: 20, fontSize: '0.7rem' }}
                  />
                )}

                {/* Template type badge (for non-manual) */}
                {template.templateType === TemplateType.AUTO_CREATE && (
                  <Chip
                    label="AUTO-CREATE"
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: '0.7rem',
                      backgroundColor: '#FFA500',
                      color: 'white',
                      fontWeight: 'bold',
                    }}
                  />
                )}
                {template.templateType === TemplateType.RECURRING && (
                  <Chip
                    label="RECURRING"
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: '0.7rem',
                      backgroundColor: '#9C27B0',
                      color: 'white',
                      fontWeight: 'bold',
                    }}
                  />
                )}
              </Box>
            </Box>
          }
        />
      </ListItemButton>
    );
  };

  // Separate suggested templates into categories
  const recommendedTemplates = suggestedTemplates.filter(t => matchesPosition(t));
  const recentlyUsedTemplates = suggestedTemplates.filter(t => isRecentlyUsed(t) && !matchesPosition(t));
  const otherSuggestions = suggestedTemplates.filter(t => !matchesPosition(t) && !isRecentlyUsed(t));

  /**
   * Render template list only (shared by both mobile and desktop)
   */
  const renderTemplateList = () => (
    <Box>
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
          <CobraSecondaryButton onClick={fetchTemplates} sx={{ mt: 1 }}>
            Retry
          </CobraSecondaryButton>
        </Box>
      )}

      {/* Template List */}
      {!loading && !error && (
        <>
          {/* Recommended for You Section */}
          {recommendedTemplates.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold', color: cobraTheme.palette.buttonPrimary.main }}>
                ⭐ Recommended for You ({recommendedTemplates.length})
              </Typography>
              <List sx={{ maxHeight: isMobile ? 200 : 250, overflowY: 'auto' }}>
                {recommendedTemplates.map(renderTemplateItem)}
              </List>
            </Box>
          )}

          {/* Recently Used Section */}
          {recentlyUsedTemplates.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>
                🕐 Recently Used ({recentlyUsedTemplates.length})
              </Typography>
              <List sx={{ maxHeight: isMobile ? 150 : 200, overflowY: 'auto' }}>
                {recentlyUsedTemplates.map(renderTemplateItem)}
              </List>
            </Box>
          )}

          {/* Other Suggestions Section */}
          {otherSuggestions.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>
                Other Suggestions ({otherSuggestions.length})
              </Typography>
              <List sx={{ maxHeight: isMobile ? 150 : 200, overflowY: 'auto' }}>
                {otherSuggestions.map(renderTemplateItem)}
              </List>
            </Box>
          )}

          {/* All Templates Section (Collapsible) */}
          {allTemplates.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <CobraSecondaryButton
                onClick={() => setShowAllTemplates(!showAllTemplates)}
                endIcon={<FontAwesomeIcon icon={showAllTemplates ? faChevronUp : faChevronDown} />}
                sx={{ mb: 1 }}
              >
                {showAllTemplates ? 'Hide' : 'Show'} All Templates ({allTemplates.length})
              </CobraSecondaryButton>
              <Collapse in={showAllTemplates}>
                <List sx={{ maxHeight: isMobile ? 200 : 300, overflowY: 'auto' }}>
                  {allTemplates.map(renderTemplateItem)}
                </List>
              </Collapse>
            </Box>
          )}

          {/* Empty State */}
          {allTemplates.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
              No templates available. Contact an administrator to create templates.
            </Typography>
          )}
        </>
      )}
    </Box>
  );

  /**
   * Render sticky footer with name input and actions (mobile only)
   */
  const renderStickyFooter = () => (
    <Box
      sx={{
        backgroundColor: 'background.paper',
        borderTop: '1px solid',
        borderColor: 'divider',
        pt: 2,
        pb: 2,
        px: 2,
      }}
    >
      {/* Checklist Name Input */}
      {selectedTemplate && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
            Checklist Name
          </Typography>
          <CobraTextField
            fullWidth
            value={checklistName}
            onChange={(e) => setChecklistName(e.target.value)}
            placeholder="Enter checklist name"
            autoFocus={false} // Never auto-focus on mobile
            helperText="You can customize the name or keep the template name"
            inputProps={{
              style: {
                minHeight: 48, // Touch-friendly
              },
            }}
          />
        </Box>
      )}

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
        <CobraLinkButton
          onClick={handleCancel}
          disabled={creating}
        >
          Cancel
        </CobraLinkButton>
        <CobraPrimaryButton
          onClick={handleCreate}
          disabled={!selectedTemplate || !checklistName.trim() || creating}
        >
          {creating ? <CircularProgress size={24} color="inherit" /> : 'Create Checklist'}
        </CobraPrimaryButton>
      </Box>
    </Box>
  );

  /**
   * Full content for Desktop Dialog (includes name input inline)
   */
  const renderDesktopContent = () => (
    <Box>
      {renderTemplateList()}

      {/* Checklist Name Input for Desktop */}
      {selectedTemplate && !loading && !error && (
        <>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
            Checklist Name
          </Typography>
          <CobraTextField
            fullWidth
            value={checklistName}
            onChange={(e) => setChecklistName(e.target.value)}
            placeholder="Enter checklist name"
            autoFocus={true} // Auto-focus on desktop
            helperText="You can customize the name or keep the template name"
            sx={{ mb: 1 }}
            inputProps={{
              style: {
                minHeight: 36,
              },
            }}
          />
        </>
      )}
    </Box>
  );

  /**
   * Render action buttons for Desktop Dialog
   */
  const renderDesktopActions = () => (
    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
      <CobraLinkButton
        onClick={handleCancel}
        disabled={creating}
      >
        Cancel
      </CobraLinkButton>
      <CobraPrimaryButton
        onClick={handleCreate}
        disabled={!selectedTemplate || !checklistName.trim() || creating}
      >
        {creating ? <CircularProgress size={24} color="inherit" /> : 'Create Checklist'}
      </CobraPrimaryButton>
    </Box>
  );

  // Mobile: Render as BottomSheet with scrollable content + sticky footer
  if (isMobile) {
    return (
      <>
        <BottomSheet
          open={open}
          onClose={handleCancel}
          height="auto"
          title={
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                Create Checklist from Template
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Select a template and give your checklist a name
              </Typography>
            </Box>
          }
        >
          {/* Scrollable template list */}
          <Box
            sx={{
              maxHeight: 'calc(90vh - 300px)', // Leave room for header + sticky footer
              overflowY: 'auto',
              px: 2,
            }}
          >
            {renderTemplateList()}
          </Box>

          {/* Sticky footer with name input and actions */}
          {renderStickyFooter()}
        </BottomSheet>
      </>
    );
  }

  // Desktop/Tablet: Render as Dialog
  return (
    <CobraDialog
      open={open}
      onClose={handleCancel}
      title="Create Checklist from Template"
      contentWidth="600px"
    >
      <Stack spacing={CobraStyles.Spacing.FormFields}>
        <Typography variant="body2" color="text.secondary">
          Select a template and give your checklist a name
        </Typography>

        {renderDesktopContent()}

        <DialogActions>
          {renderDesktopActions()}
        </DialogActions>
      </Stack>
    </CobraDialog>
  );
};
