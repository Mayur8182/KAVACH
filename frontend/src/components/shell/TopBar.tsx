import React, { useState } from 'react';
import type { AppRoute } from '../../types/navigation';

// ================================================================
// TopBar — global header
// Project selector | Search | Notifications | User
// ================================================================

interface TopBarProps {
  systemOperational: boolean;
  lastChecked?: string;
  onRefresh?: () => void;
  projects?: Array<{ id: string; name: string }>;
  selectedProjectId?: string;
  onSelectProject?: (id: string) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  systemOperational,
  lastChecked,
  onRefresh,
  projects,
  selectedProjectId,
  onSelectProject,
}) => {
  const [searchValue, setSearchValue] = useState('');

  return (
    <header
      style={{
        height: 'var(--topbar-height)',
        backgroundColor: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 var(--space-5)',
        gap: 'var(--space-4)',
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        zIndex: 'var(--z-overlay)',
      }}
    >
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexShrink: 0 }}>
        <img
          src="/kavach-logo.png"
          alt="Kavach"
          style={{ height: '24px', width: 'auto', objectFit: 'contain', display: 'block' }}
        />
      </div>

      {/* Divider */}
      <div style={{ width: '1px', height: '20px', backgroundColor: 'var(--color-border)', flexShrink: 0 }} />

      {/* System status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexShrink: 0 }}>
        <div
          style={{
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            backgroundColor: systemOperational ? 'var(--color-success)' : 'var(--color-danger)',
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
          {systemOperational ? 'Operational' : 'Degraded'}
        </span>
      </div>

      {/* Project selector */}
      {projects && projects.length > 0 && (
        <>
          <div style={{ width: '1px', height: '20px', backgroundColor: 'var(--color-border)', flexShrink: 0 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexShrink: 0 }}>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Project</span>
            <select
              value={selectedProjectId || ''}
              onChange={(e) => onSelectProject?.(e.target.value)}
              style={{
                backgroundColor: 'var(--color-surface-elevated)',
                color: 'var(--color-text)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: '4px 8px',
                fontSize: 'var(--text-xs)',
                fontWeight: 'var(--weight-medium)',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </>
      )}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Search */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div
          style={{
            position: 'absolute',
            left: '10px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--color-text-muted)',
            pointerEvents: 'none',
          }}
        >
          <SearchIcon size={14} />
        </div>
        <input
          type="search"
          placeholder="Search findings, incidents, agents..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          style={{
            width: '280px',
            height: '32px',
            paddingLeft: '32px',
            paddingRight: 'var(--space-3)',
            backgroundColor: 'var(--color-surface-elevated)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-text)',
            fontSize: 'var(--text-sm)',
            outline: 'none',
            transition: 'border-color var(--motion-fast)',
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-border-focus)'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
          aria-label="Global search"
        />
      </div>

      {/* Divider */}
      <div style={{ width: '1px', height: '20px', backgroundColor: 'var(--color-border)', flexShrink: 0 }} />

      {/* Last checked + Refresh */}
      {lastChecked && (
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', flexShrink: 0 }}>
          {lastChecked}
        </span>
      )}
      {onRefresh && (
        <button
          onClick={onRefresh}
          title="Refresh system status"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '30px',
            height: '30px',
            backgroundColor: 'transparent',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-text-muted)',
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'border-color var(--motion-fast), color var(--motion-fast)',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-border-strong)';
            e.currentTarget.style.color = 'var(--color-text)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-border)';
            e.currentTarget.style.color = 'var(--color-text-muted)';
          }}
          aria-label="Refresh"
        >
          <RefreshIcon size={14} />
        </button>
      )}

      {/* User avatar placeholder */}
      <div
        title="User account"
        style={{
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          backgroundColor: 'var(--color-surface-overlay)',
          border: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-text-muted)',
          cursor: 'pointer',
          flexShrink: 0,
          fontSize: 'var(--text-sm)',
          fontWeight: 'var(--weight-semibold)',
        }}
        role="button"
        tabIndex={0}
        aria-label="User menu"
      >
        U
      </div>
    </header>
  );
};

// ================================================================
// Internal Icons
// ================================================================

const ShieldLogo: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const SearchIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const RefreshIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

// Export AppRoute type reference for use in TopBar if needed
export type { AppRoute };
