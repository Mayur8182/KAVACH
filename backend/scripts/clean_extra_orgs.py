import asyncio
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import select, delete
from app.core.database import AsyncSessionLocal
from app.models.organization import Organization, OrganizationSubscription
from scripts.seed_all_24_organizations import ALL_24_ORGANIZATIONS

async def clean():
    valid_slugs = {o["slug"] for o in ALL_24_ORGANIZATIONS}
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(Organization))
        all_orgs = res.scalars().all()
        for o in all_orgs:
            if o.slug not in valid_slugs:
                print(f"Removing extra test org: {o.slug} ({o.name})")
                await db.execute(delete(OrganizationSubscription).where(OrganizationSubscription.organization_id == o.id))
                await db.delete(o)
        await db.commit()

        # Check final count
        count_res = await db.execute(select(Organization))
        final_orgs = count_res.scalars().all()
        print(f"Final orgs count in DB: {len(final_orgs)}")

if __name__ == "__main__":
    asyncio.run(clean())
