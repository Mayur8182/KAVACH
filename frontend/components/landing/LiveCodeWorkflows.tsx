'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Activity, AlertCircle, ArrowRight, CheckCircle2, Code2, Container, KeyRound, Loader2, Network, Play, Shield, Boxes } from 'lucide-react';
import { api } from '@/lib/api/client';
import { getAuthToken } from '@/lib/auth/token';
import { useProject } from '@/contexts/ProjectContext';

type ProductKey = 'sast' | 'secrets' | 'dependencies' | 'iac' | 'container' | 'api';
type JobState = { id: string; status: string; detail?: string; result?: any; error?: string; error_message?: string; findings_count?: number; total_findings?: number; total_vulnerabilities?: number; findings?: any[]; results?: any[]; progress_percent?: number; progress?: number };
const products: Array<{ id: ProductKey; name: string; icon: React.ReactNode; line: string; href: string }> = [
  { id: 'sast', name: 'Code security · SAST', icon: <Code2 size={16} />, line: 'Repository → static analysis → code findings → remediation', href: '/code/sast' },
  { id: 'secrets', name: 'Secrets', icon: <KeyRound size={16} />, line: 'Repository → credential detection → exposed secrets → rotate or remediate', href: '/code/secrets' },
  { id: 'dependencies', name: 'Dependencies', icon: <Boxes size={16} />, line: 'Manifest → dependency analysis → vulnerable packages → upgrade PR', href: '/code/dependencies' },
  { id: 'iac', name: 'Infrastructure as Code', icon: <Shield size={16} />, line: 'Repository → IaC policies → misconfigurations → fix or PR', href: '/iac' },
  { id: 'container', name: 'Container security', icon: <Container size={16} />, line: 'Image → image scan → vulnerabilities and secrets → inspect results', href: '/containers' },
  { id: 'api', name: 'API security', icon: <Network size={16} />, line: 'Registered API → security scan → API findings → apply fix or PR', href: '/api-security' },
];
const done = (status: string) => ['COMPLETED', 'COMPLETE', 'SUCCESS', 'SUCCEEDED', 'FAILED', 'ERROR', 'CANCELLED'].includes(String(status).toUpperCase());

