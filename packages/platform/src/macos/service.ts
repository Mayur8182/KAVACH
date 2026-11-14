import { spawn, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { IPlatformAdapter } from '../types.js';
import { GLOBAL_PID_FILE, GLOBAL_LOG_FILE } from '../../../shared/src/constants.js';

export class MacOSPlatformAdapter implements IPlatformAdapter {
  public platformName = 'macos' as const;
  private plistPath = path.join(os.homedir(), 'Library/LaunchAgents/me.kavach.agent.plist');

  public async installService(): Promise<{ success: boolean; message: string }> {
    return this.enableAutoStart();
  }

  public async uninstallService(): Promise<{ success: boolean; message: string }> {
    return this.disableAutoStart();
  }

  public async isServiceInstalled(): Promise<boolean> {
    return fs.existsSync(this.plistPath);
  }

  public async enableAutoStart(): Promise<{ success: boolean; message: string }> {
    try {
      const nodePath = process.execPath;
      const agentScript = path.resolve(__dirname, '../../../../apps/cli/dist/bin.js');
      const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>me.kavach.agent</string>
    <key>ProgramArguments</key>
    <array>
        <string>${nodePath}</string>
        <string>${agentScript}</string>
        <string>start</string>
        <string>--daemon</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>${GLOBAL_LOG_FILE}</string>
    <key>StandardErrorPath</key>
    <string>${GLOBAL_LOG_FILE}</string>
</dict>
</plist>`;

      fs.mkdirSync(path.dirname(this.plistPath), { recursive: true });
      fs.writeFileSync(this.plistPath, plistContent, 'utf8');

      try {
        execSync(`launchctl load -w "${this.plistPath}"`, { stdio: 'ignore' });
      } catch {}

      return { success: true, message: 'macOS launchd LaunchAgent registered successfully.' };
    } catch (err: any) {
      return { success: false, message: `Failed to write launchd plist: ${err.message}` };
    }
  }

  public async disableAutoStart(): Promise<{ success: boolean; message: string }> {
    try {
      if (fs.existsSync(this.plistPath)) {
        try {
          execSync(`launchctl unload -w "${this.plistPath}"`, { stdio: 'ignore' });
        } catch {}
        fs.unlinkSync(this.plistPath);
      }
      return { success: true, message: 'macOS launchd LaunchAgent removed.' };
    } catch (err: any) {
      return { success: false, message: `Error removing LaunchAgent: ${err.message}` };
    }
  }

  public spawnDetachedAgent(cliEntryPath: string, args: string[]): { pid: number } {
    const outLog = fs.openSync(GLOBAL_LOG_FILE, 'a');
    const child = spawn(process.execPath, [cliEntryPath, ...args], {
      detached: true,
      stdio: ['ignore', outLog, outLog],
      env: { ...process.env, KAVACH_DAEMON: '1' },
    });

    child.unref();

    if (!child.pid) {
      throw new Error('Failed to spawn detached background agent process on macOS.');
    }

    return { pid: child.pid };
  }
}
