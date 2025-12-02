/**
 * App Component - Main Application Entry Point
 *
 * Implements C5-style navigation with:
 * - Collapsible left sidebar
 * - Auto-generated breadcrumb navigation
 * - Hierarchical routing
 *
 * Route Structure:
 * - /events - Events list (Home)
 * - /events/:eventId - Event landing page
 * - /checklists - Checklist tool landing (Dashboard, Manage, Analytics)
 * - /checklists/dashboard - My Checklists (Dashboard)
 * - /checklists/:checklistId - Checklist detail
 * - /checklists/manage - Templates & Item Library (Manage role)
 * - /checklists/manage/templates/new - Create Template
 * - /checklists/manage/templates/:id/edit - Edit Template
 * - /checklists/manage/templates/:id/preview - Preview Template
 * - /checklists/manage/templates/:id/duplicate - Duplicate Template
 * - /checklists/instances - Manage Checklists (archive/restore)
 * - /checklists/analytics - Analytics Dashboard (future)
 */

import React, { useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import { Box, Typography, Container, Stack } from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChartLine } from "@fortawesome/free-solid-svg-icons";

// Context providers - from admin module
import { FeatureFlagsProvider, SysAdminProvider } from "./admin";

// Navigation components - from core module
import { AppLayout } from "./core";

// Pages - from shared/tools modules
import { EventsListPage, EventLandingPage } from "./shared/events";
import { ChatPage } from "./tools/chat";
import { AdminPage } from "./admin/pages/AdminPage";

// Pages - checklist tool
import {
  ChecklistToolPage,
  LandingPage,
  ChecklistDetailPage,
  ManagePage,
  TemplateEditorPage,
  TemplatePreviewPage,
  ItemLibraryPage,
  ManageChecklistsPage,
} from "./tools/checklist";
import { usePermissions } from "./shared/hooks/usePermissions";

// Styles
import CobraStyles from "./theme/CobraStyles";

/**
 * Protected Route wrapper that redirects to /checklists if user lacks permission
 */
interface ProtectedRouteProps {
  children: React.ReactNode;
  requirePermission: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requirePermission }) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!requirePermission) {
      navigate('/checklists', { replace: true });
    }
  }, [requirePermission, navigate]);

  if (!requirePermission) {
    return null;
  }

  return <>{children}</>;
};

/**
 * Events List Page Wrapper
 * Shows list of all events
 */
const EventsListWrapper: React.FC = () => {
  return (
    <AppLayout>
      <EventsListPage />
    </AppLayout>
  );
};

/**
 * Event Landing Page Wrapper
 * Shows event details and tool navigation
 */
const EventLandingWrapper: React.FC = () => {
  return (
    <AppLayout>
      <EventLandingPage />
    </AppLayout>
  );
};

/**
 * Checklist Tool Page Wrapper
 * Tool-level navigation (Dashboard, Manage Templates, Manage Checklists, Analytics)
 * Accessed via breadcrumb click on "Checklist"
 */
const ChecklistToolWrapper: React.FC = () => {
  return (
    <AppLayout>
      <ChecklistToolPage />
    </AppLayout>
  );
};

/**
 * Dashboard Page Wrapper
 * Wraps LandingPage (My Checklists) with AppLayout
 */
const DashboardPage: React.FC = () => {
  return (
    <AppLayout>
      <LandingPage />
    </AppLayout>
  );
};

/**
 * Checklist Detail Page Wrapper
 * Wraps ChecklistDetailPage with AppLayout
 */
const ChecklistDetailWrapper: React.FC = () => {
  // Breadcrumbs will be set by the ChecklistDetailPage itself
  // since it needs to know the checklist name
  return <ChecklistDetailPage />;
};

/**
 * Manage Page Wrapper
 * Wraps ManagePage with AppLayout for template management
 */
const ManagePageWrapper: React.FC = () => {
  const permissions = usePermissions();

  return (
    <ProtectedRoute requirePermission={permissions.canViewTemplateLibrary}>
      <AppLayout>
        <ManagePage />
      </AppLayout>
    </ProtectedRoute>
  );
};

/**
 * Template Editor Page Wrapper
 * Wraps TemplateEditorPage with AppLayout
 */
const TemplateEditorWrapper: React.FC<{ mode: "new" | "edit" | "duplicate" }> = ({
  mode: _mode,
}) => {
  const permissions = usePermissions();

  return (
    <ProtectedRoute requirePermission={permissions.canEditTemplate}>
      <AppLayout>
        <TemplateEditorPage />
      </AppLayout>
    </ProtectedRoute>
  );
};

/**
 * Template Preview Page Wrapper
 * Wraps TemplatePreviewPage with AppLayout
 */
const TemplatePreviewWrapper: React.FC = () => {
  const permissions = usePermissions();

  return (
    <ProtectedRoute requirePermission={permissions.canViewTemplateLibrary}>
      <AppLayout>
        <TemplatePreviewPage />
      </AppLayout>
    </ProtectedRoute>
  );
};

/**
 * Item Library Page Wrapper
 * Wraps ItemLibraryPage with AppLayout
 */
const ItemLibraryWrapper: React.FC = () => {
  const permissions = usePermissions();

  return (
    <ProtectedRoute requirePermission={permissions.canAccessItemLibrary}>
      <AppLayout>
        <ItemLibraryPage />
      </AppLayout>
    </ProtectedRoute>
  );
};

