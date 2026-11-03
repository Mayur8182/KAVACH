'use client';

/**
 * Thing Code — CI/CD Pipeline Workspace (/code/ci-cd)
 *
 * Dynamically connects to the active repository in scope or the user's connected repositories.
 * Renders full CI/CD control plane with zero hardcoded repository UUIDs.
 */

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CICDView } from '@/components/code/CICDView';
import { api } from '@/lib/api/client';
import { GitBranch, Plus, RefreshCw, FolderGit2 } from 'lucide-react';

function CICDPageContent() {
  const searchParams = useSearchParams();
  const queryRepoId = searchParams.get('repositoryId');

  const [activeRepoId, setActiveRepoId] = useState<string | null>(queryRepoId);
  const [loading, setLoading] = useState<boolean>(!queryRepoId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (queryRepoId) {
      setActiveRepoId(queryRepoId);
      setLoading(false);
      return;
    }

    let isMounted = true;
    async function resolveRepository() {
      setLoading(true);
      setError(null);
      try {
        const health = await api.code.repositoryHealth({ limit: 10 });
        const items = health?.items || [];
        if (!isMounted) return;

        if (items.length > 0 && items[0].repository_id) {
          setActiveRepoId(items[0].repository_id);
        } else {
          setActiveRepoId(null);
        }
      } catch (err: any) {
        if (!isMounted) return;
        console.error('Failed to resolve repository for CI/CD:', err);
        setError(err?.message || 'Failed to query connected repositories.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    resolveRepository();
    return () => {
      isMounted = false;
    };
  }, [queryRepoId]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', color: '#64748B', fontSize: '13px' }}>
          <RefreshCw size={22} className="animate-spin" color="#2563EB" />
          <span>Connecting CI/CD pipeline control plane...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', padding: '40px', backgroundColor: '#F8FAFC' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '24px', backgroundColor: '#FFFFFF', border: '1px solid #FCA5A5', borderRadius: '8px' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '15px', fontWeight: 600, color: '#991B1B' }}>CI/CD Pipeline Error</h3>
          <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#7F1D1D' }}>{error}</p>
          <button
            onClick={() => window.location.reload()}
            style={{ padding: '8px 16px', backgroundColor: '#991B1B', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  if (!activeRepoId) {
    return (
      <div style={{ minHeight: '100vh', padding: '48px 24px', backgroundColor: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ maxWidth: '520px', width: '100%', textAlign: 'center', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '36px 28px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <FolderGit2 size={24} color="#2563EB" />
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: '0 0 8px' }}>
            No Connected Repositories
          </h2>
          <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 24px', lineHeight: 1.5 }}>
            CI/CD security pipelines require an active source code repository. Connect your GitHub or GitLab repository to view automated pipelines, security gates, and build runs.
          </p>
          <Link
            href="/code/repositories"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              backgroundColor: '#0F172A',
              color: '#FFFFFF',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <Plus size={15} />
            Connect Repository
          </Link>
        </div>
      </div>
    );
  }

  return <CICDView repositoryId={activeRepoId} />;
}

export default function CICDPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC', color: '#64748B', fontSize: '13px' }}>
          Loading CI/CD Control Plane...
        </div>
      }
    >
      <CICDPageContent />
    </Suspense>
  );
}
