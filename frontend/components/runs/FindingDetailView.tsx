'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  Shield,
  Code,
  Sparkles,
  Check,
  GitPullRequest,
  MoreHorizontal,
  ExternalLink,
  Copy,
  Layers,
  Box,
  Terminal,
  CheckCircle2,
  AlertTriangle,
  X,
  FileCode,
  ShieldAlert,
  Loader2,
} from 'lucide-react';
import { api } from '@/lib/api/client';

export function FindingDetailView() {
  const params = useParams();
  const router = useRouter();
  const runId = (params?.runId as string) || '';
  const findingId = (params?.findingId as string) || '';

  const [activeTab, setActiveTab] = useState<'details' | 'fix' | 'autofix' | 'activity' | 'references'>('details');
  const [applyingFix, setApplyingFix] = useState(false);
  const [fixSuccess, setFixSuccess] = useState(false);
  const [creatingPR, setCreatingPR] = useState(false);
  const [prCreatedUrl, setPrCreatedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Finding State matching Real Database Findings
  const [findingData, setFindingData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Load real finding data from backend
  useEffect(() => {
    if (!findingId) {
      setLoading(false);
      return;
    }
    async function loadFinding() {
      try {
        setLoading(true);
        const res: any = await api.request<any>(`/api/v1/findings/${findingId}`);
        const data = res?.data || res;
        if (data && data.title) {
          setFindingData({
            id: data.id || findingId,
            codeId: data.display_id || `F-${String(data.id).slice(0, 4)}`,
            title: data.title,
            severity: data.severity || 'Medium',
            agent: data.scanner_name || 'SAST',
            cwe: data.cwe || data.rule_id || 'N/A',
            status: data.status || 'Open',
            description: data.description || 'Deterministic finding detected by security scanner.',
            location: `${data.file_path || 'file'}:${data.line_number || data.line_start || 1}`,
            filePath: data.file_path || 'unknown',
            lineNumber: data.line_number || data.line_start || 1,
            evidenceLines: data.snippet
              ? data.snippet.split('\n').map((line: string, i: number) => ({
                num: (data.line_number || data.line_start || 1) + i,
                text: line,
              }))
              : [],
            autofix: data.autofix || null,
          });
        }
      } catch (err) {
        console.warn('Failed to load finding details:', err);
      } finally {
        setLoading(false);
      }
    }
    loadFinding();
  }, [findingId]);

  const handleApplyFix = async () => {
    if (!findingId) return;
    setApplyingFix(true);
    try {
      await api.request(`/api/v1/findings/${findingId}/apply-fix`, {
        method: 'POST',
        body: JSON.stringify({ suggestion_id: 'default' }),
      });
      setFixSuccess(true);
      setFindingData((prev: any) => prev ? ({ ...prev, status: 'Fixed' }) : null);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to apply remediation');
    } finally {
      setApplyingFix(false);
    }
  };

  const handleCreatePR = async () => {
    setCreatingPR(true);
    try {
      const res: any = await api.request(`/api/v1/findings/${findingId}/create-pr`, {
        method: 'POST',
        body: JSON.stringify({ title: `fix(security): resolve ${findingData.cwe} in ${findingData.filePath}` }),
      });
      const data = res?.data || res;
      setPrCreatedUrl(data?.pr_url || data?.html_url || `https://github.com/pulls`);
    } catch (err) {
      // Handle PR error
      setPrCreatedUrl(null);
    } finally {
      setCreatingPR(false);
    }
  };

  const copyLocation = () => {
    if (findingData?.location) {
      navigator.clipboard.writeText(findingData.location);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: '#64748B', gap: '8px' }}>
        <Loader2 size={18} className="animate-spin" />
        <span style={{ fontSize: '13px' }}>Loading finding details...</span>
      </div>
    );
  }

  if (!findingData) {
    return (
      <div style={{ padding: '32px', textAlign: 'center', color: '#64748B' }}>
        <ShieldAlert size={36} color="#94A3B8" style={{ margin: '0 auto 12px' }} />
        <h3 style={{ fontSize: '15px', color: '#0F172A', fontWeight: 600 }}>Finding Not Found</h3>
        <p style={{ fontSize: '13px', margin: '4px 0 16px' }}>The requested finding could not be located in the database.</p>
        <Link href={runId ? `/runs/${runId}/findings` : '/findings'} style={{ fontSize: '12px', color: '#0F172A', textDecoration: 'underline' }}>
          Return to Findings
        </Link>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        padding: '24px 32px',
        backgroundColor: '#F8FAFC',
        minHeight: '100vh',
        fontFamily: 'Inter, -apple-system, sans-serif',
      }}
    >
      {/* 1. Header with Breadcrumb and Status */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#64748B', marginBottom: '4px' }}>
            <Link href={runId ? `/runs/${runId}/findings` : '/findings'} style={{ color: '#64748B', textDecoration: 'none' }}>
              Findings
            </Link>
            <ChevronRight size={12} />
            <span style={{ color: '#0F172A', fontWeight: 600 }}>{findingData.codeId}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
              {findingData.codeId} - {findingData.title}
            </h1>
          </div>

          {/* Badges strip: Severity, Agent, CWE */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                backgroundColor: '#FEF2F2',
                color: '#DC2626',
                border: '1px solid #FECACA',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 600,
              }}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#DC2626' }} />
              {findingData.severity}
            </span>

            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                backgroundColor: '#F1F5F9',
                color: '#334155',
                border: '1px solid #E2E8F0',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 600,
              }}
            >
              <Code size={12} /> {findingData.agent}
            </span>

            <span
              style={{
                backgroundColor: '#F1F5F9',
                color: '#64748B',
                border: '1px solid #E2E8F0',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 600,
              }}
            >
              {findingData.cwe}
            </span>
          </div>
        </div>

        {/* Top Right Action Buttons: Status pill + More */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: findingData.status === 'Fixed' ? '#F0FDF4' : '#FFFFFF',
              color: findingData.status === 'Fixed' ? '#16A34A' : '#DC2626',
              border: findingData.status === 'Fixed' ? '1px solid #BBF7D0' : '1px solid #FECACA',
              padding: '4px 10px',
              borderRadius: '14px',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: findingData.status === 'Fixed' ? '#16A34A' : '#DC2626',
              }}
            />
            {findingData.status}
          </span>

          <button
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              padding: '6px 8px',
              borderRadius: '6px',
              cursor: 'pointer',
              color: '#64748B',
            }}
          >
            <MoreHorizontal size={14} />
          </button>
        </div>
      </div>

      {/* 2. Navigation Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', borderBottom: '1px solid #E2E8F0', paddingBottom: '2px' }}>
        {[
          { id: 'details', label: 'Details' },
          { id: 'fix', label: 'Fix Suggestion' },
          { id: 'autofix', label: 'Auto-fix' },
          { id: 'activity', label: 'Activity' },
          { id: 'references', label: 'References' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              padding: '8px 4px',
              fontSize: '13px',
              fontWeight: activeTab === tab.id ? 600 : 500,
              color: activeTab === tab.id ? '#0F172A' : '#64748B',
              borderBottom: activeTab === tab.id ? '2px solid #0F172A' : '2px solid transparent',
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

      {/* 3. Main Two-Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '24px' }}>
        {/* Left Column: Description, Location, Evidence */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '16px 20px',
            }}
          >
            <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', margin: '0 0 8px 0' }}>
              Description
            </h3>
            <p style={{ fontSize: '13px', color: '#475569', margin: 0, lineHeight: '1.5' }}>
              {findingData.description}
            </p>
          </div>

          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '16px 20px',
            }}
          >
            <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', margin: '0 0 8px 0' }}>
              Location
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span
                style={{
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  color: '#0F172A',
                  backgroundColor: '#F8FAFC',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  border: '1px solid #E2E8F0',
                }}
              >
                {findingData.location}
              </span>
              <button
                onClick={copyLocation}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '12px',
                  color: '#64748B',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {copied ? <Check size={12} color="#16A34A" /> : <Copy size={12} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '16px 20px',
            }}
          >
            <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', margin: '0 0 12px 0' }}>
              Evidence
            </h3>

            <div
              style={{
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '6px',
                padding: '12px 16px',
                fontFamily: 'Consolas, Monaco, monospace',
                fontSize: '12px',
                lineHeight: '1.6',
              }}
            >
              {findingData.evidenceLines.map((line: any, idx: number) => {
                const isVuln = line.num === 46;
                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      backgroundColor: isVuln ? '#FEF2F2' : 'transparent',
                      padding: '2px 4px',
                      borderRadius: '3px',
                    }}
                  >
                    <span
                      style={{
                        width: '32px',
                        color: isVuln ? '#DC2626' : '#94A3B8',
                        userSelect: 'none',
                        textAlign: 'right',
                        paddingRight: '12px',
                      }}
                    >
                      {line.num}
                    </span>
                    <span style={{ color: isVuln ? '#DC2626' : '#0F172A', fontWeight: isVuln ? 600 : 400 }}>
                      {line.text}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Auto-fix (AI) Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '16px 20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={14} color="#0F172A" />
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Auto-fix (AI)
                </h3>
              </div>
              <button
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  padding: '2px',
                }}
              >
                <X size={14} />
              </button>
            </div>

            <p style={{ fontSize: '12px', color: '#64748B', margin: '0 0 14px 0' }}>
              {findingData.autofix.explanation}
            </p>

            <div
              style={{
                borderRadius: '6px',
                border: '1px solid #E2E8F0',
                backgroundColor: '#F8FAFC',
                overflow: 'hidden',
                fontFamily: 'Consolas, Monaco, monospace',
                fontSize: '11px',
                marginBottom: '16px',
              }}
            >
              {findingData.autofix.removedLines.map((line: string, i: number) => (
                <div
                  key={`rem-${i}`}
                  style={{
                    backgroundColor: '#FEF2F2',
                    color: '#DC2626',
                    padding: '4px 10px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '6px',
                    borderBottom: '1px solid #FEE2E2',
                  }}
                >
                  <span style={{ userSelect: 'none', fontWeight: 700 }}>-</span>
                  <span style={{ whiteSpace: 'pre-wrap' }}>{line}</span>
                </div>
              ))}

              {findingData.autofix.addedLines.map((line: string, i: number) => (
                <div
                  key={`add-${i}`}
                  style={{
                    backgroundColor: '#F0FDF4',
                    color: '#16A34A',
                    padding: '4px 10px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '6px',
                  }}
                >
                  <span style={{ userSelect: 'none', fontWeight: 700 }}>+</span>
                  <span style={{ whiteSpace: 'pre-wrap' }}>{line}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                onClick={handleApplyFix}
                disabled={applyingFix || fixSuccess}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: fixSuccess ? '#16A34A' : '#0F172A',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '8px 14px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: applyingFix || fixSuccess ? 'default' : 'pointer',
                  transition: 'background-color 0.15s ease',
                }}
              >
                <Check size={13} />
                {applyingFix ? 'Applying...' : fixSuccess ? 'Fix Applied' : 'Apply Fix'}
              </button>

              <button
                onClick={handleCreatePR}
                disabled={creatingPR}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: '#FFFFFF',
                  color: '#0F172A',
                  border: '1px solid #E2E8F0',
                  padding: '8px 14px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: creatingPR ? 'default' : 'pointer',
                }}
              >
                <GitPullRequest size={13} />
                {creatingPR ? 'Creating PR...' : 'Create PR'}
              </button>
            </div>

            {prCreatedUrl && (
              <div
                style={{
                  marginTop: '12px',
                  padding: '8px 12px',
                  backgroundColor: '#F0FDF4',
                  border: '1px solid #BBF7D0',
                  borderRadius: '6px',
                  fontSize: '11px',
                  color: '#16A34A',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span>Pull Request created successfully!</span>
                <a
                  href={prCreatedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: '#16A34A',
                    fontWeight: 600,
                    textDecoration: 'underline',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  View PR <ExternalLink size={10} />
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default FindingDetailView;

