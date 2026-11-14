'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowDown, ArrowRight, Boxes, Check, ChevronRight, Cloud,
  FileCode2, GitBranch, KeyRound,
  Pause, Play, RotateCcw, ShieldAlert, ShieldCheck,
} from 'lucide-react';

type ProductKey = 'sast' | 'api' | 'secrets' | 'dependencies' | 'iac' | 'container' | 'cloud' | 'pentest' | 'dast' | 'runtime' | 'governance';
type Product = {
  key: ProductKey;
  name: string;
  shortName: string;
  title: string;
  href: string;
  stages: string[];
  sceneTitle: string;
};

const products: Product[] = [
  { key: 'sast', name: 'Code security · SAST', shortName: 'SAST', title: 'Trace a code finding to a reviewed change', href: '/products/codebase-scanning', stages: ['Inspect code', 'Trace data flow', 'Review patch', 'Human approval', 'PR handoff'], sceneTitle: 'Code security review' },
  { key: 'api', name: 'API security', shortName: 'API', title: 'Follow an API issue from endpoint to fix', href: '/products/api-security', stages: ['Discover endpoint', 'Trace authorization', 'Review finding', 'Propose fix', 'PR handoff'], sceneTitle: 'API endpoint review' },
  { key: 'secrets', name: 'Secret scanning', shortName: 'Secrets', title: 'Trace an exposed credential and contain it', href: '/products/secret-scanning', stages: ['Detect credential', 'Trace commit history', 'Rotate or revoke', 'Clean history', 'Follow-up scan'], sceneTitle: 'Credential response' },
  { key: 'dependencies', name: 'Dependency security', shortName: 'Dependencies', title: 'Follow package risk through the dependency tree', href: '/products/supply-chain', stages: ['Resolve packages', 'Map dependency path', 'Review advisory', 'Compare versions', 'Review change'], sceneTitle: 'Dependency investigation' },
  { key: 'iac', name: 'Infrastructure as Code', shortName: 'IaC', title: 'Move from a risky config to a reviewed change', href: '/products/iac-security', stages: ['Inspect Terraform', 'Evaluate policy', 'Review exposure', 'Draft config fix', 'Re-evaluate'], sceneTitle: 'Infrastructure policy review' },
  { key: 'container', name: 'Container security', shortName: 'Container', title: 'Trace an image issue to the layer that introduced it', href: '/products/container-security', stages: ['Inspect image', 'Map image layers', 'Review package risk', 'Choose an update', 'Validate release'], sceneTitle: 'Container image review' },
  { key: 'cloud', name: 'Cloud security', shortName: 'Cloud', title: 'Follow cloud exposure to a remediation review', href: '/products/cloud', stages: ['Map cloud assets', 'Trace exposure path', 'Review finding', 'Plan remediation', 'Verify the change'], sceneTitle: 'Cloud posture review' },
];

function Editor({ title, lines, highlight = 1 }: { title: string; lines: string[]; highlight?: number }) {
  return <div className="pshow-editor"><div className="pshow-file"><FileCode2 size={14}/>{title}<span>ILLUSTRATIVE SNIPPET</span></div>{lines.map((line,index)=><div key={line} className={`pshow-code ${index===highlight?'marked':''}`}><i>{index+1}</i><code>{line}</code></div>)}</div>;
}

function Trace({ labels, active = 1 }: { labels: string[]; active?: number }) {
  return <div className="pshow-trace">{labels.map((label,index)=><div className="pshow-trace-item" key={label}><span className={index===active?'focus':''}>{label}</span>{index<labels.length-1&&<ArrowRight size={15}/>}</div>)}</div>;
}

function SastScene({ step }: { step: number }) {
  return <div className="pshow-sast"><Editor title="src/routes/users.ts" highlight={step===0?0:1} lines={["const id = req.query.id;", "const query = `SELECT * FROM users WHERE id = ${id}`;", "return db.execute(query);"]}/>{step===2?<div className="pshow-diff"><span className="minus">− query = `SELECT ... ${'{'}id{'}'}`</span><span className="plus">+ query = 'SELECT ... WHERE id = ?'</span><span className="plus">+ db.execute(query, [id])</span></div>:<Trace active={step===0?0:2} labels={['Request input','Route handler','SQL operation']}/>}<div className="pshow-evidence"><ShieldAlert size={15}/><span><b>{step===3||step===4?'Proposed change awaits human review':'Untrusted input reaches a database query'}</b><small>Example source-to-sink trace · not a scan result</small></span></div></div>;
}

function ApiScene({ step }: { step: number }) {
  return <div className="pshow-api"><div className="pshow-endpoint"><span className="method">GET</span><code>/api/v1/invoices/{'{invoiceId}'}</code><span className="sample-tag">EXAMPLE API</span></div><div className="pshow-api-grid"><div className="pshow-api-path"><span className="pshow-label">REQUEST PATH</span><Trace active={step===1?2:0} labels={['Caller','Invoice route','Object lookup']}/><div className="pshow-auth"><KeyRound size={15}/><span><b>Authorization context</b><small>{step===1?'Check object ownership before returning data':'Route access review'}</small></span></div></div><div className="pshow-api-result"><span className="pshow-label">{step>=2?'REVIEW EVIDENCE':'ROUTE DETAILS'}</span><div><b>Object-level access</b><small>Verify caller can access the requested invoice.</small></div><div><b>Response boundary</b><small>Return only fields permitted for this identity.</small></div><div className="pshow-api-note"><ShieldCheck size={14}/> Suggested change stays reviewable</div></div></div></div>;
}

function SecretScene({ step }: { step: number }) {
  return <div className="pshow-secret"><Editor title="config/payments.ts" highlight={0} lines={['const client = createClient({', '  apiKey: "sk_live_••••••••••••8Q2",', '});']}/><div className="pshow-secret-bottom"><div className="pshow-commit"><GitBranch size={15}/><span><b>Commit history context</b><small>Example branch · credential value remains masked</small></span></div><div className="pshow-response"><span className={step>=2?'current':''}><i>1</i>Rotate or revoke with the provider</span><ArrowDown size={13}/><span className={step>=3?'current':''}><i>2</i>Clean repository history</span><ArrowDown size={13}/><span className={step>=4?'current':''}><i>3</i>Run a follow-up scan</span></div></div></div>;
}

