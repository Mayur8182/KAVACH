import React, { useState } from 'react';
import type { AppRoute } from '../../types/navigation';
import { AttackIcon, ActivityIcon, PlusIcon, ChevronIcon, FindingIcon, SurfaceIcon, PathIcon } from '../Icons';

interface AttackViewProps {
  currentRoute?: AppRoute;
  subview?: string;
  projectId?: string | null;
  onNavigate?: (route: AppRoute) => void;
}

export const AttackView: React.FC<AttackViewProps> = ({ currentRoute, subview = 'overview', projectId, onNavigate }) => {
  const activeTab = subview;

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'surface', label: 'Attack Surface' },
    { id: 'paths', label: 'Attack Paths' },
    { id: 'dast', label: 'DAST' },
    { id: 'api', label: 'API Testing' },
    { id: 'testing', label: 'Pen Testing' },
    { id: 'settings', label: 'Settings' },
  ];

  const handleTabClick = (tabId: string) => {
    if (onNavigate) {
      onNavigate(`attack/${tabId}` as AppRoute);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--color-bg)' }}>
      {/* HEADER */}
      <div style={{ padding: '32px 32px 0 32px', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
              <AttackIcon size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>Thing Attack</h1>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '4px 0 0 0' }}>
                Deterministic attack surface analysis, dynamic verification, and exploit path validation.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '13px', cursor: 'pointer' }}>
              <ActivityIcon size={14} /> Last 7 days <ChevronIcon />
            </button>
            <button style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', border: 'none', borderRadius: 'var(--radius-md)', background: 'var(--color-primary)', color: '#fff', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
              <PlusIcon size={14} /> Run Attack Test
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
                textTransform: ['dast', 'api'].includes(tab.id) ? 'uppercase' : 'none'
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
          <AttackOverviewDashboard projectId={projectId} />
        )}
        
        {activeTab !== 'overview' && (
          <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
            <div style={{ color: 'var(--color-text-secondary)' }}>
              <h3>{tabs.find(t => t.id === activeTab)?.label} Module</h3>
              <p style={{ marginTop: '8px' }}>This specific attack module view is currently being integrated with the real backend. (Akidio Strategy)</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── OVERVIEW DASHBOARD COMPONENT ──────────────────────────────────────

const AttackOverviewDashboard: React.FC<{ projectId: string | null | undefined }> = ({ projectId }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* TOP METRICS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        <MetricCard icon={<SurfaceIcon />} title="Exposed Endpoints" value="142" subtext="↑ 12 new" subtextColor="var(--color-warning)" isWarning />
        <MetricCard icon={<FindingIcon />} title="Exploitable Paths" value="3" subtext="↓ 2 resolved" subtextColor="var(--color-error)" isAlert />
        <MetricCard icon={<PathIcon />} title="Active Campaigns" value="1" subtext="DAST Scan Running" subtextColor="var(--color-primary)" />
        <MetricCard icon={<ActivityIcon />} title="Resilience Score" value="71%" subtext="↑ 5%" subtextColor="var(--color-success)" isSuccess />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px' }}>
        {/* LEFT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* SURFACE LIST (MOCK FOR NOW, needs API) */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Highest Risk Attack Surface</h3>
              <button
                onClick={() => onNavigate && onNavigate('attack/surface' as AppRoute)}
                style={{ fontSize: '12px', color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                View all &rarr;
              </button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ color: 'var(--color-text-secondary)', textAlign: 'left', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ paddingBottom: '12px' }}>Endpoint / Asset</th>
                  <th style={{ paddingBottom: '12px' }}>Type</th>
                  <th style={{ paddingBottom: '12px' }}>Last Tested</th>
                  <th style={{ paddingBottom: '12px' }}>Vulnerabilities</th>
                  <th style={{ paddingBottom: '12px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                <SurfaceRow name="api.acme.com/v1/auth" type="Public API" time="2h ago" findings={[2,1,0,0]} status="Vulnerable" />
                <SurfaceRow name="admin.acme.com" type="Web App" time="5h ago" findings={[0,3,1,0]} status="At Risk" />
                <SurfaceRow name="vpn.acme.com" type="Gateway" time="1d ago" findings={[0,0,0,0]} status="Secure" />
              </tbody>
            </table>
          </div>

          {/* EXPLOIT PATHS */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Validated Exploit Paths</h3>
              <button
                onClick={() => onNavigate && onNavigate('attack/paths' as AppRoute)}
                style={{ fontSize: '12px', color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                View graph &rarr;
              </button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ color: 'var(--color-text-secondary)', textAlign: 'left', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ paddingBottom: '12px' }}>Path Vector</th>
                  <th style={{ paddingBottom: '12px' }}>Target</th>
                  <th style={{ paddingBottom: '12px' }}>Complexity</th>
                  <th style={{ paddingBottom: '12px' }}>Impact</th>
                  <th style={{ paddingBottom: '12px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: '12px 0', color: 'var(--color-primary)' }}>SQLi → RCE (Auth Bypass)</td>
                  <td style={{ padding: '12px 0' }}>User DB</td>
                  <td style={{ padding: '12px 0' }}>Low</td>
                  <td style={{ padding: '12px 0' }}><span style={{ color: 'var(--color-error)', fontWeight: 600 }}>Critical</span></td>
                  <td style={{ padding: '12px 0' }}>Verified</td>
                </tr>
                <tr>
                  <td style={{ padding: '12px 0', color: 'var(--color-primary)' }}>Leaked Token → S3 Access</td>
                  <td style={{ padding: '12px 0' }}>prod-backups</td>
                  <td style={{ padding: '12px 0' }}>Low</td>
                  <td style={{ padding: '12px 0' }}><span style={{ color: 'var(--color-warning)', fontWeight: 600 }}>High</span></td>
                  <td style={{ padding: '12px 0' }}>Verified</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* RISK CHART */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px' }}>Surface Risk Profile</h3>
            <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
              <div style={{ width: '120px', height: '120px', borderRadius: '50%', border: '16px solid var(--color-surface-hover)', borderTopColor: 'var(--color-error)', borderRightColor: 'var(--color-warning)', borderBottomColor: 'var(--color-success)', position: 'relative' }}>
                 <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '24px', fontWeight: 700 }}>142</span>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Assets</span>
                 </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, fontSize: '13px' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between' }}><span><span style={{color: 'var(--color-error)'}}>●</span> Exploitable</span> <span>12 (8%)</span></div>
                 <div style={{ display: 'flex', justifyContent: 'space-between' }}><span><span style={{color: 'var(--color-warning)'}}>●</span> At Risk</span> <span>45 (31%)</span></div>
                 <div style={{ display: 'flex', justifyContent: 'space-between' }}><span><span style={{color: 'var(--color-success)'}}>●</span> Secure</span> <span>85 (61%)</span></div>
              </div>
            </div>
          </div>

          {/* RECENT ACTIVITY */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px' }}>Recent Attack Tests</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
               <ActivityItem icon={<PathIcon />} title="Exploit Path Validated" desc="SQLi found in api.acme.com" time="1h ago" type="error" />
               <ActivityItem icon={<ActivityIcon />} title="DAST Scan Completed" desc="Scheduled weekly scan" time="4h ago" type="success" />
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

const SurfaceRow = ({ name, type, time, findings, status }: any) => (
  <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
    <td style={{ padding: '16px 0' }}>
      <div style={{ fontWeight: 500 }}>{name}</div>
    </td>
    <td style={{ padding: '16px 0' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', background: 'var(--color-surface-hover)', borderRadius: '4px', fontSize: '11px' }}>
        {type}
      </span>
    </td>
    <td style={{ padding: '16px 0', color: 'var(--color-text-secondary)' }}>{time}</td>
    <td style={{ padding: '16px 0' }}>
      <div style={{ display: 'flex', gap: '8px', fontSize: '12px' }}>
        <span style={{ color: 'var(--color-error)' }}>{findings[0]}</span>
        <span style={{ color: 'var(--color-warning)' }}>{findings[1]}</span>
        <span style={{ color: 'var(--color-primary)' }}>{findings[2]}</span>
      </div>
    </td>
    <td style={{ padding: '16px 0' }}>
      <span style={{ padding: '4px 8px', borderRadius: '12px', background: status === 'Secure' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: status === 'Secure' ? 'var(--color-success)' : 'var(--color-error)', fontSize: '11px', fontWeight: 500 }}>
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
