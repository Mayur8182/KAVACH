import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../api/client';
import { StatusBadge } from '../shared/StatusBadge';
import { PageLoadingState } from '../shared/LoadingState';
import { ErrorState } from '../shared/ErrorState';

interface AuditEvent {
  id: string;
  timestamp: string;
  action: string;
  actor_id: string;
  actor_type?: string;
  resource_type?: string;
  resource_id?: string;
  status: string;
  details?: Record<string, any>;
  ip_address?: string;
  request_id?: string;
}

export const AuditLogView: React.FC = () => {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filterAction, setFilterAction] = useState<string>('');
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);

  const fetchAuditEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.listAuditEvents({ limit: 100 });
      if (res.isError && res.error) {
        setError(res.error.message || 'Failed to fetch audit log');
      } else if (res.data) {
        setEvents(res.data);
      }
    } catch (err: any) {
      setError(err?.message || 'Error connecting to audit service');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAuditEvents();
  }, [fetchAuditEvents]);

  const filtered = events.filter((e) => {
    if (!filterAction) return true;
    return (
      e.action?.toLowerCase().includes(filterAction.toLowerCase()) ||
      e.actor_id?.toLowerCase().includes(filterAction.toLowerCase()) ||
      e.resource_type?.toLowerCase().includes(filterAction.toLowerCase())
    );
  });

  return (
    <div style={{ padding: 'var(--space-8) var(--space-10)', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-bold)', color: 'var(--color-text)' }}>
            Immutable Audit Trail
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 'var(--space-1)' }}>
            Cryptographically sealed and traceable record of all platform security operations, access, and decisions
          </p>
        </div>
        <button
          onClick={fetchAuditEvents}
          style={{
            padding: '6px 14px',
            backgroundColor: 'var(--color-surface-elevated)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-text)',
            fontSize: 'var(--text-xs)',
            cursor: 'pointer',
          }}
        >
          Refresh Audit Trail
        </button>
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Filter by action, actor, or resource..."
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          style={{
            maxWidth: '360px',
            width: '100%',
            padding: '8px 12px',
            backgroundColor: 'var(--color-surface-elevated)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-text)',
            fontSize: 'var(--text-xs)',
            outline: 'none',
          }}
        />
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
          Showing {filtered.length} of {events.length} records
        </span>
      </div>

      {error && <ErrorState message={error} onRetry={fetchAuditEvents} />}

      {loading ? (
        <PageLoadingState message="Loading audit trail records..." />
      ) : filtered.length === 0 ? (
        <div
          style={{
            padding: 'var(--space-10)',
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            textAlign: 'center',
          }}
        >
          <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-base)' }}>
            No Audit Events Found
          </div>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', marginTop: 'var(--space-2)' }}>
            {filterAction ? 'No events matched your search query.' : 'Audit trail currently has zero recorded events.'}
          </p>
        </div>
      ) : (
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-xs)' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-elevated)', textAlign: 'left' }}>
                <th style={{ padding: '10px 14px', color: 'var(--color-text-muted)', fontWeight: 'var(--weight-semibold)' }}>TIMESTAMP</th>
                <th style={{ padding: '10px 14px', color: 'var(--color-text-muted)', fontWeight: 'var(--weight-semibold)' }}>ACTION</th>
                <th style={{ padding: '10px 14px', color: 'var(--color-text-muted)', fontWeight: 'var(--weight-semibold)' }}>ACTOR</th>
                <th style={{ padding: '10px 14px', color: 'var(--color-text-muted)', fontWeight: 'var(--weight-semibold)' }}>RESOURCE</th>
                <th style={{ padding: '10px 14px', color: 'var(--color-text-muted)', fontWeight: 'var(--weight-semibold)' }}>STATUS</th>
                <th style={{ padding: '10px 14px', color: 'var(--color-text-muted)', fontWeight: 'var(--weight-semibold)' }}>DETAILS</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr
                  key={e.id}
                  style={{
                    borderBottom: '1px solid var(--color-border)',
                    cursor: 'pointer',
                    transition: 'background-color var(--motion-fast)',
                  }}
                  onClick={() => setSelectedEvent(e)}
                  onMouseOver={(elem) => (elem.currentTarget.style.backgroundColor = 'var(--color-surface-elevated)')}
                  onMouseOut={(elem) => (elem.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                    {new Date(e.timestamp).toLocaleString()}
                  </td>
                  <td style={{ padding: '10px 14px', fontWeight: 'var(--weight-medium)', color: 'var(--color-text)' }}>
                    {e.action}
                  </td>
                  <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)' }}>
                    {e.actor_id}
                  </td>
                  <td style={{ padding: '10px 14px', color: 'var(--color-text-muted)' }}>
                    {e.resource_type ? `${e.resource_type}:${e.resource_id || ''}` : '—'}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <StatusBadge status={e.status} />
                  </td>
                  <td style={{ padding: '10px 14px', color: 'var(--color-primary)' }}>
                    View Payload
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      {selectedEvent && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: 'var(--space-6)',
          }}
          onClick={() => setSelectedEvent(null)}
        >
          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              maxWidth: '680px',
              width: '100%',
              maxHeight: '80vh',
              overflowY: 'auto',
              padding: 'var(--space-6)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-4)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-bold)', color: 'var(--color-text)' }}>
                Audit Event Payload
              </h3>
              <button
                onClick={() => setSelectedEvent(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-text-muted)',
                  cursor: 'pointer',
                  fontSize: 'var(--text-base)',
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', fontSize: 'var(--text-xs)' }}>
              <div>
                <span style={{ color: 'var(--color-text-muted)' }}>Event ID:</span>
                <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text)' }}>{selectedEvent.id}</div>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-muted)' }}>Timestamp:</span>
                <div style={{ color: 'var(--color-text)' }}>{new Date(selectedEvent.timestamp).toISOString()}</div>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-muted)' }}>Action:</span>
                <div style={{ fontWeight: 'var(--weight-semibold)', color: 'var(--color-text)' }}>{selectedEvent.action}</div>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-muted)' }}>Actor:</span>
                <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text)' }}>{selectedEvent.actor_id}</div>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-muted)' }}>IP Address:</span>
                <div style={{ color: 'var(--color-text)' }}>{selectedEvent.ip_address || 'Internal Service'}</div>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-muted)' }}>Request ID:</span>
                <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text)' }}>{selectedEvent.request_id || '—'}</div>
              </div>
            </div>

            <div>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>Raw Event Details:</span>
              <pre
                style={{
                  marginTop: 'var(--space-2)',
                  padding: 'var(--space-4)',
                  backgroundColor: 'var(--color-surface-elevated)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--color-text)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  lineHeight: '1.5',
                  overflowX: 'auto',
                }}
              >
                {JSON.stringify(selectedEvent.details || selectedEvent, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
