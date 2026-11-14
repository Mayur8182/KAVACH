'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import {
  Shield,
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowRight,
  GitPullRequest,
  Terminal,
  Activity,
  Sparkles,
  Zap,
  Code2,
  Database,
  Search,
  ExternalLink,
  Bot,
  UserCheck,
  Cpu,
  Layers,
  Cloud,
  Network,
  Server,
  ShieldAlert,
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────────
   TYPING ANIMATION HOOK (Loops string letter-by-letter every cycle)
───────────────────────────────────────────────────────────────────────────── */
function useTypewriter(words: string[], typingSpeed = 45, pauseTime = 3000) {
  const [displayText, setDisplayText] = useState('');
  const [wordIndex, setWordIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    const currentWord = words[wordIndex % words.length];

    if (!isDeleting && displayText === currentWord) {
      timer = setTimeout(() => setIsDeleting(true), pauseTime);
    } else if (isDeleting && displayText === '') {
      setIsDeleting(false);
      setWordIndex((prev) => prev + 1);
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
  }, [displayText, isDeleting, wordIndex, words, typingSpeed, pauseTime]);

  return displayText;
}

/* ─────────────────────────────────────────────────────────────────────────────
   ANIMATED NUMBER COUNTER (Triggers when in view)
───────────────────────────────────────────────────────────────────────────── */
function AnimatedCounter({ value, suffix = '', prefix = '' }: { value: number; suffix?: string; prefix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const duration = 1600;
    const stepTime = 20;
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
  }, [isInView, value]);

  return (
    <span ref={ref} style={{ fontFamily: 'JetBrains Mono, monospace' }}>
      {prefix}
      {count}
      {suffix}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MACOS WINDOW CARD CHROME WRAPPER
───────────────────────────────────────────────────────────────────────────── */
interface MockupWindowProps {
  title: string;
  badge?: string;
  badgeColor?: string;
  children: React.ReactNode;
}

function MockupWindow({
  title,
  badge = 'VERIFIED SECURE',
  badgeColor = '#10B981',
  children,
}: MockupWindowProps) {
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '560px',
        margin: '0 auto',
      }}
    >
      {/* Soft Halftone / Teal Radial Background Glow */}
      <div
        style={{
          position: 'absolute',
          inset: '-20px -20px -20px -20px',
          background:
            'radial-gradient(circle at 50% 40%, rgba(37, 99, 235, 0.18) 0%, rgba(16, 185, 129, 0.12) 40%, transparent 70%)',
          borderRadius: '24px',
          filter: 'blur(32px)',
          zIndex: 0,
          pointerEvents: 'none',
        }}
      />

      {/* Dotted Pattern Overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'radial-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px)',
          backgroundSize: '16px 16px',
          zIndex: 0,
          pointerEvents: 'none',
          borderRadius: '16px',
          opacity: 0.6,
        }}
      />

      {/* Main Glassmorphic Window Container */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          backgroundColor: '#090D16',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '16px',
          boxShadow:
            '0 25px 60px -15px rgba(0, 0, 0, 0.75), 0 0 1px 1px rgba(255, 255, 255, 0.08)',
          overflow: 'hidden',
          fontFamily: 'Inter, -apple-system, sans-serif',
        }}
      >
        {/* macOS Title Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 18px',
            backgroundColor: '#0F172A',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          {/* Window Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#EF4444' }} />
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#F59E0B' }} />
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10B981' }} />
            <span
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#94A3B8',
                marginLeft: '8px',
                fontFamily: 'JetBrains Mono, monospace',
              }}
            >
              {title}
            </span>
          </div>

          {/* Right Status Badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '3px 9px',
              borderRadius: '20px',
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              fontSize: '10.5px',
              fontWeight: 700,
              color: badgeColor,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: badgeColor,
                boxShadow: `0 0 8px ${badgeColor}`,
              }}
            />
            {badge}
          </div>
        </div>

        {/* Window Body */}
        <div style={{ padding: '20px' }}>{children}</div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   FEATURE 1 MOCKUP: MULTI-ENGINE AST DISCOVERY
