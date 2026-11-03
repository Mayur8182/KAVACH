'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Shield,
  FolderGit2,
  Users,
  GitBranch,
  Key,
  CreditCard,
  Trash2,
  AlertTriangle,
  Check,
  Loader2,
  Lock,
  Building2,
  ExternalLink,
  Settings as SettingsIcon,
  Search,
} from 'lucide-react';

import { useScope } from '@/context/ScopeContext';
import { api } from '@/lib/api/client';
import { WorkspaceSwitcher } from '@/components/workspace/WorkspaceSwitcher';
import { KavachLogo } from '@/components/common/KavachLogo';
import type { WorkspaceItem } from '@/types/api/workspaces';

export default function WorkspaceSettingsPage() {
  const router = useRouter();
  const { currentWorkspace, setCurrentWorkspace, refreshWorkspaces, workspaces } = useScope();

  const [activeTab, setActiveTab] = useState<'general' | 'members' | 'projects' | 'repositories' | 'integrations' | 'security' | 'billing'>('general');

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState('Private');
  const [defaultBranch, setDefaultBranch] = useState('main');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Danger zone deletion modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmName, setConfirmName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Workspace resources for deletion warning
  const [wsProjects, setWsProjects] = useState<any[]>([]);
  const [wsRepositories, setWsRepositories] = useState<any[]>([]);

  useEffect(() => {
    if (currentWorkspace) {
      setName(currentWorkspace.name);
      setDescription(currentWorkspace.description || '');
      setVisibility(currentWorkspace.visibility || 'Private');
      setDefaultBranch(currentWorkspace.default_branch || 'main');

      // Load projects and repos to accurately explain consequences of deletion
      api.workspaces.getProjects(currentWorkspace.id).then(setWsProjects).catch(() => []);
      api.workspaces.getRepositories(currentWorkspace.id).then(setWsRepositories).catch(() => []);
    }
  }, [currentWorkspace?.id]);

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace) return;

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const updated = await api.workspaces.update(currentWorkspace.id, {
        name: name.trim(),
        description: description.trim(),
        visibility,
        default_branch: defaultBranch.trim() || 'main',
      });

      await refreshWorkspaces();
      if (updated) {
        setCurrentWorkspace(updated);
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err: any) {
      setSaveError(err?.message || 'Failed to update workspace settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!currentWorkspace) return;
    if (confirmName !== currentWorkspace.name) {
      setDeleteError(`Name does not match '${currentWorkspace.name}'`);
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await api.workspaces.delete(currentWorkspace.id);
      await refreshWorkspaces();

      // Switch to personal workspace or another available workspace
      const remaining = workspaces.items.filter((w) => w.id !== currentWorkspace.id);
      if (remaining.length > 0) {
        setCurrentWorkspace(remaining[0]);
      } else {
        setCurrentWorkspace(null);
      }

      setShowDeleteModal(false);
      router.push('/assistant');
    } catch (err: any) {
      setDeleteError(err?.message || 'Failed to delete workspace');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!currentWorkspace) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' }}>
        <Loader2 size={24} className="animate-spin" color="#2563EB" />
      </div>
    );
  }

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
                fontWeight: 500,
                color: '#475569',
                textDecoration: 'none',
              }}
            >
              <FolderGit2 size={16} />
              <span>Repositories</span>
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
                fontWeight: 600,
                color: '#0F172A',
                backgroundColor: '#F1F5F9',
                textDecoration: 'none',
              }}
            >
              <SettingsIcon size={16} color="#2563EB" />
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

      {/* ── MAIN SETTINGS AREA (SCREEN 05) ── */}
      <main style={{ flex: 1, overflowY: 'auto', padding: '36px 48px' }}>
        {/* Back header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
          <button
            onClick={() => router.back()}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#64748B',
              padding: 6,
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ArrowLeft size={18} />
          </button>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
            Workspace settings
          </h1>
        </div>

        {/* Settings Layout: Left Sub-Nav + Right Form */}
        <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 48, alignItems: 'flex-start' }}>
          {/* Sub Navigation matching Screen 05 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[
              { id: 'general', label: 'General', icon: SettingsIcon },
              { id: 'members', label: 'Members', icon: Users },
              { id: 'projects', label: 'Projects', icon: FolderGit2 },
              { id: 'repositories', label: 'Repositories', icon: FolderGit2 },
              { id: 'integrations', label: 'Integrations', icon: Shield },
              { id: 'security', label: 'Security', icon: Lock },
              { id: 'billing', label: 'Billing', icon: CreditCard },
            ].map((item) => {
              const isSelected = activeTab === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '9px 12px',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: isSelected ? 600 : 500,
                    color: isSelected ? '#0F172A' : '#64748B',
                    backgroundColor: isSelected ? '#F1F5F9' : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Icon size={15} color={isSelected ? '#0F172A' : '#94A3B8'} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Right Content Area */}
          <div style={{ maxWidth: 540 }}>
            {activeTab === 'general' && (
              <form onSubmit={handleSaveGeneral} style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: '0 0 18px 0' }}>
                    General information
                  </h2>

                  {saveSuccess && (
                    <div style={{ padding: '10px 14px', borderRadius: 8, backgroundColor: '#DCFCE7', color: '#16A34A', fontSize: 12, marginBottom: 16 }}>
                      Workspace settings updated successfully!
                    </div>
                  )}
                  {saveError && (
                    <div style={{ padding: '10px 14px', borderRadius: 8, backgroundColor: '#FEF2F2', color: '#DC2626', fontSize: 12, marginBottom: 16 }}>
                      {saveError}
                    </div>
                  )}

                  {/* Workspace Name */}
                  <div style={{ marginBottom: 18 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1E293B', marginBottom: 6 }}>
                      Workspace name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 8,
                        border: '1px solid #CBD5E1',
                        fontSize: 13,
                        color: '#0F172A',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  {/* Description */}
                  <div style={{ marginBottom: 18 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1E293B', marginBottom: 6 }}>
                      Description
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 8,
                        border: '1px solid #CBD5E1',
                        fontSize: 13,
                        color: '#0F172A',
                        boxSizing: 'border-box',
                        fontFamily: 'inherit',
                      }}
                    />
                  </div>

                  {/* Visibility */}
                  <div style={{ marginBottom: 18 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1E293B', marginBottom: 6 }}>
                      Visibility
                    </label>
                    <select
                      value={visibility}
                      onChange={(e) => setVisibility(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 8,
                        border: '1px solid #CBD5E1',
                        fontSize: 13,
                        color: '#0F172A',
                        backgroundColor: '#FFFFFF',
                      }}
                    >
                      <option value="Private">Private (Only members can access)</option>
                      <option value="Internal">Internal</option>
                      <option value="Public">Public</option>
                    </select>
                  </div>

                  {/* Default branch */}
                  <div style={{ marginBottom: 24 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1E293B', marginBottom: 6 }}>
                      Default branch
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        value={defaultBranch}
                        onChange={(e) => setDefaultBranch(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 14px 10px 34px',
                          borderRadius: 8,
                          border: '1px solid #CBD5E1',
                          fontSize: 13,
                          boxSizing: 'border-box',
                        }}
                      />
                      <GitBranch size={15} color="#94A3B8" style={{ position: 'absolute', left: 12, top: 12 }} />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSaving}
                    style={{
                      padding: '9px 20px',
                      borderRadius: 8,
                      backgroundColor: '#0F172A',
                      color: '#FFFFFF',
                      border: 'none',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {isSaving ? 'Saving...' : 'Save changes'}
                  </button>
                </div>

                {/* ── DELETE WORKSPACE (DANGER ZONE matching Screen 05) ── */}
                <div style={{ paddingTop: 28, borderTop: '1px solid #E2E8F0' }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: '0 0 12px 0' }}>
                    Delete workspace
                  </h3>

                  <button
                    type="button"
                    onClick={() => setShowDeleteModal(true)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 8,
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #FECACA',
                      color: '#DC2626',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'background-color 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FEF2F2')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                  >
                    Delete workspace
                  </button>

                  <p style={{ fontSize: 12, color: '#64748B', marginTop: 8 }}>
                    This action cannot be undone. Associated repositories and projects will be safely detached.
                  </p>
                </div>
              </form>
            )}

            {activeTab === 'members' && (
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: '0 0 16px 0' }}>
                  Workspace Members
                </h2>
                <div style={{ padding: 18, border: '1px solid #E2E8F0', borderRadius: 8 }}>
                  <p style={{ fontSize: 13, color: '#475569', margin: 0 }}>
                    Members inherit permissions from the parent organization. You can invite additional members via the Organization overview.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'projects' && (
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: '0 0 16px 0' }}>
                  Workspace Projects ({wsProjects.length})
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {wsProjects.map((p) => (
                    <div
                      key={p.id}
                      style={{
                        padding: '12px 16px',
                        border: '1px solid #E2E8F0',
                        borderRadius: 8,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: '#64748B' }}>{p.primary_language || 'TypeScript'}</div>
                      </div>
                      <span style={{ fontSize: 12, color: '#64748B' }}>{p.repository_count || 0} repos</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'repositories' && (
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: '0 0 16px 0' }}>
                  Connected Repositories ({wsRepositories.length})
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {wsRepositories.map((r) => (
                    <div
                      key={r.id}
                      style={{
                        padding: '12px 16px',
                        border: '1px solid #E2E8F0',
                        borderRadius: 8,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{r.name}</div>
                        <div style={{ fontSize: 11, color: '#64748B' }}>{r.default_branch} · {r.visibility}</div>
                      </div>
                      <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4, backgroundColor: '#DCFCE7', color: '#16A34A', fontWeight: 600 }}>
                        Connected
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'integrations' && (
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: '0 0 16px 0' }}>
                  Workspace Integrations
                </h2>
                <p style={{ fontSize: 13, color: '#64748B' }}>
                  Connected developer tooling and security scanners active for this workspace.
                </p>
              </div>
            )}

            {activeTab === 'security' && (
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: '0 0 16px 0' }}>
                  Security & Policies
                </h2>
                <p style={{ fontSize: 13, color: '#64748B' }}>
                  Deterministic policies, secret masking, and branch protection enforcement.
                </p>
              </div>
            )}

            {activeTab === 'billing' && (
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: '0 0 16px 0' }}>
                  Billing & Quotas
                </h2>
                <p style={{ fontSize: 13, color: '#64748B' }}>
                  Enterprise tier quotas, runner minutes, and repository limits.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ── CONFIRM DELETE MODAL ── */}
      {showDeleteModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16,
          }}
          onClick={() => setShowDeleteModal(false)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)',
              width: '100%',
              maxWidth: 480,
              border: '1px solid #FECACA',
              padding: 24,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  backgroundColor: '#FEF2F2',
                  color: '#DC2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AlertTriangle size={20} />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: 0 }}>
                Delete workspace "{currentWorkspace.name}"
              </h3>
            </div>

            <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.5, marginBottom: 14 }}>
              Are you sure you want to delete this workspace? Associated projects ({wsProjects.length}) and repositories ({wsRepositories.length}) will be safely detached and preserved.
            </p>

            <p style={{ fontSize: 12, fontWeight: 600, color: '#0F172A', marginBottom: 8 }}>
              Please type <strong style={{ color: '#DC2626' }}>{currentWorkspace.name}</strong> to confirm:
            </p>

            <input
              type="text"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder={currentWorkspace.name}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 8,
                border: '1px solid #CBD5E1',
                fontSize: 13,
                boxSizing: 'border-box',
                marginBottom: 16,
              }}
              autoFocus
            />

            {deleteError && (
              <div style={{ padding: '8px 12px', borderRadius: 6, backgroundColor: '#FEF2F2', color: '#DC2626', fontSize: 12, marginBottom: 14 }}>
                {deleteError}
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #CBD5E1', background: '#FFFFFF', fontSize: 13, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteWorkspace}
                disabled={isDeleting || confirmName !== currentWorkspace.name}
                style={{
                  padding: '8px 18px',
                  borderRadius: 8,
                  backgroundColor: '#DC2626',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: isDeleting || confirmName !== currentWorkspace.name ? 'not-allowed' : 'pointer',
                  opacity: isDeleting || confirmName !== currentWorkspace.name ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                {isDeleting && <Loader2 size={14} className="animate-spin" />}
                Confirm deletion
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
