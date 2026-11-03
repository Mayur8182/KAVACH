import React, { useState } from 'react';
import type { AppRoute } from '../../types/navigation';

// ================================================================
// Minimal inline icon set — 14px stroke icons, one family
// ================================================================

const I: React.FC<{ d: string | string[]; size?: number }> = ({ d, size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    {Array.isArray(d) ? d.map((path, i) => <path key={i} d={path} />) : <path d={d} />}
  </svg>
);

const HomeIcon = () => <I d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />;
const CodeIcon = () => <I d={['M16 18l6-6-6-6', 'M8 6l-6 6 6 6']} />;
const RepoIcon = () => <I d={['M3 3h18v18H3z', 'M3 9h18', 'M9 21V9']} />;
const FindingIcon = () => <I d={['M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z', 'M12 9v4', 'M12 17h.01']} />;
const PRIcon = () => <I d={['M6 3v12', 'M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M18 9a9 9 0 0 1-9 9']} />;
const DepIcon = () => <I d={['M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z']} />;
const SecretIcon = () => <I d={['M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4']} />;
const FixIcon = () => <I d={['M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z']} />;
const CloudIcon = () => <I d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />;
const CloudProviderIcon = () => <I d={['M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9z']} />;
const K8sIcon = () => <I d={['M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z']} />;
const DockerIcon = () => <I d={['M2 17l10 5 10-5', 'M2 12l10 5 10-5', 'M12 2L2 7l10 5 10-5-10-5z']} />;
const CSPMIcon = () => <I d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />;
const AttackIcon = () => <I d={['M13 2L3 14h9l-1 8 10-12h-9l1-8z']} />;
const SurfaceIcon = () => <I d={['M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z', 'M8 2v16', 'M16 6v16']} />;
const PathIcon = () => <I d={['M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z']} />;
const ShieldIcon = () => <I d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />;
const RuntimeIcon = () => <I d={['M22 12h-4l-3 9L9 3l-3 9H2']} />;
const MCPIcon = () => <I d={['M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18']} />;
const PolicyIcon = () => <I d={['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6', 'M16 13H8', 'M16 17H8', 'M10 9H8']} />;
const AgentIcon = () => <I d={['M12 8V4H8', 'M12 8h4', 'M4 14H2a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h20a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2h-2', 'M12 8v6']} />;
const IdentityIcon = () => <I d={['M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2', 'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z']} />;
const DelegateIcon = () => <I d={['M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2', 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M23 21v-2a4 4 0 0 0-3-3.87', 'M16 3.13a4 4 0 0 1 0 7.75']} />;
const ActivityIcon = () => <I d="M22 12h-4l-3 9L9 3l-3 9H2" />;
const GraphIcon = () => <I d={['M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z', 'M3.27 6.96L12 12.01l8.73-5.05', 'M12 22.08V12']} />;
const IntelIcon = () => <I d={['M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z', 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z']} />;
const DriftIcon = () => <I d={['M18 20V10', 'M12 20V4', 'M6 20v-6']} />;
const IncidentIcon = () => <I d={['M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z', 'M12 9v4', 'M12 17h.01']} />;
const InvestIcon = () => <I d={['M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z', 'M21 21l-4.35-4.35']} />;
const ForensicsIcon = () => <I d={['M9 11l3 3L22 4', 'M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11']} />;
const ProjectIcon = () => <I d={['M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z']} />;
const IntentIcon = () => <I d={['M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z']} />;
const BlueprintIcon = () => <I d={['M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z', 'M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z']} />;
const ContractIcon = () => <I d={['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6', 'M12 18v-6', 'M9 15l3 3 3-3']} />;
const DecisionIcon = () => <I d={['M22 11.08V12a10 10 0 1 1-5.93-9.14', 'M22 4L12 14.01l-3-3']} />;
const ApprovalIcon = () => <I d={['M22 11.08V12a10 10 0 1 1-5.93-9.14', 'M22 4L12 14.01l-3-3']} />;
const AuditIcon = () => <I d={['M12 20h9', 'M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z']} />;
const IntegrationIcon = () => <I d={['M18 20V10', 'M12 20V4', 'M6 20v-6']} />;
const SettingsIcon = () => <I d={['M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z']} />;
const ChevronIcon: React.FC<{ size?: number }> = ({ size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

// ================================================================
// Sidebar — grouped semantic navigation per DESIGN.md
// Groups: WORKSPACE, CODE, CLOUD, ATTACK, PROTECT, AGENTS,
//         GRAPH, INTELLIGENCE, INCIDENT, CONTROL PLANE, SYSTEM
// ================================================================

interface NavItemDef {
  id: AppRoute;
  label: string;
  icon: React.ReactNode;
}

interface NavGroupDef {
  label: string;
  items: NavItemDef[];
}

const NAV_GROUPS: NavGroupDef[] = [
  {
    label: '',
    items: [
      { id: 'dashboard', label: 'Home', icon: <HomeIcon /> },
    ],
  },
  {
    label: 'PRODUCTS',
    items: [
      { id: 'code/overview', label: 'Code', icon: <CodeIcon /> },
      { id: 'cloud/overview', label: 'Cloud', icon: <CloudIcon /> },
      { id: 'attack/overview', label: 'Attack', icon: <AttackIcon /> },
      { id: 'protect/overview', label: 'Protect', icon: <ShieldIcon /> },
      { id: 'agent/overview', label: 'Agent', icon: <AgentIcon /> },
      { id: 'graph/security', label: 'Graph', icon: <GraphIcon /> },
      { id: 'intelligence/overview', label: 'Intelligence', icon: <IntelIcon /> },
      { id: 'incident/center', label: 'Incident', icon: <IncidentIcon /> },
    ],
  },
  {
    label: 'ORGANIZATION',
    items: [
      { id: 'control/projects', label: 'Projects', icon: <ProjectIcon /> },
      { id: 'integrations', label: 'Integrations', icon: <IntegrationIcon /> },
      { id: 'settings', label: 'Settings', icon: <SettingsIcon /> },
    ],
  },
];

interface SidebarProps {
  currentRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentRoute, onNavigate }) => {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggleGroup = (label: string) => {
    setCollapsed((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <aside
      style={{
        width: 'var(--sidebar-width)',
        backgroundColor: 'var(--color-surface)',
        borderRight: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        overflowY: 'auto',
        overflowX: 'hidden',
      }}
    >
      <nav
        style={{
          padding: 'var(--space-3) var(--space-2)',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
        }}
        aria-label="Main navigation"
      >
        {NAV_GROUPS.map((group) => {
          const isGroupCollapsed = collapsed[group.label] ?? false;
          return (
            <div key={group.label} style={{ marginBottom: 'var(--space-1)' }}>
              {/* Group label */}
              <button
                onClick={() => toggleGroup(group.label)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: 'var(--space-1) var(--space-3)',
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: 'var(--color-text-disabled)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 'var(--weight-semibold)',
                  letterSpacing: '0.08em',
                  cursor: 'pointer',
                  textAlign: 'left',
                  marginBottom: '2px',
                }}
              >
                {group.label}
                <span style={{ opacity: 0.5, transition: 'transform var(--motion-fast)', transform: isGroupCollapsed ? 'rotate(-90deg)' : 'rotate(0)' }}>
                  <ChevronIcon size={10} />
                </span>
              </button>

              {/* Group items */}
              {!isGroupCollapsed && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                  {group.items.map((item) => {
                    const isActive = currentRoute === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => onNavigate(item.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 'var(--space-3)',
                          padding: '7px var(--space-3)',
                          borderRadius: 'var(--radius-md)',
                          backgroundColor: isActive ? 'var(--color-primary-subtle)' : 'transparent',
                          color: isActive ? 'var(--color-text)' : 'var(--color-text-secondary)',
                          border: isActive ? '1px solid var(--color-primary-border)' : '1px solid transparent',
                          fontSize: 'var(--text-sm)',
                          fontWeight: isActive ? 'var(--weight-medium)' : 'var(--weight-normal)',
                          cursor: 'pointer',
                          textAlign: 'left',
                          width: '100%',
                          transition: 'background-color var(--motion-fast), color var(--motion-fast)',
                        }}
                        onMouseOver={(e) => {
                          if (!isActive) {
                            e.currentTarget.style.backgroundColor = 'var(--color-surface-elevated)';
                            e.currentTarget.style.color = 'var(--color-text)';
                          }
                        }}
                        onMouseOut={(e) => {
                          if (!isActive) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.color = 'var(--color-text-secondary)';
                          }
                        }}
                        aria-current={isActive ? 'page' : undefined}
                      >
                        <span
                          style={{
                            color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {item.icon}
                        </span>
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
};
