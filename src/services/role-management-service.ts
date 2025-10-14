import { Role, ROLE_PERMISSIONS, ROLE_LEVELS, canManageRole, getManageableRoles } from '@/lib/auth/role-hierarchy';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { user_roles, auth_user } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

// Database connection
function getDatabase() {
  const connectionString = process.env.NEON_DATABASE_URL;
  if (!connectionString) {
    throw new Error('NEON_DATABASE_URL environment variable is not set');
  }
  
  const client = postgres(connectionString);
  const db = drizzle(client, { schema: { user_roles, auth_user } });
  
  return { db, client };
}

export class RoleManagementService {
  /**
   * Assign a role to a user
   */
  static async assignRole(
    userId: string, 
    newRole: Role, 
    assignedBy: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { db, client } = getDatabase();
      
      // Check if the assigner has permission to assign this role
      const assignerRole = await this.getUserRole(assignedBy);
      if (!canManageRole(assignerRole, newRole)) {
        return {
          success: false,
          error: `You don't have permission to assign the ${newRole} role`
        };
      }
      
      // Deactivate any existing roles for this user
      await db.update(user_roles)
        .set({ 
          // Add an is_active field if it doesn't exist, or use a different approach
          // For now, we'll delete the old role and create a new one
        })
        .where(eq(user_roles.user_id, userId));
      
      // Delete existing role (simple approach for now)
      await db.delete(user_roles).where(eq(user_roles.user_id, userId));
      
      // Insert new role
      await db.insert(user_roles).values({
        user_id: userId,
        role: newRole,
      });
      
      await client.end();
      
      return { success: true };
    } catch (error) {
      console.error('Error assigning role:', error);
      return {
        success: false,
        error: 'Failed to assign role'
      };
    }
  }
  
  /**
   * Get user's role
   */
  static async getUserRole(userId: string): Promise<Role> {
    try {
      const { db, client } = getDatabase();
      
      const result = await db.select()
        .from(user_roles)
        .where(eq(user_roles.user_id, userId))
        .limit(1);
      
      await client.end();
      
      return result.length > 0 ? result[0].role as Role : 'user';
    } catch (error) {
      console.error('Error getting user role:', error);
      return 'user'; // Default to user role on error
    }
  }
  
  /**
   * Get all users with their roles
   */
  static async getAllUsersWithRoles(): Promise<Array<{
    id: string;
    email: string;
    display_name: string | null;
    username: string | null;
    role: Role;
  }>> {
    try {
      const { db, client } = getDatabase();
      
      const result = await db.select({
        id: auth_user.id,
        email: auth_user.email,
        display_name: auth_user.display_name,
        username: auth_user.username,
        role: user_roles.role,
      })
      .from(auth_user)
      .leftJoin(user_roles, eq(auth_user.id, user_roles.user_id));
      
      await client.end();
      
      return result.map(row => ({
        ...row,
        role: (row.role || 'user') as Role
      }));
    } catch (error) {
      console.error('Error getting users with roles:', error);
      return [];
    }
  }
  
  /**
   * Check if user has permission
   */
  static async hasPermission(userId: string, permission: keyof typeof ROLE_PERMISSIONS.user): Promise<boolean> {
    const role = await this.getUserRole(userId);
    return ROLE_PERMISSIONS[role][permission];
  }
  
  /**
   * Get roles that a user can manage
   */
  static async getManageableRolesForUser(userId: string): Promise<Role[]> {
    const userRole = await this.getUserRole(userId);
    return getManageableRoles(userRole);
  }
  
  /**
   * Promote a user to a higher role
   */
  static async promoteUser(
    userId: string, 
    newRole: Role, 
    promotedBy: string
  ): Promise<{ success: boolean; error?: string }> {
    const currentRole = await this.getUserRole(userId);
    
    // Check if it's actually a promotion
    if (ROLE_LEVELS[newRole] <= ROLE_LEVELS[currentRole]) {
      return {
        success: false,
        error: 'New role must be higher than current role'
      };
    }
    
    return this.assignRole(userId, newRole, promotedBy);
  }
  
  /**
   * Demote a user to a lower role
   */
  static async demoteUser(
    userId: string, 
    newRole: Role, 
    demotedBy: string
  ): Promise<{ success: boolean; error?: string }> {
    const currentRole = await this.getUserRole(userId);
    
    // Check if it's actually a demotion
    if (ROLE_LEVELS[newRole] >= ROLE_LEVELS[currentRole]) {
      return {
        success: false,
        error: 'New role must be lower than current role'
      };
    }
    
    return this.assignRole(userId, newRole, demotedBy);
  }
  
  /**
   * Get role statistics
   */
  static async getRoleStatistics(): Promise<Record<Role, number>> {
    try {
      const { db, client } = getDatabase();
      
      const result = await db.select({
        role: user_roles.role,
        count: user_roles.id, // We'll count this
      })
      .from(user_roles);
      
      await client.end();
      
      const stats: Record<Role, number> = {
        user: 0,
        moderator: 0,
        admin: 0,
        owner: 0,
      };
      
      result.forEach(row => {
        const role = row.role as Role;
        stats[role] = (stats[role] || 0) + 1;
      });
      
      return stats;
    } catch (error) {
      console.error('Error getting role statistics:', error);
      return {
        user: 0,
        moderator: 0,
        admin: 0,
        owner: 0,
      };
    }
  }
}
