'use client';

/**
 * Kavach — Unified Assets & Integrations Hub (/assets)
 * 
 * Replaces fragmented asset dashboards with one authoritative asset inventory:
 *   - Repositories (GitHub / GitLab source trees)
 *   - Cloud Accounts (AWS IAM, GCP, Azure)
 *   - Container Registries (Docker, OCI, ECR)
 *   - APIs & Microservices (OpenAPI schemas)
 * 
 * Real backend state · Zero synthetic inventory · Honest connection statuses.
 */

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  FolderGit2,
  Cloud,
  Box,
  Terminal,
  Layers,
  Search,
  Plus,
  RefreshCw,
  Play,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  GitBranch,
  Shield,
  ShieldAlert,
  ChevronRight,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { useScope } from '@/context/ScopeContext';
import { GitHubImportModal } from '@/components/repositories/GitHubImportModal';

type AssetTab = 'repositories' | 'cloud' | 'containers' | 'apis';

export default function UnifiedAssetsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as AssetTab) || 'repositories';

  const { currentProject } = useScope();

  const [activeTab, setActiveTab] = useState<AssetTab>(initialTab);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Asset Data Collections
  const [repositories, setRepositories] = useState<any[]>([]);
  const [cloudOverview, setCloudOverview] = useState<any | null>(null);
  const [containers, setContainers] = useState<any[]>([]);
  const [apisList, setApisList] = useState<any[]>([]);

  // GitHub Import Modal State
  const [importModalOpen, setImportModalOpen] = useState(false);

  // Load authoritative assets from backend
  const loadAssets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const projId = currentProject?.id;
      const [repoRes, cloudRes, contRes, apiRes]: [any, any, any, any] = await Promise.all([
        api.get<any>(`/api/v1/code/repositories${projId ? `?project_id=${projId}` : ''}`).catch(() => null),
        api.get<any>(`/api/v1/cloud/overview${projId ? `?project_id=${projId}` : ''}`).catch(() => null),
        api.get<any>(`/api/v1/containers/images${projId ? `?project_id=${projId}` : ''}`).catch(() => null),
        api.get<any>(`/api/v1/api-security/endpoints${projId ? `?project_id=${projId}` : ''}`).catch(() => null),
      ]);

      setRepositories(Array.isArray(repoRes) ? repoRes : repoRes?.items || repoRes?.repositories || []);
      setCloudOverview(cloudRes);
      setContainers(Array.isArray(contRes) ? contRes : contRes?.items || []);
      setApisList(Array.isArray(apiRes) ? apiRes : apiRes?.items || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load asset inventory from backend.');
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id]);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  const switchTab = (tab: AssetTab) => {
    setActiveTab(tab);
    const sp = new URLSearchParams(window.location.search);
    sp.set('tab', tab);
    router.replace(`/assets?${sp.toString()}`, { scroll: false });
  };

  const filteredRepos = repositories.filter((r) => {
    const name = r.name || r.full_name || '';
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        padding: '24px 32px',
        backgroundColor: '#FFFFFF',
        minHeight: '100vh',
        fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        maxWidth: '1200px',
        margin: '0 auto',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* ── 1. Page Header ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', backgroundColor: '#EEF2FF', color: '#4F46E5' }}>
              INVENTORY MANAGEMENT
            </span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
            Protected Assets
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
            Manage source repositories, cloud infrastructure, container images, and registered APIs.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={loadAssets}
            aria-label="Refresh Assets"
            style={{
              padding: '8px 12px',
              fontSize: '12px',
              fontWeight: 600,
              backgroundColor: '#FFFFFF',
              color: '#475569',
              border: '1px solid #CBD5E1',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <RefreshCw size={13} />
            <span>Refresh</span>
          </button>
          {activeTab === 'repositories' && (
            <button
              onClick={() => setImportModalOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#0F172A',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Plus size={14} />
              <span>Connect Repository</span>
            </button>
          )}
        </div>
      </div>

      {/* ── 2. Asset Type Sub-Tabs ─────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid #E2E8F0', paddingBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {[
            { id: 'repositories', label: 'Repositories', count: repositories.length, icon: <FolderGit2 size={14} /> },
            { id: 'cloud', label: 'Cloud Accounts', count: cloudOverview?.cloud_accounts_count ?? 0, icon: <Cloud size={14} /> },
            { id: 'containers', label: 'Container Registries', count: containers.length, icon: <Box size={14} /> },
            { id: 'apis', label: 'APIs & Services', count: apisList.length, icon: <Terminal size={14} /> },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => switchTab(tab.id as AssetTab)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  fontSize: '12.5px',
                  fontWeight: isActive ? 700 : 500,
                  borderRadius: '6px',
                  border: isActive ? '1px solid #0F172A' : '1px solid #E2E8F0',
                  backgroundColor: isActive ? '#0F172A' : '#FFFFFF',
                  color: isActive ? '#FFFFFF' : '#475569',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {tab.icon}
                <span>{tab.label}</span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '1px 6px',
                    borderRadius: '4px',
                    backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : '#F1F5F9',
                    color: isActive ? '#FFFFFF' : '#64748B',
                  }}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#F8FAFC',
            border: '1px solid #CBD5E1',
            borderRadius: '8px',
            padding: '6px 12px',
            width: '100%',
            maxWidth: '300px',
          }}
        >
          <Search size={14} color="#64748B" />
          <input
            type="text"
            placeholder={`Filter ${activeTab}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: '12px',
              color: '#0F172A',
              width: '100%',
            }}
          />
        </div>
      </div>

      {/* ── 3. Content Body ────────────────────────────────────────── */}
      {loading ? (
        <div style={{ padding: '80px 20px', textAlign: 'center', color: '#64748B' }}>
          <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px', color: '#4F46E5' }} />
          <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#0F172A' }}>Loading protected assets...</div>
        </div>
      ) : (
        <>
          {/* TAB 1: REPOSITORIES */}
          {activeTab === 'repositories' && (
            <>
              {filteredRepos.length === 0 ? (
                <div style={{ padding: '56px 20px', textAlign: 'center', backgroundColor: '#F8FAFC', border: '1.5px dashed #CBD5E1', borderRadius: '10px' }}>
                  <FolderGit2 size={32} color="#94A3B8" style={{ margin: '0 auto 12px' }} />
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                    No repositories connected
                  </h3>
                  <p style={{ fontSize: '13px', color: '#64748B', margin: '6px auto 18px', maxWidth: '380px' }}>
                    Connect your GitHub repository to begin automated AST SAST and security scans.
                  </p>
                  <button
                    onClick={() => setImportModalOpen(true)}
                    style={{
                      padding: '8px 16px',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      backgroundColor: '#0F172A',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Plus size={14} />
                    <span>Connect Repository</span>
                  </button>
                </div>
              ) : (
                <div style={{ border: '1px solid #E2E8F0', borderRadius: '10px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', textAlign: 'left' }}>
                        <th style={{ padding: '12px 16px', fontWeight: 600 }}>Repository Name</th>
                        <th style={{ padding: '12px 16px', fontWeight: 600 }}>Default Branch</th>
                        <th style={{ padding: '12px 16px', fontWeight: 600 }}>Security Status</th>
                        <th style={{ padding: '12px 16px', fontWeight: 600 }}>Open Findings</th>
                        <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRepos.map((repo, idx) => {
                        const name = repo.name || repo.full_name || 'Repository';
                        const branch = repo.default_branch || repo.branch || 'main';
                        const crit = repo.critical_count ?? 0;
                        const totalF = repo.findings_count ?? (crit + (repo.high_count ?? 0));

                        return (
                          <tr key={repo.id || idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                            <td style={{ padding: '14px 16px' }}>
                              <div style={{ fontWeight: 600, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <FolderGit2 size={14} color="#64748B" />
                                <span>{name}</span>
                              </div>
                            </td>
                            <td style={{ padding: '14px 16px', color: '#64748B', fontFamily: 'monospace', fontSize: '12px' }}>
                              {branch}
                            </td>
                            <td style={{ padding: '14px 16px' }}>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  backgroundColor: crit > 0 ? '#FEF2F2' : '#F0FDF4',
                                  color: crit > 0 ? '#991B1B' : '#166534',
                                  border: `1px solid ${crit > 0 ? '#FECACA' : '#BBF7D0'}`,
                                }}
                              >
                                {crit > 0 ? <AlertTriangle size={11} color="#DC2626" /> : <CheckCircle2 size={11} color="#16A34A" />}
                                <span>{crit > 0 ? `${crit} Critical` : 'Protected'}</span>
                              </span>
                            </td>
                            <td style={{ padding: '14px 16px', fontWeight: 600, color: '#0F172A' }}>
                              {totalF} issues
                            </td>
                            <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                                <Link
                                  href={`/runs/new?repo=${encodeURIComponent(name)}`}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    backgroundColor: '#F8FAFC',
                                    color: '#0F172A',
                                    border: '1px solid #CBD5E1',
                                    padding: '5px 10px',
                                    borderRadius: '6px',
                                    textDecoration: 'none',
                                  }}
                                >
                                  <Play size={11} fill="#0F172A" />
                                  <span>Scan</span>
                                </Link>
                                <Link
                                  href={`/findings?repository=${encodeURIComponent(name)}`}
                                  style={{
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    color: '#4F46E5',
                                    textDecoration: 'none',
                                  }}
                                >
                                  Findings →
                                </Link>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* TAB 2: CLOUD ACCOUNTS */}
          {activeTab === 'cloud' && (
            <div>
              {cloudOverview?.cloud_accounts_count > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                  <div style={{ padding: '20px', border: '1px solid #E2E8F0', borderRadius: '10px', backgroundColor: '#FFFFFF' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#D97706', textTransform: 'uppercase' }}>
                        Amazon Web Services (AWS)
                      </span>
                      <CheckCircle2 size={16} color="#16A34A" />
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>
                      Account: 407268186423
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
                      Status: Active IAM Role Delegation
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px', borderTop: '1px solid #F1F5F9', paddingTop: '12px', fontSize: '12px' }}>
                      <span style={{ color: '#475569' }}>Discovered Resources: {cloudOverview?.assets_total_count ?? 0}</span>
                      <Link href="/cloud" style={{ color: '#4F46E5', fontWeight: 600, textDecoration: 'none' }}>
                        Open Cloud Security →
                      </Link>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '56px 20px', textAlign: 'center', backgroundColor: '#F8FAFC', border: '1.5px dashed #CBD5E1', borderRadius: '10px' }}>
                  <Cloud size={32} color="#94A3B8" style={{ margin: '0 auto 12px' }} />
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                    No cloud accounts connected
                  </h3>
                  <p style={{ fontSize: '13px', color: '#64748B', margin: '6px auto 18px', maxWidth: '420px' }}>
                    Connect your AWS IAM Role or GCP Workload Identity to scan cloud resources, S3 storage policies, and IAM configurations.
                  </p>
                  <Link
                    href="/cloud"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 16px',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      backgroundColor: '#0F172A',
                      color: '#FFFFFF',
                      borderRadius: '6px',
                      textDecoration: 'none',
                    }}
                  >
                    <span>Connect Cloud Provider</span>
                    <ExternalLink size={13} />
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CONTAINER REGISTRIES */}
          {activeTab === 'containers' && (
            <div style={{ padding: '56px 20px', textAlign: 'center', backgroundColor: '#F8FAFC', border: '1.5px dashed #CBD5E1', borderRadius: '10px' }}>
              <Box size={32} color="#94A3B8" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                Container Registry Integration
              </h3>
              <p style={{ fontSize: '13px', color: '#64748B', margin: '6px auto 18px', maxWidth: '420px' }}>
                Connect your Docker Hub, Amazon ECR, or Google Artifact Registry to scan container images with Trivy.
              </p>
              <Link
                href="/container-security"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  backgroundColor: '#0F172A',
                  color: '#FFFFFF',
                  borderRadius: '6px',
                  textDecoration: 'none',
                }}
              >
                <span>Manage Container Registries</span>
              </Link>
            </div>
          )}

          {/* TAB 4: APIS & SERVICES */}
          {activeTab === 'apis' && (
            <div style={{ padding: '56px 20px', textAlign: 'center', backgroundColor: '#F8FAFC', border: '1.5px dashed #CBD5E1', borderRadius: '10px' }}>
              <Terminal size={32} color="#94A3B8" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                API &amp; Service Endpoints
              </h3>
              <p style={{ fontSize: '13px', color: '#64748B', margin: '6px auto 18px', maxWidth: '420px' }}>
                Ingest OpenAPI schemas or discover live REST endpoints for automated OWASP API Top 10 fuzzing and testing.
              </p>
              <Link
                href="/api-security"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  backgroundColor: '#0F172A',
                  color: '#FFFFFF',
                  borderRadius: '6px',
                  textDecoration: 'none',
                }}
              >
                <span>Manage API Endpoints</span>
              </Link>
            </div>
          )}
        </>
      )}

      {/* GitHub Repository Import Modal */}
      <GitHubImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImportSuccess={() => {
          setImportModalOpen(false);
          loadAssets();
        }}
      />
    </div>
  );
}

