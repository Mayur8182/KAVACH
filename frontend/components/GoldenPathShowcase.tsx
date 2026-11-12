'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Terminal,
  ShieldCheck,
  CheckCircle2,
  GitPullRequest,
  Lock,
  Activity,
  Sparkles,
  ArrowRight,
  Search,
  Code2,
  Check,
  ExternalLink,
  ShieldAlert,
  Layers,
  Cpu,
  GitCommit,
  CheckCheck,
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────────
   TYPEWRITER HOOK (Loops command text only while component is visible)
───────────────────────────────────────────────────────────────────────────── */
function useTypewriter(
  words: string[],
  isVisible: boolean,
  reducedMotion: boolean,
  typingSpeed = 40,
  pauseTime = 2500
) {
  const [displayText, setDisplayText] = useState(words[0]);
  const [wordIndex, setWordIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (reducedMotion) {
      setDisplayText(words[0]);
      return;
    }
    if (!isVisible) return;

    let timer: NodeJS.Timeout;
    const currentWord = words[wordIndex % words.length];

    if (!isDeleting && displayText === currentWord) {
      timer = setTimeout(() => setIsDeleting(true), pauseTime);
    } else if (isDeleting && displayText === '') {
      setIsDeleting(false);
      setWordIndex((prev) => (prev + 1) % words.length);
    } else {
      timer = setTimeout(() => {
        setDisplayText((prev) =>
          isDeleting
            ? currentWord.substring(0, prev.length - 1)
            : currentWord.substring(0, prev.length + 1)
        );
      }, isDeleting ? typingSpeed / 2 : typingSpeed);
    }

    return () => clearTimeout(timer);
  }, [displayText, isDeleting, wordIndex, words, typingSpeed, pauseTime, isVisible, reducedMotion]);

  return displayText;
}

