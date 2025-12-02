# Frontend Architecture

> **Last Updated:** 2025-12-01
> **Status:** Active - Enforced on all frontend development

## Overview

The frontend uses a **tool-based module structure** designed for:
- **Scalability** - Easy to add new tools without affecting existing code
- **Code organization** - Related code stays together
- **Team autonomy** - Different developers can work on different tools independently
- **POC evaluation** - Each tool can be evaluated independently for production inclusion

This structure supports the project goal of building individual POC tools that may be integrated into the production C5 application.

---

## Directory Structure

```
src/frontend/src/
├── core/                        # App-wide infrastructure
│   ├── components/              # App-wide components
│   │   ├── ErrorBoundary.tsx    # React error boundary
│   │   └── ProfileMenu.tsx      # User profile dropdown
│   ├── services/
│   │   └── api.ts               # Axios client (base for all services)
│   ├── styles/
│   │   └── global.css           # Global CSS (animations)
│   ├── utils/
│   │   └── apiHealthCheck.ts    # API connectivity utility
│   └── index.ts                 # Barrel export for core modules
│
├── shared/                      # Shared across multiple tools
│   ├── events/                  # Event management (used by all tools)
│   │   ├── components/
│   │   │   └── EventSelector.tsx
│   │   ├── contexts/
│   │   │   └── EventContext.tsx
│   │   ├── hooks/
│   │   │   └── useEvents.ts
│   │   ├── pages/
│   │   │   ├── EventLandingPage.tsx
│   │   │   └── EventsListPage.tsx
│   │   ├── services/
│   │   │   └── eventService.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   └── utils/
│   │       └── iconMapping.ts
│   └── hooks/
│       └── usePermissions.ts    # Permission checking hook
│
├── tools/                       # Tool-specific modules
│   ├── checklist/               # Checklist tool
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── experiments/         # Experimental features
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── services/
│   │   └── types/
│   │       └── index.ts         # Checklist-specific types
│   │
│   └── chat/                    # Chat tool
│       ├── components/
│       └── services/
│
├── admin/                       # Admin-only features
│   ├── contexts/
│   │   ├── FeatureFlagsContext.tsx
│   │   └── SysAdminContext.tsx
│   ├── pages/
│   │   └── AdminPage.tsx
│   ├── services/
│   │   ├── featureFlagsService.ts
│   │   └── systemSettingsService.ts
│   └── types/
│
├── theme/                       # MUI theme configuration
│   ├── cobraTheme.ts            # Current COBRA theme
│   ├── CobraStyles.ts           # Spacing/padding constants
│   └── styledComponents/        # COBRA styled components
│       ├── CobraButton.tsx
│       ├── CobraDialog.tsx
│       └── index.ts
│
├── types/                       # Shared TypeScript types
│   └── index.ts                 # Re-exports from tool types
│
├── App.tsx                      # Root component with routing
└── main.tsx                     # Entry point
```

---

## Module Guidelines

### core/ - App-Wide Infrastructure

**Purpose:** Code that is used across the entire application, not specific to any tool.

**What goes here:**
- Axios client configuration (`api.ts`)
- Error handling components (`ErrorBoundary.tsx`)
- Global layout components (`ProfileMenu.tsx`)
- App-wide utilities (`apiHealthCheck.ts`)
- Global CSS that can't be in MUI theme

**Examples:**
```typescript
// core/services/api.ts - The base API client
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  headers: { 'Content-Type': 'application/json' },
});
```

### shared/ - Cross-Tool Features

**Purpose:** Features shared by multiple tools but not part of core infrastructure.

**What goes here:**
- Event management (events are used by checklist, chat, and future tools)
- Common hooks used by multiple tools
- Shared UI components specific to COBRA domain

**When to use shared/ vs core/:**
- `core/` = Technical infrastructure (API client, error handling)
- `shared/` = Domain features used by multiple tools (events, permissions)

### tools/{toolName}/ - Tool-Specific Modules

**Purpose:** Everything specific to a single tool lives in its directory.

**What goes here:**
- Components only used by this tool
- Hooks specific to this tool
- Services for this tool's API endpoints
- Types/interfaces for this tool's data models
- Pages for this tool's routes

**Benefits:**
- Clear ownership boundaries
- Easy to understand what code belongs where
- Can be evaluated independently for production inclusion
- Can be removed without affecting other tools

### admin/ - Admin Features

**Purpose:** Features only accessible to system administrators.

**What goes here:**
- Feature flag management
- System settings
- User management (if added)
- Admin-only pages and components

---

## Import Conventions

### From core/ (use absolute path from src)
```typescript
import { apiClient } from '../../../core/services/api';
import { ErrorBoundary } from '../../../core/components/ErrorBoundary';
```

### From shared/ (use absolute path from src)
```typescript
import { useEvents } from '../../../shared/events/hooks/useEvents';
import { usePermissions } from '../../../shared/hooks/usePermissions';
import type { Event } from '../../../shared/events/types';
```

### From same tool (use relative paths)
```typescript
// Within tools/checklist/
import { checklistService } from '../services/checklistService';
import { useChecklists } from '../hooks/useChecklists';
import type { Template } from '../types';
```

