'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from '../navigation/Sidebar';
import { Topbar } from '../navigation/Topbar';
import { useScope } from '@/context/ScopeContext';

import { RouteGuard } from '../auth/RouteGuard';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Auto-close mobile drawer when navigating to a new route
  React.useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  const {
    currentProject,
    currentOrg,
    currentEnv,
    setCurrentProject,
    setCurrentOrg,
    setCurrentEnv,
  } = useScope();

  const handleSelectProject = React.useCallback((p: any) => {
    setCurrentProject(p || null);
  }, [setCurrentProject]);

  const handleSelectOrg = React.useCallback((o: any) => {
    setCurrentOrg(o || null);
  }, [setCurrentOrg]);

  const handleSelectEnv = React.useCallback((e: any) => {
    setCurrentEnv(e || null);
  }, [setCurrentEnv]);

  const sidebarWidth = isCollapsed ? '64px' : '240px';

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        width: '100%',
        backgroundColor: '#F8FAFC',
        '--sidebar-width': sidebarWidth,
        '--topbar-height': '56px',
      } as React.CSSProperties}
    >
      {/* 1. Global SecuLayer Sidebar */}
      <Sidebar
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      {/* Main Column */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minWidth: 0,
          width: `calc(100% - var(--sidebar-width, ${sidebarWidth}))`,
          transition: 'width 200ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* 2. Global Topbar */}
        <Topbar
          currentProject={currentProject || undefined}
          onSelectProject={handleSelectProject}
          currentOrg={currentOrg || undefined}
          onSelectOrg={handleSelectOrg}
          currentEnv={currentEnv || undefined}
          onSelectEnv={handleSelectEnv}
          onOpenMobile={() => setIsMobileOpen(true)}
        />

        {/* 3. Page Container with Dual-Layer RouteGuard */}
        <main
          style={{
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            backgroundColor: '#F8FAFC',
            minHeight: 0,
            width: '100%',
          }}
        >
          <RouteGuard>{children}</RouteGuard>
        </main>
      </div>

    </div>
  );
};