function DependencyScene({ step }: { step: number }) {
  return <div className="pshow-dependencies"><div className="pshow-tree"><div className="root"><Boxes size={14}/> application manifest</div><div className="branch"><div>web framework <small>direct</small></div><div className={step>0?'risk':''}>request parser <small>transitive</small></div><div>utility package <small>transitive</small></div></div><div className="branch second"><div>auth library <small>direct</small></div><div>crypto helper <small>transitive</small></div></div></div><div className="pshow-package"><span className="pshow-label">{step===2?'ADVISORY CONTEXT':step>=3?'VERSION REVIEW':'PACKAGE RELATIONSHIP'}</span><h4>request parser</h4><p>Follow the affected component back to the dependency that introduced it.</p><div className="version-row"><span>Current version</span><b>manifest value</b></div><div className="version-row"><span>Candidate version</span><b className="candidate">review before update</b></div><div className="pshow-api-note"><ShieldCheck size={14}/> Confirm package evidence in the workspace</div></div></div>;
}

function IacScene({ step }: { step: number }) {
  return <div className="pshow-iac"><Editor title="infra/storage.tf" highlight={step===0?1:2} lines={['resource "aws_s3_bucket" "uploads" {', '  bucket = "team-uploads"', '  # public access policy needs review', '}']}/><div className="pshow-policy"><div className="pshow-policy-head"><Cloud size={15}/><span><b>Storage access policy</b><small>Configuration review · illustrative example</small></span><span className="policy-state">{step>=2?'REVIEW':'EVALUATE'}</span></div><Trace labels={['Terraform resource','Policy rule','Proposed change']}/><div className="pshow-diff"><span className="minus">− public access not explicitly blocked</span><span className="plus">+ enable public access block settings</span></div></div></div>;
}

function ContainerScene({ step }: { step: number }) {
  return <div className="pshow-container"><div className="pshow-image-head"><Boxes size={16}/><span><b>service-api:release</b><small>Illustrative image inspection</small></span><span className="sample-tag">IMAGE</span></div><div className="pshow-layers"><div className="layer"><span>Application source</span><small>app files</small></div><div className="layer selected"><span>Runtime packages</span><small>dependency layer</small></div><div className="layer"><span>Base image</span><small>OS packages</small></div><div className="layer"><span>Image metadata</span><small>entrypoint · user</small></div></div><div className="pshow-layer-detail"><span className="pshow-label">{step===2?'PACKAGE REVIEW':step>=3?'REMEDIATION OPTION':'IMAGE LAYER CONTEXT'}</span><h4>Inspect the package in its image layer</h4><p>Review package origin and available update paths before changing the build.</p><div className="pshow-build-flow"><span>Dockerfile</span><ArrowRight size={14}/><span>Image layer</span><ArrowRight size={14}/><span>Release review</span></div></div></div>;
}

function CloudScene({ step }: { step: number }) {
  const nodes = ['Internet', 'Public endpoint', 'Workload identity', 'Data store'];
  return <div className="pshow-cloud"><div className="pshow-cloud-map"><span className="pshow-label">CLOUD EXPOSURE PATH · EXAMPLE</span><div style={{display:'flex',alignItems:'center',gap:7,marginTop:8,fontSize:8,color:'#667085'}}><img src="/integrations/aws.png" alt="AWS" width="18" height="18"/><span>AWS</span><img src="/integrations/kubernetes.png" alt="Kubernetes" width="18" height="18" style={{marginLeft:8}}/><span>Kubernetes</span></div><div className="pshow-cloud-nodes">{nodes.map((node,index)=><div className={index===step%nodes.length?'active':''} key={node}><i>{index===0?<Cloud size={13}/>:index===3?<Boxes size={13}/>:<ShieldAlert size={13}/>}</i><span>{node}</span>{index<nodes.length-1&&<ArrowDown size={13}/>}</div>)}</div></div><div className="pshow-cloud-evidence"><span className="pshow-label">{step===1?'ATTACK PATH':step>=2?'REMEDIATION REVIEW':'ASSET CONTEXT'}</span><h4>Review the relationship between exposure and access</h4><div><b>Entry point</b><small>Publicly reachable service</small></div><div><b>Identity boundary</b><small>Workload permissions to inspect</small></div><div><b>Target resource</b><small>Data store relationship</small></div><p><ShieldCheck size={13}/> Example diagram · no cloud account connected</p></div></div>;
}

function ProductScene({ product, step }: { product: ProductKey; step: number }) {
  if (product==='api') return <ApiScene step={step}/>;
  if (product==='secrets') return <SecretScene step={step}/>;
  if (product==='dependencies') return <DependencyScene step={step}/>;
  if (product==='iac') return <IacScene step={step}/>;
  if (product==='container') return <ContainerScene step={step}/>;
  if (product==='cloud') return <CloudScene step={step}/>;
  if (product==='pentest' || product==='dast' || product==='runtime' || product==='governance') return <TechnicalFlowScene product={product} step={step}/>;
  return <SastScene step={step}/>;
}

function TechnicalFlowScene({ product, step }: { product: ProductKey; step: number }) {
  const examples: Record<string, { title: string; artifact: string; nodes: string[]; evidence: string }> = {
    pentest: { title: 'Authorized assessment run', artifact: 'Scope: staging.example.test', nodes: ['Confirm scope', 'Discover routes', 'Validate safely', 'Collect evidence'], evidence: 'Finding review · no production target' },
    dast: { title: 'Web application test', artifact: 'GET /account/profile', nodes: ['Choose target', 'Crawl routes', 'Test input', 'Review result'], evidence: 'Request and response evidence' },
    runtime: { title: 'Runtime event review', artifact: 'workload: payments-api', nodes: ['Process event', 'Check identity', 'Evaluate policy', 'Review action'], evidence: 'Runtime context · action requires policy' },
    governance: { title: 'Agent tool authorization', artifact: 'tool: infrastructure.apply', nodes: ['Agent request', 'OPA policy', 'Human approval', 'Audit record'], evidence: 'Decision trace · least privilege' },
  };
  const example = examples[product] || examples.pentest;
  return <div className="pshow-technical-flow"><div className="pshow-technical-head"><ShieldCheck size={17}/><span><b>{example.title}</b><small>{example.artifact}</small></span><span className="pshow-sample">EXAMPLE</span></div><div className="pshow-technical-nodes">{example.nodes.map((node,index)=><div key={node} className={index===step%example.nodes.length?'active':''}><i>{String(index+1).padStart(2,'0')}</i><span>{node}</span>{index<example.nodes.length-1&&<ArrowRight size={14}/>}</div>)}</div><div className="pshow-technical-evidence"><ShieldAlert size={15}/><span><b>{example.evidence}</b><small>{step>=example.nodes.length-1?'Ready for reviewer action':'Evidence is revealed as the workflow advances'}</small></span></div></div>;
}