### From types/ (backward compatible)
```typescript
// Root types/ re-exports from tool types for backward compatibility
import type { Template, ChecklistInstance } from '../../../types';
```

---

## Adding a New Tool

### Step 1: Create Directory Structure
```bash
mkdir -p src/tools/{toolName}/{components,hooks,services,pages,types}
```

### Step 2: Create Types
```typescript
// src/tools/{toolName}/types/index.ts
export interface MyToolDto {
  id: string;
  name: string;
  // ...
}

export interface CreateMyToolRequest {
  name: string;
  // ...
}
```

### Step 3: Create Service
```typescript
// src/tools/{toolName}/services/myToolService.ts
import { apiClient } from '../../../core/services/api';
import type { MyToolDto, CreateMyToolRequest } from '../types';

export const myToolService = {
  getAll: async (): Promise<MyToolDto[]> => {
    const response = await apiClient.get<MyToolDto[]>('/api/mytool');
    return response.data;
  },

  create: async (request: CreateMyToolRequest): Promise<MyToolDto> => {
    const response = await apiClient.post<MyToolDto>('/api/mytool', request);
    return response.data;
  },
};
```

### Step 4: Create Hooks
```typescript
// src/tools/{toolName}/hooks/useMyTool.ts
import { useState, useEffect } from 'react';
import { myToolService } from '../services/myToolService';
import type { MyToolDto } from '../types';

export const useMyTool = () => {
  const [items, setItems] = useState<MyToolDto[]>([]);
  const [loading, setLoading] = useState(false);

  // ... implementation

  return { items, loading };
};
```

### Step 5: Create Components and Pages
```typescript
// src/tools/{toolName}/pages/MyToolPage.tsx
import { useMyTool } from '../hooks/useMyTool';
import { MyToolList } from '../components/MyToolList';

export const MyToolPage: React.FC = () => {
  const { items, loading } = useMyTool();

  return (
    <MyToolList items={items} loading={loading} />
  );
};
```

### Step 6: Add Routes
```typescript
// App.tsx
import { MyToolPage } from './tools/mytool/pages/MyToolPage';

<Route path="/mytool" element={<MyToolPage />} />
```

### Step 7: Add Type Re-exports (Optional)
If other tools need your types:
```typescript
// src/types/index.ts
export type { MyToolDto } from '../tools/mytool/types';
```

---

## Type Management

### Tool-Specific Types
Each tool has its own `types/index.ts` with types specific to that tool:

```typescript
// src/tools/checklist/types/index.ts
export interface Template { ... }
export interface TemplateItem { ... }
export interface ChecklistInstance { ... }
export type ItemType = 'checkbox' | 'status';
// etc.
```

### Shared Types
Root `types/index.ts` contains:
1. App-wide types (permissions, generic UI types)
2. Re-exports from tool types for backward compatibility

```typescript
// src/types/index.ts

// App-wide types
export type PermissionRole = 'viewer' | 'editor' | 'admin';
export interface PaginatedResponse<T> { ... }

// Re-export checklist types (backward compatibility)
export type { Template, TemplateItem, ChecklistInstance } from '../tools/checklist/types';
export { ItemType } from '../tools/checklist/types';

// Re-export event types
export type { Event } from '../shared/events/types';
```

---

## POC Tool Evaluation

This structure supports the project's goal of building individual POC tools for evaluation:

### Benefits for Evaluation
1. **Isolation** - Each tool's code is self-contained in `tools/{toolName}/`
2. **Metrics** - Easy to measure code size, complexity, test coverage per tool
3. **Independence** - Tools can be evaluated without affecting each other
4. **Extraction** - A tool can be extracted for production by copying its directory

### Evaluation Criteria per Tool
- Code quality (follows CODING_STANDARDS.md)
- Test coverage
- UX feedback from users
- Performance metrics
- Integration complexity with production C5

### Promoting a Tool to Production
If a POC tool is approved for production:
1. Review and refactor code as needed
2. Add comprehensive tests
3. Document API contracts
4. Plan integration with production authentication
5. Extract to production codebase

---

## Best Practices

### Do
- Keep related code together in tool directories
- Use barrel exports (`index.ts`) for clean imports
- Follow the import conventions consistently
- Add new tools following the structure guide
- Keep `core/` minimal - only truly app-wide code

### Don't
- Import across tools directly (use shared/ if needed)
- Put tool-specific code in core/
- Create circular dependencies between tools
- Skip the types directory - it helps with organization

---

## Migration Notes

### Previous Structure (Deprecated)
The codebase previously used a flat structure:
```
src/
├── components/
├── pages/
├── hooks/
├── services/
├── types/
└── utils/
```

### Current Structure
Now uses tool-based modules:
```
src/
├── core/
├── shared/
├── tools/
├── admin/
└── theme/
```

### Why We Changed
1. **Scalability** - Flat structure doesn't scale with multiple tools
2. **Ownership** - Hard to know who owns what code
3. **Dependencies** - Easy to create tangled dependencies
4. **Evaluation** - Can't evaluate tools independently

---

**Questions?** Refer to:
- `CODING_STANDARDS.md` for code conventions
- `CLAUDE.md` for overall project guide
- `COBRA_STYLING_INTEGRATION.md` for styling

**Last Updated:** 2025-12-01
