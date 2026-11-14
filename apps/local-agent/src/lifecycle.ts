import fs from 'node:fs';
import {
  GLOBAL_KAVACH_DIR,
  GLOBAL_PID_FILE,
  GLOBAL_TOKEN_FILE,
  GLOBAL_LOCK_FILE,
} from '../../../packages/shared/src/constants.js';
import { generateRandomToken } from '../../../packages/shared/src/crypto.js';

export class AgentLifecycleManager {
  private static token: string | null = null;

  public static acquireLock(): boolean {
    fs.mkdirSync(GLOBAL_KAVACH_DIR, { recursive: true, mode: 0o700 });

    // Check if another instance is actively running
    if (fs.existsSync(GLOBAL_PID_FILE)) {
      try {
        const existingPid = parseInt(fs.readFileSync(GLOBAL_PID_FILE, 'utf8').trim(), 10);
        if (!isNaN(existingPid) && existingPid !== process.pid) {
          // Check if another process is alive
          try {
            process.kill(existingPid, 0); // throws if process does not exist
            return false; // Another instance is still alive!
          } catch {
            // Process died without clean exit, clear stale PID
            fs.unlinkSync(GLOBAL_PID_FILE);
          }
        }
      } catch {}
    }

    // Write current PID
    fs.writeFileSync(GLOBAL_PID_FILE, process.pid.toString(), {
      encoding: 'utf8',
      mode: 0o600,
    });
    fs.writeFileSync(GLOBAL_LOCK_FILE, Date.now().toString(), {
      encoding: 'utf8',
      mode: 0o600,
    });

    return true;
  }

  public static initializeSessionToken(): string {
    const token = generateRandomToken(32);
    this.token = token;
    fs.writeFileSync(GLOBAL_TOKEN_FILE, token, {
      encoding: 'utf8',
      mode: 0o600, // Read/write only by owner
    });
    return token;
  }

  public static getSessionToken(): string {
    if (this.token) return this.token;
    if (fs.existsSync(GLOBAL_TOKEN_FILE)) {
      try {
        this.token = fs.readFileSync(GLOBAL_TOKEN_FILE, 'utf8').trim();
        return this.token;
      } catch {}
    }
    return '';
  }

  public static releaseLock(): void {
    try {
      if (fs.existsSync(GLOBAL_PID_FILE)) fs.unlinkSync(GLOBAL_PID_FILE);
      if (fs.existsSync(GLOBAL_TOKEN_FILE)) fs.unlinkSync(GLOBAL_TOKEN_FILE);
      if (fs.existsSync(GLOBAL_LOCK_FILE)) fs.unlinkSync(GLOBAL_LOCK_FILE);
    } catch {}
  }

  public static isRunning(): { running: boolean; pid?: number } {
    if (!fs.existsSync(GLOBAL_PID_FILE)) return { running: false };
    try {
      const pidStr = fs.readFileSync(GLOBAL_PID_FILE, 'utf8').trim();
      const pid = parseInt(pidStr, 10);
      if (isNaN(pid)) return { running: false };

      process.kill(pid, 0); // Throws if not running
      return { running: true, pid };
    } catch {
      return { running: false };
    }
  }
}
