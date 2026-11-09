'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  GitBranch,
  ShieldAlert,
  ArrowRight,
  AlertTriangle,
  Play,
  CheckCircle2,
  Lock,
  Layers,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { KavachApiLayout } from '../components/KavachApiLayout';
import { useApiSecurity } from '../context/ApiSecurityContext';
import { api } from '@/lib/api/client';

export default function AttackPathsPage() {
  const { apis, selectedApi } = useApiSecurity();
  const [paths, setPaths] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    api.apiSecurity
      .attackPaths(selectedApi?.id)
      .then((res) => {
        if (!mounted) return;
        setPaths(res.items || []);
      })
      .catch((err) => {
        console.error('Failed to load attack paths:', err);
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [selectedApi?.id]);

  // Deduplicate attack paths by title and api_id so identical chains are grouped
  const dedupedPaths = React.useMemo(() => {
    const seen = new Set<string>();
    return paths.filter((p) => {
      const key = `${p.api_id || ''}-${(p.title || '').trim().toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [paths]);

  return (
    <KavachApiLayout activeApiId={selectedApi?.id}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Title */}
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
            Attack Paths
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
            AI identifies and visualizes potential attack paths by correlating findings.
          </p>
        </div>

        {/* Two Column Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px' }}>
          {/* Left: Attack Path Visualizer or Empty State */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {isLoading ? (
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '10px',
                  padding: '80px 24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64748B',
                }}
              >
                <Loader2 size={24} className="animate-spin" />
                <span style={{ marginLeft: '10px', fontSize: '14px' }}>Correlating attack graphs...</span>
              </div>
            ) : dedupedPaths.length === 0 ? (
              <div
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: '10px',
                      padding: '80px 24px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textAlign: 'center',
                    }}
                  >
                    <div
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '10px',
                        backgroundColor: '#F1F5F9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#64748B',
                        marginBottom: '16px',
                      }}
                    >
                      <GitBranch size={24} />
                    </div>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0F172A', margin: 0 }}>
                      No correlated attack paths identified
                    </h3>
                    <p style={{ fontSize: '13px', color: '#64748B', margin: '6px 0 20px 0', maxWidth: '380px' }}>
                      Deterministic graph correlation found no multi-step exploit chains across the current API findings.
                    </p>
                    <Link
                      href="/api-security/analysis"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        backgroundColor: '#2563EB',
                        color: '#FFFFFF',
                        borderRadius: '6px',
                        padding: '8px 18px',
                        fontSize: '13px',
                        fontWeight: 600,
                        textDecoration: 'none',
                      }}
                    >
                      <Play size={13} fill="#FFFFFF" />
                      <span>Run Security Analysis</span>
                    </Link>
                  </div>
            ) : (
              dedupedPaths.map((p) => {
                const chainId = `AP-${p.id ? p.id.slice(0, 8).toUpperCase() : 'CHAIN-1'}`;
                const rawSteps = Array.isArray(p.steps) ? p.steps : [];
                return (
                  <div
                    key={p.id}
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: '10px',
                      padding: '24px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                    }}
                  >
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 700,
                            fontFamily: 'monospace',
                            backgroundColor: '#F1F5F9',
                            color: '#334155',
                            border: '1px solid #CBD5E1',
                          }}
                        >
                          {chainId}
                        </span>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 700,
                            backgroundColor: p.severity === 'CRITICAL' ? '#FEF2F2' : '#FFFBEB',
                            color: p.severity === 'CRITICAL' ? '#DC2626' : '#D97706',
                            border: `1px solid ${p.severity === 'CRITICAL' ? '#FECACA' : '#FDE68A'}`,
                          }}
                        >
                          {p.severity || 'CRITICAL'}
                        </span>
                        {p.likelihood && (
                          <span
                            style={{
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 600,
                              backgroundColor: '#F8FAFC',
                              color: '#64748B',
                            }}
                          >
                            Likelihood: {p.likelihood}
                          </span>
                        )}
                      </div>

                      <Link
                        href={`/api-security/findings?search=${encodeURIComponent(p.title || '')}`}
                        style={{
                          fontSize: '12px',
                          color: '#2563EB',
                          fontWeight: 600,
                          textDecoration: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <span>Inspect Linked Findings</span>
                      </Link>
                    </div>

                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: '0 0 6px 0' }}>
                        {p.title}
                      </h3>
                      <p style={{ fontSize: '13px', color: '#475569', margin: 0, lineHeight: 1.5 }}>
                        {p.description}
                      </p>
                    </div>

                    {/* Impact Statement */}
                    {p.impact && (
                      <div
                        style={{
                          padding: '10px 14px',
                          borderRadius: '6px',
                          backgroundColor: '#FFFBEB',
                          border: '1px solid #FDE68A',
                          fontSize: '12px',
                          color: '#92400E',
                        }}
                      >
                        <strong style={{ fontWeight: 700 }}>Operational Impact: </strong>
                        <span>{p.impact}</span>
                      </div>
                    )}

                    {/* Visual Multi-step Nodes Chain */}
                    {rawSteps.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                          Exploit Chain Steps (Click any step to inspect finding)
                        </span>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '16px',
                            backgroundColor: '#F8FAFC',
                            borderRadius: '8px',
                            border: '1px solid #E2E8F0',
                            overflowX: 'auto',
                          }}
                        >
                          {rawSteps.map((step: any, sIdx: number, arr: any[]) => {
                            const stepTitle = typeof step === 'string' ? step : step.title || `Step ${sIdx + 1}`;
                            const stepDetail = typeof step === 'object' ? step.detail || step.endpoint : '';
                            const stepFindingId = typeof step === 'object' ? step.finding_id : null;
                            const targetHref = stepFindingId
                              ? `/api-security/findings/${stepFindingId}`
                              : `/api-security/findings?search=${encodeURIComponent(stepTitle)}`;

                            return (
                              <React.Fragment key={sIdx}>
                                <Link
                                  href={targetHref}
                                  style={{
                                    padding: '10px 14px',
                                    backgroundColor: '#FFFFFF',
                                    borderRadius: '6px',
                                    border: '1px solid #CBD5E1',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '4px',
                                    minWidth: '160px',
                                    textDecoration: 'none',
                                    transition: 'border-color 0.15s, box-shadow 0.15s',
                                  }}
                                  title="Click to inspect underlying security finding"
                                >
                                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#2563EB', textTransform: 'uppercase' }}>
                                    Step {sIdx + 1}
                                  </span>
                                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A' }}>
                                    {stepTitle}
                                  </span>
                                  {stepDetail && (
                                    <span style={{ fontSize: '11px', color: '#64748B', fontFamily: 'monospace' }}>
                                      {stepDetail}
                                    </span>
                                  )}
                                </Link>
                                {sIdx < arr.length - 1 && <ArrowRight size={16} color="#94A3B8" style={{ flexShrink: 0 }} />}
                              </React.Fragment>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Right Panel: How it works */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '10px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              height: 'fit-content',
            }}
          >
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
              How it works
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {[
                { title: 'Correlates related findings', desc: 'Identifies multiple low/medium findings that chain into high-severity breaches.' },
                { title: 'Identifies possible attack chains', desc: 'Maps attackers progression from unauthenticated entry to sensitive backend data.' },
                { title: 'Shows the attack flow and impact', desc: 'Demonstrates exact operational consequences on customer privacy and data integrity.' },
                { title: 'Helps prioritize critical paths', desc: 'Allows engineering teams to sever attack vectors at the most effective choke point.' },
              ].map((item, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: '#EFF6FF',
                      color: '#2563EB',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginTop: '2px',
                    }}
                  >
                    <CheckCircle2 size={13} />
                  </div>
                  <div>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', display: 'block' }}>
                      {item.title}
                    </span>
                    <span style={{ fontSize: '12px', color: '#64748B', lineHeight: 1.4 }}>
                      {item.desc}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </KavachApiLayout>
  );
}
