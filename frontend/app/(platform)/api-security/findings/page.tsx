'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ShieldAlert,
  Search,
  Filter,
  Download,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  Tag,
  ArrowRight,
  Loader2,
  Trash2,
} from 'lucide-react';
import { KavachApiLayout } from '../components/KavachApiLayout';
import { useApiSecurity } from '../context/ApiSecurityContext';
import { api } from '@/lib/api/client';

export default function FindingsHubPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const scanId = searchParams.get('scanId');
  const endpointParam = searchParams.get('endpoint');

  const { apis, selectedApi } = useApiSecurity();
  const [findings, setFindings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<'all' | 'category' | 'endpoint' | 'status'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [endpointFilter, setEndpointFilter] = useState<string | null>(endpointParam);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    if (endpointParam) {
      setEndpointFilter(endpointParam);
    }
  }, [endpointParam]);

  const fetchFindings = async () => {
    setIsLoading(true);
    try {
      const res = await api.apiSecurity.findings({
        apiId: selectedApi?.id,
        category: categoryFilter !== 'ALL' ? categoryFilter : undefined,
        severity: severityFilter !== 'ALL' ? severityFilter : undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        search: searchTerm || undefined,
      });
      let items = res.items || [];
      if (endpointFilter) {
        items = items.filter(
          (f) =>
            f.target_endpoint === endpointFilter ||
            (Array.isArray(f.affected_endpoints) && f.affected_endpoints.includes(endpointFilter))
        );
      }
      setFindings(items);
    } catch (err) {
      console.error('Failed to load findings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFindings();
  }, [selectedApi?.id, categoryFilter, severityFilter, statusFilter, searchTerm, endpointFilter]);

  const handleExport = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(findings, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `kavach_api_findings_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const getSeverityBadge = (sev: string) => {
    const s = (sev || 'LOW').toUpperCase();
    if (s === 'CRITICAL') {
      return { bg: '#FEF2F2', text: '#991B1B', border: '#FECACA' };
    }
    if (s === 'HIGH') {
      return { bg: '#FFF7ED', text: '#C2410C', border: '#FED7AA' };
    }
    if (s === 'MEDIUM') {
      return { bg: '#FEFCE8', text: '#854D0E', border: '#FEF08A' };
    }
    return { bg: '#EFF6FF', text: '#1E40AF', border: '#BFDBFE' };
  };

  return (
    <KavachApiLayout
      activeApiId={selectedApi?.id}
      headerAction={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={handleExport}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#FFFFFF',
              color: '#334155',
              border: '1px solid #CBD5E1',
              borderRadius: '6px',
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Download size={13} />
            <span>Export</span>
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Title */}
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
            Security Findings
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
            Unified view of all discovered API vulnerabilities, policy violations, and risk items.
          </p>
        </div>

        {/* Subnav Tabs */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
            borderBottom: '1px solid #E2E8F0',
          }}
        >
          {[
            { id: 'all', label: `All Findings (${findings.length})` },
            { id: 'category', label: 'By Category' },
            { id: 'endpoint', label: 'By Endpoint' },
            { id: 'status', label: 'By Status' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                padding: '10px 4px',
                fontSize: '13px',
                fontWeight: activeTab === tab.id ? 600 : 500,
                color: activeTab === tab.id ? '#2563EB' : '#64748B',
                borderBottom: activeTab === tab.id ? '2px solid #2563EB' : '2px solid transparent',
                background: 'none',
                borderTop: 'none',
                borderLeft: 'none',
                borderRight: 'none',
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Filter Controls Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          {/* Search Bar */}
          <div style={{ position: 'relative', width: '320px' }}>
            <Search
              size={15}
              color="#94A3B8"
              style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search findings..."
              style={{
                width: '100%',
                padding: '8px 12px 8px 32px',
                fontSize: '13px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{
                padding: '8px 12px',
                fontSize: '13px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#334155',
              }}
            >
              <option value="ALL">All Categories</option>
              <option value="Authorization Testing">Authorization Testing (BOLA)</option>
              <option value="Authentication Testing">Authentication Testing</option>
              <option value="Rate Limiting & Abuse">Rate Limiting & Abuse</option>
              <option value="Injection Testing">Injection Testing</option>
              <option value="Data Exposure">Data Exposure</option>
            </select>

            {/* Severity Filter */}
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              style={{
                padding: '8px 12px',
                fontSize: '13px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#334155',
              }}
            >
              <option value="ALL">All Severity</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: '8px 12px',
                fontSize: '13px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#334155',
              }}
            >
              <option value="ALL">All Status</option>
              <option value="OPEN">Open</option>
              <option value="RESOLVED">Resolved</option>
              <option value="VERIFIED_FIXED">Verified Fixed</option>
              <option value="FALSE_POSITIVE">False Positive</option>
              <option value="ACCEPTED_RISK">Accepted Risk</option>
            </select>
          </div>
        </div>

        {/* Active Endpoint Filter Indicator */}
        {endpointFilter && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', backgroundColor: '#EFF6FF', borderRadius: '6px', border: '1px solid #BFDBFE', width: 'fit-content' }}>
            <span style={{ fontSize: '12px', color: '#1E40AF', fontWeight: 600 }}>
              Filtered by Endpoint: <code style={{ fontFamily: 'monospace' }}>{endpointFilter}</code>
            </span>
            <button
              type="button"
              onClick={() => setEndpointFilter(null)}
              style={{ background: 'none', border: 'none', color: '#2563EB', cursor: 'pointer', fontSize: '12px', fontWeight: 700, padding: '0 4px' }}
            >
              ✕ Clear Filter
            </button>
          </div>
        )}

        {/* Content Table or Empty State */}
        {isLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 0', color: '#64748B' }}>
            <Loader2 size={24} className="animate-spin" />
            <span style={{ marginLeft: '10px', fontSize: '14px' }}>Loading findings...</span>
          </div>
        ) : findings.length === 0 ? (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '10px',
              padding: '64px 24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '10px',
                backgroundColor: '#F1F5F9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748B',
                marginBottom: '16px',
              }}
            >
              <FileCode size={24} />
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0F172A', margin: 0 }}>
              No findings yet
            </h3>
            <p style={{ fontSize: '13px', color: '#64748B', margin: '6px 0 20px 0', maxWidth: '380px' }}>
              Run a security analysis to see security findings.
            </p>
            <Link
              href="/api-security/analysis"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#2563EB',
                color: '#FFFFFF',
                borderRadius: '6px',
                padding: '8px 18px',
                fontSize: '13px',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              <span>Run Security Analysis</span>
            </Link>
          </div>
        ) : (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '10px',
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  <th style={{ padding: '12px 18px', fontSize: '12px', fontWeight: 600, color: '#64748B' }}>TITLE</th>
                  <th style={{ padding: '12px 18px', fontSize: '12px', fontWeight: 600, color: '#64748B' }}>CATEGORY</th>
                  <th style={{ padding: '12px 18px', fontSize: '12px', fontWeight: 600, color: '#64748B' }}>AFFECTED ENDPOINTS</th>
                  <th style={{ padding: '12px 18px', fontSize: '12px', fontWeight: 600, color: '#64748B' }}>SEVERITY</th>
                  <th style={{ padding: '12px 18px', fontSize: '12px', fontWeight: 600, color: '#64748B' }}>STATUS</th>
                  <th style={{ padding: '12px 18px', fontSize: '12px', fontWeight: 600, color: '#64748B', textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {findings.map((f) => {
                  const sBadge = getSeverityBadge(f.severity);
                  return (
                    <tr
                      key={f.id}
                      onClick={() => router.push(`/api-security/findings/${f.id}`)}
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                        cursor: 'pointer',
                        transition: 'background-color 0.15s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                    >
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <ShieldAlert size={16} color={sBadge.text} />
                          <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                            {f.title}
                          </span>
                        </div>
                      </td>

                      <td style={{ padding: '14px 18px', fontSize: '13px', color: '#475569' }}>
                        {f.category}
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '9999px',
                            backgroundColor: '#F1F5F9',
                            fontSize: '12px',
                            color: '#334155',
                            fontWeight: 500,
                          }}
                        >
                          {f.affected_endpoints?.length || 1} endpoint
                        </span>
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 700,
                            backgroundColor: sBadge.bg,
                            color: sBadge.text,
                            border: `1px solid ${sBadge.border}`,
                          }}
                        >
                          {f.severity}
                        </span>
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '9999px',
                            fontSize: '11px',
                            fontWeight: 700,
                            backgroundColor:
                              f.status === 'VERIFIED_FIXED'
                                ? '#ECFDF5'
                                : f.status === 'RESOLVED'
                                ? '#EFF6FF'
                                : '#FEF3C7',
                            color:
                              f.status === 'VERIFIED_FIXED'
                                ? '#065F46'
                                : f.status === 'RESOLVED'
                                ? '#1D4ED8'
                                : '#92400E',
                            border: `1px solid ${
                              f.status === 'VERIFIED_FIXED'
                                ? '#A7F3D0'
                                : f.status === 'RESOLVED'
                                ? '#BFDBFE'
                                : '#FDE68A'
                            }`,
                          }}
                        >
                          {f.status === 'VERIFIED_FIXED'
                            ? 'VERIFIED FIXED'
                            : f.status || 'OPEN'}
                        </span>
                      </td>

                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <Link
                          href={`/api-security/findings/${f.id}`}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '5px 10px',
                            borderRadius: '5px',
                            backgroundColor: '#F8FAFC',
                            border: '1px solid #E2E8F0',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: '#2563EB',
                            textDecoration: 'none',
                          }}
                        >
                          <span>Inspect</span>
                          <ArrowRight size={12} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </KavachApiLayout>
  );
}
