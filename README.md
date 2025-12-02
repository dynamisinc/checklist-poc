# Checklist POC

A standalone proof of concept for the COBRA Checklist Tool - enabling emergency management teams to create, manage, and collaborate on operational checklists in real-time.

## 🎯 Project Goals

This POC validates:
- **Intuitive UX** for infrequent users (minimal friction, self-explanatory interface)
- **Real-time collaboration** via SignalR
- **Position-based access control** for ICS operations
- **Template-to-instance workflow** for rapid checklist deployment
- **Audit compliance** with user attribution on all actions

## 🏗️ Architecture

```
checklist-poc/
├── src/
│   ├── frontend/                     # React + TypeScript + Material-UI 6
│   │   ├── src/
│   │   │   ├── core/                 # App-wide infrastructure
│   │   │   │   ├── components/       # ErrorBoundary, ProfileMenu
│   │   │   │   ├── services/         # api.ts (axios client)
│   │   │   │   ├── styles/           # global.css
│   │   │   │   └── utils/            # apiHealthCheck
│   │   │   │
│   │   │   ├── shared/               # Shared across tools
│   │   │   │   ├── events/           # Event management
│   │   │   │   │   ├── components/   # EventSelector
│   │   │   │   │   ├── contexts/     # EventContext
│   │   │   │   │   ├── hooks/        # useEvents
│   │   │   │   │   ├── pages/        # EventLandingPage
│   │   │   │   │   ├── services/     # eventService
│   │   │   │   │   └── types/        # Event types
│   │   │   │   └── hooks/            # usePermissions
│   │   │   │
│   │   │   ├── tools/                # Tool-specific modules
│   │   │   │   ├── checklist/        # Checklist tool
│   │   │   │   │   ├── components/   # ChecklistCard, ItemRow
│   │   │   │   │   ├── contexts/     # ChecklistContext
│   │   │   │   │   ├── hooks/        # useChecklists, useChecklistHub
│   │   │   │   │   ├── pages/        # ChecklistDetailPage
│   │   │   │   │   ├── services/     # checklistService, templateService
│   │   │   │   │   └── types/        # Checklist-specific types
│   │   │   │   └── chat/             # Chat tool
│   │   │   │       ├── components/   # EventChat
│   │   │   │       └── services/     # chatService
│   │   │   │
│   │   │   ├── admin/                # Admin features
│   │   │   │   ├── contexts/         # FeatureFlagsContext
│   │   │   │   ├── pages/            # AdminPage
│   │   │   │   └── services/         # featureFlagsService
│   │   │   │
│   │   │   ├── theme/                # COBRA MUI theme
│   │   │   │   ├── cobraTheme.ts     # COBRA standardized theme
│   │   │   │   ├── CobraStyles.ts    # Spacing constants
│   │   │   │   └── styledComponents/ # COBRA styled components
│   │   │   │
│   │   │   ├── types/                # Shared TypeScript types
│   │   │   ├── App.tsx
│   │   │   └── main.tsx
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   └── tsconfig.json
│   │
│   └── backend/                      # ASP.NET Core Web API (.NET 10)
│       ├── ChecklistAPI/
│       │   ├── Controllers/          # API endpoints
│       │   ├── Hubs/                 # SignalR hubs
│       │   ├── Models/
│       │   │   ├── Entities/         # EF Core entities
│       │   │   └── DTOs/             # Data transfer objects
│       │   ├── Services/             # Business logic layer
│       │   ├── Data/                 # EF Core DbContext
│       │   ├── Middleware/           # Mock auth, exception handling
│       │   ├── Extensions/           # DI registration helpers
│       │   └── Program.cs
│       │
│       └── ChecklistAPI.Tests/       # Unit tests
│
├── database/
│   ├── schema.sql                    # SQL Server schema
│   └── seed-templates.sql            # Sample data
│
├── docs/
│   ├── CODING_STANDARDS.md           # Code conventions
│   ├── FRONTEND_ARCHITECTURE.md      # Frontend module structure
│   ├── COBRA_STYLING_INTEGRATION.md  # COBRA styling guide
│   ├── UI_PATTERNS.md                # UX patterns and guidelines
│   └── USER-STORIES.md               # Requirements
│
├── .github/
│   └── workflows/
│       └── ci.yml                # GitHub Actions CI/CD
│
├── .gitignore
├── README.md
└── LICENSE
```

