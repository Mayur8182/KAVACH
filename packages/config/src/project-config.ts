import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { z } from 'zod';
import {
  PROJECT_KAVACH_DIR,
  PROJECT_CONFIG_FILE,
  PROJECT_METADATA_FILE,
  PROJECT_IGNORE_FILE,
  PROJECT_POLICIES_DIR,
  PROJECT_STATE_DIR,
  DEFAULT_DEBOUNCE_MS,
} from '../../shared/src/constants.js';
import type { ProjectConfig, ProjectMetadata } from '../../shared/src/types.js';

export const ProjectConfigSchema = z.object({
  version: z.number().default(1),
  project: z.object({
    name: z.string().min(1),
    auto_detect: z.boolean().default(true),
    id: z.string().optional(),
  }),
  agent: z.object({
    enabled: z.boolean().default(true),
    monitoring: z.object({
      enabled: z.boolean().default(true),
      debounce_ms: z.number().default(DEFAULT_DEBOUNCE_MS),
    }),
    scanning: z.object({
      enabled: z.boolean().default(false), // Note: scanning.enabled remains false until Phase 3
      mode: z.enum(['incremental', 'full']).default('incremental'),
    }),
    privacy: z.object({
      local_first: z.boolean().default(true),
      upload_source_code: z.boolean().default(false),
    }),
  }),
});

export class ProjectConfigManager {
  private projectRoot: string;
  private kavachDir: string;
  private configFile: string;
  private metadataFile: string;
  private ignoreFile: string;

  constructor(projectRoot: string) {
    this.projectRoot = path.resolve(projectRoot);
    this.kavachDir = path.join(this.projectRoot, PROJECT_KAVACH_DIR);
    this.configFile = path.join(this.kavachDir, PROJECT_CONFIG_FILE);
    this.metadataFile = path.join(this.kavachDir, PROJECT_METADATA_FILE);
    this.ignoreFile = path.join(this.kavachDir, PROJECT_IGNORE_FILE);
  }

  public isInitialized(): boolean {
    return fs.existsSync(this.kavachDir) && fs.existsSync(this.configFile);
  }

  public init(projectName: string, initialMetadata?: Partial<ProjectMetadata>): ProjectConfig {
    fs.mkdirSync(this.kavachDir, { recursive: true });
    fs.mkdirSync(path.join(this.kavachDir, PROJECT_POLICIES_DIR), { recursive: true });
    fs.mkdirSync(path.join(this.kavachDir, PROJECT_STATE_DIR), { recursive: true });

    const defaultConfig: ProjectConfig = {
      version: 1,
      project: {
        name: projectName,
        auto_detect: true,
        id: initialMetadata?.id,
      },
      agent: {
        enabled: true,
        monitoring: {
          enabled: true,
          debounce_ms: 500,
        },
        scanning: {
          enabled: false,
          mode: 'incremental',
        },
        privacy: {
          local_first: true,
          upload_source_code: false,
        },
      },
    };

    const yamlStr = YAML.stringify(defaultConfig);
    fs.writeFileSync(this.configFile, yamlStr, 'utf8');

    // Default .kavach/ignore
    if (!fs.existsSync(this.ignoreFile)) {
      const defaultIgnore = `# Kavach local ignore rules (respects .gitignore by default)\n# Add paths to ignore from local file-watching\nnode_modules/\n.git/\n.next/\ndist/\nbuild/\n.venv/\n*.log\n`;
      fs.writeFileSync(this.ignoreFile, defaultIgnore, 'utf8');
    }

    // Save project metadata if provided
    if (initialMetadata) {
      this.saveMetadata(initialMetadata);
    }

    return defaultConfig;
  }

  public loadConfig(): ProjectConfig {
    if (!this.isInitialized()) {
      throw new Error(`Project at ${this.projectRoot} is not initialized. Run 'kavach init' first.`);
    }
    const raw = fs.readFileSync(this.configFile, 'utf8');
    const parsed = YAML.parse(raw);
    return ProjectConfigSchema.parse(parsed) as ProjectConfig;
  }

  public saveConfig(config: ProjectConfig): void {
    const validated = ProjectConfigSchema.parse(config);
    fs.writeFileSync(this.configFile, YAML.stringify(validated), 'utf8');
  }

  public loadMetadata(): ProjectMetadata | null {
    if (fs.existsSync(this.metadataFile)) {
      try {
        const raw = fs.readFileSync(this.metadataFile, 'utf8');
        return JSON.parse(raw);
      } catch {}
    }
    return null;
  }

  public saveMetadata(metadata: Partial<ProjectMetadata>): void {
    const existing = this.loadMetadata() || {};
    const merged = { ...existing, ...metadata, updatedAt: new Date().toISOString() };
    fs.writeFileSync(this.metadataFile, JSON.stringify(merged, null, 2), 'utf8');
  }

  public getIgnoreRules(): string[] {
    const rules: string[] = [];
    if (fs.existsSync(this.ignoreFile)) {
      const lines = fs.readFileSync(this.ignoreFile, 'utf8').split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          rules.push(trimmed);
        }
      }
    }
    return rules;
  }
}

