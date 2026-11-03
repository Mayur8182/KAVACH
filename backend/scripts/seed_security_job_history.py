import sqlite3
import uuid
from datetime import datetime, timedelta
import json
import random

def seed_history():
    print("Connecting to backend/dev.db...")
    import os
    db_path = 'dev.db' if os.path.exists('dev.db') else ('backend/dev.db' if os.path.exists('backend/dev.db') else os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'dev.db')))
    print(f"Connecting to {db_path}...")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Check if table exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='github_security_jobs'")
    if not cursor.fetchone():
        print("Table github_security_jobs not found!")
        return

    # Check repository_id
    cursor.execute("SELECT id FROM github_repositories WHERE name = 'frontend-app' LIMIT 1")
    repo_row = cursor.fetchone()
    if not repo_row:
        cursor.execute("SELECT id FROM github_repositories LIMIT 1")
        repo_row = cursor.fetchone()
    repo_id = repo_row[0] if repo_row else "12345678-1234-1234-1234-123456789012"
    print(f"Repository ID: {repo_id}")

    # Clear existing jobs to ensure clean 128 ground truth
    cursor.execute("DELETE FROM github_security_jobs")

    # The 10 specific runs from the screenshot (RUN-2026-0128 down to RUN-2026-0119)
    top_10 = [
        {
            "num": "RUN-2026-0128",
            "name": "SAST Scan (main)",
            "type": "SAST",
            "branch": "main",
            "trigger": "Push",
            "started": datetime(2026, 10, 4, 14, 45, 0),
            "duration_sec": 192,
            "duration_str": "3m 12s",
            "status": "Success",
            "findings": 8
        },
        {
            "num": "RUN-2026-0127",
            "name": "Dependency Scan",
            "type": "Dependency",
            "branch": "main",
            "trigger": "Schedule",
            "started": datetime(2026, 10, 4, 2, 0, 0),
            "duration_sec": 138,
            "duration_str": "2m 18s",
            "status": "Success",
            "findings": 3
        },
        {
            "num": "RUN-2026-0126",
            "name": "Container Scan",
            "type": "Container",
            "branch": "main",
            "trigger": "Manual",
            "started": datetime(2026, 10, 3, 20, 12, 0),
            "duration_sec": 301,
            "duration_str": "5m 01s",
            "status": "Failed",
            "findings": 15
        },
        {
            "num": "RUN-2026-0125",
            "name": "IaC Scan (terraform)",
            "type": "IaC",
            "branch": "main",
            "trigger": "Pull Request",
            "started": datetime(2026, 10, 3, 15, 20, 0),
            "duration_sec": 272,
            "duration_str": "4m 32s",
            "status": "Success",
            "findings": 6
        },
        {
            "num": "RUN-2026-0124",
            "name": "Secret Scan",
            "type": "Secret",
            "branch": "main",
            "trigger": "Push",
            "started": datetime(2026, 10, 3, 10, 15, 0),
            "duration_sec": 108,
            "duration_str": "1m 48s",
            "status": "Success",
            "findings": 2
        },
        {
            "num": "RUN-2026-0123",
            "name": "License Compliance",
            "type": "License",
            "branch": "main",
            "trigger": "Schedule",
            "started": datetime(2026, 10, 2, 23, 0, 0),
            "duration_sec": 130,
            "duration_str": "2m 10s",
            "status": "Cancelled",
            "findings": None
        },
        {
            "num": "RUN-2026-0122",
            "name": "SAST + Secrets",
            "type": "SAST",
            "branch": "main",
            "trigger": "Manual",
            "started": datetime(2026, 10, 2, 18, 30, 0),
            "duration_sec": 382,
            "duration_str": "6m 22s",
            "status": "Success",
            "findings": 9
        },
        {
            "num": "RUN-2026-0121",
            "name": "Nightly Full Scan",
            "type": "SAST",
            "branch": "main",
            "trigger": "Schedule",
            "started": datetime(2026, 10, 2, 1, 0, 0),
            "duration_sec": 494,
            "duration_str": "8m 14s",
            "status": "Success",
            "findings": 12
        },
        {
            "num": "RUN-2026-0120",
            "name": "Release Scan",
            "type": "Container",
            "branch": "main",
            "trigger": "Release",
            "started": datetime(2026, 10, 1, 21, 18, 0),
            "duration_sec": 245,
            "duration_str": "4m 05s",
            "status": "Failed",
            "findings": 21
        },
        {
            "num": "RUN-2026-0119",
            "name": "Custom Scan",
            "type": "Custom",
            "branch": "main",
            "trigger": "Manual",
            "started": datetime(2026, 10, 1, 17, 24, 0),
            "duration_sec": 220,
            "duration_str": "3m 40s",
            "status": "Skipped",
            "findings": None
        }
    ]

    # Required totals:
    # Statuses: 92 Success, 24 Failed, 8 Cancelled, 4 Skipped (Total: 128)
    # Already in top 10:
    # Success: 6
    # Failed: 2
    # Cancelled: 1
    # Skipped: 1
    # Remaining needed (118 runs):
    # Success: 92 - 6 = 86
    # Failed: 24 - 2 = 22
    # Cancelled: 8 - 1 = 7
    # Skipped: 4 - 1 = 3
    # Check: 86 + 22 + 7 + 3 = 118!

    # Types total needed:
    # SAST: 42 (top 10 has 3 -> need 39)
    # Dependency: 28 (top 10 has 1 -> need 27)
    # Container: 18 (top 10 has 2 -> need 16)
    # IaC: 16 (top 10 has 1 -> need 15)
    # Secret: 12 (top 10 has 1 -> need 11)
    # License: 8 (top 10 has 1 -> need 7)
    # Custom: 4 (top 10 has 1 -> need 3)
    # Check: 39 + 27 + 16 + 15 + 11 + 7 + 3 = 118!

    remaining_statuses = (
        ["Success"] * 86 +
        ["Failed"] * 22 +
        ["Cancelled"] * 7 +
        ["Skipped"] * 3
    )
    # Shuffle with fixed seed for determinism
    rng = random.Random(42)
    rng.shuffle(remaining_statuses)

    remaining_types = (
        ["SAST"] * 39 +
        ["Dependency"] * 27 +
        ["Container"] * 16 +
        ["IaC"] * 15 +
        ["Secret"] * 11 +
        ["License"] * 7 +
        ["Custom"] * 3
    )
    rng.shuffle(remaining_types)

    # Job index 118 down to 1 (corresponding to RUN-2026-0118 down to RUN-2026-0001)
    # Earliest run: Sep 10, 2026, 10:24 AM
    # Latest of top 10 is Oct 04, 2026, 02:45 PM
    # Time window between Sep 10, 2026 10:24 AM and Oct 01, 2026 15:00:00:
    t_start = datetime(2026, 9, 10, 10, 24, 0)
    t_end = datetime(2026, 10, 1, 15, 0, 0)
    total_seconds = (t_end - t_start).total_seconds()
    step_seconds = total_seconds / 118

    branches = ["main", "main", "main", "feature/auth", "feature/payment", "develop", "release/v2.4"]
    triggers = ["Push", "Push", "Schedule", "Manual", "Pull Request", "Release"]

    # We also want average duration to hit approx 204 seconds (3m 24s)
    # Top 10 durations sum: 192+138+301+272+108+130+382+494+245+220 = 2482 sec
    # Total for 128 runs at 204s average = 128 * 204 = 26112 sec
    # Remaining sum needed for 118 runs: 26112 - 2482 = 23630 sec -> average ~200.25 sec
    duration_pool = [
        110, 125, 140, 160, 175, 185, 195, 204, 210, 220, 235, 250, 270, 290, 145, 170, 190, 215, 225, 240
    ]

    all_runs = list(top_10)

    for i in range(118):
        job_idx = 118 - i  # 118 down to 1
        num_str = f"RUN-2026-{job_idx:04d}"
        
        status = remaining_statuses[i]
        j_type = remaining_types[i]
        
        # Calculate timestamp backwards from Oct 1 down to Sep 10
        cur_dt = t_end - timedelta(seconds=i * step_seconds)
        # Force the very last one (RUN-2026-0001) to be exactly Sep 10, 2026 10:24 AM
        if job_idx == 1:
            cur_dt = t_start

        branch = "main" if j_type in ("SAST", "License", "All Scans") and rng.random() > 0.3 else rng.choice(branches)
        trigger = rng.choice(triggers)

        # Realistic names
        if j_type == "SAST":
            names = ["SAST Scan", "SAST Security Analysis", "SAST Deep Scan", "SAST Baseline"]
        elif j_type == "Dependency":
            names = ["Dependency Scan", "SCA Vulnerability Audit", "Dependency Check"]
        elif j_type == "Container":
            names = ["Container Security Scan", "Docker Image Scan", "Container Base Audit"]
        elif j_type == "IaC":
            names = ["IaC Scan (terraform)", "IaC CloudFormation Scan", "IaC Kubernetes Audit"]
        elif j_type == "Secret":
            names = ["Secret Leak Scan", "Credential Scanner", "API Key Detection"]
        elif j_type == "License":
            names = ["License Compliance Check", "Open Source License Audit"]
        else:
            names = ["Custom Scan", "Policy Benchmark Scan"]
        
        job_name = f"{rng.choice(names)}"
        if branch != "main":
            job_name += f" ({branch})"
        elif trigger == "Push" and rng.random() > 0.5:
            job_name += " (main)"

        # Duration
        dur_sec = rng.choice(duration_pool) + rng.randint(-15, 15)
        dur_min = dur_sec // 60
        dur_rem = dur_sec % 60
        duration_str = f"{dur_min}m {dur_rem:02d}s"

        # Findings
        if status in ("Cancelled", "Skipped"):
            findings = None
        elif status == "Failed":
            findings = rng.randint(12, 28)
        else:
            findings = rng.randint(0, 10)

        all_runs.append({
            "num": num_str,
            "name": job_name,
            "type": j_type,
            "branch": branch,
            "trigger": trigger,
            "started": cur_dt,
            "duration_sec": dur_sec,
            "duration_str": duration_str,
            "status": status,
            "findings": findings
        })

    # Sort all runs descending by started date (latest first)
    all_runs.sort(key=lambda r: r["started"], reverse=True)

    print(f"Total runs prepared: {len(all_runs)}")

    # Verify counts
    c_success = sum(1 for r in all_runs if r["status"] == "Success")
    c_failed = sum(1 for r in all_runs if r["status"] == "Failed")
    c_cancelled = sum(1 for r in all_runs if r["status"] == "Cancelled")
    c_skipped = sum(1 for r in all_runs if r["status"] == "Skipped")
    print(f"Statuses -> Success: {c_success}, Failed: {c_failed}, Cancelled: {c_cancelled}, Skipped: {c_skipped}")

    types_count = {}
    for r in all_runs:
        types_count[r["type"]] = types_count.get(r["type"], 0) + 1
    print(f"Types -> {types_count}")

    avg_dur = sum(r["duration_sec"] for r in all_runs) / len(all_runs)
    print(f"Average duration: {int(avg_dur // 60)}m {int(avg_dur % 60):02d}s ({avg_dur:.1f}s)")
    print(f"Earliest run: {min(r['started'] for r in all_runs)}")
    print(f"Latest run: {max(r['started'] for r in all_runs)}")

    # Insert into database
    now_str = datetime.utcnow().isoformat()
    for r in all_runs:
        j_id = str(uuid.uuid4()).replace("-", "")
        
        scan_summary = None
        categories = None
        if r["findings"] is not None and r["findings"] > 0:
            crit = max(0, r["findings"] // 3)
            high = max(0, (r["findings"] - crit) // 2)
            med = max(0, r["findings"] - crit - high)
            low = max(0, r["findings"] - crit - high - med)
            scan_summary = json.dumps({"critical": crit, "high": high, "medium": med, "low": low})
            categories = json.dumps([
                {"name": f"{r['type']} Vulnerabilities", "count": crit + high},
                {"name": "Security Misconfigurations", "count": med},
                {"name": "Compliance Discrepancies", "count": low}
            ])
        elif r["findings"] == 0:
            scan_summary = json.dumps({"critical": 0, "high": 0, "medium": 0, "low": 0})
            categories = json.dumps([])

        started_dt = r["started"]
        completed_dt = started_dt + timedelta(seconds=r["duration_sec"])

        logs = json.dumps([
            f"[{started_dt.strftime('%H:%M:%S')}] Job initialized: {r['name']} ({r['num']})",
            f"[{started_dt.strftime('%H:%M:%S')}] Triggered via {r['trigger']} on branch '{r['branch']}'",
            f"[{(started_dt + timedelta(seconds=15)).strftime('%H:%M:%S')}] Scanner pipeline '{r['type']}' spawned",
            f"[{(started_dt + timedelta(seconds=45)).strftime('%H:%M:%S')}] Engine rules evaluation in progress...",
            f"[{(completed_dt).strftime('%H:%M:%S')}] Pipeline execution finished with status: {r['status']}. Findings: {r['findings'] if r['findings'] is not None else 'N/A'}"
        ])

        cursor.execute("""
            INSERT INTO github_security_jobs (
                id, repository_id, event_type, branch, status,
                job_number, job_name, job_type, duration_str, triggered_by,
                findings_count, scan_summary, findings_by_category, recent_logs,
                started_at, completed_at, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            j_id, repo_id, r["trigger"].lower(), r["branch"], r["status"],
            r["num"], r["name"], r["type"], r["duration_str"], r["trigger"],
            r["findings"], scan_summary, categories, logs,
            started_dt.isoformat(), completed_dt.isoformat(), started_dt.isoformat(), now_str
        ))

    conn.commit()
    conn.close()
    print("Database seeding completed successfully: 128 authoritative runs persisted.")

if __name__ == "__main__":
    seed_history()
