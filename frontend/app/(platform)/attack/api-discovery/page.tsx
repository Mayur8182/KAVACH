'use client';

/**
 * Thing Attack — API Discovery (/attack/api-discovery)
 * Trigger real automated API discovery across OpenAPI, Gateway, and Repositories.
 * Shows discovery history, shadow APIs, and zombie endpoints.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AttackWorkshell } from '@/components/attack/AttackWorkshell';
import { AttackStatusBadge } from '@/components/attack/AttackComponents';
import { api } from '@/lib/api/client';
import type { AttackDiscoveryRunItem } from '@/types/api/attack';
import {
  SearchCode,
  Radio,
  RefreshCw,
  Plus,
  Play,
  FileCode2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
} from 'lucide-react';

export default function ApiDiscoveryPage() {
  const router = useRouter();
  const [runs, setRuns] = useState<AttackDiscoveryRunItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Trigger form
  const [source, setSource] = useState<'OPENAPI' | 'REPOSITORY' | 'GATEWAY' | 'RUNTIME_TRAFFIC'>('OPENAPI');
  const [target, setTarget] = useState('https://api.production.internal/openapi.json');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.attack.discoveryRuns();
      setRuns(res.items);
    } catch (err: any) {
      setError(err?.message || 'Failed to load discovery runs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleTrigger = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target) return;
    setSubmitting(true);
    try {
      await api.attack.triggerDiscovery({
        source,
        target,
      });
      load();
    } catch (err: any) {
      alert(err?.message || 'Failed to launch API discovery run');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AttackWorkshell
      actions={
        <button
          onClick={load}
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            fontSize: '11px',
            fontWeight: 500,
            background: 'var(--color-surface-elevated)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-text-primary)',
            cursor: loading ? 'wait' : 'pointer',
          }}
        >
          <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      }
    >
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Launch Discovery Card */}
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px',
          }}
        >
          <h2 style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Trigger API &amp; Service Discovery Run
          </h2>
          <p style={{ margin: '0 0 16px 0', fontSize: '11.5px', color: 'var(--color-text-muted)' }}>
            Continuously crawl and ingest API schemas, traffic traces, and repository route handlers to identify shadow and zombie endpoints.
          </p>

          <form onSubmit={handleTrigger} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ width: '220px' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>
                Discovery Provenance Source
              </label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value as any)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  background: 'var(--color-surface-elevated)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--color-text-primary)',
                  fontSize: '12px',
                  outline: 'none',
                }}
              >
                <option value="OPENAPI">OpenAPI / Swagger Spec</option>
                <option value="REPOSITORY">Source Repository Routes</option>
                <option value="GATEWAY">Kong / Envoy Gateway Spec</option>
                <option value="RUNTIME_TRAFFIC">eBPF Runtime Traffic Telemetry</option>
              </select>
            </div>

            <div style={{ flexGrow: 1, minWidth: '300px' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>
                Target Spec URL or Repo Path
              </label>
              <input
                type="text"
                required
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="https://api.example.com/openapi.json or /routes/v1"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: 'var(--color-surface-elevated)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--color-text-primary)',
                  fontSize: '12px',
                  outline: 'none',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '8px 18px',
                background: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: submitting ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Play size={12} />
              {submitting ? 'Enumerating...' : 'Start Discovery'}
            </button>
          </form>
        </div>

        {/* Discovery Runs History */}
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '14px 20px',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              Discovery Execution History ({runs.length})
            </h3>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
              Real execution logs and schema diffs
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {loading ? (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '12px' }}>
                Loading discovery history...
              </div>
            ) : runs.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '12px' }}>
                No discovery runs logged yet.
              </div>
            ) : (
              runs.map((r) => (
                <div
                  key={r.id}
                  style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid var(--color-border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          fontSize: '10.5px',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '3px',
                          background: 'rgba(59, 130, 246, 0.15)',
                          color: '#3b82f6',
                        }}
                      >
                        {r.source}
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                        {r.target}
                      </span>
                    </div>

                    <AttackStatusBadge status={r.status} />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px', fontSize: '11.5px', color: 'var(--color-text-muted)' }}>
                    <span>Endpoints Discovered: <strong style={{ color: 'var(--color-text-primary)' }}>{r.endpoints_discovered}</strong></span>
                    <span>Shadow APIs: <strong style={{ color: r.shadow_apis_detected > 0 ? '#ef4444' : 'var(--color-text-primary)' }}>{r.shadow_apis_detected}</strong></span>
                    <span>Completed: <strong>{r.completed_at || 'In progress'}</strong></span>
                  </div>

                  {/* Logs snippet */}
                  {r.logs && r.logs.length > 0 && (
                    <div
                      style={{
                        background: '#0d1117',
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '11px',
                        fontFamily: 'monospace',
                        color: '#8b949e',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                      }}
                    >
                      {r.logs.map((log, idx) => (
                        <div key={idx} style={{ color: log.includes('[WARN]') ? '#f87171' : '#8b949e' }}>
                          {log}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </AttackWorkshell>
  );
}
