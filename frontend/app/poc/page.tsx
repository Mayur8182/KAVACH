'use client';

/**
 * /poc — SecuLayer Customer POC Workspace & Results Suite
 * Comprehensive real implementation of:
 * - Customer POC Request
 * - POC Workspace
 * - POC Progress & Milestones Tracker
 * - POC Results & Executive Evaluation Scorecard
 * - Direct hand-off to Enterprise Proposal / Quote (CPQ)
 *
 * Strict Production Engineering:
 * - Persisted in PostgreSQL / SQLite customer_pocs table
 * - Real API integration with /api/v1/sales/poc/*
 * - Cryptographic evidence validation of milestone criteria
 */

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Play,
  FileCheck,
  ArrowRight,
  RefreshCw,
  Award,
  Layers,
  Terminal,
  Server,
  Code2,
  Calendar,
  Building,
  User,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Sparkles,
} from 'lucide-react';
import { SecuLayerHeader } from '@/components/navigation/SecuLayerHeader';
import { api } from '@/lib/api/client';

function POCWorkspaceContent() {
  const searchParams = useSearchParams();
  const initialCompany = searchParams?.get('company') || '';
  const initialEmail = searchParams?.get('email') || '';
  const initialName = searchParams?.get('name') || '';

  const [pocs, setPocs] = useState<any[]>([]);
  const [selectedPocId, setSelectedPocId] = useState<string | null>(null);
  const [activePocDetails, setActivePocDetails] = useState<any | null>(null);
  const [pocResults, setPocResults] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New POC Request Form State
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [reqCompany, setReqCompany] = useState(initialCompany || 'Acme Global Defense');
  const [reqName, setReqName] = useState(initialName || 'Marcus Aurelius');
  const [reqEmail, setReqEmail] = useState(initialEmail || 'marcus@acmeglobal.com');
  const [reqDuration, setReqDuration] = useState(30);
  const [reqTier, setReqTier] = useState('DEDICATED_SANDBOX');
  const [reqRepos, setReqRepos] = useState('acme/core-agent-backend, acme/cloud-infrastructure, acme/mcp-gateway');
  const [reqClouds, setReqClouds] = useState('AWS GovCloud us-east-1, GCP Sovereign Enclave');
  const [reqAgents, setReqAgents] = useState(10);
  const [creatingPoc, setCreatingPoc] = useState(false);

  // Milestone Verification State
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const loadPocs = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await api.sales.listPOCs();
      setPocs(list || []);
      if (list && list.length > 0 && !selectedPocId) {
        setSelectedPocId(list[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load POCs', err);
      setError(err?.message || 'Failed to fetch POC environments.');
    } finally {
      setLoading(false);
    }
  };

  const loadActivePocDetails = async (pocId: string) => {
    try {
      const [details, results] = await Promise.all([
        api.sales.getPOC(pocId),
        api.sales.getPOCResults(pocId),
      ]);
      setActivePocDetails(details);
      setPocResults(results);
    } catch (err) {
      console.error('Failed to load details for POC', pocId, err);
    }
  };

  useEffect(() => {
    loadPocs();
  }, []);

  useEffect(() => {
    if (selectedPocId) {
      loadActivePocDetails(selectedPocId);
    }
  }, [selectedPocId]);

  const handleCreatePOC = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingPoc(true);
    setError(null);
    try {
      const res = await api.sales.requestPOC({
        company_name: reqCompany.trim(),
        contact_name: reqName.trim(),
        contact_email: reqEmail.trim(),
        duration_days: reqDuration,
        environment_tier: reqTier,
        scope_repositories: reqRepos.split(',').map((r) => r.trim()).filter(Boolean),
        scope_cloud_accounts: reqClouds.split(',').map((c) => c.trim()).filter(Boolean),
        scope_agents_count: reqAgents,
      });

      setShowRequestForm(false);
      await loadPocs();
      if (res?.poc_id) {
        setSelectedPocId(res.poc_id);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to initialize POC');
    } finally {
      setCreatingPoc(false);
    }
  };

  const handleVerifyMilestone = async (criterionId: string) => {
    if (!selectedPocId) return;
    setVerifyingId(criterionId);
    try {
      await api.sales.verifyPOCMilestone(selectedPocId, criterionId);
      await loadActivePocDetails(selectedPocId);
      await loadPocs();
    } catch (err) {
      console.error('Verification failed', err);
    } finally {
      setVerifyingId(null);
    }
  };

  const currentPoc = activePocDetails?.poc;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', color: '#0F172A', display: 'flex', flexDirection: 'column' }}>
      <SecuLayerHeader />

      <main style={{ flex: 1, maxWidth: '1380px', width: '100%', margin: '0 auto', padding: '36px 24px 80px', boxSizing: 'border-box' }}>
        
        {/* Top Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#2563EB', fontSize: '13px', fontWeight: 700, marginBottom: '4px' }}>
              <ShieldCheck size={16} />
              <span>ENTERPRISE PROOF OF CONCEPT (POC) WORKSPACE</span>
            </div>
            <h1 style={{ fontSize: '28px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: '#0F172A' }}>
              Evaluation Milestones & Executive Results
            </h1>
            <p style={{ fontSize: '14px', color: '#64748B', margin: '4px 0 0' }}>
              Track active POC environment scope, deterministic criteria verification, and transition directly to Proposal & Quotes.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => setShowRequestForm(!showRequestForm)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 16px',
                borderRadius: '8px',
                backgroundColor: showRequestForm ? '#CBD5E1' : '#FFFFFF',
                border: '1px solid #CBD5E1',
                fontSize: '13px',
                fontWeight: 600,
                color: '#334155',
                cursor: 'pointer',
              }}
            >
              <span>{showRequestForm ? 'Close Form' : '+ New POC Request'}</span>
            </button>
            <Link
              href="/sales/quote"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 16px',
                borderRadius: '8px',
                backgroundColor: '#2563EB',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              <span>Proceed to Quote (CPQ)</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* New POC Request Form Collapsible */}
        {showRequestForm && (
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '32px', marginBottom: '32px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 8px', color: '#0F172A' }}>
              Launch Dedicated Customer Proof of Concept
            </h2>
            <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 20px' }}>
              Provisions a dedicated testing enclave pre-configured with deterministic policy gateways and SAST evaluation runners.
            </p>

            <form onSubmit={handleCreatePOC} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Company Name *</label>
                  <input
                    type="text"
                    required
                    value={reqCompany}
                    onChange={(e) => setReqCompany(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Lead Technical Contact *</label>
                  <input
                    type="text"
                    required
                    value={reqName}
                    onChange={(e) => setReqName(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Contact Email *</label>
                  <input
                    type="email"
                    required
                    value={reqEmail}
                    onChange={(e) => setReqEmail(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Duration</label>
                  <select
                    value={reqDuration}
                    onChange={(e) => setReqDuration(parseInt(e.target.value) || 30)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  >
                    <option value={14}>14 Days (Fast-Track)</option>
                    <option value={30}>30 Days (Standard Enterprise)</option>
                    <option value={45}>45 Days (GovCloud Complex)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Environment Tier</label>
                  <select
                    value={reqTier}
                    onChange={(e) => setReqTier(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  >
                    <option value="DEDICATED_SANDBOX">Dedicated VPC Sandbox</option>
                    <option value="HYBRID_VPC">Hybrid Customer VPC Enclave</option>
                    <option value="LOCAL_AGENT_MESH">Local AI Agent Mesh</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>AI Agents Under Evaluation</label>
                  <input
                    type="number"
                    value={reqAgents}
                    onChange={(e) => setReqAgents(parseInt(e.target.value) || 5)}
                    min={1}
                    max={100}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Target Git Repositories (comma-separated)</label>
                <input
                  type="text"
                  value={reqRepos}
                  onChange={(e) => setReqRepos(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowRequestForm(false)}
                  style={{ padding: '8px 16px', backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '13px', fontWeight: 600, color: '#475569', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingPoc}
                  style={{ padding: '8px 20px', backgroundColor: '#2563EB', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: creatingPoc ? 'not-allowed' : 'pointer' }}
                >
                  {creatingPoc ? 'Initializing POC...' : 'Confirm & Provision POC'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Main POC Grid: Left List / Right Active Workspace */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 0.7fr) minmax(0, 1.3fr)', gap: '32px' }}>
          
          {/* Left Column: POC Selection List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#334155' }}>
              Active POC Engagements ({pocs.length})
            </div>

            {loading ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#64748B' }}>
                <RefreshCw size={18} className="animate-spin" style={{ margin: '0 auto 8px' }} />
                <span>Loading POCs...</span>
              </div>
            ) : pocs.length === 0 ? (
              <div style={{ padding: '24px', backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px dashed #CBD5E1', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
                No active POCs found. Click &quot;+ New POC Request&quot; above to launch one.
              </div>
            ) : (
              pocs.map((poc) => {
                const isSelected = selectedPocId === poc.id;
                return (
                  <div
                    key={poc.id}
                    onClick={() => setSelectedPocId(poc.id)}
                    style={{
                      padding: '18px 20px',
                      borderRadius: '12px',
                      backgroundColor: isSelected ? '#FFFFFF' : '#F1F5F9',
                      border: isSelected ? '2px solid #2563EB' : '1px solid #E2E8F0',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: isSelected ? '0 4px 12px rgba(37,99,235,0.08)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>{poc.company_name}</span>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          backgroundColor: poc.status === 'SUCCESS_MET' ? '#DCFCE7' : '#EFF6FF',
                          color: poc.status === 'SUCCESS_MET' ? '#15803D' : '#1D4ED8',
                        }}
                      >
                        {poc.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '8px' }}>
                      Contact: {poc.contact_name} &bull; {poc.contact_email}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: '#475569' }}>
                      <span>Duration: {poc.duration_days} days</span>
                      <span>Tier: {poc.environment_tier}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right Column: Active POC Workspace & Results */}
          <div>
            {currentPoc ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                {/* Active POC Header Card */}
                <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '28px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <h2 style={{ fontSize: '22px', fontWeight: 800, margin: 0, color: '#0F172A' }}>
                          {currentPoc.company_name}
                        </h2>
                        <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', backgroundColor: '#EFF6FF', color: '#2563EB' }}>
                          {currentPoc.status}
                        </span>
                      </div>
                      <div style={{ fontSize: '13px', color: '#64748B' }}>
                        Primary Sponsor: {currentPoc.contact_name} &bull; Technical Lead: {currentPoc.technical_lead}
                      </div>
                    </div>

                    {/* Progress Percentage Badge */}
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '26px', fontWeight: 800, color: '#2563EB' }}>
                        {activePocDetails.completion_rate}%
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>
                        {activePocDetails.completed_milestones} of {activePocDetails.total_milestones} Milestones Met
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div style={{ width: '100%', height: '8px', backgroundColor: '#E2E8F0', borderRadius: '4px', overflow: 'hidden', marginBottom: '24px' }}>
                    <div style={{ width: `${activePocDetails.completion_rate}%`, height: '100%', backgroundColor: '#2563EB', transition: 'width 0.3s ease' }} />
                  </div>

                  {/* Stats Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', borderTop: '1px solid #F1F5F9', paddingTop: '20px' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>Days Remaining</div>
                      <div style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A' }}>{activePocDetails.days_remaining}d</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>Scans Run</div>
                      <div style={{ fontSize: '20px', fontWeight: 800, color: '#0284C7' }}>{currentPoc.scans_run_count}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>Findings Discovered</div>
                      <div style={{ fontSize: '20px', fontWeight: 800, color: '#EF4444' }}>{currentPoc.findings_detected_count}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>Policies Enforced</div>
                      <div style={{ fontSize: '20px', fontWeight: 800, color: '#10B981' }}>{currentPoc.policies_enforced_count}</div>
                    </div>
                  </div>
                </div>

                {/* Success Criteria & Milestone Checklist */}
                <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '28px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                  <h3 style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 16px', color: '#0F172A' }}>
                    Success Criteria & Verification Milestones
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {(currentPoc.success_criteria || []).map((crit: any) => {
                      const isVerified = crit.status === 'VERIFIED_SUCCESS';
                      const isVerifying = verifyingId === crit.id;

                      return (
                        <div
                          key={crit.id}
                          style={{
                            padding: '16px',
                            borderRadius: '10px',
                            backgroundColor: isVerified ? '#F0FDF4' : '#F8FAFC',
                            border: isVerified ? '1px solid #BBF7D0' : '1px solid #E2E8F0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '16px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                            <div style={{ marginTop: '2px', color: isVerified ? '#16A34A' : '#94A3B8' }}>
                              {isVerified ? <CheckCircle2 size={18} /> : <Clock size={18} />}
                            </div>
                            <div>
                              <div style={{ fontSize: '14px', fontWeight: 700, color: isVerified ? '#166534' : '#0F172A' }}>
                                {crit.title}
                              </div>
                              <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                                Category: {crit.category} &bull; Expected: {crit.metric}
                              </div>
                              {crit.evidence_ref && (
                                <div style={{ fontSize: '11px', color: '#15803D', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                                  Evidence Proof: {crit.evidence_ref}
                                </div>
                              )}
                            </div>
                          </div>

                          <div>
                            {isVerified ? (
                              <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '6px', backgroundColor: '#DCFCE7', color: '#166534' }}>
                                VERIFIED
                              </span>
                            ) : (
                              <button
                                onClick={() => handleVerifyMilestone(crit.id)}
                                disabled={isVerifying}
                                style={{
                                  padding: '6px 14px',
                                  backgroundColor: '#2563EB',
                                  color: '#FFFFFF',
                                  border: 'none',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  cursor: isVerifying ? 'not-allowed' : 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                {isVerifying ? (
                                  <RefreshCw size={12} className="animate-spin" />
                                ) : (
                                  <Play size={12} />
                                )}
                                <span>Verify Criterion</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* POC Results & Executive Scorecard */}
                {pocResults && (
                  <div style={{ backgroundColor: '#0B1120', color: '#FFFFFF', borderRadius: '16px', border: '1px solid #1E293B', padding: '28px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#38BDF8', fontSize: '13px', fontWeight: 700 }}>
                        <Award size={16} />
                        <span>EXECUTIVE EVALUATION REPORT & SCORECARD</span>
                      </div>
                      <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', backgroundColor: 'rgba(56,189,248,0.2)', color: '#38BDF8', fontWeight: 700 }}>
                        {pocResults.verdict}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                      <div style={{ padding: '14px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <div style={{ fontSize: '11px', color: '#94A3B8' }}>Overall Pass Rate</div>
                        <div style={{ fontSize: '22px', fontWeight: 800, color: '#38BDF8', marginTop: '4px' }}>{pocResults.pass_rate_percentage}%</div>
                      </div>
                      <div style={{ padding: '14px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <div style={{ fontSize: '11px', color: '#94A3B8' }}>Scans Executed</div>
                        <div style={{ fontSize: '22px', fontWeight: 800, color: '#10B981', marginTop: '4px' }}>{pocResults.scans_executed}</div>
                      </div>
                      <div style={{ padding: '14px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <div style={{ fontSize: '11px', color: '#94A3B8' }}>Vulns Remediated</div>
                        <div style={{ fontSize: '22px', fontWeight: 800, color: '#F59E0B', marginTop: '4px' }}>{pocResults.vulnerabilities_resolved}</div>
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid #1E293B', paddingTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                      <div style={{ fontSize: '13px', color: '#94A3B8' }}>
                        Recommended Next Step: <strong>{pocResults.next_step}</strong>
                      </div>
                      <Link
                        href={`/sales/quote?poc_id=${encodeURIComponent(currentPoc.id)}&company=${encodeURIComponent(currentPoc.company_name)}&email=${encodeURIComponent(currentPoc.contact_email)}`}
                        style={{
                          padding: '10px 20px',
                          backgroundColor: '#2563EB',
                          color: '#FFFFFF',
                          borderRadius: '8px',
                          fontSize: '13px',
                          fontWeight: 600,
                          textDecoration: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <span>Generate Proposal & Quote</span>
                        <ArrowRight size={14} />
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ padding: '64px', backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', textAlign: 'center', color: '#64748B' }}>
                <ShieldCheck size={36} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                <div style={{ fontSize: '16px', fontWeight: 600, color: '#0F172A' }}>Select a POC from the list</div>
                <div style={{ fontSize: '13px', marginTop: '4px' }}>Or launch a new proof of concept evaluation using the button above.</div>
              </div>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}

export default function POCWorkspacePage() {
  return (
    <Suspense fallback={<div style={{ padding: '48px', textAlign: 'center', color: '#64748B' }}>Loading POC Workspace...</div>}>
      <POCWorkspaceContent />
    </Suspense>
  );
}
