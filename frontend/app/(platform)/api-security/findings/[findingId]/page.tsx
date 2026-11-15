'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft, Shield, AlertTriangle, CheckCircle2, ChevronRight,
  GitFork, Wrench, ExternalLink, Code2, Copy, Check, FileText,
  Lock, Bug, Terminal, Database, ArrowRight
} from 'lucide-react';
import { KavachApiLayout } from '../../components/KavachApiLayout';
import { KavachShimmer } from '../../components/KavachSkeleton';
import { useApiSecurity } from '../../context/ApiSecurityContext';
import { api } from '@/lib/api/client';
import { toast } from '@/lib/toast';

const serif = "'Newsreader', 'Instrument Serif', Georgia, serif";
const sans  = "var(--font-sans, 'Plus Jakarta Sans', Inter, -apple-system, sans-serif)";

const T = {
  pageBg:      '#FAF9F6',
  surface:     '#FFFFFF',
  surfaceHover:'#F8FAFC',
  border:      '#E8E6E1',
  borderInput: '#E5E7EB',
  borderLight: '#F3F4F6',
  text:        '#0F172A',
  textSub:     '#475569',
  textMuted:   '#94A3B8',
  green:       '#15803D',
  greenBg:     '#DCFCE7',
  greenBorder: '#BBF7D0',
  amber:       '#D97706',
  amberBg:     '#FEF3C7',
  amberBorder: '#FDE68A',
  red:         '#DC2626',
  redBg:       '#FEE2E2',
  redBorder:   '#FECACA',
  btnDark:     '#0B0F17',
};

