'use client';

/**
 * Thing Protect — Runtime Protection Page (/protect/runtime)
 * Registry of protected services, apps, containers, and proxies.
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Layers,
  Search,
  Filter,
  RefreshCw,
  Server,
  Activity,
  ChevronRight,
} from 'lucide-react';
import { ProtectWorkshell } from '@/components/protect/ProtectWorkshell';
import {
  ProtectionStateBadge,
  EmptyProtectState,
} from '@/components/protect/ProtectComponents';
import { api } from '@/lib/api/client';

export default function RuntimeProtectionPage() {
  const [runtimes, setRuntimes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const fetchRuntimes = async () => {
    try {
      setLoading(true);
      const data: any = await api.protect.runtimes();
      const list = Array.isArray(data) ? data : data?.items || [];
      setRuntimes(list);
    } catch (err) {
      console.error('Failed to fetch runtime targets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRuntimes();
  }, []);

  const safeRuntimes = Array.isArray(runtimes) ? runtimes : [];
  const filtered = safeRuntimes.filter((r) => {
    const rName = r.target_name || r.name || '';
    const rType = r.target_type || '';
    const rEnv = r.environment || r.environment_id || '';
    const rState = r.protection_state || '';
    const matchSearch =
      rName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rEnv.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = typeFilter === 'ALL' || rType === typeFilter;
    const matchStatus = statusFilter === 'ALL' || rState === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  const targetTypes = Array.from(new Set(safeRuntimes.map((r) => r.target_type).filter(Boolean)));

  return (
    <ProtectWorkshell>
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
              RUNTIME PROTECTION TARGETS
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '4px 0 0 0' }}>
              Active telemetry, eBPF sensors, container invariants, and MCP gateway monitors across environments.
            </p>
          </div>

          <button
            onClick={fetchRuntimes}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              fontSize: '11px',
              fontWeight: 600,
              background: 'var(--color-surface-elevated)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-text-primary)',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
            Sync Runtimes
          </button>
        </div>

        {/* Filter bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ position: 'relative', width: '280px' }}>
            <Search size={13} color="var(--color-text-muted)" style={{ position: 'absolute', left: '10px', top: '10px' }} />
            <input
              type="text"
              placeholder="Search target name, type, environment..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px 6px 30px',
                fontSize: '12px',
                background: 'var(--color-surface-elevated)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--color-text-primary)',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Filter size={12} />
              <span>Type:</span>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                style={{
                  background: 'var(--color-surface-elevated)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                  fontSize: '11px',
                  padding: '4px 8px',
                  borderRadius: 'var(--radius-sm)',
                  outline: 'none',
                }}
              >
                <option value="ALL">ALL TYPES</option>
                {targetTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>State:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  background: 'var(--color-surface-elevated)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                  fontSize: '11px',
                  padding: '4px 8px',
                  borderRadius: 'var(--radius-sm)',
                  outline: 'none',
                }}
              >
                <option value="ALL">ALL STATES</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="DEGRADED">DEGRADED</option>
                <option value="NOT_CONFIGURED">NOT CONFIGURED</option>
              </select>
            </div>
          </div>
        </div>

        {/* Runtimes Table */}
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
          }}
        >
          {loading && safeRuntimes.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', fontSize: '12px', color: 'var(--color-text-muted)' }}>
              Loading registered runtime targets...
            </div>
          ) : filtered.length === 0 ? (
            <EmptyProtectState
              title="NO RUNTIMES FOUND"
              description="No runtime targets found matching current filters."
            />
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
              <thead>
                <tr
                  style={{
                    borderBottom: '1px solid var(--color-border)',
                    background: 'var(--color-surface-elevated)',
                    color: 'var(--color-text-muted)',
                    fontSize: '10px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  <th style={{ padding: '10px 16px' }}>TARGET NAME</th>
                  <th style={{ padding: '10px 16px' }}>TYPE</th>
                  <th style={{ padding: '10px 16px' }}>ENVIRONMENT</th>
                  <th style={{ padding: '10px 16px' }}>PROTECTION STATE</th>
                  <th style={{ padding: '10px 16px' }}>POLICY VERSION</th>
                  <th style={{ padding: '10px 16px' }}>FAIL MODE</th>
                  <th style={{ padding: '10px 16px', textAlign: 'right' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr
                    key={r.id}
                    style={{
                      borderBottom: '1px solid var(--color-border)',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Server size={14} color="var(--color-text-muted)" />
                        <span>{r.target_name || r.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--color-text-secondary)' }}>
                      <span
                        style={{
                          padding: '2px 6px',
                          background: 'var(--color-surface-elevated)',
                          border: '1px solid var(--color-border)',
                          borderRadius: '4px',
                          fontSize: '11px',
                        }}
                      >
                        {r.target_type}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--color-text-secondary)' }}>
                      {r.environment || r.environment_id || 'production'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <ProtectionStateBadge state={r.protection_state || 'ACTIVE'} />
                    </td>
                    <td style={{ padding: '12px 16px', color: '#10b981', fontFamily: 'var(--font-mono)' }}>
                      {r.policy_version || 'v1'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: 700,
                          background: r.fail_mode === 'FAIL_CLOSED' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                          color: r.fail_mode === 'FAIL_CLOSED' ? '#ef4444' : '#eab308',
                        }}
                      >
                        {r.fail_mode || 'FAIL_CLOSED'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <Link
                        href={`/protect/runtime/${r.id}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 10px',
                          fontSize: '11px',
                          color: '#10b981',
                          background: 'rgba(16, 185, 129, 0.08)',
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                          borderRadius: 'var(--radius-sm)',
                          textDecoration: 'none',
                        }}
                      >
                        <span>INSPECT</span>
                        <ChevronRight size={11} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </ProtectWorkshell>
  );
}