const productStories: Array<Product & { category: string; description: string }> = [
  { ...products[0], category: 'CODE SECURITY', description: 'Trace an unsafe input through the code path, inspect the finding, and review a suggested patch before a human approves the change.' },
  { ...products[3], name: 'Software Composition Analysis', shortName: 'SCA', category: 'DEPENDENCIES', title: 'See how package risk travels through your dependency tree', description: 'Follow a vulnerable transitive package back to the manifest, compare a candidate update, and review the lockfile change.' },
  { ...products[2], category: 'SECRET SCANNING', description: 'Locate a credential in a repository example, inspect commit context, and follow the safe rotation and follow-up review path.' },
  { ...products[5], category: 'CONTAINER SECURITY', description: 'Inspect an image by layer, identify where a package entered the build, and review the update before release.' },
  { ...products[3], name: 'Supply Chain Security', shortName: 'Supply chain', category: 'SUPPLY CHAIN', title: 'Connect package provenance to release review', description: 'Follow package and build evidence through the release path so a reviewer can inspect what is included and where it came from.' },
  { key: 'pentest', name: 'AI Pentesting', shortName: 'AI pentest', title: 'Test an authorized target and collect reviewable evidence', href: '/attack', stages: ['Confirm scope', 'Discover routes', 'Validate safely', 'Collect evidence'], sceneTitle: 'Authorized test workflow', category: 'ATTACK SURFACE', description: 'Walk through a scoped assessment from target authorization to route discovery, safe validation, and evidence review.' },
  { ...products[4], category: 'INFRASTRUCTURE AS CODE', description: 'Find an infrastructure setting that needs review, see the policy impact, and inspect a minimal configuration change.' },
  { ...products[6], category: 'CLOUD SECURITY', description: 'Trace a public entry point through workload identity to a data resource, then review the suggested remediation.' },
  { key: 'dast', name: 'Dynamic Application Security Testing', shortName: 'DAST', title: 'Follow a web test from target to verified evidence', href: '/attack', stages: ['Choose target', 'Crawl routes', 'Test input', 'Review result'], sceneTitle: 'Web application test', category: 'APPLICATION TESTING', description: 'See how a scoped web test maps routes, checks inputs, and presents request evidence for a reviewer.' },
  { key: 'runtime', name: 'Runtime Security', shortName: 'Runtime', title: 'Trace a runtime event to a policy decision', href: '/protect', stages: ['Process event', 'Check identity', 'Evaluate policy', 'Review action'], sceneTitle: 'Runtime event review', category: 'RUNTIME SECURITY', description: 'Follow a workload event through identity context and policy evaluation to a reviewable response.' },
  { key: 'governance', name: 'AI Security Governance', shortName: 'AI governance', title: 'Put a deterministic gate between an agent and a tool', href: '/agent', stages: ['Agent request', 'OPA policy', 'Human approval', 'Audit record'], sceneTitle: 'Agent authorization', category: 'AI GOVERNANCE', description: 'Inspect an agent tool request, evaluate it against a policy, and preserve the human approval and audit steps.' },
  { ...products[1], category: 'API SECURITY', description: 'Trace an API endpoint through identity and object authorization checks, inspect evidence, and review a safe fix.' },
];

function ProductStory({ product, index }: { product: ProductStoryItem; index: number }) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const element = document.getElementById(`product-story-${index}`);
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { threshold: 0.12 });
    observer.observe(element);
    return () => observer.disconnect();
  }, [index]);
  return <article id={`product-story-${index}`} className={`pshow-story ${index % 2 ? 'reverse' : ''} ${visible ? 'is-visible' : ''}`}>
    <div className="pshow-story-copy"><span className="pshow-story-number">{String(index + 1).padStart(2, '0')} <i/> {product.category}</span><h2>{product.title}</h2><p>{product.description}</p><Link href={product.href}>Explore {product.shortName} <ArrowRight size={15}/></Link><div className="pshow-story-steps" aria-label={`${product.shortName} workflow steps`}>{product.stages.map((stage,stageIndex)=><button type="button" key={`${stage}-${stageIndex}`} className={stageIndex===step?'active':''} onClick={()=>setStep(stageIndex)}><i>{String(stageIndex+1).padStart(2,'0')}</i>{stage}</button>)}</div></div>
    <div className="pshow-story-visual"><div className="pshow-story-glow"/><div className="pshow-window"><div className="pshow-window-bar"><div className="pshow-dots"><i/><i/><i/></div><img src="/plugins/situ-design/assets/icons/phosphor-icons-regular/github-logo.svg" alt="GitHub" width="14" height="14"/><span>KAVACH · {product.name.toUpperCase()}</span><span className="pshow-sample">EXAMPLE FLOW</span></div><div className="pshow-story-scene"><div className="pshow-stage-head"><div><span className="pshow-label">{product.sceneTitle.toUpperCase()} · STEP {String(step+1).padStart(2,'0')}</span><h3>{product.stages[step]}</h3></div><span className="reviewer"><i>MB</i><span><b>Mayur Bharvad</b><small>Security reviewer</small></span></span></div><ProductScene product={product.key} step={step}/><div className="pshow-story-controls"><span>Illustrative workflow · no scan or account data</span><button type="button" onClick={()=>setStep((step+1)%product.stages.length)}>Next step <ArrowRight size={14}/></button></div></div></div><div className="pshow-story-backdrop" aria-hidden="true">KAVACH / PRODUCT WORKFLOW</div></div>
  </article>;
}

type ProductStoryItem = (typeof productStories)[number];

