'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Boxes,
  Container,
  FolderGit2,
  Tag,
  Layers,
  Server,
  Search,
  Filter,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  ShieldAlert,
  ArrowRight,
  HardDrive,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { useScope } from '@/context/ScopeContext';
import { ContainerSecurityLayout } from './ContainerSecurityLayout';
import type { ContainerImageItem, ContainerImageListResponse } from '@/types/api/container';

interface ContainerInventoryViewProps {
  projectId?: string | null;
  initialTab?: string;
}

export const ContainerInventoryView: React.FC<ContainerInventoryViewProps> = ({
  projectId: propProjectId,
  initialTab = 'images',
}) => {
  const { currentProject } = useScope();
  const projectId = propProjectId ?? currentProject?.id ?? null;
  const [activeTab, setActiveTab] = useState(initialTab);
  const [search, setSearch] = useState('');
  const [selectedRegistry, setSelectedRegistry] = useState('All Registries');
  const [selectedStatus, setSelectedStatus] = useState('All Status');
  const [loading, setLoading] = useState(true);
  const [copiedDigest, setCopiedDigest] = useState<string | null>(null);

  // Real data state
  const [imagesData, setImagesData] = useState<ContainerImageListResponse | null>(null);
  const [workloads, setWorkloads] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [imgRes, wlRes] = await Promise.all([
        api.containers.images({
          projectId,
          search: search || undefined,
          registry: selectedRegistry !== 'All Registries' ? selectedRegistry : undefined,
          status: selectedStatus !== 'All Status' ? selectedStatus : undefined,
          pageSize: 50,
        }).catch(() => null),
        api.containers.kubernetesWorkloads({ projectId, page_size: 20 }).catch(() => null),
      ]);

      if (imgRes) setImagesData(imgRes);
      if (wlRes?.items) setWorkloads(wlRes.items);
    } catch (err) {
      console.error('Failed to load container inventory:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId, search, selectedRegistry, selectedStatus]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedDigest(text);
    setTimeout(() => setCopiedDigest(null), 2000);
  };

  // Group real repositories from active container images
  const realRepositories = useMemo(() => {
    if (!imagesData?.items?.length) return [];
    const map: Record<string, { name: string; registry: string; latest: string; tags: Set<string> }> = {};
    for (const img of imagesData.items) {
      if (!map[img.repository]) {
        map[img.repository] = {
          name: img.repository,
          registry: img.registry,
          latest: img.tag,
          tags: new Set(),
        };
      }
      map[img.repository].tags.add(img.tag);
    }
    return Object.values(map).map((r) => ({
      name: r.name,
      registry: r.registry,
      latest: r.latest,
      tags: r.tags.size,
    }));
  }, [imagesData]);

  // Aggregate real base images from active container images
  const realBaseImages = useMemo(() => {
    if (!imagesData?.items?.length) return [];
    const map: Record<string, { base: string; usedIn: number; vulns: number }> = {};
    for (const img of imagesData.items) {
      const base = img.base_image || (img.os ? `${img.os}:${img.architecture || 'latest'}` : 'alpine:latest');
      if (!map[base]) {
        map[base] = { base, usedIn: 0, vulns: 0 };
      }
      map[base].usedIn += 1;
      map[base].vulns += (img.vulnerabilities?.critical || 0) + (img.vulnerabilities?.high || 0);
    }
    return Object.values(map);
  }, [imagesData]);

  const tabs = [
    { id: 'images', label: 'Images', badge: imagesData?.total ?? 0 },
    { id: 'containers', label: 'Containers', badge: workloads.length },
    { id: 'repositories', label: 'Repositories', badge: realRepositories.length },
    { id: 'tags', label: 'Tags & Digests' },
    { id: 'base-images', label: 'Base Images', badge: realBaseImages.length },
    { id: 'workloads', label: 'Workload Inventory' },
  ];

  return (
    <ContainerSecurityLayout
      sectionTitle="Container Inventory"
      sectionDescription="Comprehensive inventory of container images, running workload instances, registries, tags, base OS templates, and digest provenance."
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '100%', boxSizing: 'border-box' }}>
        {/* Filter & Search Bar */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '8px',
            border: '1px solid #E2E8F0',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '260px' }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: '360px' }}>
              <Search
                size={14}
                style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }}
              />
              <input
                type="text"
                placeholder="Search images, tags, digests, repositories..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 10px 7px 32px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '12.5px',
                  backgroundColor: '#FFFFFF',
                }}
              />
            </div>

            <select
              value={selectedRegistry}
              onChange={(e) => setSelectedRegistry(e.target.value)}
              style={{
                padding: '7px 10px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                fontSize: '12.5px',
                backgroundColor: '#FFFFFF',
                color: '#334155',
              }}
            >
              <option value="All Registries">All Registries</option>
              {imagesData?.available_registries?.map((reg) => (
                <option key={reg} value={reg}>
                  {reg}
                </option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              style={{
                padding: '7px 10px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                fontSize: '12.5px',
                backgroundColor: '#FFFFFF',
                color: '#334155',
              }}
            >
              <option value="All Status">All Status</option>
              <option value="Healthy">Healthy</option>
              <option value="Needs Attention">Needs Attention</option>
              <option value="Vulnerable">Vulnerable</option>
            </select>
          </div>

          <button
            onClick={loadData}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 12px',
              borderRadius: '6px',
              border: '1px solid #E2E8F0',
              backgroundColor: '#FFFFFF',
              color: '#475569',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>

        {/* ── Subtab 1: Images ── */}
        {(activeTab === 'images' || activeTab === 'tags') && (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              overflow: 'hidden',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '11px', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '10px 14px', fontWeight: 600 }}>IMAGE REPOSITORY</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600 }}>TAG</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600 }}>SHA-256 DIGEST</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600 }}>REGISTRY</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600 }}>SIZE</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600 }}>VULNERABILITIES</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600 }}>STATUS</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600, textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {imagesData?.items && imagesData.items.length > 0 ? (
                  imagesData.items.map((img) => (
                    <tr
                      key={img.id}
                      style={{ borderBottom: '1px solid #F1F5F9', transition: 'background-color 120ms ease' }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: '#0F172A' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Container size={14} color="#64748B" />
                          <span>{img.repository}</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: '#0F172A' }}>
                        {img.tag}
                      </td>
                      <td style={{ padding: '10px 14px', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: '#64748B' }}>
                        {img.digest ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>{img.digest.substring(0, 19)}...</span>
                            <button
                              onClick={() => handleCopy(img.digest || '')}
                              title="Copy SHA-256 Digest"
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#94A3B8' }}
                            >
                              {copiedDigest === img.digest ? <Check size={11} color="#16A34A" /> : <Copy size={11} />}
                            </button>
                          </div>
                        ) : (
                          <span style={{ color: '#94A3B8' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#64748B' }}>
                        {img.registry}
                      </td>
                      <td style={{ padding: '10px 14px', fontFamily: 'JetBrains Mono, monospace', fontSize: '11.5px', color: '#475569' }}>
                        {img.size_formatted}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {img.vulnerabilities.critical > 0 && (
                            <span style={{ padding: '1px 5px', borderRadius: '3px', backgroundColor: '#FEE2E2', color: '#991B1B', fontSize: '10.5px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>
                              {img.vulnerabilities.critical}C
                            </span>
                          )}
                          {img.vulnerabilities.high > 0 && (
                            <span style={{ padding: '1px 5px', borderRadius: '3px', backgroundColor: '#FFEDD5', color: '#9A3412', fontSize: '10.5px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>
                              {img.vulnerabilities.high}H
                            </span>
                          )}
                          {img.vulnerabilities.medium > 0 && (
                            <span style={{ padding: '1px 5px', borderRadius: '3px', backgroundColor: '#FEF9C3', color: '#854D0E', fontSize: '10.5px', fontWeight: 600, fontFamily: 'JetBrains Mono, monospace' }}>
                              {img.vulnerabilities.medium}M
                            </span>
                          )}
                          {img.vulnerabilities.critical === 0 && img.vulnerabilities.high === 0 && img.vulnerabilities.medium === 0 && (
                            <span style={{ fontSize: '11px', color: '#16A34A', fontWeight: 600 }}>0 CVEs</span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span
                          style={{
                            padding: '2px 7px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 600,
                            backgroundColor: img.status === 'Healthy' ? '#ECFDF5' : img.status === 'Needs Attention' ? '#FFFBEB' : '#FEF2F2',
                            color: img.status === 'Healthy' ? '#047857' : img.status === 'Needs Attention' ? '#B45309' : '#B91C1C',
                            border: `1px solid ${img.status === 'Healthy' ? '#A7F3D0' : img.status === 'Needs Attention' ? '#FDE68A' : '#FECACA'}`,
                          }}
                        >
                          {img.status}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                        <Link
                          href={`/container-security/images?image_id=${encodeURIComponent(img.id)}`}
                          style={{ fontSize: '12px', color: '#2563EB', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <span>Inspect</span>
                          <ArrowRight size={12} />
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: '#94A3B8' }}>
                      No container images match current inventory filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Subtab 2: Containers / Running Workload Inventory ── */}
        {(activeTab === 'containers' || activeTab === 'workloads') && (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              overflow: 'hidden',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '11px', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '10px 14px', fontWeight: 600 }}>WORKLOAD / POD</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600 }}>NAMESPACE</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600 }}>CLUSTER</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600 }}>IMAGE IN USE</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600 }}>REPLICAS</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600 }}>RISK SCORE</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600, textAlign: 'right' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {workloads.length > 0 ? (
                  workloads.map((wl: any, idx: number) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: '#0F172A' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Boxes size={14} color="#64748B" />
                          <span>{wl.name || wl.workload_name || `workload-${idx + 1}`}</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px', fontFamily: 'JetBrains Mono, monospace', color: '#475569' }}>
                        {wl.namespace || 'default'}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#64748B' }}>
                        {wl.cluster_name || '—'}
                      </td>
                      <td style={{ padding: '10px 14px', fontFamily: 'JetBrains Mono, monospace', fontSize: '11.5px', color: '#0F172A' }}>
                        {wl.image || '—'}
                      </td>
                      <td style={{ padding: '10px 14px', fontFamily: 'JetBrains Mono, monospace', color: '#64748B' }}>
                        {wl.replicas ? `${wl.replicas} Ready` : '1 Ready'}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span
                          style={{
                            padding: '2px 7px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 700,
                            fontFamily: 'JetBrains Mono, monospace',
                            backgroundColor: wl.risk_score > 70 ? '#FEE2E2' : '#EFF6FF',
                            color: wl.risk_score > 70 ? '#991B1B' : '#1D4ED8',
                          }}
                        >
                          {wl.risk_score ? `${wl.risk_score}/100` : 'LOW RISK'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                        <Link
                          href={`/container-security/workloads?workload=${encodeURIComponent(wl.name || '')}`}
                          style={{ fontSize: '12px', color: '#2563EB', fontWeight: 600, textDecoration: 'none' }}
                        >
                          Inspect Workload &rarr;
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#94A3B8' }}>
                      No active workloads detected. Connect a Kubernetes cluster or agent.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Subtab 3: Base Images (Dynamic from Catalog) ── */}
        {activeTab === 'base-images' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            {realBaseImages.length > 0 ? (
              realBaseImages.map((b, idx) => (
                <div
                  key={idx}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Layers size={16} color="#0F172A" />
                      <span style={{ fontSize: '13.5px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: '#0F172A' }}>
                        {b.base}
                      </span>
                    </div>
                    <span style={{ fontSize: '11px', color: '#64748B' }}>{b.usedIn} image(s)</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#475569' }}>
                    Identified Vulnerabilities: <strong style={{ color: b.vulns > 0 ? '#DC2626' : '#16A34A' }}>{b.vulns} known</strong>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: '32px', textAlign: 'center', color: '#94A3B8', gridColumn: '1 / -1', backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                No base images discovered in active container catalog.
              </div>
            )}
          </div>
        )}

        {/* ── Subtab 4: Repositories (Dynamic from Catalog) ── */}
        {activeTab === 'repositories' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
            {realRepositories.length > 0 ? (
              realRepositories.map((repo, idx) => (
                <div
                  key={idx}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FolderGit2 size={16} color="#0F172A" />
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>{repo.name}</span>
                    </div>
                    <span style={{ fontSize: '11px', color: '#64748B' }}>{repo.registry}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#475569' }}>
                    Latest tag: <code style={{ color: '#0F172A', fontWeight: 600 }}>{repo.latest}</code> &bull; {repo.tags} total tag(s)
                  </div>
                  <Link
                    href={`/container-security/images?repository=${encodeURIComponent(repo.name)}`}
                    style={{ fontSize: '12px', color: '#2563EB', fontWeight: 600, textDecoration: 'none', marginTop: '6px' }}
                  >
                    View Repository Images &rarr;
                  </Link>
                </div>
              ))
            ) : (
              <div style={{ padding: '32px', textAlign: 'center', color: '#94A3B8', gridColumn: '1 / -1', backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                No container repositories registered. Connect a registry to sync images.
              </div>
            )}
          </div>
        )}
      </div>
    </ContainerSecurityLayout>
  );
};

export default ContainerInventoryView;
