'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Search, X, Check, Shield, Lock, ArrowRight, ExternalLink, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api/client';
import { getAuthToken } from '@/lib/auth/token';

export interface DiscoveredProject {
  id: string;
  repository_name: string;
  project_path: string;
  owner: string;
  default_branch?: string;
  language?: string;
  stars?: number;
  already_imported?: boolean;
}

interface GitHubImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: () => void;
  onImportSuccess?: () => void;
}

const AVAILABLE_MODULES = [
  { id: 'SAST', name: 'SAST', desc: 'Static Application Security Testing & Code Flaws' },
  { id: 'SECRETS', name: 'Secrets Security', desc: 'API Keys, Credentials & Private Tokens' },
  { id: 'SCA', name: 'Dependency Security (SCA)', desc: 'Vulnerabilities in Third-party Packages & SBOM' },
  { id: 'CONTAINER', name: 'Container Security', desc: 'Dockerfile Analysis & Base Image Scans' },
  { id: 'DAST', name: 'DAST', desc: 'Dynamic Application & Runtime Endpoint Testing' },
];

export const GitHubImportModal: React.FC<GitHubImportModalProps> = ({
  isOpen,
  onClose,
  onImportComplete,
}) => {
  const [step, setStep] = useState<'select_projects' | 'choose_modules'>('select_projects');
  const [importMode, setImportMode] = useState<'discovered' | 'custom'>('discovered');
  const [customRepoUrl, setCustomRepoUrl] = useState('');
  const [customBranch, setCustomBranch] = useState('main');
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [search, setSearch] = useState('');
  const [projects, setProjects] = useState<DiscoveredProject[]>([]);
  const [totalScanned, setTotalScanned] = useState(209);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedModules, setSelectedModules] = useState<Set<string>>(
    new Set(['SAST', 'SECRETS', 'SCA'])
  );
  const [error, setError] = useState<string | null>(null);

  // Load discoverable projects
  useEffect(() => {
    if (!isOpen) {
      setStep('select_projects');
      setSelectedIds(new Set());
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? '' : 'http://127.0.0.1:8000');
    fetch(`${baseUrl}/api/v1/repositories/discover`)
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data?.items) {
          setProjects(data.items);
          setTotalScanned(data.total_scanned || data.items.length);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn('Could not load discovered projects', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Filtered projects
  const filteredProjects = useMemo(() => {
    if (!search.trim()) return projects;
    const s = search.toLowerCase();
    return projects.filter(
      (p) =>
        p.repository_name.toLowerCase().includes(s) ||
        p.project_path.toLowerCase().includes(s) ||
        p.owner.toLowerCase().includes(s)
    );
  }, [projects, search]);

  const allVisibleSelected = useMemo(() => {
    if (filteredProjects.length === 0) return false;
    return filteredProjects.every((p) => selectedIds.has(p.id));
  }, [filteredProjects, selectedIds]);

  const handleToggleSelectAll = () => {
    const next = new Set(selectedIds);
    if (allVisibleSelected) {
      filteredProjects.forEach((p) => next.delete(p.id));
    } else {
      filteredProjects.forEach((p) => next.add(p.id));
    }
    setSelectedIds(next);
  };

  const handleToggleProject = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleToggleModule = (modId: string) => {
    const next = new Set(selectedModules);
    if (next.has(modId)) {
      next.delete(modId);
    } else {
      next.add(modId);
    }
    setSelectedModules(next);
  };

  const handleProceedToModules = () => {
    if (selectedIds.size === 0) return;
    setStep('choose_modules');
  };

  const handleConfirmImport = async () => {
    setImporting(true);
    setError(null);

    const selectedProjectsList = projects.filter((p) => selectedIds.has(p.id));
    const payload = {
      projects: selectedProjectsList.map((p) => ({
        repository_name: p.repository_name,
        project_path: p.project_path,
        owner: p.owner,
        selected_modules: Array.from(selectedModules),
      })),
    };

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? '' : 'http://127.0.0.1:8000');
      const token = getAuthToken() || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
      const res = await fetch(`${baseUrl}/api/v1/repositories/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.detail || 'Failed to import selected repositories.');
      }

      onImportComplete?.();
      onClose();
    } catch (e: any) {
      setError(e.message || 'Import failed. Please try again.');
    } finally {
      setImporting(false);
    }
  };

  const handleConnectCustomRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customRepoUrl.trim()) return;
    setImporting(true);
    setError(null);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? '' : 'http://127.0.0.1:8000');
      const token = getAuthToken() || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
      const res = await fetch(`${baseUrl}/api/v1/repositories/add-custom`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          repo_url: customRepoUrl.trim(),
          default_branch: customBranch.trim() || 'main',
          selected_modules: Array.from(selectedModules),
          trigger_scan: true,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.detail || 'Failed to connect custom repository.');
      }

      onImportComplete?.();
      onClose();
    } catch (e: any) {
      setError(e.message || 'Failed to connect custom repository. Verify the URL exists.');
    } finally {
      setImporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(3px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '780px',
          maxHeight: '90vh',
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          boxShadow: '0 20px 40px -10px rgba(15, 23, 42, 0.16)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          fontFamily: 'var(--font-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif)',
          border: '1px solid #E2E8F0',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '24px 28px 16px 28px',
            borderBottom: '1px solid #F1F5F9',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h2
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: '#1E293B',
                margin: '0 0 6px 0',
                letterSpacing: '-0.015em',
              }}
            >
              Select projects to import from GitHub
            </h2>
            <p
              style={{
                fontSize: '13.5px',
                color: '#64748B',
                margin: 0,
                lineHeight: 1.45,
              }}
            >
              The projects you choose to import will stay synced with the Kavach platform.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#94A3B8',
              padding: '4px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: '10px 28px',
              backgroundColor: '#FEF2F2',
              borderBottom: '1px solid #FECACA',
              color: '#B91C1C',
              fontSize: '13px',
            }}
          >
            {error}
          </div>
        )}

        {/* Mode Tabs: Discovered Repositories vs Connect Custom Repository */}
        <div
          style={{
            padding: '10px 28px 0 28px',
            display: 'flex',
            gap: '8px',
            borderBottom: '1px solid #E2E8F0',
            backgroundColor: '#F8FAFC',
          }}
        >
          <button
            type="button"
            onClick={() => {
              setImportMode('discovered');
              setError(null);
            }}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 600,
              border: 'none',
              borderBottom: importMode === 'discovered' ? '2px solid #2563EB' : '2px solid transparent',
              backgroundColor: 'transparent',
              color: importMode === 'discovered' ? '#2563EB' : '#64748B',
              cursor: 'pointer',
            }}
          >
            Discovered GitHub Repositories ({projects.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setImportMode('custom');
              setError(null);
            }}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 600,
              border: 'none',
              borderBottom: importMode === 'custom' ? '2px solid #2563EB' : '2px solid transparent',
              backgroundColor: 'transparent',
              color: importMode === 'custom' ? '#2563EB' : '#64748B',
              cursor: 'pointer',
            }}
          >
            + Connect Custom Repository URL
          </button>
        </div>

        {/* Custom Repository Direct Connect Form */}
        {importMode === 'custom' && (
          <form onSubmit={handleConnectCustomRepo} style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: '6px' }}>
                GitHub Repository URL or owner/repository
              </label>
              <input
                type="text"
                value={customRepoUrl}
                onChange={(e) => setCustomRepoUrl(e.target.value)}
                placeholder="e.g. https://github.com/Mayur8182/KAVACH or Mayur8182/KAVACH"
                required
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13.5px',
                  outline: 'none',
                  backgroundColor: '#FFFFFF',
                  color: '#0F172A',
                }}
              />
              <span style={{ fontSize: '11.5px', color: '#64748B', marginTop: '4px', display: 'block' }}>
                Accepts full GitHub URL or shorthand `org/repo`. Supports public and authenticated private repositories.
              </span>
            </div>

            <div style={{ maxWidth: '240px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: '6px' }}>
                Default Branch
              </label>
              <input
                type="text"
                value={customBranch}
                onChange={(e) => setCustomBranch(e.target.value)}
                placeholder="main"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                  backgroundColor: '#FFFFFF',
                  color: '#0F172A',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: '10px' }}>
                Assign Security Modules
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
                {AVAILABLE_MODULES.map((mod) => {
                  const isChecked = selectedModules.has(mod.id);
                  return (
                    <label
                      key={mod.id}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                        padding: '12px',
                        borderRadius: '8px',
                        border: isChecked ? '1px solid #93C5FD' : '1px solid #E2E8F0',
                        backgroundColor: isChecked ? '#EFF6FF' : '#FFFFFF',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleModule(mod.id)}
                        style={{ marginTop: '2px', cursor: 'pointer' }}
                      />
                      <div>
                        <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#0F172A' }}>{mod.name}</div>
                        <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>{mod.desc}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '16px', borderTop: '1px solid #F1F5F9' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '8px 18px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  color: '#475569',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={importing || !customRepoUrl.trim()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 22px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: importing || !customRepoUrl.trim() ? '#93C5FD' : '#2563EB',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: importing || !customRepoUrl.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                {importing ? 'Connecting & Syncing Repository...' : 'Connect & Import Repository →'}
              </button>
            </div>
          </form>
        )}

        {/* Step 1: Select Projects Table (Discovered mode) */}
        {importMode === 'discovered' && step === 'select_projects' && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            {/* Filter & Action Toolbar matching screenshot */}
            <div
              style={{
                padding: '16px 28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '14px',
                borderBottom: '1px solid #F1F5F9',
                backgroundColor: '#FAFBFD',
              }}
            >
              {/* Scanned Counter badge & Search */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                <span
                  style={{
                    fontSize: '13.5px',
                    fontWeight: 700,
                    color: '#1E293B',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {totalScanned} projects scanned
                </span>

                <div
                  style={{
                    position: 'relative',
                    width: '210px',
                    maxWidth: '100%',
                  }}
                >
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search..."
                    style={{
                      width: '100%',
                      height: '34px',
                      padding: '6px 30px 6px 12px',
                      fontSize: '13px',
                      border: '1px solid #CBD5E1',
                      borderRadius: '6px',
                      outline: 'none',
                      backgroundColor: '#FFFFFF',
                      color: '#1E293B',
                      boxSizing: 'border-box',
                    }}
                  />
                  <Search
                    size={14}
                    color="#94A3B8"
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                    }}
                  />
                </div>
              </div>

              {/* Action Buttons matching screenshot */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <a
                  href="https://github.com/apps/kavach-security/installations/new"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    height: '34px',
                    padding: '0 14px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#1D4ED8',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #BFDBFE',
                    borderRadius: '6px',
                    textDecoration: 'none',
                    cursor: 'pointer',
                    boxSizing: 'border-box',
                  }}
                >
                  + Connect more repositories
                </a>

                <button
                  type="button"
                  onClick={handleProceedToModules}
                  disabled={selectedIds.size === 0}
                  style={{
                    height: '34px',
                    padding: '0 20px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#FFFFFF',
                    backgroundColor: selectedIds.size > 0 ? '#2563EB' : '#94A3B8',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: selectedIds.size > 0 ? 'pointer' : 'not-allowed',
                    transition: 'background-color 150ms ease',
                    boxSizing: 'border-box',
                  }}
                >
                  {selectedIds.size > 0 ? `Import (${selectedIds.size})` : 'Import'}
                </button>
              </div>
            </div>

            {/* Table Container matching screenshot */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                maxHeight: '440px',
                padding: '0 28px',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '12.5px', fontWeight: 600 }}>
                    <th style={{ padding: '12px 10px', width: '38px' }}>
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={handleToggleSelectAll}
                        style={{ cursor: 'pointer', width: '15px', height: '15px' }}
                      />
                    </th>
                    <th style={{ padding: '12px 10px', color: '#475569' }}>
                      Repository name
                    </th>
                    <th style={{ padding: '12px 10px', color: '#475569' }}>
                      Project path
                    </th>
                    <th style={{ padding: '12px 10px', color: '#475569' }}>
                      Owner
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={4} style={{ padding: '40px 0', textAlign: 'center', color: '#94A3B8', fontSize: '13px' }}>
                        Discovering repository projects...
                      </td>
                    </tr>
                  ) : filteredProjects.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ padding: '40px 0', textAlign: 'center', color: '#94A3B8', fontSize: '13px' }}>
                        No projects match your search query.
                      </td>
                    </tr>
                  ) : (
                    filteredProjects.map((p) => {
                      const isSelected = selectedIds.has(p.id);
                      return (
                        <tr
                          key={p.id}
                          onClick={() => handleToggleProject(p.id)}
                          style={{
                            borderBottom: '1px solid #F1F5F9',
                            backgroundColor: isSelected ? '#F0F7FF' : 'transparent',
                            cursor: 'pointer',
                            fontSize: '13px',
                            color: '#334155',
                            transition: 'background-color 100ms ease',
                          }}
                        >
                          <td style={{ padding: '12px 10px' }} onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleProject(p.id)}
                              style={{ cursor: 'pointer', width: '15px', height: '15px' }}
                            />
                          </td>
                          <td style={{ padding: '12px 10px', fontWeight: 500, color: '#0F172A' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span>{p.repository_name}</span>
                              {p.already_imported && (
                                <span
                                  style={{
                                    fontSize: '10.5px',
                                    fontWeight: 600,
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    backgroundColor: '#EFF6FF',
                                    color: '#2563EB',
                                  }}
                                >
                                  Synced
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: '12px 10px', color: '#475569', fontFamily: 'monospace', fontSize: '12px' }}>
                            {p.project_path}
                          </td>
                          <td style={{ padding: '12px 10px', color: '#64748B' }}>
                            {p.owner}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer with summary */}
            <div
              style={{
                padding: '14px 28px',
                borderTop: '1px solid #F1F5F9',
                backgroundColor: '#FAFBFD',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '12.5px',
                color: '#64748B',
              }}
            >
              <span>
                {selectedIds.size} of {filteredProjects.length} projects selected
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: '6px 14px',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: '#64748B',
                    backgroundColor: 'transparent',
                    border: '1px solid #CBD5E1',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleProceedToModules}
                  disabled={selectedIds.size === 0}
                  style={{
                    padding: '6px 18px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#FFFFFF',
                    backgroundColor: selectedIds.size > 0 ? '#2563EB' : '#94A3B8',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: selectedIds.size > 0 ? 'pointer' : 'not-allowed',
                  }}
                >
                  Continue to Module Selection &rarr;
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Choose Security Modules */}
        {step === 'choose_modules' && (
          <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: '0 0 6px 0' }}>
                Choose Security Modules for {selectedIds.size} Selected Project{selectedIds.size > 1 ? 's' : ''}
              </h3>
              <p style={{ fontSize: '13px', color: '#64748B', margin: 0, lineHeight: 1.5 }}>
                Select which security engines should be enabled. You can always change per-repository module assignments
                in Repository Management anytime without reconnecting GitHub.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              {AVAILABLE_MODULES.map((m) => {
                const isChecked = selectedModules.has(m.id);
                return (
                  <label
                    key={m.id}
                    onClick={() => handleToggleModule(m.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '12px 14px',
                      border: `1px solid ${isChecked ? '#2563EB' : '#E2E8F0'}`,
                      borderRadius: '8px',
                      backgroundColor: isChecked ? '#F0F7FF' : '#FFFFFF',
                      cursor: 'pointer',
                      transition: 'all 120ms ease',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      style={{ marginTop: '2px', cursor: 'pointer', width: '16px', height: '16px' }}
                    />
                    <div>
                      <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#0F172A', marginBottom: '2px' }}>
                        {m.name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748B', lineHeight: 1.4 }}>
                        {m.desc}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: '16px',
                borderTop: '1px solid #E2E8F0',
              }}
            >
              <button
                type="button"
                onClick={() => setStep('select_projects')}
                style={{
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#475569',
                  backgroundColor: 'transparent',
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                &larr; Back to Repository List
              </button>

              <button
                type="button"
                disabled={importing}
                onClick={handleConfirmImport}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 22px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#FFFFFF',
                  backgroundColor: importing ? '#93C5FD' : '#2563EB',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: importing ? 'not-allowed' : 'pointer',
                }}
              >
                {importing ? 'Importing & Configuring Modules…' : 'Confirm & Import Selected Projects'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
