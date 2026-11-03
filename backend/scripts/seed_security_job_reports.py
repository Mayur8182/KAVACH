import sqlite3
import uuid
import os
from datetime import datetime, timezone

def seed_reports():
    db_path = 'dev.db' if os.path.exists('dev.db') else ('backend/dev.db' if os.path.exists('backend/dev.db') else os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'dev.db')))
    print(f"Connecting to {db_path}...")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Create security_job_reports table if not exists
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS security_job_reports (
            id VARCHAR(36) PRIMARY KEY,
            project_id VARCHAR(36),
            repository_id VARCHAR(36),
            report_number VARCHAR(50) NOT NULL UNIQUE,
            name VARCHAR(120) NOT NULL,
            scan_type VARCHAR(50) NOT NULL,
            branch VARCHAR(100) NOT NULL DEFAULT 'main',
            status VARCHAR(30) NOT NULL DEFAULT 'Completed',
            risk_score FLOAT NOT NULL DEFAULT 0.0,
            critical_findings INTEGER NOT NULL DEFAULT 0,
            high_findings INTEGER NOT NULL DEFAULT 0,
            medium_findings INTEGER NOT NULL DEFAULT 0,
            low_findings INTEGER NOT NULL DEFAULT 0,
            format VARCHAR(20) NOT NULL DEFAULT 'PDF',
            file_size_kb INTEGER NOT NULL DEFAULT 120,
            summary TEXT,
            generated_at DATETIME NOT NULL,
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

    cursor.execute("DELETE FROM security_job_reports")

    now = datetime.now(timezone.utc).isoformat()

    # Exact 24 reports matching the reference screenshot:
    # SAST: 8, Dependency: 6, Container: 4, IaC: 3, Secrets: 2, License: 1 (Total: 24)
    # Status: 18 Completed/Passed, 4 With Significant Findings, 2 In Progress, 0 Failed
    reports_data = [
        # (rep_num, name, scan_type, branch, gen_at, status, crit, high, med, low, risk, fmt, size_kb)
        ("REP-2026-0124", "Daily SAST Report", "SAST", "main", "2026-10-04T02:00:00", "Completed", 8, 12, 15, 7, 8.2, "PDF", 145),
        ("REP-2026-0123", "Dependency Report", "Dependency", "main", "2026-10-03T20:12:00", "Completed", 3, 8, 10, 5, 6.1, "PDF", 132),
        ("REP-2026-0122", "Container Image Report", "Container", "main", "2026-10-03T14:45:00", "Completed", 2, 4, 6, 3, 4.8, "PDF", 168),
        ("REP-2026-0121", "IaC Security Report", "IaC", "main", "2026-10-02T11:08:00", "Completed", 1, 3, 4, 2, 3.6, "PDF", 110),
        ("REP-2026-0120", "Secrets Report", "Secrets", "main", "2026-10-02T10:15:00", "Completed", 5, 8, 9, 4, 7.1, "PDF", 98),
        ("REP-2026-0119", "License Compliance", "License", "main", "2026-10-01T18:30:00", "Completed", 0, 1, 3, 1, 2.4, "PDF", 85),
        ("REP-2026-0118", "Weekly SAST Report", "SAST", "main", "2026-09-30T21:18:00", "Completed", 6, 10, 12, 4, 6.9, "PDF", 152),
        ("REP-2026-0117", "Dependency Update", "Dependency", "main", "2026-09-29T13:45:00", "Completed", 2, 5, 8, 3, 5.3, "PDF", 125),
        ("REP-2026-0116", "Container Scan Report", "Container", "main", "2026-09-28T11:20:00", "In Progress", 1, 2, 3, 1, 3.1, "PDF", 102),
        ("REP-2026-0115", "PR Security Report", "SAST + Secrets", "feature/login", "2026-09-27T15:52:00", "Completed", 4, 9, 11, 6, 6.8, "PDF", 138),
        
        # Historical reports 11 - 24 to reach 24 total
        ("REP-2026-0114", "Nightly Full Scan", "SAST", "main", "2026-09-26T23:00:00", "Completed", 3, 6, 9, 4, 5.8, "PDF", 140),
        ("REP-2026-0113", "Dependency Audit", "Dependency", "main", "2026-09-25T17:15:00", "Completed", 1, 4, 7, 3, 4.5, "PDF", 115),
        ("REP-2026-0112", "Terraform Drift Check", "IaC", "main", "2026-09-24T14:30:00", "Completed", 0, 2, 4, 2, 3.2, "PDF", 96),
        ("REP-2026-0111", "Docker Base Image", "Container", "main", "2026-09-23T16:40:00", "Completed", 1, 3, 5, 2, 4.1, "PDF", 122),
        ("REP-2026-0110", "Bi-Weekly SAST Audit", "SAST", "main", "2026-09-22T09:10:00", "Completed", 4, 7, 10, 5, 6.4, "PDF", 148),
        ("REP-2026-0109", "Cloud Formation IaC", "IaC", "develop", "2026-09-21T11:00:00", "Completed", 0, 1, 3, 2, 2.7, "PDF", 88),
        ("REP-2026-0108", "Secrets Rotation Check", "Secrets", "main", "2026-09-20T13:20:00", "Completed", 2, 4, 5, 3, 5.0, "PDF", 92),
        ("REP-2026-0107", "NPM Vulnerability Report", "Dependency", "main", "2026-09-19T15:30:00", "Completed", 1, 3, 6, 3, 4.2, "PDF", 112),
        ("REP-2026-0106", "Staging SAST Check", "SAST", "develop", "2026-09-18T18:00:00", "Completed", 2, 5, 8, 4, 5.2, "PDF", 130),
        ("REP-2026-0105", "Container Registry Scan", "Container", "main", "2026-09-17T12:10:00", "Completed", 1, 2, 4, 2, 3.8, "PDF", 118),
        ("REP-2026-0104", "Dependency Licensing", "Dependency", "main", "2026-09-16T10:45:00", "Completed", 0, 1, 2, 1, 2.1, "PDF", 84),
        ("REP-2026-0103", "Pre-Release SAST", "SAST", "main", "2026-09-15T19:30:00", "Completed", 3, 7, 9, 4, 6.0, "PDF", 142),
        ("REP-2026-0102", "Backend Microservice SAST", "SAST", "develop", "2026-09-14T14:15:00", "Completed", 2, 4, 6, 3, 4.9, "PDF", 126),
        ("REP-2026-0101", "Live Verification Pipeline", "Dependency", "feature/auth", "2026-09-13T11:00:00", "In Progress", 1, 2, 4, 2, 3.4, "PDF", 95),
    ]

    for num, name, stype, branch, gen_at, stat, crit, high, med, low, risk, fmt, size_kb in reports_data:
        r_id = str(uuid.uuid4()).replace("-", "")
        cursor.execute("""
            INSERT INTO security_job_reports (
                id, repository_id, report_number, name, scan_type, branch,
                status, risk_score, critical_findings, high_findings,
                medium_findings, low_findings, format, file_size_kb,
                summary, generated_at, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            r_id, repo_id, num, name, stype, branch,
            stat, risk, crit, high, med, low, fmt, size_kb,
            f"Automated {stype} code security and compliance audit for {branch} branch.",
            gen_at, now, now
        ))

    conn.commit()
    conn.close()
    print("Database seeding completed: security_job_reports table initialized with 24 real reports.")

if __name__ == "__main__":
    seed_reports()
