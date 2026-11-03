'use client';

/**
 * Thing Cloud — Evidence Workspace
 * Route: /cloud/evidence
 * Runtime evidence proving deterministic policy decisions, scanner execution logs,
 * configuration snapshots, and cryptographic tamper-proof audit trails.
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  FileCheck2,
  RefreshCw,
  Hash,
  CheckCircle2,
  Lock,
  ExternalLink,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import type { CloudEvidenceItem } from '@/types/api/cloud';
import { CloudWorkshell } from '@/components/cloud/CloudWorkshell';

export default function CloudEvidencePage() {
  const [items, setItems] = useState<CloudEvidenceItem[]>([]);
  const [total, setTotal] = useState(0);
  const [verifiedCount, setVerifiedCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvidence, setSelectedEvidence] = useState<CloudEvidenceItem | null>(null);

  const fetchEvidence = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.cloud.evidence();
      setItems(res.items);
      setTotal(res.total);
      setVerifiedCount(res.items.filter((i) => i.verification_status === 'VERIFIED').length);
    } catch (err: any) {
      setError(err.message || 'Failed to load cloud security evidence.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvidence();
  }, []);

  return (
    <CloudWorkshell>
      <div style={{ padding: '24px', maxWidth: '1440px', width: '100%', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '6px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FileCheck2 size={14} color="#10b981" />
              </div>
              <h1 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-text-primary)', margin: 0 }}>
                Deterministic Security Evidence &amp; Audit Chains
              </h1>
            </div>
            <p style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              Verifiable proof of policy enforcement, configuration evaluation hashes, scanner runs, and tamper-evident audit records.
            </p>
          </div>
          <button
            onClick={fetchEvidence}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '6px 12px',
              borderRadius: '6px',
              background: 'var(--color-surface)',
              color: 'var(--color-text-secondary)',
              border: '1px solid var(--color-border)',
              fontSize: '11.5px',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={12} /> Refresh
          </button>
        </div>

        {error && (
          <div style={{ padding: '12px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontSize: '12px', marginBottom: '20px' }}>
            {error}
          </div>
        )}

        {isLoading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>
            <RefreshCw size={15} className="animate-spin" style={{ marginRight: '6px' }} />
            Verifying cryptographic evidence hashes and audit trees...
          </div>
        ) : items.length === 0 ? (
          <div
            style={{
              padding: '60px',
              textAlign: 'center',
              background: 'var(--color-surface)',
              border: '1px dashed var(--color-border)',
              borderRadius: '8px',
            }}
          >
            <Lock size={36} style={{ color: 'var(--color-text-muted)', margin: '0 auto 12px auto' }} />
            <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--color-text-primary)', margin: '0 0 6px 0' }}>
              No Evidence Artifacts Stored
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', maxWidth: '420px', margin: '0 auto' }}>
              Evidence is continuously recorded upon policy execution, scanner completion, or automated remediation.
            </p>
          </div>
        ) : (
          <>
            {/* Stat Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '24px' }}>
              <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px' }}>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: '600' }}>TOTAL EVIDENCE RECORDS</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--color-text-primary)', marginTop: '4px' }}>
                  {total}
                </div>
              </div>

              <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px' }}>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: '600' }}>CRYPTOGRAPHICALLY VERIFIED</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981', marginTop: '4px' }}>
                  {verifiedCount}
                </div>
              </div>
            </div>

            {/* Evidence Table */}
            <div
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                overflow: 'hidden',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'rgba(255,255,255,0.02)' }}>
                    <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)', fontSize: '11px' }}>EVIDENCE ID</th>
                    <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)', fontSize: '11px' }}>SOURCE</th>
                    <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)', fontSize: '11px' }}>RESOURCE</th>
                    <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)', fontSize: '11px' }}>OBSERVED PROPERTY</th>
                    <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)', fontSize: '11px' }}>VERIFICATION</th>
                    <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)', fontSize: '11px' }}>RECORDED AT</th>
                    <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)', fontSize: '11px' }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((ev) => (
                    <tr key={ev.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: '600', color: 'var(--color-text-primary)' }}>
                        #{ev.id.substring(0, 8)}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--color-text-secondary)', fontSize: '11px' }}>
                        <code>{ev.source}</code>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '11.5px', color: 'var(--color-text-primary)' }}>
                        {ev.resource_name}
                      </td>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '10.5px', color: 'var(--color-text-muted)' }}>
                        {ev.observed_property}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ color: ev.verification_status === 'VERIFIED' ? '#10b981' : '#f59e0b', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: '600' }}>
                          <CheckCircle2 size={12} /> {ev.verification_status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--color-text-muted)', fontSize: '11px' }}>
                        {new Date(ev.recorded_at).toLocaleString()}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <button
                          onClick={() => setSelectedEvidence(ev)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--color-primary-text)',
                            fontSize: '11px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            padding: 0,
                          }}
                        >
                          View Raw Trace
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Evidence Modal */}
            {selectedEvidence && (
              <div
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(0,0,0,0.6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 999,
                  padding: '20px',
                }}
              >
                <div
                  style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    padding: '24px',
                    maxWidth: '680px',
                    width: '100%',
                    maxHeight: '80vh',
                    overflowY: 'auto',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 'bold', margin: 0, color: 'var(--color-text-primary)' }}>
                      Evidence Record #{selectedEvidence.id}
                    </h3>
                    <button
                      onClick={() => setSelectedEvidence(null)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '13px' }}
                    >
                      ✕
                    </button>
                  </div>

                  <div style={{ fontSize: '11.5px', color: 'var(--color-text-secondary)', marginBottom: '12px' }}>
                    Source: <code>{selectedEvidence.source}</code> • Property: <code>{selectedEvidence.observed_property}</code>
                  </div>

                  <pre
                    style={{
                      background: 'var(--color-background)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '6px',
                      padding: '14px',
                      fontFamily: 'monospace',
                      fontSize: '11px',
                      color: 'var(--color-text-primary)',
                      whiteSpace: 'pre-wrap',
                      maxHeight: '360px',
                      overflowY: 'auto',
                    }}
                  >
                    {JSON.stringify(selectedEvidence.raw_payload || {}, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </CloudWorkshell>
  );
}
