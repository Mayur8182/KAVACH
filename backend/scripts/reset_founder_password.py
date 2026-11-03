import sqlite3
import os
import sys

# Try importing argon2 from environment
try:
    import argon2
    ph = argon2.PasswordHasher(
        time_cost=2,
        memory_cost=19456,
        parallelism=1,
        hash_len=32,
        type=argon2.Type.ID,
    )
except ImportError:
    print("[ERROR] argon2-cffi is not installed in current Python environment.")
    sys.exit(1)

NEW_PASSWORD = sys.argv[1] if len(sys.argv) > 1 else "KavachSecure2026!"
TARGET_EMAIL = "mkbharvad7174@gmail.com"

# Find database
db_paths = ["backend/dev.db", "dev.db"]
db_path = None
for p in db_paths:
    if os.path.exists(p):
        db_path = p
        break

if not db_path:
    print("[ERROR] dev.db not found!")
    sys.exit(1)

print(f"Connecting to {db_path}...")
conn = sqlite3.connect(db_path)
cur = conn.cursor()

# Check user exists
cur.execute("SELECT id, email, name, is_superuser, is_active, is_locked, failed_login_attempts FROM users WHERE LOWER(email) = LOWER(?)", (TARGET_EMAIL,))
row = cur.fetchone()

if not row:
    print(f"[ERROR] User {TARGET_EMAIL} not found in database!")
    sys.exit(1)

uid, email, name, is_super, is_act, is_locked, failed_attempts = row
print(f"Found User: {name} ({email})")
print(f"  Current Status: is_superuser={is_super}, is_active={is_act}, is_locked={is_locked}, failed_login_attempts={failed_attempts}")

# Hash new password
new_hash = ph.hash(NEW_PASSWORD)
print(f"Generated new Argon2id hash for password: {NEW_PASSWORD}")

# Update user
cur.execute("""
    UPDATE users 
    SET password_hash = ?,
        is_active = 1,
        is_verified = 1,
        is_superuser = 1,
        is_locked = 0,
        locked_until = NULL,
        failed_login_attempts = 0
    WHERE LOWER(email) = LOWER(?)
""", (new_hash, TARGET_EMAIL))

conn.commit()
conn.close()

print("=" * 60)
print(f"[SUCCESS] Password for {TARGET_EMAIL} has been reset!")
print(f"New Password: {NEW_PASSWORD}")
print("Account unlocked, superuser enabled, verified.")
print("=" * 60)
