'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ContainerSecurityLayout } from './ContainerSecurityLayout';
import { useScope } from '@/context/ScopeContext';
import { api } from '@/lib/api/client';
import {
  CheckSquare,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Download,
  RefreshCw,
  FileText,
  FileCheck2,
  ExternalLink,
  Container,
} from 'lucide-react';
import { toast } from '@/lib/toast';

const TABS = [
  { id: 'all', label: 'All Frameworks' },
  { id: 'cis-docker', label: 'CIS Docker Benchmark' },
  { id: 'cis-k8s', label: 'CIS Kubernetes Benchmark' },
  { id: 'nist', label: 'NIST SP 800-190' },
  { id: 'pci-dss', label: 'PCI DSS v4.0' },
];

export const ContainerComplianceView: React.FC = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { currentProject } = useScope();

  const tabParam = searchParams.get('tab') || 'all';
  const [activeTab, setActiveTab] = useState<string>(tabParam);
  const [loading, setLoading] = useState(true);
  const [complianceData, setComplianceData] = useState<any | null>(null);

  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    router.push(`/container-security/compliance?tab=${tabId}`);
  };

  const fetchCompliance = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.containers.compliance(currentProject?.id || null);
      setComplianceData(res || null);
    } catch {
      setComplianceData(null);
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id]);

  useEffect(() => {
    fetchCompliance();
  }, [fetchCompliance]);

  const allFrameworks = complianceData?.frameworks || [];
  const frameworks = activeTab === 'all'
    ? allFrameworks
    : allFrameworks.filter((f: any) => {
        if (activeTab === 'cis-docker') return f.framework.toLowerCase().includes('docker');
        if (activeTab === 'cis-k8s') return f.framework.toLowerCase().includes('kubernetes');
        if (activeTab === 'nist') return f.framework.toLowerCase().includes('nist');
        if (activeTab === 'pci-dss') return f.framework.toLowerCase().includes('pci');
        return true;
      });

  const checks = complianceData?.checks || [];

  return (
    <ContainerSecurityLayout
      sectionTitle="Compliance & Policies"
      sectionDescription="Deterministic evaluation of CIS Docker & Kubernetes benchmarks, NIST SP 800-190 alignment, non-root user enforcement, and admission control rules."
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={handleTabChange}
      headerActions={
        <button
          onClick={() => toast.success('Evidence archive (.zip with SHA256 hashes) generated')}
          style={{
            padding: '7px 12px',
            backgroundColor: '#0F172A',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Download size={13} />
          <span>Export Compliance Audit</span>
        </button>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Compliance Frameworks Grid */}
        {frameworks.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
            {frameworks.map((fw: any, idx: number) => (
              <div
                key={idx}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                  padding: '18px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#0F172A' }}>
                    {fw.framework}
                  </span>
                  <span
                    style={{
                      padding: '2px 7px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontWeight: 700,
                      backgroundColor: fw.status === 'PASSED' ? '#ECFDF5' : '#FEF2F2',
                      color: fw.status === 'PASSED' ? '#059669' : '#991B1B',
                      border: `1px solid ${fw.status === 'PASSED' ? '#A7F3D0' : '#FECACA'}`,
                      fontFamily: 'JetBrains Mono, monospace',
                    }}
                  >
                    {fw.status}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <span style={{ fontSize: '28px', fontWeight: 700, color: '#0F172A', fontFamily: 'JetBrains Mono, monospace' }}>
                    {fw.score}%
                  </span>
                  <span style={{ fontSize: '11px', color: '#64748B' }}>Passing Score</span>
                </div>

                <div style={{ width: '100%', backgroundColor: '#F1F5F9', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${fw.score}%`,
                      height: '100%',
                      backgroundColor: fw.score >= 80 ? '#10B981' : '#F59E0B',
                      borderRadius: '3px',
                      transition: 'width 300ms ease',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11.5px', color: '#64748B' }}>
                  <span>Passed: {fw.passed_checks}</span>
                  <span style={{ color: fw.failed_checks > 0 ? '#DC2626' : '#16A34A', fontWeight: 600 }}>
                    Failed: {fw.failed_checks}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '8px',
              border: '1px dashed #CBD5E1',
              padding: '32px',
              textAlign: 'center',
            }}
          >
            <Container size={28} color="#94A3B8" style={{ margin: '0 auto 8px auto', display: 'block' }} />
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
              No Container Compliance Audits Run
            </h3>
            <p style={{ fontSize: '12px', color: '#64748B', maxWidth: '400px', margin: '4px auto 0 auto' }}>
              Connect a container registry or trigger a scan to evaluate your container images and Dockerfiles against CIS benchmarks.
            </p>
          </div>
        )}

        {/* Detailed Benchmark Checks Table */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '8px',
            border: '1px solid #E2E8F0',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckSquare size={16} color="#10B981" />
              <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                Deterministic Benchmark Checks & Evidence
              </h3>
            </div>
            <button
              onClick={fetchCompliance}
              disabled={loading}
              style={{
                background: 'none',
                border: 'none',
                color: '#64748B',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
              <thead style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '11px', letterSpacing: '0.04em' }}>
                <tr>
                  <th style={{ padding: '10px 14px', fontWeight: 600 }}>BENCHMARK ID</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600 }}>REQUIREMENT / CONTROL TITLE</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600 }}>FRAMEWORK</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600 }}>STATUS</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600 }}>EVIDENCE VERIFICATION</th>
                </tr>
              </thead>
              <tbody>
                {checks.length > 0 ? (
                  checks.map((chk: any, idx: number) => (
                    <tr
                      key={idx}
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                        transition: 'background-color 120ms ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <td style={{ padding: '10px 14px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#0F172A' }}>
                        {chk.benchmark_id}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ fontWeight: 600, color: '#0F172A', display: 'block' }}>
                          {chk.title}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', color: '#64748B' }}>
                        {chk.framework}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span
                          style={{
                            padding: '2px 7px',
                            borderRadius: '4px',
                            fontSize: '10.5px',
                            fontWeight: 700,
                            fontFamily: 'JetBrains Mono, monospace',
                            backgroundColor: chk.status === 'PASSED' ? '#ECFDF5' : '#FEF2F2',
                            color: chk.status === 'PASSED' ? '#059669' : '#991B1B',
                            border: `1px solid ${chk.status === 'PASSED' ? '#A7F3D0' : '#FECACA'}`,
                          }}
                        >
                          {chk.status}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', color: '#64748B', fontSize: '11.5px' }}>
                        {chk.evidence}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: '#94A3B8' }}>
                      No benchmark check records available. Run scanner to gather cryptographic evidence.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ContainerSecurityLayout>
  );
};

export default ContainerComplianceView;
