import fs from 'node:fs';
import path from 'node:path';
import {
  GLOBAL_CONFIG_FILE,
  GLOBAL_KAVACH_DIR,
  DEFAULT_AGENT_HOST,
  DEFAULT_AGENT_PORT,
  DEFAULT_CLOUD_URL,
} from '../../shared/src/constants.js';
import type { GlobalConfig } from '../../shared/src/types.js';

const DEFAULT_GLOBAL_CONFIG: GlobalConfig = {
  agentPort: DEFAULT_AGENT_PORT,
  agentHost: DEFAULT_AGENT_HOST,
  cloudUrl: DEFAULT_CLOUD_URL,
  autoStartOnLogin: true,
  logLevel: 'info',
  telemetryEnabled: false,
  checkUpdates: true,
};

export class GlobalConfigManager {
  private config: GlobalConfig;

  constructor() {
    this.config = this.load();
  }

  public load(): GlobalConfig {
    try {
      if (fs.existsSync(GLOBAL_CONFIG_FILE)) {
        const raw = fs.readFileSync(GLOBAL_CONFIG_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        return { ...DEFAULT_GLOBAL_CONFIG, ...parsed };
      }
    } catch {}
    return { ...DEFAULT_GLOBAL_CONFIG };
  }

  public save(newConfig?: Partial<GlobalConfig>): GlobalConfig {
    if (newConfig) {
      this.config = { ...this.config, ...newConfig };
    }
    try {
      fs.mkdirSync(GLOBAL_KAVACH_DIR, { recursive: true, mode: 0o700 });
      fs.writeFileSync(GLOBAL_CONFIG_FILE, JSON.stringify(this.config, null, 2), {
        encoding: 'utf8',
        mode: 0o600,
      });
    } catch (err) {
      console.error('Failed to save global config:', err);
    }
    return this.config;
  }

  public get(): GlobalConfig {
    return { ...this.config };
  }

  public set<K extends keyof GlobalConfig>(key: K, value: GlobalConfig[K]): GlobalConfig {
    this.config[key] = value;
    return this.save();
  }
}

export const globalConfigManager = new GlobalConfigManager();