## 🎨 C5 Design System (Critical for POC)

### Colors
```typescript
// Primary palette
cobaltBlue: '#0020C2',    // Primary buttons, links
blue: '#0000FF',          // Hover state
darkBlue: '#00008B',      // Pressed state
lavaRed: '#E42217',       // Delete, errors, notifications
whiteBue: '#DBE9FA',      // Selected rows
```

### Typography
- **Font:** Roboto (all weights)
- **Headers:** Roboto Bold
- **Body:** Roboto Regular

### Button Standards
- **Minimum size:** 48x48 pixels (mobile accessibility)
- **Primary:** Filled Cobalt Blue for main actions (Save, Create)
- **Secondary:** Outline for supporting actions (Cancel, Get Location)
- **Text:** Navigation and cancel only
- **Button order:** Cancel (left) → Delete (center) → Save (right)

### Icon Library
- **FontAwesome Sharp Light** (maintain consistency with COBRA)

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- .NET 8 SDK
- SQL Server 2019+ (or LocalDB for development)
- Git

### 1. Clone Repository
```bash
git clone https://github.com/your-org/checklist-poc.git
cd checklist-poc
```

### 2. Database Setup
```bash
# Create database
sqlcmd -S localhost -Q "CREATE DATABASE ChecklistPOC"

# Run schema
sqlcmd -S localhost -d ChecklistPOC -i database/schema.sql

# Seed sample data
sqlcmd -S localhost -d ChecklistPOC -i database/seed-data.sql
```

### 3. Backend Setup
```bash
cd src/backend/ChecklistAPI

# Restore packages
dotnet restore

# Update connection string in appsettings.json
# "ConnectionStrings": { "DefaultConnection": "Server=localhost;Database=ChecklistPOC;Trusted_Connection=True;" }

# Run migrations (if using EF Core)
dotnet ef database update

# Run API
dotnet run
# API runs on https://localhost:5001
```

### 4. Frontend Setup
```bash
cd src/frontend

# Install dependencies
npm install

# Create .env file
echo "VITE_API_URL=https://localhost:5001" > .env

# Run development server
npm run dev
# Frontend runs on http://localhost:5173
```

### 5. Open Application
Navigate to `http://localhost:5173`

**Default Mock Users (POC):**
- Admin: `admin@cobra.mil` / Position: Incident Commander
- Ops: `ops@cobra.mil` / Position: Operations Section Chief
- Safety: `safety@cobra.mil` / Position: Safety Officer

## 📋 MVP Feature Set (POC Scope)

### Phase 1: Core Functionality
- [x] **Template Management**
  - Create/edit/view templates
  - Add checkbox and status dropdown items
  - Categorize templates (ICS Forms, Safety, Operations, etc.)
  
- [x] **Checklist Instances**
  - Create instance from template
  - View "My Checklists" filtered by position
  - Progress percentage calculation
  
- [x] **Item Interaction**
  - Toggle checkbox items
  - Update status dropdown items
  - User attribution (who/when completed)
  - Add notes to items

- [x] **Real-time Updates**
  - SignalR hub for live collaboration
  - Change notifications via badge counters
  - Optimistic UI updates

### Phase 2: UX Polish (If time permits)
- [ ] Drag-and-drop item reordering
- [ ] Keyboard shortcuts
- [ ] Mobile-responsive design
- [ ] Empty state illustrations

### Out of Scope (Future)
- Authentication (using mock middleware)
- File attachments
- Advanced analytics
- Offline mode
- Item dependencies

## 🎯 Key UX Principles for POC

### 1. **Minimize Friction for Infrequent Users**
```typescript
// ❌ BAD: Overwhelming options
<CreateChecklistForm 
  showAdvancedOptions
  requireAllFields
  multiStepWizard
/>

// ✅ GOOD: Smart defaults, progressive disclosure
<CreateChecklistForm 
  defaultEvent={currentEvent}           // Auto-detect context
  defaultPosition={currentPosition}     // Use current position
  showOptionalFields={false}            // Hide unless requested
/>
```

