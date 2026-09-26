import React from 'react';
import {
  ShieldIcon,
  LayersIcon,
  TerminalIcon,
  DatabaseIcon,
  ActivityIcon,
  CpuIcon,
} from './Icons';

export type NavTab = 'overview' | 'projects' | 'blueprints' | 'scanners' | 'policies' | 'diagnostics';

interface NavigationProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  systemOperational: boolean;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onSelectTab,
  systemOperational,
}) => {
  const navItems: { id: NavTab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Platform Overview', icon: <ShieldIcon size={16} /> },
    { id: 'projects', label: 'Projects & Repositories', icon: <LayersIcon size={16} /> },
    { id: 'blueprints', label: 'Security Blueprints', icon: <CpuIcon size={16} /> },
    { id: 'scanners', label: 'Security Scanners', icon: <TerminalIcon size={16} /> },
    { id: 'policies', label: 'Policy Engine (OPA)', icon: <DatabaseIcon size={16} /> },
    { id: 'diagnostics', label: 'Infrastructure Diagnostics', icon: <ActivityIcon size={16} /> },
  ];

  return (
    <aside
      style={{
        width: '260px',
        backgroundColor: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 16px',
        flexShrink: 0,
      }}
    >
      {/* Brand Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0 8px 24px 8px', borderBottom: '1px solid var(--border-subtle)' }}>
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--accent-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: 'var(--shadow-glow)',
          }}
        >
          <ShieldIcon size={20} />
        </div>
        <div>
          <h1 style={{ fontSize: '15px', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            SecureAI
          </h1>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: systemOperational ? 'var(--status-success)' : 'var(--status-warning)',
              }}
            />
            <span>Control Plane</span>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '20px', flex: 1 }}>
        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: isActive ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                border: isActive ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid transparent',
                fontSize: '13px',
                fontWeight: isActive ? 600 : 500,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease',
              }}
              onMouseOver={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }
              }}
              onMouseOut={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }
              }}
            >
              <span style={{ color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div style={{ paddingTop: '16px', borderTop: '1px solid var(--border-subtle)', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>
        <div>v1.0.0 &bull; Step 2 Foundation</div>
        <div style={{ marginTop: '4px', opacity: 0.7 }}>Production Rule Enforced</div>
      </div>
    </aside>
  );
};
