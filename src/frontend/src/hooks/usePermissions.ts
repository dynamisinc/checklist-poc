/**
 * usePermissions Hook
 *
 * Provides role-based permission checks throughout the application.
 * For POC, reads from localStorage (set by ProfileMenu).
 * In production, this would read from authentication context.
 */

import { useState, useEffect } from 'react';
import { PermissionRole } from '../types';
import { useSysAdmin } from '../admin/contexts/SysAdminContext';

interface PermissionChecks {
  // Template permissions
  canCreateTemplate: boolean;
  canEditTemplate: boolean;
  canViewTemplateLibrary: boolean;
  canAccessItemLibrary: boolean;
  canViewAnalytics: boolean;

  // Checklist instance permissions
  canCreateInstance: boolean;
  canEditOwnInstance: boolean;
  canViewAllInstances: boolean;

  // Checklist item permissions
  canInteractWithItems: boolean; // Toggle completion, change status, add notes
  canEditItems: boolean; // Edit item text, add/remove items

  // Archive management permissions
  canArchiveOwnChecklists: boolean; // Contributor+ can archive their own checklists
  canArchiveAnyChecklist: boolean; // Manage role can archive any checklist
  canRestoreChecklists: boolean; // Manage role only
  canPermanentlyDeleteChecklists: boolean; // Manage role only
  canManageArchivedChecklists: boolean; // Access to archived checklists management page (Manage role)

  // System Admin permissions (customer-level configuration)
  canAccessSystemAdmin: boolean; // Access to system-level admin features
  canManageFeatureFlags: boolean; // Modify feature flags
  canManageSystemSettings: boolean; // Access system configuration

  // General
  canViewChecklists: boolean;
  isReadonly: boolean;
  isContributor: boolean;
  isManage: boolean;
  isSysAdmin: boolean;

  // Current role
  currentRole: PermissionRole;
}

/**
 * Get current user permission role from localStorage
 */
const getCurrentRole = (): PermissionRole => {
  try {
    const stored = localStorage.getItem('mockUserProfile');
    if (stored) {
      const profile = JSON.parse(stored);
      return profile.role || PermissionRole.CONTRIBUTOR;
    }
  } catch (error) {
    console.error('Failed to load user role:', error);
  }

  // Default to Contributor for POC
  return PermissionRole.CONTRIBUTOR;
};

/**
 * usePermissions Hook
 *
 * @returns Permission checks object
 */
export const usePermissions = (): PermissionChecks => {
  const [currentRole, setCurrentRole] = useState<PermissionRole>(getCurrentRole());
  const { isSysAdmin } = useSysAdmin();

  // Listen for profile changes
  useEffect(() => {
    const handleStorageChange = () => {
      setCurrentRole(getCurrentRole());
    };

    // Listen for changes to localStorage (from ProfileMenu)
    window.addEventListener('storage', handleStorageChange);

    // Also listen for custom event (for same-tab updates)
    window.addEventListener('profileChanged', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('profileChanged', handleStorageChange);
    };
  }, []);

  // Compute permission checks based on role
  const isManage = currentRole === PermissionRole.MANAGE;
  const isContributor = currentRole === PermissionRole.CONTRIBUTOR;
  const isReadonly = currentRole === PermissionRole.READONLY;

  return {
    // Template permissions
    canCreateTemplate: isManage,
    canEditTemplate: isManage,
    canViewTemplateLibrary: isManage,
    canAccessItemLibrary: isManage,
    canViewAnalytics: isManage,

    // Checklist instance permissions
    canCreateInstance: isContributor || isManage,
    canEditOwnInstance: isContributor || isManage,
    canViewAllInstances: isManage,

    // Checklist item permissions
    canInteractWithItems: isContributor || isManage,
    canEditItems: isManage,

    // Archive management permissions
    canArchiveOwnChecklists: isContributor || isManage, // Contributors can archive their own
    canArchiveAnyChecklist: isManage, // Manage can archive any
    canRestoreChecklists: isManage,
    canPermanentlyDeleteChecklists: isManage,
    canManageArchivedChecklists: isManage,

    // System Admin permissions (requires SysAdmin authentication)
    canAccessSystemAdmin: isSysAdmin,
    canManageFeatureFlags: isSysAdmin,
    canManageSystemSettings: isSysAdmin,

    // General
    canViewChecklists: isReadonly || isContributor || isManage,
    isReadonly,
    isContributor,
    isManage,
    isSysAdmin,

    // Current role
    currentRole,
  };
};

/**
 * Trigger profile change event (for same-tab updates)
 * Call this after updating localStorage in ProfileMenu
 */
export const triggerProfileChange = () => {
  window.dispatchEvent(new Event('profileChanged'));
};
