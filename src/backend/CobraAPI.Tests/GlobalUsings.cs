// =============================================================================
// GlobalUsings.cs - C# 10+ Global Using Directives (Test Project)
// =============================================================================
//
// WHAT IS THIS?
// Global using directives (introduced in C# 10 / .NET 6) make namespaces
// available across ALL .cs files in this project automatically. This eliminates
// repetitive "using" statements at the top of every test file.
//
// HOW IT WORKS:
// - The "global" keyword before "using" makes the import project-wide
// - Any namespace listed here is automatically available in all test files
// - Test files can directly use types like CobraDbContext, Template, UserContext
//   without adding using statements
//
// WHY WE USE IT:
// 1. Reduces boilerplate - Test files don't need 15+ using statements each
// 2. Ensures consistency - All tests have access to the same types
// 3. Central management - One place to update when namespaces change
// 4. Cleaner tests - Focus on test logic, not import management
//
// TEST PROJECT SPECIFICS:
// - This file imports namespaces from the main CobraAPI project
// - Also imports test helpers (TestDbContextFactory, TestUserContextFactory)
// - xUnit is imported via <Using Include="Xunit"/> in .csproj
//
// WHEN TO ADD NAMESPACES HERE:
// ✅ Types used across multiple test files (entities, DTOs, services)
// ✅ Test helper utilities
// ✅ Types from the main project needed for assertions
//
// WHEN NOT TO ADD:
// ❌ Types used in only 1 test file (add local using instead)
// ❌ Mock setup types specific to one test class
//
// SEE ALSO:
// - CobraAPI/GlobalUsings.cs - Main project global usings
// - docs/BACKEND_ARCHITECTURE.md - Namespace conventions
//
// =============================================================================

// Core infrastructure
global using CobraAPI.Core.Data;
global using CobraAPI.Core.Models;
global using CobraAPI.Core.Models.Configuration;

// Shared modules
global using CobraAPI.Shared.Events.Models.Entities;
global using CobraAPI.Shared.Events.Models.DTOs;
global using CobraAPI.Shared.Events.Services;

// Admin module
global using CobraAPI.Admin.Models.Entities;

// Checklist tool
global using CobraAPI.Tools.Checklist.Models.Entities;
global using CobraAPI.Tools.Checklist.Models.DTOs;
global using CobraAPI.Tools.Checklist.Models.Enums;
global using CobraAPI.Tools.Checklist.Services;
global using CobraAPI.Tools.Checklist.Controllers;
global using CobraAPI.Tools.Checklist.Hubs;

// Chat tool
global using CobraAPI.Tools.Chat.Models.Entities;
global using CobraAPI.Tools.Chat.Models.DTOs;
global using CobraAPI.Tools.Chat.Services;
global using CobraAPI.Tools.Chat.Hubs;
global using CobraAPI.Tools.Chat.ExternalPlatforms;

// Analytics tool
global using CobraAPI.Tools.Analytics.Services;

// Test helpers
global using CobraAPI.Tests.Helpers;
