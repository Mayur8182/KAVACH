"""
Threat Intelligence Normalization & Ingestion Adapters.

Normalizes commercial, community, and open-source intelligence feeds:
- STIX 2.1 Bundles (STIX/TAXII objects and relationships)
- CISA Known Exploited Vulnerabilities (KEV) Catalog
- AlienVault OTX Pulses
- MISP / Generic JSON & CSV Indicator Feeds

Enforces Rule 5 (Source Provenance) and Rule 10 (Raw Intelligence Preservation with SHA-256).
"""

import re
import json
import hashlib
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timezone


class ThreatIntelNormalizationEngine:
    """Canonical parser and normalizer for external threat intelligence feeds."""

    @staticmethod
    def compute_sha256(data: Any) -> str:
        """Computes deterministic SHA-256 digest of arbitrary payload."""
        if isinstance(data, (dict, list)):
            canonical_json = json.dumps(data, sort_keys=True, separators=(",", ":"), default=str)
            raw_bytes = canonical_json.encode("utf-8")
        elif isinstance(data, str):
            raw_bytes = data.encode("utf-8")
        elif isinstance(data, bytes):
            raw_bytes = data
        else:
            raw_bytes = str(data).encode("utf-8")
        return hashlib.sha256(raw_bytes).hexdigest()

    @classmethod
    def parse_stix_bundle(cls, bundle: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parses a standard STIX 2.0 / 2.1 Bundle into canonical normalized intelligence objects.
        Returns:
            {
                "indicators": [...],
                "threat_actors": [...],
                "malware": [...],
                "campaigns": [...],
                "techniques": [...],
                "relationships": [...],
                "raw_hash": str,
            }
        """
        raw_hash = cls.compute_sha256(bundle)
        objects = bundle.get("objects", [])

        indicators: List[Dict[str, Any]] = []
        actors: List[Dict[str, Any]] = []
        malware_list: List[Dict[str, Any]] = []
        campaigns: List[Dict[str, Any]] = []
        techniques: List[Dict[str, Any]] = []
        relationships: List[Dict[str, Any]] = []

        for obj in objects:
            obj_type = obj.get("type", "").lower()

            if obj_type == "indicator":
                parsed_ind = cls._parse_stix_indicator(obj, raw_hash)
                if parsed_ind:
                    indicators.append(parsed_ind)

            elif obj_type == "threat-actor":
                actors.append({
                    "external_id": obj.get("id"),
                    "name": obj.get("name", "Unknown Actor"),
                    "aliases": obj.get("aliases", []),
                    "description": obj.get("description"),
                    "motivation": obj.get("primary_motivation"),
                    "confidence": cls._normalize_confidence(obj.get("confidence", 50)),
                    "first_seen": cls._parse_iso_date(obj.get("first_seen")),
                    "last_seen": cls._parse_iso_date(obj.get("last_seen")),
                    "references": obj.get("external_references", []),
                    "raw_hash": raw_hash,
                })

            elif obj_type == "malware":
                malware_list.append({
                    "external_id": obj.get("id"),
                    "name": obj.get("name", "Unknown Malware"),
                    "aliases": obj.get("aliases", []),
                    "malware_type": (obj.get("malware_types") or ["MALWARE"])[0].upper(),
                    "description": obj.get("description"),
                    "confidence": cls._normalize_confidence(obj.get("confidence", 50)),
                    "references": obj.get("external_references", []),
                    "raw_hash": raw_hash,
                })

            elif obj_type == "campaign":
                campaigns.append({
                    "external_id": obj.get("id"),
                    "name": obj.get("name", "Unknown Campaign"),
                    "description": obj.get("description"),
                    "objective": obj.get("objective"),
                    "confidence": cls._normalize_confidence(obj.get("confidence", 50)),
                    "first_seen": cls._parse_iso_date(obj.get("first_seen")),
                    "last_seen": cls._parse_iso_date(obj.get("last_seen")),
                    "references": obj.get("external_references", []),
                    "raw_hash": raw_hash,
                })

            elif obj_type == "attack-pattern":
                ext_refs = obj.get("external_references", [])
                tech_id = None
                for ref in ext_refs:
                    if ref.get("source_name") in ["mitre-attack", "mitre-enterprise", "cve"]:
                        tech_id = ref.get("external_id")
                        break
                techniques.append({
                    "technique_id": tech_id or obj.get("id", "T0000"),
                    "name": obj.get("name", "Unknown Technique"),
                    "tactic": (obj.get("kill_chain_phases") or [{}])[0].get("phase_name", "UNKNOWN"),
                    "description": obj.get("description"),
                    "url": (ext_refs[0].get("url") if ext_refs else None),
                })

            elif obj_type == "relationship":
                relationships.append({
                    "source_ref": obj.get("source_ref"),
                    "relationship_type": obj.get("relationship_type", "RELATED_TO").upper(),
                    "target_ref": obj.get("target_ref"),
                    "confidence": cls._normalize_confidence(obj.get("confidence", 50)),
                })

        return {
            "indicators": indicators,
            "threat_actors": actors,
            "malware": malware_list,
            "campaigns": campaigns,
            "techniques": techniques,
            "relationships": relationships,
            "raw_hash": raw_hash,
        }

    @classmethod
    def _parse_stix_indicator(cls, obj: Dict[str, Any], raw_hash: str) -> Optional[Dict[str, Any]]:
        """Extracts indicator type, value, and validity from STIX pattern syntax."""
        pattern = obj.get("pattern", "")
        ind_type = "UNKNOWN"
        val = None

        # Regex matching for standard STIX patterns
        ipv4_match = re.search(r"ipv4-addr:value\s*=\s*'([^']+)'", pattern, re.IGNORECASE)
        ipv6_match = re.search(r"ipv6-addr:value\s*=\s*'([^']+)'", pattern, re.IGNORECASE)
        domain_match = re.search(r"domain-name:value\s*=\s*'([^']+)'", pattern, re.IGNORECASE)
        url_match = re.search(r"url:value\s*=\s*'([^']+)'", pattern, re.IGNORECASE)
        hash_match = re.search(r"file:hashes\.[^=]+\s*=\s*'([^']+)'", pattern, re.IGNORECASE)

        if ipv4_match:
            ind_type = "IPV4"
            val = ipv4_match.group(1).strip()
        elif ipv6_match:
            ind_type = "IPV6"
            val = ipv6_match.group(1).strip()
        elif domain_match:
            ind_type = "DOMAIN"
            val = domain_match.group(1).strip().lower()
        elif url_match:
            ind_type = "URL"
            val = url_match.group(1).strip()
        elif hash_match:
            ind_type = "FILE_HASH"
            val = hash_match.group(1).strip().lower()
        else:
            # Fallback if pattern is not standard or direct value is supplied
            val = obj.get("name") or obj.get("value")
            ind_type = "INDICATOR"

        if not val:
            return None

        # Determine freshness / expiration
        valid_from = cls._parse_iso_date(obj.get("valid_from"))
        valid_until = cls._parse_iso_date(obj.get("valid_until"))
        status = "ACTIVE"
        if valid_until and valid_until < datetime.now(timezone.utc):
            status = "EXPIRED"

        return {
            "external_id": obj.get("id"),
            "indicator_type": ind_type,
            "value": val,
            "normalized_value": val.lower(),
            "title": obj.get("name") or f"{ind_type} Indicator: {val}",
            "description": obj.get("description"),
            "confidence": cls._normalize_confidence(obj.get("confidence", 50)),
            "severity": (obj.get("severity") or "HIGH").upper(),
            "status": status,
            "valid_from": valid_from,
            "valid_until": valid_until,
            "threat_types": obj.get("indicator_types") or obj.get("labels") or [],
            "raw_data_reference": f"sha256:{raw_hash}",
        }

    @classmethod
    def parse_cisa_kev(cls, raw: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Parses CISA Known Exploited Vulnerabilities (KEV) Catalog entries."""
        raw_hash = cls.compute_sha256(raw)
        vulnerabilities = raw.get("vulnerabilities", [])
        results: List[Dict[str, Any]] = []

        for v in vulnerabilities:
            cve_id = v.get("cveID")
            if not cve_id:
                continue

            results.append({
                "indicator_type": "CVE",
                "value": cve_id.strip().upper(),
                "normalized_value": cve_id.strip().upper(),
                "title": f"Known Exploited: {cve_id} ({v.get('vendorProject', '')} {v.get('product', '')})",
                "description": v.get("shortDescription"),
                "confidence": "HIGH",
                "severity": "CRITICAL" if v.get("knownRansomwareCampaignUse") == "Known" else "HIGH",
                "status": "ACTIVE",
                "threat_types": ["known_exploited_vulnerability", "ransomware_associated"] if v.get("knownRansomwareCampaignUse") == "Known" else ["known_exploited_vulnerability"],
                "raw_data_reference": f"sha256:{raw_hash}",
                "metadata": {
                    "vendor": v.get("vendorProject"),
                    "product": v.get("product"),
                    "date_added": v.get("dateAdded"),
                    "required_action": v.get("requiredAction"),
                    "due_date": v.get("dueDate"),
                    "known_ransomware_campaign_use": v.get("knownRansomwareCampaignUse"),
                    "notes": v.get("notes"),
                },
            })

        return results

    @classmethod
    def parse_otx_pulse(cls, pulse: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Parses AlienVault OTX pulse indicators."""
        raw_hash = cls.compute_sha256(pulse)
        indicators = pulse.get("indicators", [])
        pulse_name = pulse.get("name", "OTX Pulse")
        results: List[Dict[str, Any]] = []

        for ind in indicators:
            ind_type_raw = ind.get("type", "").upper()
            val = ind.get("indicator", "").strip()
            if not val:
                continue

            # Map OTX type to canonical indicator type
            type_map = {
                "IPV4": "IPV4",
                "IPV6": "IPV6",
                "DOMAIN": "DOMAIN",
                "HOSTNAME": "HOSTNAME",
                "URL": "URL",
                "FILEHASH-MD5": "FILE_HASH",
                "FILEHASH-SHA1": "FILE_HASH",
                "FILEHASH-SHA256": "FILE_HASH",
                "CVE": "CVE",
            }
            canonical_type = type_map.get(ind_type_raw, "INDICATOR")

            results.append({
                "indicator_type": canonical_type,
                "value": val,
                "normalized_value": val.lower(),
                "title": f"OTX: {val} ({pulse_name})",
                "description": ind.get("description") or pulse.get("description"),
                "confidence": "HIGH" if pulse.get("adversary") else "MEDIUM",
                "severity": "HIGH",
                "status": "ACTIVE",
                "threat_types": pulse.get("tags") or ["otx_indicator"],
                "raw_data_reference": f"sha256:{raw_hash}",
            })

        return results

    @classmethod
    def parse_generic_indicator_list(cls, items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Parses generic indicator list with fallback type inference."""
        raw_hash = cls.compute_sha256(items)
        results: List[Dict[str, Any]] = []

        for item in items:
            val = item.get("value") or item.get("indicator") or item.get("ip") or item.get("domain")
            if not val:
                continue

            val = str(val).strip()
            ind_type = item.get("type", "").upper()
            if not ind_type:
                # Infer type from pattern
                if re.match(r"^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$", val):
                    ind_type = "IPV4"
                elif re.match(r"^CVE-\d{4}-\d{4,}$", val, re.IGNORECASE):
                    ind_type = "CVE"
                elif re.match(r"^[a-fA-F0-9]{32,64}$", val):
                    ind_type = "FILE_HASH"
                elif "://" in val:
                    ind_type = "URL"
                else:
                    ind_type = "DOMAIN"

            results.append({
                "indicator_type": ind_type,
                "value": val,
                "normalized_value": val.lower(),
                "title": item.get("title") or f"{ind_type} Threat Indicator: {val}",
                "description": item.get("description"),
                "confidence": (item.get("confidence") or "MEDIUM").upper(),
                "severity": (item.get("severity") or "HIGH").upper(),
                "status": (item.get("status") or "ACTIVE").upper(),
                "threat_types": item.get("threat_types", []),
                "raw_data_reference": f"sha256:{raw_hash}",
            })

        return results

    @staticmethod
    def _normalize_confidence(conf_val: Any) -> str:
        """Converts integer or string confidence score into categorical rating."""
        if isinstance(conf_val, (int, float)):
            if conf_val >= 75:
                return "HIGH"
            elif conf_val >= 40:
                return "MEDIUM"
            else:
                return "LOW"
        val_str = str(conf_val).upper()
        return val_str if val_str in ["HIGH", "MEDIUM", "LOW"] else "UNKNOWN"

    @staticmethod
    def _parse_iso_date(date_str: Any) -> Optional[datetime]:
        """Safely parses ISO 8601 date string to timezone-aware datetime."""
        if not date_str:
            return None
        if isinstance(date_str, datetime):
            return date_str if date_str.tzinfo else date_str.replace(tzinfo=timezone.utc)
        try:
            cleaned = str(date_str).replace("Z", "+00:00")
            return datetime.fromisoformat(cleaned)
        except Exception:
            return None
