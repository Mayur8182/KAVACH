'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search,
  CheckCircle2,
  Info,
  AlertTriangle,
  Play,
  RotateCcw,
  Terminal,
  Clock,
  ArrowRight,
  Filter,
  FileCode2,
  Wrench,
  Check,
  ChevronRight,
  Loader2,
} from 'lucide-react';

export interface LogItem {
  id: string;
  timestamp: string;
  type: 'success' | 'info' | 'running' | 'alert' | 'error';
  message: string;
  agent?: string;
}

export interface InspectedFileItem {
  path: string;
  status?: 'analyzed' | 'scanning' | 'pending';
  findingsCount?: number;
}

export interface ToolExecutionItem {
  id: string;
  tool: string;
  type: string;
  status: string;
  command?: string;
  exitCode?: number;
  durationMs?: number;
  findingsCount?: number;
}

interface ExecutionLogsPanelProps {
  logs: LogItem[];
  isLive?: boolean;
  files?: InspectedFileItem[];
  toolCalls?: ToolExecutionItem[];
  onSelectFile?: (filePath: string) => void;
}

export const ExecutionLogsPanel: React.FC<ExecutionLogsPanelProps> = ({
  logs = [],
  isLive = true,
  files = [],
  toolCalls = [],
  onSelectFile,
}) => {
  const [activeTab, setActiveTab] = useState<'events' | 'files' | 'tools'>('events');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'all' | 'alert' | 'info' | 'success'>('all');
  const logEndRef = useRef<HTMLDivElement>(null);

  // Filtered Events
  const filteredLogs = useMemo(() => {
    let result = logs;
    if (selectedTypeFilter !== 'all') {
      if (selectedTypeFilter === 'alert') {
        result = result.filter((l) => l.type === 'alert' || l.type === 'error');
      } else {
        result = result.filter((l) => l.type === selectedTypeFilter);
      }
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (l) => l.message.toLowerCase().includes(q) || (l.agent && l.agent.toLowerCase().includes(q))
      );
    }
    return result;
  }, [logs, searchQuery, selectedTypeFilter]);

  // Real inspected files
  const displayFiles: InspectedFileItem[] = useMemo(() => {
    if (files && files.length > 0) return files;
    return [];
  }, [files]);

  // Real tool calls
  const displayToolCalls: ToolExecutionItem[] = useMemo(() => {
    if (toolCalls && toolCalls.length > 0) return toolCalls;
    return [];
  }, [toolCalls]);

  useEffect(() => {
    if (isLive && logEndRef.current && activeTab === 'events') {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs.length, isLive, activeTab]);

  const renderIcon = (type: LogItem['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={13} color="#16A34A" style={{ flexShrink: 0 }} />;
      case 'alert':
      case 'error':
        return <AlertTriangle size={13} color="#DC2626" style={{ flexShrink: 0 }} />;
      case 'running':
        return <Play size={10} color="#D97706" fill="#D97706" style={{ flexShrink: 0 }} />;
      case 'info':
      default:
        return <Info size={13} color="#64748B" style={{ flexShrink: 0 }} />;
    }
  };

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
      {/* 1. Header with 3 Tabs: Events | Files | Tool Calls */}
      <div
        style={{
          padding: '10px 14px',
          borderBottom: '1px solid #E2E8F0',
          backgroundColor: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: isLive ? '#16A34A' : '#94A3B8',
              boxShadow: isLive ? '0 0 0 2px rgba(22, 163, 74, 0.2)' : 'none',
            }}
          />
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
            Repository Activity
          </span>
        </div>

        {/* 3 Tabs */}
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
          {[
            { id: 'events', label: `Events (${logs.length})` },
            { id: 'files', label: `Files (${displayFiles.length})` },
            { id: 'tools', label: `Tools (${displayToolCalls.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                padding: '3px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: activeTab === tab.id ? 700 : 500,
                backgroundColor: activeTab === tab.id ? '#0F172A' : 'transparent',
                color: activeTab === tab.id ? '#FFFFFF' : '#475569',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 120ms ease',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Filter Bar */}
      <div
        style={{
          padding: '8px 12px',
          borderBottom: '1px solid #F1F5F9',
          backgroundColor: '#F8FAFC',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          flexShrink: 0,
        }}
      >
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={12} color="#94A3B8" style={{ position: 'absolute', left: '7px', top: '7px' }} />
          <input
            type="text"
            placeholder={`Filter ${activeTab}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '4px 6px 4px 24px',
              fontSize: '11px',
              border: '1px solid #CBD5E1',
              borderRadius: '4px',
              backgroundColor: '#FFFFFF',
              outline: 'none',
              color: '#0F172A',
              height: '26px',
              minHeight: '26px',
            }}
          />
        </div>

        {activeTab === 'events' && (
          <div style={{ display: 'flex', gap: '3px' }}>
            {(['all', 'alert'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setSelectedTypeFilter(mode)}
                style={{
                  padding: '3px 6px',
                  borderRadius: '3px',
                  fontSize: '10px',
                  fontWeight: selectedTypeFilter === mode ? 700 : 500,
                  backgroundColor: selectedTypeFilter === mode ? (mode === 'alert' ? '#FEF2F2' : '#E2E8F0') : 'transparent',
                  color: selectedTypeFilter === mode ? (mode === 'alert' ? '#DC2626' : '#0F172A') : '#64748B',
                  border: 'none',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {mode === 'alert' ? 'Findings' : 'All'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 3. Tab Contents */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {/* Tab 1: Events Log Stream */}
        {activeTab === 'events' && (
          <>
            {filteredLogs.length === 0 ? (
              <div style={{ padding: '24px 12px', textAlign: 'center', color: '#94A3B8', fontSize: '12px' }}>
                No events match filter.
              </div>
            ) : (
              filteredLogs.map((log) => {
                const isAlert = log.type === 'alert' || log.type === 'error';
                return (
                  <div
                    key={log.id}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px',
                      padding: '7px 9px',
                      borderRadius: '6px',
                      backgroundColor: isAlert ? '#FEF2F2' : '#FFFFFF',
                      border: `1px solid ${isAlert ? '#FECACA' : '#F1F5F9'}`,
                      fontSize: '11px',
                      lineHeight: '1.4',
                    }}
                  >
                    <div style={{ marginTop: '2px' }}>{renderIcon(log.type)}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '1px' }}>
                        {log.agent && (
                          <span
                            style={{
                              fontSize: '9px',
                              fontWeight: 700,
                              color: isAlert ? '#DC2626' : '#0F172A',
                              backgroundColor: isAlert ? '#FEE2E2' : '#F1F5F9',
                              padding: '1px 5px',
                              borderRadius: '3px',
                              textTransform: 'uppercase',
                            }}
                          >
                            {log.agent}
                          </span>
                        )}
                        <span style={{ fontSize: '10px', color: '#94A3B8', fontFamily: "'JetBrains Mono', monospace" }}>
                          {log.timestamp}
                        </span>
                      </div>
                      <span style={{ color: isAlert ? '#991B1B' : '#334155', fontWeight: isAlert ? 600 : 400 }}>
                        {log.message}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={logEndRef} />
          </>
        )}

        {/* Tab 2: Files Discovered / Analyzed */}
        {activeTab === 'files' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {displayFiles.map((f) => (
              <div
                key={f.path}
                onClick={() => onSelectFile?.(f.path)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  cursor: 'pointer',
                  transition: 'background 100ms ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
                  <FileCode2 size={13} color="#0F172A" style={{ flexShrink: 0 }} />
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#0F172A',
                      fontFamily: "'JetBrains Mono', monospace",
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {f.path}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  {f.findingsCount > 0 ? (
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        color: '#DC2626',
                        backgroundColor: '#FEE2E2',
                        padding: '1px 6px',
                        borderRadius: '4px',
                      }}
                    >
                      {f.findingsCount} findings
                    </span>
                  ) : (
                    <span
                      style={{
                        fontSize: '10px',
                        color: '#16A34A',
                        backgroundColor: '#F0FDF4',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        fontWeight: 600,
                      }}
                    >
                      Clean
                    </span>
                  )}
                  <ChevronRight size={12} color="#94A3B8" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 3: Real Tool Calls & Exit Codes */}
        {activeTab === 'tools' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {displayToolCalls.map((tc) => (
              <div
                key={tc.id}
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '6px',
                  padding: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Wrench size={13} color="#0F172A" />
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>
                      {tc.tool}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      color: tc.status === 'COMPLETED' ? '#16A34A' : '#DC2626',
                      backgroundColor: tc.status === 'COMPLETED' ? '#F0FDF4' : '#FEF2F2',
                      padding: '1px 6px',
                      borderRadius: '4px',
                    }}
                  >
                    {tc.status}
                  </span>
                </div>

                {tc.command && (
                  <div
                    style={{
                      fontSize: '10px',
                      fontFamily: "'JetBrains Mono', monospace",
                      backgroundColor: '#F8FAFC',
                      padding: '5px 8px',
                      borderRadius: '4px',
                      color: '#475569',
                      border: '1px solid #E2E8F0',
                      wordBreak: 'break-all',
                    }}
                  >
                    $ {tc.command}
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '10px', color: '#64748B' }}>
                  <span>Exit Code: <strong style={{ color: '#0F172A' }}>{tc.exitCode ?? 0}</strong></span>
                  <span>Duration: <strong style={{ color: '#0F172A' }}>{tc.durationMs ?? 0}ms</strong></span>
                  <span>Issues: <strong style={{ color: '#DC2626' }}>{tc.findingsCount ?? 0}</strong></span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