export function ProductShowcase() {
  const [active, setActive] = useState(0);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);
  const product = products[active];

  useEffect(() => {
    if (!playing || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => setStep((current) => (current+1)%product.stages.length), 3600);
    return () => window.clearInterval(timer);
  }, [playing, product]);

  const selectProduct = (index: number) => { setActive(index); setStep(0); setPlaying(true); };
  const selectStep = (index: number) => { setStep((index+product.stages.length)%product.stages.length); setPlaying(false); };

  return <section id="product-walkthrough" className="pshow-section">
    <div className="pshow-heading"><div><div className="pshow-eyebrow"><span/> PRODUCT WORKFLOWS <span className="pshow-sample">ILLUSTRATIVE WALKTHROUGH</span></div><h1>See how each Kavach product works.</h1><p>Choose a product. Follow its workflow and inspect the product-specific evidence, diagrams, and review points.</p></div><div className="pshow-heading-actions"><Link className="explore" href={product.href}>Explore {product.shortName} <ArrowRight size={15}/></Link><Link className="get-started" href="/signup">Get started <ArrowRight size={15}/></Link></div></div>
    <div className="pshow-tabs" role="tablist" aria-label="Kavach product workflows">{products.map((item,index)=><button key={item.key} role="tab" aria-selected={active===index} onClick={()=>selectProduct(index)}>{item.shortName}</button>)}</div>
    <div className="pshow-window"><div className="pshow-window-bar"><div className="pshow-dots"><i/><i/><i/></div><img src="/plugins/situ-design/assets/icons/phosphor-icons-regular/github-logo.svg" alt="GitHub" width="14" height="14"/><span>KAVACH · {product.name.toUpperCase()}</span><span className="pshow-sample">SAMPLE SCENARIO</span></div>
      <div className="pshow-workspace"><aside className="pshow-steps"><span className="pshow-label">WORKFLOW</span><h3>{product.title}</h3>{product.stages.map((stage,index)=><button key={stage} className={index===step?'active':index<step?'visited':''} aria-current={index===step?'step':undefined} onClick={()=>selectStep(index)}><i>{index<step?<Check size={13}/>:index+1}</i><span>{stage}</span><ChevronRight size={14}/></button>)}<button className="pshow-play" onClick={()=>setPlaying((value)=>!value)}>{playing?<Pause size={14}/>:<Play size={14}/>} {playing?'Pause walkthrough':'Play walkthrough'}</button></aside>
        <div className="pshow-stage"><div className="pshow-stage-head"><div><span className="pshow-label">{product.sceneTitle.toUpperCase()} · STEP 0{step+1}</span><h3>{product.stages[step]}</h3></div><span className="reviewer"><i>MB</i><span><b>Mayur Bharvad</b><small>Security reviewer</small></span></span></div><ProductScene product={product.key} step={step}/><div className="pshow-stage-foot"><span>Example interface · no live repository or account data</span><div><button aria-label="Restart walkthrough" onClick={()=>{setStep(0);setPlaying(true)}}><RotateCcw size={14}/></button><button className="next" onClick={()=>selectStep(step+1)}>Next step <ArrowRight size={14}/></button></div></div></div>
      </div>
    </div>
    <div className="pshow-note"><ShieldCheck size={15}/> Interactive product walkthrough · sample scenarios only · no scan is started</div>
    <div className="pshow-storylist" aria-label="Kavach product stories">
      {productStories.map((story,index)=><ProductStory key={`${story.category}-${story.shortName}`} product={story} index={index}/>)}
    </div>
    <style jsx global>{`
      .pshow-section {
        max-width: 1380px;
        margin: 0 auto;
        padding: 32px clamp(16px, 3vw, 24px) 80px;
        color: #0F172A;
        font-family: var(--font-sans, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
      }
      .pshow-heading {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        gap: 28px;
        margin-bottom: 24px;
      }
      .pshow-eyebrow {
        display: flex;
        align-items: center;
        gap: 10px;
        color: #2563EB;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        font-family: var(--font-mono, monospace);
      }
      .pshow-eyebrow > span:first-child {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #10B981;
      }
      .pshow-sample {
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.05em;
        color: #475569;
        background: #F1F5F9;
        border: 1px solid #E2E8F0;
        padding: 4px 10px;
        border-radius: 9999px;
        white-space: nowrap;
      }
      .pshow-heading h1 {
        font-size: clamp(32px, 4vw, 44px);
        font-weight: 800;
        letter-spacing: -0.03em;
        color: #0F172A;
        margin: 14px 0 10px;
        line-height: 1.15;
      }
      .pshow-heading p {
        max-width: 720px;
        margin: 0;
        color: #475569;
        font-size: 16px;
        line-height: 1.6;
      }
      .pshow-heading-actions {
        display: flex;
        align-items: center;
        gap: 12px;
        white-space: nowrap;
      }
      .pshow-heading-actions a {
        display: flex;
        align-items: center;
        gap: 8px;
        border: 1px solid #CBD5E1;
        border-radius: 6px;
        padding: 10px 16px;
        font-size: 14px;
        font-weight: 600;
        text-decoration: none;
        color: #0F172A;
        background: #FFFFFF;
        transition: all 0.15s ease;
      }
      .pshow-heading-actions a:hover {
        background: #F8FAFC;
        border-color: #94A3B8;
      }
      .pshow-heading-actions .get-started {
        background: #0F172A;
        border-color: #0F172A;
        color: #FFFFFF;
      }
      .pshow-heading-actions .get-started:hover {
        background: #1E293B;
        border-color: #1E293B;
      }
      .pshow-tabs {
        display: flex;
        overflow-x: auto;
        border-bottom: 1px solid #E2E8F0;
        gap: 28px;
        margin-bottom: 20px;
      }
      .pshow-tabs button {
        padding: 14px 4px;
        border: 0;
        border-bottom: 2px solid transparent;
        background: transparent;
        color: #64748B;
        font-size: 14px;
        font-weight: 600;
        white-space: nowrap;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .pshow-tabs button:hover {
        color: #0F172A;
      }
      .pshow-tabs button[aria-selected=true] {
        border-bottom-color: #2563EB;
        color: #0F172A;
        font-weight: 700;
      }
      .pshow-window {
        border: 1px solid #E2E8F0;
        border-radius: 12px;
        margin-top: 16px;
        background: #FFFFFF;
        overflow: hidden;
        box-shadow: 0 10px 30px rgba(15, 23, 42, 0.05);
      }
      .pshow-window-bar {
        height: 44px;
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 0 18px;
        border-bottom: 1px solid #E2E8F0;
        color: #475569;
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 0.06em;
        background: #F8FAFC;
      }
      .pshow-window-bar > .pshow-sample {
        margin-left: auto;
      }
      .pshow-dots {
        display: flex;
        gap: 6px;
      }
      .pshow-dots i {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: #EF4444;
      }
      .pshow-dots i:nth-child(2) {
        background: #F59E0B;
      }
      .pshow-dots i:nth-child(3) {
        background: #10B981;
      }
      .pshow-workspace {
        display: grid;
        grid-template-columns: 280px minmax(0, 1fr);
        min-height: 460px;
      }
      .pshow-steps {
        padding: 24px 18px;
        border-right: 1px solid #E2E8F0;
        background: #F8FAFC;
      }
      .pshow-label {
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.1em;
        color: #64748B;
        text-transform: uppercase;
        font-family: var(--font-mono, monospace);
      }
      .pshow-steps h3 {
        font-size: 15px;
        font-weight: 700;
        line-height: 1.45;
        margin: 10px 0 18px;
        color: #0F172A;
        letter-spacing: -0.01em;
      }
      .pshow-steps > button:not(.pshow-play) {
        display: flex;
        align-items: center;
        width: 100%;
        gap: 12px;
        padding: 10px 12px;
        margin: 4px 0;
        border: 1px solid transparent;
        border-radius: 8px;
        background: transparent;
        text-align: left;
        color: #475569;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .pshow-steps > button:not(.pshow-play):hover {
        background: #F1F5F9;
        color: #0F172A;
      }
      .pshow-steps > button.active {
        background: #EFF6FF;
        border-color: #BFDBFE;
        color: #1D4ED8;
      }
      .pshow-steps > button.visited {
        color: #059669;
      }
      .pshow-steps > button i {
        width: 24px;
        height: 24px;
        display: grid;
        place-items: center;
        border: 1px solid #CBD5E1;
        border-radius: 50%;
        font-size: 11px;
        font-weight: 700;
        font-style: normal;
        flex: none;
        background: #FFFFFF;
      }
      .pshow-steps > button.active i {
        background: #DBEAFE;
        border-color: #60A5FA;
        color: #1D4ED8;
      }
      .pshow-steps > button.visited i {
        background: #ECFDF5;
        border-color: #A7F3D0;
        color: #059669;
      }
      .pshow-steps > button > span {
        font-size: 13px;
        font-weight: 600;
        flex: 1;
      }
      .pshow-steps > button > svg {
        width: 14px;
        height: 14px;
        color: #94A3B8;
      }
      .pshow-play {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 20px;
        padding: 9px 14px;
        border: 1px solid #CBD5E1;
        border-radius: 6px;
        background: #FFFFFF;
        color: #334155;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .pshow-play:hover {
        background: #F8FAFC;
        border-color: #94A3B8;
      }
      .pshow-stage {
        padding: 24px 32px;
        min-width: 0;
        display: flex;
        flex-direction: column;
      }
      .pshow-stage-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 16px;
        padding-bottom: 18px;
        border-bottom: 1px solid #E2E8F0;
      }
      .pshow-stage-head h3 {
        font-size: 18px;
        font-weight: 700;
        margin: 6px 0 0;
        color: #0F172A;
        letter-spacing: -0.02em;
      }
      .reviewer {
        display: flex;
        align-items: center;
        gap: 10px;
        flex: none;
      }
      .reviewer > i {
        display: grid;
        place-items: center;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: #0F172A;
        color: #FFFFFF;
        font-style: normal;
        font-size: 11px;
        font-weight: 700;
      }
      .reviewer > span {
        display: grid;
        gap: 2px;
      }
      .reviewer b {
        font-size: 13px;
        font-weight: 600;
        color: #0F172A;
      }
      .reviewer small {
        font-size: 11px;
        color: #64748B;
      }
      .pshow-stage-foot {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        border-top: 1px solid #E2E8F0;
        padding-top: 16px;
        margin-top: auto;
        color: #64748B;
        font-size: 12px;
      }
      .pshow-stage-foot > div {
        display: flex;
        gap: 8px;
      }
      .pshow-stage-foot button {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 14px;
        border: 1px solid #CBD5E1;
        border-radius: 6px;
        background: #FFFFFF;
        color: #334155;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .pshow-stage-foot button:hover {
        background: #F8FAFC;
        border-color: #94A3B8;
      }
      .pshow-stage-foot button.next {
        background: #0F172A;
        border-color: #0F172A;
        color: #FFFFFF;
      }
      .pshow-stage-foot button.next:hover {
        background: #1E293B;
        border-color: #1E293B;
      }
      .pshow-note {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 16px 4px;
        color: #64748B;
        font-size: 13px;
      }
      .pshow-note svg {
        color: #10B981;
        flex: none;
      }
      .pshow-editor {
        border: 1px solid #E2E8F0;
        border-radius: 8px;
        overflow: hidden;
        background: #FFFFFF;
      }
      .pshow-file {
        height: 38px;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 0 14px;
        border-bottom: 1px solid #E2E8F0;
        color: #334155;
        font-size: 13px;
        font-weight: 600;
        font-family: var(--font-mono, monospace);
        background: #F8FAFC;
      }
      .pshow-file > span {
        margin-left: auto;
        color: #64748B;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.08em;
      }
      .pshow-code {
        display: flex;
        gap: 14px;
        padding: 6px 14px;
        white-space: nowrap;
        overflow: auto;
        font: 13.5px/1.75 'JetBrains Mono', 'Fira Code', ui-monospace, Menlo, Consolas, monospace;
        color: #334155;
      }
      .pshow-code i {
        width: 20px;
        color: #94A3B8;
        font-style: normal;
        text-align: right;
        user-select: none;
      }
      .pshow-code.marked {
        background: #FEF2F2;
        color: #B91C1C;
        font-weight: 600;
      }
      .pshow-sast, .pshow-api, .pshow-secret, .pshow-dependencies, .pshow-iac, .pshow-container, .pshow-cloud {
        max-width: 860px;
        margin: 20px auto 18px;
        border: 1px solid #E2E8F0;
        border-radius: 10px;
        overflow: hidden;
        background: #FFFFFF;
        box-shadow: 0 2px 8px rgba(15, 23, 42, 0.03);
      }
      .pshow-trace {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 14px;
        padding: 18px 14px;
      }
      .pshow-trace-item {
        display: flex;
        align-items: center;
        gap: 14px;
        color: #94A3B8;
      }
      .pshow-trace-item > span {
        padding: 8px 14px;
        border: 1px solid #CBD5E1;
        border-radius: 6px;
        background: #FFFFFF;
        color: #334155;
        font-size: 13px;
        font-weight: 600;
        text-align: center;
      }
      .pshow-trace-item > span.focus {
        border-color: #F87171;
        background: #FEF2F2;
        color: #B91C1C;
      }
      .pshow-evidence {
        display: flex;
        align-items: center;
        gap: 12px;
        margin: 0 14px 14px;
        padding: 12px 14px;
        border: 1px solid #FDE68A;
        border-radius: 8px;
        background: #FFFBEB;
        color: #B45309;
      }
      .pshow-evidence > span {
        display: grid;
        gap: 4px;
      }
      .pshow-evidence b {
        font-size: 13.5px;
        font-weight: 700;
      }
      .pshow-evidence small {
        font-size: 12px;
        color: #78350F;
      }
      .pshow-diff {
        display: grid;
        gap: 4px;
        padding: 14px;
        font: 13px/1.6 'JetBrains Mono', ui-monospace, monospace;
        overflow: auto;
        background: #F8FAFC;
        border-top: 1px solid #E2E8F0;
        border-bottom: 1px solid #E2E8F0;
      }
      .pshow-diff span {
        white-space: nowrap;
        padding: 6px 10px;
        border-radius: 4px;
      }
      .pshow-diff .minus {
        background: #FEF2F2;
        color: #DC2626;
        border: 1px solid #FCA5A5;
      }
      .pshow-diff .plus {
        background: #ECFDF5;
        color: #059669;
        border: 1px solid #6EE7B7;
      }
      .pshow-endpoint {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 14px 18px;
        border-bottom: 1px solid #E2E8F0;
        background: #F8FAFC;
      }
      .pshow-endpoint .method {
        padding: 4px 8px;
        background: #ECFDF5;
        color: #059669;
        border: 1px solid #A7F3D0;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 700;
        font-family: var(--font-mono, monospace);
      }
      .pshow-endpoint code {
        font-size: 13.5px;
        font-weight: 600;
        color: #1E293B;
        font-family: var(--font-mono, monospace);
      }
      .sample-tag {
        margin-left: auto;
        padding: 4px 10px;
        border-radius: 9999px;
        background: #F1F5F9;
        border: 1px solid #E2E8F0;
        color: #475569;
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.06em;
      }
      .pshow-api-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
      }
      .pshow-api-path, .pshow-api-result {
        padding: 16px 18px;
      }
      .pshow-api-path {
        border-right: 1px solid #E2E8F0;
      }
      .pshow-api-path .pshow-trace {
        display: grid;
        justify-content: stretch;
        gap: 8px;
        padding: 10px 0;
      }
      .pshow-api-path .pshow-trace-item {
        justify-content: center;
        flex-direction: column;
        gap: 6px;
      }
      .pshow-api-path .pshow-trace-item > svg {
        transform: rotate(90deg);
      }
      .pshow-api-path .pshow-trace-item > span {
        width: 85%;
      }
      .pshow-auth {
        display: flex;
        gap: 10px;
        align-items: center;
        padding: 12px;
        border: 1px solid #E2E8F0;
        border-radius: 8px;
        margin-top: 10px;
        background: #F8FAFC;
      }
      .pshow-auth > span {
        display: grid;
        gap: 3px;
      }
      .pshow-auth b, .pshow-api-result b {
        font-size: 13px;
        font-weight: 600;
        color: #0F172A;
      }
      .pshow-auth small, .pshow-api-result small {
        font-size: 12px;
        color: #64748B;
        line-height: 1.4;
      }
      .pshow-api-result {
        display: grid;
        align-content: start;
        gap: 10px;
      }
      .pshow-api-result > div:not(.pshow-api-note) {
        display: grid;
        gap: 4px;
        padding: 12px;
        border: 1px solid #E2E8F0;
        border-radius: 8px;
        background: #F8FAFC;
      }
      .pshow-api-note {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #059669;
        font-size: 12px;
        font-weight: 600;
        margin-top: 6px;
      }
      .pshow-secret {
        display: grid;
        grid-template-columns: 1fr 1fr;
      }
      .pshow-secret > .pshow-editor {
        border: 0;
        border-right: 1px solid #E2E8F0;
        border-radius: 0;
      }
      .pshow-secret-bottom {
        padding: 18px;
      }
      .pshow-commit {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px;
        background: #F8FAFC;
        border: 1px solid #E2E8F0;
        border-radius: 8px;
      }
      .pshow-commit > span {
        display: grid;
        gap: 3px;
      }
      .pshow-commit b {
        font-size: 13px;
        font-weight: 600;
        color: #0F172A;
      }
      .pshow-commit small {
        font-size: 12px;
        color: #64748B;
      }
      .pshow-response {
        display: grid;
        justify-items: center;
        gap: 6px;
        margin-top: 14px;
      }
      .pshow-response > span {
        display: flex;
        align-items: center;
        gap: 10px;
        width: 100%;
        padding: 10px 12px;
        border: 1px solid #E2E8F0;
        border-radius: 6px;
        font-size: 12.5px;
        font-weight: 500;
        color: #334155;
        background: #FFFFFF;
      }
      .pshow-response > span.current {
        border-color: #F59E0B;
        background: #FFFBEB;
        color: #92400E;
        font-weight: 600;
      }
      .pshow-response i {
        width: 22px;
        height: 22px;
        display: grid;
        place-items: center;
        border-radius: 50%;
        background: #F1F5F9;
        font-style: normal;
        font-size: 11px;
        font-weight: 700;
      }
      .pshow-response > svg {
        color: #94A3B8;
      }
      .pshow-dependencies {
        display: grid;
        grid-template-columns: 1.15fr 0.85fr;
      }
      .pshow-tree {
        padding: 18px;
        border-right: 1px solid #E2E8F0;
      }
      .pshow-tree .root, .pshow-tree .branch > div {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 12px;
        border: 1px solid #E2E8F0;
        border-radius: 6px;
        font-size: 13px;
        font-weight: 500;
        color: #1E293B;
      }
      .pshow-tree .root {
        background: #F8FAFC;
        font-weight: 600;
      }
      .pshow-tree .branch {
        display: grid;
        gap: 8px;
        margin: 10px 0 0 20px;
        padding-left: 12px;
        border-left: 2px solid #CBD5E1;
      }
      .pshow-tree .branch > div {
        position: relative;
      }
      .pshow-tree .branch > div:before {
        content: '';
        position: absolute;
        left: -14px;
        width: 12px;
        border-top: 2px solid #CBD5E1;
      }
      .pshow-tree small {
        margin-left: auto;
        font-size: 11px;
        font-weight: 600;
        color: #64748B;
        background: #F1F5F9;
        padding: 2px 6px;
        border-radius: 4px;
      }
      .pshow-tree .branch > div.risk {
        border-color: #FCA5A5;
        background: #FEF2F2;
        color: #DC2626;
        font-weight: 600;
      }
      .pshow-tree .branch.second {
        margin-left: 36px;
      }
      .pshow-package {
        padding: 18px;
      }
      .pshow-package h4, .pshow-layer-detail h4 {
        font-size: 15px;
        font-weight: 700;
        color: #0F172A;
        margin: 12px 0 8px;
      }
      .pshow-package p, .pshow-layer-detail p {
        font-size: 13px;
        line-height: 1.6;
        color: #475569;
        margin: 0 0 14px;
      }
      .version-row {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        padding: 10px 0;
        border-top: 1px solid #E2E8F0;
        font-size: 13px;
        color: #64748B;
      }
      .version-row b {
        color: #0F172A;
        font-weight: 600;
        font-family: var(--font-mono, monospace);
      }
      .version-row .candidate {
        color: #059669;
      }
      .pshow-policy {
        border-top: 1px solid #E2E8F0;
      }
      .pshow-policy-head {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 14px 18px;
        color: #1E293B;
        background: #F8FAFC;
      }
      .pshow-policy-head > span:nth-child(2) {
        display: grid;
        gap: 3px;
      }
      .pshow-policy-head b {
        font-size: 13.5px;
        font-weight: 600;
      }
      .pshow-policy-head small {
        font-size: 12px;
        color: #64748B;
      }
      .pshow-policy-head .policy-state {
        margin-left: auto;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.08em;
        color: #2563EB;
        background: #EFF6FF;
        padding: 4px 10px;
        border-radius: 9999px;
        border: 1px solid #BFDBFE;
      }
      .pshow-iac .pshow-trace {
        padding: 16px;
      }
      .pshow-iac .pshow-diff {
        padding: 12px 16px;
      }
      .pshow-container {
        display: grid;
        grid-template-columns: 0.85fr 1.15fr;
      }
      .pshow-image-head {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 14px 18px;
        border-right: 1px solid #E2E8F0;
        background: #F8FAFC;
      }
      .pshow-image-head > span:nth-child(2) {
        display: grid;
        gap: 3px;
      }
      .pshow-image-head b {
        font-size: 13.5px;
        font-weight: 600;
        color: #0F172A;
      }
      .pshow-image-head small {
        font-size: 12px;
        color: #64748B;
      }
      .pshow-layers {
        grid-row: 2;
        padding: 12px 16px 18px;
        border-right: 1px solid #E2E8F0;
      }
      .pshow-layers .layer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
        margin-top: 8px;
        padding: 10px 12px;
        border: 1px solid #E2E8F0;
        border-radius: 6px;
        font-size: 13px;
        color: #334155;
      }
      .pshow-layers .layer.selected {
        border-color: #FCA5A5;
        background: #FEF2F2;
        color: #DC2626;
        font-weight: 600;
      }
      .pshow-layers small {
        color: #64748B;
        font-size: 11px;
      }
      .pshow-layer-detail {
        grid-column: 2;
        grid-row: 1/3;
        padding: 18px 24px;
      }
      .pshow-build-flow {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        margin-top: 20px;
      }
      .pshow-build-flow span {
        padding: 8px 14px;
        border: 1px solid #CBD5E1;
        border-radius: 6px;
        background: #F8FAFC;
        font-size: 12.5px;
        font-weight: 600;
        color: #334155;
      }
      .pshow-cloud {
        display: grid;
        grid-template-columns: 1fr 1fr;
      }
      .pshow-cloud-map {
        padding: 18px;
        border-right: 1px solid #E2E8F0;
      }
      .pshow-cloud-nodes {
        display: grid;
        justify-items: center;
        gap: 8px;
        margin-top: 14px;
      }
      .pshow-cloud-nodes > div {
        position: relative;
        display: flex;
        align-items: center;
        gap: 10px;
        width: 82%;
        padding: 10px 14px;
        border: 1px solid #CBD5E1;
        border-radius: 8px;
        background: #FFFFFF;
        font-size: 13px;
        font-weight: 600;
        color: #334155;
      }
      .pshow-cloud-nodes > div.active {
        border-color: #60A5FA;
        background: #EFF6FF;
        color: #1D4ED8;
      }
      .pshow-cloud-nodes i {
        display: grid;
        place-items: center;
        width: 28px;
        height: 28px;
        border-radius: 6px;
        background: #F1F5F9;
        font-style: normal;
      }
      .pshow-cloud-nodes > div > svg {
        position: absolute;
        bottom: -14px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 1;
        color: #94A3B8;
      }
      .pshow-cloud-evidence {
        display: grid;
        align-content: start;
        gap: 10px;
        padding: 18px 20px;
      }
      .pshow-cloud-evidence h4 {
        font-size: 14.5px;
        font-weight: 700;
        line-height: 1.45;
        margin: 6px 0 2px;
        color: #0F172A;
      }
      .pshow-cloud-evidence > div {
        display: grid;
        gap: 4px;
        padding: 10px 12px;
        border: 1px solid #E2E8F0;
        border-radius: 6px;
        background: #F8FAFC;
      }
      .pshow-cloud-evidence b {
        font-size: 13px;
        font-weight: 600;
        color: #0F172A;
      }
      .pshow-cloud-evidence small {
        font-size: 12px;
        color: #64748B;
      }
      .pshow-cloud-evidence p {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 6px 0 0;
        font-size: 12px;
        color: #059669;
        font-weight: 500;
      }
      @media (max-width: 820px) {
        .pshow-heading {
          align-items: flex-start;
          flex-direction: column;
        }
        .pshow-workspace {
          grid-template-columns: 240px 1fr;
        }
        .pshow-tabs {
          gap: 18px;
        }
      }
      @media (max-width: 640px) {
        .pshow-section {
          padding-bottom: 52px;
        }
        .pshow-heading-actions {
          width: 100%;
        }
        .pshow-workspace {
          grid-template-columns: 1fr;
        }
        .pshow-steps {
          border-right: 0;
          border-bottom: 1px solid #E2E8F0;
          padding: 16px;
        }
        .pshow-steps h3 {
          margin: 6px 0;
        }
        .pshow-steps > button:not(.pshow-play) {
          display: inline-flex;
          width: 100%;
        }
        .pshow-steps > button > svg {
          display: none;
        }
        .pshow-play {
          margin-top: 10px;
        }
        .pshow-stage {
          padding: 16px 12px;
        }
        .reviewer > span {
          display: none;
        }
        .pshow-api-grid, .pshow-secret, .pshow-dependencies, .pshow-container, .pshow-cloud {
          grid-template-columns: 1fr;
        }
        .pshow-api-path, .pshow-tree, .pshow-secret > .pshow-editor, .pshow-cloud-map {
          border-right: 0;
          border-bottom: 1px solid #E2E8F0;
        }
        .pshow-image-head {
          border-right: 0;
        }
        .pshow-layers {
          grid-row: auto;
          border-right: 0;
        }
        .pshow-layer-detail {
          grid-column: 1;
          grid-row: auto;
          border-top: 1px solid #E2E8F0;
        }
        .pshow-stage-foot {
          align-items: flex-start;
          flex-direction: column;
        }
        .pshow-stage-foot > div {
          align-self: flex-end;
        }
        .pshow-trace {
          gap: 6px;
        }
        .pshow-trace-item {
          gap: 6px;
        }
        .pshow-trace-item > span {
          padding: 6px 10px;
          font-size: 11px;
        }
      }
      .pshow-storylist {
        border-top: 1px solid #E2E8F0;
        margin-top: 54px;
      }
      .pshow-story {
        display: grid;
        grid-template-columns: minmax(0, 0.88fr) minmax(0, 1.12fr);
        gap: clamp(32px, 6vw, 80px);
        align-items: center;
        padding: clamp(54px, 7vw, 96px) clamp(8px, 3vw, 32px);
        border-bottom: 1px solid #E2E8F0;
        min-height: 480px;
        scroll-margin-top: 88px;
        opacity: 0;
        transform: translateY(24px);
        transition: opacity 0.65s ease, transform 0.65s ease;
      }
      .pshow-story.is-visible {
        opacity: 1;
        transform: translateY(0);
      }
      .pshow-story.reverse {
        grid-template-columns: minmax(0, 1.12fr) minmax(0, 0.88fr);
      }
      .pshow-story.reverse .pshow-story-copy {
        order: 2;
      }
      .pshow-story.reverse .pshow-story-visual {
        order: 1;
      }
      .pshow-story-copy {
        max-width: 460px;
      }
      .pshow-story-number {
        display: flex;
        align-items: center;
        gap: 12px;
        color: #64748B;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.12em;
        font-family: var(--font-mono, monospace);
      }
      .pshow-story-number:first-letter {
        color: #2563EB;
      }
      .pshow-story-number i {
        width: 28px;
        border-top: 1.5px solid #CBD5E1;
      }
      .pshow-story-copy h2 {
        margin: 18px 0 14px;
        color: #0F172A;
        font-size: clamp(28px, 3.5vw, 42px);
        line-height: 1.15;
        letter-spacing: -0.035em;
        font-weight: 750;
      }
      .pshow-story-copy > p {
        margin: 0;
        color: #475569;
        font-size: 16px;
        line-height: 1.7;
        max-width: 440px;
      }
      .pshow-story-copy > a {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        margin-top: 24px;
        color: #0F172A;
        font-size: 14px;
        font-weight: 600;
        text-decoration: none;
        transition: all 0.15s ease;
      }
      .pshow-story-copy > a:hover {
        color: #2563EB;
        text-decoration: underline;
        text-underline-offset: 4px;
      }
      .pshow-story-steps {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 26px;
      }
      .pshow-story-steps button {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        border: 1px solid #CBD5E1;
        border-radius: 6px;
        background: #FFFFFF;
        color: #475569;
        font-size: 12.5px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .pshow-story-steps button:hover {
        background: #F8FAFC;
        border-color: #94A3B8;
        color: #0F172A;
      }
      .pshow-story-steps button.active {
        border-color: #2563EB;
        background: #EFF6FF;
        color: #1D4ED8;
      }
      .pshow-story-steps button i {
        font-style: normal;
        color: #94A3B8;
        font-size: 11px;
        font-weight: 700;
      }
      .pshow-story-visual {
        position: relative;
        min-width: 0;
        padding: 24px 14px;
      }
      .pshow-story-glow {
        position: absolute;
        inset: 0 4% 6%;
        border-radius: 20px;
        background: radial-gradient(ellipse at center, rgba(37, 99, 235, 0.06) 0%, rgba(241, 245, 249, 0.6) 45%, rgba(255, 255, 255, 0) 75%);
        z-index: -1;
      }
      .pshow-story-visual .pshow-window {
        position: relative;
        margin: 0;
        border-radius: 12px;
        box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08);
      }
      .pshow-story-visual .pshow-window-bar {
        height: 44px;
        font-size: 12px;
      }
      .pshow-story-scene {
        padding: 20px clamp(14px, 2.5vw, 28px) 16px;
      }
      .pshow-story-scene .pshow-stage-head {
        margin-bottom: 16px;
      }
      .pshow-story-scene .pshow-stage-head h3 {
        font-size: 18px;
      }
      .pshow-story-controls {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
        margin-top: 16px;
        padding-top: 14px;
        border-top: 1px solid #E2E8F0;
        color: #64748B;
        font-size: 12px;
      }
      .pshow-story-controls button {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 14px;
        border: 1px solid #CBD5E1;
        border-radius: 6px;
        background: #FFFFFF;
        color: #0F172A;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .pshow-story-controls button:hover {
        background: #F8FAFC;
        border-color: #94A3B8;
      }
      .pshow-story-backdrop {
        position: absolute;
        right: 0;
        bottom: 0;
        color: #CBD5E1;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.16em;
        transform: translateY(16px);
        font-family: var(--font-mono, monospace);
      }
      .pshow-technical-flow {
        border: 1px solid #E2E8F0;
        border-radius: 10px;
        background: #FFFFFF;
        overflow: hidden;
        box-shadow: 0 2px 8px rgba(15, 23, 42, 0.03);
      }
      .pshow-technical-head {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 14px 18px;
        border-bottom: 1px solid #E2E8F0;
        color: #0F172A;
        background: #F8FAFC;
      }
      .pshow-technical-head > span:nth-child(2) {
        display: grid;
        gap: 3px;
      }
      .pshow-technical-head b {
        font-size: 14px;
        font-weight: 600;
      }
      .pshow-technical-head small {
        font-size: 12px;
        color: #64748B;
      }
      .pshow-technical-head > .pshow-sample {
        margin-left: auto;
      }
      .pshow-technical-nodes {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: clamp(8px, 1.5vw, 18px);
        padding: 28px 16px;
      }
      .pshow-technical-nodes > div {
        display: flex;
        align-items: center;
        gap: 10px;
        color: #94A3B8;
      }
      .pshow-technical-nodes > div > i {
        display: grid;
        place-items: center;
        width: 30px;
        height: 30px;
        border: 1px solid #CBD5E1;
        border-radius: 50%;
        font-style: normal;
        font-size: 11px;
        font-weight: 700;
        background: #FFFFFF;
      }
      .pshow-technical-nodes > div > span {
        font-size: 13px;
        font-weight: 600;
        color: #334155;
      }
      .pshow-technical-nodes > div.active > i {
        border-color: #2563EB;
        background: #EFF6FF;
        color: #1D4ED8;
      }
      .pshow-technical-nodes > div.active > span {
        color: #1D4ED8;
      }
      .pshow-technical-evidence {
        display: flex;
        align-items: center;
        gap: 10px;
        margin: 0 14px 14px;
        padding: 12px 14px;
        border: 1px solid #FDE68A;
        border-radius: 8px;
        background: #FFFBEB;
        color: #B45309;
      }
      .pshow-technical-evidence span {
        display: grid;
        gap: 3px;
      }
      .pshow-technical-evidence b {
        font-size: 13px;
        font-weight: 600;
      }
      .pshow-technical-evidence small {
        font-size: 12px;
        color: #78350F;
      }
      @media (max-width: 820px) {
        .pshow-story, .pshow-story.reverse {
          grid-template-columns: 1fr;
          gap: 20px;
          padding: 48px 14px;
          min-height: 0;
        }
        .pshow-story-copy {
          max-width: 650px;
        }
        .pshow-story.reverse .pshow-story-copy, .pshow-story.reverse .pshow-story-visual {
          order: initial;
        }
        .pshow-story-visual {
          padding: 16px 8px;
        }
        .pshow-story-steps {
          margin-top: 18px;
        }
      }
      @media (max-width: 640px) {
        .pshow-story-copy h2 {
          font-size: 30px;
        }
        .pshow-story-copy > p {
          font-size: 14px;
        }
        .pshow-story-steps button {
          font-size: 11px;
        }
        .pshow-story-controls {
          align-items: flex-start;
          flex-direction: column;
        }
        .pshow-technical-nodes {
          align-items: stretch;
          flex-direction: column;
          gap: 10px;
        }
        .pshow-technical-nodes > div {
          justify-content: flex-start;
        }
        .pshow-technical-nodes > div > svg {
          transform: rotate(90deg);
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .pshow-story {
          opacity: 1;
          transform: none;
          transition: none;
        }
        * {
          scroll-behavior: auto !important;
          transition: none !important;
        }
      }
    `}</style>
  </section>;
}
