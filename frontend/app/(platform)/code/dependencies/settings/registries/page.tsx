'use client';

/**
 * Module 15 — Integrations & Settings: Registry Integrations
 * Route: /code/dependencies/settings/registries
 * 
 * Strict AGENTS.md compliance:
 * Real data provenance loaded from and persisted to `/api/v1/dependencies/settings/registries`.
 * Zero fake numbers, zero hardcoded records.
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Database,
  Plus,
  RefreshCw,
  Search,
  ExternalLink,
  Shield,
  Key,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Power,
  Activity,
  Layers,
  X,
  Server,
  Zap,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { DependencySettingsSubnav } from '@/components/dependencies/DependencySettingsSubnav';

interface RegistryItem {
  id: string;
  name: string;
  registry_type: string;
  url: string;
  auth_type: string;
  credentials_masked: string;
  scope: string;
  repository_name?: string | null;
  is_active: boolean;
  status: string;
  last_tested_at?: string | null;
}

export default function RegistryIntegrationsPage() {
  const [selectedRepo, setSelectedRepo] = useState<string>('all');
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [registries, setRegistries] = useState<RegistryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);

  // Testing status map: id -> { loading: boolean, result: any }
  const [testingStatus, setTestingStatus] = useState<Record<string, { loading: boolean; message?: string; success?: boolean; latency?: number }>>({});

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    name: '',
    registry_type: 'npm',
    url: '',
    auth_type: 'TOKEN',
    credentials: '',
    scope: 'GLOBAL',
  });

  const fetchRegistries = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.dependencySettings.getRegistries();
      setRegistries(data || []);
    } catch (err: any) {
      console.warn('Failed to load registries', err);
      setError(err?.message || 'Failed to load registry integrations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistries();
  }, []);

  const handleTestRegistry = async (id: string) => {
    setTestingStatus((prev) => ({ ...prev, [id]: { loading: true } }));
    try {
      const res = await api.dependencySettings.testRegistry(id);
      setTestingStatus((prev) => ({
        ...prev,
        [id]: {
          loading: false,
          success: res.success,
          message: res.message,
          latency: res.latency_ms,
        },
      }));
      // Update local registry status
      setRegistries((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: res.status, last_tested_at: new Date().toISOString() } : r))
      );
    } catch (err: any) {
      setTestingStatus((prev) => ({
        ...prev,
        [id]: {
          loading: false,
          success: false,
          message: err?.message || 'Connection test failed',
        },
      }));
    }
  };

  const handleToggleRegistry = async (id: string) => {
    try {
      const res = await api.dependencySettings.toggleRegistry(id);
      setRegistries((prev) =>
        prev.map((r) => (r.id === id ? { ...r, is_active: res.is_active } : r))
      );
    } catch (err: any) {
      alert(`Failed to toggle registry: ${err?.message || 'Unknown error'}`);
    }
  };

  const handleDeleteRegistry = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to disconnect and remove "${name}"?`)) return;
    try {
      await api.dependencySettings.deleteRegistry(id);
      setRegistries((prev) => prev.filter((r) => r.id !== id));
    } catch (err: any) {
      alert(`Failed to delete registry: ${err?.message || 'Unknown error'}`);
    }
  };

  const handleCreateRegistry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.url.trim()) return;

    setSubmitting(true);
    try {
      const created = await api.dependencySettings.createRegistry({
        name: formData.name.trim(),
        registry_type: formData.registry_type,
        url: formData.url.trim(),
        auth_type: formData.auth_type,
        credentials: formData.credentials.trim() || undefined,
        scope: formData.scope,
      });

      setRegistries((prev) => [created, ...prev]);
      setIsModalOpen(false);
      setFormData({
        name: '',
        registry_type: 'npm',
        url: '',
        auth_type: 'TOKEN',
        credentials: '',
        scope: 'GLOBAL',
      });
    } catch (err: any) {
      alert(`Failed to connect registry: ${err?.message || 'Unknown error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered registries
  const filteredRegistries = registries.filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.registry_type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === 'all' || r.registry_type.toLowerCase() === selectedType.toLowerCase();
    return matchesSearch && matchesType;
  });

  // Calculate summary stats
  const totalRegistries = registries.length;
  const connectedRegistries = registries.filter((r) => r.is_active && r.status === 'CONNECTED').length;
  const authProtectedCount = registries.filter((r) => r.auth_type !== 'NONE').length;
  const globalCount = registries.filter((r) => r.scope === 'GLOBAL').length;

  const getTypeBadge = (type: string) => {
    switch (type.toLowerCase()) {
      case 'npm':
        return { bg: '#FEE2E2', text: '#DC2626', label: 'npm' };
      case 'pypi':
      case 'python':
        return { bg: '#DBEAFE', text: '#2563EB', label: 'PyPI' };
      case 'maven':
      case 'java':
        return { bg: '#FEF3C7', text: '#D97706', label: 'Maven' };
      case 'go':
        return { bg: '#CFFAFE', text: '#0891B2', label: 'Go Proxy' };
      case 'docker':
      case 'oci':
        return { bg: '#E0F2FE', text: '#0284C7', label: 'Docker / OCI' };
      case 'ecr':
        return { bg: '#FFEDD5', text: '#EA580C', label: 'AWS ECR' };
      case 'github':
        return { bg: '#F1F5F9', text: '#334155', label: 'GitHub Pkg' };
      default:
        return { bg: '#F1F5F9', text: '#475569', label: type.toUpperCase() };
    }
  };

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1440px', margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* ── Subnav Component ── */}
      <DependencySettingsSubnav
        selectedRepo={selectedRepo}
        onSelectRepo={setSelectedRepo}
        selectedBranch={selectedBranch}
        onSelectBranch={setSelectedBranch}
      />

      {/* ── Top Metric Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Database size={22} color="#3B82F6" />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500, marginBottom: '2px' }}>Total Registries</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A' }}>{loading ? '...' : totalRegistries}</div>
          </div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <CheckCircle2 size={22} color="#10B981" />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500, marginBottom: '2px' }}>Connected &amp; Active</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A' }}>{loading ? '...' : connectedRegistries}</div>
          </div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#FAF5FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Key size={22} color="#8B5CF6" />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500, marginBottom: '2px' }}>Auth Protected</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A' }}>{loading ? '...' : authProtectedCount}</div>
          </div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#FFF7ED', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Layers size={22} color="#F97316" />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500, marginBottom: '2px' }}>Global Mirrors</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A' }}>{loading ? '...' : globalCount}</div>
          </div>
        </div>
      </div>

      {/* ── Main Content Card ── */}
      <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        {/* Controls Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '300px' }}>
            {/* Search */}
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={15} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Search registries by name, URL, or ecosystem..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 36px',
                  fontSize: '13px',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  outline: 'none',
                  color: '#0F172A',
                }}
              />
            </div>

            {/* Type Filter */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              style={{
                padding: '8px 12px',
                fontSize: '13px',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                backgroundColor: '#FFFFFF',
                color: '#334155',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="all">All Ecosystems</option>
              <option value="npm">npm</option>
              <option value="pypi">PyPI</option>
              <option value="maven">Maven</option>
              <option value="go">Go Modules</option>
              <option value="docker">Docker / OCI</option>
              <option value="ecr">AWS ECR</option>
              <option value="github">GitHub Packages</option>
            </select>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={fetchRegistries}
              disabled={loading}
              title="Refresh Registry Integrations"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 500,
                color: '#475569',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>

            <button
              onClick={() => setIsModalOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                backgroundColor: '#0F172A',
                border: '1px solid #0F172A',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#FFFFFF',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              }}
            >
              <Plus size={15} />
              Connect Registry
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div style={{ padding: '12px 16px', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px', color: '#991B1B', fontSize: '13px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {/* Registry Table */}
        {loading ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748B', fontSize: '14px' }}>
            <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px', color: '#3B82F6' }} />
            Loading registry integrations from database...
          </div>
        ) : filteredRegistries.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748B', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px dashed #CBD5E1' }}>
            <Database size={36} color="#94A3B8" style={{ margin: '0 auto 12px' }} />
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>No Registries Found</div>
            <div style={{ fontSize: '13px', color: '#64748B', maxWidth: '400px', margin: '0 auto 16px' }}>
              {searchQuery || selectedType !== 'all'
                ? 'No registries match your current search criteria.'
                : 'Connect private package mirrors, Artifactory, or secure registries to enable authenticated dependency ingestion.'}
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                backgroundColor: '#0F172A',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Plus size={14} /> Connect Registry
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E2E8F0', backgroundColor: '#F8FAFC' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', width: '260px' }}>Registry / Ecosystem</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Endpoint URL</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', width: '160px' }}>Authentication</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', width: '110px' }}>Scope</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', width: '130px' }}>Status</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', width: '220px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRegistries.map((reg) => {
                  const typeBadge = getTypeBadge(reg.registry_type);
                  const isTesting = testingStatus[reg.id]?.loading;
                  const testRes = testingStatus[reg.id];

                  return (
                    <tr key={reg.id} style={{ borderBottom: '1px solid #F1F5F9', verticalAlign: 'middle' }}>
                      {/* Name & Type */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span
                            style={{
                              backgroundColor: typeBadge.bg,
                              color: typeBadge.text,
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '4px',
                              letterSpacing: '0.02em',
                            }}
                          >
                            {typeBadge.label}
                          </span>
                          <div>
                            <div style={{ fontWeight: 600, color: '#0F172A', fontSize: '13px' }}>{reg.name}</div>
                            <div style={{ fontSize: '11px', color: '#64748B' }}>
                              {reg.repository_name ? `Scoped: ${reg.repository_name}` : 'Global Mirror'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* URL */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <code style={{ fontSize: '12px', color: '#334155', backgroundColor: '#F1F5F9', padding: '2px 6px', borderRadius: '4px', maxWidth: '340px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {reg.url}
                          </code>
                          <a href={reg.url} target="_blank" rel="noopener noreferrer" style={{ color: '#64748B', display: 'inline-flex' }}>
                            <ExternalLink size={12} />
                          </a>
                        </div>
                      </td>

                      {/* Auth Type */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 500, color: '#334155' }}>
                            {reg.auth_type}
                          </span>
                          {reg.credentials_masked && (
                            <span style={{ fontSize: '11px', color: '#94A3B8', fontFamily: 'monospace' }}>
                              ({reg.credentials_masked})
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Scope */}
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: '12px',
                            backgroundColor: reg.scope === 'GLOBAL' ? '#EFF6FF' : '#F8FAFC',
                            color: reg.scope === 'GLOBAL' ? '#2563EB' : '#475569',
                            border: reg.scope === 'GLOBAL' ? '1px solid #BFDBFE' : '1px solid #E2E8F0',
                          }}
                        >
                          {reg.scope}
                        </span>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px 16px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div
                              style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                backgroundColor: !reg.is_active ? '#94A3B8' : reg.status === 'CONNECTED' ? '#10B981' : '#EF4444',
                              }}
                            />
                            <span style={{ fontSize: '12px', fontWeight: 600, color: !reg.is_active ? '#64748B' : reg.status === 'CONNECTED' ? '#047857' : '#B91C1C' }}>
                              {!reg.is_active ? 'DISABLED' : reg.status}
                            </span>
                          </div>
                          {reg.last_tested_at && (
                            <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '2px' }}>
                              Tested {new Date(reg.last_tested_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                          {/* Test Button */}
                          <button
                            onClick={() => handleTestRegistry(reg.id)}
                            disabled={isTesting || !reg.is_active}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '5px 10px',
                              backgroundColor: '#F8FAFC',
                              border: '1px solid #E2E8F0',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: 500,
                              color: !reg.is_active ? '#94A3B8' : '#334155',
                              cursor: isTesting || !reg.is_active ? 'not-allowed' : 'pointer',
                            }}
                          >
                            <Zap size={12} color={isTesting ? '#3B82F6' : '#64748B'} className={isTesting ? 'animate-spin' : ''} />
                            {isTesting ? 'Pinging...' : 'Test'}
                          </button>

                          {/* Toggle Active */}
                          <button
                            onClick={() => handleToggleRegistry(reg.id)}
                            title={reg.is_active ? 'Disable Registry' : 'Enable Registry'}
                            style={{
                              padding: '5px 8px',
                              backgroundColor: reg.is_active ? '#ECFDF5' : '#F1F5F9',
                              border: '1px solid',
                              borderColor: reg.is_active ? '#A7F3D0' : '#CBD5E1',
                              borderRadius: '6px',
                              color: reg.is_active ? '#059669' : '#64748B',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                            }}
                          >
                            <Power size={13} />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDeleteRegistry(reg.id, reg.name)}
                            title="Disconnect and Delete"
                            style={{
                              padding: '5px 8px',
                              backgroundColor: '#FFF1F2',
                              border: '1px solid #FECDD3',
                              borderRadius: '6px',
                              color: '#E11D48',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>

                        {/* Test Status feedback tooltip/inline */}
                        {testRes && !testRes.loading && (
                          <div
                            style={{
                              fontSize: '11px',
                              color: testRes.success ? '#047857' : '#B91C1C',
                              marginTop: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'flex-end',
                              gap: '4px',
                            }}
                          >
                            {testRes.success ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />}
                            {testRes.message} {testRes.latency ? `(${testRes.latency}ms)` : ''}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Connect Registry Modal ── */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(2px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '540px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
              overflow: 'hidden',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Database size={18} color="#2563EB" />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Connect Package Registry</h3>
                  <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0' }}>Configure secure mirror or internal repository</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateRegistry} style={{ padding: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Registry Ecosystem */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Registry Ecosystem *
                  </label>
                  <select
                    value={formData.registry_type}
                    onChange={(e) => {
                      const type = e.target.value;
                      let defaultUrl = '';
                      if (type === 'npm') defaultUrl = 'https://registry.npmjs.org';
                      else if (type === 'pypi') defaultUrl = 'https://pypi.org/simple';
                      else if (type === 'maven') defaultUrl = 'https://repo.maven.apache.org/maven2';
                      else if (type === 'go') defaultUrl = 'https://proxy.golang.org';
                      else if (type === 'docker') defaultUrl = 'https://registry-1.docker.io';
                      setFormData({ ...formData, registry_type: type, url: defaultUrl });
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      fontSize: '13px',
                      border: '1px solid #CBD5E1',
                      borderRadius: '8px',
                      backgroundColor: '#FFFFFF',
                      color: '#0F172A',
                      outline: 'none',
                    }}
                  >
                    <option value="npm">npm (Node.js)</option>
                    <option value="pypi">PyPI (Python)</option>
                    <option value="maven">Maven Central / Nexus (Java)</option>
                    <option value="go">Go Module Proxy (Golang)</option>
                    <option value="docker">Docker Hub / OCI Container</option>
                    <option value="ecr">AWS Elastic Container Registry (ECR)</option>
                    <option value="github">GitHub Packages</option>
                  </select>
                </div>

                {/* Friendly Name */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Integration Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Corporate Artifactory Mirror, Private PyPI"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      fontSize: '13px',
                      border: '1px solid #CBD5E1',
                      borderRadius: '8px',
                      color: '#0F172A',
                      outline: 'none',
                    }}
                  />
                </div>

                {/* Registry URL */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Registry Endpoint URL *
                  </label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      fontSize: '13px',
                      border: '1px solid #CBD5E1',
                      borderRadius: '8px',
                      color: '#0F172A',
                      outline: 'none',
                    }}
                  />
                </div>

                {/* Auth Type & Scope Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Authentication Type
                    </label>
                    <select
                      value={formData.auth_type}
                      onChange={(e) => setFormData({ ...formData, auth_type: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        fontSize: '13px',
                        border: '1px solid #CBD5E1',
                        borderRadius: '8px',
                        backgroundColor: '#FFFFFF',
                        color: '#0F172A',
                        outline: 'none',
                      }}
                    >
                      <option value="TOKEN">Bearer / API Token</option>
                      <option value="BASIC">Basic Auth (User/Pass)</option>
                      <option value="IAM">AWS IAM Role</option>
                      <option value="NONE">Anonymous / None</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Scope
                    </label>
                    <select
                      value={formData.scope}
                      onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        fontSize: '13px',
                        border: '1px solid #CBD5E1',
                        borderRadius: '8px',
                        backgroundColor: '#FFFFFF',
                        color: '#0F172A',
                        outline: 'none',
                      }}
                    >
                      <option value="GLOBAL">Global (All Repos)</option>
                      <option value="REPO_SPECIFIC">Repository Specific</option>
                    </select>
                  </div>
                </div>

                {/* Credentials / Token Input */}
                {formData.auth_type !== 'NONE' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      {formData.auth_type === 'TOKEN' ? 'Access Token / Secret' : 'Credentials'}
                    </label>
                    <input
                      type="password"
                      placeholder="Paste secret token or credentials..."
                      value={formData.credentials}
                      onChange={(e) => setFormData({ ...formData, credentials: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        fontSize: '13px',
                        border: '1px solid #CBD5E1',
                        borderRadius: '8px',
                        color: '#0F172A',
                        outline: 'none',
                      }}
                    />
                    <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
                      Credentials are encrypted at rest and never returned unmasked in API responses.
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div
                style={{
                  marginTop: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '12px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#F1F5F9',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: '#475569',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '8px 20px',
                    backgroundColor: '#0F172A',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#FFFFFF',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {submitting ? 'Connecting...' : 'Save & Connect'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
