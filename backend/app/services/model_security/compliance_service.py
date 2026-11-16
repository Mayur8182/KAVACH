"""
Kavach Model Security — Compliance Evidence & Governance Engine
Maps model security findings and scan telemetry to authoritative AI standards:
- OWASP Machine Learning Security Top 10 (2023)
- OWASP Top 10 for LLM Applications
- NIST AI RMF 1.0 (Artificial Intelligence Risk Management Framework)
- ISO/IEC 42001 (Artificial Intelligence Management System)
- SOC 2 Type II AI Controls
Generates dynamic compliance scores and publication-grade PDF/JSON reports.
"""

import io
import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.model_security import (
    ModelAsset,
    ModelFinding,
    ModelScan,
    ModelComplianceEvidence,
)

logger = logging.getLogger("kavach.model_security.compliance")

AI_FRAMEWORK_CONTROLS = {
    "OWASP_ML_TOP_10": [
        {"id": "ML02", "title": "Data & Model Poisoning Defense", "rule_prefixes": ["KAVACH-INTEGRITY"]},
        {"id": "ML05", "title": "Model Backdoor Detection", "rule_prefixes": ["KAVACH-PROV-UNTRUSTED"]},
        {"id": "ML06", "title": "ML Supply Chain Security", "rule_prefixes": ["KAVACH-CVE", "KAVACH-DEP", "KAVACH-CFG-TRUST-REMOTE-CODE"]},
        {"id": "ML09", "title": "Model Serialization Attack Prevention", "rule_prefixes": ["KAVACH-ML-UNSAFE-SERIALIZATION", "KAVACH-MALICIOUS-PICKLE", "KAVACH-ZIP-SLIP"]},
        {"id": "ML10", "title": "Shadow Models & Untrusted Deployments", "rule_prefixes": ["KAVACH-PROV-MISSING-MODEL-CARD", "KAVACH-PROV-MISSING-LICENSE"]},
    ],
    "NIST_AI_RMF": [
        {"id": "GOVERN-1.2", "title": "AI System Security Policies & Guardrails", "rule_prefixes": ["KAVACH-CFG"]},
        {"id": "MAP-1.1", "title": "Intended Use & Model Card Documentation", "rule_prefixes": ["KAVACH-PROV-MISSING-MODEL-CARD"]},
        {"id": "MEASURE-2.3", "title": "Pre-Deployment Artifact & Deserialization Testing", "rule_prefixes": ["KAVACH-ML-UNSAFE-SERIALIZATION", "KAVACH-MALICIOUS-PICKLE"]},
        {"id": "MANAGE-2.4", "title": "Remediation & Automated Fix Verification", "rule_prefixes": ["KAVACH-CVE"]},
    ],
    "ISO_42001": [
        {"id": "A.6.2.2", "title": "AI Lifecycle Management & Model Integrity", "rule_prefixes": ["KAVACH-INTEGRITY", "KAVACH-ST"]},
        {"id": "A.8.4", "title": "Third-Party ML Supply Chain Assurance", "rule_prefixes": ["KAVACH-CVE", "KAVACH-DEP"]},
    ],
    "SOC_2": [
        {"id": "CC6.8", "title": "Protection Against Malicious & Executable Code", "rule_prefixes": ["KAVACH-MALICIOUS-PICKLE", "KAVACH-ZIP-SLIP"]},
        {"id": "CC7.1", "title": "Vulnerability Management & Integrity Monitoring", "rule_prefixes": ["KAVACH-CVE", "KAVACH-CFG-WEIGHTS-ONLY"]},
    ],
}


