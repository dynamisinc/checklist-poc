<<<<<<< HEAD
# Coding Standards & Conventions

> Comprehensive guide for maintaining consistent, high-quality code across the C5 Seeder project.

## Table of Contents
1. [General Principles](#general-principles)
2. [TypeScript/React Standards](#typescriptreact-standards)
3. [C# Standards](#c-standards)
4. [Database Standards](#database-standards)
5. [API Design](#api-design)
6. [Security Guidelines](#security-guidelines)
7. [Testing Standards](#testing-standards)
8. [Documentation Requirements](#documentation-requirements)

---

## General Principles

### Code Quality Fundamentals

**1. Readability First**
- Code is read 10x more than it's written
- Self-documenting code > excessive comments
- Clear variable/function names > clever code
- Simple solutions > complex optimizations (unless proven necessary)

**2. Separation of Concerns**
- Frontend: UI components separate from business logic
- Backend: HTTP handlers separate from service layer
- Services separate from data access
- Each layer has clear responsibilities
- Separate project to hold models and datacontext, referenced by service layer

**3. DRY (Don't Repeat Yourself)**
- Extract repeated logic into functions/utilities
- Create reusable components
- Use shared types/interfaces
- Avoid copy-paste programming

**4. YAGNI (You Aren't Gonna Need It)**
- Build what's needed now, not what might be needed
- Avoid premature abstraction
- Refactor when patterns emerge, not before

**5. Function/Method Size**
- Target: < 50 lines
- If longer, consider breaking into smaller functions
- Each function should do one thing well
- Use descriptive names that explain what the function does

---

## TypeScript/React Standards

### File Organization

```
src/
├── components/
│   ├── common/           # Shared UI components
│   ├── servers/          # Server-specific components
│   └── [feature]/        # Feature-specific components
├── pages/                # Top-level page components
├── services/             # API client services
├── models/               # TypeScript interfaces/types
├── contexts/             # React contexts
├── hooks/                # Custom hooks
├── utils/                # Utility functions
└── constants/            # Application constants
```

### Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Components | PascalCase | `ServerList.tsx` |
| Component Files | Match component name | `ServerList.tsx` |
| Functions/Variables | camelCase | `getUserById` |
| Custom Hooks | camelCase with `use` prefix | `useAuth.ts` |
| Services | camelCase with Service suffix | `serverService.ts` |
| Interfaces | PascalCase, no `I` prefix | `Server`, not `IServer` |
| Types | PascalCase | `ServerType` |
| Enums | PascalCase | `ExecutionStatus` |
| Constants | UPPER_SNAKE_CASE | `API_BASE_URL` |

### Component Structure

```typescript
/**
 * ServerList Component
 * 
 * Displays a paginated list of COBRA servers with filtering and actions.
 * 
 * Features:
 * - Real-time search/filter by name or environment
 * - Pagination with configurable page size
 * - Edit/Delete actions with confirmation dialogs
 * - Loading and error states
 * - Responsive layout (mobile/desktop)
 * 
 * @component
 * @example
 * <ServerList onEdit={handleEdit} onDelete={handleDelete} />
 */

import React, { useState, useEffect } from 'react';
import { Box, Button, CircularProgress } from '@mui/material';
import { Server } from '../models/Server';
import { serverService } from '../services/serverService';

interface ServerListProps {
  /** Callback when edit button is clicked */
  onEdit: (serverId: number) => void;
  /** Callback when delete is confirmed */
  onDelete: (serverId: number) => void;
  /** Optional filter for environment type */
  environmentFilter?: string;
}

export const ServerList: React.FC<ServerListProps> = ({ 
  onEdit, 
  onDelete,
  environmentFilter 
}) => {
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadServers();
  }, [environmentFilter]);

  const loadServers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await serverService.getServers(environmentFilter);
      setServers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load servers');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <CircularProgress />;
  if (error) return <Box color="error.main">{error}</Box>;

  return (
    <Box>
      {/* Component JSX */}
    </Box>
  );
};
```

### TypeScript Best Practices

**1. Type Safety**
```typescript
// ✅ Good - Explicit types
interface User {
  id: number;
  username: string;
  email: string;
}

function getUser(id: number): Promise<User> {
  // Implementation
}

// ❌ Bad - Using 'any'
function getUser(id: any): any {
  // Implementation
}
```

**2. Prefer Interfaces for Objects**
```typescript
// ✅ Good
interface ServerDto {
  id: number;
  name: string;
  baseUrl: string;
}

// Use type for unions, primitives, or utilities
type Status = 'pending' | 'success' | 'failed';
type Nullable<T> = T | null;
```

**3. Props with Default Values**
```typescript
interface ComponentProps {
  required: string;
  optional?: number;
}

const Component: React.FC<ComponentProps> = ({ 
  required, 
  optional = 10  // Default value
}) => {
  // Implementation
};
```

**4. Async/Await Error Handling**
```typescript
// ✅ Good
const loadData = async () => {
  try {
    setLoading(true);
    const data = await api.getData();
    setData(data);
  } catch (error) {
    console.error('Failed to load data:', error);
    setError(error instanceof Error ? error.message : 'Unknown error');
  } finally {
    setLoading(false);
  }
};

// ❌ Bad - No error handling
const loadData = async () => {
  const data = await api.getData();
  setData(data);
};
```

### React Patterns

**1. State Management**
```typescript
// Local state - use useState
const [count, setCount] = useState(0);

// Shared state - use Context
const { user } = useAuth();

// Server state - consider React Query (future)
const { data, isLoading, error } = useQuery('servers', fetchServers);
```

**2. Custom Hooks**
```typescript
/**
 * useServers Hook
 * 
 * Manages server data fetching, caching, and mutations.
 * 
 * @returns Server data, loading state, and CRUD operations
 */
function useServers() {
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(false);

  const loadServers = async () => {
    // Implementation
  };

  const createServer = async (dto: CreateServerDto) => {
    // Implementation
  };

  return { servers, loading, loadServers, createServer };
}
```

**3. Effect Cleanup**
```typescript
useEffect(() => {
  let mounted = true;

  const loadData = async () => {
    const data = await api.getData();
    if (mounted) {
      setData(data);
    }
  };

  loadData();

  return () => {
    mounted = false; // Cleanup
  };
}, []);
```

### Material UI Styling

**1. Use sx Prop**
```typescript
// ✅ Good
<Box 
  sx={{ 
    p: 2, 
    bgcolor: 'background.paper',
    borderRadius: 1 
  }}
>
  Content
</Box>

// ❌ Bad - Inline styles
<div style={{ padding: '16px', backgroundColor: '#fff' }}>
  Content
</div>
```

**2. Leverage Theme**
```typescript
import { useTheme } from '@mui/material';

const Component = () => {
  const theme = useTheme();
  
  return (
    <Box sx={{ 
      color: theme.palette.primary.main,
      [theme.breakpoints.down('sm')]: {
        fontSize: '0.875rem'
      }
    }}>
      Content
    </Box>
  );
};
```

---

## C# Standards

### File Organization

```
src/
├── Functions/              # HTTP-triggered functions
├── Services/               # Business logic
│   ├── Interfaces/        # Service interfaces
│   └── Implementations/   # Service implementations
├── Models/
│   ├── DTOs/              # API contracts
│   ├── Entities/          # Database entities
│   └── Requests/          # Request models
├── Data/                   # EF Core
│   ├── AppDbContext.cs
│   ├── Configurations/    # Entity configurations
│   └── Migrations/
└── Utilities/              # Helpers
```

### Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Classes | PascalCase | `ServerService` |
| Interfaces | `I` prefix + PascalCase | `IServerService` |
| Methods | PascalCase | `GetServerByIdAsync` |
| Parameters | camelCase | `serverId` |
| Local Variables | camelCase | `serverDto` |
| Private Fields | `_` prefix + camelCase | `_logger` |
| Constants | PascalCase | `MaxPageSize` |
| Async Methods | `Async` suffix | `CreateServerAsync` |

### Class Structure

```csharp
/// <summary>
/// Service for managing COBRA server configurations.
/// Handles CRUD operations, validation, and business rules.
/// </summary>
public class ServerService : IServerService
{
    private readonly AppDbContext _context;
    private readonly ILogger<ServerService> _logger;
    private readonly IValidator<CreateServerDto> _createValidator;

    /// <summary>
    /// Initializes a new instance of the ServerService class.
    /// </summary>
    /// <param name="context">Database context</param>
    /// <param name="logger">Logger instance</param>
    /// <param name="createValidator">Validator for create operations</param>
    public ServerService(
        AppDbContext context,
        ILogger<ServerService> logger,
        IValidator<CreateServerDto> createValidator)
    {
        _context = context ?? throw new ArgumentNullException(nameof(context));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _createValidator = createValidator ?? throw new ArgumentNullException(nameof(createValidator));
    }

    /// <summary>
    /// Retrieves all active servers.
    /// </summary>
    /// <returns>Collection of server DTOs</returns>
    public async Task<IEnumerable<ServerDto>> GetAllServersAsync()
    {
        _logger.LogInformation("Retrieving all active servers");

        var servers = await _context.Servers
            .Where(s => s.IsActive)
            .OrderBy(s => s.Name)
            .ToListAsync();

        _logger.LogInformation("Retrieved {Count} servers", servers.Count);

        return servers.Select(s => s.ToDto());
    }

    /// <summary>
    /// Creates a new server configuration.
    /// </summary>
    /// <param name="dto">Server creation data</param>
    /// <returns>Created server DTO</returns>
    /// <exception cref="ValidationException">Thrown when validation fails</exception>
    public async Task<ServerDto> CreateServerAsync(CreateServerDto dto)
    {
        _logger.LogInformation("Creating new server: {Name}", dto.Name);

        // Validate
        var validationResult = await _createValidator.ValidateAsync(dto);
        if (!validationResult.IsValid)
        {
            throw new ValidationException(validationResult.Errors);
        }

        // Check for duplicates
        var exists = await _context.Servers
            .AnyAsync(s => s.Name == dto.Name);

        if (exists)
        {
            throw new InvalidOperationException($"Server with name '{dto.Name}' already exists");
        }

        // Create entity
        var server = new Server
        {
            Name = dto.Name,
            BaseUrl = dto.BaseUrl,
            Environment = dto.Environment,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Servers.Add(server);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Created server {ServerId}: {Name}", server.Id, server.Name);

        return server.ToDto();
=======
# Coding Standards - Checklist POC

> **Last Updated:** 2025-11-19
> **Status:** Active - Enforced on all new code
> **Reference Repository:** https://github.com/dynamisinc/c5-seeder

## Table of Contents
1. [Core Principles](#core-principles)
2. [File Size Standards](#file-size-standards)
3. [Backend Standards (C# / .NET)](#backend-standards-c--net)
4. [Frontend Standards (TypeScript / React)](#frontend-standards-typescript--react)
5. [Documentation Standards](#documentation-standards)
6. [Architecture Patterns](#architecture-patterns)
7. [Testing Standards](#testing-standards)
8. [Code Review Checklist](#code-review-checklist)

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

**Example - File Too Large:**
```csharp
// ❌ BAD: TemplateService.cs (500 lines)
public class TemplateService : ITemplateService
{
    // 30 methods, 500 lines of code
    // Hard to navigate, test, maintain
}
```

**Example - Properly Split:**
```csharp
// ✅ GOOD: Split into multiple services
// TemplateService.cs (250 lines) - Core CRUD
// TemplateSearchService.cs (150 lines) - Search/filter
// TemplateValidationService.cs (100 lines) - Validation logic
```

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
components/        → UI rendering (no business logic)
hooks/            → Reusable React logic
services/         → API client calls
types/            → TypeScript interfaces
utils/            → Pure helper functions
theme/            → Material-UI theme configuration
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

```csharp
/// <summary>
/// TemplatesController - API endpoints for template management
///
/// Purpose:
///   Provides RESTful endpoints for CRUD operations on templates.
///   Thin controller pattern: validation and routing only.
///
/// Base Route: /api/templates
///
/// Author: Checklist POC Team
/// Last Modified: 2025-11-19
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class TemplatesController : ControllerBase
{
    private readonly ITemplateService _templateService;
    private readonly ILogger<TemplatesController> _logger;

    public TemplatesController(
        ITemplateService templateService,
        ILogger<TemplatesController> logger)
    {
        _templateService = templateService;
        _logger = logger;
    }

    /// <summary>
    /// Get all active templates
    /// </summary>
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<List<TemplateDto>>> GetTemplates()
    {
        var templates = await _templateService.GetAllTemplatesAsync();
        return Ok(templates);
    }

    /// <summary>
    /// Create a new template
    /// </summary>
    [HttpPost]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<TemplateDto>> CreateTemplate(
        [FromBody] CreateTemplateRequest request)
    {
        // Validation only
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        // Extract user context (from middleware)
        var userContext = GetUserContext();

        // Call service (business logic)
        var template = await _templateService.CreateTemplateAsync(
            request,
            userContext);

        // Log and return
        _logger.LogInformation(
            "Template {TemplateId} created by {User}",
            template.Id,
            userContext.Email);

        return CreatedAtAction(
            nameof(GetTemplate),
            new { id = template.Id },
            template);
    }

    // Helper method for user context extraction
    private UserContext GetUserContext()
    {
        if (HttpContext.Items.TryGetValue("UserContext", out var context) &&
            context is UserContext userContext)
        {
            return userContext;
        }

        _logger.LogWarning("UserContext not found, using default");
        return new UserContext { /* default values */ };
    }
}
```

**File Size:** 150-250 lines per controller

### Service Pattern (Business Logic)

**Services should:**
- Implement business rules
- Orchestrate database operations
- Handle entity-to-DTO mapping
- Log all operations
- Receive UserContext for audit trails

**Services should NOT:**
- Return entities directly (use DTOs)
- Handle HTTP concerns
- Validate user input (DTOs handle that)

```csharp
/// <summary>
/// TemplateService - Implementation of template business logic
///
/// Purpose:
///   Handles all CRUD operations for templates with audit trails.
///   Orchestrates database operations and business rules.
///
/// Dependencies:
///   - ChecklistDbContext: Database access
///   - ILogger: Application Insights logging
///
/// Design Decisions:
///   - Returns DTOs, not entities (encapsulation)
///   - All methods async for I/O operations
///   - User attribution automatic from UserContext
///
/// Author: Checklist POC Team
/// Last Modified: 2025-11-19
/// </summary>
public class TemplateService : ITemplateService
{
    private readonly ChecklistDbContext _context;
    private readonly ILogger<TemplateService> _logger;

    public TemplateService(
        ChecklistDbContext context,
        ILogger<TemplateService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<List<TemplateDto>> GetAllTemplatesAsync()
    {
        _logger.LogInformation("Fetching all templates");

        var templates = await _context.Templates
            .Include(t => t.Items.OrderBy(i => i.DisplayOrder))
            .Where(t => !t.IsArchived && t.IsActive)
            .OrderBy(t => t.Category)
            .ThenBy(t => t.Name)
            .AsNoTracking()
            .ToListAsync();

        _logger.LogInformation("Retrieved {Count} templates", templates.Count);

        return templates.Select(MapToDto).ToList();
    }

    public async Task<TemplateDto> CreateTemplateAsync(
        CreateTemplateRequest request,
        UserContext userContext)
    {
        _logger.LogInformation(
            "Creating template '{Name}' by {User}",
            request.Name,
            userContext.Email);

        // Build entity from request
        var template = new Template
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            Description = request.Description,
            Category = request.Category,
            Tags = request.Tags,
            IsActive = true,
            IsArchived = false,
            // Audit fields from UserContext
            CreatedBy = userContext.Email,
            CreatedByPosition = userContext.Position,
            CreatedAt = DateTime.UtcNow
        };

        // Add items
        foreach (var itemRequest in request.Items)
        {
            template.Items.Add(new TemplateItem
            {
                Id = Guid.NewGuid(),
                TemplateId = template.Id,
                ItemText = itemRequest.ItemText,
                ItemType = itemRequest.ItemType,
                DisplayOrder = itemRequest.DisplayOrder,
                StatusOptions = itemRequest.StatusOptions,
                Notes = itemRequest.Notes
            });
        }

        // Save to database
        _context.Templates.Add(template);
        await _context.SaveChangesAsync();

        _logger.LogInformation(
            "Created template {TemplateId} with {ItemCount} items",
            template.Id,
            template.Items.Count);

        return MapToDto(template);
    }

    /// <summary>
    /// Maps Template entity to TemplateDto
    /// Centralized mapping logic (DRY principle)
    /// </summary>
    private static TemplateDto MapToDto(Template template)
    {
        return new TemplateDto
        {
            Id = template.Id,
            Name = template.Name,
            Description = template.Description,
            Category = template.Category,
            Tags = template.Tags,
            IsActive = template.IsActive,
            IsArchived = template.IsArchived,
            CreatedBy = template.CreatedBy,
            CreatedByPosition = template.CreatedByPosition,
            CreatedAt = template.CreatedAt,
            LastModifiedBy = template.LastModifiedBy,
            LastModifiedByPosition = template.LastModifiedByPosition,
            LastModifiedAt = template.LastModifiedAt,
            Items = template.Items.Select(MapItemToDto).ToList()
        };
    }

    private static TemplateItemDto MapItemToDto(TemplateItem item)
    {
        return new TemplateItemDto
        {
            Id = item.Id,
            TemplateId = item.TemplateId,
            ItemText = item.ItemText,
            ItemType = item.ItemType,
            DisplayOrder = item.DisplayOrder,
            StatusOptions = item.StatusOptions,
            Notes = item.Notes
        };
>>>>>>> d569bad751481e44e6f6dd331f8d4327da5743a1
    }
}
```

<<<<<<< HEAD
### C# Best Practices

**1. Async/Await**
```csharp
// ✅ Good
public async Task<Server> GetServerAsync(int id)
{
    return await _context.Servers
        .FirstOrDefaultAsync(s => s.Id == id);
}

// ❌ Bad - Synchronous I/O
public Server GetServer(int id)
{
    return _context.Servers
        .FirstOrDefault(s => s.Id == id);
}
```

**2. Null Handling**
```csharp
// ✅ Good - Explicit null check
public async Task<ServerDto?> GetServerByIdAsync(int id)
{
    var server = await _context.Servers
        .FirstOrDefaultAsync(s => s.Id == id);

    return server?.ToDto();
}

// For required parameters
public void ProcessServer(Server server)
{
    ArgumentNullException.ThrowIfNull(server);
    // Process
}
```

**3. Using Statements**
```csharp
// ✅ Good - Automatic disposal
using var transaction = await _context.Database.BeginTransactionAsync();
try
{
    // Operations
=======
**File Size:** 200-250 lines per service implementation

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

/// <summary>
/// CreateTemplateRequest - Request DTO for creating templates
///
/// Purpose:
///   Captures all data needed to create a template.
///   Used by POST /api/templates endpoint.
///
/// Validation Rules:
///   - Name: Required, max 200 characters
///   - Category: Required, max 50 characters
///
/// Note:
///   CreatedBy/CreatedByPosition NOT in request.
///   Populated automatically from UserContext by service layer.
///
/// Author: Checklist POC Team
/// Last Modified: 2025-11-19
/// </summary>
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

**Response DTOs:** Use for API responses
```csharp
/// <summary>
/// TemplateDto - Response DTO for templates
///
/// Purpose:
///   Represents complete template data for API responses.
///   Includes all audit fields and computed properties.
///
/// Author: Checklist POC Team
/// Last Modified: 2025-11-19
/// </summary>
public record TemplateDto
{
    public Guid Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public string Category { get; init; } = string.Empty;
    public string Tags { get; init; } = string.Empty;
    public bool IsActive { get; init; }
    public bool IsArchived { get; init; }
    public string CreatedBy { get; init; } = string.Empty;
    public string CreatedByPosition { get; init; } = string.Empty;
    public DateTime CreatedAt { get; init; }
    public string? LastModifiedBy { get; init; }
    public string? LastModifiedByPosition { get; init; }
    public DateTime? LastModifiedAt { get; init; }
    public List<TemplateItemDto> Items { get; init; } = new();

    // Computed property
    public int ItemCount => Items.Count;
}
```

**Why DTOs?**
- ✅ Encapsulation (don't expose entities)
- ✅ API versioning (change DTOs, not entities)
- ✅ Validation at API boundary
- ✅ Cleaner API contracts

**File Size:** 50-100 lines per DTO

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
Always prefer EF Core LINQ and methods over `ExecuteSqlRaw` or `FromSqlRaw` unless absolutely necessary.

```csharp
// ✅ GOOD: Explicit includes, AsNoTracking for read-only
var template = await _context.Templates
    .Include(t => t.Items.OrderBy(i => i.DisplayOrder))
    .AsNoTracking()  // Read-only query optimization
    .FirstOrDefaultAsync(t => t.Id == id);

// ✅ GOOD: Use DbSet operations for bulk operations
_context.TemplateItems.RemoveRange(template.Items);
var newItems = request.Items.Select(i => new TemplateItem { ... }).ToList();
_context.TemplateItems.AddRange(newItems);
await _context.SaveChangesAsync();

// ❌ BAD: Avoid raw SQL
await _context.Database.ExecuteSqlRawAsync("DELETE FROM TemplateItems WHERE TemplateId = {0}", id);

// ✅ GOOD: Use transactions for multi-step operations
using var transaction = await _context.Database.BeginTransactionAsync();
try
{
    _context.Templates.Add(template);
    await _context.SaveChangesAsync();

    await _logService.LogTemplateCreatedAsync(template.Id);
    await _context.SaveChangesAsync();

    await transaction.CommitAsync();
}
catch
{
    await transaction.RollbackAsync();
    throw;
}
```

**4. LINQ Queries**
```csharp
// ✅ Good - Efficient query
var servers = await _context.Servers
    .Where(s => s.IsActive)
    .OrderBy(s => s.Name)
    .Select(s => new ServerDto
    {
        Id = s.Id,
        Name = s.Name,
        BaseUrl = s.BaseUrl
    })
    .ToListAsync();

// ❌ Bad - Loads entire entity then filters
var allServers = await _context.Servers.ToListAsync();
var activeServers = allServers.Where(s => s.IsActive).ToList();
```

**5. Logging**
```csharp
// ✅ Good - Structured logging
_logger.LogInformation(
    "Server {ServerId} updated by {UserId}", 
    serverId, 
    userId
);

// ✅ Good - Error logging with exception
_logger.LogError(
    ex, 
    "Failed to create server {ServerName}", 
    serverName
);

// ❌ Bad - String interpolation in log message
_logger.LogInformation($"Server {serverId} updated"); // Prevents structured logging
=======

// ❌ BAD: Lazy loading, not async
var template = _context.Templates.Find(id);
var items = template.Items; // Lazy load (N+1 problem)
>>>>>>> d569bad751481e44e6f6dd331f8d4327da5743a1
```

---

<<<<<<< HEAD
## Database Standards

### Entity Design

```csharp
/// <summary>
/// Represents a COBRA server configuration
/// </summary>
public class Server
{
    /// <summary>
    /// Unique identifier for the server
    /// </summary>
    public int Id { get; set; }

    /// <summary>
    /// Display name of the server (e.g., "C5 Dev", "Customer QA")
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Base URL for the server API
    /// </summary>
    public string BaseUrl { get; set; } = string.Empty;

    /// <summary>
    /// Environment type (Dev, QA, Prod, Customer)
    /// </summary>
    public string Environment { get; set; } = string.Empty;

    /// <summary>
    /// Indicates if the server is active and available for use
    /// </summary>
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// Timestamp when the server was created (UTC)
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Timestamp when the server was last updated (UTC)
    /// </summary>
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public ICollection<DemoUser> DemoUsers { get; set; } = new List<DemoUser>();
    public ICollection<Execution> Executions { get; set; } = new List<Execution>();
}
```

### Entity Configuration

```csharp
public class ServerConfiguration : IEntityTypeConfiguration<Server>
{
    public void Configure(EntityTypeBuilder<Server> builder)
    {
        // Table
        builder.ToTable("Servers");

        // Primary key
        builder.HasKey(e => e.Id);

        // Properties
        builder.Property(e => e.Name)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(e => e.BaseUrl)
            .IsRequired()
            .HasMaxLength(500);

        builder.Property(e => e.Environment)
            .IsRequired()
            .HasMaxLength(50);

        // Indexes
        builder.HasIndex(e => e.Name)
            .IsUnique();

        builder.HasIndex(e => e.Environment);

        builder.HasIndex(e => e.IsActive);

        // Relationships
        builder.HasMany(e => e.DemoUsers)
            .WithOne(e => e.Server)
            .HasForeignKey(e => e.ServerId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
```

### Migration Standards

**Naming Convention:**
```
YYYYMMDD_HHmmss_DescriptiveName

Examples:
20241106_143000_InitialCreate
20241107_091500_AddDemoUsersTable
20241108_160000_AddExecutionIndexes
```

**Migration Best Practices:**
- One logical change per migration
- Test Up and Down methods
- Include index creation
- Document breaking changes in comments
- Review generated SQL before applying

---

## API Design

### REST Endpoint Conventions

```
GET    /api/servers              List all servers
GET    /api/servers/{id}         Get server by ID
POST   /api/servers              Create new server
PUT    /api/servers/{id}         Update server
DELETE /api/servers/{id}         Soft delete (archive) server

GET    /api/servers/{id}/users   Get users for server
POST   /api/servers/{id}/users   Add user to server
```

### **REQUIRED: Soft Delete Pattern**

**All DELETE operations MUST use soft deletes (archiving) with admin-only permanent delete.**

#### Why Soft Deletes?
- **User protection** - Prevents accidental data loss
- **Audit compliance** - Regulatory requirements for data retention
- **Emergency recovery** - Admins can restore critical data during incidents
- **Forgiving UX** - Critical for infrequent users under stress

#### Implementation Requirements

**Database Schema:**
All tables with user-managed data MUST include:
```sql
IsArchived       BIT           NOT NULL DEFAULT 0,
ArchivedBy       NVARCHAR(255) NULL,
ArchivedAt       DATETIME2     NULL,

-- Index for performance
CREATE INDEX IX_TableName_IsArchived ON TableName(IsArchived);
```

**API Endpoints:**
```
DELETE /api/resources/{id}              # Soft delete (all users)
GET    /api/resources/archived          # Get archived (Admin only)
POST   /api/resources/{id}/restore      # Restore (Admin only)
DELETE /api/resources/{id}/permanent    # Hard delete (Admin only, CANNOT BE UNDONE)
```

**Service Layer Example:**
```csharp
// ✅ REQUIRED: Soft delete implementation
public async Task<bool> ArchiveResourceAsync(Guid id, UserContext userContext)
{
    var resource = await _context.Resources.FindAsync(id);
    if (resource == null) return false;

    resource.IsArchived = true;
    resource.ArchivedBy = userContext.Email;
    resource.ArchivedAt = DateTime.UtcNow;

    await _context.SaveChangesAsync();
    _logger.LogInformation("Archived resource {ResourceId}", id);
    return true;
}

// ✅ REQUIRED: Permanent delete with admin check
public async Task<bool> PermanentlyDeleteResourceAsync(Guid id, UserContext userContext)
{
    if (!userContext.IsAdmin)
    {
        throw new UnauthorizedAccessException("Only administrators can permanently delete");
    }

    var resource = await _context.Resources.FindAsync(id);
    if (resource == null) return false;

    _logger.LogWarning(
        "PERMANENTLY DELETING resource {ResourceId} by admin {User}",
        id, userContext.Email);

    _context.Resources.Remove(resource);
    await _context.SaveChangesAsync();
    return true;
}
```

**Query Pattern:**
```csharp
// ✅ ALWAYS filter archived by default
public async Task<List<ResourceDto>> GetAllAsync()
{
    return await _context.Resources
        .Where(r => !r.IsArchived)  // ← REQUIRED
        .ToListAsync();
}
```

**Logging Levels:**
- `Information` - Soft deletes and restores
- `Warning` - Permanent deletes (irreversible)
- `Error` - Unauthorized permanent delete attempts

**See:** `docs/SOFT_DELETE_PATTERN.md` for complete implementation guide.

### Response Structure

```csharp
/// <summary>
/// Standard API response wrapper
/// </summary>
public class ApiResponse<T>
{
    public bool Success { get; set; }
    public T? Data { get; set; }
    public string? ErrorMessage { get; set; }
    public List<string>? ValidationErrors { get; set; }

    public static ApiResponse<T> SuccessResult(T data) => new()
    {
        Success = true,
        Data = data
    };

    public static ApiResponse<T> ErrorResult(string message) => new()
    {
        Success = false,
        ErrorMessage = message
    };

    public static ApiResponse<T> ValidationErrorResult(List<string> errors) => new()
    {
        Success = false,
        ValidationErrors = errors
    };
}
```

### HTTP Status Codes

| Code | Usage |
|------|-------|
| 200 OK | Successful GET, PUT, DELETE |
| 201 Created | Successful POST |
| 204 No Content | Successful DELETE with no response body |
| 400 Bad Request | Validation errors, malformed request |
| 401 Unauthorized | Authentication required |
| 403 Forbidden | Authenticated but not authorized |
| 404 Not Found | Resource doesn't exist |
| 409 Conflict | Duplicate or conflicting state |
| 500 Internal Server Error | Unexpected server error |

---

## Security Guidelines

### Input Validation

**Frontend:**
- Validate before sending to API
- Use React Hook Form with validation schemas
- Provide immediate user feedback
- Sanitize user input for display

**Backend:**
- Always validate on server (never trust client)
- Use FluentValidation for complex rules
- Return specific validation errors
- Log validation failures

### Sensitive Data Handling

**DO:**
- ✅ Encrypt passwords using Data Protection API
- ✅ Store encryption keys in Key Vault
- ✅ Use HTTPS for all communication
- ✅ Clear sensitive data from memory after use
- ✅ Use Managed Identity for Azure authentication

**DON'T:**
- ❌ Log passwords, tokens, or API keys
- ❌ Display passwords in UI (even masked)
- ❌ Store secrets in code or config files
- ❌ Return sensitive data in error messages
- ❌ Use weak encryption or custom crypto

### Authentication Patterns

```csharp
// Decrypt C5 password only when needed
public async Task<string> GetBearerTokenAsync(int demoUserId)
{
    var user = await _context.DemoUsers.FindAsync(demoUserId);
    if (user == null) throw new NotFoundException();

    // Decrypt password
    var password = _encryptionService.Decrypt(user.PasswordEncrypted);

    try
    {
        // Use immediately
        var token = await _c5ApiService.AuthenticateAsync(user.Username, password);
        return token;
    }
    finally
    {
        // Clear from memory
        password = null;
    }
}
```

---

## Testing Standards

### Unit Test Structure

```csharp
public class ServerServiceTests
{
    private readonly Mock<AppDbContext> _mockContext;
    private readonly Mock<ILogger<ServerService>> _mockLogger;
    private readonly ServerService _service;

    public ServerServiceTests()
    {
        _mockContext = new Mock<AppDbContext>();
        _mockLogger = new Mock<ILogger<ServerService>>();
        _service = new ServerService(_mockContext.Object, _mockLogger.Object);
    }

    [Fact]
    public async Task GetAllServersAsync_ReturnsActiveServers()
    {
        // Arrange
        var servers = new List<Server>
        {
            new Server { Id = 1, Name = "Dev", IsActive = true },
            new Server { Id = 2, Name = "QA", IsActive = true },
            new Server { Id = 3, Name = "Old", IsActive = false }
        };
        _mockContext.Setup(x => x.Servers).Returns(GetMockDbSet(servers));

        // Act
        var result = await _service.GetAllServersAsync();

        // Assert
        Assert.Equal(2, result.Count());
        Assert.All(result, s => Assert.True(s.IsActive));
    }

    [Fact]
    public async Task CreateServerAsync_WithDuplicateName_ThrowsException()
    {
        // Arrange
        var dto = new CreateServerDto { Name = "Existing Server" };
        _mockContext.Setup(x => x.Servers.AnyAsync(It.IsAny<Expression<Func<Server, bool>>>()))
            .ReturnsAsync(true);

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => _service.CreateServerAsync(dto)
        );
    }
}
```

### Test Naming Convention

```
MethodName_Scenario_ExpectedResult

Examples:
GetServerById_WithValidId_ReturnsServer
GetServerById_WithInvalidId_ReturnsNull
CreateServer_WithDuplicateName_ThrowsException
DeleteServer_WhenNotFound_ThrowsNotFoundException
```

---

## Documentation Requirements

### Code Comments

**When to Comment:**
- Complex business logic
- Non-obvious algorithms
- Workarounds or hacks
- Public APIs
- Class/interface purpose

**When NOT to Comment:**
- Self-explanatory code
- What the code does (use good names instead)
- Outdated information

**XML Documentation (C#):**
```csharp
/// <summary>
/// Generates a demo scenario using Claude AI based on customer requirements.
/// </summary>
/// <param name="discoveryInput">Customer requirements and pain points</param>
/// <returns>Complete scenario with events, logbooks, and chat messages</returns>
/// <exception cref="ValidationException">Thrown when input validation fails</exception>
/// <exception cref="LlmException">Thrown when LLM generation fails</exception>
public async Task<ScenarioDto> GenerateScenarioAsync(DiscoveryInputDto discoveryInput)
=======
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

// Files: PascalCase for components, kebab-case for others
// ChecklistCard.tsx (component)
// useChecklists.ts (hook)
// checklist-service.ts (service)
```

### Component Structure (50-150 lines)

```typescript
import React, { useState } from 'react';
import { Card, CardContent, Typography } from '@mui/material';
import type { ChecklistDto } from '../../types';
import { getProgressColor } from '../../theme/c5Theme';

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
 *
 * Props:
 *   - checklist: ChecklistDto - The checklist data
 *   - onOpen: (id: string) => void - Callback when card clicked
 *   - onArchive?: (id: string) => void - Optional archive callback
 *
 * Author: Checklist POC Team
 * Last Modified: 2025-11-19
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
  const lastUpdated = formatRelativeTime(checklist.lastModifiedAt);

  // 3. Event handlers
  const handleClick = () => {
    onOpen(checklist.id);
  };

  const handleArchive = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    onArchive?.(checklist.id);
  };

  // 4. Render
  return (
    <Card
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      sx={{
        cursor: 'pointer',
        '&:hover': { boxShadow: 3 }
      }}
    >
      <CardContent>
        <Typography variant="h6">{checklist.name}</Typography>
        <Typography variant="body2" color="text.secondary">
          {checklist.eventId}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Last updated: {lastUpdated}
        </Typography>

        {/* Progress bar */}
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

        {/* Actions (shown on hover) */}
        {isHovered && onArchive && (
          <IconButton onClick={handleArchive} size="small">
            <ArchiveIcon />
          </IconButton>
        )}
      </CardContent>
    </Card>
  );
};
```

**Component Organization:**
1. Imports
2. Interface definitions
3. Component implementation:
   - Hooks first
   - Derived state
   - Event handlers
   - Render JSX

**File Size:** 50-150 lines per component

### Custom Hooks Pattern (50-100 lines)

```typescript
import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { checklistService } from '../services/checklistService';
import type { ChecklistDto } from '../types';

/**
 * useChecklists Hook
 *
 * Purpose:
 *   Manages checklist data fetching, caching, and mutations.
 *   Provides loading/error states for UI components.
 *
 * Returns:
 *   - checklists: ChecklistDto[] - Array of checklists
 *   - loading: boolean - Loading state
 *   - error: string | null - Error message
 *   - fetchChecklists: () => Promise<void> - Refetch data
 *   - createChecklist: (data) => Promise<ChecklistDto> - Create new
 *
 * Usage:
 *   const { checklists, loading, error, createChecklist } = useChecklists();
 *
 * Author: Checklist POC Team
 * Last Modified: 2025-11-19
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

  const createChecklist = async (
    templateId: string,
    name: string
  ): Promise<ChecklistDto> => {
    try {
      setLoading(true);
      const newChecklist = await checklistService.createFromTemplate({
        templateId,
        name,
      });

      // Optimistic update
      setChecklists(prev => [...prev, newChecklist]);

      toast.success('Checklist created');
      return newChecklist;
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : 'Failed to create checklist';
      toast.error(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Fetch on mount
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

**File Size:** 50-100 lines per hook

### API Service Pattern

```typescript
import { apiClient } from './api';
import type { ChecklistDto, CreateChecklistRequest } from '../types';

/**
 * checklistService - API client for checklist operations
 *
 * Purpose:
 *   Encapsulates all checklist-related HTTP requests.
 *   Provides typed, promise-based interface for components/hooks.
 *
 * Base URL: Configured in apiClient (VITE_API_URL)
 *
 * Author: Checklist POC Team
 * Last Modified: 2025-11-19
 */
export const checklistService = {
  /**
   * Fetch all checklists for the current user's position
   */
  getMyChecklists: async (): Promise<ChecklistDto[]> => {
    const response = await apiClient.get<ChecklistDto[]>(
      '/api/checklists/my-checklists'
    );
    return response.data;
  },

  /**
   * Get a single checklist by ID with all items
   */
  getChecklistById: async (id: string): Promise<ChecklistDto> => {
    const response = await apiClient.get<ChecklistDto>(
      `/api/checklists/${id}`
    );
    return response.data;
  },

  /**
   * Create a new checklist from a template
   */
  createFromTemplate: async (
    request: CreateChecklistRequest
  ): Promise<ChecklistDto> => {
    const response = await apiClient.post<ChecklistDto>(
      '/api/checklists',
      request
    );
    return response.data;
  },

  /**
   * Archive a checklist (soft delete)
   */
  archiveChecklist: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/checklists/${id}`);
  },
};
```

**File Size:** 50-100 lines per service

### TypeScript Strictness

```typescript
// ✅ GOOD: Proper typing
const checklists: ChecklistDto[] = await checklistService.getMyChecklists();
const count: number = checklists.length; // Inferred, but explicit for clarity

// ✅ GOOD: Use unknown for error handling
try {
  // ...
} catch (err) {
  const message = err instanceof Error
    ? err.message
    : 'An unexpected error occurred';
  console.error(message);
}

// ❌ BAD: Avoid any
const checklists: any = await checklistService.getMyChecklists();

// ❌ BAD: Avoid type assertions unless necessary
const data = response.data as ChecklistDto; // Only if TypeScript can't infer
```

### Error Handling Pattern

```typescript
/**
 * Standard error handling pattern for async operations
 */
const handleOperation = async () => {
  try {
    setLoading(true);
    setError(null);

    // Perform operation
    const result = await someAsyncOperation();

    // Update state
    setState(result);

    // User feedback
    toast.success('Operation completed');

  } catch (err) {
    // Extract error message
    const message = err instanceof Error
      ? err.message
      : 'Operation failed';

    // Update error state
    setError(message);

    // User feedback
    toast.error(message);

    // Rethrow if caller needs to handle
    throw err;

  } finally {
    // Always cleanup
    setLoading(false);
  }
};
```

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
 * Design Decisions: (optional, for complex components)
 *   - Why we chose this approach
 *   - Trade-offs considered
 *
 * Props/Parameters:
 *   - param1: Type - Description
 *   - param2: Type - Description
 *
 * Returns: (for functions/hooks)
 *   Description of return value
 *
 * Author: Checklist POC Team
 * Last Modified: YYYY-MM-DD
 */
```

### Method Documentation

```csharp
/// <summary>
/// Creates a new template with items and user attribution
/// </summary>
/// <param name="request">Template data including items</param>
/// <param name="userContext">Current user context for audit trail</param>
/// <returns>Newly created template with generated ID</returns>
/// <exception cref="ValidationException">If template data is invalid</exception>
public async Task<TemplateDto> CreateTemplateAsync(
    CreateTemplateRequest request,
    UserContext userContext)
>>>>>>> d569bad751481e44e6f6dd331f8d4327da5743a1
{
    // Implementation
}
```

<<<<<<< HEAD
**JSDoc (TypeScript):**
```typescript
/**
 * Fetches all active servers from the API
 * @returns Promise resolving to array of servers
 * @throws {Error} When API request fails
 */
export async function getServers(): Promise<Server[]> {
  // Implementation
}
```

### README Requirements

Every major component should have a README.md:
- Purpose and responsibilities
- How to use/integrate
- Configuration requirements
- Examples
- Common pitfalls
=======
### Inline Comments

```csharp
// ✅ GOOD: Explain WHY, not WHAT
// Use AsNoTracking for read-only queries to improve performance
var templates = await _context.Templates
    .AsNoTracking()
    .ToListAsync();

// Populate audit fields from user context for FEMA compliance
template.CreatedBy = userContext.Email;
template.CreatedByPosition = userContext.Position;

// ❌ BAD: Obvious comments
// Add template to context
_context.Templates.Add(template);

// Save changes
await _context.SaveChangesAsync();
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
builder.Services.AddApplicationInsightsTelemetry(options =>
{
    options.ConnectionString = config["ApplicationInsights:ConnectionString"];
});
```

**Service Lifetimes:**
- **Scoped:** Services, DbContext (per HTTP request)
- **Singleton:** Logging, Application Insights, Configuration
- **Transient:** Lightweight, stateless services (rarely used)

### Repository Pattern (Optional)

For this POC, we use **services directly with DbContext**.

If complexity grows, consider repository pattern:
```csharp
// ITemplateRepository.cs
public interface ITemplateRepository
{
    Task<Template?> GetByIdAsync(Guid id);
    Task<List<Template>> GetAllAsync();
    Task AddAsync(Template template);
    Task UpdateAsync(Template template);
    Task DeleteAsync(Guid id);
}

// TemplateService uses ITemplateRepository instead of DbContext
```

**Current Decision:** Repositories not needed for POC. Services + DbContext is sufficient.

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

/// <summary>
/// Unit tests for TemplateService
/// Tests business logic in isolation using mocked dependencies
/// </summary>
public class TemplateServiceTests
{
    [Fact]
    public async Task GetAllTemplatesAsync_ReturnsActiveTemplates()
    {
        // Arrange
        var mockContext = new Mock<ChecklistDbContext>();
        var mockLogger = new Mock<ILogger<TemplateService>>();
        var service = new TemplateService(mockContext.Object, mockLogger.Object);

        // TODO: Setup mock data

        // Act
        var result = await service.GetAllTemplatesAsync();

        // Assert
        Assert.NotNull(result);
        Assert.All(result, t => Assert.True(t.IsActive));
        Assert.All(result, t => Assert.False(t.IsArchived));
    }

    [Fact]
    public async Task CreateTemplateAsync_SetsUserAttribution()
    {
        // Arrange
        var service = CreateService();
        var request = new CreateTemplateRequest { /* ... */ };
        var userContext = new UserContext
        {
            Email = "test@cobra.mil",
            Position = "Test Position"
        };

        // Act
        var result = await service.CreateTemplateAsync(request, userContext);

        // Assert
        Assert.Equal("test@cobra.mil", result.CreatedBy);
        Assert.Equal("Test Position", result.CreatedByPosition);
        Assert.NotEqual(default(DateTime), result.CreatedAt);
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
    expect(handleOpen).toHaveBeenCalledTimes(1);
  });

  it('displays progress bar with correct value', () => {
    render(<ChecklistCard checklist={mockChecklist} onOpen={() => {}} />);

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '50');
  });
});
```

### Test Coverage Goals

- **Unit Tests:** 80%+ for services and utilities
- **Integration Tests:** Key workflows (create, update, delete)
- **Component Tests:** All interactive components
- **E2E Tests:** Critical user paths (future)
>>>>>>> d569bad751481e44e6f6dd331f8d4327da5743a1

---

## Code Review Checklist

### Before Submitting PR

<<<<<<< HEAD
- [ ] Code compiles without warnings
- [ ] All tests pass
- [ ] New code has appropriate tests
- [ ] Code follows naming conventions
- [ ] Functions are appropriately sized
- [ ] Error handling is comprehensive
- [ ] Logging is appropriate (no sensitive data)
- [ ] Security best practices followed
- [ ] Documentation updated (if needed)
- [ ] Commit messages are clear
- [ ] PR description explains changes

### Reviewer Checklist

- [ ] Code solves the stated problem
- [ ] Logic is correct and efficient
- [ ] Error cases handled
- [ ] Tests are meaningful
- [ ] Code is maintainable
- [ ] Security implications considered
- [ ] Performance implications acceptable
- [ ] Documentation adequate

---

This document is a living guide. Update it as patterns emerge and the team learns what works best.
=======
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

**Documentation:**
- [ ] Every new class has header comment
- [ ] Complex methods explained
- [ ] Design decisions documented

**Patterns:**
- [ ] Dependency injection used
- [ ] Interface-based services
- [ ] Centralized error handling
- [ ] Consistent naming conventions

**Security:**
- [ ] No sensitive data logged
- [ ] User input validated
- [ ] SQL injection prevented (EF Core parameterized)
- [ ] XSS prevented (React escapes by default)

---

## Summary

These coding standards ensure:
- ✅ **Maintainability** - Small, focused files easy to understand
- ✅ **Testability** - Interface-based design, dependency injection
- ✅ **Scalability** - Clear separation of concerns
- ✅ **Onboarding** - Verbose comments for new engineers
- ✅ **Quality** - Consistent patterns across codebase
- ✅ **Audit Compliance** - User attribution on all operations

**Remember:**
1. **Small files** (200-250 line limit)
2. **Single responsibility**
3. **Service interfaces**
4. **Verbose comments**
5. **DRY principles**
6. **Separation of concerns**

When in doubt, look at existing code in this project as reference:
- `Controllers/TemplatesController.cs` - Controller pattern
- `Services/TemplateService.cs` - Service pattern
- `Models/DTOs/TemplateDto.cs` - DTO pattern
- `Middleware/MockUserMiddleware.cs` - Middleware pattern

---

**Last Updated:** 2025-11-19
**Questions?** Refer to CLAUDE.md or IMPLEMENTATION_SUMMARY.md
>>>>>>> d569bad751481e44e6f6dd331f8d4327da5743a1