/* ─────────────────────────────────────────────────────────────────────────────
   ANIMATED NUMBER COUNTER (Triggers when in view, respects reduced motion)
───────────────────────────────────────────────────────────────────────────── */
function AnimatedCounter({
  value,
  suffix = '',
  prefix = '',
  isVisible = false,
  reducedMotion = false,
}: {
  value: number;
  suffix?: string;
  prefix?: string;
  isVisible?: boolean;
  reducedMotion?: boolean;
}) {
  const [count, setCount] = useState(reducedMotion ? value : 0);

  useEffect(() => {
    if (reducedMotion) {
      setCount(value);
      return;
    }
    if (!isVisible) return;

    let start = 0;
    const duration = 1400;
    const stepTime = 25;
    const steps = duration / stepTime;
    const increment = value / steps;

    const timer = setInterval(() => {
      start += increment;
      if (start >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [isVisible, value, reducedMotion]);

  return (
    <span style={{ fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)' }}>
      {prefix}
      {count}
      {suffix}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MACOS WINDOW CHROME
───────────────────────────────────────────────────────────────────────────── */
interface MacWindowProps {
  title: string;
  badge?: string;
  badgeColor?: string;
  children: React.ReactNode;
  headerAction?: React.ReactNode;
}

function MacWindow({ title, badge, badgeColor = '#38BDF8', children, headerAction }: MacWindowProps) {
  return (
    <div
      style={{
        backgroundColor: '#090D16',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 20px 45px -10px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.04)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* Window Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
          backgroundColor: '#0F172A',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#EF4444', display: 'inline-block' }} />
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#F59E0B', display: 'inline-block' }} />
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10B981', display: 'inline-block' }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <span
            style={{
              fontSize: '11px',
              fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
              color: '#94A3B8',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {title}
          </span>
          {badge && (
            <span
              style={{
                fontSize: '9.5px',
                fontFamily: 'var(--font-mono, monospace)',
                fontWeight: 700,
                color: badgeColor,
                backgroundColor: 'rgba(56, 189, 248, 0.12)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                padding: '1px 6px',
                borderRadius: '4px',
                letterSpacing: '0.04em',
              }}
            >
              {badge}
            </span>
          )}
        </div>

        <div>{headerAction || <div style={{ width: '36px' }} />}</div>
      </div>

      {/* Window Body */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>{children}</div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   1. SCAN HUD (Terminal-style vulnerability detection)
───────────────────────────────────────────────────────────────────────────── */
interface ScanHudProps {
  isVisible: boolean;
  reducedMotion: boolean;
}

export function ScanHud({ isVisible, reducedMotion }: ScanHudProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'sast' | 'secrets'>('all');
  const terminalCommand = useTypewriter(
    [
      'kavach scan --repo=kavach/core --branch=main --engine=ast,secrets',
      'kavach audit --policy=strict-invariants.rego --prove',
      'kavach gate evaluate --branch=main --deterministic',
    ],
    isVisible,
    reducedMotion
  );

  const findings = [
    {
      id: 'FIND-001',
      type: 'sast',
      title: 'SQL injection (CWE-89 / OWASP A03)',
      file: 'auth/route.py',
      line: 42,
      sev: 'CRITICAL',
      sevColor: '#EF4444',
      sevBg: 'rgba(239, 68, 68, 0.15)',
      engine: 'Semgrep AST',
    },
    {
      id: 'FIND-002',
      type: 'secrets',
      title: 'High-entropy plaintext AWS key (CWE-798)',
      file: 'src/config.py',
      line: 18,
      sev: 'HIGH',
      sevColor: '#F97316',
      sevBg: 'rgba(249, 115, 22, 0.15)',
      engine: 'Gitleaks Entropy',
    },
    {
      id: 'FIND-003',
      type: 'sast',
      title: 'Path traversal file write (CWE-434)',
      file: 'src/upload.py',
      line: 64,
      sev: 'HIGH',
      sevColor: '#F97316',
      sevBg: 'rgba(249, 115, 22, 0.15)',
      engine: 'Semgrep SAST',
    },
  ];

  const filtered = activeTab === 'all' ? findings : findings.filter((f) => f.type === activeTab);

  return (
    <MacWindow
      title="kavach-ast-scanner --telemetry"
      badge="LIVE"
      badgeColor="#10B981"
      headerAction={
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: '#10B981',
              boxShadow: '0 0 8px #10B981',
            }}
          />
          <span style={{ fontSize: '10px', color: '#10B981', fontFamily: 'monospace', fontWeight: 600 }}>
            AST SYNC
          </span>
        </div>
      }
    >
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
        {/* Terminal Input Bar */}
        <div
          style={{
            backgroundColor: '#030712',
            borderRadius: '6px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontFamily: 'var(--font-mono, monospace)',
            fontSize: '12px',
            color: '#38BDF8',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <Terminal size={14} color="#38BDF8" style={{ flexShrink: 0 }} />
          <span style={{ color: '#64748B' }}>$</span>
          <span style={{ color: '#F1F5F9', whiteSpace: 'nowrap', overflow: 'hidden' }}>{terminalCommand}</span>
          {!reducedMotion && (
            <span
              style={{
                width: '6px',
                height: '13px',
                backgroundColor: '#38BDF8',
                display: 'inline-block',
                animation: 'pulse 1s infinite',
                marginLeft: '2px',
              }}
            />
          )}

          {/* Animated Scanning Sweep Beam */}
          {!reducedMotion && isVisible && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                width: '60px',
                background: 'linear-gradient(90deg, transparent, rgba(56, 189, 248, 0.25), transparent)',
                animation: 'scanningSweep 2.8s linear infinite',
                pointerEvents: 'none',
              }}
            />
          )}
        </div>

        {/* Filter Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {(['all', 'sast', 'secrets'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              style={{
                fontSize: '11px',
                fontFamily: 'var(--font-mono, monospace)',
                fontWeight: 600,
                padding: '4px 10px',
                borderRadius: '4px',
                border: activeTab === tab ? '1px solid #2563EB' : '1px solid rgba(255, 255, 255, 0.08)',
                backgroundColor: activeTab === tab ? '#1E293B' : 'transparent',
                color: activeTab === tab ? '#38BDF8' : '#94A3B8',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {tab === 'all' ? 'All (3)' : tab.toUpperCase()}
            </button>
          ))}
          <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#64748B', fontFamily: 'monospace' }}>
            Multi-Engine AST
          </span>
        </div>

        {/* Live Findings List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          {filtered.map((item) => (
            <div
              key={item.id}
              style={{
                backgroundColor: '#0F172A',
                border: '1px solid rgba(255, 255, 255, 0.07)',
                borderRadius: '8px',
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                transition: 'border-color 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                <span
                  style={{
                    fontSize: '10px',
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    color: item.sevColor,
                    backgroundColor: item.sevBg,
                    border: `1px solid ${item.sevColor}33`,
                    padding: '2px 7px',
                    borderRadius: '4px',
                    flexShrink: 0,
                  }}
                >
                  {item.sev}
                </span>

                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '12.5px',
                      fontWeight: 600,
                      color: '#F8FAFC',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {item.title}
                  </div>
                  <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#94A3B8', marginTop: '2px' }}>
                    <code style={{ color: '#38BDF8' }}>{item.file}</code>:{item.line} · {item.engine}
                  </div>
                </div>
              </div>

              <span
                style={{
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  color: '#10B981',
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                ISOLATED
              </span>
            </div>
          ))}
        </div>

        {/* Status Line */}
        <div
          style={{
            paddingTop: '10px',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11px',
            color: '#64748B',
            fontFamily: 'var(--font-mono, monospace)',
          }}
        >
          <span>3 findings isolated in 1.84s</span>
          <span style={{ color: '#10B981' }}>Semgrep + Gitleaks</span>
        </div>
      </div>
    </MacWindow>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   2. AUTO-FIX CARD (Split-pane code editor with OPA policy verification)
───────────────────────────────────────────────────────────────────────────── */
export function AutoFixCard() {
  const [selectedPolicy, setSelectedPolicy] = useState('no-unparameterized-sql');

  return (
    <MacWindow
      title="kavach/agent/synthesize-fix · OPA Policy Gate"
      badge="OPA VERIFIED"
      badgeColor="#10B981"
      headerAction={
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Sparkles size={13} color="#38BDF8" />
          <span style={{ fontSize: '10px', color: '#38BDF8', fontFamily: 'monospace', fontWeight: 600 }}>
            GEMINI 2.5 PRO
          </span>
        </div>
      }
    >
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
        {/* Policy Gate Header Pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            borderRadius: '6px',
            backgroundColor: '#0F172A',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            fontSize: '11px',
            fontFamily: 'var(--font-mono, monospace)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#94A3B8' }}>TARGET FILE:</span>
            <code style={{ color: '#38BDF8', fontWeight: 600 }}>auth/route.py:42</code>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981' }} />
            <span style={{ color: '#10B981', fontWeight: 700 }}>POLICY: ALLOW (SIGNED)</span>
          </div>
        </div>

        {/* Split Code Diff Window */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
            gap: '10px',
            fontFamily: 'var(--font-mono, monospace)',
            fontSize: '11px',
            lineHeight: 1.55,
          }}
        >
          {/* Left: Original Red */}
          <div
            style={{
              backgroundColor: '#050811',
              borderRadius: '6px',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '6px 10px',
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                borderBottom: '1px solid rgba(239, 68, 68, 0.15)',
                color: '#EF4444',
                fontWeight: 700,
                fontSize: '10.5px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>ORIGINAL (VULNERABLE)</span>
              <span style={{ fontSize: '10px' }}>LINE 41-43</span>
            </div>
            <div style={{ padding: '10px', color: '#94A3B8' }}>
              <div style={{ color: '#64748B' }}># Raw SQL concatenation</div>
              <div
                style={{
                  color: '#F87171',
                  backgroundColor: 'rgba(239, 68, 68, 0.12)',
                  padding: '2px 4px',
                  borderRadius: '3px',
                  marginTop: '4px',
                }}
              >
                - cursor.execute(f&quot;SELECT * FROM users WHERE id = &apos;&#123;user_id&#125;&apos;&quot;)
              </div>
              <div style={{ color: '#64748B', marginTop: '4px' }}>&nbsp;&nbsp;return cursor.fetchone()</div>
            </div>
          </div>

          {/* Right: Fixed Green */}
          <div
            style={{
              backgroundColor: '#050811',
              borderRadius: '6px',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '6px 10px',
                backgroundColor: 'rgba(16, 185, 129, 0.08)',
                borderBottom: '1px solid rgba(16, 185, 129, 0.15)',
                color: '#10B981',
                fontWeight: 700,
                fontSize: '10.5px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>AUTONOMOUS REMEDIATION</span>
              <span style={{ fontSize: '10px' }}>PARAMETERIZED</span>
            </div>
            <div style={{ padding: '10px', color: '#94A3B8' }}>
              <div style={{ color: '#64748B' }}># Parameterized SQL tuple</div>
              <div
                style={{
                  color: '#34D399',
                  backgroundColor: 'rgba(16, 185, 129, 0.14)',
                  padding: '2px 4px',
                  borderRadius: '3px',
                  marginTop: '4px',
                }}
              >
                + cursor.execute(&quot;SELECT * FROM users WHERE id = %s&quot;, (user_id,))
              </div>
              <div style={{ color: '#64748B', marginTop: '4px' }}>&nbsp;&nbsp;return cursor.fetchone()</div>
            </div>
          </div>
        </div>

        {/* AI Explanation & Invariant Badges */}
        <div
          style={{
            backgroundColor: '#030712',
            borderRadius: '6px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '10px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#94A3B8' }}>
            <CheckCircle2 size={13} color="#10B981" />
            <span style={{ color: '#F1F5F9', fontWeight: 600 }}>Deterministic Invariant Proof:</span>
            <span>Eliminates CWE-89 injection while preserving downstream dict cursor mapping.</span>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '2px' }}>
            <span
              style={{
                fontSize: '10px',
                fontFamily: 'monospace',
                color: '#38BDF8',
                backgroundColor: 'rgba(56, 189, 248, 0.1)',
                padding: '2px 6px',
                borderRadius: '3px',
                border: '1px solid rgba(56, 189, 248, 0.2)',
              }}
            >
              OPA: no-raw-fstrings [PASS]
            </span>
            <span
              style={{
                fontSize: '10px',
                fontFamily: 'monospace',
                color: '#10B981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                padding: '2px 6px',
                borderRadius: '3px',
                border: '1px solid rgba(16, 185, 129, 0.2)',
              }}
            >
              Semgrep Rescan: 0 Findings [PASS]
            </span>
          </div>
        </div>
      </div>
    </MacWindow>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   3. VERIFY CARD (GitHub PR Preview with passing checks & signed badge)
───────────────────────────────────────────────────────────────────────────── */
export function VerifyCard() {
  const [merged, setMerged] = useState(false);

  return (
    <MacWindow
      title="github.com/kavach-security/api · PR #418"
      badge="READY TO MERGE"
      badgeColor="#10B981"
      headerAction={
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <GitPullRequest size={13} color="#10B981" />
          <span style={{ fontSize: '10px', color: '#10B981', fontFamily: 'monospace', fontWeight: 600 }}>
            CHECKS PASSING (4/4)
          </span>
        </div>
      }
    >
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
        {/* PR Title & Branch Header */}
        <div
          style={{
            backgroundColor: '#0F172A',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '8px',
            padding: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '10px',
                fontFamily: 'monospace',
                fontWeight: 700,
                color: '#10B981',
                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                padding: '2px 6px',
                borderRadius: '4px',
              }}
            >
              OPEN
            </span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#F8FAFC' }}>
              PR #418: [Kavach Autofix] Parameterize SQL query in auth/route.py
            </span>
          </div>

          <div
            style={{
              fontSize: '11px',
              fontFamily: 'var(--font-mono, monospace)',
              color: '#94A3B8',
              marginTop: '6px',
            }}
          >
            Branch: <code style={{ color: '#38BDF8' }}>kavach/autofix-sqli-42</code> into{' '}
            <code style={{ color: '#F1F5F9' }}>main</code>
          </div>
        </div>

        {/* CI/CD Passing Checks Checklist */}
        <div
          style={{
            backgroundColor: '#030712',
            borderRadius: '6px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '10px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ fontSize: '10px', fontFamily: 'monospace', fontWeight: 700, color: '#64748B' }}>
            VERIFIED CI/CD ATTESTATIONS
          </div>

          {[
            { label: 'Semgrep SAST Regression Scan', desc: '0 Critical or High Findings', status: 'PASS' },
            { label: 'Deterministic OPA Rego Gate', desc: 'Cryptographically signed ALLOW', status: 'PASS' },
            { label: 'Ephemeral Sandbox Test', desc: '200 OK · 0 API regressions', status: 'PASS' },
            { label: 'SLSA Level 3 Provenance Ledger', desc: 'Signed hash in PostgreSQL audit log', status: 'SIGNED' },
          ].map((check, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '11.5px',
                color: '#CBD5E1',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Check size={13} color="#10B981" />
                <span>{check.label}</span>
                <span style={{ fontSize: '10px', color: '#64748B' }}>({check.desc})</span>
              </div>
              <span
                style={{
                  fontSize: '9.5px',
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  color: '#10B981',
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  padding: '1px 5px',
                  borderRadius: '3px',
                }}
              >
                {check.status}
              </span>
            </div>
          ))}
        </div>

        {/* Merge Button Action */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ fontSize: '11px', color: '#94A3B8', fontFamily: 'monospace' }}>
            {merged ? 'Merged into main (commit f81a0e)' : 'Ready for 1-click merge'}
          </div>

          <button
            type="button"
            onClick={() => setMerged(!merged)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              backgroundColor: merged ? '#1E293B' : '#10B981',
              color: merged ? '#94A3B8' : '#030712',
              fontWeight: 700,
              fontSize: '12px',
              borderRadius: '6px',
              border: merged ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: merged ? 'none' : '0 0 15px rgba(16, 185, 129, 0.3)',
            }}
          >
            <GitPullRequest size={14} />
            <span>{merged ? 'Merged (Click to Re-test)' : 'Merge Pull Request (Clean)'}</span>
          </button>
        </div>
      </div>
    </MacWindow>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   4. FLOW STRIP (The 6-Step Connected Pipeline)
───────────────────────────────────────────────────────────────────────────── */
interface FlowStripProps {
  activeStep: number;
  setActiveStep: (step: number) => void;
}

export function FlowStrip({ activeStep, setActiveStep }: FlowStripProps) {
  const steps = [
    { num: '01', title: 'AST Scan', desc: 'Semgrep + Gitleaks', icon: Terminal },
    { num: '02', title: 'AI Patch', desc: 'Gemini AST synthesis', icon: Sparkles },
    { num: '03', title: 'OPA Eval', desc: 'Deterministic Rego gate', icon: ShieldCheck },
    { num: '04', title: 'Sandbox Test', desc: 'Ephemeral isolation', icon: Activity },
    { num: '05', title: 'SLSA Sign', desc: 'Cryptographic ledger', icon: Lock },
    { num: '06', title: 'Verified PR', desc: 'Zero hallucination', icon: GitPullRequest },
  ];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: '10px',
        width: '100%',
      }}
    >
      {steps.map((step, idx) => {
        const Icon = step.icon;
        const isActive = activeStep === idx;
        return (
          <button
            key={idx}
            type="button"
            onClick={() => setActiveStep(idx)}
            style={{
              backgroundColor: isActive ? '#0F172A' : '#090D16',
              border: isActive ? '1px solid #2563EB' : '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '8px',
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: isActive ? '0 0 16px rgba(37, 99, 235, 0.25)' : 'none',
            }}
          >
            {isActive && (
              <span
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '2px',
                  backgroundColor: '#38BDF8',
                }}
              />
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span
                style={{
                  fontSize: '10px',
                  fontFamily: 'var(--font-mono, monospace)',
                  fontWeight: 700,
                  color: isActive ? '#38BDF8' : '#64748B',
                }}
              >
                {step.num}
              </span>
              <Icon size={14} color={isActive ? '#38BDF8' : '#64748B'} />
            </div>

            <div style={{ fontSize: '13px', fontWeight: 700, color: isActive ? '#FFFFFF' : '#CBD5E1' }}>
              {step.title}
            </div>

            <div style={{ fontSize: '11px', color: '#64748B', lineHeight: 1.3 }}>{step.desc}</div>
          </button>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   5. STATS ROW (The 4 Animated Metrics)
───────────────────────────────────────────────────────────────────────────── */
interface StatsRowProps {
  isVisible: boolean;
  reducedMotion: boolean;
}

export function StatsRow({ isVisible, reducedMotion }: StatsRowProps) {
  const stats = [
    {
      value: 100,
      suffix: '%',
      label: 'Deterministic Decision Accuracy',
      desc: 'Zero probabilistic LLM hallucination in approvals',
      color: '#38BDF8',
    },
    {
      value: 18,
      prefix: '< ',
      suffix: 'ms',
      label: 'Median OPA Policy Evaluation',
      desc: 'Local Rego compiled execution latency',
      color: '#10B981',
    },
    {
      value: 0,
      label: 'Unverified Merges Permitted',
      desc: 'Strict SLSA Level 3 provenance signing',
      color: '#F59E0B',
    },
    {
      value: 1,
      prefix: '< ',
      suffix: ' Click',
      label: 'Vulnerability to Verified PR',
      desc: 'Fully automated continuous remediation',
      color: '#A855F7',
    },
  ];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
        gap: '16px',
        padding: '24px clamp(16px, 3vw, 28px)',
        backgroundColor: '#090D16',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
      }}
    >
      {stats.map((stat, idx) => (
        <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div
            style={{
              fontSize: 'clamp(26px, 3.5vw, 36px)',
              fontWeight: 800,
              color: stat.color,
              lineHeight: 1.1,
            }}
          >
            <AnimatedCounter
              value={stat.value}
              prefix={stat.prefix}
              suffix={stat.suffix}
              isVisible={isVisible}
              reducedMotion={reducedMotion}
            />
          </div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#F1F5F9', marginTop: '4px' }}>
            {stat.label}
          </div>
          <div style={{ fontSize: '11.5px', color: '#64748B', lineHeight: 1.4 }}>{stat.desc}</div>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN COMPONENT: GoldenPathShowcase
───────────────────────────────────────────────────────────────────────────── */
export function GoldenPathShowcase() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  // Viewport IntersectionObserver & prefers-reduced-motion
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handleMotionChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handleMotionChange);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.15 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      mq.removeEventListener('change', handleMotionChange);
      observer.disconnect();
    };
  }, []);

  return (
    <section
      ref={containerRef}
      style={{
        backgroundColor: '#070A12',
        color: '#FFFFFF',
        padding: 'clamp(48px, 6vw, 84px) clamp(16px, 3vw, 24px)',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        width: '100%',
        boxSizing: 'border-box',
        overflowX: 'hidden',
        position: 'relative',
      }}
    >
      <div style={{ maxWidth: '1380px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '36px' }}>
        {/* Section Header */}
        <div style={{ textAlign: 'center', maxWidth: '820px', margin: '0 auto' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '20px',
              backgroundColor: 'rgba(56, 189, 248, 0.1)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              color: '#38BDF8',
              fontSize: '11.5px',
              fontWeight: 600,
              fontFamily: 'var(--font-mono, monospace)',
              marginBottom: '14px',
            }}
          >
            <Sparkles size={13} />
            <span>KAVACH GOLDEN PATH · AUTOMATED END-TO-END DEMO</span>
          </div>

          <h2
            style={{
              fontSize: 'clamp(28px, 4.5vw, 44px)',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              lineHeight: 1.15,
              margin: '0 0 14px 0',
              color: '#FFFFFF',
            }}
          >
            Experience Autonomous Security with Deterministic Verification
          </h2>

          <p
            style={{
              fontSize: 'clamp(14px, 2vw, 16px)',
              color: '#94A3B8',
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            Multi-engine AST discovery feeds an autonomous patch synthesizer, verified against strict OPA invariants
            and sealed with cryptographic SLSA Level 3 attestations before creating an authenticated pull request.
          </p>
        </div>

        {/* 6-Step Connected Flow Strip */}
        <FlowStrip activeStep={activeStep} setActiveStep={setActiveStep} />

        {/* 3 Main Feature Cards (Scan HUD, Auto-Fix, Verify) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))',
            gap: '24px',
            alignItems: 'stretch',
          }}
        >
          {/* Card 1: Scan HUD */}
          <ScanHud isVisible={isVisible} reducedMotion={reducedMotion} />

          {/* Card 2: Auto-Fix Split Diff */}
          <AutoFixCard />

          {/* Card 3: Verify & Pull Request */}
          <VerifyCard />
        </div>

        {/* 4 Animated Stats Row */}
        <StatsRow isVisible={isVisible} reducedMotion={reducedMotion} />
      </div>

      {/* Embedded CSS Animations */}
      <style jsx>{`
        @keyframes scanningSweep {
          0% {
            left: -60px;
          }
          100% {
            left: 100%;
          }
        }
        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.2;
          }
        }
      `}</style>
    </section>
  );
}

export default GoldenPathShowcase;

