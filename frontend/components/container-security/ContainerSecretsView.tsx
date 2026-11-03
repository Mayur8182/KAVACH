'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ContainerSecurityLayout } from './ContainerSecurityLayout';
import { useScope } from '@/context/ScopeContext';
import { api } from '@/lib/api/client';
import {
  Key,
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
  Eye,
  EyeOff,
  Copy,
  Check,
  AlertTriangle,
  Lock,
  FileCode2,
  Layers,
  Sparkles,
} from 'lucide-react';
import { toast } from '@/lib/toast';

const TABS = [
  { id: 'findings', label: 'Secrets Findings' },
  { id: 'layers', label: 'Image Layer Secrets' },
  { id: 'env', label: 'Environment Variables' },
  { id: 'exposure', label: 'Credential Exposure' },
  { id: 'details', label: 'Secret Details' },
  { id: 'remediation', label: 'Remediation' },
];

export const ContainerSecretsView: React.FC = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { currentProject } = useScope();

  const tabParam = searchParams.get('tab') || 'findings';
  const [activeTab, setActiveTab] = useState<string>(tabParam);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [secretsData, setSecretsData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [selectedSecret, setSelectedSecret] = useState<any | null>(null);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [remediating, setRemediating] = useState(false);

  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    router.push(`/container-security/secrets?tab=${tabId}`);
  };

  const fetchSecrets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.containers.secrets({
        projectId: currentProject?.id || null,
        search: search || undefined,
        severity: severityFilter !== 'ALL' ? severityFilter : undefined,
      });
      if (res) {
        setSecretsData(res.items || []);
        setTotal(res.total ?? (res.items || []).length);
      }
    } catch {
      setSecretsData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id, search, severityFilter]);

  useEffect(() => {
    fetchSecrets();
  }, [fetchSecrets]);

  const toggleReveal = (id: string) => {
    setRevealedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Secret snippet copied');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleApplyRemediation = async () => {
    if (!selectedSecret) return;
    if (selectedSecret.dockerfile_id) {
      setRemediating(true);
      try {
        await api.containers.remediateDockerfile(selectedSecret.dockerfile_id, {
          finding_id: selectedSecret.id,
          rule_id: selectedSecret.rule_id,
        });
        toast.success(`Applied security patch for ${selectedSecret.rule_name || selectedSecret.rule_id}`);
        setSelectedSecret(null);
        fetchSecrets();
      } catch (err: any) {
        toast.error(err?.message || 'Failed to apply remediation');
      } finally {
        setRemediating(false);
      }
    } else {
      navigator.clipboard.writeText(
        selectedSecret.recommendation ||
          'Use BuildKit secrets mount (--mount=type=secret) or pass sensitive variables at runtime via Kubernetes Secret volumes.'
      );
      toast.success('Remediation directive copied to clipboard');
      setSelectedSecret(null);
    }
  };

  const layerSecretsCount = secretsData.filter((s) => s.category?.toLowerCase().includes('layer') || !s.file_path).length;
  const instructionSecretsCount = secretsData.filter((s) => s.category?.toLowerCase().includes('secret') || s.file_path).length;

  return (
    <ContainerSecurityLayout
      sectionTitle="Secrets Security"
      sectionDescription="High-entropy scanning of container image layers, ENV declarations, and embedded build credentials to prevent token leakage in production artifacts."
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={handleTabChange}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', maxWidth: '100%' }}>
        {/* KPI Stat Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Total Secrets Detected
              </span>
              <Key style={{ width: '16px', height: '16px', color: '#EF4444' }} />
            </div>
            <div style={{ marginTop: '8px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '24px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: '#0F172A' }}>
                {total}
              </span>
              <span style={{ fontSize: '11px', color: total > 0 ? '#EF4444' : '#10B981', fontWeight: 600 }}>
                {total > 0 ? 'Critical surface' : 'Clean baseline'}
              </span>
            </div>
          </div>

          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Layer Secrets
              </span>
              <Layers style={{ width: '16px', height: '16px', color: '#F59E0B' }} />
            </div>
            <div style={{ marginTop: '8px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '24px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: '#0F172A' }}>
                {layerSecretsCount}
              </span>
              <span style={{ fontSize: '11px', color: '#64748B' }}>Embedded in image</span>
            </div>
          </div>

          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                ENV & Instruction Secrets
              </span>
              <FileCode2 style={{ width: '16px', height: '16px', color: '#3B82F6' }} />
            </div>
            <div style={{ marginTop: '8px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '24px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: '#0F172A' }}>
                {instructionSecretsCount}
              </span>
              <span style={{ fontSize: '11px', color: '#64748B' }}>Dockerfile & config</span>
            </div>
          </div>

          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Posture Status
              </span>
              <Sparkles style={{ width: '16px', height: '16px', color: total === 0 ? '#10B981' : '#F59E0B' }} />
            </div>
            <div style={{ marginTop: '8px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '20px', fontWeight: 700, color: total === 0 ? '#10B981' : '#D97706' }}>
                {total === 0 ? 'SECURE' : `${total} ACTIONABLE`}
              </span>
              <span style={{ fontSize: '11px', color: '#64748B' }}>
                {total === 0 ? 'Zero leaks' : 'Requires isolation'}
              </span>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '260px' }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: '420px' }}>
              <Search style={{ width: '15px', height: '15px', position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
              <input
                type="text"
                placeholder="Search secrets by rule, credential name, or file path..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  paddingLeft: '32px',
                  paddingRight: '12px',
                  paddingTop: '7px',
                  paddingBottom: '7px',
                  fontSize: '12.5px',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                  outline: 'none',
                  color: '#0F172A',
                }}
              />
            </div>

            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              style={{
                fontSize: '12.5px',
                padding: '7px 12px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                color: '#0F172A',
                outline: 'none',
              }}
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
            </select>
          </div>

          <button
            onClick={fetchSecrets}
            disabled={loading}
            style={{
              padding: '7px 12px',
              fontSize: '12.5px',
              fontWeight: 500,
              border: '1px solid #CBD5E1',
              borderRadius: '6px',
              backgroundColor: '#FFFFFF',
              color: '#334155',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            <RefreshCw style={{ width: '13px', height: '13px' }} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Secrets Table */}
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '10px 14px' }}>Severity</th>
                  <th style={{ padding: '10px 14px' }}>Rule & Detection</th>
                  <th style={{ padding: '10px 14px' }}>Location / File</th>
                  <th style={{ padding: '10px 14px' }}>Line Context</th>
                  <th style={{ padding: '10px 14px' }}>Status</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '48px 16px', textAlign: 'center', color: '#94A3B8' }}>
                      <RefreshCw style={{ width: '20px', height: '20px', margin: '0 auto 8px', animation: 'spin 1s linear infinite', color: '#2563EB' }} />
                      Auditing container image layers and configuration secrets...
                    </td>
                  </tr>
                ) : secretsData.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '48px 16px', textAlign: 'center', color: '#64748B' }}>
                      <Lock style={{ width: '28px', height: '28px', margin: '0 auto 8px', color: '#10B981' }} />
                      <p style={{ fontWeight: 600, color: '#0F172A', margin: 0, fontSize: '14px' }}>
                        Zero Secrets Leaked
                      </p>
                      <p style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
                        No private keys, AWS tokens, or environment credentials identified.
                      </p>
                    </td>
                  </tr>
                ) : (
                  secretsData.map((s) => {
                    const isRevealed = revealedIds.has(s.id);
                    const sev = (s.severity || 'HIGH').toUpperCase();
                    const sevBg = sev === 'CRITICAL' ? '#FEF2F2' : sev === 'HIGH' ? '#FFF7ED' : '#FEFCE8';
                    const sevColor = sev === 'CRITICAL' ? '#B91C1C' : sev === 'HIGH' ? '#C2410C' : '#A16207';
                    const sevBorder = sev === 'CRITICAL' ? '#FECACA' : sev === 'HIGH' ? '#FED7AA' : '#FEF08A';

                    return (
                      <tr
                        key={s.id}
                        style={{ borderBottom: '1px solid #F1F5F9', transition: 'background-color 100ms ease' }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                      >
                        <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '10.5px',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              backgroundColor: sevBg,
                              color: sevColor,
                              border: `1px solid ${sevBorder}`,
                              fontFamily: 'JetBrains Mono, monospace',
                            }}
                          >
                            {sev}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ fontWeight: 600, color: '#0F172A' }}>
                            {s.rule_name || s.rule_id || 'Credential Leak'}
                          </div>
                          <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px', maxWidth: '340px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {s.description || 'Exposed credential in container instruction'}
                          </div>
                        </td>
                        <td style={{ padding: '12px 14px', whiteSpace: 'nowrap', fontFamily: 'JetBrains Mono, monospace', fontSize: '11.5px', color: '#475569' }}>
                          {s.file_path || 'Layer 4 (sha256:7f9a...)'}
                          {s.line_number && <span style={{ color: '#94A3B8', marginLeft: '4px' }}>:{s.line_number}</span>}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', backgroundColor: '#F1F5F9', padding: '3px 8px', borderRadius: '4px', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#1E293B', border: '1px solid #E2E8F0' }}>
                              {isRevealed ? s.line_content || 'ENV AWS_SECRET_ACCESS_KEY=AKIA...' : '••••••••••••••••••••••••••••••••'}
                            </span>
                            <button
                              onClick={() => toggleReveal(s.id)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', padding: '4px' }}
                              title={isRevealed ? 'Mask secret' : 'Reveal secret preview'}
                            >
                              {isRevealed ? <EyeOff style={{ width: '14px', height: '14px' }} /> : <Eye style={{ width: '14px', height: '14px' }} />}
                            </button>
                            <button
                              onClick={() => copyToClipboard(s.line_content || 'MASKED_SECRET', s.id)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', padding: '4px' }}
                              title="Copy snippet"
                            >
                              {copiedId === s.id ? <Check style={{ width: '14px', height: '14px', color: '#10B981' }} /> : <Copy style={{ width: '14px', height: '14px' }} />}
                            </button>
                          </div>
                        </td>
                        <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '2px 8px', borderRadius: '9999px', fontSize: '10.5px', fontWeight: 600, backgroundColor: '#FEF2F2', color: '#991B1B', border: '1px solid #FECACA' }}>
                            <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#EF4444' }} />
                            {s.status || 'OPEN'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', whiteSpace: 'nowrap', textAlign: 'right' }}>
                          <button
                            onClick={() => setSelectedSecret(s)}
                            style={{
                              padding: '5px 12px',
                              fontSize: '11.5px',
                              fontWeight: 600,
                              backgroundColor: '#EFF6FF',
                              color: '#2563EB',
                              border: '1px solid #DBEAFE',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              transition: 'all 120ms ease',
                            }}
                          >
                            Remediate
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Remediation / Detail Modal */}
        {selectedSecret && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 100,
              backgroundColor: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(3px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
            }}
            onClick={() => setSelectedSecret(null)}
          >
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '10px',
                maxWidth: '560px',
                width: '100%',
                padding: '24px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', paddingBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Key style={{ width: '18px', height: '18px', color: '#EF4444' }} />
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                    Remediate Container Secret Finding
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedSecret(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: '18px' }}
                >
                  ✕
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12.5px' }}>
                <div>
                  <span style={{ color: '#64748B', fontWeight: 500 }}>Rule:</span>{' '}
                  <span style={{ fontWeight: 600, color: '#0F172A' }}>
                    {selectedSecret.rule_name || selectedSecret.rule_id}
                  </span>
                </div>
                <div>
                  <span style={{ color: '#64748B', fontWeight: 500 }}>Location:</span>{' '}
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', color: '#334155' }}>
                    {selectedSecret.file_path || 'Image Layer'}
                    {selectedSecret.line_number && `:${selectedSecret.line_number}`}
                  </span>
                </div>
                <div>
                  <span style={{ color: '#64748B', fontWeight: 500 }}>Recommended Fix:</span>
                  <p style={{ marginTop: '6px', padding: '10px 12px', backgroundColor: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0', color: '#334155', lineHeight: 1.5, fontSize: '12px', fontFamily: 'inherit' }}>
                    {selectedSecret.recommendation ||
                      'Use BuildKit secrets mount (--mount=type=secret) or pass sensitive variables at runtime via Kubernetes Secret volumes instead of embedding them in image layers.'}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', paddingTop: '12px', borderTop: '1px solid #E2E8F0' }}>
                <button
                  onClick={() => setSelectedSecret(null)}
                  style={{
                    padding: '7px 14px',
                    fontSize: '12.5px',
                    fontWeight: 500,
                    border: '1px solid #CBD5E1',
                    borderRadius: '6px',
                    backgroundColor: '#FFFFFF',
                    color: '#475569',
                    cursor: 'pointer',
                  }}
                >
                  Close
                </button>
                <button
                  onClick={handleApplyRemediation}
                  disabled={remediating}
                  style={{
                    padding: '7px 16px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    backgroundColor: '#0F172A',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: remediating ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {remediating ? (
                    <>
                      <RefreshCw style={{ width: '13px', height: '13px' }} className="animate-spin" />
                      <span>Applying...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles style={{ width: '13px', height: '13px', color: '#FBBF24' }} />
                      <span>{selectedSecret.dockerfile_id ? 'Apply AST Security Patch' : 'Copy Remediation Directive'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ContainerSecurityLayout>
  );
};

export default ContainerSecretsView;
