# Checklist POC - UI/UX Patterns

## Overview

This document defines the UI/UX patterns for the Checklist POC with a focus on **minimizing friction for infrequent users**. Every design decision should answer: "Can someone who hasn't used this in 6 months complete their task without help?"

## 🎯 Core Principles

### 1. Self-Explanatory Interface
**Problem:** Emergency responders use COBRA sporadically during activations. They can't remember complex workflows.

**Solution:** Make every screen self-documenting through:
- Clear, action-oriented labels
- Contextual help text
- Visual hierarchy that guides the eye
- Progressive disclosure (hide complexity until needed)

#### Examples

```typescript
// ❌ BAD: Cryptic labels requiring domain knowledge
<Button>New Instance</Button>
<TextField label="Ops Period" />

// ✅ GOOD: Clear, descriptive labels
<Button startIcon={<AddIcon />}>
  Create Checklist from Template
</Button>
<TextField 
  label="Operational Period (Optional)"
  helperText="Leave blank for incident-level checklist"
/>
```

### 2. Immediate Feedback
Users should never wonder "did that work?"

**Required feedback for all actions:**
- Toast notifications (3-5 seconds)
- Visual state changes (disabled buttons, loading spinners)
- Success/error messages that explain what happened
- Optimistic UI updates (don't wait for server)

```typescript
// Example: Item completion with immediate feedback
const handleToggleComplete = async (itemId: string) => {
  // Optimistic update
  setLocalItemState(prev => ({ ...prev, isCompleted: !prev.isCompleted }));
  
  try {
    await checklistService.toggleComplete(itemId);
    toast.success('Item marked complete');
  } catch (error) {
    // Rollback on error
    setLocalItemState(prev => ({ ...prev, isCompleted: !prev.isCompleted }));
    toast.error('Failed to update. Please try again.');
  }
};
```

### 3. Smart Defaults
Reduce cognitive load by auto-detecting context.

```typescript
// ✅ GOOD: Pre-populate with current context
<CreateChecklistDialog
  defaultEvent={currentEvent}              // Auto-detect from context
  defaultPosition={currentPosition}        // Use user's active position
  defaultOpPeriod={activeOpPeriod}         // Use active ops period
/>
```

### 4. Forgiving Design
Users make mistakes. Help them recover without calling IT.

**Forgiving patterns:**
- Undo last action (30-second window)
- Confirmations only for destructive actions
- Auto-save drafts
- Clear error recovery paths

```typescript
// ✅ GOOD: Forgiving delete with undo
const handleArchive = (checklistId: string) => {
  // Optimistically archive
  archiveChecklist(checklistId);
  
  // Show undo toast
  toast.info(
    <div>
      Checklist archived. 
      <Button onClick={() => restoreChecklist(checklistId)}>
        Undo
      </Button>
    </div>,
    { autoClose: 30000 } // 30 second window
  );
};
```

### 5. Mobile-First Touch Targets
Field users work on tablets and phones. Every interactive element must be easily tappable.

**C5 Standards:**
- Minimum button size: 48x48 pixels
- Touch target spacing: 8px minimum
- Large checkboxes: 24x24 pixels
- No hover-only interactions

## 📐 Layout Patterns

### Empty States
Every empty state should guide users toward action.

```tsx
<EmptyState
  icon={<FontAwesomeIcon icon="clipboard-list" size="3x" />}
  title="No checklists yet"
  description="Create your first checklist to start tracking tasks"
  primaryAction={{
    label: "Create Checklist",
    icon: "plus",
    variant: "contained",
    onClick: handleCreate
  }}
  secondaryAction={{
    label: "Browse Templates",
    variant: "text",
    onClick: handleBrowseTemplates
  }}
/>
```

### Loading States
Never leave users guessing if something is happening.

```tsx
// ✅ GOOD: Skeleton loaders for better perceived performance
{loading ? (
  <Stack spacing={2}>
    <Skeleton variant="rectangular" height={80} />
    <Skeleton variant="rectangular" height={80} />
    <Skeleton variant="rectangular" height={80} />
  </Stack>
) : (
  <ChecklistList items={checklists} />
)}
```

### Error States
Errors should be actionable, not just informative.

```tsx
// ❌ BAD: Technical error with no recovery
<Alert severity="error">
  Error 500: Internal Server Error
</Alert>

// ✅ GOOD: User-friendly with action
<Alert 
  severity="error"
  action={
    <Button color="inherit" onClick={handleRetry}>
      Retry
    </Button>
  }
>
  Couldn't load checklists. Check your connection and try again.
</Alert>
```

## 🎨 Component Patterns

### Primary Actions (C5 Buttons)

```tsx
import { Button } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

// Primary action - Filled Cobalt Blue
<Button
  variant="contained"
  color="primary"
  size="large"
  startIcon={<FontAwesomeIcon icon="save" />}
  onClick={handleSave}
  sx={{ minWidth: 48, minHeight: 48 }}
>
  Save Checklist
</Button>

// Secondary action - Outline
<Button
  variant="outlined"
  size="large"
  startIcon={<FontAwesomeIcon icon="clone" />}
  onClick={handleClone}
  sx={{ minWidth: 48, minHeight: 48 }}
>
  Duplicate
</Button>

// Tertiary/Cancel - Text button
<Button
  variant="text"
  size="large"
  onClick={handleCancel}
  sx={{ minWidth: 48, minHeight: 48 }}
>
  Cancel
</Button>

// Delete - Special case Lava Red
<Button
  variant="contained"
  color="error"
  size="large"
  startIcon={<FontAwesomeIcon icon="trash" />}
  onClick={handleDelete}
  sx={{ minWidth: 48, minHeight: 48 }}
>
  Delete
</Button>
```

### Button Placement (C5 Standard)
```tsx
// ✅ GOOD: Consistent button order
<Stack direction="row" spacing={2} justifyContent="flex-end">
  <Button variant="text">Cancel</Button>
  {showDelete && <Button variant="contained" color="error">Delete</Button>}
  <Button variant="contained" color="primary">Save</Button>
</Stack>
```

### Progress Indicators

```tsx
import { LinearProgress, Box, Typography } from '@mui/material';
import { getProgressColor } from '../theme/c5Theme';

const ProgressBar: React.FC<{ percentage: number }> = ({ percentage }) => {
  const color = getProgressColor(percentage);
  
  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <Box sx={{ minWidth: 35 }}>
          <Typography variant="body2" color="text.secondary">
            {Math.round(percentage)}%
          </Typography>
        </Box>
      </Box>
      <LinearProgress 
        variant="determinate" 
        value={percentage}
        sx={{
          height: 8,
          borderRadius: 4,
          backgroundColor: '#DADBDD',
          '& .MuiLinearProgress-bar': {
            backgroundColor: color,
            borderRadius: 4,
          }
        }}
      />
    </Box>
  );
};
```

### Status Chips

```tsx
import { Chip } from '@mui/material';
import { getStatusChipColor } from '../theme/c5Theme';

const StatusChip: React.FC<{ status: string }> = ({ status }) => {
  const { bg, text } = getStatusChipColor(status);
  
  return (
    <Chip
      label={status}
      size="small"
      sx={{
        backgroundColor: bg,
        color: text,
        fontWeight: 500,
        height: 24,
        borderRadius: '12px',
      }}
    />
  );
};
```

### Checklist Item (Checkbox)

```tsx
import { 
  Card, 
  CardContent, 
  Checkbox, 
  Typography, 
  Stack,
  IconButton,
  Tooltip 
} from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

interface ChecklistItemProps {
  item: ChecklistItem;
  onToggle: (itemId: string) => void;
  onAddNote: (itemId: string) => void;
}

const ChecklistItemCard: React.FC<ChecklistItemProps> = ({
  item,
  onToggle,
  onAddNote
}) => {
  return (
    <Card 
      variant="outlined"
      sx={{
        mb: 1,
        '&:hover': {
          boxShadow: 2,
        }
      }}
    >
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={2}>
          {/* Large checkbox for easy tapping */}
          <Checkbox
            checked={item.isCompleted}
            onChange={() => onToggle(item.id)}
            sx={{ 
              p: 1.5, // Larger touch target
              '& .MuiSvgIcon-root': { fontSize: 28 }
            }}
          />
          
          {/* Item text */}
          <Box sx={{ flex: 1 }}>
            <Typography 
              variant="body1"
              sx={{
                textDecoration: item.isCompleted ? 'line-through' : 'none',
                color: item.isCompleted ? 'text.secondary' : 'text.primary',
              }}
            >
              {item.itemText}
              {item.isRequired && (
                <Chip 
                  label="REQUIRED" 
                  size="small" 
                  color="error" 
                  sx={{ ml: 1 }}
                />
              )}
            </Typography>
            
            {/* Completion info */}
            {item.isCompleted && (
              <Typography variant="caption" color="text.secondary">
                Completed by {item.completedBy} ({item.completedByPosition})
                <br />
                {new Date(item.completedAt!).toLocaleString()}
              </Typography>
            )}
          </Box>
          
          {/* Actions */}
          <Stack direction="row" spacing={1}>
            <Tooltip title="Add Note">
              <IconButton 
                onClick={() => onAddNote(item.id)}
                sx={{ minWidth: 48, minHeight: 48 }}
              >
                <FontAwesomeIcon icon="comment" />
              </IconButton>
            </Tooltip>
            
            {item.notes.length > 0 && (
              <Chip 
                label={item.notes.length} 
                size="small"
                icon={<FontAwesomeIcon icon="comment" />}
              />
            )}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
};
```

### Checklist Item (Status Dropdown)

```tsx
import { Select, MenuItem, FormControl, InputLabel } from '@mui/material';

const StatusDropdownItem: React.FC<ChecklistItemProps> = ({
  item,
  onStatusChange
}) => {
  return (
    <Card variant="outlined" sx={{ mb: 1 }}>
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={2}>
          {/* Status dropdown */}
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={item.currentStatus}
              label="Status"
              onChange={(e) => onStatusChange(item.id, e.target.value)}
              sx={{ minHeight: 48 }}
            >
              {item.statusOptions?.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          {/* Item text and info (similar to checkbox version) */}
          <Box sx={{ flex: 1 }}>
            <Typography variant="body1">
              {item.itemText}
            </Typography>
            {item.lastModifiedBy && (
              <Typography variant="caption" color="text.secondary">
                Changed to "{item.currentStatus}" by {item.lastModifiedBy}
                <br />
                {new Date(item.lastModifiedAt!).toLocaleString()}
              </Typography>
            )}
          </Box>
          
          {/* Status chip for visual feedback */}
          <StatusChip status={item.currentStatus || 'Not Started'} />
        </Stack>
      </CardContent>
    </Card>
  );
};
```

## 🎯 Page-Specific Patterns

### My Checklists (Dashboard)

**Goal:** Help users quickly find their active work.

```tsx
<Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
  {/* Header with clear context */}
  <Stack 
    direction="row" 
    justifyContent="space-between" 
    alignItems="center"
    sx={{ mb: 3 }}
  >
    <Box>
      <Typography variant="h4" gutterBottom>
        My Checklists
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Showing checklists for: {currentPosition} • {currentEvent}
      </Typography>
    </Box>
    
    {/* Primary action prominent */}
    <Button
      variant="contained"
      size="large"
      startIcon={<FontAwesomeIcon icon="plus" />}
      onClick={handleCreateChecklist}
    >
      Create Checklist
    </Button>
  </Stack>
  
  {/* Simple filters - visible, not hidden in menu */}
  <Paper sx={{ p: 2, mb: 3 }}>
    <Stack direction="row" spacing={2}>
      <FormControl sx={{ minWidth: 200 }}>
        <InputLabel>Event</InputLabel>
        <Select value={filterEvent} onChange={handleEventChange}>
          {events.map(e => <MenuItem value={e.id}>{e.name}</MenuItem>)}
        </Select>
      </FormControl>
      
      <FormControlLabel
        control={<Switch checked={showCompleted} />}
        label="Show Completed"
      />
    </Stack>
  </Paper>
  
  {/* Results */}
  {loading ? (
    <LoadingSkeleton />
  ) : checklists.length === 0 ? (
    <EmptyState />
  ) : (
    <Grid container spacing={2}>
      {checklists.map(checklist => (
        <Grid item xs={12} md={6} lg={4} key={checklist.id}>
          <ChecklistCard checklist={checklist} />
        </Grid>
      ))}
    </Grid>
  )}
</Container>
```

### Template Library

**Goal:** Help users quickly find the right template.

```tsx
// Visual browsing, not just a table
<Grid container spacing={2}>
  {templates.map(template => (
    <Grid item xs={12} sm={6} md={4} key={template.id}>
      <Card 
        sx={{ 
          height: '100%',
          cursor: 'pointer',
          '&:hover': { boxShadow: 4 }
        }}
        onClick={() => handleSelectTemplate(template.id)}
      >
        <CardContent>
          {/* Category chip for quick scanning */}
          <Chip 
            label={template.category} 
            size="small" 
            sx={{ mb: 2 }}
          />
          
          <Typography variant="h6" gutterBottom>
            {template.name}
          </Typography>
          
          <Typography 
            variant="body2" 
            color="text.secondary"
            sx={{ mb: 2 }}
          >
            {template.description}
          </Typography>
          
          {/* Quick stats */}
          <Stack direction="row" spacing={2}>
            <Chip
              icon={<FontAwesomeIcon icon="list" />}
              label={`${template.items.length} items`}
              size="small"
            />
            {template.tags.map(tag => (
              <Chip key={tag} label={tag} size="small" />
            ))}
          </Stack>
        </CardContent>
        
        <CardActions>
          <Button 
            size="medium"
            startIcon={<FontAwesomeIcon icon="plus" />}
          >
            Create Checklist
          </Button>
        </CardActions>
      </Card>
    </Grid>
  ))}
</Grid>
```

## 🔔 Notification Patterns

### Toast Notifications (react-toastify)

```typescript
import { toast } from 'react-toastify';

// Success (green background per C5)
toast.success('Checklist saved successfully', {
  position: 'bottom-right',
  autoClose: 3000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
});

// Error (red background per C5)
toast.error('Failed to save checklist. Please try again.', {
  autoClose: 5000, // Longer for errors
});

// Info (yellow background per C5)
toast.info('3 items changed since you last viewed this checklist', {
  autoClose: 4000,
});

// Custom toast with action
toast.info(
  ({ closeToast }) => (
    <Box>
      <Typography variant="body2">
        John Doe updated "Hurricane Prep Checklist"
      </Typography>
      <Button 
        size="small" 
        onClick={() => {
          handleViewChecklist();
          closeToast();
        }}
      >
        View
      </Button>
    </Box>
  ),
  { autoClose: 8000 }
);
```

### Badge Notifications

```tsx
// Unread changes badge
<Badge 
  badgeContent={unreadCount} 
  color="error"
  max={99}
  sx={{
    '& .MuiBadge-badge': {
      backgroundColor: '#E42217', // C5 Lava Red
      color: '#FFFFFF',
      fontWeight: 700,
    }
  }}
>
  <FontAwesomeIcon icon="clipboard-list" size="lg" />
</Badge>
```

## 📱 Mobile Patterns

### Bottom Sheet for Filters (Mobile)

```tsx
import { Drawer, useMediaQuery, useTheme } from '@mui/material';

const FilterDrawer: React.FC = ({ open, onClose, children }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  return (
    <Drawer
      anchor={isMobile ? 'bottom' : 'right'}
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          borderTopLeftRadius: isMobile ? 16 : 0,
          borderTopRightRadius: isMobile ? 16 : 0,
          maxHeight: isMobile ? '80vh' : '100vh',
        }
      }}
    >
      {children}
    </Drawer>
  );
};
```

### Swipe Actions (Mobile)

```tsx
// Use react-swipeable-list or implement custom swipe
import { SwipeableList, SwipeableListItem } from '@sandstreamdev/react-swipeable-list';

<SwipeableListItem
  swipeLeft={{
    content: <div>Archive</div>,
    action: () => handleArchive(item.id)
  }}
  swipeRight={{
    content: <div>Complete</div>,
    action: () => handleComplete(item.id)
  }}
>
  <ChecklistItem item={item} />
</SwipeableListItem>
```

## ⌨️ Keyboard Shortcuts

```typescript
// Use react-hotkeys-hook
import { useHotkeys } from 'react-hotkeys-hook';

const ChecklistDetail = () => {
  // Quick navigation
  useHotkeys('j', () => selectNextItem());
  useHotkeys('k', () => selectPreviousItem());
  
  // Actions
  useHotkeys('space', () => toggleCurrentItem());
  useHotkeys('n', () => addNote());
  useHotkeys('/', () => focusSearch());
  
  // Help dialog
  useHotkeys('?', () => setShowHelp(true));
  
  return (
    <>
      {/* Content */}
      
      {/* Keyboard shortcuts help */}
      <Dialog open={showHelp} onClose={() => setShowHelp(false)}>
        <DialogTitle>Keyboard Shortcuts</DialogTitle>
        <DialogContent>
          <Table size="small">
            <TableBody>
              <TableRow>
                <TableCell><Kbd>j</Kbd></TableCell>
                <TableCell>Next item</TableCell>
              </TableRow>
              <TableRow>
                <TableCell><Kbd>k</Kbd></TableCell>
                <TableCell>Previous item</TableCell>
              </TableRow>
              <TableRow>
                <TableCell><Kbd>Space</Kbd></TableCell>
                <TableCell>Toggle completion</TableCell>
              </TableRow>
              <TableRow>
                <TableCell><Kbd>n</Kbd></TableCell>
                <TableCell>Add note</TableCell>
              </TableRow>
              <TableRow>
                <TableCell><Kbd>/</Kbd></TableCell>
                <TableCell>Search</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </>
  );
};
```

## 🎓 Onboarding / First-Time Experience

For users who've never seen the system:

```tsx
// First visit detection
const [showTour, setShowTour] = useState(() => {
  return !localStorage.getItem('hasSeenChecklistTour');
});

// Joyride tour (react-joyride)
<Joyride
  steps={[
    {
      target: '.create-checklist-button',
      content: 'Click here to create your first checklist from a template.',
      disableBeacon: true,
    },
    {
      target: '.checklist-card',
      content: 'Your active checklists appear here. Click to open and start completing items.',
    },
    {
      target: '.filters',
      content: 'Filter checklists by event, operational period, or completion status.',
    },
  ]}
  run={showTour}
  continuous
  showSkipButton
  callback={(data) => {
    if (data.status === 'finished' || data.status === 'skipped') {
      localStorage.setItem('hasSeenChecklistTour', 'true');
      setShowTour(false);
    }
  }}
/>
```

## 📊 Testing Usability

**5-Second Test:** Can a new user understand the page purpose in 5 seconds?
**Task Completion:** Can they complete primary task without documentation?
**Error Recovery:** Can they fix mistakes without help?

---

**Remember:** If it requires explanation, it's not intuitive enough. Simplify.
