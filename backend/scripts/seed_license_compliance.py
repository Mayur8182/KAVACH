import sqlite3
import uuid
import os
import json
from datetime import datetime, timezone

def seed_license_compliance():
    db_path = 'dev.db' if os.path.exists('dev.db') else ('backend/dev.db' if os.path.exists('backend/dev.db') else os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'dev.db')))
    print(f"Connecting to database at {db_path}...")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # 1. Create license_compliance_records table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS license_compliance_records (
            id VARCHAR(36) PRIMARY KEY,
            project_id VARCHAR(36),
            repository_name VARCHAR(255) NOT NULL DEFAULT 'frontend-app',
            license_name VARCHAR(100) NOT NULL,
            package_name VARCHAR(255) NOT NULL,
            package_version VARCHAR(100) NOT NULL,
            license_type VARCHAR(50) NOT NULL DEFAULT 'Permissive',
            compliance_status VARCHAR(50) NOT NULL DEFAULT 'Compliant',
            risk_level VARCHAR(30) NOT NULL DEFAULT 'Low',
            used_in_files_count INTEGER NOT NULL DEFAULT 1,
            used_in_paths TEXT,
            package_url VARCHAR(500),
            license_text TEXT,
            policy_id VARCHAR(36),
            notes TEXT,
            first_detected_at DATETIME NOT NULL,
            last_scanned_at DATETIME NOT NULL,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL
        )
    """)

    # 2. Create license_policies table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS license_policies (
            id VARCHAR(36) PRIMARY KEY,
            project_id VARCHAR(36),
            license_name VARCHAR(100) NOT NULL UNIQUE,
            license_type VARCHAR(50) NOT NULL DEFAULT 'Permissive',
            action VARCHAR(50) NOT NULL DEFAULT 'ALLOW',
            default_compliance_status VARCHAR(50) NOT NULL DEFAULT 'Compliant',
            default_risk_level VARCHAR(30) NOT NULL DEFAULT 'Low',
            description TEXT,
            requires_approval BOOLEAN NOT NULL DEFAULT 0,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL
        )
    """)

    # 3. Create license_scan_jobs table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS license_scan_jobs (
            id VARCHAR(36) PRIMARY KEY,
            project_id VARCHAR(36),
            repository_name VARCHAR(255) NOT NULL DEFAULT 'frontend-app',
            status VARCHAR(50) NOT NULL DEFAULT 'COMPLETED',
            scanner_engine VARCHAR(100) NOT NULL DEFAULT 'license-policy-engine',
            total_packages_scanned INTEGER NOT NULL DEFAULT 0,
            compliant_count INTEGER NOT NULL DEFAULT 0,
            restricted_count INTEGER NOT NULL DEFAULT 0,
            prohibited_count INTEGER NOT NULL DEFAULT 0,
            unknown_count INTEGER NOT NULL DEFAULT 0,
            duration_ms INTEGER NOT NULL DEFAULT 0,
            error_message TEXT,
            started_at DATETIME,
            completed_at DATETIME,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL
        )
    """)

    # Find project ID if exists
    cursor.execute("SELECT id FROM projects LIMIT 1")
    proj_row = cursor.fetchone()
    project_id = proj_row[0] if proj_row else None

    # Clear previous seed
    cursor.execute("DELETE FROM license_compliance_records")
    cursor.execute("DELETE FROM license_policies")
    cursor.execute("DELETE FROM license_scan_jobs")

    now = datetime.now(timezone.utc).isoformat()

    # Seed Default Policies
    policies = [
        ("MIT", "Permissive", "ALLOW", "Compliant", "Low", "Permissive open-source license with minimal restrictions. Approved for production use."),
        ("Apache-2.0", "Permissive", "ALLOW", "Compliant", "Low", "Permissive license providing patent grant protections. Approved for production use."),
        ("BSD-3-Clause", "Permissive", "ALLOW", "Compliant", "Low", "Permissive BSD variant requiring copyright notice preservation. Approved for production use."),
        ("ISC", "Permissive", "ALLOW", "Compliant", "Low", "Functionally equivalent to simplified BSD license. Approved for production use."),
        ("GPL-3.0", "Copyleft", "PROHIBIT", "Prohibited", "High", "Strong copyleft requirement. Viral obligations disallow bundling in proprietary commercial builds without explicit legal review."),
        ("LGPL-2.1", "Weak Copyleft", "RESTRICT", "Restricted", "Medium", "Requires dynamic linking isolation. Static linking triggers source disclosure obligations."),
        ("Unknown", "Unknown", "RESTRICT", "Unknown", "Medium", "Unidentified or missing license metadata. Requires legal and compliance discovery."),
    ]

    for p in policies:
        cursor.execute("""
            INSERT INTO license_policies (
                id, project_id, license_name, license_type, action,
                default_compliance_status, default_risk_level, description,
                requires_approval, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (str(uuid.uuid4()), project_id, p[0], p[1], p[2], p[3], p[4], p[5], 1 if p[2] == "RESTRICT" else 0, now, now))

    # Top 10 specific packages matching reference screenshot:
    top_10_packages = [
        # (license_name, package_name, version, type, status, risk, used_files)
        ("MIT", "react", "18.2.0", "Permissive", "Compliant", "Low", 12),
        ("MIT", "lodash", "4.17.21", "Permissive", "Compliant", "Low", 8),
        ("Apache-2.0", "axios", "1.6.7", "Permissive", "Compliant", "Low", 6),
        ("BSD-3-Clause", "webpack", "5.88.2", "Permissive", "Compliant", "Low", 9),
        ("ISC", "next", "14.0.4", "Permissive", "Compliant", "Low", 4),
        ("GPL-3.0", "some-lib", "2.1.0", "Copyleft", "Prohibited", "High", 2),
        ("LGPL-2.1", "another-lib", "3.4.1", "Copyleft", "Restricted", "Medium", 3),
        ("MIT", "typescript", "5.3.3", "Permissive", "Compliant", "Low", 7),
        ("Apache-2.0", "eslint", "8.56.0", "Permissive", "Compliant", "Low", 5),
        ("Unknown", "custom-lib", "1.0.0", "Unknown", "Unknown", "Medium", 1),
    ]

    # Additional packages to reach exact screenshot totals:
    # MIT: 52 total (top 10 has 3 -> need 49)
    # Apache-2.0: 28 total (top 10 has 2 -> need 26)
    # BSD-3-Clause: 14 total (top 10 has 1 -> need 13)
    # ISC: 10 total (top 10 has 1 -> need 9)
    # GPL-3.0: 6 total (top 10 has 1 -> need 5: 3 Prohibited, 2 Restricted)
    # LGPL-2.1: 4 total (top 10 has 1 -> need 3: all Restricted)
    # Other: 14 total (top 10 has 1 -> need 13: 8 Compliant, 2 Restricted, 3 Unknown)

    mit_names = [
        "react-dom", "chalk", "commander", "debug", "ms", "semver", "glob", "minimist",
        "mkdirp", "uuid", "strip-ansi", "ansi-styles", "supports-color", "has-flag",
        "color-convert", "color-name", "escape-string-regexp", "find-up", "locate-path",
        "p-locate", "p-limit", "p-try", "path-exists", "resolve-from", "schema-utils",
        "ajv", "fast-deep-equal", "fast-json-stable-stringify", "json-schema-traverse",
        "uri-js", "punycode", "qs", "mime-types", "mime-db", "form-data", "combined-stream",
        "delayed-stream", "asynckit", "follow-redirects", "proxy-from-env", "dotenv",
        "cross-spawn", "which", "isexe", "rimraf", "inherits", "safe-buffer", "string_decoder", "readable-stream"
    ]

    apache_names = [
        "tslib", "rxjs", "zone.js", "winston", "async", "source-map", "core-js",
        "moment", "dayjs", "date-fns", "big.js", "decimal.js", "bignumber.js",
        "loader-utils", "terser", "cacache", "tar", "chownr", "minipass", "yallist",
        "ssri", "make-dir", "p-map", "aggregate-error", "clean-stack", "indent-string"
    ]

    bsd_names = [
        "uglify-js", "d3", "d3-scale", "d3-shape", "d3-path", "d3-array",
        "d3-color", "d3-format", "d3-interpolate", "d3-time", "d3-time-format", "protobufjs", "esprima"
    ]

    isc_names = [
        "globule", "graceful-fs", "once", "wrappy", "inflight", "fs.realpath",
        "path-is-absolute", "proto-list", "nopt"
    ]

    gpl_names = [
        ("ffmpeg-static", "5.1.0", "Prohibited", "High", 2),
        ("ghostscript4js", "3.2.1", "Prohibited", "High", 1),
        ("readline-ext", "1.4.0", "Prohibited", "High", 3),
        ("dev-tool-helper", "0.9.2", "Restricted", "Medium", 2),
        ("legacy-util", "1.1.4", "Restricted", "Medium", 1),
    ]

    lgpl_names = [
        ("sevenzip-bin", "5.1.1", "Restricted", "Medium", 2),
        ("mediainfo-parser", "2.0.4", "Restricted", "Medium", 1),
        ("native-crypto-shim", "1.8.0", "Restricted", "Medium", 2),
    ]

    other_names = [
        # 8 Compliant
        ("zlib-sync", "0.1.7", "Zlib", "Permissive", "Compliant", "Low", 4),
        ("curl-helper", "1.2.0", "curl", "Permissive", "Compliant", "Low", 2),
        ("unlicense-util", "2.0.0", "Unlicense", "Permissive", "Compliant", "Low", 3),
        ("python-math-shim", "1.0.4", "Python-2.0", "Permissive", "Compliant", "Low", 2),
        ("bsd2-kit", "1.3.1", "BSD-2-Clause", "Permissive", "Compliant", "Low", 5),
        ("artistic-lib", "2.0.0", "Artistic-2.0", "Permissive", "Compliant", "Low", 3),
        ("mit-0-util", "0.1.0", "MIT-0", "Permissive", "Compliant", "Low", 4),
        ("cc0-package", "1.0.0", "CC0-1.0", "Permissive", "Compliant", "Low", 6),
        # 2 Restricted
        ("cddl-parser", "1.1.0", "CDDL-1.0", "Weak Copyleft", "Restricted", "Medium", 2),
        ("mpl-transport", "2.0.1", "MPL-2.0", "Weak Copyleft", "Restricted", "Medium", 3),
        # 3 Unknown
        ("internal-auth-v1", "1.0.0", "Unknown", "Unknown", "Unknown", "Medium", 1),
        ("legacy-bridge", "0.4.2", "Unknown", "Unknown", "Unknown", "Medium", 1),
        ("vendor-binary", "2.1.0", "Unknown", "Unknown", "Unknown", "Medium", 1),
    ]

    all_records = []

    # 1. Add top 10
    for lic, pkg, ver, l_type, status, risk, used in top_10_packages:
        all_records.append((lic, pkg, ver, l_type, status, risk, used))

    # 2. Add remaining MIT (49)
    for i, name in enumerate(mit_names):
        ver = f"{1 + (i % 5)}.{i % 10}.{i % 8}"
        used = max(1, 14 - (i % 12))
        all_records.append(("MIT", name, ver, "Permissive", "Compliant", "Low", used))

    # 3. Add remaining Apache-2.0 (26)
    for i, name in enumerate(apache_names):
        ver = f"{2 + (i % 4)}.{i % 8}.{i % 9}"
        used = max(1, 11 - (i % 10))
        all_records.append(("Apache-2.0", name, ver, "Permissive", "Compliant", "Low", used))

    # 4. Add remaining BSD-3-Clause (13)
    for i, name in enumerate(bsd_names):
        ver = f"3.{i % 6}.{i % 7}"
        used = max(1, 9 - (i % 7))
        all_records.append(("BSD-3-Clause", name, ver, "Permissive", "Compliant", "Low", used))

    # 5. Add remaining ISC (9)
    for i, name in enumerate(isc_names):
        ver = f"1.{i % 5}.{i % 6}"
        used = max(1, 8 - (i % 6))
        all_records.append(("ISC", name, ver, "Permissive", "Compliant", "Low", used))

    # 6. Add remaining GPL-3.0 (5)
    for name, ver, status, risk, used in gpl_names:
        all_records.append(("GPL-3.0", name, ver, "Copyleft", status, risk, used))

    # 7. Add remaining LGPL-2.1 (3)
    for name, ver, status, risk, used in lgpl_names:
        all_records.append(("LGPL-2.1", name, ver, "Copyleft", status, risk, used))

    # 8. Add remaining Other (13)
    for name, ver, lic, l_type, status, risk, used in other_names:
        all_records.append((lic, name, ver, l_type, status, risk, used))

    print(f"Total seeded records count: {len(all_records)}")

    # Insert into database
    for lic, pkg, ver, l_type, status, risk, used in all_records:
        rec_id = str(uuid.uuid4())
        used_paths = [f"src/components/{pkg}/{f}.tsx" for f in range(1, used + 1)]
        cursor.execute("""
            INSERT INTO license_compliance_records (
                id, project_id, repository_name, license_name, package_name,
                package_version, license_type, compliance_status, risk_level,
                used_in_files_count, used_in_paths, package_url, license_text,
                first_detected_at, last_scanned_at, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            rec_id, project_id, "frontend-app", lic, pkg, ver, l_type, status, risk,
            used, json.dumps(used_paths), f"https://www.npmjs.com/package/{pkg}",
            f"SPDX: {lic} — Standard open-source license terms apply for {pkg}@{ver}.",
            now, now, now, now
        ))

    # Seed latest scan job record
    cursor.execute("""
        INSERT INTO license_scan_jobs (
            id, project_id, repository_name, status, scanner_engine,
            total_packages_scanned, compliant_count, restricted_count,
            prohibited_count, unknown_count, duration_ms,
            started_at, completed_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        str(uuid.uuid4()), project_id, "frontend-app", "COMPLETED", "license-compliance-scanner",
        128, 112, 8, 4, 4, 3840,
        now, now, now, now
    ))

    conn.commit()

    # Verification query
    cursor.execute("SELECT COUNT(*), compliance_status FROM license_compliance_records GROUP BY compliance_status")
    print("Seeded Compliance Distribution:", cursor.fetchall())
    cursor.execute("SELECT COUNT(*), license_name FROM license_compliance_records GROUP BY license_name ORDER BY COUNT(*) DESC")
    print("Top Licenses:", cursor.fetchall()[:7])

    conn.close()
    print("License compliance seeding successfully completed!")

if __name__ == "__main__":
    seed_license_compliance()
