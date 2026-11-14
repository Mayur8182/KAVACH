'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  Check,
  ChevronRight,
  Code2,
  FileCode2,
  KeyRound,
  Package,
  Pause,
  Play,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';

const products = [
  {
    id: 'code',
    label: 'Code scanning',
    icon: Code2,
    title: 'From code path to reviewed fix',
    href: '/products/codebase-scanning',
    steps: ['Trace input', 'Verify finding', 'Review patch', 'Open pull request'],
  },
  {
    id: 'vuln',
    label: 'Vulnerability management',
    icon: ShieldAlert,
    title: 'Prioritize what can actually be reached',
    href: '/products/vulnerability-management',
    steps: ['Collect findings', 'Map reachability', 'Rank business risk', 'Track remediation'],
  },
  {
    id: 'supply',
    label: 'Supply chain',
    icon: Package,
    title: 'Follow a risky package to a safer version',
    href: '/products/supply-chain',
    steps: ['Build dependency tree', 'Check package risk', 'Choose safe version', 'Review change'],
  },
  {
    id: 'secrets',
    label: 'Secret scanning',
    icon: KeyRound,
    title: 'Find exposed credentials and contain them',
    href: '/products/secret-scanning',
    steps: ['Detect credential', 'Trace commit history', 'Rotate and revoke', 'Verify cleanup'],
  },
];

