import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import {
  GLOBAL_CREDENTIALS_FILE,
  GLOBAL_KAVACH_DIR,
} from '../../shared/src/constants.js';
import { encryptLocalData, decryptLocalData } from '../../shared/src/crypto.js';
import type { AuthCredentials } from '../../shared/src/types.js';

const SERVICE_NAME = 'kavach-security-cli';
const ACCOUNT_NAME = 'kavach-developer';

export class CredentialStore {
  /**
   * Save credentials securely using OS native store where possible,
   * falling back to user-isolated AES-256-GCM encrypted local store.
   */
  public static save(creds: AuthCredentials): void {
    const serialized = JSON.stringify(creds);
    const platform = os.platform();

    let savedToNative = false;

    if (platform === 'darwin') {
      try {
        // macOS Keychain via /usr/bin/security
        const res = spawnSync('security', [
          'add-generic-password',
          '-U',
          '-s', SERVICE_NAME,
          '-a', ACCOUNT_NAME,
          '-w', serialized,
        ]);
        if (res.status === 0) savedToNative = true;
      } catch {}
    } else if (platform === 'win32') {
      try {
        // Windows: Test cmdkey / Credential Manager integration or use DPAPI-backed encrypted store
        // We ensure encrypted fallback is always maintained as well
      } catch {}
    }

    // Always maintain the AES-256-GCM user-isolated encrypted store
    try {
      fs.mkdirSync(GLOBAL_KAVACH_DIR, { recursive: true, mode: 0o700 });
      const encrypted = encryptLocalData(serialized);
      fs.writeFileSync(GLOBAL_CREDENTIALS_FILE, encrypted, {
        encoding: 'utf8',
        mode: 0o600, // Read/Write for owner only
      });
    } catch (err) {
      console.error('Failed to write encrypted credentials:', err);
    }
  }

  /**
   * Load credentials from native store or encrypted fallback.
   */
  public static load(): AuthCredentials | null {
    const platform = os.platform();

    if (platform === 'darwin') {
      try {
        const res = spawnSync('security', [
          'find-generic-password',
          '-s', SERVICE_NAME,
          '-a', ACCOUNT_NAME,
          '-w',
        ]);
        if (res.status === 0 && res.stdout) {
          const raw = res.stdout.toString().trim();
          if (raw) return JSON.parse(raw);
        }
      } catch {}
    }

    // Read from AES-256-GCM encrypted store
    if (fs.existsSync(GLOBAL_CREDENTIALS_FILE)) {
      try {
        const raw = fs.readFileSync(GLOBAL_CREDENTIALS_FILE, 'utf8');
        const decrypted = decryptLocalData(raw);
        return JSON.parse(decrypted);
      } catch (err) {
        // Corrupted or machine key mismatch
        return null;
      }
    }

    return null;
  }

  /**
   * Remove credentials on logout.
   */
  public static clear(): void {
    const platform = os.platform();

    if (platform === 'darwin') {
      try {
        spawnSync('security', [
          'delete-generic-password',
          '-s', SERVICE_NAME,
          '-a', ACCOUNT_NAME,
        ]);
      } catch {}
    }

    try {
      if (fs.existsSync(GLOBAL_CREDENTIALS_FILE)) {
        fs.unlinkSync(GLOBAL_CREDENTIALS_FILE);
      }
    } catch {}
  }

  public static hasValidCredentials(): boolean {
    const creds = this.load();
    if (!creds || !creds.accessToken) return false;
    // Check expiration (if expiresAt timestamp is in the future)
    if (creds.expiresAt && Date.now() > creds.expiresAt) {
      return false; // Expired
    }
    return true;
  }
}