export default function FindingDetailPage() {
  const router = useRouter();
  const params = useParams();
  const findingId = params?.findingId as string;

  const { selectedApi } = useApiSecurity();
  const [finding, setFinding] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedPatch, setCopiedPatch] = useState(false);

  useEffect(() => {
    if (!findingId) return;
    const fetchFinding = async () => {
      setLoading(true);
      try {
        const data = await api.apiSecurity.getFinding(findingId);
        if (data) {
          setFinding(data);
        } else {
          // Fallback to query from findings list
          const listRes = await api.apiSecurity.findings({ apiId: selectedApi?.id, limit: 100 });
          const match = (listRes?.items || []).find((f: any) => f.id === findingId);
          if (match) setFinding(match);
        }
      } catch (err) {
        console.warn('Direct finding query notice, trying list fallback:', err);
        try {
          const listRes = await api.apiSecurity.findings({ apiId: selectedApi?.id, limit: 100 });
          const match = (listRes?.items || []).find((f: any) => f.id === findingId);
          if (match) setFinding(match);
        } catch {
          // Ignore
        }
      } finally {
        setLoading(false);
      }
    };
    fetchFinding();
  }, [findingId, selectedApi?.id]);

  const copyPatch = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPatch(true);
    toast.success('Remediation patch copied to clipboard');
    setTimeout(() => setCopiedPatch(false), 2000);
  };

  const sev = (finding?.severity || 'HIGH').toUpperCase();
  const sevColor = sev === 'CRITICAL' ? T.red : sev === 'HIGH' ? '#C2410C' : sev === 'MEDIUM' ? T.amber : '#64748B';
  const sevBg = sev === 'CRITICAL' ? T.redBg : sev === 'HIGH' ? '#FFEDD5' : sev === 'MEDIUM' ? T.amberBg : '#F1F5F9';
  const sevBorder = sev === 'CRITICAL' ? T.redBorder : sev === 'HIGH' ? '#FED7AA' : sev === 'MEDIUM' ? T.amberBorder : '#E2E8F0';

  const endpointStr = (finding?.affected_endpoints && finding.affected_endpoints[0]) || '/api/v1/resource';

  return (
    <KavachApiLayout activeApiId={selectedApi?.id}>
      <div style={{ minHeight: '100%', background: T.pageBg, fontFamily: sans, color: T.text, padding: '24px 36px 64px' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>

          {/* ── TOP BREADCRUMB & HEADER ── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: T.textSub, marginBottom: '6px' }}>
                <Link href="/api-security" style={{ color: T.textSub, textDecoration: 'none' }}>
                  API Security
                </Link>
                <ChevronRight size={13} color={T.textMuted} strokeWidth={2} />
                <Link href="/api-security/findings" style={{ color: T.textSub, textDecoration: 'none' }}>
                  Findings
                </Link>
                <ChevronRight size={13} color={T.textMuted} strokeWidth={2} />
                <span style={{ color: T.text, fontWeight: 600 }}>
                  {loading ? 'Finding Details' : (finding?.title || 'Finding Details')}
                </span>
              </div>

              <h1
                style={{
                  fontFamily: serif,
                  fontSize: '30px',
                  fontWeight: 700,
                  color: T.text,
                  letterSpacing: '-0.02em',
                  margin: 0,
                  lineHeight: 1.15,
                }}
              >
                {loading ? <KavachShimmer width="320px" height="34px" /> : (finding?.title || 'Security Finding Details')}
              </h1>
            </div>

            {/* Top Action Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                onClick={() => router.push('/api-security/findings')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  height: '36px',
                  padding: '0 14px',
                  borderRadius: '8px',
                  background: T.surface,
                  border: `1px solid ${T.borderInput}`,
                  fontSize: '12.5px',
                  fontWeight: 500,
                  color: T.text,
                  cursor: 'pointer',
                  fontFamily: sans,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                }}
              >
                <ArrowLeft size={13} color="#0F172A" />
                Back to Findings
              </button>

              <button
                type="button"
                onClick={() => router.push(`/api-security/attack-paths?findingId=${finding?.id || findingId}`)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  height: '36px',
                  padding: '0 14px',
                  borderRadius: '8px',
                  background: T.surface,
                  border: `1px solid ${T.borderInput}`,
                  fontSize: '12.5px',
                  fontWeight: 600,
                  color: '#15803D',
                  cursor: 'pointer',
                  fontFamily: sans,
                }}
              >
                <GitFork size={13} color="#15803D" />
                View Attack Path
              </button>

              <button
                type="button"
                onClick={() => router.push(`/api-security/remediation?findingId=${finding?.id || findingId}`)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  height: '36px',
                  padding: '0 16px',
                  borderRadius: '8px',
                  background: T.btnDark,
                  border: 'none',
                  color: '#FFFFFF',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: sans,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                }}
              >
                <Wrench size={12} color="#FFFFFF" />
                Remediate Finding
              </button>
            </div>
          </div>

          {/* ── MAIN CONTENT GRID ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px', alignItems: 'start' }}>

            {/* Left Column: Finding Breakdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

              {/* Card 1: Overview & Metadata Strip */}
              <div
                style={{
                  background: T.surface,
                  border: `1px solid ${T.border}`,
                  borderRadius: '12px',
                  padding: '20px 24px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      padding: '3px 9px',
                      borderRadius: '6px',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      background: sevBg,
                      color: sevColor,
                      border: `1px solid ${sevBorder}`,
                    }}
                  >
                    {sev}
                  </span>

                  <span
                    style={{
                      padding: '3px 9px',
                      borderRadius: '6px',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      background: '#EFF6FF',
                      color: '#1D4ED8',
                      border: '1px solid #BFDBFE',
                    }}
                  >
                    OWASP {finding?.owasp_category || 'A01:2021'}
                  </span>

                  <span
                    style={{
                      padding: '3px 9px',
                      borderRadius: '6px',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      background: '#F8FAFC',
                      color: '#475569',
                      border: '1px solid #E2E8F0',
                    }}
                  >
                    {finding?.cwe || 'CWE-639'}
                  </span>

                  <span
                    style={{
                      padding: '3px 9px',
                      borderRadius: '6px',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      background: finding?.status === 'RESOLVED' ? '#F1F5F9' : '#FEF2F2',
                      color: finding?.status === 'RESOLVED' ? '#475569' : '#DC2626',
                      border: `1px solid ${finding?.status === 'RESOLVED' ? '#CBD5E1' : '#FECACA'}`,
                    }}
                  >
                    Status: {finding?.status || 'OPEN'}
                  </span>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em', color: T.textMuted, fontWeight: 700, marginBottom: '4px' }}>
                    Affected Endpoint
                  </div>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      fontFamily: 'ui-monospace, monospace',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      color: T.text,
                    }}
                  >
                    <span style={{ color: '#2563EB', fontWeight: 700 }}>GET</span>
                    <span>{endpointStr}</span>
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em', color: T.textMuted, fontWeight: 700, marginBottom: '6px' }}>
                    Description
                  </div>
                  <p style={{ fontSize: '13.5px', color: T.textSub, lineHeight: 1.6, margin: 0 }}>
                    {finding?.description || 'The application does not properly validate object ownership, allowing authenticated users to access other users’ sensitive resources by modifying parameter identifiers.'}
                  </p>
                </div>

                <div>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em', color: T.textMuted, fontWeight: 700, marginBottom: '6px' }}>
                    Impact
                  </div>
                  <p style={{ fontSize: '13.5px', color: T.textSub, lineHeight: 1.6, margin: 0 }}>
                    {finding?.impact || 'Allows unauthorized access to private customer data, horizontal privilege escalation, and account takeover across API endpoints.'}
                  </p>
                </div>
              </div>

              {/* Card 2: Remediation Guidance & Patch */}
              <div
                style={{
                  background: T.surface,
                  border: `1px solid ${T.border}`,
                  borderRadius: '12px',
                  padding: '20px 24px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Wrench size={15} color="#0F172A" />
                    <span style={{ fontSize: '14.5px', fontWeight: 700, color: T.text }}>
                      Remediation Guidance &amp; Proposed Code Diff
                    </span>
                  </div>

                  {finding?.remediation_patch && (
                    <button
                      type="button"
                      onClick={() => copyPatch(finding.remediation_patch)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        background: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        color: T.text,
                        cursor: 'pointer',
                      }}
                    >
                      {copiedPatch ? <Check size={11} color="#15803D" /> : <Copy size={11} color="#64748B" />}
                      <span>{copiedPatch ? 'Copied' : 'Copy Diff'}</span>
                    </button>
                  )}
                </div>

                <p style={{ fontSize: '13px', color: T.textSub, lineHeight: 1.5, marginBottom: '16px' }}>
                  {finding?.remediation_advice || 'Implement object-level access validation by verifying that the requesting user owns the requested entity before returning or mutating records.'}
                </p>

                {finding?.remediation_patch ? (
                  <pre
                    style={{
                      background: '#0B0F17',
                      color: '#E2E8F0',
                      padding: '16px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontFamily: 'ui-monospace, monospace',
                      overflowX: 'auto',
                      lineHeight: 1.6,
                      margin: 0,
                    }}
                  >
                    <code>{finding.remediation_patch}</code>
                  </pre>
                ) : (
                  <div
                    style={{
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                      padding: '16px',
                      fontSize: '12.5px',
                      color: T.textSub,
                    }}
                  >
                    Deterministic remediation patch will be generated when you initiate the Remediation Workflow.
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Context & Quick Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* Context Summary Card */}
              <div
                style={{
                  background: T.surface,
                  border: `1px solid ${T.border}`,
                  borderRadius: '12px',
                  padding: '18px 20px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                }}
              >
                <div style={{ fontSize: '13.5px', fontWeight: 700, color: T.text, marginBottom: '14px' }}>
                  Finding Metadata
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #F1F5F9' }}>
                    <span style={{ color: T.textSub }}>Severity</span>
                    <strong style={{ color: sevColor }}>{sev}</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #F1F5F9' }}>
                    <span style={{ color: T.textSub }}>OWASP Category</span>
                    <strong style={{ color: T.text }}>{finding?.owasp_category || 'A01:2021'}</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #F1F5F9' }}>
                    <span style={{ color: T.textSub }}>CWE ID</span>
                    <strong style={{ color: T.text }}>{finding?.cwe || 'CWE-639'}</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #F1F5F9' }}>
                    <span style={{ color: T.textSub }}>Target API</span>
                    <strong style={{ color: T.text }}>{selectedApi?.name || 'Default API'}</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: T.textSub }}>Deterministic rescan</span>
                    <strong style={{ color: '#15803D' }}>ENABLED</strong>
                  </div>
                </div>
              </div>

              {/* Attack Path Preview Card */}
              <div
                style={{
                  background: T.surface,
                  border: `1px solid ${T.border}`,
                  borderRadius: '12px',
                  padding: '18px 20px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ fontSize: '13.5px', fontWeight: 700, color: T.text, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <GitFork size={14} color="#15803D" />
                    <span>Attack Chain</span>
                  </div>
                  <span style={{ fontSize: '11px', color: '#15803D', background: '#DCFCE7', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                    4 Steps
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                  {[
                    { step: 1, title: 'Reconnaissance', desc: 'Discover endpoint & params' },
                    { step: 2, title: 'Exploit BOLA', desc: 'Request other user records' },
                    { step: 3, title: 'Privilege Escalation', desc: 'Traverse boundary' },
                    { step: 4, title: 'Account Takeover', desc: 'Data access & modification', isFinal: true },
                  ].map((s) => (
                    <div
                      key={s.step}
                      style={{
                        padding: '8px 10px',
                        borderRadius: '7px',
                        background: s.isFinal ? '#FEE2E2' : '#F8FAFC',
                        border: `1px solid ${s.isFinal ? '#FECACA' : '#E2E8F0'}`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <div
                        style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          background: s.isFinal ? '#DC2626' : '#64748B',
                          color: '#FFFFFF',
                          fontSize: '10px',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {s.step}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: '11.5px', fontWeight: 700, color: s.isFinal ? '#991B1B' : T.text }}>
                          {s.title}
                        </div>
                        <div style={{ fontSize: '10.5px', color: s.isFinal ? '#B91C1C' : T.textSub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {s.desc}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => router.push(`/api-security/attack-paths?findingId=${finding?.id || findingId}`)}
                  style={{
                    width: '100%',
                    height: '34px',
                    borderRadius: '7px',
                    background: '#FFFFFF',
                    border: `1px solid ${T.borderInput}`,
                    color: T.text,
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  Explore Attack Chain
                  <ArrowRight size={12} color="#0F172A" />
                </button>
              </div>

            </div>

          </div>

        </div>
      </div>
    </KavachApiLayout>
  );
}
