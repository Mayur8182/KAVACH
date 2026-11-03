import asyncio
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import AsyncSessionLocal
from app.services.superadmin_tenant_service import SuperAdminTenantService

async def test():
    async with AsyncSessionLocal() as db:
        svc = SuperAdminTenantService(db)
        res = await svc.list_tenants(page=1, page_size=8, sort_by="created_at", sort_order="asc")
        print("TOTAL:", res["total"])
        print("STATS:", res["stats"])
        for item in res["items"]:
            print(f"{item['name']} - Plan: {item['plan']} - Status: {item['status']} - Members: {item['members_count']} - Repos: {item['repositories_count']} - Date: {item['created_at'][:10]}")

if __name__ == "__main__":
    asyncio.run(test())
