import os from 'node:os';
import path from 'node:path';

export const CLI_NAME = 'kavach';
export const CLI_VERSION = '1.0.0';
export const AGENT_VERSION = '1.0.0';
export const PROTOCOL_VERSION = 1;
export const CONFIG_SCHEMA_VERSION = 1;

export const DEFAULT_AGENT_HOST = '127.0.0.1';
export const DEFAULT_AGENT_PORT = 17382;
export const DEFAULT_CLOUD_URL = process.env.KAVACH_CLOUD_URL || 'https://kavachsecurity.me';

// Global user directory: ~/.kavach
export const GLOBAL_KAVACH_DIR = path.join(os.homedir(), '.kavach');
export const GLOBAL_CONFIG_FILE = path.join(GLOBAL_KAVACH_DIR, 'config.json');
export const GLOBAL_DB_FILE = path.join(GLOBAL_KAVACH_DIR, 'agent.db');
export const GLOBAL_PID_FILE = path.join(GLOBAL_KAVACH_DIR, 'agent.pid');
export const GLOBAL_TOKEN_FILE = path.join(GLOBAL_KAVACH_DIR, 'agent.token');
export const GLOBAL_LOCK_FILE = path.join(GLOBAL_KAVACH_DIR, 'agent.lock');
export const GLOBAL_LOGS_DIR = path.join(GLOBAL_KAVACH_DIR, 'logs');
export const GLOBAL_LOG_FILE = path.join(GLOBAL_LOGS_DIR, 'agent.log');
export const GLOBAL_CREDENTIALS_FILE = path.join(GLOBAL_KAVACH_DIR, 'credentials.enc');

// Project-local directory: .kavach
export const PROJECT_KAVACH_DIR = '.kavach';
export const PROJECT_CONFIG_FILE = 'config.yaml';
export const PROJECT_METADATA_FILE = 'project.json';
export const PROJECT_IGNORE_FILE = 'ignore';
export const PROJECT_POLICIES_DIR = 'policies';
export const PROJECT_STATE_DIR = 'state';

// Default debounce window
export const DEFAULT_DEBOUNCE_MS = 500;
export const DEFAULT_FILE_STABILITY_MS = 300;

// Standard ignore patterns for watching
export const DEFAULT_IGNORED_PATTERNS = [
  '**/.git/**',
  '**/node_modules/**',
  '**/.next/**',
  '**/dist/**',
  '**/build/**',
  '**/.venv/**',
  '**/venv/**',
  '**/vendor/**',
  '**/.idea/**',
  '**/.vscode/**',
  '**/*.pyc',
  '**/*.class',
  '**/*.exe',
  '**/*.dll',
  '**/*.so',
  '**/*.dylib',
  '**/*.zip',
  '**/*.tar.gz',
  '**/*.png',
  '**/*.jpg',
  '**/*.jpeg',
  '**/*.ico',
  '**/*.svg',
  '**/*.woff*',
  '**/.DS_Store',
  '**/thumbs.db',
];

