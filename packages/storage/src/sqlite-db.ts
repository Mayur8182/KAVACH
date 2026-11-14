import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { GLOBAL_DB_FILE, GLOBAL_KAVACH_DIR } from '../../shared/src/constants.js';

export class SQLiteStorage {
  private db: DatabaseSync;

  constructor(dbPath: string = GLOBAL_DB_FILE) {
    try {
      fs.mkdirSync(path.dirname(dbPath), { recursive: true, mode: 0o700 });
    } catch {}

    this.db = new DatabaseSync(dbPath);
    this.initSchema();
  }

  private initSchema(): void {
    // Enable WAL mode for high concurrency
    this.db.exec('PRAGMA journal_mode = WAL;');
    this.db.exec('PRAGMA synchronous = NORMAL;');

    // 1. Registered Projects Table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        root_path TEXT UNIQUE NOT NULL,
        git_repo INTEGER DEFAULT 0,
        git_branch TEXT,
        git_remote TEXT,
        stack_json TEXT,
        connected_cloud INTEGER DEFAULT 0,
        cloud_project_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    // 2. Persistent Event Queue Table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS event_queue (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        project_name TEXT NOT NULL,
        event_type TEXT NOT NULL,
        file_path TEXT NOT NULL,
        old_file_path TEXT,
        source TEXT DEFAULT 'filesystem',
        status TEXT DEFAULT 'queued',
        retry_count INTEGER DEFAULT 0,
        last_error TEXT,
        sha256 TEXT,
        size_bytes INTEGER,
        timestamp TEXT NOT NULL,
        created_at TEXT NOT NULL,
        synced_at TEXT
      );
    `);

    // Indexes for fast queue queries
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_event_queue_status ON event_queue (status);
      CREATE INDEX IF NOT EXISTS idx_event_queue_project ON event_queue (project_id);
    `);

    // 3. Agent Runtime State KV Table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS agent_state (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
  }

  public getRawDb(): DatabaseSync {
    return this.db;
  }

  public close(): void {
    try {
      this.db.close();
    } catch {}
  }
}

