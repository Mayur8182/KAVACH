import { spawn, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { IPlatformAdapter } from '../types.js';
import { GLOBAL_PID_FILE, GLOBAL_LOG_FILE } from '../../../shared/src/constants.js';

export class LinuxPlatformAdapter implements IPlatformAdapter {
  public platformName = 'linux' as const;
  private unitPath = path.join(os.homedir(), '.config/systemd/user/kavach-agent.service');

  public async installService(): Promise<{ success: boolean; message: string }> {
    return this.enableAutoStart();
  }

  public async uninstallService(): Promise<{ success: boolean; message: string }> {
    return this.disableAutoStart();
  }

  public async isServiceInstalled(): Promise<boolean> {
    return fs.existsSync(this.unitPath);
  }

  public async enableAutoStart(): Promise<{ success: boolean; message: string }> {
    try {
      const nodePath = process.execPath;
      const agentScript = path.resolve(__dirname, '../../../../apps/cli/dist/bin.js');
      const unitContent = `[Unit]
Description=Kavach Local Security Agent
After=network.target

[Service]
Type=simple
ExecStart=${nodePath} ${agentScript} start --daemon
Restart=on-failure
RestartSec=5s
StandardOutput=append:${GLOBAL_LOG_FILE}
StandardError=append:${GLOBAL_LOG_FILE}

[Install]
WantedBy=default.target
`;

      fs.mkdirSync(path.dirname(this.unitPath), { recursive: true });
      fs.writeFileSync(this.unitPath, unitContent, 'utf8');

      try {
        execSync('systemctl --user daemon-reload', { stdio: 'ignore' });
        execSync('systemctl --user enable kavach-agent.service', { stdio: 'ignore' });
      } catch {}

      return { success: true, message: 'Linux systemd user service registered.' };
    } catch (err: any) {
      return { success: false, message: `Failed to create systemd service: ${err.message}` };
    }
  }

  public async disableAutoStart(): Promise<{ success: boolean; message: string }> {
    try {
      if (fs.existsSync(this.unitPath)) {
        try {
          execSync('systemctl --user stop kavach-agent.service', { stdio: 'ignore' });
          execSync('systemctl --user disable kavach-agent.service', { stdio: 'ignore' });
        } catch {}
        fs.unlinkSync(this.unitPath);
      }
      return { success: true, message: 'Linux systemd user service removed.' };
    } catch (err: any) {
      return { success: false, message: `Error removing systemd service: ${err.message}` };
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
      throw new Error('Failed to spawn detached background agent process on Linux.');
    }

    return { pid: child.pid };
  }
}
