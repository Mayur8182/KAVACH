import React from 'react';
import { TopBar } from './TopBar';
import { Sidebar } from './Sidebar';
import type { AppRoute } from '../../types/navigation';

interface AppShellProps {
  currentRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
  systemOperational: boolean;
  lastChecked?: string;
  onRefresh?: () => void;
  projects?: Array<{ id: string; name: string }>;
  selectedProjectId?: string;
  onSelectProject?: (id: string) => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  currentRoute,
  onNavigate,
  systemOperational,
  lastChecked,
  onRefresh,
  projects,
  selectedProjectId,
  onSelectProject,
  children,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        backgroundColor: 'var(--color-bg)',
        color: 'var(--color-text)',
      }}
    >
      <TopBar
        systemOperational={systemOperational}
        lastChecked={lastChecked}
        onRefresh={onRefresh}
        projects={projects}
        selectedProjectId={selectedProjectId}
        onSelectProject={onSelectProject}
      />
      <div
        style={{
          display: 'flex',
          flex: 1,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <Sidebar currentRoute={currentRoute} onNavigate={onNavigate} />
        <main
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            backgroundColor: 'var(--color-bg)',
            position: 'relative',
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
};
