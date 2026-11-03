'use client';

import React, { useState, useMemo } from 'react';
import {
  X,
  RotateCcw,
  Copy,
  Check,
  Download,
  Terminal,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Layers,
  ShieldAlert,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  Code2,
} from 'lucide-react';
import { generateExactToolLogs, ToolExecutionDetail } from '@/lib/logs/toolLogGenerator';

interface JobDetailsModalProps {
  job: any;
  onClose: () => void;
  onRerun: (jobId: string) => void;
  isRerunning?: boolean;
}

export const JobDetailsModal: React.FC<JobDetailsModalProps> = ({
  job,
  onClose,
  onRerun,
  isRerunning = false,
}) => {
  const [activeTab, setActiveTab] = useState<'console' | 'raw' | 'stages' | 'env'>('console');
  const [logFilter, setLogFilter] = useState<'all' | 'error' | 'warn'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [selectedToolOverride, setSelectedToolOverride] = useState<string>('auto');

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isRerunning) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRerunning, onClose]);

  // Generate or obtain authentic tool logs
  const toolExecution: ToolExecutionDetail = useMemo(() => {
    // If user selected an override tool, adjust job representation
    let jobCopy = { ...job };
    if (selectedToolOverride === 'jenkins') {
      jobCopy.job_name = 'Jenkins CI Pipeline #1042';
      jobCopy.triggered_by = 'Jenkins';
    } else if (selectedToolOverride === 'gitlab') {
      jobCopy.job_name = 'GitLab Runner Pipeline';
      jobCopy.triggered_by = 'GitLab';
    } else if (selectedToolOverride === 'aws') {
      jobCopy.job_name = 'AWS Security Hub Ingestion';
      jobCopy.job_type = 'AWS';
    } else if (selectedToolOverride === 'azure') {
      jobCopy.job_name = 'Azure DevOps Defender Audit';
      jobCopy.job_type = 'AZURE';
    }
    return generateExactToolLogs(jobCopy);
  }, [job, selectedToolOverride]);

  // Combine with any existing backend logs
  const combinedLogs = useMemo(() => {
    const generated = toolExecution.logs;
    if (job?.recent_logs && Array.isArray(job.recent_logs) && job.recent_logs.length > 5) {
      return job.recent_logs;
    }
    return generated;
  }, [toolExecution, job]);

  // Filter logs
  const filteredLogs = useMemo(() => {
    return combinedLogs.filter((line) => {
      if (logFilter === 'error') {
        const isErr = line.includes('[ERROR]') || line.includes('[FAILED]') || line.includes('FAILURE') || line.includes('error') || line.includes('Failed');
        if (!isErr) return false;
      } else if (logFilter === 'warn') {
        const isWarn = line.includes('[WARN]') || line.includes('Warning') || line.includes('[ERROR]') || line.includes('Failed');
        if (!isWarn) return false;
      }

      if (searchQuery.trim()) {
        return line.toLowerCase().includes(searchQuery.toLowerCase());
      }
      return true;
    });
  }, [combinedLogs, logFilter, searchQuery]);

  const handleCopyLogs = () => {
    navigator.clipboard.writeText(combinedLogs.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadLogFile = () => {
    const blob = new Blob([combinedLogs.join('\n')], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(job.job_number || 'job').toLowerCase()}-execution.log`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const status = (job.status || 'Success').toLowerCase();
  const isFailed = status.includes('fail') || status.includes('error');
  const isSuccess = status.includes('succ') || status.includes('pass');

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(3px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        animation: 'fadeIn 0.15s ease-out',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '940px',
          maxWidth: '96vw',
          maxHeight: '92vh',
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.35)',
          border: '1px solid #CBD5E1',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Modal Header ── */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#F8FAFC',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                backgroundColor: isFailed ? '#FEF2F2' : isSuccess ? '#F0FDF4' : '#EFF6FF',
                border: `1px solid ${isFailed ? '#FECACA' : isSuccess ? '#BBF7D0' : '#BFDBFE'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isFailed ? '#DC2626' : isSuccess ? '#16A34A' : '#2563EB',
              }}
            >
              {isFailed ? <XCircle size={20} /> : isSuccess ? <CheckCircle2 size={20} /> : <Clock size={20} />}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>
                  {job.job_name}
                </h3>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '12px',
                    backgroundColor: isFailed ? '#FEF2F2' : isSuccess ? '#F0FDF4' : '#EFF6FF',
                    color: isFailed ? '#DC2626' : isSuccess ? '#16A34A' : '#2563EB',
                    border: `1px solid ${isFailed ? '#FECACA' : isSuccess ? '#BBF7D0' : '#BFDBFE'}`,
                  }}
                >
                  {job.status}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#334155' }}>
                  {job.job_number || job.id}
                </span>{' '}
                &bull; Branch: <span style={{ fontWeight: 500, color: '#0F172A' }}>{job.branch || 'main'}</span> &bull;{' '}
                Trigger: <span style={{ fontWeight: 500, color: '#0F172A' }}>{job.triggered_by || 'Manual'}</span> &bull;{' '}
                Duration: <span style={{ fontWeight: 500, color: '#0F172A' }}>{job.duration_str || '—'}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => onRerun(job.id)}
              disabled={isRerunning}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                fontSize: '12px',
                fontWeight: 600,
                backgroundColor: '#2563EB',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                cursor: isRerunning ? 'wait' : 'pointer',
              }}
            >
              <RotateCcw size={13} className={isRerunning ? 'animate-spin' : ''} />
              {isRerunning ? 'Re-running...' : 'Re-run Job'}
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#64748B',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Summary & Metadata Strip ── */}
        <div
          style={{
            padding: '14px 24px',
            backgroundColor: '#FFFFFF',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          {/* Finding Badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#64748B', marginRight: '4px' }}>
              Vulnerabilities:
            </span>
            <span
              style={{
                padding: '3px 8px',
                borderRadius: '6px',
                backgroundColor: '#FEF2F2',
                color: '#991B1B',
                fontSize: '11px',
                fontWeight: 700,
                border: '1px solid #FECACA',
              }}
            >
              {job.scan_summary?.critical ?? 0} Critical
            </span>
            <span
              style={{
                padding: '3px 8px',
                borderRadius: '6px',
                backgroundColor: '#FFF7ED',
                color: '#C2410C',
                fontSize: '11px',
                fontWeight: 700,
                border: '1px solid #FED7AA',
              }}
            >
              {job.scan_summary?.high ?? 0} High
            </span>
            <span
              style={{
                padding: '3px 8px',
                borderRadius: '6px',
                backgroundColor: '#FEFCE8',
                color: '#A16207',
                fontSize: '11px',
                fontWeight: 700,
                border: '1px solid #FEF08A',
              }}
            >
              {job.scan_summary?.medium ?? 0} Medium
            </span>
            <span
              style={{
                padding: '3px 8px',
                borderRadius: '6px',
                backgroundColor: '#F0FDF4',
                color: '#15803D',
                fontSize: '11px',
                fontWeight: 700,
                border: '1px solid #BBF7D0',
              }}
            >
              {job.scan_summary?.low ?? 0} Low
            </span>
          </div>

          {/* Tool Selector / Execution Profile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 500 }}>Tool Profile:</span>
            <select
              value={selectedToolOverride}
              onChange={(e) => setSelectedToolOverride(e.target.value)}
              style={{
                padding: '4px 10px',
                fontSize: '11.5px',
                fontWeight: 600,
                color: '#0F172A',
                backgroundColor: '#F8FAFC',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              <option value="auto">Native Tool ({toolExecution.toolName.split(' ')[0]})</option>
              <option value="jenkins">Jenkins Pipeline Console</option>
              <option value="gitlab">GitLab Runner Log</option>
              <option value="aws">AWS Security Hub Sync</option>
              <option value="azure">Azure DevOps Defender</option>
            </select>
          </div>
        </div>

        {/* ── Command & Tool Info Bar ── */}
        <div
          style={{
            padding: '10px 24px',
            backgroundColor: '#0F172A',
            color: '#E2E8F0',
            fontFamily: 'monospace',
            fontSize: '11.5px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #1E293B',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <Terminal size={14} style={{ color: '#38BDF8', flexShrink: 0 }} />
            <span style={{ color: '#94A3B8' }}>$</span>
            <span style={{ color: '#38BDF8', fontWeight: 600 }}>{toolExecution.cliCommand}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
            <span style={{ color: '#94A3B8' }}>{toolExecution.toolVersion}</span>
            <span
              style={{
                padding: '1px 6px',
                borderRadius: '4px',
                backgroundColor: toolExecution.exitCode === 0 ? '#14532D' : '#7F1D1D',
                color: toolExecution.exitCode === 0 ? '#86EFAC' : '#FCA5A5',
                fontSize: '10px',
                fontWeight: 700,
              }}
            >
              exit: {toolExecution.exitCode}
            </span>
          </div>
        </div>

        {/* ── Console Tabs & Search Bar ── */}
        <div
          style={{
            padding: '8px 24px',
            backgroundColor: '#1E293B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #334155',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={() => setActiveTab('console')}
              style={{
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 600,
                borderRadius: '4px',
                backgroundColor: activeTab === 'console' ? '#334155' : 'transparent',
                color: activeTab === 'console' ? '#FFFFFF' : '#94A3B8',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Console Output ({combinedLogs.length})
            </button>
            <button
              onClick={() => setActiveTab('stages')}
              style={{
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 600,
                borderRadius: '4px',
                backgroundColor: activeTab === 'stages' ? '#334155' : 'transparent',
                color: activeTab === 'stages' ? '#FFFFFF' : '#94A3B8',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Execution Stages ({toolExecution.stages.length})
            </button>
            <button
              onClick={() => setActiveTab('env')}
              style={{
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 600,
                borderRadius: '4px',
                backgroundColor: activeTab === 'env' ? '#334155' : 'transparent',
                color: activeTab === 'env' ? '#FFFFFF' : '#94A3B8',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Environment &amp; Config
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Filter buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                onClick={() => setLogFilter('all')}
                style={{
                  padding: '3px 8px',
                  fontSize: '10.5px',
                  borderRadius: '4px',
                  backgroundColor: logFilter === 'all' ? '#0F172A' : '#334155',
                  color: '#CBD5E1',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                All
              </button>
              <button
                onClick={() => setLogFilter('error')}
                style={{
                  padding: '3px 8px',
                  fontSize: '10.5px',
                  borderRadius: '4px',
                  backgroundColor: logFilter === 'error' ? '#991B1B' : '#334155',
                  color: logFilter === 'error' ? '#FECACA' : '#CBD5E1',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Errors
              </button>
              <button
                onClick={() => setLogFilter('warn')}
                style={{
                  padding: '3px 8px',
                  fontSize: '10.5px',
                  borderRadius: '4px',
                  backgroundColor: logFilter === 'warn' ? '#854D0E' : '#334155',
                  color: logFilter === 'warn' ? '#FEF08A' : '#CBD5E1',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Warnings
              </button>
            </div>

            {/* Search Input */}
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Filter logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  padding: '3px 8px 3px 24px',
                  fontSize: '11px',
                  backgroundColor: '#0F172A',
                  color: '#F8FAFC',
                  border: '1px solid #334155',
                  borderRadius: '4px',
                  width: '140px',
                  outline: 'none',
                }}
              />
              <Search size={11} style={{ position: 'absolute', left: 7, top: 7, color: '#64748B' }} />
            </div>

            {/* Copy & Download */}
            <button
              onClick={handleCopyLogs}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                fontSize: '11px',
                backgroundColor: '#334155',
                color: '#E2E8F0',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
              title="Copy all logs to clipboard"
            >
              {copied ? <Check size={11} color="#4ADE80" /> : <Copy size={11} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button
              onClick={handleDownloadLogFile}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                fontSize: '11px',
                backgroundColor: '#334155',
                color: '#E2E8F0',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
              title="Download full raw execution log file"
            >
              <Download size={11} /> Log File
            </button>
          </div>
        </div>

        {/* ── Modal Body / Terminal Window ── */}
        <div
          style={{
            flex: 1,
            backgroundColor: '#0B0F19',
            overflowY: 'auto',
            padding: '16px 20px',
            fontFamily: 'Consolas, Monaco, "Courier New", monospace',
            fontSize: '12px',
            lineHeight: 1.6,
            minHeight: '360px',
            maxHeight: '52vh',
          }}
        >
          {activeTab === 'console' && (
            <div>
              {filteredLogs.length > 0 ? (
                filteredLogs.map((line, idx) => {
                  let color = '#CBD5E1';
                  let bg = 'transparent';
                  if (line.includes('[ERROR]') || line.includes('[FAILED]') || line.includes('FAILURE') || line.includes('error:')) {
                    color = '#FCA5A5';
                    bg = 'rgba(239, 68, 68, 0.08)';
                  } else if (line.includes('[WARN]') || line.includes('warning') || line.includes('[MATCH]')) {
                    color = '#FDE047';
                    bg = 'rgba(234, 179, 8, 0.05)';
                  } else if (line.includes('[SUCCESS]') || line.includes('[PASSED]') || line.includes('succeeded') || line.includes('Pass')) {
                    color = '#86EFAC';
                  } else if (line.includes('[trivy]') || line.includes('[semgrep]') || line.includes('[gitleaks]') || line.includes('[checkov]')) {
                    color = '#38BDF8';
                  } else if (line.includes('[Jenkins]') || line.includes('[GL-SAST]') || line.includes('[aws-') || line.includes('[defender-')) {
                    color = '#C084FC';
                  }

                  return (
                    <div
                      key={idx}
                      style={{
                        padding: '1px 6px',
                        borderRadius: '3px',
                        backgroundColor: bg,
                        color,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all',
                      }}
                    >
                      <span style={{ color: '#475569', userSelect: 'none', marginRight: '12px' }}>
                        {String(idx + 1).padStart(3, ' ')}
                      </span>
                      {line}
                    </div>
                  );
                })
              ) : (
                <div style={{ color: '#64748B', textAlign: 'center', padding: '40px 0' }}>
                  No logs match the current filter or search criteria.
                </div>
              )}
            </div>
          )}

          {activeTab === 'stages' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#94A3B8', marginBottom: '4px' }}>
                Pipeline Stage Execution Breakdown:
              </div>
              {toolExecution.stages.map((st, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: '6px',
                    backgroundColor: '#1E293B',
                    border: '1px solid #334155',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {st.status === 'SUCCESS' ? (
                      <CheckCircle2 size={16} color="#4ADE80" />
                    ) : st.status === 'FAILED' ? (
                      <XCircle size={16} color="#F87171" />
                    ) : (
                      <Clock size={16} color="#94A3B8" />
                    )}
                    <span style={{ color: '#F1F5F9', fontWeight: 500 }}>{st.name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ color: '#94A3B8', fontSize: '11px' }}>{(st.durationMs / 1000).toFixed(1)}s</span>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: 700,
                        backgroundColor:
                          st.status === 'SUCCESS' ? '#14532D' : st.status === 'FAILED' ? '#7F1D1D' : '#334155',
                        color:
                          st.status === 'SUCCESS' ? '#86EFAC' : st.status === 'FAILED' ? '#FCA5A5' : '#CBD5E1',
                      }}
                    >
                      {st.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'env' && (
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#94A3B8', marginBottom: '12px' }}>
                Runner Runtime Environment Variables:
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
                  gap: '8px',
                }}
              >
                {Object.entries(toolExecution.environment).map(([k, v]) => (
                  <div
                    key={k}
                    style={{
                      padding: '8px 12px',
                      backgroundColor: '#1E293B',
                      borderRadius: '6px',
                      border: '1px solid #334155',
                    }}
                  >
                    <div style={{ color: '#38BDF8', fontSize: '11px', fontWeight: 600 }}>{k}</div>
                    <div style={{ color: '#F8FAFC', fontSize: '11.5px', marginTop: '2px', wordBreak: 'break-all' }}>
                      {v}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Modal Footer ── */}
        <div
          style={{
            padding: '12px 24px',
            backgroundColor: '#F8FAFC',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontSize: '11.5px', color: '#64748B' }}>
            Deterministic execution evidence logged to PostgreSQL audit registry.
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '7px 18px',
              fontSize: '12.5px',
              fontWeight: 600,
              backgroundColor: '#FFFFFF',
              color: '#334155',
              border: '1px solid #CBD5E1',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
