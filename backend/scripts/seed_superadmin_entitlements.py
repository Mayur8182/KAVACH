"""
Seed Script for Founder SuperAdmin Feature Entitlements & Catalog (Part 2)
Strict adherence to AGENTS.md:
- Real DB persistence
- No fake/mock data
- Deterministic records linking features, dependencies, and plan availability
"""

import asyncio
import uuid
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import select, text
from app.core.database import AsyncSessionLocal, engine
from app.models.base import Base
import app.models
from app.services.superadmin_entitlement_service import SuperAdminEntitlementService


async def seed_entitlements():
    print("--- Running Startup Migrations & Table Creation for Entitlements ---")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Check and patch any missing columns on feature_catalog
        res = await conn.execute(text("PRAGMA table_info(feature_catalog)"))
        cols = [r[1] for r in res.fetchall()]
        print(f"feature_catalog columns: {cols}")

        new_cols = [
            ("module", "VARCHAR(100) DEFAULT 'Code Security'"),
            ("status", "VARCHAR(50) DEFAULT 'ENABLED'"),
            ("scope", "VARCHAR(50) DEFAULT 'GLOBAL'"),
            ("show_in_ui", "BOOLEAN DEFAULT 1"),
            ("requires_org_setup", "BOOLEAN DEFAULT 0"),
            ("menu_location", "VARCHAR(100) DEFAULT 'Security'"),
            ("icon", "VARCHAR(100) DEFAULT 'Shield'"),
            ("config_schema", "JSON"),
            ("default_config", "JSON"),
            ("external_dependencies", "JSON"),
            ("plan_availability", "JSON"),
        ]
        for col, col_type in new_cols:
            if col not in cols:
                await conn.execute(text(f"ALTER TABLE feature_catalog ADD COLUMN {col} {col_type}"))
                print(f"Added column {col} to feature_catalog")

    async with AsyncSessionLocal() as db:
        service = SuperAdminEntitlementService(db)
        print("--- Ensuring Canonical Feature Catalog & Plan Availability ---")
        features = await service.ensure_catalog()
        print(f"Catalog has {len(features)} active canonical features.")

        # Test matrix generation
        matrix = await service.get_entitlements_matrix()
        print(f"Matrix built successfully: {len(matrix['plans'])} plans, {len(matrix['categories'])} categories.")

        # Print categories and feature counts
        for cat in matrix["categories"]:
            print(f"  - Category: {cat['name']} ({len(cat['features'])} features)")


if __name__ == "__main__":
    asyncio.run(seed_entitlements())
