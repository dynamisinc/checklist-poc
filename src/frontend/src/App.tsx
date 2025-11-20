/**
 * App Component - Main Application Entry Point
 *
 * Sets up routing and global layout for the COBRA Checklist POC.
 * Uses BrowserRouter for clean URLs (not hash routing).
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Box, AppBar, Toolbar, Typography } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClipboardList } from '@fortawesome/free-solid-svg-icons';
import { MyChecklistsPage } from './pages/MyChecklistsPage';
import { ChecklistDetailPage } from './pages/ChecklistDetailPage';
import { c5Colors } from './theme/c5Theme';

/**
 * App Navigation Bar
 */
const AppNavBar: React.FC = () => {
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
        <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
          COBRA Checklist POC
        </Typography>
        <Typography variant="body2" sx={{ mr: 2 }}>
          Safety Officer
        </Typography>
      </Toolbar>
    </AppBar>
  );
};

/**
 * Main App Component
 */
function App() {
  return (
    <BrowserRouter>
      <Box sx={{ minHeight: '100vh', backgroundColor: '#F5F5F5' }}>
        <AppNavBar />

        <Routes>
          {/* Default route - redirect to My Checklists */}
          <Route path="/" element={<Navigate to="/checklists" replace />} />

          {/* My Checklists page */}
          <Route path="/checklists" element={<MyChecklistsPage />} />

          {/* Checklist Detail page */}
          <Route
            path="/checklists/:checklistId"
            element={<ChecklistDetailPage />}
          />

          {/* Catch-all route - redirect to My Checklists */}
          <Route path="*" element={<Navigate to="/checklists" replace />} />
        </Routes>
      </Box>
    </BrowserRouter>
  );
}

export default App;
