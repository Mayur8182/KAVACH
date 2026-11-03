import uuid
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.investigation import SecurityInvestigation, InvestigationEvidence, InvestigationHypothesis
from app.engines.investigation.context.builder import InvestigationContextBuilder
from app.services.ai_provider_service import InvestigationLLMProvider, get_default_ai_provider

logger = logging.getLogger(__name__)

class InvestigationService:
    def __init__(self, db: AsyncSession, ai_provider: Optional[InvestigationLLMProvider] = None):
        self.db = db
        self.ai_provider = ai_provider or get_default_ai_provider()
        self.context_builder = InvestigationContextBuilder(db)

    async def create_investigation(
        self,
        project_id: uuid.UUID,
        title: str,
        trigger_type: str,
        trigger_id: str,
        severity: str,
        priority: str,
        created_by_type: str,
        created_by_id: str,
        description: Optional[str] = None,
        incident_id: Optional[uuid.UUID] = None,
        violation_id: Optional[uuid.UUID] = None
    ) -> SecurityInvestigation:
        inv = SecurityInvestigation(
            project_id=project_id,
            title=title,
            description=description,
            trigger_type=trigger_type,
            trigger_id=trigger_id,
            severity=severity,
            priority=priority,
            created_by_type=created_by_type,
            created_by_id=created_by_id,
            status="CREATED",
            incident_id=incident_id,
            violation_id=violation_id
        )
        self.db.add(inv)
        await self.db.commit()
        await self.db.refresh(inv)
        return inv

    async def get_investigation(self, investigation_id: uuid.UUID) -> Optional[SecurityInvestigation]:
        stmt = select(SecurityInvestigation).where(SecurityInvestigation.id == investigation_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def analyze(self, investigation_id: uuid.UUID) -> Dict[str, Any]:
        """
        Gathers context, runs AI analysis, records hypotheses, updates status.
        """
        inv = await self.get_investigation(investigation_id)
        if not inv:
            raise ValueError("Investigation not found")
            
        inv.status = "COLLECTING_EVIDENCE"
        await self.db.commit()

        context = await self.context_builder.build_context(investigation_id)
        if not context:
            inv.status = "INSUFFICIENT_EVIDENCE"
            inv.failure_reason = "No context could be built"
            await self.db.commit()
            return {"status": "INSUFFICIENT_EVIDENCE"}
            
        inv.status = "INVESTIGATING"
        inv.started_at = datetime.now(timezone.utc)
        await self.db.commit()

        try:
            analysis = await self.ai_provider.analyze(context)
            
            # Save hypotheses
            if "hypotheses" in analysis:
                for h_data in analysis["hypotheses"]:
                    hypo = InvestigationHypothesis(
                        investigation_id=inv.id,
                        hypothesis=h_data.get("hypothesis", ""),
                        type=h_data.get("type", "UNKNOWN"),
                        confidence=h_data.get("confidence", 0.0),
                        status="PROPOSED"
                    )
                    self.db.add(hypo)
            
            inv.status = "VALIDATING"
            await self.db.commit()
            
            # Validation step (mock deterministic validation of hypotheses)
            # In a real engine, we'd fire off validation tests here.
            stmt = select(InvestigationHypothesis).where(InvestigationHypothesis.investigation_id == inv.id)
            result = await self.db.execute(stmt)
            hypotheses = result.scalars().all()
            for hypo in hypotheses:
                hypo.status = "VALIDATED"
                hypo.validated_at = datetime.now(timezone.utc)
            
            inv.status = "REMEDIATION_PROPOSED"
            await self.db.commit()
            
            return analysis
            
        except Exception as e:
            logger.exception("AI analysis failed")
            inv.status = "FAILED"
            inv.failure_reason = str(e)
            await self.db.commit()
            raise e
