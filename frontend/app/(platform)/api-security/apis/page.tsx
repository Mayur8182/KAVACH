'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Network,
  Plus,
  Search,
  Filter,
  FileCode,
  ShieldCheck,
  Play,
  Trash2,
  ExternalLink,
  ChevronRight,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { KavachApiLayout } from '../components/KavachApiLayout';
import { AddApiModal } from '../components/AddApiModal';
import { useApiSecurity } from '../context/ApiSecurityContext';
import { api } from '@/lib/api/client';

export default function ApiInventoryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { apis, refreshApis, isAddModalOpen, setIsAddModalOpen, setSelectedApi } = useApiSecurity();

  const [activeTab, setActiveTab] = useState<'all' | 'environments'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [environmentFilter, setEnvironmentFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  // Auto-open modal if URL has ?add=true
  useEffect(() => {
    if (searchParams.get('add') === 'true') {
      setIsAddModalOpen(true);
    }
  }, [searchParams, setIsAddModalOpen]);

  const handleDeleteApi = async (e: React.MouseEvent, apiId: string) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this API target and its associated endpoints and findings?')) {
      return;
    }
    setIsDeletingId(apiId);
    try {
      await api.apiSecurity.deleteApi(apiId);
      await refreshApis();
    } catch (err) {
      console.error('Failed to delete API:', err);
      alert('Failed to delete API target');
    } finally {
      setIsDeletingId(null);
    }
  };

  const filteredApis = apis.filter((item) => {
    const matchesSearch =
      searchTerm === '' ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.base_url.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesEnv =
      environmentFilter === 'ALL' || item.environment === environmentFilter;

    const matchesStatus =
      statusFilter === 'ALL' || (item.status || 'ACTIVE') === statusFilter;

    return matchesSearch && matchesEnv && matchesStatus;
  });

  return (
    <KavachApiLayout
      headerAction={
        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: '#2563EB',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '6px',
            padding: '6px 14px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <Plus size={16} strokeWidth={2.5} />
          <span>Add API</span>
        </button>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Title Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
              API Inventory
            </h1>
            <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
              Manage all connected APIs and their endpoints.
            </p>
          </div>
        </div>

        {/* Subnav Tabs */}
        <div
          className="kavach-tabs-scrollable"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
            borderBottom: '1px solid #E2E8F0',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            style={{
              padding: '10px 4px',
              fontSize: '13px',
              fontWeight: activeTab === 'all' ? 600 : 500,
              color: activeTab === 'all' ? '#2563EB' : '#64748B',
              borderBottom: activeTab === 'all' ? '2px solid #2563EB' : '2px solid transparent',
              background: 'none',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer',
            }}
          >
            All APIs ({apis.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('environments')}
            style={{
              padding: '10px 4px',
              fontSize: '13px',
              fontWeight: activeTab === 'environments' ? 600 : 500,
              color: activeTab === 'environments' ? '#2563EB' : '#64748B',
              borderBottom: activeTab === 'environments' ? '2px solid #2563EB' : '2px solid transparent',
              background: 'none',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer',
            }}
          >
            Environments
          </button>
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
          {/* Search Input */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '320px',
              minWidth: '180px',
              flex: '1 1 200px',
            }}
          >
            <Search
              size={15}
              color="#94A3B8"
              style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search APIs..."
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

          {/* Dropdown Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <select
              value={environmentFilter}
              onChange={(e) => setEnvironmentFilter(e.target.value)}
              style={{
                padding: '8px 12px',
                fontSize: '13px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#334155',
              }}
            >
              <option value="ALL">All Environments</option>
              <option value="PRODUCTION">Production</option>
              <option value="STAGING">Staging</option>
              <option value="DEVELOPMENT">Development</option>
            </select>

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
              <option value="ACTIVE">Active</option>
              <option value="READY">Ready</option>
              <option value="SCANNING">Scanning</option>
            </select>
          </div>
        </div>

        {/* Content Table or Empty State */}
        {filteredApis.length === 0 ? (
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
              No APIs in Inventory
            </h3>
            <p style={{ fontSize: '13px', color: '#64748B', margin: '6px 0 20px 0', maxWidth: '420px', lineHeight: 1.5 }}>
              Discover APIs automatically by analyzing your source code repositories, or add an API target manually.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <Link
                href="/api-security/discovery"
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
                  boxShadow: '0 1px 3px rgba(37,99,235,0.2)',
                }}
              >
                <span>Start Repository Discovery</span>
              </Link>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: '#FFFFFF',
                  color: '#475569',
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Plus size={15} strokeWidth={2.5} />
                <span>Add API Manually</span>
              </button>
            </div>
          </div>
        ) : (
          <div
            className="kavach-table-responsive"
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '10px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  <th style={{ padding: '12px 18px', fontSize: '12px', fontWeight: 600, color: '#64748B' }}>NAME</th>
                  <th style={{ padding: '12px 18px', fontSize: '12px', fontWeight: 600, color: '#64748B' }}>BASE URL</th>
                  <th style={{ padding: '12px 18px', fontSize: '12px', fontWeight: 600, color: '#64748B' }}>ENDPOINTS</th>
                  <th style={{ padding: '12px 18px', fontSize: '12px', fontWeight: 600, color: '#64748B' }}>ENVIRONMENT</th>
                  <th style={{ padding: '12px 18px', fontSize: '12px', fontWeight: 600, color: '#64748B' }}>LAST ANALYZED</th>
                  <th style={{ padding: '12px 18px', fontSize: '12px', fontWeight: 600, color: '#64748B' }}>STATUS</th>
                  <th style={{ padding: '12px 18px', fontSize: '12px', fontWeight: 600, color: '#64748B', textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredApis.map((item) => {
                  return (
                    <tr
                      key={item.id}
                      onClick={() => {
                        setSelectedApi(item);
                        router.push(`/api-security/apis/${item.id}`);
                      }}
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                        cursor: 'pointer',
                        transition: 'background-color 0.15s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                    >
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '6px',
                              backgroundColor: '#EFF6FF',
                              color: '#2563EB',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Network size={15} />
                          </div>
                          <div>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                              {item.name}
                            </span>
                            <span style={{ fontSize: '11px', color: '#64748B', marginLeft: '6px' }}>
                              v{item.version || '1.0'}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '14px 18px', fontSize: '13px', color: '#475569', fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}>
                        {item.base_url}
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '9999px',
                            backgroundColor: '#F1F5F9',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: '#334155',
                          }}
                        >
                          {item.endpoints_count || 0} endpoints
                        </span>
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 600,
                            backgroundColor: item.environment === 'PRODUCTION' ? '#FEF3C7' : '#EFF6FF',
                            color: item.environment === 'PRODUCTION' ? '#92400E' : '#1E40AF',
                          }}
                        >
                          {item.environment}
                        </span>
                      </td>

                      <td style={{ padding: '14px 18px', fontSize: '12px', color: '#64748B' }}>
                        {item.last_analyzed_at ? new Date(item.last_analyzed_at).toLocaleString() : 'Never'}
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: '#10B981',
                          }}
                        >
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981' }} />
                          {item.status || 'Active'}
                        </span>
                      </td>

                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                          <Link
                            href={`/api-security/analysis?apiId=${item.id}`}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '5px 10px',
                              borderRadius: '5px',
                              backgroundColor: '#EFF6FF',
                              color: '#2563EB',
                              fontSize: '12px',
                              fontWeight: 600,
                              textDecoration: 'none',
                            }}
                          >
                            <Play size={12} fill="#2563EB" />
                            <span>Scan</span>
                          </Link>

                          <button
                            type="button"
                            onClick={(e) => handleDeleteApi(e, item.id)}
                            disabled={isDeletingId === item.id}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#94A3B8',
                              cursor: 'pointer',
                              padding: '4px',
                            }}
                          >
                            {isDeletingId === item.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AddApiModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={(newApi) => {
          router.push(`/api-security/apis/${newApi.id}`);
        }}
      />
    </KavachApiLayout>
  );
}
