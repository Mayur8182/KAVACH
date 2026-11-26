'use client';

/**
 * KavachFeatureDiagrams — Two-Column Halftone & Atmospheric Showcase Cards
 * Combines Fuse AI's macOS card presentation with Kita AI's high-contrast dark dot matrix
 * and scroll-linked depth, tailored to Kavach's palette & live backend telemetry.
 */

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  GitPullRequest,
  ArrowRight,
  Check,
  Ban,
  RefreshCw,
} from 'lucide-react';
import { ScrollRevealText } from '@/components/landing/ScrollRevealText';

interface ScannerHealthItem {
  scanner_name: string;
  scanner_type: string;
  tool_name: string;
  status: string;
  is_available: boolean;
}

interface SandboxResponse {
  status: string;
  tool_name: string;
  execution_time_ms: number;
  audit_trace_id: string;
  pipeline_stages: Array<{
    stage: string;
    status: string;
    principal?: string;
    cryptographic_proof?: string;
    required_permission?: string;
    granted_scope?: string;
    decision?: string;
    reason?: string;
  }>;
}

function initials(label: string): string {
  const parts = label.trim().split(/[\s-]+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return label.slice(0, 2).toUpperCase();
}

export const KavachFeatureDiagrams: React.FC = () => {
  const [scanners, setScanners] = useState<ScannerHealthItem[]>([]);
  const [scannerLoadState, setScannerLoadState] = useState<'loading' | 'live' | 'offline'>('loading');

  const [gateMode, setGateMode] = useState<'safe' | 'blocked'>('safe');
  const [gateData, setGateData] = useState<SandboxResponse | null>(null);
  const [gateBusy, setGateBusy] = useState(false);

  const loadScanners = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/scans/tools/health', { cache: 'no-store' });
      if (!res.ok) {
        setScannerLoadState('offline');
        return;
      }
      const rows = (await res.json()) as ScannerHealthItem[];
      setScanners(rows);
      setScannerLoadState('live');
    } catch {
      setScannerLoadState('offline');
    }
  }, []);

  const triggerGateCheck = useCallback(async (mode: 'safe' | 'blocked') => {
    setGateMode(mode);
    setGateBusy(true);
    const payload =
      mode === 'safe'
        ? {
            tool_name: 'run_security_scan',
            client_name: 'cursor',
            agent_type: 'security-auditor',
            arguments: { project_id: 'kavach-probe' },
          }
        : {
            tool_name: 'quarantine_compromised_target',
            client_name: 'cursor',
            agent_type: 'autonomous-agent',
            arguments: { target_id: 'prod-db-01', force_bypass_approval: true },
          };

    try {
      const res = await fetch('/api/v1/mcp/sandbox-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const json = (await res.json()) as SandboxResponse;
        setGateData(json);
      }
    } catch {
      // Handled gracefully by UI fallback
    } finally {
      setGateBusy(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadScanners();
      void triggerGateCheck('safe');
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadScanners, triggerGateCheck]);

  const healthyCount = scanners.filter((s) => s.is_available).length;
  const visibleScanners = scanners.slice(0, 4);

  const isBlocked = gateData?.status === 'BLOCKED';
  const opaStage = gateData?.pipeline_stages.find((s) => s.stage === 'DETERMINISTIC_POLICY_ENGINE');
  const idStage = gateData?.pipeline_stages.find((s) => s.stage === 'IDENTITY_VERIFICATION');
  const abacStage = gateData?.pipeline_stages.find((s) => s.stage === 'AUTHORIZATION_CHECK');

  return (
    <section id="capabilities" className="max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10 py-14 sm:py-22 space-y-20 sm:space-y-28">
      {/* ======================================================= */}
      {/* BLOCK 1: REAL SCANNERS INSIDE SINGLE FROSTED GLASS      */}
      {/* ======================================================= */}
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.99 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, amount: 0.18 }}
        transition={{ duration: 0.52, ease: [0.22, 1, 0.36, 1] }}
        className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center"
      >
        <div className="lg:col-span-5 text-left">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-slate-200/90 bg-white text-slate-900 shadow-sm mb-6">
            <ShieldCheck size={18} />
          </div>

          <ScrollRevealText
            as="h2"
            segments={[
              { text: 'Real Security', className: 'text-[#0F172A]' },
              { text: 'Scanners', className: 'text-slate-600' },
            ]}
            className="text-[28px] sm:text-[34px] font-extrabold tracking-[-0.03em] leading-[1.15] mb-3.5"
          />
          <p className="text-[16px] text-slate-600 leading-[1.6] max-w-[440px] mb-7">
            Run Semgrep, Gitleaks, Trivy, OSV, and Checkov across every push. Real engines check your code, secrets, containers, and cloud configs automatically.
          </p>

          <Link
            href="/code/sast"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white hover:bg-[#EA580C] hover:text-white hover:border-[#EA580C] hover:shadow-[0_8px_20px_-6px_rgba(234,88,12,0.42)] px-5 py-2.5 text-[14px] font-semibold text-slate-900 shadow-sm transition-all duration-200"
          >
            <span>Explore Scanners</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {/* Single Frosted Glass Card Over Real Obsidian Dusk Backdrop */}
        <div className="lg:col-span-7 relative">
          <div
            className="relative w-full rounded-[22px] overflow-hidden border border-slate-900/15 p-5 sm:p-8 shadow-[0_26px_64px_-22px_rgba(15,23,42,0.28)]"
            style={{ backgroundColor: '#0D131D' }}
          >
            <img
              src="/images/scanners-backdrop.webp"
              alt="Atmospheric charcoal mountains with warm horizon twilight backdrop"
              width={960}
              height={536}
              loading="lazy"
              decoding="async"
              className="pointer-events-none absolute inset-0 w-full h-full object-cover select-none"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'linear-gradient(180deg, rgba(13, 19, 29, 0.14) 0%, rgba(13, 19, 29, 0.34) 100%)',
              }}
            />

            {/* Single Dark Frosted Glass Panel */}
            <motion.div
              whileHover={{ y: -2 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              className="relative z-10 w-full rounded-[16px] border border-white/25 bg-slate-950/55 backdrop-blur-xl p-5 sm:p-6 shadow-[0_22px_52px_-12px_rgba(0,0,0,0.45)]"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-[19px] sm:text-[21px] font-bold tracking-[-0.02em] text-white mb-1.5">
                    Scanners — Active Workspace
                  </h3>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/10 px-2.5 py-1 text-[11.5px] font-medium text-slate-200">
                      Code · Secrets · Cloud
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/30 bg-emerald-500/15 px-2.5 py-1 text-[11.5px] font-semibold text-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      {scannerLoadState === 'live'
                        ? `${healthyCount}/${scanners.length} operational`
                        : scannerLoadState === 'offline'
                        ? 'Not connected'
                        : 'Checking binaries...'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => void loadScanners()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white text-slate-900 hover:bg-[#EA580C] hover:text-white px-3.5 py-2 text-[12px] font-semibold cursor-pointer transition-colors shadow-sm"
                >
                  <RefreshCw size={12} />
                  <span>Check Engines</span>
                </button>
              </div>

              <div className="space-y-2">
                {scannerLoadState === 'offline' ? (
                  <div className="rounded-xl bg-white/95 px-4 py-4 text-[13px] text-slate-600">
                    Backend API unreachable — start FastAPI on port 8000 to verify scanner binaries.
                  </div>
                ) : visibleScanners.length === 0 ? (
                  <div className="rounded-xl bg-white/95 px-4 py-4 text-[13px] text-slate-600">
                    Probing registered CLI scanner binaries...
                  </div>
                ) : (
                  visibleScanners.map((sc, idx) => (
                    <motion.div
                      key={sc.scanner_name}
                      initial={{ opacity: 0, y: 8 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.1 }}
                      transition={{ duration: 0.36, delay: idx * 0.06, ease: [0.22, 1, 0.36, 1] }}
                      className="flex items-center justify-between gap-3 rounded-xl border border-white/60 bg-white/95 hover:border-[#EA580C]/60 px-3.5 py-2.5 shadow-sm transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-[#FAF9F6] border border-slate-200 flex items-center justify-center text-[11px] font-bold text-slate-800 shrink-0">
                          {initials(sc.tool_name)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[13.5px] font-semibold text-slate-900 truncate">
                            {sc.tool_name}
                          </div>
                          <div className="text-[11.5px] text-slate-600 truncate">
                            {sc.scanner_type} · {sc.scanner_name}
                          </div>
                        </div>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold shrink-0 ${
                          sc.is_available
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                            : 'bg-amber-50 text-amber-800 border border-amber-200/80'
                        }`}
                      >
                        <Check size={11} />
                        <span>{sc.is_available ? 'Verified' : sc.status}</span>
                      </span>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* ======================================================= */}
      {/* BLOCK 2: POLICY GATE OVER SINGLE FROSTED SCENIC CANVAS  */}
      {/* ======================================================= */}
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.99 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, amount: 0.18 }}
        transition={{ duration: 0.52, ease: [0.22, 1, 0.36, 1] }}
        className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center"
      >
        <div className="lg:col-span-5 text-left">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-slate-200/90 bg-white text-slate-900 shadow-sm mb-6">
            <GitPullRequest size={18} />
          </div>

          <ScrollRevealText
            as="h2"
            segments={[
              { text: 'Safe AI Fix &', className: 'text-[#0F172A]' },
              { text: 'Policy Gate', className: 'text-slate-600' },
            ]}
            className="text-[28px] sm:text-[34px] font-extrabold tracking-[-0.03em] leading-[1.15] mb-3.5"
          />
          <p className="text-[16px] text-slate-600 leading-[1.6] max-w-[440px] mb-7">
            AI proposes a focused patch, hard security rules approve or block every action, and real scanners test the fix before opening a PR.
          </p>

          <Link
            href="/remediation"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white hover:bg-[#EA580C] hover:text-white hover:border-[#EA580C] hover:shadow-[0_8px_20px_-6px_rgba(234,88,12,0.42)] px-5 py-2.5 text-[14px] font-semibold text-slate-900 shadow-sm transition-all duration-200"
          >
            <span>View Auto-Fix</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {/* Single Frosted Glass Card Over Real Scenic Ocean Backdrop */}
        <div className="lg:col-span-7 relative pb-6">
          <div
            className="relative w-full rounded-[22px] overflow-hidden border border-black/10 px-5 pt-6 pb-8 sm:px-8 sm:pt-7 sm:pb-10 shadow-[0_24px_56px_-22px_rgba(15,23,42,0.22)]"
            style={{ backgroundColor: '#1E293B' }}
          >
            <img
              src="/images/pipeline-backdrop.webp"
              alt="Serene misty water horizon architectural diagram backdrop"
              width={960}
              height={536}
              loading="lazy"
              decoding="async"
              className="pointer-events-none absolute inset-0 w-full h-full object-cover select-none scale-105"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'linear-gradient(180deg, rgba(15, 23, 42, 0.10) 0%, rgba(15, 23, 42, 0.22) 100%)',
              }}
            />

            {/* Single Light Frosted Glass Card */}
            <motion.div
              whileHover={{ y: -2 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              className="relative z-10 w-full rounded-[16px] border border-white/75 bg-white/72 backdrop-blur-xl p-5 sm:p-6 shadow-[0_20px_50px_-14px_rgba(15,23,42,0.28)]"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h3 className="text-[19px] sm:text-[21px] font-bold tracking-[-0.02em] text-slate-900">
                  Policy Gate — {gateMode === 'safe' ? 'Scan Request' : 'Bypass Attempt'}
                </h3>

                <button
                  type="button"
                  disabled={gateBusy}
                  onClick={() => void triggerGateCheck(gateMode)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#09090B] hover:bg-[#EA580C] text-white px-3.5 py-2 text-[11.5px] font-semibold cursor-pointer transition-colors disabled:opacity-50 shadow-sm"
                >
                  <ArrowRight size={11} />
                  <span>{gateBusy ? 'Checking...' : 'Run Gate Check'}</span>
                </button>
              </div>

              <div className="rounded-xl border border-black/[0.06] bg-white/95 p-4 shadow-sm">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[12px] font-mono text-slate-800">
                    {gateData?.tool_name ?? (gateMode === 'safe' ? 'run_security_scan' : 'quarantine_compromised_target')}
                  </span>
                  <span className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1 text-[12px] font-semibold text-slate-800">
                    OPA Rego Check
                  </span>
                  {gateData && (
                    <span className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[12px] font-mono text-slate-700">
                      {gateData.execution_time_ms}ms
                    </span>
                  )}
                </div>

                <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden mb-3">
                  <motion.div
                    initial={{ width: '15%' }}
                    animate={{ width: gateBusy ? '45%' : '100%' }}
                    transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                    className={`h-full rounded-full ${
                      isBlocked ? 'bg-red-500' : 'bg-emerald-500'
                    }`}
                  />
                </div>

                <p className="text-[13.5px] text-slate-600 leading-relaxed mb-3.5">
                  {opaStage?.reason ??
                    'Evaluating agent identity, ABAC scope, and deterministic OPA Rego guardrails...'}
                </p>

                <div className="pt-3 border-t border-slate-100">
                  <p className="text-[11px] font-medium text-slate-600 mb-2">
                    Verified live by Kavach gate
                  </p>
                  <motion.div
                    key={`${gateMode}-${gateData?.audit_trace_id ?? 'init'}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                    className="flex flex-wrap items-center gap-2"
                  >
                    <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-[#FAF9F6] px-2.5 py-1 text-[11.5px] font-mono text-slate-700">
                      <Check size={11} className="text-emerald-600" />
                      {idStage?.cryptographic_proof ? idStage.cryptographic_proof.slice(0, 18) : 'Ed25519 Signed'}
                    </span>

                    <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-[#FAF9F6] px-2.5 py-1 text-[11.5px] font-mono text-slate-700">
                      <Check size={11} className="text-emerald-600" />
                      {abacStage?.granted_scope ?? 'ABAC Scope'}
                    </span>

                    <span
                      className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-semibold ${
                        isBlocked
                          ? 'border-red-200 bg-red-50 text-red-700'
                          : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      {isBlocked ? <Ban size={11} /> : <Check size={11} />}
                      <span>{isBlocked ? 'BLOCKED · POL-MCP-09' : 'ALLOW · Policy Passed'}</span>
                    </span>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </div>

          <div className="relative z-20 -mt-5 ml-4 inline-flex items-center gap-1 rounded-xl border border-white/80 bg-white/90 backdrop-blur-xl p-1.5 shadow-[0_10px_28px_-6px_rgba(15,23,42,0.18)]">
            <button
              type="button"
              onClick={() => void triggerGateCheck('safe')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-colors cursor-pointer ${
                gateMode === 'safe'
                  ? 'bg-[#09090B] text-white hover:bg-[#EA580C]'
                  : 'text-slate-600 hover:bg-[#EA580C] hover:text-white'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${gateMode === 'safe' ? 'bg-emerald-400' : 'bg-slate-300'}`} />
              <span>Safe Scan</span>
            </button>
            <button
              type="button"
              onClick={() => void triggerGateCheck('blocked')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-colors cursor-pointer ${
                gateMode === 'blocked'
                  ? 'bg-[#09090B] text-white hover:bg-[#EA580C]'
                  : 'text-slate-600 hover:bg-[#EA580C] hover:text-white'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${gateMode === 'blocked' ? 'bg-red-400' : 'bg-slate-300'}`} />
              <span>Blocked Action</span>
            </button>
          </div>
        </div>
      </motion.div>
    </section>
  );
};
