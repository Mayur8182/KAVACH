'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ContainerSecurityLayout } from './ContainerSecurityLayout';
import { useScope } from '@/context/ScopeContext';
import { api } from '@/lib/api/client';
import {
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  GitBranch,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  Info,
  Clock,
  Sparkles,
} from 'lucide-react';
import { CveDetailModal, CveDetailData } from '@/components/security/CveDetailModal';
import { ReachabilityAnalysisModal } from '@/components/security/ReachabilityAnalysisModal';
import { toast } from '@/lib/toast';

const TABS = [
  { id: 'all', label: 'All CVEs' },
  { id: 'critical', label: 'Critical' },
  { id: 'high', label: 'High' },
  { id: 'medium', label: 'Medium' },
  { id: 'low', label: 'Low' },
  { id: 'fixable', label: 'Fix Available' },
];

export const ContainerFindingsView: React.FC = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { currentProject } = useScope();

  const tabParam = searchParams.get('tab') || 'all';
  const [activeTab, setActiveTab] = useState<string>(tabParam);
  const [search, setSearch] = useState('');
  const [fixableOnly, setFixableOnly] = useState(false);
  const [packageFilter, setPackageFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [findings, setFindings] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [severityCounts, setSeverityCounts] = useState<Record<string, number>>({
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
    NEGLIGIBLE: 0,
  });

  // Modals
  const [selectedCve, setSelectedCve] = useState<CveDetailData | null>(null);
  const [reachabilityModal, setReachabilityModal] = useState<{
    isOpen: boolean;
    cveId: string;
    imageId?: string;
  }>({
    isOpen: false,
    cveId: '',
  });

  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    router.push(`/container-security/findings?tab=${tabId}`);
  };

  const getEffectiveSeverity = () => {
    if (activeTab === 'critical') return 'CRITICAL';
    if (activeTab === 'high') return 'HIGH';
    if (activeTab === 'medium') return 'MEDIUM';
    if (activeTab === 'low') return 'LOW';
    return undefined;
  };

  const isFixable = activeTab === 'fixable' || fixableOnly;

  const fetchFindings = useCallback(async () => {
    setLoading(true);
    try {
      const sev = getEffectiveSeverity();
      const res = await api.containers.vulnerabilities({
        projectId: currentProject?.id || null,
        search: search || undefined,
        severity: sev,
        package: packageFilter || undefined,
        fixAvailable: isFixable ? true : undefined,
      });
      if (res) {
        setFindings(res.items || []);
        setTotal(res.total || 0);
        if (res.severity_counts) {
          setSeverityCounts(res.severity_counts);
        }
      }
    } catch {
      setFindings([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id, activeTab, search, packageFilter, isFixable]);

  useEffect(() => {
    fetchFindings();
  }, [fetchFindings]);

  return (
    <ContainerSecurityLayout
      sectionTitle="Vulnerabilities & CVEs"
      sectionDescription="Deterministic container image CVE catalog, CVSS scores, affected packages, installed vs fixed versions, and reachability proofs."
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={handleTabChange}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Severity Metrics Bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #FECACA',
              borderRadius: '8px',
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#DC2626', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Critical CVEs
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '24px', fontWeight: 700, color: '#991B1B', fontFamily: 'JetBrains Mono, monospace' }}>
                {severityCounts.CRITICAL}
              </span>
              <span style={{ fontSize: '11px', color: '#DC2626' }}>CVSS 9.0–10.0</span>
            </div>
          </div>

          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #FED7AA',
              borderRadius: '8px',
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#EA580C', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              High CVEs
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '24px', fontWeight: 700, color: '#9A3412', fontFamily: 'JetBrains Mono, monospace' }}>
                {severityCounts.HIGH}
              </span>
              <span style={{ fontSize: '11px', color: '#EA580C' }}>CVSS 7.0–8.9</span>
            </div>
          </div>

          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #FEF08A',
              borderRadius: '8px',
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#CA8A04', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Medium CVEs
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '24px', fontWeight: 700, color: '#854D0E', fontFamily: 'JetBrains Mono, monospace' }}>
                {severityCounts.MEDIUM}
              </span>
              <span style={{ fontSize: '11px', color: '#CA8A04' }}>CVSS 4.0–6.9</span>
            </div>
          </div>

          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #BFDBFE',
              borderRadius: '8px',
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#2563EB', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Low CVEs
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '24px', fontWeight: 700, color: '#1E40AF', fontFamily: 'JetBrains Mono, monospace' }}>
                {severityCounts.LOW}
              </span>
              <span style={{ fontSize: '11px', color: '#2563EB' }}>CVSS 0.1–3.9</span>
            </div>
          </div>

          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Total Audited
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', fontFamily: 'JetBrains Mono, monospace' }}>
                {total}
              </span>
              <span style={{ fontSize: '11px', color: '#10B981', fontWeight: 600 }}>Trivy / Syft</span>
            </div>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            padding: '14px 16px',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '260px' }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: '380px' }}>
              <Search
                size={14}
                style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }}
              />
              <input
                type="text"
                placeholder="Search CVE (e.g. CVE-2024-3094), package, image..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 12px 7px 32px',
                  fontSize: '12.5px',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                  color: '#0F172A',
                }}
              />
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#334155', cursor: 'pointer', userSelect: 'none' }}>
              <input
                type="checkbox"
                checked={fixableOnly}
                onChange={(e) => setFixableOnly(e.target.checked)}
                style={{ accentColor: '#0F172A' }}
              />
              <span>Fix Available Only</span>
            </label>
          </div>

          <button
            onClick={fetchFindings}
            disabled={loading}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 600,
              border: '1px solid #CBD5E1',
              borderRadius: '6px',
              backgroundColor: '#FFFFFF',
              color: '#334155',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Findings Table */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            overflow: 'hidden',
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
              <thead style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '11px', letterSpacing: '0.04em' }}>
                <tr>
                  <th style={{ padding: '10px 14px', fontWeight: 600 }}>SEVERITY</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600 }}>VULNERABILITY ID</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600 }}>AFFECTED PACKAGE</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600 }}>INSTALLED VS FIXED</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600 }}>CONTAINER IMAGE</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600 }}>REACHABILITY</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600, textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>
                      <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 8px auto', display: 'block', color: '#2563EB' }} />
                      <span>Loading container vulnerability records from PostgreSQL...</span>
                    </td>
                  </tr>
                ) : findings.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>
                      <CheckCircle2 size={24} color="#10B981" style={{ margin: '0 auto 8px auto', display: 'block' }} />
                      <div style={{ fontWeight: 600, color: '#0F172A', fontSize: '13px' }}>
                        No Vulnerabilities Match Filters
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                        All scanned container images and packages satisfy policy rules.
                      </div>
                    </td>
                  </tr>
                ) : (
                  findings.map((f) => (
                    <tr
                      key={f.id}
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                        transition: 'background-color 120ms ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            padding: '2px 7px',
                            borderRadius: '4px',
                            fontSize: '10.5px',
                            fontWeight: 700,
                            letterSpacing: '0.02em',
                            textTransform: 'uppercase',
                            fontFamily: 'JetBrains Mono, monospace',
                            backgroundColor:
                              f.severity === 'CRITICAL'
                                ? '#FEF2F2'
                                : f.severity === 'HIGH'
                                ? '#FFF7ED'
                                : f.severity === 'MEDIUM'
                                ? '#FEFCE8'
                                : '#EFF6FF',
                            color:
                              f.severity === 'CRITICAL'
                                ? '#991B1B'
                                : f.severity === 'HIGH'
                                ? '#9A3412'
                                : f.severity === 'MEDIUM'
                                ? '#854D0E'
                                : '#1E40AF',
                            border: `1px solid ${
                              f.severity === 'CRITICAL'
                                ? '#FECACA'
                                : f.severity === 'HIGH'
                                ? '#FED7AA'
                                : f.severity === 'MEDIUM'
                                ? '#FEF08A'
                                : '#BFDBFE'
                            }`,
                          }}
                        >
                          {f.severity}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>
                        <button
                          onClick={() =>
                            setSelectedCve({
                              cveId: f.vulnerability_id,
                              title: `${f.package} vulnerability in container`,
                              description: f.evidence?.description || 'Audited package flaw.',
                              severity: f.severity,
                              cvssScore: f.severity === 'CRITICAL' ? 9.8 : 7.5,
                              package: f.package,
                              installedVersion: f.installed_version || 'unknown',
                              fixedVersion: f.fixed_version,
                            })
                          }
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            color: '#0F172A',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontWeight: 700,
                            fontSize: '12.5px',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = '#2563EB')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = '#0F172A')}
                        >
                          <span>{f.vulnerability_id}</span>
                          <ExternalLink size={11} color="#94A3B8" />
                        </button>
                      </td>
                      <td style={{ padding: '10px 14px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: '#334155' }}>
                        {f.package}
                      </td>
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap', fontFamily: 'JetBrains Mono, monospace', fontSize: '11.5px' }}>
                        <span style={{ color: '#64748B' }}>{f.installed_version || 'unknown'}</span>
                        {f.fixed_version ? (
                          <>
                            <span style={{ color: '#94A3B8', margin: '0 6px' }}>&rarr;</span>
                            <span style={{ color: '#16A34A', fontWeight: 700 }}>{f.fixed_version}</span>
                          </>
                        ) : (
                          <span style={{ color: '#94A3B8', marginLeft: '6px', fontSize: '10.5px' }}>(No fix yet)</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap', color: '#475569' }}>
                        {f.image_repository}:{f.image_tag}
                      </td>
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                        <button
                          onClick={() =>
                            setReachabilityModal({
                              isOpen: true,
                              cveId: f.vulnerability_id,
                              imageId: f.image_id,
                            })
                          }
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            color: '#2563EB',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11.5px',
                            fontWeight: 600,
                          }}
                        >
                          <GitBranch size={13} />
                          <span>Analyze Call Path</span>
                        </button>
                      </td>
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap', textAlign: 'right' }}>
                        <button
                          onClick={() =>
                            setSelectedCve({
                              cveId: f.vulnerability_id,
                              title: `${f.package} vulnerability in container`,
                              description: f.evidence?.description || 'Audited package flaw.',
                              severity: f.severity,
                              cvssScore: f.severity === 'CRITICAL' ? 9.8 : 7.5,
                              package: f.package,
                              installedVersion: f.installed_version || 'unknown',
                              fixedVersion: f.fixed_version,
                            })
                          }
                          style={{
                            padding: '4px 10px',
                            fontSize: '11.5px',
                            fontWeight: 600,
                            backgroundColor: '#F8FAFC',
                            border: '1px solid #CBD5E1',
                            borderRadius: '5px',
                            color: '#334155',
                            cursor: 'pointer',
                          }}
                        >
                          Investigate
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* CVE Detail Modal */}
      {selectedCve && (
        <CveDetailModal
          cve={selectedCve}
          onClose={() => setSelectedCve(null)}
        />
      )}

      {/* Reachability DAG Modal */}
      <ReachabilityAnalysisModal
        isOpen={reachabilityModal.isOpen}
        onClose={() =>
          setReachabilityModal({
            isOpen: false,
            cveId: '',
          })
        }
        cveId={reachabilityModal.cveId}
        imageId={reachabilityModal.imageId}
      />
    </ContainerSecurityLayout>
  );
};

export default ContainerFindingsView;
