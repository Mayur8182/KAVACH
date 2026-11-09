"""
Kavach Database Reset / Wipe Script
Safely and deterministically clears ALL user data, projects, scans, findings,
integrations, runs, patches, and messages while preserving all schema tables and indexes.
Reclaims disk space via VACUUM.
"""

import os
import sqlite3
import sys

def wipe_database():
    candidates = [
        os.path.abspath("backend/dev.db"),
        os.path.abspath("dev.db"),
    ]
    db_path = next((p for p in candidates if os.path.exists(p)), None)

    if not db_path:
        print("ERROR: Database file 'dev.db' not found.")
        sys.exit(1)

    print(f"Connecting to database at: {db_path}")
    conn = sqlite3.connect(db_path, timeout=60.0)
    cursor = conn.cursor()

    try:
        # Disable foreign keys temporarily for clean cascade deletion
        cursor.execute("PRAGMA foreign_keys = OFF;")
        
        # Get all non-internal tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
        tables = [row[0] for row in cursor.fetchall()]
        print(f"Found {len(tables)} tables to wipe.")

        deleted_total = 0
        for table in tables:
            try:
                cursor.execute(f"SELECT COUNT(*) FROM [{table}];")
                count = cursor.fetchone()[0]
                if count > 0:
                    cursor.execute(f"DELETE FROM [{table}];")
                    deleted_total += count
                    print(f"  - Cleared {count} rows from [{table}]")
            except Exception as e:
                print(f"  ! Warning clearing [{table}]: {e}")

        # Reset auto-increment sequences if table exists
        try:
            cursor.execute("DELETE FROM sqlite_sequence;")
            print("  - Reset all auto-increment sequences.")
        except Exception:
            pass

        conn.commit()
        print(f"\nSuccessfully purged {deleted_total} total records across all tables.")

        # Re-enable foreign keys
        cursor.execute("PRAGMA foreign_keys = ON;")

        # Vacuum to shrink 229MB down to clean initial size
        print("Running VACUUM to reclaim storage...")
        cursor.execute("VACUUM;")
        conn.commit()
        print("VACUUM complete.")

        # Verification check
        print("\nVerifying 100% clean database sheet:")
        non_empty = []
        for table in tables:
            cursor.execute(f"SELECT COUNT(*) FROM [{table}];")
            c = cursor.fetchone()[0]
            if c > 0:
                non_empty.append((table, c))

        if non_empty:
            print(f"WARNING: Some tables still have rows: {non_empty}")
        else:
            print("VERIFIED: Every single table in the database has 0 rows. Clean sheet established!")

        final_size = os.path.getsize(db_path) / (1024 * 1024)
        print(f"Final database file size: {final_size:.2f} MB")

    finally:
        conn.close()

if __name__ == "__main__":
    wipe_database()

