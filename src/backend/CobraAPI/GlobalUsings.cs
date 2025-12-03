// =============================================================================
// GlobalUsings.cs - C# 10+ Global Using Directives
// =============================================================================
//
// WHAT IS THIS?
// Global using directives (introduced in C# 10 / .NET 6) make namespaces
// available across ALL .cs files in this project automatically. This eliminates
// repetitive "using" statements at the top of every file.
//
// HOW IT WORKS:
// - The "global" keyword before "using" makes the import project-wide
// - Any namespace listed here is automatically available everywhere
// - No need to add "using CobraAPI.Core.Data;" to every service file
//
// WHY WE USE IT:
// 1. Reduces boilerplate - Files don't need 15+ using statements each
// 2. Ensures consistency - Common namespaces are always available
// 3. Central management - One place to update shared imports
// 4. Cleaner code - Service files focus on business logic, not imports
//
// WHEN TO ADD NAMESPACES HERE:
// ✅ Project-wide types (entities, DTOs, services, interfaces)
// ✅ Commonly used across many files (>5 files)
// ✅ Core infrastructure that most code depends on
//
// WHEN NOT TO ADD:
// ❌ Namespaces used in only 1-2 files (add local using instead)
// ❌ Types that could cause naming conflicts
// ❌ Third-party libraries with common type names
//
// IMPLICIT USINGS:
// Note: .NET 6+ projects with <ImplicitUsings>enable</ImplicitUsings> in .csproj
// also get automatic imports for System, System.Linq, System.Collections.Generic,
// etc. This file adds our project-specific namespaces on top of those.
//
// TROUBLESHOOTING:
// - If a type isn't found, check if its namespace is listed here
// - For conflicts, use fully qualified names: CobraAPI.Tools.Chat.Models.Entities.ChatMessage
// - IDE may need restart after modifying this file
//
// =============================================================================

// Core infrastructure
global using CobraAPI.Core.Data;
global using CobraAPI.Core.Models;
global using CobraAPI.Core.Models.Configuration;
global using CobraAPI.Core.Extensions;
global using CobraAPI.Core.Middleware;
global using CobraAPI.Core.Services;

// Shared modules
global using CobraAPI.Shared.Events.Models.Entities;
global using CobraAPI.Shared.Events.Models.DTOs;
global using CobraAPI.Shared.Events.Services;
global using CobraAPI.Shared.Positions.Models.Entities;
global using CobraAPI.Shared.Positions.Models.DTOs;
global using CobraAPI.Shared.Positions.Services;

// Admin module
global using CobraAPI.Admin.Models.Entities;
global using CobraAPI.Admin.Models;

// Checklist tool
global using CobraAPI.Tools.Checklist.Models.Entities;
global using CobraAPI.Tools.Checklist.Models.DTOs;
global using CobraAPI.Tools.Checklist.Models.Enums;
global using CobraAPI.Tools.Checklist.Services;
global using CobraAPI.Tools.Checklist.Hubs;
global using CobraAPI.Tools.Checklist.Mappers;

// Chat tool
global using CobraAPI.Tools.Chat.Models.Entities;
global using CobraAPI.Tools.Chat.Models.DTOs;
global using CobraAPI.Tools.Chat.Services;
global using CobraAPI.Tools.Chat.Hubs;
global using CobraAPI.Tools.Chat.ExternalPlatforms;

// Analytics tool
global using CobraAPI.Tools.Analytics.Models.DTOs;
global using CobraAPI.Tools.Analytics.Services;
