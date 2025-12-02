// Global using directives for CobraAPI.Tests
// These provide common imports from the main project

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
