/**
 * User display utilities following the new identity system:
 * - display_name: primary label shown everywhere (profile header, comments, leaderboards)
 * - username: @handle for mentions/tags (randomly generated until user customizes)
 * - email: never shown publicly, only for login/notifications
 */

export interface UserIdentity {
  id: string;
  display_name?: string;
  username?: string;
  email?: string;
}

/**
 * Get the primary display name for a user
 * Priority: display_name → username → email username → "User"
 */
export function getUserDisplayName(user: UserIdentity): string {
  if (user.display_name) {
    return user.display_name;
  }
  
  if (user.username) {
    return `@${user.username}`;
  }
  
  if (user.email) {
    return user.email.split('@')[0];
  }
  
  return 'User';
}

/**
 * Get the username handle for mentions/tags
 * Returns formatted @username or empty string if not available
 */
export function getUserHandle(user: UserIdentity): string {
  if (user.username) {
    return `@${user.username}`;
  }
  return '';
}

/**
 * Get the username without @ prefix
 */
export function getRawUsername(user: UserIdentity): string {
  return user.username || '';
}

/**
 * Check if user has a custom display name (not auto-generated)
 */
export function hasCustomDisplayName(user: UserIdentity): boolean {
  return Boolean(user.display_name && user.display_name.trim());
}

/**
 * Check if user has a custom username (not auto-generated)
 */
export function hasCustomUsername(user: UserIdentity): boolean {
  return Boolean(user.username && !user.username.startsWith('user_'));
}

/**
 * Get user initials for avatar display
 * Uses display_name first, then username, then email
 */
export function getUserInitials(user: UserIdentity): string {
  const name = getUserDisplayName(user);
  
  // Remove @ prefix if present
  const cleanName = name.replace(/^@/, '');
  
  // Split by space and take first letter of each word
  const words = cleanName.split(' ').filter(word => word.length > 0);
  
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  
  if (words.length === 1) {
    const word = words[0];
    if (word.length >= 2) {
      return word.substring(0, 2).toUpperCase();
    }
    return word.toUpperCase();
  }
  
  return 'U';
}

/**
 * Get user identity summary for debugging/logging
 * Never includes email in public contexts
 */
export function getUserIdentitySummary(user: UserIdentity): string {
  const parts = [];
  
  if (user.display_name) {
    parts.push(`name:${user.display_name}`);
  }
  
  if (user.username) {
    parts.push(`handle:@${user.username}`);
  }
  
  return parts.join(' ');
}

/**
 * Validate user identity completeness
 */
export function validateUserIdentity(user: UserIdentity): { valid: boolean; missing: string[] } {
  const missing = [];
  
  if (!user.display_name) {
    missing.push('display_name');
  }
  
  if (!user.username) {
    missing.push('username');
  }
  
  return {
    valid: missing.length === 0,
    missing
  };
}
