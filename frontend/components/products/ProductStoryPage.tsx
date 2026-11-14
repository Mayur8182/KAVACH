'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowDown, ArrowRight, Check, ChevronLeft, ChevronRight, Code2,
  GitCommitHorizontal, GitPullRequest, KeyRound, Package, Pause, Play,
  RotateCcw, ShieldAlert, ShieldCheck, Network, Cloud,
} from 'lucide-react';
import { SecuLayerHeader } from '@/components/navigation/SecuLayerHeader';

type ProductId = 'codebase-scanning' | 'vulnerability-management' | 'supply-chain' | 'secret-scanning' | 'api-security' | 'iac-security' | 'container-security';
type Product = {
  eyebrow: string;
  title: string;
  intro: string;
  icon: typeof Code2;
  steps: { title: string; detail: string; label: string }[];
};

const products: Record<ProductId, Product> = {
  'codebase-scanning': {
    eyebrow: 'CODEBASE SCANNING',
    title: 'Follow risky code from entry point to review.',
    intro: 'See how a code finding can be traced through an application, explained with source evidence, and carried into a developer review.',
    icon: Code2,
    steps: [
      { title: 'Inspect the changed code', detail: 'Start at the request handler where user controlled input enters the application.', label: 'CODE CONTEXT' },
      { title: 'Trace the data flow', detail: 'Follow the value through the handler to the database operation that uses it.', label: 'SOURCE → SINK' },
      { title: 'Review a focused patch', detail: 'Compare the unsafe string construction with a parameterized query approach.', label: 'PROPOSED DIFF' },
      { title: 'Keep the developer in control', detail: 'Show the proposed change in a pull request review, where a person decides what happens next.', label: 'HUMAN REVIEW' },
    ],
  },
  'vulnerability-management': {
    eyebrow: 'VULNERABILITY MANAGEMENT',
    title: 'Connect a vulnerability to the path that makes it matter.',
    intro: 'Move from a finding list to the application path, component, and asset context a team needs to judge priority and plan remediation.',
    icon: ShieldAlert,
    steps: [
      { title: 'Bring findings into view', detail: 'Review code, package, container, and cloud findings in a shared investigation flow.', label: 'FINDING CONTEXT' },
      { title: 'Map the exposure path', detail: 'Connect an exposed entry point to an affected component and the asset behind it.', label: 'REACHABILITY PATH' },
      { title: 'Make the evidence legible', detail: 'Keep severity, affected version, exposure, and ownership visible beside the finding.', label: 'RISK EVIDENCE' },
      { title: 'Track the response', detail: 'Keep remediation, review, and verification as distinct steps with evidence attached.', label: 'REMEDIATION TRAIL' },
    ],
  },
  'supply-chain': {
    eyebrow: 'SUPPLY CHAIN SECURITY',
    title: 'See how a package travels through your software.',
    intro: 'Explore direct and transitive dependencies, inspect package advisories, and review version changes in the context of the dependency tree.',
    icon: Package,
    steps: [
      { title: 'Map package relationships', detail: 'Start at the application manifest and follow direct and transitive package edges.', label: 'DEPENDENCY GRAPH' },
      { title: 'Inspect package evidence', detail: 'Review the affected package version and advisory context before choosing a response.', label: 'PACKAGE ADVISORY' },
      { title: 'Compare a candidate version', detail: 'See the manifest change and the package relationship it affects.', label: 'VERSION CHANGE' },
      { title: 'Review what ships', detail: 'Keep component inventory and change context together for release review.', label: 'COMPONENT RECORD' },
    ],
  },
  'secret-scanning': {
    eyebrow: 'SECRET SCANNING',
    title: 'Trace an exposed credential. Contain it before cleanup.',
    intro: 'See a credential redacted in context, trace the commit where it appeared, and follow the response order without exposing the secret.',
    icon: KeyRound,
    steps: [
      { title: 'Detect and redact', detail: 'Show the credential type and code location while masking the credential value.', label: 'MASKED EVIDENCE' },
      { title: 'Trace its history', detail: 'Inspect the commit and branch context to understand where the exposure appeared.', label: 'GIT HISTORY' },
      { title: 'Contain access first', detail: 'Rotate or revoke the credential with its provider before rewriting repository history.', label: 'RESPONSE ORDER' },
      { title: 'Verify cleanup', detail: 'After provider action and history cleanup, run a follow-up scan and record the review.', label: 'FOLLOW-UP' },
    ],
  },
  'api-security': {
    eyebrow: 'API SECURITY', title: 'Follow an API risk from route to authorization boundary.',
    intro: 'Explore how endpoints, identity context, object access, and reviewable changes fit together in an API security workflow.', icon: Network,
    steps: [
      { title: 'Discover the endpoint', detail: 'Start from an API operation and its request path.', label: 'API INVENTORY' },
      { title: 'Trace authorization context', detail: 'Follow caller identity through the route to the object lookup.', label: 'IDENTITY FLOW' },
      { title: 'Review the access boundary', detail: 'Check object ownership and the fields returned to the caller.', label: 'RESPONSE SCOPE' },
      { title: 'Propose a focused change', detail: 'Keep the policy or code change reviewable before it reaches a release.', label: 'HUMAN REVIEW' },
    ],
  },
  'iac-security': {
    eyebrow: 'INFRASTRUCTURE AS CODE', title: 'Trace an infrastructure issue to its source file.',
    intro: 'Connect a Terraform or Kubernetes resource to its policy evidence, understand the exposure, and review a proposed configuration change.', icon: Cloud,
    steps: [
      { title: 'Inspect the declared resource', detail: 'Locate the resource and its security-relevant configuration in source.', label: 'SOURCE FILE' },
      { title: 'Evaluate the policy rule', detail: 'Show which configuration value triggered review and why it matters.', label: 'POLICY EVIDENCE' },
      { title: 'Review the change', detail: 'Compare the current declaration with a focused safer configuration.', label: 'PROPOSED DIFF' },
      { title: 'Re-evaluate before apply', detail: 'Keep plan and policy review in front of the infrastructure change.', label: 'PLAN REVIEW' },
    ],
  },
  'container-security': {
    eyebrow: 'CONTAINER SECURITY', title: 'Find the image layer that brings risk into a build.',
    intro: 'Review an image, its package layers, and the build source together so teams can choose a focused update and validate the release path.', icon: Package,
    steps: [
      { title: 'Inspect the image', detail: 'Start with the image reference and build context.', label: 'IMAGE CONTEXT' },
      { title: 'Locate the package layer', detail: 'Connect an affected package to the image layer that introduced it.', label: 'LAYER TRACE' },
      { title: 'Compare update options', detail: 'Review package or base image updates before changing the build.', label: 'UPDATE REVIEW' },
      { title: 'Validate the release path', detail: 'Keep the image change and verification steps together for review.', label: 'BUILD REVIEW' },
    ],
  },
};

