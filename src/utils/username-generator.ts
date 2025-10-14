/**
 * Username generation utilities for creating unique @handles
 */

/**
 * Generate a random username with format: user_[random6chars]
 * Example: user_x7f3a, user_k9m2p, user_z4n8q
 */
export function generateUsername(): string {
  const randomChars = Math.random().toString(36).slice(2, 8);
  return `user_${randomChars}`;
}

/**
 * Generate a username with a specific prefix
 * Example: generateUsernameWithPrefix('admin') -> admin_x7f3a
 */
export function generateUsernameWithPrefix(prefix: string): string {
  const randomChars = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${randomChars}`;
}

/**
 * Validate username format
 * Rules:
 * - 3-30 characters
 * - Can contain letters, numbers, underscores
 * - Must start with letter
 * - No spaces or special characters
 */
export function validateUsername(username: string): { valid: boolean; error?: string } {
  if (!username) {
    return { valid: false, error: 'Username is required' };
  }

  if (username.length < 3) {
    return { valid: false, error: 'Username must be at least 3 characters' };
  }

  if (username.length > 30) {
    return { valid: false, error: 'Username must be less than 30 characters' };
  }

  if (!/^[a-zA-Z]/.test(username)) {
    return { valid: false, error: 'Username must start with a letter' };
  }

  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return { valid: false, error: 'Username can only contain letters, numbers, and underscores' };
  }

  return { valid: true };
}

/**
 * Format username for display (add @ prefix if not present)
 */
export function formatUsername(username: string): string {
  if (!username) return '';
  return username.startsWith('@') ? username : `@${username}`;
}

/**
 * Extract username from @handle format
 */
export function extractUsername(handle: string): string {
  if (!handle) return '';
  return handle.startsWith('@') ? handle.slice(1) : handle;
}
