'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

/* ─────────────────────────────────────────────────────────────────────────────
   REDUCED MOTION HELPER HOOK
───────────────────────────────────────────────────────────────────────────── */
function useReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return reducedMotion;
}

/* ─────────────────────────────────────────────────────────────────────────────
   ANIMATED STAT COUNTER
───────────────────────────────────────────────────────────────────────────── */
function StatCounter({ target, suffix = '', isVisible, reducedMotion }: { target: number; suffix?: string; isVisible: boolean; reducedMotion: boolean }) {
  const [val, setVal] = useState(reducedMotion ? target : 0);

  useEffect(() => {
    if (reducedMotion) {
      setVal(target);
      return;
    }
    if (!isVisible) return;

    let start = 0;
    const duration = 1200;
    const stepTime = 25;
    const steps = duration / stepTime;
    const inc = target / steps;

    const timer = setInterval(() => {
      start += inc;
      if (start >= target) {
        setVal(target);
        clearInterval(timer);
      } else {
        setVal(Math.floor(start));
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [isVisible, target, reducedMotion]);

  return (
    <span>
      {val}
      {suffix}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   1. SCAN HUD SUB-COMPONENT (Step 1)
───────────────────────────────────────────────────────────────────────────── */
const ENGINES = [
  { name: 'Git clone', type: 'checkout' },
  { name: 'Gitleaks', type: 'secrets' },
  { name: 'Semgrep', type: 'SAST' },
  { name: 'Trivy', type: 'SCA, containers' },
  { name: 'OPA', type: 'policy gate' },
];

export function ScanHud({ isVisible, reducedMotion }: { isVisible: boolean; reducedMotion: boolean }) {
  const [engineStates, setEngineStates] = useState<('queued' | 'running' | 'done')[]>(
    reducedMotion ? ['done', 'done', 'done', 'done', 'done'] : ['queued', 'queued', 'queued', 'queued', 'queued']
  );
  const [summary, setSummary] = useState(
    reducedMotion ? '5 findings: 1 critical, 2 high, 2 medium' : 'Waiting for scan'
  );

  useEffect(() => {
    if (reducedMotion) {
      setEngineStates(['done', 'done', 'done', 'done', 'done']);
      setSummary('5 findings: 1 critical, 2 high, 2 medium');
      return;
    }
    if (!isVisible) return;

    let isMounted = true;
    let timeoutId: NodeJS.Timeout;

    async function runLoop() {
      while (isMounted) {
        // Reset to queued
        setEngineStates(['queued', 'queued', 'queued', 'queued', 'queued']);
        setSummary('Scanning the main branch');
        await new Promise((r) => { timeoutId = setTimeout(r, 600); });
        if (!isMounted) break;

        // Run engines one by one
        for (let i = 0; i < ENGINES.length; i++) {
          if (!isMounted) break;
          setEngineStates((prev) => {
            const next = [...prev];
            next[i] = 'running';
            return next;
          });
          await new Promise((r) => { timeoutId = setTimeout(r, 800); });
          if (!isMounted) break;

          setEngineStates((prev) => {
            const next = [...prev];
            next[i] = 'done';
            return next;
          });
        }

        if (!isMounted) break;
        setSummary('5 findings: 1 critical, 2 high, 2 medium');
        await new Promise((r) => { timeoutId = setTimeout(r, 3400); });
      }
    }

    runLoop();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [isVisible, reducedMotion]);

  return (
    <div className="gps-feat">
      <div className="gps-txt">
        <span className="gps-step">Step 1</span>
        <h2>Six engines scan in parallel</h2>
        <p>
          Connect a GitHub repo and run one scan. Semgrep, Gitleaks, Trivy and OPA run on the real
          code, so every finding comes from a scanner and not from a guess.
        </p>
      </div>

      <div className="gps-stage">
        <div className="gps-win">
          <div className="gps-bar">
            <i style={{ backgroundColor: '#F87171' }} />
            <i style={{ backgroundColor: '#FBBF24' }} />
            <i style={{ backgroundColor: '#4ADE9A' }} />
            <span>Scan: api-service, main</span>
          </div>

          <div className="gps-body">
            {ENGINES.map((engine, idx) => {
              const state = engineStates[idx];
              return (
                <div key={engine.name} className={`gps-row ${state}`}>
                  <b>{engine.name}</b>
                  <em>{engine.type}</em>
                  <div className="gps-pb">
                    <u style={{ width: state === 'done' ? '100%' : state === 'running' ? '65%' : '0%' }} />
                  </div>
                  <span className="gps-st">{state}</span>
                </div>
              );
            })}

            <div className="gps-sum">
              <b>{summary}</b>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   2. AUTO-FIX CARD SUB-COMPONENT (Step 2)
───────────────────────────────────────────────────────────────────────────── */
export function AutoFixCard({ isVisible, reducedMotion }: { isVisible: boolean; reducedMotion: boolean }) {
  const [badHit, setBadHit] = useState(reducedMotion);
  const [genPressed, setGenPressed] = useState(false);
  const [fixText, setFixText] = useState(
    reducedMotion ? 'db.query("SELECT * FROM users WHERE id = $1", [id])' : ''
  );
  const [opaActive, setOpaActive] = useState(reducedMotion);

  useEffect(() => {
    if (reducedMotion) {
      setBadHit(true);
      setFixText('db.query("SELECT * FROM users WHERE id = $1", [id])');
      setOpaActive(true);
      return;
    }
    if (!isVisible) return;

    let isMounted = true;
    let timeoutId: NodeJS.Timeout;
    const targetFix = 'db.query("SELECT * FROM users WHERE id = $1", [id])';

    async function runLoop() {
      while (isMounted) {
        // Reset
        setBadHit(false);
        setFixText('');
        setOpaActive(false);
        setGenPressed(false);
        await new Promise((r) => { timeoutId = setTimeout(r, 800); });
        if (!isMounted) break;

        // Highlight vulnerable line
        setBadHit(true);
        await new Promise((r) => { timeoutId = setTimeout(r, 900); });
        if (!isMounted) break;

        // Button press effect
        setGenPressed(true);
        await new Promise((r) => { timeoutId = setTimeout(r, 350); });
        setGenPressed(false);
        if (!isMounted) break;

        // Type fix character by character
        for (let i = 1; i <= targetFix.length; i++) {
          if (!isMounted) break;
          setFixText(targetFix.substring(0, i));
          await new Promise((r) => { timeoutId = setTimeout(r, 22); });
        }

        if (!isMounted) break;
        await new Promise((r) => { timeoutId = setTimeout(r, 400); });
        if (!isMounted) break;

        // OPA verified badge lights up
        setOpaActive(true);
        await new Promise((r) => { timeoutId = setTimeout(r, 3400); });
      }
    }

    runLoop();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [isVisible, reducedMotion]);

  return (
    <div className="gps-feat gps-rev">
      <div className="gps-txt">
        <span className="gps-step">Step 2</span>
        <h2>Open a finding. Get the smallest fix.</h2>
        <p>
          Each finding shows the exact line and the taint path. Generate Auto-Fix and Kavach
          writes a one-line patch instead of a vague suggestion.
        </p>
      </div>

      <div className="gps-stage">
        <div className="gps-win">
          <div className="gps-bar">
            <i style={{ backgroundColor: '#F87171' }} />
            <i style={{ backgroundColor: '#FBBF24' }} />
            <i style={{ backgroundColor: '#4ADE9A' }} />
            <span>Finding: CWE-89 in auth/route.py:42</span>
          </div>

          <div className="gps-body">
            <div className="gps-top">
              <strong>SQL injection (Semgrep SAST)</strong>
              <span className="gps-tag">Critical</span>
            </div>

            <pre>
              <span className={`gps-ln gps-d ${badHit ? 'gps-hit' : ''}`}>
                db.query(&quot;SELECT * FROM users WHERE id = &quot; + id)
              </span>
              <span className="gps-ln gps-a">
                <span>{fixText || (reducedMotion ? 'db.query("SELECT * FROM users WHERE id = $1", [id])' : '')}</span>
              </span>
            </pre>

            <div className="gps-act">
              <span className={`gps-gen ${genPressed ? 'gps-press' : ''}`}>
                Generate Auto-Fix
              </span>
              <span className={`gps-badge ${opaActive ? 'gps-on' : ''}`}>
                ✓ Verified by OPA policy
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   3. VERIFY CARD SUB-COMPONENT (Step 3)
───────────────────────────────────────────────────────────────────────────── */
const CHECKS = [
  'No policy regressions',
  'Regression tests pass',
  'Diff is minimal (1 line changed)',
  'Attestation signed',
];

export function VerifyCard({ isVisible, reducedMotion }: { isVisible: boolean; reducedMotion: boolean }) {
  const [checkStates, setCheckStates] = useState<boolean[]>(
    reducedMotion ? [true, true, true, true] : [false, false, false, false]
  );
  const [prActive, setPrActive] = useState(reducedMotion);

  useEffect(() => {
    if (reducedMotion) {
      setCheckStates([true, true, true, true]);
      setPrActive(true);
      return;
    }
    if (!isVisible) return;

    let isMounted = true;
    let timeoutId: NodeJS.Timeout;

    async function runLoop() {
      while (isMounted) {
        // Reset
        setCheckStates([false, false, false, false]);
        setPrActive(false);
        await new Promise((r) => { timeoutId = setTimeout(r, 700); });
        if (!isMounted) break;

        // Tick checklist items one by one
        for (let i = 0; i < CHECKS.length; i++) {
          if (!isMounted) break;
          setCheckStates((prev) => {
            const next = [...prev];
            next[i] = true;
            return next;
          });
          await new Promise((r) => { timeoutId = setTimeout(r, 650); });
        }

        if (!isMounted) break;
        // PR opened badge
        setPrActive(true);
        await new Promise((r) => { timeoutId = setTimeout(r, 3400); });
      }
    }

    runLoop();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [isVisible, reducedMotion]);

  return (
    <div className="gps-feat">
      <div className="gps-txt">
        <span className="gps-step">Step 3</span>
        <h2>Verified before it reaches GitHub</h2>
        <p>
          The patch has to pass your OPA policies and regression tests first. Only then does Kavach
          publish a signed pull request for your team to review.
        </p>
      </div>

      <div className="gps-stage">
        <div className="gps-win">
          <div className="gps-bar">
            <i style={{ backgroundColor: '#F87171' }} />
            <i style={{ backgroundColor: '#FBBF24' }} />
            <i style={{ backgroundColor: '#4ADE9A' }} />
            <span>Verification</span>
          </div>

          <div className="gps-body">
            {CHECKS.map((text, idx) => {
              const isOk = checkStates[idx];
              return (
                <div key={text} className={`gps-chk ${isOk ? 'gps-ok' : ''}`}>
                  <s>{isOk ? '✓' : ''}</s>
                  <span>{text}</span>
                </div>
              );
            })}

            <div className={`gps-pr ${prActive ? 'gps-on' : ''}`}>
              <div>
                <strong style={{ display: 'block', fontSize: '14px', color: '#E8EDF7' }}>
                  Fix CWE-89 in auth/route.py
                </strong>
                <small style={{ color: '#93A0BC', fontSize: '12px' }}>
                  Opened by Kavach, ready to review
                </small>
              </div>
              <span className="gps-pill">Pull request opened</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   4. FLOW STRIP (6-step connected pipeline)
───────────────────────────────────────────────────────────────────────────── */
const FLOW_STEPS = [
  { num: '1. Connect', label: 'GitHub repo' },
  { num: '2. Scan', label: 'Real engines' },
  { num: '3. Triage', label: 'Finding detail' },
  { num: '4. Fix', label: 'Minimal diff' },
  { num: '5. Verify', label: 'OPA decides' },
  { num: '6. Pull request', label: 'Signed, on GitHub' },
];

export function FlowStrip({ isVisible, reducedMotion }: { isVisible: boolean; reducedMotion: boolean }) {
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    if (reducedMotion || !isVisible) return;

    const timer = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % FLOW_STEPS.length);
    }, 1200);

    return () => clearInterval(timer);
  }, [isVisible, reducedMotion]);

  return (
    <section className="gps-flow">
      <h2>One path from repo to merged fix</h2>
      <div className="gps-fl">
        {FLOW_STEPS.map((step, idx) => (
          <div
            key={step.num}
            className={`gps-fn ${activeIdx === idx ? 'gps-on' : ''}`}
            onClick={() => setActiveIdx(idx)}
            style={{ cursor: 'pointer' }}
          >
            <b>{step.num}</b>
            <span>{step.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   5. STATS ROW (4 animated metrics)
───────────────────────────────────────────────────────────────────────────── */
export function StatsRow({ isVisible, reducedMotion }: { isVisible: boolean; reducedMotion: boolean }) {
  return (
    <section className="gps-stats">
      <div>
        <div className="gps-n">
          <StatCounter target={6} isVisible={isVisible} reducedMotion={reducedMotion} />
        </div>
        <p>deterministic scan engines</p>
      </div>

      <div>
        <div className="gps-n">
          <StatCounter target={4} isVisible={isVisible} reducedMotion={reducedMotion} />
        </div>
        <p>modules: Code, Cloud, Attack, Agent</p>
      </div>

      <div>
        <div className="gps-n">
          <StatCounter target={1} isVisible={isVisible} reducedMotion={reducedMotion} />
        </div>
        <p>click from finding to pull request</p>
      </div>

      <div>
        <div className="gps-n">
          <StatCounter target={100} suffix="%" isVisible={isVisible} reducedMotion={reducedMotion} />
        </div>
        <p>of fixes checked by policy first</p>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN COMPONENT: GoldenPathShowcase
───────────────────────────────────────────────────────────────────────────── */
export function GoldenPathShowcase() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.15 }
    );

    if (containerRef.current) observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="gps-container">
      <div className="gps-wrapper">
        {/* Step 1: Scan HUD */}
        <ScanHud isVisible={isVisible} reducedMotion={reducedMotion} />

        {/* Step 2: Auto-Fix Card */}
        <AutoFixCard isVisible={isVisible} reducedMotion={reducedMotion} />

        {/* Step 3: Verify Card */}
        <VerifyCard isVisible={isVisible} reducedMotion={reducedMotion} />

        {/* 6-Step Flow Strip */}
        <FlowStrip isVisible={isVisible} reducedMotion={reducedMotion} />

        {/* Stats Row */}
        <StatsRow isVisible={isVisible} reducedMotion={reducedMotion} />
      </div>

      {/* Scoped CSS matching the exact design tokens and animations */}
      <style jsx global>{`
        .gps-container {
          background: #090D16;
          color: #E8EDF7;
          border-top: 1px solid #223052;
          border-bottom: 1px solid #223052;
          padding: 32px 0 64px;
          font-family: var(--font-sans, "Plus Jakarta Sans", "Inter", -apple-system, sans-serif);
          -webkit-font-smoothing: antialiased;
        }
        .gps-wrapper {
          max-width: 1120px;
          margin: 0 auto;
          padding: 0 24px;
        }
        .gps-feat {
          display: grid;
          grid-template-columns: 1fr 1.2fr;
          gap: 56px;
          align-items: center;
          padding: 64px 0;
          border-top: 1px solid #223052;
        }
        .gps-feat:first-of-type {
          border-top: none;
        }
        .gps-feat.gps-rev .gps-txt {
          order: 2;
        }
        .gps-txt h2 {
          font-size: clamp(28px, 4vw, 40px);
          line-height: 1.15;
          font-weight: 700;
          color: #FFFFFF;
          margin: 0 0 14px 0;
          letter-spacing: -0.02em;
        }
        .gps-txt p {
          color: #93A0BC;
          margin: 0;
          max-width: 32em;
          font-size: 16px;
          line-height: 1.6;
        }
        .gps-step {
          display: inline-block;
          color: #7DD3C8;
          font-size: 14px;
          font-weight: 700;
          margin-bottom: 10px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .gps-stage {
          position: relative;
          border-radius: 16px;
          padding: 36px 28px;
          background: linear-gradient(135deg, #143B44, #0F2036 60%, #121A33);
          border: 1px solid #223052;
          overflow: hidden;
        }
        .gps-stage::before {
          content: "";
          position: absolute;
          inset: 0;
          background: radial-gradient(circle, rgba(125, 211, 200, 0.45) 1px, transparent 1.6px) 0 0/14px 14px;
          opacity: 0.28;
          -webkit-mask-image: linear-gradient(120deg, #000, transparent 70%);
          mask-image: linear-gradient(120deg, #000, transparent 70%);
          pointer-events: none;
        }
        .gps-win {
          position: relative;
          background: #0F1626;
          border: 1px solid #223052;
          border-radius: 12px;
          box-shadow: 0 18px 50px rgba(0, 0, 0, 0.45);
          overflow: hidden;
          color: #E8EDF7;
        }
        .gps-bar {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 11px 14px;
          background: #141D31;
          border-bottom: 1px solid #223052;
          font-size: 13px;
          color: #93A0BC;
        }
        .gps-bar i {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          display: inline-block;
        }
        .gps-bar span {
          margin-left: 8px;
          font-family: var(--font-mono, monospace);
          font-size: 12px;
        }
        .gps-body {
          padding: 20px;
        }
        .gps-row {
          display: grid;
          grid-template-columns: 92px 1fr 66px;
          grid-template-areas: "n pb st" "t pb st";
          column-gap: 14px;
          align-items: center;
          padding: 10px 0;
          border-bottom: 1px solid #223052;
          font-size: 14px;
        }
        .gps-row:last-of-type {
          border-bottom: 0;
        }
        .gps-row b {
          grid-area: n;
          font-weight: 600;
          line-height: 1.2;
          color: #E8EDF7;
        }
        .gps-row em {
          grid-area: t;
          font-style: normal;
          color: #93A0BC;
          font-size: 12px;
        }
        .gps-pb {
          grid-area: pb;
          height: 6px;
          border-radius: 4px;
          background: #141D31;
          overflow: hidden;
        }
        .gps-pb u {
          display: block;
          height: 100%;
          background: #7DD3C8;
          transition: width 0.4s ease;
        }
        .gps-st {
          grid-area: st;
          text-align: right;
          font-size: 12.5px;
          color: #93A0BC;
          font-family: var(--font-mono, monospace);
        }
        .gps-row.running .gps-st {
          color: #FBBF24;
          font-weight: 600;
        }
        .gps-row.running .gps-pb u {
          background: #FBBF24;
        }
        .gps-row.done .gps-st {
          color: #4ADE9A;
          font-weight: 600;
        }
        .gps-row.done .gps-pb u {
          background: #4ADE9A;
        }
        .gps-sum {
          margin-top: 14px;
          padding: 10px 12px;
          border-radius: 8px;
          background: #141D31;
          border: 1px solid #223052;
          font-size: 13.5px;
          color: #93A0BC;
        }
        .gps-sum b {
          color: #E8EDF7;
        }
        .gps-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .gps-top strong {
          font-size: 15px;
          color: #FFFFFF;
        }
        .gps-tag {
          font-size: 11.5px;
          font-weight: 700;
          padding: 3px 9px;
          border-radius: 99px;
          background: rgba(248, 113, 113, 0.15);
          color: #F87171;
          border: 1px solid rgba(248, 113, 113, 0.3);
        }
        .gps-body pre {
          margin: 14px 0 0;
          font: 13px/1.65 var(--font-mono, "JetBrains Mono", Consolas, monospace);
          white-space: pre-wrap;
          word-break: break-word;
        }
        .gps-ln {
          display: block;
          padding: 5px 10px;
          border-radius: 5px;
          min-height: 28px;
          box-sizing: border-box;
        }
        .gps-ln.gps-d {
          background: rgba(248, 113, 113, 0.12);
          color: #F87171;
          opacity: 0.6;
          transition: all 0.3s ease;
        }
        .gps-ln.gps-d.gps-hit {
          opacity: 1;
          box-shadow: inset 3px 0 #F87171;
        }
        .gps-ln.gps-a {
          background: rgba(74, 222, 154, 0.12);
          color: #4ADE9A;
          box-shadow: inset 3px 0 #4ADE9A;
          margin-top: 4px;
        }
        .gps-act {
          display: flex;
          gap: 12px;
          align-items: center;
          margin-top: 16px;
          flex-wrap: wrap;
        }
        .gps-gen {
          padding: 8px 14px;
          border-radius: 8px;
          border: 1px solid #7DD3C8;
          color: #7DD3C8;
          font-size: 13.5px;
          font-weight: 600;
          transition: all 0.15s ease;
          display: inline-block;
          user-select: none;
        }
        .gps-gen.gps-press {
          background: #7DD3C8;
          color: #06121A;
          transform: scale(0.96);
        }
        .gps-badge {
          font-size: 13px;
          color: #93A0BC;
          display: flex;
          align-items: center;
          gap: 7px;
          opacity: 0.35;
          transition: opacity 0.3s ease, color 0.3s ease;
          font-family: var(--font-mono, monospace);
        }
        .gps-badge.gps-on {
          opacity: 1;
          color: #4ADE9A;
        }
        .gps-chk {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 0;
          font-size: 14px;
          color: #93A0BC;
          transition: color 0.25s ease;
        }
        .gps-chk s {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          border: 1.5px solid #223052;
          display: grid;
          place-items: center;
          flex: none;
          text-decoration: none;
          font-size: 11px;
          line-height: 1;
          color: transparent;
          transition: all 0.25s ease;
        }
        .gps-chk.gps-ok {
          color: #E8EDF7;
        }
        .gps-chk.gps-ok s {
          background: #4ADE9A;
          border-color: #4ADE9A;
          color: #06121A;
          font-weight: 700;
        }
        .gps-pr {
          margin-top: 14px;
          padding: 12px 14px;
          border-radius: 8px;
          background: #141D31;
          border: 1px solid #223052;
          font-size: 14px;
          display: flex;
          justify-content: space-between;
          gap: 10px;
          align-items: center;
          flex-wrap: wrap;
          opacity: 0.35;
          transition: all 0.3s ease;
        }
        .gps-pr.gps-on {
          opacity: 1;
          border-color: #4ADE9A;
          box-shadow: 0 0 16px rgba(74, 222, 154, 0.15);
        }
        .gps-pill {
          font-size: 12px;
          font-weight: 700;
          padding: 3px 10px;
          border-radius: 99px;
          background: rgba(74, 222, 154, 0.15);
          color: #4ADE9A;
          border: 1px solid rgba(74, 222, 154, 0.3);
        }
        .gps-flow {
          padding: 64px 0 48px;
          border-top: 1px solid #223052;
        }
        .gps-flow h2 {
          font-size: clamp(28px, 4vw, 40px);
          max-width: 18em;
          color: #FFFFFF;
          margin: 0 0 28px 0;
          font-weight: 700;
          letter-spacing: -0.02em;
        }
        .gps-fl {
          display: flex;
          gap: 0;
          flex-wrap: wrap;
        }
        .gps-fn {
          flex: 1 1 150px;
          position: relative;
          padding: 16px 14px;
          border: 1px solid #223052;
          background: #0F1626;
          margin: 0 -1px -1px 0;
          font-size: 14px;
          transition: background 0.3s ease, border-color 0.3s ease;
        }
        .gps-fn b {
          display: block;
          font-size: 15px;
          color: #E8EDF7;
          margin-bottom: 2px;
        }
        .gps-fn span {
          color: #93A0BC;
          font-size: 13px;
        }
        .gps-fn.gps-on {
          background: #141D31;
          border-color: #7DD3C8;
          z-index: 2;
        }
        .gps-fn.gps-on::after {
          content: "";
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          height: 3px;
          background: #7DD3C8;
        }
        .gps-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 28px;
          padding: 56px 0 16px;
          border-top: 1px solid #223052;
        }
        .gps-stats .gps-n {
          font-size: clamp(40px, 5vw, 56px);
          font-weight: 700;
          line-height: 1;
          color: #7DD3C8;
          font-family: var(--font-mono, monospace);
        }
        .gps-stats p {
          margin: 8px 0 0;
          color: #93A0BC;
          font-size: 15px;
          line-height: 1.4;
        }
        @media (max-width: 860px) {
          .gps-feat {
            grid-template-columns: 1fr;
            gap: 28px;
            padding: 44px 0;
          }
          .gps-feat.gps-rev .gps-txt {
            order: 1;
          }
          .gps-stage {
            padding: 22px 16px;
          }
          .gps-row {
            grid-template-columns: 78px 1fr 58px;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          * {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>
    </div>
  );
}

export default GoldenPathShowcase;
