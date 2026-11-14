import { spawn, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import type { IPlatformAdapter } from '../types.js';
import { GLOBAL_PID_FILE, GLOBAL_LOG_FILE } from '../../../shared/src/constants.js';

export class WindowsPlatformAdapter implements IPlatformAdapter {
  public platformName = 'windows' as const;

  public async installService(): Promise<{ success: boolean; message: string }> {
    return this.enableAutoStart();
  }

  public async uninstallService(): Promise<{ success: boolean; message: string }> {
    return this.disableAutoStart();
  }

  public async isServiceInstalled(): Promise<boolean> {
    try {
      const out = execSync(
        'reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v KavachLocalAgent',
        { stdio: ['ignore', 'pipe', 'ignore'] }
      ).toString();
      return out.includes('KavachLocalAgent');
    } catch {
      return false;
    }
  }

  public async enableAutoStart(): Promise<{ success: boolean; message: string }> {
    try {
      const nodePath = process.execPath;
      const agentScript = path.resolve(__dirname, '../../../../apps/cli/dist/bin.js');
      const command = `\\"${nodePath}\\" \\"${agentScript}\\" start --daemon`;

      execSync(
        `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v KavachLocalAgent /t REG_SZ /d "${command}" /f`,
        { stdio: 'ignore' }
      );
      return { success: true, message: 'Windows startup registry entry configured successfully.' };
    } catch (err: any) {
      return { success: false, message: `Failed to register startup key: ${err.message}` };
    }
  }

  public async disableAutoStart(): Promise<{ success: boolean; message: string }> {
    try {
      execSync(
        'reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v KavachLocalAgent /f',
        { stdio: 'ignore' }
      );
      return { success: true, message: 'Windows startup registry entry removed successfully.' };
    } catch (err: any) {
      return { success: false, message: `Startup entry already absent or error: ${err.message}` };
    }
  }

  public spawnDetachedAgent(cliEntryPath: string, args: string[]): { pid: number } {
    const outLog = fs.openSync(GLOBAL_LOG_FILE, 'a');
    const child = spawn(process.execPath, [cliEntryPath, ...args], {
      detached: true,
      stdio: ['ignore', outLog, outLog],
      windowsHide: true,
      env: { ...process.env, KAVACH_DAEMON: '1' },
    });

    child.unref();

    if (!child.pid) {
      throw new Error('Failed to spawn detached background agent process on Windows.');
    }

    return { pid: child.pid };
  }
}