const routes: [string, ProductId][] = [
  ['Codebase scanning', 'codebase-scanning'],
  ['Vulnerability management', 'vulnerability-management'],
  ['Supply chain', 'supply-chain'],
  ['Secret scanning', 'secret-scanning'],
  ['API security', 'api-security'],
  ['Infrastructure as Code', 'iac-security'],
  ['Container security', 'container-security'],
];

function CodeScene({ step }: { step: number }) {
  return <div className="ps-code-scene">
    <div className="ps-editor">
      <div className="ps-file"><Code2 size={14}/> src/routes/users.ts <span>Illustrative snippet</span></div>
      <div className="ps-line"><i>40</i> router.get('/users', async (req, res) =&gt; {'{'}</div>
      <div className="ps-line ps-source"><i>41</i>   const id = req.query.id;</div>
      <div className="ps-line ps-sink"><i>42</i>   const query = `SELECT * FROM users WHERE id = ${'{'}id{'}'}`;</div>
      <div className="ps-line"><i>43</i>   return db.execute(query);</div>
      <div className="ps-line"><i>44</i> {'}'});</div>
    </div>
    <div className="ps-flow">
      <span className="ps-scene-label">{['CODE CONTEXT', 'TAINT TRACE', 'PATCH REVIEW', 'PULL REQUEST REVIEW'][step]}</span>
      {step < 2 ? <div className="ps-flow-nodes"><span className={step === 0 ? 'focus' : ''}>Request<br/><small>query parameter</small></span><ArrowRight/><span>Route handler<br/><small>id value</small></span><ArrowRight/><span className={step === 1 ? 'risk' : ''}>SQL query<br/><small>database sink</small></span></div> : step === 2 ? <div className="ps-diff"><div className="remove">− query = `SELECT * FROM users WHERE id = ${'{'}id{'}'}`</div><div className="add">+ query = 'SELECT * FROM users WHERE id = ?'</div><div className="add">+ db.execute(query, [id])</div></div> : <div className="ps-pr"><GitPullRequest size={17}/><span><b>Proposed change</b><small>Code owner review required</small></span><em>EXAMPLE</em></div>}
    </div>
  </div>;
}

function VulnerabilityScene({ step }: { step: number }) {
  const nodes = ['Public API', 'Route handler', 'Affected package', 'Customer data'];
  return <div className="ps-vuln-scene">
    <div className="ps-vuln-list"><div className="ps-mini-head">INVESTIGATION QUEUE <span>EXAMPLE</span></div>{[['Code','SQL query','src/routes/users.ts'],['Dependency','Affected package','package manifest'],['Cloud','Public storage policy','resource context']].map(([kind,title,where],i)=><div className={`ps-mini-row ${i === step % 3 ? 'picked' : ''}`} key={title}><i className={`sev sev-${i}`}/><span><b>{title}</b><small>{kind} · {where}</small></span><ChevronRight size={14}/></div>)}</div>
    <div className="ps-path"><span className="ps-scene-label">{step === 0 ? 'FINDING SOURCES' : step === 1 ? 'EXPOSURE PATH' : step === 2 ? 'PRIORITY EVIDENCE' : 'REMEDIATION TRAIL'}</span><div className="ps-path-stack">{nodes.map((node,i)=><div className={`ps-path-node ${i === 2 && step > 0 ? 'path-risk' : ''}`} key={node}><span>{i+1}</span>{node}{i < nodes.length-1 && <ArrowDown size={13}/>}</div>)}</div><div className="ps-evidence"><ShieldAlert size={16}/><span><b>Review the connected evidence</b><small>Exposure, affected component, and asset context</small></span></div></div>
  </div>;
}

