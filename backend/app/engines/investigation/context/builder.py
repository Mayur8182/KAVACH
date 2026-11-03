import uuid
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.investigation import SecurityInvestigation
from app.models.project import Project
from app.contracts.models import SecurityContract, SecurityContractViolation
from app.models.mcp import MCPSession

class InvestigationContextBuilder:
    def __init__(self, db: AsyncSession):
        self.db = db
        
    async def build_context(self, investigation_id: uuid.UUID) -> Dict[str, Any]:
        """
        Builds a comprehensive investigation context by pulling real evidence
        from the database. 
        """
        # Fetch the investigation
        stmt = select(SecurityInvestigation).where(SecurityInvestigation.id == investigation_id)
        result = await self.db.execute(stmt)
        investigation = result.scalar_one_or_none()
        
        if not investigation:
            raise ValueError(f"Investigation {investigation_id} not found")
            
        context = {
            "investigation_id": str(investigation.id),
            "title": investigation.title,
            "description": investigation.description,
            "trigger_type": investigation.trigger_type,
            "trigger_id": investigation.trigger_id,
            "severity": investigation.severity,
        }
        
        # 1. Project Context
        project_stmt = select(Project).where(Project.id == investigation.project_id)
        project = (await self.db.execute(project_stmt)).scalar_one_or_none()
        if project:
            context["project"] = {
                "id": str(project.id),
                "name": project.name,
                "description": project.description,
            }
            
        # 2. Add Trigger-Specific Evidence
        if investigation.trigger_type == "CONTRACT_VIOLATION" and investigation.violation_id:
            violation_stmt = select(SecurityContractViolation).where(SecurityContractViolation.id == investigation.violation_id)
            violation = (await self.db.execute(violation_stmt)).scalar_one_or_none()
            if violation:
                context["contract_violation"] = {
                    "id": str(violation.id),
                    "contract_version_id": str(violation.contract_version_id),
                    "violation_details": violation.violation_details,
                    "evidence": violation.evidence_metadata,
                    "severity": violation.severity,
                    "detected_at": violation.detected_at.isoformat() if violation.detected_at else None
                }
                
        # Additional context gathering (Intent, Blueprint, etc.) would go here
        # For Step 15, we ensure we only load relevant context based on the trigger.
        
        return context
