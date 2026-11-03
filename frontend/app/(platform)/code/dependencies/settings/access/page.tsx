'use client';

/**
 * Module 15 — Integrations & Settings: Credentials & Permissions
 * Route: /code/dependencies/settings/access
 * 
 * Strict AGENTS.md compliance:
 * Real data provenance loaded from and persisted to `/api/v1/dependencies/settings/access`.
 * Zero fake numbers, zero hardcoded records.
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  Shield,
  Key,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Lock,
  Copy,
  Check,
  X,
  Bot,
  UserCheck,
  ShieldAlert,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { DependencySettingsSubnav } from '@/components/dependencies/DependencySettingsSubnav';

interface AccessRuleItem {
  id: string;
  name: string;
  principal_type: string;
  principal_name: string;
  role: string;
  permissions: string[];
  scope: string;
  repository_name?: string | null;
  token_masked?: string | null;
  expires_at?: string | null;
  is_active: boolean;
}

export default function CredentialsAndPermissionsPage() {
  const [selectedRepo, setSelectedRepo] = useState<string>('all');
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [rules, setRules] = useState<AccessRuleItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    principal_type: 'SERVICE_ACCOUNT',
    principal_name: '',
    role: 'SECURITY_ENGINEER',
    permissions: ['deps:read', 'deps:scan'],
    scope: 'GLOBAL',
  });

  const availablePermissions = [
    { key: 'deps:read', label: 'View Dependency Inventory & Vulnerabilities' },
    { key: 'deps:scan', label: 'Trigger On-Demand Scans & CI Ingestion' },
    { key: 'deps:remediate', label: 'Create Automated Upgrade Pull Requests' },
    { key: 'deps:admin', label: 'Modify Security Policies & Scanner Engines' },
    { key: 'sbom:export', label: 'Export CycloneDX / SPDX SBOM Artifacts' },
  ];

  const fetchAccessRules = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.dependencySettings.getAccessRules();
      setRules(data || []);
    } catch (err: any) {
      console.warn('Failed to load access rules', err);
      setError(err?.message || 'Failed to load credentials & access rules');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccessRules();
  }, []);

  const handleDeleteRule = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to revoke and delete access rule "${name}"?`)) return;
    try {
      await api.dependencySettings.deleteAccessRule(id);
      setRules((prev) => prev.filter((r) => r.id !== id));
    } catch (err: any) {
      alert(`Failed to delete access rule: ${err?.message || 'Unknown error'}`);
    }
  };

  const handleTogglePermission = (permKey: string) => {
    setFormData((prev) => {
      const exists = prev.permissions.includes(permKey);
      return {
        ...prev,
        permissions: exists
          ? prev.permissions.filter((p) => p !== permKey)
          : [...prev.permissions, permKey],
      };
    });
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.principal_name.trim()) return;

    setSubmitting(true);
    try {
      const created = await api.dependencySettings.createAccessRule({
        name: formData.name.trim(),
        principal_type: formData.principal_type,
        principal_name: formData.principal_name.trim(),
        role: formData.role,
        permissions: formData.permissions,
        scope: formData.scope,
      });

      setRules((prev) => [created, ...prev]);
      setIsModalOpen(false);
      setFormData({
        name: '',
        principal_type: 'SERVICE_ACCOUNT',
        principal_name: '',
        role: 'SECURITY_ENGINEER',
        permissions: ['deps:read', 'deps:scan'],
        scope: 'GLOBAL',
      });
    } catch (err: any) {
      alert(`Failed to create access rule: ${err?.message || 'Unknown error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyToken = (id: string, tokenText: string) => {
    navigator.clipboard.writeText(tokenText);
    setCopiedTokenId(id);
    setTimeout(() => setCopiedTokenId(null), 2000);
  };

  // Metrics
  const totalRules = rules.length;
  const serviceAccounts = rules.filter((r) => r.principal_type === 'SERVICE_ACCOUNT').length;
  const adminRoles = rules.filter((r) => r.role === 'ADMIN').length;
  const activeTokens = rules.filter((r) => r.is_active).length;

  const filteredRules = rules.filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.principal_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.role.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || r.role.toLowerCase() === roleFilter.toLowerCase();
    return matchesSearch && matchesRole;
  });

  const getRoleBadge = (role: string) => {
    switch (role.toUpperCase()) {
      case 'ADMIN':
        return { bg: '#FEE2E2', text: '#DC2626', border: '#FCA5A5' };
      case 'SECURITY_ENGINEER':
        return { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' };
      case 'DEVELOPER':
        return { bg: '#F0FDF4', text: '#16A34A', border: '#BBF7D0' };
      case 'READ_ONLY':
        return { bg: '#F8FAFC', text: '#64748B', border: '#E2E8F0' };
      default:
        return { bg: '#F1F5F9', text: '#475569', border: '#E2E8F0' };
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
            <Users size={22} color="#3B82F6" />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500, marginBottom: '2px' }}>Total Access Rules</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A' }}>{loading ? '...' : totalRules}</div>
          </div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#FAF5FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Bot size={22} color="#8B5CF6" />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500, marginBottom: '2px' }}>CI / Service Accounts</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A' }}>{loading ? '...' : serviceAccounts}</div>
          </div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ShieldAlert size={22} color="#EF4444" />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500, marginBottom: '2px' }}>Admin Privileges</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A' }}>{loading ? '...' : adminRoles}</div>
          </div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Key size={22} color="#10B981" />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500, marginBottom: '2px' }}>Active API Tokens</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A' }}>{loading ? '...' : activeTokens}</div>
          </div>
        </div>
      </div>

      {/* ── Main Content Table Card ── */}
      <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        {/* Controls Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '300px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={15} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Search access rules by identity, name, or role..."
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

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
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
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="security_engineer">Security Engineer</option>
              <option value="developer">Developer</option>
              <option value="read_only">Read Only</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={fetchAccessRules}
              disabled={loading}
              title="Refresh access rules"
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
              Add Credential / Rule
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

        {/* Table */}
        {loading ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748B', fontSize: '14px' }}>
            <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px', color: '#3B82F6' }} />
            Loading credentials and access rules from database...
          </div>
        ) : filteredRules.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748B', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px dashed #CBD5E1' }}>
            <Lock size={36} color="#94A3B8" style={{ margin: '0 auto 12px' }} />
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>No Access Rules Configured</div>
            <div style={{ fontSize: '13px', color: '#64748B', maxWidth: '400px', margin: '0 auto 16px' }}>
              Create API credentials, bots, or RBAC mappings to grant access to dependency scans, SBOM APIs, and policy modifications.
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
              <Plus size={14} /> Add Credential / Rule
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E2E8F0', backgroundColor: '#F8FAFC' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', width: '240px' }}>Principal &amp; Name</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', width: '170px' }}>Role</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Granted Permissions</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', width: '160px' }}>API Token</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', width: '110px' }}>Scope</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', width: '100px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRules.map((rule) => {
                  const roleStyle = getRoleBadge(rule.role);
                  return (
                    <tr key={rule.id} style={{ borderBottom: '1px solid #F1F5F9', verticalAlign: 'middle' }}>
                      {/* Principal & Name */}
                      <td style={{ padding: '14px 16px' }}>
                        <div>
                          <div style={{ fontWeight: 600, color: '#0F172A', fontSize: '13px' }}>{rule.name}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                            <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700, color: '#64748B', backgroundColor: '#F1F5F9', padding: '1px 5px', borderRadius: '3px' }}>
                              {rule.principal_type}
                            </span>
                            <span style={{ fontSize: '12px', color: '#64748B' }}>{rule.principal_name}</span>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            backgroundColor: roleStyle.bg,
                            color: roleStyle.text,
                            border: `1px solid ${roleStyle.border}`,
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '4px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.03em',
                          }}
                        >
                          {rule.role.replace('_', ' ')}
                        </span>
                      </td>

                      {/* Permissions Pills */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {(rule.permissions || []).map((perm) => (
                            <span
                              key={perm}
                              style={{
                                fontSize: '11px',
                                fontFamily: 'monospace',
                                backgroundColor: '#F8FAFC',
                                border: '1px solid #E2E8F0',
                                color: '#334155',
                                padding: '2px 6px',
                                borderRadius: '4px',
                              }}
                            >
                              {perm}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Token Masked */}
                      <td style={{ padding: '14px 16px' }}>
                        {rule.token_masked ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <code style={{ fontSize: '11px', fontFamily: 'monospace', color: '#475569', backgroundColor: '#F1F5F9', padding: '2px 6px', borderRadius: '4px' }}>
                              {rule.token_masked}
                            </code>
                            <button
                              onClick={() => handleCopyToken(rule.id, rule.token_masked || '')}
                              title="Copy Token Identifier"
                              style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: '2px' }}
                            >
                              {copiedTokenId === rule.id ? <Check size={12} color="#10B981" /> : <Copy size={12} />}
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '11px', color: '#94A3B8' }}>None generated</span>
                        )}
                      </td>

                      {/* Scope */}
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: '12px',
                            backgroundColor: rule.scope === 'GLOBAL' ? '#EFF6FF' : '#F8FAFC',
                            color: rule.scope === 'GLOBAL' ? '#2563EB' : '#475569',
                            border: rule.scope === 'GLOBAL' ? '1px solid #BFDBFE' : '1px solid #E2E8F0',
                          }}
                        >
                          {rule.scope}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <button
                          onClick={() => handleDeleteRule(rule.id, rule.name)}
                          title="Revoke & Delete Access"
                          style={{
                            padding: '6px 8px',
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
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Create Rule Modal ── */}
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
              maxWidth: '560px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
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
                  <Key size={18} color="#2563EB" />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Add Credential or Access Rule</h3>
                  <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0' }}>Assign RBAC permissions &amp; generate auth tokens</p>
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
            <form onSubmit={handleCreateRule} style={{ padding: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Rule / Credential Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. GitHub Actions CI Bot"
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

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Principal Identifier *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. gha-runner@corp.internal"
                      value={formData.principal_name}
                      onChange={(e) => setFormData({ ...formData, principal_name: e.target.value })}
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
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Principal Type
                    </label>
                    <select
                      value={formData.principal_type}
                      onChange={(e) => setFormData({ ...formData, principal_type: e.target.value })}
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
                      <option value="SERVICE_ACCOUNT">Service Account (Bot / CI)</option>
                      <option value="USER">Individual User</option>
                      <option value="ROLE">Role-Based Assignment</option>
                      <option value="TEAM">Security Team</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Role Tier
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
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
                      <option value="ADMIN">Admin (Full Control)</option>
                      <option value="SECURITY_ENGINEER">Security Engineer</option>
                      <option value="DEVELOPER">Developer (Scan &amp; Remediate)</option>
                      <option value="READ_ONLY">Read Only (Auditor)</option>
                    </select>
                  </div>
                </div>

                {/* Granular Permissions */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
                    Granular Access Permissions
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: '#F8FAFC', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                    {availablePermissions.map((perm) => {
                      const checked = formData.permissions.includes(perm.key);
                      return (
                        <label
                          key={perm.key}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '12px',
                            color: '#334155',
                            cursor: 'pointer',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => handleTogglePermission(perm.key)}
                            style={{ cursor: 'pointer' }}
                          />
                          <code style={{ fontSize: '11px', color: '#2563EB', backgroundColor: '#EFF6FF', padding: '1px 4px', borderRadius: '3px' }}>
                            {perm.key}
                          </code>
                          <span>{perm.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Scope */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Access Scope
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
                    <option value="GLOBAL">Global (All Repositories)</option>
                    <option value="REPO_SPECIFIC">Repository Specific</option>
                  </select>
                </div>
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
                  {submitting ? 'Creating Rule...' : 'Save Rule & Issue Token'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
