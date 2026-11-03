import React, { useState } from 'react';
import type { AppRoute } from '../../types/navigation';
import { ShieldIcon, ActivityIcon, PlusIcon, ChevronIcon, RuntimeIcon, MCPIcon, PolicyIcon } from '../Icons';

interface ProtectViewProps {
  currentRoute?: AppRoute;
  subview?: string;
  projectId?: string | null;
  onNavigate?: (route: AppRoute) => void;
}

export const ProtectView: React.FC<ProtectViewProps> = ({ currentRoute, subview = 'overview', projectId, onNavigate }) => {
  const activeTab = subview;

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'runtime', label: 'Runtime Protection' },
    { id: 'mcp', label: 'MCP Protection' },
    { id: 'dns', label: 'DNS Security' },
    { id: 'dns-signals', label: 'Threat Signals' },
    { id: 'abuse', label: 'Rate Limiting' },
    { id: 'policies', label: 'Policies' },
    { id: 'settings', label: 'Settings' },
  ];

  const handleTabClick = (tabId: string) => {
    if (onNavigate) {
      onNavigate(`protect/${tabId}` as AppRoute);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--color-bg)' }}>
      {/* HEADER */}
      <div style={{ padding: '32px 32px 0 32px', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
              <ShieldIcon size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>Thing Protect</h1>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '4px 0 0 0' }}>
                Real-time runtime security, MCP execution limits, DNS firewall, and zero-trust policies.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '13px', cursor: 'pointer' }}>
              <ActivityIcon size={14} /> Real-time <ChevronIcon />
            </button>
            <button style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', border: 'none', borderRadius: 'var(--radius-md)', background: 'var(--color-primary)', color: '#fff', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
              <PlusIcon size={14} /> New Policy
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
                textTransform: ['mcp', 'dns'].includes(tab.id) ? 'uppercase' : 'none'
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
          <ProtectOverviewDashboard projectId={projectId} />
        )}
        
        {activeTab !== 'overview' && (
          <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
            <div style={{ color: 'var(--color-text-secondary)' }}>
              <h3>{tabs.find(t => t.id === activeTab)?.label} Settings</h3>
              <p style={{ marginTop: '8px' }}>This specific protection module view is currently being integrated with the real backend. (Akidio Strategy)</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── OVERVIEW DASHBOARD COMPONENT ──────────────────────────────────────

const ProtectOverviewDashboard: React.FC<{ projectId: string | null | undefined }> = ({ projectId }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* TOP METRICS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        <MetricCard icon={<RuntimeIcon />} title="Events Blocked" value="4,210" subtext="↑ 12% vs yesterday" subtextColor="var(--color-success)" isSuccess />
        <MetricCard icon={<MCPIcon />} title="MCP Tool Violations" value="23" subtext="In last 24 hours" subtextColor="var(--color-warning)" isWarning />
        <MetricCard icon={<ActivityIcon />} title="DNS Drops" value="842" subtext="Malicious domains" subtextColor="var(--color-primary)" />
        <MetricCard icon={<PolicyIcon />} title="Active Policies" value="45" subtext="Enforcing Zero Trust" subtextColor="var(--color-success)" isSuccess />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px' }}>
        {/* LEFT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* RUNTIME ALERTS */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Recent Runtime Anomalies</h3>
              <button
                onClick={() => onNavigate && onNavigate('protect/runtime' as AppRoute)}
                style={{ fontSize: '12px', color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                View stream &rarr;
              </button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ color: 'var(--color-text-secondary)', textAlign: 'left', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ paddingBottom: '12px' }}>Event Target</th>
                  <th style={{ paddingBottom: '12px' }}>Violation Type</th>
                  <th style={{ paddingBottom: '12px' }}>Time</th>
                  <th style={{ paddingBottom: '12px' }}>Action Taken</th>
                </tr>
              </thead>
              <tbody>
                <AlertRow name="k8s-pod-auth-service" type="Unauthorized Shell Access" time="2m ago" status="Blocked" />
                <AlertRow name="agent-code-reviewer" type="MCP Token Exhaustion" time="15m ago" status="Rate Limited" />
                <AlertRow name="ubuntu-node-04" type="DNS Exfiltration Attempt" time="1h ago" status="Dropped" />
              </tbody>
            </table>
          </div>

          {/* ACTIVE POLICIES */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Enforced Security Policies</h3>
              <button
                onClick={() => onNavigate && onNavigate('protect/policies' as AppRoute)}
                style={{ fontSize: '12px', color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                Manage policies &rarr;
              </button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ color: 'var(--color-text-secondary)', textAlign: 'left', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ paddingBottom: '12px' }}>Policy Name</th>
                  <th style={{ paddingBottom: '12px' }}>Enforcement Level</th>
                  <th style={{ paddingBottom: '12px' }}>Hits (24h)</th>
                  <th style={{ paddingBottom: '12px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: '12px 0', color: 'var(--color-text)' }}>Deny Root Shell Execution</td>
                  <td style={{ padding: '12px 0' }}><span style={{ color: 'var(--color-error)', fontWeight: 600 }}>BLOCK</span></td>
                  <td style={{ padding: '12px 0' }}>42</td>
                  <td style={{ padding: '12px 0' }}>Active</td>
                </tr>
                <tr>
                  <td style={{ padding: '12px 0', color: 'var(--color-text)' }}>Restrict MCP FS Access</td>
                  <td style={{ padding: '12px 0' }}><span style={{ color: 'var(--color-warning)', fontWeight: 600 }}>ALERT</span></td>
                  <td style={{ padding: '12px 0' }}>128</td>
                  <td style={{ padding: '12px 0' }}>Active</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* TRAFFIC CHART */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px' }}>Traffic Handling</h3>
            <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
              <div style={{ width: '120px', height: '120px', borderRadius: '50%', border: '16px solid var(--color-surface-hover)', borderTopColor: 'var(--color-success)', borderRightColor: 'var(--color-primary)', borderBottomColor: 'var(--color-error)', position: 'relative' }}>
                 <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '24px', fontWeight: 700 }}>1.2M</span>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Reqs</span>
                 </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, fontSize: '13px' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between' }}><span><span style={{color: 'var(--color-success)'}}>●</span> Allowed</span> <span>98%</span></div>
                 <div style={{ display: 'flex', justifyContent: 'space-between' }}><span><span style={{color: 'var(--color-primary)'}}>●</span> Monitored</span> <span>1.5%</span></div>
                 <div style={{ display: 'flex', justifyContent: 'space-between' }}><span><span style={{color: 'var(--color-error)'}}>●</span> Blocked</span> <span>0.5%</span></div>
              </div>
            </div>
          </div>

          {/* RECENT ACTIVITY */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px' }}>Enforcement Logs</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
               <ActivityItem icon={<ShieldIcon />} title="Agent Blocked" desc="Attempted access to /etc/shadow" time="2m ago" type="error" />
               <ActivityItem icon={<ActivityIcon />} title="Policy Updated" desc="'Deny Root Shell' pushed" time="2h ago" type="success" />
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

const AlertRow = ({ name, type, time, status }: any) => (
  <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
    <td style={{ padding: '16px 0' }}>
      <div style={{ fontWeight: 500 }}>{name}</div>
    </td>
    <td style={{ padding: '16px 0' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', background: 'var(--color-surface-hover)', borderRadius: '4px', fontSize: '11px', color: 'var(--color-text)' }}>
        {type}
      </span>
    </td>
    <td style={{ padding: '16px 0', color: 'var(--color-text-secondary)' }}>{time}</td>
    <td style={{ padding: '16px 0' }}>
      <span style={{ padding: '4px 8px', borderRadius: '12px', background: status === 'Blocked' || status === 'Dropped' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)', color: status === 'Blocked' || status === 'Dropped' ? 'var(--color-error)' : 'var(--color-warning)', fontSize: '11px', fontWeight: 500 }}>
        ● {status}
      </span>
    </td>
  </tr>
);

const ActivityItem = ({ icon, title, desc, time, type }: any) => (
  <div style={{ display: 'flex', gap: '12px' }}>
    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: type === 'error' ? 'var(--color-error)' : '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {icon}
    </div>
    <div>
      <div style={{ fontSize: '13px', fontWeight: 500 }}>{title}</div>
      <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>{desc}</div>
    </div>
    <div style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--color-text-muted)' }}>{time}</div>
  </div>
);
