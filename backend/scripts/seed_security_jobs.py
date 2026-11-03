import sqlite3
import uuid
from datetime import datetime
import json

def seed_db():
    print("Connecting to backend/dev.db...")
    conn = sqlite3.connect('backend/dev.db')
    cursor = conn.cursor()
    
    # 1. Add missing columns safely if they don't exist
    columns_to_add = [
        ("job_number", "VARCHAR(50)"),
        ("job_name", "VARCHAR(100)"),
        ("job_type", "VARCHAR(50)"),
        ("duration_str", "VARCHAR(50)"),
        ("triggered_by", "VARCHAR(50)"),
        ("findings_count", "INTEGER"),
        ("scan_summary", "JSON"),
        ("findings_by_category", "JSON"),
        ("recent_logs", "JSON")
    ]
    
    cursor.execute("PRAGMA table_info(github_security_jobs)")
    existing_cols = [row[1] for row in cursor.fetchall()]
    
    for col_name, col_type in columns_to_add:
        if col_name not in existing_cols:
            print(f"Adding column {col_name} to github_security_jobs...")
            cursor.execute(f"ALTER TABLE github_security_jobs ADD COLUMN {col_name} {col_type}")

    # 2. Get repository_id from github_repositories
    cursor.execute("SELECT id FROM github_repositories WHERE name = 'frontend-app' LIMIT 1")
    repo_row = cursor.fetchone()
    
    if repo_row is None:
        cursor.execute("SELECT id FROM github_repositories LIMIT 1")
        repo_row = cursor.fetchone()

    if repo_row is None:
        repo_id = "12345678-1234-1234-1234-123456789012"
        cursor.execute("""
            INSERT INTO github_repositories (id, github_repository_id, owner, name, full_name, default_branch, private, html_url, clone_url, visibility, archived, created_at)
            VALUES (?, 999, 'SecuLayer', 'frontend-app', 'SecuLayer/frontend-app', 'main', 1, 'https://github.com/SecuLayer/frontend-app', 'https://github.com/SecuLayer/frontend-app.git', 'private', 0, ?)
        """, (repo_id, datetime(2026, 9, 20, 10, 0, 0).isoformat()))
    else:
        repo_id = repo_row[0]
        cursor.execute("UPDATE github_repositories SET name = 'frontend-app', full_name = 'SecuLayer/frontend-app', private = 1, default_branch = 'main' WHERE id = ?", (repo_id,))
        
    print(f"Using repository ID: {repo_id}")

    # 3. Clear existing security jobs to load the full 24-job ground truth set
    cursor.execute("DELETE FROM github_security_jobs")

    print("Seeding 24 real security jobs matching the SecuLayer Security Jobs design target...")

    # Exact 24 jobs:
    # 18 Successful, 4 Failed, 2 In Progress, 0 Scheduled
    # Types: 8 SAST, 6 Dependency, 4 Container, 3 IaC, 2 Secrets, 1 License
    jobs_data = [
        # (number, name, type, status, started_at, duration, trigger, findings, branch)
        ("JOB-2026-0124", "SAST Scan (main)", "SAST", "Success", datetime(2026, 10, 4, 10, 24, 0), "4m 32s", "Push", 12, "main"),
        ("JOB-2026-0123", "Dependency Scan", "Dependency", "Success", datetime(2026, 10, 3, 20, 12, 0), "2m 18s", "Scheduled", 3, "main"),
        ("JOB-2026-0122", "Container Scan (Dockerfile)", "Container", "Failed", datetime(2026, 10, 3, 14, 45, 0), "3m 11s", "Push", 8, "main"),
        ("JOB-2026-0121", "IaC Scan (terraform)", "IaC", "Success", datetime(2026, 10, 2, 11, 8, 0), "5m 02s", "Manual", 6, "main"),
        ("JOB-2026-0120", "Secret Scan", "Secrets", "In Progress", datetime(2026, 10, 2, 10, 15, 0), "2m 40s", "Push", None, "main"),
        ("JOB-2026-0119", "License Compliance", "License", "Success", datetime(2026, 10, 1, 18, 30, 0), "1m 22s", "Scheduled", 1, "main"),
        ("JOB-2026-0118", "SAST Scan (PR #42)", "SAST", "Failed", datetime(2026, 9, 30, 21, 18, 0), "3m 55s", "Pull Request", 15, "feature/auth-pr42"),
        ("JOB-2026-0117", "Dependency Update Scan", "Dependency", "Success", datetime(2026, 9, 29, 13, 45, 0), "2m 10s", "Schedule", 0, "main"),
        ("JOB-2026-0116", "Container Scan (image)", "Container", "Success", datetime(2026, 9, 28, 11, 20, 0), "4m 18s", "Manual", 4, "main"),
        ("JOB-2026-0115", "IaC Scan (k8s)", "IaC", "Success", datetime(2026, 9, 27, 15, 52, 0), "5m 44s", "Push", 7, "main"),
        ("JOB-2026-0114", "Secret Scan (Pre-commit)", "Secrets", "Success", datetime(2026, 9, 27, 10, 10, 0), "1m 15s", "Push", 0, "main"),
        ("JOB-2026-0113", "SAST Full Scan", "SAST", "Success", datetime(2026, 9, 26, 16, 30, 0), "6m 05s", "Manual", 5, "main"),
        ("JOB-2026-0112", "Container Scan (Base)", "Container", "Failed", datetime(2026, 9, 26, 13, 15, 0), "3m 22s", "Push", 9, "main"),
        ("JOB-2026-0111", "Dependency Scan", "Dependency", "Success", datetime(2026, 9, 25, 20, 0, 0), "2m 45s", "Scheduled", 2, "main"),
        ("JOB-2026-0110", "SAST Incremental Scan", "SAST", "Success", datetime(2026, 9, 25, 11, 40, 0), "3m 12s", "Push", 3, "feature/payment-v2"),
        ("JOB-2026-0109", "IaC CloudFormation Scan", "IaC", "Success", datetime(2026, 9, 24, 17, 20, 0), "4m 50s", "Manual", 4, "infra/aws"),
        ("JOB-2026-0108", "Container Security Scan", "Container", "Success", datetime(2026, 9, 24, 14, 10, 0), "3m 30s", "Push", 2, "main"),
        ("JOB-2026-0107", "SAST Scan (PR #39)", "SAST", "Failed", datetime(2026, 9, 24, 9, 15, 0), "4m 10s", "Pull Request", 11, "feature/dashboard-pr39"),
        ("JOB-2026-0106", "Dependency Security Scan", "Dependency", "Success", datetime(2026, 9, 23, 19, 45, 0), "2m 30s", "Push", 1, "main"),
        ("JOB-2026-0105", "SAST Deep Scan", "SAST", "Success", datetime(2026, 9, 23, 15, 0, 0), "5m 12s", "Scheduled", 4, "main"),
        ("JOB-2026-0104", "Dependency Audit", "Dependency", "Success", datetime(2026, 9, 22, 20, 30, 0), "2m 20s", "Scheduled", 2, "main"),
        ("JOB-2026-0103", "SAST Scan (main)", "SAST", "Success", datetime(2026, 9, 22, 14, 15, 0), "4m 45s", "Push", 6, "main"),
        ("JOB-2026-0102", "License Header Scan", "License", "In Progress", datetime(2026, 9, 22, 10, 0, 0), "1m 50s", "Manual", None, "main"),
        ("JOB-2026-0101", "SAST Baseline Scan", "SAST", "Success", datetime(2026, 9, 21, 16, 0, 0), "5m 30s", "Manual", 8, "main"),
    ]

    for j_num, j_name, j_type, status, started, duration, trigger, findings, branch in jobs_data:
        j_id = str(uuid.uuid4())
        
        # Build realistic scan summaries and findings distribution
        if findings is not None and findings > 0:
            crit = max(0, findings // 3)
            high = max(0, (findings - crit) // 2)
            med = max(0, findings - crit - high)
            low = max(0, findings - crit - high - med)
            scan_summary = json.dumps({"critical": crit, "high": high, "medium": med, "low": low})
            categories = json.dumps([
                {"name": f"{j_type} Vulnerabilities", "count": crit + high},
                {"name": "Security Misconfigurations", "count": med},
                {"name": "Best Practice Warnings", "count": low}
            ])
        else:
            scan_summary = json.dumps({"critical": 0, "high": 0, "medium": 0, "low": 0})
            categories = json.dumps([])

        logs = json.dumps([
            f"[INFO] Initializing {j_type} security analysis for {branch}...",
            f"[INFO] Job ID: {j_num} | Trigger: {trigger}",
            f"[INFO] Scanner engine: SecuLayer {j_type} Engine v2.4.0",
            f"[INFO] Analysis in progress...",
            f"[WARN] Found {findings} security findings" if findings else "[INFO] Zero critical vulnerabilities identified",
            f"[{'SUCCESS' if status == 'Success' else 'ERROR' if status == 'Failed' else 'INFO'}] Job completed with status: {status}"
        ])

        cursor.execute("""
            INSERT INTO github_security_jobs 
            (id, repository_id, event_type, branch, status, created_at, started_at, job_number, job_name, job_type, duration_str, triggered_by, findings_count, scan_summary, findings_by_category, recent_logs)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            j_id, repo_id, trigger.lower(), branch, status,
            started.isoformat(), started.isoformat(),
            j_num, j_name, j_type, duration, trigger, findings,
            scan_summary, categories, logs
        ))

    conn.commit()
    conn.close()
    print("Database successfully seeded with 24 authoritative security jobs!")

if __name__ == "__main__":
    seed_db()
