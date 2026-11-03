import asyncio
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.core.security import create_access_token
from app.models.user import User
import httpx

async def test():
    async with AsyncSessionLocal() as db:
        user_res = await db.execute(select(User).where(User.email == "mkbharvad7174@gmail.com"))
        user = user_res.scalars().first()
        if not user:
            print("ERROR: User mkbharvad7174@gmail.com not found!")
            return

        print(f"User: id={user.id}, email={user.email}, is_superuser={user.is_superuser}")
        token = create_access_token(subject=str(user.id))

    headers = {"Authorization": f"Bearer {token}"}
    base_url = "http://127.0.0.1:8000"

    endpoints = [
        "/api/v1/auth/me",
        "/api/v1/superadmin/tenants?page=1&page_size=8",
        "/api/v1/superadmin/plans?page=1&page_size=10",
        "/api/v1/superadmin/tenant-plan-assignments",
        "/api/v1/superadmin/entitlements",
        # Module 03 Part 4 Quotas
        "/api/v1/superadmin/quotas/repositories",
        "/api/v1/superadmin/quotas/scans",
        "/api/v1/superadmin/quotas/api-usage",
        "/api/v1/superadmin/quotas/storage",
        "/api/v1/superadmin/quotas/overrides",
        "/api/v1/superadmin/quotas/history",
        "/api/v1/superadmin/quotas/alerts",
        # Developer Seats
        "/api/v1/superadmin/seat-limits",
        "/api/v1/superadmin/seat-limits/usage",
        "/api/v1/superadmin/seat-limits/policies",
        "/api/v1/superadmin/seat-limits/overrides",
        # Trials
        "/api/v1/superadmin/trials",
        "/api/v1/superadmin/trials/history",
    ]

    async with httpx.AsyncClient(timeout=10.0) as client:
        for ep in endpoints:
            try:
                resp = await client.get(f"{base_url}{ep}", headers=headers)
                print(f"{ep} -> Status: {resp.status_code}")
                if resp.status_code != 200:
                    print(f"   Response: {resp.text[:200]}")
            except Exception as e:
                print(f"{ep} -> Connection failed ({e})")

if __name__ == "__main__":
    asyncio.run(test())
