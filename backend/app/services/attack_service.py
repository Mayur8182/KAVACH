import uuid
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.attack import AttackCampaign, AttackTarget, AttackTest, AttackResult
from app.engines.attack.planner.service import AttackPlanner
from app.engines.attack.safety.service import SafetyValidator
from app.engines.attack.executor.service import AttackExecutor
from app.engines.attack.oracle.service import OracleEngine
from app.services.investigation_service import InvestigationService

logger = logging.getLogger(__name__)

class AttackService:
    """
    Main orchestration service for the Attack / Verification Engine (Step 16).
    """
    def __init__(self, db: AsyncSession, investigation_service: Optional[InvestigationService] = None):
        self.db = db
        self.investigation_service = investigation_service
        
        self.planner = AttackPlanner()
        self.safety = SafetyValidator()
        self.executor = AttackExecutor(db)
        self.oracle = OracleEngine()
        
    async def create_target(self, project_id: uuid.UUID, target_type: str, identifier: str, environment: str) -> AttackTarget:
        target = AttackTarget(
            project_id=project_id,
            target_type=target_type,
            target_identifier=identifier,
            environment=environment,
            status="ACTIVE"
        )
        self.db.add(target)
        await self.db.commit()
        await self.db.refresh(target)
        return target

    async def create_campaign(
        self,
        project_id: uuid.UUID,
        target_id: uuid.UUID,
        name: str,
        environment: str,
        created_by_type: str,
        created_by_id: str,
        policy_decision_id: Optional[uuid.UUID] = None
    ) -> AttackCampaign:
        
        target_stmt = select(AttackTarget).where(AttackTarget.id == target_id)
        target = (await self.db.execute(target_stmt)).scalar_one_or_none()
        if not target:
            raise ValueError("Target not found")
            
        campaign = AttackCampaign(
            project_id=project_id,
            name=name,
            environment=environment,
            target_type=target.target_type,
            target_id=target.id,
            created_by_type=created_by_type,
            created_by_id=created_by_id,
            policy_decision_id=policy_decision_id,
            status="DRAFT"
        )
        self.db.add(campaign)
        await self.db.commit()
        await self.db.refresh(campaign)
        return campaign
        
    async def plan_campaign(self, campaign_id: uuid.UUID, contracts: List[Dict[str, Any]] = None) -> List[AttackTest]:
        campaign = (await self.db.execute(select(AttackCampaign).where(AttackCampaign.id == campaign_id))).scalar_one_or_none()
        target = (await self.db.execute(select(AttackTarget).where(AttackTarget.id == campaign.target_id))).scalar_one_or_none()
        
        tests = self.planner.generate_tests_for_campaign(campaign, target, contracts)
        
        for t in tests:
            self.db.add(t)
            
        campaign.status = "PLANNED"
        await self.db.commit()
        return tests

    async def approve_and_queue(self, campaign_id: uuid.UUID) -> bool:
        campaign = (await self.db.execute(select(AttackCampaign).where(AttackCampaign.id == campaign_id))).scalar_one_or_none()
        target = (await self.db.execute(select(AttackTarget).where(AttackTarget.id == campaign.target_id))).scalar_one_or_none()
        
        if not self.safety.validate_campaign(campaign, target):
            campaign.status = "BLOCKED"
            campaign.failure_reason = "Safety or Authorization validation failed"
            await self.db.commit()
            return False
            
        campaign.status = "QUEUED"
        await self.db.commit()
        return True

    async def execute_campaign(self, campaign_id: uuid.UUID, mock_behaviors: Dict[str, Any] = None) -> None:
        """
        Executes all queued tests for the campaign.
        """
        campaign = (await self.db.execute(select(AttackCampaign).where(AttackCampaign.id == campaign_id))).scalar_one_or_none()
        target = (await self.db.execute(select(AttackTarget).where(AttackTarget.id == campaign.target_id))).scalar_one_or_none()
        
        if campaign.status != "QUEUED":
            return
            
        campaign.status = "RUNNING"
        campaign.started_at = datetime.now(timezone.utc)
        await self.db.commit()
        
        tests = (await self.db.execute(select(AttackTest).where(AttackTest.campaign_id == campaign_id))).scalars().all()
        
        for test in tests:
            if not self.safety.validate_test(test):
                test.status = "BLOCKED"
                await self.db.commit()
                continue
                
            test.status = "RUNNING"
            test.started_at = datetime.now(timezone.utc)
            await self.db.commit()
            
            # mock behavior lookup for tests
            mock_behavior = mock_behaviors.get(test.name) if mock_behaviors else None
            
            # 1. Execute and get actual behavior + evidence
            actual_behavior, evidence = await self.executor.execute_test(test, target, mock_actual_behavior=mock_behavior)
            
            # 2. Oracle determines VERIFIED vs VIOLATED
            oracle_result = self.oracle.evaluate(test, actual_behavior)
            
            # 3. Save results
            result = AttackResult(
                attack_test_id=test.id,
                result=oracle_result,
                oracle_type="DETERMINISTIC",
                expected_behavior=test.expected_behavior,
                actual_behavior=actual_behavior,
                confidence=1.0,
                evidence_ids=[str(evidence.id)]
            )
            self.db.add(result)
            
            test.actual_behavior = actual_behavior
            test.oracle_result = oracle_result
            test.status = oracle_result # 'VERIFIED', 'VIOLATED', 'UNKNOWN'
            test.completed_at = datetime.now(timezone.utc)
            await self.db.commit()
            
            # 4. Trigger Step 15 if VIOLATED
            if oracle_result == "VIOLATED" and self.investigation_service:
                await self.investigation_service.create_investigation(
                    project_id=campaign.project_id,
                    title=f"Attack Test Violated: {test.name}",
                    trigger_type="ATTACK_VERIFICATION_FAILURE",
                    trigger_id=str(test.id),
                    severity="HIGH",
                    priority="HIGH",
                    created_by_type="SYSTEM_ATTACK_ENGINE",
                    created_by_id="system",
                    description=f"Security property failed verification. Actual behavior: {actual_behavior}"
                )
                
        campaign.status = "COMPLETED"
        campaign.completed_at = datetime.now(timezone.utc)
        await self.db.commit()
