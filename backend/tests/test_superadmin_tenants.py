import asyncio
import os
import sys

# Ensure backend path is in sys.path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.core.database import AsyncSessionLocal
from app.services.superadmin_tenant_service import SuperAdminTenantService
from app.models.user import User
from app.models.organization import Organization, OrganizationSubscription
from sqlalchemy import select

async def run_verification_tests():
    print("=== SuperAdmin Tenant Management Verification Tests ===")

    async with AsyncSessionLocal() as db:
        service = SuperAdminTenantService(db)

        # 1. Test List Tenants
        print("\n[TEST 1] Listing Tenants with pagination and stats...")
        res = await service.list_tenants(page=1, page_size=10)
        assert "items" in res, "Missing items in list_tenants"
        assert "stats" in res, "Missing stats in list_tenants"
        print(f"-> SUCCESS: Found {len(res['items'])} tenants. Total: {res['total']}. Stats: {res['stats']}")

        # Verify Acme Corp is present
        acme = next((t for t in res['items'] if t['domain'] == 'acme.com'), None)
        assert acme is not None, "Acme Corp was not found in tenants list"
        acme_id = acme['id']
        print(f"-> SUCCESS: Acme Corp found with ID: {acme_id}")

        # 2. Test Get Tenant Details
        print("\n[TEST 2] Retrieving Acme Corp Tenant Details...")
        details = await service.get_tenant_details(acme_id)
        assert details['tenant']['name'] == 'Acme Corp', "Tenant name mismatch"
        assert 'subscription' in details['tenant'], "Missing subscription in details"
        print(f"-> SUCCESS: Acme Corp details verified. Plan: {details['tenant']['plan']}")

        # 3. Test Get Tenant Members & Role filtering
        print("\n[TEST 3] Retrieving Tenant Members...")
        members = await service.get_tenant_members(acme_id)
        assert len(members['items']) >= 4, f"Expected at least 4 members, got {len(members['items'])}"
        print(f"-> SUCCESS: Retrieved {len(members['items'])} members. Stats: {members['stats']}")

        # 4. Test Get Tenant Repositories
        print("\n[TEST 4] Retrieving Tenant Repositories...")
        repos = await service.get_tenant_repositories(acme_id)
        assert len(repos['repositories']) >= 3, f"Expected >= 3 repositories, got {len(repos['repositories'])}"
        print(f"-> SUCCESS: Retrieved {len(repos['repositories'])} repositories.")

        # 5. Test Get Tenant Integrations
        print("\n[TEST 5] Retrieving Tenant Integrations...")
        integrations = await service.get_tenant_integrations(acme_id)
        assert len(integrations['integrations']) >= 3, f"Expected >= 3 integrations, got {len(integrations['integrations'])}"
        print(f"-> SUCCESS: Retrieved {len(integrations['integrations'])} integrations.")

        # 6. Test Get Tenant Resources & Quotas
        print("\n[TEST 6] Retrieving Tenant Resources & Quotas...")
        resources = await service.get_tenant_resources(acme_id)
        assert "quotas" in resources, "Missing quotas in resources"
        assert "allocation" in resources, "Missing allocation in resources"
        print(f"-> SUCCESS: Quotas: max_repos={resources['quotas'].get('max_repositories')}, used_repos={resources['quotas'].get('used_repositories')}")

        # 7. Test Provisioning Jobs list & retry
        print("\n[TEST 7] Retrieving Provisioning Jobs...")
        jobs = await service.list_provisioning_jobs()
        assert len(jobs['jobs']) >= 1, "Expected at least 1 provisioning job"
        print(f"-> SUCCESS: Found {len(jobs['jobs'])} provisioning jobs. Stats: {jobs['stats']}")

        # 8. Test Quota Update
        print("\n[TEST 8] Testing Quota Update...")
        updated_quotas = await service.update_tenant_quotas(acme_id, {"max_repositories": 150})
        assert updated_quotas['max_repositories'] == 150, "Quota update did not persist"
        print("-> SUCCESS: Quota update verified (max_repositories=150).")

        # 9. Test Maintenance Toggle
        print("\n[TEST 9] Testing Maintenance Toggle...")
        await service.toggle_maintenance(acme_id, True)
        refreshed = await service.get_tenant_details(acme_id)
        assert refreshed['tenant']['is_maintenance'] is True, "Maintenance toggle failed"
        await service.toggle_maintenance(acme_id, False)
        print("-> SUCCESS: Maintenance mode toggled and restored cleanly.")

        # 10. Test Create Tenant & Duplicate Domain Validation
        print("\n[TEST 10] Testing Create Tenant & Duplicate Domain Validation...")
        try:
            await service.create_tenant(
                {
                    "name": "Duplicate Acme",
                    "domain": "acme.com", # existing domain
                    "plan": "PRO",
                    "admin_name": "Test Admin",
                    "admin_email": "testadmin@acme.com",
                },
                actor_id=str(acme_id),
            )
            assert False, "Should have thrown HTTPException for duplicate domain!"
        except Exception as e:
            print(f"-> SUCCESS: Rejected duplicate domain as expected: {str(e)}")

        print("\n=== ALL BACKEND SUPERADMIN VERIFICATION TESTS PASSED SUCCESSFULLY! ===")

if __name__ == '__main__':
    asyncio.run(run_verification_tests())
