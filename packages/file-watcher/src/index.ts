import path from 'node:path';
import fs from 'node:fs';
import chokidar, { type FSWatcher } from 'chokidar';
import { IgnoreRulesManager } from './ignore-rules.js';
import { DebounceEngine } from './debounce.js';
import type { FileEvent } from '../../shared/src/types.js';

export interface WatcherOptions {
  projectRoot: string;
  projectName: string;
  projectId?: string;
  debounceMs?: number;
  onEvent: (event: FileEvent) => void;
}

export class KavachFileWatcher {
  private projectRoot: string;
  private projectName: string;
  private projectId?: string;
  private ignoreRules: IgnoreRulesManager;
  private debounceEngine: DebounceEngine;
  private watcher: FSWatcher | null = null;
  private isRunning: boolean = false;

  constructor(options: WatcherOptions) {
    this.projectRoot = path.resolve(options.projectRoot);
    this.projectName = options.projectName;
    this.projectId = options.projectId;
    this.ignoreRules = new IgnoreRulesManager(this.projectRoot);
    this.debounceEngine = new DebounceEngine(options.debounceMs || 500, options.onEvent);
  }

  public start(): void {
    if (this.isRunning) return;

    this.ignoreRules.loadRules();

    this.watcher = chokidar.watch(this.projectRoot, {
      ignored: (filePath: string) => {
        const rel = path.relative(this.projectRoot, filePath);
        if (!rel || rel === '.') return false;
        return this.ignoreRules.shouldIgnore(rel);
      },
      persistent: true,
      ignoreInitial: true,
      followSymlinks: false,
      awaitWriteFinish: {
        stabilityThreshold: 300,
        pollInterval: 100,
      },
    });

    this.watcher
      .on('add', (filePath: string) => this.handleEvent('file_created', filePath))
      .on('change', (filePath: string) => this.handleEvent('file_modified', filePath))
      .on('unlink', (filePath: string) => this.handleEvent('file_deleted', filePath))
      .on('addDir', (dirPath: string) => this.handleEvent('dir_created', dirPath))
      .on('unlinkDir', (dirPath: string) => this.handleEvent('dir_deleted', dirPath))
      .on('error', (err: unknown) => {
        console.error(`[Watcher Error] (${this.projectName}):`, err);
      });

    this.isRunning = true;
  }

  private handleEvent(
    type: 'file_created' | 'file_modified' | 'file_deleted' | 'dir_created' | 'dir_deleted',
    absolutePath: string
  ): void {
    const rel = path.relative(this.projectRoot, absolutePath).replace(/\\/g, '/');
    if (!rel || this.ignoreRules.shouldIgnore(rel)) return;

    this.debounceEngine.push(
      type,
      this.projectName,
      this.projectId,
      rel,
      absolutePath
    );
  }

  public stop(): Promise<void> {
    this.isRunning = false;
    this.debounceEngine.clear();
    if (this.watcher) {
      return this.watcher.close().then(() => {
        this.watcher = null;
      });
    }
    return Promise.resolve();
  }

  public getStatus(): { isRunning: boolean; projectRoot: string; projectName: string } {
    return {
      isRunning: this.isRunning,
      projectRoot: this.projectRoot,
      projectName: this.projectName,
    };
  }
}

export * from './ignore-rules.js';
export * from './debounce.js';