### 2. **Self-Explanatory Interface**
- **Clear labels:** "Create Checklist from Template" not "New Instance"
- **Contextual help:** Tooltips on hover, not separate help docs
- **Visual hierarchy:** Primary actions prominent (Cobalt Blue), secondary subtle

### 3. **Immediate Feedback**
- Toast notifications for all actions (3-5 second duration)
- Optimistic UI updates (don't wait for server)
- Progress indicators for long operations

### 4. **Forgiving Design**
- Undo last action (30-second window)
- Confirmation dialogs for destructive actions only
- Auto-save drafts (where applicable)

### 5. **Guided Workflows**
```typescript
// Empty state with clear call-to-action
<EmptyState
  icon={<FontAwesomeIcon icon="clipboard-list" />}
  title="No checklists yet"
  description="Create your first checklist to get started"
  primaryAction={{
    label: "Create Checklist",
    icon: "plus",
    onClick: handleCreateChecklist
  }}
/>
```

## 🔧 Development Guidelines

### Component Structure
```typescript
/**
 * ChecklistCard Component
 * 
 * Displays a single checklist instance with progress, last updated, and quick actions.
 * Used in: My Checklists page, Dashboard widgets
 * 
 * @param {ChecklistDto} checklist - The checklist instance data
 * @param {function} onOpen - Callback when card clicked
 * @param {function} onArchive - Callback for archive action
 */
export const ChecklistCard: React.FC<ChecklistCardProps> = ({ 
  checklist, 
  onOpen, 
  onArchive 
}) => {
  // Component implementation
};
```

### API Service Pattern
```typescript
// services/checklistService.ts
import { apiClient } from './api';
import { ChecklistDto, CreateChecklistRequest } from '../types';

export const checklistService = {
  /**
   * Fetch all checklists for the current user's position
   */
  getMyChecklists: async (): Promise<ChecklistDto[]> => {
    const response = await apiClient.get<ChecklistDto[]>('/api/checklists/my-checklists');
    return response.data;
  },

  /**
   * Create a new checklist instance from a template
   */
  createFromTemplate: async (request: CreateChecklistRequest): Promise<ChecklistDto> => {
    const response = await apiClient.post<ChecklistDto>('/api/checklists', request);
    return response.data;
  },
  
  // ... more methods
};
```

### Error Handling Pattern
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
      // Show user-friendly toast
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return { checklists, loading, error, fetchChecklists };
};
```

## 🧪 Testing Strategy

### Frontend
```bash
# Unit tests (Vitest)
npm run test

# Component tests (React Testing Library)
npm run test:components

# E2E tests (Playwright)
npm run test:e2e
```

### Backend
```bash
# Unit tests
dotnet test

# Integration tests (WebApplicationFactory)
dotnet test --filter Category=Integration

# Code coverage
dotnet test /p:CollectCoverage=true /p:CoverageReportsDirectory=./coverage
```

### Target Coverage
- **Unit tests:** 80%+ (services, utilities)
- **Integration tests:** Key workflows (create checklist, complete items, real-time sync)
- **E2E tests:** Critical paths (template to checklist, collaboration)

## 📊 Sample Data (Seed)

### Templates Included
1. **Daily Safety Briefing** (7 items)
   - Equipment check, weather brief, hazard review, etc.
   
2. **Incident Commander Initial Actions** (12 items)
   - Establish command, assess situation, request resources, etc.
   
3. **Shelter Opening Checklist** (15 items)
   - Facility inspection, supplies inventory, staff assignments, etc.
   
4. **Hurricane Prep - 72 Hours** (20 items)
   - Stage resources, coordinate evacuations, pre-position assets, etc.

### Mock Data
- 3 Events (Hurricane Laura, Training Exercise, Daily Ops)
- 2 Operational Periods per event
- 5 Positions (IC, Ops Chief, Safety Officer, Logistics Chief, Planning Chief)
- 8 Mock users across positions

## 🚢 Deployment (Azure)

### Backend
- **Azure App Service** (ASP.NET Core)
- **Azure SQL Database** (Basic tier for POC)
- **Application Insights** (monitoring)

### Frontend
- **Azure Static Web Apps** (free tier)
- **Azure CDN** (optional for performance)

### CI/CD
GitHub Actions workflow included:
- Build/test on PR
- Deploy to Azure on merge to main
- Database migrations via Azure DevOps Release Pipeline

## 📖 API Documentation

API documentation available via Swagger UI when backend running:
`https://localhost:5001/swagger`

