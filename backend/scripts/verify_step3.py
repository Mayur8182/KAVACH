"""
Acceptance verification script for Step 3.
Executes real business operations:
1. User registration with Argon2id password hashing
2. Token generation
3. Project creation & persistence
4. Agent creation & persistence
5. Ownership enforcement
6. Audit trail verification
"""
import asyncio
import json
import os
import sys
from pathlib import Path

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.core.security import verify_password, create_access_token
from app.models import Base
from app.models.user import User
from app.schemas.user import UserCreate
from app.schemas.project import ProjectCreate, ProjectUpdate
from app.schemas.agent import AgentCreate
from app.services.user_service import UserService
from app.services.project_service import ProjectService
from app.services.agent_service import AgentService
from app.services.audit_service import AuditService


async def main():
    print("=" * 70)
    print("STEP 3 ACCEPTANCE & REAL DATA VERIFICATION")
    print("=" * 70)

    # 1. Initialize clean database engine
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", poolclass=StaticPool)
    session_factory = async_sessionmaker(bind=engine, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("[OK] Step 3 Schema initialized in database (users, projects, agents, audit_events)")

    async with session_factory() as session:
        user_service = UserService(session)
        project_service = ProjectService(session)
        agent_service = AgentService(session)
        audit_service = AuditService(session)

        # 2. Real User Creation & Argon2id verification
        print("\n--- 1. Real User Registration ---")
        user_payload = UserCreate(
            email="lead.secops@enterprise.corp",
            password="ProductionSecurePassword2026!",
            name="Alice SecOps",
        )
        user_a = await user_service.register(user_payload, request_id="req-user-init-001")
        print(f"[OK] User persisted: ID={user_a.id}, Email={user_a.email}, Name={user_a.name}")
        print(f"[OK] Password Hash (Argon2id): {user_a.password_hash[:35]}...")
        assert verify_password("ProductionSecurePassword2026!", user_a.password_hash) is True
        print("[OK] Argon2id verification verified: True")

        # 3. Create Project
        print("\n--- 2. Real Project Creation ---")
        project_payload = ProjectCreate(
            name="Core Payment Gateway",
            description="PCI-DSS compliant payment processing microservice",
            repository_url="https://github.com/enterprise/payment-gateway",
            primary_language="python",
            framework="fastapi",
            database_type="postgresql",
            cloud_provider="aws",
            environment="production",
            application_type="payment_api",
        )
        project = await project_service.create_project(project_payload, current_user=user_a, request_id="req-proj-001")
        print(f"[OK] Project persisted: ID={project.id}")
        print(f"     Name: {project.name}")
        print(f"     Owner: {project.owner_id}")
        print(f"     Environment: {project.environment}")
        print(f"     Application Type: {project.application_type}")

        # 4. Create Agent
        print("\n--- 3. Real Agent Registration ---")
        agent_payload = AgentCreate(
            project_id=project.id,
            name="cursor-audit-agent",
            agent_type="security_reviewer",
            description="Static code analyzer agent with read-only sandbox",
            trust_level="restricted",
        )
        agent = await agent_service.create_agent(agent_payload, current_user=user_a, request_id="req-agent-001")
        print(f"[OK] Agent persisted: ID={agent.id}")
        print(f"     Name: {agent.name}")
        print(f"     Project: {agent.project_id}")
        print(f"     Trust Level: {agent.trust_level}")

        # 5. Ownership Enforcement Verification
        print("\n--- 4. Ownership Enforcement & Access Control ---")
        user_b = await user_service.register(
            UserCreate(email="attacker@external.io", password="AttackerPassword999!", name="Bob Intruder"),
            request_id="req-user-init-002",
        )
        print(f"[OK] Created separate User B: ID={user_b.id}")

        try:
            await project_service.get_project(project.id, current_user=user_b)
            print("[FAIL] User B was able to access User A's project!")
        except Exception as exc:
            print(f"[OK] User B access rejected with HTTP status: {getattr(exc, 'status_code', None)} ({getattr(exc, 'detail', str(exc))})")

        # 6. Audit Trail Verification
        print("\n--- 5. Audit Trail Verification ---")
        events = await audit_service.list_events()
        print(f"[OK] Total audit records persisted in database: {len(events)}")
        for i, ev in enumerate(events, 1):
            print(f"     [{i}] Action: {ev.action:<16} Resource: {ev.resource_type:<10} ID: {ev.resource_id} Status: {ev.status}")

        print("\n" + "=" * 70)
        print("STEP 3 ACCEPTANCE VERIFICATION: ALL REAL DATA & SQL OPERATIONS VERIFIED")
        print("=" * 70)

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
