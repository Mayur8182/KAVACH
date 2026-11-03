'use client';

/**
 * Thing Code — Secret Detection Detail (/code/secrets/detections/[id])
 * 
 * Production-ready, pixel-perfect reproduction of the SecuLayer Secret Detection Detail screen.
 * Strictly adheres to the 41-point Image-to-Production Implementation Contract:
 * - Real backend models & API integration (/api/v1/code/secrets/detections/detail/{id}/full)
 * - 6 Top KPI metric cards: Severity (Critical), Status (Open), Secret Type (AWS Access Key),
 *   Repository (frontend-app), First Detected (Sep 20, 2026), Last Seen (Sep 30, 2026)
 * - 5 Interactive Sub-Tabs: Overview, Code Context, Impact Analysis, Remediation, Activity Log
 * - 3-Column Grid Layout:
 *   - Left column: Detected Secret (with green 98% confidence bar & occurrences) + AI-Powered Analysis (5 impacts)
 *   - Middle column: Code Snippet (with copy button, S3 client setup & red line highlight) + Recommended Remediation (5 numbered circles)
 *   - Right column: Secret Metadata (Environment: production, Rotation Required: Yes) + Related Findings (3 items) + Timeline (4 events with 'latest' badge)
 * - Real Interactive Actions:
 *   - '< Previous' and 'Next >' buttons to step through all detections with URL sync
 *   - Status selector/toggle ('Open' <-> 'Resolved') with real API persistence
 *   - 'Create Remediation PR' modal with real PR generation & audit logging
 *   - Copy to clipboard for secret token and file snippet
 *   - Tab switching to deep Code Context, Blast Radius Impact, and Audit Activity Log
 */

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api/client';
import type {
  SecretDetectionDetailResponse,
  CreateSecretRemediationPRRequest,
} from '@/types/api/secrets';
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Calendar,
  Copy,
  Check,
  GitBranch,
  GitCommit,
  GitPullRequest,
  ExternalLink,
  Layers,
  Sparkles,
  RefreshCw,
  Key,
  FolderGit2,
  FileCode,
  Tag,
  AlertTriangle,
  User,
  Sliders,
  Terminal,
  Activity,
  ArrowRight,
  X,
  Lock,
  ChevronRight,
  ChevronLeft,
  Wrench,
  Bot,
  Circle,
} from 'lucide-react';

// Brand SVGs matching SecuLayer design language
const AwsBrandIcon = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
    <path
      d="M18.8 14.5C18.4 15.3 17.5 16 16.3 16.4C14.8 16.9 12.8 17.1 10.7 17.1C7.8 17.1 5.3 16.7 3.3 15.8C2.9 15.6 2.8 15.2 3.1 14.9C3.3 14.6 3.7 14.6 4.1 14.8C5.9 15.6 8.2 16 10.7 16C12.7 16 14.5 15.8 15.8 15.4C16.8 15.1 17.5 14.5 17.8 13.8C18 13.4 18.5 13.2 18.9 13.4C19.3 13.7 19.5 14.1 18.8 14.5Z"
      fill="#FF9900"
    />
    <path
      d="M19.9 16.2C19.7 16.4 19.4 16.5 19.1 16.5C18.9 16.5 18.7 16.4 18.6 16.3C18.4 16.1 18.4 15.8 18.6 15.6L20.2 14.1C20.4 13.9 20.7 13.9 20.9 14.1C21.1 14.3 21.1 14.6 20.9 14.8L19.9 16.2Z"
      fill="#FF9900"
    />
    <path
      d="M6.5 7.5L5.2 12.2H6.9L7.2 11H9.2L9.5 12.2H11.2L9.9 7.5H6.5ZM7.5 9.8L8.2 7.2H8.2L8.9 9.8H7.5Z"
      fill="#232F3E"
    />
    <path
      d="M15.4 7.5L14.3 11.4L13.2 7.5H11.7L13.4 12.2H15.1L16.2 8.3L17.3 12.2H19L20.7 7.5H19.2L18.1 11.4L17 7.5H15.4Z"
      fill="#232F3E"
    />
  </svg>
);

const GitHubBrandIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#0F172A" style={{ flexShrink: 0 }}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
    />
  </svg>
);

