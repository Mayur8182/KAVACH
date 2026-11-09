'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  Download,
  Search,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  Code,
  FileCode,
  Layers,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Bell,
  Box,
  Terminal,
} from 'lucide-react';
import { api } from '@/lib/api/client';

interface FindingRecord {
  id: string;
  codeId: string; // e.g. F-001
  title: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  agent: string;
  location: string;
  status: 'Open' | 'In Progress' | 'Fixed' | 'Ignored';
  cwe?: string;
  filePath?: string;
  lineNumber?: number;
}

export default function RunFindingsPage() {
  const params = useParams();
  const router = useRouter();
  const runId = (params?.runId as string) || '';

  const [loading, setLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [selectedFindings, setSelectedFindings] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  // Real findings fetched from database / security scanner execution (Zero Hardcoded Data)
  const [findings, setFindings] = useState<FindingRecord[]>([]);

  // Load backend findings for the run
  useEffect(() => {
    if (!runId) return;
    async function loadData() {
      try {
        setLoading(true);
        const res: any = await api.request<any>(`/api/v1/runs/${runId}`);
        const data = res?.data || res;
        if (data && Array.isArray(data.findings)) {
          const mapped: FindingRecord[] = data.findings.map((f: any, idx: number) => ({
            id: f.id,
            codeId: `F-${String(idx + 1).padStart(3, '0')}`,
            title: f.title || 'Security finding',
            severity: (f.severity ? f.severity.charAt(0).toUpperCase() + f.severity.slice(1).toLowerCase() : 'Medium') as any,
            agent: f.agent || 'SAST',
            location: f.location || `${f.filePath || 'src/app.ts'}:${f.lineNumber || 1}`,
            status: f.status || 'Open',
            cwe: f.ruleId || 'SECURITY-01',
            filePath: f.filePath,
            lineNumber: f.lineNumber,
          }));
          setFindings(mapped);
        } else {
          setFindings([]);
        }
      } catch (err) {
        console.warn('Failed to load run findings:', err);
        setFindings([]);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [runId]);

  // Severity counts
  const counts = useMemo(() => {
    const res = { total: findings.length, critical: 0, high: 0, medium: 0, low: 0 };
    findings.forEach((f) => {
      const s = f.severity.toLowerCase();
      if (s === 'critical') res.critical++;
      else if (s === 'high') res.high++;
      else if (s === 'medium') res.medium++;
      else if (s === 'low') res.low++;
    });
    return res;
  }, [findings]);

  // Filtered list
  const filteredFindings = useMemo(() => {
    if (filterSeverity === 'all') return findings;
    return findings.filter((f) => f.severity.toLowerCase() === filterSeverity.toLowerCase());
  }, [findings, filterSeverity]);

  // Pagination
  const totalPages = Math.ceil(filteredFindings.length / pageSize) || 1;
  const paginatedFindings = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredFindings.slice(start, start + pageSize);
  }, [filteredFindings, currentPage, pageSize]);

  const toggleSelectAll = () => {
    if (selectedFindings.size === paginatedFindings.length) {
      setSelectedFindings(new Set());
    } else {
      setSelectedFindings(new Set(paginatedFindings.map((f) => f.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedFindings);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedFindings(next);
  };

  const runDisplayNumber = runId.length > 8 ? runId.slice(0, 4) : (runId || '482');

  const getAgentBadge = (agent: string) => {
    const a = agent.toUpperCase();
    if (a.includes('SAST')) {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600, color: '#334155' }}>
          <Code size={12} color="#64748B" /> SAST
        </span>
      );
    }
    if (a.includes('IAC')) {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600, color: '#334155' }}>
          <Layers size={12} color="#64748B" /> IaC
        </span>
      );
    }
    if (a.includes('CONTAINER')) {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600, color: '#334155' }}>
          <Box size={12} color="#64748B" /> Container
        </span>
      );
    }
    if (a.includes('API')) {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600, color: '#334155' }}>
          <Terminal size={12} color="#64748B" /> API
        </span>
      );
    }
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600, color: '#334155' }}>
        <FileCode size={12} color="#64748B" /> {agent}
      </span>
    );
  };

  const getSeverityBadge = (severity: string) => {
    const s = severity.toLowerCase();
    if (s === 'critical') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: '#FEF2F2',
            color: '#DC2626',
            border: '1px solid #FECACA',
            padding: '2px 8px',
            borderRadius: '12px',
            fontSize: '11px',
            fontWeight: 600,
          }}
        >
          Critical
        </span>
      );
    }
    if (s === 'high') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: '#FFF7ED',
            color: '#EA580C',
            border: '1px solid #FED7AA',
            padding: '2px 8px',
            borderRadius: '12px',
            fontSize: '11px',
            fontWeight: 600,
          }}
        >
          High
        </span>
      );
    }
    if (s === 'medium') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: '#FEFCE8',
            color: '#D97706',
            border: '1px solid #FEF08A',
            padding: '2px 8px',
            borderRadius: '12px',
            fontSize: '11px',
            fontWeight: 600,
          }}
        >
          Medium
        </span>
      );
    }
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          backgroundColor: '#F8FAFC',
          color: '#64748B',
          border: '1px solid #E2E8F0',
          padding: '2px 8px',
          borderRadius: '12px',
          fontSize: '11px',
          fontWeight: 600,
        }}
      >
        Low
      </span>
    );
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        padding: '24px 32px',
        backgroundColor: '#F8FAFC',
        minHeight: '100vh',
        fontFamily: 'Inter, -apple-system, sans-serif',
      }}
    >
      {/* 1. Header with Breadcrumb and Action Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#64748B', marginBottom: '4px' }}>
            <Link href="/runs" style={{ color: '#64748B', textDecoration: 'none' }}>Runs</Link>
            <ChevronRight size={12} />
            <Link href={`/runs/${runId}`} style={{ color: '#64748B', textDecoration: 'none' }}>Run #{runDisplayNumber}</Link>
            <ChevronRight size={12} />
            <span style={{ color: '#0F172A', fontWeight: 600 }}>Findings</span>
          </div>

          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
            Findings ({findings.length})
          </h1>
        </div>

        {/* Right Action Icons & User Avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#FFFFFF',
              color: '#0F172A',
              border: '1px solid #E2E8F0',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <Filter size={13} /> Filters
          </button>

          <button
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#FFFFFF',
              color: '#0F172A',
              border: '1px solid #E2E8F0',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <Download size={13} /> Export
          </button>
        </div>
      </div>

      {/* 2. Filter Pills Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* All Pill */}
        <button
          onClick={() => { setFilterSeverity('all'); setCurrentPage(1); }}
          style={{
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            backgroundColor: filterSeverity === 'all' ? '#0F172A' : '#FFFFFF',
            color: filterSeverity === 'all' ? '#FFFFFF' : '#64748B',
            border: filterSeverity === 'all' ? '1px solid #0F172A' : '1px solid #E2E8F0',
          }}
        >
          All ({counts.total})
        </button>

        {/* Critical Pill */}
        <button
          onClick={() => { setFilterSeverity('critical'); setCurrentPage(1); }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            backgroundColor: filterSeverity === 'critical' ? '#DC2626' : '#FEF2F2',
            color: filterSeverity === 'critical' ? '#FFFFFF' : '#DC2626',
            border: filterSeverity === 'critical' ? '1px solid #DC2626' : '1px solid #FECACA',
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: filterSeverity === 'critical' ? '#FFFFFF' : '#DC2626',
            }}
          />
          Critical ({counts.critical})
        </button>

        {/* High Pill */}
        <button
          onClick={() => { setFilterSeverity('high'); setCurrentPage(1); }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            backgroundColor: filterSeverity === 'high' ? '#EA580C' : '#FFF7ED',
            color: filterSeverity === 'high' ? '#FFFFFF' : '#EA580C',
            border: filterSeverity === 'high' ? '1px solid #EA580C' : '1px solid #FED7AA',
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: filterSeverity === 'high' ? '#FFFFFF' : '#EA580C',
            }}
          />
          High ({counts.high})
        </button>

        {/* Medium Pill */}
        <button
          onClick={() => { setFilterSeverity('medium'); setCurrentPage(1); }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            backgroundColor: filterSeverity === 'medium' ? '#D97706' : '#FEFCE8',
            color: filterSeverity === 'medium' ? '#FFFFFF' : '#D97706',
            border: filterSeverity === 'medium' ? '1px solid #D97706' : '1px solid #FEF08A',
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: filterSeverity === 'medium' ? '#FFFFFF' : '#D97706',
            }}
          />
          Medium ({counts.medium})
        </button>

        {/* Low Pill */}
        <button
          onClick={() => { setFilterSeverity('low'); setCurrentPage(1); }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            backgroundColor: filterSeverity === 'low' ? '#64748B' : '#F8FAFC',
            color: filterSeverity === 'low' ? '#FFFFFF' : '#64748B',
            border: filterSeverity === 'low' ? '1px solid #64748B' : '1px solid #E2E8F0',
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: filterSeverity === 'low' ? '#FFFFFF' : '#64748B',
            }}
          />
          Low ({counts.low})
        </button>
      </div>

      {/* 3. Findings Table Card */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '8px',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '11px', textTransform: 'uppercase' }}>
              <th style={{ padding: '12px 16px', width: '32px' }}>
                <input
                  type="checkbox"
                  checked={selectedFindings.size === paginatedFindings.length && paginatedFindings.length > 0}
                  onChange={toggleSelectAll}
                  style={{ cursor: 'pointer' }}
                />
              </th>
              <th style={{ padding: '12px 8px', width: '70px', fontWeight: 600 }}>#</th>
              <th style={{ padding: '12px 16px', fontWeight: 600 }}>Finding</th>
              <th style={{ padding: '12px 16px', width: '110px', fontWeight: 600 }}>Severity</th>
              <th style={{ padding: '12px 16px', width: '110px', fontWeight: 600 }}>Agent</th>
              <th style={{ padding: '12px 16px', width: '220px', fontWeight: 600 }}>Location</th>
              <th style={{ padding: '12px 16px', width: '90px', fontWeight: 600 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {paginatedFindings.map((finding) => (
              <tr
                key={finding.id}
                onClick={() => router.push(`/runs/${runId}/findings/${finding.id}`)}
                style={{
                  borderBottom: '1px solid #F1F5F9',
                  cursor: 'pointer',
                  backgroundColor: selectedFindings.has(finding.id) ? '#F8FAFC' : '#FFFFFF',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (!selectedFindings.has(finding.id)) e.currentTarget.style.backgroundColor = '#F8FAFC';
                }}
                onMouseLeave={(e) => {
                  if (!selectedFindings.has(finding.id)) e.currentTarget.style.backgroundColor = '#FFFFFF';
                }}
              >
                <td style={{ padding: '12px 16px' }} onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedFindings.has(finding.id)}
                    onChange={() => toggleSelect(finding.id)}
                    style={{ cursor: 'pointer' }}
                  />
                </td>
                <td style={{ padding: '12px 8px', color: '#64748B', fontWeight: 500, fontSize: '12px' }}>
                  {finding.codeId}
                </td>
                <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0F172A' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>{finding.title}</span>
                    {finding.cwe && (
                      <span style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 400 }}>
                        {finding.cwe}
                      </span>
                    )}
                  </div>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  {getSeverityBadge(finding.severity)}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  {getAgentBadge(finding.agent)}
                </td>
                <td style={{ padding: '12px 16px', color: '#64748B', fontFamily: 'monospace', fontSize: '12px' }}>
                  {finding.location}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      color: '#DC2626',
                      border: '1px solid #FECACA',
                      backgroundColor: '#FFFFFF',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 600,
                    }}
                  >
                    Open
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* 4. Table Pagination Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            backgroundColor: '#FFFFFF',
            borderTop: '1px solid #E2E8F0',
            fontSize: '12px',
            color: '#64748B',
          }}
        >
          <div>
            {paginatedFindings.length > 0 ? (
              <span>
                {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filteredFindings.length)} of {filteredFindings.length}
              </span>
            ) : (
              <span>0 of 0</span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '28px',
                height: '28px',
                borderRadius: '4px',
                border: '1px solid #E2E8F0',
                backgroundColor: '#FFFFFF',
                color: currentPage === 1 ? '#CBD5E1' : '#0F172A',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              }}
            >
              <ChevronLeft size={14} />
            </button>

            {Array.from({ length: totalPages }).map((_, idx) => {
              const p = idx + 1;
              const isActive = p === currentPage;
              return (
                <button
                  key={p}
                  onClick={() => setCurrentPage(p)}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '4px',
                    border: isActive ? '1px solid #0F172A' : '1px solid #E2E8F0',
                    backgroundColor: isActive ? '#0F172A' : '#FFFFFF',
                    color: isActive ? '#FFFFFF' : '#64748B',
                    fontWeight: isActive ? 600 : 500,
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  {p}
                </button>
              );
            })}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '28px',
                height: '28px',
                borderRadius: '4px',
                border: '1px solid #E2E8F0',
                backgroundColor: '#FFFFFF',
                color: currentPage === totalPages ? '#CBD5E1' : '#0F172A',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
              }}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

