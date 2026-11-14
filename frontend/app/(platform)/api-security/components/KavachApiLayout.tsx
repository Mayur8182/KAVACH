'use client';

import React, { useEffect } from 'react';
import { useApiSecurity } from '../context/ApiSecurityContext';

export interface KavachApiLayoutProps {
  children: React.ReactNode;
  activeApiId?: string;
  onSelectApiId?: (id: string) => void;
  /** @deprecated – kept for compatibility, no longer rendered */
  subnavTabs?: Array<{ id: string; label: string; href?: string; active?: boolean; onClick?: () => void }>;
  /** @deprecated – kept for compatibility, no longer rendered */
  headerAction?: React.ReactNode;
}

/**
 * KavachApiLayout — shell for every /api-security/* page.
 *
 * The horizontal 6-step subnav has been removed from the UI.
 * All six modules (Inventory · Analysis · Findings · Attack Paths ·
 * Remediation · Reports) remain fully accessible via:
 *   • the Command Palette (search bar → Ctrl K)
 *   • direct URL navigation
 *   • sidebar links in the global Sidebar
 *
 * No routes, components, or backend logic were removed.
 */
export function KavachApiLayout({ children, activeApiId, onSelectApiId }: KavachApiLayoutProps) {
  const { apis, selectedApi, setSelectedApi } = useApiSecurity();

  // Keep activeApiId → context sync for sub-pages that pass it
  useEffect(() => {
    if (!activeApiId || apis.length === 0) return;
    const match = apis.find((a: any) => a.id === activeApiId);
    if (match && selectedApi?.id !== match.id) {
      setSelectedApi(match);
      onSelectApiId?.(match.id);
    }
  }, [activeApiId, apis, selectedApi?.id, setSelectedApi, onSelectApiId]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        width: '100%',
        minHeight: 0,
        background: '#FAFAF8',
        colorScheme: 'light',
      }}
    >
      {/* Page content — full height, scrollable */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', width: '100%' }}>
        {children}
      </div>
    </div>
  );
}
