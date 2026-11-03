import sqlite3

def run():
    conn = sqlite3.connect("backend/dev.db")
    cur = conn.cursor()

    cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
    tables = [r[0] for r in cur.fetchall()]

    cur.execute("SELECT id, email FROM users WHERE length(id) = 36")
    hyphenated_users = cur.fetchall()
    print(f"Found {len(hyphenated_users)} hyphenated users to convert to 32-char hex")

    for old_id, email in hyphenated_users:
        new_id = old_id.replace("-", "")
        print(f"Converting {email}: {old_id} -> {new_id}")
        cur.execute("UPDATE users SET id = ? WHERE id = ?", (new_id, old_id))

        for table in tables:
            if table == "users":
                continue
            cur.execute(f"PRAGMA table_info({table})")
            cols = [c[1] for c in cur.fetchall()]
            for col in cols:
                if any(k in col.lower() for k in ["user", "owner", "actor", "creator", "created_by"]):
                    try:
                        cur.execute(f"UPDATE {table} SET {col} = ? WHERE {col} = ?", (new_id, old_id))
                    except Exception:
                        pass

    conn.commit()

    cur.execute("SELECT DISTINCT length(id) FROM users")
    print("users.id lengths now:", cur.fetchall())

    cur.execute("SELECT id, email, is_superuser FROM users WHERE LOWER(email) = 'mkbharvad7174@gmail.com'")
    print("Founder user:", cur.fetchone())

    conn.close()
    print("Done!")

if __name__ == "__main__":
    run()
