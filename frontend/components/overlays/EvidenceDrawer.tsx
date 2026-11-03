import React from 'react';
import { EntityDrawer } from './EntityDrawer';
import { StatusBadge } from '../data-display/StatusBadge';

export interface EvidencePayload {
  id: string;
  source: string;
  timestamp: string;
  ruleId: string;
  result: 'VIOLATED' | 'VERIFIED' | 'BLOCKED' | 'ALLOWED' | 'FAILED';
  inputSnippet?: string;
  executionTrace?: string;
  relatedEntities?: Array<{ type: string; id: string; label: string }>;
  remediationAdvice?: string;
  correlationId?: string;
}

interface EvidenceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  evidence: EvidencePayload | null;
}

export const EvidenceDrawer: React.FC<EvidenceDrawerProps> = ({ isOpen, onClose, evidence }) => {
  if (!evidence) return null;

  return (
    <EntityDrawer
      isOpen={isOpen}
      onClose={onClose}
      title="Security Evidence"
      subtitle={`Evidence ID: ${evidence.id}`}
      badge={<StatusBadge status={evidence.result} />}
      width="600px"
      footer={
        <button
          onClick={onClose}
          style={{
            padding: '7px 14px',
            fontSize: '12px',
            fontWeight: 'var(--weight-medium)',
            background: 'var(--color-surface-elevated)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-text-primary)',
            cursor: 'pointer',
          }}
        >
          Close Evidence
        </button>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Key-Value Evidence Metadata */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
            background: 'var(--color-surface-elevated)',
            padding: '16px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
          }}
        >
          <div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Source</div>
            <div style={{ fontSize: '13px', fontWeight: 'var(--weight-medium)', color: 'var(--color-text-primary)' }}>
              {evidence.source}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Timestamp</div>
            <div style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)' }}>
              {evidence.timestamp}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Rule ID</div>
            <code style={{ fontSize: '12px', color: 'var(--color-primary-text)' }}>
              {evidence.ruleId}
            </code>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Request / Correlation ID</div>
            <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>
              {evidence.correlationId || '—'}
            </div>
          </div>
        </div>

        {/* Input Payload */}
        {evidence.inputSnippet && (
          <div>
            <div style={{ fontSize: '12px', fontWeight: 'var(--weight-semibold)', color: 'var(--color-text-primary)', marginBottom: '6px' }}>
              Input Payload
            </div>
            <pre
              style={{
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: '12px',
                fontSize: '11px',
                overflowX: 'auto',
                color: 'var(--color-text-secondary)',
              }}
            >
              {evidence.inputSnippet}
            </pre>
          </div>
        )}

        {/* Execution Output */}
        {evidence.executionTrace && (
          <div>
            <div style={{ fontSize: '12px', fontWeight: 'var(--weight-semibold)', color: 'var(--color-text-primary)', marginBottom: '6px' }}>
              Execution Trace & Scanner Output
            </div>
            <pre
              style={{
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: '12px',
                fontSize: '11px',
                overflowX: 'auto',
                color: 'var(--color-text-secondary)',
              }}
            >
              {evidence.executionTrace}
            </pre>
          </div>
        )}

        {/* Related Entities */}
        {evidence.relatedEntities && evidence.relatedEntities.length > 0 && (
          <div>
            <div style={{ fontSize: '12px', fontWeight: 'var(--weight-semibold)', color: 'var(--color-text-primary)', marginBottom: '8px' }}>
              Related Assets & Invariants
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {evidence.relatedEntities.map((rel, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--color-surface-elevated)',
                    border: '1px solid var(--color-border-subtle)',
                    fontSize: '12px',
                  }}
                >
                  <span style={{ color: 'var(--color-text-primary)' }}>{rel.label}</span>
                  <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                    {rel.type}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </EntityDrawer>
  );
};
