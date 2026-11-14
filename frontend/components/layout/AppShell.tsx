'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from '../navigation/Sidebar';
import { Topbar } from '../navigation/Topbar';
import { useScope } from '@/context/ScopeContext';

import { RouteGuard } from '../auth/RouteGuard';
import { AssistantDrawer } from '../assistant/AssistantDrawer';

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

  // Prevent background scrolling while mobile navigation drawer is open (Phase 3)
  React.useEffect(() => {
    if (typeof document !== 'undefined') {
      if (isMobileOpen) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    }
    return () => {
      if (typeof document !== 'undefined') {
        document.body.style.overflow = '';
      }
    };
  }, [isMobileOpen]);

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

  const isApiSecurityRoute = pathname?.startsWith('/api-security');
  const sidebarWidth = isApiSecurityRoute ? '0px' : (isCollapsed ? '64px' : '240px');

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        minHeight: '100vh',
        width: '100%',
        backgroundColor: '#F8FAFC',
        '--sidebar-width': sidebarWidth,
        '--topbar-height': '56px',
      } as React.CSSProperties}
    >
      {/* 1. Global SecuLayer Sidebar — hidden on API Security routes */}
      {!isApiSecurityRoute && (
        <Sidebar
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
          isMobileOpen={isMobileOpen}
          onCloseMobile={() => setIsMobileOpen(false)}
        />
      )}

      {/* Main Column */}
      <div
        className="kavach-main-column"
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minWidth: 0,
          width: isApiSecurityRoute ? '100%' : `calc(100% - var(--sidebar-width, ${sidebarWidth}))`,
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
          showBrandLogo={isApiSecurityRoute}
        />

        {/* 3. Page Container with Dual-Layer RouteGuard */}
        <main
          id="main-content"
          tabIndex={-1}
          style={{
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            backgroundColor: isApiSecurityRoute ? '#F8FAFC' : '#F8FAFC',
            minHeight: 0,
            width: '100%',
          }}
        >
          <RouteGuard>{children}</RouteGuard>
        </main>
      </div>

      {/* 4. Global Contextual AI Copilot Drawer (⌘K) */}
      <AssistantDrawer />
    </div>
  );
};