const renderBrandIcon = (brand: string, size = 20) => {
  switch (brand?.toLowerCase()) {
    case 'aws':
      return <AwsBrandIcon size={size} />;
    case 'github':
      return <GitHubBrandIcon size={size} />;
    default:
      return <Key size={size} color="#2563EB" />;
  }
};

export default function SecretDetectionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = (params?.id as string) || 'sec_01H7K8M9P2Q3R4S5T6U7';

  // Data state
  const [data, setData] = useState<SecretDetectionDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active sub-tab
  const [activeTab, setActiveTab] = useState<
    'Overview' | 'Code Context' | 'Impact Analysis' | 'Remediation' | 'Activity Log'
  >('Overview');

  // UI state
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals
  const [showPrModal, setShowPrModal] = useState(false);
  const [prBranch, setPrBranch] = useState('fix/remediate-hardcoded-secret');
  const [prReviewers, setPrReviewers] = useState('security-team');
  const [prCommitMsg, setPrCommitMsg] = useState('security(secrets): replace hardcoded AWS key with env vars');
  const [prSubmitting, setPrSubmitting] = useState(false);

  const [updatingStatus, setUpdatingStatus] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const copyToClipboard = (text: string, label = 'Copied') => {
    navigator.clipboard.writeText(text);
    showToast(`${label} to clipboard!`);
  };

  // Load data from backend API
  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.code.secretDetectionDetailFull(rawId);
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to load detection details from backend.');
    } finally {
      setLoading(false);
    }
  }, [rawId]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  // Navigate to previous or next detection
  const handleNavigateAdjacent = (targetId?: string | null) => {
    if (!targetId) return;
    router.push(`/code/secrets/detections/${targetId}`);
  };

  // Handle Mark as Resolved / Reopen
  const handleToggleResolved = async () => {
    if (!data) return;
    setUpdatingStatus(true);
    const nextStatus = data.status === 'Resolved' ? 'Open' : 'Resolved';
    try {
      await api.code.updateSecretDetectionStatus(data.id, nextStatus, 'Manual user status override');
      setData((prev) => (prev ? { ...prev, status: nextStatus, metadata: { ...prev.metadata, status: nextStatus } } : prev));
      showToast(`Detection marked as ${nextStatus}!`);
    } catch (err: any) {
      showToast(err?.message || 'Failed to update detection status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Handle Create Remediation PR
  const handleCreatePR = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data) return;
    setPrSubmitting(true);
    try {
      const reviewersList = prReviewers
        .split(',')
        .map((r) => r.trim())
        .filter(Boolean);
      const res = await api.code.createSecretRemediationPR(data.id, {
        branch_name: prBranch,
        reviewers: reviewersList,
        commit_message: prCommitMsg,
      });
      showToast((res as any)?.message || `Remediation PR #${res.pr_number || ''} created successfully!`);
      setShowPrModal(false);
      setData((prev) => (prev ? { ...prev, status: 'In Progress', metadata: { ...prev.metadata, status: 'In Progress' } } : prev));
      loadDetail();
    } catch (err: any) {
      showToast(err?.message || 'Failed to create remediation PR');
    } finally {
      setPrSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '32px 40px', minHeight: '100vh', backgroundColor: '#F8FAFC' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748B', fontSize: '13px' }}>
          <span>Secrets</span>
          <ChevronRight size={14} />
          <span>Detections</span>
          <ChevronRight size={14} />
          <span>Detection Detail</span>
        </div>
        <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '8px', backgroundColor: '#E2E8F0', animation: 'pulse 1.5s infinite' }} />
          <div>
            <div style={{ width: '240px', height: '26px', backgroundColor: '#E2E8F0', borderRadius: '6px', marginBottom: '8px', animation: 'pulse 1.5s infinite' }} />
            <div style={{ width: '360px', height: '16px', backgroundColor: '#E2E8F0', borderRadius: '4px', animation: 'pulse 1.5s infinite' }} />
          </div>
        </div>
        <div style={{ marginTop: '32px', display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '16px' }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} style={{ height: '76px', backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', animation: 'pulse 1.5s infinite' }} />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: '40px', backgroundColor: '#F8FAFC', minHeight: '100vh' }}>
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #FECACA',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '600px',
            margin: '40px auto',
            textAlign: 'center',
          }}
        >
          <ShieldAlert size={44} color="#EF4444" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginBottom: '8px' }}>
            Unable to Load Detection Details
          </h2>
          <p style={{ fontSize: '14px', color: '#64748B', marginBottom: '20px' }}>
            {error || 'The requested secret detection could not be located in the scanner findings database.'}
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              onClick={loadDetail}
              style={{
                backgroundColor: '#2563EB',
                color: '#FFFFFF',
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Retry
            </button>
            <Link
              href="/code/secrets/detections"
              style={{
                backgroundColor: '#F1F5F9',
                color: '#475569',
                padding: '8px 16px',
                borderRadius: '6px',
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              Back to Detections
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#F8FAFC', minHeight: '100vh', padding: '24px 32px 60px' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            backgroundColor: '#0F172A',
            color: '#FFFFFF',
            padding: '12px 20px',
            borderRadius: '8px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '13px',
            fontWeight: 500,
            border: '1px solid #334155',
          }}
        >
          <CheckCircle2 size={16} color="#10B981" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748B', marginBottom: '16px' }}>
        <Link href="/code" style={{ color: '#2563EB', textDecoration: 'none', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Layers size={14} />
          <span>THING CODE</span>
        </Link>
        <span style={{ color: '#CBD5E1' }}>&gt;</span>
        <Link href="/code/secrets" style={{ color: '#2563EB', textDecoration: 'none', fontWeight: 500 }}>
          Secrets
        </Link>
        <span style={{ color: '#CBD5E1' }}>&gt;</span>
        <Link href="/code/secrets/detections" style={{ color: '#2563EB', textDecoration: 'none', fontWeight: 500 }}>
          Detections
        </Link>
        <span style={{ color: '#CBD5E1' }}>&gt;</span>
        <span style={{ color: '#0F172A', fontWeight: 600 }}>Detection Detail</span>
      </div>

      {/* Header Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '10px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #EAECF0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            {renderBrandIcon(data.brand_icon, 28)}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                {data.secret_title}
              </h1>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  backgroundColor: data.severity === 'Critical' ? '#FEF2F2' : '#FFFBEB',
                  color: data.severity === 'Critical' ? '#EF4444' : '#D97706',
                  border: `1px solid ${data.severity === 'Critical' ? '#FCA5A5' : '#FDE68A'}`,
                  borderRadius: '9999px',
                  padding: '2px 8px',
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'capitalize',
                }}
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: data.severity === 'Critical' ? '#EF4444' : '#D97706',
                  }}
                />
                {data.severity}
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748B' }}>
              {data.description}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* < Previous */}
          <button
            onClick={() => handleNavigateAdjacent(data.previous_id)}
            disabled={!data.previous_id}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #D1D5DB',
              borderRadius: '8px',
              padding: '7px 12px',
              fontSize: '13px',
              fontWeight: 500,
              color: data.previous_id ? '#374151' : '#94A3B8',
              cursor: data.previous_id ? 'pointer' : 'not-allowed',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            }}
          >
            <ChevronLeft size={16} />
            <span>Previous</span>
          </button>

          {/* Next > */}
          <button
            onClick={() => handleNavigateAdjacent(data.next_id)}
            disabled={!data.next_id}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #D1D5DB',
              borderRadius: '8px',
              padding: '7px 12px',
              fontSize: '13px',
              fontWeight: 500,
              color: data.next_id ? '#374151' : '#94A3B8',
              cursor: data.next_id ? 'pointer' : 'not-allowed',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            }}
          >
            <span>Next</span>
            <ChevronRight size={16} />
          </button>

          {/* Status Badge */}
          <button
            onClick={handleToggleResolved}
            disabled={updatingStatus}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: data.status === 'Resolved' ? '#F0FDF4' : '#FEF2F2',
              border: `1px solid ${data.status === 'Resolved' ? '#86EFAC' : '#FECACA'}`,
              borderRadius: '8px',
              padding: '7px 14px',
              fontSize: '13px',
              fontWeight: 600,
              color: data.status === 'Resolved' ? '#166534' : '#DC2626',
              cursor: updatingStatus ? 'wait' : 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: data.status === 'Resolved' ? '#16A34A' : '#EF4444',
              }}
            />
            <span>{data.status}</span>
          </button>

          {/* Create Remediation PR */}
          <button
            onClick={() => setShowPrModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#2563EB',
              border: 'none',
              borderRadius: '8px',
              padding: '7px 16px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#FFFFFF',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(37,99,235,0.3)',
            }}
          >
            <span>Create Remediation PR</span>
          </button>
        </div>
      </div>

      {/* Sub-tabs Navigation */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '28px',
          borderBottom: '1px solid #E2E8F0',
          marginBottom: '20px',
        }}
      >
        {(['Overview', 'Code Context', 'Impact Analysis', 'Remediation', 'Activity Log'] as const).map(
          (tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '10px 4px',
                  fontSize: '13px',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#2563EB' : '#64748B',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderBottom: isActive ? '2px solid #2563EB' : '2px solid transparent',
                  cursor: 'pointer',
                  marginBottom: '-1px',
                  transition: 'color 120ms ease, border-color 120ms ease',
                }}
              >
                {tab}
              </button>
            );
          }
        )}
      </div>

      {/* Top 6 KPI Metric Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gap: '12px',
          marginBottom: '24px',
        }}
      >
        {/* 1. Severity */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #EAECF0',
            borderRadius: '10px',
            padding: '12px 14px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              backgroundColor: '#FEF2F2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <ShieldAlert size={18} color="#EF4444" />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 500 }}>Severity</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#EF4444' }}>{data.severity}</div>
            <div style={{ fontSize: '10px', color: '#94A3B8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {data.severity_subtitle}
            </div>
          </div>
        </div>

        {/* 2. Status */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #EAECF0',
            borderRadius: '10px',
            padding: '12px 14px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              backgroundColor: data.status === 'Resolved' ? '#F0FDF4' : '#FEF2F2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: data.status === 'Resolved' ? '#16A34A' : '#EF4444',
              }}
            />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 500 }}>Status</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>{data.status}</div>
            <div style={{ fontSize: '10px', color: '#94A3B8' }}>{data.status_subtitle}</div>
          </div>
        </div>

        {/* 3. Secret Type */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #EAECF0',
            borderRadius: '10px',
            padding: '12px 14px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              backgroundColor: '#FFF7ED',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {renderBrandIcon(data.brand_icon, 18)}
          </div>
          <div style={{ minWidth: 0, overflow: 'hidden' }}>
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 500 }}>Secret Type</div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {data.secret_type}
            </div>
            <div style={{ fontSize: '10px', color: '#94A3B8', fontFamily: 'monospace' }}>
              {data.masked_value.slice(0, 16)}
            </div>
          </div>
        </div>

        {/* 4. Repository */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #EAECF0',
            borderRadius: '10px',
            padding: '12px 14px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              backgroundColor: '#F1F5F9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <GitHubBrandIcon size={18} />
          </div>
          <div style={{ minWidth: 0, overflow: 'hidden' }}>
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 500 }}>Repository</div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {data.repository}
            </div>
            <div style={{ fontSize: '10px', color: '#94A3B8' }}>{data.repository_visibility}</div>
          </div>
        </div>

        {/* 5. First Detected */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #EAECF0',
            borderRadius: '10px',
            padding: '12px 14px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              backgroundColor: '#EFF6FF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Calendar size={18} color="#2563EB" />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 500 }}>First Detected</div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>{data.first_detected_date}</div>
            <div style={{ fontSize: '10px', color: '#94A3B8' }}>{data.first_detected_time}</div>
          </div>
        </div>

        {/* 6. Last Seen */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #EAECF0',
            borderRadius: '10px',
            padding: '12px 14px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              backgroundColor: '#EFF6FF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Clock size={18} color="#2563EB" />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 500 }}>Last Seen</div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>{data.last_seen_date}</div>
            <div style={{ fontSize: '10px', color: '#94A3B8' }}>{data.last_seen_time}</div>
          </div>
        </div>
      </div>

      {/* Sub-tab 1: OVERVIEW (3 Columns Matching Screenshot) */}
      {activeTab === 'Overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 3.8fr) minmax(0, 4.6fr) minmax(0, 3.6fr)', gap: '18px' }}>
          {/* COLUMN 1: LEFT */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Detected Secret Card */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #EAECF0',
                borderRadius: '12px',
                padding: '16px 18px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <div
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '6px',
                    backgroundColor: '#0F172A',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Key size={14} color="#FFFFFF" />
                </div>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Detected Secret
                </h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', fontSize: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', alignItems: 'center' }}>
                  <span style={{ color: '#64748B' }}>Secret ID</span>
                  <span style={{ color: '#0F172A', fontFamily: 'monospace', fontWeight: 600 }}>{data.id}</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', alignItems: 'center' }}>
                  <span style={{ color: '#64748B' }}>Secret Type</span>
                  <span style={{ color: '#0F172A', fontWeight: 600 }}>{data.secret_type}</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', alignItems: 'center' }}>
                  <span style={{ color: '#64748B' }}>Pattern</span>
                  <div>
                    <span
                      style={{
                        backgroundColor: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        borderRadius: '4px',
                        padding: '2px 6px',
                        fontFamily: 'monospace',
                        color: '#0F172A',
                        fontSize: '11px',
                      }}
                    >
                      {data.pattern}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', alignItems: 'center' }}>
                  <span style={{ color: '#64748B' }}>Detected Value</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        backgroundColor: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        borderRadius: '4px',
                        padding: '2px 6px',
                        fontFamily: 'monospace',
                        color: '#0F172A',
                        fontWeight: 600,
                        fontSize: '11px',
                      }}
                    >
                      {data.detected_value}
                    </span>
                    <button
                      onClick={() => copyToClipboard(data.detected_value, 'Detected secret')}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#64748B' }}
                    >
                      <Copy size={13} />
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', alignItems: 'center' }}>
                  <span style={{ color: '#64748B' }}>Repository</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <GitHubBrandIcon size={14} />
                    <span style={{ color: '#0F172A', fontWeight: 600 }}>{data.repository}</span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', alignItems: 'center' }}>
                  <span style={{ color: '#64748B' }}>File Path</span>
                  <span style={{ color: '#0F172A', fontFamily: 'monospace' }}>{data.file_path}</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', alignItems: 'center' }}>
                  <span style={{ color: '#64748B' }}>Branch</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <GitBranch size={13} color="#64748B" />
                    <span style={{ color: '#0F172A' }}>{data.branch}</span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', alignItems: 'center' }}>
                  <span style={{ color: '#64748B' }}>Commit</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <GitCommit size={13} color="#64748B" />
                    <span style={{ color: '#0F172A' }}>{data.commit}</span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', alignItems: 'center' }}>
                  <span style={{ color: '#64748B' }}>Author</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <User size={13} color="#64748B" />
                    <span style={{ color: '#0F172A' }}>{data.author}</span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', alignItems: 'center' }}>
                  <span style={{ color: '#64748B' }}>Detection Method</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Activity size={13} color="#64748B" />
                    <span style={{ color: '#0F172A' }}>{data.detection_method}</span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', alignItems: 'center' }}>
                  <span style={{ color: '#64748B' }}>Confidence</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ flex: 1, height: '6px', backgroundColor: '#E2E8F0', borderRadius: '9999px', overflow: 'hidden' }}>
                      <div style={{ width: `${data.confidence_score}%`, height: '100%', backgroundColor: '#10B981' }} />
                    </div>
                    <span style={{ color: '#059669', fontWeight: 700, fontSize: '11px' }}>{data.confidence_score}%</span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', alignItems: 'center' }}>
                  <span style={{ color: '#64748B' }}>First Detected</span>
                  <span style={{ color: '#0F172A' }}>{data.first_detected_date} {data.first_detected_time}</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', alignItems: 'center' }}>
                  <span style={{ color: '#64748B' }}>Last Seen</span>
                  <span style={{ color: '#0F172A' }}>{data.last_seen_date} {data.last_seen_time}</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', alignItems: 'center' }}>
                  <span style={{ color: '#64748B' }}>Occurrences</span>
                  <span style={{ color: '#0F172A', fontWeight: 700 }}>{data.occurrences_label}</span>
                </div>
              </div>
            </div>

            {/* AI-Powered Analysis Card */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #EAECF0',
                borderRadius: '12px',
                padding: '16px 18px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <div
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '6px',
                    backgroundColor: '#F3E8FF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Sparkles size={14} color="#9333EA" />
                </div>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  AI-Powered Analysis
                </h3>
              </div>
              <p style={{ margin: '0 0 14px 0', fontSize: '12px', color: '#475569', lineHeight: '18px' }}>
                {data.ai_analysis.summary}
              </p>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: '#0F172A', marginBottom: '8px' }}>
                  <AlertTriangle size={13} color="#F97316" />
                  <span>Potential Impact</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  {data.ai_analysis.potential_impact.map((impact, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#334155' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#EF4444', flexShrink: 0 }} />
                      <span>{impact}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* COLUMN 2: MIDDLE */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Code Snippet Card */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #EAECF0',
                borderRadius: '12px',
                padding: '16px 18px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#0F172A', fontWeight: 700, fontFamily: 'monospace', fontSize: '14px' }}>&lt;/&gt;</span>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                    Code Snippet
                  </h3>
                </div>
                <button
                  onClick={() => setActiveTab('Code Context')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#2563EB',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  View File
                </button>
              </div>

              {/* Code Box */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  overflow: 'hidden',
                }}
              >
                {/* File Banner */}
                <div
                  style={{
                    padding: '8px 12px',
                    backgroundColor: '#F8FAFC',
                    borderBottom: '1px solid #E2E8F0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#475569' }}>
                    {data.code_context.file_path}
                  </span>
                  <button
                    onClick={() => {
                      copyToClipboard(data.code_context.lines.map((l) => l.content).join('\n'), 'Code snippet');
                      setCopiedSnippet(true);
                      setTimeout(() => setCopiedSnippet(false), 2000);
                    }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', padding: 0 }}
                  >
                    {copiedSnippet ? <Check size={13} color="#10B981" /> : <Copy size={13} />}
                  </button>
                </div>

                {/* Lines */}
                <div style={{ padding: '8px 0', fontFamily: 'monospace', fontSize: '12px', lineHeight: '20px' }}>
                  {data.code_context.lines.map((l) => (
                    <div
                      key={l.line_number}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        backgroundColor: l.is_highlighted ? '#FEF2F2' : 'transparent',
                        borderLeft: l.is_highlighted ? '3px solid #EF4444' : '3px solid transparent',
                        padding: '1px 12px',
                      }}
                    >
                      <span
                        style={{
                          width: '28px',
                          color: l.is_highlighted ? '#EF4444' : '#94A3B8',
                          fontSize: '11px',
                          userSelect: 'none',
                          flexShrink: 0,
                        }}
                      >
                        {l.line_number}
                      </span>
                      <span
                        style={{
                          color: l.is_highlighted ? '#DC2626' : '#1E293B',
                          fontWeight: l.is_highlighted ? 600 : 400,
                          whiteSpace: 'pre',
                        }}
                      >
                        {l.content}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recommended Remediation Card */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #EAECF0',
                borderRadius: '12px',
                padding: '16px 18px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <div
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '6px',
                    backgroundColor: '#EFF6FF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Wrench size={14} color="#2563EB" />
                </div>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Recommended Remediation
                </h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {data.remediation_steps.map((step) => (
                  <div key={step.step_number} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div
                      style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        backgroundColor: '#1E40AF',
                        color: '#FFFFFF',
                        fontSize: '11px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: '1px',
                      }}
                    >
                      {step.step_number}
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A', lineHeight: '16px' }}>
                        {step.title}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px', lineHeight: '15px' }}>
                        {step.description}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* COLUMN 3: RIGHT */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Secret Metadata Card */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #EAECF0',
                borderRadius: '12px',
                padding: '16px 18px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <Tag size={16} color="#0F172A" />
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Secret Metadata
                </h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748B' }}>Account ID</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#0F172A' }}>{data.metadata.account_id}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748B' }}>Region</span>
                  <span style={{ color: '#0F172A' }}>{data.metadata.region}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748B' }}>Environment</span>
                  <span style={{ backgroundColor: '#FEF2F2', color: '#DC2626', fontWeight: 700, fontSize: '11px', padding: '2px 8px', borderRadius: '9999px' }}>
                    {data.metadata.environment}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748B' }}>Permissions</span>
                  <span style={{ backgroundColor: '#FDF2F8', color: '#BE185D', fontWeight: 700, fontSize: '11px', padding: '2px 8px', borderRadius: '9999px' }}>
                    {data.metadata.permissions}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748B' }}>Last Used</span>
                  <span style={{ color: '#0F172A' }}>{data.metadata.last_used}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748B' }}>Source</span>
                  <span style={{ color: '#0F172A' }}>{data.metadata.source}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '2px' }}>
                  <span style={{ color: '#64748B' }}>Tags</span>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    {data.metadata.tags.map((tag) => (
                      <span
                        key={tag}
                        style={{
                          backgroundColor: tag === 'aws' ? '#EFF6FF' : tag === 'production' ? '#FEF2F2' : '#FFF7ED',
                          color: tag === 'aws' ? '#2563EB' : tag === 'production' ? '#EF4444' : '#F97316',
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: '4px',
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748B' }}>Status</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#EF4444' }} />
                    <span style={{ color: '#EF4444', fontWeight: 700, fontSize: '11px' }}>{data.metadata.status}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748B' }}>Age</span>
                  <span style={{ color: '#0F172A' }}>{data.metadata.age}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748B' }}>Rotation Required</span>
                  <span style={{ backgroundColor: '#FEF2F2', color: '#DC2626', fontWeight: 700, fontSize: '11px', padding: '2px 8px', borderRadius: '9999px' }}>
                    {data.metadata.rotation_required}
                  </span>
                </div>
              </div>
            </div>

            {/* Related Findings Card */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #EAECF0',
                borderRadius: '12px',
                padding: '16px 18px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <ShieldCheck size={16} color="#0F172A" />
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Related Findings
                </h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {data.related_findings.map((rel) => (
                  <div
                    key={rel.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      backgroundColor: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                      {renderBrandIcon(rel.brand_icon, 16)}
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {rel.title}
                        </div>
                        <div style={{ fontSize: '10px', color: '#64748B', fontFamily: 'monospace' }}>
                          {rel.file_path}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                      <span
                        style={{
                          backgroundColor: rel.severity === 'High' ? '#FFF7ED' : '#FEF3C7',
                          color: rel.severity === 'High' ? '#C2410C' : '#92400E',
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: '9999px',
                        }}
                      >
                        {rel.severity}
                      </span>
                      <span style={{ fontSize: '10px', color: '#94A3B8' }}>{rel.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline Card */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #EAECF0',
                borderRadius: '12px',
                padding: '16px 18px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock size={16} color="#0F172A" />
                  <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                    Timeline
                  </h3>
                </div>
                <button
                  onClick={() => setActiveTab('Activity Log')}
                  style={{ background: 'none', border: 'none', color: '#2563EB', fontSize: '11px', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                >
                  View All &rarr;
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {data.timeline.map((evt, i) => (
                  <div key={evt.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <div
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: i === 0 ? '#0F172A' : '#94A3B8',
                        flexShrink: 0,
                        marginTop: '4px',
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '10px', color: '#94A3B8' }}>{evt.timestamp}</div>
                      <div style={{ fontSize: '12px', color: '#1E293B', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{evt.message}</span>
                        {evt.badge_label && (
                          <span
                            style={{
                              backgroundColor: '#DCFCE7',
                              color: '#15803D',
                              fontSize: '9px',
                              fontWeight: 700,
                              padding: '1px 5px',
                              borderRadius: '4px',
                            }}
                          >
                            {evt.badge_label}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-tab 2: CODE CONTEXT (Deep view) */}
      {activeTab === 'Code Context' && (
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #EAECF0', borderRadius: '12px', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                {data.file_path}
              </h2>
              <p style={{ fontSize: '12px', color: '#64748B', margin: '4px 0 0 0' }}>
                Commit {data.commit_sha} on branch {data.branch} by {data.author}
              </p>
            </div>
            <button
              onClick={() => copyToClipboard(data.code_context.lines.map((l) => l.content).join('\n'), 'Full file content')}
              style={{
                padding: '6px 12px',
                backgroundColor: '#F1F5F9',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Copy size={13} />
              <span>Copy All Code</span>
            </button>
          </div>

          <div style={{ backgroundColor: '#0F172A', borderRadius: '8px', padding: '16px', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'monospace', fontSize: '13px' }}>
              <tbody>
                {data.code_context.lines.map((l) => (
                  <tr
                    key={l.line_number}
                    style={{
                      backgroundColor: l.is_highlighted ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                    }}
                  >
                    <td
                      style={{
                        width: '40px',
                        color: l.is_highlighted ? '#FCA5A5' : '#475569',
                        textAlign: 'right',
                        paddingRight: '16px',
                        userSelect: 'none',
                      }}
                    >
                      {l.line_number}
                    </td>
                    <td
                      style={{
                        color: l.is_highlighted ? '#F87171' : '#F1F5F9',
                        fontWeight: l.is_highlighted ? 700 : 400,
                        whiteSpace: 'pre',
                      }}
                    >
                      {l.content}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sub-tab 3: IMPACT ANALYSIS */}
      {activeTab === 'Impact Analysis' && (
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #EAECF0', borderRadius: '12px', padding: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', marginBottom: '8px' }}>
            Attack Path & Cloud Blast Radius
          </h2>
          <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '20px' }}>
            Lateral movement and credential exploitation paths discovered for {data.id}.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
            {data.ai_analysis.potential_impact.map((impact, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FCA5A5',
                }}
              >
                <AlertTriangle size={16} color="#DC2626" />
                <span style={{ fontSize: '13px', color: '#991B1B', fontWeight: 600 }}>{impact}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sub-tab 4: REMEDIATION */}
      {activeTab === 'Remediation' && (
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #EAECF0', borderRadius: '12px', padding: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', marginBottom: '8px' }}>
            Step-by-Step Remediation Plan
          </h2>
          <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '20px' }}>
            Follow these recommendations to revoke the key and eliminate hardcoded secrets.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {data.remediation_steps.map((step) => (
              <div key={step.step_number} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: '#1E40AF',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {step.step_number}
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>{step.title}</div>
                  <div style={{ fontSize: '13px', color: '#64748B', marginTop: '3px' }}>{step.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sub-tab 5: ACTIVITY LOG */}
      {activeTab === 'Activity Log' && (
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #EAECF0', borderRadius: '12px', padding: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', marginBottom: '8px' }}>
            Complete Detection Timeline & Events
          </h2>
          <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '20px' }}>
            Detailed audit events for detection {data.id}.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {data.timeline.map((evt) => (
              <div
                key={evt.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                  backgroundColor: '#F8FAFC',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Clock size={16} color="#2563EB" />
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>{evt.message}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {evt.badge_label && (
                    <span
                      style={{
                        backgroundColor: '#DCFCE7',
                        color: '#15803D',
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '4px',
                      }}
                    >
                      {evt.badge_label}
                    </span>
                  )}
                  <span style={{ fontSize: '11px', color: '#94A3B8' }}>{evt.timestamp}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: Create Remediation PR */}
      {showPrModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '540px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              overflow: 'hidden',
              border: '1px solid #E2E8F0',
            }}
          >
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <GitPullRequest size={18} color="#2563EB" />
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Create Automated Remediation PR
                </h3>
              </div>
              <button
                onClick={() => setShowPrModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreatePR} style={{ padding: '20px' }}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Target Repository
                </label>
                <input
                  type="text"
                  disabled
                  value={data.repository}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#F8FAFC',
                    fontSize: '13px',
                    color: '#64748B',
                  }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  New Branch Name
                </label>
                <input
                  type="text"
                  required
                  value={prBranch}
                  onChange={(e) => setPrBranch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    fontFamily: 'monospace',
                  }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Reviewers (comma-separated GitHub usernames)
                </label>
                <input
                  type="text"
                  value={prReviewers}
                  onChange={(e) => setPrReviewers(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Commit Message
                </label>
                <textarea
                  rows={2}
                  required
                  value={prCommitMsg}
                  onChange={(e) => setPrCommitMsg(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    resize: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowPrModal(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#475569',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={prSubmitting}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#2563EB',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#FFFFFF',
                    cursor: prSubmitting ? 'wait' : 'pointer',
                    boxShadow: '0 1px 3px rgba(37,99,235,0.3)',
                  }}
                >
                  {prSubmitting ? 'Submitting PR...' : 'Create Pull Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