function SupplyScene({ step }: { step: number }) {
  return <div className="ps-supply-scene">
    <div className="ps-graph"><div className="ps-graph-root"><Package size={15}/> application manifest <small>direct dependency</small></div><div className="ps-graph-branches"><div className="ps-graph-branch"><div className="ps-package-node">web framework <small>direct</small></div><div className={`ps-package-node ${step > 0 ? 'package-risk' : ''}`}>request parser <small>transitive</small></div><div className="ps-package-leaf">utility package</div></div><div className="ps-graph-branch"><div className="ps-package-node">auth library <small>direct</small></div><div className="ps-package-leaf">crypto helper</div></div></div></div>
    <aside className="ps-package-detail"><span className="ps-scene-label">{['DEPENDENCY GRAPH','ADVISORY CONTEXT','VERSION REVIEW','COMPONENT RECORD'][step]}</span><div className="ps-package-title"><Package size={17}/><span><b>{step === 1 ? 'Package advisory' : step === 2 ? 'Candidate update' : 'request parser'}</b><small>Manifest relationship · illustrative scenario</small></span></div>{step === 2 ? <div className="ps-version-diff"><span>Current</span><b>1.19.x</b><ArrowRight size={14}/><span>Candidate</span><b className="version-next">1.20.x</b></div> : <div className="ps-package-facts"><span>Relationship <b>{step === 0 ? 'Transitive' : 'Review context'}</b></span><span>Source <b>Lockfile</b></span><span>Action <b>{step === 3 ? 'Release review' : 'Investigate'}</b></span></div>}<div className="ps-note"><ShieldCheck size={14}/> Example only · confirm package data in your workspace</div></aside>
  </div>;
}

function SecretScene({ step }: { step: number }) {
  return <div className="ps-secret-scene">
    <div className="ps-secret-editor"><div className="ps-file"><Code2 size={14}/> config/payments.ts <span>Commit context</span></div><div className="ps-secret-line"><i>18</i> const client = createClient({'{'}</div><div className="ps-secret-line ps-secret-mark"><i>19</i>   apiKey: <b>"sk_live_••••••••••••8Q2"</b>, <span>REDACTED</span></div><div className="ps-secret-line"><i>20</i> {'}'});</div><div className="ps-secret-meta"><KeyRound size={14}/> Credential-like value · masked in this example</div></div>
    <div className="ps-secret-response"><span className="ps-scene-label">{['DETECTION','COMMIT HISTORY','CONTAINMENT FIRST','CLEANUP REVIEW'][step]}</span><div className="ps-commit"><GitCommitHorizontal size={15}/><span><b>Credential appears in source</b><small>Commit and branch context · illustrative</small></span></div><div className="ps-response-order"><div className={step >= 2 ? 'current' : ''}><i>1</i><span><b>Rotate or revoke with provider</b><small>Contain access before repository cleanup</small></span></div><div className={step >= 3 ? 'current' : ''}><i>2</i><span><b>Clean history and follow up</b><small>Run a new scan after provider action</small></span></div></div><div className="ps-note"><ShieldCheck size={14}/> Secret values stay masked in the walkthrough</div></div>
  </div>;
}

function ApiScene({ step }: { step: number }) {
  return <div className="ps-api-scene"><div className="ps-api-endpoint"><b>GET</b><code>/api/v1/invoices/{'{invoiceId}'}</code><span>EXAMPLE ROUTE</span></div><div className="ps-api-columns"><div><span className="story-art-label">REQUEST PATH</span><div className="ps-api-flow"><i>Caller identity</i><ArrowDown size={13}/><i>Invoice route</i><ArrowDown size={13}/><i>Object lookup</i></div></div><div><span className="story-art-label">ACCESS REVIEW</span><div className="ps-api-check"><KeyRound size={15}/><span><b>Object ownership</b><small>Confirm the caller can access this invoice.</small></span></div><div className="ps-api-check"><ShieldCheck size={15}/><span><b>Response boundary</b><small>Return only fields permitted for this identity.</small></span></div></div></div><div className="story-example-foot">{step>1?'Proposed authorization change · human review required':'Illustrative API workflow · no live scan'}</div></div>;
}

