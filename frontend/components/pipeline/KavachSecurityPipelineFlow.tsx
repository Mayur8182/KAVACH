'use client';

/**
 * KavachSecurityPipelineFlow — High-Fidelity Animated SVG DAG Security Pipeline
 * Faithful implementation of Image 1 ("Kavach Security Pipeline") with:
 * - Animated SVG curved connector lines
 * - Moving data flow particles/pulses along each branch
 * - 6 parallel security agent branches (SAST, Secrets, IaC, API, Container, Supply Chain)
 * - Sequentially activating nodes from Repository -> Ingestion -> Agents -> Investigation -> Policy Gate -> Remediation -> PR
 * - Bottom stepper timeline (Initialize -> Ingest -> Scan -> Investigate -> Policy -> Remediate -> PR)
 * - Interactive play/pause/reset controls & real telemetry inspection on click/hover
 */

import React, { useState, useEffect } from 'react';
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
  RotateCw,
  CheckCircle2,
  Activity,
  ChevronRight,
} from 'lucide-react';

interface PipelineFlowProps {
  pipelineNumber?: number;
  initialStatus?: 'Queued' | 'Running' | 'Investigating' | 'Remediating' | 'Completed';
  interactive?: boolean;
  onNodeClick?: (nodeId: string) => void;
  theme?: 'light' | 'dark';
}

const STEPS = [
  { id: 'init', label: 'Initialize' },
  { id: 'ingest', label: 'Ingest' },
  { id: 'scan', label: 'Scan' },
  { id: 'investigate', label: 'Investigate' },
  { id: 'policy', label: 'Policy' },
  { id: 'remediate', label: 'Remediate' },
  { id: 'pr', label: 'PR' },
];

