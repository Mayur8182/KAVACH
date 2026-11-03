'use client';

/**
 * /sales/demo-workspace — Page 25: Demo Workspace
 * Production implementation:
 * - Real isolated THING sandbox environment
 * - Zero hardcoded metrics: pulls dynamic security score, total findings, critical risks, and assets count
 *   directly from PostgreSQL / SQLite via /api/v1/sales/demo-workspace/session
 * - Real OPA policy simulation executor via /api/v1/sales/demo-workspace/run-simulation
 * - Cryptographic evidence proofs generated and logged in database
 * - Deep links to real platform submodules: /code, /cloud, /protect
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Layers,
  Terminal,
  Play,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Server,
  Code2,
  Cpu,
  Lock,
  ExternalLink,
  Flame,
  FileText,
} from 'lucide-react';
import { KavachHeader } from '@/components/navigation/SecuLayerHeader';
import { SalesSubNav } from '@/components/sales/SalesSubNav';
import { api } from '@/lib/api/client';

export default function DemoWorkspacePage() {
  const [session, setSession] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'findings' | 'cloud' | 'code' | 'reports'>('overview');

  // Simulation execution
  const [runningSim, setRunningSim] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState('agent_prompt_injection');
  const [simResult, setSimResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchSessionData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.sales.getDemoSession();
      setSession(data);
    } catch (err: any) {
      console.error('Failed to fetch demo workspace session', err);
      setError(err?.message || 'Failed to load isolated sandbox session.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessionData();
  }, []);

  const handleExecuteSimulation = async (scenarioId: string) => {
    setSelectedScenario(scenarioId);
    setRunningSim(true);
    setError(null);
    try {
      const res = await api.sales.runDemoSimulation({ scenario_id: scenarioId });
      setSimResult(res);
      // Refresh session counters from DB
      await fetchSessionData();
    } catch (err: any) {
      setError(err?.message || 'Simulation execution failed.');
    } finally {
      setRunningSim(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', color: '#0F172A', display: 'flex', flexDirection: 'column', fontFamily: "var(--font-sans, 'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif)" }}>
      <KavachHeader />
      <SalesSubNav currentModuleTitle="Interactive Demo Workspace" activeStepKey="demo" />

      <main style={{ flex: 1, maxWidth: '1240px', width: '100%', margin: '0 auto', padding: '36px 24px 80px', boxSizing: 'border-box' }}>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748B', marginBottom: '8px' }}>
            <Link href="/sales" style={{ color: '#2563EB', textDecoration: 'none', fontWeight: 600 }}>Sales</Link>
            <span>/</span>
            <span style={{ color: '#0F172A', fontWeight: 600 }}>Demo Workspace</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#2563EB', fontSize: '12px', fontWeight: 700, letterSpacing: '0.05em' }}>
                <Shield size={15} />
                <span>PAGE 25 &bull; LIVE ISOLATED SECURITY SANDBOX</span>
              </div>
              <h1 style={{ fontSize: '28px', fontWeight: 800, margin: '6px 0 0', letterSpacing: '-0.02em', color: '#0F172A' }}>
                Demo Workspace
              </h1>
              <p style={{ fontSize: '14px', color: '#64748B', margin: '4px 0 0' }}>
                Dedicated, interactive evaluation environment powered by real scanner telemetry and deterministic OPA decisions.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={fetchSessionData}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 16px',
                  borderRadius: '8px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#334155',
                  cursor: 'pointer',
                }}
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                <span>Refresh Live Telemetry</span>
              </button>
              <Link
                href="/sales/guided-demo"
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
                <span>Launch Guided Tour</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>

        {/* Tab Navigation (Page 25 Visual Match) */}
        <div style={{ display: 'flex', borderBottom: '1px solid #E2E8F0', marginBottom: '24px', gap: '8px' }}>
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'findings', label: 'Findings' },
            { id: 'cloud', label: 'Cloud' },
            { id: 'code', label: 'Code' },
            { id: 'reports', label: 'Reports' },
          ].map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  padding: '10px 18px',
                  fontSize: '13px',
                  fontWeight: active ? 700 : 500,
                  color: active ? '#2563EB' : '#64748B',
                  borderBottom: active ? '2px solid #2563EB' : '2px solid transparent',
                  background: 'none',
                  borderTop: 'none',
                  borderLeft: 'none',
                  borderRight: 'none',
                  cursor: 'pointer',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {error && (
          <div style={{ padding: '14px 18px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', color: '#991B1B', fontSize: '13px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Dynamic Metric Cards (Real Database Values) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
          {/* Security Score */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Security Score</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px' }}>
              <span style={{ fontSize: '34px', fontWeight: 800, color: (session?.security_score ?? 100) > 80 ? '#16A34A' : '#D97706' }}>
                {session ? session.security_score : '--'}
              </span>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#16A34A' }}>/ 100</span>
            </div>
            <div style={{ fontSize: '11px', color: '#64748B', marginTop: '6px' }}>Calculated dynamically from live database findings</div>
          </div>

          {/* Total Findings */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Findings</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px' }}>
              <span style={{ fontSize: '34px', fontWeight: 800, color: '#0F172A' }}>
                {session ? session.total_findings : '--'}
              </span>
            </div>
            <div style={{ fontSize: '11px', color: '#64748B', marginTop: '6px' }}>Across code, cloud, and agent toolchain</div>
          </div>

          {/* Critical Risks */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Critical Risks</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px' }}>
              <span style={{ fontSize: '34px', fontWeight: 800, color: '#DC2626' }}>
                {session ? session.critical_findings : '--'}
              </span>
            </div>
            <div style={{ fontSize: '11px', color: '#DC2626', marginTop: '6px', fontWeight: 600 }}>Requiring immediate blocking policy</div>
          </div>

          {/* Assets Monitored */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Assets Monitored</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px' }}>
              <span style={{ fontSize: '34px', fontWeight: 800, color: '#0F172A' }}>
                {session ? session.assets_count : '--'}
              </span>
            </div>
            <div style={{ fontSize: '11px', color: '#64748B', marginTop: '6px' }}>Repositories, cloud resources & agent workers</div>
          </div>
        </div>

        {/* Live Attack Scenario Simulator (Real OPA Policy Evaluation Engine) */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '28px', marginBottom: '28px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#DC2626', fontSize: '12px', fontWeight: 700 }}>
                <Flame size={16} />
                <span>INTERACTIVE LIVE SECURITY SIMULATION ENGINE</span>
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '4px 0 0', color: '#0F172A' }}>
                Trigger Real Threat Scenarios & Verify OPA Policy Gates
              </h3>
            </div>
            <span style={{ fontSize: '12px', color: '#64748B' }}>
              Policies Evaluated: <strong>{session?.policies_evaluated ?? 0}</strong>
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '20px' }}>
            {[
              { id: 'agent_prompt_injection', title: 'Agent Tool Exploit', desc: 'Block shell execution via MCP Gateway' },
              { id: 'vulnerable_terraform', title: 'Terraform S3 Leak', desc: 'Detect wildcard principal public ACL' },
              { id: 'hardcoded_secrets', title: 'Hardcoded Secret', desc: 'Block PR merge for leaked Stripe token' },
              { id: 'supply_chain_cve', title: 'Supply Chain CVE', desc: 'Quarantine backdoor xz-utils artifact' },
            ].map((sc) => {
              const active = selectedScenario === sc.id;
              return (
                <button
                  key={sc.id}
                  onClick={() => handleExecuteSimulation(sc.id)}
                  disabled={runningSim}
                  style={{
                    padding: '16px',
                    borderRadius: '10px',
                    textAlign: 'left',
                    backgroundColor: active ? '#EFF6FF' : '#F8FAFC',
                    border: active ? '2px solid #2563EB' : '1px solid #E2E8F0',
                    cursor: runningSim ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>{sc.title}</span>
                    <Play size={12} color={active ? '#2563EB' : '#94A3B8'} />
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B', lineHeight: 1.4 }}>{sc.desc}</div>
                </button>
              );
            })}
          </div>

          {/* Simulation Output Card */}
          {simResult && (
            <div style={{ backgroundColor: '#0B1120', color: '#F1F5F9', borderRadius: '12px', padding: '20px', fontFamily: 'monospace', fontSize: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1E293B', paddingBottom: '10px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Terminal size={14} color="#38BDF8" />
                  <span style={{ color: '#38BDF8', fontWeight: 700 }}>DETERMINISTIC EVALUATION RESULT: {simResult.evaluation_result?.decision}</span>
                </div>
                <span style={{ color: '#94A3B8', fontSize: '11px' }}>{simResult.timestamp}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', lineHeight: 1.6 }}>
                <div><span style={{ color: '#94A3B8' }}>Threat:</span> {simResult.evaluation_result?.title}</div>
                <div><span style={{ color: '#94A3B8' }}>Severity:</span> <span style={{ color: '#EF4444', fontWeight: 700 }}>{simResult.evaluation_result?.threat_level}</span></div>
                <div><span style={{ color: '#94A3B8' }}>Target:</span> {simResult.evaluation_result?.target}</div>
                <div><span style={{ color: '#94A3B8' }}>OPA Rule:</span> <span style={{ color: '#A855F7' }}>{simResult.evaluation_result?.policy_rule}</span></div>
                <div><span style={{ color: '#94A3B8' }}>Evidence Proof Hash:</span> <span style={{ color: '#10B981' }}>{simResult.evaluation_result?.evidence_hash}</span></div>
              </div>
            </div>
          )}
        </div>

        {/* Explore Key Features (Page 25 Visual Match) */}
        <div style={{ marginBottom: '28px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 12px', color: '#0F172A' }}>Explore Platform Features</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            {[
              { title: 'Cloud Security', href: '/cloud', icon: Server, desc: 'Multi-cloud CSPM & asset graphs' },
              { title: 'Code Security', href: '/code', icon: Code2, desc: 'SAST rules & automated fixes' },
              { title: 'Supply Chain', href: '/code/sbom', icon: Layers, desc: 'SBOM generation & transitive CVEs' },
              { title: 'Runtime Security', href: '/protect', icon: Cpu, desc: 'eBPF kernel protection & agent gates' },
            ].map((mod, mIdx) => {
              const Icon = mod.icon;
              return (
                <Link
                  key={mIdx}
                  href={mod.href}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                    padding: '20px',
                    textDecoration: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB' }}>
                      <Icon size={18} />
                    </div>
                    <ExternalLink size={14} color="#94A3B8" />
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>{mod.title}</div>
                  <div style={{ fontSize: '12px', color: '#64748B' }}>{mod.desc}</div>
                </Link>
              );
            })}
          </div>
        </div>

      </main>
    </div>
  );
}
