'use client';

/**
 * SCREEN 06 — PROJECTS & REPOSITORIES (INSIDE WORKSPACE)
 * Faithful implementation of Screen 06 from Kavach Workspace Flow reference.
 * Supports Projects Tab and Repositories Tab with real database persistence.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  FolderGit2,
  Plus,
  Search,
  Filter,
  Star,
  MoreVertical,
  Clock,
  GitBranch,
  Shield,
  Loader2,
  Trash2,
  ExternalLink,
  ChevronDown,
  Building2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  X,
  Settings as SettingsIcon,
} from 'lucide-react';

import { useScope } from '@/context/ScopeContext';
import { api } from '@/lib/api/client';
import { WorkspaceSwitcher } from '@/components/workspace/WorkspaceSwitcher';
import { KavachLogo } from '@/components/common/KavachLogo';
import { ConnectGithubModal } from '@/components/assistant/ConnectGithubModal';
import { EmptyState, SkeletonCard } from '@/components/ui';
import type { ProjectInWorkspaceItem, RepositoryInWorkspaceItem } from '@/types/api/workspaces';

const PROJECT_PALETTES = [
  { bg: '#EFF6FF', border: '#DBEAFE', icon: '#2563EB' }, // Blue
  { bg: '#DCFCE7', border: '#BBF7D0', icon: '#16A34A' }, // Green
  { bg: '#F3E8FF', border: '#E9D5FF', icon: '#9333EA' }, // Purple
  { bg: '#FEF3C7', border: '#FDE68A', icon: '#D97706' }, // Amber
  { bg: '#F1F5F9', border: '#E2E8F0', icon: '#475569' }, // Gray
];

export default function WorkspaceProjectsAndRepositoriesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const { currentWorkspace, setCurrentProject } = useScope();

  const [activeTab, setActiveTab] = useState<'projects' | 'repositories'>(
    tabParam === 'repositories' ? 'repositories' : 'projects'
  );

  const [projects, setProjects] = useState<ProjectInWorkspaceItem[]>([]);
  const [repositories, setRepositories] = useState<RepositoryInWorkspaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<'all' | 'active' | 'archived'>('all');

  // Modals
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [showConnectGithubModal, setShowConnectGithubModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedRepoToAssign, setSelectedRepoToAssign] = useState<RepositoryInWorkspaceItem | null>(null);
  const [targetProjectId, setTargetProjectId] = useState<string>('');

  // Create Project State
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [newProjectLang, setNewProjectLang] = useState('TypeScript');
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [createProjectError, setCreateProjectError] = useState<string | null>(null);

  // Active action menu
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Load projects and repositories for active workspace
  const loadWorkspaceData = useCallback(async () => {
    if (!currentWorkspace) return;
    setLoading(true);
    try {
      const [projs, repos] = await Promise.all([
        api.workspaces.getProjects(currentWorkspace.id),
        api.workspaces.getRepositories(currentWorkspace.id),
      ]);
      setProjects(projs || []);
      setRepositories(repos || []);
    } catch (err) {
      console.error('Failed to load workspace data:', err);
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace?.id]);

  useEffect(() => {
    loadWorkspaceData();
  }, [loadWorkspaceData]);

  // Handle Project Creation
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace || !newProjectName.trim()) return;

    setIsCreatingProject(true);
    setCreateProjectError(null);

    try {
      const created = await api.workspaces.createProject(currentWorkspace.id, {
        name: newProjectName.trim(),
        description: newProjectDesc.trim() || undefined,
        primary_language: newProjectLang,
        environment: 'development',
      });

      setNewProjectName('');
      setNewProjectDesc('');
      setShowCreateProjectModal(false);
      loadWorkspaceData();
    } catch (err: any) {
      setCreateProjectError(err?.message || 'Failed to create project');
    } finally {
      setIsCreatingProject(false);
    }
  };

  // Handle Assign Repository to Project
  const handleAssignRepo = async () => {
    if (!currentWorkspace || !selectedRepoToAssign || !targetProjectId) return;
    try {
      await api.workspaces.assignRepository(currentWorkspace.id, selectedRepoToAssign.id, targetProjectId);
      setShowAssignModal(false);
      loadWorkspaceData();
    } catch (err: any) {
      alert(`Assignment failed: ${err?.message}`);
    }
  };

  // Handle Remove Repository
  const handleRemoveRepo = async (repoId: string) => {
    if (!currentWorkspace) return;
    if (!confirm('Are you sure you want to disconnect this repository from the workspace?')) return;
    try {
      await api.workspaces.removeRepository(currentWorkspace.id, repoId);
      loadWorkspaceData();
    } catch (err: any) {
      alert(`Failed to remove repository: ${err?.message}`);
    }
  };

  // Filtered projects
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const matchesSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase());
      if (filterCategory === 'active') return matchesSearch && p.status === 'ACTIVE';
      if (filterCategory === 'archived') return matchesSearch && p.name.toLowerCase().includes('archive');
      return matchesSearch;
    });
  }, [projects, searchQuery, filterCategory]);

  // Filtered repositories
  const filteredRepositories = useMemo(() => {
    return repositories.filter((r) => {
      return !searchQuery || r.name.toLowerCase().includes(searchQuery.toLowerCase()) || r.owner.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [repositories, searchQuery]);

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        width: '100%',
        backgroundColor: '#FFFFFF',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        color: '#0F172A',
      }}
    >
      {/* ── LEFT SIDEBAR ── */}
      <aside
        style={{
          width: '260px',
          backgroundColor: '#FFFFFF',
          borderRight: '1px solid #E2E8F0',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          flexShrink: 0,
          padding: '16px 14px',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <KavachLogo size={24} showText={true} />
          </div>

          <WorkspaceSwitcher />

          <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Link
              href="/assistant"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 12px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 500,
                color: '#475569',
                textDecoration: 'none',
              }}
            >
              <Search size={16} />
              <span>Search / Ask</span>
            </Link>

            <Link
              href="/projects"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 12px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                color: '#0F172A',
                backgroundColor: '#F1F5F9',
                textDecoration: 'none',
              }}
            >
              <FolderGit2 size={16} color="#2563EB" />
              <span>Repositories</span>
            </Link>

            <Link
              href="/code/scans"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 12px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 500,
                color: '#475569',
                textDecoration: 'none',
              }}
            >
              <Clock size={16} />
              <span>Scans</span>
            </Link>

            <Link
              href="/code/findings"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 12px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 500,
                color: '#475569',
                textDecoration: 'none',
              }}
            >
              <Shield size={16} />
              <span>Findings</span>
            </Link>

            <Link
              href="/organization"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 12px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 500,
                color: '#475569',
                textDecoration: 'none',
              }}
            >
              <Building2 size={16} />
              <span>Organization</span>
            </Link>

            <Link
              href="/settings/workspace"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 12px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 500,
                color: '#475569',
                textDecoration: 'none',
              }}
            >
              <SettingsIcon size={16} />
              <span>Settings</span>
            </Link>
          </nav>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 8px',
            borderTop: '1px solid #F1F5F9',
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              backgroundColor: '#0F172A',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            M
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Mayur Bharvad
            </span>
            <span style={{ fontSize: 11, color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              mayur@adit.edu.in
            </span>
          </div>
        </div>
      </aside>

      {/* ── MAIN PROJECTS & REPOSITORIES (SCREEN 06) ── */}
      <main style={{ flex: 1, overflowY: 'auto', padding: '36px 48px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
              Projects
            </h1>
            <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 0 0' }}>
              Organize your repositories into projects for better management.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {activeTab === 'repositories' ? (
              <button
                onClick={() => setShowConnectGithubModal(true)}
                style={{
                  padding: '9px 18px',
                  borderRadius: 8,
                  backgroundColor: '#0F172A',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                }}
              >
                <Plus size={15} />
                <span>Connect GitHub</span>
              </button>
            ) : (
              <button
                id="kavach-create-new-project-btn"
                onClick={() => setShowCreateProjectModal(true)}
                style={{
                  padding: '9px 18px',
                  borderRadius: 8,
                  backgroundColor: '#0F172A',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                }}
              >
                <Plus size={15} />
                <span>New project</span>
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs (Projects vs Repositories) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 24,
            borderBottom: '1px solid #E2E8F0',
            marginBottom: 24,
          }}
        >
          <button
            onClick={() => setActiveTab('projects')}
            style={{
              padding: '10px 0',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'projects' ? '2px solid #0F172A' : '2px solid transparent',
              color: activeTab === 'projects' ? '#0F172A' : '#64748B',
              fontSize: 14,
              fontWeight: activeTab === 'projects' ? 600 : 500,
              cursor: 'pointer',
              marginBottom: -1,
            }}
          >
            Projects
          </button>
          <button
            onClick={() => setActiveTab('repositories')}
            style={{
              padding: '10px 0',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'repositories' ? '2px solid #0F172A' : '2px solid transparent',
              color: activeTab === 'repositories' ? '#0F172A' : '#64748B',
              fontSize: 14,
              fontWeight: activeTab === 'repositories' ? 600 : 500,
              cursor: 'pointer',
              marginBottom: -1,
            }}
          >
            Repositories
          </button>
        </div>

        {/* Filter bar matching Screen 06 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 14px',
              backgroundColor: '#FFFFFF',
              borderRadius: 8,
              border: '1px solid #E2E8F0',
              width: 320,
            }}
          >
            <Search size={15} color="#94A3B8" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={activeTab === 'projects' ? 'Search projects...' : 'Search repositories...'}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: 13,
                color: '#0F172A',
                width: '100%',
              }}
            />
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 12px',
              backgroundColor: '#FFFFFF',
              borderRadius: 8,
              border: '1px solid #E2E8F0',
              fontSize: 13,
              color: '#475569',
              cursor: 'pointer',
            }}
          >
            <span>All</span>
            <ChevronDown size={14} color="#64748B" />
          </div>
        </div>

        {/* Tab 1: PROJECTS LIST (Exact matching Screen 06) */}
        {activeTab === 'projects' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {loading ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
                <SkeletonCard count={3} />
              </div>
            ) : filteredProjects.length > 0 ? (
              filteredProjects.map((p, idx) => {
                const palette = PROJECT_PALETTES[idx % PROJECT_PALETTES.length];
                const isMenuOpen = openMenuId === p.id;
                return (
                  <div
                    key={p.id}
                    style={{
                      padding: '16px 20px',
                      borderRadius: 10,
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'border-color 0.15s ease',
                      position: 'relative',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 8,
                          backgroundColor: palette.bg,
                          color: palette.icon,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <FolderGit2 size={18} />
                      </div>
                      <div>
                        <div
                          onClick={() => {
                            setCurrentProject({
                              id: p.id,
                              name: p.name,
                              description: p.description || '',
                              owner_id: '',
                              organization_id: p.organization_id || '',
                              created_at: p.created_at,
                              updated_at: p.created_at,
                              environment: p.environment,
                              application_type: 'web_service',
                            } as any);
                            router.push('/assistant');
                          }}
                          style={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: '#0F172A',
                            cursor: 'pointer',
                          }}
                        >
                          {p.name}
                        </div>
                        <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                          {p.repository_count} repositories
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                      <span style={{ fontSize: 12, color: '#94A3B8' }}>
                        {p.last_activity}
                      </span>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#94A3B8', fontSize: 12 }}>
                        <Star size={14} />
                        <span>0</span>
                      </div>

                      <div style={{ position: 'relative' }}>
                        <button
                          onClick={() => setOpenMenuId(isMenuOpen ? null : p.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#94A3B8',
                            padding: 4,
                          }}
                        >
                          <MoreVertical size={16} />
                        </button>

                        {isMenuOpen && (
                          <div
                            style={{
                              position: 'absolute',
                              right: 0,
                              top: '100%',
                              backgroundColor: '#FFFFFF',
                              borderRadius: 8,
                              border: '1px solid #E2E8F0',
                              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                              zIndex: 20,
                              width: 160,
                              overflow: 'hidden',
                              padding: 4,
                            }}
                          >
                            <div
                              onClick={() => {
                                setOpenMenuId(null);
                                router.push('/assistant');
                              }}
                              style={{ padding: '8px 10px', fontSize: 12, color: '#0F172A', cursor: 'pointer', borderRadius: 4 }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                            >
                              Open in AI Assistant
                            </div>
                            <div
                              onClick={() => {
                                setOpenMenuId(null);
                                setActiveTab('repositories');
                              }}
                              style={{ padding: '8px 10px', fontSize: 12, color: '#0F172A', cursor: 'pointer', borderRadius: 4 }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                            >
                              Manage repositories
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : searchQuery ? (
              <EmptyState
                variant="no_search_results"
                searchQuery={searchQuery}
                onReset={() => setSearchQuery('')}
              />
            ) : (
              <EmptyState
                variant="no_repositories"
                title="No projects in this workspace yet"
                description="Create your first project to organize repositories and automate security scans."
                action={{
                  label: "+ New project",
                  onClick: () => setShowCreateProjectModal(true),
                }}
              />
            )}
          </div>
        )}

        {/* Tab 2: REPOSITORIES LIST (Single Source of Truth) */}
        {activeTab === 'repositories' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {loading ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
                <SkeletonCard count={3} />
              </div>
            ) : filteredRepositories.length > 0 ? (
              filteredRepositories.map((repo) => (
                <div
                  key={repo.id}
                  style={{
                    padding: '16px 20px',
                    borderRadius: 10,
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        backgroundColor: '#F1F5F9',
                        color: '#0F172A',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <FolderGit2 size={18} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>
                          {repo.full_name || `${repo.owner}/${repo.name}`}
                        </span>
                        <span
                          style={{
                            padding: '2px 6px',
                            borderRadius: 4,
                            backgroundColor: '#F1F5F9',
                            color: '#475569',
                            fontSize: 11,
                            fontWeight: 500,
                          }}
                        >
                          {repo.visibility}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: '#64748B', marginTop: 4 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <GitBranch size={13} /> {repo.default_branch}
                        </span>
                        <span>{repo.language || 'TypeScript'}</span>
                        {repo.project_name ? (
                          <span style={{ color: '#2563EB', fontWeight: 500 }}>
                            Project: {repo.project_name}
                          </span>
                        ) : (
                          <span style={{ color: '#D97706', fontWeight: 500 }}>
                            Unassigned
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button
                      onClick={() => {
                        setSelectedRepoToAssign(repo);
                        setTargetProjectId(projects[0]?.id || '');
                        setShowAssignModal(true);
                      }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 6,
                        backgroundColor: '#F8FAFC',
                        border: '1px solid #CBD5E1',
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#334155',
                        cursor: 'pointer',
                      }}
                    >
                      Assign to project
                    </button>

                    <button
                      onClick={() => handleRemoveRepo(repo.id)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: 6,
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #FECACA',
                        fontSize: 12,
                        color: '#DC2626',
                        cursor: 'pointer',
                      }}
                    >
                      Disconnect
                    </button>
                  </div>
                </div>
              ))
            ) : searchQuery ? (
              <EmptyState
                variant="no_search_results"
                searchQuery={searchQuery}
                onReset={() => setSearchQuery('')}
              />
            ) : (
              <EmptyState
                variant="no_repositories"
                title="No repositories connected to this workspace"
                description="Connect your GitHub repositories to run SAST, SCA, and Container Security scans."
                action={{
                  label: "Connect GitHub",
                  onClick: () => setShowConnectGithubModal(true),
                }}
              />
            )}
          </div>
        )}
      </main>

      {/* Create Project Modal */}
      {showCreateProjectModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16,
          }}
          onClick={() => setShowCreateProjectModal(false)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              width: '100%',
              maxWidth: 480,
              border: '1px solid #E2E8F0',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: '20px 24px 16px 24px',
                borderBottom: '1px solid #F1F5F9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: 0 }}>
                Create new project
              </h3>
              <button
                onClick={() => setShowCreateProjectModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateProject} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {createProjectError && (
                <div style={{ padding: '8px 12px', borderRadius: 6, backgroundColor: '#FEF2F2', color: '#DC2626', fontSize: 12 }}>
                  {createProjectError}
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1E293B', marginBottom: 6 }}>
                  Project name
                </label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="e.g. Kavach Platform, Core API"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: '1px solid #CBD5E1',
                    fontSize: 13,
                    boxSizing: 'border-box',
                  }}
                  autoFocus
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1E293B', marginBottom: 6 }}>
                  Description <span style={{ color: '#94A3B8', fontWeight: 400 }}>(optional)</span>
                </label>
                <textarea
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  placeholder="e.g. Core microservices and cloud infrastructure"
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: '1px solid #CBD5E1',
                    fontSize: 13,
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1E293B', marginBottom: 6 }}>
                  Primary Language
                </label>
                <select
                  value={newProjectLang}
                  onChange={(e) => setNewProjectLang(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: '1px solid #CBD5E1',
                    fontSize: 13,
                    backgroundColor: '#FFFFFF',
                  }}
                >
                  <option value="TypeScript">TypeScript / Node.js</option>
                  <option value="Python">Python</option>
                  <option value="Go">Go</option>
                  <option value="Java">Java</option>
                  <option value="Rust">Rust</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setShowCreateProjectModal(false)}
                  style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #CBD5E1', background: '#FFFFFF', fontSize: 13 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingProject || !newProjectName.trim()}
                  style={{
                    padding: '8px 20px',
                    borderRadius: 8,
                    backgroundColor: '#0F172A',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {isCreatingProject ? 'Creating...' : 'Create project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Repository to Project Modal */}
      {showAssignModal && selectedRepoToAssign && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16,
          }}
          onClick={() => setShowAssignModal(false)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              width: '100%',
              maxWidth: 440,
              border: '1px solid #E2E8F0',
              padding: 24,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: '0 0 8px 0' }}>
              Assign {selectedRepoToAssign.name}
            </h3>
            <p style={{ fontSize: 13, color: '#64748B', marginBottom: 16 }}>
              Select which project this repository should be associated with:
            </p>

            <select
              value={targetProjectId}
              onChange={(e) => setTargetProjectId(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 8,
                border: '1px solid #CBD5E1',
                fontSize: 13,
                backgroundColor: '#FFFFFF',
                marginBottom: 20,
              }}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #CBD5E1', background: '#FFFFFF', fontSize: 13 }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAssignRepo}
                disabled={!targetProjectId}
                style={{
                  padding: '8px 20px',
                  borderRadius: 8,
                  backgroundColor: '#0F172A',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Save assignment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Connect GitHub Modal */}
      <ConnectGithubModal
        isOpen={showConnectGithubModal}
        onClose={() => setShowConnectGithubModal(false)}
        onConnected={() => loadWorkspaceData()}
      />
    </div>
  );
}