function Scene({ product, step }: { product: string; step: number }) {
  if (product === 'supply') {
    return (
      <div className="pw-supply">
        <div className="pw-tree-root">
          <Package size={20} />
          <span>rental-api</span>
          <span className="pw-tag">package.json</span>
        </div>
        <div className="pw-tree-branch">
          <div className={step >= 1 ? 'pw-tree-node is-risk' : 'pw-tree-node'}>
            <span>express</span>
            <small>direct dependency</small>
            <b>4.17.1</b>
          </div>
          <div className="pw-tree-node">
            <span>body-parser</span>
            <small>transitive</small>
            <b>1.19.0</b>
          </div>
        </div>
        <div className="pw-evidence">
          <ShieldAlert size={18} />
          <span>
            <strong>Known vulnerability</strong>
            <small>Reachable through request parsing</small>
          </span>
          <em>{step >= 2 ? 'REACHABLE' : 'ANALYZING'}</em>
        </div>
        <div className="pw-patch">
          <span className="del">− "express": "4.17.1"</span>
          <span className="add">+ "express": "4.21.2"</span>
        </div>
      </div>
    );
  }

  if (product === 'secrets') {
    return (
      <div className="pw-secret">
        <div className="pw-filetop">
          <FileCode2 size={18} />
          <span>config/payments.ts</span>
          <span className="pw-sub">commit a81f2c9</span>
        </div>
        <div className="pw-code">
          <span>18</span> const client = createClient({'{'}
        </div>
        <div className="pw-code pw-highlight">
          <span>19</span>   apiKey: <b>"sk_live_••••••••••••8Q2"</b>,
        </div>
        <div className="pw-code">
          <span>20</span> {'}'});
        </div>
        <div className="pw-timeline">
          <div className="pw-timeline-line" />
          <div className="pw-timeline-step">
            <i className="done" />
            <div>
              <strong>Credential detected</strong>
              <small>High confidence · production key</small>
            </div>
          </div>
          <div className="pw-timeline-step">
            <i className={step > 0 ? 'done' : ''} />
            <div>
              <strong>Rotation requested</strong>
              <small>Revoke old key with provider</small>
            </div>
          </div>
          <div className="pw-timeline-step">
            <i className={step > 1 ? 'done' : ''} />
            <div>
              <strong>History cleanup verified</strong>
              <small>After rotation and force-push</small>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (product === 'vuln') {
    return (
      <div className="pw-vuln">
        <div className="pw-vuln-head">
          <span>Finding queue</span>
          <span>
            Sorted by reachable risk <ChevronRight size={16} />
          </span>
        </div>
        {[
          ['Critical', 'SQL injection', 'src/routes/users.ts · line 42', 'Reachable from public API'],
          ['High', 'Unsafe deserialization', 'src/jobs/import.ts · line 88', 'Worker role has broad access'],
          ['Medium', 'Outdated TLS library', 'package-lock.json', 'No known exploit path'],
        ].map((x, i) => (
          <div className={`pw-finding ${i === 0 && step > 0 ? 'selected' : ''}`} key={x[1]}>
            <span className={`pw-severity s${i}`} />
            <div>
              <strong>{x[1]}</strong>
              <small>{x[2]}</small>
            </div>
            <em>{x[0]}</em>
            <small className="pw-risk">{x[3]}</small>
          </div>
        ))}
        <div className="pw-impact">
          <Activity size={18} />
          <span>
            <strong>Public route → vulnerable query → customer records</strong>
            <small>Evidence chain · 3 connected assets</small>
          </span>
          <ArrowRight size={16} />
        </div>
      </div>
    );
  }

  // Default: Code Scene
  return (
    <div className="pw-code-scene">
      <div className="pw-filetop">
        <FileCode2 size={18} />
        <span>src/routes/users.ts</span>
        <span className="pw-sub">Pull request #128</span>
      </div>
      <div className="pw-code">
        <span>40</span> router.get('/users', async (req, res) =&gt; {'{'}
      </div>
      <div className="pw-code">
        <span>41</span>   const id = req.query.id;
      </div>
      <div className="pw-code pw-highlight">
        <span>42</span>   const query = <b>`SELECT * FROM users WHERE id = ${'{'}id{'}'}`</b>
      </div>
      <div className="pw-code">
        <span>43</span>   return db.execute(query);
      </div>
      <div className="pw-code">
        <span>44</span> {'}'});
      </div>
      <div className="pw-flow">
        <div className="pw-flow-label">
          <span className="pw-live-dot" />
          <span>ANALYSIS TRACE</span>
          <span className="pw-tag">illustrative sample</span>
        </div>
        <div className="pw-flow-row">
          <span className="pw-flow-node">HTTP query</span>
          <ArrowRight size={15} />
          <span className="pw-flow-node">id parameter</span>
          <ArrowRight size={15} />
          <span className="pw-flow-node pw-node-alert">SQL query</span>
        </div>
        <div className="pw-flow-result">
          <ShieldAlert size={18} />
          <span>
            <strong>Untrusted input reaches SQL execution</strong>
            <small>Data flow confirmed · CWE-89 · high confidence</small>
          </span>
          <Check size={18} />
        </div>
      </div>
    </div>
  );
}

export function ProductWalkthrough() {
  const [active, setActive] = useState(0);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);
  const product = products[active];

  useEffect(() => {
    if (!playing || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => setStep((s) => (s + 1) % product.steps.length), 3200);
    return () => window.clearInterval(timer);
  }, [playing, product]);

  return (
    <section className="pw-section" id="product-walkthrough">
      <div className="pw-heading">
        <div>
          <div className="pw-eyebrow">
            <span className="pw-live-dot" /> PRODUCT WALKTHROUGH <span className="pw-sample">ILLUSTRATIVE SAMPLE</span>
          </div>
          <h2>See the work, step by step.</h2>
          <p>
            Follow how Kavach turns a security signal into evidence a team can review. This walkthrough uses sample
            data; it never connects to a repository or starts a scan.
          </p>
        </div>
        <Link href={product.href}>
          Explore product <ArrowRight size={17} />
        </Link>
      </div>

      <div className="pw-tabs" role="tablist" aria-label="Product walkthroughs">
        {products.map((p, i) => (
          <button
            key={p.id}
            role="tab"
            aria-selected={active === i}
            onClick={() => {
              setActive(i);
              setStep(0);
              setPlaying(true);
            }}
          >
            <p.icon size={19} />
            <span>{p.label}</span>
          </button>
        ))}
      </div>

      <div className="pw-demo">
        <div className="pw-demo-top">
          <div className="pw-window-dots">
            <i />
            <i />
            <i />
          </div>
          <span>KAVACH · SECURITY REVIEW</span>
          <span className="pw-sample">SAMPLE SCENARIO</span>
        </div>

        <div className="pw-demo-body">
          <div className="pw-step-list">
            <div className="pw-demo-title">
              <span>WORKFLOW</span>
              <h3>{product.title}</h3>
            </div>
            {product.steps.map((s, i) => (
              <button
                key={s}
                onClick={() => {
                  setStep(i);
                  setPlaying(false);
                }}
                className={i === step ? 'active' : i < step ? 'complete' : ''}
              >
                <i>{i < step ? <Check size={14} /> : i + 1}</i>
                <div className="pw-step-info">
                  <span>{s}</span>
                  <small>{i === step ? 'IN PROGRESS' : i < step ? 'COMPLETE' : 'UP NEXT'}</small>
                </div>
              </button>
            ))}
            <button className="pw-play" onClick={() => setPlaying(!playing)}>
              {playing ? <Pause size={16} /> : <Play size={16} />} {playing ? 'Pause walkthrough' : 'Play walkthrough'}
            </button>
          </div>

          <div className="pw-scene-wrap">
            <div className="pw-scene-header">
              <strong>{product.label}</strong>
              <span>
                <span className="pw-live-dot" /> Step {step + 1} of {product.steps.length}
              </span>
            </div>
            <Scene product={product.id} step={step} />
            <div className="pw-reviewer">
              <div className="pw-avatar">MB</div>
              <span>
                <strong>Mayur Bharvad</strong>
                <small>Security reviewer · human approval stays with your team</small>
              </span>
              <span className="pw-reviewed">
                <ShieldCheck size={16} />
                {step >= 2 ? 'Review step' : 'Evidence view'}
              </span>
            </div>
            <div className="pw-scene-controls">
              <span>Illustrative product UI · no account data</span>
              <button
                onClick={() => {
                  setStep((step + 1) % product.steps.length);
                  setPlaying(false);
                }}
              >
                Next step <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="pw-bottomline">
        <span>
          <Check size={16} /> Product-specific workflow
        </span>
        <span>
          <Check size={16} /> Evidence shown as it is traced
        </span>
        <span>
          <Check size={16} /> No live repository or scan
        </span>
      </div>

      <style jsx>{`
        .pw-section {
          max-width: 1380px;
          margin: 0 auto;
          padding: 32px clamp(16px, 3vw, 24px) 80px;
          color: #0f172a;
          font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .pw-heading {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 32px;
          margin-bottom: 28px;
        }
        .pw-eyebrow {
          font: 700 12.5px/1.4 Inter, sans-serif;
          letter-spacing: 0.12em;
          color: #2563eb;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .pw-sample {
          font: 600 11.5px/1.4 Inter, sans-serif;
          letter-spacing: 0.05em;
          color: #475569;
          background: #f1f5f9;
          padding: 4px 10px;
          border-radius: 999px;
        }
        .pw-live-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #10b981;
          display: inline-block;
          box-shadow: 0 0 0 3px #d1fae5;
        }
        .pw-heading h2 {
          font-size: clamp(30px, 3.4vw, 42px);
          letter-spacing: -0.03em;
          margin: 12px 0 8px;
          font-weight: 800;
          color: #0f172a;
        }
        .pw-heading p {
          color: #475569;
          font-size: 16px;
          line-height: 1.6;
          max-width: 740px;
          margin: 0;
        }
        .pw-heading > a {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #0f172a;
          text-decoration: none;
          font-size: 15px;
          font-weight: 700;
          white-space: nowrap;
          border: 1px solid #cbd5e1;
          padding: 10px 18px;
          border-radius: 10px;
          background: #ffffff;
          transition: all 0.15s ease;
        }
        .pw-heading > a:hover {
          border-color: #94a3b8;
          background: #f8fafc;
        }
        .pw-tabs {
          display: flex;
          overflow-x: auto;
          border-bottom: 1px solid #e2e8f0;
          gap: 32px;
          scrollbar-width: none;
        }
        .pw-tabs button {
          display: flex;
          align-items: center;
          gap: 10px;
          border: 0;
          background: none;
          color: #64748b;
          padding: 16px 6px;
          border-bottom: 2.5px solid transparent;
          white-space: nowrap;
          cursor: pointer;
          font-size: 15px;
          font-weight: 600;
          transition: all 0.15s ease;
        }
        .pw-tabs button[aria-selected='true'] {
          color: #0f172a;
          border-color: #2563eb;
          font-weight: 700;
        }
        .pw-demo {
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          margin-top: 24px;
          background: #ffffff;
          box-shadow: 0 20px 48px -12px rgba(15, 23, 42, 0.08);
          overflow: hidden;
        }
        .pw-demo-top {
          height: 48px;
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 0 22px;
          border-bottom: 1px solid #f1f5f9;
          color: #64748b;
          font: 600 12px Inter, sans-serif;
          letter-spacing: 0.07em;
          background: #f8fafc;
        }
        .pw-window-dots {
          display: flex;
          gap: 6px;
        }
        .pw-window-dots i {
          width: 10px;
          height: 10px;
          background: #f87171;
          border-radius: 50%;
        }
        .pw-window-dots i:nth-child(2) {
          background: #fbbf24;
        }
        .pw-window-dots i:nth-child(3) {
          background: #34d399;
        }
        .pw-demo-top .pw-sample {
          margin-left: auto;
        }
        .pw-demo-body {
          display: grid;
          grid-template-columns: 310px 1fr;
          min-height: 520px;
        }
        .pw-step-list {
          padding: 24px 18px;
          border-right: 1px solid #f1f5f9;
          background: #f8fafc;
        }
        .pw-demo-title {
          padding: 0 8px 18px;
        }
        .pw-demo-title > span {
          font: 700 11px Inter, sans-serif;
          letter-spacing: 0.12em;
          color: #94a3b8;
        }
        .pw-demo-title h3 {
          font-size: 17px;
          line-height: 1.4;
          margin: 6px 0 0;
          font-weight: 700;
          color: #0f172a;
          letter-spacing: -0.02em;
        }
        .pw-step-list > button:not(.pw-play) {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          background: transparent;
          border: 1px solid transparent;
          border-radius: 10px;
          padding: 12px 14px;
          margin: 5px 0;
          cursor: pointer;
          color: #334155;
          text-align: left;
          transition: all 0.15s ease;
        }
        .pw-step-list > button.active {
          background: #eff6ff;
          border-color: #bfdbfe;
          color: #1e40af;
        }
        .pw-step-list > button.complete {
          color: #047857;
        }
        .pw-step-list > button i {
          width: 28px;
          height: 28px;
          display: grid;
          place-items: center;
          border: 1.5px solid #cbd5e1;
          border-radius: 50%;
          font-style: normal;
          font-size: 13px;
          font-weight: 700;
          flex-shrink: 0;
        }
        .pw-step-list > button.active i {
          border-color: #3b82f6;
          background: #dbeafe;
          color: #1d4ed8;
        }
        .pw-step-list > button.complete i {
          border-color: #10b981;
          background: #d1fae5;
          color: #047857;
        }
        .pw-step-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .pw-step-info span {
          font-size: 14.5px;
          font-weight: 700;
        }
        .pw-step-info small {
          font-size: 11px;
          letter-spacing: 0.06em;
          color: #64748b;
          font-weight: 600;
        }
        .pw-play {
          margin: 20px 8px 0;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          color: #334155;
          border-radius: 8px;
          padding: 9px 14px;
          display: flex;
          gap: 8px;
          align-items: center;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
        }
        .pw-play:hover {
          background: #f8fafc;
        }
        .pw-scene-wrap {
          padding: 26px clamp(18px, 3vw, 36px);
          min-width: 0;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .pw-scene-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #f1f5f9;
          padding-bottom: 16px;
          color: #0f172a;
          font-size: 15px;
          font-weight: 700;
        }
        .pw-scene-header > span {
          font-size: 13px;
          color: #64748b;
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 500;
        }
        .pw-code-scene,
        .pw-secret,
        .pw-supply,
        .pw-vuln {
          max-width: 820px;
          margin: 24px auto 16px;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          background: #ffffff;
          overflow: hidden;
          box-shadow: 0 8px 24px -4px rgba(15, 23, 42, 0.06);
          width: 100%;
        }
        .pw-filetop {
          height: 44px;
          padding: 0 16px;
          display: flex;
          align-items: center;
          gap: 10px;
          border-bottom: 1px solid #f1f5f9;
          color: #0f172a;
          font-size: 13.5px;
          font-weight: 600;
          background: #f8fafc;
        }
        .pw-filetop .pw-sub {
          margin-left: auto;
          color: #64748b;
          font-size: 12px;
          font-family: JetBrains Mono, monospace;
        }
        .pw-code {
          font: 14px/1.8 JetBrains Mono, ui-monospace, SFMono-Regular, Consolas, monospace;
          color: #334155;
          padding: 4px 16px;
          white-space: pre;
          overflow: auto;
        }
        .pw-code span {
          display: inline-block;
          width: 32px;
          color: #94a3b8;
          user-select: none;
        }
        .pw-highlight {
          background: #fef2f2;
          color: #991b1b;
        }
        .pw-highlight b {
          font-weight: 700;
          color: #dc2626;
        }
        .pw-flow {
          margin: 16px 16px 14px;
          border-top: 1px solid #f1f5f9;
          padding-top: 16px;
        }
        .pw-flow-label {
          display: flex;
          align-items: center;
          gap: 10px;
          font: 700 11.5px Inter, sans-serif;
          letter-spacing: 0.1em;
          color: #64748b;
        }
        .pw-tag {
          margin-left: auto;
          font-size: 11px;
          color: #64748b;
          background: #f1f5f9;
          padding: 3px 8px;
          border-radius: 6px;
        }
        .pw-flow-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 14px;
          padding: 18px 0;
          color: #94a3b8;
        }
        .pw-flow-node {
          border: 1px solid #cbd5e1;
          background: #ffffff;
          border-radius: 8px;
          padding: 8px 14px;
          font-size: 13px;
          font-weight: 600;
          color: #0f172a;
        }
        .pw-node-alert {
          border-color: #fca5a5;
          background: #fef2f2;
          color: #dc2626;
        }
        .pw-flow-result,
        .pw-impact {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          background: #ecfdf5;
          border: 1px solid #a7f3d0;
          border-radius: 10px;
          color: #047857;
        }
        .pw-flow-result span,
        .pw-impact span {
          display: flex;
          flex-direction: column;
          gap: 3px;
          flex: 1;
        }
        .pw-flow-result strong,
        .pw-impact strong {
          font-size: 14px;
          font-weight: 700;
        }
        .pw-flow-result small,
        .pw-impact small {
          font-size: 12px;
          color: #065f46;
        }
        .pw-reviewer {
          display: flex;
          align-items: center;
          gap: 14px;
          border-top: 1px solid #f1f5f9;
          padding: 16px 0;
          margin-top: 16px;
        }
        .pw-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: #0f172a;
          color: #ffffff;
          display: grid;
          place-items: center;
          font-size: 12px;
          font-weight: 700;
        }
        .pw-reviewer > span:nth-child(2) {
          display: flex;
          flex-direction: column;
          gap: 2px;
          flex: 1;
        }
        .pw-reviewer strong {
          font-size: 14px;
          color: #0f172a;
        }
        .pw-reviewer small {
          font-size: 12px;
          color: #64748b;
        }
        .pw-reviewed {
          display: flex;
          align-items: center;
          gap: 6px;
          border: 1px solid #a7f3d0;
          background: #ecfdf5;
          color: #047857;
          padding: 6px 12px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 700;
        }
        .pw-scene-controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-top: 1px solid #f1f5f9;
          padding-top: 16px;
          color: #64748b;
          font-size: 12.5px;
        }
        .pw-scene-controls button {
          display: flex;
          gap: 8px;
          align-items: center;
          border: 0;
          background: #0f172a;
          color: white;
          border-radius: 8px;
          padding: 9px 16px;
          font-size: 13.5px;
          font-weight: 600;
          cursor: pointer;
        }
        .pw-bottomline {
          display: flex;
          gap: 32px;
          flex-wrap: wrap;
          padding: 20px 4px 0;
          color: #475569;
          font-size: 14px;
          font-weight: 500;
        }
        .pw-bottomline span {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .pw-bottomline svg {
          color: #10b981;
        }

        /* Supply Chain & Secrets Scenes */
        .pw-supply,
        .pw-secret,
        .pw-vuln {
          padding: 18px;
        }
        .pw-tree-root {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 14px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 700;
          color: #0f172a;
          background: #f8fafc;
        }
        .pw-tree-branch {
          margin: 10px 0 10px 24px;
          padding-left: 16px;
          border-left: 2px solid #cbd5e1;
          display: grid;
          gap: 8px;
        }
        .pw-tree-node {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 13.5px;
          color: #0f172a;
        }
        .pw-tree-node small {
          color: #64748b;
        }
        .pw-tree-node b {
          margin-left: auto;
          font-weight: 700;
        }
        .pw-tree-node.is-risk {
          border-color: #fca5a5;
          background: #fef2f2;
          color: #dc2626;
        }
        .pw-evidence {
          display: flex;
          align-items: center;
          gap: 12px;
          background: #fffbeb;
          border: 1px solid #fde68a;
          color: #b45309;
          border-radius: 10px;
          padding: 12px 16px;
          margin-top: 14px;
        }
        .pw-evidence span {
          display: flex;
          flex-direction: column;
          gap: 2px;
          flex: 1;
        }
        .pw-evidence strong {
          font-size: 14px;
          font-weight: 700;
        }
        .pw-evidence small {
          font-size: 12px;
          color: #92400e;
        }
        .pw-evidence em,
        .pw-finding em {
          font-style: normal;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.05em;
          padding: 3px 8px;
          border-radius: 6px;
          background: #fef3c7;
        }
        .pw-patch {
          margin-top: 12px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 12px 14px;
          border-radius: 8px;
          display: grid;
          font: 13.5px/1.8 JetBrains Mono, monospace;
        }
        .pw-patch .del {
          color: #dc2626;
        }
        .pw-patch .add {
          color: #059669;
        }

        /* Vulnerability list */
        .pw-vuln {
          padding: 0;
        }
        .pw-vuln-head {
          padding: 16px 20px;
          display: flex;
          justify-content: space-between;
          border-bottom: 1px solid #f1f5f9;
          font-size: 13.5px;
          font-weight: 700;
          color: #0f172a;
          background: #f8fafc;
        }
        .pw-vuln-head span:last-child {
          display: flex;
          align-items: center;
          color: #64748b;
          font-weight: 500;
          font-size: 13px;
        }
        .pw-finding {
          display: grid;
          grid-template-columns: 12px 1fr auto;
          align-items: center;
          gap: 6px 14px;
          padding: 14px 20px;
          border-bottom: 1px solid #f1f5f9;
        }
        .pw-finding.selected {
          background: #f8faff;
        }
        .pw-severity {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #dc2626;
        }
        .pw-severity.s1 {
          background: #f97316;
        }
        .pw-severity.s2 {
          background: #f59e0b;
        }
        .pw-finding div {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .pw-finding strong {
          font-size: 14px;
          color: #0f172a;
        }
        .pw-finding small {
          font-size: 12px;
          color: #64748b;
        }
        .pw-finding em {
          color: #dc2626;
        }
        .pw-finding .pw-risk {
          grid-column: 2 / 4;
          font-size: 12px;
          color: #475569;
        }
        .pw-impact {
          margin: 16px 20px;
        }

        /* Secrets timeline */
        .pw-timeline {
          position: relative;
          padding: 16px 14px 4px 34px;
          display: grid;
          gap: 16px;
        }
        .pw-timeline-line {
          position: absolute;
          top: 26px;
          bottom: 16px;
          left: 19px;
          width: 2px;
          background: #e2e8f0;
        }
        .pw-timeline-step {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .pw-timeline i {
          width: 12px;
          height: 12px;
          background: #ffffff;
          border: 2px solid #94a3b8;
          border-radius: 50%;
          z-index: 1;
          flex-shrink: 0;
        }
        .pw-timeline i.done {
          background: #10b981;
          border-color: #10b981;
        }
        .pw-timeline strong {
          font-size: 13.5px;
          color: #0f172a;
          display: block;
        }
        .pw-timeline small {
          font-size: 12px;
          color: #64748b;
        }

        @media (max-width: 768px) {
          .pw-heading {
            flex-direction: column;
            align-items: flex-start;
          }
          .pw-demo-body {
            grid-template-columns: 1fr;
          }
          .pw-step-list {
            border-right: 0;
            border-bottom: 1px solid #f1f5f9;
          }
        }
      `}</style>
    </section>
  );
}

export default ProductWalkthrough;
