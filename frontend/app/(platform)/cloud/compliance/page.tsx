'use client';

/**
 * Thing Cloud — Compliance Workspace
 * Route: /cloud/compliance
 * Deterministic mapping to CIS Benchmarks, SOC 2 Type II, ISO 27001,
 * PCI-DSS 4.0, and HIPAA Security Rule blueprints.
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Award,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import type { CloudComplianceResponse, CloudComplianceFramework } from '@/types/api/cloud';
import { CloudWorkshell } from '@/components/cloud/CloudWorkshell';

export default function CloudCompliancePage() {
  const [data, setData] = useState<CloudComplianceResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCompliance = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.cloud.compliance();
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load cloud compliance frameworks.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCompliance();
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
                <Award size={14} color="#10b981" />
              </div>
              <h1 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-text-primary)', margin: 0 }}>
                Regulatory &amp; Security Compliance Blueprints
              </h1>
            </div>
            <p style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              Continuous evaluation against CIS Cloud Benchmarks, SOC 2 Type II, ISO 27001, and PCI-DSS 4.0.
            </p>
          </div>
          <button
            onClick={fetchCompliance}
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
            <RefreshCw size={12} /> Re-evaluate Blueprints
          </button>
        </div>

        {/* Global Compliance Summary Metrics */}
        {data && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '20px' }}>
            <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px' }}>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: '600' }}>TOTAL REQUIREMENTS</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--color-text-primary)', marginTop: '4px' }}>
                {data.total_requirements}
              </div>
            </div>
            <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px' }}>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: '600' }}>SATISFIED CONTROLS</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981', marginTop: '4px' }}>
                {data.satisfied_count}
              </div>
            </div>
            <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px' }}>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: '600' }}>VIOLATED CONTROLS</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: data.violated_count > 0 ? '#ef4444' : 'var(--color-text-primary)', marginTop: '4px' }}>
                {data.violated_count}
              </div>
            </div>
          </div>
        )}

        {error && (
          <div style={{ padding: '12px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontSize: '12px', marginBottom: '20px' }}>
            {error}
          </div>
        )}

        {isLoading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>
            <RefreshCw size={15} className="animate-spin" style={{ marginRight: '6px' }} />
            Evaluating controls against CIS, SOC 2, and PCI-DSS blueprints...
          </div>
        ) : !data ? null : (
          <div>
            {/* Frameworks Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              {data.frameworks.map((fw: CloudComplianceFramework) => {
                const pct = fw.total_controls > 0 ? Math.round((fw.satisfied_controls / fw.total_controls) * 100) : 0;
                return (
                  <div
                    key={fw.framework_id}
                    style={{
                      background: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '8px',
                      padding: '18px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div>
                        <h3 style={{ fontSize: '13px', fontWeight: 'bold', margin: 0, color: 'var(--color-text-primary)' }}>
                          {fw.framework_name}
                        </h3>
                        <div style={{ fontSize: '10.5px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                          Version {fw.version}
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: '13px',
                          fontWeight: 'bold',
                          color: pct >= 80 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444',
                        }}
                      >
                        {pct}%
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div style={{ height: '6px', width: '100%', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden', marginBottom: '12px', marginTop: '10px' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${pct}%`,
                          background: pct >= 80 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444',
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                      <span>
                        Satisfied: <strong style={{ color: '#10b981' }}>{fw.satisfied_controls}</strong>
                      </span>
                      <span>
                        Violated: <strong style={{ color: '#ef4444' }}>{fw.violated_controls}</strong>
                      </span>
                      <span>
                        Total: <strong>{fw.total_controls}</strong>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Individual Frameworks Details Table */}
            <div
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                overflow: 'hidden',
              }}
            >
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--color-border)' }}>
                <h3 style={{ fontSize: '13px', fontWeight: 'bold', margin: 0, color: 'var(--color-text-primary)' }}>
                  Continuous Compliance Frameworks &amp; Control Blueprints
                </h3>
              </div>

              {data.frameworks.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '12px' }}>
                  No compliance frameworks found. Connect cloud accounts to evaluate compliance posture.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'rgba(255,255,255,0.02)' }}>
                      <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)', fontSize: '11px' }}>FRAMEWORK ID</th>
                      <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)', fontSize: '11px' }}>FRAMEWORK NAME</th>
                      <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)', fontSize: '11px' }}>VERSION</th>
                      <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)', fontSize: '11px' }}>PASSING / VIOLATING</th>
                      <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)', fontSize: '11px' }}>STATUS</th>
                      <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)', fontSize: '11px' }}>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.frameworks.map((fw: CloudComplianceFramework) => (
                      <tr key={fw.framework_id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
                          {fw.framework_id}
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--color-text-primary)', fontWeight: '600' }}>
                          {fw.framework_name}
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--color-text-secondary)', fontSize: '11px' }}>
                          {fw.version}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '11.5px' }}>
                          <span style={{ color: '#10b981', fontWeight: '600' }}>{fw.satisfied_controls} passed</span>
                          {' / '}
                          <span style={{ color: fw.violated_controls > 0 ? '#ef4444' : 'var(--color-text-muted)', fontWeight: '600' }}>{fw.violated_controls} violated</span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {fw.violated_controls === 0 ? (
                            <span style={{ color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '11px', fontWeight: '600' }}>
                              <CheckCircle2 size={12} /> Compliant
                            </span>
                          ) : (
                            <span style={{ color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '11px', fontWeight: '600' }}>
                              <XCircle size={12} /> Non-Compliant
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <Link
                            href={`/cloud/evidence?framework_id=${encodeURIComponent(fw.framework_id)}`}
                            style={{ fontSize: '11px', color: 'var(--color-primary-text)', textDecoration: 'none', fontWeight: '600' }}
                          >
                            Audit Evidence →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </CloudWorkshell>
  );
}
