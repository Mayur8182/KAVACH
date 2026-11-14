import { SQLiteStorage } from './sqlite-db.js';
import type { FileEvent } from '../../shared/src/types.js';

export class EventQueueStore {
  private storage: SQLiteStorage;

  constructor(storage: SQLiteStorage) {
    this.storage = storage;
  }

  public enqueue(event: FileEvent): void {
    const db = this.storage.getRawDb();
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO event_queue (
        id, project_id, project_name, event_type, file_path, old_file_path,
        source, status, retry_count, sha256, size_bytes, timestamp, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)
    `);

    stmt.run(
      event.id,
      event.projectId || 'default',
      event.project,
      event.event,
      event.file,
      event.oldFile || null,
      event.source || 'filesystem',
      'queued',
      event.sha256 || null,
      event.sizeBytes || null,
      event.timestamp,
      new Date().toISOString()
    );
  }

  public getPendingEvents(limit: number = 50): FileEvent[] {
    const db = this.storage.getRawDb();
    const rows = db.prepare(`
      SELECT * FROM event_queue
      WHERE status = 'queued'
      ORDER BY timestamp ASC
      LIMIT ?
    `).all(limit) as any[];

    return rows.map((r) => ({
      id: r.id,
      event: r.event_type,
      project: r.project_name,
      projectId: r.project_id,
      file: r.file_path,
      oldFile: r.old_file_path || undefined,
      timestamp: r.timestamp,
      source: r.source,
      status: r.status,
      sha256: r.sha256 || undefined,
      sizeBytes: r.size_bytes || undefined,
    }));
  }

  public markSynced(ids: string[]): void {
    if (!ids.length) return;
    const db = this.storage.getRawDb();
    const now = new Date().toISOString();
    const placeholders = ids.map(() => '?').join(',');
    const stmt = db.prepare(`
      UPDATE event_queue
      SET status = 'synced', synced_at = ?
      WHERE id IN (${placeholders})
    `);
    stmt.run(now, ...ids);
  }

  public markFailed(id: string, error: string): void {
    const db = this.storage.getRawDb();
    const stmt = db.prepare(`
      UPDATE event_queue
      SET status = 'failed', retry_count = retry_count + 1, last_error = ?
      WHERE id = ?
    `);
    stmt.run(error, id);
  }

  public getPendingCount(): number {
    const db = this.storage.getRawDb();
    const res = db.prepare(`
      SELECT count(*) as count FROM event_queue WHERE status = 'queued'
    `).get() as { count: number };
    return res?.count || 0;
  }

  public getRecentEvents(limit: number = 20): FileEvent[] {
    const db = this.storage.getRawDb();
    const rows = db.prepare(`
      SELECT * FROM event_queue
      ORDER BY timestamp DESC
      LIMIT ?
    `).all(limit) as any[];

    return rows.map((r) => ({
      id: r.id,
      event: r.event_type,
      project: r.project_name,
      projectId: r.project_id,
      file: r.file_path,
      oldFile: r.old_file_path || undefined,
      timestamp: r.timestamp,
      source: r.source,
      status: r.status,
      sha256: r.sha256 || undefined,
      sizeBytes: r.size_bytes || undefined,
    }));
  }
}

