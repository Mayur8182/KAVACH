import { SQLiteStorage } from './sqlite-db.js';
import type { ProjectMetadata } from '../../shared/src/types.js';

export class ProjectStore {
  private storage: SQLiteStorage;

  constructor(storage: SQLiteStorage) {
    this.storage = storage;
  }

  public register(meta: ProjectMetadata): void {
    const db = this.storage.getRawDb();
    const stmt = db.prepare(`
      INSERT INTO projects (
        id, name, root_path, git_repo, git_branch, git_remote,
        stack_json, connected_cloud, cloud_project_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(root_path) DO UPDATE SET
        name = excluded.name,
        git_branch = excluded.git_branch,
        git_remote = excluded.git_remote,
        stack_json = excluded.stack_json,
        updated_at = excluded.updated_at;
    `);

    stmt.run(
      meta.id,
      meta.name,
      meta.rootPath,
      meta.gitRepo ? 1 : 0,
      meta.gitBranch || null,
      meta.gitRemote || null,
      JSON.stringify(meta.stack),
      meta.connectedCloud ? 1 : 0,
      meta.cloudProjectId || null,
      meta.createdAt,
      new Date().toISOString()
    );
  }

  public getByPath(rootPath: string): ProjectMetadata | null {
    const db = this.storage.getRawDb();
    const r = db.prepare(`SELECT * FROM projects WHERE root_path = ?`).get(rootPath) as any;
    if (!r) return null;
    return this.mapRow(r);
  }

  public getById(id: string): ProjectMetadata | null {
    const db = this.storage.getRawDb();
    const r = db.prepare(`SELECT * FROM projects WHERE id = ?`).get(id) as any;
    if (!r) return null;
    return this.mapRow(r);
  }

  public list(): ProjectMetadata[] {
    const db = this.storage.getRawDb();
    const rows = db.prepare(`SELECT * FROM projects ORDER BY updated_at DESC`).all() as any[];
    return rows.map((r) => this.mapRow(r));
  }

  public remove(idOrPath: string): boolean {
    const db = this.storage.getRawDb();
    const res = db.prepare(`DELETE FROM projects WHERE id = ? OR root_path = ?`).run(idOrPath, idOrPath);
    return (res.changes || 0) > 0;
  }

  public count(): number {
    const db = this.storage.getRawDb();
    const res = db.prepare(`SELECT count(*) as count FROM projects`).get() as { count: number };
    return res?.count || 0;
  }

  private mapRow(r: any): ProjectMetadata {
    return {
      id: r.id,
      name: r.name,
      rootPath: r.root_path,
      gitRepo: Boolean(r.git_repo),
      gitBranch: r.git_branch || undefined,
      gitRemote: r.git_remote || undefined,
      stack: r.stack_json ? JSON.parse(r.stack_json) : { languages: [], frameworks: [], infrastructure: [], packageManagers: [], databases: [] },
      connectedCloud: Boolean(r.connected_cloud),
      cloudProjectId: r.cloud_project_id || undefined,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }
}