/**
 * Manage Checklists Page Wrapper (Archive management)
 * Wraps ManageChecklistsPage with AppLayout
 */
const ManageChecklistsWrapper: React.FC = () => {
  const permissions = usePermissions();

  return (
    <ProtectedRoute requirePermission={permissions.canManageArchivedChecklists}>
      <AppLayout>
        <ManageChecklistsPage />
      </AppLayout>
    </ProtectedRoute>
  );
};

/**
 * Admin Page Wrapper
 * Central administration hub - only for Manage role
 */
const AdminPageWrapper: React.FC = () => {
  const permissions = usePermissions();

  return (
    <ProtectedRoute requirePermission={permissions.canViewTemplateLibrary}>
      <AppLayout>
        <AdminPage />
      </AppLayout>
    </ProtectedRoute>
  );
};

/**
 * Chat Page Wrapper
 * Event chat with external platform integration
 */
const ChatPageWrapper: React.FC = () => {
  return (
    <AppLayout>
      <ChatPage />
    </AppLayout>
  );
};

/**
 * Analytics Page (Placeholder)
 */
const AnalyticsPage: React.FC = () => {
  return (
    <AppLayout>
      <Container maxWidth="lg">
        <Stack
          spacing={3}
          padding={CobraStyles.Padding.MainWindow}
          sx={{ textAlign: "center", py: 8 }}
        >
          <FontAwesomeIcon
            icon={faChartLine}
            size="4x"
            style={{ color: "#c0c0c0" }}
          />
          <Typography variant="h4" color="text.secondary">
            Analytics Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Coming soon - Progress tracking, trends, and workload analysis
          </Typography>
        </Stack>
      </Container>
    </AppLayout>
  );
};

/**
 * Main App Component
 */
function App() {
  return (
    <BrowserRouter>
      <SysAdminProvider>
        <FeatureFlagsProvider>
          <Box sx={{ minHeight: "100vh", backgroundColor: "#F5F5F5" }}>
            <Routes>
          {/* Root - redirect to events */}
          <Route path="/" element={<Navigate to="/events" replace />} />

          {/* Events */}
          <Route path="/events" element={<EventsListWrapper />} />
          <Route path="/events/:eventId" element={<EventLandingWrapper />} />

          {/* Checklist Tool Landing (breadcrumb navigation to Dashboard, Manage, etc.) */}
          <Route path="/checklists" element={<ChecklistToolWrapper />} />

          {/* Checklist Dashboard (My Checklists) */}
          <Route path="/checklists/dashboard" element={<DashboardPage />} />

          {/* Checklist Detail - must come after /dashboard to avoid conflict */}
          <Route
            path="/checklists/:checklistId"
            element={<ChecklistDetailWrapper />}
          />

          {/* Manage Section (Templates & Item Library) */}
          <Route path="/checklists/manage" element={<ManagePageWrapper />} />

          {/* Template Management Routes */}
          <Route
            path="/checklists/manage/templates/new"
            element={<TemplateEditorWrapper mode="new" />}
          />
          <Route
            path="/checklists/manage/templates/:templateId/edit"
            element={<TemplateEditorWrapper mode="edit" />}
          />
          <Route
            path="/checklists/manage/templates/:templateId/preview"
            element={<TemplatePreviewWrapper />}
          />
          <Route
            path="/checklists/manage/templates/:templateId/duplicate"
            element={<TemplateEditorWrapper mode="duplicate" />}
          />

          {/* Manage Checklists (archive/restore/delete instances) */}
          <Route path="/checklists/instances" element={<ManageChecklistsWrapper />} />

          {/* Analytics Page */}
          <Route path="/checklists/analytics" element={<AnalyticsPage />} />

          {/* Item Library (standalone route) */}
          <Route path="/item-library" element={<ItemLibraryWrapper />} />

          {/* Admin Page (central administration hub) */}
          <Route path="/admin" element={<AdminPageWrapper />} />

          {/* Chat Page (event chat with external platform integration) */}
          <Route path="/chat" element={<ChatPageWrapper />} />

          {/* Legacy routes - redirect to new structure */}
          <Route
            path="/manage-checklists"
            element={<Navigate to="/checklists/instances" replace />}
          />
          <Route
            path="/templates"
            element={<Navigate to="/checklists/manage?tab=templates" replace />}
          />
          <Route
            path="/templates/new"
            element={<Navigate to="/checklists/manage/templates/new" replace />}
          />
          <Route
            path="/templates/:templateId/edit"
            element={
              <Navigate to="/checklists/manage/templates/:templateId/edit" replace />
            }
          />
          <Route
            path="/templates/:templateId/preview"
            element={
              <Navigate to="/checklists/manage/templates/:templateId/preview" replace />
            }
          />
          <Route
            path="/templates/:templateId/duplicate"
            element={
              <Navigate to="/checklists/manage/templates/:templateId/duplicate" replace />
            }
          />

            {/* Catch-all - redirect to events */}
            <Route path="*" element={<Navigate to="/events" replace />} />
            </Routes>
          </Box>
        </FeatureFlagsProvider>
      </SysAdminProvider>
    </BrowserRouter>
  );
}

export default App;
