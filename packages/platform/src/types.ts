export interface IPlatformAdapter {
  platformName: 'windows' | 'macos' | 'linux';
  installService(): Promise<{ success: boolean; message: string }>;
  uninstallService(): Promise<{ success: boolean; message: string }>;
  isServiceInstalled(): Promise<boolean>;
  enableAutoStart(): Promise<{ success: boolean; message: string }>;
  disableAutoStart(): Promise<{ success: boolean; message: string }>;
  spawnDetachedAgent(cliEntryPath: string, args: string[]): { pid: number };
}

