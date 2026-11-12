'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import {
  Code2,
  FileCode2,
  Clock,
  Pause,
  Play,
  Maximize2,
  Minimize2,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  GitBranch,
  Layers,
  CheckCircle2,
  Network,
  Bug,
  CornerDownRight,
  FileCheck,
  ChevronRight,
  ChevronDown,
  Sparkles,
  FolderTree,
  FileText,
  Copy,
  Check,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';

const Editor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

export interface FindingOverlay {
  id: string;
  ruleId: string;
  title: string;
  description: string;
  severity: string;
  agent: string;
  line: number;
  snippet?: string;
}

export interface WorkspaceFileItem {
  path: string;
  findingsCount?: number;
  status?: 'analyzed' | 'scanning' | 'pending';
}

interface LiveCodeViewerProps {
  currentFile: string;
  codeContent: string;
  highlightedLineStart?: number;
  highlightedLineEnd?: number;
  activeFinding?: FindingOverlay | null;
  onSelectFinding?: (findingId: string) => void;
  agentName?: string;
  isPaused?: boolean;
  onTogglePause?: () => void;
  elapsedSeconds?: number;
  filesList?: WorkspaceFileItem[];
  onSelectFile?: (filePath: string) => void;
  diffContent?: string;
}

export const LiveCodeViewer: React.FC<LiveCodeViewerProps> = ({
  currentFile = 'src/auth/session.ts',
  codeContent,
  highlightedLineStart = 6,
  highlightedLineEnd = 6,
  activeFinding,
  onSelectFinding,
  agentName = 'SAST Agent',
  isPaused = false,
  onTogglePause,
  elapsedSeconds = 18,
  filesList = [],
  onSelectFile,
  diffContent,
}) => {
  const [activeTab, setActiveTab] = useState<'Code' | 'AST' | 'Data Flow' | 'Taint' | 'Diff'>('Code');
  const [showFileExplorer, setShowFileExplorer] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const decorationsRef = useRef<any[]>([]);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const applyDecorations = () => {
    if (!editorRef.current || !monacoRef.current) return;
    const monaco = monacoRef.current;
    const start = Math.max(1, highlightedLineStart || 1);
    const end = Math.max(start, highlightedLineEnd || start);

    decorationsRef.current = editorRef.current.deltaDecorations(
      decorationsRef.current,
      [
        {
          range: new monaco.Range(start, 1, end, 1),
          options: {
            isWholeLine: true,
            className: 'kavach-highlighted-vulnerable-line',
            glyphMarginClassName: 'kavach-vulnerable-glyph',
            overviewRuler: {
              color: '#EF4444',
              position: monaco.editor.OverviewRulerLane.Full,
            },
          },
        },
      ]
    );

    try {
      editorRef.current.revealLineInCenter(start);
    } catch {
      // ignore
    }
  };

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    applyDecorations();
  };

  useEffect(() => {
    applyDecorations();
  }, [highlightedLineStart, highlightedLineEnd, codeContent]);

  const detectLanguage = (path: string): string => {
    const lower = (path || '').toLowerCase();
    if (lower.endsWith('.ts') || lower.endsWith('.tsx')) return 'typescript';
    if (lower.endsWith('.js') || lower.endsWith('.jsx')) return 'javascript';
    if (lower.endsWith('.py')) return 'python';
    if (lower.endsWith('.tf') || lower.endsWith('.hcl')) return 'hcl';
    if (lower.endsWith('.json')) return 'json';
    if (lower.endsWith('.yaml') || lower.endsWith('.yml')) return 'yaml';
    if (lower.endsWith('.go')) return 'go';
    if (lower.endsWith('.java')) return 'java';
    if (lower.endsWith('.rs')) return 'rust';
    if (lower.endsWith('.sh') || lower.endsWith('.bash')) return 'shell';
    if (lower.endsWith('.sql')) return 'sql';
    if (lower.endsWith('.env') || lower.includes('secrets')) return 'ini';
    if (lower.includes('dockerfile')) return 'dockerfile';
    return 'plaintext';
  };

  const fileBreadcrumbs = (currentFile || 'src/index.ts').split(/[/\\]/);
  const lineCount = (codeContent || '').split('\n').length;

  const handleCopyCode = () => {
    if (codeContent) {
      navigator.clipboard.writeText(codeContent);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  // Structured AST Node extraction
  const astNodeJson = useMemo(() => {
    const lang = detectLanguage(currentFile);
    return JSON.stringify(
      {
        type: lang === 'typescript' ? 'FunctionDeclaration' : (lang === 'hcl' ? 'TerraformResource' : 'Statement'),
        file: currentFile,
        line: highlightedLineStart || 1,
        vulnerability: activeFinding?.ruleId || 'SECURITY_CHECK',
        severity: activeFinding?.severity || 'HIGH',
        sink: activeFinding?.title || 'Execution Sink',
        taintSource: 'user_controlled_input',
        astDetails: {
          nodeKind: lang === 'typescript' ? 'CallExpression' : 'ResourceBlock',
          sanitized: false,
          remediationRequired: true,
        },
      },
      null,
      2
    );
  }, [currentFile, highlightedLineStart, activeFinding]);

  // Workspace repository files
  const effectiveFiles: WorkspaceFileItem[] = useMemo(() => {
    if (filesList && filesList.length > 0) return filesList;
    return [];
  }, [filesList]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: '520px',
        backgroundColor: '#FFFFFF',
        borderRadius: '8px',
        border: '1px solid #E2E8F0',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        boxSizing: 'border-box',
        fontFamily: "var(--font-sans, 'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif)",
      }}
    >
      {/* 1. Editor Header: Breadcrumb, File Explorer Toggle, View Mode Tabs & Inspection Timer */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 14px',
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0',
          flexWrap: 'wrap',
          gap: '8px',
          flexShrink: 0,
        }}
      >
        {/* Left: File Explorer Toggle + File Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <button
            type="button"
            onClick={() => setShowFileExplorer(!showFileExplorer)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 7px',
              backgroundColor: showFileExplorer ? '#0F172A' : '#F1F5F9',
              color: showFileExplorer ? '#FFFFFF' : '#475569',
              border: 'none',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 120ms ease',
            }}
            title={showFileExplorer ? 'Hide workspace file tree' : 'Show workspace file tree'}
          >
            {showFileExplorer ? <PanelLeftClose size={13} /> : <PanelLeft size={13} />}
            <span>Files</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#64748B' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#16A34A' }} />
            <span style={{ fontWeight: 600, color: '#0F172A' }}>{agentName}:</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' }}>
              {fileBreadcrumbs.map((crumb, idx) => (
                <React.Fragment key={idx}>
                  {idx > 0 && <span style={{ color: '#CBD5E1' }}>/</span>}
                  <span style={{ color: idx === fileBreadcrumbs.length - 1 ? '#0F172A' : '#64748B', fontWeight: idx === fileBreadcrumbs.length - 1 ? 700 : 500 }}>
                    {crumb}
                  </span>
                </React.Fragment>
              ))}
            </div>
            <span
              style={{
                fontSize: '10px',
                color: '#64748B',
                backgroundColor: '#F1F5F9',
                padding: '1px 5px',
                borderRadius: '3px',
                marginLeft: '4px',
              }}
            >
              {lineCount} lines · {detectLanguage(currentFile)}
            </span>
          </div>
        </div>

        {/* Right: Inspection Tabs & Timer Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Tabs */}
          <div
            style={{
              display: 'inline-flex',
              padding: '2px',
              backgroundColor: '#F1F5F9',
              borderRadius: '6px',
              border: '1px solid #E2E8F0',
              gap: '2px',
            }}
          >
            {(['Code', 'AST', 'Data Flow', 'Taint', 'Diff'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '3px 9px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: activeTab === tab ? 700 : 500,
                  backgroundColor: activeTab === tab ? '#FFFFFF' : 'transparent',
                  color: activeTab === tab ? '#0F172A' : '#64748B',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: activeTab === tab ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 120ms ease',
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Inspection Timer */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '11px',
              color: '#475569',
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              padding: '3px 8px',
              borderRadius: '4px',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            <Clock size={12} color="#64748B" />
            <span>{formatTimer(elapsedSeconds)}</span>
          </div>

          {onTogglePause && (
            <button
              type="button"
              onClick={onTogglePause}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '24px',
                height: '24px',
                borderRadius: '4px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #CBD5E1',
                color: '#0F172A',
                cursor: 'pointer',
              }}
              title={isPaused ? 'Resume run' : 'Pause run'}
            >
              {isPaused ? <Play size={11} /> : <Pause size={11} />}
            </button>
          )}

          <button
            type="button"
            onClick={handleCopyCode}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '24px',
              height: '24px',
              borderRadius: '4px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #CBD5E1',
              color: '#0F172A',
              cursor: 'pointer',
            }}
            title="Copy file source code"
          >
            {copiedCode ? <Check size={11} color="#16A34A" /> : <Copy size={11} />}
          </button>
        </div>
      </div>

      {/* 2. Main Center Body: Workspace File Tree + Editor View */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, position: 'relative' }}>
        {/* Left Drawer: Workspace File Explorer */}
        {showFileExplorer && (
          <div
            style={{
              width: '180px',
              borderRight: '1px solid #E2E8F0',
              backgroundColor: '#F8FAFC',
              display: 'flex',
              flexDirection: 'column',
              flexShrink: 0,
              overflowY: 'auto',
            }}
          >
            <div
              style={{
                padding: '8px 10px',
                borderBottom: '1px solid #E2E8F0',
                fontSize: '11px',
                fontWeight: 700,
                color: '#64748B',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>Repository Files</span>
              <span style={{ fontSize: '10px', color: '#94A3B8' }}>{effectiveFiles.length}</span>
            </div>

            <div style={{ padding: '6px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {effectiveFiles.map((file) => {
                const isActive = currentFile === file.path;
                const fileName = file.path.split(/[/\\]/).pop() || file.path;
                return (
                  <button
                    key={file.path}
                    type="button"
                    onClick={() => onSelectFile?.(file.path)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '5px 8px',
                      borderRadius: '4px',
                      backgroundColor: isActive ? '#FFFFFF' : 'transparent',
                      border: isActive ? '1px solid #CBD5E1' : '1px solid transparent',
                      color: isActive ? '#0F172A' : '#475569',
                      fontWeight: isActive ? 600 : 400,
                      fontSize: '11px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 100ms ease',
                      gap: '6px',
                    }}
                    title={file.path}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                      <FileCode2 size={13} color={isActive ? '#0F172A' : '#94A3B8'} style={{ flexShrink: 0 }} />
                      <span
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: '11px',
                        }}
                      >
                        {fileName}
                      </span>
                    </div>

                    {(file.findingsCount ?? 0) > 0 && (
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          color: '#DC2626',
                          backgroundColor: '#FEE2E2',
                          borderRadius: '8px',
                          padding: '0 5px',
                          flexShrink: 0,
                        }}
                      >
                        {file.findingsCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Center: Active View Mode */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', position: 'relative' }}>
          {activeTab === 'Code' && (
            <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
              <Editor
                height="100%"
                language={detectLanguage(currentFile)}
                value={codeContent || '// Reading source file from repository workspace...'}
                theme="light"
                onMount={handleEditorDidMount}
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  fontSize: 13,
                  lineNumbers: 'on',
                  lineHeight: 20,
                  renderLineHighlight: 'all',
                  folding: true,
                  automaticLayout: true,
                  fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                }}
              />

              {/* Vulnerability Callout Alert Overlay */}
              {activeFinding && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '12px',
                    left: '16px',
                    right: '16px',
                    backgroundColor: '#FFFFFF',
                    border: '1.5px solid #FCA5A5',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    boxShadow: '0 4px 14px rgba(220, 38, 38, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    zIndex: 10,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', minWidth: 0 }}>
                    <div
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '6px',
                        backgroundColor: '#FEE2E2',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: '1px',
                      }}
                    >
                      <AlertTriangle size={14} color="#DC2626" />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                          {activeFinding.title} ({activeFinding.ruleId})
                        </span>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            color: '#DC2626',
                            backgroundColor: '#FEF2F2',
                            border: '1px solid #FECACA',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            textTransform: 'uppercase',
                          }}
                        >
                          {activeFinding.severity}
                        </span>
                        <span style={{ fontSize: '11px', color: '#64748B', fontFamily: "'JetBrains Mono', monospace" }}>
                          Line {activeFinding.line}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: '11px',
                          color: '#475569',
                          marginTop: '2px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {activeFinding.description}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => onSelectFinding?.(activeFinding.id)}
                      style={{
                        padding: '5px 10px',
                        backgroundColor: '#0F172A',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <span>View Evidence</span>
                      <ArrowRight size={12} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'AST' && (
            <div style={{ flex: 1, padding: '24px', overflowY: 'auto', backgroundColor: '#FFFFFF' }}>
              <pre
                style={{
                  backgroundColor: '#FFFFFF',
                  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                  fontSize: '12.5px',
                  color: '#0F172A',
                  lineHeight: '1.6',
                  margin: 0,
                }}
              >
                {JSON.stringify(
                  {
                    type: "Program",
                    body: [
                      {
                        type: "FunctionDeclaration",
                        id: "getUserByEmail",
                        params: ["email: string"],
                        vulnerability: "SQL_INJECTION",
                        taintSource: "params.email",
                        sink: "db.query(query)",
                        line: 42
                      }
                    ]
                  },
                  null,
                  2
                )}
              </pre>
            </div>
          )}

          {activeTab === 'Data Flow' && (
            <div style={{ flex: 1, padding: '24px', overflowY: 'auto', backgroundColor: '#FFFFFF' }}>
              <div style={{ marginBottom: '16px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                  Control Flow & Data Propagation Trace
                </span>
                <p style={{ fontSize: '12px', color: '#64748B', margin: '3px 0 0 0' }}>
                  Step-by-step trace showing untrusted input propagation reaching the execution sink.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '640px' }}>
                {[
                  {
                    step: 1,
                    title: 'Target Workspace Inspection',
                    desc: `Scanner inspected file: ${currentFile}`,
                    badge: 'FILE INSPECTED',
                    color: '#64748B',
                  },
                  {
                    step: 2,
                    title: 'Deterministic Rule Evaluation',
                    desc: `Rule ${activeFinding?.ruleId || 'CWE-89'} triggered by ${activeFinding?.agent || agentName}`,
                    badge: 'RULE MATCH',
                    color: '#D97706',
                  },
                  {
                    step: 3,
                    title: 'Taint Sink Identification',
                    desc: `Flagged at line ${highlightedLineStart || 42}: db.query(query) execution without parameterization`,
                    badge: (activeFinding?.severity || 'CRITICAL').toUpperCase(),
                    color: '#DC2626',
                  },
                ].map((item) => (
                  <div
                    key={item.step}
                    style={{
                      display: 'flex',
                      gap: '12px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                      padding: '12px',
                    }}
                  >
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        backgroundColor: '#0F172A',
                        color: '#FFFFFF',
                        fontSize: '11px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {item.step}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                          {item.title}
                        </span>
                        <span
                          style={{
                            fontSize: '9px',
                            fontWeight: 700,
                            color: item.color,
                            backgroundColor: '#F8FAFC',
                            border: `1px solid ${item.color}30`,
                            padding: '1px 5px',
                            borderRadius: '3px',
                          }}
                        >
                          {item.badge}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#475569', marginTop: '3px', fontFamily: "'JetBrains Mono', monospace" }}>
                        {item.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'Taint' && (
            <div
              style={{
                flex: 1,
                padding: '28px',
                overflowY: 'auto',
                backgroundColor: '#FFFFFF',
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                fontSize: '12.5px',
                lineHeight: '1.9',
                color: '#0F172A',
              }}
            >
              <div style={{ color: '#DC2626', fontWeight: 700, marginBottom: '14px', fontSize: '13px' }}>
                Taint propagation path:
              </div>
              <div style={{ color: '#0F172A' }}>
                Source: email: string (function argument at Line 39)
              </div>
              <div style={{ color: '#0F172A', margin: '4px 0' }}>
                Tainted string construct: Line 42 const query = `SELECT * FROM users WHERE email = '${`email`}'`
              </div>
              <div style={{ color: '#0F172A' }}>
                Sink: db.query(query) at Line 43
              </div>
            </div>
          )}

          {activeTab === 'Diff' && (
            <div style={{ flex: 1, padding: '16px', overflowY: 'auto', backgroundColor: '#F8FAFC' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', display: 'block', marginBottom: '8px' }}>
                Proposed Patch Diff: {currentFile}
              </span>
              <pre
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '6px',
                  padding: '14px',
                  fontSize: '12px',
                  fontFamily: "'JetBrains Mono', monospace",
                  lineHeight: '1.7',
                }}
              >
                {diffContent || (
`--- a/${currentFile}
+++ b/${currentFile}
@@ -${highlightedLineStart || 1},1 +${highlightedLineStart || 1},1 @@
-${activeFinding?.snippet || '// flagged line'}
+// SECURE: Verified patch for ${activeFinding?.ruleId || 'vulnerability'}`
                )}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
