'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  Search,
  Filter,
  Wrench,
  Eye,
  FileCode,
} from 'lucide-react';

export interface FindingRow {
  id?: string;
  title: string;
  severity: string;
  file?: string;
  file_path?: string;
  line?: number;
  line_start?: number;
  module?: string;
  category?: string;
  cve_id?: string;
  snippet?: string;
  description?: string;
  remediation?: string;
}

export interface DynamicFindingsTableCardProps {
  findings: FindingRow[];
  title?: string;
  subtitle?: string;
  repository?: string;
  branch?: string;
  onInspectFinding?: (finding: FindingRow) => void;
  onAutofixFinding?: (finding: FindingRow) => void;
}

export function DynamicFindingsTableCard({
  findings = [],
  title = 'Security Findings',
  subtitle,
  repository = 'kavach',
  branch = 'main',
  onInspectFinding,
  onAutofixFinding,
}: DynamicFindingsTableCardProps) {
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const criticalCount = findings.filter((f) => (f.severity || '').toUpperCase() === 'CRITICAL').length;
  const highCount = findings.filter((f) => (f.severity || '').toUpperCase() === 'HIGH').length;
  const mediumCount = findings.filter((f) => (f.severity || '').toUpperCase() === 'MEDIUM').length;
  const lowCount = findings.filter((f) => ['LOW', 'INFO', 'INFORMATIONAL'].includes((f.severity || '').toUpperCase())).length;

  const filteredFindings = findings.filter((f) => {
    const sev = (f.severity || '').toUpperCase();
    if (selectedSeverity !== 'ALL' && sev !== selectedSeverity) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = (f.title || '').toLowerCase().includes(q);
      const matchFile = (f.file || f.file_path || '').toLowerCase().includes(q);
      const matchMod = (f.module || f.category || '').toLowerCase().includes(q);
      return matchTitle || matchFile || matchMod;
    }
    return true;
  });

  const getSeverityBadge = (severity: string) => {
    const s = (severity || '').toUpperCase();
    switch (s) {
      case 'CRITICAL':
        return { bg: '#FEE2E2', text: '#DC2626', border: '#FECACA' };
      case 'HIGH':
        return { bg: '#FFEDD5', text: '#EA580C', border: '#FED7AA' };
      case 'MEDIUM':
        return { bg: '#FEF3C7', text: '#D97706', border: '#FDE68A' };
      default:
        return { bg: '#F1F5F9', text: '#475569', border: '#E2E8F0' };
    }
  };

  return (
    <div
      style={{
        marginTop: 14,
        padding: '20px 22px',
        backgroundColor: '#FFFFFF',
        border: '1px solid #CBD5E1',
        borderRadius: 14,
        boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              backgroundColor: '#FEE2E2',
              color: '#DC2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ShieldAlert size={18} />
          </div>
          <div>
            <h4 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0 }}>
              {title} ({findings.length})
            </h4>
            <div style={{ fontSize: 12, color: '#64748B' }}>
              {subtitle || `Persisted security findings recorded for ${repository} (${branch})`}
            </div>
          </div>
        </div>

        <Link
          href="/findings"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            fontWeight: 600,
            color: '#2563EB',
            textDecoration: 'none',
          }}
        >
          <span>Open Full Findings Module</span>
          <ArrowRight size={13} />
        </Link>
      </div>

      {/* Severity Filter Chips */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setSelectedSeverity('ALL')}
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: selectedSeverity === 'ALL' ? 700 : 500,
              backgroundColor: selectedSeverity === 'ALL' ? '#0F172A' : '#F1F5F9',
              color: selectedSeverity === 'ALL' ? '#FFFFFF' : '#475569',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            All ({findings.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedSeverity('CRITICAL')}
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: selectedSeverity === 'CRITICAL' ? 700 : 500,
              backgroundColor: selectedSeverity === 'CRITICAL' ? '#DC2626' : '#FEE2E2',
              color: selectedSeverity === 'CRITICAL' ? '#FFFFFF' : '#DC2626',
              border: '1px solid #FECACA',
              cursor: 'pointer',
            }}
          >
            🔴 Critical ({criticalCount})
          </button>
          <button
            type="button"
            onClick={() => setSelectedSeverity('HIGH')}
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: selectedSeverity === 'HIGH' ? 700 : 500,
              backgroundColor: selectedSeverity === 'HIGH' ? '#EA580C' : '#FFEDD5',
              color: selectedSeverity === 'HIGH' ? '#FFFFFF' : '#EA580C',
              border: '1px solid #FED7AA',
              cursor: 'pointer',
            }}
          >
            🟠 High ({highCount})
          </button>
          <button
            type="button"
            onClick={() => setSelectedSeverity('MEDIUM')}
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: selectedSeverity === 'MEDIUM' ? 700 : 500,
              backgroundColor: selectedSeverity === 'MEDIUM' ? '#D97706' : '#FEF3C7',
              color: selectedSeverity === 'MEDIUM' ? '#FFFFFF' : '#D97706',
              border: '1px solid #FDE68A',
              cursor: 'pointer',
            }}
          >
            🟡 Medium ({mediumCount})
          </button>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', width: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 9, top: 8, color: '#94A3B8' }} />
          <input
            type="text"
            placeholder="Search findings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 10px 6px 30px',
              borderRadius: 6,
              border: '1px solid #CBD5E1',
              fontSize: 12,
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* Findings Table */}
      <div
        style={{
          border: '1px solid #E2E8F0',
          borderRadius: 8,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '90px 1fr 140px 100px',
            backgroundColor: '#F8FAFC',
            padding: '8px 12px',
            borderBottom: '1px solid #E2E8F0',
            fontSize: 11,
            fontWeight: 700,
            color: '#64748B',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          <div>Severity</div>
          <div>Vulnerability</div>
          <div>Location</div>
          <div style={{ textAlign: 'right' }}>Actions</div>
        </div>

        <div style={{ maxHeight: 320, overflowY: 'auto' }}>
          {filteredFindings.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', fontSize: 13, color: '#64748B' }}>
              Zero findings match the selected filters.
            </div>
          ) : (
            filteredFindings.map((f, i) => {
              const badge = getSeverityBadge(f.severity);
              const loc = `${f.file || f.file_path || 'codebase'}:${f.line || f.line_start || 1}`;
              return (
                <div
                  key={f.id || i}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '90px 1fr 140px 100px',
                    padding: '10px 12px',
                    borderBottom: i < filteredFindings.length - 1 ? '1px solid #F1F5F9' : 'none',
                    alignItems: 'center',
                    fontSize: 12.5,
                  }}
                  className="hover:bg-slate-50 transition-colors"
                >
                  {/* Severity */}
                  <div>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 700,
                        backgroundColor: badge.bg,
                        color: badge.text,
                        border: `1px solid ${badge.border}`,
                        display: 'inline-block',
                      }}
                    >
                      {f.severity || 'Medium'}
                    </span>
                  </div>

                  {/* Title & Module */}
                  <div style={{ minWidth: 0, paddingRight: 10 }}>
                    <div
                      style={{
                        fontWeight: 600,
                        color: '#0F172A',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {f.title}
                    </div>
                    {f.cve_id && (
                      <span style={{ fontSize: 11, color: '#64748B', fontWeight: 500 }}>
                        {f.cve_id} · {(f.module || f.category || 'SAST').toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Location */}
                  <div
                    style={{
                      fontSize: 11.5,
                      color: '#64748B',
                      fontFamily: 'monospace',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={loc}
                  >
                    {loc}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                    {onInspectFinding && (
                      <button
                        type="button"
                        onClick={() => onInspectFinding(f)}
                        title="Inspect Finding Details"
                        style={{
                          padding: '4px 8px',
                          backgroundColor: '#F8FAFC',
                          border: '1px solid #CBD5E1',
                          borderRadius: 5,
                          fontSize: 11,
                          fontWeight: 600,
                          color: '#0F172A',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <Eye size={12} />
                        <span>Inspect</span>
                      </button>
                    )}

                    {onAutofixFinding && (
                      <button
                        type="button"
                        onClick={() => onAutofixFinding(f)}
                        title="Generate Remediation Patch"
                        style={{
                          padding: '4px 8px',
                          backgroundColor: '#0F172A',
                          border: 'none',
                          borderRadius: 5,
                          fontSize: 11,
                          fontWeight: 600,
                          color: '#FFFFFF',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <Wrench size={12} />
                        <span>Fix</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
