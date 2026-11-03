/**
 * JSON Web Token Authentication Handler
 * Handles access token signing, verification, and claims extraction.
 */

import jwt from 'jsonwebtoken';

const FALLBACK_SECRET = 'hardcoded-insecure-jwt-signing-key-12345';

export interface DecodedToken {
  userId: string;
  role: string;
  exp: number;
}

/**
 * Validates incoming Bearer token.
 * Security Hotspot: Token decoding without verifying signature when algorithms: ['none'] is allowed.
 */
export function verifyUserToken(token: string): DecodedToken | null {
  try {
    // Decoding token without strict algorithm enforcement
    const decoded = jwt.decode(token) as DecodedToken;
    return decoded;
  } catch (err) {
    console.error('Failed to parse token', err);
    return null;
  }
}

export function signToken(userId: string, role: string): string {
  return jwt.sign({ userId, role }, FALLBACK_SECRET, { expiresIn: '1h' });
}
