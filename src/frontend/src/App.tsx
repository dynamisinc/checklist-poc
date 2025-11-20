/**
 * App Component - Main Application Entry Point
 *
 * Sets up routing and global layout for the COBRA Checklist POC.
 * Uses BrowserRouter for clean URLs (not hash routing).
 */

import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { Box, AppBar, Toolbar, Typography, Button } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClipboardList, faBook, faBoxArchive } from '@fortawesome/free-solid-svg-icons';
import { MyChecklistsPage } from './pages/MyChecklistsPage';
import { ChecklistDetailPage } from './pages/ChecklistDetailPage';
import { TemplateLibraryPage } from './pages/TemplateLibraryPage';
import { TemplateEditorPage } from './pages/TemplateEditorPage';
import { TemplatePreviewPage } from './pages/TemplatePreviewPage';
import { ItemLibraryPage } from './pages/ItemLibraryPage';
import { PositionSelector } from './components/PositionSelector';
import { c5Colors } from './theme/c5Theme';

interface AppNavBarProps {
  onPositionChange: (positions: string[]) => void;
}

/**
 * App Navigation Bar
 */
const AppNavBar: React.FC<AppNavBarProps> = ({ onPositionChange }) => {
  const location = useLocation();

  return (
    <AppBar
      position="static"
      sx={{
        backgroundColor: c5Colors.cobaltBlue,
        boxShadow: 2,
      }}
    >
      <Toolbar>
        <FontAwesomeIcon
          icon={faClipboardList}
          size="lg"
          style={{ marginRight: 16 }}
        />
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
          COBRA Checklist POC
        </Typography>

        {/* Navigation Links */}
        <Box sx={{ flexGrow: 1, ml: 4, display: 'flex', gap: 2 }}>
          <Button
            component={Link}
            to="/checklists"
            sx={{
              color: 'white',
              fontWeight: location.pathname === '/checklists' ? 'bold' : 'normal',
              textDecoration: location.pathname === '/checklists' ? 'underline' : 'none',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              },
            }}
          >
            <FontAwesomeIcon icon={faClipboardList} style={{ marginRight: 8 }} />
            My Checklists
          </Button>
          <Button
            component={Link}
            to="/templates"
            sx={{
              color: 'white',
              fontWeight: location.pathname === '/templates' ? 'bold' : 'normal',
              textDecoration: location.pathname === '/templates' ? 'underline' : 'none',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              },
            }}
          >
            <FontAwesomeIcon icon={faBook} style={{ marginRight: 8 }} />
            Template Library
          </Button>
          <Button
            component={Link}
            to="/item-library"
            sx={{
              color: 'white',
              fontWeight: location.pathname === '/item-library' ? 'bold' : 'normal',
              textDecoration: location.pathname === '/item-library' ? 'underline' : 'none',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              },
            }}
          >
            <FontAwesomeIcon icon={faBoxArchive} style={{ marginRight: 8 }} />
            Item Library
          </Button>
        </Box>

        <PositionSelector onPositionChange={onPositionChange} />
      </Toolbar>
    </AppBar>
  );
};

/**
 * Main App Component
 */
function App() {
  // State to trigger re-renders when position changes
  const [positionKey, setPositionKey] = useState(0);

  /**
   * Handle position change from PositionSelector
   * Triggers re-render of pages to fetch new data
   */
  const handlePositionChange = (positions: string[]) => {
    console.log('[App] Position changed to:', positions);
    // Increment key to force re-render of routes
    setPositionKey((prev) => prev + 1);
  };

  return (
    <BrowserRouter>
      <Box sx={{ minHeight: '100vh', backgroundColor: '#F5F5F5' }}>
        <AppNavBar onPositionChange={handlePositionChange} />

        <Routes key={positionKey}>
          {/* Default route - redirect to My Checklists */}
          <Route path="/" element={<Navigate to="/checklists" replace />} />

          {/* My Checklists page */}
          <Route path="/checklists" element={<MyChecklistsPage />} />

          {/* Checklist Detail page */}
          <Route
            path="/checklists/:checklistId"
            element={<ChecklistDetailPage />}
          />

          {/* Template Library page */}
          <Route path="/templates" element={<TemplateLibraryPage />} />

          {/* Item Library page */}
          <Route path="/item-library" element={<ItemLibraryPage />} />

          {/* Create New Template */}
          <Route path="/templates/new" element={<TemplateEditorPage />} />

          {/* Preview Template */}
          <Route path="/templates/:templateId/preview" element={<TemplatePreviewPage />} />

          {/* Duplicate Template */}
          <Route path="/templates/:templateId/duplicate" element={<TemplateEditorPage />} />

          {/* Edit Existing Template */}
          <Route path="/templates/:templateId/edit" element={<TemplateEditorPage />} />

          {/* Catch-all route - redirect to My Checklists */}
          <Route path="*" element={<Navigate to="/checklists" replace />} />
        </Routes>
      </Box>
    </BrowserRouter>
  );
}

export default App;
