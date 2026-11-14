import fs from 'node:fs';
import { generateRandomToken } from '../../shared/src/crypto.js';
import type { FileEvent, FileEventType } from '../../shared/src/types.js';

interface PendingEvent {
  event: FileEventType;
  project: string;
  projectId?: string;
  file: string;
  absolutePath: string;
  timestamp: string;
  timer: NodeJS.Timeout;
}

export class DebounceEngine {
  private debounceMs: number;
  private pendingEvents: Map<string, PendingEvent> = new Map();
  private recentDeletions: Map<string, { timestamp: number; sizeBytes?: number }> = new Map();
  private onEmitted: (event: FileEvent) => void;

  constructor(debounceMs: number = 500, onEmitted: (event: FileEvent) => void) {
    this.debounceMs = debounceMs;
    this.onEmitted = onEmitted;
  }

  public push(
    event: FileEventType,
    project: string,
    projectId: string | undefined,
    relativePath: string,
    absolutePath: string
  ): void {
    const key = `${project}:${relativePath}`;
    const now = Date.now();

    // 1. Rename Detection Logic:
    // If a deletion occurred in the last 1500ms and now a creation happens, correlate as rename
    if (event === 'file_created') {
      for (const [deletedPath, delInfo] of this.recentDeletions.entries()) {
        if (now - delInfo.timestamp < 1500 && deletedPath !== relativePath) {
          // Detected rename: deletedPath -> relativePath
          this.recentDeletions.delete(deletedPath);
          this.emitFinalEvent({
            id: `evt_${generateRandomToken(8)}`,
            event: 'file_renamed',
            project,
            projectId,
            file: relativePath,
            oldFile: deletedPath,
            timestamp: new Date().toISOString(),
            source: 'filesystem',
            status: 'queued',
          });
          return;
        }
      }
    } else if (event === 'file_deleted') {
      this.recentDeletions.set(relativePath, { timestamp: now });
      // Clean up old deletion markers after 2 seconds
      setTimeout(() => this.recentDeletions.delete(relativePath), 2000);
    }

    // 2. Clear existing debounce timer if user is continuously modifying
    if (this.pendingEvents.has(key)) {
      const existing = this.pendingEvents.get(key)!;
      clearTimeout(existing.timer);
    }

    // 3. Set new debounced timer
    const timer = setTimeout(() => {
      this.flush(key);
    }, this.debounceMs);

    this.pendingEvents.set(key, {
      event,
      project,
      projectId,
      file: relativePath,
      absolutePath,
      timestamp: new Date().toISOString(),
      timer,
    });
  }

  private flush(key: string): void {
    const item = this.pendingEvents.get(key);
    if (!item) return;
    this.pendingEvents.delete(key);

    let sizeBytes: number | undefined;
    if (item.event !== 'file_deleted' && item.event !== 'dir_deleted') {
      try {
        if (fs.existsSync(item.absolutePath)) {
          sizeBytes = fs.statSync(item.absolutePath).size;
        }
      } catch {}
    }

    this.emitFinalEvent({
      id: `evt_${generateRandomToken(8)}`,
      event: item.event,
      project: item.project,
      projectId: item.projectId,
      file: item.file,
      timestamp: item.timestamp,
      source: 'filesystem',
      status: 'queued',
      sizeBytes,
    });
  }

  private emitFinalEvent(event: FileEvent): void {
    this.onEmitted(event);
  }

  public clear(): void {
    for (const item of this.pendingEvents.values()) {
      clearTimeout(item.timer);
    }
    this.pendingEvents.clear();
    this.recentDeletions.clear();
  }
}

