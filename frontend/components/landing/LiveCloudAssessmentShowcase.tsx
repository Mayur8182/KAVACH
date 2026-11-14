'use client';

import React, { useCallback, useEffect, useId, useMemo, useState } from 'react';
import Link from 'next/link';
import { Activity, AlertCircle, ArrowRight, CheckCircle2, Cloud, Loader2, Play, RefreshCw, Server, ShieldAlert } from 'lucide-react';
import { api } from '@/lib/api/client';
import { getAuthToken } from '@/lib/auth/token';
import { useProject } from '@/contexts/ProjectContext';

type Tab = 'overview' | 'assets' | 'findings' | 'graph';
type TaskState = { id: string; status: string; progress_percent?: number; current_step?: string | null; result?: Record<string, any>; error_message?: string | null };
type Overview = { assets_total_count?: number; critical_findings_count?: number; high_findings_count?: number; providers?: Record<string, any>; critical_attention?: any[]; generated_at?: string };
type ItemResponse = { items?: any[]; total?: number; total_exposures?: number };
type GraphResponse = { nodes?: any[]; edges?: any[]; boundaries?: any[]; assets_mapped?: number; relationships_count?: number; internet_facing_count?: number; risky_connections_count?: number };

const tabs: Array<{ id: Tab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'assets', label: 'Assets' },
  { id: 'findings', label: 'Findings' },
  { id: 'graph', label: 'Security graph' },
];

