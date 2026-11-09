'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FolderGit2,
  GitBranch,
  GitCommit,
  Shield,
  Clock,
  Layers,
  ExternalLink,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Play,
  Pause,
  RotateCcw,
  X,
  Sparkles,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { LiveCodeViewer, FindingOverlay, WorkspaceFileItem } from './LiveCodeViewer';
import { ExecutionGraph, AgentNodeData } from './ExecutionGraph';
import { ExecutionLogsPanel, LogItem, ToolExecutionItem } from './ExecutionLogsPanel';
import { RemediationDiffViewer, FindingItem } from './RemediationDiffViewer';
import { ExecutionMapTree } from './ExecutionMapTree';
import { GenerativeUICommandBar, GenerativeUIWidgetData } from './GenerativeUICommandBar';
import { FilesAnalysisView } from './FilesAnalysisView';
import { ArtifactsDossierView } from './ArtifactsDossierView';
import { ExecutionTimelineView } from './ExecutionTimelineView';

interface LiveRunWorkspaceProps {
  runId: string;
  repositoryName?: string;
  branchName?: string;
  onClose?: () => void;
  isEmbedded?: boolean;
}

export const LiveRunWorkspace: React.FC<LiveRunWorkspaceProps> = ({
  runId,
  repositoryName = 'Mayur8182/KAVACH',
  branchName = 'main',
  onClose,
  isEmbedded = false,
}) => {
  // Metadata & State
  const [runData, setRunData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Live Inspection State
  const [activeViewTab, setActiveViewTab] = useState<
    'Execution Graph' | 'Execution Map' | 'Agents (12)' | 'Files (1,284)' | 'Findings (24)' | 'Artifacts' | 'Timeline'
  >('Execution Graph');
  const [activeGenerativeWidget, setActiveGenerativeWidget] = useState<GenerativeUIWidgetData | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState('sast');
  const [currentFile, setCurrentFile] = useState('src/auth/session.ts');
  const [fileContent, setFileContent] = useState<string>('');
  const [highlightedLineStart, setHighlightedLineStart] = useState<number>(6);
  const [highlightedLineEnd, setHighlightedLineEnd] = useState<number>(6);
  const [activeFinding, setActiveFinding] = useState<FindingOverlay | null>({
    id: 'F-001',
    ruleId: 'CWE-89',
    title: 'SQL Injection',
    description: 'User input (email) is directly interpolated into a SQL query, which can allow SQL injection.',
    severity: 'Critical',
    agent: 'SAST',
    line: 42,
  });
  const [selectedFindingId, setSelectedFindingId] = useState<string>('F-001');

  // Execution Logs & Activity
  const [logs, setLogs] = useState<LogItem[]>([
    { id: 'l1', timestamp: '14:02:18', type: 'success', message: 'Repository cloned (1.2s)', agent: 'SCM' },
    { id: 'l2', timestamp: '14:03:02', type: 'success', message: 'Indexed 1,284 files', agent: 'SAST' },
    { id: 'l3', timestamp: '14:03:41', type: 'success', message: 'AST parsing started', agent: 'SAST' },
    { id: 'l4', timestamp: '14:04:07', type: 'running', message: 'Analyzing src/auth/session.ts ...', agent: 'SAST' },
    { id: 'l5', timestamp: '14:04:08', type: 'info', message: 'Building control flow graph', agent: 'SAST' },
    { id: 'l6', timestamp: '14:04:10', type: 'info', message: 'Running taint analysis', agent: 'SAST' },
    { id: 'l7', timestamp: '14:04:12', type: 'alert', message: 'SQL Injection (CWE-89) detected', agent: 'SAST' },
    { id: 'l8', timestamp: '14:04:15', type: 'info', message: 'Continuing analysis ...', agent: 'SAST' },
    { id: 'l9', timestamp: '14:04:27', type: 'running', message: 'Analyzing src/routes/checkout.ts ...', agent: 'SAST' },
    { id: 'l10', timestamp: '14:04:31', type: 'success', message: 'Completed 342 / 1,284 files (26%)', agent: 'SAST' },
  ]);
  const [workspaceFiles, setWorkspaceFiles] = useState<WorkspaceFileItem[]>([]);
  const [toolCalls, setToolCalls] = useState<ToolExecutionItem[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // All 12 Specialized Kavach Agents
  const [agentsList, setAgentsList] = useState<AgentNodeData[]>([
    {
      id: 'sast',
      name: 'SAST Agent (AST)',
      type: 'sast',
      engine: 'Semgrep 1.178',
      category: 'CODE',
      status: 'pending',
      progressPercentage: 0,
      currentActivity: 'Standing by for engine dispatch...',
      steps: [
        { name: 'Clone repository & parse tree', status: 'pending' },
        { name: 'AST parsing & CFG generation', status: 'pending' },
        { name: 'Semgrep rule evaluation', status: 'pending' },
        { name: 'Taint propagation analysis', status: 'pending' },
        { name: 'Generate verified finding models', status: 'pending' },
      ],
    },
    {
      id: 'iac',
      name: 'IaC Security Agent',
      type: 'iac',
      engine: 'Checkov 3.3',
      category: 'IAC',
      status: 'pending',
      progressPercentage: 0,
      currentActivity: 'Standing by for engine dispatch...',
      steps: [
        { name: 'Parse HCL and Terraform state', status: 'pending' },
        { name: 'Checkov CIS compliance scan', status: 'pending' },
        { name: 'Evaluate IAM least-privilege', status: 'pending' },
        { name: 'Enforce OPA cloud baseline', status: 'pending' },
      ],
    },
    {
      id: 'container',
      name: 'Container Agent',
      type: 'container',
      engine: 'Trivy Linter',
      category: 'CONTAINER',
      status: 'pending',
      progressPercentage: 0,
      currentActivity: 'Standing by for engine dispatch...',
      steps: [
        { name: 'Parse Dockerfile instructions', status: 'pending' },
        { name: 'Trivy image layer vulnerability check', status: 'pending' },
        { name: 'Scan base image packages', status: 'pending' },
        { name: 'Verify non-root daemon context', status: 'pending' },
      ],
    },
    {
      id: 'secrets',
      name: 'Secrets Agent',
      type: 'secrets',
      engine: 'Gitleaks / Entropy',
      category: 'SECRETS',
      status: 'pending',
      progressPercentage: 0,
      currentActivity: 'Standing by for engine dispatch...',
      steps: [
        { name: 'Ingest Git reflog & commit tree', status: 'pending' },
        { name: 'Gitleaks 180+ regex rules check', status: 'pending' },
        { name: 'Validate entropy thresholds', status: 'pending' },
      ],
    },
    {
      id: 'sca',
      name: 'SCA Dependency Agent',
      type: 'sca',
      engine: 'OSV Scanner',
      category: 'SCA',
      status: 'pending',
      progressPercentage: 0,
      currentActivity: 'Standing by for engine dispatch...',
      steps: [
        { name: 'Lockfile manifest extraction', status: 'pending' },
        { name: 'Query OSV database & CVE catalogs', status: 'pending' },
        { name: 'Transitive dependency graph audit', status: 'pending' },
      ],
    },
    {
      id: 'api',
      name: 'DAST / API Security Agent',
      type: 'api',
      engine: 'OWASP API Top 10',
      category: 'API',
      status: 'pending',
      progressPercentage: 0,
      currentActivity: 'Standing by for engine dispatch...',
      steps: [
        { name: 'Discover OpenAPI routes & schemas', status: 'pending' },
        { name: 'Test BOLA / Broken Object Auth', status: 'pending' },
        { name: 'Fuzz Mass Assignment & Rate limits', status: 'pending' },
      ],
    },
    {
      id: 'cloud',
      name: 'Cloud Posture Agent',
      type: 'cloud',
      engine: 'Cloud Evaluator',
      category: 'CLOUD',
      status: 'pending',
      progressPercentage: 0,
      currentActivity: 'Standing by for engine dispatch...',
      steps: [
        { name: 'Fetch cloud resource declarations', status: 'pending' },
        { name: 'Evaluate multi-cloud guardrails', status: 'pending' },
      ],
    },
    {
      id: 'scm',
      name: 'SCM Security Agent',
      type: 'scm',
      engine: 'Git Gatekeeper',
      category: 'SCM',
      status: 'pending',
      progressPercentage: 0,
      currentActivity: 'Standing by for engine dispatch...',
      steps: [
        { name: 'Check branch protection policies', status: 'pending' },
        { name: 'Audit required review gates', status: 'pending' },
      ],
    },
    {
      id: 'investigation',
      name: 'Investigation Agent',
      type: 'investigation',
      engine: 'Taint Graph Engine',
      category: 'INVESTIGATION',
      status: 'pending',
      progressPercentage: 0,
      currentActivity: 'Standing by for engine dispatch...',
      steps: [
        { name: 'Correlate multi-agent findings', status: 'pending' },
        { name: 'Trace exploit reachability graph', status: 'pending' },
      ],
    },
    {
      id: 'remediation',
      name: 'Remediation Agent',
      type: 'remediation',
      engine: 'Patch Synthesizer',
      category: 'REMEDIATION',
      status: 'pending',
      progressPercentage: 0,
      currentActivity: 'Standing by for engine dispatch...',
      steps: [
        { name: 'Analyze vulnerable syntax nodes', status: 'pending' },
        { name: 'Synthesize parameterized patch', status: 'pending' },
        { name: 'AST rescan verification gate', status: 'pending' },
      ],
    },
    {
      id: 'compliance',
      name: 'Compliance Gate Agent',
      type: 'compliance',
      engine: 'SOC2 / ISO Gate',
      category: 'COMPLIANCE',
      status: 'pending',
      progressPercentage: 0,
      currentActivity: 'Standing by for engine dispatch...',
      steps: [
        { name: 'Map findings to SOC2 & ISO27001', status: 'pending' },
        { name: 'Evaluate compliance threshold', status: 'pending' },
      ],
    },
    {
      id: 'reporting',
      name: 'Reporting Agent',
      type: 'reporting',
      engine: 'Audit Dossier',
      category: 'REPORTING',
      status: 'pending',
      progressPercentage: 0,
      currentActivity: 'Standing by for engine dispatch...',
      steps: [
        { name: 'Compile cryptographic evidence log', status: 'pending' },
        { name: 'Generate verified audit report', status: 'pending' },
      ],
    },
  ]);

  // Load file content for Monaco Editor
  const loadFileContent = useCallback(async (filePath: string) => {
    if (!filePath || !runId) return;
    try {
      const res: any = await api.request<any>(
        `/api/v1/runs/${runId}/files/content?file_path=${encodeURIComponent(filePath)}`
      );
      const data = res?.data || res;
      if (data && data.content) {
        setFileContent(data.content);
        return;
      }
      setFileContent(`// Workspace file: ${filePath}\n// File content could not be retrieved from repository mirror.`);
    } catch {
      setFileContent(`// Workspace file: ${filePath}\n// Unable to load file from repository workspace.`);
    }
  }, [runId]);

  // Load run details from backend
  const loadRunDetails = useCallback(async () => {
    if (!runId) return;
    try {
      const res: any = await api.request<any>(`/api/v1/runs/${runId}`);
      const data = res?.data || res;
      if (data) {
        setRunData(data);
        if (data.tasks && Array.isArray(data.tasks) && data.tasks.length > 0) {
          setAgentsList((prev) =>
            prev.map((agent) => {
              const matchedTask = data.tasks.find(
                (t: any) => (t.task_key || t.taskKey || '').toLowerCase() === agent.id.toLowerCase()
              );
              if (matchedTask) {
                return {
                  ...agent,
                  status: matchedTask.status === 'completed'
                    ? 'completed'
                    : (matchedTask.status === 'failed' ? 'failed' : 'running'),
                  progressPercentage: matchedTask.progress_percentage || agent.progressPercentage,
                  currentActivity: matchedTask.current_activity || agent.currentActivity,
                };
              }
              return agent;
            })
          );
        }

        if (data.findings && data.findings.length > 0) {
          const first = data.findings[0];
          setSelectedFindingId(first.id);
          const fLine = first.lineNumber || first.lineStart || 6;
          setActiveFinding({
            id: first.id,
            ruleId: first.ruleId || 'CWE-89',
            title: first.title || 'SQL Injection',
            description: first.description || 'Vulnerability detected in source code.',
            severity: first.severity || 'Critical',
            agent: first.agent || 'SAST',
            line: fLine,
          });
          setHighlightedLineStart(fLine);
          setHighlightedLineEnd(fLine);
          if (first.filePath) {
            setCurrentFile(first.filePath);
            loadFileContent(first.filePath);
          }
        }
      }
    } catch (err: any) {
      console.warn('Run context initialization:', err);
    } finally {
      setLoading(false);
    }
  }, [runId, loadFileContent]);

  // Load execution events
  const loadExecutionEvents = useCallback(async () => {
    if (!runId) return;
    try {
      const res: any = await api.request<any>(`/api/v1/runs/${runId}/events`);
      const events = Array.isArray(res) ? res : res?.data || [];
      if (events.length > 0) {
        setLogs(
          events.map((ev: any, idx: number) => ({
            id: ev.eventId || ev.id || String(idx),
            timestamp: ev.timestamp
              ? new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
              : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            type: ev.type?.includes('finding') ? 'alert' : (ev.type?.includes('error') ? 'alert' : (ev.type?.includes('completed') ? 'success' : 'info')),
            message: ev.description || ev.currentActivity || ev.type || 'Execution event',
            agent: (ev.agentId || 'KAVACH').toUpperCase(),
          }))
        );
      } else {
        setLogs([]);
      }
    } catch {
      setLogs([]);
    }
  }, [runId]);

  // Load inspected files
  const loadWorkspaceFiles = useCallback(async () => {
    if (!runId) return;
    try {
      const res: any = await api.request<any>(`/api/v1/runs/${runId}/inspected-files`);
      const data = res?.data || res;
      if (data && Array.isArray(data.files) && data.files.length > 0) {
        setWorkspaceFiles(
          data.files.map((p: string) => ({
            path: p,
            findingsCount: 0,
            status: 'analyzed' as const,
          }))
        );
      }
    } catch {
      // fallback
    }
  }, [runId]);

  // Load real tool calls
  const loadToolCalls = useCallback(async () => {
    if (!runId) return;
    try {
      const res: any = await api.request<any>(`/api/v1/runs/${runId}/tool-output`);
      const list = Array.isArray(res) ? res : res?.data || [];
      if (list.length > 0) {
        setToolCalls(list);
      }
    } catch {
      // fallback
    }
  }, [runId]);

  useEffect(() => {
    loadRunDetails();
    loadExecutionEvents();
    loadWorkspaceFiles();
    loadToolCalls();
    loadFileContent(currentFile);

    // WebSocket event stream
    let ws: WebSocket | null = null;
    try {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${wsProtocol}//${window.location.host}/api/v1/runs/${runId}/ws`;
      ws = new WebSocket(wsUrl);
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'EXECUTION_EVENT' && msg.event) {
            const ev = msg.event;
            if (ev.payload?.file) {
              setCurrentFile(ev.payload.file);
              loadFileContent(ev.payload.file);
            }
            if (ev.payload?.lineStart) {
              setHighlightedLineStart(ev.payload.lineStart);
              setHighlightedLineEnd(ev.payload.lineEnd || ev.payload.lineStart);
            }
            if (ev.type === 'finding.detected' && ev.payload) {
              const fLine = ev.payload.line || 6;
              setActiveFinding({
                id: ev.payload.findingId,
                ruleId: ev.payload.ruleId,
                title: ev.payload.title,
                description: ev.currentActivity || 'Vulnerability detected',
                severity: ev.payload.severity || 'Critical',
                agent: (ev.agentId || 'SAST').toUpperCase(),
                line: fLine,
              });
              setHighlightedLineStart(fLine);
              setHighlightedLineEnd(fLine);
            }
            setLogs((prev) => [
              ...prev,
              {
                id: ev.eventId || String(Date.now()),
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                type: ev.type === 'finding.detected' ? 'alert' : 'info',
                message: ev.currentActivity || ev.description || ev.type,
                agent: (ev.agentId || 'Agent').toUpperCase(),
              },
            ]);
          }
        } catch {
          // ignore
        }
      };
    } catch {
      // ws unavailable
    }

    const timer = setInterval(() => {
      if (!isPaused) setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      clearInterval(timer);
      if (ws) ws.close();
    };
  }, [runId, isPaused]);

  // Synchronize findings list from run data
  const findingsList: FindingItem[] = useMemo(() => {
    if (runData?.findings && Array.isArray(runData.findings) && runData.findings.length > 0) {
      return runData.findings.map((f: any) => ({
        id: f.id,
        ruleId: f.ruleId || 'SECURITY-01',
        title: f.title || 'Security Finding',
        description: f.description || 'Finding identified by security scanner.',
        severity: f.severity || 'Medium',
        agent: f.agent || 'SAST',
        location: f.location || (f.filePath ? `${f.filePath}:${f.lineNumber || 1}` : 'repo:1'),
        status: f.status || 'Open',
        snippet: f.snippet,
      }));
    }
    return [];
  }, [runData]);

  const activeRepo = runData?.repository || repositoryName;
  const activeBranch = runData?.branch || branchName;
  const activeCommit = runData?.commit || 'e211770';
  const runDisplayNumber = runData?.runNumber || runId.slice(0, 8).toUpperCase();

  const formatElapsed = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        backgroundColor: '#F8FAFC',
        borderRadius: isEmbedded ? '10px' : '0',
        border: isEmbedded ? '1px solid #CBD5E1' : 'none',
        padding: '14px',
        minHeight: '680px',
        fontFamily: "var(--font-sans, 'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif)",
        color: '#0F172A',
      }}
    >
      {/* 1. Page Header & Run Metadata */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748B', marginBottom: '3px' }}>
            <span>KAVACH</span>
            <ChevronRight size={13} />
            <span>Autonomous Execution</span>
            <ChevronRight size={13} />
            <strong style={{ color: '#0F172A' }}>RUN-{runDisplayNumber}</strong>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
              Autonomous Multi-Agent Security Analysis: {activeRepo}
            </h1>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                backgroundColor: '#F0FDF4',
                color: '#16A34A',
                border: '1px solid #BBF7D0',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 700,
              }}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#16A34A' }} />
              Active Execution
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <a
            href={`https://github.com/${activeRepo}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#FFFFFF',
              color: '#0F172A',
              border: '1px solid #CBD5E1',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <span>GitHub Repository</span>
            <ExternalLink size={13} />
          </a>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              title="Close Workspace"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                color: '#64748B',
                cursor: 'pointer',
              }}
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* 2. Metadata Status Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '8px',
          padding: '10px 16px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '22px', flexWrap: 'wrap' }}>
          {/* Target Repo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FolderGit2 size={16} color="#0F172A" />
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>{activeRepo}</div>
              <div style={{ fontSize: '11px', color: '#64748B' }}>Target Repository</div>
            </div>
          </div>

          {/* Branch */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <GitBranch size={15} color="#64748B" />
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>{activeBranch}</div>
              <div style={{ fontSize: '11px', color: '#64748B' }}>Branch</div>
            </div>
          </div>

          {/* Commit */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <GitCommit size={15} color="#64748B" />
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', fontFamily: "'JetBrains Mono', monospace" }}>
                {activeCommit.slice(0, 7)}
              </div>
              <div style={{ fontSize: '11px', color: '#64748B' }}>Commit SHA</div>
            </div>
          </div>

          {/* Active Agents Count */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={16} color="#16A34A" />
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>12 Specialized Agents</div>
              <div style={{ fontSize: '11px', color: '#64748B' }}>Deterministic multi-scanner orchestration</div>
            </div>
          </div>
        </div>

        {/* Right Metrics: Elapsed Time & Steps */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
            <Clock size={15} color="#64748B" />
            <div>
              <span style={{ fontSize: '10px', color: '#64748B', display: 'block' }}>Elapsed Time</span>
              <strong style={{ color: '#0F172A', fontVariantNumeric: 'tabular-nums', fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' }}>
                {formatElapsed(elapsedSeconds)}
              </strong>
            </div>
          </div>

          <div style={{ width: '130px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700, color: '#16A34A', marginBottom: '2px' }}>
              <span>Pipeline</span>
              <span>{runData?.progressPercentage ?? (runData?.status === 'COMPLETED' ? 100 : 0)}%</span>
            </div>
            <div style={{ width: '100%', height: '6px', backgroundColor: '#E2E8F0', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ width: `${runData?.progressPercentage ?? (runData?.status === 'COMPLETED' ? 100 : 0)}%`, height: '100%', backgroundColor: '#16A34A', borderRadius: '3px', transition: 'width 250ms ease' }} />
            </div>
          </div>
        </div>
      </div>

      {/* 2A. Generative UI Autonomous Agent Command Bar (Section 10 & 12) */}
      <GenerativeUICommandBar
        repositoryName={activeRepo}
        runId={runId}
        selectedFinding={findingsList.find((f) => f.id === selectedFindingId) || findingsList[0]}
        activeWidget={activeGenerativeWidget}
        setActiveWidget={setActiveGenerativeWidget}
        onFilterSeverity={(sev) => setActiveViewTab('Findings (24)')}
        onSelectTab={(tab) => setActiveViewTab(tab as any)}
      />

      {/* 2B. Primary Navigation Tabs (Matching Image 1 & 3 & 7) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '24px',
          borderBottom: '1px solid #E2E8F0',
          padding: '0 8px',
          backgroundColor: '#FFFFFF',
          borderRadius: '8px 8px 0 0',
        }}
      >
        {[
          'Execution Graph',
          'Execution Map',
          'Agents (12)',
          `Files (${workspaceFiles.length > 0 ? workspaceFiles.length : '1,284'})`,
          `Findings (${findingsList.length > 0 ? findingsList.length : '24'})`,
          'Artifacts',
          'Timeline',
        ].map((tab) => {
          const isCurrent =
            (tab.startsWith('Execution Graph') && activeViewTab === 'Execution Graph') ||
            (tab.startsWith('Execution Map') && activeViewTab === 'Execution Map') ||
            (tab.startsWith('Agents') && activeViewTab === 'Agents (12)') ||
            (tab.startsWith('Files') && activeViewTab.startsWith('Files')) ||
            (tab.startsWith('Findings') && activeViewTab.startsWith('Findings')) ||
            (tab.startsWith('Artifacts') && activeViewTab === 'Artifacts') ||
            (tab.startsWith('Timeline') && activeViewTab === 'Timeline');

          return (
            <button
              key={tab}
              type="button"
              onClick={() => {
                if (tab.startsWith('Execution Graph')) setActiveViewTab('Execution Graph');
                else if (tab.startsWith('Execution Map')) setActiveViewTab('Execution Map');
                else if (tab.startsWith('Agents')) setActiveViewTab('Agents (12)');
                else if (tab.startsWith('Files')) setActiveViewTab('Files (1,284)');
                else if (tab.startsWith('Findings')) setActiveViewTab('Findings (24)');
                else if (tab.startsWith('Artifacts')) setActiveViewTab('Artifacts');
                else if (tab.startsWith('Timeline')) setActiveViewTab('Timeline');
              }}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: isCurrent ? '2px solid #0F172A' : '2px solid transparent',
                padding: '10px 4px',
                fontSize: '13px',
                fontWeight: isCurrent ? 700 : 500,
                color: isCurrent ? '#0F172A' : '#64748B',
                cursor: 'pointer',
                transition: 'all 120ms ease',
              }}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* 3. Conditional Content based on Active Tab */}
      {activeViewTab === 'Execution Map' ? (
        <ExecutionMapTree
          repositoryName={activeRepo}
          filesCount={workspaceFiles.length > 0 ? workspaceFiles.length : 1284}
          branchName={activeBranch}
          elapsedTime={formatElapsed(elapsedSeconds)}
          progressPercentage={runData?.progressPercentage || 42}
          onSelectAgent={(id) => {
            setSelectedAgentId(id);
            setActiveViewTab('Execution Graph');
          }}
          onSelectFile={(filePath) => {
            setCurrentFile(filePath);
            loadFileContent(filePath);
            setActiveViewTab('Execution Graph');
          }}
          onSelectFinding={(findingId) => {
            setSelectedFindingId(findingId);
            setActiveViewTab('Findings (24)');
          }}
        />
      ) : (activeViewTab === 'Execution Graph' || activeViewTab === 'Agents (12)') ? (
        /* Middle 3-Panel Split Workspace (23% Left / 52% Center / 25% Right) */
        <div style={{ display: 'grid', gridTemplateColumns: '23% 52% 25%', gap: '12px', minHeight: '520px', flex: 1 }}>
          {/* Left: Execution Graph (23%) */}
          <ExecutionGraph
            repositoryName={activeRepo}
            commitSha={activeCommit}
            branchName={activeBranch}
            agents={agentsList}
            selectedAgentId={selectedAgentId}
            onSelectAgent={(id) => setSelectedAgentId(id)}
          />

          {/* Center: Live Code Monaco Viewer & File Tree (52%) */}
          <LiveCodeViewer
            currentFile={currentFile}
            codeContent={fileContent}
            highlightedLineStart={highlightedLineStart}
            highlightedLineEnd={highlightedLineEnd}
            activeFinding={activeFinding}
            agentName={`${selectedAgentId.toUpperCase()} Agent`}
            isPaused={isPaused}
            onTogglePause={() => setIsPaused(!isPaused)}
            elapsedSeconds={elapsedSeconds}
            filesList={workspaceFiles}
            onSelectFile={(p) => {
              setCurrentFile(p);
              loadFileContent(p);
            }}
            onSelectFinding={(id) => setSelectedFindingId(id)}
            diffContent={runData?.suggestedFix?.diff}
          />

          {/* Right: Repository Activity & Tools Panel (25%) */}
          <ExecutionLogsPanel
            logs={logs}
            isLive={!isPaused}
            files={workspaceFiles}
            toolCalls={toolCalls}
            onSelectFile={(p) => {
              setCurrentFile(p);
              loadFileContent(p);
            }}
          />
        </div>
      ) : activeViewTab.startsWith('Files') ? (
        <FilesAnalysisView
          files={workspaceFiles}
          findings={findingsList}
          currentAnalyzingFile={currentFile}
          onSelectFile={(p) => {
            setCurrentFile(p);
            loadFileContent(p);
            setActiveViewTab('Agents (12)');
          }}
          onSelectFinding={(id) => {
            setSelectedFindingId(id);
            setActiveViewTab('Findings (24)');
          }}
        />
      ) : activeViewTab.startsWith('Findings') ? (
        <RemediationDiffViewer
          findings={findingsList}
          selectedFindingId={selectedFindingId}
          onSelectFinding={(id) => {
            setSelectedFindingId(id);
            const f = findingsList.find((item) => item.id === id);
            if (f) {
              const pathParts = f.location.split(':');
              const targetPath = pathParts[0];
              const lineNum = parseInt(pathParts[1] || '6', 10);
              setActiveFinding({
                id: f.id,
                ruleId: f.ruleId,
                title: f.title,
                description: f.description,
                severity: f.severity,
                agent: f.agent,
                line: lineNum,
              });
              setHighlightedLineStart(lineNum);
              setHighlightedLineEnd(lineNum);
              setCurrentFile(targetPath);
              loadFileContent(targetPath);
            }
          }}
          suggestedFix={runData?.suggestedFix}
          repositoryName={activeRepo}
          branchName={activeBranch}
          onFixApplied={() => {
            loadRunDetails();
          }}
        />
      ) : activeViewTab === 'Artifacts' ? (
        <ArtifactsDossierView runId={runId} repositoryName={activeRepo} />
      ) : (
        <ExecutionTimelineView
          runId={runId}
          elapsedTime={formatElapsed(elapsedSeconds)}
          progressPercentage={runData?.progressPercentage || 42}
        />
      )}

      {/* 4. Bottom Collapsible Section: Findings, Repository Changes, Evidence, Proposed Fixes, Verification */}
      {(activeViewTab === 'Execution Graph' || activeViewTab === 'Agents (12)') && (
        <RemediationDiffViewer
          findings={findingsList}
          selectedFindingId={selectedFindingId}
          onSelectFinding={(id) => {
            setSelectedFindingId(id);
            const f = findingsList.find((item) => item.id === id);
            if (f) {
              const pathParts = f.location.split(':');
              const targetPath = pathParts[0];
              const lineNum = parseInt(pathParts[1] || '6', 10);
              setActiveFinding({
                id: f.id,
                ruleId: f.ruleId,
                title: f.title,
                description: f.description,
                severity: f.severity,
                agent: f.agent,
                line: lineNum,
              });
              setHighlightedLineStart(lineNum);
              setHighlightedLineEnd(lineNum);
              setCurrentFile(targetPath);
              loadFileContent(targetPath);
            }
          }}
          suggestedFix={runData?.suggestedFix}
          repositoryName={activeRepo}
          branchName={activeBranch}
          onFixApplied={() => {
            loadRunDetails();
          }}
        />
      )}
    </div>
  );
};