function IacScene({ step }: { step: number }) {
  return <div className="ps-iac-scene"><div className="ps-file"><Code2 size={14}/> infra/storage.tf <span>EXAMPLE CONFIGURATION</span></div><div className="ps-iac-line"><i>1</i> resource "aws_s3_bucket" "uploads" {'{'}</div><div className="ps-iac-line"><i>2</i>   bucket = "team-uploads"</div><div className="ps-iac-line flagged"><i>3</i>   # access policy needs review</div><div className="ps-iac-line"><i>4</i> {'}'}</div><div className="ps-policy-flow"><span>Terraform resource</span><ArrowRight size={14}/><span>Policy rule</span><ArrowRight size={14}/><span>Plan review</span></div><div className="story-example-foot">{step>1?'Suggested setting shown for review · not applied':'Example policy finding · not a scan result'}</div></div>;
}

function ContainerScene({ step }: { step: number }) {
  return <div className="ps-container-scene"><div className="ps-container-head"><Package size={16}/><span><b>service-api:release</b><small>Illustrative container image</small></span></div><div className="ps-layer-list">{[['Application files','source layer'],['Runtime packages','dependency layer'],['Base image','operating system'],['Image metadata','entrypoint · user']].map(([title,detail],index)=><div className={index===1&&step>0?'selected':''} key={title}><span><i>{index+1}</i>{title}</span><small>{detail}</small></div>)}</div><div className="ps-layer-path"><span>Dockerfile</span><ArrowRight size={14}/><span>Image layer</span><ArrowRight size={14}/><span>Release review</span></div><div className="story-example-foot">{step>1?'Compare update options before changing the build':'Example layer map · no image scan performed'}</div></div>;
}

function ProductVisual({ product, step }: { product: ProductId; step: number }) {
  if (product === 'api-security') return <ApiScene step={step}/>;
  if (product === 'iac-security') return <IacScene step={step}/>;
  if (product === 'container-security') return <ContainerScene step={step}/>;
  if (product === 'vulnerability-management') return <VulnerabilityScene step={step}/>;
  if (product === 'supply-chain') return <SupplyScene step={step}/>;
  if (product === 'secret-scanning') return <SecretScene step={step}/>;
  return <CodeScene step={step}/>;
}