───────────────────────────────────────────────────────────────────────────── */
export function DiscoveryMockup() {
  const typedQuery = useTypewriter([
    'filter: severity:critical rule:ast/cwe-89',
    'audit: branch:main engines:semgrep+trivy',
    'scan: status:running coverage:100%',
  ]);

  const findings = [
    {
      engine: 'Semgrep AST',
      vuln: 'Raw SQL Query Parameterization',
      file: 'auth/route.py:42',
      cve: 'CWE-89',
      status: 'Critical Alert',
      statusColor: '#EF4444',
      badge: 'Verified Taint',
    },
    {
      engine: 'Gitleaks v8',
      vuln: 'High-Entropy AWS Secret Token',
      file: 'config/secrets.env:14',
      cve: 'CWE-798',
      status: 'Secret Leak',
      statusColor: '#F59E0B',
      badge: 'Entropy 99.4%',
    },
    {
      engine: 'Trivy SCA',
      vuln: 'Unpinned Remote Code Execution',
      file: 'package.json:28',
      cve: 'CVE-2024-4367',
      status: 'High Supply-Chain',
      statusColor: '#38BDF8',
      badge: 'Fix Available',
    },
  ];

  return (
    <MockupWindow title="Kavach Engine · payment-service/main" badge="Live Discovery" badgeColor="#38BDF8">
      {/* Mock Search / Filter bar with Typewriter Animation */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          backgroundColor: '#060910',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '8px',
          padding: '8px 12px',
          marginBottom: '16px',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '12px',
          color: '#E2E8F0',
        }}
      >
        <Search size={14} color="#60A5FA" />
        <span style={{ color: '#94A3B8' }}>$ kavach scan --filter</span>
        <span style={{ color: '#38BDF8', fontWeight: 600 }}>{typedQuery}</span>
        <span
          style={{
            display: 'inline-block',
            width: '2px',
            height: '14px',
            backgroundColor: '#38BDF8',
            animation: 'pulse 1s infinite',
          }}
        />
      </div>

      {/* Rows of Findings */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {findings.map((f, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.15 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontFamily: 'JetBrains Mono, monospace',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(255, 255, 255, 0.06)',
                  color: '#94A3B8',
                }}
              >
                {f.engine}
              </span>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#F8FAFC' }}>{f.vuln}</div>
                <div style={{ fontSize: '11px', color: '#64748B', fontFamily: 'JetBrains Mono, monospace' }}>
                  {f.file} · {f.cve}
                </div>
              </div>
            </div>

            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: '6px',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: `1px solid ${f.statusColor}44`,
                color: f.statusColor,
              }}
            >
              {f.badge}
            </span>
          </motion.div>
        ))}
      </div>
    </MockupWindow>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   FEATURE 2 MOCKUP: OPA DETERMINISTIC POLICY VERIFICATION
