/**
 * Core Module
 *
 * Application shell components including:
 * - Navigation (AppHeader, Sidebar, Breadcrumb)
 * - Layout (AppLayout)
 * - Error handling (ErrorBoundary)
 */

// Navigation components
export { AppHeader } from './components/navigation/AppHeader';
export { AppLayout } from './components/navigation/AppLayout';
export { Sidebar } from './components/navigation/Sidebar';
export { Breadcrumb } from './components/navigation/Breadcrumb';
export type { BreadcrumbItem } from './components/navigation/Breadcrumb';

// Error handling
export { ErrorBoundary } from './components/ErrorBoundary';

// Profile
export { ProfileMenu } from './components/ProfileMenu';
