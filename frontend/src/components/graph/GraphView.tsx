import React, { useState } from 'react';
import type { AppRoute } from '../../types/navigation';
import { GraphIcon, ActivityIcon, PlusIcon, ChevronIcon } from '../Icons';

interface GraphViewProps {
  currentRoute?: AppRoute;
  subview?: string;
  projectId?: string | null;
  onNavigate?: (route: AppRoute) => void;
}

export const GraphView: React.FC<GraphViewProps> = ({ currentRoute, subview = 'overview', projectId, onNavigate }) => {
  const activeTab = subview;

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'explorer', label: 'Graph Explorer' },
    { id: 'assets', label: 'Asset Inventory' },
    { id: 'identities', label: 'Identities & IAM' },
    { id: 'queries', label: 'Saved Queries' },
    { id: 'settings', label: 'Settings' },
  ];

  const handleTabClick = (tabId: string) => {
    if (onNavigate) {
      onNavigate(`graph/${tabId}` as AppRoute);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--color-bg)' }}>
      {/* HEADER */}
      <div style={{ padding: '32px 32px 0 32px', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(236, 72, 153, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ec4899' }}>
              <GraphIcon size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>Thing Graph</h1>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '4px 0 0 0' }}>
                Unified security knowledge graph connecting code, cloud, and runtime assets.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', border: 'none', borderRadius: 'var(--radius-md)', background: 'var(--color-primary)', color: '#fff', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
              <PlusIcon size={14} /> Build Graph
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
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
          <div style={{ color: 'var(--color-text-secondary)' }}>
            <h3>{tabs.find(t => t.id === activeTab)?.label} View</h3>
            <p style={{ marginTop: '8px' }}>Security Knowledge Graph is being synchronized with the backend. (Akidio Strategy)</p>
          </div>
        </div>
      </div>
    </div>
  );
};