───────────────────────────────────────────────────────────────────────────── */
export function PolicyVerdictMockup() {
  const typedPolicy = useTypewriter([
    'opa eval --data policies/invariants.rego "data.kavach.allow"',
    'verify: ast.no_sql_injection == true',
    'enforce: slsa_level_3 == true',
  ]);

  return (
    <MockupWindow title="Decision Gate · OPA Rego v0.68" badge="Signed Verdict" badgeColor="#10B981">
      {/* Script Execution Terminal */}
      <div
        style={{
          padding: '10px 14px',
          backgroundColor: '#060910',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '8px',
          marginBottom: '14px',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '11.5px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <Terminal size={14} color="#34D399" />
        <span style={{ color: '#34D399' }}>$</span>
        <span style={{ color: '#F1F5F9' }}>{typedPolicy}</span>
      </div>

      {/* Side-by-Side Unified Diff */}
      <div
        style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '11.5px',
          borderRadius: '8px',
          overflow: 'hidden',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          marginBottom: '16px',
        }}
      >
        <div style={{ backgroundColor: '#0B0F19', padding: '6px 12px', color: '#64748B', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
          auth/route.py (AST Remediation)
        </div>
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.12)', color: '#FCA5A5', padding: '6px 12px', borderLeft: '3px solid #EF4444' }}>
          - query = f&quot;SELECT * FROM users WHERE email=&apos;{'{email}'}&apos;&quot;
        </div>
        <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.12)', color: '#6EE7B7', padding: '6px 12px', borderLeft: '3px solid #10B981' }}>
          + query = &quot;SELECT * FROM users WHERE email=:email&quot;, {`{"email": email}`}
        </div>
      </div>

      {/* OPA Verification Result Pill */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          backgroundColor: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ShieldCheck size={18} color="#34D399" />
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#F8FAFC' }}>
              OPA Rego Blueprint: ALLOW
            </div>
            <div style={{ fontSize: '11px', color: '#94A3B8', fontFamily: 'JetBrains Mono, monospace' }}>
              sha256:8f3c19... verified zero regressions
            </div>
          </div>
        </div>
        <span
          style={{
            fontSize: '11px',
            fontWeight: 700,
            color: '#10B981',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          ✓ Signed
        </span>
      </div>
    </MockupWindow>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   FEATURE: AUTONOMOUS CLOUD SECURITY AGENT (MASTER + 18 SPECIALISTS)
───────────────────────────────────────────────────────────────────────────── */
export function CloudAgentMockup() {
  const [fixed, setFixed] = useState(false);

  return (
    <MockupWindow title="Master Cloud Agent · AWS us-east-1" badge="18 Specialists Active" badgeColor="#38BDF8">
      {/* Topology summary banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          backgroundColor: '#060910',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '8px',
          marginBottom: '14px',
          fontSize: '11px',
          fontFamily: 'JetBrains Mono, monospace',
        }}
      >
        <span style={{ color: '#94A3B8' }}>AWS STS Session: <span style={{ color: '#38BDF8' }}>KavachReadOnly</span></span>
        <span style={{ color: fixed ? '#34D399' : '#F87171', fontWeight: 700 }}>
          {fixed ? '● 0 Attack Paths' : '● 1 Critical Path'}
        </span>
      </div>

      {/* Visual Attack Path Nodes */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '8px',
          marginBottom: '14px',
          textAlign: 'center',
          alignItems: 'center',
        }}
      >
        <div style={{ backgroundColor: '#0B0F19', padding: '8px 4px', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <Network size={14} color="#94A3B8" style={{ margin: '0 auto 2px' }} />
          <div style={{ fontSize: '10px', color: '#F1F5F9', fontWeight: 600 }}>0.0.0.0/0</div>
          <div style={{ fontSize: '8.5px', color: '#64748B' }}>Internet</div>
        </div>

        <div style={{ backgroundColor: '#0B0F19', padding: '8px 4px', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <Server size={14} color="#38BDF8" style={{ margin: '0 auto 2px' }} />
          <div style={{ fontSize: '10px', color: '#F1F5F9', fontWeight: 600 }}>ALB Ingress</div>
          <div style={{ fontSize: '8.5px', color: '#64748B' }}>Port 443</div>
        </div>

        <div
          style={{
            backgroundColor: fixed ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.12)',
            padding: '8px 4px',
            borderRadius: '6px',
            border: fixed ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
          }}
        >
          <Database size={14} color={fixed ? '#34D399' : '#EF4444'} style={{ margin: '0 auto 2px' }} />
          <div style={{ fontSize: '10px', color: fixed ? '#34D399' : '#F87171', fontWeight: 700 }}>RDS Aurora</div>
          <div style={{ fontSize: '8.5px', color: '#94A3B8' }}>{fixed ? 'Private' : 'Public:5432'}</div>
        </div>

        <div
          style={{
            backgroundColor: fixed ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.12)',
            padding: '8px 4px',
            borderRadius: '6px',
            border: fixed ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)',
          }}
        >
          <Layers size={14} color={fixed ? '#34D399' : '#F59E0B'} style={{ margin: '0 auto 2px' }} />
          <div style={{ fontSize: '10px', color: fixed ? '#34D399' : '#FBBF24', fontWeight: 700 }}>S3 Lake</div>
          <div style={{ fontSize: '8.5px', color: '#94A3B8' }}>{fixed ? 'Secured' : 'Public ACL'}</div>
        </div>
      </div>

      {/* Choke Point Alert and Fix Action */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          backgroundColor: fixed ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
          border: fixed ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(239, 68, 68, 0.25)',
          borderRadius: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {fixed ? <CheckCircle2 size={16} color="#34D399" /> : <ShieldAlert size={16} color="#EF4444" />}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: fixed ? '#34D399' : '#F87171' }}>
              {fixed ? 'Cloud Perimeter Hardened' : 'Attack Path Choke Point: RDS Ingress'}
            </div>
            <div style={{ fontSize: '10.5px', color: '#94A3B8', fontFamily: 'monospace' }}>
              {fixed ? 'Rescan verified 0 exposures · Terraform committed' : 'Direct public access to production database'}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setFixed(!fixed)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            backgroundColor: fixed ? '#0F172A' : '#10B981',
            color: '#FFFFFF',
            border: fixed ? '1px solid rgba(255, 255, 255, 0.15)' : 'none',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {fixed ? 'Reset' : 'Execute Fix'}
        </button>
      </div>
    </MockupWindow>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   FEATURE 3 MOCKUP: 1-CLICK VERIFIED GITHUB PULL REQUEST
───────────────────────────────────────────────────────────────────────────── */
export function PrMockup() {
  return (
    <MockupWindow title="GitHub · kavach/autofix-sqli-42 #819" badge="Verified PR" badgeColor="#3B82F6">
      {/* PR Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: 'rgba(59, 130, 246, 0.15)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#60A5FA',
            flexShrink: 0,
          }}
        >
          <GitPullRequest size={16} />
        </div>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#F8FAFC', marginBottom: '4px' }}>
            fix(auth): Parameterize raw SQL queries in auth/route.py
          </div>
          <div style={{ fontSize: '12px', color: '#94A3B8', fontFamily: 'JetBrains Mono, monospace' }}>
            Branch <span style={{ color: '#60A5FA' }}>kavach/autofix-sqli-42</span> into <span style={{ color: '#E2E8F0' }}>main</span>
          </div>
        </div>
      </div>

      {/* CI/CD Passing Checks List */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          padding: '12px',
          backgroundColor: '#060910',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '8px',
          marginBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#E2E8F0' }}>
          <CheckCircle2 size={14} color="#10B981" />
          <span>Kavach AST Rescan — CWE-89 eliminated (0 findings)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#E2E8F0' }}>
          <CheckCircle2 size={14} color="#10B981" />
          <span>Deterministic OPA Gatekeeper — All invariants satisfied</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#E2E8F0' }}>
          <CheckCircle2 size={14} color="#10B981" />
          <span>SLSA Level 3 Cryptographic Attestation — Signed</span>
        </div>
      </div>

      {/* 1-Click Action Button */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ fontSize: '11px', color: '#64748B' }}>Ready to merge · Zero human security debt</span>
        <button
          type="button"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            backgroundColor: '#10B981',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '6px',
            fontSize: '12.5px',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)',
          }}
        >
          <span>Merge Pull Request</span>
          <ArrowRight size={13} />
        </button>
      </div>
    </MockupWindow>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN FUSE-STYLE PRODUCT SHOWCASE SECTION
───────────────────────────────────────────────────────────────────────────── */
export const FuseProductShowcase: React.FC = () => {
  const [mode, setMode] = useState<'autonomous' | 'collaborative'>('autonomous');

  const steps = [
    {
      num: '01',
      badge: 'CONTINUOUS MULTI-ENGINE DISCOVERY',
      title: 'Real multi-engine scanners execute in under 4 seconds.',
      desc: 'Kavach runs semantic AST parsing with Semgrep, entropy secret auditing with Gitleaks, and CVE vulnerability analysis concurrently in a sandboxed runtime. Zero simulated scan results.',
      mockup: <DiscoveryMockup />,
    },
    {
      num: '02',
      badge: 'AUTONOMOUS CLOUD AGENTS',
      title: 'Master Cloud Agent coordinates 18 specialist agents.',
      desc: 'Connect AWS, Azure, or GCP. Kavach maps multi-cloud topologies, traces ingress paths from the public internet down to databases and storage, and pinpoints exploit choke points automatically.',
      mockup: <CloudAgentMockup />,
    },
    {
      num: '03',
      badge: 'DETERMINISTIC DECISION GATE',
      title: 'LLM proposes. Deterministic OPA security policies decide.',
      desc: 'Never trust an unverified AI code suggestion. Kavach passes every synthesized patch through cryptographic OPA Rego blueprints to ensure zero regressions and verified syntax invariants.',
      mockup: <PolicyVerdictMockup />,
    },
    {
      num: '04',
      badge: 'ONE-CLICK VERIFIED RESOLUTION',
      title: 'From critical alert to verified GitHub PR in 1 click.',
      desc: 'Autonomous remediation that engineering teams actually trust. Kavach creates a dedicated git branch, runs rescan verification tests, and publishes a signed pull request with SLSA Level 3 attestations.',
      mockup: <PrMockup />,
    },
  ];

  return (
    <section
      id="fuse-product-showcase"
      style={{
        position: 'relative',
        backgroundColor: '#070A12',
        color: '#F8FAFC',
        padding: 'clamp(64px, 8vw, 120px) 24px',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        overflow: 'hidden',
        fontFamily: 'Inter, -apple-system, sans-serif',
      }}
    >
      {/* Background Ambient Glows */}
      <div
        style={{
          position: 'absolute',
          top: '15%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '800px',
          height: '400px',
          background: 'radial-gradient(circle, rgba(37, 99, 235, 0.12) 0%, transparent 70%)',
          filter: 'blur(80px)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ maxWidth: '1240px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        {/* Section Header */}
        <div style={{ textAlign: 'center', maxWidth: '780px', margin: '0 auto clamp(40px, 6vw, 64px)' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              backgroundColor: 'rgba(56, 189, 248, 0.1)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              borderRadius: '24px',
              fontSize: '12px',
              fontWeight: 700,
              color: '#38BDF8',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              marginBottom: '18px',
            }}
          >
            <Sparkles size={14} />
            <span>Interactive Security Walkthrough</span>
          </div>

          <h2
            style={{
              fontSize: 'clamp(28px, 4.5vw, 48px)',
              fontWeight: 800,
              color: '#FFFFFF',
              letterSpacing: '-0.03em',
              lineHeight: 1.15,
              margin: '0 0 16px',
            }}
          >
            See how autonomous defense works.
            <br />
            <span
              style={{
                background: 'linear-gradient(135deg, #60A5FA 0%, #34D399 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Step by step, without the guesswork.
            </span>
          </h2>

          <p style={{ fontSize: '16px', color: '#94A3B8', lineHeight: 1.6, margin: '0 0 24px' }}>
            Experience the complete DevSecOps golden path: from instant multi-scanner discovery to
            cryptographic policy verification and automated GitHub pull requests.
          </p>

          {/* Human / Machine Mode Toggle */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '4px',
              backgroundColor: '#0F172A',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '30px',
              gap: '4px',
            }}
          >
            <button
              type="button"
              onClick={() => setMode('autonomous')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 16px',
                borderRadius: '20px',
                border: 'none',
                backgroundColor: mode === 'autonomous' ? '#2563EB' : 'transparent',
                color: mode === 'autonomous' ? '#FFFFFF' : '#94A3B8',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Cpu size={14} />
              <span>Autonomous Mode</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('collaborative')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 16px',
                borderRadius: '20px',
                border: 'none',
                backgroundColor: mode === 'collaborative' ? '#2563EB' : 'transparent',
                color: mode === 'collaborative' ? '#FFFFFF' : '#94A3B8',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <UserCheck size={14} />
              <span>Human Co-Pilot Mode</span>
            </button>
          </div>
        </div>

        {/* ── 3 Golden Path Steps (Text Left, Mockup Card Right) ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(54px, 8vw, 96px)' }}>
          {steps.map((step, idx) => (
            <div
              key={step.num}
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 460px), 1fr))',
                gap: 'clamp(32px, 5vw, 64px)',
                alignItems: 'center',
              }}
            >
              {/* Left Column: Story Copy */}
              <div style={{ order: idx % 2 === 1 ? 2 : 1 }}>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#38BDF8',
                    fontFamily: 'JetBrains Mono, monospace',
                    marginBottom: '12px',
                  }}
                >
                  <span style={{ color: '#60A5FA' }}>{step.num} ·</span>
                  <span>{step.badge}</span>
                </div>

                <h3
                  style={{
                    fontSize: 'clamp(22px, 3vw, 32px)',
                    fontWeight: 800,
                    color: '#F8FAFC',
                    letterSpacing: '-0.02em',
                    lineHeight: 1.25,
                    margin: '0 0 16px',
                  }}
                >
                  {step.title}
                </h3>

                <p style={{ fontSize: '15px', color: '#94A3B8', lineHeight: 1.65, margin: '0 0 24px' }}>
                  {step.desc}
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <Link
                    href="/home"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '13.5px',
                      fontWeight: 600,
                      color: '#60A5FA',
                      textDecoration: 'none',
                    }}
                  >
                    <span>Test in Sandbox</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>

              {/* Right Column: Fake Animated Product Mockup Window */}
              <div style={{ order: idx % 2 === 1 ? 1 : 2 }}>{step.mockup}</div>
            </div>
          ))}
        </div>

        {/* ── Connected Flow Diagram (SVG Animated Connector) ── */}
        <div style={{ marginTop: 'clamp(64px, 9vw, 110px)', textAlign: 'center' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#38BDF8', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '12px' }}>
            DATA ARCHITECTURE PIPELINE
          </div>
          <h3 style={{ fontSize: 'clamp(20px, 2.8vw, 30px)', fontWeight: 800, color: '#FFFFFF', marginBottom: '36px' }}>
            Continuous deterministic flow from AST syntax to Git
          </h3>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '24px',
              position: 'relative',
            }}
          >
            {/* Box 1 */}
            <div
              style={{
                backgroundColor: '#0F172A',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '24px 20px',
                textAlign: 'left',
              }}
            >
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: 'rgba(56, 189, 248, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38BDF8', marginBottom: '14px' }}>
                <Code2 size={18} />
              </div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#F8FAFC', marginBottom: '4px' }}>
                1. Multi-Engine Scanners
              </div>
              <div style={{ fontSize: '12.5px', color: '#94A3B8', lineHeight: 1.5 }}>
                Semgrep AST, Gitleaks, Trivy & Checkov parse repositories simultaneously.
              </div>
            </div>

            {/* Box 2 */}
            <div
              style={{
                backgroundColor: '#0F172A',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '12px',
                padding: '24px 20px',
                textAlign: 'left',
                boxShadow: '0 0 20px rgba(16, 185, 129, 0.08)',
              }}
            >
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34D399', marginBottom: '14px' }}>
                <ShieldCheck size={18} />
              </div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#F8FAFC', marginBottom: '4px' }}>
                2. Deterministic OPA Gate
              </div>
              <div style={{ fontSize: '12.5px', color: '#94A3B8', lineHeight: 1.5 }}>
                Cryptographic Rego policies evaluate patches. Zero hallucinations allowed.
              </div>
            </div>

            {/* Box 3 */}
            <div
              style={{
                backgroundColor: '#0F172A',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '12px',
                padding: '24px 20px',
                textAlign: 'left',
              }}
            >
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60A5FA', marginBottom: '14px' }}>
                <GitPullRequest size={18} />
              </div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#F8FAFC', marginBottom: '4px' }}>
                3. Signed GitHub PR
              </div>
              <div style={{ fontSize: '12.5px', color: '#94A3B8', lineHeight: 1.5 }}>
                SLSA Level 3 attestations attached. Automatically merged into developer workflow.
              </div>
            </div>
          </div>
        </div>

        {/* ── Stats Strip with Count-Up Numbers ── */}
        <div
          style={{
            marginTop: 'clamp(54px, 7vw, 84px)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '24px',
            padding: '28px 24px',
            backgroundColor: '#090D16',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            textAlign: 'center',
          }}
        >
          <div>
            <div style={{ fontSize: 'clamp(28px, 3.5vw, 42px)', fontWeight: 800, color: '#38BDF8', marginBottom: '4px' }}>
              <AnimatedCounter value={100} suffix="%" />
            </div>
            <div style={{ fontSize: '12.5px', color: '#94A3B8', fontWeight: 500 }}>
              Deterministic Decision Accuracy
            </div>
          </div>

          <div>
            <div style={{ fontSize: 'clamp(28px, 3.5vw, 42px)', fontWeight: 800, color: '#34D399', marginBottom: '4px' }}>
              <AnimatedCounter value={18} suffix="ms" />
            </div>
            <div style={{ fontSize: '12.5px', color: '#94A3B8', fontWeight: 500 }}>
              Median OPA Policy Evaluation Latency
            </div>
          </div>

          <div>
            <div style={{ fontSize: 'clamp(28px, 3.5vw, 42px)', fontWeight: 800, color: '#F8FAFC', marginBottom: '4px' }}>
              <AnimatedCounter value={0} suffix=" Alerts" />
            </div>
            <div style={{ fontSize: '12.5px', color: '#94A3B8', fontWeight: 500 }}>
              Hallucinated or Unverified PRs
            </div>
          </div>

          <div>
            <div style={{ fontSize: 'clamp(28px, 3.5vw, 42px)', fontWeight: 800, color: '#60A5FA', marginBottom: '4px' }}>
              <AnimatedCounter value={1} prefix="<" suffix=" Click" />
            </div>
            <div style={{ fontSize: '12.5px', color: '#94A3B8', fontWeight: 500 }}>
              From Vulnerability to Verified PR
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FuseProductShowcase;

