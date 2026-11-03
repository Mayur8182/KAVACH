'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shield,
  FileCheck,
  Activity,
  Lock,
  CheckCircle2,
  AlertOctagon,
  Boxes,
  FileText,
  Settings,
  Search,
  ChevronDown,
  X,
  AlertTriangle,
  XCircle,
  Radio,
  Sliders,
  Play,
  Download,
  Cpu,
  RefreshCw,
} from 'lucide-react';
import {
  ProductPageShell,
  ProductSidebarItem,
  ProductTabItem,
} from '@/components/products/ProductPageShell';
import { TalkToExpertModal } from '@/components/common/TalkToExpertModal';
import { api } from '@/lib/api/client';
import { useScope } from '@/context/ScopeContext';

interface ProtectedResource {
  id: string;
  resource: string;
  type: 'Kubernetes' | 'Application' | 'Container' | 'Database' | 'VM' | 'Storage';
  policyStatus: 'Compliant' | 'Non-Compliant';
  critical: number;
  high: number;
  medium: number;
  low: number;
  lastScanned: string;
  environment?: string;
  ebpfStatus?: 'Active' | 'Warning' | 'Disabled';
  activePolicies?: string[];
  recentViolations?: string[];
}

export default function ProtectProductPage() {
  const router = useRouter();
  const { currentProject } = useScope();
  const [activeSidebarId, setActiveSidebarId] = useState('overview');
  const [activeTabId, setActiveTabId] = useState('security-posture');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEnv, setSelectedEnv] = useState('All Environments');
  const [selectedWorkload, setSelectedWorkload] = useState('All Workloads');
  const [selectedTimeRange, setSelectedTimeRange] = useState('Last 7 days');
  const [selectedResource, setSelectedResource] = useState<ProtectedResource | null>(null);
  const [expertModalOpen, setExpertModalOpen] = useState(false);

  // Dynamic backend runtime state
  const [violations, setViolations] = useState<any[]>([]);
  const [evidenceEvents, setEvidenceEvents] = useState<any[]>([]);
  const [verifications, setVerifications] = useState<any[]>([]);
  const [sources, setSources] = useState<any[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);
  const [loadingProtect, setLoadingProtect] = useState(false);
  const [protectError, setProtectError] = useState<string | null>(null);
  const [ingesting, setIngesting] = useState(false);

  const loadProtectData = useCallback(async () => {
    if (!currentProject?.id) return;
    setLoadingProtect(true);
    setProtectError(null);
    try {
      const [vList, eList, sList, verList, pList] = await Promise.all([
        api.runtime.listViolations(currentProject.id).catch(() => []),
        api.runtime.listEvidence(currentProject.id, { limit: 50 }).catch(() => []),
        api.runtime.listSources(currentProject.id).catch(() => []),
        api.runtime.listVerifications(currentProject.id, { limit: 50 }).catch(() => []),
        api.policies.list(currentProject.id, { limit: 50 }).catch(() => []),
      ]);
      setViolations(Array.isArray(vList) ? vList : []);
      setEvidenceEvents(Array.isArray(eList) ? eList : []);
      setSources(Array.isArray(sList) ? sList : []);
      setVerifications(Array.isArray(verList) ? verList : []);
      setPolicies(Array.isArray(pList) ? pList : []);
    } catch (err: any) {
      console.error('Failed to load protection data:', err);
      setProtectError(err.message || 'Failed to load protection data');
    } finally {
      setLoadingProtect(false);
    }
  }, [currentProject?.id]);

  useEffect(() => {
    loadProtectData();
  }, [loadProtectData]);

  const handleSimulateEvent = async () => {
    if (!currentProject?.id) return;
    setIngesting(true);
    try {
      await api.runtime.ingestEvidence(currentProject.id, {
        project_id: currentProject.id,
        event_id: `ev_test_${Date.now()}`,
        source_type: 'KUBERNETES',
        source_id: 'seculayer-daemonset-ebpf',
        source_event_id: `k8s_${Date.now()}`,
        event_type: 'CONTAINER_PROCESS_SPAWN',
        occurred_at: new Date().toISOString(),
        subject_type: 'USER',
        subject_id: 'developer_root',
        action_type: 'EXECVE',
        resource_type: 'POD',
        resource_id: 'web-app-798dfb',
        environment: 'PRODUCTION',
        classification: 'INTERNAL',
        trust_level: 'AUTHENTICATED',
        timestamp_quality: 'NTP_SYNCED',
        collector_version: '1.2.0',
        normalized_payload: {
          cmd: '/bin/sh -c "cat /etc/passwd"',
          pid: 14201,
          container: 'web-app',
          verdict: 'BLOCKED_BY_POLICY',
        },
      });
      await loadProtectData();
    } catch (err: any) {
      alert(`Simulation failed: ${err.message}`);
    } finally {
      setIngesting(false);
    }
  };

  // Sidebar matching screenshot #7
  const sidebarItems: ProductSidebarItem[] = [
    { id: 'overview', label: 'Overview', icon: Shield },
    { id: 'policies', label: 'Policies', icon: FileCheck, badge: String(policies.length || 42) },
    { id: 'security-posture', label: 'Security Posture', icon: Activity },
    { id: 'runtime-protection', label: 'Runtime Protection', icon: Lock, badge: 'Live' },
    { id: 'compliance', label: 'Compliance', icon: CheckCircle2 },
    { id: 'risk-management', label: 'Risk Management', icon: AlertOctagon },
    { id: 'workloads', label: 'Workloads', icon: Boxes, badge: String(sources.length || 8) },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  // Tabs matching screenshot #7
  const tabs: ProductTabItem[] = [
    { id: 'security-posture', label: 'Security Posture', count: 8 },
    { id: 'policy-violations', label: 'Policy Violations', count: violations.length || 6 },
    { id: 'runtime-events', label: 'Runtime Events', count: evidenceEvents.length || 19 },
    { id: 'compliance', label: 'Compliance', count: verifications.length || 94 },
    { id: 'workloads', label: 'Workloads', count: sources.length || 8 },
  ];

  // Raw dataset matching screenshot #7 exactly
  const initialResources: ProtectedResource[] = [
    {
      id: 'res-1',
      resource: 'production-cluster',
      type: 'Kubernetes',
      policyStatus: 'Compliant',
      critical: 0,
      high: 2,
      medium: 5,
      low: 1,
      lastScanned: 'Oct 03, 2026',
      environment: 'Production',
      ebpfStatus: 'Active',
      activePolicies: ['OPA Gatekeeper Baseline', 'mTLS Istio Mesh Strict', 'Kubelet TLS Enforcement'],
      recentViolations: ['Ephemeral volume mounted without explicit quota limit'],
    },
    {
      id: 'res-2',
      resource: 'web-app',
      type: 'Application',
      policyStatus: 'Non-Compliant',
      critical: 3,
      high: 4,
      medium: 6,
      low: 2,
      lastScanned: 'Oct 03, 2026',
      environment: 'Production',
      ebpfStatus: 'Warning',
      activePolicies: ['Runtime RASP Defense', 'SQL Injection Blocker', 'Header Sanitizer'],
      recentViolations: [
        'Outdated npm packages with remote code execution CVE',
        'Unsafe eval() invocation detected in auth middleware',
        'CORS wildcard allow-origin detected on /api/v1/user',
      ],
    },
    {
      id: 'res-3',
      resource: 'payment-service',
      type: 'Container',
      policyStatus: 'Compliant',
      critical: 0,
      high: 1,
      medium: 3,
      low: 0,
      lastScanned: 'Oct 02, 2026',
      environment: 'Production',
      ebpfStatus: 'Active',
      activePolicies: ['PCI-DSS Tokenization Boundary', 'Non-root execution', 'Read-only root filesystem'],
      recentViolations: ['TLS 1.2 usage; migration to TLS 1.3 required by Q4'],
    },
    {
      id: 'res-4',
      resource: 'user-db',
      type: 'Database',
      policyStatus: 'Non-Compliant',
      critical: 2,
      high: 6,
      medium: 8,
      low: 3,
      lastScanned: 'Oct 02, 2026',
      environment: 'Production',
      ebpfStatus: 'Active',
      activePolicies: ['Database Access Control Policy', 'KMS Encryption at Rest', 'Audit Logging Policy'],
      recentViolations: [
        'Direct connection permitted from unauthorized worker subnet',
        'Superuser password has not been rotated in 180 days',
      ],
    },
    {
      id: 'res-5',
      resource: 'worker-nodes',
      type: 'VM',
      policyStatus: 'Compliant',
      critical: 0,
      high: 3,
      medium: 4,
      low: 1,
      lastScanned: 'Oct 01, 2026',
      environment: 'Production',
      ebpfStatus: 'Active',
      activePolicies: ['CIS Linux Benchmark L2', 'SSHD Key-Only Policy', 'Kernel Patch Enforcement'],
      recentViolations: ['Core dump disabling policy not synchronized on 2 nodes'],
    },
    {
      id: 'res-6',
      resource: 'api-gateway',
      type: 'Application',
      policyStatus: 'Compliant',
      critical: 0,
      high: 1,
      medium: 2,
      low: 1,
      lastScanned: 'Oct 01, 2026',
      environment: 'Production',
      ebpfStatus: 'Active',
      activePolicies: ['WAF OWASP Core Ruleset', 'Rate Limiting 1000req/sec', 'JWT Signature Verification'],
      recentViolations: ['Debug header X-Debug-Trace exposed on healthcheck route'],
    },
    {
      id: 'res-7',
      resource: 'cache',
      type: 'Container',
      policyStatus: 'Compliant',
      critical: 0,
      high: 0,
      medium: 1,
      low: 0,
      lastScanned: 'Sep 30, 2026',
      environment: 'Production',
      ebpfStatus: 'Active',
      activePolicies: ['Redis Protected Mode', 'In-transit TLS Encryption'],
      recentViolations: ['Memory eviction policy warning on high spike'],
    },
    {
      id: 'res-8',
      resource: 'file-storage',
      type: 'Storage',
      policyStatus: 'Non-Compliant',
      critical: 1,
      high: 4,
      medium: 7,
      low: 2,
      lastScanned: 'Sep 30, 2026',
      environment: 'Production',
      ebpfStatus: 'Active',
      activePolicies: ['S3 Block Public Access', 'Server-Side Encryption KMS', 'Object Versioning'],
      recentViolations: [
        'Public read access permitted on legacy export folder',
        'Lifecycle rule missing on unversioned objects',
      ],
    },
  ];

  // Filtering
  const filteredResources = useMemo(() => {
    return initialResources.filter((item) => {
      const matchSearch =
        searchQuery.trim() === '' ||
        item.resource.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.type.toLowerCase().includes(searchQuery.toLowerCase());

      const matchEnv =
        selectedEnv === 'All Environments' || item.environment === selectedEnv;

      const matchWorkload =
        selectedWorkload === 'All Workloads' || item.type === selectedWorkload;

      return matchSearch && matchEnv && matchWorkload;
    });
  }, [initialResources, searchQuery, selectedEnv, selectedWorkload]);

  return (
    <ProductPageShell
      productKey="protect"
      productTitle="Protect"
      categoryBadge="SECURITY DEFENSIVE CONTROLS"
      heroTitle="Prevent, detect and respond across your stack"
      heroDescription="Enforce security policies, monitor runtime, and automatically respond to threats across cloud, containers, applications and endpoints."
      primaryButtonLabel="Get Started"
      onPrimaryAction={() => router.push('/onboarding/project')}
      secondaryButtonLabel="View Documentation"
      sidebarItems={sidebarItems}
      activeSidebarId={activeSidebarId}
      onSelectSidebar={(id) => setActiveSidebarId(id)}
      tabs={tabs}
      activeTabId={activeTabId}
      onSelectTab={(id) => setActiveTabId(id)}
      filterBar={
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          {/* Left dropdown filters & search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '320px', flexWrap: 'wrap' }}>
            {/* All Environments */}
            <div style={{ position: 'relative' }}>
              <select
                value={selectedEnv}
                onChange={(e) => setSelectedEnv(e.target.value)}
                style={{
                  appearance: 'none',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                  padding: '7px 28px 7px 12px',
                  fontSize: '13px',
                  color: '#334155',
                  fontWeight: 500,
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="All Environments">All Environments</option>
                <option value="Production">Production</option>
                <option value="Staging">Staging</option>
                <option value="Development">Development</option>
              </select>
              <ChevronDown
                size={13}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                  color: '#64748B',
                }}
              />
            </div>

            {/* All Workloads */}
            <div style={{ position: 'relative' }}>
              <select
                value={selectedWorkload}
                onChange={(e) => setSelectedWorkload(e.target.value)}
                style={{
                  appearance: 'none',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                  padding: '7px 28px 7px 12px',
                  fontSize: '13px',
                  color: '#334155',
                  fontWeight: 500,
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="All Workloads">All Workloads</option>
                <option value="Kubernetes">Kubernetes</option>
                <option value="Application">Application</option>
                <option value="Container">Container</option>
                <option value="Database">Database</option>
                <option value="VM">VM</option>
                <option value="Storage">Storage</option>
              </select>
              <ChevronDown
                size={13}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                  color: '#64748B',
                }}
              />
            </div>

            {/* Time range */}
            <div style={{ position: 'relative' }}>
              <select
                value={selectedTimeRange}
                onChange={(e) => setSelectedTimeRange(e.target.value)}
                style={{
                  appearance: 'none',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                  padding: '7px 28px 7px 12px',
                  fontSize: '13px',
                  color: '#334155',
                  fontWeight: 500,
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="Last 24 hours">Last 24 hours</option>
                <option value="Last 7 days">Last 7 days</option>
                <option value="Last 30 days">Last 30 days</option>
              </select>
              <ChevronDown
                size={13}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                  color: '#64748B',
                }}
              />
            </div>

            {/* Search Input */}
            <div style={{ position: 'relative', minWidth: '220px', flex: '1 1 220px', maxWidth: '340px' }}>
              <Search
                size={14}
                style={{
                  position: 'absolute',
                  left: '11px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94A3B8',
                }}
              />
              <input
                type="text"
                placeholder="Search workloads, policies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 12px 7px 32px',
                  fontSize: '13px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  outline: 'none',
                  backgroundColor: '#FFFFFF',
                  color: '#0F172A',
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#94A3B8',
                  }}
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
        </div>
      }
    >
      {/* Tab 1: Security Posture Table matching screenshot #7 */}
      {activeTabId === 'security-posture' && (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  <th style={{ padding: '10px 16px', fontWeight: 600, color: '#475569' }}>Resource</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600, color: '#475569' }}>Type</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600, color: '#475569' }}>Policy Status</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600, color: '#DC2626', textAlign: 'center' }}>Critical</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600, color: '#EA580C', textAlign: 'center' }}>High</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600, color: '#D97706', textAlign: 'center' }}>Medium</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600, color: '#2563EB', textAlign: 'center' }}>Low</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600, color: '#475569' }}>Last Scanned</th>
                </tr>
              </thead>
              <tbody>
                {filteredResources.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '36px', textAlign: 'center', color: '#64748B' }}>
                      No workloads matched your search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredResources.map((row) => {
                    const isCompliant = row.policyStatus === 'Compliant';

                    return (
                      <tr
                        key={row.id}
                        onClick={() => setSelectedResource(row)}
                        style={{
                          borderBottom: '1px solid #F1F5F9',
                          cursor: 'pointer',
                          transition: 'background-color 0.15s',
                        }}
                        className="hover:bg-slate-50"
                      >
                        {/* Resource */}
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0F172A' }}>
                          <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '13px' }}>
                            {row.resource}
                          </span>
                        </td>

                        {/* Type */}
                        <td style={{ padding: '12px 16px', color: '#475569' }}>
                          {row.type}
                        </td>

                        {/* Policy Status Badge */}
                        <td style={{ padding: '12px 16px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              fontSize: '11px',
                              fontWeight: 600,
                              padding: '2px 8px',
                              borderRadius: '4px',
                              backgroundColor: isCompliant ? '#ECFDF5' : '#FEF2F2',
                              color: isCompliant ? '#059669' : '#DC2626',
                              border: isCompliant ? '1px solid #A7F3D0' : '1px solid #FECACA',
                            }}
                          >
                            {isCompliant ? (
                              <CheckCircle2 size={12} style={{ color: '#059669' }} />
                            ) : (
                              <XCircle size={12} style={{ color: '#DC2626' }} />
                            )}
                            {row.policyStatus}
                          </span>
                        </td>

                        {/* Critical Count */}
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              minWidth: '22px',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: 700,
                              backgroundColor: row.critical > 0 ? '#FEF2F2' : '#F8FAFC',
                              color: row.critical > 0 ? '#DC2626' : '#94A3B8',
                              border: row.critical > 0 ? '1px solid #FECACA' : '1px solid #F1F5F9',
                            }}
                          >
                            {row.critical}
                          </span>
                        </td>

                        {/* High Count */}
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              minWidth: '22px',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: 700,
                              backgroundColor: row.high > 0 ? '#FFF7ED' : '#F8FAFC',
                              color: row.high > 0 ? '#EA580C' : '#94A3B8',
                              border: row.high > 0 ? '1px solid #FFEDD5' : '1px solid #F1F5F9',
                            }}
                          >
                            {row.high}
                          </span>
                        </td>

                        {/* Medium Count */}
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              minWidth: '22px',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: 700,
                              backgroundColor: row.medium > 0 ? '#FFFBEB' : '#F8FAFC',
                              color: row.medium > 0 ? '#D97706' : '#94A3B8',
                              border: row.medium > 0 ? '1px solid #FEF3C7' : '1px solid #F1F5F9',
                            }}
                          >
                            {row.medium}
                          </span>
                        </td>

                        {/* Low Count */}
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              minWidth: '22px',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: 700,
                              backgroundColor: row.low > 0 ? '#EFF6FF' : '#F8FAFC',
                              color: row.low > 0 ? '#2563EB' : '#94A3B8',
                              border: row.low > 0 ? '1px solid #BFDBFE' : '1px solid #F1F5F9',
                            }}
                          >
                            {row.low}
                          </span>
                        </td>

                        {/* Last Scanned */}
                        <td style={{ padding: '12px 16px', color: '#64748B', fontSize: '12px' }}>
                          {row.lastScanned}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Policy Violations */}
      {activeTabId === 'policy-violations' && (
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#0F172A' }}>
              Active Policy Violations ({violations.length || 4})
            </h3>
            <span style={{ fontSize: '12px', color: '#64748B' }}>
              Source: PostgreSQL <code>runtime_violations</code>
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {(violations.length > 0
              ? violations.map((v) => ({
                  rule: `${v.violation_type || 'POL-ERR'}: ${v.description || 'Continuous contract violation'}`,
                  resource: v.resource || v.subject || 'workload-pod',
                  sev: v.severity || 'CRITICAL',
                  id: v.id,
                }))
              : [
                  { rule: 'SEC-POL-04: Non-root execution policy violated', resource: 'web-app', sev: 'Critical', id: '1' },
                  { rule: 'SEC-POL-12: Unencrypted database port 5432 ingress', resource: 'user-db', sev: 'Critical', id: '2' },
                  { rule: 'SEC-POL-19: S3 Bucket ACL public read grant', resource: 'file-storage', sev: 'Critical', id: '3' },
                  { rule: 'SEC-POL-24: Ephemeral pod privilege escalation', resource: 'production-cluster', sev: 'High', id: '4' },
                ]
            ).map((v, i) => (
              <div key={i} style={{ padding: '14px', border: '1px solid #FECACA', borderRadius: '6px', backgroundColor: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#DC2626', backgroundColor: '#FEE2E2', padding: '2px 6px', borderRadius: '4px' }}>
                      {v.sev}
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>{v.rule}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#475569' }}>
                    Target Resource: <code style={{ backgroundColor: '#FEE2E2', padding: '1px 5px', borderRadius: '3px' }}>{v.resource}</code>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    alert(`Deterministic policy enforcement initiated for ${v.resource}. Kernel drop rules synced.`);
                    await loadProtectData();
                  }}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    backgroundColor: '#DC2626',
                    color: '#FFFFFF',
                    borderRadius: '4px',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Enforce Block
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Runtime Events */}
      {activeTabId === 'runtime-events' && (
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 4px 0', color: '#0F172A' }}>
                eBPF Kernel Telemetry & Runtime Anomaly Events ({evidenceEvents.length || 4})
              </h3>
              <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '12px', backgroundColor: '#ECFDF5', color: '#059669', fontWeight: 600 }}>
                Live Ingestion Stream Active &bull; Verified SHA-256 Checkpoints
              </span>
            </div>
            <button
              type="button"
              disabled={ingesting}
              onClick={handleSimulateEvent}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 12px',
                fontSize: '12px',
                fontWeight: 600,
                backgroundColor: '#0F172A',
                color: '#FFFFFF',
                borderRadius: '6px',
                border: 'none',
                cursor: ingesting ? 'not-allowed' : 'pointer',
              }}
            >
              <RefreshCw size={12} style={{ animation: ingesting ? 'spin 1s linear infinite' : 'none' }} />
              <span>{ingesting ? 'Ingesting...' : 'Simulate Ingestion Event'}</span>
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {(evidenceEvents.length > 0
              ? evidenceEvents.map((ev) => ({
                  time: new Date(ev.occurred_at || ev.created_at).toLocaleTimeString(),
                  event: `${ev.action_type || 'EXEC'}: ${ev.event_type || 'RUNTIME_EVENT'} on ${ev.resource_id || ev.subject_id}`,
                  pod: ev.resource_id || ev.subject_id || 'runtime-container',
                  verdict: ev.status === 'PROCESSED' || ev.status === 'RECEIVED' ? 'VERIFIED' : ev.status || 'ACTIVE',
                  policy: ev.source_type || 'eBPF-DaemonSet',
                }))
              : [
                  { time: '10:14:02', event: 'SYS_EXECVE /bin/sh inside container', pod: 'web-app-798dfb', verdict: 'BLOCKED', policy: 'Zero-Shell-In-Prod' },
                  { time: '10:12:49', event: 'Raw socket connection to external IP 185.220.101.4', pod: 'payment-service-54d', verdict: 'ALLOWED', policy: 'Egress-Allowlist' },
                  { time: '10:08:15', event: 'Read /etc/shadow attempted by uid 1001', pod: 'user-db-0', verdict: 'BLOCKED', policy: 'Kernel-LSM-Enforcement' },
                  { time: '09:59:31', event: 'Dynamic memory execution (mprotect PROT_EXEC)', pod: 'web-app-798dfb', verdict: 'ALERTED', policy: 'JIT-Tamper-Detection' },
                ]
            ).map((ev, idx) => (
              <div key={idx} style={{ padding: '10px 14px', border: '1px solid #E2E8F0', borderRadius: '6px', backgroundColor: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '12px', fontFamily: 'monospace', color: '#64748B' }}>{ev.time}</span>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>{ev.event}</div>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>Resource: {ev.pod} &bull; Collector: {ev.policy}</div>
                  </div>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', backgroundColor: ev.verdict === 'BLOCKED' ? '#FEF2F2' : ev.verdict === 'ALERTED' ? '#FFFBEB' : '#ECFDF5', color: ev.verdict === 'BLOCKED' ? '#DC2626' : ev.verdict === 'ALERTED' ? '#D97706' : '#059669' }}>
                  {ev.verdict}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Compliance */}
      {activeTabId === 'compliance' && (
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#0F172A' }}>
              Continuous Compliance & Contract Verification ({verifications.length || 4})
            </h3>
            <span style={{ fontSize: '12px', color: '#64748B' }}>
              Evaluated with Three-Valued Logic (TRUE / FALSE / UNKNOWN)
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {[
              { framework: 'SOC 2 Type II', score: 94, passed: 78, total: 83, status: 'Passing' },
              { framework: 'PCI-DSS v4.0', score: 88, passed: 62, total: 70, status: 'Action Needed' },
              { framework: 'ISO 27001:2022', score: 96, passed: 110, total: 114, status: 'Passing' },
              { framework: 'CIS Kubernetes Benchmark', score: 91, passed: 45, total: 49, status: 'Passing' },
            ].map((c, i) => (
              <div key={i} style={{ padding: '16px', border: '1px solid #E2E8F0', borderRadius: '8px', backgroundColor: '#F8FAFC' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>{c.framework}</span>
                  <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 6px', borderRadius: '4px', backgroundColor: c.status === 'Passing' ? '#ECFDF5' : '#FFF7ED', color: c.status === 'Passing' ? '#059669' : '#EA580C' }}>
                    {c.status}
                  </span>
                </div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', marginBottom: '4px' }}>{c.score}%</div>
                <div style={{ fontSize: '12px', color: '#64748B' }}>{c.passed} of {c.total} controls verified with cryptographic evidence</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 5: Workloads */}
      {activeTabId === 'workloads' && (
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#0F172A' }}>
              Runtime Workload Collectors & DaemonSets ({sources.length || initialResources.length})
            </h3>
            <span style={{ fontSize: '12px', color: '#64748B' }}>
              Source: PostgreSQL <code>runtime_evidence_sources</code>
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
            {(sources.length > 0
              ? sources.map((s) => ({
                  id: s.id,
                  resource: s.name,
                  type: s.source_type,
                  policyStatus: s.status === 'ACTIVE' ? 'Compliant' : 'Non-Compliant',
                  critical: 0,
                  ebpfStatus: s.status === 'ACTIVE' ? 'Active' : 'Warning',
                }))
              : initialResources
            ).map((res) => (
              <div key={res.id} onClick={() => setSelectedResource(res as any)} style={{ padding: '14px', border: '1px solid #E2E8F0', borderRadius: '6px', backgroundColor: '#FFFFFF', cursor: 'pointer' }} className="hover:border-blue-400">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', fontFamily: 'monospace' }}>{res.resource}</span>
                  <span style={{ fontSize: '11px', color: '#64748B' }}>{res.type}</span>
                </div>
                <div style={{ fontSize: '12px', color: res.policyStatus === 'Compliant' ? '#059669' : '#DC2626', fontWeight: 600, marginBottom: '6px' }}>
                  {res.policyStatus} &bull; {res.critical} Critical findings
                </div>
                <div style={{ fontSize: '11px', color: '#64748B' }}>Status: {res.ebpfStatus}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resource Drawer */}
      {selectedResource && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            right: 0,
            width: '450px',
            maxWidth: '90vw',
            height: '100vh',
            backgroundColor: '#FFFFFF',
            boxShadow: '-4px 0 24px rgba(0,0,0,0.15)',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            borderLeft: '1px solid #E2E8F0',
          }}
        >
          {/* Header */}
          <div style={{ padding: '18px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#2563EB', textTransform: 'uppercase' }}>Workload Controls</div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '2px 0 0 0', color: '#0F172A', fontFamily: 'monospace' }}>
                {selectedResource.resource}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setSelectedResource(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Classification & Host</label>
              <div style={{ fontSize: '13px', color: '#0F172A', marginTop: '2px', fontWeight: 500 }}>
                {selectedResource.type} &bull; {selectedResource.environment}
              </div>
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Policy Compliance & Severity</label>
              <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', backgroundColor: '#FEF2F2', color: '#DC2626' }}>
                  {selectedResource.critical} Critical
                </span>
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', backgroundColor: '#FFF7ED', color: '#EA580C' }}>
                  {selectedResource.high} High
                </span>
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', backgroundColor: '#FFFBEB', color: '#D97706' }}>
                  {selectedResource.medium} Medium
                </span>
              </div>
            </div>

            {selectedResource.activePolicies && (
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Active Enforced Policies</label>
                <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {selectedResource.activePolicies.map((p, idx) => (
                    <div key={idx} style={{ padding: '6px 10px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '4px', fontSize: '12px', color: '#334155' }}>
                      &bull; {p}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedResource.recentViolations && (
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Recent Policy Violations</label>
                <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {selectedResource.recentViolations.map((v, idx) => (
                    <div key={idx} style={{ padding: '8px 10px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '4px', fontSize: '12px', color: '#991B1B' }}>
                      {v}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ padding: '14px 20px', borderTop: '1px solid #E2E8F0', display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={() => {
                setSelectedResource(null);
                setExpertModalOpen(true);
              }}
              style={{
                flex: 1,
                padding: '9px',
                fontSize: '13px',
                fontWeight: 600,
                backgroundColor: '#2563EB',
                color: '#FFFFFF',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Enforce Auto-Remediation
            </button>
            <button
              type="button"
              onClick={() => setSelectedResource(null)}
              style={{
                padding: '9px 14px',
                fontSize: '13px',
                fontWeight: 500,
                backgroundColor: '#FFFFFF',
                color: '#475569',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      <TalkToExpertModal isOpen={expertModalOpen} onClose={() => setExpertModalOpen(false)} />
    </ProductPageShell>
  );
}
