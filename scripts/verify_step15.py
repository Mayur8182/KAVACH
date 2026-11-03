import asyncio
import uuid
import sys
import logging
from pathlib import Path
from datetime import datetime, timezone

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import StaticPool

from app.models.base import Base
from app.models.project import Project
from app.models.user import User
from app.services.investigation_service import InvestigationService
from app.services.remediation_service import RemediationService
from app.services.ai_provider_service import MockInvestigationLLMProvider

logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

async def main():
    logger.info("Initializing in-memory database for Step 15 Verification...")
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    
    async with AsyncSessionLocal() as session:
        # 1. Setup mock data
        user = User(email="investigator@example.com", name="Test User", password_hash="pw")
        session.add(user)
        await session.commit()
        await session.refresh(user)
        
        project = Project(name="Secure Control Plane", description="Step 15 Demo", owner_id=user.id)
        session.add(project)
        await session.commit()
        await session.refresh(project)
        
        logger.info(f"Created project: {project.id}")
        
        # 2. Initialize Services
        ai_provider = MockInvestigationLLMProvider()
        inv_service = InvestigationService(session, ai_provider)
        rem_service = RemediationService(session, ai_provider)
        
        # 3. Create Investigation
        logger.info("--- 1. TRIGGER: Creating Security Investigation ---")
        inv = await inv_service.create_investigation(
            project_id=project.id,
            title="SQL Injection Detected in Payment Endpoint",
            trigger_type="SCANNER_FINDING",
            trigger_id=str(uuid.uuid4()),
            severity="HIGH",
            priority="CRITICAL",
            created_by_type="SYSTEM",
            created_by_id="system_scanner",
            description="Semgrep detected unparameterized SQL query at backend/payment.py:84"
        )
        logger.info(f"Investigation created: {inv.id} with status {inv.status}")
        
        # 4. Analyze (Evidence Collection -> Hypotheses -> Validation)
        logger.info("--- 2. INVESTIGATION: AI Analysis & Hypothesis Generation ---")
        analysis = await inv_service.analyze(inv.id)
        await session.refresh(inv)
        
        logger.info(f"Investigation Status: {inv.status}")
        logger.info(f"Observations: {analysis['observations']}")
        logger.info(f"Hypotheses: {analysis['hypotheses']}")
        
        # 5. Create Remediation Plan
        logger.info("--- 3. REMEDIATION: Generating Remediation Plan ---")
        context = {"investigation_id": str(inv.id), "title": inv.title}
        plan = await rem_service.create_plan(
            project_id=project.id,
            investigation_id=inv.id,
            created_by_type="SYSTEM",
            created_by_id="system",
            context=context
        )
        logger.info(f"Plan created: {plan.id} with status {plan.status}")
        
        # 6. Approve Plan
        logger.info("--- 4. APPROVAL: Approving Remediation Plan ---")
        approved = await rem_service.approve_plan(plan.id)
        await session.refresh(plan)
        logger.info(f"Plan approval status: {approved}, Plan Status: {plan.status}")
        
        # 7. Execute Plan
        logger.info("--- 5. EXECUTION: Generating Patch, Validating, and Applying ---")
        result = await rem_service.execute_plan(
            plan_id=plan.id,
            actor_type="USER",
            actor_id=str(user.id),
            context=context
        )
        await session.refresh(plan)
        
        logger.info(f"Execution Result: {result}")
        logger.info(f"Final Plan Status: {plan.status}")
        
        if result == "FIX_VERIFIED":
            logger.info("✅ STEP 15 VERIFICATION SUCCESSFUL")
        else:
            logger.error("❌ STEP 15 VERIFICATION FAILED")

if __name__ == "__main__":
    asyncio.run(main())
