# Coding Standards - Checklist POC

> **Last Updated:** 2025-12-01
> **Status:** Active - Enforced on all new code

## Table of Contents
1. [Core Principles](#core-principles)
2. [File Size Standards](#file-size-standards)
3. [Backend Standards (C# / .NET)](#backend-standards-c--net)
4. [Frontend Standards (TypeScript / React)](#frontend-standards-typescript--react)
5. [Frontend Module Structure](#frontend-module-structure)
6. [Documentation Standards](#documentation-standards)
7. [Architecture Patterns](#architecture-patterns)
8. [Testing Standards](#testing-standards)
9. [Code Review Checklist](#code-review-checklist)

---

## Core Principles

### 1. **SMALL FILES (CRITICAL)**
**No file should exceed 200-250 lines**

This is the **most important** coding standard for this project. Large files are:
- Hard to understand
- Difficult to test
- Prone to merge conflicts
- Violation of single responsibility

**Enforcement:**
- Controllers: 150-250 lines max
- Services: 200-250 lines max (implementation files)
- Service Interfaces: 100-150 lines max
- Components: 50-150 lines max
- Hooks: 50-100 lines max
- DTOs: 50-100 lines max
- Middleware: 100-150 lines max

**If a file exceeds limits:**
- ❌ **DO NOT** just add more code
- ✅ **DO** extract helper methods
- ✅ **DO** create utility classes
- ✅ **DO** split into multiple files

### 2. **SINGLE RESPONSIBILITY PRINCIPLE**
Each class, component, or function does **ONE** thing well.

**Backend Examples:**
- Controllers: Routing and validation ONLY
- Services: Business logic ONLY
- Repositories: Data access ONLY (if used)
- Middleware: Cross-cutting concern ONLY

**Frontend Examples:**
- Components: UI rendering ONLY
- Hooks: Reusable logic ONLY
- Services: API calls ONLY
- Utils: Pure functions ONLY

### 3. **SERVICE INTERFACES**
All services **must** have interfaces for testability and loose coupling.

**Required Pattern:**
```csharp
// ITemplateService.cs - Interface
public interface ITemplateService
{
    Task<List<TemplateDto>> GetAllTemplatesAsync();
    Task<TemplateDto?> GetTemplateByIdAsync(Guid id);
    // ... more methods
}

// TemplateService.cs - Implementation
public class TemplateService : ITemplateService
{
    // Implementation
}

// Program.cs - Registration
builder.Services.AddScoped<ITemplateService, TemplateService>();
```

### 4. **SEPARATION OF CONCERNS**

**Backend Layers:**
```
Controllers/        → Routing, validation, HTTP responses
Services/          → Business logic, orchestration
Data/              → DbContext, EF Core configuration
Models/Entities/   → Database entities
Models/DTOs/       → API request/response objects
Middleware/        → Cross-cutting concerns (auth, logging, exceptions)
Extensions/        → Extension methods, DI registration helpers
```

**Frontend Layers:**
```
core/             → App-wide infrastructure (services, styles, utils)
shared/           → Shared across tools (events, common hooks)
tools/            → Tool-specific modules (checklist, chat)
admin/            → Admin panel features
theme/            → Material-UI theme configuration
types/            → Shared TypeScript interfaces
```

### 5. **DRY PRINCIPLES (Don't Repeat Yourself)**
Extract repeated code into utilities, helpers, or base classes.

**Examples:**
- ✅ Centralized entity-to-DTO mapping in services
- ✅ Extension methods for common operations
- ✅ Reusable validation functions
- ✅ Shared constants in dedicated files
- ✅ Common React hooks for API patterns

### 6. **VERBOSE COMMENTS**
Every class and method needs **descriptive header comments** for new engineers.

**Required Documentation:**
- Purpose of the class/method
- Usage examples
- Design decisions explained
- Author and last modified date (on classes)
- Parameter descriptions
- Return value descriptions

---

## File Size Standards

### Actual Implementation Examples (From This Project)

| File | Lines | Status | Category |
|------|-------|--------|----------|
| UserContext.cs | 60 | ✅ Excellent | Model |
| MiddlewareExtensions.cs | 30 | ✅ Excellent | Extension |
| TemplateItemDto.cs | 70 | ✅ Excellent | DTO |
| CreateTemplateItemRequest.cs | 80 | ✅ Good | DTO |
| ITemplateService.cs | 105 | ✅ Good | Interface |
| TemplateDto.cs | 115 | ✅ Good | DTO |
| MockUserMiddleware.cs | 120 | ✅ Good | Middleware |
| TemplatesController.cs | 240 | ✅ At Limit | Controller |
| TemplateService.cs | 250 | ✅ At Limit | Service |

**Target Distribution:**
- **30-80 lines:** DTOs, Models, Extensions, Simple Utilities
- **80-150 lines:** Interfaces, Middleware, Components, Hooks
- **150-250 lines:** Controllers, Services, Complex Components

**Red Flags:**
- 🚨 Any file over 250 lines - **MUST** be refactored
- ⚠️ Files at 200-250 lines - Review for splitting opportunities
- ✅ Files under 200 lines - Ideal range

---

## Backend Standards (C# / .NET)

### Naming Conventions

```csharp
// Classes: PascalCase
public class TemplateService { }

// Interfaces: IPascalCase
public interface ITemplateService { }

// Public properties/methods: PascalCase
public string Name { get; set; }
public async Task<Template> GetTemplateAsync() { }

// Private fields: _camelCase (underscore prefix)
private readonly ChecklistDbContext _context;
private readonly ILogger<TemplateService> _logger;

// Parameters/locals: camelCase
public void ProcessTemplate(string templateId, bool isActive) { }

// Constants: UPPER_SNAKE_CASE or PascalCase
private const int MAX_ITEMS = 100;
public const string DEFAULT_CATEGORY = "General";
```

### File Organization

```
src/backend/ChecklistAPI/
├── Controllers/           # ONE controller per file
│   ├── TemplatesController.cs
│   └── ChecklistsController.cs
├── Services/             # Interface + Implementation (separate files)
│   ├── ITemplateService.cs
│   ├── TemplateService.cs
│   ├── IChecklistService.cs
│   └── ChecklistService.cs
├── Models/
│   ├── Entities/        # EF Core entities
│   │   ├── Template.cs
│   │   └── ChecklistInstance.cs
│   ├── DTOs/            # Request/Response objects
│   │   ├── TemplateDto.cs
│   │   └── CreateTemplateRequest.cs
│   └── UserContext.cs   # Shared models
├── Middleware/
│   └── MockUserMiddleware.cs
├── Extensions/
│   └── MiddlewareExtensions.cs
└── Data/
    └── ChecklistDbContext.cs
```

### Controller Pattern (Thin Controllers)

**Controllers should ONLY:**
- Route requests
- Validate input (ModelState)
- Call service methods
- Return HTTP responses

**Controllers should NEVER:**
- Contain business logic
- Access database directly
- Perform calculations
- Make decisions beyond routing

### Async/Await Pattern

**Always use async/await for I/O operations:**
- ✅ Database queries
- ✅ HTTP calls
- ✅ File I/O
- ✅ External API calls

**Naming Convention:**
- All async methods **must** end with "Async" suffix

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
    return _context.Templates
        .Include(t => t.Items)
        .FirstOrDefault(t => t.Id == id);
}
```

### DTO Pattern

**Request DTOs:** Use for POST/PUT operations
```csharp
using System.ComponentModel.DataAnnotations;

public record CreateTemplateRequest
{
    [Required(ErrorMessage = "Template name is required")]
    [MaxLength(200, ErrorMessage = "Name cannot exceed 200 characters")]
    public string Name { get; init; } = string.Empty;

    [MaxLength(1000)]
    public string Description { get; init; } = string.Empty;

    [Required(ErrorMessage = "Category is required")]
    [MaxLength(50)]
    public string Category { get; init; } = string.Empty;

    public List<CreateTemplateItemRequest> Items { get; init; } = new();
}
```

**Why DTOs?**
- ✅ Encapsulation (don't expose entities)
- ✅ API versioning (change DTOs, not entities)
- ✅ Validation at API boundary
- ✅ Cleaner API contracts

### Logging Standards

**Log at all layers:**
```csharp
// Information: Normal operations
_logger.LogInformation(
    "Created template {TemplateId} by {User}",
    template.Id,
    userContext.Email);

// Warning: Recoverable issues
_logger.LogWarning(
    "Template {TemplateId} not found",
    id);

// Error: Exceptions
_logger.LogError(
    ex,
    "Failed to create template: {ErrorMessage}",
    ex.Message);
```

**What to log:**
- ✅ All CRUD operations (with IDs and users)
- ✅ Not found scenarios
- ✅ Business rule violations
- ✅ Performance metrics (for slow operations)
- ❌ Sensitive data (passwords, tokens, PII)

### Entity Framework Patterns

**REQUIRED: Use EF Core methods, avoid raw SQL**

```csharp
// ✅ GOOD: Explicit includes, AsNoTracking for read-only
var template = await _context.Templates
    .Include(t => t.Items.OrderBy(i => i.DisplayOrder))
    .AsNoTracking()  // Read-only query optimization
    .FirstOrDefaultAsync(t => t.Id == id);

// ✅ GOOD: Use transactions for multi-step operations
using var transaction = await _context.Database.BeginTransactionAsync();
try
{
    _context.Templates.Add(template);
    await _context.SaveChangesAsync();
    await transaction.CommitAsync();
}
catch
{
    await transaction.RollbackAsync();
    throw;
}

// ❌ BAD: Lazy loading, not async
var template = _context.Templates.Find(id);
var items = template.Items; // Lazy load (N+1 problem)
```

---

## Frontend Standards (TypeScript / React)

### Naming Conventions

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

// Constants: UPPER_SNAKE_CASE
const MAX_RETRIES = 3;
const API_BASE_URL = import.meta.env.VITE_API_URL;

// Custom hooks: useCamelCase
export const useChecklists = () => { };
export const useTemplates = () => { };

// Files: PascalCase for components, camelCase for others
// ChecklistCard.tsx (component)
// useChecklists.ts (hook)
// checklistService.ts (service)
```

### Component Structure (50-150 lines)

```typescript
import React, { useState } from 'react';
import { Card, CardContent, Typography } from '@mui/material';
import type { ChecklistDto } from '../../../types';

/**
 * ChecklistCard Component
 *
 * Purpose:
 *   Displays a single checklist with progress bar and metadata.
 *   Clicking the card opens the checklist detail view.
 *
 * Used In:
 *   - My Checklists page
 *   - Dashboard widgets
 */
interface ChecklistCardProps {
  checklist: ChecklistDto;
  onOpen: (id: string) => void;
  onArchive?: (id: string) => void;
}

export const ChecklistCard: React.FC<ChecklistCardProps> = ({
  checklist,
  onOpen,
  onArchive
}) => {
  // 1. Hooks (at the top)
  const [isHovered, setIsHovered] = useState(false);

  // 2. Derived state / computations
  const progressColor = getProgressColor(checklist.progressPercentage);

  // 3. Event handlers
  const handleClick = () => {
    onOpen(checklist.id);
  };

  // 4. Render
  return (
    <Card onClick={handleClick}>
      <CardContent>
        <Typography variant="h6">{checklist.name}</Typography>
        {/* ... */}
      </CardContent>
    </Card>
  );
};
```

### Custom Hooks Pattern (50-100 lines)

```typescript
import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { checklistService } from '../services/checklistService';
import type { ChecklistDto } from '../../../types';

/**
 * useChecklists Hook
 *
 * Purpose:
 *   Manages checklist data fetching, caching, and mutations.
 *   Provides loading/error states for UI components.
 */
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
      const message = err instanceof Error
        ? err.message
        : 'Failed to load checklists';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChecklists();
  }, []);

  return { checklists, loading, error, fetchChecklists };
};
```

### API Service Pattern

```typescript
import { apiClient } from '../../../core/services/api';
import type { ChecklistDto, CreateChecklistRequest } from '../../../types';

/**
 * checklistService - API client for checklist operations
 *
 * Purpose:
 *   Encapsulates all checklist-related HTTP requests.
 *   Provides typed, promise-based interface for components/hooks.
 */
export const checklistService = {
  getMyChecklists: async (): Promise<ChecklistDto[]> => {
    const response = await apiClient.get<ChecklistDto[]>(
      '/api/checklists/my-checklists'
    );
    return response.data;
  },

  createFromTemplate: async (
    request: CreateChecklistRequest
  ): Promise<ChecklistDto> => {
    const response = await apiClient.post<ChecklistDto>(
      '/api/checklists',
      request
    );
    return response.data;
  },
};
```

### TypeScript Strictness

```typescript
// ✅ GOOD: Proper typing
const checklists: ChecklistDto[] = await checklistService.getMyChecklists();

// ✅ GOOD: Use unknown for error handling
try {
  // ...
} catch (err) {
  const message = err instanceof Error
    ? err.message
    : 'An unexpected error occurred';
}

// ❌ BAD: Avoid any
const checklists: any = await checklistService.getMyChecklists();
```

---

## Frontend Module Structure

The frontend uses a **tool-based module structure** for better organization and scalability.

### Directory Structure

```
src/frontend/src/
├── core/                    # App-wide infrastructure
│   ├── components/          # App-wide components (ErrorBoundary, ProfileMenu)
│   ├── services/            # Core services (api.ts - axios client)
│   ├── styles/              # Global CSS (animations, etc.)
│   └── utils/               # App-wide utilities (apiHealthCheck)
│
├── shared/                  # Shared across multiple tools
│   ├── events/              # Event management (shared by all tools)
│   │   ├── components/      # EventSelector, etc.
│   │   ├── contexts/        # EventContext
│   │   ├── hooks/           # useEvents
│   │   ├── pages/           # EventLandingPage, EventsListPage
│   │   ├── services/        # eventService
│   │   ├── types/           # Event types
│   │   └── utils/           # iconMapping
│   └── hooks/               # Shared hooks (usePermissions)
│
├── tools/                   # Tool-specific modules
│   ├── checklist/           # Checklist tool
│   │   ├── components/      # ChecklistCard, ItemRow, etc.
│   │   ├── contexts/        # ChecklistContext
│   │   ├── experiments/     # Experimental features
│   │   ├── hooks/           # useChecklists, useChecklistHub
│   │   ├── pages/           # ChecklistDetailPage, TemplateLibraryPage
│   │   ├── services/        # checklistService, templateService
│   │   └── types/           # Checklist-specific types
│   │
│   └── chat/                # Chat tool
│       ├── components/      # EventChat, etc.
│       └── services/        # chatService
│
├── admin/                   # Admin panel features
│   ├── contexts/            # FeatureFlagsContext, SysAdminContext
│   ├── pages/               # AdminPage
│   ├── services/            # featureFlagsService, systemSettingsService
│   └── types/               # Admin types
│
├── theme/                   # MUI theme configuration
│   ├── cobraTheme.ts        # COBRA theme (current)
│   ├── CobraStyles.ts       # Spacing/padding constants
│   └── styledComponents/    # COBRA styled components
│
└── types/                   # Shared TypeScript types
    └── index.ts             # Re-exports from tool-specific types
```

### When to Put Code Where

| Location | Use For |
|----------|---------|
| `core/` | App-wide infrastructure used everywhere (API client, error boundary, global styles) |
| `shared/` | Features shared by multiple tools (events, common hooks) |
| `tools/{toolName}/` | Tool-specific code (checklist, chat, future tools) |
| `admin/` | Admin-only features (feature flags, system settings) |
| `theme/` | MUI theme configuration and styled components |
| `types/` | Shared TypeScript types (re-exports tool types for backward compatibility) |

### Import Conventions

```typescript
// From core (absolute path from src)
import { apiClient } from '../../../core/services/api';
import { ErrorBoundary } from '../../../core/components/ErrorBoundary';

// From shared
import { useEvents } from '../../../shared/events/hooks/useEvents';
import { usePermissions } from '../../../shared/hooks/usePermissions';

// From same tool (relative path)
import { checklistService } from '../services/checklistService';
import { useChecklists } from '../hooks/useChecklists';

// From types (backward compatible re-exports)
import type { Template, ChecklistInstance } from '../../../types';
```

### Adding a New Tool

1. Create directory: `src/tools/{toolName}/`
2. Add subdirectories as needed: `components/`, `services/`, `hooks/`, `pages/`, `types/`
3. Create tool-specific types in `types/index.ts`
4. Add re-exports to root `types/index.ts` for backward compatibility
5. Add routes in `App.tsx`

---

## Documentation Standards

### Class/Component Documentation

Every class/component must have a header comment with:

```typescript
/**
 * ComponentName - Brief one-line description
 *
 * Purpose:
 *   Detailed description of what this does and why.
 *   2-3 sentences explaining the role in the system.
 *
 * Used In: (for components)
 *   - Page or parent components that use this
 *
 * Dependencies: (if notable)
 *   - External libraries or services used
 *
 * Props/Parameters:
 *   - param1: Type - Description
 *   - param2: Type - Description
 *
 * Returns: (for functions/hooks)
 *   Description of return value
 */
```

### Inline Comments

```csharp
// ✅ GOOD: Explain WHY, not WHAT
// Use AsNoTracking for read-only queries to improve performance
var templates = await _context.Templates
    .AsNoTracking()
    .ToListAsync();

// Populate audit fields from user context for FEMA compliance
template.CreatedBy = userContext.Email;

// ❌ BAD: Obvious comments
// Add template to context
_context.Templates.Add(template);
```

---

## Architecture Patterns

### Dependency Injection

**Backend Registration (Program.cs):**
```csharp
// DbContext (scoped per request)
builder.Services.AddDbContext<ChecklistDbContext>(options =>
    options.UseSqlServer(connectionString));

// Services (scoped - new instance per request)
builder.Services.AddScoped<ITemplateService, TemplateService>();
builder.Services.AddScoped<IChecklistService, ChecklistService>();

// Application Insights (singleton)
builder.Services.AddApplicationInsightsTelemetry();
```

**Service Lifetimes:**
- **Scoped:** Services, DbContext (per HTTP request)
- **Singleton:** Logging, Application Insights, Configuration
- **Transient:** Lightweight, stateless services (rarely used)

### Middleware Pipeline Order (Critical)

```csharp
// Correct order in Program.cs
app.UseRouting();
app.UseCors("AllowFrontend");        // 1. CORS first
app.UseMockUserContext();            // 2. Auth/User context
app.UseAuthorization();              // 3. Authorization (if used)
app.UseEndpoints(endpoints => { }); // 4. Endpoints last
```

**Wrong order causes:**
- ❌ CORS errors
- ❌ User context not available in controllers
- ❌ Authorization failures

---

## Testing Standards

### Unit Tests (Backend)

```csharp
using Xunit;
using Moq;

public class TemplateServiceTests
{
    [Fact]
    public async Task GetAllTemplatesAsync_ReturnsActiveTemplates()
    {
        // Arrange
        var mockContext = new Mock<ChecklistDbContext>();
        var mockLogger = new Mock<ILogger<TemplateService>>();
        var service = new TemplateService(mockContext.Object, mockLogger.Object);

        // Act
        var result = await service.GetAllTemplatesAsync();

        // Assert
        Assert.NotNull(result);
        Assert.All(result, t => Assert.True(t.IsActive));
    }
}
```

### Component Tests (Frontend)

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ChecklistCard } from './ChecklistCard';

describe('ChecklistCard', () => {
  const mockChecklist = {
    id: '123',
    name: 'Test Checklist',
    progressPercentage: 50,
  };

  it('renders checklist name', () => {
    render(<ChecklistCard checklist={mockChecklist} onOpen={() => {}} />);
    expect(screen.getByText('Test Checklist')).toBeInTheDocument();
  });

  it('calls onOpen when clicked', () => {
    const handleOpen = vi.fn();
    render(<ChecklistCard checklist={mockChecklist} onOpen={handleOpen} />);
    fireEvent.click(screen.getByText('Test Checklist'));
    expect(handleOpen).toHaveBeenCalledWith('123');
  });
});
```

### Test Coverage Goals

- **Unit Tests:** 80%+ for services and utilities
- **Integration Tests:** Key workflows (create, update, delete)
- **Component Tests:** All interactive components
- **E2E Tests:** Critical user paths (future)

---

## Code Review Checklist

### Before Submitting PR

- [ ] All files under 250 lines (check with wc -l)
- [ ] Every class/component has header documentation
- [ ] All public methods have XML/JSDoc comments
- [ ] No business logic in controllers
- [ ] All services have interfaces
- [ ] DTOs used (not entities) in API responses
- [ ] User attribution on create/update operations
- [ ] Logging at all layers (Info, Warning, Error)
- [ ] Async/await used for I/O operations
- [ ] TypeScript strict mode (no `any` types)
- [ ] Error handling with user-friendly messages
- [ ] Tests written for new functionality
- [ ] No commented-out code
- [ ] No console.log in production code
- [ ] Constants extracted (no magic numbers/strings)
- [ ] Frontend imports use correct module paths (core/, shared/, tools/)

### During Code Review

**File Size:**
- [ ] Check line count: `wc -l src/**/*.cs src/**/*.tsx`
- [ ] Flag any file over 200 lines for discussion
- [ ] Require refactor for any file over 250 lines

**Single Responsibility:**
- [ ] Each class/component does ONE thing
- [ ] Controllers only route/validate
- [ ] Services only contain business logic
- [ ] Components only render UI

**Module Structure:**
- [ ] Core infrastructure in `core/`
- [ ] Shared features in `shared/`
- [ ] Tool-specific code in `tools/{toolName}/`
- [ ] Admin features in `admin/`

---

## Summary

These coding standards ensure:
- ✅ **Maintainability** - Small, focused files easy to understand
- ✅ **Testability** - Interface-based design, dependency injection
- ✅ **Scalability** - Tool-based module structure for adding features
- ✅ **Onboarding** - Verbose comments for new engineers
- ✅ **Quality** - Consistent patterns across codebase
- ✅ **Audit Compliance** - User attribution on all operations

**Remember:**
1. **Small files** (200-250 line limit)
2. **Single responsibility**
3. **Service interfaces**
4. **Verbose comments**
5. **DRY principles**
6. **Tool-based module structure**

---

**Last Updated:** 2025-12-01
**Questions?** Refer to CLAUDE.md or FRONTEND_ARCHITECTURE.md