export function LiveCodeWorkflows({ id = 'live-code-workflows' }: { id?: string }) {
  const { currentProject } = useProject();
  const projectId = currentProject?.id;
  const [authenticated, setAuthenticated] = useState(false);
  const [selected, setSelected] = useState<ProductKey>('sast');
  const [repos, setRepos] = useState<any[]>([]);
  const [apis, setApis] = useState<any[]>([]);
  const [repoId, setRepoId] = useState('');
  const [sourcesProjectId, setSourcesProjectId] = useState('');
  const [apiId, setApiId] = useState('');
  const [image, setImage] = useState('');
  const [job, setJob] = useState<JobState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [actionResult, setActionResult] = useState('');
  const [findingDetail, setFindingDetail] = useState<any>(null);
  const [reviewerName, setReviewerName] = useState('Mayur Bharvad');
  const [reviewerApproved, setReviewerApproved] = useState(false);
  const [patchApplied, setPatchApplied] = useState(false);
  const [pullRequest, setPullRequest] = useState<any>(null);
  const autoStarted = useRef<Set<string>>(new Set());
  const product = useMemo(() => products.find((item) => item.id === selected)!, [selected]);

  useEffect(() => {
    const hasToken = Boolean(getAuthToken());
    setAuthenticated(hasToken);
    if (hasToken) api.auth.me().then((user) => setReviewerName(user.full_name || user.name || 'Mayur Bharvad')).catch(() => {});
    if (!getAuthToken() || !projectId) { setRepos([]); setApis([]); setRepoId(''); setSourcesProjectId(''); return; }
    setSourcesProjectId('');
    setRepos([]);
    setApis([]);
    setRepoId('');
    setJob(null);
    setFindingDetail(null);
    setReviewerApproved(false);
    setPatchApplied(false);
    setPullRequest(null);
    let live = true;
    Promise.all([api.sast.repositories(projectId), api.apiSecurity.apis({ projectId, limit: 100 }).catch(() => ({ items: [] }))])
      .then(([repoRows, apiRows]) => {
        if (!live) return;
        const rows: any[] = Array.isArray(repoRows) ? repoRows : [];
        setRepos(rows);
        setRepoId((old) => rows.some((row: any) => String(row.id) === old) ? old : String(rows[0]?.id || ''));
        const apiList = apiRows?.items || [];
        setApis(apiList);
        setApiId((old) => apiList.some((row: any) => String(row.id) === old) ? old : String(apiList[0]?.id || ''));
        setSourcesProjectId(projectId);
        setError('');
      })
      .catch((err: any) => { if (live) setError(err?.message || 'Could not load this project’s connected sources.'); });
    return () => { live = false; };
  }, [projectId]);

  const refreshJob = useCallback(async (current: JobState) => {
    if (done(current.status)) return current;
    let next: any = current;
    if (selected === 'sast') {
      next = await api.sast.scanDetail(current.id, projectId);
    } else if (selected === 'secrets') next = await api.code.secretScanStatus(current.id);
    else if (selected === 'dependencies') next = await api.dependencyScans.getDetail(current.id);
    else if (selected === 'iac') next = await api.iac.scanJob(current.id);
    else if (selected === 'container') next = await api.containerSecurity.imageScanDetail(current.id);
    else if (selected === 'api') next = await api.apiSecurity.getScan(current.id);
    const status = String(next.status || next.scan_status || next.state || current.status).toUpperCase();
    if (selected === 'api' && done(status) && !next.findings && !next.results) {
      const results = await api.apiSecurity.getScanResults(current.id).catch(() => null);
      if (results) next = { ...next, ...results };
    }
    if (selected === 'sast' && done(status) && !next.findings) {
      const repoName = repos.find((row) => String(row.id) === repoId)?.name;
      const findingPage = await api.sast.recentFindings({ project_id: projectId, repository: repoName, page: 1, page_size: 5 }).catch(() => null);
      if (findingPage) next = { ...next, findings: findingPage.items || findingPage.findings || [] };
    }
    if (selected === 'iac' && done(status) && !next.findings) {
      const findingPage = await api.iac.findings({ projectId, repositoryId: repoId, page: 1, pageSize: 5 }).catch(() => null);
      if (findingPage) next = { ...next, findings: findingPage.items || findingPage.findings || [] };
    }
    return { ...current, ...next, id: current.id, status, error_message: next.error_message || current.error_message, detail: next.current_step || next.message || next.progress_message || next.error_message || current.detail } as JobState;
  }, [projectId, repoId, repos, selected]);

  useEffect(() => {
    if (!job || done(job.status)) return;
    let live = true;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try { const next = await refreshJob(job); if (!live) return; setJob(next); if (!done(next.status)) timer = setTimeout(poll, 2200); }
      catch (err: any) { if (!live) return; setError(err?.message || 'Could not read scan status.'); timer = setTimeout(poll, 4500); }
    };
    timer = setTimeout(poll, 900);
    return () => { live = false; clearTimeout(timer); };
  }, [job, refreshJob]);

  const startScan = useCallback(async () => {
    setBusy(true); setError(''); setActionResult(''); setJob(null); setFindingDetail(null); setReviewerApproved(false); setPatchApplied(false); setPullRequest(null);
    try {
      let result: any;
      if (selected === 'sast') {
        if (!repoId) throw new Error('This project has no connected repository to scan.');
        result = await api.sast.triggerScan({ repository_id: repoId, scan_type: 'SAST' }, projectId);
      } else if (selected === 'secrets') {
        const repo = repos.find((row) => String(row.id) === repoId);
        if (!repo) throw new Error('Connect a repository to this project first.');
        result = await api.code.triggerSecretRepositoryScan({ repository: repo.full_name || repo.name || repo.repository_url, branch: repo.default_branch || 'main' });
      } else if (selected === 'dependencies') {
        const repo = repos.find((row) => String(row.id) === repoId);
        if (!repo) throw new Error('This project has no connected repository to scan.');
        result = await api.dependencyScans.runScan({ repository_name: repo.full_name || repo.name || repo.repository_url, branch: repo.default_branch || 'main', scan_type: 'SCA' });
      } else if (selected === 'iac') {
        if (!repoId) throw new Error('This project has no connected repository to scan.');
        result = await api.iac.scan({ repository_id: repoId });
      } else if (selected === 'container') {
        if (!image.trim()) throw new Error('Enter the image reference you want to scan.');
        result = await api.containerSecurity.runImageScan({ target_type: 'IMAGE', target_identifier: image.trim(), scan_type: 'Full Scan', scan_options: { scan_secrets: true, generate_sbom: true, analyze_dockerfile: false, enable_storage: true }, project_id: projectId });
      } else {
        if (!apiId) throw new Error('Import or connect an API to this project before scanning.');
        result = await api.apiSecurity.startScan({ api_id: apiId });
      }
      const idValue = result.job_id || result.scan_id || result.id;
      if (!idValue) throw new Error('The scan API did not return a job or scan ID.');
      setJob({ ...result, id: String(idValue), status: String(result.status || result.scan_status || 'QUEUED').toUpperCase(), detail: result.message || 'Accepted by the scan service.' });
    } catch (err: any) { setError(err?.message || 'Could not start scan.'); }
    finally { setBusy(false); }
  }, [apiId, image, projectId, repoId, repos, selected]);

  const findingsCount = job?.findings_count ?? job?.total_findings ?? job?.total_vulnerabilities ?? job?.results?.length ?? job?.findings?.length;
  const selectedFinding = job?.findings?.[0] || job?.results?.[0];
  const terminal = Boolean(job && done(job.status));
  const recommendedSuggestion = findingDetail?.remediation_suggestions?.find((suggestion: any) => suggestion.is_recommended) || findingDetail?.remediation_suggestions?.[0];
  const hasSuggestion = Boolean(recommendedSuggestion?.diff?.patched_code || recommendedSuggestion?.diff?.unified_diff);
  useEffect(() => {
    if (!selectedFinding?.id || !terminal) { setFindingDetail(null); return; }
    let active = true;
    api.findings.detail(String(selectedFinding.id), projectId)
      .then((detail) => { if (active) setFindingDetail(detail); })
      .catch((err: any) => { if (active) setError(err?.message || 'Could not load finding evidence.'); });
    return () => { active = false; };
  }, [projectId, selectedFinding?.id, terminal]);

  useEffect(() => {
    if (!authenticated || !projectId || sourcesProjectId !== projectId || !repoId || !repos.length || selected !== 'sast' || job || busy) return;
    const key = `${projectId}:${repoId}`;
    if (autoStarted.current.has(key)) return;
    autoStarted.current.add(key);
    void startScan();
  }, [authenticated, projectId, sourcesProjectId, repoId, repos.length, selected, job, busy, startScan]);

  const runAction = async (kind: 'fix' | 'pr') => {
    if (!selectedFinding?.id) return;
    if (kind === 'pr' && !patchApplied) return;
    setBusy(true); setError('');
    try {
      let response: any;
      const suggestionId = findingDetail?.remediation_suggestions?.find((suggestion: any) => suggestion.is_recommended)?.id || findingDetail?.remediation_suggestions?.[0]?.id;
      if (selected === 'api') response = kind === 'fix' ? await api.apiSecurity.applyFindingFix(selectedFinding.id) : await api.apiSecurity.createFindingPr(selectedFinding.id);
      else if (selected === 'iac') response = kind === 'fix' ? await api.iac.applyFix(selectedFinding.id) : await api.iac.createPR(selectedFinding.id);
      else if (selected === 'sast' || selected === 'secrets') response = kind === 'fix' ? await api.code.applyFindingFix(selectedFinding.id, suggestionId) : await api.code.createFindingPR(selectedFinding.id, { suggestion_id: suggestionId });
      else throw new Error('Use the product details page for the supported remediation actions on this finding.');
      if (kind === 'fix') {
        const applied = response?.success === true || ['APPLIED', 'SUCCESS', 'COMPLETED'].includes(String(response?.status || '').toUpperCase());
        if (!applied) throw new Error(response?.message || response?.reason || 'The remediation service did not confirm that the patch was applied.');
        setPatchApplied(true);
        setReviewerApproved(true);
      } else {
        if (response?.success === false) throw new Error(response?.message || 'The pull request service did not confirm creation.');
        setPullRequest(response);
      }
      setActionResult(response?.message || response?.status || (kind === 'pr' ? 'Pull request action accepted.' : 'Fix action accepted.'));
    } catch (err: any) { setError(err?.message || 'Remediation action failed.'); }
    finally { setBusy(false); }
  };

  const sourceReady = selected === 'container' ? Boolean(image.trim()) : selected === 'api' ? Boolean(apiId) : Boolean(repoId);
  const sourceName = selected === 'container' ? (image || 'Image reference required') : selected === 'api' ? (apis.find((row) => String(row.id) === apiId)?.name || 'Registered API required') : (repos.find((row) => String(row.id) === repoId)?.full_name || repos.find((row) => String(row.id) === repoId)?.name || 'Repository required');
  const stages = [
    { title: 'Connect repository', detail: sourceName, state: sourceReady ? 'Connected' : 'Needs source', ok: sourceReady },
    { title: `Run ${selected === 'sast' ? 'SAST' : product.name} scan`, detail: job ? `${job.status.replaceAll('_', ' ')}${job.detail ? ` · ${job.detail}` : ''}` : 'Waiting for the live scan', state: job?.status || 'Waiting', ok: Boolean(job) },
    { title: 'Review verified finding', detail: selectedFinding?.title || (findingsCount === 0 ? 'No actionable finding returned' : 'Waiting for scan results'), state: selectedFinding ? 'Finding loaded' : 'Waiting', ok: Boolean(selectedFinding) },
    { title: 'Suggested patch', detail: hasSuggestion ? recommendedSuggestion.title : 'Waiting for an actual remediation suggestion', state: hasSuggestion ? 'Ready to review' : 'Waiting', ok: hasSuggestion },
    { title: 'Approve (human)', detail: reviewerApproved ? `${reviewerName} approved the remediation` : `Reviewer: ${reviewerName}`, state: reviewerApproved ? 'Approved' : 'Needs review', ok: reviewerApproved },
    { title: 'Create pull request', detail: pullRequest ? (pullRequest.pr_url || pullRequest.html_url || pullRequest.pull_request_url || pullRequest.message || 'Pull request created') : 'Available after reviewer approval', state: pullRequest ? 'Created' : 'Waiting', ok: Boolean(pullRequest) },
  ];

  return <section id={id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div className="border-b border-slate-200 px-5 py-5 sm:px-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-xs font-semibold uppercase tracking-[.14em] text-slate-500">Live product demo · Code security</p><h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">From repository scan to a reviewed fix</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">The scan starts automatically for your selected project. Finding, suggested patch, approval and pull request appear only from completed backend actions.</p></div>
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800"><Activity size={14} /> Live backend workflow</span>
      </div>
      {!authenticated ? <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">Sign in to load a real project repository and run this demo. <Link href="/login" className="font-medium text-slate-900">Sign in <ArrowRight size={13} className="inline" /></Link></p> : !projectId ? <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">Create or select a project, then connect a GitHub repository to start the live scan.</p> : <p className="mt-4 text-xs text-slate-500">Project: <span className="font-medium text-slate-700">{currentProject?.name}</span></p>}
    </div>
    <div className="flex gap-1 overflow-x-auto border-b border-slate-200 px-4 pt-2" role="tablist" aria-label="Security product scan mode">{products.map((item) => <button key={item.id} role="tab" aria-selected={selected === item.id} onClick={() => { setSelected(item.id); setJob(null); setFindingDetail(null); setError(''); setActionResult(''); setReviewerApproved(false); setPatchApplied(false); setPullRequest(null); }} className={`flex shrink-0 items-center gap-2 rounded-t-lg border-b-2 px-3 py-3 text-sm ${selected === item.id ? 'border-slate-900 font-semibold text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>{item.icon}{item.name}</button>)}</div>
    <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_260px]">
      <div>
        <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Scan mode</p><h3 className="mt-1 text-lg font-semibold text-slate-900">{product.name}</h3></div><Link href={product.href} className="inline-flex items-center gap-1 text-sm font-medium text-slate-700 hover:text-slate-950">Open product <ArrowRight size={14} /></Link></div>
        <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{stages.map((stage, index) => <div key={stage.title} className="relative rounded-xl border border-slate-200 bg-slate-50 p-3.5"><div className="flex items-center gap-2"><span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${stage.ok ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-slate-500 ring-1 ring-slate-200'}`}>{stage.ok ? <CheckCircle2 size={14} /> : index + 1}</span><span className="text-sm font-semibold text-slate-800">{stage.title}</span></div><p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{stage.detail}</p><p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">{stage.state}</p></div>)}</div>
        <div className="mt-5 flex flex-wrap items-end gap-3">{selected === 'container' ? <label className="min-w-64 flex-1 text-xs font-medium text-slate-600">Container image<input value={image} onChange={(event) => setImage(event.target.value)} placeholder="registry.example.com/team/app:tag" className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-500" /></label> : selected === 'api' ? <label className="min-w-64 flex-1 text-xs font-medium text-slate-600">Registered API<select value={apiId} onChange={(event) => setApiId(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900"><option value="">Choose API…</option>{apis.map((row) => <option key={row.id} value={row.id}>{row.name || row.base_url || row.id}</option>)}</select></label> : <label className="min-w-64 flex-1 text-xs font-medium text-slate-600">Repository<select value={repoId} onChange={(event) => setRepoId(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900"><option value="">Choose repository…</option>{repos.map((row) => <option key={row.id} value={row.id}>{row.full_name || row.name || row.repository_url || row.id}</option>)}</select></label>}
          <button type="button" disabled={!authenticated || !projectId || !sourceReady || busy || Boolean(job && !terminal)} onClick={startScan} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300">{busy ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}{job && !terminal ? 'Scan running' : 'Run scan again'}</button></div>
        {!repos.length && authenticated && projectId && <p className="mt-3 text-sm text-slate-600">No repository is connected to this project. <Link href="/projects" className="font-semibold text-slate-900 underline">Connect a repository</Link> to start.</p>}
        {job && <div className="mt-4 rounded-xl border border-slate-200 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><span className="flex items-center gap-2 text-sm font-semibold text-slate-800">{done(job.status) ? <CheckCircle2 size={16} className="text-emerald-700" /> : <Loader2 size={16} className="animate-spin text-slate-600" />}{job.status.replaceAll('_', ' ')}</span><span className="text-xs text-slate-500">Scan ID · {job.id}</span></div>{job.detail && <p className="mt-2 text-sm text-slate-600">{job.detail}</p>}{job.error_message && <p className="mt-2 text-sm text-red-700">{job.error_message}</p>}{!terminal && <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100" aria-label="Scan in progress"><div className="h-full w-1/3 animate-pulse rounded-full bg-teal-600" /></div>}{(job.progress_percent ?? job.progress) != null && <p className="mt-1 text-right text-xs text-slate-500">{job.progress_percent ?? job.progress}%</p>}{findingsCount != null && <p className="mt-2 text-sm text-slate-700">Findings returned by scanner: <b>{findingsCount}</b></p>}
          {selectedFinding && <div className="mt-3 rounded-lg border border-slate-200 bg-white p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Verified finding · {selectedFinding.rule_id || selectedFinding.finding_code || ''}</p><h4 className="mt-1 text-sm font-semibold text-slate-900">{selectedFinding.title || selectedFinding.name || selectedFinding.issue || selectedFinding.rule_name || 'Security finding'}</h4></div><span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">{selectedFinding.severity || selectedFinding.category || 'Finding'}</span></div>
            {findingDetail?.file_path && <p className="mt-2 font-mono text-xs text-slate-500">{findingDetail.file_path}{findingDetail.line_number ? `:${findingDetail.line_number}` : ''}</p>}
            {findingDetail?.description && <p className="mt-2 text-sm leading-6 text-slate-600">{findingDetail.description}</p>}
            {recommendedSuggestion?.diff?.unified_diff && <pre className="mt-3 max-h-56 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-700">{recommendedSuggestion.diff.unified_diff}</pre>}
            {recommendedSuggestion?.diff?.original_code && recommendedSuggestion?.diff?.patched_code && <div className="mt-3 grid gap-2 sm:grid-cols-2"><pre className="overflow-auto rounded-lg bg-red-50 p-3 text-xs leading-5 text-red-900">{recommendedSuggestion.diff.original_code}</pre><pre className="overflow-auto rounded-lg bg-emerald-50 p-3 text-xs leading-5 text-emerald-900">{recommendedSuggestion.diff.patched_code}</pre></div>}
            {findingDetail?.remediation_description && <p className="mt-3 text-sm text-slate-600">{findingDetail.remediation_description}</p>}
            <div className="mt-4 flex flex-wrap items-center gap-2"><span className="mr-1 inline-flex items-center gap-2 text-xs text-slate-600"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-[10px] font-semibold text-white">{reviewerName.split(/\s+/).map((part) => part[0]).slice(0, 2).join('')}</span><span><b className="text-slate-800">{reviewerName}</b><br />Security reviewer</span></span><button type="button" onClick={() => void runAction('fix')} disabled={busy || !hasSuggestion || !['sast','secrets','iac','api'].includes(selected) || patchApplied} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300">{busy && !pullRequest ? 'Applying…' : patchApplied ? 'Patch applied' : 'Approve & apply patch'}</button><button type="button" onClick={() => void runAction('pr')} disabled={busy || !['sast','secrets','iac','api'].includes(selected) || !patchApplied || Boolean(pullRequest)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:text-slate-400">{pullRequest ? 'Pull request created' : 'Create pull request'}</button></div>
            {!hasSuggestion && <p className="mt-2 text-xs text-slate-500">No patch suggestion was returned for this finding. Open the finding in the product workspace to inspect available remediation.</p>}
            {actionResult && <p className="mt-3 text-sm text-emerald-700">{actionResult}</p>}
            {(pullRequest?.pr_url || pullRequest?.html_url || pullRequest?.pull_request_url || pullRequest?.url) && <a href={pullRequest.pr_url || pullRequest.html_url || pullRequest.pull_request_url || pullRequest.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-sm font-medium text-blue-700 underline">View pull request <ArrowRight size={14} className="ml-1" /></a>}
          </div>}
        </div>}
        {error && <div role="alert" className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"><AlertCircle size={16} className="mt-0.5 shrink-0" />{error}</div>}
      </div>
      <aside className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reviewer</p><div className="mt-3 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">{reviewerName.split(/\s+/).map((part) => part[0]).slice(0, 2).join('')}</span><div><p className="text-sm font-semibold text-slate-900">{reviewerName}</p><p className="text-xs text-slate-500">Security reviewer</p></div></div><p className="mt-4 border-t border-slate-200 pt-3 text-xs leading-5 text-slate-600">Scans start automatically when a real repository is available. Applying a patch and opening a pull request wait for the reviewer’s explicit click.</p><Link href={product.href} className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-slate-700">Open {product.name} <ArrowRight size={14} /></Link></aside>
    </div>
  </section>;
}
