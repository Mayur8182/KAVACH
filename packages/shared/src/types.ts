export type AgentStatus =
  | 'INSTALLED'
  | 'STOPPED'
  | 'STARTING'
  | 'RUNNING'
  | 'DEGRADED'
  | 'ERROR'
  | 'STOPPING';

export type FileEventType =
  | 'file_created'
  | 'file_modified'
  | 'file_deleted'
  | 'file_renamed'
  | 'dir_created'
  | 'dir_deleted';

export interface FileEvent {
  id: string;
  event: FileEventType;
  project: string;
  projectId?: string;
  file: string;
  oldFile?: string;
  timestamp: string;
  source: 'filesystem' | 'git' | 'reconciliation';
  status: 'queued' | 'processing' | 'synced' | 'failed';
  sha256?: string;
  sizeBytes?: number;
}

export interface TechnologyStack {
  languages: string[];
  frameworks: string[];
  infrastructure: string[];
  packageManagers: string[];
  databases: string[];
}

export interface ProjectMetadata {
  id: string;
  name: string;
  rootPath: string;
  gitRepo: boolean;
  gitBranch?: string;
  gitRemote?: string;
  stack: TechnologyStack;
  createdAt: string;
  updatedAt: string;
  connectedCloud: boolean;
  cloudProjectId?: string;
  cloudOrganizationId?: string;
}

export interface ProjectConfig {
  version: number;
  project: {
    name: string;
    auto_detect: boolean;
    id?: string;
  };
  agent: {
    enabled: boolean;
    monitoring: {
      enabled: boolean;
      debounce_ms: number;
    };
    scanning: {
      enabled: boolean;
      mode: 'incremental' | 'full';
    };
    privacy: {
      local_first: boolean;
      upload_source_code: boolean;
    };
  };
}

export interface GlobalConfig {
  agentPort: number;
  agentHost: string;
  cloudUrl: string;
  autoStartOnLogin: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  telemetryEnabled: boolean;
  checkUpdates: boolean;
  deviceId?: string;
}

export interface AuthCredentials {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  user: {
    id: string;
    email: string;
    name?: string;
    organizationId?: string;
    organizationName?: string;
  };
  deviceId: string;
  authenticatedAt: string;
}

export interface AgentHealthResponse {
  status: AgentStatus;
  version: string;
  protocolVersion: number;
  pid: number;
  uptimeSeconds: number;
  memoryUsageMb: number;
  port: number;
  host: string;
  activeProjectsCount: number;
  queuedEventsCount: number;
  cloudConnected: boolean;
  cloudUrl: string;
  lastHeartbeat: string;
  timestamp: string;
}

