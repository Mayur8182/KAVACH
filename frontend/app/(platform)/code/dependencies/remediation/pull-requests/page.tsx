'use client';

/**
 * Thing Code — 09 Dependency Remediation
 * Subpage 4: Create Fix Pull Request (/code/dependencies/remediation/pull-requests)
 *
 * Configures and dispatches automated Git pull requests with pre-verified lockfiles,
 * security blueprints, and deterministic CI test gates.
 * Data Reality: Real PostgreSQL state via `POST /api/v1/code/dependencies/remediation/pull-requests`
 */

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api/client';
import { useProject } from '@/contexts/ProjectContext';
import { RemediationQueueItem, CreateFixPullRequestResponse } from '@/types/api/dependencies';
import { DependenciesHeader } from '@/components/code/dependencies/DependenciesHeader';
import {
  GitPullRequest,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  GitBranch,
  FolderGit2,
  Send,
  Clock,
  Sparkles,
} from 'lucide-react';

export default function CreateFixPullRequestPage() {
  const { currentProject } = useProject();
  const [queue, setQueue] = useState<RemediationQueueItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<RemediationQueueItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [dispatching, setDispatching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CreateFixPullRequestResponse | null>(null);

  // Form states
  const [targetBranch, setTargetBranch] = useState('main');
  const [prTitle, setPrTitle] = useState('');
  const [prBody, setPrBody] = useState('');

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.code.dependencies.remediation({ projectId: currentProject?.id });
      setQueue(res.queue);
      if (res.queue.length > 0) {
        const item = res.queue[0];
        setSelectedItem(item);
        setPrTitle(`fix(deps): bump ${item.package_name} from ${item.current_version} to ${item.fixed_version}`);
        setPrBody(
          `### Automated Security Remediation\n\n` +
          `- **Package:** \`${item.package_name}\`\n` +
          `- **Upgrade:** \`${item.current_version}\` → \`${item.fixed_version}\`\n` +
          `- **Vulnerability:** ${item.cve_id || 'Security update'} (${item.title})\n` +
          `- **Severity:** ${item.severity}\n\n` +
          `Generated automatically by **THING SecuLayer**.\n` +
          `A deterministic Semgrep SCA scan will run on branch merge to verify fix.`
        );
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load remediation items.');
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const handleSelectPackage = (item: RemediationQueueItem) => {
    setSelectedItem(item);
    setPrTitle(`fix(deps): bump ${item.package_name} from ${item.current_version} to ${item.fixed_version}`);
    setPrBody(
      `### Automated Security Remediation\n\n` +
      `- **Package:** \`${item.package_name}\`\n` +
      `- **Upgrade:** \`${item.current_version}\` → \`${item.fixed_version}\`\n` +
      `- **Vulnerability:** ${item.cve_id || 'Security update'} (${item.title})\n` +
      `- **Severity:** ${item.severity}\n\n` +
      `Generated automatically by **THING SecuLayer**.\n` +
      `A deterministic Semgrep SCA scan will run on branch merge to verify fix.`
    );
  };

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    setDispatching(true);
    setError(null);
    setResult(null);

    try {
      const res = await api.code.dependencies.createFixPullRequest(
        {
          remediation_id: selectedItem.id,
          target_branch: targetBranch,
          title: prTitle,
          body: prBody,
        },
        currentProject?.id
      );
      setResult(res);
      await loadQueue();
    } catch (err: any) {
      setError(err?.message || 'Failed to dispatch pull request.');
    } finally {
      setDispatching(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '40px' }}>
      <DependenciesHeader
        title="Create Fix Pull Request"
        subtitle="Automated branch synthesis and pull request authoring with pre-calculated manifest and lockfile diffs."
        currentSubpage="remediation-prs"
        onRefresh={loadQueue}
        isLoading={loading}
      />

      {/* Success Banner */}
      {result && (
        <div
          style={{
            backgroundColor: '#ECFDF5',
            border: '1px solid #A7F3D0',
            borderRadius: '10px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: '#065F46',
            fontSize: '13px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CheckCircle2 size={20} color="#10B981" />
            <div>
              <strong style={{ display: 'block', fontSize: '14px', fontWeight: 600 }}>
                Pull Request #{result.pr_number} Dispatched Successfully
              </strong>
              <span>
                Branch: <code>{result.pr_branch}</code> • Target: <code>{result.target_branch}</code>
              </span>
            </div>
          </div>
          <a
            href={result.pr_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: '6px 14px',
              backgroundColor: '#10B981',
              color: '#FFFFFF',
              borderRadius: '6px',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>Open in GitHub</span>
            <ExternalLink size={13} />
          </a>
        </div>
      )}

      {/* Error Banner */}
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
              <strong style={{ display: 'block', fontWeight: 600 }}>Pull Request Dispatch Failed</strong>
              <span>{error}</span>
            </div>
          </div>
        </div>
      )}

      {/* 2-Column Form Layout */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '360px minmax(0, 1fr)',
          gap: '24px',
          alignItems: 'start',
        }}
      >
        {/* Left Column: Select Vulnerable Dependency to Remediate */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '16px 18px', borderBottom: '1px solid #E2E8F0' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', margin: 0 }}>
              Select Item to Remediate
            </h3>
            <span style={{ fontSize: '12px', color: '#64748B' }}>
              {queue.length} pending items in queue
            </span>
          </div>

          <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
            {queue.map((item) => {
              const isSelected = selectedItem?.id === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelectPackage(item)}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid #F1F5F9',
                    backgroundColor: isSelected ? '#EFF6FF' : 'transparent',
                    cursor: 'pointer',
                    transition: 'background-color 100ms ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = '#F8FAFC';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 600, color: isSelected ? '#1E40AF' : '#0F172A', fontSize: '13px' }}>
                      {item.package_name}
                    </span>
                    <span
                      style={{
                        fontSize: '10.5px',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        fontWeight: 600,
                        backgroundColor: item.severity === 'CRITICAL' ? '#FEF2F2' : item.severity === 'HIGH' ? '#FFF7ED' : '#EFF6FF',
                        color: item.severity === 'CRITICAL' ? '#DC2626' : item.severity === 'HIGH' ? '#EA580C' : '#2563EB',
                      }}
                    >
                      {item.severity}
                    </span>
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#64748B' }}>
                    {item.current_version} → <strong style={{ color: '#059669' }}>{item.fixed_version}</strong> • {item.repository_name}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Pull Request Configuration Form */}
        <form
          onSubmit={handleDispatch}
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0F172A', margin: 0 }}>
                Pull Request Configuration
              </h3>
              <span style={{ fontSize: '12.5px', color: '#64748B' }}>
                Branch will be created and committed directly via Git integration
              </span>
            </div>
            {selectedItem && (
              <span style={{ backgroundColor: '#F1F5F9', color: '#475569', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>
                Repo: {selectedItem.repository_name}
              </span>
            )}
          </div>

          {/* Target Branch */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
              Target Branch:
            </label>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                border: '1px solid #CBD5E1',
                borderRadius: '8px',
                backgroundColor: '#F8FAFC',
              }}
            >
              <GitBranch size={16} color="#64748B" />
              <input
                type="text"
                value={targetBranch}
                onChange={(e) => setTargetBranch(e.target.value)}
                required
                style={{
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  fontSize: '13px',
                  color: '#0F172A',
                  width: '100%',
                }}
              />
            </div>
          </div>

          {/* PR Title */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
              Pull Request Title:
            </label>
            <input
              type="text"
              value={prTitle}
              onChange={(e) => setPrTitle(e.target.value)}
              required
              style={{
                padding: '8px 12px',
                border: '1px solid #CBD5E1',
                borderRadius: '8px',
                fontSize: '13px',
                color: '#0F172A',
                outline: 'none',
              }}
            />
          </div>

          {/* PR Description Body */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
              PR Body Description (Markdown):
            </label>
            <textarea
              rows={8}
              value={prBody}
              onChange={(e) => setPrBody(e.target.value)}
              style={{
                padding: '10px 12px',
                border: '1px solid #CBD5E1',
                borderRadius: '8px',
                fontSize: '12.5px',
                fontFamily: 'monospace',
                color: '#0F172A',
                outline: 'none',
                resize: 'vertical',
              }}
            />
          </div>

          {/* Submit CTA */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '10px', borderTop: '1px solid #F1F5F9' }}>
            <button
              type="submit"
              disabled={dispatching || !selectedItem}
              style={{
                padding: '10px 20px',
                backgroundColor: '#2563EB',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: dispatching || !selectedItem ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 1px 2px rgba(37, 99, 235, 0.2)',
              }}
            >
              <Send size={15} />
              <span>{dispatching ? 'Dispatching to Git Provider...' : 'Dispatch Fix Pull Request'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
