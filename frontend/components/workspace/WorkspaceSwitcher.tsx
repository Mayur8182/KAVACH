'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronDown,
  Search,
  Check,
  Plus,
  FolderGit2,
  Building2,
  Settings,
  ExternalLink,
} from 'lucide-react';
import { useScope } from '@/context/ScopeContext';
import type { WorkspaceItem } from '@/types/api/workspaces';
import { CreateWorkspaceModal } from './CreateWorkspaceModal';

const GithubIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
  </svg>
);

const ORG_ICON_COLORS = [
  { bg: '#FEE2E2', text: '#DC2626' }, // Red / Pink
  { bg: '#DCFCE7', text: '#16A34A' }, // Green
  { bg: '#CCFBF1', text: '#0D9488' }, // Teal
  { bg: '#E0E7FF', text: '#4F46E5' }, // Indigo
  { bg: '#FEF3C7', text: '#D97706' }, // Amber
];

export function WorkspaceSwitcher() {
  const router = useRouter();
  const { currentWorkspace, workspaces, setCurrentWorkspace } = useScope();

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Active workspace display info
  const activeWsName = currentWorkspace?.name || 'Personal Workspace';
  const activeWsType = currentWorkspace?.workspace_type === 'PERSONAL' ? 'Personal Workspace' : 'Organization Workspace';
  const projectCount = currentWorkspace?.project_count ?? 0;
  const repositoryCount = currentWorkspace?.repository_count ?? 0;

  // Filter workspaces by search
  const q = searchQuery.toLowerCase().trim();
  const filteredPersonal = workspaces.personal.filter(
    (w) => !q || w.name.toLowerCase().includes(q)
  );

  const filteredOrgs = workspaces.organizations
    .map((org) => ({
      ...org,
      workspaces: org.workspaces.filter(
        (w) => !q || w.name.toLowerCase().includes(q) || org.name.toLowerCase().includes(q)
      ),
    }))
    .filter((org) => org.workspaces.length > 0 || (!q && true));

  const handleSelectWorkspace = (w: WorkspaceItem) => {
    setCurrentWorkspace(w);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      {/* ── SCREEN 01: Top-Left Workspace Switcher Button ── */}
      <div
        id="kavach-workspace-switcher-trigger"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '10px 12px',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 8,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 6,
              backgroundColor: currentWorkspace?.workspace_type === 'PERSONAL' ? '#F8FAFC' : '#EFF6FF',
              border: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: currentWorkspace?.workspace_type === 'PERSONAL' ? '#475569' : '#2563EB',
              flexShrink: 0,
            }}
          >
            {currentWorkspace?.workspace_type === 'PERSONAL' ? (
              <GithubIcon size={16} />
            ) : (
              <FolderGit2 size={16} />
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: '#0F172A',
                lineHeight: 1.2,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {activeWsName}
            </span>
            <span
              style={{
                fontSize: 11,
                color: '#64748B',
                lineHeight: 1.2,
                marginTop: 2,
                whiteSpace: 'nowrap',
              }}
            >
              {projectCount} projects · {repositoryCount} repositories
            </span>
          </div>
        </div>
        <ChevronDown
          size={14}
          color="#64748B"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.15s ease',
            flexShrink: 0,
            marginLeft: 6,
          }}
        />
      </div>

      {/* ── SCREEN 02: Workspace Switcher Dropdown ── */}
      {isOpen && (
        <div
          id="kavach-workspace-switcher-dropdown"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            width: 280,
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 10,
            boxShadow: '0 12px 24px -4px rgba(15, 23, 42, 0.12), 0 4px 6px -2px rgba(15, 23, 42, 0.04)',
            zIndex: 1000,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Search workspaces input */}
          <div style={{ padding: '8px 10px', borderBottom: '1px solid #F1F5F9' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 10px',
                backgroundColor: '#F8FAFC',
                borderRadius: 6,
                border: '1px solid #E2E8F0',
              }}
            >
              <Search size={14} color="#94A3B8" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search workspaces..."
                style={{
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  fontSize: 12,
                  color: '#0F172A',
                  width: '100%',
                }}
                autoFocus
              />
            </div>
          </div>

          <div style={{ maxHeight: 340, overflowY: 'auto', padding: '6px 0' }}>
            {/* Section: PERSONAL */}
            {filteredPersonal.length > 0 && (
              <div style={{ marginBottom: 6 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#94A3B8',
                    padding: '6px 14px 4px 14px',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  Personal
                </div>
                {filteredPersonal.map((ws) => {
                  const isSelected = currentWorkspace?.id === ws.id;
                  return (
                    <div
                      key={ws.id}
                      onClick={() => handleSelectWorkspace(ws)}
                      style={{
                        padding: '8px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        backgroundColor: isSelected ? '#F8FAFC' : 'transparent',
                        transition: 'background-color 0.1s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = '#F8FAFC';
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            backgroundColor: '#F1F5F9',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#334155',
                            flexShrink: 0,
                          }}
                        >
                          <GithubIcon size={15} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: isSelected ? 700 : 500,
                              color: '#0F172A',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {ws.name}
                          </span>
                          <span style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>
                            {ws.project_count} projects · {ws.repository_count} repositories
                          </span>
                        </div>
                      </div>
                      {isSelected && <Check size={16} color="#2563EB" style={{ flexShrink: 0, marginLeft: 6 }} />}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Section: ORGANIZATIONS */}
            {filteredOrgs.length > 0 && (
              <div style={{ marginBottom: 6 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#94A3B8',
                    padding: '6px 14px 4px 14px',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>Organizations</span>
                </div>

                {filteredOrgs.map((org, orgIdx) => {
                  const palette = ORG_ICON_COLORS[orgIdx % ORG_ICON_COLORS.length];
                  return (
                    <div key={org.id} style={{ marginBottom: 4 }}>
                      {org.workspaces.map((ws) => {
                        const isSelected = currentWorkspace?.id === ws.id;
                        return (
                          <div
                            key={ws.id}
                            onClick={() => handleSelectWorkspace(ws)}
                            style={{
                              padding: '8px 14px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              cursor: 'pointer',
                              backgroundColor: isSelected ? '#F8FAFC' : 'transparent',
                              transition: 'background-color 0.1s ease',
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) e.currentTarget.style.backgroundColor = '#F8FAFC';
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                              <div
                                style={{
                                  width: 28,
                                  height: 28,
                                  borderRadius: 6,
                                  backgroundColor: palette.bg,
                                  color: palette.text,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                }}
                              >
                                <FolderGit2 size={15} />
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                <span
                                  style={{
                                    fontSize: 13,
                                    fontWeight: isSelected ? 700 : 500,
                                    color: '#0F172A',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                  }}
                                >
                                  {ws.name}
                                </span>
                                <span style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>
                                  {ws.project_count} projects · {ws.repository_count} repositories
                                </span>
                              </div>
                            </div>
                            {isSelected && <Check size={16} color="#2563EB" style={{ flexShrink: 0, marginLeft: 6 }} />}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bottom Actions: + Create new workspace & Open Organization & Workspace Settings */}
          <div
            style={{
              padding: '6px 8px',
              borderTop: '1px solid #F1F5F9',
              backgroundColor: '#FAFAFA',
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            <div
              id="kavach-create-new-workspace-btn"
              onClick={() => {
                setIsOpen(false);
                setShowCreateModal(true);
              }}
              style={{
                padding: '8px 10px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                color: '#0F172A',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                transition: 'background-color 0.1s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F1F5F9')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <Plus size={15} color="#475569" />
              <span>Create new workspace</span>
            </div>

            {currentWorkspace?.organization_id && (
              <div
                onClick={() => {
                  setIsOpen(false);
                  router.push(`/organization?id=${currentWorkspace.organization_id}`);
                }}
                style={{
                  padding: '8px 10px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 500,
                  color: '#475569',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F1F5F9')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <Building2 size={14} color="#64748B" />
                <span>Open organization page</span>
              </div>
            )}

            <div
              onClick={() => {
                setIsOpen(false);
                router.push('/settings/workspace');
              }}
              style={{
                padding: '8px 10px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 500,
                color: '#475569',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F1F5F9')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <Settings size={14} color="#64748B" />
              <span>Workspace settings</span>
            </div>
          </div>
        </div>
      )}

      {/* Screen 03 Modal */}
      <CreateWorkspaceModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={(created) => {
          // If created, automatically select it and navigate if needed
        }}
      />
    </div>
  );
}
