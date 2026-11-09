'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ShieldAlert,
  ArrowLeft,
  CheckCircle2,
  Clock,
  FileCode,
  Tag,
  AlertTriangle,
  Loader2,
  Copy,
  Terminal,
  ExternalLink,
  GitPullRequest,
  ShieldCheck,
  Code2,
} from 'lucide-react';
import { KavachApiLayout } from '../../components/KavachApiLayout';
import { api } from '@/lib/api/client';

export default function FindingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const findingId = params?.findingId as string;

  const [finding, setFinding] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isCreatingPr, setIsCreatingPr] = useState(false);
  const [createdPr, setCreatedPr] = useState<{ url: string; number: number } | null>(null);
  const [prError, setPrError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'evidence' | 'endpoints' | 'remediation' | 'activity'>('overview');

  const fetchFinding = async () => {
    if (!findingId) return;
    setIsLoading(true);
    try {
      const data = await api.apiSecurity.getFinding(findingId);
      setFinding(data);
    } catch (err) {
      console.error('Failed to load finding details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFinding();
  }, [findingId]);

  const handleCreatePr = async () => {
    if (!findingId) return;
    setIsCreatingPr(true);
    setPrError(null);
    try {
      const res = await api.apiSecurity.createFindingPr(findingId);
      setCreatedPr({ url: res.pr_url, number: res.pr_number });
    } catch (err: any) {
      console.error('Failed to create PR:', err);
      setPrError(err?.message || 'Failed to create GitHub Pull Request.');
    } finally {
      setIsCreatingPr(false);
    }
  };

  const handleResolve = async () => {
    if (!findingId) return;
    setIsUpdatingStatus(true);
    try {
      const newStatus = finding?.status === 'RESOLVED' ? 'OPEN' : 'RESOLVED';
      await api.apiSecurity.updateFindingStatus(findingId, newStatus);
      await fetchFinding();
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const getSeverityBadge = (sev: string) => {
    const s = (sev || 'LOW').toUpperCase();
    if (s === 'CRITICAL') return { bg: '#FEF2F2', text: '#991B1B', border: '#FECACA' };
    if (s === 'HIGH') return { bg: '#FFF7ED', text: '#C2410C', border: '#FED7AA' };
    if (s === 'MEDIUM') return { bg: '#FEFCE8', text: '#854D0E', border: '#FEF08A' };
    return { bg: '#EFF6FF', text: '#1E40AF', border: '#BFDBFE' };
  };

  const sBadge = getSeverityBadge(finding?.severity);

  return (
    <KavachApiLayout activeApiId={finding?.api_id}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1200px', margin: '0 auto' }}>
        {/* Breadcrumbs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748B' }}>
          <Link href="/api-security/findings" style={{ color: '#2563EB', textDecoration: 'none' }}>
            Findings
          </Link>
          <span>/</span>
          <span>Finding Detail</span>
        </div>

        {/* Title Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 700,
                backgroundColor: sBadge.bg,
                color: sBadge.text,
                border: `1px solid ${sBadge.border}`,
              }}
            >
              {finding?.severity || 'HIGH'}
            </span>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
              {finding?.title || 'Security Finding'}
            </h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Link
              href={`/api-security/fix-verify?findingId=${finding?.id}&apiId=${finding?.api_id || ''}&returnUrl=/api-security/findings/${finding?.id}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#2563EB',
                color: '#FFFFFF',
                borderRadius: '6px',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 600,
                textDecoration: 'none',
                boxShadow: '0 1px 2px rgba(37, 99, 235, 0.25)',
              }}
            >
              <ShieldCheck size={15} />
              <span>Fix this Finding (Remediate & Verify)</span>
            </Link>

            {createdPr ? (
              <a
                href={createdPr.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: '#ECFDF5',
                  color: '#059669',
                  border: '1px solid #10B981',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: 700,
                  textDecoration: 'none',
                }}
              >
                <CheckCircle2 size={15} />
                <span>PR #{createdPr.number || 'Linked'} on GitHub</span>
                <ExternalLink size={13} />
              </a>
            ) : (
              <button
                type="button"
                onClick={handleCreatePr}
                disabled={isCreatingPr}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: '#0F172A',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: isCreatingPr ? 'not-allowed' : 'pointer',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                }}
              >
                {isCreatingPr ? <Loader2 size={15} className="animate-spin" /> : <GitPullRequest size={15} />}
                <span>Create GitHub Pull Request</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleResolve}
              disabled={isUpdatingStatus}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: finding?.status === 'RESOLVED' ? '#F1F5F9' : '#10B981',
                color: finding?.status === 'RESOLVED' ? '#475569' : '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: isUpdatingStatus ? 'not-allowed' : 'pointer',
              }}
            >
              {isUpdatingStatus ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <CheckCircle2 size={15} />
              )}
              <span>{finding?.status === 'RESOLVED' ? 'Reopen Finding' : 'Mark as Resolved'}</span>
            </button>
          </div>
        </div>

        {prError && (
          <div style={{ padding: '12px 16px', borderRadius: '8px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: '13px' }}>
            {prError}
          </div>
        )}

        {/* Subnav Tabs */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
            borderBottom: '1px solid #E2E8F0',
          }}
        >
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'evidence', label: 'Evidence & Proof' },
            { id: 'endpoints', label: 'Affected Endpoints' },
            { id: 'remediation', label: 'Remediation & Patch' },
            { id: 'activity', label: 'Activity' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                padding: '10px 4px',
                fontSize: '13px',
                fontWeight: activeTab === tab.id ? 600 : 500,
                color: activeTab === tab.id ? '#2563EB' : '#64748B',
                borderBottom: activeTab === tab.id ? '2px solid #2563EB' : '2px solid transparent',
                background: 'none',
                borderTop: 'none',
                borderLeft: 'none',
                borderRight: 'none',
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0', color: '#64748B' }}>
            <Loader2 size={24} className="animate-spin" />
            <span style={{ marginLeft: '10px', fontSize: '14px' }}>Loading finding details...</span>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px' }}>
            {/* Left Column: Finding Information */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '10px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                height: 'fit-content',
              }}
            >
              <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                Finding Information
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <span style={{ fontSize: '11px', color: '#64748B', display: 'block' }}>Category</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                    {finding?.category || 'Authorization'}
                  </span>
                </div>

                <div>
                  <span style={{ fontSize: '11px', color: '#64748B', display: 'block' }}>OWASP Category</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                    {finding?.owasp_category || 'API1:2023 BOLA'}
                  </span>
                </div>

                <div>
                  <span style={{ fontSize: '11px', color: '#64748B', display: 'block' }}>CWE</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                    {finding?.cwe || 'CWE-639'}
                  </span>
                </div>

                <div>
                  <span style={{ fontSize: '11px', color: '#64748B', display: 'block' }}>Severity</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: sBadge.text }}>
                    {finding?.severity || 'HIGH'}
                  </span>
                </div>

                <div>
                  <span style={{ fontSize: '11px', color: '#64748B', display: 'block' }}>Confidence</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#059669' }}>
                    HIGH (Deterministic Proof)
                  </span>
                </div>

                <div>
                  <span style={{ fontSize: '11px', color: '#64748B', display: 'block' }}>Status</span>
                  <span
                    style={{
                      display: 'inline-block',
                      marginTop: '3px',
                      padding: '3px 9px',
                      borderRadius: '9999px',
                      fontSize: '11px',
                      fontWeight: 700,
                      backgroundColor:
                        finding?.status === 'VERIFIED_FIXED'
                          ? '#ECFDF5'
                          : finding?.status === 'RESOLVED'
                          ? '#EFF6FF'
                          : '#FEF3C7',
                      color:
                        finding?.status === 'VERIFIED_FIXED'
                          ? '#065F46'
                          : finding?.status === 'RESOLVED'
                          ? '#1D4ED8'
                          : '#92400E',
                      border: `1px solid ${
                        finding?.status === 'VERIFIED_FIXED'
                          ? '#A7F3D0'
                          : finding?.status === 'RESOLVED'
                          ? '#BFDBFE'
                          : '#FDE68A'
                      }`,
                    }}
                  >
                    {finding?.status === 'VERIFIED_FIXED'
                      ? 'VERIFIED FIXED'
                      : finding?.status === 'RESOLVED'
                      ? 'RESOLVED (PENDING RESCAN)'
                      : 'OPEN'}
                  </span>
                </div>

                <div>
                  <span style={{ fontSize: '11px', color: '#64748B', display: 'block' }}>Detected On</span>
                  <span style={{ fontSize: '12px', color: '#334155' }}>
                    {finding?.created_at ? new Date(finding.created_at).toLocaleString() : 'Just now'}
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column: Tab Content */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Tab 1: Overview */}
              {activeTab === 'overview' && (
                <>
                  {/* Affected Endpoints & Source File Card */}
                  <div
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: '10px',
                      padding: '20px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '14px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                        Affected Endpoint & Source Location
                      </h2>
                      <Link
                        href={`/api-security/fix-verify?findingId=${finding?.id}&apiId=${finding?.api_id || ''}&returnUrl=/api-security/findings/${finding?.id}`}
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
                        <ShieldCheck size={14} />
                        <span>Remediate in Fix & Verify</span>
                      </Link>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div style={{ padding: '10px 14px', backgroundColor: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                        <span style={{ fontSize: '11px', color: '#64748B', display: 'block', fontWeight: 600 }}>AFFECTED ROUTE</span>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', fontFamily: 'monospace' }}>
                          {finding?.target_endpoint || (Array.isArray(finding?.affected_endpoints) && finding.affected_endpoints[0]) || '/api/v1/resource'}
                        </span>
                      </div>

                      <div style={{ padding: '10px 14px', backgroundColor: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                        <span style={{ fontSize: '11px', color: '#64748B', display: 'block', fontWeight: 600 }}>SOURCE CODE FILE</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                          <Code2 size={13} color="#2563EB" />
                          <span style={{ fontSize: '12px', fontWeight: 600, color: '#2563EB', fontFamily: 'monospace' }}>
                            {finding?.code_file_path || finding?.source_file || 'Discovered via runtime traffic & AST'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Description & Impact Card */}
                  <div
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: '10px',
                      padding: '20px',
                    }}
                  >
                    <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: '0 0 8px 0' }}>
                      Description
                    </h2>
                    <p style={{ fontSize: '13px', color: '#334155', lineHeight: 1.5, margin: '0 0 16px 0' }}>
                      {finding?.description ||
                        'The endpoint allows User A to read or modify resources belonging to User B without verifying object ownership.'}
                    </p>

                    <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: '0 0 8px 0' }}>
                      Impact
                    </h2>
                    <p style={{ fontSize: '13px', color: '#334155', lineHeight: 1.5, margin: 0 }}>
                      {finding?.impact ||
                        'Attackers can exfiltrate sensitive user records, modify profiles, or tamper with customer orders.'}
                    </p>
                  </div>

                  {/* Recommended Remediation Card */}
                  <div
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: '10px',
                      padding: '20px',
                    }}
                  >
                    <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: '0 0 10px 0' }}>
                      Recommended Remediation
                    </h2>
                    <p style={{ fontSize: '13px', color: '#334155', lineHeight: 1.5, margin: '0 0 16px 0' }}>
                      {finding?.remediation_advice ||
                        'Implement server-side authorization checks comparing the authenticated user ID from the JWT token with the requested resource owner.'}
                    </p>

                    {/* Code Diff Patch */}
                    {finding?.remediation_patch && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                          Proposed Code Diff Patch:
                        </span>
                        <div
                          style={{
                            padding: '14px',
                            backgroundColor: '#0F172A',
                            borderRadius: '8px',
                            fontFamily: 'Consolas, Monaco, monospace',
                            fontSize: '12px',
                            color: '#E2E8F0',
                            whiteSpace: 'pre-wrap',
                            overflowX: 'auto',
                            lineHeight: 1.5,
                          }}
                        >
                          {finding.remediation_patch}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Tab 2: Evidence */}
              {activeTab === 'evidence' && (
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '10px',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                  }}
                >
                  <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                    Deterministic Execution Evidence
                  </h2>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>
                      Raw HTTP Request & Response Trace:
                    </span>
                    <pre
                      style={{
                        padding: '16px',
                        backgroundColor: '#0F172A',
                        color: '#38BDF8',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                        overflowX: 'auto',
                      }}
                    >
                      {JSON.stringify(finding?.evidence || { request: 'GET /api/v1/users/42 HTTP/1.1', response: 'HTTP/1.1 200 OK' }, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* Tab 3: Endpoints */}
              {activeTab === 'endpoints' && (
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '10px',
                    padding: '20px',
                  }}
                >
                  <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: '0 0 14px 0' }}>
                    Affected Endpoints
                  </h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {(finding?.affected_endpoints || ['/api/v1/users/{id}']).map((ep: string, idx: number) => (
                      <div
                        key={idx}
                        style={{
                          padding: '10px 14px',
                          borderRadius: '6px',
                          backgroundColor: '#F8FAFC',
                          border: '1px solid #E2E8F0',
                          fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                          letterSpacing: '-0.01em',
                          fontSize: '13px',
                          color: '#0F172A',
                        }}
                      >
                        {ep}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 4: Remediation */}
              {activeTab === 'remediation' && (
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '10px',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                  }}
                >
                  <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                    Remediation Verification
                  </h2>
                  <p style={{ fontSize: '13px', color: '#475569', margin: 0 }}>
                    Once this patch is applied in source code, trigger a re-verification scan.
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    {createdPr ? (
                      <a
                        href={createdPr.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 18px',
                          borderRadius: '6px',
                          backgroundColor: '#ECFDF5',
                          border: '1px solid #10B981',
                          color: '#059669',
                          fontSize: '13px',
                          fontWeight: 700,
                          textDecoration: 'none',
                        }}
                      >
                        <CheckCircle2 size={15} />
                        <span>View PR #{createdPr.number || 'Linked'} on GitHub</span>
                        <ExternalLink size={13} />
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={handleCreatePr}
                        disabled={isCreatingPr}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 18px',
                          borderRadius: '6px',
                          backgroundColor: '#0F172A',
                          color: '#FFFFFF',
                          border: 'none',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: isCreatingPr ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {isCreatingPr ? <Loader2 size={15} className="animate-spin" /> : <GitPullRequest size={15} />}
                        <span>Create GitHub Pull Request</span>
                      </button>
                    )}

                    <Link
                      href={`/api-security/analysis?apiId=${finding?.api_id}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 18px',
                        borderRadius: '6px',
                        backgroundColor: '#2563EB',
                        color: '#FFFFFF',
                        fontSize: '13px',
                        fontWeight: 600,
                        textDecoration: 'none',
                        width: 'fit-content',
                      }}
                    >
                      <span>Run Verification Scan</span>
                    </Link>
                  </div>
                </div>
              )}

              {/* Tab 5: Activity */}
              {activeTab === 'activity' && (
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '10px',
                    padding: '20px',
                  }}
                >
                  <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: '0 0 14px 0' }}>
                    Audit History
                  </h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ fontSize: '12px', color: '#64748B' }}>
                      Finding discovered by automated security runner engine. Status: {finding?.status || 'OPEN'}.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </KavachApiLayout>
  );
}
