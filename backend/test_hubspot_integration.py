import asyncio
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.services.hubspot_service import hubspot_service
from app.api.v1.hubspot import router as hubspot_router

async def main():
    print("[1] Testing record_sync_log...")
    log_id = await hubspot_service.record_sync_log(
        entity_type="CONTACT",
        internal_id="test_lead@kavachsecurity.me",
        operation="CREATE",
        status="SUCCESS",
        hubspot_id="hs_test_98765",
        payload_snapshot={"email": "test_lead@kavachsecurity.me", "name": "Audit Lead"},
    )
    print(f" -> Recorded log ID: {log_id}")

    print("[2] Testing get_sync_health...")
    health = await hubspot_service.get_sync_health()
    print(f" -> Health: {health}")
    assert health["total_operations"] >= 1
    assert health["successful_operations"] >= 1

    print("[3] Testing list_sync_logs...")
    logs = await hubspot_service.list_sync_logs(limit=10)
    print(f" -> Retrieved {len(logs)} logs.")
    assert any(l["id"] == log_id for l in logs)

    print("[4] Testing test_connection() without token...")
    conn_res = await hubspot_service.test_connection()
    print(f" -> Connection result: {conn_res['status']} ({conn_res['message']})")

    print("[5] Testing hubspot_router routes...")
    routes = [r.path for r in hubspot_router.routes]
    print(f" -> Registered endpoints: {routes}")
    assert any("/status" in r for r in routes)
    assert any("/connect" in r for r in routes)
    assert any("/disconnect" in r for r in routes)
    assert any("/logs" in r for r in routes)
    assert any("/settings" in r for r in routes)

    print("\nALL HUBSPOT INTEGRATION TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    asyncio.run(main())
