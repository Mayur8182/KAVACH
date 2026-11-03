import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), "..", "dev.db")
if not os.path.exists(db_path):
    db_path = "backend/dev.db"

print(f"Connecting to database at {db_path}...")
con = sqlite3.connect(db_path)
cur = con.cursor()

def add_col(tbl, col, typedef):
    cols = [c[1] for c in cur.execute(f"PRAGMA table_info({tbl})").fetchall()]
    if col not in cols:
        cur.execute(f"ALTER TABLE {tbl} ADD COLUMN {col} {typedef}")
        print(f"Added {col} to {tbl}")
    else:
        print(f"{col} already exists in {tbl}")

add_col("workspaces", "owner_id", "VARCHAR(36)")
add_col("workspaces", "workspace_type", "VARCHAR(50) DEFAULT 'ORGANIZATION'")
add_col("workspaces", "default_branch", "VARCHAR(100) DEFAULT 'main'")
add_col("projects", "workspace_id", "VARCHAR(36)")
add_col("projects", "organization_id", "VARCHAR(36)")
add_col("github_repositories", "workspace_id", "VARCHAR(36)")
add_col("audit_events", "workspace_id", "VARCHAR(36)")

con.commit()
con.close()
print("Migration completed successfully!")
