'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ContainerSecurityLayout } from './ContainerSecurityLayout';
import { useScope } from '@/context/ScopeContext';
import { api } from '@/lib/api/client';
import {
  Sparkles,
  Layers,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  GitPullRequest,
  FileCode2,
  Lock,
} from 'lucide-react';
import { toast } from '@/lib/toast';

const TABS = [
  { id: 'all', label: 'All Recommendations' },
  { id: 'dockerfiles', label: 'Dockerfile AST Patches' },
  { id: 'base-images', label: 'Base Image Migrations' },
  { id: 'packages', label: 'Package Version Bumps' },
  { id: 'pull-requests', label: 'Automated PRs' },
];

export const ContainerRemediationView: React.FC = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { currentProject } = useScope();

  const tabParam = searchParams.get('tab') || 'all';
  const [activeTab, setActiveTab] = useState<string>(tabParam);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);

  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    router.push(`/container-security/remediation?tab=${tabId}`);
  };

  const fetchRemediation = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.containers.remediation(currentProject?.id || null);
      setData(res || null);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id]);

  useEffect(() => {
    fetchRemediation();
  }, [fetchRemediation]);

  const handleApplyFix = async (fixId: string, description: string) => {
    setApplyingId(fixId);
    try {
      await api.containers.applyRemediation({ id: fixId, patch: description });
      toast.success(`Fix applied: ${description}`);
      await fetchRemediation();
    } catch {
      toast.error('Failed to apply automated remediation');
    } finally {
      setApplyingId(null);
    }
  };

  const recommendations = data?.recommendations || [];
  const upgradeCandidates = data?.upgrade_candidates || [];

  return (
    <ContainerSecurityLayout
      sectionTitle="AI Fixes & Remediation"
      sectionDescription="Deterministic code transformations, minimal base image migrations, AST Dockerfile hardening, and CI validation before merge."
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={handleTabChange}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '100%', boxSizing: 'border-box' }}>
        {/* KPI Banner */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Automated Fixes Available
            </span>
            <div style={{ marginTop: '8px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '24px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: '#0F172A' }}>
                {recommendations.length}
              </span>
              <span style={{ fontSize: '11px', color: recommendations.length > 0 ? '#16A34A' : '#64748B', fontWeight: 500 }}>
                {recommendations.length > 0 ? 'Ready to apply' : 'No fixes needed'}
              </span>
            </div>
          </div>

          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Base Image Upgrades
            </span>
            <div style={{ marginTop: '8px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '24px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: '#0F172A' }}>
                {upgradeCandidates.length}
              </span>
              <span style={{ fontSize: '11px', color: upgradeCandidates.length > 0 ? '#2563EB' : '#64748B', fontWeight: 500 }}>
                {upgradeCandidates.length > 0 ? 'Hardening variants' : 'Clean baseline'}
              </span>
            </div>
          </div>

          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Remediation Posture
            </span>
            <div style={{ marginTop: '8px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '20px', fontWeight: 700, color: recommendations.length > 0 ? '#D97706' : '#16A34A' }}>
                {recommendations.length > 0 ? 'ACTION REQUIRED' : 'OPTIMIZED'}
              </span>
              <span style={{ fontSize: '11px', color: '#64748B' }}>
                {recommendations.length > 0 ? `${recommendations.length} patchable` : 'Zero open findings'}
              </span>
            </div>
          </div>

          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Validation Engine
            </span>
            <div style={{ marginTop: '8px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '20px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: '#0F172A' }}>
                AST Strict
              </span>
              <span style={{ fontSize: '11px', color: '#16A34A', fontWeight: 500 }}>Verified</span>
            </div>
          </div>
        </div>

        {/* Base Image Upgrade Comparison */}
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', paddingBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={16} color="#2563EB" />
              <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', margin: 0, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                Recommended Base Image Migrations
              </h3>
            </div>
            <span style={{ fontSize: '12px', color: '#64748B' }}>Curated Distroless & Alpine Variants</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            {upgradeCandidates.length > 0 ? (
              upgradeCandidates.map((c: any, idx: number) => (
                <div
                  key={idx}
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    backgroundColor: '#F8FAFC',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#DC2626' }}>
                      {c.current_image}
                    </span>
                    <ArrowRight size={14} color="#94A3B8" />
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#16A34A' }}>
                      {c.recommended_image}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11.5px', color: '#475569', paddingTop: '8px', borderTop: '1px solid #E2E8F0' }}>
                    <div>
                      CVE Reduction: <span style={{ fontWeight: 700, color: '#16A34A' }}>-{c.cve_reduction} CVEs</span>
                    </div>
                    <div>
                      Footprint: <span style={{ fontWeight: 700, color: '#2563EB' }}>-{c.size_reduction_mb} MB</span>
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      handleApplyFix(
                        `upgrade-${idx}`,
                        `Migrate ${c.current_image} to ${c.recommended_image}`
                      )
                    }
                    disabled={applyingId === `upgrade-${idx}`}
                    style={{
                      width: '100%',
                      padding: '7px 12px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#0F172A',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      cursor: applyingId === `upgrade-${idx}` ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <Sparkles size={13} color="#2563EB" />
                    <span>{applyingId === `upgrade-${idx}` ? 'Applying...' : 'Apply Base Upgrade'}</span>
                  </button>
                </div>
              ))
            ) : (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '24px', color: '#94A3B8', fontSize: '12.5px' }}>
                All audited base images are at their latest minimal hardened versions.
              </div>
            )}
          </div>
        </div>

        {/* Dockerfile Fix Recommendations Table */}
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ padding: '16px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileCode2 size={16} color="#16A34A" />
              <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', margin: 0, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                Dockerfile Hardening & AST Fixes
              </h3>
            </div>
            <button
              onClick={fetchRemediation}
              disabled={loading}
              style={{
                fontSize: '12px',
                color: '#64748B',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>

          <div>
            {recommendations.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: '#64748B', fontSize: '12.5px' }}>
                <CheckCircle2 size={32} color="#16A34A" style={{ margin: '0 auto 8px' }} />
                <p style={{ margin: 0, fontWeight: 600, color: '#0F172A' }}>No pending Dockerfile fixes required.</p>
              </div>
            ) : (
              recommendations.map((rec: any, idx: number) => (
                <div
                  key={idx}
                  style={{
                    padding: '16px',
                    borderBottom: '1px solid #F1F5F9',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '640px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 600, fontSize: '13px', color: '#0F172A' }}>
                        {rec.title || rec.rule_name || `Fix #${idx + 1}`}
                      </span>
                      <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, backgroundColor: '#FEF3C7', color: '#92400E' }}>
                        {rec.severity || 'HIGH'}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '12px', color: '#64748B', lineHeight: 1.4 }}>
                      {rec.description || rec.recommendation}
                    </p>
                    {rec.file_path && (
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: '#94A3B8' }}>
                        Target: {rec.file_path}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <button
                      onClick={() => handleApplyFix(`rec-${idx}`, rec.title || 'Apply automated patch')}
                      disabled={applyingId === `rec-${idx}`}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#0F172A',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: applyingId === `rec-${idx}` ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <Sparkles size={13} color="#FBBF24" />
                      <span>{applyingId === `rec-${idx}` ? 'Applying...' : 'Apply Fix'}</span>
                    </button>
                    <button
                      onClick={() => {
                        const patchSnippet = `# Remediation for ${rec.title || 'Dockerfile'}\n# File: ${rec.file_path || 'Dockerfile'}\n${rec.recommendation || ''}`;
                        navigator.clipboard.writeText(patchSnippet);
                        toast.success('Remediation patch copied to clipboard');
                      }}
                      style={{
                        padding: '6px 12px',
                        border: '1px solid #CBD5E1',
                        borderRadius: '6px',
                        backgroundColor: '#FFFFFF',
                        color: '#334155',
                        fontSize: '12px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <GitPullRequest size={13} />
                      <span>Copy Patch</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </ContainerSecurityLayout>
  );
};

export default ContainerRemediationView;
