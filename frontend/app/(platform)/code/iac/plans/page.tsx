'use client';

/**
 * Kavach — IaC Security: Plan & Change Analysis (/code/iac/plans)
 * Screen 09: Evaluates Terraform plan JSON and infrastructure changes before deployment.
 * Detects planned resource additions, modifications, deletions, security impact,
 * policy violations, and before-and-after security posture.
 */

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import {
  FileCode2,
  RefreshCw,
  Plus,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  GitPullRequest,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  ArrowRight,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { useScope } from '@/context/ScopeContext';

interface PlanAnalysisItem {
  id: string;
  plan_name: string;
  repository_name: string;
  environment: string;
  status: string;
  author: string;
  commit_sha?: string;
  pr_number?: number;
  pr_url?: string;
  planned_additions: number;
  planned_changes: number;
  planned_deletions: number;
  policy_violations_count: number;
  security_impact_score: number;
  resource_changes: Array<{
    address: string;
    type: string;
    action: string;
    security_assessment: string;
  }>;
  policy_violations: Array<{
    rule_id: string;
    rule_name: string;
    severity: string;
    resource: string;
    message: string;
  }>;
  before_after_posture: {
    before_score: number;
    after_score: number;
    risk_delta: number;
    critical_count_delta: number;
    high_count_delta: number;
  };
  raw_summary?: string;
  created_at: string;
}

function IaCPlansContent() {
  const { currentRepository } = useScope();
  const repoName = currentRepository?.name || 'All Repositories';

  const [plans, setPlans] = useState<PlanAnalysisItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [newPlanTitle, setNewPlanTitle] = useState('');
  const [newPlanJson, setNewPlanJson] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/v1/iac/plans');
      if (Array.isArray(res)) {
        setPlans(res);
        if (res.length > 0 && !expandedPlanId) {
          setExpandedPlanId(res[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch plan analyses:', err);
    } finally {
      setLoading(false);
    }
  }, [expandedPlanId]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const handleAnalyzePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlanTitle.trim()) return;
    setAnalyzing(true);
    try {
      const res = await api.post('/api/v1/iac/plans/analyze', {
        plan_name: newPlanTitle.trim(),
        repository_name: repoName !== 'All Repositories' ? repoName : 'terraform-aws-production',
        environment: 'production',
        plan_json_content: newPlanJson || '{}',
        pr_number: 148,
        author: 'Security Engineer',
      });
      setToastMessage(res.message || 'Plan analyzed against security policy gates!');
      setTimeout(() => setToastMessage(null), 5000);
      setUploadModalOpen(false);
      setNewPlanTitle('');
      setNewPlanJson('');
      await fetchPlans();
    } catch (err: any) {
      alert(`Plan analysis failed: ${err.message || 'Check JSON payload'}`);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#F8FAFC', minHeight: '100vh', padding: '24px 32px' }}>
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
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
            zIndex: 1000,
          }}
        >
          <CheckCircle2 size={16} color="#10B981" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#2563EB',
                backgroundColor: '#EFF6FF',
                border: '1px solid #DBEAFE',
                borderRadius: '4px',
                padding: '2px 6px',
                textTransform: 'uppercase',
              }}
            >
              IaC Security
            </span>
            <span style={{ fontSize: '12px', color: '#64748B' }}>/</span>
            <span style={{ fontSize: '12px', color: '#64748B' }}>Pre-Deployment</span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
            Plan &amp; Change Analysis
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
            Evaluate Terraform plan files before deployment to detect policy violations, security posture delta, and unauthorized resource changes.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => fetchPlans()}
            disabled={loading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              backgroundColor: '#FFFFFF',
              color: '#334155',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>

          <button
            onClick={() => setUploadModalOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#2563EB',
              color: '#FFFFFF',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(37,99,235,0.2)',
            }}
          >
            <Plus size={14} />
            Evaluate Terraform Plan
          </button>
        </div>
      </div>

      {/* Plans List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {loading ? (
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '50px', textAlign: 'center', color: '#64748B' }}>
            <RefreshCw size={22} className="animate-spin" style={{ margin: '0 auto 10px auto', color: '#2563EB' }} />
            Loading evaluated plans...
          </div>
        ) : plans.length === 0 ? (
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '60px', textAlign: 'center', color: '#64748B' }}>
            <FileCode2 size={36} style={{ margin: '0 auto 12px auto', color: '#94A3B8' }} />
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A' }}>No Terraform plan evaluations yet</div>
            <div style={{ fontSize: '13px', color: '#94A3B8', marginTop: '4px' }}>
              Upload a plan JSON or integrate your CI/CD pipeline to evaluate infrastructure pull requests before deployment.
            </div>
          </div>
        ) : (
          plans.map((p) => {
            const isExpanded = expandedPlanId === p.id;
            const isViolation = p.status === 'POLICY_VIOLATION' || p.policy_violations_count > 0;
            const delta = p.before_after_posture?.risk_delta || 0;

            return (
              <div
                key={p.id}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  border: isViolation ? '1px solid #FECACA' : '1px solid #E2E8F0',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  overflow: 'hidden',
                }}
              >
                {/* Plan Header */}
                <div
                  style={{
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    backgroundColor: isExpanded ? '#F8FAFC' : '#FFFFFF',
                    borderBottom: isExpanded ? '1px solid #E2E8F0' : 'none',
                  }}
                  onClick={() => setExpandedPlanId(isExpanded ? null : p.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '8px',
                        backgroundColor: isViolation ? '#FEF2F2' : '#F0FDF4',
                        border: `1px solid ${isViolation ? '#FECACA' : '#DCFCE7'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: isViolation ? '#DC2626' : '#16A34A',
                        flexShrink: 0,
                      }}
                    >
                      {isViolation ? <XCircle size={20} /> : <CheckCircle2 size={20} />}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                          {p.plan_name}
                        </h2>
                        {p.pr_number && (
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 600,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: '#EFF6FF',
                              color: '#2563EB',
                              border: '1px solid #DBEAFE',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <GitPullRequest size={10} /> PR #{p.pr_number}
                          </span>
                        )}
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            backgroundColor: isViolation ? '#FEF2F2' : '#F0FDF4',
                            color: isViolation ? '#DC2626' : '#16A34A',
                            border: `1px solid ${isViolation ? '#FECACA' : '#DCFCE7'}`,
                          }}
                        >
                          {isViolation ? 'BLOCKED: Policy Violations' : 'PASSED: Deployment Allowed'}
                        </span>
                      </div>

                      <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px', display: 'flex', gap: '12px' }}>
                        <span>Repository: <strong>{p.repository_name}</strong></span>
                        <span>Environment: <strong>{p.environment}</strong></span>
                        <span>Author: <strong>{p.author}</strong></span>
                        <span>Changes: +{p.planned_additions} ~{p.planned_changes} -{p.planned_deletions}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>Security Posture Impact</div>
                      <div
                        style={{
                          fontSize: '14px',
                          fontWeight: 700,
                          color: delta < 0 ? '#DC2626' : '#16A34A',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          justifyContent: 'flex-end',
                        }}
                      >
                        {delta < 0 ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
                        {p.before_after_posture?.before_score} → {p.before_after_posture?.after_score} ({delta >= 0 ? `+${delta}` : delta})
                      </div>
                    </div>

                    <button
                      type="button"
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748B' }}
                    >
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                  </div>
                </div>

                {/* Plan Expanded Details */}
                {isExpanded && (
                  <div style={{ padding: '20px', borderTop: '1px solid #E2E8F0', backgroundColor: '#FFFFFF' }}>
                    {/* Violations Block */}
                    {p.policy_violations && p.policy_violations.length > 0 && (
                      <div style={{ marginBottom: '20px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#DC2626', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <AlertTriangle size={15} /> Deployment Gates Failed ({p.policy_violations.length})
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {p.policy_violations.map((v, idx) => (
                            <div
                              key={idx}
                              style={{
                                padding: '12px 14px',
                                borderRadius: '8px',
                                backgroundColor: '#FEF2F2',
                                border: '1px solid #FECACA',
                                display: 'flex',
                                alignItems: 'flex-start',
                                justifyContent: 'space-between',
                              }}
                            >
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#DC2626', backgroundColor: '#FFFFFF', padding: '1px 6px', borderRadius: '4px', border: '1px solid #FCA5A5' }}>
                                    {v.severity}
                                  </span>
                                  <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#991B1B' }}>
                                    {v.rule_name}
                                  </span>
                                  <code style={{ fontSize: '11px', color: '#64748B' }}>({v.rule_id})</code>
                                </div>
                                <div style={{ fontSize: '12.5px', color: '#7F1D1D', marginTop: '4px' }}>
                                  {v.message}
                                </div>
                                <div style={{ fontSize: '11px', color: '#991B1B', marginTop: '4px', fontFamily: 'monospace' }}>
                                  Target: {v.resource}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Resource Changes Grid */}
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', marginBottom: '10px' }}>
                        Planned Resource Changes ({p.resource_changes?.length || 0})
                      </div>
                      <div
                        style={{
                          border: '1px solid #E2E8F0',
                          borderRadius: '8px',
                          overflow: 'hidden',
                        }}
                      >
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                          <thead>
                            <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B' }}>
                              <th style={{ padding: '8px 12px', textAlign: 'left' }}>Action</th>
                              <th style={{ padding: '8px 12px', textAlign: 'left' }}>Resource Address</th>
                              <th style={{ padding: '8px 12px', textAlign: 'left' }}>Type</th>
                              <th style={{ padding: '8px 12px', textAlign: 'left' }}>Security Gate Verdict</th>
                            </tr>
                          </thead>
                          <tbody>
                            {p.resource_changes?.map((c, i) => (
                              <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                <td style={{ padding: '8px 12px' }}>
                                  <span
                                    style={{
                                      fontSize: '10px',
                                      fontWeight: 700,
                                      padding: '2px 5px',
                                      borderRadius: '4px',
                                      backgroundColor: c.action === 'create' ? '#ECFDF5' : (c.action === 'delete' ? '#FEF2F2' : '#EFF6FF'),
                                      color: c.action === 'create' ? '#059669' : (c.action === 'delete' ? '#DC2626' : '#2563EB'),
                                      textTransform: 'uppercase',
                                    }}
                                  >
                                    {c.action}
                                  </span>
                                </td>
                                <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontWeight: 600, color: '#0F172A' }}>
                                  {c.address}
                                </td>
                                <td style={{ padding: '8px 12px', color: '#64748B' }}>
                                  {c.type}
                                </td>
                                <td style={{ padding: '8px 12px' }}>
                                  <span
                                    style={{
                                      color: c.security_assessment.startsWith('FAIL') ? '#DC2626' : '#16A34A',
                                      fontWeight: 600,
                                    }}
                                  >
                                    {c.security_assessment}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Upload/Evaluate Plan Modal */}
      {uploadModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999,
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              padding: '24px',
              width: '100%',
              maxWidth: '560px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            }}
          >
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
              Evaluate Terraform Plan Before Deployment
            </h2>
            <p style={{ fontSize: '13px', color: '#64748B', marginTop: '6px' }}>
              Run Kavach deterministic security policy gates against planned resource changes to catch misconfigurations before cloud provisioning.
            </p>

            <form onSubmit={handleAnalyzePlan} style={{ marginTop: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Plan / Pull Request Title
              </label>
              <input
                type="text"
                required
                placeholder="e.g. PR #149: Add Ingress Controller & Security Groups"
                value={newPlanTitle}
                onChange={(e) => setNewPlanTitle(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  marginBottom: '14px',
                }}
              />

              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Terraform Plan JSON Content (or paste <code>terraform show -json tfplan</code> output)
              </label>
              <textarea
                rows={8}
                placeholder='{"resource_changes": [{"address": "aws_s3_bucket.data", "type": "aws_s3_bucket", "change": {"actions": ["create"], "after": {"acl": "public-read"}}}]}'
                value={newPlanJson}
                onChange={(e) => setNewPlanJson(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    backgroundColor: '#FFFFFF',
                    color: '#64748B',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={analyzing}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#2563EB',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: analyzing ? 'not-allowed' : 'pointer',
                  }}
                >
                  {analyzing ? 'Evaluating Gates...' : 'Run Plan Security Gates'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function IaCPlansPage() {
  return (
    <Suspense fallback={<div style={{ padding: '32px', color: '#64748B' }}>Loading plan evaluations...</div>}>
      <IaCPlansContent />
    </Suspense>
  );
}