export function ProductStoryPage({ product }: { product: ProductId }) {
  const data = products[product];
  const Icon = data.icon;
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (!playing || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => setStep((current) => (current + 1) % data.steps.length), 4300);
    return () => window.clearInterval(timer);
  }, [data.steps.length, playing]);

  const selectStep = (next: number) => {
    setStep((next + data.steps.length) % data.steps.length);
    setPlaying(false);
  };

  return <main className="product-story">
    <SecuLayerHeader/>
    <div className="ps-wrap">
      <nav className="ps-product-nav" aria-label="Code security products">{routes.map(([label,id])=><Link key={id} className={id===product?'active':''} href={`/products/${id}`}>{label}</Link>)}</nav>
      <section className="ps-hero">
        <div className="ps-hero-copy"><div className="ps-eyebrow"><Icon size={16}/>{data.eyebrow}</div><h1>{data.title}</h1><p>{data.intro}</p><div className="ps-actions"><Link href="/code">Open Kavach workspace <ArrowRight size={16}/></Link><a href="#workflow">Explore the workflow <ArrowDown size={15}/></a></div><div className="ps-example-note"><ShieldCheck size={15}/> Guided example · no repository connection or live scan</div></div>
        <div className="ps-window"><div className="ps-window-bar"><div className="ps-dots"><i/><i/><i/></div><b>KAVACH / {data.eyebrow}</b><span>ILLUSTRATIVE WALKTHROUGH</span></div><div className="ps-window-inner"><div className="ps-workflow-head"><div><small>PRODUCT WORKFLOW · STEP 0{step+1}</small><h2>{data.steps[step].title}</h2><p>{data.steps[step].detail}</p></div><span className="ps-reviewer"><i>MB</i><span><b>Mayur Bharvad</b><small>Security reviewer</small></span></span></div><ProductVisual product={product} step={step}/><div className="ps-controls"><div className="ps-controls-left"><button aria-label="Previous step" onClick={()=>selectStep(step-1)}><ChevronLeft size={16}/></button><button className="ps-play" onClick={()=>setPlaying((value)=>!value)}>{playing?<Pause size={14}/>:<Play size={14}/>} {playing?'Pause':'Play'} walkthrough</button><button aria-label="Restart walkthrough" onClick={()=>{setStep(0);setPlaying(true)}}><RotateCcw size={14}/></button></div><span>Example scenario · no live account data</span><button className="ps-next" onClick={()=>selectStep(step+1)}>Next step <ArrowRight size={14}/></button></div></div></div>
      </section>
      <section className="ps-workflow" id="workflow"><div className="ps-section-head"><div><div className="ps-kicker">HOW IT WORKS</div><h2>One connected workflow. Clear evidence at each step.</h2><p>Select a step to inspect the product-specific view above.</p></div><span className="ps-step-count">0{step+1} <i>/</i> 0{data.steps.length}</span></div>
        <div className="ps-steps">{data.steps.map((item,index)=><button key={item.title} className={step===index?'selected':index<step?'passed':''} onClick={()=>selectStep(index)} aria-current={step===index?'step':undefined}><span className="ps-step-index">{index<step?<Check size={14}/>:`0${index+1}`}</span><span className="ps-step-text"><small>{item.label}</small><b>{item.title}</b><em>{item.detail}</em></span><ChevronRight size={16}/></button>)}</div>
      </section>
      <section className="ps-footer"><div><div className="ps-kicker">KAVACH SECURITY</div><h2>Bring the evidence into your workflow.</h2><p>Open your existing Kavach workspace to connect a project and use its security tools.</p></div><Link href="/code">Open workspace <ArrowRight size={16}/></Link></section>
    </div>
    <style jsx global>{`
      .product-story{min-height:100vh;background:#fff;color:#101828}.ps-wrap{max-width:1320px;margin:0 auto;padding:0 30px 88px}.ps-product-nav{display:flex;gap:26px;overflow:auto;border-bottom:1px solid #e4e7ec;padding:17px 0}.ps-product-nav a{white-space:nowrap;text-decoration:none;color:#667085;font-size:12px}.ps-product-nav a.active{color:#111827;font-weight:700}.ps-hero{display:grid;grid-template-columns:.82fr 1.18fr;gap:clamp(32px,5vw,76px);align-items:center;padding:62px 0 70px}.ps-eyebrow,.ps-kicker{display:flex;align-items:center;gap:9px;color:#2563eb;font-size:10px;font-weight:750;letter-spacing:.14em}.ps-hero-copy h1{max-width:560px;margin:18px 0 14px;font-size:clamp(36px,4.5vw,57px);line-height:1.04;letter-spacing:-.055em}.ps-hero-copy>p{max-width:540px;margin:0;color:#667085;font-size:15px;line-height:1.7}.ps-actions{display:flex;align-items:center;gap:22px;flex-wrap:wrap;margin-top:25px}.ps-actions a,.ps-footer>a{display:flex;align-items:center;gap:8px;text-decoration:none;color:#101828;font-size:12px;font-weight:650}.ps-actions a:first-child,.ps-footer>a{padding:11px 14px;border-radius:6px;background:#111827;color:white}.ps-example-note{display:flex;align-items:center;gap:8px;color:#667085;font-size:10px;margin-top:22px}.ps-example-note svg{color:#15966a}.ps-window{min-width:0;border:1px solid #dfe5ed;border-radius:12px;overflow:hidden;background:#fff;box-shadow:0 18px 50px #10182810}.ps-window-bar{height:40px;display:flex;align-items:center;gap:12px;padding:0 14px;background:#fbfcfe;border-bottom:1px solid #eaecf0}.ps-dots{display:flex;gap:5px}.ps-dots i{width:7px;height:7px;border-radius:50%;background:#e99d95}.ps-dots i:nth-child(2){background:#e6c267}.ps-dots i:nth-child(3){background:#78c294}.ps-window-bar>b{font:650 9px Inter,sans-serif;letter-spacing:.07em;color:#667085}.ps-window-bar>span{margin-left:auto;font-size:8px;color:#667085;letter-spacing:.07em}.ps-window-inner{padding:19px}.ps-workflow-head{display:flex;align-items:flex-start;justify-content:space-between;gap:15px;margin-bottom:16px}.ps-workflow-head>div{min-width:0}.ps-workflow-head small,.ps-scene-label{font-size:9px;color:#667085;font-weight:700;letter-spacing:.1em}.ps-workflow-head h2{font-size:17px;letter-spacing:-.02em;margin:5px 0}.ps-workflow-head p{font-size:11px;color:#667085;line-height:1.5;margin:0;max-width:440px}.ps-reviewer{display:flex;align-items:center;gap:8px;flex:none}.ps-reviewer>i{display:grid;place-items:center;width:29px;height:29px;border-radius:50%;background:#111827;color:white;font-style:normal;font-size:9px;font-weight:700}.ps-reviewer>span{display:grid;gap:3px}.ps-reviewer b{font-size:9px}.ps-reviewer small{font-size:8px;color:#667085}.ps-controls{display:flex;align-items:center;gap:10px;border-top:1px solid #eaecf0;padding-top:12px}.ps-controls-left{display:flex;align-items:center;gap:5px}.ps-controls button{height:28px;display:inline-flex;align-items:center;justify-content:center;gap:5px;border:1px solid #d0d5dd;border-radius:5px;padding:0 7px;background:white;color:#344054;font-size:9px;cursor:pointer}.ps-controls button:hover,.ps-steps button:hover{background:#f8fafc}.ps-controls .ps-play{padding:0 9px}.ps-controls>span{font-size:9px;color:#98a2b3;margin-left:auto}.ps-controls .ps-next{border-color:#111827;background:#111827;color:white;padding:0 10px}.ps-code-scene,.ps-vuln-scene,.ps-supply-scene,.ps-secret-scene{min-height:255px;margin:13px 0 15px;border:1px solid #e4e7ec;border-radius:8px;background:#fcfcfd;overflow:hidden}.ps-editor,.ps-secret-editor{padding:0 0 12px;background:#fff}.ps-file{height:34px;display:flex;align-items:center;gap:7px;padding:0 10px;border-bottom:1px solid #eaecf0;color:#475467;font-size:9px}.ps-file>span{margin-left:auto;color:#98a2b3;font-size:8px}.ps-line,.ps-secret-line{padding:3px 10px;overflow-x:auto;white-space:pre;font:9px/1.6 ui-monospace,Consolas,monospace;color:#475467}.ps-line i,.ps-secret-line i{display:inline-block;width:22px;color:#98a2b3;font-style:normal}.ps-source{background:#eff8ff;color:#175cd3}.ps-sink,.ps-secret-mark{background:#fff5f4;color:#b42318}.ps-flow{padding:12px}.ps-flow-nodes{display:flex;align-items:center;justify-content:center;gap:clamp(6px,2vw,18px);padding:15px 0 7px}.ps-flow-nodes>span{position:relative;min-width:86px;padding:9px 10px;border:1px solid #d0d5dd;border-radius:6px;background:white;text-align:center;font-size:9px;color:#344054}.ps-flow-nodes>span.focus{background:#eff8ff;border-color:#84caff;color:#175cd3}.ps-flow-nodes>span.risk{background:#fff5f4;border-color:#fda29b;color:#b42318}.ps-flow-nodes small{font-size:8px;color:#667085}.ps-flow-nodes>svg{width:14px;color:#98a2b3;flex:none}.ps-diff{display:grid;gap:4px;margin:13px 0 2px;font:8px/1.6 ui-monospace,Consolas,monospace;overflow:auto}.ps-diff>div{padding:5px 8px;white-space:nowrap}.ps-diff .remove{background:#fff1f0;color:#b42318}.ps-diff .add{background:#ecfdf3;color:#067647}.ps-pr{display:flex;align-items:center;gap:9px;margin:22px 0 4px;padding:12px;border:1px solid #d0d5dd;border-radius:6px;background:white;color:#344054}.ps-pr span{display:grid;gap:4px;flex:1}.ps-pr b{font-size:10px}.ps-pr small{font-size:8px;color:#667085}.ps-pr em,.ps-mini-head span{font-style:normal;font-size:8px;letter-spacing:.07em;color:#667085;background:#f2f4f7;border-radius:99px;padding:4px 6px}.ps-vuln-scene,.ps-supply-scene,.ps-secret-scene{display:grid;grid-template-columns:1fr 1fr;background:white}.ps-vuln-list{border-right:1px solid #eaecf0}.ps-mini-head{height:35px;display:flex;align-items:center;justify-content:space-between;padding:0 10px;border-bottom:1px solid #eaecf0;font-size:8px;font-weight:700;letter-spacing:.09em;color:#667085}.ps-mini-row{display:flex;align-items:center;gap:8px;padding:11px 9px;border-bottom:1px solid #f2f4f7;color:#344054}.ps-mini-row.picked{background:#f8faff}.ps-mini-row>i{width:7px;height:7px;border-radius:50%;background:#d92d20;flex:none}.ps-mini-row>i.sev-1{background:#f79009}.ps-mini-row>i.sev-2{background:#eaaa08}.ps-mini-row>span{display:grid;gap:3px;flex:1;min-width:0}.ps-mini-row b{font-size:9px}.ps-mini-row small{font-size:8px;color:#667085;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ps-path{padding:12px}.ps-path-stack{display:grid;justify-items:center;margin:8px 0}.ps-path-node{position:relative;width:76%;min-height:31px;display:flex;align-items:center;gap:7px;padding:5px 8px;border:1px solid #eaecf0;border-radius:5px;background:white;font-size:8px;color:#475467}.ps-path-node>span{width:15px;height:15px;display:grid;place-items:center;background:#f2f4f7;border-radius:50%;font-size:7px}.ps-path-node>svg{position:absolute;bottom:-13px;left:50%;z-index:1;color:#98a2b3}.ps-path-node.path-risk{border-color:#fda29b;background:#fff5f4;color:#b42318}.ps-evidence{display:flex;gap:8px;align-items:center;background:#fffaeb;color:#b54708;border-radius:5px;padding:8px}.ps-evidence>span{display:grid;gap:3px}.ps-evidence b{font-size:8px}.ps-evidence small{font-size:7px;color:#667085}.ps-graph{padding:13px;border-right:1px solid #eaecf0}.ps-graph-root,.ps-package-node,.ps-package-leaf{display:flex;align-items:center;gap:6px;min-height:30px;padding:6px 8px;border:1px solid #d0d5dd;border-radius:5px;background:white;font-size:8px;color:#344054}.ps-graph-root small,.ps-package-node small{margin-left:auto;color:#98a2b3;font-size:7px}.ps-graph-branches{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:10px 0 0 18px;padding-left:9px;border-left:1px solid #98a2b3}.ps-graph-branch{display:grid;gap:7px;align-content:start}.ps-package-node{position:relative}.ps-package-node:before,.ps-package-leaf:before{content:'';position:absolute;left:-10px;width:8px;height:1px;background:#98a2b3}.ps-package-node.package-risk{border-color:#fda29b;background:#fff5f4}.ps-package-leaf{margin-left:11px;background:#fcfcfd;color:#667085}.ps-package-detail{padding:13px}.ps-package-title{display:flex;align-items:center;gap:8px;margin:13px 0}.ps-package-title>span{display:grid;gap:3px}.ps-package-title b{font-size:9px}.ps-package-title small{font-size:7px;color:#667085}.ps-package-facts{display:grid;gap:8px;padding:9px;border:1px solid #eaecf0;border-radius:5px}.ps-package-facts span{display:flex;justify-content:space-between;font-size:8px;color:#667085}.ps-package-facts b{color:#344054;font-weight:600}.ps-version-diff{display:flex;align-items:center;gap:6px;padding:10px 5px;font-size:8px;color:#667085}.ps-version-diff b{color:#b42318;background:#fff1f0;padding:5px;border-radius:4px}.ps-version-diff .version-next{color:#067647;background:#ecfdf3}.ps-note{display:flex;align-items:flex-start;gap:5px;margin-top:10px;font-size:7px;line-height:1.5;color:#667085}.ps-note svg{color:#15966a;flex:none}.ps-secret-editor{border-right:1px solid #eaecf0}.ps-secret-mark b{font-weight:600;letter-spacing:.04em}.ps-secret-mark>span{margin-left:6px;font:700 7px Inter,sans-serif;color:#b42318;letter-spacing:.08em}.ps-secret-meta{display:flex;gap:6px;align-items:center;margin:12px 10px 0;padding:8px;border:1px solid #fedf89;border-radius:5px;background:#fffaeb;color:#b54708;font-size:8px}.ps-secret-response{padding:12px}.ps-commit{display:flex;align-items:center;gap:7px;margin:11px 0;padding:9px;border:1px solid #eaecf0;border-radius:5px}.ps-commit>span{display:grid;gap:3px}.ps-commit b{font-size:8px}.ps-commit small{font-size:7px;color:#667085}.ps-response-order{display:grid;gap:7px}.ps-response-order>div{display:flex;align-items:center;gap:7px;padding:7px;border:1px solid #eaecf0;border-radius:5px}.ps-response-order>div.current{border-color:#fdb022;background:#fffaeb}.ps-response-order i{width:17px;height:17px;display:grid;place-items:center;border-radius:50%;background:#f2f4f7;color:#475467;font-style:normal;font-size:8px}.ps-response-order span{display:grid;gap:3px}.ps-response-order b{font-size:8px}.ps-response-order small{font-size:7px;color:#667085}.ps-workflow{border-top:1px solid #eaecf0;padding:55px 0 58px}.ps-section-head{display:flex;align-items:flex-end;justify-content:space-between;gap:20px}.ps-section-head h2,.ps-footer h2{font-size:clamp(27px,3.4vw,40px);letter-spacing:-.045em;margin:11px 0 6px}.ps-section-head p,.ps-footer p{font-size:13px;color:#667085;line-height:1.6;margin:0}.ps-step-count{font:700 15px ui-monospace,monospace;color:#344054}.ps-step-count i{font-style:normal;color:#98a2b3;margin:0 5px}.ps-steps{display:grid;grid-template-columns:repeat(4,1fr);margin-top:27px;border:1px solid #e4e7ec;border-radius:8px;overflow:hidden}.ps-steps button{display:flex;align-items:flex-start;gap:10px;min-height:126px;padding:16px 13px;border:0;border-right:1px solid #eaecf0;background:white;color:#344054;text-align:left;cursor:pointer}.ps-steps button:last-child{border-right:0}.ps-steps button.selected{background:#f5f8ff;box-shadow:inset 0 2px #2563eb}.ps-step-index{width:23px;height:23px;display:grid;place-items:center;border:1px solid #d0d5dd;border-radius:50%;font:9px ui-monospace,monospace;flex:none}.ps-steps button.passed .ps-step-index{color:#067647;border-color:#abefc6}.ps-step-text{display:grid;gap:6px;flex:1}.ps-step-text small{color:#2563eb;font-size:8px;letter-spacing:.08em;font-weight:700}.ps-step-text b{font-size:10px;line-height:1.4}.ps-step-text em{font-style:normal;font-size:8px;line-height:1.5;color:#667085}.ps-steps button>svg{margin-top:4px;color:#98a2b3;flex:none}.ps-footer{display:flex;align-items:center;justify-content:space-between;gap:22px;padding:24px;border:1px solid #e4e7ec;border-radius:9px;background:#fcfcfd}.ps-footer h2{font-size:23px}.ps-footer>a{white-space:nowrap}
      .ps-api-scene,.ps-iac-scene,.ps-container-scene{margin:13px 0 15px;border:1px solid #e4e7ec;border-radius:8px;overflow:hidden;background:#fff}.ps-api-endpoint{display:flex;align-items:center;gap:8px;padding:11px;border-bottom:1px solid #eaecf0}.ps-api-endpoint>b{padding:5px 7px;border-radius:4px;background:#ecfdf3;color:#067647;font-size:9px}.ps-api-endpoint code{font-size:10px}.ps-api-endpoint>span{margin-left:auto;font-size:8px;letter-spacing:.08em;color:#667085}.ps-api-columns{display:grid;grid-template-columns:1fr 1fr}.ps-api-columns>div{padding:13px}.ps-api-columns>div:first-child{border-right:1px solid #eaecf0}.story-art-label{font-size:9px;font-weight:700;letter-spacing:.09em;color:#667085}.ps-api-flow{display:grid;justify-items:center;gap:3px;margin:10px 0}.ps-api-flow i{width:75%;padding:8px;border:1px solid #d0d5dd;border-radius:5px;text-align:center;font-size:9px;font-style:normal;color:#344054}.ps-api-flow svg{color:#98a2b3}.ps-api-check{display:flex;align-items:center;gap:8px;margin-top:9px;padding:9px;border:1px solid #eaecf0;border-radius:5px}.ps-api-check>span{display:grid;gap:3px}.ps-api-check b{font-size:9px}.ps-api-check small{font-size:8px;color:#667085}.story-example-foot{padding:10px 12px;border-top:1px solid #eaecf0;color:#667085;font-size:8px}.ps-iac-scene .ps-file{height:34px;display:flex;align-items:center;gap:8px;padding:0 12px;border-bottom:1px solid #eaecf0;color:#475467;font-size:10px}.ps-iac-scene .ps-file span{margin-left:auto;font-size:8px;color:#98a2b3}.ps-iac-line{padding:4px 12px;font:9px/1.6 ui-monospace,Consolas,monospace;color:#475467}.ps-iac-line i{display:inline-block;width:22px;color:#98a2b3;font-style:normal}.ps-iac-line.flagged{background:#fff5f4;color:#b42318}.ps-policy-flow,.ps-layer-path{display:flex;align-items:center;justify-content:center;gap:10px;padding:15px 10px}.ps-policy-flow span,.ps-layer-path span{padding:8px 10px;border:1px solid #d0d5dd;border-radius:5px;background:#fcfcfd;color:#475467;font-size:8px}.ps-policy-flow svg,.ps-layer-path svg{color:#98a2b3}.ps-container-head{display:flex;align-items:center;gap:9px;padding:12px;border-bottom:1px solid #eaecf0}.ps-container-head>span{display:grid;gap:3px}.ps-container-head b{font-size:10px}.ps-container-head small{font-size:8px;color:#667085}.ps-layer-list{display:grid;gap:6px;padding:11px}.ps-layer-list>div{display:flex;align-items:center;justify-content:space-between;padding:9px;border:1px solid #eaecf0;border-radius:5px;color:#344054;font-size:9px}.ps-layer-list>div.selected{border-color:#fda29b;background:#fff5f4;color:#b42318}.ps-layer-list>div>span{display:flex;align-items:center;gap:8px}.ps-layer-list i{width:18px;height:18px;display:grid;place-items:center;border-radius:50%;background:#f2f4f7;font-style:normal;font-size:8px}.ps-layer-list small{font-size:8px;color:#667085}
      @media(max-width:900px){.ps-hero{grid-template-columns:1fr}.ps-window{max-width:760px}.ps-steps{grid-template-columns:repeat(2,1fr)}.ps-steps button:nth-child(2){border-right:0}.ps-steps button:nth-child(-n+2){border-bottom:1px solid #eaecf0}}
      @media(max-width:560px){.ps-wrap{padding:0 16px 55px}.ps-hero{padding:42px 0 48px}.ps-workflow{padding:42px 0}.ps-window-inner{padding:12px}.ps-workflow-head{display:block}.ps-reviewer{margin-top:11px}.ps-controls{flex-wrap:wrap}.ps-controls>span{order:3;width:100%;margin:0}.ps-controls .ps-next{margin-left:auto}.ps-vuln-scene,.ps-supply-scene,.ps-secret-scene,.ps-api-columns{grid-template-columns:1fr}.ps-vuln-list,.ps-graph,.ps-secret-editor,.ps-api-columns>div:first-child{border-right:0;border-bottom:1px solid #eaecf0}.ps-vuln-scene,.ps-supply-scene,.ps-secret-scene{min-height:0}.ps-flow-nodes{gap:5px}.ps-flow-nodes>span{min-width:0;padding:7px 5px;font-size:8px}.ps-flow-nodes small{font-size:7px}.ps-section-head{align-items:flex-start}.ps-steps{grid-template-columns:1fr}.ps-steps button{min-height:88px;border-right:0;border-bottom:1px solid #eaecf0!important}.ps-steps button:last-child{border-bottom:0!important}.ps-footer{align-items:flex-start;flex-direction:column;padding:18px}.ps-api-endpoint code{font-size:8px}.ps-policy-flow,.ps-layer-path{gap:4px}.ps-policy-flow span,.ps-layer-path span{padding:7px 5px;font-size:7px}}
      @media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;animation:none!important;transition:none!important}}
    `}</style>
  </main>;
}