### Key Endpoints

#### Templates
```
GET    /api/templates              - List all templates
GET    /api/templates/{id}         - Get template by ID
POST   /api/templates              - Create new template
PUT    /api/templates/{id}         - Update template
DELETE /api/templates/{id}         - Archive template
POST   /api/templates/{id}/duplicate - Duplicate template
```

#### Checklists
```
GET    /api/checklists/my-checklists  - Get user's checklists
GET    /api/checklists/{id}           - Get checklist details
POST   /api/checklists                - Create from template
PUT    /api/checklists/{id}           - Update checklist
POST   /api/checklists/{id}/archive   - Archive checklist
POST   /api/checklists/{id}/clone     - Clone checklist
```

#### Items
```
PUT    /api/checklists/{id}/items/{itemId}/complete  - Toggle completion
PUT    /api/checklists/{id}/items/{itemId}/status    - Update status
POST   /api/checklists/{id}/items/{itemId}/notes     - Add note
```

#### SignalR Hub
```
Connection: /hubs/checklist
Events:
  - ItemCompleted(checklistId, itemId, completedBy)
  - ItemStatusChanged(checklistId, itemId, newStatus, changedBy)
  - NoteAdded(checklistId, itemId, note)
  - ChecklistUpdated(checklistId)
```

## 🤝 Contributing

This is a POC project for internal evaluation. Development process:

1. Create feature branch from `main`
2. Implement feature following guidelines
3. Write tests (unit + integration)
4. Create PR with clear description
5. Review by team lead
6. Merge on approval

## 📝 License

Internal use only - COBRA Crisis Management System
© 2025 Your Organization

## 🆘 Support

Questions or issues?
- **Technical lead:** [Your Name]
- **Email:** [your.email@cobra.mil]
- **Slack:** #cobra-checklist-poc

## 🎯 Success Metrics for POC

1. **Usability** (Primary Goal)
   - Can new user create checklist from template in <2 minutes?
   - Can user complete 10 items in <1 minute?
   - Task completion rate >90% without help documentation?

2. **Performance**
   - Page load <2 seconds
   - Item completion <500ms
   - Real-time sync <1 second

3. **Stability**
   - Zero data loss during testing
   - Graceful degradation if WebSocket fails
   - Proper error messages (no stack traces to users)

## 📅 POC Timeline

- **Week 1:** Backend API + Database schema
- **Week 2:** Frontend core components + theme
- **Week 3:** Real-time features + polish
- **Week 4:** Testing + demo preparation

**Demo Date:** [Insert Date]  
**Stakeholders:** Incident Commanders, Operations Chiefs, Safety Officers, Product Owner

---

## Quick Commands Reference

```bash
# Full reset (database + dependencies)
npm run reset:all

# Start everything (backend + frontend)
npm run start:all

# Run all tests
npm run test:all

# Build production
npm run build:prod

# Check for TypeScript errors
npm run type-check

# Lint/format code
npm run lint
npm run format
```

## Environment Variables

### Frontend (.env)
```bash
VITE_API_URL=https://localhost:5001
VITE_HUB_URL=https://localhost:5001/hubs/checklist
VITE_ENABLE_MOCK_AUTH=true
```

### Backend (appsettings.json)
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Database=ChecklistPOC;Trusted_Connection=True;"
  },
  "MockAuth": {
    "Enabled": true,
    "DefaultUser": "admin@cobra.mil",
    "DefaultPosition": "Incident Commander"
  }
}
```

---

**Last Updated:** [Current Date]  
**Version:** 1.0.0-POC
