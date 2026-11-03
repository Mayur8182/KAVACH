'use client';

/**
 * Thing Cloud — Finding Detail Workspace
 * Route: /cloud/findings/[findingId]
 * Deep inspection of a single cloud finding with deterministic rule evidence,
 * observed vs expected configuration values, attack path linkage, and remediation proposal.
 */

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  FileCode2,
  RefreshCw,
  Wrench,
  ExternalLink,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import type { CloudFindingDetailResponse } from '@/types/api/cloud';
import { CloudWorkshell } from '@/components/cloud/CloudWorkshell';

interface PageProps {
  params: Promise<{ findingId: string }>;
}

export default function CloudFindingDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const { findingId } = resolvedParams;

  const [finding, setFinding] = useState<CloudFindingDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [remediating, setRemediating] = useState(false);
  const [remediateSuccess, setRemediateSuccess] = useState<string | null>(null);

  const fetchFindingDetail = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.cloud.findingDetail(findingId);
      setFinding(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load finding details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFindingDetail();
  }, [findingId]);

  const handleProposeRemediation = async () => {
    if (!finding) return;
    setRemediating(true);
    setRemediateSuccess(null);
    try {
      const res = await api.cloud.proposeRemediation(finding.id);
      setRemediateSuccess(
        `Remediation action #${res.action_id} proposed successfully! Status: ${res.status}. Pending approval.`
      );
    } catch (err: any) {
      setError(err.message || 'Failed to generate remediation proposal.');
    } finally {
      setRemediating(false);
    }
  };

  return (
    <CloudWorkshell>
      <div style={{ padding: '24px', maxWidth: '1440px', width: '100%', margin: '0 auto' }}>
        <div style={{ marginBottom: '16px' }}>
          <Link
            href="/cloud/findings"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11.5px',
              color: 'var(--color-text-secondary)',
              textDecoration: 'none',
            }}
          >
            <ArrowLeft size={13} /> Back to Findings
          </Link>
        </div>

        {error && (
          <div style={{ padding: '14px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontSize: '12px', marginBottom: '20px' }}>
            {error}
          </div>
        )}

        {remediateSuccess && (
          <div style={{ padding: '14px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', fontSize: '12px', marginBottom: '20px' }}>
            {remediateSuccess}
          </div>
        )}

        {isLoading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>
            <RefreshCw size={15} className="animate-spin" style={{ marginRight: '6px' }} />
            Loading finding record and deterministic policy trace...
          </div>
        ) : !finding ? null : (
          <div>
            {/* Finding Header Card */}
            <div
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                padding: '20px 24px',
                marginBottom: '20px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 'bold',
                        padding: '2px 7px',
                        borderRadius: '4px',
                        background: finding.severity === 'CRITICAL' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                        color: finding.severity === 'CRITICAL' ? '#ef4444' : '#f59e0b',
                      }}
                    >
                      {finding.severity}
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
                      {finding.provider}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                      Rule: <code>{finding.rule_id}</code>
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: '600' }}>
                      Status: {finding.status}
                    </span>
                  </div>

                  <h1 style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--color-text-primary)', margin: '0 0 6px 0' }}>
                    {finding.title}
                  </h1>

                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', maxWidth: '800px', lineHeight: '1.5' }}>
                    {finding.description}
                  </div>
                </div>

                <button
                  onClick={handleProposeRemediation}
                  disabled={remediating}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '6px',
                    background: 'var(--color-primary)',
                    color: 'white',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: remediating ? 'not-allowed' : 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Wrench size={13} /> {remediating ? 'Generating...' : 'Propose Remediation'}
                </button>
              </div>

              {/* Resource Link Metadata */}
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '16px',
                  marginTop: '16px',
                  paddingTop: '16px',
                  borderTop: '1px solid var(--color-border)',
                  fontSize: '11.5px',
                }}
              >
                <div>
                  <span style={{ color: 'var(--color-text-muted)' }}>Affected Resource: </span>
                  <Link
                    href={`/cloud/assets/${(finding as any).resource_id || finding.id}`}
                    style={{ color: 'var(--color-primary-text)', fontWeight: '600', textDecoration: 'none' }}
                  >
                    {finding.resource_name} ({finding.resource_type}) →
                  </Link>
                </div>
                <div>
                  <span style={{ color: 'var(--color-text-muted)' }}>Environment: </span>
                  <strong style={{ color: 'var(--color-text-primary)' }}>{finding.environment}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--color-text-muted)' }}>First Seen: </span>
                  <span style={{ color: 'var(--color-text-secondary)' }}>
                    {new Date((finding as any).created_at || (finding as any).first_seen || Date.now()).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Evidence & Invariants Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: '20px' }}>
              {/* Deterministic Evaluation */}
              <div
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  padding: '20px',
                }}
              >
                <h3 style={{ fontSize: '13px', fontWeight: 'bold', margin: '0 0 12px 0', color: 'var(--color-text-primary)' }}>
                  Deterministic Policy Verification
                </h3>

                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: '6px',
                    background: 'var(--color-background)',
                    border: '1px solid var(--color-border)',
                    marginBottom: '14px',
                    fontSize: '11.5px',
                  }}
                >
                  <div style={{ color: 'var(--color-text-muted)', marginBottom: '4px' }}>Observed Configuration:</div>
                  <pre style={{ margin: 0, fontFamily: 'monospace', color: '#ef4444', whiteSpace: 'pre-wrap' }}>
                    {JSON.stringify((finding as any).observed_properties || {}, null, 2)}
                  </pre>
                </div>

                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: '6px',
                    background: 'var(--color-background)',
                    border: '1px solid var(--color-border)',
                    fontSize: '11.5px',
                  }}
                >
                  <div style={{ color: 'var(--color-text-muted)', marginBottom: '4px' }}>Expected Invariant:</div>
                  <pre style={{ margin: 0, fontFamily: 'monospace', color: '#10b981', whiteSpace: 'pre-wrap' }}>
                    {JSON.stringify((finding as any).expected_properties || {}, null, 2)}
                  </pre>
                </div>
              </div>

              {/* Remediation Guidance */}
              <div
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  padding: '20px',
                }}
              >
                <h3 style={{ fontSize: '13px', fontWeight: 'bold', margin: '0 0 12px 0', color: 'var(--color-text-primary)' }}>
                  Remediation &amp; Guardrail Guidance
                </h3>
                <p style={{ fontSize: '11.5px', color: 'var(--color-text-secondary)', lineHeight: '1.6', margin: '0 0 14px 0' }}>
                  {finding.remediation_guidance}
                </p>

                <div
                  style={{
                    padding: '14px',
                    borderRadius: '6px',
                    background: 'var(--color-background)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '6px', fontWeight: '600' }}>
                    REMEDIATION WORKFLOW:
                  </div>
                  <ol style={{ margin: 0, paddingLeft: '18px', fontSize: '11.5px', color: 'var(--color-text-secondary)', lineHeight: '1.6' }}>
                    <li>Click &ldquo;Propose Remediation&rdquo; to generate deterministic infrastructure patch.</li>
                    <li>Inspect proposed terraform/CLI diff in Cloud Remediation workspace.</li>
                    <li>Security approval required before automated change execution.</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </CloudWorkshell>
  );
}
