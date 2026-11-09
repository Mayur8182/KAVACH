'use client';

import React, { useState } from 'react';
import {
  Folder,
  FileCode2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldAlert,
  Search,
  Filter,
  ArrowRight,
  Code2,
  Layers,
  Box,
} from 'lucide-react';
import { WorkspaceFileItem } from './LiveCodeViewer';
import { FindingItem } from './RemediationDiffViewer';

interface FilesAnalysisViewProps {
  files: WorkspaceFileItem[];
  findings: FindingItem[];
  currentAnalyzingFile?: string;
  onSelectFile: (filePath: string) => void;
  onSelectFinding: (findingId: string) => void;
}

export const FilesAnalysisView: React.FC<FilesAnalysisViewProps> = ({
  files = [],
  findings = [],
  currentAnalyzingFile = 'src/auth/session.ts',
  onSelectFile,
  onSelectFinding,
}) => {
  const [filter, setFilter] = useState<'all' | 'vulnerable' | 'analyzing' | 'clean'>('all');
  const [search, setSearch] = useState('');
  const [selectedFileForPreview, setSelectedFileForPreview] = useState<string>(
    files[0]?.path || 'src/auth/session.ts'
  );

  // Group files or enrich with findings
  const enrichedFiles = files.map((f) => {
    const fileFindings = findings.filter(
      (finding) =>
        finding.location?.toLowerCase().includes(f.path.toLowerCase()) ||
        f.path.toLowerCase().includes(finding.location?.split(':')[0]?.toLowerCase() || '')
    );
    const isAnalyzing = f.path === currentAnalyzingFile;
    const isVulnerable = fileFindings.length > 0;
    const status = isAnalyzing ? 'analyzing' : isVulnerable ? 'vulnerable' : 'clean';

    let assignedAgent = 'SAST Agent';
    if (f.path.endsWith('.tf') || f.path.includes('infra/')) assignedAgent = 'IaC Agent';
    else if (f.path.includes('Dockerfile') || f.path.includes('docker')) assignedAgent = 'Container Agent';
    else if (f.path.includes('package.json') || f.path.includes('requirements.txt')) assignedAgent = 'SCA Agent';
    else if (f.path.includes('openapi') || f.path.includes('swagger')) assignedAgent = 'SCM / DAST Agent';

    return {
      ...f,
      status,
      assignedAgent,
      findingsCount: fileFindings.length,
      fileFindings,
    };
  });

  const filtered = enrichedFiles.filter((item) => {
    if (filter === 'vulnerable' && item.findingsCount === 0) return false;
    if (filter === 'analyzing' && item.status !== 'analyzing') return false;
    if (filter === 'clean' && item.findingsCount > 0) return false;
    if (search && !item.path.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const selectedFileData = enrichedFiles.find((f) => f.path === selectedFileForPreview) || enrichedFiles[0];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 380px',
        border: '1px solid #E2E8F0',
        borderRadius: '10px',
        backgroundColor: '#FFFFFF',
        minHeight: '520px',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
      }}
    >
      {/* Left: Files Table with Filters */}
      <div style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid #E2E8F0' }}>
        {/* Controls Bar */}
        <div
          style={{
            padding: '12px 18px',
            borderBottom: '1px solid #E2E8F0',
            backgroundColor: '#F8FAFC',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          {/* Status Filter Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {(
              [
                { id: 'all', label: `All (${enrichedFiles.length})` },
                {
                  id: 'vulnerable',
                  label: `Vulnerable (${enrichedFiles.filter((f) => f.findingsCount > 0).length})`,
                },
                { id: 'analyzing', label: 'Analyzing' },
                {
                  id: 'clean',
                  label: `Clean (${enrichedFiles.filter((f) => f.findingsCount === 0).length})`,
                },
              ] as const
            ).map((btn) => (
              <button
                key={btn.id}
                type="button"
                onClick={() => setFilter(btn.id)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '14px',
                  fontSize: '11.5px',
                  fontWeight: filter === btn.id ? 700 : 500,
                  backgroundColor: filter === btn.id ? '#0F172A' : '#FFFFFF',
                  color: filter === btn.id ? '#FFFFFF' : '#475569',
                  border: filter === btn.id ? '1px solid #0F172A' : '1px solid #CBD5E1',
                  cursor: 'pointer',
                  transition: 'all 120ms ease',
                }}
              >
                {btn.label}
              </button>
            ))}
          </div>

          {/* Search box */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: '6px',
              padding: '4px 8px',
              width: '200px',
            }}
          >
            <Search size={13} color="#94A3B8" />
            <input
              type="text"
              placeholder="Search file path..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                border: 'none',
                outline: 'none',
                fontSize: '12px',
                width: '100%',
                backgroundColor: 'transparent',
              }}
            />
          </div>
        </div>

        {/* Files List */}
        <div style={{ flex: 1, overflowY: 'auto', maxHeight: '500px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 140px 110px 80px',
              padding: '8px 16px',
              backgroundColor: '#F8FAFC',
              fontSize: '11px',
              fontWeight: 700,
              color: '#64748B',
              borderBottom: '1px solid #E2E8F0',
            }}
          >
            <span>File Path</span>
            <span>Assigned Agent</span>
            <span>Status</span>
            <span style={{ textAlign: 'right' }}>Findings</span>
          </div>

          {filtered.map((item) => {
            const isSelected = selectedFileForPreview === item.path;
            return (
              <div
                key={item.path}
                onClick={() => {
                  setSelectedFileForPreview(item.path);
                  onSelectFile(item.path);
                }}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 140px 110px 80px',
                  alignItems: 'center',
                  padding: '10px 16px',
                  borderBottom: '1px solid #F1F5F9',
                  fontSize: '12.5px',
                  backgroundColor: isSelected ? '#F0FDF4' : '#FFFFFF',
                  cursor: 'pointer',
                  transition: 'background-color 100ms ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                  <FileCode2 size={14} color="#64748B" style={{ flexShrink: 0 }} />
                  <span
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '12px',
                      color: isSelected ? '#15803D' : '#0F172A',
                      fontWeight: isSelected ? 700 : 500,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.path}
                  </span>
                </div>

                <div style={{ fontSize: '11.5px', color: '#475569' }}>{item.assignedAgent}</div>

                <div>
                  {item.status === 'analyzing' ? (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        backgroundColor: '#FEF9C3',
                        color: '#854D0E',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '10.5px',
                        fontWeight: 700,
                      }}
                    >
                      Analyzing
                    </span>
                  ) : item.status === 'vulnerable' ? (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        backgroundColor: '#FEF2F2',
                        color: '#DC2626',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '10.5px',
                        fontWeight: 700,
                      }}
                    >
                      Vulnerable
                    </span>
                  ) : (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        backgroundColor: '#F0FDF4',
                        color: '#16A34A',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '10.5px',
                        fontWeight: 600,
                      }}
                    >
                      Clean
                    </span>
                  )}
                </div>

                <div style={{ textAlign: 'right' }}>
                  {item.findingsCount > 0 ? (
                    <span
                      style={{
                        backgroundColor: '#DC2626',
                        color: '#FFFFFF',
                        borderRadius: '10px',
                        padding: '1px 7px',
                        fontSize: '11px',
                        fontWeight: 700,
                      }}
                    >
                      {item.findingsCount}
                    </span>
                  ) : (
                    <span style={{ color: '#94A3B8', fontSize: '12px' }}>0</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: Contextual File Analysis Details */}
      <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: '#FAFAFA' }}>
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid #E2E8F0',
            backgroundColor: '#F8FAFC',
            fontSize: '12.5px',
            fontWeight: 700,
            color: '#0F172A',
          }}
        >
          File Security Inspection
        </div>

        {selectedFileData ? (
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto' }}>
            <div>
              <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                Inspected File
              </div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', fontFamily: 'monospace', marginTop: '2px' }}>
                {selectedFileData.path}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12px' }}>
              <div style={{ backgroundColor: '#FFFFFF', padding: '10px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '10.5px', color: '#64748B' }}>Assigned Agent</div>
                <div style={{ fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>{selectedFileData.assignedAgent}</div>
              </div>

              <div style={{ backgroundColor: '#FFFFFF', padding: '10px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '10.5px', color: '#64748B' }}>Security Status</div>
                <div style={{ fontWeight: 700, color: selectedFileData.findingsCount > 0 ? '#DC2626' : '#16A34A', marginTop: '2px' }}>
                  {selectedFileData.findingsCount > 0 ? `${selectedFileData.findingsCount} Vulnerability` : 'Clean / Safe'}
                </div>
              </div>
            </div>

            {selectedFileData.findingsCount > 0 ? (
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#DC2626', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Discovered Findings
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedFileData.fileFindings?.map((f: any) => (
                    <div
                      key={f.id}
                      onClick={() => onSelectFinding(f.id)}
                      style={{
                        padding: '10px 12px',
                        border: '1.5px solid #FCA5A5',
                        borderRadius: '6px',
                        backgroundColor: '#FEF2F2',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>{f.title}</span>
                        <span style={{ fontSize: '10px', fontWeight: 700, color: '#DC2626', backgroundColor: '#FEE2E2', padding: '1px 5px', borderRadius: '4px' }}>
                          {f.severity}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#475569', marginTop: '3px' }}>{f.description}</div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#DC2626', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <span>Investigate Finding</span>
                          <ArrowRight size={11} />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ padding: '14px', backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={16} color="#16A34A" />
                <span style={{ fontSize: '12px', color: '#166534', fontWeight: 600 }}>
                  No security vulnerabilities or policy violations detected in this source file.
                </span>
              </div>
            )}
          </div>
        ) : (
          <div style={{ padding: '24px', textAlign: 'center', color: '#64748B', fontSize: '12.5px' }}>
            Select a file from the list to view its security analysis.
          </div>
        )}
      </div>
    </div>
  );
};