class ModelComplianceService:
    """
    Evaluates dynamic compliance evidence derived from real model security scans.
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def evaluate_compliance(
        self,
        organization_id: Optional[uuid.UUID] = None,
        project_id: Optional[uuid.UUID] = None,
    ) -> Dict[str, Any]:
        """
        Dynamically evaluates compliance posture against authoritative AI frameworks.
        Zero hardcoded statuses: evidence is computed from actual open findings and scans.
        """
        # 1. Fetch active findings
        f_stmt = select(ModelFinding).where(ModelFinding.status.in_(["OPEN", "CONFIRMED", "IN_PROGRESS"]))
        if organization_id:
            f_stmt = f_stmt.where(ModelFinding.organization_id == organization_id)
        if project_id:
            f_stmt = f_stmt.where(ModelFinding.project_id == project_id)

        findings = (await self.db.execute(f_stmt)).scalars().all()

        # 2. Fetch total model scans count
        scan_stmt = select(func.count(ModelScan.id))
        if organization_id:
            scan_stmt = scan_stmt.where(ModelScan.organization_id == organization_id)
        scans_count = (await self.db.execute(scan_stmt)).scalar() or 0

        posture_by_framework: Dict[str, Any] = {}
        total_controls = 0
        compliant_controls = 0

        for fw_name, controls in AI_FRAMEWORK_CONTROLS.items():
            evaluated_controls = []
            for c in controls:
                total_controls += 1
                ctrl_id = c["id"]
                ctrl_title = c["title"]
                prefixes = c["rule_prefixes"]

                # Find matching findings
                violating_findings = [
                    f for f in findings
                    if any(f.rule_id.startswith(p) for p in prefixes)
                ]

                if violating_findings:
                    status = "NON_COMPLIANT"
                    summary = f"Control violated by {len(violating_findings)} active finding(s): {', '.join(f.rule_id for f in violating_findings[:3])}."
                    related_ids = [str(f.id) for f in violating_findings]
                elif scans_count > 0:
                    status = "COMPLIANT"
                    compliant_controls += 1
                    summary = f"Audited via {scans_count} automated security scan(s). Zero active violations detected."
                    related_ids = []
                else:
                    status = "EVIDENCE_UNAVAILABLE"
                    summary = "No model scans have been executed for this organization yet. Run an automated scan to collect compliance evidence."
                    related_ids = []

                evaluated_controls.append({
                    "control_id": ctrl_id,
                    "title": ctrl_title,
                    "status": status,
                    "evidence_summary": summary,
                    "violating_findings_count": len(violating_findings),
                    "related_finding_ids": related_ids,
                })

            framework_score = (
                int((sum(1 for c in evaluated_controls if c["status"] == "COMPLIANT") / len(evaluated_controls)) * 100)
                if evaluated_controls else 0
            )

            posture_by_framework[fw_name] = {
                "framework": fw_name,
                "compliance_score": framework_score,
                "controls": evaluated_controls,
            }

        overall_score = int((compliant_controls / max(total_controls, 1)) * 100)

        return {
            "overall_compliance_score": overall_score,
            "scans_executed_count": scans_count,
            "active_findings_count": len(findings),
            "frameworks": posture_by_framework,
            "evaluated_at": datetime.now(timezone.utc).isoformat(),
        }

    async def generate_pdf_report(
        self,
        organization_id: Optional[uuid.UUID] = None,
        project_id: Optional[uuid.UUID] = None,
    ) -> bytes:
        """
        Generates a publication-grade PDF report using ReportLab.
        """
        from reportlab.lib.pagesizes import A4
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib import colors

        compliance_data = await self.evaluate_compliance(organization_id, project_id)

        # Query models
        m_stmt = select(ModelAsset)
        if organization_id:
            m_stmt = m_stmt.where(ModelAsset.organization_id == organization_id)
        models = (await self.db.execute(m_stmt)).scalars().all()

        buf = io.BytesIO()
        doc = SimpleDocTemplate(buf, pagesize=A4, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
        story = []
        styles = getSampleStyleSheet()

        title_style = ParagraphStyle(
            "DocTitle",
            parent=styles["Title"],
            fontSize=20,
            leading=24,
            textColor=colors.HexColor("#0F172A"),
            alignment=0,
        )
        heading_style = ParagraphStyle(
            "DocHeading",
            parent=styles["Heading2"],
            fontSize=13,
            leading=16,
            textColor=colors.HexColor("#1E293B"),
            spaceBefore=12,
            spaceAfter=6,
        )
        body_style = ParagraphStyle(
            "DocBody",
            parent=styles["BodyText"],
            fontSize=9,
            leading=12,
            textColor=colors.HexColor("#334155"),
        )

        # Title
        story.append(Paragraph("KAVACH MODEL SECURITY — EXECUTIVE COMPLIANCE REPORT", title_style))
        story.append(Paragraph(f"Generated at: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')} | Authoritative Governance Report", body_style))
        story.append(Spacer(1, 14))

        # Executive Metrics
        metrics_table_data = [
            ["Overall Compliance Score", "Active Findings", "Models Registered", "Scans Executed"],
            [
                f"{compliance_data['overall_compliance_score']}%",
                str(compliance_data["active_findings_count"]),
                str(len(models)),
                str(compliance_data["scans_executed_count"]),
            ],
        ]
        t = Table(metrics_table_data, colWidths=[130, 130, 130, 130])
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F1F5F9")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#475569")),
            ("FONTNAME", (0, 0), (-1, -1), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 9),
            ("FONTSIZE", (0, 1), (-1, 1), 16),
            ("TEXTCOLOR", (0, 1), (0, 1), colors.HexColor("#0D9488")),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ]))
        story.append(t)
        story.append(Spacer(1, 16))

        # Model Inventory Summary
        story.append(Paragraph("Model Inventory & Risk Breakdown", heading_style))
        inv_data = [["Model ID", "Provider", "Format", "Risk Level", "Score"]]
        for m in models[:10]:
            inv_data.append([
                m.model_id_str[:30],
                m.provider,
                m.model_format,
                m.risk_level,
                f"{m.security_score}/100",
            ])
        if len(inv_data) == 1:
            inv_data.append(["No models registered", "-", "-", "-", "-"])

        t_inv = Table(inv_data, colWidths=[180, 80, 80, 90, 90])
        t_inv.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0F172A")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ]))
        story.append(t_inv)
        story.append(Spacer(1, 16))

        # Compliance Frameworks
        story.append(Paragraph("AI Compliance Framework Posture", heading_style))
        comp_rows = [["Framework", "Control ID", "Control Description", "Status"]]
        for fw_name, fw_obj in compliance_data.get("frameworks", {}).items():
            for c in fw_obj.get("controls", []):
                comp_rows.append([
                    fw_name.replace("_", " "),
                    c["control_id"],
                    Paragraph(c["title"], body_style),
                    c["status"],
                ])

        t_comp = Table(comp_rows, colWidths=[110, 70, 260, 80])
        t_comp.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1E293B")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))
        story.append(t_comp)

        doc.build(story)
        return buf.getvalue()

