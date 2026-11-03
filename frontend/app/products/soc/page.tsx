'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  SlidersHorizontal,
  ShieldAlert,
  AlertTriangle,
  Play,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  Download,
  ChevronDown,
  X,
  ExternalLink,
  Activity,
  Layers,
  Terminal,
  FileText,
  Settings,
  Shield,
  Zap,
  Lock,
} from 'lucide-react';
import {
  ProductPageShell,
  ProductSidebarItem,
  ProductTabItem,
} from '@/components/products/ProductPageShell';
import { TalkToExpertModal } from '@/components/common/TalkToExpertModal';
import { useScope } from '@/context/ScopeContext';
import { toast } from '@/lib/toast';

export interface IncidentAlert {
  id: string;
  incidentNumber: string;
  title: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'OPEN' | 'INVESTIGATING' | 'CONTAINED' | 'RESOLVED';
  workload: string;
  environment: string;
  mitreTactic: string;
  detectedAt: string;
  assignee: string;
  playbook: string;
  summary: string;
}

const INITIAL_INCIDENTS: IncidentAlert[] = [
  {
    id: 'inc-101',
    incidentNumber: 'SEC-2026-904',
    title: 'Unauthorized Reverse Shell Spawned in Agent Worker Container',
    severity: 'CRITICAL',
    status: 'INVESTIGATING',
    workload: 'agent-executor-pod-89b',
    environment: 'production-us-east',
    mitreTactic: 'Execution (T1059.004)',
    detectedAt: '6 mins ago',
    assignee: 'Auto-Triage SOC Engine',
    playbook: 'PB-09: Immediate Pod Isolation & Token Revocation',
    summary: 'eBPF syscall interceptor caught /bin/sh invocation with inherited socket descriptor bound to 185.220.101.5.',
  },
  {
    id: 'inc-102',
    incidentNumber: 'SEC-2026-899',
    title: 'Autonomous Tool Policy Violation: Unrestricted S3 Bucket Read',
    severity: 'HIGH',
    status: 'CONTAINED',
    workload: 'mcp-tool-proxy-service',
    environment: 'production-aws-gov',
    mitreTactic: 'Exfiltration (T1567)',
    detectedAt: '24 mins ago',
    assignee: 'Elena Rostova (SecOps Lead)',
    playbook: 'PB-04: OPA Policy Enforcement & Secret Rotation',
    summary: 'LLM coding assistant attempted to read production billing bucket. OPA Rego rule rejected action with 0ms leak window.',
  },
  {
    id: 'inc-103',
    incidentNumber: 'SEC-2026-892',
    title: 'Anomalous SSH Lateral Movement Attempt on Bastion Node',
    severity: 'HIGH',
    status: 'CONTAINED',
    workload: 'bastion-host-01',
    environment: 'staging-vpc',
    mitreTactic: 'Lateral Movement (T1021.004)',
    detectedAt: '1 hour ago',
    assignee: 'Mayur K. (Incident Responder)',
    playbook: 'PB-12: Host Quarantine & WireGuard Key Nullification',
    summary: 'Rapid sequential authentication attempts detected using expired staging key from external IP pool.',
  },
  {
    id: 'inc-104',
    incidentNumber: 'SEC-2026-880',
    title: 'Hardcoded API Token Exposed in Git Pull Request #237',
    severity: 'MEDIUM',
    status: 'RESOLVED',
    workload: 'thing-platform-repo:feature/payments',
    environment: 'github-enterprise',
    mitreTactic: 'Credential Access (T1552)',
    detectedAt: '3 hours ago',
    assignee: 'Automated CI/CD Blocker',
    playbook: 'PB-01: GitHub Commit Blocker & AWS KMS Re-encryption',
    summary: 'Gitleaks rule high-entropy matched Stripe live webhook secret in commits. Automated PR gate blocked merge.',
  },
  {
    id: 'inc-105',
    incidentNumber: 'SEC-2026-871',
    title: 'Kubernetes API Server Unauthorized ClusterRoleBinding Probe',
    severity: 'CRITICAL',
    status: 'RESOLVED',
    workload: 'k8s-control-plane-us-west',
    environment: 'production-multi-cloud',
    mitreTactic: 'Privilege Escalation (T1078)',
    detectedAt: '5 hours ago',
    assignee: 'SecuLayer Control Plane',
    playbook: 'PB-08: RBAC Audit & ServiceAccount Token Invalidation',
    summary: 'Namespace default service account attempted to escalate cluster-admin permissions via unverified admission webhook.',
  },
];

