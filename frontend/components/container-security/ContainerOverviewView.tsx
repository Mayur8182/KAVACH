'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Shield,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Search,
  Filter,
  ArrowRight,
  HardDrive,
  Activity,
  Play,
  Layers,
  Container,
  ExternalLink,
  ChevronRight,
  Eye,
  Check,
  Copy,
  Plus,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { useScope } from '@/context/ScopeContext';
import { ContainerSecurityLayout } from './ContainerSecurityLayout';
import { CveDetailModal, CveDetailData } from '@/components/security/CveDetailModal';
import { ReachabilityAnalysisModal } from '@/components/security/ReachabilityAnalysisModal';
import type {
  ContainerSummaryResponse,
  ContainerImageListResponse,
  ContainerImageItem,
  ContainerRegistryItem,
} from '@/types/api/container';

interface ContainerOverviewViewProps {
  projectId?: string | null;
}

export const ContainerOverviewView: React.FC<ContainerOverviewViewProps> = ({ projectId: propProjectId }) => {
  const { currentProject } = useScope();
  const projectId = propProjectId ?? currentProject?.id ?? null;

  const [summary, setSummary] = useState<ContainerSummaryResponse | null>(null);
  const [imagesData, setImagesData] = useState<ContainerImageListResponse | null>(null);
  const [registries, setRegistries] = useState<ContainerRegistryItem[]>([]);
  const [runtimeEvents, setRuntimeEvents] = useState<any[]>([]);
  const [scanCharts, setScanCharts] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // CVE detail & reachability modal
  const [selectedCve, setSelectedCve] = useState<CveDetailData | null>(null);
  const [selectedReachabilityCve, setSelectedReachabilityCve] = useState<string | null>(null);
  const [copiedDigest, setCopiedDigest] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [sumRes, imgRes, regRes, eventsRes, chartsRes] = await Promise.all([
        api.containers.summary(projectId).catch(() => null),
        api.containers.images({ projectId, pageSize: 8 }).catch(() => null),
        api.containers.registries(projectId).catch(() => null),
        api.containers.runtimeEvents({ projectId, pageSize: 6 }).catch(() => null),
        api.containers.scanCharts(projectId).catch(() => null),
      ]);

      if (sumRes) setSummary(sumRes);
      if (imgRes) setImagesData(imgRes);
      if (regRes?.items) setRegistries(regRes.items);
      if (eventsRes?.items) setRuntimeEvents(eventsRes.items);
      if (chartsRes) setScanCharts(chartsRes);
    } catch (err) {
      console.error('Failed to load container overview:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedDigest(text);
    setTimeout(() => setCopiedDigest(null), 2000);
  };

  const dailyScans = scanCharts?.daily_scans || [];

  return (
    <ContainerSecurityLayout
      sectionTitle="Overview"
      sectionDescription="Real-time container posture: image inventory, CVE distribution, connected registries, and deterministic scanner engine status."
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* ── 1. KPI Metric StatCards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          {/* Card 1: Total Images */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              padding: '18px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', letterSpacing: '0.04em' }}>
                TOTAL IMAGES AUDITED
              </span>
              <Container size={16} color="#64748B" />
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '28px', fontWeight: 700, color: '#0F172A', fontFamily: 'JetBrains Mono, monospace' }}>
                {summary?.total_images?.value ?? imagesData?.total ?? 0}
              </span>
              <span style={{ fontSize: '11px', color: '#16A34A', fontWeight: 600 }}>
                {summary?.total_images?.trend_text || (imagesData?.total ? 'Active registry sync' : '0 discovered')}
              </span>
            </div>
            <div style={{ fontSize: '11.5px', color: '#64748B' }}>
              Across {registries.length} connected {registries.length === 1 ? 'registry' : 'registries'}
            </div>
          </div>

          {/* Card 2: Vulnerable Images */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              padding: '18px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', letterSpacing: '0.04em' }}>
                VULNERABLE IMAGES
              </span>
              <AlertTriangle size={16} color="#D97706" />
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '28px', fontWeight: 700, color: '#D97706', fontFamily: 'JetBrains Mono, monospace' }}>
                {summary?.vulnerable_images?.value ?? 0}
              </span>
              <span style={{ fontSize: '11px', color: '#D97706', fontWeight: 600 }}>
                {(summary?.vulnerable_images?.value ?? 0) > 0 ? 'Requires triage' : 'All images clean'}
              </span>
            </div>
            <div style={{ fontSize: '11.5px', color: '#64748B' }}>
              Images containing at least 1 unresolved CVE
            </div>
          </div>

          {/* Card 3: Critical Findings */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              padding: '18px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', letterSpacing: '0.04em' }}>
                CRITICAL VULNERABILITIES
              </span>
              <ShieldAlert size={16} color="#DC2626" />
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '28px', fontWeight: 700, color: '#DC2626', fontFamily: 'JetBrains Mono, monospace' }}>
                {summary?.critical_findings?.value ?? 0}
              </span>
              <span style={{ fontSize: '11px', color: (summary?.critical_findings?.value ?? 0) > 0 ? '#DC2626' : '#16A34A', fontWeight: 600 }}>
                {(summary?.critical_findings?.value ?? 0) > 0 ? 'High Exploitation Risk' : 'Zero Critical'}
              </span>
            </div>
            <div style={{ fontSize: '11.5px', color: '#64748B' }}>
              CVSS 9.0–10.0 or active CISA KEV catalog
            </div>
          </div>

          {/* Card 4: High Findings */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              padding: '18px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', letterSpacing: '0.04em' }}>
                HIGH FINDINGS
              </span>
              <Shield size={16} color="#EA580C" />
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '28px', fontWeight: 700, color: '#EA580C', fontFamily: 'JetBrains Mono, monospace' }}>
                {summary?.high_findings?.value ?? 0}
              </span>
              <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>
                CVSS 7.0–8.9
              </span>
            </div>
            <div style={{ fontSize: '11.5px', color: '#64748B' }}>
              Fix patches available in upstream package feeds
            </div>
          </div>
        </div>

        {/* ── 2. Scan Activity & Registry Coverage Grid ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '20px' }}>
          {/* Box A: Scan Activity Breakdown */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Container Scan Activity
                </h3>
                <div style={{ fontSize: '12px', color: '#64748B' }}>
                  Execution frequency with Trivy scanner engine
                </div>
              </div>
              <Link
                href="/container-security/images"
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#2563EB',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span>Scanned Images</span>
                <ChevronRight size={13} />
              </Link>
            </div>

            {dailyScans.length > 0 ? (
              <div
                style={{
                  height: '140px',
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: '8px',
                  paddingTop: '16px',
                  borderBottom: '1px solid #F1F5F9',
                }}
              >
                {dailyScans.map((item: any, idx: number) => (
                  <div
                    key={idx}
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                      height: '100%',
                      justifyContent: 'flex-end',
                    }}
                    title={`${item.date || `Day ${idx + 1}`}: ${item.count || 0} scans`}
                  >
                    <div
                      style={{
                        width: '100%',
                        height: `${Math.max(10, Math.min(100, ((item.count || 1) / 20) * 100))}%`,
                        backgroundColor: '#0F172A',
                        borderRadius: '3px 3px 0 0',
                      }}
                    />
                    <span style={{ fontSize: '9px', color: '#94A3B8', fontFamily: 'JetBrains Mono, monospace' }}>
                      {item.label || `${idx + 1}`}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div
                style={{
                  height: '120px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#F8FAFC',
                  borderRadius: '6px',
                  border: '1px dashed #CBD5E1',
                  padding: '16px',
                  textAlign: 'center',
                  gap: '6px',
                }}
              >
                <Container size={20} color="#94A3B8" />
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                  No automated scans run yet for this workspace
                </span>
                <span style={{ fontSize: '11px', color: '#94A3B8' }}>
                  Run an on-demand scan or connect a registry to generate deterministic CVE reports.
                </span>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11.5px', color: '#64748B' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#0F172A' }} />
                <span>Deterministic Trivy / Syft Scans</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#10B981' }} />
                <span>Continuous Registry Sync</span>
              </div>
            </div>
          </div>

          {/* Box B: Registry Coverage Breakdown (REAL DATA ONLY) ── */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Connected Registries
                </h3>
                <div style={{ fontSize: '12px', color: '#64748B' }}>
                  OCI registries configured with continuous sync
                </div>
              </div>
              <Link
                href="/container-security/images?tab=registries"
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#2563EB',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span>View Registries</span>
                <ChevronRight size={13} />
              </Link>
            </div>

            {registries.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {registries.map((reg) => (
                  <div
                    key={reg.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      backgroundColor: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <HardDrive size={16} color="#0F172A" />
                      <div>
                        <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#0F172A' }}>{reg.name}</div>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>
                          {reg.provider} &bull; {reg.images_count || 0} active images
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          backgroundColor: reg.status === 'CONNECTED' ? '#ECFDF5' : '#F1F5F9',
                          color: reg.status === 'CONNECTED' ? '#059669' : '#64748B',
                          border: `1px solid ${reg.status === 'CONNECTED' ? '#A7F3D0' : '#E2E8F0'}`,
                          fontFamily: 'JetBrains Mono, monospace',
                        }}
                      >
                        {reg.status || 'NOT CONFIGURED'}
                      </span>
                      <span style={{ fontSize: '11px', color: '#94A3B8' }}>{reg.last_synced_formatted || 'Synced'}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#F8FAFC',
                  borderRadius: '6px',
                  border: '1px dashed #CBD5E1',
                  padding: '20px',
                  textAlign: 'center',
                  gap: '8px',
                }}
              >
                <HardDrive size={22} color="#94A3B8" />
                <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#334155' }}>
                  No container registries connected
                </span>
                <span style={{ fontSize: '11.5px', color: '#64748B', maxWidth: '320px' }}>
                  Authenticate Docker Hub, AWS ECR, Azure ACR, or Google Artifact Registry to discover your production images.
                </span>
                <Link
                  href="/container-security/images?tab=registries"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginTop: '4px',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    backgroundColor: '#0F172A',
                    color: '#FFFFFF',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  <Plus size={12} />
                  <span>Connect Registry</span>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* ── 3. Container Images Inventory Snapshot ── */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '8px',
            border: '1px solid #E2E8F0',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                Audited Container Images
              </h3>
              <div style={{ fontSize: '12px', color: '#64748B' }}>
                Deep layer vulnerability breakdown, base OS posture, and digests
              </div>
            </div>
            <Link
              href="/container-security/images"
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#2563EB',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span>Explore All Images</span>
              <ChevronRight size={13} />
            </Link>
          </div>

          {/* High-density Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '11px', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '8px 12px', fontWeight: 600 }}>IMAGE REPOSITORY</th>
                  <th style={{ padding: '8px 12px', fontWeight: 600 }}>TAG / DIGEST</th>
                  <th style={{ padding: '8px 12px', fontWeight: 600 }}>REGISTRY</th>
                  <th style={{ padding: '8px 12px', fontWeight: 600 }}>VULNERABILITIES</th>
                  <th style={{ padding: '8px 12px', fontWeight: 600 }}>STATUS</th>
                  <th style={{ padding: '8px 12px', fontWeight: 600 }}>LAST SCAN</th>
                  <th style={{ padding: '8px 12px', fontWeight: 600, textAlign: 'right' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {imagesData?.items && imagesData.items.length > 0 ? (
                  imagesData.items.map((img: ContainerImageItem) => (
                    <tr
                      key={img.id}
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                        transition: 'background-color 120ms ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <td style={{ padding: '10px 12px', fontWeight: 600, color: '#0F172A' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Container size={14} color="#64748B" />
                          <span>{img.repository}</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px', fontFamily: 'JetBrains Mono, monospace', color: '#475569' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 600, color: '#0F172A' }}>{img.tag}</span>
                          {img.digest && (
                            <button
                              onClick={() => handleCopy(img.digest || '')}
                              title="Copy SHA-256 Digest"
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#94A3B8' }}
                            >
                              {copiedDigest === img.digest ? <Check size={11} color="#16A34A" /> : <Copy size={11} />}
                            </button>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px', color: '#64748B' }}>
                        {img.registry}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {img.vulnerabilities.critical > 0 && (
                            <span
                              style={{
                                padding: '1px 5px',
                                borderRadius: '3px',
                                backgroundColor: '#FEE2E2',
                                color: '#991B1B',
                                fontSize: '10.5px',
                                fontWeight: 700,
                                fontFamily: 'JetBrains Mono, monospace',
                              }}
                            >
                              {img.vulnerabilities.critical}C
                            </span>
                          )}
                          {img.vulnerabilities.high > 0 && (
                            <span
                              style={{
                                padding: '1px 5px',
                                borderRadius: '3px',
                                backgroundColor: '#FFEDD5',
                                color: '#9A3412',
                                fontSize: '10.5px',
                                fontWeight: 700,
                                fontFamily: 'JetBrains Mono, monospace',
                              }}
                            >
                              {img.vulnerabilities.high}H
                            </span>
                          )}
                          {img.vulnerabilities.medium > 0 && (
                            <span
                              style={{
                                padding: '1px 5px',
                                borderRadius: '3px',
                                backgroundColor: '#FEF9C3',
                                color: '#854D0E',
                                fontSize: '10.5px',
                                fontWeight: 600,
                                fontFamily: 'JetBrains Mono, monospace',
                              }}
                            >
                              {img.vulnerabilities.medium}M
                            </span>
                          )}
                          {img.vulnerabilities.critical === 0 && img.vulnerabilities.high === 0 && img.vulnerabilities.medium === 0 && (
                            <span style={{ fontSize: '11px', color: '#16A34A', fontWeight: 600 }}>0 CVEs</span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span
                          style={{
                            padding: '2px 7px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 600,
                            backgroundColor:
                              img.status === 'Healthy'
                                ? '#ECFDF5'
                                : img.status === 'Needs Attention'
                                ? '#FFFBEB'
                                : '#FEF2F2',
                            color:
                              img.status === 'Healthy'
                                ? '#047857'
                                : img.status === 'Needs Attention'
                                ? '#B45309'
                                : '#B91C1C',
                            border: `1px solid ${
                              img.status === 'Healthy'
                                ? '#A7F3D0'
                                : img.status === 'Needs Attention'
                                ? '#FDE68A'
                                : '#FECACA'
                            }`,
                          }}
                        >
                          {img.status}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', color: '#64748B', fontSize: '11.5px' }}>
                        {img.last_scanned_formatted || 'Recently scanned'}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        <Link
                          href={`/container-security/images?image_id=${encodeURIComponent(img.id)}`}
                          style={{
                            fontSize: '12px',
                            color: '#2563EB',
                            fontWeight: 600,
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <span>Inspect</span>
                          <ArrowRight size={12} />
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#94A3B8' }}>
                      <Container size={24} color="#CBD5E1" style={{ margin: '0 auto 8px auto', display: 'block' }} />
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                        No container images discovered yet
                      </div>
                      <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '2px' }}>
                        Connect a registry or run an on-demand image scan to populate image inventory.
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── 4. Live Runtime Security Alerts Stream ── */}
        {runtimeEvents.length > 0 && (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={16} color="#0F172A" />
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Recent Container Runtime Events
                </h3>
              </div>
              <Link
                href="/container-security/runtime"
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#2563EB',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span>Runtime Dashboard</span>
                <ChevronRight size={13} />
              </Link>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {runtimeEvents.map((evt, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    fontSize: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        padding: '1px 5px',
                        borderRadius: '3px',
                        fontSize: '10px',
                        fontWeight: 700,
                        backgroundColor: evt.severity === 'CRITICAL' ? '#FEE2E2' : '#EFF6FF',
                        color: evt.severity === 'CRITICAL' ? '#991B1B' : '#1D4ED8',
                        fontFamily: 'JetBrains Mono, monospace',
                      }}
                    >
                      {evt.severity || 'INFO'}
                    </span>
                    <span style={{ fontWeight: 600, color: '#0F172A' }}>{evt.process || evt.title || 'Runtime event'}</span>
                    <span style={{ color: '#64748B' }}>in container {evt.container || evt.workload || 'pod'}</span>
                  </div>
                  <span style={{ color: '#94A3B8', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px' }}>
                    {evt.timestamp || 'Just now'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* CVE Detail Modal */}
      {selectedCve && (
        <CveDetailModal
          cve={selectedCve}
          onClose={() => setSelectedCve(null)}
        />
      )}

      {/* Reachability Analysis Modal */}
      {selectedReachabilityCve && (
        <ReachabilityAnalysisModal
          cveId={selectedReachabilityCve}
          isOpen={true}
          onClose={() => setSelectedReachabilityCve(null)}
        />
      )}
    </ContainerSecurityLayout>
  );
};

export default ContainerOverviewView;
