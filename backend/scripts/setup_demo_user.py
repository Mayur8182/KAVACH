import sys, sqlite3
sys.path.insert(0, "backend")
from app.core.security import hash_password

conn = sqlite3.connect("backend/dev.db")
cursor = conn.cursor()
pwd = hash_password("KavachDemo2026!")
cursor.execute("UPDATE users SET password_hash = ? WHERE email = ?", (pwd, "demo@kavach.security"))
conn.commit()
cursor.execute("SELECT email, password_hash FROM users WHERE email = ?", ("demo@kavach.security",))
print("Updated:", cursor.fetchall())
conn.close()

