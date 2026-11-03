'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ContainerSecurityLayout } from './ContainerSecurityLayout';
import { useScope } from '@/context/ScopeContext';
import { api } from '@/lib/api/client';
import {
  GitBranch,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Play,
  RefreshCw,
  GitPullRequest,
  Check,
} from 'lucide-react';
import { toast } from '@/lib/toast';

const TABS = [
  { id: 'overview', label: 'CI/CD Overview' },
  { id: 'gates', label: 'Configured Gates' },
  { id: 'pipelines', label: 'Pipeline Executions' },
  { id: 'webhooks', label: 'Admission Webhooks' },
  { id: 'pr-checks', label: 'GitHub PR Status Checks' },
];

export const ContainerCICDView: React.FC = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { currentProject } = useScope();

  const tabParam = searchParams.get('tab') || 'overview';
  const [activeTab, setActiveTab] = useState<string>(tabParam);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any | null>(null);

  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    router.push(`/container-security/ci-cd?tab=${tabId}`);
  };

  const fetchCICD = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.containers.cicdGates(currentProject?.id || null);
      setData(res || null);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id]);

  useEffect(() => {
    fetchCICD();
  }, [fetchCICD]);

  const gates = data?.gates || [];
  const integrations = data?.integrations || [];

  return (
    <ContainerSecurityLayout
      sectionTitle="CI/CD & Deployment Gates"
      sectionDescription="Continuous integration blocking gates: automated Trivy scans on Pull Request, pre-push verification to registries, and ValidatingAdmissionWebhook in Kubernetes clusters."
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={handleTabChange}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '100%', boxSizing: 'border-box' }}>
        {/* KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Active Gates
            </span>
            <div style={{ marginTop: '8px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '24px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: '#0F172A' }}>
                {gates.length}
              </span>
              <span style={{ fontSize: '11px', color: gates.length > 0 ? '#16A34A' : '#64748B', fontWeight: 500 }}>
                {gates.length > 0 ? 'Enforcing' : 'Standby'}
              </span>
            </div>
          </div>

          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Connected CI Providers
            </span>
            <div style={{ marginTop: '8px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '24px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: '#0F172A' }}>
                {integrations.length}
              </span>
              <span style={{ fontSize: '11px', color: '#2563EB', fontWeight: 500 }}>Active</span>
            </div>
          </div>

          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Admission Status
            </span>
            <div style={{ marginTop: '8px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A' }}>
                Validating
              </span>
              <span style={{ fontSize: '11px', color: '#16A34A', fontWeight: 500 }}>Deterministic</span>
            </div>
          </div>

          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Policy Mode
            </span>
            <div style={{ marginTop: '8px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '20px', fontWeight: 700, color: '#2563EB' }}>
                OPA + Trivy
              </span>
              <span style={{ fontSize: '11px', color: '#64748B' }}>Strict</span>
            </div>
          </div>
        </div>

        {/* Pipeline Providers Status */}
        {integrations.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
            {integrations.map((p: any, idx: number) => (
              <div
                key={idx}
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  padding: '16px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <span style={{ fontWeight: 600, fontSize: '13px', color: '#0F172A' }}>
                    {p.provider}
                  </span>
                  <p style={{ margin: '2px 0 0 0', fontSize: '11.5px', color: '#64748B' }}>
                    {p.workflows_monitored || 1} active workflow(s) monitored
                  </p>
                </div>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '10.5px',
                    fontWeight: 700,
                    backgroundColor: p.status === 'CONNECTED' ? '#ECFDF5' : '#F8FAFC',
                    color: p.status === 'CONNECTED' ? '#047857' : '#64748B',
                    border: `1px solid ${p.status === 'CONNECTED' ? '#A7F3D0' : '#E2E8F0'}`,
                    fontFamily: 'JetBrains Mono, monospace',
                  }}
                >
                  {p.status || 'CONNECTED'}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Gates Table */}
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ padding: '16px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={16} color="#2563EB" />
              <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', margin: 0, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                Configured Deployment Gates & Policies
              </h3>
            </div>
            <button
              onClick={fetchCICD}
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

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '11px', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '10px 14px', fontWeight: 600 }}>GATE NAME</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600 }}>STAGE</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600 }}>ENFORCEMENT</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600 }}>STATUS</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600, textAlign: 'right' }}>VIOLATIONS BLOCKED</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '36px', textAlign: 'center', color: '#94A3B8' }}>
                      <RefreshCw size={18} className="animate-spin" style={{ margin: '0 auto 6px', color: '#2563EB' }} />
                      Loading CI/CD deployment gates...
                    </td>
                  </tr>
                ) : gates.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '36px', textAlign: 'center', color: '#64748B' }}>
                      No deployment gates configured. Connect your GitHub Actions or GitLab CI pipeline.
                    </td>
                  </tr>
                ) : (
                  gates.map((g: any) => {
                    const enf = (g.enforcement || 'BLOCK').toUpperCase();
                    const enfBg = enf === 'BLOCK' ? '#FEF2F2' : '#FFFBEB';
                    const enfColor = enf === 'BLOCK' ? '#B91C1C' : '#B45309';

                    return (
                      <tr key={g.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '12px 14px', fontWeight: 600, color: '#0F172A' }}>
                          {g.name}
                        </td>
                        <td style={{ padding: '12px 14px', color: '#475569' }}>{g.stage}</td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10.5px', fontWeight: 700, backgroundColor: enfBg, color: enfColor, fontFamily: 'JetBrains Mono, monospace' }}>
                            {enf}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '2px 8px', borderRadius: '9999px', fontSize: '10.5px', fontWeight: 600, backgroundColor: '#ECFDF5', color: '#047857', border: '1px solid #A7F3D0' }}>
                            <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#10B981' }} />
                            {g.status || 'ACTIVE'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#0F172A' }}>
                          {g.failure_count ?? 0}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ContainerSecurityLayout>
  );
};

export default ContainerCICDView;
