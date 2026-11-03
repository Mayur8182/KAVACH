'use client';

/**
 * Thing Code — 09 Dependency Remediation
 * Subpage 3: Manifest & Lockfile Diff (/code/dependencies/remediation/diff)
 *
 * Inspects deterministic unified diffs for manifests (package.json, pom.xml, requirements.txt)
 * and cryptographic lockfiles prior to pull request generation.
 * Data Reality: Real PostgreSQL diff records via `GET /api/v1/code/dependencies/remediation/diff/{id}`
 */

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { useProject } from '@/contexts/ProjectContext';
import { ManifestLockfileDiffResponse, RemediationQueueItem } from '@/types/api/dependencies';
import { DependenciesHeader } from '@/components/code/dependencies/DependenciesHeader';
import {
  FileCode2,
  FileLock2,
  Copy,
  Check,
  ArrowRight,
  GitPullRequest,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

export default function ManifestLockfileDiffPage() {
  const { currentProject } = useProject();
  const [queue, setQueue] = useState<RemediationQueueItem[]>([]);
  const [selectedRemediationId, setSelectedRemediationId] = useState<string>('');
  const [diffData, setDiffData] = useState<ManifestLockfileDiffResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedType, setCopiedType] = useState<string | null>(null);

  const [creatingPR, setCreatingPR] = useState(false);
  const [prCreatedMsg, setPrCreatedMsg] = useState<string | null>(null);

  // First fetch the queue to populate package selector
  useEffect(() => {
    let active = true;
    const fetchQueue = async () => {
      try {
        const res = await api.code.dependencies.remediation({ projectId: currentProject?.id });
        if (active && res.queue.length > 0) {
          setQueue(res.queue);
          setSelectedRemediationId(res.queue[0].id);
        }
      } catch (err: any) {
        if (active) setError(err?.message || 'Failed to fetch remediation items.');
      }
    };
    fetchQueue();
    return () => { active = false; };
  }, [currentProject?.id]);

  // Fetch diff when selected item changes
  const loadDiff = useCallback(async (id: string) => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.code.dependencies.remediationDiff(id, currentProject?.id);
      setDiffData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch manifest and lockfile diff.');
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id]);

  useEffect(() => {
    if (selectedRemediationId) {
      loadDiff(selectedRemediationId);
    }
  }, [selectedRemediationId, loadDiff]);

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleCreatePR = async () => {
    if (!diffData) return;
    setCreatingPR(true);
    setPrCreatedMsg(null);
    try {
      const res = await api.code.dependencies.createFixPullRequest(
        {
          remediation_id: diffData.remediation_id,
          target_branch: diffData.branch || 'main',
          title: `fix(deps): bump ${diffData.package_name} from ${diffData.current_version} to ${diffData.fixed_version}`,
          body: `Automated lockfile diff verified by SecuLayer.\nTarget Manifest: ${diffData.manifest_path}\nLockfile: ${diffData.lockfile_path || 'None'}`,
        },
        currentProject?.id
      );
      setPrCreatedMsg(`PR #${res.pr_number} created on branch ${res.pr_branch}`);
    } catch (err: any) {
      setError(err?.message || 'Failed to create PR.');
    } finally {
      setCreatingPR(false);
    }
  };

  const renderDiffLines = (rawDiff: string) => {
    if (!rawDiff) return <div style={{ color: '#94A3B8', padding: '16px' }}>No diff available.</div>;

    const lines = rawDiff.split('\n');
    return (
      <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', fontSize: '12px', lineHeight: 1.6 }}>
        {lines.map((line, idx) => {
          let bg = 'transparent';
          let color = '#334155';
          let prefix = ' ';

          if (line.startsWith('+') && !line.startsWith('+++')) {
            bg = '#ECFDF5';
            color = '#047857';
            prefix = '+';
          } else if (line.startsWith('-') && !line.startsWith('---')) {
            bg = '#FEF2F2';
            color = '#B91C1C';
            prefix = '-';
          } else if (line.startsWith('@@')) {
            bg = '#EFF6FF';
            color = '#1D4ED8';
            prefix = '@';
          }

          return (
            <div
              key={idx}
              style={{
                backgroundColor: bg,
                color: color,
                padding: '2px 12px',
                display: 'flex',
                gap: '12px',
                whiteSpace: 'pre-wrap',
                borderLeft: prefix === '+' ? '3px solid #10B981' : prefix === '-' ? '3px solid #EF4444' : '3px solid transparent',
              }}
            >
              <span style={{ width: '28px', color: '#94A3B8', textAlign: 'right', userSelect: 'none' }}>
                {idx + 1}
              </span>
              <span>{line}</span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '40px' }}>
      <DependenciesHeader
        title="Manifest & Lockfile Diff"
        subtitle="Cryptographically verified unified diffs generated for automated remediation pull requests."
        currentSubpage="remediation-diff"
        onRefresh={() => loadDiff(selectedRemediationId)}
        isLoading={loading}
      />

      {prCreatedMsg && (
        <div
          style={{
            backgroundColor: '#ECFDF5',
            border: '1px solid #A7F3D0',
            borderRadius: '10px',
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: '#065F46',
            fontSize: '13px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={16} color="#10B981" />
            <span>{prCreatedMsg}</span>
          </div>
          <button
            type="button"
            aria-label="Dismiss message"
            onClick={() => setPrCreatedMsg(null)}
            style={{ background: 'transparent', border: 'none', color: '#065F46', cursor: 'pointer', fontWeight: 600 }}
          >
            ✕
          </button>
        </div>
      )}

      {error && (
        <div
          style={{
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: '10px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: '#B91C1C',
            fontSize: '13px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertCircle size={18} />
            <div>
              <strong style={{ display: 'block', fontWeight: 600 }}>Failed to load diff</strong>
              <span>{error}</span>
            </div>
          </div>
        </div>
      )}

      {/* Package Selector & Top Controls */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
            Select Dependency:
          </span>
          <select
            value={selectedRemediationId}
            aria-label="Select dependency to inspect diff"
            onChange={(e) => setSelectedRemediationId(e.target.value)}
            style={{
              padding: '8px 14px',
              backgroundColor: '#F8FAFC',
              border: '1px solid #CBD5E1',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 500,
              color: '#0F172A',
              cursor: 'pointer',
              minWidth: '240px',
            }}
          >
            {queue.map((item) => (
              <option key={item.id} value={item.id}>
                {item.package_name} ({item.current_version} → {item.fixed_version}) — {item.repository_name}
              </option>
            ))}
          </select>
        </div>

        {diffData && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '12px', color: '#64748B' }}>
              Branch: <code style={{ backgroundColor: '#F1F5F9', padding: '2px 6px', borderRadius: '4px' }}>{diffData.branch}</code>
            </span>
            <button
              type="button"
              onClick={handleCreatePR}
              disabled={creatingPR}
              style={{
                padding: '8px 16px',
                backgroundColor: '#2563EB',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#FFFFFF',
                cursor: creatingPR ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 1px 2px rgba(37, 99, 235, 0.2)',
              }}
            >
              <GitPullRequest size={14} />
              <span>{creatingPR ? 'Creating PR...' : 'Create Fix PR from Diff'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Manifest Diff Card */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '12px 18px',
            backgroundColor: '#F8FAFC',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileCode2 size={16} color="#2563EB" />
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
              Manifest Diff: {diffData?.manifest_path || 'package.json'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleCopy(diffData?.manifest_diff || '', 'manifest')}
            style={{
              background: 'transparent',
              border: '1px solid #CBD5E1',
              borderRadius: '6px',
              padding: '4px 8px',
              fontSize: '11.5px',
              color: '#475569',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            {copiedType === 'manifest' ? <Check size={12} color="#10B981" /> : <Copy size={12} />}
            <span>{copiedType === 'manifest' ? 'Copied' : 'Copy Diff'}</span>
          </button>
        </div>

        <div style={{ padding: '8px 0', backgroundColor: '#FAFAFA' }}>
          {loading ? (
            <div style={{ padding: '24px', color: '#94A3B8' }}>Loading unified diff...</div>
          ) : (
            renderDiffLines(diffData?.manifest_diff || '')
          )}
        </div>
      </div>

      {/* Lockfile Diff Card */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '12px 18px',
            backgroundColor: '#F8FAFC',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileLock2 size={16} color="#7C3AED" />
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
              Lockfile Diff: {diffData?.lockfile_path || 'package-lock.json'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleCopy(diffData?.lockfile_diff || '', 'lockfile')}
            style={{
              background: 'transparent',
              border: '1px solid #CBD5E1',
              borderRadius: '6px',
              padding: '4px 8px',
              fontSize: '11.5px',
              color: '#475569',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            {copiedType === 'lockfile' ? <Check size={12} color="#10B981" /> : <Copy size={12} />}
            <span>{copiedType === 'lockfile' ? 'Copied' : 'Copy Diff'}</span>
          </button>
        </div>

        <div style={{ padding: '8px 0', backgroundColor: '#FAFAFA' }}>
          {loading ? (
            <div style={{ padding: '24px', color: '#94A3B8' }}>Loading lockfile diff...</div>
          ) : (
            renderDiffLines(diffData?.lockfile_diff || 'No lockfile changes required for this package.')
          )}
        </div>
      </div>
    </div>
  );
}
