import React, { useState } from 'react';
import type { AppRoute } from '../../types/navigation';
import { CloudIcon, ActivityIcon, PlusIcon, ChevronIcon, ShieldIcon, DatabaseIcon } from '../Icons';

interface CloudViewProps {
  currentRoute?: AppRoute;
  provider?: string;
  projectId?: string | null;
  onNavigate?: (route: AppRoute) => void;
}

export const CloudView: React.FC<CloudViewProps> = ({ currentRoute, provider = 'overview', projectId, onNavigate }) => {
  const activeTab = provider;

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'aws', label: 'AWS' },
    { id: 'azure', label: 'Azure' },
    { id: 'gcp', label: 'GCP' },
    { id: 'kubernetes', label: 'Kubernetes' },
    { id: 'docker', label: 'Docker' },
    { id: 'cspm', label: 'CSPM' },
    { id: 'settings', label: 'Settings' },
  ];

  const handleTabClick = (tabId: string) => {
    if (onNavigate) {
      onNavigate(`cloud/${tabId}` as AppRoute);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--color-bg)' }}>
      {/* HEADER */}
      <div style={{ padding: '32px 32px 0 32px', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(56, 189, 248, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8' }}>
              <CloudIcon size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>Thing Cloud</h1>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '4px 0 0 0' }}>
                Secure your multi-cloud infrastructure and CSPM across AWS, Azure, GCP, and Kubernetes.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '13px', cursor: 'pointer' }}>
              <ActivityIcon size={14} /> Last 7 days <ChevronIcon />
            </button>
            <button style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', border: 'none', borderRadius: 'var(--radius-md)', background: 'var(--color-primary)', color: '#fff', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
              <PlusIcon size={14} /> Run CSPM Scan
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
                textTransform: ['aws', 'gcp', 'cspm', 'sbom'].includes(tab.id) ? 'uppercase' : 'none'
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
          <CloudOverviewDashboard projectId={projectId} />
        )}
        
        {activeTab !== 'overview' && (
          <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
            <div style={{ color: 'var(--color-text-secondary)' }}>
              <h3>{tabs.find(t => t.id === activeTab)?.label} Environment</h3>
              <p style={{ marginTop: '8px' }}>This specific cloud provider view is currently being integrated with the real backend. (Akidio Strategy)</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── OVERVIEW DASHBOARD COMPONENT ──────────────────────────────────────

const CloudOverviewDashboard: React.FC<{ projectId: string | null | undefined }> = ({ projectId }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* TOP METRICS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        <MetricCard icon={<CloudIcon />} title="Active Environments" value="3" subtext="AWS, GCP, Kubernetes" subtextColor="var(--color-success)" />
        <MetricCard icon={<ShieldIcon />} title="CSPM Violations" value="12" subtext="↑ 4 new" subtextColor="var(--color-error)" isAlert />
        <MetricCard icon={<DatabaseIcon />} title="Exposed Assets" value="2" subtext="↓ 1 resolved" subtextColor="var(--color-warning)" isWarning />
        <MetricCard icon={<ActivityIcon />} title="Compliance Score" value="84%" subtext="↑ 2%" subtextColor="var(--color-success)" isSuccess />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px' }}>
        {/* LEFT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* ENVIRONMENTS LIST (MOCK FOR NOW, needs API) */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Connected Environments</h3>
              <button
                onClick={() => onNavigate && onNavigate('cloud/settings' as AppRoute)}
                style={{ fontSize: '12px', color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                Manage Integrations &rarr;
              </button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ color: 'var(--color-text-secondary)', textAlign: 'left', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ paddingBottom: '12px' }}>Provider</th>
                  <th style={{ paddingBottom: '12px' }}>Account / Cluster</th>
                  <th style={{ paddingBottom: '12px' }}>Last Scan</th>
                  <th style={{ paddingBottom: '12px' }}>Violations</th>
                  <th style={{ paddingBottom: '12px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                <EnvRow name="AWS Production" org="us-east-1" provider="AWS" time="1h ago" findings={[4,1,2,0]} status="Connected" />
                <EnvRow name="GCP Data Platform" org="us-central1" provider="GCP" time="3h ago" findings={[6,2,3,1]} status="Connected" />
                <EnvRow name="EKS Core Cluster" org="k8s-prod-1" provider="Kubernetes" time="5h ago" findings={[2,0,1,1]} status="Connected" />
              </tbody>
            </table>
          </div>

          {/* TOP VIOLATIONS */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Top Posture Violations</h3>
              <button
                onClick={() => onNavigate && onNavigate('cloud/cspm' as AppRoute)}
                style={{ fontSize: '12px', color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                View all &rarr;
              </button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ color: 'var(--color-text-secondary)', textAlign: 'left', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ paddingBottom: '12px' }}>Rule</th>
                  <th style={{ paddingBottom: '12px' }}>Resource</th>
                  <th style={{ paddingBottom: '12px' }}>Severity</th>
                  <th style={{ paddingBottom: '12px' }}>Environment</th>
                  <th style={{ paddingBottom: '12px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: '12px 0', color: 'var(--color-primary)' }}>S3 Bucket Public Access</td>
                  <td style={{ padding: '12px 0' }}>arn:aws:s3:::prod-data</td>
                  <td style={{ padding: '12px 0' }}><span style={{ color: 'var(--color-error)', fontWeight: 600 }}>Critical</span></td>
                  <td style={{ padding: '12px 0' }}>AWS Production</td>
                  <td style={{ padding: '12px 0' }}>Open</td>
                </tr>
                <tr>
                  <td style={{ padding: '12px 0', color: 'var(--color-primary)' }}>IAM User with Admin Access</td>
                  <td style={{ padding: '12px 0' }}>service-account-ci</td>
                  <td style={{ padding: '12px 0' }}><span style={{ color: 'var(--color-warning)', fontWeight: 600 }}>High</span></td>
                  <td style={{ padding: '12px 0' }}>AWS Production</td>
                  <td style={{ padding: '12px 0' }}>Open</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* COMPLIANCE CHART */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px' }}>Violations by Severity</h3>
            <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
              <div style={{ width: '120px', height: '120px', borderRadius: '50%', border: '16px solid var(--color-surface-hover)', borderTopColor: 'var(--color-error)', borderRightColor: 'var(--color-warning)', borderBottomColor: 'var(--color-success)', position: 'relative' }}>
                 <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '24px', fontWeight: 700 }}>12</span>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Total</span>
                 </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, fontSize: '13px' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between' }}><span><span style={{color: 'var(--color-error)'}}>●</span> Critical</span> <span>2 (16%)</span></div>
                 <div style={{ display: 'flex', justifyContent: 'space-between' }}><span><span style={{color: 'var(--color-warning)'}}>●</span> High</span> <span>5 (42%)</span></div>
                 <div style={{ display: 'flex', justifyContent: 'space-between' }}><span><span style={{color: 'var(--color-primary)'}}>●</span> Medium</span> <span>5 (42%)</span></div>
              </div>
            </div>
          </div>

          {/* RECENT ACTIVITY */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px' }}>Recent Posture Changes</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
               <ActivityItem icon={<ShieldIcon />} title="New critical violation" desc="Public S3 bucket detected" time="1h ago" type="error" />
               <ActivityItem icon={<ActivityIcon />} title="CSPM Scan Completed" desc="AWS Production environment" time="2h ago" type="success" />
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

const EnvRow = ({ name, org, provider, time, findings, status }: any) => (
  <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
    <td style={{ padding: '16px 0' }}>
      <div style={{ fontWeight: 500 }}>{name}</div>
      <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>{org}</div>
    </td>
    <td style={{ padding: '16px 0' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', background: 'var(--color-surface-hover)', borderRadius: '4px', fontSize: '11px', textTransform: 'uppercase' }}>
        {provider}
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
      <span style={{ padding: '4px 8px', borderRadius: '12px', background: status === 'Scanning' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(34, 197, 94, 0.1)', color: status === 'Scanning' ? 'var(--color-primary)' : 'var(--color-success)', fontSize: '11px', fontWeight: 500 }}>
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
