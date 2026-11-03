import asyncio
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.user import User

async def run():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(User))
        users = res.scalars().all()
        print(f"Total users found: {len(users)}")
        for u in users:
            print(f"User: id={u.id}, email={u.email}, is_superuser={u.is_superuser}, is_active={u.is_active}")
            if u.email.lower() == "mkbharvad7174@gmail.com" or "bharvad" in u.email.lower() or "admin" in u.email.lower():
                u.is_superuser = True
                u.is_active = True
                u.is_verified = True
                print(f"--> PROMOTED TO SUPERUSER: {u.email}")
        
        await db.commit()
        print("[SUCCESS] Superuser promotion completed successfully!")

if __name__ == "__main__":
    asyncio.run(run())
