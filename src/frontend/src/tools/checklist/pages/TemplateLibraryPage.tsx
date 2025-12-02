/**
 * Template Library Page
 *
 * Displays all available checklist templates.
 * Users can browse templates and create new checklist instances from them.
 *
 * User Story 1.2: View Template Library
 * User Story 2.1: Create Checklist from Template
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  CircularProgress,
  Chip,
  Stack,
} from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faClipboardList, faEdit, faEye, faCopy, faChartLine, faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import { templateService } from '../services/templateService';
import { checklistService, type CreateFromTemplateRequest } from '../services/checklistService';
import { CreateChecklistDialog, type ChecklistCreationData } from '../components/CreateChecklistDialog';
import { AnalyticsDashboard } from '../components/AnalyticsDashboard';
import { cobraTheme } from '../../../theme/cobraTheme';
import type { Template } from '../../../types';
import {
  CobraPrimaryButton,
  CobraSecondaryButton,
  CobraNewButton,
} from '../../../theme/styledComponents';
import CobraStyles from '../../../theme/CobraStyles';

/**
 * Template Library Page Component
 */
export const TemplateLibraryPage: React.FC = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [creating, setCreating] = useState(false);

  // Analytics state
  const [showAnalytics, setShowAnalytics] = useState(false);

  // Fetch templates on mount
  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await templateService.getAllTemplates(false);
      setTemplates(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load templates';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // Handle create from template button click
  const handleCreateFromTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setDialogOpen(true);
  };

  // Handle dialog cancel
  const handleDialogCancel = () => {
    setDialogOpen(false);
    setSelectedTemplate(null);
  };

  // Handle dialog save
  const handleDialogSave = async (data: ChecklistCreationData) => {
    if (!selectedTemplate) return;

    try {
      setCreating(true);

      const request: CreateFromTemplateRequest = {
        templateId: selectedTemplate.id,
        name: data.name,
        eventId: data.eventId,
        eventName: data.eventName,
        operationalPeriodId: data.operationalPeriodId,
        operationalPeriodName: data.operationalPeriodName,
        assignedPositions: data.assignedPositions,
      };

      const newChecklist = await checklistService.createFromTemplate(request);

      toast.success(`Checklist "${newChecklist.name}" created successfully!`);

      // Close dialog
      setDialogOpen(false);
      setSelectedTemplate(null);

      // Navigate to the new checklist (optional)
      // You could use navigate(`/checklists/${newChecklist.id}`) here
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create checklist';
      toast.error(message);
      throw err; // Re-throw so dialog can show error
    } finally {
      setCreating(false);
    }
  };

  // Loading state
  if (loading && templates.length === 0) {
    return (
      <Container maxWidth={false} disableGutters>
        <Stack spacing={3} padding={CobraStyles.Padding.MainWindow} sx={{ textAlign: 'center' }}>
          <CircularProgress />
          <Typography>Loading templates...</Typography>
        </Stack>
      </Container>
    );
  }

  // Error state
  if (error && templates.length === 0) {
    return (
      <Container maxWidth={false} disableGutters>
        <Stack spacing={3} padding={CobraStyles.Padding.MainWindow}>
          <Typography color="error" variant="h6">
            Error loading templates
          </Typography>
          <Typography color="error">{error}</Typography>
          <CobraSecondaryButton onClick={fetchTemplates}>
            Retry
          </CobraSecondaryButton>
        </Stack>
      </Container>
    );
  }

  return (
    <Container maxWidth={false} disableGutters>
      <Stack spacing={3} padding={CobraStyles.Padding.MainWindow}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="h4" sx={{ mb: 1 }}>
              <FontAwesomeIcon icon={faClipboardList} style={{ marginRight: 12 }} />
              Template Library
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Select a template to create a new checklist for your event or operational period.
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <CobraSecondaryButton
              startIcon={<FontAwesomeIcon icon={faChartLine} />}
              onClick={() => setShowAnalytics(!showAnalytics)}
            >
              {showAnalytics ? 'Hide Analytics' : 'Show Analytics'}
              <FontAwesomeIcon icon={showAnalytics ? faChevronUp : faChevronDown} style={{ marginLeft: 8 }} />
            </CobraSecondaryButton>
            <CobraNewButton onClick={() => navigate('/templates/new')}>
              Create New Template
            </CobraNewButton>
          </Box>
        </Box>

        {/* Analytics Dashboard (Collapsible) */}
        {showAnalytics && (
          <Box sx={{ p: 3, backgroundColor: (theme) => theme.palette.background.default, borderRadius: 2 }}>
            <AnalyticsDashboard />
          </Box>
        )}

      {/* Templates Grid */}
      {templates.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary">
            No templates available
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Contact an administrator to create checklist templates.
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {templates.map((template) => (
            <Grid item xs={12} sm={6} md={4} key={template.id}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  '&:hover': {
                    boxShadow: 4,
                  },
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  {/* Template Name */}
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    {template.name}
                  </Typography>

                  {/* Category */}
                  {template.category && (
                    <Chip
                      label={template.category}
                      size="small"
                      sx={{
                        mb: 2,
                        backgroundColor: cobraTheme.palette.action.selected,
                        color: cobraTheme.palette.buttonPrimary.main,
                      }}
                    />
                  )}

                  {/* Description */}
                  {template.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {template.description}
                    </Typography>
                  )}

                  {/* Metadata */}
                  <Typography variant="caption" color="text.secondary">
                    {template.items?.length || 0} item{template.items?.length !== 1 ? 's' : ''}
                  </Typography>
                </CardContent>

                <CardActions sx={{ p: 2, pt: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {/* Row 1: Preview, Duplicate, Edit buttons */}
                  <Box sx={{ display: 'flex', gap: 1, width: '100%' }}>
                    <CobraSecondaryButton
                      startIcon={<FontAwesomeIcon icon={faEye} />}
                      onClick={() => navigate(`/templates/${template.id}/preview`)}
                      sx={{ flex: 1 }}
                    >
                      Preview
                    </CobraSecondaryButton>
                    <CobraSecondaryButton
                      startIcon={<FontAwesomeIcon icon={faCopy} />}
                      onClick={() => navigate(`/templates/${template.id}/duplicate`)}
                      sx={{ flex: 1 }}
                    >
                      Duplicate
                    </CobraSecondaryButton>
                    <CobraSecondaryButton
                      startIcon={<FontAwesomeIcon icon={faEdit} />}
                      onClick={() => navigate(`/templates/${template.id}/edit`)}
                      sx={{ flex: 1 }}
                    >
                      Edit
                    </CobraSecondaryButton>
                  </Box>
                  {/* Row 2: Create Checklist button */}
                  <CobraPrimaryButton
                    fullWidth
                    startIcon={<FontAwesomeIcon icon={faPlus} />}
                    onClick={() => handleCreateFromTemplate(template)}
                  >
                    Create Checklist
                  </CobraPrimaryButton>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
        )}

        {/* Create Checklist Dialog */}
        {selectedTemplate && (
          <CreateChecklistDialog
            open={dialogOpen}
            mode="from-template"
            templateId={selectedTemplate.id}
            templateName={selectedTemplate.name}
            eventId="Hurricane-Milton-2024" // TODO: Get from C5 context
            eventName="Hurricane Milton Response" // TODO: Get from C5 context
            onSave={handleDialogSave}
            onCancel={handleDialogCancel}
            saving={creating}
          />
        )}
      </Stack>
    </Container>
  );
};
