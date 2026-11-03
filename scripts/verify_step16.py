import asyncio
import logging
import uuid
import sys
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession

# Use in-memory SQLite for verification script
DATABASE_URL = "sqlite+aiosqlite:///:memory:"

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

async def run_verification():
    logger.info("Initializing in-memory database for Step 16 Verification...")
    import sys
    import os
    sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))
    
    from app.models import Base
    from app.models.project import Project
    from app.models.user import User
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    from app.services.attack_service import AttackService
    from app.services.investigation_service import InvestigationService
    from app.services.ai_provider_service import MockInvestigationLLMProvider
    
    async with AsyncSessionLocal() as session:
        # Setup mock project and user
        user = User(email="sec@example.com", name="Sec Eng", password_hash="pw")
        session.add(user)
        await session.commit()
        await session.refresh(user)
        
        project_id = uuid.uuid4()
        project = Project(id=project_id, name="Secure Project", description="Test", owner_id=user.id)
        session.add(project)
        await session.commit()
        
        investigation_service = InvestigationService(session, ai_provider=MockInvestigationLLMProvider())
        attack_service = AttackService(session, investigation_service=investigation_service)
        
        logger.info(f"Created project: {project_id}")
        
        # Create Target
        target = await attack_service.create_target(
            project_id=project_id,
            target_type="API",
            identifier="test-api",
            environment="TEST"
        )
        logger.info(f"Created Target: {target.id}")
        
        # --- TEST 1 & TEST 2: Tenant Isolation ---
        logger.info("--- TEST 1: Tenant Isolation (VIOLATED) ---")
        campaign = await attack_service.create_campaign(
            project_id=project_id,
            target_id=target.id,
            name="Tenant Isolation Verification",
            environment="TEST",
            created_by_type="SYSTEM",
            created_by_id="system"
        )
        
        contracts = [{"invariant": "requester.tenant_id == invoice.tenant_id"}]
        await attack_service.plan_campaign(campaign.id, contracts)
        await attack_service.approve_and_queue(campaign.id)
        
        # Mock behavior: API wrongly allows cross-tenant access (Returns 200, data_returned=True)
        mock_behaviors = {
            "tenant-isolation-test": {"status_code": 200, "data_returned": True}
        }
        await attack_service.execute_campaign(campaign.id, mock_behaviors)
        
        # Verify result is VIOLATED and Investigation is created
        from app.models.attack import AttackTest
        test_1 = (await session.execute(select(AttackTest).where(AttackTest.campaign_id == campaign.id))).scalar_one()
        logger.info(f"Test 1 Result: {test_1.oracle_result}")
        assert test_1.oracle_result == "VIOLATED"
        
        from app.models.investigation import SecurityInvestigation
        inv = (await session.execute(select(SecurityInvestigation).where(SecurityInvestigation.trigger_id == str(test_1.id)))).scalar_one_or_none()
        logger.info(f"Investigation created from Violation: {inv.id if inv else None}")
        assert inv is not None
        
        logger.info("--- TEST 2: Tenant Isolation Retest (VERIFIED) ---")
        # Assume remediation patched the bug, let's retest
        campaign_retest = await attack_service.create_campaign(
            project_id=project_id,
            target_id=target.id,
            name="Tenant Isolation Retest",
            environment="TEST",
            created_by_type="SYSTEM",
            created_by_id="system"
        )
        await attack_service.plan_campaign(campaign_retest.id, contracts)
        await attack_service.approve_and_queue(campaign_retest.id)
        
        # Mock behavior: API now blocks cross-tenant access (Returns 403, data_returned=False)
        mock_behaviors_retest = {
            "tenant-isolation-test": {"status_code": 403, "data_returned": False}
        }
        await attack_service.execute_campaign(campaign_retest.id, mock_behaviors_retest)
        test_2 = (await session.execute(select(AttackTest).where(AttackTest.campaign_id == campaign_retest.id))).scalar_one()
        logger.info(f"Test 2 Result: {test_2.oracle_result}")
        assert test_2.oracle_result == "VERIFIED"
        
        # --- TEST 3: Agent Authority ---
        logger.info("--- TEST 3: Agent Authority ---")
        campaign_agent = await attack_service.create_campaign(
            project_id=project_id,
            target_id=target.id,
            name="Agent Authority Check",
            environment="TEST",
            created_by_type="SYSTEM",
            created_by_id="system"
        )
        contracts_agent = [{"invariant": "Agent authority delegation boundary"}]
        await attack_service.plan_campaign(campaign_agent.id, contracts_agent)
        await attack_service.approve_and_queue(campaign_agent.id)
        
        # Mock behavior: Agent tries delete, but is denied
        mock_behaviors_agent = {
            "agent-authority-test": {"status_code": 403, "action_allowed": False}
        }
        await attack_service.execute_campaign(campaign_agent.id, mock_behaviors_agent)
        test_3 = (await session.execute(select(AttackTest).where(AttackTest.campaign_id == campaign_agent.id))).scalar_one()
        logger.info(f"Test 3 Result: {test_3.oracle_result}")
        assert test_3.oracle_result == "VERIFIED"
        
        # --- TEST 4: Policy Block on Production ---
        logger.info("--- TEST 4: Policy Block on Production ---")
        target_prod = await attack_service.create_target(
            project_id=project_id,
            target_type="API",
            identifier="prod-api",
            environment="PRODUCTION"
        )
        campaign_prod = await attack_service.create_campaign(
            project_id=project_id,
            target_id=target_prod.id,
            name="Production Test",
            environment="PRODUCTION",
            created_by_type="SYSTEM",
            created_by_id="system"
        )
        approved = await attack_service.approve_and_queue(campaign_prod.id)
        logger.info(f"Production Campaign Approved: {approved}")
        assert not approved
        assert campaign_prod.status == "BLOCKED"
        
        # --- TEST 6: Rate Limit Verification ---
        logger.info("--- TEST 6: Rate Limit Verification ---")
        campaign_rate = await attack_service.create_campaign(
            project_id=project_id,
            target_id=target.id,
            name="Rate Limit Check",
            environment="TEST",
            created_by_type="SYSTEM",
            created_by_id="system"
        )
        contracts_rate = [{"invariant": "rate_limit_enforced"}]
        await attack_service.plan_campaign(campaign_rate.id, contracts_rate)
        await attack_service.approve_and_queue(campaign_rate.id)
        
        mock_behaviors_rate = {
            "rate-limit-test": {"status_code": 429, "rate_limited": True}
        }
        await attack_service.execute_campaign(campaign_rate.id, mock_behaviors_rate)
        test_6 = (await session.execute(select(AttackTest).where(AttackTest.campaign_id == campaign_rate.id))).scalar_one()
        logger.info(f"Test 6 Result: {test_6.oracle_result}")
        assert test_6.oracle_result == "VERIFIED"
        
        # --- TEST 7: Replay Protection ---
        logger.info("--- TEST 7: Replay Protection ---")
        campaign_replay = await attack_service.create_campaign(
            project_id=project_id,
            target_id=target.id,
            name="Replay Protection Check",
            environment="TEST",
            created_by_type="SYSTEM",
            created_by_id="system"
        )
        contracts_replay = [{"invariant": "replay_protection"}]
        await attack_service.plan_campaign(campaign_replay.id, contracts_replay)
        await attack_service.approve_and_queue(campaign_replay.id)
        
        mock_behaviors_replay = {
            "replay-protection-test": {"status_code": 409, "second_request_allowed": False}
        }
        await attack_service.execute_campaign(campaign_replay.id, mock_behaviors_replay)
        test_7 = (await session.execute(select(AttackTest).where(AttackTest.campaign_id == campaign_replay.id))).scalar_one()
        logger.info(f"Test 7 Result: {test_7.oracle_result}")
        assert test_7.oracle_result == "VERIFIED"

        logger.info("\u2705 STEP 16 VERIFICATION SUCCESSFUL")

if __name__ == "__main__":
    asyncio.run(run_verification())
