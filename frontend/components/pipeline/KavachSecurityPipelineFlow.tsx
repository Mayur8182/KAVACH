'use client';

/**
 * KavachSecurityPipelineFlow — Restored 12-Node Multi-Branch Architecture SVG Pipeline
 * Features:
 * - Real atmospheric architectural travertine backdrop (/images/pipeline-stage-bg.jpg)
 * - 12 interactive nodes & 6 parallel scanner branches with smooth synchronized packet dots
 * - Real operational health badges from /api/v1/health and /api/v1/scans/tools/health
 * - Clean focused layout with bottom inspector drawer removed as requested
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  FolderGit2,
  Layers,
  Code2,
  KeyRound,
  FileCode2,
  Globe,
  Boxes,
  Package,
  Sparkles,
  ShieldCheck,
  Wrench,
  GitPullRequest,
  Play,
  Pause,
  CheckCircle2,
  ShieldAlert,
  Database,
} from 'lucide-react';

interface PipelineFlowProps {
  interactive?: boolean;
  onNodeClick?: (nodeId: string) => void;
  theme?: 'light' | 'dark';
}

interface ScannerHealthItem {
  scanner_name: string;
  is_available: boolean;
}

interface HealthResponse {
  dependencies?: {
    postgresql?: {
      status?: string;
      latency_ms?: number;
    };
  };
}

const STEPS = [
  { id: 'init', label: 'Initialize', nodeId: 'repo' },
  { id: 'ingest', label: 'Ingest', nodeId: 'ingestion' },
  { id: 'scan', label: 'Scan', nodeId: 'sast' },
  { id: 'investigate', label: 'AI Draft', nodeId: 'investigation' },
  { id: 'policy', label: 'Safety Gate', nodeId: 'policy' },
  { id: 'remediate', label: 'Re-Test', nodeId: 'remediation' },
  { id: 'pr', label: 'Clean PR', nodeId: 'pr' },
];

export function KavachSecurityPipelineFlow({
  interactive = true,
  onNodeClick,
}: PipelineFlowProps) {
  const [activeStepIndex, setActiveStepIndex] = useState<number>(2);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string>('sast');
  const [userLockedNode, setUserLockedNode] = useState<boolean>(false);

  const [probeState, setProbeState] = useState<'loading' | 'live' | 'offline'>('loading');
  const [dbHealth, setDbHealth] = useState<{ status: string; latencyMs?: number } | null>(null);
  const [scanners, setScanners] = useState<ScannerHealthItem[]>([]);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setInterval(() => {
      setActiveStepIndex((prev) => {
        const next = (prev + 1) % STEPS.length;
        if (!userLockedNode) {
          setSelectedNodeId(STEPS[next].nodeId);
        }
        return next;
      });
    }, 2200);
    return () => window.clearInterval(timer);
  }, [isPlaying, userLockedNode]);

  const fetchRealTelemetry = useCallback(async () => {
    try {
      const [hRes, sRes] = await Promise.all([
        fetch('/api/v1/health', { cache: 'no-store' }),
        fetch('/api/v1/scans/tools/health', { cache: 'no-store' }),
      ]);

      let okAny = false;
      if (hRes.ok) {
        okAny = true;
        const h = (await hRes.json()) as HealthResponse;
        const pg = h.dependencies?.postgresql;
        setDbHealth({ status: pg?.status ?? 'unknown', latencyMs: pg?.latency_ms });
      }
      if (sRes.ok) {
        okAny = true;
        setScanners((await sRes.json()) as ScannerHealthItem[]);
      }

      setProbeState(okAny ? 'live' : 'offline');
    } catch {
      setProbeState('offline');
    }
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => void fetchRealTelemetry(), 0);
    return () => window.clearTimeout(t);
  }, [fetchRealTelemetry]);

  const handleSelectNode = (nodeId: string, linkedStepIndex?: number) => {
    setSelectedNodeId(nodeId);
    setUserLockedNode(true);
    setIsPlaying(false);
    if (typeof linkedStepIndex === 'number') {
      setActiveStepIndex(linkedStepIndex);
    }
    onNodeClick?.(nodeId);
  };

  const statusLabel =
    activeStepIndex === 0
      ? 'Initialize'
      : activeStepIndex === 1
      ? 'Ingest'
      : activeStepIndex === 2
      ? 'Scanning'
      : activeStepIndex === 3
      ? 'AI Draft'
      : activeStepIndex === 4
      ? 'Safety Gate'
      : activeStepIndex === 5
      ? 'Re-Testing'
      : 'Clean PR';

  const statusColor = activeStepIndex === 6 ? '#15803D' : '#0F172A';

  const AGENTS = [
    { id: 'sast', label: 'SAST', icon: Code2, y: 70, scannerKey: 'semgrep' },
    { id: 'secrets', label: 'Secrets', icon: KeyRound, y: 126, scannerKey: 'gitleaks' },
    { id: 'iac', label: 'IaC', icon: FileCode2, y: 182, scannerKey: 'checkov' },
    { id: 'api', label: 'API', icon: Globe, y: 238, scannerKey: 'seculayer-builtin' },
    { id: 'container', label: 'Container', icon: Boxes, y: 294, scannerKey: 'trivy' },
    { id: 'supply', label: 'Supply Chain', icon: Package, y: 350, scannerKey: 'osv-scanner' },
  ];

  const getScannerInfo = (key?: string) =>
    key ? scanners.find((s) => s.scanner_name.toLowerCase() === key.toLowerCase()) : undefined;

  const healthyCount = scanners.filter((s) => s.is_available).length;
  const lineInactive = '#CBD5E1';
  const lineActive = '#0F172A';
  const nodeBorderIdle = '#E2E8F0';

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.52, ease: [0.22, 1, 0.36, 1] }}
      className="relative w-full rounded-[22px] overflow-hidden border border-black/[0.08] p-4 sm:p-8 shadow-[0_24px_60px_-24px_rgba(15,23,42,0.16)] text-left"
      style={{ backgroundColor: '#EAE4D8' }}
    >
      {/* Real Architectural Sunlight Backdrop */}
      <img
        src="/images/pipeline-stage-bg.webp"
        alt="Warm architectural morning sunlight surface backdrop"
        width={960}
        height={536}
        loading="lazy"
        decoding="async"
        className="pointer-events-none absolute inset-0 w-full h-full object-cover select-none"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-black/[0.04]"
      />

      {/* Single Frosted Glassmorphism Container Over Scenic Sunlight Backdrop */}
      <div className="relative z-10 rounded-[16px] border border-white/80 bg-white/76 backdrop-blur-xl p-5 sm:p-7 shadow-[0_18px_46px_-14px_rgba(15,23,42,0.16)]">
        {/* Clean Minimal Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-[20px] font-bold tracking-[-0.02em] text-slate-900 m-0">
              Kavach Security Pipeline
            </h3>

            {probeState === 'live' ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50/90 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                {scanners.length > 0 ? `${healthyCount}/${scanners.length} Scanners Live` : 'Online'}
              </span>
            ) : probeState === 'offline' ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50/90 border border-amber-200 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
                Not connected
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/85 border border-slate-200 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
                Connecting...
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {dbHealth && (
              <span className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-white/90 px-2.5 py-1 text-[11px] font-mono text-slate-700">
                <Database size={11} className="text-slate-600" />
                PG {dbHealth.latencyMs?.toFixed(0) ?? 'ok'}ms
              </span>
            )}

            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11.5px] font-semibold border bg-white/90"
              style={{
                color: statusColor,
                borderColor: `${statusColor}30`,
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusColor }} />
              {statusLabel}
            </span>

            {interactive && (
              <button
                type="button"
                onClick={() => {
                  if (!isPlaying) {
                    setUserLockedNode(false);
                  }
                  setIsPlaying(!isPlaying);
                }}
                aria-label={isPlaying ? 'Pause pipeline animation' : 'Play pipeline animation'}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200/90 bg-white/95 hover:bg-[#EA580C] hover:text-white hover:border-[#EA580C] text-slate-700 px-2.5 py-1 text-[11.5px] font-semibold cursor-pointer transition-all"
              >
                {isPlaying ? <Pause size={12} /> : <Play size={12} />}
                <span>{isPlaying ? 'Pause' : 'Play'}</span>
              </button>
            )}
          </div>
        </div>

        {/* ── MOBILE COMPACT VERTICAL PIPELINE (zero empty vertical gap, zero horizontal clipping) ── */}
        <div className="md:hidden space-y-2.5">
          {/* Row 1: Repository -> Ingestion */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'repo', label: 'Repository', icon: FolderGit2, stepIdx: 0 },
              { id: 'ingestion', label: 'Ingestion', icon: Layers, stepIdx: 1 },
            ].map((node) => {
              const isSelected = selectedNodeId === node.id || activeStepIndex === node.stepIdx;
              const isReached = activeStepIndex >= node.stepIdx;
              const Icon = node.icon;
              return (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => handleSelectNode(node.id, node.stepIdx)}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left transition-colors cursor-pointer ${
                    isSelected
                      ? 'border-slate-900 bg-white shadow-sm'
                      : isReached
                      ? 'border-slate-300 bg-white/95'
                      : 'border-slate-200 bg-white/85'
                  }`}
                >
                  <Icon size={16} className="text-slate-900 shrink-0" />
                  <span className="text-[12px] font-bold text-slate-900 truncate">{node.label}</span>
                </button>
              );
            })}
          </div>

          {/* Row 2: 6 Parallel Scanners */}
          <div className="rounded-xl border border-slate-200/80 bg-white/60 p-2">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-600 px-1 mb-1.5">
              Parallel Security Scanners
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {AGENTS.map((agent) => {
                const sc = getScannerInfo(agent.scannerKey);
                const isSelected = selectedNodeId === agent.id;
                const isHealthy = sc ? sc.is_available : false;
                const Icon = agent.icon;
                return (
                  <button
                    key={`mobile-${agent.id}`}
                    type="button"
                    onClick={() => handleSelectNode(agent.id, 2)}
                    className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors cursor-pointer ${
                      isSelected ? 'border-slate-900 bg-white shadow-sm' : 'border-slate-200/90 bg-white/95'
                    }`}
                  >
                    <Icon size={14} className="text-slate-900 shrink-0" />
                    <span className="text-[11.5px] font-bold text-slate-900 truncate">{agent.label}</span>
                    <span className="ml-auto shrink-0">
                      {sc ? (
                        isHealthy ? (
                          <CheckCircle2 size={12} color="#10B981" />
                        ) : (
                          <ShieldAlert size={12} color="#D97706" />
                        )
                      ) : null}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row 3: AI Draft -> Policy Gate -> Re-Test -> Clean PR */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'investigation', label: 'AI Draft', icon: Sparkles, stepIdx: 3 },
              { id: 'policy', label: 'Policy Gate', icon: ShieldCheck, stepIdx: 4 },
              { id: 'remediation', label: 'Re-Test', icon: Wrench, stepIdx: 5 },
              { id: 'pr', label: 'Clean PR', icon: GitPullRequest, stepIdx: 6 },
            ].map((node) => {
              const isSelected = selectedNodeId === node.id || activeStepIndex === node.stepIdx;
              const isSuccess = activeStepIndex >= 5 && (node.id === 'remediation' || node.id === 'pr');
              const Icon = node.icon;
              return (
                <button
                  key={`mobile-${node.id}`}
                  type="button"
                  onClick={() => handleSelectNode(node.id, node.stepIdx)}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left transition-colors cursor-pointer ${
                    isSelected
                      ? 'border-slate-900 bg-white shadow-sm'
                      : isSuccess
                      ? 'border-emerald-300 bg-emerald-50/70'
                      : 'border-slate-200 bg-white/90'
                  }`}
                >
                  <Icon
                    size={15}
                    className={isSuccess ? 'text-emerald-600 shrink-0' : 'text-slate-900 shrink-0'}
                  />
                  <span className="text-[12px] font-bold text-slate-900 truncate">{node.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── DESKTOP / TABLET 12-NODE 6-BRANCH CURVED SVG PIPELINE ── */}
        <div className="hidden md:block relative w-full overflow-x-auto">
          <svg
            viewBox="0 0 1065 415"
            className="w-full h-auto block overflow-visible"
          >
            {/* 1. Repository -> Ingestion */}
            <path
              d="M 120 230 L 195 230"
              fill="none"
              stroke={activeStepIndex >= 1 ? lineActive : lineInactive}
              strokeWidth={activeStepIndex >= 1 ? 1.8 : 1.4}
            />
            {isPlaying && activeStepIndex === 1 && (
              <g>
                <circle r="4.5" fill="rgba(15, 23, 42, 0.16)">
                  <animateMotion path="M 120 230 L 195 230" dur="1.1s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1" />
                </circle>
                <circle r="2.6" fill="#0F172A">
                  <animateMotion path="M 120 230 L 195 230" dur="1.1s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1" />
                </circle>
              </g>
            )}

            {/* 2. Ingestion -> 6 Parallel Scanners */}
            {AGENTS.map((a) => {
              const startX = 280;
              const startY = 230;
              const endX = 355;
              const endY = a.y + 21;
              const d = `M ${startX} ${startY} C ${startX + 37} ${startY}, ${endX - 37} ${endY}, ${endX} ${endY}`;
              const reached = activeStepIndex >= 2;
              const flowing = isPlaying && activeStepIndex === 2;

              return (
                <g key={`branch-in-${a.id}`}>
                  <path
                    d={d}
                    fill="none"
                    stroke={reached ? lineActive : lineInactive}
                    strokeWidth={reached ? 1.65 : 1.35}
                  />
                  {flowing && (
                    <g>
                      <circle r="4.8" fill="rgba(15, 23, 42, 0.16)">
                        <animateMotion path={d} dur="1.45s" begin="0s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1" />
                      </circle>
                      <circle r="2.5" fill="#0F172A">
                        <animateMotion path={d} dur="1.45s" begin="0s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1" />
                      </circle>
                    </g>
                  )}
                </g>
              );
            })}

            {/* 3. 6 Scanners -> Investigation */}
            {AGENTS.map((a) => {
              const startX = 523;
              const startY = a.y + 21;
              const endX = 585;
              const endY = 230;
              const d = `M ${startX} ${startY} C ${startX + 31} ${startY}, ${endX - 31} ${endY}, ${endX} ${endY}`;
              const reached = activeStepIndex >= 3;
              const flowing = isPlaying && activeStepIndex === 3;

              return (
                <g key={`branch-out-${a.id}`}>
                  <path
                    d={d}
                    fill="none"
                    stroke={reached ? lineActive : lineInactive}
                    strokeWidth={reached ? 1.65 : 1.35}
                  />
                  {flowing && (
                    <g>
                      <circle r="4.8" fill="rgba(15, 23, 42, 0.16)">
                        <animateMotion path={d} dur="1.45s" begin="0s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1" />
                      </circle>
                      <circle r="2.5" fill="#0F172A">
                        <animateMotion path={d} dur="1.45s" begin="0s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1" />
                      </circle>
                    </g>
                  )}
                </g>
              );
            })}

            {/* 4. Investigation -> Policy Gate */}
            <path
              d="M 675 230 L 720 230"
              fill="none"
              stroke={activeStepIndex >= 4 ? lineActive : lineInactive}
              strokeWidth={activeStepIndex >= 4 ? 1.8 : 1.4}
            />
            {isPlaying && activeStepIndex === 4 && (
              <g>
                <circle r="4.5" fill="rgba(15, 23, 42, 0.16)">
                  <animateMotion path="M 675 230 L 720 230" dur="1.0s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1" />
                </circle>
                <circle r="2.6" fill="#0F172A">
                  <animateMotion path="M 675 230 L 720 230" dur="1.0s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1" />
                </circle>
              </g>
            )}

            {/* 5. Policy Gate -> Re-Test */}
            <path
              d="M 805 230 L 845 230"
              fill="none"
              stroke={activeStepIndex >= 5 ? '#10B981' : lineInactive}
              strokeWidth={activeStepIndex >= 5 ? 1.8 : 1.4}
            />
            {isPlaying && activeStepIndex === 5 && (
              <g>
                <circle r="4.5" fill="rgba(16, 185, 129, 0.22)">
                  <animateMotion path="M 805 230 L 845 230" dur="1.0s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1" />
                </circle>
                <circle r="2.6" fill="#10B981">
                  <animateMotion path="M 805 230 L 845 230" dur="1.0s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1" />
                </circle>
              </g>
            )}

            {/* 6. Re-Test -> Clean PR */}
            <path
              d="M 935 230 L 965 230"
              fill="none"
              stroke={activeStepIndex >= 6 ? '#10B981' : lineInactive}
              strokeWidth={activeStepIndex >= 6 ? 1.8 : 1.4}
            />
            {isPlaying && activeStepIndex === 6 && (
              <g>
                <circle r="4.5" fill="rgba(16, 185, 129, 0.22)">
                  <animateMotion path="M 935 230 L 965 230" dur="1.0s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1" />
                </circle>
                <circle r="2.6" fill="#10B981">
                  <animateMotion path="M 935 230 L 965 230" dur="1.0s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1" />
                </circle>
              </g>
            )}

            {/* 1. Repository Node */}
            <foreignObject x="35" y="195" width="85" height="70">
              <div
                onMouseEnter={() => setHoveredNode('repo')}
                onMouseLeave={() => setHoveredNode(null)}
                onClick={() => handleSelectNode('repo', 0)}
                style={{
                  width: '85px',
                  height: '70px',
                  borderRadius: '12px',
                  border: `1.5px solid ${hoveredNode === 'repo' ? '#EA580C' : selectedNodeId === 'repo' || activeStepIndex >= 0 ? '#0F172A' : nodeBorderIdle}`,
                  backgroundColor: hoveredNode === 'repo' ? '#FFF7ED' : '#FFFFFF',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                  boxShadow: hoveredNode === 'repo' ? '0 0 0 3px rgba(234, 88, 12, 0.14)' : '0 2px 6px rgba(15,23,42,0.04)',
                  transition: 'border-color 0.18s ease, background-color 0.18s ease, box-shadow 0.18s ease',
                }}
              >
                <FolderGit2 size={21} color={hoveredNode === 'repo' ? '#EA580C' : '#0F172A'} />
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>Repository</span>
              </div>
            </foreignObject>

            {/* 2. Ingestion Node */}
            <foreignObject x="195" y="195" width="85" height="70">
              <div
                onMouseEnter={() => setHoveredNode('ingestion')}
                onMouseLeave={() => setHoveredNode(null)}
                onClick={() => handleSelectNode('ingestion', 1)}
                style={{
                  width: '85px',
                  height: '70px',
                  borderRadius: '12px',
                  border: `1.5px solid ${hoveredNode === 'ingestion' ? '#EA580C' : selectedNodeId === 'ingestion' || activeStepIndex >= 1 ? '#0F172A' : nodeBorderIdle}`,
                  backgroundColor: hoveredNode === 'ingestion' ? '#FFF7ED' : '#FFFFFF',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                  boxShadow: hoveredNode === 'ingestion' ? '0 0 0 3px rgba(234, 88, 12, 0.14)' : '0 2px 6px rgba(15,23,42,0.04)',
                  transition: 'border-color 0.18s ease, background-color 0.18s ease, box-shadow 0.18s ease',
                }}
              >
                <Layers size={21} color={hoveredNode === 'ingestion' ? '#EA580C' : '#0F172A'} />
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>Ingestion</span>
              </div>
            </foreignObject>

            {/* 3. 6 Parallel Scanners */}
            {AGENTS.map((agent) => {
              const sc = getScannerInfo(agent.scannerKey);
              const isSelected = selectedNodeId === agent.id;
              const isHealthy = sc ? sc.is_available : false;
              const isHovered = hoveredNode === agent.id;

              return (
                <foreignObject key={agent.id} x="355" y={agent.y} width="170" height="42">
                  <div
                    onMouseEnter={() => setHoveredNode(agent.id)}
                    onMouseLeave={() => setHoveredNode(null)}
                    onClick={() => handleSelectNode(agent.id, 2)}
                    style={{
                      width: '168px',
                      height: '40px',
                      borderRadius: '12px',
                      border: `1.5px solid ${isHovered ? '#EA580C' : isSelected ? '#09090B' : isHealthy ? '#CBD5E1' : nodeBorderIdle}`,
                      backgroundColor: isHovered ? '#FFF7ED' : '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                      padding: '0 13px',
                      gap: '9px',
                      cursor: 'pointer',
                      boxShadow: isHovered ? '0 0 0 3px rgba(234, 88, 12, 0.14)' : isSelected ? '0 0 0 3px rgba(15, 23, 42, 0.10)' : '0 1px 3px rgba(15,23,42,0.04)',
                      transition: 'border-color 0.18s ease, background-color 0.18s ease, box-shadow 0.18s ease',
                    }}
                  >
                    <agent.icon size={15} color={isHovered ? '#EA580C' : '#0F172A'} />
                    <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#0F172A' }}>
                      {agent.label}
                    </span>
                    <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
                      {sc ? (
                        isHealthy ? (
                          <CheckCircle2 size={13} color="#10B981" />
                        ) : (
                          <ShieldAlert size={13} color="#D97706" />
                        )
                      ) : null}
                    </span>
                  </div>
                </foreignObject>
              );
            })}

            {/* 4. AI Draft Node */}
            <foreignObject x="585" y="195" width="90" height="70">
              <div
                onMouseEnter={() => setHoveredNode('investigation')}
                onMouseLeave={() => setHoveredNode(null)}
                onClick={() => handleSelectNode('investigation', 3)}
                style={{
                  width: '90px',
                  height: '70px',
                  borderRadius: '12px',
                  border: `1.5px solid ${hoveredNode === 'investigation' ? '#EA580C' : selectedNodeId === 'investigation' || activeStepIndex >= 3 ? '#0F172A' : nodeBorderIdle}`,
                  backgroundColor: hoveredNode === 'investigation' ? '#FFF7ED' : '#FFFFFF',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                  boxShadow: hoveredNode === 'investigation' ? '0 0 0 3px rgba(234, 88, 12, 0.14)' : '0 2px 6px rgba(15,23,42,0.04)',
                  transition: 'border-color 0.18s ease, background-color 0.18s ease, box-shadow 0.18s ease',
                }}
              >
                <Sparkles size={21} color={hoveredNode === 'investigation' ? '#EA580C' : '#0F172A'} />
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>AI Draft</span>
              </div>
            </foreignObject>

            {/* 5. Policy Gate Node */}
            <foreignObject x="720" y="195" width="85" height="70">
              <div
                onMouseEnter={() => setHoveredNode('policy')}
                onMouseLeave={() => setHoveredNode(null)}
                onClick={() => handleSelectNode('policy', 4)}
                style={{
                  width: '85px',
                  height: '70px',
                  borderRadius: '12px',
                  border: `1.5px solid ${hoveredNode === 'policy' ? '#EA580C' : selectedNodeId === 'policy' || activeStepIndex >= 4 ? '#0F172A' : nodeBorderIdle}`,
                  backgroundColor: hoveredNode === 'policy' ? '#FFF7ED' : '#FFFFFF',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                  boxShadow: hoveredNode === 'policy' ? '0 0 0 3px rgba(234, 88, 12, 0.14)' : '0 2px 6px rgba(15,23,42,0.04)',
                  transition: 'border-color 0.18s ease, background-color 0.18s ease, box-shadow 0.18s ease',
                }}
              >
                <ShieldCheck size={21} color={hoveredNode === 'policy' ? '#EA580C' : '#0F172A'} />
                <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#0F172A', textAlign: 'center', lineHeight: 1.1 }}>
                  Policy<br />Gate
                </span>
              </div>
            </foreignObject>

            {/* 6. Re-Test Node */}
            <foreignObject x="845" y="195" width="90" height="70">
              <div
                onMouseEnter={() => setHoveredNode('remediation')}
                onMouseLeave={() => setHoveredNode(null)}
                onClick={() => handleSelectNode('remediation', 5)}
                style={{
                  width: '90px',
                  height: '70px',
                  borderRadius: '12px',
                  border: `1.5px solid ${hoveredNode === 'remediation' ? '#EA580C' : selectedNodeId === 'remediation' ? '#09090B' : activeStepIndex >= 5 ? '#10B981' : nodeBorderIdle}`,
                  backgroundColor: hoveredNode === 'remediation' ? '#FFF7ED' : '#FFFFFF',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                  boxShadow: hoveredNode === 'remediation' ? '0 0 0 3px rgba(234, 88, 12, 0.14)' : '0 2px 6px rgba(15,23,42,0.04)',
                  transition: 'border-color 0.18s ease, background-color 0.18s ease, box-shadow 0.18s ease',
                }}
              >
                <Wrench size={20} color={hoveredNode === 'remediation' ? '#EA580C' : '#0F172A'} />
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>Re-Test</span>
              </div>
            </foreignObject>

            {/* 7. Clean PR Node */}
            <foreignObject x="965" y="195" width="75" height="70">
              <div
                onMouseEnter={() => setHoveredNode('pr')}
                onMouseLeave={() => setHoveredNode(null)}
                onClick={() => handleSelectNode('pr', 6)}
                style={{
                  width: '75px',
                  height: '70px',
                  borderRadius: '12px',
                  border: `1.5px solid ${hoveredNode === 'pr' ? '#EA580C' : selectedNodeId === 'pr' ? '#09090B' : activeStepIndex >= 6 ? '#10B981' : nodeBorderIdle}`,
                  backgroundColor: hoveredNode === 'pr' ? '#FFF7ED' : activeStepIndex >= 6 ? '#F0FDF4' : '#FFFFFF',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                  boxShadow: hoveredNode === 'pr' ? '0 0 0 3px rgba(234, 88, 12, 0.14)' : '0 2px 6px rgba(15,23,42,0.04)',
                  transition: 'border-color 0.18s ease, background-color 0.18s ease, box-shadow 0.18s ease',
                }}
              >
                <GitPullRequest size={21} color={hoveredNode === 'pr' ? '#EA580C' : activeStepIndex >= 6 ? '#10B981' : '#0F172A'} />
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>Clean PR</span>
              </div>
            </foreignObject>
          </svg>
        </div>

        {/* ── 7-Step Interactive Progress Timeline ── */}
        <div className="mt-3 pt-4 border-t border-slate-200/70">
          <div className="relative grid grid-cols-4 gap-y-2.5 sm:flex sm:items-center sm:justify-between max-w-[920px] mx-auto">
            <div className="hidden sm:block absolute top-[8px] left-5 right-5 h-[2px] bg-slate-200/90" />
            <div
              className="hidden sm:block absolute top-[8px] left-5 right-5 h-[2px] origin-left transition-transform duration-300 bg-[#0F172A]"
              style={{ transform: `scaleX(${activeStepIndex / (STEPS.length - 1)})` }}
            />

            {STEPS.map((s, idx) => {
              const isDone = idx < activeStepIndex;
              const isCurr = idx === activeStepIndex;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleSelectNode(s.nodeId, idx)}
                  className="group bg-transparent border-0 p-1 flex flex-col items-center relative z-10 cursor-pointer"
                >
                  <div
                    className="group-hover:border-[#EA580C] group-hover:scale-110 transition-all"
                    style={{
                      width: '17px',
                      height: '17px',
                      borderRadius: '50%',
                      backgroundColor: isCurr ? '#0F172A' : isDone ? '#10B981' : '#FFFFFF',
                      border: `2.5px solid ${isCurr ? '#0F172A' : isDone ? '#10B981' : '#CBD5E1'}`,
                    }}
                  />
                  <span
                    className={`mt-1.5 text-[10.5px] sm:text-[11.5px] whitespace-nowrap group-hover:text-[#EA580C] transition-colors ${
                      isCurr ? 'font-bold text-slate-900' : 'font-medium text-slate-600'
                    }`}
                  >
                    {s.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default KavachSecurityPipelineFlow;
