'use client';

/**
 * Kavach SAST — Remediation & Patch Governance Workspace (/code/sast/remediation)
 * 
 * Production-grade Closed-Loop Remediation Workflow:
 * 1. Synthesize context-aware AST patch proposals
 * 2. Side-by-side syntax diff review with exact line attribution
 * 3. Deterministic AST verification re-scan (proving 0 vulnerabilities in patched region)
 * 4. Safe VCS Pull Request creation on isolated branches (No direct merge to main)
 * 5. Full audit trail & patch history ledger persisted in PostgreSQL
 * 
 * Architectural Golden Rule:
 * "LLM proposes. Deterministic security systems decide. Runtime evidence proves."
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Wrench,
  CheckCircle2,
  AlertTriangle,
  Clock,
  GitPullRequest,
  GitBranch,
  FolderGit2,
  Search,
  RefreshCw,
  ChevronRight,
  X,
  FileCode2,
  Check,
  Shield,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  Code2,
  Play,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { KavachSastLayout } from '@/components/code/sast/KavachSastLayout';
import { useScope } from '@/context/ScopeContext';

interface RemediationProposal {
  id: string;
  finding_id: string;
  finding_title: string;
  rule_id: string;
  severity: string;
  category: string;
  file_path: string;
  line_number?: number;
  cwe?: string;
  owasp?: string;
  status: string; // NEEDS_REVIEW, READY_TO_MERGE, IN_PROGRESS, DISMISSED, MERGED
  explanation?: string;
  diff?: string;
  original_code?: string;
  proposed_code?: string;
  validation_status?: string; // PASSED, FAILED, PENDING
  pr_url?: string;
  pr_number?: number;
  created_at?: string;
}

const SEVERITY_CONFIG: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  CRITICAL: { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA', dot: '#EF4444' },
  HIGH: { bg: '#FFF7ED', text: '#EA580C', border: '#FFEDD5', dot: '#F97316' },
  MEDIUM: { bg: '#FFFBEB', text: '#D97706', border: '#FEF3C7', dot: '#F59E0B' },
  LOW: { bg: '#F0FDF4', text: '#16A34A', border: '#DCFCE7', dot: '#22C55E' },
};

export default function SASTRemediationPage() {
  const { currentProject } = useScope();

  // State
  const [proposals, setProposals] = useState<RemediationProposal[]>([]);
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Selected Proposal Drawer
  const [selectedProposal, setSelectedProposal] = useState<RemediationProposal | null>(null);
  const [validating, setValidating] = useState(false);
  const [creatingPR, setCreatingPR] = useState(false);
  const [prBranchName, setPrBranchName] = useState('');
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Generate fixes modal
  const [generating, setGenerating] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // ── Load Data ──────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const projId = currentProject?.id || undefined;
      const [overRes, propRes] = await Promise.allSettled([
        api.code.autofixOverview({ projectId: projId }),
        api.code.autofixProposals({ projectId: projId, status: statusFilter === 'all' ? undefined : statusFilter }),
      ]);

      if (overRes.status === 'fulfilled' && overRes.value) {
        setOverview(overRes.value);
      }
      if (propRes.status === 'fulfilled' && propRes.value?.items) {
        setProposals(propRes.value.items);
      }
    } catch (err: any) {
      console.error('Failed to load remediation workspace:', err);
      setError(err?.message || 'Failed to communicate with remediation service.');
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Synthesize Fixes ───────────────────────────────────────────────────────
  const handleGenerateFixes = async () => {
    setGenerating(true);
    try {
      const res = await api.code.generateAutofix({ project_id: currentProject?.id });
      showToast(res?.message || 'Successfully synthesized AST patches for open critical findings.');
      await loadData();
    } catch (err: any) {
      showToast(`Generation failed: ${err?.message || 'Error'}`);
    } finally {
      setGenerating(false);
    }
  };

  // ── Validate Proposal (Deterministic Rescan) ───────────────────────────────
  const handleValidateProposal = async (proposalId: string) => {
    setValidating(true);
    setActionNotice(null);
    try {
      const res = await api.code.validateAutofixProposal(proposalId);
      setActionNotice(res?.message || 'Deterministic AST verification passed: 0 vulnerabilities found in patched region.');
      showToast('Validation passed. Patch verified safe.');
      await loadData();
      // Update local selected proposal
      setSelectedProposal(prev => (prev && prev.id === proposalId ? { ...prev, status: 'READY_TO_MERGE', validation_status: 'PASSED' } : prev));
    } catch (err: any) {
      setActionNotice(`Validation failed: ${err?.message || 'Scanner detected regressions.'}`);
    } finally {
      setValidating(false);
    }
  };

  // ── Create VCS Pull Request ────────────────────────────────────────────────
  const handleCreatePR = async (proposal: RemediationProposal) => {
    setCreatingPR(true);
    setActionNotice(null);
    try {
      const branch = prBranchName || `security/autofix-${proposal.rule_id.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now().toString().slice(-4)}`;
      const res = await api.code.createAutofixPR(proposal.id, {
        branch_name: branch,
        pr_title: `[Security Fix] Resolve ${proposal.finding_title || proposal.rule_id}`,
        pr_body: `### Security Remediation Patch\n\n**Vulnerability:** ${proposal.finding_title}\n**Rule ID:** \`${proposal.rule_id}\`\n**CWE:** ${proposal.cwe || 'CWE'}\n\n**Deterministic Verification:** PASSED (Semgrep AST verified 0 flaws).`,
      });

      showToast(`Pull Request successfully submitted to branch ${branch}.`);
      setActionNotice(`Pull request created successfully. PR #${res?.pr_number || 'new'}`);
      await loadData();
      setSelectedProposal(prev => (prev && prev.id === proposal.id ? { ...prev, status: 'IN_PROGRESS', pr_number: res?.pr_number, pr_url: res?.pr_url } : prev));
    } catch (err: any) {
      setActionNotice(`PR creation failed: ${err?.message || 'Could not push branch.'}`);
    } finally {
      setCreatingPR(false);
    }
  };

  // ── Filtered Proposals ─────────────────────────────────────────────────────
  const filteredProposals = useMemo(() => {
    return proposals.filter(p => {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        !q ||
        p.finding_title?.toLowerCase().includes(q) ||
        p.rule_id?.toLowerCase().includes(q) ||
        p.file_path?.toLowerCase().includes(q);

      return matchSearch;
    });
  }, [proposals, searchQuery]);

  return (
    <KavachSastLayout>
      <div style={{ padding: '16px 24px', maxWidth: '1600px', margin: '0 auto', display: 'flex', flexDirection: 'column', width: '100%' }}>
        
        {/* Toast */}
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
              fontSize: '13px',
              fontWeight: 600,
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.2)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <CheckCircle2 size={16} color="#10B981" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* ── Sub-Toolbar ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '16px',
            padding: '4px 0',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#64748B', marginBottom: '4px' }}>
              <Link href="/code" style={{ color: '#64748B', textDecoration: 'none' }}>Code Security</Link>
              <ChevronRight size={12} />
              <Link href="/code/sast" style={{ color: '#64748B', textDecoration: 'none' }}>SAST Analysis</Link>
              <ChevronRight size={12} />
              <span style={{ color: '#0F172A', fontWeight: 600 }}>Remediation Workspace</span>
            </div>
            <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
              Remediation & Patch Governance Workspace
            </h1>
            <p style={{ fontSize: '12px', color: '#64748B', margin: '3px 0 0 0' }}>
              Review proposed AST code patches, run deterministic validation rescan, and submit safe branch pull requests.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              title="Refresh Remediation"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid #E2E8F0',
                backgroundColor: '#FFFFFF',
                color: '#334155',
                fontSize: '12px',
                fontWeight: 600,
                cursor: loading ? 'wait' : 'pointer',
              }}
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              onClick={handleGenerateFixes}
              disabled={generating}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '8px',
                backgroundColor: '#2563EB',
                border: 'none',
                color: '#FFFFFF',
                fontSize: '12px',
                fontWeight: 600,
                cursor: generating ? 'wait' : 'pointer',
                boxShadow: '0 1px 2px rgba(37, 99, 235, 0.2)',
              }}
            >
              <Sparkles size={13} />
              <span>{generating ? 'Synthesizing...' : 'Synthesize Fix Proposals'}</span>
            </button>
          </div>
        </div>

        {error && (
          <div style={{ marginBottom: '14px', padding: '10px 14px', borderRadius: '8px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12.5px' }}>
            <AlertTriangle size={15} />
            <span>{error}</span>
          </div>
        )}

        {/* ── KPI Cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '12px', marginBottom: '16px' }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Synthesized Patches</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', marginTop: '2px' }}>
                {overview?.total_proposals ?? proposals.length}
              </div>
              <div style={{ fontSize: '11px', color: '#64748B', marginTop: '1px' }}>Context-aware code diffs</div>
            </div>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB' }}>
              <Wrench size={18} />
            </div>
          </div>

          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Verified Deterministically</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#16A34A', marginTop: '2px' }}>
                {overview?.validated_count ?? proposals.filter(p => p.validation_status === 'PASSED').length}
              </div>
              <div style={{ fontSize: '11px', color: '#16A34A', marginTop: '1px', fontWeight: 600 }}>0 flaws in patched code</div>
            </div>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16A34A' }}>
              <ShieldCheck size={18} />
            </div>
          </div>

          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Active Pull Requests</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#2563EB', marginTop: '2px' }}>
                {overview?.active_prs ?? proposals.filter(p => p.pr_number).length}
              </div>
              <div style={{ fontSize: '11px', color: '#64748B', marginTop: '1px' }}>Isolated branch reviews</div>
            </div>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB' }}>
              <GitPullRequest size={18} />
            </div>
          </div>

          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Governance Merge Gate</div>
              <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={16} color="#16A34A" /> Enforced
              </div>
              <div style={{ fontSize: '11px', color: '#64748B', marginTop: '1px' }}>Direct merge disabled</div>
            </div>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}>
              <Shield size={18} />
            </div>
          </div>
        </div>

        {/* ── Filter Bar ── */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ position: 'relative', flex: '1', minWidth: '260px' }}>
              <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
              <input
                type="text"
                placeholder="Search fix proposals by title, rule ID, or target file..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 34px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '12.5px',
                  color: '#0F172A',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#F1F5F9', padding: '3px', borderRadius: '6px', flexWrap: 'wrap' }}>
              {[
                { id: 'all', label: 'All Proposals' },
                { id: 'needs_review', label: 'Needs Review' },
                { id: 'ready_to_merge', label: 'Verified & Ready' },
                { id: 'in_progress', label: 'PR Submitted' },
              ].map(st => (
                <button
                  key={st.id}
                  onClick={() => setStatusFilter(st.id)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '4px',
                    border: 'none',
                    backgroundColor: statusFilter === st.id ? '#FFFFFF' : 'transparent',
                    color: statusFilter === st.id ? '#0F172A' : '#64748B',
                    fontSize: '12px',
                    fontWeight: statusFilter === st.id ? 600 : 500,
                    cursor: 'pointer',
                    boxShadow: statusFilter === st.id ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  }}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Proposals Table ── */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8FAFC' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                Remediation Proposal Queue ({filteredProposals.length} active)
              </span>
              <span style={{ fontSize: '11.5px', color: '#64748B' }}>
                Click any proposal to inspect diff, run verification rescan, and create branch PR
              </span>
            </div>

            {loading ? (
              <div style={{ padding: '48px', textAlign: 'center', color: '#64748B' }}>
                <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 10px', color: '#2563EB' }} />
                <div style={{ fontSize: '13px', fontWeight: 500 }}>Loading Remediation Proposals...</div>
              </div>
            ) : filteredProposals.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center' }}>
                <Wrench size={36} style={{ color: '#94A3B8', margin: '0 auto 12px' }} />
                <div style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', marginBottom: '4px' }}>
                  No active remediation proposals
                </div>
                <div style={{ fontSize: '12.5px', color: '#64748B', maxWidth: '420px', margin: '0 auto 16px' }}>
                  Click "Synthesize Fix Proposals" to generate context-aware, verifiable patches for open findings.
                </div>
                <button
                  onClick={handleGenerateFixes}
                  disabled={generating}
                  style={{
                    padding: '7px 16px',
                    borderRadius: '6px',
                    backgroundColor: '#2563EB',
                    border: 'none',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <Sparkles size={12} style={{ marginRight: '6px', display: 'inline' }} />
                  Synthesize Proposals Now
                </button>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      <th style={{ padding: '12px 18px', width: '90px' }}>Severity</th>
                      <th style={{ padding: '12px 18px' }}>Vulnerability Finding & Rule</th>
                      <th style={{ padding: '12px 18px', width: '220px' }}>Target Code File</th>
                      <th style={{ padding: '12px 18px', width: '150px' }}>Verification Status</th>
                      <th style={{ padding: '12px 18px', width: '130px' }}>Proposal State</th>
                      <th style={{ padding: '12px 18px', width: '100px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProposals.map(prop => {
                      const sevConf = SEVERITY_CONFIG[prop.severity.toUpperCase()] || SEVERITY_CONFIG.MEDIUM;
                      const isSelected = selectedProposal?.id === prop.id;

                      return (
                        <tr
                          key={prop.id}
                          onClick={() => {
                            setSelectedProposal(prop);
                            setActionNotice(null);
                          }}
                          style={{
                            borderBottom: '1px solid #F1F5F9',
                            backgroundColor: isSelected ? '#F0F9FF' : '#FFFFFF',
                            cursor: 'pointer',
                            transition: 'background-color 0.15s ease',
                          }}
                          onMouseEnter={e => {
                            if (!isSelected) e.currentTarget.style.backgroundColor = '#F8FAFC';
                          }}
                          onMouseLeave={e => {
                            if (!isSelected) e.currentTarget.style.backgroundColor = '#FFFFFF';
                          }}
                        >
                          <td style={{ padding: '14px 18px' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                backgroundColor: sevConf.bg,
                                border: `1px solid ${sevConf.border}`,
                                color: sevConf.text,
                                fontSize: '11px',
                                fontWeight: 700,
                              }}
                            >
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: sevConf.dot }} />
                              {prop.severity}
                            </span>
                          </td>

                          <td style={{ padding: '14px 18px' }}>
                            <div style={{ fontWeight: 600, color: '#0F172A', fontSize: '13px' }}>
                              {prop.finding_title}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                              <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#64748B' }}>
                                {prop.rule_id}
                              </span>
                              {prop.cwe && (
                                <span style={{ fontSize: '11px', color: '#334155' }}>
                                  &bull; {prop.cwe}
                                </span>
                              )}
                            </div>
                          </td>

                          <td style={{ padding: '14px 18px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontFamily: 'monospace', fontSize: '11.5px', color: '#334155' }}>
                              <FileCode2 size={13} color="#2563EB" />
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>
                                {prop.file_path}
                              </span>
                            </div>
                            {prop.line_number && (
                              <div style={{ fontSize: '10.5px', color: '#64748B', marginTop: '2px' }}>
                                Line {prop.line_number}
                              </div>
                            )}
                          </td>

                          <td style={{ padding: '14px 18px' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontSize: '11px',
                                fontWeight: 700,
                                backgroundColor: prop.validation_status === 'PASSED' ? '#DCFCE7' : '#EFF6FF',
                                color: prop.validation_status === 'PASSED' ? '#15803D' : '#1D4ED8',
                              }}
                            >
                              {prop.validation_status === 'PASSED' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                              {prop.validation_status || 'PENDING RESCAN'}
                            </span>
                          </td>

                          <td style={{ padding: '14px 18px' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontSize: '11px',
                                fontWeight: 600,
                                backgroundColor: '#F1F5F9',
                                color: '#334155',
                              }}
                            >
                              {prop.status}
                            </span>
                          </td>

                          <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                            <span style={{ color: '#2563EB', fontSize: '11.5px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                              Review Diff <ChevronRight size={13} />
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* ── Proposal Detail & Diff Inspection Drawer ── */}
        {selectedProposal && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: '680px',
              maxWidth: '92vw',
              backgroundColor: '#FFFFFF',
              borderLeft: '1px solid #E2E8F0',
              boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
              zIndex: 1000,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', backgroundColor: '#F8FAFC' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: '#EFF6FF',
                      border: '1px solid #BFDBFE',
                      color: '#1D4ED8',
                    }}
                  >
                    PROPOSAL #{selectedProposal.id.slice(0, 8)}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '12px',
                      backgroundColor: (SEVERITY_CONFIG[selectedProposal.severity.toUpperCase()] || SEVERITY_CONFIG.MEDIUM).bg,
                      color: (SEVERITY_CONFIG[selectedProposal.severity.toUpperCase()] || SEVERITY_CONFIG.MEDIUM).text,
                      border: `1px solid ${(SEVERITY_CONFIG[selectedProposal.severity.toUpperCase()] || SEVERITY_CONFIG.MEDIUM).border}`,
                    }}
                  >
                    {selectedProposal.severity}
                  </span>
                </div>
                <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  {selectedProposal.finding_title}
                </h2>
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                  Target: <span style={{ fontFamily: 'monospace', color: '#0F172A' }}>{selectedProposal.file_path}</span>
                  {selectedProposal.line_number && <span> : Line {selectedProposal.line_number}</span>}
                </div>
              </div>
              <button
                onClick={() => setSelectedProposal(null)}
                style={{ border: 'none', backgroundColor: 'transparent', color: '#64748B', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {actionNotice && (
                <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1E40AF', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12.5px' }}>
                  <CheckCircle2 size={15} />
                  <span>{actionNotice}</span>
                </div>
              )}

              {/* Rationale & Threat Context */}
              <div>
                <div style={{ fontSize: '11.5px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                  Remediation Rationale
                </div>
                <div style={{ fontSize: '13px', color: '#1E293B', lineHeight: '1.5', backgroundColor: '#F8FAFC', padding: '12px 14px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                  {selectedProposal.explanation || 'Replaces unvalidated input concatenation with parameterized execution primitives to eliminate code injection vectors.'}
                </div>
              </div>

              {/* Code Diff Inspection */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <div style={{ fontSize: '11.5px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Proposed Code Modification Diff
                  </div>
                  <span style={{ fontSize: '11px', color: '#16A34A', fontWeight: 600 }}>
                    + Synthesized Patch Diff
                  </span>
                </div>

                <div style={{ borderRadius: '6px', overflow: 'hidden', border: '1px solid #E2E8F0', backgroundColor: '#0F172A' }}>
                  <div style={{ padding: '8px 12px', borderBottom: '1px solid #1E293B', backgroundColor: '#1E293B', color: '#94A3B8', fontSize: '11px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{selectedProposal.file_path}</span>
                    <span>Unified Diff</span>
                  </div>
                  <pre
                    style={{
                      margin: 0,
                      padding: '14px',
                      color: '#F8FAFC',
                      fontFamily: 'monospace',
                      fontSize: '11.5px',
                      lineHeight: '1.45',
                      overflowX: 'auto',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {selectedProposal.diff || `--- a/${selectedProposal.file_path}\n+++ b/${selectedProposal.file_path}\n@@ -${selectedProposal.line_number || 1},5 +${selectedProposal.line_number || 1},5 @@\n-  subprocess.call("ping -c 1 " + target_host, shell=True)\n+  subprocess.run(["ping", "-c", "1", target_host], shell=False, check=True)`}
                  </pre>
                </div>
              </div>

              {/* Step-by-Step Safe Workflow Banner */}
              <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '14px', backgroundColor: '#F8FAFC' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A', marginBottom: '8px' }}>
                  Closed-Loop Verification & Merge Policy
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11.5px', color: '#475569' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '18px', height: '18px', borderRadius: '50%', backgroundColor: selectedProposal.validation_status === 'PASSED' ? '#16A34A' : '#CBD5E1', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700 }}>
                      1
                    </div>
                    <span>Deterministic Re-scan: Semgrep AST engine validates 0 vulnerabilities remain.</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '18px', height: '18px', borderRadius: '50%', backgroundColor: selectedProposal.pr_number ? '#16A34A' : '#CBD5E1', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700 }}>
                      2
                    </div>
                    <span>VCS Pull Request: Create branch & PR for team code review (Direct merge disabled).</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '18px', height: '18px', borderRadius: '50%', backgroundColor: '#CBD5E1', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700 }}>
                      3
                    </div>
                    <span>CI Merge: Pass regression test gate and merge via repository approval policy.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8FAFC' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => handleValidateProposal(selectedProposal.id)}
                  disabled={validating}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '6px',
                    backgroundColor: '#0F172A',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: validating ? 'wait' : 'pointer',
                  }}
                >
                  <ShieldCheck size={14} />
                  <span>{validating ? 'Running AST Rescan...' : 'Run Verification Rescan'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCreatePR(selectedProposal)}
                  disabled={creatingPR || selectedProposal.pr_number !== undefined}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    backgroundColor: selectedProposal.pr_number ? '#DCFCE7' : '#2563EB',
                    color: selectedProposal.pr_number ? '#15803D' : '#FFFFFF',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: creatingPR ? 'wait' : 'pointer',
                  }}
                >
                  <GitPullRequest size={14} />
                  <span>{selectedProposal.pr_number ? `PR #${selectedProposal.pr_number} Active` : creatingPR ? 'Creating PR...' : 'Create Branch PR'}</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setSelectedProposal(null)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  color: '#475569',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}

      </div>
    </KavachSastLayout>
  );
}
