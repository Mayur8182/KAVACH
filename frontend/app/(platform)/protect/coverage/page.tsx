'use client';

/**
 * Thing Protect — Protection Coverage & Runtime Gaps (/protect/coverage)
 * Empirical runtime inventory coverage. Identifies unprotected surfaces, missing proxies, and missing policies.
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  PieChart,
  Shield,
  AlertTriangle,
  RefreshCw,
  Layers,
  ArrowRight,
  CheckCircle2,
  Server,
  Wrench,
  Globe,
  Bot,
  Cpu,
} from 'lucide-react';
import { ProtectWorkshell } from '@/components/protect/ProtectWorkshell';
import { api } from '@/lib/api/client';
import type { ProtectionCoverageData } from '@/types/api/protect';

export default function CoveragePage() {
  const [coverage, setCoverage] = useState<ProtectionCoverageData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadCoverage = async () => {
    try {
      setLoading(true);
      const data: any = await api.protect.coverage();
      setCoverage(data || null);
    } catch (err) {
      console.error('Failed to load protection coverage:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCoverage();
  }, []);

  const safeCoverage = coverage || {
    protected_apis: 0,
    total_apis: 0,
    protected_agents: 0,
    total_agents: 0,
    protected_mcp_servers: 0,
    total_mcp_servers: 0,
    protected_k8s_workloads: 0,
    total_k8s_workloads: 0,
    unprotected_services: [],
    gaps: [],
  };

  const safeGaps = Array.isArray(safeCoverage.gaps) ? safeCoverage.gaps : [];
  const safeUnprotected = Array.isArray(safeCoverage.unprotected_services)
    ? safeCoverage.unprotected_services
    : [];

  const calcPct = (num: any, denom: any) => {
    const n = Number(num) || 0;
    const d = Number(denom) || 0;
    if (d === 0) return 0;
    return Math.round((n / d) * 100);
  };

  const inventoryCards = [
    {
      title: 'Protected APIs',
      icon: <Globe size={15} color="#10b981" />,
      protectedCount: safeCoverage.protected_apis,
      totalCount: safeCoverage.total_apis,
      pct: calcPct(safeCoverage.protected_apis, safeCoverage.total_apis),
    },
    {
      title: 'Protected AI Agents',
      icon: <Bot size={15} color="#10b981" />,
      protectedCount: safeCoverage.protected_agents,
      totalCount: safeCoverage.total_agents,
      pct: calcPct(safeCoverage.protected_agents, safeCoverage.total_agents),
    },
    {
      title: 'MCP Gateways',
      icon: <Cpu size={15} color="#10b981" />,
      protectedCount: safeCoverage.protected_mcp_servers,
      totalCount: safeCoverage.total_mcp_servers,
      pct: calcPct(safeCoverage.protected_mcp_servers, safeCoverage.total_mcp_servers),
    },
    {
      title: 'Kubernetes Workloads',
      icon: <Server size={15} color="#10b981" />,
      protectedCount: safeCoverage.protected_k8s_workloads,
      totalCount: safeCoverage.total_k8s_workloads,
      pct: calcPct(safeCoverage.protected_k8s_workloads, safeCoverage.total_k8s_workloads),
    },
  ];

  return (
    <ProtectWorkshell>
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <PieChart size={18} color="#10b981" />
              PROTECTION COVERAGE &amp; RUNTIME GAPS
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '4px 0 0 0' }}>
              Empirical runtime inventory coverage. Identifies unprotected surfaces, missing proxies, and unmonitored agent endpoints.
            </p>
          </div>

          <button
            onClick={loadCoverage}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              fontSize: '11px',
              fontWeight: 600,
              background: 'var(--color-surface-elevated)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-text-primary)',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
            Audit Coverage
          </button>
        </div>

        {/* Coverage Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
          {inventoryCards.map((card, i) => (
            <div
              key={i}
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {card.title}
                </span>
                {card.icon}
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontSize: '24px', fontWeight: 700, color: card.pct === 100 ? '#10b981' : card.pct >= 80 ? '#f59e0b' : '#ef4444' }}>
                  {card.protectedCount}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                  / {card.totalCount} ({card.pct}%)
                </span>
              </div>

              {/* Progress bar */}
              <div style={{ width: '100%', height: '4px', background: 'var(--color-border)', borderRadius: '2px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${card.pct}%`,
                    height: '100%',
                    background: card.pct === 100 ? '#10b981' : card.pct >= 80 ? '#f59e0b' : '#ef4444',
                    borderRadius: '2px',
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Unprotected Services Alert */}
        {safeUnprotected.length > 0 && (
          <div
            style={{
              padding: '14px 16px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <AlertTriangle size={16} color="#ef4444" />
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#ef4444' }}>
                {safeUnprotected.length} Unprotected Service Surfaces Detected
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {safeUnprotected.map((svc: any, idx: number) => (
                <span
                  key={idx}
                  style={{
                    padding: '3px 8px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '11px',
                    background: 'rgba(239, 68, 68, 0.15)',
                    color: '#ef4444',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    fontFamily: 'monospace',
                  }}
                >
                  {typeof svc === 'string' ? svc : svc.name || JSON.stringify(svc)}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Protection Gaps & Remediation Requirements */}
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>
            <AlertTriangle size={16} color="#f59e0b" />
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              ACTIVE PROTECTION GAPS &amp; REMEDIATION REQUIREMENTS
            </span>
          </div>

          {safeGaps.length === 0 ? (
            <div style={{ padding: '36px', textAlign: 'center', color: '#10b981', fontSize: '12px', fontWeight: 600 }}>
              ✓ ZERO RUNTIME GAPS FOUND ACROSS ENTIRE INVENTORY
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {safeGaps.map((gap: any, i: number) => (
                <div
                  key={i}
                  style={{
                    padding: '14px 16px',
                    background: 'var(--color-surface-elevated)',
                    border: '1px solid rgba(245, 158, 11, 0.25)',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, color: '#f59e0b', fontSize: '13px' }}>
                      {gap.gap_title || 'Unprotected Surface'} — <span style={{ color: 'var(--color-text-primary)' }}>{gap.resource_name || 'Resource'}</span>
                    </span>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '10px',
                        fontWeight: 700,
                        background: 'rgba(245, 158, 11, 0.15)',
                        color: '#f59e0b',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                      }}
                    >
                      {gap.current_state || 'UNPROTECTED'}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '12px', marginTop: '4px' }}>
                    <div>
                      <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block' }}>
                        Why It Matters:
                      </span>
                      <p style={{ margin: '2px 0 0 0', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                        {gap.why_it_matters}
                      </p>
                    </div>
                    <div>
                      <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block' }}>
                        Required Configuration:
                      </span>
                      <p style={{ margin: '2px 0 0 0', color: '#10b981', fontFamily: 'monospace', fontSize: '11px', lineHeight: 1.4 }}>
                        {gap.required_configuration}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ProtectWorkshell>
  );
}