export function LiveCloudAssessmentShowcase({ id = 'live-cloud-demo' }: { id?: string }) {
  const { currentProject, setCurrentProject } = useProject();
  const projectId = currentProject?.id || null;
  const [authenticated, setAuthenticated] = useState(false);
  const [tab, setTab] = useState<Tab>('overview');
  const [overview, setOverview] = useState<Overview | null>(null);
  const [connections, setConnections] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [itemTotal, setItemTotal] = useState(0);
  const [graph, setGraph] = useState<GraphResponse | null>(null);
  const [selectedNode, setSelectedNode] = useState<Record<string, any> | null>(null);
  const [task, setTask] = useState<TaskState | null>(null);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<any[]>([]);

  const loadOverview = useCallback(async () => {
    if (!projectId || !getAuthToken()) return;
    const [nextOverview, nextConnections] = await Promise.all([
      api.cloud.overview(projectId),
      api.cloud.connections({ projectId }),
    ]);
    setOverview(nextOverview);
    setConnections(nextConnections.items || []);
  }, [projectId]);

  const loadTab = useCallback(async (nextTab: Tab) => {
    if (!projectId || !getAuthToken()) return;
    setLoading(true);
    setError(null);
    try {
      let response: ItemResponse;
      if (nextTab === 'assets') response = await api.cloud.getAssets({ projectId, limit: 12 });
      else if (nextTab === 'findings') response = await api.cloud.findings({ projectId, status: 'OPEN', limit: 12 });
      else if (nextTab === 'graph') {
        const nextGraph = await api.cloud.securityGraph(projectId);
        setGraph(nextGraph);
        setSelectedNode(null);
        return;
      }
      else {
        await loadOverview();
        return;
      }
      setItems(response.items || []);
      setItemTotal(Number(response.total ?? response.total_exposures ?? response.items?.length ?? 0));
    } catch (err: any) {
      setError(err?.message || 'Could not load live cloud data.');
      setItems([]);
      setItemTotal(0);
    } finally {
      setLoading(false);
    }
  }, [loadOverview, projectId]);

  useEffect(() => {
    const hasToken = Boolean(getAuthToken());
    setAuthenticated(hasToken);
    if (!hasToken) return;
    let active = true;
    if (!projectId) {
      api.projects.list({ limit: 100 }).then((rows) => { if (active) setProjects(rows || []); }).catch((err: any) => { if (active) setError(err?.message || 'Could not load projects.'); });
      return () => { active = false; };
    }
    setProjects((rows) => rows.some((row) => row.id === projectId) ? rows : currentProject ? [currentProject, ...rows] : rows);
    setLoading(true);
    Promise.all([api.cloud.overview(projectId), api.cloud.connections({ projectId })])
      .then(([nextOverview, nextConnections]) => {
        if (!active) return;
        setOverview(nextOverview);
        setConnections(nextConnections.items || []);
        setError(null);
      })
      .catch((err: any) => { if (active) setError(err?.message || 'Could not load live cloud data.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [currentProject, projectId]);

  useEffect(() => { void loadTab(tab); }, [tab, loadTab]);

  useEffect(() => {
    if (!task?.id || ['COMPLETED', 'FAILED', 'CANCELLED'].includes(task.status.toUpperCase())) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const poll = async () => {
      try {
        const nextTask = await api.tasks.get(task.id);
        if (cancelled) return;
        setTask(nextTask);
        if (!['COMPLETED', 'FAILED', 'CANCELLED'].includes(String(nextTask.status).toUpperCase())) timer = setTimeout(poll, 1800);
        else if (nextTask.status.toUpperCase() === 'COMPLETED') {
          await loadOverview();
          await loadTab(tab);
        }
      } catch (err: any) {
        if (cancelled) return;
        setError(err?.message || 'Could not read live scan progress.');
        timer = setTimeout(poll, 4000);
      }
    };
    timer = setTimeout(poll, 600);
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, [loadOverview, loadTab, tab, task?.id, task?.status]);

  const runAssessment = async () => {
    if (!projectId) {
      setError('Select a project before starting a cloud assessment.');
      return;
    }
    setStarting(true);
    setError(null);
    setTask(null);
    try {
      const response = await api.cloud.triggerScan({ provider: 'ALL' }, projectId);
      if (!response?.task_id) throw new Error('The server did not return a task ID.');
      setTask({ id: String(response.task_id), status: response.status || 'QUEUED', progress_percent: 0, current_step: 'Waiting in queue' });
    } catch (err: any) {
      setError(err?.message || 'Could not start the cloud assessment.');
    } finally {
      setStarting(false);
    }
  };

  const connected = useMemo(() => connections.filter((connection) => String(connection.status).toUpperCase() === 'CONNECTED'), [connections]);
  const activeTask = task && !['COMPLETED', 'FAILED', 'CANCELLED'].includes(task.status.toUpperCase());
  const renderItem = (item: Record<string, any>, index: number) => {
    const title = item.resource_name || item.title || item.name || `Cloud object ${index + 1}`;
    const subtitle = item.resource_type || item.entry_point || item.rule_id || item.provider || 'Cloud record';
    const severity = item.severity || item.security_state || item.exposure;
    return <Link key={item.id || `${title}-${index}`} href={item.id && tab === 'findings' ? `/cloud?view=fi&id=${encodeURIComponent(item.id)}` : '/cloud'} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-t border-slate-100 px-4 py-3 no-underline hover:bg-slate-50">
      <span className="min-w-0"><span className="block truncate text-sm font-medium text-slate-800">{title}</span><span className="mt-0.5 block truncate text-xs text-slate-500">{subtitle}{item.region ? ` · ${item.region}` : ''}</span></span>
      <span className="text-xs font-medium text-slate-600">{severity || item.confidence || '—'}</span>
    </Link>;
  };

  return (
    <section id={id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700"><Cloud size={20} /></div>
            <div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Live cloud workspace</p><h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-900">See your cloud security assessment</h2><p className="mt-1 text-sm text-slate-600">Asset inventory, findings and topology loaded from your connected cloud accounts.</p></div>
          </div>
          <button type="button" onClick={runAssessment} disabled={starting || Boolean(activeTask) || !authenticated || !projectId || connected.length === 0} className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300">
            {starting || activeTask ? <Loader2 size={16} className="animate-spin" /> : <Play size={15} />}{activeTask ? 'Assessment running' : starting ? 'Starting assessment' : 'Run live assessment'}
          </button>
        </div>
        {projectId && <p className="mt-3 text-xs text-slate-500">Project: {currentProject?.name || projectId}</p>}
      </div>

      {!authenticated ? <div className="m-5 rounded-lg border border-slate-200 bg-slate-50 p-5 sm:m-6"><h3 className="text-sm font-semibold text-slate-900">Sign in to load a real assessment</h3><p className="mt-1 text-sm text-slate-600">The live demo uses your cloud account and project data. It does not substitute sample findings.</p><Link href="/login" className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-slate-900">Sign in <ArrowRight size={15} /></Link></div>
        : !projectId ? <div className="m-5 rounded-lg border border-slate-200 bg-slate-50 p-5 sm:m-6"><h3 className="text-sm font-semibold text-slate-900">Choose a project</h3><p className="mt-1 text-sm text-slate-600">Load a project to see its cloud inventory, findings and topology.</p>{projects.length > 0 ? <label className="mt-4 block max-w-md text-sm font-medium text-slate-700">Project<select className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2" value="" onChange={(event) => { const project = projects.find((row) => row.id === event.target.value); if (project) setCurrentProject(project); }}><option value="" disabled>Select a project…</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label> : <p className="mt-3 text-sm text-slate-500">{error || 'No projects are available for this account yet.'}</p>}</div>
        : error && !loading ? <div role="alert" className="m-5 rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-800 sm:m-6"><p>{error}</p><button type="button" onClick={() => { setError(null); void loadOverview(); }} className="mt-3 inline-flex items-center gap-2 font-medium text-red-900">Retry <RefreshCw size={14} /></button></div>
        : connected.length === 0 && !loading ? <div className="m-5 rounded-lg border border-slate-200 bg-slate-50 p-5 sm:m-6"><h3 className="text-sm font-semibold text-slate-900">No connected cloud accounts</h3><p className="mt-1 text-sm text-slate-600">Connect an AWS, Azure, GCP or Kubernetes account before running a live assessment.</p><Link href="/cloud?view=cn" className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-slate-900">Connect a cloud account <ArrowRight size={15} /></Link></div>
        : <>
          <div className="grid grid-cols-2 border-b border-slate-200 sm:grid-cols-4">
            <Stat icon={<Server size={16} />} label="Cloud assets" value={overview?.assets_total_count} />
            <Stat icon={<ShieldAlert size={16} />} label="Critical findings" value={overview?.critical_findings_count} />
            <Stat icon={<Activity size={16} />} label="High findings" value={overview?.high_findings_count} />
            <Stat icon={<Cloud size={16} />} label="Connected accounts" value={connected.length} />
          </div>
          {task && <div className="border-b border-slate-200 bg-slate-50 px-5 py-4 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2 text-sm font-medium text-slate-800">{task.status === 'COMPLETED' ? <CheckCircle2 size={16} className="text-emerald-700" /> : task.status === 'FAILED' ? <AlertCircle size={16} className="text-red-700" /> : <Loader2 size={16} className="animate-spin text-slate-600" />}{task.status.replaceAll('_', ' ')}<span className="font-normal text-slate-500">· {task.current_step || 'Waiting for worker'}</span></div><span className="text-sm tabular-nums text-slate-600">{task.progress_percent || 0}%</span></div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full bg-slate-800 transition-[width]" style={{ width: `${Math.max(0, Math.min(100, Number(task.progress_percent || 0)))}%` }} /></div>
            {task.error_message && <p className="mt-2 text-sm text-red-700">{task.error_message}</p>}
            {task.result?.assessment_status === 'PARTIAL' && <p className="mt-2 text-sm text-amber-800">{task.result.message || 'Some cloud accounts did not validate; review connection errors.'}</p>}
          </div>}
          <div className="flex gap-1 overflow-x-auto border-b border-slate-200 px-4 pt-2" role="tablist" aria-label="Cloud assessment data">
            {tabs.map((item) => <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} onClick={() => setTab(item.id)} className={`whitespace-nowrap rounded-t-md border-b-2 px-3 py-2 text-sm ${tab === item.id ? 'border-slate-900 font-medium text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>{item.label}</button>)}
            <button type="button" onClick={() => { void loadOverview(); void loadTab(tab); }} aria-label="Refresh live cloud data" className="ml-auto mb-1 rounded-md p-2 text-slate-500 hover:bg-slate-100"><RefreshCw size={15} /></button>
          </div>
          <div className="min-h-52">
            {error && <div role="alert" className="m-4 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"><AlertCircle size={16} className="mt-0.5 shrink-0" />{error}</div>}
              {tab === 'overview' ? <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
              <div className="rounded-lg border border-slate-200 p-4"><h3 className="text-sm font-semibold text-slate-800">Provider connections</h3><div className="mt-3 space-y-2">{connections.map((connection, index) => <div key={connection.id || index} className="flex items-center justify-between gap-3 text-sm"><span className="text-slate-700">{connection.provider} · {connection.connection_name || connection.account_identifier || 'Cloud account'}</span><span className="text-xs text-slate-500">{String(connection.status || 'UNKNOWN').replaceAll('_', ' ')}</span></div>)}{connections.length === 0 && <p className="text-sm text-slate-500">No cloud connection records.</p>}</div></div>
              <div className="rounded-lg border border-slate-200 p-4"><h3 className="text-sm font-semibold text-slate-800">Latest cloud attention</h3><div className="mt-3 space-y-3">{overview?.critical_attention?.slice(0, 4).map((finding: any) => <Link key={finding.id} href={`/cloud?view=fi&id=${encodeURIComponent(finding.id)}`} className="block border-t border-slate-100 pt-3 no-underline"><span className="block text-sm font-medium text-slate-800">{finding.title}</span><span className="mt-1 block text-xs text-slate-500">{finding.provider} · {finding.resource_name} · {finding.severity}</span></Link>)}{!overview?.critical_attention?.length && <p className="text-sm text-slate-500">No critical attention items returned by the API.</p>}</div></div>
            </div> : tab === 'graph' ? <GraphView graph={graph} selectedNode={selectedNode} onSelectNode={setSelectedNode} loading={loading} /> : <div className="p-4 sm:p-5">
              <div className="mb-3 flex items-center justify-between"><p className="text-sm text-slate-600">{loading ? 'Loading from cloud API…' : `${itemTotal} records returned`}</p>{loading && <Loader2 size={15} className="animate-spin text-slate-500" />}</div>
              {items.length > 0 ? <div className="overflow-hidden rounded-lg border border-slate-200">{items.map(renderItem)}</div> : !loading && !error && <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center"><p className="text-sm font-medium text-slate-800">No records returned</p><p className="mt-1 text-sm text-slate-500">This view will show provider data after a connected account has been assessed.</p></div>}
            </div>}
          </div>
        </>}
    </section>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value?: number }) {
  return <div className="flex items-center gap-3 border-r border-slate-100 px-4 py-4 last:border-r-0 sm:px-5"><span className="text-slate-500">{icon}</span><span><span className="block text-lg font-semibold tabular-nums text-slate-900">{value == null ? '—' : value}</span><span className="block text-xs text-slate-500">{label}</span></span></div>;
}

function GraphView({ graph, selectedNode, onSelectNode, loading }: { graph: GraphResponse | null; selectedNode: Record<string, any> | null; onSelectNode: (node: Record<string, any>) => void; loading: boolean }) {
  const arrowId = `live-cloud-arrow-${useId().replace(/:/g, '')}`;
  const nodes = graph?.nodes || [];
  const edges = graph?.edges || [];
  const resourceNodes = nodes.filter((node) => node.id !== 'internet');
  const width = Math.max(900, ...nodes.map((node) => Number(node.x || 0) + 180));
  const height = Math.max(360, ...nodes.map((node) => Number(node.y || 0) + 90));
  if (loading) return <div className="flex min-h-56 items-center justify-center gap-2 text-sm text-slate-500"><Loader2 size={16} className="animate-spin" />Loading topology records…</div>;
  if (!nodes.length) return <div className="m-5 rounded-lg border border-dashed border-slate-300 p-8 text-center"><p className="text-sm font-medium text-slate-800">No topology data returned</p><p className="mt-1 text-sm text-slate-500">The graph is built from indexed resources and provider configuration records.</p></div>;
  return <div className="p-4 sm:p-5">
    <div className="mb-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500"><span>{graph?.assets_mapped ?? resourceNodes.length} resources mapped</span><span>{graph?.relationships_count ?? edges.length} recorded relationships</span><span>{graph?.internet_facing_count ?? 0} internet-facing</span><span>{graph?.risky_connections_count ?? 0} risky connections</span></div>
    <p className="mb-3 text-xs text-slate-500">Edges come from indexed public-ingress configuration. Select a node for its recorded resource details.</p>
    <div className="overflow-auto rounded-lg border border-slate-200 bg-slate-50">
      <svg role="img" aria-label="Cloud resource topology from indexed provider records" viewBox={`0 0 ${width} ${height}`} className="min-h-72 w-full" style={{ minWidth: '700px' }}>
        <defs><marker id={arrowId} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#94A3B8" /></marker></defs>
        {(graph?.boundaries || []).map((boundary, index) => <g key={`${boundary.provider}-${index}`}><rect x={boundary.x} y={boundary.y} width={boundary.width} height={boundary.height} rx="10" fill="#FFFFFF" stroke="#CBD5E1" strokeDasharray="5 5" /><text x={Number(boundary.x) + 12} y={Number(boundary.y) + 22} fill="#64748B" fontSize="13">{boundary.label || boundary.provider}</text></g>)}
        {edges.map((edge, index) => {
          const source = nodes.find((node) => node.id === edge.source);
          const target = nodes.find((node) => node.id === edge.target);
          if (!source || !target) return null;
          return <g key={`${edge.source}-${edge.target}-${index}`}><line x1={Number(source.x) + 60} y1={Number(source.y) + 30} x2={Number(target.x) + 60} y2={Number(target.y) + 30} stroke={edge.is_risky ? '#DC2626' : '#94A3B8'} strokeWidth="2" markerEnd={`url(#${arrowId})`} /><text x={(Number(source.x) + Number(target.x)) / 2 + 60} y={(Number(source.y) + Number(target.y)) / 2 + 20} fill="#64748B" fontSize="11">{edge.label}</text></g>;
        })}
        {nodes.map((node) => <g key={node.id} onClick={() => onSelectNode(node)} role="button" tabIndex={0} aria-label={`Select ${node.name}`} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onSelectNode(node); }} className="cursor-pointer">
          <rect x={node.x} y={node.y} width="150" height="58" rx="8" fill={node.severity ? '#FEF2F2' : '#FFFFFF'} stroke={selectedNode?.id === node.id ? '#334155' : node.severity ? '#FCA5A5' : '#CBD5E1'} strokeWidth={selectedNode?.id === node.id ? 2 : 1} />
          <text x={Number(node.x) + 10} y={Number(node.y) + 23} fill="#0F172A" fontSize="12" fontWeight="600">{String(node.name || node.provider).slice(0, 20)}</text>
          <text x={Number(node.x) + 10} y={Number(node.y) + 42} fill="#64748B" fontSize="10">{node.subtitle || node.resource_type}</text>
          {node.severity && <circle cx={Number(node.x) + 137} cy={Number(node.y) + 13} r="4" fill="#DC2626" />}
        </g>)}
      </svg>
    </div>
    {selectedNode && <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm"><span><b className="font-medium text-slate-800">{selectedNode.name}</b><span className="ml-2 text-slate-500">{selectedNode.subtitle} · {selectedNode.severity || 'No linked open finding'}</span></span>{selectedNode.issue_id && <Link href={`/cloud?view=fi&id=${encodeURIComponent(selectedNode.issue_id)}`} className="text-slate-700">Open finding <ArrowRight size={13} className="inline" /></Link>}</div>}
  </div>;
}
