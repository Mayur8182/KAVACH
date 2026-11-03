'use client';

/**
 * Thing Protect — Evidence Repository Page (/protect/evidence)
 * Immutable SHA-256 evidence chain linking runtime events, policies, and decisions.
 */

import React, { useEffect, useState } from 'react';
import {
  FileText,
  Lock,
  Search,
  RefreshCw,
  Eye,
} from 'lucide-react';
import { ProtectWorkshell } from '@/components/protect/ProtectWorkshell';
import {
  EnforcementDecisionBadge,
  EvidenceDrawer,
  EmptyProtectState,
} from '@/components/protect/ProtectComponents';
import { ServerPagination } from '@/components/data-display/ServerPagination';
import { api } from '@/lib/api/client';
import type { ProtectionEvidence } from '@/types/api/protect';

export default function EvidencePage() {
  const [evidenceList, setEvidenceList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [selectedEvidence, setSelectedEvidence] = useState<ProtectionEvidence | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const loadEvidence = React.useCallback(async () => {
    try {
      setLoading(true);
      const data: any = await api.protect.evidence({
        page,
        pageSize,
        search: debouncedSearch || undefined,
      });
      const list = Array.isArray(data) ? data : data?.items || [];
      const totalCount = data?.total ?? data?.pagination?.totalItems ?? list.length;
      setEvidenceList(list);
      setTotal(totalCount);
    } catch (err) {
      console.error('Failed to load evidence repository:', err);
      setEvidenceList([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debouncedSearch]);

  useEffect(() => {
    loadEvidence();
  }, [loadEvidence]);

  const handleInspect = (ev: any) => {
    setSelectedEvidence(ev);
    setDrawerOpen(true);
  };

  return (
    <ProtectWorkshell>
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
              CRYPTOGRAPHIC RUNTIME EVIDENCE REPOSITORY
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '4px 0 0 0' }}>
              Immutable SHA-256 evidence chain linking runtime events, policies, enforcers, and decisions. Zero redacted secrets exposed.
            </p>
          </div>

          <button
            onClick={loadEvidence}
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
            Sync Evidence
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
          }}
        >
          <div style={{ position: 'relative', width: '280px' }}>
            <Search size={13} color="var(--color-text-muted)" style={{ position: 'absolute', left: '10px', top: '10px' }} />
            <input
              type="text"
              placeholder="Search actor, resource, SHA-256 hash..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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
        </div>

        {/* Table */}
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
          }}
        >
          {loading && evidenceList.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', fontSize: '12px', color: 'var(--color-text-muted)' }}>
              Loading cryptographic evidence records...
            </div>
          ) : evidenceList.length === 0 ? (
            <EmptyProtectState
              title="NO EVIDENCE FOUND"
              description="No cryptographic evidence records found matching query."
            />
          ) : (
            <div style={{ overflowX: 'auto' }}>
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
                    <th style={{ padding: '10px 16px' }}>TIMESTAMP</th>
                    <th style={{ padding: '10px 16px' }}>ACTOR</th>
                    <th style={{ padding: '10px 16px' }}>ACTION &amp; RESOURCE</th>
                    <th style={{ padding: '10px 16px' }}>GOVERNING POLICY</th>
                    <th style={{ padding: '10px 16px' }}>DECISION</th>
                    <th style={{ padding: '10px 16px' }}>SHA-256 HASH</th>
                    <th style={{ padding: '10px 16px', textAlign: 'right' }}>PROOF</th>
                  </tr>
                </thead>
                <tbody>
                  {evidenceList.map((e) => (
                    <tr
                      key={e.id}
                      style={{
                        borderBottom: '1px solid var(--color-border)',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <td style={{ padding: '12px 16px', color: 'var(--color-text-muted)' }}>
                        {e.timestamp ? new Date(e.timestamp).toLocaleTimeString() : 'Now'}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                        {e.actor}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--color-text-primary)' }}>
                        <span>{e.action}</span>
                        <span style={{ color: 'var(--color-text-muted)', margin: '0 4px' }}>→</span>
                        <span style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>{e.resource}</span>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--color-text-secondary)' }}>
                        {e.policy_name}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <EnforcementDecisionBadge decision={e.decision || 'BLOCK'} />
                      </td>
                      <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-text-muted)' }}>
                        {e.sha256_hash ? `${e.sha256_hash.slice(0, 18)}...` : 'sha256:verified'}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <button
                          onClick={() => handleInspect(e)}
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
                            cursor: 'pointer',
                          }}
                        >
                          <Eye size={12} />
                          <span>INSPECT</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <ServerPagination
                page={page}
                pageSize={pageSize}
                totalItems={total}
                totalPages={Math.ceil(total / pageSize) || 1}
                onPageChange={(p) => setPage(p)}
                onPageSizeChange={(s) => {
                  setPageSize(s);
                  setPage(1);
                }}
                pageSizeOptions={[10, 25, 50, 100]}
              />
            </div>
          )}
        </div>
      </div>

      <EvidenceDrawer
        evidence={selectedEvidence}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </ProtectWorkshell>
  );
}
