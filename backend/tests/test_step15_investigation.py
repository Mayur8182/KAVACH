import pytest
import pytest_asyncio
import uuid
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession
from app.services.investigation_service import InvestigationService
from app.services.remediation_service import RemediationService
from app.services.ai_provider_service import MockInvestigationLLMProvider
from app.models.project import Project
from app.models.investigation import SecurityInvestigation
from app.models.remediation import RemediationPlan, RemediationPatch

@pytest_asyncio.fixture
async def investigation_project(db_session: AsyncSession, user_a):
    proj = Project(name="Step 15 Test Project", description="Test Project for Remediation", owner_id=user_a.id)
    db_session.add(proj)
    await db_session.commit()
    await db_session.refresh(proj)
    return proj

@pytest.mark.asyncio
async def test_investigation_and_remediation_e2e(db_session: AsyncSession, investigation_project: Project):
    # 1. Setup mock provider
    ai_provider = MockInvestigationLLMProvider()
    
    # 2. Services
    inv_service = InvestigationService(db_session, ai_provider)
    rem_service = RemediationService(db_session, ai_provider)
    
    # 3. Create Investigation
    inv = await inv_service.create_investigation(
        project_id=investigation_project.id,
        title="Test Incident",
        trigger_type="SECURITY_INCIDENT",
        trigger_id=str(uuid.uuid4()),
        severity="HIGH",
        priority="HIGH",
        created_by_type="SYSTEM",
        created_by_id="system"
    )
    assert inv.status == "CREATED"
    
    # 4. Analyze
    analysis = await inv_service.analyze(inv.id)
    assert analysis["investigation_summary"] == "Simulated AI investigation summary."
    
    await db_session.refresh(inv)
    assert inv.status == "REMEDIATION_PROPOSED"
    
    # 5. Create Remediation Plan
    context = {"investigation_id": str(inv.id), "title": inv.title}
    plan = await rem_service.create_plan(
        project_id=investigation_project.id,
        investigation_id=inv.id,
        created_by_type="SYSTEM",
        created_by_id="system",
        context=context
    )
    assert plan.status == "PROPOSED"
    
    # 6. Approve Plan
    approved = await rem_service.approve_plan(plan.id)
    assert approved
    await db_session.refresh(plan)
    assert plan.status == "APPROVED"
    
    # 7. Execute Plan (Generate Patch, Validate, Apply, Verify)
    result = await rem_service.execute_plan(
        plan_id=plan.id,
        actor_type="SYSTEM",
        actor_id="system",
        context=context
    )
    
    assert result == "FIX_VERIFIED"
    
    await db_session.refresh(plan)
    assert plan.status == "VERIFIED"
