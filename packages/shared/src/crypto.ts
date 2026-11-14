import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';

/**
 * Generate a cryptographically secure random session token.
 */
export function generateRandomToken(bytes: number = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Generate PKCE code verifier and code challenge (RFC 7636).
 */
export function generatePKCE(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');
  return { codeVerifier, codeChallenge };
}

/**
 * Calculate SHA-256 hash of a file safely.
 */
export async function calculateFileSha256(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', (err) => reject(err));
  });
}

/**
 * Derives a machine-and-user-bound encryption key for the local credential store.
 * Never hardcoded; bound to hardware/user attributes.
 */
function deriveLocalMachineKey(): Buffer {
  const seed = `${os.hostname()}-${os.userInfo().username}-${os.platform()}-kavach-secure-v1`;
  return crypto.createHash('sha256').update(seed).digest();
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 */
export function encryptLocalData(plaintext: string): string {
  const key = deriveLocalMachineKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return JSON.stringify({
    iv: iv.toString('hex'),
    authTag,
    data: encrypted,
  });
}

/**
 * Decrypt AES-256-GCM data using the local machine key.
 */
export function decryptLocalData(encryptedJson: string): string {
  const { iv, authTag, data } = JSON.parse(encryptedJson);
  const key = deriveLocalMachineKey();
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  let decrypted = decipher.update(data, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

