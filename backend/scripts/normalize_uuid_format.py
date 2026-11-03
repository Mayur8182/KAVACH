import sqlite3
import uuid

def normalize(val):
    if not val or not isinstance(val, str):
        return val
    # If 32 hex chars, convert to 36 char hyphenated UUID
    clean = val.replace("-", "").strip()
    if len(clean) == 32:
        try:
            return str(uuid.UUID(clean))
        except Exception:
            return val
    return val

def run():
    db_path = "c:/Users/USER/Desktop/YC THING/backend/dev.db"
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Find all tables and columns
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [r[0] for r in cursor.fetchall() if not r[0].startswith("sqlite_")]

    print("Tables found:", tables)

    # 1. Normalize users table
    cursor.execute("SELECT id, email FROM users")
    users = cursor.fetchall()
    for uid, email in users:
        norm_id = normalize(uid)
        if norm_id != uid:
            print(f"Normalizing user {email}: {uid} -> {norm_id}")
            # Update user id
            cursor.execute("UPDATE users SET id = ? WHERE id = ?", (norm_id, uid))

            # Update foreign keys in all other tables
            for table in tables:
                if table == "users":
                    continue
                cursor.execute(f"PRAGMA table_info({table})")
                cols = [c[1] for c in cursor.fetchall()]
                for col in cols:
                    if "user" in col.lower() or "owner" in col.lower() or "actor" in col.lower():
                        try:
                            cursor.execute(f"UPDATE {table} SET {col} = ? WHERE {col} = ?", (norm_id, uid))
                        except Exception as e:
                            pass

    # Ensure mkbharvad7174@gmail.com is superuser and active
    cursor.execute("UPDATE users SET is_superuser = 1, is_active = 1, is_verified = 1 WHERE LOWER(email) = 'mkbharvad7174@gmail.com'")
    conn.commit()

    # Check users table
    cursor.execute("SELECT id, email, is_superuser, is_active FROM users WHERE LOWER(email) = 'mkbharvad7174@gmail.com'")
    row = cursor.fetchone()
    print("User mkbharvad7174@gmail.com state:", row)

    conn.close()
    print("[SUCCESS] UUID normalization and superuser update complete!")

if __name__ == "__main__":
    run()
