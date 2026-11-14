import os from 'node:os';
import type { IPlatformAdapter } from './types.js';
import { WindowsPlatformAdapter } from './windows/service.js';
import { MacOSPlatformAdapter } from './macos/service.js';
import { LinuxPlatformAdapter } from './linux/service.js';

export function getPlatformAdapter(): IPlatformAdapter {
  const platform = os.platform();
  if (platform === 'win32') {
    return new WindowsPlatformAdapter();
  }
  if (platform === 'darwin') {
    return new MacOSPlatformAdapter();
  }
  return new LinuxPlatformAdapter();
}

export * from './types.js';
export * from './windows/service.js';
export * from './macos/service.js';
export * from './linux/service.js';

