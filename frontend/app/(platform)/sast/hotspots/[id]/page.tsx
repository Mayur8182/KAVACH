'use client';

/**
 * SecuLayer SAST — Hotspot Detail & Code Review Page (/sast/hotspots/[id])
 * Screenshots Reference 10.3, 10.4, 10.5
 * Displays: Summary, Risk info, Code location, Repository, Branch, Commit, Rule, Severity, Assignee, Tags, References
 * Tabs: Overview | Code | Security Context | Remediation | References | History
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  GitBranch,
  GitCommit,
  FolderGit2,
  User as UserIcon,
  Copy,
  Check,
  CornerDownRight,
  Send,
  MessageSquare,
  Bookmark,
  Share2,
  Plus,
  X,
  Code2,
  BookOpen,
  Wrench,
  History as HistoryIcon,
  ArrowRight,
  Terminal,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import {
  HotspotsBreadcrumbs,
  HotspotSeverityBadge,
  HotspotStatusBadge,
  HotspotCategoryBadge,
} from '@/components/hotspots/HotspotComponents';

export default function HotspotDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const hotspotId = params.id as string;

  // Active tab state (from URL query if present, e.g. ?tab=code)
  const [activeTab, setActiveTab] = useState<string>(searchParams.get('tab') || 'overview');

  // Hotspot data
  const [hotspot, setHotspot] = useState<any>(null);
  const [codeContext, setCodeContext] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Review & Comment state
  const [reviewStatus, setReviewStatus] = useState<string>('TO_REVIEW');
  const [reviewAssignee, setReviewAssignee] = useState<string>('Unassigned');
  const [reviewPriority, setReviewPriority] = useState<string>('High');
  const [reviewComment, setReviewComment] = useState<string>('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Code Tab state
  const [copiedCode, setCopiedCode] = useState(false);
  const [targetLineInput, setTargetLineInput] = useState<string>('');
  const codeContainerRef = useRef<HTMLDivElement>(null);

  // Issue modal state
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueTracker, setIssueTracker] = useState<'github' | 'jira' | 'linear'>('github');
  const [issueTitle, setIssueTitle] = useState('');
  const [creatingIssue, setCreatingIssue] = useState(false);

  // Tags state
  const [tagInput, setTagInput] = useState('');
  const [showAddTag, setShowAddTag] = useState(false);

  // Assign modal state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigneeInput, setAssigneeInput] = useState('');

  const loadHotspotData = useCallback(async () => {
    if (!hotspotId) return;
    setLoading(true);
    setError(null);
    try {
      const [detailData, codeData, historyData] = await Promise.all([
        api.hotspots.get(hotspotId),
        api.hotspots.getCode(hotspotId).catch(() => null),
        api.hotspots.getHistory(hotspotId).catch(() => []),
      ]);

      setHotspot(detailData);
      setReviewStatus(detailData.status || 'TO_REVIEW');
      setReviewAssignee(detailData.assignee_name || 'Unassigned');
      setReviewPriority(detailData.risk_level || 'High');
      setIssueTitle(`[Hotspot] ${detailData.title} in ${detailData.file_path}`);

      if (codeData) setCodeContext(codeData);
      if (Array.isArray(historyData)) setHistory(historyData);
    } catch (err: any) {
      console.error('Failed to load hotspot detail:', err);
      setError(err?.message || 'Security Hotspot not found or access denied.');
    } finally {
      setLoading(false);
    }
  }, [hotspotId]);

  useEffect(() => {
    loadHotspotData();
  }, [loadHotspotData]);

  // Sync tab with query param
  useEffect(() => {
    const qTab = searchParams.get('tab');
    if (qTab && ['overview', 'code', 'security-context', 'remediation', 'references', 'history'].includes(qTab)) {
      setActiveTab(qTab);
    }
  }, [searchParams]);

  // Status Action (Mark Safe, Acknowledge, False Positive)
  const handleUpdateStatus = async (newStatus: string, commentText?: string) => {
    try {
      await api.hotspots.updateStatus(hotspotId, newStatus, commentText || `Marked as ${newStatus} in code review`);
      setActionMessage(`Hotspot status successfully updated to ${newStatus}`);
      await loadHotspotData();
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err: any) {
      setActionMessage(`Error updating status: ${err?.message || 'Request failed'}`);
      setTimeout(() => setActionMessage(null), 4000);
    }
  };

  // Submit Review form
  const handleSaveReview = async () => {
    setSubmittingReview(true);
    try {
      if (reviewComment.trim()) {
        await api.hotspots.addComment(hotspotId, reviewComment.trim());
      }
      if (reviewStatus !== hotspot.status) {
        await api.hotspots.updateStatus(hotspotId, reviewStatus, reviewComment.trim() || undefined);
      }
      if (reviewAssignee !== hotspot.assignee_name && reviewAssignee !== 'Unassigned') {
        await api.hotspots.assign(hotspotId, reviewAssignee);
      }
      setActionMessage('Review details saved and logged to audit trail.');
      setReviewComment('');
      await loadHotspotData();
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err: any) {
      setActionMessage(`Failed to save review: ${err?.message || 'Error'}`);
      setTimeout(() => setActionMessage(null), 4000);
    } finally {
      setSubmittingReview(false);
    }
  };

  // Assign Reviewer
  const handleAssignSubmit = async () => {
    if (!assigneeInput.trim()) return;
    try {
      await api.hotspots.assign(hotspotId, assigneeInput.trim());
      setShowAssignModal(false);
      setAssigneeInput('');
      setActionMessage(`Assigned to ${assigneeInput.trim()}`);
      await loadHotspotData();
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err: any) {
      setActionMessage(`Assign failed: ${err?.message || 'Error'}`);
    }
  };

  // Add Tag
  const handleAddTag = async () => {
    if (!tagInput.trim()) return;
    const newTags = [...(hotspot.tags || []), tagInput.trim().toLowerCase()];
    setHotspot({ ...hotspot, tags: newTags });
    setTagInput('');
    setShowAddTag(false);
  };

  // Create Issue
  const handleCreateIssueSubmit = async () => {
    setCreatingIssue(true);
    try {
      const res = await api.hotspots.createIssue(hotspotId, issueTracker, issueTitle);
      setShowIssueModal(false);
      setActionMessage(`Created ${issueTracker.toUpperCase()} issue ticket: ${res.issue_id}`);
      await loadHotspotData();
      setTimeout(() => setActionMessage(null), 5000);
    } catch (err: any) {
      setActionMessage(`Issue creation failed: ${err?.message || 'Error'}`);
    } finally {
      setCreatingIssue(false);
    }
  };

  // Copy code snippet
  const handleCopyCode = () => {
    if (!codeContext?.full_content) return;
    navigator.clipboard.writeText(codeContext.full_content);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Go to Line scrolling
  const handleGoToLine = () => {
    const lineNum = parseInt(targetLineInput, 10);
    if (isNaN(lineNum)) return;
    const targetElement = document.getElementById(`code-line-${lineNum}`);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      targetElement.style.transition = 'background-color 0.3s ease';
      targetElement.style.backgroundColor = '#FEF08A';
      setTimeout(() => {
        targetElement.style.backgroundColor = '';
      }, 1500);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '60px 32px', textAlign: 'center', color: '#64748B' }}>
        <div style={{ fontSize: '14px', fontWeight: 500 }}>Loading Security Hotspot details...</div>
      </div>
    );
  }

  if (error || !hotspot) {
    return (
      <div style={{ padding: '40px 32px', maxWidth: '800px', margin: '0 auto' }}>
        <HotspotsBreadcrumbs currentPage="Error" />
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #FECACA',
            borderRadius: '12px',
            padding: '32px',
            textAlign: 'center',
          }}
        >
          <ShieldAlert size={36} color="#DC2626" style={{ margin: '0 auto 12px' }} />
          <h2 style={{ fontSize: '18px', color: '#0F172A', margin: '0 0 8px' }}>Hotspot Not Found</h2>
          <p style={{ color: '#64748B', fontSize: '14px', margin: '0 0 20px' }}>{error}</p>
          <Link
            href="/sast/hotspots"
            style={{
              padding: '8px 16px',
              backgroundColor: '#2563EB',
              color: '#FFFFFF',
              borderRadius: '8px',
              textDecoration: 'none',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            Return to Overview
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
      {/* 1. Breadcrumbs */}
      <HotspotsBreadcrumbs currentPage="Hotspot Detail" hotspotId={hotspot.display_id} />

      {/* 2. Top Header Action Bar matching Screenshot 10.3 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
            <span
              style={{
                padding: '3px 8px',
                borderRadius: '6px',
                backgroundColor: '#EF4444',
                color: '#FFFFFF',
                fontSize: '12px',
                fontWeight: 700,
                letterSpacing: '0.04em',
              }}
            >
              {hotspot.display_id}
            </span>
            <h1
              style={{
                fontSize: '22px',
                fontWeight: 700,
                color: '#0F172A',
                letterSpacing: '-0.02em',
                margin: 0,
              }}
            >
              {hotspot.title}
            </h1>
            <HotspotSeverityBadge severity={hotspot.severity} size="sm" />
          </div>

          {/* Location line */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748B' }}>
            <span style={{ color: '#2563EB', fontWeight: 600, fontFamily: 'monospace' }}>
              {hotspot.file_path}
            </span>
            <span>Lines {hotspot.start_line}-{hotspot.end_line}</span>
            <span>•</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <GitBranch size={13} color="#94A3B8" />
              {hotspot.branch}
            </span>
          </div>
        </div>

        {/* Top Header Actions (Screenshot 10.3) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => handleUpdateStatus('SAFE')}
            style={{
              padding: '8px 14px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #BBF7D0',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#16A34A',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <ShieldCheck size={14} color="#16A34A" />
            Mark Safe
          </button>

          <button
            onClick={() => handleUpdateStatus('ACKNOWLEDGED')}
            style={{
              padding: '8px 14px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #BFDBFE',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#2563EB',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <AlertTriangle size={14} color="#2563EB" />
            Acknowledge
          </button>

          <button
            onClick={() => setShowIssueModal(true)}
            style={{
              padding: '8px 16px',
              backgroundColor: '#2563EB',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#FFFFFF',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Plus size={14} color="#FFFFFF" />
            Create Issue
          </button>
        </div>
      </div>

      {actionMessage && (
        <div
          style={{
            marginBottom: '16px',
            padding: '10px 14px',
            borderRadius: '6px',
            backgroundColor: '#EFF6FF',
            border: '1px solid #BFDBFE',
            color: '#1D4ED8',
            fontSize: '13px',
            fontWeight: 500,
          }}
        >
          {actionMessage}
        </div>
      )}

      {/* 3. Navigation Tabs (Screenshot 10.3) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '24px',
          borderBottom: '1px solid #E2E8F0',
          marginBottom: '24px',
        }}
      >
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'code', label: 'Code' },
          { id: 'security-context', label: 'Security Context' },
          { id: 'remediation', label: 'Remediation' },
          { id: 'references', label: 'References' },
          { id: 'history', label: 'History' },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '10px 0',
                border: 'none',
                background: 'transparent',
                fontSize: '14px',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#2563EB' : '#64748B',
                borderBottom: isActive ? '2px solid #2563EB' : '2px solid transparent',
                cursor: 'pointer',
                transition: 'color 150ms ease, border-color 150ms ease',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 4. Tab Contents */}

      {/* TAB 1: OVERVIEW (Screenshot 10.3) */}
      {activeTab === 'overview' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.8fr) minmax(320px, 1fr)',
            gap: '24px',
            alignItems: 'start',
          }}
        >
          {/* Left Column: Summary, Details, Tags */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Summary Card */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              }}
            >
              <h3 style={{ margin: '0 0 12px', fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>
                Summary
              </h3>
              <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.6', color: '#334155' }}>
                {hotspot.description}
              </p>
            </div>

            {/* Details Grid */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              }}
            >
              <h3 style={{ margin: '0 0 18px', fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>
                Hotspot Metadata
              </h3>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  rowGap: '16px',
                  columnGap: '20px',
                  fontSize: '13px',
                }}
              >
                <div>
                  <div style={{ color: '#64748B', marginBottom: '3px' }}>Category</div>
                  <div style={{ fontWeight: 600, color: '#0F172A' }}>{hotspot.category}</div>
                </div>

                <div>
                  <div style={{ color: '#64748B', marginBottom: '3px' }}>Severity</div>
                  <div><HotspotSeverityBadge severity={hotspot.severity} size="sm" /></div>
                </div>

                <div>
                  <div style={{ color: '#64748B', marginBottom: '3px' }}>Status</div>
                  <div><HotspotStatusBadge status={hotspot.status} size="sm" /></div>
                </div>

                <div>
                  <div style={{ color: '#64748B', marginBottom: '3px' }}>Detected</div>
                  <div style={{ fontWeight: 600, color: '#0F172A' }}>
                    {new Date(hotspot.created_at).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true,
                    })}
                  </div>
                </div>

                <div>
                  <div style={{ color: '#64748B', marginBottom: '3px' }}>Repository</div>
                  <div style={{ fontWeight: 600, color: '#0F172A' }}>{hotspot.repository_name}</div>
                </div>

                <div>
                  <div style={{ color: '#64748B', marginBottom: '3px' }}>Branch</div>
                  <div style={{ fontWeight: 600, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <GitBranch size={13} color="#64748B" />
                    {hotspot.branch}
                  </div>
                </div>

                <div>
                  <div style={{ color: '#64748B', marginBottom: '3px' }}>Author</div>
                  <div style={{ fontWeight: 600, color: '#0F172A' }}>{hotspot.author}</div>
                </div>

                <div>
                  <div style={{ color: '#64748B', marginBottom: '3px' }}>Assignee</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 600, color: '#0F172A' }}>{hotspot.assignee_name}</span>
                    <button
                      onClick={() => setShowAssignModal(true)}
                      style={{
                        padding: '2px 8px',
                        fontSize: '11px',
                        backgroundColor: '#EFF6FF',
                        color: '#2563EB',
                        border: '1px solid #BFDBFE',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      Assign
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Tags (Screenshot 10.3) */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '20px 24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>
                  Tags
                </h3>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {(hotspot.tags || []).map((tag: string, idx: number) => (
                  <span
                    key={`${tag}-${idx}`}
                    style={{
                      padding: '4px 10px',
                      backgroundColor: '#F1F5F9',
                      border: '1px solid #E2E8F0',
                      borderRadius: '6px',
                      fontSize: '12px',
                      color: '#475569',
                      fontWeight: 500,
                    }}
                  >
                    #{tag}
                  </span>
                ))}

                {showAddTag ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input
                      type="text"
                      placeholder="tag name"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                      style={{
                        padding: '4px 8px',
                        fontSize: '12px',
                        border: '1px solid #2563EB',
                        borderRadius: '4px',
                        outline: 'none',
                        width: '100px',
                      }}
                    />
                    <button
                      onClick={handleAddTag}
                      style={{
                        padding: '4px 8px',
                        fontSize: '11px',
                        backgroundColor: '#2563EB',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                    >
                      Add
                    </button>
                    <button
                      onClick={() => setShowAddTag(false)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAddTag(true)}
                    style={{
                      padding: '4px 10px',
                      backgroundColor: '#FFFFFF',
                      border: '1px dashed #CBD5E1',
                      borderRadius: '6px',
                      fontSize: '12px',
                      color: '#2563EB',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontWeight: 600,
                    }}
                  >
                    <Plus size={12} /> Add Tag
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Risk Information (Screenshot 10.3) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              }}
            >
              <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>
                Risk Information
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '10px' }}>
                  <span style={{ color: '#64748B' }}>CWE</span>
                  <span style={{ fontWeight: 600, color: '#2563EB' }}>{hotspot.cwe || 'CWE-78'}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '10px' }}>
                  <span style={{ color: '#64748B' }}>OWASP</span>
                  <span style={{ fontWeight: 600, color: '#0F172A' }}>{hotspot.owasp || 'A03:2021-Injection'}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '10px' }}>
                  <span style={{ color: '#64748B' }}>CVSS (v3.1)</span>
                  <span style={{ fontWeight: 700, color: '#DC2626' }}>{hotspot.cvss_score || '9.8 (Critical)'}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '10px' }}>
                  <span style={{ color: '#64748B' }}>Confidence</span>
                  <span style={{ fontWeight: 600, color: '#16A34A' }}>{hotspot.confidence || 'High'}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '10px' }}>
                  <span style={{ color: '#64748B' }}>Exploit Maturity</span>
                  <span style={{ fontWeight: 600, color: '#EA580C' }}>{hotspot.exploit_maturity || 'High'}</span>
                </div>

                <div style={{ marginTop: '6px' }}>
                  <span style={{ color: '#64748B', display: 'block', marginBottom: '8px' }}>References</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {(hotspot.references || []).map((ref: any, idx: number) => (
                      <a
                        key={idx}
                        href={ref.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          fontSize: '12px',
                          color: '#2563EB',
                          textDecoration: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <ExternalLink size={12} />
                        {ref.title || ref.url}
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CODE REVIEW (Screenshot 10.4) */}
      {activeTab === 'code' && (
        <div>
          {/* Header row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
            }}
          >
            <div>
              <h2 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 700, color: '#0F172A' }}>
                Code Review
              </h2>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748B' }}>
                Review the code and mark the hotspot with appropriate status.
              </p>
            </div>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '9999px',
                backgroundColor: '#ECFDF5',
                border: '1px solid #A7F3D0',
                color: '#059669',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              <CheckCircle2 size={13} color="#059669" />
              Review in Progress
            </div>
          </div>

          {/* Split View: Left (Code Viewer) & Right (Review Controls) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.8fr) minmax(340px, 1fr)',
              gap: '24px',
              alignItems: 'start',
            }}
          >
            {/* Left: Code Viewer */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              }}
            >
              {/* Code viewer header */}
              <div
                style={{
                  padding: '12px 16px',
                  backgroundColor: '#F8FAFC',
                  borderBottom: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Code2 size={16} color="#64748B" />
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', fontFamily: 'monospace' }}>
                    {codeContext?.file_path || hotspot.file_path}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {/* Go to line */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '12px', color: '#64748B' }}>Go to line:</span>
                    <input
                      type="number"
                      placeholder={String(hotspot.start_line)}
                      value={targetLineInput}
                      onChange={(e) => setTargetLineInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleGoToLine()}
                      style={{
                        width: '54px',
                        padding: '4px 6px',
                        fontSize: '12px',
                        border: '1px solid #E2E8F0',
                        borderRadius: '4px',
                        outline: 'none',
                        textAlign: 'center',
                      }}
                    />
                    <button
                      onClick={handleGoToLine}
                      style={{
                        padding: '4px 8px',
                        fontSize: '11px',
                        border: '1px solid #CBD5E1',
                        borderRadius: '4px',
                        backgroundColor: '#FFFFFF',
                        cursor: 'pointer',
                      }}
                    >
                      Jump
                    </button>
                  </div>

                  {/* Copy button */}
                  <button
                    onClick={handleCopyCode}
                    title="Copy snippet"
                    style={{
                      padding: '5px 8px',
                      border: '1px solid #E2E8F0',
                      borderRadius: '6px',
                      backgroundColor: '#FFFFFF',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '12px',
                      color: '#475569',
                    }}
                  >
                    {copiedCode ? <Check size={13} color="#16A34A" /> : <Copy size={13} color="#64748B" />}
                    {copiedCode ? 'Copied' : 'Copy'}
                  </button>

                  {/* Open in GitHub */}
                  {codeContext?.github_url && (
                    <a
                      href={codeContext.github_url}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        padding: '5px 8px',
                        border: '1px solid #E2E8F0',
                        borderRadius: '6px',
                        backgroundColor: '#FFFFFF',
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '12px',
                        color: '#2563EB',
                        fontWeight: 500,
                      }}
                    >
                      <ExternalLink size={13} />
                      GitHub
                    </a>
                  )}
                </div>
              </div>

              {/* Code lines container (Screenshot 10.4) */}
              <div
                ref={codeContainerRef}
                style={{
                  fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                  fontSize: '13px',
                  lineHeight: '1.6',
                  backgroundColor: '#FFFFFF',
                  overflowX: 'auto',
                  maxHeight: '600px',
                }}
              >
                {(codeContext?.lines || []).map((line: any) => {
                  const isDangerous = line.is_dangerous;
                  const isHotspotRange = line.is_hotspot;

                  let rowBg = 'transparent';
                  let borderLeft = '3px solid transparent';
                  if (isDangerous) {
                    rowBg = '#FEF2F2';
                    borderLeft = '3px solid #EF4444';
                  } else if (isHotspotRange) {
                    rowBg = '#FFFBEB';
                    borderLeft = '3px solid #F59E0B';
                  }

                  return (
                    <div
                      key={line.line_number}
                      id={`code-line-${line.line_number}`}
                      style={{
                        display: 'flex',
                        alignItems: 'stretch',
                        backgroundColor: rowBg,
                        borderLeft,
                      }}
                    >
                      {/* Line Number */}
                      <div
                        style={{
                          width: '48px',
                          minWidth: '48px',
                          padding: '0 12px 0 0',
                          textAlign: 'right',
                          color: isDangerous ? '#EF4444' : isHotspotRange ? '#D97706' : '#94A3B8',
                          userSelect: 'none',
                          fontSize: '12px',
                          borderRight: '1px solid #F1F5F9',
                        }}
                      >
                        {line.line_number}
                      </div>

                      {/* Line Content */}
                      <div
                        style={{
                          padding: '0 16px',
                          color: isDangerous ? '#991B1B' : isHotspotRange ? '#92400E' : '#1E293B',
                          whiteSpace: 'pre',
                          fontWeight: isDangerous ? 600 : 400,
                        }}
                      >
                        {line.content || ' '}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Review Details & Controls panel (Screenshot 10.4) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '12px',
                  padding: '24px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                }}
              >
                <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>
                  Review Details
                </h3>

                {/* Dropdowns row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '18px' }}>
                  {/* Status dropdown */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#64748B', fontWeight: 600, marginBottom: '4px' }}>
                      Status
                    </label>
                    <select
                      value={reviewStatus}
                      onChange={(e) => setReviewStatus(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        fontSize: '12px',
                        borderRadius: '6px',
                        border: '1px solid #E2E8F0',
                        backgroundColor: '#FFFFFF',
                        color: '#0F172A',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      <option value="TO_REVIEW">To Review</option>
                      <option value="ACKNOWLEDGED">Acknowledged</option>
                      <option value="SAFE">Safe</option>
                      <option value="FALSE_POSITIVE">False Positive</option>
                      <option value="FIXED">Fixed</option>
                    </select>
                  </div>

                  {/* Assignee dropdown */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#64748B', fontWeight: 600, marginBottom: '4px' }}>
                      Assignee
                    </label>
                    <select
                      value={reviewAssignee}
                      onChange={(e) => setReviewAssignee(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        fontSize: '12px',
                        borderRadius: '6px',
                        border: '1px solid #E2E8F0',
                        backgroundColor: '#FFFFFF',
                        color: '#0F172A',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      <option value="Unassigned">Unassigned</option>
                      <option value="dev.user">dev.user</option>
                      <option value="security.admin">security.admin</option>
                      <option value="mayur.bharvad">mayur.bharvad</option>
                    </select>
                  </div>

                  {/* Priority dropdown */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#64748B', fontWeight: 600, marginBottom: '4px' }}>
                      Priority
                    </label>
                    <select
                      value={reviewPriority}
                      onChange={(e) => setReviewPriority(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        fontSize: '12px',
                        borderRadius: '6px',
                        border: '1px solid #E2E8F0',
                        backgroundColor: '#FFFFFF',
                        color: '#0F172A',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      <option value="Critical">Critical</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                </div>

                {/* Review Comment Textarea */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#334155', fontWeight: 600, marginBottom: '6px' }}>
                    Review Comment
                  </label>
                  <textarea
                    placeholder="Add your review comments..."
                    rows={4}
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      fontSize: '13px',
                      borderRadius: '8px',
                      border: '1px solid #E2E8F0',
                      outline: 'none',
                      resize: 'vertical',
                      color: '#0F172A',
                      backgroundColor: '#FFFFFF',
                    }}
                  />

                  {/* Toolbar & Save button */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94A3B8', fontSize: '12px' }}>
                      <span style={{ fontWeight: 700, cursor: 'pointer' }}>B</span>
                      <span style={{ fontStyle: 'italic', cursor: 'pointer' }}>I</span>
                      <span style={{ fontFamily: 'monospace', cursor: 'pointer' }}>&lt;/&gt;</span>
                    </div>

                    <button
                      onClick={handleSaveReview}
                      disabled={submittingReview}
                      style={{
                        padding: '7px 16px',
                        backgroundColor: '#2563EB',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: submittingReview ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {submittingReview ? 'Saving...' : 'Save Review'}
                    </button>
                  </div>
                </div>

                {/* Quick Actions (Screenshot 10.4) */}
                <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '16px' }}>
                  <h4 style={{ margin: '0 0 12px', fontSize: '12px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                    Quick Actions
                  </h4>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                    <button
                      onClick={() => handleUpdateStatus('SAFE')}
                      style={{
                        padding: '10px 12px',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #BBF7D0',
                        borderRadius: '8px',
                        textAlign: 'left',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#16A34A', fontWeight: 600, fontSize: '12px' }}>
                        <ShieldCheck size={14} />
                        Mark as Safe
                      </div>
                      <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
                        No security issue
                      </div>
                    </button>

                    <button
                      onClick={() => handleUpdateStatus('ACKNOWLEDGED')}
                      style={{
                        padding: '10px 12px',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #BFDBFE',
                        borderRadius: '8px',
                        textAlign: 'left',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#2563EB', fontWeight: 600, fontSize: '12px' }}>
                        <AlertTriangle size={14} />
                        Acknowledge
                      </div>
                      <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
                        Accept the risk
                      </div>
                    </button>

                    <button
                      onClick={() => setShowIssueModal(true)}
                      style={{
                        padding: '10px 12px',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: '8px',
                        textAlign: 'left',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0F172A', fontWeight: 600, fontSize: '12px' }}>
                        <Plus size={14} />
                        Create Issue
                      </div>
                      <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
                        Create in tracker
                      </div>
                    </button>

                    <button
                      onClick={() => handleUpdateStatus('TO_REVIEW', 'Requesting code change modifications')}
                      style={{
                        padding: '10px 12px',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #FECACA',
                        borderRadius: '8px',
                        textAlign: 'left',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#DC2626', fontWeight: 600, fontSize: '12px' }}>
                        <ShieldAlert size={14} />
                        Request Changes
                      </div>
                      <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
                        Needs modification
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SECURITY CONTEXT */}
      {activeTab === 'security-context' && (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '28px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            maxWidth: '900px',
          }}
        >
          <h3 style={{ margin: '0 0 12px', fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>
            Why is this a Security Hotspot?
          </h3>
          <p style={{ fontSize: '14px', lineHeight: '1.6', color: '#334155', marginBottom: '20px' }}>
            Security Hotspots highlight code patterns that frequently introduce severe vulnerabilities when executed on
            untrusted user input. Unlike confirmed vulnerabilities, a hotspot requires human engineering review to confirm
            whether input sanitization, architectural boundary checks, or cryptographic guarantees have been properly applied.
          </p>

          <h4 style={{ margin: '0 0 8px', fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
            Dataflow & Attack Vector
          </h4>
          <div
            style={{
              padding: '16px',
              backgroundColor: '#F8FAFC',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              fontFamily: 'monospace',
              fontSize: '13px',
              color: '#0F172A',
              marginBottom: '20px',
            }}
          >
            Client HTTP Request → Parameterized Inputs → {hotspot.file_path}:{hotspot.start_line} → Dangerous Execution Target
          </div>

          <h4 style={{ margin: '0 0 8px', fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
            Standards & Compliance
          </h4>
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', color: '#475569', lineHeight: '1.8' }}>
            <li><strong>CWE Reference:</strong> {hotspot.cwe || 'CWE-78'}</li>
            <li><strong>OWASP Standard:</strong> {hotspot.owasp || 'A03:2021-Injection'}</li>
            <li><strong>Audit Requirement:</strong> Deterministic human verification and tamper-evident history persistence.</li>
          </ul>
        </div>
      )}

      {/* TAB 4: REMEDIATION */}
      {activeTab === 'remediation' && (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '28px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            maxWidth: '900px',
          }}
        >
          <h3 style={{ margin: '0 0 12px', fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>
            Recommended Remediation Guidance
          </h3>

          <p style={{ fontSize: '14px', lineHeight: '1.6', color: '#334155', marginBottom: '20px' }}>
            To securely resolve this hotspot without breaking downstream functionality, replace arbitrary string
            evaluations with strictly parameterized alternatives.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px', marginBottom: '20px' }}>
            {/* Vulnerable Pattern */}
            <div style={{ padding: '16px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#DC2626', marginBottom: '6px' }}>
                ❌ INSECURE PATTERN
              </div>
              <pre style={{ margin: 0, fontSize: '12px', color: '#991B1B', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
{hotspot.code_snippet || `// Insecure string concatenation\nexec('ls ' + userInput);`}
              </pre>
            </div>

            {/* Secure Alternative */}
            <div style={{ padding: '16px', backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#16A34A', marginBottom: '6px' }}>
                ✅ SECURE ALTERNATIVE
              </div>
              <pre style={{ margin: 0, fontSize: '12px', color: '#166534', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
{`// Secure discrete argument list
const { execFile } = require('child_process');
execFile('/bin/ls', ['-la', sanitizedInput]);`}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: REFERENCES */}
      {activeTab === 'references' && (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '28px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            maxWidth: '900px',
          }}
        >
          <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>
            Security References & Standards
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {(hotspot.references || []).map((ref: any, idx: number) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  backgroundColor: '#F8FAFC',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '13px', color: '#0F172A' }}>{ref.title || 'Security Guideline'}</div>
                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>{ref.url}</div>
                </div>
                <a
                  href={ref.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    backgroundColor: '#EFF6FF',
                    color: '#2563EB',
                    fontSize: '12px',
                    fontWeight: 600,
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  Visit <ExternalLink size={12} />
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: HISTORY & AUDIT TRAIL (Screenshot 10.5) */}
      {activeTab === 'history' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Timeline Table */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '20px 24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            }}
          >
            <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>
              Hotspot Review History
            </h3>

            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  <th style={{ padding: '10px 14px', width: '40px', color: '#64748B' }}>#</th>
                  <th style={{ padding: '10px 14px', color: '#64748B' }}>Date & Time</th>
                  <th style={{ padding: '10px 14px', color: '#64748B' }}>User</th>
                  <th style={{ padding: '10px 14px', color: '#64748B' }}>Action</th>
                  <th style={{ padding: '10px 14px', color: '#64748B' }}>Status</th>
                  <th style={{ padding: '10px 14px', color: '#64748B' }}>Comment</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#94A3B8' }}>
                      No history recorded yet.
                    </td>
                  </tr>
                ) : (
                  history.map((h: any, idx: number) => (
                    <tr key={h.id || idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '12px 14px', color: '#94A3B8', fontWeight: 600 }}>{idx + 1}</td>
                      <td style={{ padding: '12px 14px', color: '#0F172A', fontWeight: 500 }}>{h.date_time}</td>
                      <td style={{ padding: '12px 14px', color: '#2563EB', fontWeight: 600 }}>{h.user}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            backgroundColor: '#F1F5F9',
                            fontSize: '11px',
                            fontWeight: 700,
                            color: '#334155',
                          }}
                        >
                          {h.action}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <HotspotStatusBadge status={h.status} size="sm" />
                      </td>
                      <td style={{ padding: '12px 14px', color: '#475569' }}>
                        {h.comment || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Comments section */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            }}
          >
            <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>
              Review Comments ({hotspot.comments?.length || 0})
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
              {(hotspot.comments || []).map((c: any) => (
                <div
                  key={c.id}
                  style={{
                    padding: '12px 16px',
                    backgroundColor: '#F8FAFC',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 600, fontSize: '13px', color: '#0F172A' }}>{c.user}</span>
                    <span style={{ fontSize: '11px', color: '#94A3B8' }}>{c.created_at}</span>
                  </div>
                  <div style={{ fontSize: '13px', color: '#334155', lineHeight: '1.5' }}>{c.comment}</div>
                </div>
              ))}
            </div>

            {/* Add comment box */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Write a comment..."
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveReview()}
                style={{
                  flexGrow: 1,
                  padding: '8px 12px',
                  fontSize: '13px',
                  borderRadius: '6px',
                  border: '1px solid #E2E8F0',
                  outline: 'none',
                }}
              />
              <button
                onClick={handleSaveReview}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Send size={13} />
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Issue Creation Modal */}
      {showIssueModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              maxWidth: '520px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>
                Create Issue Ticket
              </h3>
              <button
                onClick={() => setShowIssueModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                Tracker Integration
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {(['github', 'jira', 'linear'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setIssueTracker(t)}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '6px',
                      border: issueTracker === t ? '2px solid #2563EB' : '1px solid #E2E8F0',
                      backgroundColor: issueTracker === t ? '#EFF6FF' : '#FFFFFF',
                      color: issueTracker === t ? '#2563EB' : '#475569',
                      fontWeight: 600,
                      fontSize: '12px',
                      textTransform: 'capitalize',
                      cursor: 'pointer',
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                Issue Title
              </label>
              <input
                type="text"
                value={issueTitle}
                onChange={(e) => setIssueTitle(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #E2E8F0',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setShowIssueModal(false)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '6px',
                  border: '1px solid #E2E8F0',
                  backgroundColor: '#FFFFFF',
                  color: '#475569',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateIssueSubmit}
                disabled={creatingIssue}
                style={{
                  padding: '8px 18px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: creatingIssue ? 'not-allowed' : 'pointer',
                }}
              >
                {creatingIssue ? 'Creating...' : `Create ${issueTracker.toUpperCase()} Ticket`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Reviewer Modal */}
      {showAssignModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              maxWidth: '400px',
              width: '100%',
              padding: '24px',
            }}
          >
            <h3 style={{ margin: '0 0 14px', fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>
              Assign Reviewer
            </h3>
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#64748B', marginBottom: '6px' }}>
                Reviewer name or email
              </label>
              <input
                type="text"
                placeholder="dev.user or security.admin"
                value={assigneeInput}
                onChange={(e) => setAssigneeInput(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #E2E8F0',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={() => setShowAssignModal(false)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid #E2E8F0',
                  backgroundColor: '#FFFFFF',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleAssignSubmit}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Assign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
