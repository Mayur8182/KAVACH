'use client';

/**
 * Thing Cloud — Remediation Workspace
 * Route: /cloud/remediation
 * Deterministic automated remediation actions and infrastructure drift correction.
 * Requires human-in-the-loop or policy approval prior to execution.
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Wrench,
  CheckCircle2,
  XCircle,
  RefreshCw,
  AlertTriangle,
  Play,
  FileCode2,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import type { CloudRemediationJobItem } from '@/types/api/cloud';
import { CloudWorkshell } from '@/components/cloud/CloudWorkshell';

export default function CloudRemediationPage() {
  const [jobs, setJobs] = useState<CloudRemediationJobItem[]>([]);
  const [total, setTotal] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchRemediation = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.cloud.remediation();
      setJobs(res.jobs);
      setTotal(res.total);
      setPendingCount(res.jobs.filter((j) => j.status === 'APPROVAL_REQUIRED' || j.status === 'PROPOSED').length);
    } catch (err: any) {
      setError(err.message || 'Failed to load cloud remediation items.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRemediation();
  }, []);

  const handleExecute = async (jobId: string) => {
    setExecutingId(jobId);
    setError(null);
    setActionSuccess(null);
    try {
      const res = await api.cloud.executeRemediation(jobId);
      setActionSuccess(`Job #${jobId} executed successfully! Status: ${res.status}.`);
      fetchRemediation();
    } catch (err: any) {
      setError(err.message || `Failed to execute remediation #${jobId}.`);
    } finally {
      setExecutingId(null);
    }
  };

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
                  background: 'rgba(59, 130, 246, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Wrench size={14} color="#3b82f6" />
              </div>
              <h1 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-text-primary)', margin: 0 }}>
                Automated Cloud Remediation &amp; Drift Resolution
              </h1>
            </div>
            <p style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              Deterministic remediation proposals, Terraform diffs, and safe guardrail execution for detected misconfigurations.
            </p>
          </div>
          <button
            onClick={fetchRemediation}
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

        {actionSuccess && (
          <div style={{ padding: '12px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', fontSize: '12px', marginBottom: '20px' }}>
            {actionSuccess}
          </div>
        )}

        {isLoading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>
            <RefreshCw size={15} className="animate-spin" style={{ marginRight: '6px' }} />
            Loading remediation pipeline and execution queue...
          </div>
        ) : jobs.length === 0 ? (
          <div
            style={{
              padding: '60px',
              textAlign: 'center',
              background: 'var(--color-surface)',
              border: '1px dashed var(--color-border)',
              borderRadius: '8px',
            }}
          >
            <CheckCircle2 size={36} style={{ color: '#10b981', margin: '0 auto 12px auto' }} />
            <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--color-text-primary)', margin: '0 0 6px 0' }}>
              No Pending Remediations
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', maxWidth: '420px', margin: '0 auto' }}>
              All cloud security findings have been resolved or no remediation proposals have been generated yet.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {jobs.map((job) => (
              <div
                key={job.id}
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  padding: '20px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span
                        style={{
                          fontSize: '10.5px',
                          fontWeight: 'bold',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: job.status === 'COMPLETED' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                          color: job.status === 'COMPLETED' ? '#10b981' : '#3b82f6',
                        }}
                      >
                        {job.status}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                        Action: <code>{job.action_type}</code>
                      </span>
                    </div>

                    <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--color-text-primary)', margin: '0 0 6px 0' }}>
                      Remediation Job #{job.id.substring(0, 8)}
                    </h3>
                    <div style={{ fontSize: '11.5px', color: 'var(--color-text-secondary)' }}>
                      Target Resource: <strong>{job.resource_name}</strong> • Finding Ref: <code>{job.finding_id}</code>
                    </div>
                  </div>

                  {job.status !== 'COMPLETED' && (
                    <button
                      onClick={() => handleExecute(job.id)}
                      disabled={executingId === job.id}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 14px',
                        borderRadius: '6px',
                        background: '#10b981',
                        color: 'white',
                        border: 'none',
                        fontSize: '11.5px',
                        fontWeight: '600',
                        cursor: executingId === job.id ? 'not-allowed' : 'pointer',
                      }}
                    >
                      <Play size={12} /> {executingId === job.id ? 'Executing...' : 'Approve & Execute'}
                    </button>
                  )}
                </div>

                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'flex', gap: '16px' }}>
                  <span>Requested By: <strong>{job.requested_by}</strong></span>
                  <span>Requested At: {new Date(job.requested_at).toLocaleString()}</span>
                  {job.verified_at && <span>Verified At: {new Date(job.verified_at).toLocaleString()}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </CloudWorkshell>
  );
}
