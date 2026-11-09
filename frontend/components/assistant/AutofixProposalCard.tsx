'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  CheckCircle2,
  FileCode,
  Zap,
  Loader2,
  GitPullRequest,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';
import { api } from '@/lib/api/client';

interface AutofixProposalCardProps {
  data?: any;
  result?: any;
  onCreatePr?: (findingId: string, title: string) => void;
}

export function AutofixProposalCard({ data, result, onCreatePr }: AutofixProposalCardProps) {
  const cardData = data || result || {};
  const findingId = cardData.finding_id || cardData.id || '';
  const title = cardData.finding_title || cardData.title || 'Vulnerability Remediation';
  const filePath = cardData.file_path || cardData.file || 'source code';
  const line = cardData.line || 1;
  const rawDiff = cardData.diff || '';
  const initialVerified = cardData.is_verified || cardData.status === 'VERIFIED_FIXED';

  const [status, setStatus] = useState<string>(cardData.status || (initialVerified ? 'VERIFIED_FIXED' : 'PROPOSED'));
  const [applying, setApplying] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const isVerified = status === 'VERIFIED_FIXED';
  const isApplied = status === 'RESOLVED' || status === 'FIX_APPLIED' || isVerified;

  const handleCopy = () => {
    if (rawDiff) {
      navigator.clipboard.writeText(rawDiff);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleApply = async () => {
    if (!findingId) return;
    setApplying(true);
    setActionFeedback(null);
    try {
      const res = await api.apiSecurity.applyFindingFix(findingId);
      setStatus('FIX_APPLIED');
      setActionFeedback({
        text: res.message || 'Patch applied directly to local source tree.',
        type: 'success',
      });
    } catch (err: any) {
      setActionFeedback({
        text: err.message || 'Failed to apply patch automatically.',
        type: 'error',
      });
    } finally {
      setApplying(false);
    }
  };

  const handleVerify = async () => {
    if (!findingId) return;
    setVerifying(true);
    setActionFeedback(null);
    try {
      const res = await api.apiSecurity.verifyFindingFix(findingId);
      const verified = res.verified || res.status === 'VERIFIED_FIXED';
      setStatus(verified ? 'VERIFIED_FIXED' : 'RESOLVED');
      setActionFeedback({
        text: res.message || (verified ? 'Deterministic AST rescan confirmed clean!' : 'Rescan completed.'),
        type: verified ? 'success' : 'error',
      });
    } catch (err: any) {
      setActionFeedback({
        text: err.message || 'Verification rescan check failed.',
        type: 'error',
      });
    } finally {
      setVerifying(false);
    }
  };

  // Render colored diff lines
  const diffLines = rawDiff ? rawDiff.split('\n') : [];

  return (
    <div
      style={{
        marginTop: 14,
        padding: '20px 22px',
        backgroundColor: '#FFFFFF',
        border: `1px solid ${isVerified ? '#BBF7D0' : '#CBD5E1'}`,
        borderRadius: 14,
        boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              backgroundColor: isVerified ? '#DCFCE7' : '#EFF6FF',
              color: isVerified ? '#15803D' : '#2563EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isVerified ? <ShieldCheck size={20} /> : <Zap size={20} />}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h4 style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', margin: 0 }}>
                {title}
              </h4>
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: 4,
                  fontSize: 10,
                  fontWeight: 700,
                  backgroundColor: isVerified ? '#DCFCE7' : '#EFF6FF',
                  color: isVerified ? '#15803D' : '#1D4ED8',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                {isVerified ? <CheckCircle2 size={11} /> : <Zap size={11} />}
                {isVerified ? 'VERIFIED FIXED' : isApplied ? 'FIX APPLIED' : 'PATCH PROPOSED'}
              </span>
            </div>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
              <FileCode size={13} />
              <span>Target: <code>{filePath}:{line}</code></span>
            </div>
          </div>
        </div>

        {/* Copy & Deep link */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            type="button"
            onClick={handleCopy}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '5px 10px',
              backgroundColor: '#F8FAFC',
              color: '#475569',
              border: '1px solid #CBD5E1',
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {copied ? <Check size={12} color="#16A34A" /> : <Copy size={12} />}
            <span>{copied ? 'Copied' : 'Copy Diff'}</span>
          </button>
          {findingId && (
            <Link
              href={`/api-security/fix-verify?findingId=${findingId}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '5px 10px',
                backgroundColor: '#0F172A',
                color: '#FFFFFF',
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              <span>Fix & Verify Studio</span>
              <ExternalLink size={12} />
            </Link>
          )}
        </div>
      </div>

      {/* Unified Diff Box */}
      {diffLines.length > 0 && (
        <div
          style={{
            borderRadius: 8,
            overflow: 'hidden',
            border: '1px solid #E2E8F0',
            backgroundColor: '#0F172A',
            marginBottom: 14,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            fontSize: 11,
            lineHeight: 1.5,
          }}
        >
          <div
            style={{
              padding: '6px 12px',
              backgroundColor: '#1E293B',
              color: '#94A3B8',
              fontSize: 11,
              fontWeight: 600,
              borderBottom: '1px solid #334155',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span>{filePath}</span>
            <span>Unified Patch</span>
          </div>
          <div style={{ padding: '8px 0', maxHeight: 240, overflowY: 'auto' }}>
            {diffLines.map((l, i) => {
              const isAdd = l.startsWith('+') && !l.startsWith('+++');
              const isDel = l.startsWith('-') && !l.startsWith('---');
              const isHunk = l.startsWith('@@');

              const bg = isAdd ? 'rgba(34, 197, 94, 0.15)' : isDel ? 'rgba(239, 68, 68, 0.15)' : 'transparent';
              const color = isAdd ? '#4ADE80' : isDel ? '#F87171' : isHunk ? '#38BDF8' : '#CBD5E1';

              return (
                <div
                  key={i}
                  style={{
                    padding: '1px 12px',
                    backgroundColor: bg,
                    color: color,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                  }}
                >
                  {l}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Verification proof note */}
      {cardData.verification_note && (
        <div
          style={{
            padding: '10px 14px',
            backgroundColor: '#F8FAFC',
            borderRadius: 8,
            border: '1px solid #E2E8F0',
            fontSize: 12,
            color: '#334155',
            marginBottom: 14,
          }}
        >
          <strong>Deterministic Proof:</strong> {cardData.verification_note}
        </div>
      )}

      {/* Feedback banner */}
      {actionFeedback && (
        <div
          style={{
            padding: '8px 12px',
            borderRadius: 6,
            fontSize: 12,
            marginBottom: 12,
            backgroundColor: actionFeedback.type === 'success' ? '#DCFCE7' : '#FEF2F2',
            color: actionFeedback.type === 'success' ? '#15803D' : '#DC2626',
            border: `1px solid ${actionFeedback.type === 'success' ? '#BBF7D0' : '#FECACA'}`,
          }}
        >
          {actionFeedback.text}
        </div>
      )}

      {/* Interactive Actions Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {!isApplied && (
            <button
              type="button"
              onClick={handleApply}
              disabled={applying}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 14px',
                backgroundColor: '#2563EB',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                cursor: applying ? 'not-allowed' : 'pointer',
              }}
            >
              {applying ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
              <span>Apply Fix to File</span>
            </button>
          )}

          {!isVerified && (
            <button
              type="button"
              onClick={handleVerify}
              disabled={verifying}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 14px',
                backgroundColor: '#0F172A',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                cursor: verifying ? 'not-allowed' : 'pointer',
              }}
            >
              {verifying ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />}
              <span>Verify Deterministically</span>
            </button>
          )}

          {onCreatePr && (
            <button
              type="button"
              onClick={() => onCreatePr(findingId, title)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 14px',
                backgroundColor: '#FFFFFF',
                color: '#0F172A',
                border: '1px solid #CBD5E1',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <GitPullRequest size={13} />
              <span>Create GitHub PR</span>
            </button>
          )}
        </div>

        <div style={{ fontSize: 11, color: '#64748B' }}>
          Real AST validation · Zero simulated outputs
        </div>
      </div>
    </div>
  );
}