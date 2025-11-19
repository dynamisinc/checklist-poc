# CLAUDE.md - AI Assistant Guide

> **Last Updated:** 2025-11-19
> **Project Version:** 1.0.0-POC
> **Status:** Early Development - Backend Foundation Complete, Frontend Scaffold Ready

## Table of Contents
1. [Project Overview](#project-overview)
2. [Tech Stack & Architecture](#tech-stack--architecture)
3. [Current Implementation Status](#current-implementation-status)
4. [Development Environment](#development-environment)
5. [Code Conventions & Standards](#code-conventions--standards)
6. [Critical Design Principles](#critical-design-principles)
7. [Working with the Codebase](#working-with-the-codebase)
8. [Common Tasks & Workflows](#common-tasks--workflows)
9. [Testing Guidelines](#testing-guidelines)
10. [Troubleshooting](#troubleshooting)

---

## Project Overview

### What is This?
A **standalone proof of concept (POC)** for the COBRA Checklist Tool - enabling emergency management teams to create, manage, and collaborate on operational checklists in real-time during crisis situations.

### Target Users
- **Incident Commanders** - Lead incident response, need high-level oversight
- **Operations Section Chiefs** - Manage tactical operations
- **Safety Officers** - Track safety protocols and compliance
- **Logistics Chiefs** - Coordinate resources and supplies
- **Planning Chiefs** - Document and plan response strategies

**Critical UX Constraint:** These users access the system infrequently (during emergencies). The interface must be **self-explanatory** and **require zero training**.

### POC Goals
✅ Validate intuitive UX for infrequent users
✅ Demonstrate real-time collaboration via SignalR
✅ Prove template-to-instance workflow viability
✅ Showcase position-based access control for ICS operations
✅ Ensure audit compliance with user attribution

---

## Tech Stack & Architecture

### Backend
- **Framework:** ASP.NET Core Web API (.NET 10.0)
- **Database:** SQL Server 2019+ with Entity Framework Core 9.0
- **ORM:** EF Core with Code-First migrations
- **Real-time:** SignalR (planned)
- **API Docs:** Swagger/Swashbuckle
- **Authentication:** Mock middleware for POC (no real auth)

### Frontend
- **Framework:** React 18.2 with TypeScript 5.3
- **Build Tool:** Vite 5.0
- **UI Library:** Material-UI 6.1.7 (MUI v6)
- **Theme:** Custom C5 Design System (Cobalt Blue)
- **State Management:** React hooks + custom hooks
- **HTTP Client:** Axios
- **Real-time:** @microsoft/signalr 8.0
- **Icons:** FontAwesome 6.5 (Sharp Light)
- **Date Handling:** date-fns 3.2
- **Notifications:** react-toastify 10.0
- **Testing:** Vitest, React Testing Library

### Project Structure
```
checklist-poc/
├── src/
│   ├── backend/
│   │   └── ChecklistAPI/
│   │       ├── Controllers/        # API endpoints
│   │       ├── Hubs/              # SignalR hubs (planned)
│   │       ├── Models/
│   │       │   ├── Entities/      # EF Core entities (Template, ChecklistInstance, etc.)
│   │       │   └── DTOs/          # Data transfer objects (planned)
│   │       ├── Services/          # Business logic layer (planned)
│   │       ├── Data/
│   │       │   ├── ChecklistDbContext.cs
│   │       │   └── Migrations/
│   │       ├── Middleware/        # User context, exception handling (planned)
│   │       ├── Program.cs         # App configuration
│   │       └── appsettings.json
│   │
│   └── frontend/
│       ├── src/
│       │   ├── components/        # Reusable UI components (planned)
│       │   │   ├── common/
│       │   │   ├── templates/
│       │   │   ├── checklists/
│       │   │   └── items/
│       │   ├── pages/             # Page components (planned)
│       │   ├── hooks/             # Custom React hooks (planned)
│       │   ├── services/          # API service layer (planned)
│       │   ├── types/             # TypeScript interfaces
│       │   ├── theme/
│       │   │   └── c5Theme.ts     # C5 Design System theme
│       │   ├── utils/             # Helper functions (planned)
│       │   ├── App.tsx
│       │   └── main.tsx
│       ├── package.json
│       ├── vite.config.ts
│       └── tsconfig.json
│
├── database/
│   └── schema.sql                 # SQL Server schema with seed data
├── docs/
│   ├── UI_PATTERNS.md             # UX patterns and guidelines
│   └── USER-STORIES.md            # User stories and requirements
├── .gitignore
└── README.md
```

---

## Current Implementation Status

### ✅ Completed
- [x] Project structure and scaffolding
- [x] Backend API foundation with .NET 10
- [x] Entity Framework Core models:
  - `Template` - Checklist templates
  - `TemplateItem` - Items within templates
  - `ChecklistInstance` - Active checklists
  - `ChecklistItem` - Items in active checklists
- [x] DbContext configuration with indexes and relationships
- [x] Initial EF Core migration (`20251119203718_InitialCreate`)
- [x] SQL Server schema definition (`database/schema.sql`)
- [x] Frontend React + TypeScript + Vite setup
- [x] C5 Design System theme (full Material-UI customization)
- [x] CORS configuration for local development
- [x] Swagger API documentation setup
- [x] Comprehensive documentation (README, UI_PATTERNS, USER-STORIES, CODING_STANDARDS)
- [x] **Application Insights integration** with Azure CLI setup guide
- [x] **Mock authentication middleware** (MockUserMiddleware) for POC
- [x] **Complete DTO layer** (5 DTOs with validation)
- [x] **Template service layer** (ITemplateService interface + implementation)
- [x] **TemplatesController** with full CRUD (7 endpoints)
- [x] **Comprehensive logging** throughout all layers
- [x] **Seed data** for 3 sample templates (Safety, ICS, Logistics)

### 🚧 In Progress / Planned
- [ ] ChecklistsController and ChecklistService (instance management)
- [ ] ItemsController (item completion, status updates)
- [ ] SignalR hub for real-time collaboration
- [ ] Frontend components (cards, dialogs, forms)
- [ ] Frontend pages (Template Library, Checklist Detail, etc.)
- [ ] API service layer (axios clients)
- [ ] Custom React hooks (useChecklists, useTemplates, useChecklistHub)
- [ ] Unit and integration tests
- [ ] Additional seed data for checklist instances

---

## Development Environment

### Prerequisites
- **.NET 10 SDK** (check: `dotnet --version`)
- **Node.js 20+** (check: `node --version`)
- **SQL Server 2019+** or **LocalDB** for development
- **Git**

### Initial Setup

#### 1. Database Setup
```bash
# Using SQL Server LocalDB (Windows)
sqllocaldb create MSSQLLocalDB
sqllocaldb start MSSQLLocalDB

# Using SQL Server (any platform)
# Update connection string in src/backend/ChecklistAPI/appsettings.json
# Default: "Server=localhost;Database=ChecklistPOC;Trusted_Connection=True;"

# Apply EF Core migrations
cd src/backend/ChecklistAPI
dotnet ef database update
```

#### 2. Backend Setup
```bash
cd src/backend/ChecklistAPI

# Restore NuGet packages
dotnet restore

# Run the API
dotnet run

# API will be available at:
# - https://localhost:5001 (HTTPS)
# - http://localhost:5000 (HTTP)
# - Swagger UI: https://localhost:5001/swagger
```

#### 3. Frontend Setup
```bash
cd src/frontend

# Install npm packages
npm install

# Create .env file
cat > .env << EOF
VITE_API_URL=https://localhost:5001
VITE_HUB_URL=https://localhost:5001/hubs/checklist
VITE_ENABLE_MOCK_AUTH=true
EOF

# Run development server
npm run dev

# Frontend will be available at:
# - http://localhost:5173
```

### Useful Commands

#### Backend
```bash
# Run with hot reload
dotnet watch run

# Run tests
dotnet test

# Create new migration
dotnet ef migrations add MigrationName

# Update database
dotnet ef database update

# Rollback migration
dotnet ef database update PreviousMigrationName

# Generate SQL script
dotnet ef migrations script

# Drop database (WARNING: destructive)
dotnet ef database drop
```

#### Frontend
```bash
# Development server
npm run dev

# Type checking
npm run type-check

# Linting
npm run lint

# Formatting
npm run format

# Build for production
npm run build

# Preview production build
npm run preview

# Run tests
npm run test

# Run tests with UI
npm run test:ui

# Coverage report
npm run test:coverage
```

---

## Code Conventions & Standards

### C# Backend

#### Naming Conventions
```csharp
// Classes: PascalCase
public class TemplateService { }

// Interfaces: IPascalCase
public interface ITemplateService { }

// Public properties/methods: PascalCase
public string Name { get; set; }
public async Task<List<Template>> GetTemplatesAsync() { }

// Private fields: _camelCase
private readonly ChecklistDbContext _context;

// Parameters/locals: camelCase
public void ProcessChecklist(string checklistId, bool isActive) { }

// Constants: UPPER_SNAKE_CASE or PascalCase
private const int MAX_ITEMS_PER_CHECKLIST = 100;
```

#### File Organization
- **One class per file**
- **File name matches class name** (e.g., `TemplateService.cs`)
- **Organize using folders** (Controllers/, Services/, Models/Entities/, Models/DTOs/)

#### Async/Await
- **Always use async/await** for I/O operations
- **Suffix async methods with "Async"**
```csharp
// ✅ GOOD
public async Task<Template> GetTemplateByIdAsync(Guid id)
{
    return await _context.Templates
        .Include(t => t.Items)
        .FirstOrDefaultAsync(t => t.Id == id);
}

// ❌ BAD
public Template GetTemplateById(Guid id)
{
    return _context.Templates.Include(t => t.Items).FirstOrDefault(t => t.Id == id);
}
```

#### Error Handling
```csharp
// Use middleware for global exception handling (planned)
// Controllers should throw domain-specific exceptions
public async Task<IActionResult> GetTemplate(Guid id)
{
    var template = await _service.GetTemplateByIdAsync(id);
    if (template == null)
    {
        return NotFound(new { message = $"Template {id} not found" });
    }
    return Ok(template);
}
```

#### Entity Framework Patterns
```csharp
// Always include related entities explicitly
var checklist = await _context.ChecklistInstances
    .Include(c => c.Items)
    .AsNoTracking() // Use for read-only queries
    .FirstOrDefaultAsync(c => c.Id == id);

// Use transactions for multi-step operations
using var transaction = await _context.Database.BeginTransactionAsync();
try
{
    await _context.SaveChangesAsync();
    await transaction.CommitAsync();
}
catch
{
    await transaction.RollbackAsync();
    throw;
}
```

### TypeScript Frontend

#### Naming Conventions
```typescript
// Components: PascalCase
export const ChecklistCard: React.FC<ChecklistCardProps> = ({ ... }) => { };

// Interfaces/Types: PascalCase
export interface ChecklistDto {
  id: string;
  name: string;
}

// Variables/functions: camelCase
const handleSubmit = () => { };
const checklistItems = [];

// Constants: UPPER_SNAKE_CASE or camelCase
const MAX_RETRIES = 3;
const apiBaseUrl = import.meta.env.VITE_API_URL;

// Custom hooks: useCamelCase
export const useChecklists = () => { };

// Files: kebab-case or PascalCase (components)
// checklist-card.tsx OR ChecklistCard.tsx (prefer PascalCase for components)
```

#### Component Structure
```typescript
/**
 * ChecklistCard Component
 *
 * Displays a single checklist with progress, last updated, and actions.
 * Used in: My Checklists page, Dashboard widgets
 *
 * @param checklist - The checklist instance data
 * @param onOpen - Callback when card is clicked
 * @param onArchive - Callback for archive action
 */
export const ChecklistCard: React.FC<ChecklistCardProps> = ({
  checklist,
  onOpen,
  onArchive
}) => {
  // 1. Hooks
  const [isHovered, setIsHovered] = useState(false);

  // 2. Derived state
  const progressColor = getProgressColor(checklist.progressPercentage);

  // 3. Event handlers
  const handleClick = () => {
    onOpen(checklist.id);
  };

  // 4. Render
  return (
    <Card
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* JSX */}
    </Card>
  );
};
```

#### TypeScript Strictness
- **Enable strict mode** (already configured in tsconfig.json)
- **Avoid `any`** - use `unknown` or proper types
- **Use type inference** where obvious
```typescript
// ✅ GOOD
const checklists: ChecklistDto[] = await checklistService.getMyChecklists();
const count = checklists.length; // Inferred as number

// ❌ BAD
const checklists: any = await checklistService.getMyChecklists();
```

#### API Service Pattern
```typescript
// services/checklistService.ts
import { apiClient } from './api';
import type { ChecklistDto, CreateChecklistRequest } from '../types';

export const checklistService = {
  /**
   * Fetch all checklists for the current user's position
   */
  getMyChecklists: async (): Promise<ChecklistDto[]> => {
    const response = await apiClient.get<ChecklistDto[]>('/api/checklists/my-checklists');
    return response.data;
  },

  /**
   * Create a new checklist from a template
   */
  createFromTemplate: async (request: CreateChecklistRequest): Promise<ChecklistDto> => {
    const response = await apiClient.post<ChecklistDto>('/api/checklists', request);
    return response.data;
  },
};
```

#### Error Handling Pattern
```typescript
// hooks/useChecklists.ts
export const useChecklists = () => {
  const [checklists, setChecklists] = useState<ChecklistDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchChecklists = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await checklistService.getMyChecklists();
      setChecklists(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load checklists';
      setError(message);
      toast.error(message); // User-friendly notification
    } finally {
      setLoading(false);
    }
  };

  return { checklists, loading, error, fetchChecklists };
};
```

---

## Critical Design Principles

### 1. **Minimize Friction for Infrequent Users**
> Users may not have touched this app in 6 months. They're under stress. Every interaction must be obvious.

#### Smart Defaults
```typescript
// ✅ GOOD: Auto-populate from context
<CreateChecklistDialog
  defaultEvent={currentEvent}        // Auto-detect
  defaultPosition={currentPosition}  // Use current user's position
  defaultOpPeriod={activeOpPeriod}   // Use active operational period
/>

// ❌ BAD: Require users to fill everything
<CreateChecklistDialog
  requireAllFields={true}
  showAllOptions={true}
/>
```

#### Progressive Disclosure
```typescript
// ✅ GOOD: Hide advanced options initially
<TemplateEditor>
  <BasicFields />
  {showAdvanced && <AdvancedOptions />}
  <Button onClick={() => setShowAdvanced(true)}>
    Show Advanced Options
  </Button>
</TemplateEditor>
```

### 2. **Self-Explanatory Labels**
```typescript
// ❌ BAD: Domain jargon
<Button>New Instance</Button>
<Select label="Ops Period" />

// ✅ GOOD: Clear, action-oriented
<Button startIcon={<AddIcon />}>
  Create Checklist from Template
</Button>
<Select
  label="Operational Period (Optional)"
  helperText="Leave blank for incident-level checklist"
/>
```

### 3. **Immediate Feedback**
> Users should never wonder "did that work?"

```typescript
// ✅ GOOD: Optimistic UI + Feedback
const handleToggleComplete = async (itemId: string) => {
  // 1. Immediate visual update
  setLocalState(prev => ({ ...prev, isCompleted: !prev.isCompleted }));

  // 2. Send to server
  try {
    await checklistService.toggleComplete(itemId);
    toast.success('Item marked complete'); // Confirmation
  } catch (error) {
    // 3. Rollback on error
    setLocalState(prev => ({ ...prev, isCompleted: !prev.isCompleted }));
    toast.error('Failed to update. Please try again.');
  }
};
```

### 4. **Forgiving Design**
```typescript
// ✅ GOOD: Undo window for destructive actions
const handleArchive = (checklistId: string) => {
  archiveChecklist(checklistId);

  toast.info(
    <div>
      Checklist archived.
      <Button onClick={() => restoreChecklist(checklistId)}>Undo</Button>
    </div>,
    { autoClose: 30000 } // 30-second undo window
  );
};
```

### 5. **C5 Design System Adherence**

#### Colors
Use the C5 color palette from `c5Theme.ts`:
```typescript
import { c5Colors } from '../theme/c5Theme';

// Primary actions
color: c5Colors.cobaltBlue   // #0020C2

// Errors, delete buttons
color: c5Colors.lavaRed      // #E42217

// Selected rows
backgroundColor: c5Colors.whiteBlue  // #DBE9FA

// Success states
backgroundColor: c5Colors.successGreen
```

#### Button Standards
- **Minimum size:** 48x48 pixels (touch targets)
- **Primary:** Filled Cobalt Blue for main actions (Save, Create)
- **Secondary:** Outlined for supporting actions (Cancel, Get Location)
- **Text:** Navigation and cancel only
- **Button order:** Cancel (left) → Delete (center) → Save (right)

```typescript
// ✅ GOOD: C5 button pattern
<DialogActions>
  <Button variant="text" onClick={onCancel}>
    Cancel
  </Button>
  <Button variant="outlined" color="error" onClick={onDelete}>
    Delete
  </Button>
  <Button variant="contained" onClick={onSave}>
    Save
  </Button>
</DialogActions>
```

#### Typography
- **Font:** Roboto (all weights)
- **Headers:** Roboto Bold
- **Body:** Roboto Regular
- Already configured in `c5Theme.ts`

---

## Working with the Codebase

### Adding a New Entity

#### 1. Create Entity Model
```csharp
// src/backend/ChecklistAPI/Models/Entities/ItemNote.cs
namespace ChecklistAPI.Models.Entities;

public class ItemNote
{
    public Guid Id { get; set; }
    public Guid ChecklistItemId { get; set; }
    public string NoteText { get; set; } = string.Empty;
    public string CreatedBy { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public ChecklistItem ChecklistItem { get; set; } = null!;
}
```

#### 2. Update DbContext
```csharp
// src/backend/ChecklistAPI/Data/ChecklistDbContext.cs
public DbSet<ItemNote> ItemNotes { get; set; }

protected override void OnModelCreating(ModelBuilder modelBuilder)
{
    // ... existing configuration ...

    modelBuilder.Entity<ItemNote>(entity =>
    {
        entity.HasKey(e => e.Id);
        entity.Property(e => e.NoteText).IsRequired().HasMaxLength(2000);
        entity.HasIndex(e => e.ChecklistItemId);
    });
}
```

#### 3. Create Migration
```bash
cd src/backend/ChecklistAPI
dotnet ef migrations add AddItemNotes
dotnet ef database update
```

#### 4. Create DTO (if needed)
```csharp
// src/backend/ChecklistAPI/Models/DTOs/ItemNoteDto.cs
namespace ChecklistAPI.Models.DTOs;

public record ItemNoteDto(
    Guid Id,
    Guid ChecklistItemId,
    string NoteText,
    string CreatedBy,
    DateTime CreatedAt
);
```

### Adding a New API Endpoint

#### 1. Create/Update Controller
```csharp
// src/backend/ChecklistAPI/Controllers/ChecklistsController.cs
[ApiController]
[Route("api/[controller]")]
public class ChecklistsController : ControllerBase
{
    private readonly IChecklistService _service;

    public ChecklistsController(IChecklistService service)
    {
        _service = service;
    }

    /// <summary>
    /// Get all checklists for the current user's position
    /// </summary>
    [HttpGet("my-checklists")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<List<ChecklistDto>>> GetMyChecklists()
    {
        var checklists = await _service.GetMyChecklistsAsync();
        return Ok(checklists);
    }

    /// <summary>
    /// Create a new checklist from a template
    /// </summary>
    [HttpPost]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ChecklistDto>> CreateFromTemplate(
        [FromBody] CreateChecklistRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var checklist = await _service.CreateFromTemplateAsync(request);
        return CreatedAtAction(
            nameof(GetChecklist),
            new { id = checklist.Id },
            checklist
        );
    }
}
```

#### 2. Register Service (if new)
```csharp
// src/backend/ChecklistAPI/Program.cs
builder.Services.AddScoped<IChecklistService, ChecklistService>();
```

### Adding a New React Component

#### 1. Create Component File
```typescript
// src/frontend/src/components/checklists/ChecklistCard.tsx
import React from 'react';
import { Card, CardContent, Typography, LinearProgress } from '@mui/material';
import type { ChecklistDto } from '../../types';
import { getProgressColor } from '../../theme/c5Theme';

interface ChecklistCardProps {
  checklist: ChecklistDto;
  onOpen: (id: string) => void;
}

/**
 * ChecklistCard Component
 *
 * Displays a checklist with progress bar and metadata.
 * Clicking the card opens the checklist detail view.
 */
export const ChecklistCard: React.FC<ChecklistCardProps> = ({
  checklist,
  onOpen
}) => {
  const progressColor = getProgressColor(checklist.progressPercentage);

  return (
    <Card
      onClick={() => onOpen(checklist.id)}
      sx={{ cursor: 'pointer', '&:hover': { boxShadow: 3 } }}
    >
      <CardContent>
        <Typography variant="h6">{checklist.name}</Typography>
        <Typography variant="body2" color="text.secondary">
          {checklist.eventId}
        </Typography>
        <LinearProgress
          variant="determinate"
          value={checklist.progressPercentage}
          sx={{
            mt: 2,
            '& .MuiLinearProgress-bar': {
              backgroundColor: progressColor
            }
          }}
        />
      </CardContent>
    </Card>
  );
};
```

#### 2. Create Tests (Vitest + React Testing Library)
```typescript
// src/frontend/src/components/checklists/ChecklistCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ChecklistCard } from './ChecklistCard';

describe('ChecklistCard', () => {
  const mockChecklist = {
    id: '123',
    name: 'Test Checklist',
    eventId: 'Event-001',
    progressPercentage: 50,
  };

  it('renders checklist name and event', () => {
    render(<ChecklistCard checklist={mockChecklist} onOpen={() => {}} />);
    expect(screen.getByText('Test Checklist')).toBeInTheDocument();
    expect(screen.getByText('Event-001')).toBeInTheDocument();
  });

  it('calls onOpen when clicked', () => {
    const handleOpen = vi.fn();
    render(<ChecklistCard checklist={mockChecklist} onOpen={handleOpen} />);

    fireEvent.click(screen.getByText('Test Checklist'));
    expect(handleOpen).toHaveBeenCalledWith('123');
  });
});
```

### Adding a New Frontend Hook

```typescript
// src/frontend/src/hooks/useChecklists.ts
import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { checklistService } from '../services/checklistService';
import type { ChecklistDto } from '../types';

export const useChecklists = () => {
  const [checklists, setChecklists] = useState<ChecklistDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchChecklists = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await checklistService.getMyChecklists();
      setChecklists(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load checklists';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const createChecklist = async (templateId: string, name: string) => {
    try {
      setLoading(true);
      const newChecklist = await checklistService.createFromTemplate({
        templateId,
        name,
      });
      setChecklists(prev => [...prev, newChecklist]);
      toast.success('Checklist created');
      return newChecklist;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create checklist';
      toast.error(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChecklists();
  }, []);

  return {
    checklists,
    loading,
    error,
    fetchChecklists,
    createChecklist,
  };
};
```

---

## Common Tasks & Workflows

### 1. Reset Database
```bash
cd src/backend/ChecklistAPI

# Drop and recreate database
dotnet ef database drop --force
dotnet ef database update

# Or apply schema.sql directly
sqlcmd -S localhost -d ChecklistPOC -i ../../../database/schema.sql
```

### 2. Add Sample Data
```bash
# Create seed script in database/seed-data.sql
# Then apply:
sqlcmd -S localhost -d ChecklistPOC -i database/seed-data.sql
```

### 3. Update Frontend Type Definitions
When backend DTOs change:
```typescript
// src/frontend/src/types/index.ts
export interface ChecklistDto {
  id: string;
  name: string;
  description?: string;
  eventId: string;
  progressPercentage: number;
  createdAt: string;
  lastModifiedAt?: string;
  // Add new fields here
}
```

### 4. Implement Real-time with SignalR

#### Backend Hub
```csharp
// src/backend/ChecklistAPI/Hubs/ChecklistHub.cs
using Microsoft.AspNetCore.SignalR;

public class ChecklistHub : Hub
{
    public async Task ItemCompleted(Guid checklistId, Guid itemId, string completedBy)
    {
        await Clients.Others.SendAsync("ItemCompleted", checklistId, itemId, completedBy);
    }
}

// Register in Program.cs
app.MapHub<ChecklistHub>("/hubs/checklist");
```

#### Frontend Hook
```typescript
// src/frontend/src/hooks/useChecklistHub.ts
import { useEffect, useRef } from 'react';
import * as signalR from '@microsoft/signalr';

export const useChecklistHub = (checklistId: string) => {
  const connectionRef = useRef<signalR.HubConnection | null>(null);

  useEffect(() => {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(import.meta.env.VITE_HUB_URL)
      .withAutomaticReconnect()
      .build();

    connection.on('ItemCompleted', (itemId, completedBy) => {
      console.log(`Item ${itemId} completed by ${completedBy}`);
      // Update local state
    });

    connection.start()
      .then(() => console.log('Connected to SignalR'))
      .catch(err => console.error('SignalR error:', err));

    connectionRef.current = connection;

    return () => {
      connection.stop();
    };
  }, [checklistId]);

  return connectionRef.current;
};
```

---

## Testing Guidelines

### Backend Testing

#### Unit Tests (Services)
```csharp
// src/backend/ChecklistAPI.Tests/Services/ChecklistServiceTests.cs
using Xunit;
using Moq;
using ChecklistAPI.Services;
using ChecklistAPI.Data;

public class ChecklistServiceTests
{
    [Fact]
    public async Task GetMyChecklists_ReturnsChecklistsForPosition()
    {
        // Arrange
        var mockContext = new Mock<ChecklistDbContext>();
        var service = new ChecklistService(mockContext.Object);

        // Act
        var result = await service.GetMyChecklistsAsync();

        // Assert
        Assert.NotNull(result);
    }
}
```

#### Integration Tests
```csharp
// Use WebApplicationFactory for full integration tests
public class ChecklistsControllerIntegrationTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public ChecklistsControllerIntegrationTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task GetMyChecklists_ReturnsOkResult()
    {
        var response = await _client.GetAsync("/api/checklists/my-checklists");
        response.EnsureSuccessStatusCode();
    }
}
```

### Frontend Testing

#### Component Tests
```typescript
// Use @testing-library/react
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

describe('ChecklistCard', () => {
  it('displays progress bar with correct color', () => {
    const checklist = { progressPercentage: 75, /* ... */ };
    render(<ChecklistCard checklist={checklist} />);

    const progress = screen.getByRole('progressbar');
    expect(progress).toHaveAttribute('aria-valuenow', '75');
  });
});
```

#### Hook Tests
```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { useChecklists } from './useChecklists';

it('fetches checklists on mount', async () => {
  const { result } = renderHook(() => useChecklists());

  expect(result.current.loading).toBe(true);

  await waitFor(() => {
    expect(result.current.loading).toBe(false);
    expect(result.current.checklists).toHaveLength(3);
  });
});
```

### Test Coverage Goals
- **Unit tests:** 80%+ for services and utilities
- **Integration tests:** Key workflows (create checklist, complete items, real-time sync)
- **E2E tests (Playwright - future):** Critical paths (template to checklist, collaboration)

---

## Troubleshooting

### Backend Issues

#### "The ConnectionString property has not been initialized"
```bash
# Check appsettings.json has valid connection string
# For LocalDB:
"ConnectionStrings": {
  "DefaultConnection": "Server=(localdb)\\mssqllocaldb;Database=ChecklistPOC;Trusted_Connection=True;"
}
```

#### Migration Errors
```bash
# Reset migrations (CAUTION: data loss)
rm -rf Migrations/
dotnet ef migrations add InitialCreate
dotnet ef database update

# Check migration status
dotnet ef migrations list
```

#### CORS Errors
```csharp
// Ensure CORS is configured in Program.cs
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials(); // Required for SignalR
    });
});

app.UseCors("AllowFrontend"); // BEFORE UseAuthorization()
```

### Frontend Issues

#### TypeScript Errors
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Check types
npm run type-check
```

#### Vite Dev Server Not Starting
```bash
# Check port 5173 is not in use
lsof -i :5173
kill -9 <PID>

# Or change port in vite.config.ts
export default defineConfig({
  server: { port: 3000 }
});
```

#### API Requests Failing (CORS/Network)
- Ensure backend is running on https://localhost:5001
- Check `.env` file has correct `VITE_API_URL`
- Check browser console for CORS errors
- Verify backend CORS policy includes `http://localhost:5173`

---

## Key Files Reference

### Backend
| File | Purpose |
|------|---------|
| `Program.cs` | App configuration, DI, middleware pipeline |
| `ChecklistDbContext.cs` | EF Core DbContext with entity configurations |
| `appsettings.json` | Connection strings, logging, app settings |
| `Models/Entities/*.cs` | Database entity models |
| `Controllers/*.cs` | API endpoints |
| `Services/*.cs` | Business logic layer |

### Frontend
| File | Purpose |
|------|---------|
| `main.tsx` | App entry point |
| `App.tsx` | Root component with routing |
| `theme/c5Theme.ts` | Material-UI C5 theme configuration |
| `types/index.ts` | TypeScript type definitions |
| `services/*.ts` | API client services |
| `hooks/*.ts` | Custom React hooks |
| `vite.config.ts` | Vite build configuration |

### Documentation
| File | Purpose |
|------|---------|
| `README.md` | Project overview, quick start, architecture |
| `CLAUDE.md` | **This file** - AI assistant guide |
| `docs/UI_PATTERNS.md` | UX patterns and design guidelines |
| `docs/USER-STORIES.md` | User stories and requirements |
| `database/schema.sql` | SQL Server schema definition |

---

## Git Workflow

### Branch Strategy
- **`main`** - Production-ready code
- **`develop`** - Integration branch for features
- **`feature/*`** - Feature branches
- **`claude/*`** - AI assistant working branches

### Commit Messages
```bash
# Format: <type>(<scope>): <subject>

# Examples:
git commit -m "feat(api): add GetMyChecklists endpoint"
git commit -m "fix(ui): correct progress bar color calculation"
git commit -m "docs: update CLAUDE.md with testing guidelines"
git commit -m "refactor(db): simplify ChecklistItem indexes"
git commit -m "test(service): add unit tests for TemplateService"
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

---

## Additional Resources

### External Documentation
- [ASP.NET Core Web API](https://learn.microsoft.com/en-us/aspnet/core/web-api/)
- [Entity Framework Core](https://learn.microsoft.com/en-us/ef/core/)
- [SignalR](https://learn.microsoft.com/en-us/aspnet/core/signalr/introduction)
- [React Documentation](https://react.dev/)
- [Material-UI (MUI)](https://mui.com/material-ui/getting-started/)
- [Vite](https://vitejs.dev/)
- [TypeScript](https://www.typescriptlang.org/docs/)

### Project-Specific Docs
- `README.md` - Quick start and architecture
- `docs/UI_PATTERNS.md` - UX patterns (CRITICAL for understanding design philosophy)
- `docs/USER-STORIES.md` - User requirements and stories

---

## FAQ for AI Assistants

**Q: What's the most important thing to remember when working on this project?**
A: **The users are infrequent users under stress.** Every UI decision must prioritize clarity, simplicity, and self-documentation. Read `docs/UI_PATTERNS.md` before making any frontend changes.

**Q: Should I use real authentication?**
A: No. This is a POC. Use mock middleware to simulate user context (position, name). Real auth is out of scope.

**Q: Can I use a different UI library?**
A: No. Material-UI with the C5 theme is mandatory for COBRA consistency.

**Q: What's the difference between Template and ChecklistInstance?**
A: **Template** is a reusable blueprint (e.g., "Daily Safety Briefing"). **ChecklistInstance** is an active checklist created from a template for a specific event.

**Q: How do I handle real-time updates?**
A: Use SignalR. Backend sends events via `ChecklistHub`, frontend listens via `useChecklistHub` hook.

**Q: What database should I use?**
A: SQL Server (or LocalDB for development). Schema is in `database/schema.sql`. Use EF Core migrations for changes.

**Q: How do I add a new page?**
A: Create component in `src/frontend/src/pages/`, add route in `App.tsx`, ensure it follows C5 design system.

**Q: Where do I put business logic?**
A: Backend: In `Services/` layer. Frontend: In custom hooks (`hooks/`).

**Q: How do I test my changes?**
A: Backend: `dotnet test`. Frontend: `npm run test`. Integration: Use `WebApplicationFactory` for backend, Vitest for frontend.

---

## Change Log

| Date | Version | Changes |
|------|---------|---------|
| 2025-11-19 | 1.0.0 | Initial CLAUDE.md created. Backend foundation complete with EF Core models, DbContext, and initial migration. Frontend scaffold ready with C5 theme. |

---

**For questions or clarifications, refer to:**
- README.md for project overview
- docs/UI_PATTERNS.md for UX guidelines
- docs/USER-STORIES.md for requirements

**Happy coding! Remember: clarity, simplicity, and user-first design.** 🎯
