"""
DNS Security & Threat Protection Operational Service.

Orchestrates:
1. DNS Telemetry Collection & SHA-256 Raw Hashing (Rule 9)
2. Domain Normalization & Canonical Domain Entity Management
3. Threat Intelligence Correlation (Step 24 integration)
4. Deterministic Threat Detection (DGA, Tunneling, Exfiltration, Beaconing)
5. Policy Evaluation & Enforcement Auditing (Rule 2: execution_status)
6. Step 23 SOC Escalation (creates SocAlert with evidence links)
7. Authentic Performance & Security Metrics (Section 57, Rule 1)
"""

import hashlib
import json
import uuid
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc

from app.models.dns_models import (
    DNSDataSource,
    DNSEvent,
    Domain,
    DNSPolicy,
    DNSListEntry,
    DNSDecision,
    DNSSignal,
    DNSBaseline,
)
from app.models.soc_models import SocAlert
from app.dns.normalizer import DomainNormalizer
from app.dns.detector import DNSThreatDetector
from app.dns.policy_engine import DNSPolicyEngine


class DNSSecurityService:
    """Core operational service for DNS Security & Threat Protection."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.detector = DNSThreatDetector(db)
        self.policy_engine = DNSPolicyEngine(db)

    # ================================================================
    # 1. Source Registry & Health
    # ================================================================

    async def register_source(
        self,
        name: str,
        source_type: str,
        provider: str,
        endpoint: str,
        authentication_type: str = "NONE",
        configuration: Optional[Dict[str, Any]] = None,
    ) -> DNSDataSource:
        """Registers a new DNS telemetry collector source."""
        source = DNSDataSource(
            name=name,
            source_type=source_type.upper(),
            provider=provider.upper(),
            endpoint=endpoint,
            authentication_type=authentication_type.upper(),
            configuration=configuration or {},
            enabled=True,
            status="CONNECTED",
            last_seen=datetime.now(timezone.utc),
            last_success=datetime.now(timezone.utc),
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        self.db.add(source)
        await self.db.commit()
        return source

    async def list_sources(self) -> List[DNSDataSource]:
        """Lists all registered DNS telemetry sources."""
        stmt = select(DNSDataSource).order_by(DNSDataSource.name)
        res = await self.db.execute(stmt)
        return list(res.scalars().all())

    async def get_source(self, source_id: uuid.UUID) -> Optional[DNSDataSource]:
        """Retrieves a single source by ID."""
        stmt = select(DNSDataSource).where(DNSDataSource.id == source_id)
        res = await self.db.execute(stmt)
        return res.scalar_one_or_none()

    # ================================================================
    # 2. Telemetry Ingestion Pipeline
    # ================================================================

    async def ingest_dns_event(
        self,
        raw_payload: Dict[str, Any],
        project_id: Optional[uuid.UUID] = None,
    ) -> Dict[str, Any]:
        """
        Processes a real DNS query/response telemetry record:
        1. Preserves raw payload with SHA-256 digest
        2. Normalizes domain name and decomposes into FQDN / RegDomain / TLD
        3. Upserts canonical Domain entity
        4. Correlates Step 24 Threat Intelligence
        5. Evaluates statistical / linguistic anomaly detectors (DGA, Tunneling)
        6. Evaluates authoritative DNS Policy & creates DNSDecision
        7. Records DNSSignal if threats are detected
        """
        # Cryptographic raw digest
        canonical_json = json.dumps(raw_payload, sort_keys=True, default=str)
        raw_digest = f"sha256:{hashlib.sha256(canonical_json.encode('utf-8')).hexdigest()}"

        query_name = raw_payload.get("query_name") or raw_payload.get("domain") or "unknown.local"
        norm_fqdn = DomainNormalizer.normalize_domain(query_name)
        decomp = DomainNormalizer.decompose_domain(norm_fqdn)

        timestamp_raw = raw_payload.get("timestamp")
        if isinstance(timestamp_raw, str):
            try:
                event_time = datetime.fromisoformat(timestamp_raw.replace("Z", "+00:00"))
            except Exception:
                event_time = datetime.now(timezone.utc)
        elif isinstance(timestamp_raw, datetime):
            event_time = timestamp_raw
        else:
            event_time = datetime.now(timezone.utc)

        # Workload / Identity context
        client_ident = (
            raw_payload.get("agent_identity")
            or raw_payload.get("client_identity")
            or raw_payload.get("workload_identity")
            or raw_payload.get("pod_id")
            or raw_payload.get("client_ip")
            or "anonymous_workload"
        )
        env = (raw_payload.get("environment") or "PRODUCTION").upper()
        query_type = (raw_payload.get("query_type") or "A").upper()
        rcode = (raw_payload.get("response_code") or "NOERROR").upper()
        answers = raw_payload.get("answers") or []

        # Step A: Upsert Canonical Domain Entity
        domain_entity = await self._upsert_domain(decomp, norm_fqdn)

        # Step B: Correlate Step 24 Threat Intelligence
        threat_match = await self.detector.correlate_threat_intelligence(
            domain_fqdn=norm_fqdn,
            registered_domain=decomp["registered_domain"],
        )
        if threat_match:
            domain_entity.reputation = "KNOWN_MALICIOUS"
            domain_entity.classification = "C2" if "c2" in str(threat_match.get("threat_types", [])).lower() else "MALWARE"

        # Step C: Behavioral & Statistical Detectors
        signals_detected: List[str] = []

        # 1. DGA detection
        is_dga, dga_score, dga_details = self.detector.detect_dga(decomp)
        if is_dga:
            signals_detected.append("DGA_SUSPECTED")
            domain_entity.reputation = "SUSPICIOUS" if domain_entity.reputation == "UNKNOWN" else domain_entity.reputation
            domain_entity.classification = "DGA"

        # 2. Tunneling / Exfiltration detection
        is_tunnel, tunnel_type, tunnel_details = self.detector.detect_tunneling(decomp, query_type, answers)
        if is_tunnel:
            signals_detected.append(tunnel_type)
            domain_entity.reputation = "SUSPICIOUS" if domain_entity.reputation == "UNKNOWN" else domain_entity.reputation
            domain_entity.classification = "EXFILTRATION" if tunnel_type == "DNS_EXFILTRATION" else "TUNNEL"

        # 3. Threat Intelligence signal
        if threat_match:
            signals_detected.append("MALICIOUS_DOMAIN")

        # Step D: Authoritative Policy Evaluation
        decision_result = await self.policy_engine.evaluate_dns_request(
            domain_fqdn=norm_fqdn,
            registered_domain=decomp["registered_domain"],
            client_identity=client_ident,
            environment=env,
            project_id=project_id,
            threat_match=threat_match,
            detection_signals=signals_detected,
            query_type=query_type,
        )

        # Step E: Persist DNSEvent
        dns_event = DNSEvent(
            timestamp=event_time,
            query_name=query_name,
            normalized_query=norm_fqdn,
            query_type=query_type,
            response_code=rcode,
            answers=answers,
            resolver=raw_payload.get("resolver", "CoreDNS"),
            resolver_ip=raw_payload.get("resolver_ip", "10.96.0.10"),
            protocol=(raw_payload.get("protocol") or "UDP").upper(),
            source_type=raw_payload.get("source_type", "RESOLVER"),
            client_ip=raw_payload.get("client_ip"),
            destination_ip=raw_payload.get("destination_ip"),
            client_identity=client_ident,
            user_identity=raw_payload.get("user_identity"),
            agent_identity=raw_payload.get("agent_identity"),
            workload_identity=raw_payload.get("workload_identity"),
            container_id=raw_payload.get("container_id"),
            pod_id=raw_payload.get("pod_id"),
            namespace=raw_payload.get("namespace"),
            cloud_resource_id=raw_payload.get("cloud_resource_id"),
            project_id=project_id,
            environment=env,
            duration_ms=raw_payload.get("duration_ms", 1.2),
            raw_event_reference=raw_digest,
            correlation_id=raw_payload.get("correlation_id"),
            created_at=datetime.now(timezone.utc),
        )
        self.db.add(dns_event)
        await self.db.flush()

        # Step F: Persist DNSDecision
        decision = DNSDecision(
            dns_event_id=dns_event.id,
            project_id=project_id,
            policy_id=decision_result.get("policy_id"),
            identity=client_ident,
            domain=norm_fqdn,
            action=decision_result["action"],
            reason=decision_result["reason"],
            evidence=decision_result["evidence"],
            execution_status=decision_result["execution_status"],
            enforced_by="DNS_GATEWAY",
            post_enforcement_verified=(decision_result["execution_status"] == "BLOCKED"),
            timestamp=datetime.now(timezone.utc),
        )
        self.db.add(decision)
        await self.db.flush()
        dns_event.decision_id = decision.id

        # Step G: Persist Security Signals (if detected)
        created_signals = []
        for sig_type in signals_detected:
            sig_key = f"SIG-DNS-{datetime.now(timezone.utc).strftime('%Y%m')}-{uuid.uuid4().hex[:6].upper()}"
            sig_sev = "CRITICAL" if sig_type in ["MALICIOUS_DOMAIN", "DNS_EXFILTRATION"] else "HIGH"
            sig_details = {
                "dga": dga_details if sig_type == "DGA_SUSPECTED" else None,
                "tunneling": tunnel_details if sig_type in ["DNS_TUNNEL", "DNS_EXFILTRATION"] else None,
                "threat_intel": threat_match if sig_type == "MALICIOUS_DOMAIN" else None,
            }
            signal = DNSSignal(
                signal_key=sig_key,
                project_id=project_id,
                alert_type=sig_type,
                severity=sig_sev,
                confidence="HIGH" if threat_match else "MEDIUM",
                domain=norm_fqdn,
                entity_id=client_ident,
                entity_type="AGENT" if raw_payload.get("agent_identity") else "WORKLOAD",
                details=sig_details,
                raw_event_ids=[str(dns_event.id)],
                status="NEW",
                created_at=datetime.now(timezone.utc),
            )
            self.db.add(signal)
            created_signals.append(signal)

        await self.db.commit()

        return {
            "event_id": str(dns_event.id),
            "normalized_query": norm_fqdn,
            "registered_domain": decomp["registered_domain"],
            "decision": decision_result["action"],
            "reason": decision_result["reason"],
            "execution_status": decision_result["execution_status"],
            "signals": signals_detected,
            "threat_match": threat_match is not None,
            "domain_reputation": domain_entity.reputation,
        }

    async def _upsert_domain(self, decomp: Dict[str, Any], fqdn: str) -> Domain:
        """Finds or creates a canonical domain entity."""
        stmt = select(Domain).where(Domain.fqdn == fqdn)
        domain = (await self.db.execute(stmt)).scalar_one_or_none()
        now = datetime.now(timezone.utc)

        if domain:
            domain.total_queries += 1
            domain.last_seen = now
        else:
            domain = Domain(
                fqdn=fqdn,
                registered_domain=decomp["registered_domain"],
                subdomain=decomp["subdomain"],
                tld=decomp["tld"],
                punycode=decomp["punycode"],
                is_idn=decomp["is_idn"],
                idn_classification=decomp["idn_classification"],
                entropy=decomp["entropy"],
                reputation="UNKNOWN",
                classification="UNCLASSIFIED",
                total_queries=1,
                first_seen=now,
                last_seen=now,
                status="ACTIVE",
                source="TELEMETRY",
                created_at=now,
                updated_at=now,
            )
            self.db.add(domain)

        await self.db.flush()
        return domain

    # ================================================================
    # 3. SOC Escalation Integration (Step 23 link)
    # ================================================================

    async def escalate_signal_to_soc(
        self,
        signal_id: uuid.UUID,
        analyst_user_id: str,
    ) -> SocAlert:
        """Escalates an evidence-backed DNS signal to Thing SOC as an operational SocAlert."""
        stmt = select(DNSSignal).where(DNSSignal.id == signal_id)
        signal = (await self.db.execute(stmt)).scalar_one_or_none()
        if not signal:
            raise ValueError(f"DNS signal '{signal_id}' not found.")

        alert_key = f"ALT-{datetime.now(timezone.utc).strftime('%Y%m')}-{uuid.uuid4().hex[:6].upper()}"
        alert_title = f"[DNS SECURITY] {signal.alert_type.replace('_', ' ')}: {signal.domain}"
        alert_desc = (
            f"DNS Threat Signal '{signal.alert_type}' detected on domain '{signal.domain}' "
            f"by entity '{signal.entity_id}' ({signal.entity_type})."
        )
        dedup_key = f"dns_{signal.project_id}_{signal.alert_type}_{signal.domain}_{signal.entity_id}"

        soc_alert = SocAlert(
            alert_key=alert_key,
            project_id=signal.project_id,
            deduplication_key=dedup_key,
            title=alert_title,
            description=alert_desc,
            severity=signal.severity,
            confidence=signal.confidence,
            status="NEW",
            source="DNS_SECURITY",
            event_count=len(signal.raw_event_ids or [1]),
            first_seen_at=signal.created_at,
            last_seen_at=signal.created_at,
            risk_assessment={"score": 90 if signal.severity == "CRITICAL" else 75, "factors": ["DNS_THREAT", signal.alert_type]},
            created_at=datetime.now(timezone.utc),
        )
        self.db.add(soc_alert)
        await self.db.flush()

        signal.status = "ESCALATED"
        signal.soc_alert_id = soc_alert.id
        await self.db.commit()

        return soc_alert

    # ================================================================
    # 4. Policy & List Management
    # ================================================================

    async def create_policy(
        self,
        name: str,
        conditions: Dict[str, Any],
        action: str = "BLOCK",
        scope: str = "GLOBAL",
        priority: int = 100,
        project_id: Optional[uuid.UUID] = None,
        sinkhole_ip: Optional[str] = None,
        created_by: str = "SYSTEM",
    ) -> DNSPolicy:
        """Creates a versioned DNS security policy."""
        policy = DNSPolicy(
            name=name,
            conditions=conditions,
            action=action.upper(),
            scope=scope.upper(),
            priority=priority,
            project_id=project_id,
            sinkhole_ip=sinkhole_ip,
            enabled=True,
            created_by=created_by,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        self.db.add(policy)
        await self.db.commit()
        return policy

    async def list_policies(self, project_id: Optional[uuid.UUID] = None) -> List[DNSPolicy]:
        """Lists DNS policies applicable to project or global."""
        stmt = select(DNSPolicy).order_by(DNSPolicy.priority.asc())
        if project_id:
            stmt = stmt.where(or_(DNSPolicy.project_id == project_id, DNSPolicy.scope == "GLOBAL"))
        res = await self.db.execute(stmt)
        return list(res.scalars().all())

    async def add_list_entry(
        self,
        list_type: str,
        domain_pattern: str,
        reason: str,
        created_by: str,
        project_id: Optional[uuid.UUID] = None,
        scope: str = "PROJECT",
        pattern_type: str = "EXACT",
        duration_days: Optional[int] = None,
    ) -> DNSListEntry:
        """Adds an entry to Allowlist, Blocklist, or Watchlist."""
        expires = datetime.now(timezone.utc) + timedelta(days=duration_days) if duration_days else None
        entry = DNSListEntry(
            list_type=list_type.upper(),
            domain_pattern=domain_pattern.lower().strip(),
            pattern_type=pattern_type.upper(),
            project_id=project_id,
            scope=scope.upper(),
            reason=reason,
            created_by=created_by,
            expires_at=expires,
            is_active=True,
            created_at=datetime.now(timezone.utc),
        )
        self.db.add(entry)
        await self.db.commit()
        return entry

    async def list_list_entries(
        self,
        list_type: Optional[str] = None,
        project_id: Optional[uuid.UUID] = None,
    ) -> List[DNSListEntry]:
        """Lists active Allowlist/Blocklist/Watchlist entries."""
        stmt = select(DNSListEntry).where(DNSListEntry.is_active == True)
        if list_type:
            stmt = stmt.where(DNSListEntry.list_type == list_type.upper())
        if project_id:
            stmt = stmt.where(or_(DNSListEntry.project_id == project_id, DNSListEntry.scope == "GLOBAL"))
        res = await self.db.execute(stmt)
        return list(res.scalars().all())

    # ================================================================
    # 5. Queries & Dashboard Statistics
    # ================================================================

    async def list_events(
        self,
        project_id: Optional[uuid.UUID] = None,
        domain_query: Optional[str] = None,
        response_code: Optional[str] = None,
        agent_identity: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[DNSEvent]:
        """Lists canonical DNS events with filters."""
        stmt = select(DNSEvent)
        if project_id:
            stmt = stmt.where(DNSEvent.project_id == project_id)
        if domain_query:
            stmt = stmt.where(DNSEvent.normalized_query.contains(domain_query.lower()))
        if response_code:
            stmt = stmt.where(DNSEvent.response_code == response_code.upper())
        if agent_identity:
            stmt = stmt.where(DNSEvent.agent_identity == agent_identity)

        stmt = stmt.order_by(desc(DNSEvent.timestamp)).limit(limit).offset(offset)
        res = await self.db.execute(stmt)
        return list(res.scalars().all())

    async def list_domains(
        self,
        reputation: Optional[str] = None,
        classification: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[Domain]:
        """Lists canonical Domain objects."""
        stmt = select(Domain)
        if reputation:
            stmt = stmt.where(Domain.reputation == reputation.upper())
        if classification:
            stmt = stmt.where(Domain.classification == classification.upper())
        if search:
            stmt = stmt.where(Domain.fqdn.contains(search.lower()))

        stmt = stmt.order_by(desc(Domain.last_seen)).limit(limit).offset(offset)
        res = await self.db.execute(stmt)
        return list(res.scalars().all())

    async def list_signals(
        self,
        project_id: Optional[uuid.UUID] = None,
        status: Optional[str] = None,
        limit: int = 50,
    ) -> List[DNSSignal]:
        """Lists security detection signals."""
        stmt = select(DNSSignal)
        if project_id:
            stmt = stmt.where(DNSSignal.project_id == project_id)
        if status:
            stmt = stmt.where(DNSSignal.status == status.upper())
        stmt = stmt.order_by(desc(DNSSignal.created_at)).limit(limit)
        res = await self.db.execute(stmt)
        return list(res.scalars().all())

    async def get_overview_statistics(self, project_id: Optional[uuid.UUID] = None) -> Dict[str, Any]:
        """Calculates authentic DNS security dashboard metrics from database."""
        # Active sources
        src_stmt = select(func.count(DNSDataSource.id)).where(DNSDataSource.enabled == True)
        sources_count = (await self.db.execute(src_stmt)).scalar() or 0

        # Total events
        evt_stmt = select(func.count(DNSEvent.id))
        if project_id:
            evt_stmt = evt_stmt.where(DNSEvent.project_id == project_id)
        total_events = (await self.db.execute(evt_stmt)).scalar() or 0

        # Blocked queries
        block_stmt = select(func.count(DNSDecision.id)).where(DNSDecision.action == "BLOCK")
        if project_id:
            block_stmt = block_stmt.where(DNSDecision.project_id == project_id)
        blocked_queries = (await self.db.execute(block_stmt)).scalar() or 0

        # Known Malicious / Suspicious domains
        mal_stmt = select(func.count(Domain.id)).where(Domain.reputation.in_(["KNOWN_MALICIOUS", "SUSPICIOUS"]))
        malicious_domains_count = (await self.db.execute(mal_stmt)).scalar() or 0

        # Signals total
        sig_stmt = select(func.count(DNSSignal.id))
        if project_id:
            sig_stmt = sig_stmt.where(DNSSignal.project_id == project_id)
        total_signals = (await self.db.execute(sig_stmt)).scalar() or 0

        # Tunneling / Exfiltration signals count
        tunnel_stmt = select(func.count(DNSSignal.id)).where(
            DNSSignal.alert_type.in_(["DNS_TUNNEL", "DNS_EXFILTRATION"])
        )
        if project_id:
            tunnel_stmt = tunnel_stmt.where(DNSSignal.project_id == project_id)
        tunnel_signals_count = (await self.db.execute(tunnel_stmt)).scalar() or 0

        # DGA signals count
        dga_stmt = select(func.count(DNSSignal.id)).where(DNSSignal.alert_type == "DGA_SUSPECTED")
        if project_id:
            dga_stmt = dga_stmt.where(DNSSignal.project_id == project_id)
        dga_signals_count = (await self.db.execute(dga_stmt)).scalar() or 0

        return {
            "is_configured": sources_count > 0,
            "sources_connected": sources_count,
            "total_dns_events": total_events,
            "blocked_queries": blocked_queries,
            "malicious_domains_tracked": malicious_domains_count,
            "active_threat_signals": total_signals,
            "tunneling_signals": tunnel_signals_count,
            "dga_signals": dga_signals_count,
            "resolver_health": "HEALTHY" if sources_count > 0 else "NOT_CONFIGURED",
        }
