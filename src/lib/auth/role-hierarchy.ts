/**
 * Role Hierarchy and Permissions System
 * 
 * Role Hierarchy (highest to lowest):
 * 1. OWNER - Highest level, has all privileges
 * 2. ADMIN - Has admin privileges + can manage users/content
 * 3. MODERATOR - Can moderate content and users
 * 4. USER - Basic user privileges
 */

export type Role = 'user' | 'moderator' | 'admin' | 'owner';

export interface RolePermissions {
  // User management
  canManageUsers: boolean;
  canDeleteUsers: boolean;
  canPromoteUsers: boolean;
  canDemoteUsers: boolean;
  
  // Content management
  canManageContent: boolean;
  canDeleteContent: boolean;
  canModerateContent: boolean;
  
  // System management
  canAccessAdminPanel: boolean;
  canManageSystemSettings: boolean;
  canViewAnalytics: boolean;
  canManageDatabase: boolean;
  
  // Owner-specific
  canManageOwners: boolean;
  canAccessOwnerPanel: boolean;
  canManageBilling: boolean;
  canDeleteEverything: boolean;
}

// Role hierarchy levels (higher number = more privileges)
export const ROLE_LEVELS: Record<Role, number> = {
  user: 1,
  moderator: 2,
  admin: 3,
  owner: 4,
};

// Role permissions matrix
export const ROLE_PERMISSIONS: Record<Role, RolePermissions> = {
  user: {
    canManageUsers: false,
    canDeleteUsers: false,
    canPromoteUsers: false,
    canDemoteUsers: false,
    canManageContent: false,
    canDeleteContent: false,
    canModerateContent: false,
    canAccessAdminPanel: false,
    canManageSystemSettings: false,
    canViewAnalytics: false,
    canManageDatabase: false,
    canManageOwners: false,
    canAccessOwnerPanel: false,
    canManageBilling: false,
    canDeleteEverything: false,
  },
  
  moderator: {
    canManageUsers: false,
    canDeleteUsers: false,
    canPromoteUsers: false,
    canDemoteUsers: false,
    canManageContent: true,
    canDeleteContent: false,
    canModerateContent: true,
    canAccessAdminPanel: false,
    canManageSystemSettings: false,
    canViewAnalytics: false,
    canManageDatabase: false,
    canManageOwners: false,
    canAccessOwnerPanel: false,
    canManageBilling: false,
    canDeleteEverything: false,
  },
  
  admin: {
    canManageUsers: true,
    canDeleteUsers: true,
    canPromoteUsers: true,
    canDemoteUsers: true,
    canManageContent: true,
    canDeleteContent: true,
    canModerateContent: true,
    canAccessAdminPanel: true,
    canManageSystemSettings: true,
    canViewAnalytics: true,
    canManageDatabase: true,
    canManageOwners: false, // Admins cannot manage owners
    canAccessOwnerPanel: false,
    canManageBilling: false,
    canDeleteEverything: false,
  },
  
  owner: {
    // Owner has ALL admin privileges PLUS owner-specific privileges
    canManageUsers: true,
    canDeleteUsers: true,
    canPromoteUsers: true,
    canDemoteUsers: true,
    canManageContent: true,
    canDeleteContent: true,
    canModerateContent: true,
    canAccessAdminPanel: true,
    canManageSystemSettings: true,
    canViewAnalytics: true,
    canManageDatabase: true,
    
    // Owner-specific privileges
    canManageOwners: true,
    canAccessOwnerPanel: true,
    canManageBilling: true,
    canDeleteEverything: true,
  },
};

/**
 * Get permissions for a role
 */
export function getRolePermissions(role: Role): RolePermissions {
  return ROLE_PERMISSIONS[role];
}

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: Role, permission: keyof RolePermissions): boolean {
  return ROLE_PERMISSIONS[role][permission];
}

/**
 * Check if a role can perform an action on another role
 */
export function canManageRole(managerRole: Role, targetRole: Role): boolean {
  const managerLevel = ROLE_LEVELS[managerRole];
  const targetLevel = ROLE_LEVELS[targetRole];
  
  // Can only manage roles that are lower in hierarchy
  // Owners can manage everyone (including other owners)
  if (managerRole === 'owner') {
    return true;
  }
  
  return managerLevel > targetLevel;
}

/**
 * Get all roles that a manager can manage
 */
export function getManageableRoles(managerRole: Role): Role[] {
  const managerLevel = ROLE_LEVELS[managerRole];
  
  return Object.entries(ROLE_LEVELS)
    .filter(([role, level]) => {
      if (managerRole === 'owner') {
        return true; // Owners can manage everyone
      }
      return level < managerLevel;
    })
    .map(([role]) => role as Role);
}

/**
 * Check if role is elevated (moderator or above)
 */
export function isElevatedRole(role: Role): boolean {
  return ROLE_LEVELS[role] >= ROLE_LEVELS.moderator;
}

/**
 * Check if role is admin level or above
 */
export function isAdminRole(role: Role): boolean {
  return ROLE_LEVELS[role] >= ROLE_LEVELS.admin;
}

/**
 * Check if role is owner
 */
export function isOwnerRole(role: Role): boolean {
  return role === 'owner';
}

/**
 * Get role display name with proper formatting
 */
export function getRoleDisplayName(role: Role): string {
  const displayNames: Record<Role, string> = {
    user: 'User',
    moderator: 'Moderator',
    admin: 'Administrator',
    owner: 'Owner',
  };
  
  return displayNames[role];
}

/**
 * Get role badge variant for UI
 */
export function getRoleBadgeVariant(role: Role): 'default' | 'secondary' | 'destructive' | 'outline' {
  const variants: Record<Role, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    user: 'outline',
    moderator: 'secondary',
    admin: 'default',
    owner: 'destructive',
  };
  
  return variants[role];
}

/**
 * Get role color class for UI
 */
export function getRoleColorClass(role: Role): string {
  const colorClasses: Record<Role, string> = {
    user: 'text-muted-foreground',
    moderator: 'text-blue-600',
    admin: 'text-green-600',
    owner: 'text-red-600 font-semibold',
  };
  
  return colorClasses[role];
}
