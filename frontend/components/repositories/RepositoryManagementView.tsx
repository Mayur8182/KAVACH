'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  FolderGit2,
  Search,
  Filter,
  CheckCircle2,
  ExternalLink,
  Shield,
  Layers,
  Key,
  Boxes,
  Container,
  FileCode2,
  RefreshCw,
  Plus,
  Play,
  Settings,
  MoreVertical,
  Check,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { GitHubImportModal } from './GitHubImportModal';
import { api } from '@/lib/api/client';
import { apiCache } from '@/lib/api/cache';
import { toast } from '@/lib/toast';

export interface RepositoryManagementItem {
  id: string;
  name: string;
  full_name: string;
  owner: string;
  default_branch: string;
  private: boolean;
  html_url: string;
  github_status: string;
  primary_project_path: string;
  findings_count: number;
  modules: {
    sast: string;
    sca: string;
    iac: string;
    secrets: string;
    container: string;
    dast?: string;
  };
  last_synced_at?: string;
}

const MODULE_OPTIONS = ['ALL', 'SAST', 'SCA', 'SECRETS', 'CONTAINER'] as const;

export const RepositoryManagementView: React.FC = () => {
  const [repositories, setRepositories] = useState<RepositoryManagementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState<typeof MODULE_OPTIONS[number]>('ALL');
  const [importModalOpen, setImportModalOpen] = useState(false);

  const fetchRepositories = useCallback(async () => {
    const cacheKey = 'GET:/api/v1/repositories/management';
    const cached = apiCache.getWithStatus<RepositoryManagementItem[]>(cacheKey);
    if (cached) {
      setRepositories(cached.data);
      setLoading(false);
      if (!cached.isStale) {
        setRefreshing(false);
        return;
      }
    }

    try {
      const res = await api.request<RepositoryManagementItem[]>('/api/v1/repositories/management');
      if (res?.data) {
        setRepositories(res.data);
        apiCache.set(cacheKey, res.data, 'repo-mgmt-view', 60000);
      }
    } catch (err) {
      console.warn('Failed to load repositories', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRepositories();
  }, [fetchRepositories]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchRepositories();
  };

  const handleToggleModuleStatus = async (
    repoId: string,
    modKey: 'sast' | 'sca' | 'iac' | 'secrets' | 'container',
    currentStatus: string
  ) => {
    // Cycle: Enabled -> Not assigned -> Optional -> Enabled
    let nextStatus = 'Enabled';
    if (currentStatus === 'Enabled') nextStatus = 'Not assigned';
    else if (currentStatus === 'Not assigned') nextStatus = 'Optional';
    else nextStatus = 'Enabled';

    // Optimistic UI update
    setRepositories((prev) =>
      prev.map((r) =>
        r.id === repoId
          ? {
              ...r,
              modules: {
                ...r.modules,
                [modKey]: nextStatus,
              },
            }
          : r
      )
    );

    try {
      await api.request(`/api/v1/repositories/${encodeURIComponent(repoId)}/modules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          modules: { [modKey]: nextStatus },
        }),
      });

      apiCache.invalidate('/api/v1/repositories/management');
      toast.success(`Updated ${modKey.toUpperCase()} status to "${nextStatus}".`);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to update module status', {
        description: err?.message || 'Could not persist module assignment to server.',
      });
      fetchRepositories();
    }
  };

  const filteredRepositories = useMemo(() => {
    return repositories.filter((r) => {
      const matchesSearch =
        !search.trim() ||
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.owner.toLowerCase().includes(search.toLowerCase()) ||
        r.primary_project_path.toLowerCase().includes(search.toLowerCase());

      if (!matchesSearch) return false;

      if (moduleFilter === 'ALL') return true;
      const key = moduleFilter.toLowerCase() as 'sast' | 'sca' | 'iac' | 'secrets' | 'container';
      return r.modules[key] === 'Enabled' || r.modules[key] === 'Optional';
    });
  }, [repositories, search, moduleFilter]);

  const renderBadge = (
    repoId: string,
    modKey: 'sast' | 'sca' | 'iac' | 'secrets' | 'container',
    status: string
  ) => {
    const isEnabled = status === 'Enabled';
    const isOptional = status === 'Optional';

    const bg = isEnabled ? '#ECFDF5' : isOptional ? '#F1F5F9' : '#FAFAFA';
    const color = isEnabled ? '#059669' : isOptional ? '#0F172A' : '#64748B';
    const border = isEnabled ? '#A7F3D0' : isOptional ? '#E2E8F0' : '#E2E8F0';

    return (
      <button
        type="button"
        onClick={() => handleToggleModuleStatus(repoId, modKey, status)}
        title={`Click to cycle module status (Enabled / Optional / Not assigned)`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '3px 8px',
          borderRadius: '9999px',
          fontSize: '11.5px',
          fontWeight: 600,
          backgroundColor: bg,
          color: color,
          border: `1px solid ${border}`,
          cursor: 'pointer',
          transition: 'all 120ms ease',
        }}
      >
        <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: color }} />
        {status}
      </button>
    );
  };

  return (
    <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: '24px', backgroundColor: '#F8FAFC', minHeight: '100%' }}>

      {/* Top Banner: Centralized Connection Architecture */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '10px',
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '8px',
              backgroundColor: '#F1F5F9',
              border: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FolderGit2 size={24} color="#0F172A" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
                Centralized Repository Management
              </h1>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: 600,
                  backgroundColor: '#ECFDF5',
                  color: '#059669',
                  border: '1px solid #A7F3D0',
                }}
              >
                <CheckCircle2 size={12} />
                GitHub Connected Once (Org-wide)
              </span>
            </div>
            <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>
              Connect GitHub once at the organization level. Supported modules (SAST, SCA, Secrets, Container)
              reuse this connection without duplicate authentication.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              height: '36px',
              padding: '0 14px',
              fontSize: '13px',
              fontWeight: 500,
              color: '#475569',
              backgroundColor: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: '6px',
              cursor: refreshing ? 'not-allowed' : 'pointer',
            }}
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            <span>Sync GitHub</span>
          </button>

          <Link
            href="/code/repositories"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              height: '36px',
              padding: '0 16px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#FFFFFF',
              backgroundColor: '#09090B',
              border: '1px solid #09090B',
              borderRadius: '6px',
              textDecoration: 'none',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
            }}
            title="Connect and manage Git repositories"
          >
            <Plus size={16} />
            <span>Connect Repository</span>
          </Link>
        </div>
      </div>

      {/* Metric Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '14px' }}>
        {[
          { label: 'Repositories', count: repositories.length, icon: FolderGit2, color: '#0F172A', bg: '#F1F5F9' },
          {
            label: 'SAST Enabled',
            count: repositories.filter((r) => r.modules.sast === 'Enabled').length,
            icon: FileCode2,
            color: '#7C3AED',
            bg: '#F5F3FF',
          },
          {
            label: 'SCA & SBOM',
            count: repositories.filter((r) => r.modules.sca === 'Enabled').length,
            icon: Boxes,
            color: '#059669',
            bg: '#ECFDF5',
          },
          {
            label: 'Secrets Guarded',
            count: repositories.filter((r) => r.modules.secrets === 'Enabled').length,
            icon: Key,
            color: '#DC2626',
            bg: '#FEF2F2',
          },
          {
            label: 'Container Security',
            count: repositories.filter((r) => r.modules.container === 'Enabled').length,
            icon: Layers,
            color: '#D97706',
            bg: '#FFFBEB',
          },
        ].map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontSize: '12px', fontWeight: 500, color: '#64748B', marginBottom: '2px' }}>
                  {card.label}
                </div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A' }}>
                  {card.count}
                </div>
              </div>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  backgroundColor: card.bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon size={18} color={card.color} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Filter Bar & Search */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '8px',
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}
      >
        <div style={{ position: 'relative', width: '320px' }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search repositories, project paths, owners..."
            style={{
              width: '100%',
              height: '36px',
              padding: '6px 32px 6px 12px',
              fontSize: '13px',
              border: '1px solid #CBD5E1',
              borderRadius: '6px',
              outline: 'none',
              backgroundColor: '#F8FAFC',
              color: '#0F172A',
              boxSizing: 'border-box',
            }}
          />
          <Search size={15} color="#94A3B8" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)' }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
            Filter:
          </span>
          {MODULE_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setModuleFilter(opt)}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: moduleFilter === opt ? 600 : 500,
                backgroundColor: moduleFilter === opt ? '#09090B' : '#F1F5F9',
                color: moduleFilter === opt ? '#FFFFFF' : '#475569',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Centralized Repository Management Table matching section 5 */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '10px',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#FAFBFD', borderBottom: '1px solid #E2E8F0', color: '#475569', fontSize: '12.5px', fontWeight: 600 }}>
              <th style={{ padding: '14px 20px' }}>Repository</th>
              <th style={{ padding: '14px 16px' }}>Project Path</th>
              <th style={{ padding: '14px 16px' }}>GitHub Status</th>
              <th style={{ padding: '14px 16px' }}>SAST</th>
              <th style={{ padding: '14px 16px' }}>SCA</th>
              <th style={{ padding: '14px 16px' }}>Secrets</th>
              <th style={{ padding: '14px 16px' }}>Container</th>
              <th style={{ padding: '14px 20px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ padding: '48px 0', textAlign: 'center', color: '#94A3B8', fontSize: '13px' }}>
                  Loading organization repositories and module assignments...
                </td>
              </tr>
            ) : filteredRepositories.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '48px 0', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                    <span>No repositories match your current filter.</span>
                    <Link
                      href="/code/repositories"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 14px',
                        borderRadius: '6px',
                        backgroundColor: '#09090B',
                        color: '#FFFFFF',
                        fontSize: '12px',
                        fontWeight: 600,
                        textDecoration: 'none',
                      }}
                    >
                      <Plus size={14} /> Connect Repository
                    </Link>
                  </div>
                </td>
              </tr>
            ) : (
              filteredRepositories.map((repo) => (
                <tr
                  key={repo.id}
                  style={{
                    borderBottom: '1px solid #F1F5F9',
                    fontSize: '13px',
                    color: '#1E293B',
                    transition: 'background-color 100ms ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 600, color: '#0F172A' }}>{repo.name}</span>
                        <a
                          href={repo.html_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Open on GitHub"
                          style={{ color: '#94A3B8' }}
                        >
                          <ExternalLink size={13} />
                        </a>
                      </div>
                      <span style={{ fontSize: '11.5px', color: '#64748B' }}>{repo.owner}</span>
                    </div>
                  </td>

                  <td style={{ padding: '14px 16px', color: '#475569', fontFamily: 'monospace', fontSize: '12px' }}>
                    {repo.primary_project_path}
                  </td>

                  <td style={{ padding: '14px 16px' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        fontSize: '11px',
                        fontWeight: 600,
                        backgroundColor: '#ECFDF5',
                        color: '#059669',
                      }}
                    >
                      <CheckCircle2 size={11} />
                      Connected
                    </span>
                  </td>

                  <td style={{ padding: '14px 16px' }}>
                    {renderBadge(repo.id, 'sast', repo.modules.sast)}
                  </td>

                  <td style={{ padding: '14px 16px' }}>
                    {renderBadge(repo.id, 'sca', repo.modules.sca)}
                  </td>

                  <td style={{ padding: '14px 16px' }}>
                    {renderBadge(repo.id, 'secrets', repo.modules.secrets)}
                  </td>

                  <td style={{ padding: '14px 16px' }}>
                    {renderBadge(repo.id, 'container', repo.modules.container)}
                  </td>

                  <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                      <Link
                        href={`/code/sast`}
                        style={{
                          padding: '4px 10px',
                          fontSize: '12px',
                          fontWeight: 500,
                          backgroundColor: '#F8FAFC',
                          color: '#0F172A',
                          border: '1px solid #CBD5E1',
                          borderRadius: '5px',
                          textDecoration: 'none',
                        }}
                      >
                        Scan SAST
                      </Link>
                      <Link
                        href={`/code/dependencies`}
                        style={{
                          padding: '4px 10px',
                          fontSize: '12px',
                          fontWeight: 500,
                          backgroundColor: '#F1F5F9',
                          color: '#334155',
                          border: '1px solid #CBD5E1',
                          borderRadius: '5px',
                          textDecoration: 'none',
                        }}
                      >
                        SCA SBOM
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* GitHub Import Modal */}
      <GitHubImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImportComplete={() => {
          fetchRepositories();
          toast.success('Projects imported successfully', {
            description: 'Repositories imported and assigned to security modules.',
          });
        }}
      />
    </div>
  );
};
export default RepositoryManagementView;
