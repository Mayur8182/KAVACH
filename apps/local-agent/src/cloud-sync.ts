import type { EventQueueStore } from '../../../packages/storage/src/event-queue.js';
import { CredentialStore } from '../../../packages/auth/src/credential-store.js';
import { Logger } from '../../../packages/shared/src/logger.js';

export class CloudSyncWorker {
  private queue: EventQueueStore;
  private cloudUrl: string;
  private logger: Logger;
  private intervalTimer: NodeJS.Timeout | null = null;
  private isSyncing: boolean = false;
  private backoffMs: number = 5000;
  private maxBackoffMs: number = 60000;

  constructor(queue: EventQueueStore, cloudUrl: string, logger: Logger) {
    this.queue = queue;
    this.cloudUrl = cloudUrl.replace(/\/+$/, '');
    this.logger = logger;
  }

  public start(intervalMs: number = 10000): void {
    if (this.intervalTimer) return;
    this.intervalTimer = setInterval(() => {
      this.syncPending();
    }, intervalMs);
    // Initial sync trigger
    this.syncPending();
  }

  public stop(): void {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
  }

  public async syncPending(): Promise<void> {
    if (this.isSyncing) return;
    this.isSyncing = true;

    try {
      const pending = this.queue.getPendingEvents(25);
      if (pending.length === 0) {
        this.isSyncing = false;
        this.backoffMs = 5000;
        return;
      }

      const creds = CredentialStore.load();
      if (!creds || !creds.accessToken) {
        // Offline / not authenticated with cloud yet. Safe local queue retention.
        this.isSyncing = false;
        return;
      }

      // Sync event metadata batch to cloud
      const endpoint = `${this.cloudUrl}/api/v1/cli/events/batch`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${creds.accessToken}`,
          'X-Kavach-Device-ID': creds.deviceId,
        },
        body: JSON.stringify({
          events: pending.map((e) => ({
            id: e.id,
            event: e.event,
            project: e.project,
            file: e.file,
            timestamp: e.timestamp,
            size_bytes: e.sizeBytes,
            sha256: e.sha256,
          })),
        }),
      });

      if (response.ok) {
        const syncedIds = pending.map((e) => e.id);
        this.queue.markSynced(syncedIds);
        this.logger.info(`Successfully synced ${syncedIds.length} file events with Kavach Cloud`);
        this.backoffMs = 5000;
      } else {
        // Cloud rejected or unavailable
        this.logger.debug(`Cloud sync HTTP ${response.status}; backing off`);
        this.backoffMs = Math.min(this.backoffMs * 1.5, this.maxBackoffMs);
      }
    } catch (err: any) {
      // Network offline, keep events safely in local SQLite queue
      this.logger.debug(`Network offline: file events retained in local SQLite queue`);
      this.backoffMs = Math.min(this.backoffMs * 2, this.maxBackoffMs);
    } finally {
      this.isSyncing = false;
    }
  }

  public isOnline(): boolean {
    return this.backoffMs === 5000;
  }
}

