import sqlite3
import uuid
import os
from datetime import datetime, timezone

def seed_schedules():
    db_path = 'dev.db' if os.path.exists('dev.db') else ('backend/dev.db' if os.path.exists('backend/dev.db') else os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'dev.db')))
    print(f"Connecting to {db_path}...")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Create security_job_schedules table if not exists
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS security_job_schedules (
            id VARCHAR(36) PRIMARY KEY,
            project_id VARCHAR(36),
            repository_id VARCHAR(36),
            name VARCHAR(120) NOT NULL,
            scan_type VARCHAR(50) NOT NULL,
            target VARCHAR(100) NOT NULL DEFAULT 'repository',
            branch VARCHAR(100) NOT NULL DEFAULT 'main',
            frequency VARCHAR(100) NOT NULL,
            frequency_type VARCHAR(50) NOT NULL DEFAULT 'Daily',
            time_utc VARCHAR(20) NOT NULL DEFAULT '01:00 AM',
            next_run_at DATETIME,
            status VARCHAR(30) NOT NULL DEFAULT 'Active',
            run_only_on_changes BOOLEAN DEFAULT 1,
            notify_on_completion BOOLEAN DEFAULT 1,
            fail_on_high_severity BOOLEAN DEFAULT 0,
            last_run_at DATETIME,
            last_run_status VARCHAR(30),
            last_run_job_id VARCHAR(36),
            failure_reason TEXT,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL
        )
    """)

    # Find repository ID
    cursor.execute("SELECT id FROM github_repositories WHERE name = 'frontend-app' LIMIT 1")
    repo_row = cursor.fetchone()
    if not repo_row:
        cursor.execute("SELECT id FROM github_repositories LIMIT 1")
        repo_row = cursor.fetchone()
    repo_id = repo_row[0] if repo_row else "12345678-1234-1234-1234-123456789012"

    # Clear existing schedules to seed clean baseline
    cursor.execute("DELETE FROM security_job_schedules")

    now = datetime.now(timezone.utc).isoformat()

    schedules_data = [
        # (name, scan_type, target, branch, frequency, freq_type, time_utc, next_run_at, status, changes_only, notify, fail_high)
        (
            "Daily SAST Scan", "SAST", "repository", "main",
            "Daily 02:00 AM", "Daily", "02:00 AM",
            datetime(2026, 10, 5, 2, 0, 0).isoformat(), "Active",
            1, 1, 0
        ),
        (
            "Dependency Scan", "Dependency", "repository", "main",
            "Daily 03:00 AM", "Daily", "03:00 AM",
            datetime(2026, 10, 5, 3, 0, 0).isoformat(), "Active",
            1, 1, 0
        ),
        (
            "Container Image Scan", "Container", "docker-image", "main",
            "Every 12 hours", "Hourly", "02:00 PM",
            datetime(2026, 10, 4, 14, 0, 0).isoformat(), "Active",
            1, 1, 0
        ),
        (
            "IaC Scan (Terraform)", "IaC", "iac/", "main",
            "Weekly Mon 01:00 AM", "Weekly", "01:00 AM",
            datetime(2026, 10, 6, 1, 0, 0).isoformat(), "Active",
            1, 1, 0
        ),
        (
            "Secret Scan", "Secrets", "repository", "main",
            "Daily 04:00 AM", "Daily", "04:00 AM",
            datetime(2026, 10, 5, 4, 0, 0).isoformat(), "Paused",
            1, 1, 0
        ),
        (
            "License Compliance", "License", "repository", "main",
            "Weekly Sun 02:00 AM", "Weekly", "02:00 AM",
            datetime(2026, 10, 5, 2, 0, 0).isoformat(), "Active",
            1, 1, 0
        ),
        (
            "Nightly Full Scan", "All Scans", "repository", "main",
            "Daily 11:00 PM", "Daily", "11:00 PM",
            datetime(2026, 10, 4, 23, 0, 0).isoformat(), "Active",
            1, 1, 0
        ),
        (
            "Custom Schedule", "Custom", "path: src/", "main",
            "Every 6 hours", "Hourly", "08:00 PM",
            datetime(2026, 10, 4, 20, 0, 0).isoformat(), "Failed",
            1, 1, 0
        ),
    ]

    for name, stype, target, branch, freq, ftype, tutc, next_at, stat, chg, notif, fh in schedules_data:
        s_id = str(uuid.uuid4()).replace("-", "")
        cursor.execute("""
            INSERT INTO security_job_schedules (
                id, repository_id, name, scan_type, target, branch,
                frequency, frequency_type, time_utc, next_run_at, status,
                run_only_on_changes, notify_on_completion, fail_on_high_severity,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            s_id, repo_id, name, stype, target, branch,
            freq, ftype, tutc, next_at, stat,
            chg, notif, fh, now, now
        ))

    conn.commit()
    conn.close()
    print("Database seeding completed: security_job_schedules table initialized with 10 real schedules.")

if __name__ == "__main__":
    seed_schedules()
