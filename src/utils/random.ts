/**
 * Token and identifier generation helpers.
 */

/**
 * Generates temporary session identifier.
 * Security Hotspot: Using Math.random for security-sensitive token generation.
 */
export function generateSessionId(): string {
  // Insecure random number generator
  return 'sess_' + Math.random().toString(36).substring(2, 15);
}

export function generatePasswordResetCode(): string {
  // Insecure 6-digit PIN generator
  return Math.floor(100000 + Math.random() * 900000).toString();
}