export default function SocProductPage() {
  const router = useRouter();
  const { currentProject } = useScope();
  const [activeSidebarId, setActiveSidebarId] = useState('incidents');
  const [activeTabId, setActiveTabId] = useState('incident-queue');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('All Severities');
  const [selectedStatus, setSelectedStatus] = useState('All Status');
  const [selectedIncident, setSelectedIncident] = useState<IncidentAlert | null>(null);
  const [demoModalOpen, setDemoModalOpen] = useState(false);
  const [incidents, setIncidents] = useState<IncidentAlert[]>(INITIAL_INCIDENTS);

  const sidebarItems: ProductSidebarItem[] = [
    { id: 'incidents', label: 'Incident Triage', icon: SlidersHorizontal, badge: String(incidents.length) },
    { id: 'alerts', label: 'Alert Feeds', icon: ShieldAlert, badge: '3 Unread' },
    { id: 'playbooks', label: 'Automated Playbooks', icon: Zap },
    { id: 'mitre', label: 'MITRE Matrix', icon: Layers },
    { id: 'investigation', label: 'Syscall Anomaly Traces', icon: Activity },
    { id: 'reports', label: 'Audit Log & Evidence', icon: FileText },
    { id: 'settings', label: 'Escalations & Teams', icon: Settings },
  ];

  const tabs: ProductTabItem[] = useMemo(() => [
    { id: 'incident-queue', label: 'Active Incidents', count: incidents.length },
    { id: 'playbooks', label: 'Security Playbooks', count: 12 },
    { id: 'killchain', label: 'Kill Chain Coverage', count: 8 },
  ], [incidents]);

  const filteredIncidents = useMemo(() => {
    return incidents.filter((item) => {
      const matchSearch =
        searchQuery.trim() === '' ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.incidentNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.workload.toLowerCase().includes(searchQuery.toLowerCase());

      const matchSeverity = selectedSeverity === 'All Severities' || item.severity === selectedSeverity;
      const matchStatus = selectedStatus === 'All Status' || item.status === selectedStatus;

      return matchSearch && matchSeverity && matchStatus;
    });
  }, [incidents, searchQuery, selectedSeverity, selectedStatus]);

  const handleExport = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      ['IncidentID,Title,Severity,Status,Workload,Environment,Tactic,DetectedAt,Assignee']
        .concat(
          filteredIncidents.map(
            (i) =>
              `"${i.incidentNumber}","${i.title}","${i.severity}","${i.status}","${i.workload}","${i.environment}","${i.mitreTactic}","${i.detectedAt}","${i.assignee}"`
          )
        )
        .join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `soc-incident-triage-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Active incidents triage exported', {
      description: 'Incident response records exported to CSV format.',
    });
  };

  return (
    <ProductPageShell
      productKey="soc"
      productTitle="SOC Operations"
      categoryBadge="AUTONOMOUS INCIDENT RESPONSE & TRIAGE"
      heroTitle="Automated Incident Triage, eBPF Traces & Deterministic Playbooks"
      heroDescription="Detect adversary intrusions at kernel level, automate containment with immutable OPA policies, and eliminate alert fatigue across multi-cloud infrastructure and autonomous agent operations."
      primaryButtonLabel="Execute Auto-Triage"
      onPrimaryAction={() => {
        toast.info('Auto-Triage executed', {
          description: 'Triggered automated alert deduplication & risk scoring across active incidents.',
        });
      }}
      secondaryButtonLabel="View Documentation"
      sidebarItems={sidebarItems}
      activeSidebarId={activeSidebarId}
      onSelectSidebar={(id) => setActiveSidebarId(id)}
      tabs={tabs}
      activeTabId={activeTabId}
      onSelectTab={(id) => setActiveTabId(id)}
      filterBar={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative' }}>
              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
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
                <option value="All Severities">Severity (All)</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
              </select>
              <ChevronDown size={13} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748B' }} />
            </div>

            <div style={{ position: 'relative' }}>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
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
                <option value="All Status">Status (All)</option>
                <option value="INVESTIGATING">Investigating</option>
                <option value="CONTAINED">Contained</option>
                <option value="RESOLVED">Resolved</option>
              </select>
              <ChevronDown size={13} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748B' }} />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ position: 'relative', width: '220px' }}>
              <input
                type="text"
                placeholder="Search incidents, workloads..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                  padding: '7px 10px 7px 30px',
                  fontSize: '13px',
                  color: '#0F172A',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
            </div>

            <button
              type="button"
              onClick={handleExport}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 12px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 500,
                color: '#334155',
                cursor: 'pointer',
              }}
            >
              <Download size={13} />
              <span>Export</span>
            </button>
          </div>
        </div>
      }
    >

      {activeTabId === 'incident-queue' && (
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontWeight: 600 }}>
                  <th style={{ padding: '12px 16px' }}>Incident ID</th>
                  <th style={{ padding: '12px 16px' }}>Incident Summary</th>
                  <th style={{ padding: '12px 16px' }}>Severity</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px' }}>Affected Workload</th>
                  <th style={{ padding: '12px 16px' }}>MITRE ATT&CK</th>
                  <th style={{ padding: '12px 16px' }}>Detected</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredIncidents.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedIncident(item)}
                    style={{ borderBottom: '1px solid #F1F5F9', cursor: 'pointer', transition: 'background-color 0.15s' }}
                    className="hover:bg-slate-50"
                  >
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A', fontFamily: 'var(--font-mono)' }}>
                        {item.incidentNumber}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 600, color: '#0F172A', maxWidth: '320px' }}>
                      {item.title}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '12px',
                          backgroundColor:
                            item.severity === 'CRITICAL' ? '#FEF2F2' : item.severity === 'HIGH' ? '#FFF7ED' : '#FEFCE8',
                          color:
                            item.severity === 'CRITICAL' ? '#DC2626' : item.severity === 'HIGH' ? '#EA580C' : '#CA8A04',
                          border: `1px solid ${
                            item.severity === 'CRITICAL' ? '#FECACA' : item.severity === 'HIGH' ? '#FED7AA' : '#FEF08A'
                          }`,
                        }}
                      >
                        {item.severity}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor:
                            item.status === 'INVESTIGATING' ? '#EFF6FF' : item.status === 'CONTAINED' ? '#FEF3C7' : '#F0FDF4',
                          color:
                            item.status === 'INVESTIGATING' ? '#1D4ED8' : item.status === 'CONTAINED' ? '#B45309' : '#15803D',
                        }}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', color: '#475569', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                      {item.workload}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#334155', fontSize: '12px' }}>
                      {item.mitreTactic}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#64748B', fontSize: '12px' }}>
                      {item.detectedAt}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedIncident(item);
                        }}
                        style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#0F172A', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                      >
                        Triage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTabId === 'playbooks' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
          {[
            {
              id: 'pb-01',
              title: 'PB-01: GitHub Commit Secret Leak Containment',
              trigger: 'High-entropy credential detected in git push',
              action: 'Block PR merge, revoke AWS STS temporary session & dispatch CIRT notification',
              status: 'Enabled & Enforced',
            },
            {
              id: 'pb-04',
              title: 'PB-04: AI Agent Tool Policy Violation Mitigation',
              trigger: 'Agent proposes tool call exceeding risk ceiling',
              action: 'Reject tool invocation via OPA Rego gate, record cryptographic trace in audit ledger',
              status: 'Enabled & Enforced',
            },
            {
              id: 'pb-09',
              title: 'PB-09: Container Runtime Reverse Shell Quarantine',
              trigger: 'eBPF syscall interceptor catches unauthorized socket execve',
              action: 'Send SIGKILL to unauthorized child PID, freeze container cgroup, capture core dump',
              status: 'Enabled & Enforced',
            },
          ].map((pb) => (
            <div key={pb.id} style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', backgroundColor: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0' }}>
                  {pb.status}
                </span>
                <Zap size={16} color="#D97706" />
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: '0 0 8px 0' }}>{pb.title}</h3>
              <p style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.5, margin: '0 0 14px 0' }}>
                <strong>Trigger:</strong> {pb.trigger}
              </p>
              <div style={{ padding: '10px 12px', borderRadius: '6px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', fontSize: '12px', color: '#334155', lineHeight: 1.5 }}>
                <strong>Automated Action:</strong> {pb.action}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Investigation Drawer */}
      {selectedIncident && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999,
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
          onClick={() => setSelectedIncident(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '540px',
              backgroundColor: '#FFFFFF',
              height: '100%',
              padding: '28px',
              boxSizing: 'border-box',
              overflowY: 'auto',
              boxShadow: '-10px 0 25px rgba(0,0,0,0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A', fontFamily: 'var(--font-mono)' }}>
                  {selectedIncident.incidentNumber}
                </span>
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', backgroundColor: '#FEF2F2', color: '#DC2626' }}>
                  {selectedIncident.severity}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedIncident(null)}
                style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: '0 0 10px 0' }}>
              {selectedIncident.title}
            </h2>
            <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.6, margin: '0 0 24px 0' }}>
              {selectedIncident.summary}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Workload Target</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                  {selectedIncident.workload}
                </div>
              </div>

              <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Active Playbook</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#2563EB', marginTop: '2px' }}>
                  {selectedIncident.playbook}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                const pb = selectedIncident.playbook;
                setSelectedIncident(null);
                toast.success('Playbook executed', {
                  description: `Autonomous containment triggered: ${pb}.`,
                });
              }}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: '#0F172A',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Execute Playbook Containment
            </button>
          </div>
        </div>
      )}

      <TalkToExpertModal
        isOpen={demoModalOpen}
        onClose={() => setDemoModalOpen(false)}
      />
    </ProductPageShell>
  );
}