export function KavachSecurityPipelineFlow({
  pipelineNumber = 3274,
  interactive = true,
  theme = 'light',
  onNodeClick,
}: PipelineFlowProps) {
  const [activeStepIndex, setActiveStepIndex] = useState<number>(2); // 0 to 6
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Auto-cycle through the 7 steps to simulate live execution like the gif
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setActiveStepIndex((prev) => (prev + 1) % STEPS.length);
    }, 2400);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const statusLabel =
    activeStepIndex === 0
      ? 'Queued'
      : activeStepIndex === 1
      ? 'Ingesting'
      : activeStepIndex === 2
      ? 'Scanning'
      : activeStepIndex === 3
      ? 'Investigating'
      : activeStepIndex === 4
      ? 'Evaluating Policy'
      : activeStepIndex === 5
      ? 'Remediating'
      : 'PR Generated';

  const statusColor =
    activeStepIndex === 0
      ? '#64748B'
      : activeStepIndex === 6
      ? '#16A34A'
      : '#2563EB';

  const isDark = theme === 'dark';
  const bgColor = isDark ? '#0A0D12' : '#FFFFFF';
  const cardBorder = isDark ? '#1F242F' : '#E2E8F0';
  const textColor = isDark ? '#FFFFFF' : '#0F172A';
  const subTextColor = isDark ? '#94A3B8' : '#64748B';
  const nodeBg = isDark ? '#11151F' : '#FFFFFF';
  const nodeBorder = isDark ? '#272E3B' : '#E2E8F0';
  const activeNodeBorder = '#2563EB';
  const lineColor = isDark ? '#333D4F' : '#CBD5E1';
  const activeLineColor = '#3B82F6';

  // 6 Security Agents
  const AGENTS = [
    { id: 'sast', label: 'SAST', icon: Code2, y: 70, findings: '0 Critical', metric: '142 AST rules' },
    { id: 'secrets', label: 'Secrets', icon: KeyRound, y: 126, findings: 'Verified clean', metric: 'Gitleaks entropy' },
    { id: 'iac', label: 'IaC', icon: FileCode2, y: 182, findings: 'CIS Drift checked', metric: 'Checkov & OPA' },
    { id: 'api', label: 'API', icon: Globe, y: 238, findings: 'Contract compliant', metric: 'OpenAPI v3 schema' },
    { id: 'container', label: 'Container', icon: Boxes, y: 294, findings: 'Base layers safe', metric: 'Trivy SBOM' },
    { id: 'supply', label: 'Supply Chain', icon: Package, y: 350, findings: 'SLSA verified', metric: 'CycloneDX deps' },
  ];

  return (
    <div
      style={{
        backgroundColor: bgColor,
        borderRadius: '16px',
        border: `1px solid ${cardBorder}`,
        padding: '24px 28px',
        boxShadow: isDark
          ? '0 10px 30px rgba(0,0,0,0.5)'
          : '0 4px 20px -2px rgba(15, 23, 42, 0.06)',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        position: 'relative',
        overflow: 'hidden',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      <style>{`
        @keyframes flowDash {
          0% { stroke-dashoffset: 48; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.3; transform: scale(0.98); }
          50% { opacity: 0.9; transform: scale(1.02); }
        }
        @keyframes subtleBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-2px); }
        }
        .pipeline-particle {
          filter: drop-shadow(0 0 4px rgba(59, 130, 246, 0.8));
        }
      `}</style>

      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '6px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h2
            style={{
              fontSize: '22px',
              fontWeight: 800,
              color: textColor,
              margin: 0,
              letterSpacing: '-0.02em',
            }}
          >
            Kavach Security Pipeline
          </h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '13.5px', color: subTextColor, fontWeight: 500 }}>
            Pipeline #{pipelineNumber}
          </span>
          <span
            style={{
              fontSize: '12.5px',
              fontWeight: 700,
              backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#F1F5F9',
              color: statusColor,
              padding: '4px 12px',
              borderRadius: '999px',
              border: `1px solid ${statusColor}33`,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: statusColor,
                display: 'inline-block',
              }}
            />
            {statusLabel}
          </span>

          {interactive && (
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              title={isPlaying ? 'Pause animation' : 'Play animation'}
              style={{
                border: `1px solid ${cardBorder}`,
                backgroundColor: isDark ? '#181E29' : '#FFFFFF',
                color: textColor,
                borderRadius: '6px',
                padding: '4px 8px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              {isPlaying ? <Pause size={12} /> : <Play size={12} />}
            </button>
          )}
        </div>
      </div>

      {/* Subtitle Breadcrumb */}
      <div
        style={{
          fontSize: '13px',
          color: subTextColor,
          marginBottom: '28px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          flexWrap: 'wrap',
        }}
      >
        <span>Repository</span>
        <span>→</span>
        <span style={{ fontWeight: 600, color: activeStepIndex >= 2 ? '#3B82F6' : subTextColor }}>
          Security Agents
        </span>
        <span>→</span>
        <span>Investigation</span>
        <span>→</span>
        <span>Policy Gate</span>
        <span>→</span>
        <span>Remediation</span>
        <span>→</span>
        <span style={{ fontWeight: 600, color: activeStepIndex === 6 ? '#16A34A' : subTextColor }}>
          Pull Request
        </span>
      </div>

      {/* ── Animated SVG Diagram Container ── */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          overflowX: 'auto',
          minHeight: '430px',
        }}
      >
        <svg
          viewBox="0 0 1020 440"
          style={{
            width: '100%',
            height: 'auto',
            display: 'block',
            overflow: 'visible',
          }}
        >
          <defs>
            <linearGradient id="flowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.2" />
              <stop offset="50%" stopColor="#3B82F6" stopOpacity="1" />
              <stop offset="100%" stopColor="#60A5FA" stopOpacity="0.2" />
            </linearGradient>
            <filter id="glowFilter" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* ── CONNECTOR LINES ── */}
          {/* Repository (120) to Ingestion (195) */}
          <line
            x1="120"
            y1="230"
            x2="195"
            y2="230"
            stroke={activeStepIndex >= 1 ? activeLineColor : lineColor}
            strokeWidth={activeStepIndex >= 1 ? 2.5 : 1.5}
            strokeDasharray={activeStepIndex >= 1 ? '4,4' : 'none'}
            style={{ animation: activeStepIndex >= 1 ? 'flowDash 1.2s linear infinite' : 'none' }}
          />

          {/* Ingestion (280, 230) branching out to 6 agents */}
          {AGENTS.map((a, i) => {
            const startX = 280;
            const startY = 230;
            const endX = 355;
            const endY = a.y + 21;
            const cX1 = startX + 45;
            const cY1 = startY;
            const cX2 = startX + 35;
            const cY2 = endY;
            const d = `M ${startX} ${startY} C ${cX1} ${cY1}, ${cX2} ${cY2}, ${endX} ${endY}`;
            const isLineActive = activeStepIndex >= 2;

            return (
              <g key={`branch-in-${a.id}`}>
                {/* Background static curve */}
                <path
                  d={d}
                  fill="none"
                  stroke={lineColor}
                  strokeWidth="1.5"
                />
                {/* Animated active curve */}
                {isLineActive && (
                  <path
                    d={d}
                    fill="none"
                    stroke={activeLineColor}
                    strokeWidth="2.5"
                    strokeDasharray="6, 6"
                    style={{ animation: 'flowDash 1.5s linear infinite' }}
                  />
                )}
                {/* Traveling glowing particle */}
                {isLineActive && isPlaying && (
                  <circle r="4" fill="#60A5FA" className="pipeline-particle">
                    <animateMotion
                      path={d}
                      dur={`${1.8 + i * 0.2}s`}
                      repeatCount="indefinite"
                    />
                  </circle>
                )}
              </g>
            );
          })}

          {/* 6 agents converging to Investigation (580, 230) */}
          {AGENTS.map((a, i) => {
            const startX = 525;
            const startY = a.y + 21;
            const endX = 585;
            const endY = 230;
            const cX1 = startX + 35;
            const cY1 = startY;
            const cX2 = endX - 35;
            const cY2 = endY;
            const d = `M ${startX} ${startY} C ${cX1} ${cY1}, ${cX2} ${cY2}, ${endX} ${endY}`;
            const isLineActive = activeStepIndex >= 3;

            return (
              <g key={`branch-out-${a.id}`}>
                <path
                  d={d}
                  fill="none"
                  stroke={lineColor}
                  strokeWidth="1.5"
                />
                {isLineActive && (
                  <path
                    d={d}
                    fill="none"
                    stroke={activeLineColor}
                    strokeWidth="2.5"
                    strokeDasharray="6, 6"
                    style={{ animation: 'flowDash 1.5s linear infinite' }}
                  />
                )}
                {isLineActive && isPlaying && (
                  <circle r="4" fill="#3B82F6" className="pipeline-particle">
                    <animateMotion
                      path={d}
                      dur={`${1.9 + i * 0.15}s`}
                      repeatCount="indefinite"
                    />
                  </circle>
                )}
              </g>
            );
          })}

          {/* Investigation (675) to Policy Gate (720) */}
          <line
            x1="675"
            y1="230"
            x2="720"
            y2="230"
            stroke={activeStepIndex >= 4 ? activeLineColor : lineColor}
            strokeWidth={activeStepIndex >= 4 ? 2.5 : 1.5}
            strokeDasharray={activeStepIndex >= 4 ? '4,4' : 'none'}
            style={{ animation: activeStepIndex >= 4 ? 'flowDash 1.2s linear infinite' : 'none' }}
          />

          {/* Policy Gate (805) to Remediation (845) */}
          <line
            x1="805"
            y1="230"
            x2="845"
            y2="230"
            stroke={activeStepIndex >= 5 ? activeLineColor : lineColor}
            strokeWidth={activeStepIndex >= 5 ? 2.5 : 1.5}
            strokeDasharray={activeStepIndex >= 5 ? '4,4' : 'none'}
            style={{ animation: activeStepIndex >= 5 ? 'flowDash 1.2s linear infinite' : 'none' }}
          />

          {/* Remediation (935) to PR (965) */}
          <line
            x1="935"
            y1="230"
            x2="965"
            y2="230"
            stroke={activeStepIndex >= 6 ? '#16A34A' : lineColor}
            strokeWidth={activeStepIndex >= 6 ? 2.5 : 1.5}
            strokeDasharray={activeStepIndex >= 6 ? '4,4' : 'none'}
            style={{ animation: activeStepIndex >= 6 ? 'flowDash 1.2s linear infinite' : 'none' }}
          />

          {/* ── HTML EMBEDDED NODES (ForeignObject for rich icons & typography) ── */}

          {/* 1. Repository Node */}
          <foreignObject x="35" y="195" width="85" height="70">
            <div
              onClick={() => onNodeClick?.('repo')}
              style={{
                width: '85px',
                height: '70px',
                borderRadius: '12px',
                border: `1.5px solid ${activeStepIndex >= 0 ? activeNodeBorder : nodeBorder}`,
                backgroundColor: nodeBg,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                cursor: 'pointer',
                boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.4)' : '0 2px 8px rgba(0,0,0,0.04)',
                transition: 'all 0.2s ease',
              }}
            >
              <FolderGit2 size={24} color={textColor} />
              <span style={{ fontSize: '12px', fontWeight: 700, color: textColor }}>Repository</span>
            </div>
          </foreignObject>

          {/* 2. Ingestion Node */}
          <foreignObject x="195" y="195" width="85" height="70">
            <div
              onClick={() => onNodeClick?.('ingestion')}
              style={{
                width: '85px',
                height: '70px',
                borderRadius: '12px',
                border: `1.5px solid ${activeStepIndex >= 1 ? activeNodeBorder : nodeBorder}`,
                backgroundColor: nodeBg,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                cursor: 'pointer',
                boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.4)' : '0 2px 8px rgba(0,0,0,0.04)',
                transition: 'all 0.2s ease',
              }}
            >
              <Layers size={24} color={activeStepIndex >= 1 ? '#3B82F6' : textColor} />
              <span style={{ fontSize: '12px', fontWeight: 700, color: textColor }}>Ingestion</span>
            </div>
          </foreignObject>

          {/* 3. 6 Parallel Security Agent Nodes */}
          {AGENTS.map((agent) => {
            const isScanning = activeStepIndex === 2;
            const isDone = activeStepIndex > 2;
            const isHovered = hoveredNode === agent.id;

            return (
              <foreignObject key={agent.id} x="355" y={agent.y} width="170" height="42">
                <div
                  onMouseEnter={() => setHoveredNode(agent.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  onClick={() => onNodeClick?.(agent.id)}
                  style={{
                    width: '168px',
                    height: '40px',
                    borderRadius: '20px',
                    border: `1.5px solid ${isScanning ? activeNodeBorder : isDone ? '#10B981' : nodeBorder}`,
                    backgroundColor: isHovered
                      ? isDark
                        ? '#1A2333'
                        : '#F0F9FF'
                      : nodeBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    padding: '0 16px',
                    gap: '10px',
                    cursor: 'pointer',
                    boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.3)' : '0 1px 4px rgba(0,0,0,0.03)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <agent.icon
                    size={16}
                    color={isScanning ? '#3B82F6' : isDone ? '#10B981' : textColor}
                  />
                  <span style={{ fontSize: '13px', fontWeight: 700, color: textColor }}>
                    {agent.label}
                  </span>
                  {isScanning && (
                    <span
                      style={{
                        marginLeft: 'auto',
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: '#3B82F6',
                        animation: 'pulseGlow 1.2s infinite ease-in-out',
                      }}
                    />
                  )}
                  {isDone && (
                    <span style={{ marginLeft: 'auto' }}>
                      <CheckCircle2 size={13} color="#10B981" />
                    </span>
                  )}
                </div>
              </foreignObject>
            );
          })}

          {/* 4. Investigation Node */}
          <foreignObject x="585" y="195" width="90" height="70">
            <div
              onClick={() => onNodeClick?.('investigation')}
              style={{
                width: '90px',
                height: '70px',
                borderRadius: '12px',
                border: `1.5px solid ${activeStepIndex >= 3 ? activeNodeBorder : nodeBorder}`,
                backgroundColor: nodeBg,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                cursor: 'pointer',
                boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.4)' : '0 2px 8px rgba(0,0,0,0.04)',
                transition: 'all 0.2s ease',
              }}
            >
              <Sparkles size={24} color={activeStepIndex >= 3 ? '#60A5FA' : textColor} />
              <span style={{ fontSize: '12px', fontWeight: 700, color: textColor }}>Investigation</span>
            </div>
          </foreignObject>

          {/* 5. Policy Gate Node */}
          <foreignObject x="720" y="195" width="85" height="70">
            <div
              onClick={() => onNodeClick?.('policy')}
              style={{
                width: '85px',
                height: '70px',
                borderRadius: '12px',
                border: `1.5px solid ${activeStepIndex >= 4 ? activeNodeBorder : nodeBorder}`,
                backgroundColor: nodeBg,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                cursor: 'pointer',
                boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.4)' : '0 2px 8px rgba(0,0,0,0.04)',
                transition: 'all 0.2s ease',
              }}
            >
              <ShieldCheck size={24} color={activeStepIndex >= 4 ? '#3B82F6' : textColor} />
              <span style={{ fontSize: '11.5px', fontWeight: 700, color: textColor, textAlign: 'center', lineHeight: 1.1 }}>
                Policy<br />Gate
              </span>
            </div>
          </foreignObject>

          {/* 6. Remediation Node */}
          <foreignObject x="845" y="195" width="90" height="70">
            <div
              onClick={() => onNodeClick?.('remediation')}
              style={{
                width: '90px',
                height: '70px',
                borderRadius: '12px',
                border: `1.5px solid ${activeStepIndex >= 5 ? activeNodeBorder : nodeBorder}`,
                backgroundColor: nodeBg,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                cursor: 'pointer',
                boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.4)' : '0 2px 8px rgba(0,0,0,0.04)',
                transition: 'all 0.2s ease',
              }}
            >
              <Wrench size={23} color={activeStepIndex >= 5 ? '#F59E0B' : textColor} />
              <span style={{ fontSize: '12px', fontWeight: 700, color: textColor }}>Remediation</span>
            </div>
          </foreignObject>

          {/* 7. PR Node */}
          <foreignObject x="965" y="195" width="75" height="70">
            <div
              onClick={() => onNodeClick?.('pr')}
              style={{
                width: '75px',
                height: '70px',
                borderRadius: '12px',
                border: `1.5px solid ${activeStepIndex >= 6 ? '#10B981' : nodeBorder}`,
                backgroundColor: nodeBg,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                cursor: 'pointer',
                boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.4)' : '0 2px 8px rgba(0,0,0,0.04)',
                transition: 'all 0.2s ease',
              }}
            >
              <GitPullRequest size={24} color={activeStepIndex >= 6 ? '#10B981' : textColor} />
              <span style={{ fontSize: '12px', fontWeight: 700, color: textColor }}>PR</span>
            </div>
          </foreignObject>
        </svg>
      </div>

      {/* ── Bottom Stepper Timeline (Image 1 Bottom) ── */}
      <div
        style={{
          marginTop: '28px',
          paddingTop: '20px',
          borderTop: `1px solid ${cardBorder}`,
          position: 'relative',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'relative',
            maxWidth: '920px',
            margin: '0 auto',
          }}
        >
          {/* Horizontal connecting background line */}
          <div
            style={{
              position: 'absolute',
              top: '8px',
              left: '20px',
              right: '20px',
              height: '2px',
              backgroundColor: lineColor,
              zIndex: 1,
            }}
          />

          {/* Active progress track */}
          <div
            style={{
              position: 'absolute',
              top: '8px',
              left: '20px',
              width: `${(activeStepIndex / (STEPS.length - 1)) * 96}%`,
              height: '2px',
              backgroundColor: activeLineColor,
              zIndex: 2,
              transition: 'width 0.4s ease',
            }}
          />

          {STEPS.map((s, idx) => {
            const isCompleted = idx < activeStepIndex;
            const isCurrent = idx === activeStepIndex;

            return (
              <div
                key={s.id}
                onClick={() => setActiveStepIndex(idx)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  position: 'relative',
                  zIndex: 3,
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    backgroundColor: isCurrent
                      ? '#2563EB'
                      : isCompleted
                      ? '#10B981'
                      : nodeBg,
                    border: `2.5px solid ${
                      isCurrent
                        ? '#2563EB'
                        : isCompleted
                        ? '#10B981'
                        : lineColor
                    }`,
                    transition: 'all 0.3s ease',
                    boxShadow: isCurrent ? '0 0 10px rgba(37, 99, 235, 0.6)' : 'none',
                  }}
                />
                <span
                  style={{
                    fontSize: '12.5px',
                    fontWeight: isCurrent ? 700 : 500,
                    color: isCurrent ? textColor : subTextColor,
                    marginTop: '8px',
                    transition: 'color 0.2s ease',
                  }}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default KavachSecurityPipelineFlow;

