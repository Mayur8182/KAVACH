'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bot,
  Users,
  Rocket,
  ShieldCheck,
  Activity,
  AlertTriangle,
  Sliders,
  Boxes,
  Settings,
  Search,
  ChevronDown,
  Plus,
  MoreHorizontal,
  X,
  Play,
  Pause,
  CheckCircle2,
  Clock,
  Terminal,
  Zap,
  Lock,
} from 'lucide-react';
import {
  ProductPageShell,
  ProductSidebarItem,
  ProductTabItem,
} from '@/components/products/ProductPageShell';
import { TalkToExpertModal } from '@/components/common/TalkToExpertModal';

interface AgentRecord {
  id: string;
  name: string;
  type: string;
  environment: string;
  status: 'Running' | 'Idle' | 'Stopped' | 'Error';
  lastActivity: string;
  mcpToolsCount?: number;
  tasksCompleted?: number;
  policiesEnforced?: number;
  description?: string;
}

export default function AgentProductPage() {
  const router = useRouter();
  const [activeSidebarId, setActiveSidebarId] = useState('overview');
  const [activeTabId, setActiveTabId] = useState('agents');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAgentType, setSelectedAgentType] = useState('All Agent Types');
  const [selectedEnvironment, setSelectedEnvironment] = useState('All Environments');
  const [selectedStatus, setSelectedStatus] = useState('All Status');
  const [selectedAgent, setSelectedAgent] = useState<AgentRecord | null>(null);

  // Add Agent Modal State
  const [addAgentModalOpen, setAddAgentModalOpen] = useState(false);
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentType, setNewAgentType] = useState('Code Security');
  const [newAgentEnv, setNewAgentEnv] = useState('Production');
  const [newAgentPermission, setNewAgentPermission] = useState('Suggestion & PR Only');

  const [expertModalOpen, setExpertModalOpen] = useState(false);

  // Sidebar matching screenshot #8
  const sidebarItems: ProductSidebarItem[] = [
    { id: 'overview', label: 'Overview', icon: Bot },
    { id: 'agents', label: 'Agents', icon: Users, badge: '8' },
    { id: 'deployments', label: 'Deployments', icon: Rocket },
    { id: 'policies', label: 'Policies', icon: ShieldCheck, badge: '16' },
    { id: 'events', label: 'Events', icon: Activity, badge: '24' },
    { id: 'vulnerabilities', label: 'Vulnerabilities', icon: AlertTriangle },
    { id: 'configuration', label: 'Configuration', icon: Sliders },
    { id: 'fleet-management', label: 'Fleet Management', icon: Boxes },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  // Tabs matching screenshot #8
  const tabs: ProductTabItem[] = [
    { id: 'agents', label: 'Agents', count: 8 },
    { id: 'events', label: 'Events', count: 24 },
    { id: 'actions', label: 'Actions', count: 52 },
    { id: 'policies', label: 'Policies', count: 16 },
    { id: 'deployments', label: 'Deployments', count: 3 },
  ];

  // Raw dataset matching screenshot #8 exactly
  const [agentsList, setAgentsList] = useState<AgentRecord[]>([
    {
      id: 'ag-1',
      name: 'code-agent',
      type: 'Code Security',
      environment: 'Production',
      status: 'Running',
      lastActivity: 'Oct 03, 2026 10:12',
      mcpToolsCount: 8,
      tasksCompleted: 142,
      policiesEnforced: 12,
      description: 'Autonomous SAST/SCA triage, vulnerability investigation, and verified GitHub PR patch generation.',
    },
    {
      id: 'ag-2',
      name: 'cloud-agent',
      type: 'Cloud Security',
      environment: 'Production',
      status: 'Running',
      lastActivity: 'Oct 03, 2026 09:58',
      mcpToolsCount: 12,
      tasksCompleted: 310,
      policiesEnforced: 18,
      description: 'Continuous AWS, GCP & Azure CSPM telemetry auditing and automated drift remediation.',
    },
    {
      id: 'ag-3',
      name: 'threat-agent',
      type: 'Threat Detection',
      environment: 'Production',
      status: 'Running',
      lastActivity: 'Oct 03, 2026 09:45',
      mcpToolsCount: 6,
      tasksCompleted: 89,
      policiesEnforced: 9,
      description: 'Correlates eBPF runtime events, suspicious process executions, and external IP beaconing.',
    },
    {
      id: 'ag-4',
      name: 'compliance-agent',
      type: 'Compliance',
      environment: 'Production',
      status: 'Running',
      lastActivity: 'Oct 03, 2026 08:30',
      mcpToolsCount: 5,
      tasksCompleted: 215,
      policiesEnforced: 34,
      description: 'Cryptographic evidence generation for SOC 2 Type II, ISO 27001, and PCI-DSS compliance audits.',
    },
    {
      id: 'ag-5',
      name: 'response-agent',
      type: 'Incident Response',
      environment: 'Production',
      status: 'Idle',
      lastActivity: 'Oct 03, 2026 08:12',
      mcpToolsCount: 10,
      tasksCompleted: 45,
      policiesEnforced: 8,
      description: 'Executes pre-authorized containment playbooks, isolation of compromised containers, and credential rotation.',
    },
    {
      id: 'ag-6',
      name: 'infra-agent',
      type: 'Infrastructure',
      environment: 'Staging',
      status: 'Running',
      lastActivity: 'Oct 03, 2026 07:44',
      mcpToolsCount: 7,
      tasksCompleted: 118,
      policiesEnforced: 14,
      description: 'Terraform & Helm configuration guardrail validation before staging pull requests merge.',
    },
    {
      id: 'ag-7',
      name: 'data-agent',
      type: 'Data Security',
      environment: 'Production',
      status: 'Running',
      lastActivity: 'Oct 03, 2026 06:21',
      mcpToolsCount: 6,
      tasksCompleted: 94,
      policiesEnforced: 11,
      description: 'Discovers unencrypted PII across PostgreSQL databases, S3 buckets, and Kafka streams.',
    },
    {
      id: 'ag-8',
      name: 'identity-agent',
      type: 'Identity Security',
      environment: 'Production',
      status: 'Running',
      lastActivity: 'Oct 03, 2026 05:18',
      mcpToolsCount: 9,
      tasksCompleted: 176,
      policiesEnforced: 15,
      description: 'Detects IAM privilege escalations, dormant service accounts, and excessive token lifespan.',
    },
  ]);

  // Filtering
  const filteredAgents = useMemo(() => {
    return agentsList.filter((item) => {
      const matchSearch =
        searchQuery.trim() === '' ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.type.toLowerCase().includes(searchQuery.toLowerCase());

      const matchType =
        selectedAgentType === 'All Agent Types' || item.type === selectedAgentType;

      const matchEnv =
        selectedEnvironment === 'All Environments' || item.environment === selectedEnvironment;

      const matchStatus =
        selectedStatus === 'All Status' || item.status === selectedStatus;

      return matchSearch && matchType && matchEnv && matchStatus;
    });
  }, [agentsList, searchQuery, selectedAgentType, selectedEnvironment, selectedStatus]);

  // Add agent submit
  const handleDeployNewAgent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAgentName.trim()) return;

    const newAgent: AgentRecord = {
      id: `ag-${Date.now()}`,
      name: newAgentName.toLowerCase().replace(/\s+/g, '-'),
      type: newAgentType,
      environment: newAgentEnv,
      status: 'Running',
      lastActivity: 'Just now',
      mcpToolsCount: 6,
      tasksCompleted: 0,
      policiesEnforced: 5,
      description: `Newly deployed agent for ${newAgentType} operations with ${newAgentPermission} authority.`,
    };

    setAgentsList([newAgent, ...agentsList]);
    setNewAgentName('');
    setAddAgentModalOpen(false);
  };

  return (
    <ProductPageShell
      productKey="agent"
      productTitle="Agent"
      categoryBadge="AI-POWERED SECURITY AGENTS"
      heroTitle="Deploy AI agents for continuous security operations"
      heroDescription="Autonomous security agents that monitor, analyze and respond to threats across your infrastructure, codebase and runtime environments."
      primaryButtonLabel="Deploy Agent"
      onPrimaryAction={() => setAddAgentModalOpen(true)}
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
          {/* Left filters & search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '320px', flexWrap: 'wrap' }}>
            {/* Agent Type */}
            <div style={{ position: 'relative' }}>
              <select
                value={selectedAgentType}
                onChange={(e) => setSelectedAgentType(e.target.value)}
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
                <option value="All Agent Types">All Agent Types</option>
                <option value="Code Security">Code Security</option>
                <option value="Cloud Security">Cloud Security</option>
                <option value="Threat Detection">Threat Detection</option>
                <option value="Compliance">Compliance</option>
                <option value="Incident Response">Incident Response</option>
                <option value="Infrastructure">Infrastructure</option>
                <option value="Data Security">Data Security</option>
                <option value="Identity Security">Identity Security</option>
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

            {/* Environments */}
            <div style={{ position: 'relative' }}>
              <select
                value={selectedEnvironment}
                onChange={(e) => setSelectedEnvironment(e.target.value)}
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

            {/* Status */}
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
                <option value="All Status">Status</option>
                <option value="Running">Running</option>
                <option value="Idle">Idle</option>
                <option value="Stopped">Stopped</option>
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
                placeholder="Search agents..."
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

          {/* Right Action: + Add Agent */}
          <button
            type="button"
            onClick={() => setAddAgentModalOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#2563EB',
              border: 'none',
              borderRadius: '6px',
              padding: '7px 14px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#FFFFFF',
              cursor: 'pointer',
              transition: 'background-color 0.15s ease',
              boxShadow: '0 1px 2px rgba(37,99,235,0.2)',
            }}
            className="hover:bg-blue-700"
          >
            <Plus size={14} />
            <span>Add Agent</span>
          </button>
        </div>
      }
    >
      {/* Tab 1: Agents Table matching screenshot #8 */}
      {activeTabId === 'agents' && (
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
                  <th style={{ padding: '10px 16px', fontWeight: 600, color: '#475569' }}>Agent Name</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600, color: '#475569' }}>Type</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600, color: '#475569' }}>Environment</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600, color: '#475569' }}>Status</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600, color: '#475569' }}>Last Activity</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600, color: '#475569', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAgents.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: '#64748B' }}>
                      No AI agents matched your search query.
                    </td>
                  </tr>
                ) : (
                  filteredAgents.map((row) => {
                    const isRunning = row.status === 'Running';
                    const isIdle = row.status === 'Idle';

                    return (
                      <tr
                        key={row.id}
                        onClick={() => setSelectedAgent(row)}
                        style={{
                          borderBottom: '1px solid #F1F5F9',
                          cursor: 'pointer',
                          transition: 'background-color 0.15s',
                        }}
                        className="hover:bg-slate-50"
                      >
                        {/* Agent Name */}
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0F172A' }}>
                          <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '13px' }}>
                            {row.name}
                          </span>
                        </td>

                        {/* Type */}
                        <td style={{ padding: '12px 16px', color: '#475569' }}>
                          {row.type}
                        </td>

                        {/* Environment */}
                        <td style={{ padding: '12px 16px', color: '#475569' }}>
                          {row.environment}
                        </td>

                        {/* Status */}
                        <td style={{ padding: '12px 16px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '12px',
                              fontWeight: 600,
                              color: isRunning ? '#16A34A' : isIdle ? '#D97706' : '#64748B',
                            }}
                          >
                            <span
                              style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                backgroundColor: isRunning ? '#16A34A' : isIdle ? '#D97706' : '#64748B',
                              }}
                            />
                            {row.status}
                          </span>
                        </td>

                        {/* Last Activity */}
                        <td style={{ padding: '12px 16px', color: '#64748B', fontSize: '12px' }}>
                          {row.lastActivity}
                        </td>

                        {/* Actions ... */}
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedAgent(row);
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#94A3B8',
                              cursor: 'pointer',
                              padding: '4px',
                            }}
                            className="hover:text-slate-700"
                          >
                            <MoreHorizontal size={16} />
                          </button>
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

      {/* Tab 2: Events */}
      {activeTabId === 'events' && (
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 14px 0', color: '#0F172A' }}>
            Agent Audit Events & Decision Log
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { time: '10:12:00', agent: 'code-agent', event: 'Created pull request #142 to fix SQL injection in src/api/user.js', decision: 'Auto-approved by Policy' },
              { time: '09:58:30', agent: 'cloud-agent', event: 'Applied S3 PublicAccessBlock to s3://prod-data bucket', decision: 'Executed with Approval' },
              { time: '09:45:12', agent: 'threat-agent', event: 'Quarantined container web-app-798dfb following reverse shell attempt', decision: 'Deterministic Rule Match' },
              { time: '08:30:00', agent: 'compliance-agent', event: 'Generated cryptographic evidence bundle for SOC 2 Trust Principle #3', decision: 'Completed' },
            ].map((ev, i) => (
              <div key={i} style={{ padding: '12px', border: '1px solid #E2E8F0', borderRadius: '6px', backgroundColor: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#64748B' }}>{ev.time}</span>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                      <span style={{ color: '#2563EB', fontFamily: 'monospace', marginRight: '6px' }}>{ev.agent}:</span>
                      {ev.event}
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', backgroundColor: '#ECFDF5', color: '#059669' }}>
                  {ev.decision}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Actions */}
      {activeTabId === 'actions' && (
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 14px 0', color: '#0F172A' }}>
            MCP Tool Invocations & Action Gateways
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
            {[
              { tool: 'github_create_pull_request', mcp: 'GitHub MCP Server', calls: 32, status: 'Active' },
              { tool: 'aws_s3_put_public_access_block', mcp: 'AWS IAM/S3 MCP Server', calls: 14, status: 'Active' },
              { tool: 'kubernetes_delete_pod', mcp: 'K8s Cluster MCP Server', calls: 8, status: 'Gated / Approval Required' },
              { tool: 'slack_post_incident_alert', mcp: 'Slack MCP Server', calls: 56, status: 'Active' },
            ].map((tool, i) => (
              <div key={i} style={{ padding: '14px', border: '1px solid #E2E8F0', borderRadius: '6px', backgroundColor: '#F8FAFC' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', fontFamily: 'monospace', marginBottom: '4px' }}>{tool.tool}</div>
                <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '6px' }}>{tool.mcp}</div>
                <div style={{ fontSize: '11px', color: '#2563EB', fontWeight: 600 }}>{tool.calls} total invocations &bull; {tool.status}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Policies */}
      {activeTabId === 'policies' && (
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 14px 0', color: '#0F172A' }}>
            Agent Execution & Tool Authority Guardrails (OPA)
          </h3>
          <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '16px' }}>
            Deterministic rule: &quot;LLM proposes. Deterministic policy engines decide.&quot;
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { id: 'AGT-POL-01', name: 'Zero-Unsupervised-Production-Write', desc: 'Destructive changes in production require dual cryptographic human approval.', enforcement: 'BLOCK' },
              { id: 'AGT-POL-02', name: 'Scoped-Branch-Patch-Only', desc: 'Code remediation agents may only push commits to prefixed security/ branches.', enforcement: 'ENFORCE' },
              { id: 'AGT-POL-03', name: 'Secret-Redaction-At-Boundary', desc: 'Strip any API keys or credentials before sending prompt context to LLM.', enforcement: 'ENFORCE' },
            ].map((p) => (
              <div key={p.id} style={{ padding: '12px 16px', border: '1px solid #E2E8F0', borderRadius: '6px', backgroundColor: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>{p.name}</div>
                  <div style={{ fontSize: '12px', color: '#64748B' }}>{p.desc}</div>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', backgroundColor: '#EFF6FF', color: '#2563EB' }}>
                  {p.enforcement}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 5: Deployments */}
      {activeTabId === 'deployments' && (
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 14px 0', color: '#0F172A' }}>
            Agent Fleet Deployments & Sidecar Pods
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { pod: 'seculayer-agent-daemonset-prod', version: 'v2.4.1', replicas: '14 / 14 Running', updated: 'Today' },
              { pod: 'seculayer-code-triage-worker', version: 'v2.4.1', replicas: '4 / 4 Running', updated: 'Oct 02, 2026' },
              { pod: 'seculayer-threat-sentinel-staging', version: 'v2.4.0', replicas: '2 / 2 Running', updated: 'Sep 29, 2026' },
            ].map((dep, i) => (
              <div key={i} style={{ padding: '12px 16px', border: '1px solid #E2E8F0', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', fontFamily: 'monospace' }}>{dep.pod}</div>
                  <div style={{ fontSize: '12px', color: '#64748B' }}>Version: {dep.version} &bull; Updated: {dep.updated}</div>
                </div>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#16A34A' }}>{dep.replicas}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Agent Detail Drawer */}
      {selectedAgent && (
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
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#2563EB', textTransform: 'uppercase' }}>Security Agent Detail</div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '2px 0 0 0', color: '#0F172A', fontFamily: 'monospace' }}>
                {selectedAgent.name}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setSelectedAgent(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Mission & Description</label>
              <div style={{ fontSize: '13px', color: '#0F172A', marginTop: '2px', lineHeight: 1.5 }}>
                {selectedAgent.description}
              </div>
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Role & Environment</label>
              <div style={{ fontSize: '13px', color: '#0F172A', marginTop: '2px', fontWeight: 500 }}>
                {selectedAgent.type} &bull; {selectedAgent.environment}
              </div>
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Operational Metrics</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '6px' }}>
                <div style={{ padding: '10px', backgroundColor: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>Tasks Finished</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A' }}>{selectedAgent.tasksCompleted}</div>
                </div>
                <div style={{ padding: '10px', backgroundColor: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>Active MCP Tools</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#2563EB' }}>{selectedAgent.mcpToolsCount}</div>
                </div>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Status & Heartbeat</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', backgroundColor: selectedAgent.status === 'Running' ? '#ECFDF5' : '#FFFBEB', color: selectedAgent.status === 'Running' ? '#059669' : '#D97706' }}>
                  {selectedAgent.status}
                </span>
                <span style={{ fontSize: '12px', color: '#64748B' }}>Last heartbeat: {selectedAgent.lastActivity}</span>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div style={{ padding: '14px 20px', borderTop: '1px solid #E2E8F0', display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={() => {
                setSelectedAgent(null);
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
              Trigger Full Scan Task
            </button>
            <button
              type="button"
              onClick={() => setSelectedAgent(null)}
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

      {/* Add Agent Modal */}
      {addAgentModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(4px)',
            zIndex: 110,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '10px',
              maxWidth: '480px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '18px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Bot size={18} style={{ color: '#2563EB' }} />
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#0F172A' }}>Deploy New Security Agent</h3>
              </div>
              <button
                type="button"
                onClick={() => setAddAgentModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleDeployNewAgent} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Agent Identifier Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. sast-remediation-agent"
                  value={newAgentName}
                  onChange={(e) => setNewAgentName(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Specialization Domain
                </label>
                <select
                  value={newAgentType}
                  onChange={(e) => setNewAgentType(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    backgroundColor: '#FFFFFF',
                  }}
                >
                  <option value="Code Security">Code Security (SAST/SCA)</option>
                  <option value="Cloud Security">Cloud Security (CSPM)</option>
                  <option value="Threat Detection">Threat Detection & eBPF</option>
                  <option value="Compliance">Compliance & Evidence</option>
                  <option value="Incident Response">Incident Response</option>
                  <option value="Infrastructure">Infrastructure as Code</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Execution Environment
                </label>
                <select
                  value={newAgentEnv}
                  onChange={(e) => setNewAgentEnv(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    backgroundColor: '#FFFFFF',
                  }}
                >
                  <option value="Production">Production</option>
                  <option value="Staging">Staging</option>
                  <option value="Development">Development</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Tool Authority Level
                </label>
                <select
                  value={newAgentPermission}
                  onChange={(e) => setNewAgentPermission(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    backgroundColor: '#FFFFFF',
                  }}
                >
                  <option value="Read-Only">Read-Only (Analysis Only)</option>
                  <option value="Suggestion & PR Only">Suggestion & PR Only (Safe Default)</option>
                  <option value="Autonomous Remediate">Autonomous Remediate with OPA Policy</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setAddAgentModalOpen(false)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    color: '#475569',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#2563EB',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Deploy Agent
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <TalkToExpertModal isOpen={expertModalOpen} onClose={() => setExpertModalOpen(false)} />
    </ProductPageShell>
  );
}
