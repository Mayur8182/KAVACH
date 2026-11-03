'use client';

import React from 'react';
import { MoreHorizontal, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { RecentSBOMScanItem } from '@/types/api/dependencies';

interface RecentSBOMScansTableProps {
  scans: RecentSBOMScanItem[];
  loading?: boolean;
}

export const RecentSBOMScansTable: React.FC<RecentSBOMScansTableProps> = ({
  scans,
  loading = false,
}) => {
  const getStatusBadge = (status: string) => {
    const upper = (status || '').toUpperCase();
    if (upper === 'COMPLETED') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: '#ECFDF5',
            color: '#059669',
            padding: '2px 8px',
            borderRadius: '12px',
            fontSize: '11px',
            fontWeight: 600,
          }}
        >
          <CheckCircle2 size={12} />
          Completed
        </span>
      );
    }
    if (upper === 'RUNNING') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: '#EFF6FF',
            color: '#2563EB',
            padding: '2px 8px',
            borderRadius: '12px',
            fontSize: '11px',
            fontWeight: 600,
          }}
        >
          <Clock size={12} className="animate-spin" />
          Running
        </span>
      );
    }
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          backgroundColor: '#FEF2F2',
          color: '#DC2626',
          padding: '2px 8px',
          borderRadius: '12px',
          fontSize: '11px',
          fontWeight: 600,
        }}
      >
        <AlertCircle size={12} />
        Failed
      </span>
    );
  };

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: '260px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', margin: 0 }}>
          Recent SBOM Scans
        </h3>
        <span style={{ fontSize: '12px', color: '#64748B' }}>
          {scans.length} recent executions
        </span>
      </div>

      <div style={{ overflowX: 'auto', flexGrow: 1 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>
              <th style={{ padding: '8px 10px' }}>Repository</th>
              <th style={{ padding: '8px 10px' }}>Branch</th>
              <th style={{ padding: '8px 10px' }}>Scan Type</th>
              <th style={{ padding: '8px 10px' }}>Components</th>
              <th style={{ padding: '8px 10px' }}>Status</th>
              <th style={{ padding: '8px 10px' }}>Started At</th>
              <th style={{ padding: '8px 10px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td colSpan={7} style={{ padding: '10px' }}>
                    <div style={{ height: '16px', backgroundColor: '#F1F5F9', borderRadius: '4px' }} />
                  </td>
                </tr>
              ))
            ) : scans.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#64748B' }}>
                  No recent SBOM scans recorded.
                </td>
              </tr>
            ) : (
              scans.map((scan) => (
                <tr key={scan.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '10px', fontWeight: 600, color: '#0F172A' }}>
                    {scan.repository_name}
                  </td>
                  <td style={{ padding: '10px', fontFamily: 'monospace', color: '#475569', fontSize: '11.5px' }}>
                    {scan.branch}
                  </td>
                  <td style={{ padding: '10px', color: '#475569' }}>
                    <span
                      style={{
                        backgroundColor: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '11px',
                      }}
                    >
                      {scan.scan_type}
                    </span>
                  </td>
                  <td style={{ padding: '10px', fontWeight: 600, color: '#0F172A' }}>
                    {scan.components_count}
                  </td>
                  <td style={{ padding: '10px' }}>{getStatusBadge(scan.status)}</td>
                  <td style={{ padding: '10px', color: '#64748B', fontSize: '11.5px' }}>
                    {scan.started_at}
                  </td>
                  <td style={{ padding: '10px', textAlign: 'right' }}>
                    <button
                      type="button"
                      aria-label="Scan actions"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#64748B',
                        cursor: 'pointer',
                        padding: '2px',
                      }}
                    >
                      <MoreHorizontal size={15} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
