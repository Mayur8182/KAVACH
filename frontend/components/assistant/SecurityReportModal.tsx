'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  X,
  FileText,
  Download,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  BarChart3,
  Check,
  Lock,
} from 'lucide-react';
import { api } from '@/lib/api/client';

interface SecurityReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  repository?: string;
  branch?: string;
  projectId?: string | null;
  reportData?: any;
}

export default function SecurityReportModal({
  isOpen,
  onClose,
  repository = 'kavach',
  branch = 'main',
  projectId,
  reportData,
}: SecurityReportModalProps) {
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDownload = async () => {
    setDownloading(true);
    setDownloadError(null);
    try {
      const downloadUrl = api.assistant.getReportDownloadUrl(projectId, repository, branch, 'pdf');
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') || localStorage.getItem('token') : null;
      const res = await fetch(downloadUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `${repository}-security-report-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
    } catch (err: any) {
      console.error('Report download error:', err);
      // Fallback: direct anchor with token in query param
      try {
        const directUrl = api.assistant.getReportDownloadUrl(projectId, repository, branch, 'pdf');
        const link = document.createElement('a');
        link.href = directUrl;
        link.download = `${repository}-security-report-${new Date().toISOString().slice(0, 10)}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (fallbackErr: any) {
        setDownloadError(err?.message || 'Failed to download PDF report. Ensure you are authenticated.');
      }
    } finally {
      setDownloading(false);
    }
  };

  const reportDate = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '580px',
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid #E2E8F0',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease-out',
        }}
      >
        {/* Header (Stage 13 Style) */}
        <div
          style={{
            padding: '24px 28px 16px',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
              Security report generated
            </h3>
            <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0', lineHeight: 1.5 }}>
              I've generated a comprehensive security report for your repository with all findings, risk analysis, and recommendations.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94A3B8',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '0 28px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* PDF File Card (Matches Stage 13 Card) */}
          <div
            style={{
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '18px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              {/* PDF Red Icon */}
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  backgroundColor: '#FEE2E2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#DC2626',
                  flexShrink: 0,
                }}
              >
                <FileText size={22} />
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>
                  {repository}-security-report.pdf
                </div>
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                  Authoritative Audit Document (PDF) · {reportDate}
                </div>
              </div>
            </div>

            <button
              onClick={handleDownload}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 16px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#FFFFFF',
                backgroundColor: '#0F172A',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'background-color 0.15s',
              }}
            >
              <Download size={14} />
              <span>{downloading ? 'Downloading...' : 'Download report'}</span>
            </button>
          </div>

          {downloadError && (
            <div
              style={{
                padding: '10px 14px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: '8px',
                color: '#DC2626',
                fontSize: '12px',
                marginBottom: '16px',
              }}
            >
              {downloadError}
            </div>
          )}

          {/* Report Includes Checklist (Matches Stage 13 items) */}
          <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '16px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', marginBottom: '12px' }}>
              Report includes
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                'Executive summary',
                'Detailed findings with CWE & CVSS mapping',
                'Risk analysis & threat modeling',
                'Remediation recommendations & fix proposals',
                'Compliance status (SOC 2, ISO 27001, OWASP Top 10)',
              ].map((item, idx) => (
                <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#475569' }}>
                  <div
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      backgroundColor: '#EEF2FF',
                      color: '#4F46E5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Check size={12} />
                  </div>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 28px',
            borderTop: '1px solid #E2E8F0',
            backgroundColor: '#F8FAFC',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Link
            href="/reports"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              color: '#4F46E5',
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            <span>View all reports in Dashboard</span>
            <ExternalLink size={13} />
          </Link>

          <button
            onClick={onClose}
            style={{
              padding: '8px 18px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#334155',
              backgroundColor: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
