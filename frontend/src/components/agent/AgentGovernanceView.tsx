import React, { useState } from 'react';
import type { AppRoute } from '../../types/navigation';
import { CpuIcon, ActivityIcon, PlusIcon, ChevronIcon, ShieldIcon, AgentIcon, PolicyIcon } from '../Icons';

interface AgentGovernanceViewProps {
  currentRoute?: AppRoute;
  subview?: string;
  projectId?: string | null;
  onNavigate?: (route: AppRoute) => void;
}

export const AgentGovernanceView: React.FC<AgentGovernanceViewProps> = ({ currentRoute, subview = 'overview', projectId, onNavigate }) => {
  const activeTab = subview;

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'registry', label: 'Agent Registry' },
    { id: 'permissions', label: 'Permissions & Scope' },
    { id: 'audit', label: 'Execution Audit' },
    { id: 'policies', label: 'Governance Policies' },
    { id: 'settings', label: 'Settings' },
  ];

  const handleTabClick = (tabId: string) => {
    if (onNavigate) {
      onNavigate(`agent/${tabId}` as AppRoute);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--color-bg)' }}>
      {/* HEADER */}
      <div style={{ padding: '32px 32px 0 32px', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b5cf6' }}>
              <CpuIcon size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>Thing Agent</h1>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '4px 0 0 0' }}>
                Governing autonomous AI agents, tool permissions, and execution boundaries.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '13px', cursor: 'pointer' }}>
              <ActivityIcon size={14} /> Active Agents <ChevronIcon />
            </button>
            <button style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', border: 'none', borderRadius: 'var(--radius-md)', background: 'var(--color-primary)', color: '#fff', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
              <PlusIcon size={14} /> Register Agent
            </button>
          </div>
        </div>

        {/* TABS */}
        <div style={{ display: 'flex', gap: '24px' }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              style={{
                padding: '0 0 12px 0',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid var(--color-primary)' : '2px solid transparent',
                color: activeTab === tab.id ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                fontSize: '13px',
                fontWeight: activeTab === tab.id ? 600 : 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* CONTENT AREA */}
      <div style={{ padding: '24px 32px', overflowY: 'auto', flex: 1 }}>
        {activeTab === 'overview' && (
          <AgentOverviewDashboard projectId={projectId} />
        )}
        
        {activeTab !== 'overview' && (
          <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
            <div style={{ color: 'var(--color-text-secondary)' }}>
              <h3>{tabs.find(t => t.id === activeTab)?.label} Settings</h3>
              <p style={{ marginTop: '8px' }}>This specific agent governance module view is currently being integrated with the real backend. (Akidio Strategy)</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── OVERVIEW DASHBOARD COMPONENT ──────────────────────────────────────

const AgentOverviewDashboard: React.FC<{ projectId: string | null | undefined }> = ({ projectId }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* TOP METRICS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        <MetricCard icon={<AgentIcon />} title="Active Agents" value="12" subtext="Deployed in production" subtextColor="var(--color-primary)" />
        <MetricCard icon={<ShieldIcon />} title="Blocked Tool Calls" value="142" subtext="Policy violations prevented" subtextColor="var(--color-success)" isSuccess />
        <MetricCard icon={<ActivityIcon />} title="Pending Approvals" value="3" subtext="Human-in-the-loop" subtextColor="var(--color-warning)" isWarning />
        <MetricCard icon={<PolicyIcon />} title="Total Executions" value="4.2k" subtext="Successfully executed" subtextColor="var(--color-text-secondary)" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px' }}>
        {/* LEFT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* AGENT REGISTRY */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Active Agents</h3>
              <button
                onClick={() => onNavigate && onNavigate('agent/registry' as AppRoute)}
                style={{ fontSize: '12px', color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                View all &rarr;
              </button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ color: 'var(--color-text-secondary)', textAlign: 'left', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ paddingBottom: '12px' }}>Agent Name</th>
                  <th style={{ paddingBottom: '12px' }}>Role / Model</th>
                  <th style={{ paddingBottom: '12px' }}>Permissions</th>
                  <th style={{ paddingBottom: '12px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                <AgentRow name="PR Code Reviewer" role="Code Analysis" model="claude-3.5-sonnet" perms={['read_repo', 'write_comments']} status="Active" />
                <AgentRow name="Auto-Remediator" role="Patch Dev" model="gpt-4o" perms={['read_repo', 'create_pr', 'write_code']} status="Pending Approval" />
                <AgentRow name="Cloud Security Auditor" role="CSPM Readonly" model="llama-3" perms={['read_aws_config']} status="Active" />
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* RECENT AUDIT ACTIVITY */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px' }}>Execution Audit Log</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
               <ActivityItem icon={<ShieldIcon />} title="Tool Call Blocked" desc="Auto-Remediator tried `delete_repo`" time="10m ago" type="error" />
               <ActivityItem icon={<ActivityIcon />} title="PR Comment Posted" desc="By PR Code Reviewer" time="1h ago" type="success" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Sub-components
const MetricCard = ({ icon, title, value, subtext, subtextColor, isAlert, isWarning, isSuccess }: any) => (
  <div className="glass-panel" style={{ padding: '20px' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: isAlert ? 'var(--color-error)' : isWarning ? 'var(--color-warning)' : isSuccess ? 'var(--color-success)' : 'var(--color-primary)' }}>
      {icon}
      <span style={{ color: 'var(--color-text-secondary)', fontSize: '13px' }}>{title}</span>
    </div>
    <div style={{ marginTop: '16px', fontSize: '28px', fontWeight: 700 }}>{value}</div>
    <div style={{ marginTop: '8px', fontSize: '12px', color: subtextColor }}>{subtext}</div>
  </div>
);

const AgentRow = ({ name, role, model, perms, status }: any) => (
  <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
    <td style={{ padding: '16px 0' }}>
      <div style={{ fontWeight: 500 }}>{name}</div>
    </td>
    <td style={{ padding: '16px 0' }}>
      <div style={{ fontSize: '12px', color: 'var(--color-text)' }}>{role}</div>
      <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>{model}</div>
    </td>
    <td style={{ padding: '16px 0' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
        {perms.map((p: string) => (
          <span key={p} style={{ padding: '2px 6px', background: 'var(--color-surface-hover)', borderRadius: '4px', fontSize: '10px' }}>
            {p}
          </span>
        ))}
      </div>
    </td>
    <td style={{ padding: '16px 0' }}>
      <span style={{ padding: '4px 8px', borderRadius: '12px', background: status === 'Active' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(245, 158, 11, 0.1)', color: status === 'Active' ? 'var(--color-success)' : 'var(--color-warning)', fontSize: '11px', fontWeight: 500 }}>
        ● {status}
      </span>
    </td>
  </tr>
);

const ActivityItem = ({ icon, title, desc, time, type }: any) => (
  <div style={{ display: 'flex', gap: '12px' }}>
    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)', color: type === 'error' ? 'var(--color-error)' : 'var(--color-success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {icon}
    </div>
    <div>
      <div style={{ fontSize: '13px', fontWeight: 500 }}>{title}</div>
      <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>{desc}</div>
    </div>
    <div style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--color-text-muted)' }}>{time}</div>
  </div>
);
