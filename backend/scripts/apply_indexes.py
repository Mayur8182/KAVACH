"""
SecuLayer - Database Index Optimization Script
Applies verified composite indexes to eliminate table scans and temp B-tree sorts for common query patterns.
"""

import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "dev.db")

INDEXES = [
    # Security findings (heaviest filtered and sorted table)
    (
        "idx_sec_findings_status_created_id",
        "CREATE INDEX IF NOT EXISTS idx_sec_findings_status_created_id ON security_findings (status, created_at DESC, id DESC)"
    ),
    (
        "idx_sec_findings_sev_status_created_id",
        "CREATE INDEX IF NOT EXISTS idx_sec_findings_sev_status_created_id ON security_findings (severity, status, created_at DESC, id DESC)"
    ),
    (
        "idx_sec_findings_repo_created_id",
        "CREATE INDEX IF NOT EXISTS idx_sec_findings_repo_created_id ON security_findings (repository, created_at DESC, id DESC)"
    ),
    (
        "idx_sec_findings_proj_created_id",
        "CREATE INDEX IF NOT EXISTS idx_sec_findings_proj_created_id ON security_findings (project_id, created_at DESC, id DESC)"
    ),
    (
        "idx_sec_findings_created_id",
        "CREATE INDEX IF NOT EXISTS idx_sec_findings_created_id ON security_findings (created_at DESC, id DESC)"
    ),
    # Audit events
    (
        "idx_audit_events_action_ts_id",
        "CREATE INDEX IF NOT EXISTS idx_audit_events_action_ts_id ON audit_events (action, timestamp DESC, id DESC)"
    ),
    (
        "idx_audit_events_proj_ts_id",
        "CREATE INDEX IF NOT EXISTS idx_audit_events_proj_ts_id ON audit_events (project_id, timestamp DESC, id DESC)"
    ),
    (
        "idx_audit_events_ts_id",
        "CREATE INDEX IF NOT EXISTS idx_audit_events_ts_id ON audit_events (timestamp DESC, id DESC)"
    ),
    # Cloud resources and observations
    (
        "idx_cloud_res_proj_disc_id",
        "CREATE INDEX IF NOT EXISTS idx_cloud_res_proj_disc_id ON cloud_resources (project_id, discovered_at DESC, id DESC)"
    ),
    (
        "idx_cloud_res_prov_disc_id",
        "CREATE INDEX IF NOT EXISTS idx_cloud_res_prov_disc_id ON cloud_resources (provider, discovered_at DESC, id DESC)"
    ),
    (
        "idx_cloud_obs_proj_sev_status",
        "CREATE INDEX IF NOT EXISTS idx_cloud_obs_proj_sev_status ON cloud_security_observations (project_id, severity, status)"
    ),
    # Container & Kubernetes
    (
        "idx_cont_events_ts_id",
        "CREATE INDEX IF NOT EXISTS idx_cont_events_ts_id ON container_runtime_events (timestamp DESC, id DESC)"
    ),
    (
        "idx_k8s_obs_sev",
        "CREATE INDEX IF NOT EXISTS idx_k8s_obs_sev ON kubernetes_security_observations (severity)"
    ),
]

def apply_indexes():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    print(f"Applying performance indexes to {DB_PATH}...")
    for name, sql in INDEXES:
        cur.execute(sql)
        print(f"  + Applied index: {name}")
    conn.commit()
    conn.close()
    print("All indexes applied successfully.")

if __name__ == "__main__":
    apply_indexes()
