'use client';

/**
 * Kavach — IaC Security: Repositories & Coverage (/code/iac/repositories)
 * Screen 02: Connected Repositories, Detected IaC Technologies, Discovered File Counts,
 * Coverage Metrics, and Onboarding Actions.
 */

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  FolderGit2,
  Search,
  Filter,
  RefreshCw,
  Plus,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Play,
  Layers,
  FileCode2,
  ExternalLink,
  CheckCircle2,
  Clock,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { useScope } from '@/context/ScopeContext';

interface RepoCoverageItem {
  id: string;
  name: string;
  full_name: string;
  git_provider: string;
  default_branch: string;
  detected_technologies: string[];
  discovered_file_counts: {
    terraform: number;
    kubernetes: number;
    helm: number;
    cloudformation: number;
    total: number;
  };
  scan_coverage_pct: number;
  health_score: number;
  health_label: string;
  open_findings: number;
  critical_findings: number;
  high_findings: number;
  integration_status: string;
  last_scan_timestamp: string;
  last_scan_status: string;
}

export default function IaCRepositoriesPage() {
  const { currentRepository } = useScope();
  const [repositories, setRepositories] = useState<RepoCoverageItem[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [techFilter, setTechFilter] = useState('All');
  const [healthFilter, setHealthFilter] = useState('All');
  const [scanningRepoId, setScanningRepoId] = useState<string | null>(null);
  const [onboardModalOpen, setOnboardModalOpen] = useState(false);
  const [newRepoInput, setNewRepoInput] = useState('');
  const [onboardLoading, setOnboardLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchRepositories = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (techFilter !== 'All') params.set('framework', techFilter);
      if (healthFilter !== 'All') params.set('health', healthFilter);

      const res = await api.get(`/api/v1/iac/repositories-coverage?${params.toString()}`);
      if (res && res.repositories) {
        setRepositories(res.repositories);
        setStats(res.stats);
      }
    } catch (err) {
      console.error('Failed to load IaC repositories:', err);
    } finally {
      setLoading(false);
    }
  }, [search, techFilter, healthFilter]);

  useEffect(() => {
    fetchRepositories();
  }, [fetchRepositories]);

  const handleTriggerScan = async (repoName: string) => {
    setScanningRepoId(repoName);
    try {
      await api.post('/api/v1/iac/scan', {
        repository_id: repoName,
        branch: 'main',
        frameworks: ['terraform', 'kubernetes', 'helm'],
      });
      setToastMessage(`Scan job queued for ${repoName}`);
      setTimeout(() => setToastMessage(null), 4000);
      await fetchRepositories();
    } catch (err: any) {
      alert(`Scan failed to trigger: ${err.message || 'Unknown error'}`);
    } finally {
      setScanningRepoId(null);
    }
  };

  const handleOnboardRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRepoInput.trim()) return;
    setOnboardLoading(true);
    try {
      const res = await api.post('/api/v1/iac/repositories/onboard', {
        repository_id: newRepoInput.trim(),
        auto_scan: true,
      });
      setToastMessage(res.message || 'Repository onboarded successfully');
      setTimeout(() => setToastMessage(null), 5000);
      setOnboardModalOpen(false);
      setNewRepoInput('');
      await fetchRepositories();
    } catch (err: any) {
      alert(`Onboarding error: ${err.message || 'Check repository access'}`);
    } finally {
      setOnboardLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#F8FAFC', minHeight: '100vh', padding: '24px 32px' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            backgroundColor: '#0F172A',
            color: '#FFFFFF',
            padding: '12px 20px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
            zIndex: 1000,
          }}
        >
          <CheckCircle2 size={16} color="#10B981" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#2563EB',
                backgroundColor: '#EFF6FF',
                border: '1px solid #DBEAFE',
                borderRadius: '4px',
                padding: '2px 6px',
                textTransform: 'uppercase',
              }}
            >
              IaC Security
            </span>
            <span style={{ fontSize: '12px', color: '#64748B' }}>/</span>
            <span style={{ fontSize: '12px', color: '#64748B' }}>Workspace</span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
            Repositories &amp; Coverage
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
            Connected Git repositories, detected Infrastructure-as-Code technologies, discovered manifest counts, and scanning coverage.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => fetchRepositories()}
            disabled={loading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              backgroundColor: '#FFFFFF',
              color: '#334155',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>

          <button
            onClick={() => setOnboardModalOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#2563EB',
              color: '#FFFFFF',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(37,99,235,0.2)',
            }}
          >
            <Plus size={14} />
            Connect Repository
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {stats && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
            marginBottom: '24px',
          }}
        >
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '16px' }}>
            <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>Connected Repositories</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', marginTop: '6px' }}>
              {stats.total_repositories}
            </div>
            <div style={{ fontSize: '11px', color: '#10B981', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <CheckCircle2 size={12} /> Real GitHub &amp; SCM Integrations
            </div>
          </div>

          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '16px' }}>
            <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>Discovered IaC Files</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', marginTop: '6px' }}>
              {stats.total_iac_files}
            </div>
            <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
              Terraform, K8s, Helm &amp; CFN
            </div>
          </div>

          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '16px' }}>
            <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>Average IaC Coverage</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#2563EB', marginTop: '6px' }}>
              {stats.average_coverage_pct}%
            </div>
            <div style={{ width: '100%', height: '4px', backgroundColor: '#E2E8F0', borderRadius: '2px', marginTop: '8px', overflow: 'hidden' }}>
              <div style={{ width: `${stats.average_coverage_pct}%`, height: '100%', backgroundColor: '#2563EB' }} />
            </div>
          </div>

          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '16px' }}>
            <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>Infrastructure Health Score</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: stats.average_health_score >= 80 ? '#10B981' : '#F59E0B', marginTop: '6px' }}>
              {stats.average_health_score}/100
            </div>
            <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
              Deterministic risk assessment
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '16px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ position: 'relative', flex: '1', minWidth: '240px' }}>
          <Search size={14} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search repositories by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 34px',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              backgroundColor: '#FFFFFF',
              fontSize: '13px',
              color: '#0F172A',
              outline: 'none',
            }}
          />
        </div>

        <select
          value={techFilter}
          onChange={(e) => setTechFilter(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: '8px',
            border: '1px solid #E2E8F0',
            backgroundColor: '#FFFFFF',
            fontSize: '13px',
            color: '#334155',
            outline: 'none',
          }}
        >
          <option value="All">All Frameworks</option>
          <option value="Terraform">Terraform</option>
          <option value="Kubernetes YAML">Kubernetes YAML</option>
          <option value="Helm">Helm</option>
          <option value="CloudFormation">CloudFormation</option>
        </select>

        <select
          value={healthFilter}
          onChange={(e) => setHealthFilter(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: '8px',
            border: '1px solid #E2E8F0',
            backgroundColor: '#FFFFFF',
            fontSize: '13px',
            color: '#334155',
            outline: 'none',
          }}
        >
          <option value="All">All Health Statuses</option>
          <option value="Healthy">Healthy</option>
          <option value="At Risk">At Risk</option>
          <option value="Critical">Critical</option>
        </select>
      </div>

      {/* Repositories Table */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '10px',
          border: '1px solid #E2E8F0',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontWeight: 600 }}>
                <th style={{ padding: '12px 16px' }}>Repository</th>
                <th style={{ padding: '12px 16px' }}>Detected Technologies</th>
                <th style={{ padding: '12px 16px' }}>IaC Files</th>
                <th style={{ padding: '12px 16px' }}>Coverage</th>
                <th style={{ padding: '12px 16px' }}>Health Score</th>
                <th style={{ padding: '12px 16px' }}>Open Findings</th>
                <th style={{ padding: '12px 16px' }}>Last Scan</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
                    <RefreshCw size={18} className="animate-spin" style={{ margin: '0 auto 8px auto', color: '#2563EB' }} />
                    Loading repository coverage...
                  </td>
                </tr>
              ) : repositories.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '48px', textAlign: 'center', color: '#64748B' }}>
                    <FolderGit2 size={32} style={{ margin: '0 auto 12px auto', color: '#94A3B8' }} />
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>No matching repositories found</div>
                    <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px' }}>
                      Connect a repository or clear your search filters.
                    </div>
                  </td>
                </tr>
              ) : (
                repositories.map((repo) => (
                  <tr
                    key={repo.id}
                    style={{
                      borderBottom: '1px solid #F1F5F9',
                      transition: 'background-color 0.1s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                  >
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FolderGit2 size={16} color="#2563EB" />
                        <div>
                          <div style={{ fontWeight: 600, color: '#0F172A' }}>{repo.name}</div>
                          <div style={{ fontSize: '11px', color: '#64748B' }}>{repo.git_provider} • {repo.default_branch}</div>
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {repo.detected_technologies.map((t) => (
                          <span
                            key={t}
                            style={{
                              fontSize: '11px',
                              fontWeight: 600,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: '#F1F5F9',
                              color: '#334155',
                              border: '1px solid #E2E8F0',
                            }}
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontWeight: 600, color: '#0F172A' }}>
                        {repo.discovered_file_counts.total}
                      </span>
                      <span style={{ fontSize: '11px', color: '#64748B', marginLeft: '4px' }}>manifests</span>
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '70px', height: '6px', backgroundColor: '#E2E8F0', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${repo.scan_coverage_pct}%`, height: '100%', backgroundColor: '#2563EB' }} />
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A' }}>
                          {repo.scan_coverage_pct}%
                        </span>
                      </div>
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '9999px',
                          backgroundColor: repo.health_score >= 80 ? '#ECFDF5' : (repo.health_score >= 50 ? '#FFFBEB' : '#FEF2F2'),
                          color: repo.health_score >= 80 ? '#059669' : (repo.health_score >= 50 ? '#D97706' : '#DC2626'),
                          border: `1px solid ${repo.health_score >= 80 ? '#A7F3D0' : (repo.health_score >= 50 ? '#FDE68A' : '#FECACA')}`,
                        }}
                      >
                        {repo.health_label} ({repo.health_score})
                      </span>
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      {repo.critical_findings > 0 ? (
                        <span style={{ color: '#DC2626', fontWeight: 700, fontSize: '12px' }}>
                          {repo.critical_findings} Critical, {repo.high_findings} High
                        </span>
                      ) : repo.open_findings > 0 ? (
                        <span style={{ color: '#D97706', fontWeight: 600, fontSize: '12px' }}>
                          {repo.open_findings} Findings
                        </span>
                      ) : (
                        <span style={{ color: '#059669', fontWeight: 600, fontSize: '12px' }}>
                          0 Open
                        </span>
                      )}
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontSize: '12px', color: '#0F172A' }}>{repo.last_scan_status}</div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>
                        {new Date(repo.last_scan_timestamp).toLocaleDateString()}
                      </div>
                    </td>

                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          onClick={() => handleTriggerScan(repo.name)}
                          disabled={scanningRepoId === repo.name}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '5px 10px',
                            borderRadius: '6px',
                            border: '1px solid #E2E8F0',
                            backgroundColor: '#FFFFFF',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: '#2563EB',
                            cursor: 'pointer',
                          }}
                        >
                          <Play size={12} className={scanningRepoId === repo.name ? 'animate-spin' : ''} />
                          {scanningRepoId === repo.name ? 'Scanning' : 'Scan'}
                        </button>

                        <Link
                          href={`/code/iac/inventory?repository=${encodeURIComponent(repo.name)}`}
                          style={{
                            padding: '5px 10px',
                            borderRadius: '6px',
                            border: '1px solid #E2E8F0',
                            backgroundColor: '#F8FAFC',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: '#334155',
                            textDecoration: 'none',
                          }}
                        >
                          View Inventory
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Onboard Modal */}
      {onboardModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999,
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              padding: '24px',
              width: '100%',
              maxWidth: '480px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            }}
          >
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
              Connect Repository for IaC Security
            </h2>
            <p style={{ fontSize: '13px', color: '#64748B', marginTop: '6px' }}>
              Kavach will automatically discover Terraform, Kubernetes manifests, Helm charts, and CloudFormation files, and run an initial baseline scan.
            </p>

            <form onSubmit={handleOnboardRepo} style={{ marginTop: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Repository Identifier or GitHub URL
              </label>
              <input
                type="text"
                required
                placeholder="e.g. org/infrastructure-terraform"
                value={newRepoInput}
                onChange={(e) => setNewRepoInput(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setOnboardModalOpen(false)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    backgroundColor: '#FFFFFF',
                    color: '#64748B',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={onboardLoading}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#2563EB',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: onboardLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {onboardLoading ? 'Discovering...' : 'Discover & Onboard'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
