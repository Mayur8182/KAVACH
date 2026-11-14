import os from 'node:os';
import path from 'node:path';
import { SQLiteStorage } from '../../../packages/storage/src/sqlite-db.js';
import { ProjectStore } from '../../../packages/storage/src/project-store.js';
import { EventQueueStore } from '../../../packages/storage/src/event-queue.js';
import { globalConfigManager } from '../../../packages/config/src/global-config.js';
import { ProjectConfigManager } from '../../../packages/config/src/project-config.js';
import { ProjectDetector } from '../../../packages/project-manager/src/detector.js';
import { KavachFileWatcher } from '../../../packages/file-watcher/src/index.js';
import { CloudSyncWorker } from './cloud-sync.js';
import { IPCServer } from './ipc-server.js';
import { AgentLifecycleManager } from './lifecycle.js';
import { Logger } from '../../../packages/shared/src/logger.js';
import {
  AGENT_VERSION,
  PROTOCOL_VERSION,
  DEFAULT_AGENT_PORT,
} from '../../../packages/shared/src/constants.js';
import type {
  AgentHealthResponse,
  AgentStatus,
  FileEvent,
  ProjectMetadata,
  GlobalConfig,
} from '../../../packages/shared/src/types.js';

export class LocalAgentCore {
  private status: AgentStatus = 'STARTING';
  private startTime: number = Date.now();
  private storage: SQLiteStorage;
  private projectStore: ProjectStore;
  private eventQueue: EventQueueStore;
  private watchers: Map<string, KavachFileWatcher> = new Map();
  private cloudSync: CloudSyncWorker;
  private ipcServer: IPCServer;
  private logger: Logger;
  private port: number;

  constructor(port: number = DEFAULT_AGENT_PORT, logger: Logger) {
    this.port = port;
    this.logger = logger;

    this.storage = new SQLiteStorage();
    this.projectStore = new ProjectStore(this.storage);
    this.eventQueue = new EventQueueStore(this.storage);

    const config = globalConfigManager.get();
    this.cloudSync = new CloudSyncWorker(this.eventQueue, config.cloudUrl, this.logger);
    this.ipcServer = new IPCServer(this, this.port, '127.0.0.1', this.logger);
  }

  public async start(): Promise<void> {
    this.logger.info(`Starting Kavach Local Agent Core v${AGENT_VERSION}...`);

    // 1. Single instance check and PID lock
    if (!AgentLifecycleManager.acquireLock()) {
      throw new Error('Another instance of Kavach Local Agent is already running.');
    }

    // 2. Initialize session token
    const token = AgentLifecycleManager.initializeSessionToken();
    this.logger.info(`Agent session token initialized.`);

    // 3. Start IPC server
    await this.ipcServer.start();

    // 4. Load registered projects and attach file watchers
    const projects = this.projectStore.list();
    this.logger.info(`Discovered ${projects.length} registered projects in local database.`);
    for (const proj of projects) {
      this.attachWatcherForProject(proj);
    }

    // 5. Start background cloud synchronization worker
    this.cloudSync.start();

    // 6. Set status
    this.status = 'RUNNING';
    this.logger.info(`Kavach Local Agent is RUNNING (PID: ${process.pid}, Port: ${this.port})`);

    // Handle OS termination signals
    process.on('SIGTERM', () => this.shutdown());
    process.on('SIGINT', () => this.shutdown());
  }

  public attachWatcherForProject(project: ProjectMetadata): void {
    if (this.watchers.has(project.rootPath)) return;

    try {
      const watcher = new KavachFileWatcher({
        projectRoot: project.rootPath,
        projectName: project.name,
        projectId: project.id,
        debounceMs: 500,
        onEvent: (event: FileEvent) => {
          this.handleFileEvent(event);
        },
      });

      watcher.start();
      this.watchers.set(project.rootPath, watcher);
      this.logger.info(`Active file-watcher attached to project: ${project.name} (${project.rootPath})`);
    } catch (err: any) {
      this.logger.error(`Failed to attach watcher to ${project.name}: ${err.message}`);
    }
  }

  private handleFileEvent(event: FileEvent): void {
    // 1. Persist immediately to SQLite event queue (offline resilience)
    this.eventQueue.enqueue(event);

    // 2. Broadcast via WebSocket to connected IDEs / terminal viewers
    this.ipcServer.broadcastEvent(event);

    this.logger.debug(`File Event [${event.event}] -> ${event.file} (${event.project})`);
  }

  public async initProject(targetPath: string, customName?: string): Promise<{ project: ProjectMetadata; message: string }> {
    const rootPath = ProjectDetector.findProjectRoot(targetPath);
    const existing = this.projectStore.getByPath(rootPath);
    if (existing) {
      this.attachWatcherForProject(existing);
      return { project: existing, message: 'Project is already registered.' };
    }

    const metadata = ProjectDetector.inspectProject(rootPath);
    if (customName) {
      metadata.name = customName;
    }

    // Initialize .kavach configuration on disk
    const cfgMgr = new ProjectConfigManager(rootPath);
    cfgMgr.init(metadata.name, metadata);

    // Register into local SQLite storage
    this.projectStore.register(metadata);

    // Attach active file watcher
    this.attachWatcherForProject(metadata);

    this.logger.info(`Initialized and registered project: ${metadata.name} at ${rootPath}`);
    return { project: metadata, message: 'Project initialized and local file watcher active.' };
  }

  public listProjects(): ProjectMetadata[] {
    return this.projectStore.list();
  }

  public getProject(idOrPath: string): ProjectMetadata | null {
    return this.projectStore.getById(idOrPath) || this.projectStore.getByPath(idOrPath);
  }

  public getRecentEvents(limit: number = 20): FileEvent[] {
    return this.eventQueue.getRecentEvents(limit);
  }

  public getGlobalConfig(): GlobalConfig {
    return globalConfigManager.get();
  }

  public updateGlobalConfig(partial: Partial<GlobalConfig>): GlobalConfig {
    return globalConfigManager.save(partial);
  }

  public async getHealth(): Promise<AgentHealthResponse> {
    const mem = process.memoryUsage();
    return {
      status: this.status,
      version: AGENT_VERSION,
      protocolVersion: PROTOCOL_VERSION,
      pid: process.pid,
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
      memoryUsageMb: Math.round((mem.rss / (1024 * 1024)) * 10) / 10,
      port: this.port,
      host: '127.0.0.1',
      activeProjectsCount: this.watchers.size,
      queuedEventsCount: this.eventQueue.getPendingCount(),
      cloudConnected: this.cloudSync.isOnline(),
      cloudUrl: globalConfigManager.get().cloudUrl,
      lastHeartbeat: new Date().toISOString(),
      timestamp: new Date().toISOString(),
    };
  }

  public async getStatus(): Promise<any> {
    const health = await this.getHealth();
    const projects = this.listProjects();
    const recentEvents = this.getRecentEvents(5);

    return {
      ...health,
      projects,
      recentEvents,
      watchers: Array.from(this.watchers.keys()),
    };
  }

  public async shutdown(): Promise<void> {
    this.status = 'STOPPING';
    this.logger.info('Shutting down Kavach Local Agent...');

    this.cloudSync.stop();

    for (const [pPath, watcher] of this.watchers.entries()) {
      try {
        await watcher.stop();
      } catch {}
    }
    this.watchers.clear();

    await this.ipcServer.stop();
    this.storage.close();
    AgentLifecycleManager.releaseLock();

    this.logger.info('Kavach Local Agent shutdown completed.');
    process.exit(0);
  }
}

