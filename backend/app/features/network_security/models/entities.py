"""
STEP 28 --- NETWORK SECURITY
Data Models and Database Schema for THING Network Security.

Provides PostgreSQL transactional models for all 26 network entities:
- networks, network_assets, network_interfaces, ip_addresses, subnets, route_tables,
  routes, security_groups, security_group_rules, network_acls, network_acl_rules,
  firewalls, firewall_rules, load_balancers, gateways, network_endpoints, network_services,
  network_flows, network_policies, network_policy_rules, network_exposures, network_paths,
  network_segments, network_observations, network_evidence, network_risk_assessments, network_jobs.

Adheres strictly to production engineering rules:
- Tenant-scoped resolution: Organization -> Workspace -> Project -> Environment
- State distinctions: DECLARED, OBSERVED, INFERRED, VERIFIED, UNKNOWN
- Immutable provider identity
- Common fields & indexes on all entities
- Evidence-linked decisions
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    DateTime,
    ForeignKey,
    JSON,
    Integer,
    Float,
    Boolean,
    Text,
    Index,
)
from sqlalchemy.dialects.postgresql import UUID
from app.models.base import Base


class NetworkCommonMixin:
    """Standard fields across all Network Security entities."""
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    workspace_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=True, index=True)
    environment_id = Column(String(50), nullable=False, default="production", index=True)
    provider = Column(String(50), nullable=False, index=True)  # AWS, AZURE, GCP, KUBERNETES, ON_PREMISE
    provider_resource_id = Column(String(500), nullable=False, index=True)
    status = Column(String(50), nullable=False, default="ACTIVE", index=True)
    state = Column(String(50), nullable=False, default="OBSERVED")  # DECLARED, OBSERVED, INFERRED, VERIFIED, UNKNOWN
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
    first_observed_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    last_observed_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    metadata_json = Column("metadata", JSON, default=dict)


# 1. Network (VPC, VNet, GCP Network, K8s Cluster Network)
class Network(Base, NetworkCommonMixin):
    __tablename__ = "networks"

    name = Column(String(255), nullable=False)
    cidr_block = Column(String(100), nullable=True)
    secondary_cidrs = Column(JSON, default=list)
    region = Column(String(100), nullable=True, index=True)
    is_default = Column(Boolean, default=False)
    vpc_peering_ids = Column(JSON, default=list)
    dns_support = Column(Boolean, default=True)


# 2. NetworkAsset
class NetworkAsset(Base, NetworkCommonMixin):
    __tablename__ = "network_assets"

    asset_id = Column(String(255), nullable=False, index=True)
    asset_type = Column(String(100), nullable=False, index=True)  # VPC, SUBNET, LOAD_BALANCER, GATEWAY, FIREWALL, SECURITY_GROUP, POD, SERVICE, INGRESS
    name = Column(String(255), nullable=False)
    region = Column(String(100), nullable=True)
    network_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    subnet_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    private_addresses = Column(JSON, default=list)
    public_addresses = Column(JSON, default=list)
    criticality = Column(String(50), default="MEDIUM")  # CRITICAL, HIGH, MEDIUM, LOW


# 3. NetworkInterface
class NetworkInterface(Base, NetworkCommonMixin):
    __tablename__ = "network_interfaces"

    network_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    subnet_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    asset_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    mac_address = Column(String(100), nullable=True)
    private_ip = Column(String(100), nullable=True)
    public_ip = Column(String(100), nullable=True)
    security_group_ids = Column(JSON, default=list)


# 4. IPAddress
class IPAddress(Base, NetworkCommonMixin):
    __tablename__ = "ip_addresses"

    ip_address = Column(String(100), nullable=False, index=True)
    ip_version = Column(String(10), default="IPv4")  # IPv4, IPv6
    address_type = Column(String(50), default="PRIVATE")  # PUBLIC, PRIVATE, ELASTIC, SHARED
    network_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    subnet_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    interface_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    associated_resource_id = Column(String(255), nullable=True)
    is_exposed = Column(Boolean, default=False, index=True)


# 5. Subnet
class Subnet(Base, NetworkCommonMixin):
    __tablename__ = "subnets"

    network_id = Column(UUID(as_uuid=True), ForeignKey("networks.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    cidr_block = Column(String(100), nullable=False)
    availability_zone = Column(String(100), nullable=True)
    route_table_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    network_acl_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    is_public = Column(Boolean, default=False, index=True)


# 6. RouteTable
class RouteTable(Base, NetworkCommonMixin):
    __tablename__ = "route_tables"

    network_id = Column(UUID(as_uuid=True), ForeignKey("networks.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    is_main = Column(Boolean, default=False)


# 7. Route
class Route(Base, NetworkCommonMixin):
    __tablename__ = "routes"

    route_table_id = Column(UUID(as_uuid=True), ForeignKey("route_tables.id", ondelete="CASCADE"), nullable=False, index=True)
    destination_cidr = Column(String(100), nullable=False)
    target_type = Column(String(100), nullable=False)  # INTERNET_GATEWAY, NAT_GATEWAY, VPC_PEERING, TRANSIT_GATEWAY, LOCAL, BLACKHOLE
    target_id = Column(String(255), nullable=False)


# 8. SecurityGroup
class SecurityGroup(Base, NetworkCommonMixin):
    __tablename__ = "security_groups"

    network_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    group_name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)


# 9. SecurityGroupRule
class SecurityGroupRule(Base, NetworkCommonMixin):
    __tablename__ = "security_group_rules"

    security_group_id = Column(UUID(as_uuid=True), ForeignKey("security_groups.id", ondelete="CASCADE"), nullable=False, index=True)
    direction = Column(String(20), nullable=False, index=True)  # INGRESS, EGRESS
    protocol = Column(String(50), nullable=False)  # tcp, udp, icmp, -1 (all)
    from_port = Column(Integer, nullable=True)
    to_port = Column(Integer, nullable=True)
    port_range = Column(String(100), nullable=True)
    cidr_ipv4 = Column(String(100), nullable=True, index=True)
    cidr_ipv6 = Column(String(100), nullable=True)
    referenced_group_id = Column(String(255), nullable=True)
    action = Column(String(20), default="ALLOW")  # ALLOW, DENY
    description = Column(Text, nullable=True)
    effective_state = Column(String(50), default="EFFECTIVE")  # EFFECTIVE, SHADOWED, CONFLICTING
    is_wide_cidr = Column(Boolean, default=False, index=True)  # 0.0.0.0/0 or ::/0


# 10. NetworkACL
class NetworkACL(Base, NetworkCommonMixin):
    __tablename__ = "network_acls"

    network_id = Column(UUID(as_uuid=True), ForeignKey("networks.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    is_default = Column(Boolean, default=False)


# 11. NetworkACLRule
class NetworkACLRule(Base, NetworkCommonMixin):
    __tablename__ = "network_acl_rules"

    network_acl_id = Column(UUID(as_uuid=True), ForeignKey("network_acls.id", ondelete="CASCADE"), nullable=False, index=True)
    rule_number = Column(Integer, nullable=False)
    direction = Column(String(20), nullable=False)  # INGRESS, EGRESS
    protocol = Column(String(50), nullable=False)
    action = Column(String(20), nullable=False)  # ALLOW, DENY
    cidr_block = Column(String(100), nullable=False)
    port_range = Column(String(100), nullable=True)


# 12. Firewall
class Firewall(Base, NetworkCommonMixin):
    __tablename__ = "firewalls"

    network_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    name = Column(String(255), nullable=False)
    firewall_type = Column(String(100), nullable=False)  # AWS_NETWORK_FIREWALL, AZURE_FIREWALL, GCP_FIREWALL, SURICATA, K8S


# 13. FirewallRule
class FirewallRule(Base, NetworkCommonMixin):
    __tablename__ = "firewall_rules"

    firewall_id = Column(UUID(as_uuid=True), ForeignKey("firewalls.id", ondelete="CASCADE"), nullable=False, index=True)
    rule_name = Column(String(255), nullable=False)
    direction = Column(String(20), nullable=False)  # INGRESS, EGRESS
    action = Column(String(20), nullable=False)  # ALLOW, DENY, ALERT
    priority = Column(Integer, default=1000)
    source_ranges = Column(JSON, default=list)
    destination_ranges = Column(JSON, default=list)
    protocols = Column(JSON, default=list)
    ports = Column(JSON, default=list)
    effective_state = Column(String(50), default="EFFECTIVE")


# 14. LoadBalancer
class LoadBalancer(Base, NetworkCommonMixin):
    __tablename__ = "load_balancers"

    network_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    name = Column(String(255), nullable=False)
    dns_name = Column(String(500), nullable=True)
    scheme = Column(String(50), default="INTERNAL")  # INTERNET_FACING, INTERNAL
    lb_type = Column(String(50), default="APPLICATION")  # APPLICATION, NETWORK, GATEWAY, CLASSIC
    listeners = Column(JSON, default=list)
    target_groups = Column(JSON, default=list)
    subnets = Column(JSON, default=list)
    security_groups = Column(JSON, default=list)
    is_public = Column(Boolean, default=False, index=True)


# 15. Gateway
class Gateway(Base, NetworkCommonMixin):
    __tablename__ = "gateways"

    network_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    name = Column(String(255), nullable=False)
    gateway_type = Column(String(100), nullable=False)  # INTERNET_GATEWAY, NAT_GATEWAY, TRANSIT_GATEWAY, VPN_GATEWAY
    attached_vpc_id = Column(String(255), nullable=True)


# 16. NetworkEndpoint
class NetworkEndpoint(Base, NetworkCommonMixin):
    __tablename__ = "network_endpoints"

    network_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    service_name = Column(String(255), nullable=False)
    endpoint_type = Column(String(100), default="INTERFACE")  # INTERFACE, GATEWAY, PRIVATE_LINK
    dns_entries = Column(JSON, default=list)
    ip_addresses = Column(JSON, default=list)


# 17. NetworkService
class NetworkService(Base, NetworkCommonMixin):
    __tablename__ = "network_services"

    name = Column(String(255), nullable=False)
    service_type = Column(String(100), default="CLUSTER_IP")  # CLUSTER_IP, NODE_PORT, LOAD_BALANCER, EXTERNAL_NAME
    namespace = Column(String(100), nullable=True)
    cluster_id = Column(String(255), nullable=True)
    ports = Column(JSON, default=list)
    selector = Column(JSON, default=dict)
    endpoints = Column(JSON, default=list)
    is_exposed = Column(Boolean, default=False, index=True)


# 18. NetworkFlow
class NetworkFlow(Base, NetworkCommonMixin):
    __tablename__ = "network_flows"

    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    source_ip = Column(String(100), nullable=False, index=True)
    destination_ip = Column(String(100), nullable=False, index=True)
    source_port = Column(Integer, nullable=True)
    destination_port = Column(Integer, nullable=True, index=True)
    protocol = Column(String(20), nullable=False)
    bytes = Column(Integer, default=0)
    packets = Column(Integer, default=0)
    direction = Column(String(20), default="INGRESS")  # INGRESS, EGRESS
    action = Column(String(20), default="ACCEPT")  # ACCEPT, REJECT
    workload = Column(String(255), nullable=True)
    service = Column(String(255), nullable=True)
    identity = Column(String(255), nullable=True)
    source_type = Column(String(100), default="VPC_FLOW_LOG")  # VPC_FLOW_LOG, KUBERNETES, EBPF, SURICATA
    trace_id = Column(String(255), nullable=True)
    correlation_state = Column(String(50), default="CORRELATION_UNAVAILABLE")  # CORRELATED, CORRELATION_UNAVAILABLE
    correlated_asset_id = Column(UUID(as_uuid=True), nullable=True)


# 19. NetworkPolicy
class NetworkPolicy(Base, NetworkCommonMixin):
    __tablename__ = "network_policies"

    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    version = Column(Integer, default=1, nullable=False)
    subject = Column(String(255), nullable=False)  # target workload or subnet scope
    is_immutable = Column(Boolean, default=False)
    approval_id = Column(String(255), nullable=True)
    approved_by = Column(String(255), nullable=True)
    effective_from = Column(DateTime(timezone=True), nullable=True)
    effective_until = Column(DateTime(timezone=True), nullable=True)


# 20. NetworkPolicyRule
class NetworkPolicyRule(Base, NetworkCommonMixin):
    __tablename__ = "network_policy_rules"

    policy_id = Column(UUID(as_uuid=True), ForeignKey("network_policies.id", ondelete="CASCADE"), nullable=False, index=True)
    source = Column(String(255), nullable=False)
    destination = Column(String(255), nullable=False)
    direction = Column(String(20), nullable=False)  # INGRESS, EGRESS
    action = Column(String(50), nullable=False)     # ALLOW, BLOCK, REQUIRES_APPROVAL
    protocol = Column(String(50), default="tcp")
    port = Column(String(50), nullable=True)
    priority = Column(Integer, default=100)
    conditions = Column(JSON, default=dict)


# 21. NetworkExposure
class NetworkExposure(Base, NetworkCommonMixin):
    __tablename__ = "network_exposures"

    exposure_category = Column(String(100), nullable=False, index=True)
    # PUBLIC_IP, PUBLIC_LOAD_BALANCER, OPEN_SECURITY_GROUP, OPEN_FIREWALL, OPEN_NETWORK_ACL,
    # UNRESTRICTED_INGRESS, UNRESTRICTED_EGRESS, PUBLIC_ADMIN_INTERFACE, DIRECT_DATABASE_EXPOSURE,
    # UNEXPECTED_SERVICE_EXPOSURE, CROSS_ENVIRONMENT_ACCESS, EXCESSIVE_REACHABILITY
    severity = Column(String(20), nullable=False, index=True)  # CRITICAL, HIGH, MEDIUM, LOW
    asset_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    asset_name = Column(String(255), nullable=False)
    protocol = Column(String(50), nullable=True)
    port_range = Column(String(100), nullable=True)
    cidr = Column(String(100), nullable=True)
    reason = Column(Text, nullable=False)
    remediation_advice = Column(Text, nullable=True)
    evidence_id = Column(UUID(as_uuid=True), nullable=True)


# 22. NetworkPath
class NetworkPath(Base, NetworkCommonMixin):
    __tablename__ = "network_paths"

    source_asset_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    destination_asset_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    source_name = Column(String(255), nullable=False)
    destination_name = Column(String(255), nullable=False)
    hops = Column(JSON, default=list)  # list of hop dicts
    protocols = Column(JSON, default=list)
    ports = Column(JSON, default=list)
    allowed_edges = Column(JSON, default=list)
    blocked_edges = Column(JSON, default=list)
    verification_state = Column(String(50), default="THEORETICAL", index=True)  # THEORETICAL, VERIFIED_REACHABLE, BLOCKED, UNKNOWN
    evidence_ids = Column(JSON, default=list)


# 23. NetworkSegment
class NetworkSegment(Base, NetworkCommonMixin):
    __tablename__ = "network_segments"

    segment_name = Column(String(255), nullable=False)
    boundary_type = Column(String(100), nullable=False)  # ENVIRONMENT, DATA_SENSITIVITY, TIER, TRUST_ZONE
    source_scope = Column(String(100), nullable=False)   # DEVELOPMENT, STAGING, PRODUCTION, UNTRUSTED
    target_scope = Column(String(100), nullable=False)   # PRODUCTION, SENSITIVE_DATA, MANAGEMENT
    is_isolated = Column(Boolean, default=True)
    isolation_status = Column(String(50), default="ENFORCED", index=True)  # ENFORCED, VIOLATED, UNVERIFIED
    allowed_exceptions = Column(JSON, default=list)
    violation_count = Column(Integer, default=0)
    evidence_id = Column(UUID(as_uuid=True), nullable=True)


# 24. NetworkObservation
class NetworkObservation(Base, NetworkCommonMixin):
    __tablename__ = "network_observations"

    observation_type = Column(String(100), nullable=False, index=True)
    observed_value = Column(JSON, default=dict)
    expected_value = Column(JSON, default=dict)
    severity = Column(String(50), default="INFO")
    confidence = Column(Float, default=1.0)
    observed_from = Column(String(255), nullable=False)
    evidence_id = Column(UUID(as_uuid=True), nullable=True)


# 25. NetworkEvidence
class NetworkEvidence(Base, NetworkCommonMixin):
    __tablename__ = "network_evidence"

    source_type = Column(String(100), nullable=False, index=True)
    # AWS_SECURITY_GROUP, AZURE_NSG, GCP_FIREWALL, KUBERNETES_OBJECT, CLOUD_FLOW_LOG,
    # RUNTIME_FLOW, POLICY_EVALUATION, TOPOLOGY_OBSERVATION
    source_id = Column(String(255), nullable=False)
    rule_id = Column(String(255), nullable=True)
    input_payload = Column(JSON, default=dict)  # Redacted of all credentials
    result_payload = Column(JSON, default=dict)
    job_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    trace_id = Column(String(255), nullable=True)
    observation_time = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    collection_time = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


# 26. NetworkRiskAssessment
class NetworkRiskAssessment(Base, NetworkCommonMixin):
    __tablename__ = "network_risk_assessments"

    risk_score = Column(Float, nullable=False, default=0.0)
    risk_level = Column(String(50), nullable=False, default="CLEAN")  # CRITICAL, HIGH, MEDIUM, LOW, CLEAN
    risk_factors = Column(JSON, default=list)
    evidence_ids = Column(JSON, default=list)
    calculation_version = Column(String(50), default="1.0.0")
    calculated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


# 27. NetworkJob
class NetworkJob(Base, NetworkCommonMixin):
    __tablename__ = "network_jobs"

    job_type = Column(String(100), default="DISCOVERY", nullable=False)
    # DISCOVERY, FLOW_ANALYSIS, PATH_EVALUATION, POLICY_SIMULATION
    milestone = Column(String(100), default="QUEUED", nullable=False)
    # QUEUED, DISCOVERING_NETWORKS, DISCOVERING_ASSETS, DISCOVERING_RULES, BUILDING_TOPOLOGY,
    # ANALYZING_EXPOSURE, UPDATING_GRAPH, CALCULATING_RISK, FINALIZING, COMPLETED, FAILED, CANCELLED
    progress_percent = Column(Integer, default=0)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    error_message = Column(Text, nullable=True)
    trace_id = Column(String(255), nullable=True)
    job_metadata = Column(JSON, default=dict)
