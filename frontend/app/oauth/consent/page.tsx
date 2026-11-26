'use client';

/**
 * Branded Universal MCP OAuth 2.1 Consent & Inline Onboarding Screen (/oauth/consent)
 * Light Enterprise UI matching Kavach Design System (#F8FAFC base, #FFFFFF card, #4F46E5 primary).
 * Never uses HTML <form action=...> to avoid CSP form-action restrictions on external AI client URIs.
 */

import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  FolderGit2,
  Globe,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import { KavachLogo } from '@/components/common/KavachLogo';
import {
  api,
  type OAuthConsentContextResponse,
  type OAuthProjectOption,
  type OAuthScopeMetadata,
} from '@/lib/api/client';

const GithubIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
  </svg>
);

const GoogleIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

const WRITE_SENSITIVE_SCOPES = new Set([
  'mcp:write',
  'scans:execute',
  'scans:run',
  'remediation:write',
  'remediation:propose',
  'remediation:apply',
  'projects:write',
]);

function isWriteSensitiveScope(scope: OAuthScopeMetadata): boolean {
  return (
    WRITE_SENSITIVE_SCOPES.has(scope.scope) ||
    scope.category === 'write' ||
    scope.category === 'action'
  );
}

function formatRedirectHost(redirectUri?: string | null): string {
  if (!redirectUri) return 'Unknown callback destination';
  try {
    const parsed = new URL(redirectUri);
    if (parsed.hostname) {
      return parsed.protocol === 'http:' || parsed.protocol === 'https:'
        ? `${parsed.protocol}//${parsed.host}`
        : `${parsed.protocol}//${parsed.host}`;
    }
    return parsed.protocol.replace(':', '');
  } catch {
    return redirectUri;
  }
}

function getClientBadgeMeta(client: OAuthConsentContextResponse['client']): {
  label: string;
  bg: string;
  color: string;
  border: string;
  verified: boolean;
} {
  if (client.client_type === 'cimd') {
    return {
      label: 'Verified CIMD',
      bg: '#ECFDF5',
      color: '#059669',
      border: '#A7F3D0',
      verified: true,
    };
  }
  if (client.client_type === 'pre_registered') {
    return {
      label: 'Pre-registered',
      bg: '#EEF2FF',
      color: '#4F46E5',
      border: '#C7D2FE',
      verified: true,
    };
  }
  if (client.is_verified) {
    return {
      label: 'Verified',
      bg: '#ECFDF5',
      color: '#059669',
      border: '#A7F3D0',
      verified: true,
    };
  }
  return {
    label: 'Dynamic Client',
    bg: '#F1F5F9',
    color: '#475569',
    border: '#CBD5E1',
    verified: false,
  };
}

function ConsentSkeletonCard() {
  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#F8FAFC',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          backgroundColor: '#FFFFFF',
          border: '1px solid #EAECF0',
          borderRadius: '12px',
          padding: '28px',
          boxShadow: '0 4px 20px rgba(15, 23, 42, 0.05)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <KavachLogo size={26} />
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: '#4F46E5',
              backgroundColor: '#EEF2FF',
              border: '1px solid #C7D2FE',
              borderRadius: '9999px',
              padding: '4px 10px',
            }}
          >
            OAuth 2.1 • PKCE S256
          </span>
        </div>
        <div className="animate-pulse" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ height: '24px', width: '65%', backgroundColor: '#F1F5F9', borderRadius: '6px' }} />
          <div style={{ height: '16px', width: '90%', backgroundColor: '#F1F5F9', borderRadius: '6px' }} />
          <div style={{ height: '92px', width: '100%', backgroundColor: '#F8FAFC', border: '1px solid #EAECF0', borderRadius: '10px' }} />
          <div style={{ height: '120px', width: '100%', backgroundColor: '#F8FAFC', border: '1px solid #EAECF0', borderRadius: '10px' }} />
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <div style={{ height: '44px', flex: 1, backgroundColor: '#F1F5F9', borderRadius: '8px' }} />
            <div style={{ height: '44px', flex: 1, backgroundColor: '#E2E8F0', borderRadius: '8px' }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ConsentContent() {
  const searchParams = useSearchParams();
  const tx = searchParams.get('tx') || '';
  const urlError = searchParams.get('error') || '';
  const urlErrorDescription = searchParams.get('error_description') || '';

  const [loading, setLoading] = useState(true);
  const [ctx, setCtx] = useState<OAuthConsentContextResponse | null>(null);
  const [loadError, setLoadError] = useState<{ message: string; requestId?: string } | null>(null);

  const [ssoProviderLoading, setSsoProviderLoading] = useState<'github' | 'google' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Authenticated selections
  const [projects, setProjects] = useState<OAuthProjectOption[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [setAsDefault, setSetAsDefault] = useState<boolean>(true);
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);

  // Inline onboarding project creation
  const [showCreateProjectForm, setShowCreateProjectForm] = useState(false);
  const [selectedGithubRepoId, setSelectedGithubRepoId] = useState<string>('');
  const [newProjectName, setNewProjectName] = useState('');
  const [newRepoUrl, setNewRepoUrl] = useState('');
  const [newEnvironment, setNewEnvironment] = useState('production');
  const [creatingProject, setCreatingProject] = useState(false);
  const [createProjectError, setCreateProjectError] = useState<string | null>(null);

  // Approve / Deny submission state
  const [submittingAction, setSubmittingAction] = useState<'approve' | 'deny' | null>(null);

  const loadContext = useCallback(async () => {
    if (!tx) {
      setLoading(false);
      setCtx(null);
      setLoadError({
        message:
          urlErrorDescription ||
          (urlError
            ? `OAuth authorization error: ${urlError}`
            : 'Missing OAuth authorization transaction token (`tx`). Restart the connection from your AI client.'),
      });
      return;
    }

    setLoading(true);
    setLoadError(null);
    setActionError(null);

    try {
      const data = await api.oauth.getConsentContext(tx);
      setCtx(data);
      setSelectedScopes((data.requested_scopes || []).map((s) => s.scope));

      if (data.authenticated) {
        const list = data.projects || [];
        setProjects(list);

        const workspaces = data.workspaces || [];
        const defaultWs =
          data.user?.default_workspace_id &&
          workspaces.some((w) => w.id === data.user?.default_workspace_id)
            ? data.user.default_workspace_id
            : workspaces[0]?.id || '';
        setSelectedWorkspaceId(defaultWs);

        const wsProjects = defaultWs
          ? list.filter((p) => !p.workspace_id || p.workspace_id === defaultWs)
          : list;
        const candidatePool = wsProjects.length > 0 ? wsProjects : list;
        const defaultProj =
          candidatePool.find((p) => p.is_default) ||
          (data.user?.default_project_id
            ? candidatePool.find((p) => p.id === data.user?.default_project_id)
            : undefined) ||
          candidatePool[0];
        setSelectedProjectId(defaultProj?.id || '');
        setShowCreateProjectForm(list.length === 0);

        if (data.github_repositories && data.github_repositories.length > 0) {
          const firstUnlinked =
            data.github_repositories.find((r) => !r.project_id) || data.github_repositories[0];
          setSelectedGithubRepoId(firstUnlinked.id);
          const repoShortName = firstUnlinked.full_name.split('/').pop() || firstUnlinked.full_name;
          setNewProjectName((prev) => prev || repoShortName);
          setNewRepoUrl((prev) => prev || firstUnlinked.html_url);
        }
      }
    } catch (err: any) {
      setCtx(null);
      setLoadError({
        message: err?.message || 'Unable to validate this OAuth 2.1 authorization request.',
        requestId: err?.request_id,
      });
    } finally {
      setLoading(false);
    }
  }, [tx, urlError, urlErrorDescription]);

  useEffect(() => {
    loadContext();
  }, [loadContext]);

  const workspaceProjects = useMemo(() => {
    if (!selectedWorkspaceId) return projects;
    return projects.filter((p) => !p.workspace_id || p.workspace_id === selectedWorkspaceId);
  }, [projects, selectedWorkspaceId]);

  const handleWorkspaceChange = (nextWsId: string) => {
    setSelectedWorkspaceId(nextWsId);
    const filtered = nextWsId
      ? projects.filter((p) => !p.workspace_id || p.workspace_id === nextWsId)
      : projects;
    if (filtered.length > 0) {
      const preferred =
        filtered.find((p) => p.is_default) ||
        filtered.find((p) => p.id === ctx?.user?.default_project_id) ||
        filtered[0];
      setSelectedProjectId(preferred.id);
      setShowCreateProjectForm(false);
    } else {
      setSelectedProjectId('');
      setShowCreateProjectForm(true);
    }
  };

  const handleGithubLogin = async () => {
    if (!tx) return;
    setSsoProviderLoading('github');
    setActionError(null);
    try {
      const nextUrl = `/oauth/consent?tx=${encodeURIComponent(tx)}`;
      const returnUrl = `${window.location.origin}/auth/callback/github?next=${encodeURIComponent(nextUrl)}`;
      const res = await api.auth.getGithubAuthUrl({ return_url: returnUrl });
      if (!res?.url) {
        throw new Error('GitHub authorization URL was not returned by the server.');
      }
      window.location.assign(res.url);
    } catch (err: any) {
      setActionError(err?.message || 'Failed to initiate GitHub authentication. Please try again.');
      setSsoProviderLoading(null);
    }
  };

  const handleGoogleLogin = async () => {
    if (!tx) return;
    setSsoProviderLoading('google');
    setActionError(null);
    try {
      const nextUrl = `/oauth/consent?tx=${encodeURIComponent(tx)}`;
      const returnUrl = `${window.location.origin}/auth/callback/google?next=${encodeURIComponent(nextUrl)}`;
      const res = await api.auth.getGoogleAuthUrl({ return_url: returnUrl });
      if (!res?.url) {
        throw new Error('Google authorization URL was not returned by the server.');
      }
      window.location.assign(res.url);
    } catch (err: any) {
      setActionError(err?.message || 'Failed to initiate Google authentication. Please try again.');
      setSsoProviderLoading(null);
    }
  };

  const handleSelectGithubRepo = (repoId: string) => {
    setSelectedGithubRepoId(repoId);
    if (!repoId) return;
    const found = ctx?.github_repositories?.find((r) => r.id === repoId);
    if (found) {
      const shortName = found.full_name.split('/').pop() || found.full_name;
      setNewProjectName(shortName);
      setNewRepoUrl(found.html_url);
    }
  };

  const handleCreateOnboardingProject = async () => {
    if (!newProjectName.trim()) {
      setCreateProjectError('Project name is required to create your workspace project.');
      return;
    }
    setCreatingProject(true);
    setCreateProjectError(null);
    try {
      const created = await api.oauth.createOnboardingProject({
        tx,
        name: newProjectName.trim(),
        workspace_id: selectedWorkspaceId || undefined,
        repository_url: newRepoUrl.trim() || undefined,
        github_repository_id: selectedGithubRepoId || undefined,
        environment: newEnvironment || 'production',
      });
      setProjects((prev) => [created, ...prev]);
      if (created.workspace_id) {
        setSelectedWorkspaceId(created.workspace_id);
      }
      setSelectedProjectId(created.id);
      setSetAsDefault(true);
      setShowCreateProjectForm(false);
    } catch (err: any) {
      setCreateProjectError(
        err?.message || 'Unable to create project. Please verify the repository details and retry.'
      );
    } finally {
      setCreatingProject(false);
    }
  };

  const handleToggleScope = (scopeName: string) => {
    if (scopeName === 'openid') return;
    setSelectedScopes((prev) => {
      if (prev.includes(scopeName)) {
        const next = prev.filter((s) => s !== scopeName);
        return next.length > 0 ? next : prev;
      }
      return [...prev, scopeName];
    });
  };

  const handleApprove = async () => {
    if (!tx) return;
    setSubmittingAction('approve');
    setActionError(null);
    try {
      const res = await api.oauth.approveConsent({
        tx,
        workspace_id: selectedWorkspaceId || null,
        project_id: selectedProjectId || null,
        approved_scopes: selectedScopes,
        set_as_default: setAsDefault,
      });
      if (!res?.redirect_to) {
        throw new Error('Authorization code redirect URI missing from server response.');
      }
      window.location.assign(res.redirect_to);
    } catch (err: any) {
      setActionError(err?.message || 'Failed to approve authorization request. Please try again.');
      setSubmittingAction(null);
    }
  };

  const handleDeny = async () => {
    if (!tx) return;
    setSubmittingAction('deny');
    setActionError(null);
    try {
      const res = await api.oauth.denyConsent({ tx });
      if (res?.redirect_to) {
        window.location.assign(res.redirect_to);
        return;
      }
      window.location.assign('/');
    } catch (err: any) {
      setActionError(err?.message || 'Failed to cancel authorization request.');
      setSubmittingAction(null);
    }
  };

  if (loading) {
    return <ConsentSkeletonCard />;
  }

  // Error State (missing tx, expired tx, invalid tx, network failure)
  if (loadError || !ctx) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#F8FAFC',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px 16px',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '560px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #EAECF0',
            borderRadius: '12px',
            padding: '28px',
            boxShadow: '0 4px 20px rgba(15, 23, 42, 0.05)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <KavachLogo size={26} />
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#DC2626',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: '9999px',
                padding: '4px 10px',
              }}
            >
              Authorization Unavailable
            </span>
          </div>

          <div
            role="alert"
            style={{
              backgroundColor: '#FEF2F2',
              border: '1px solid #FECACA',
              borderRadius: '10px',
              padding: '16px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
            }}
          >
            <AlertCircle size={18} color="#DC2626" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>
                Unable to continue OAuth 2.1 authorization
              </div>
              <p style={{ fontSize: '13px', color: '#475569', marginTop: '4px', lineHeight: 1.5 }}>
                {loadError?.message || 'The authorization transaction is missing, expired, or has already been used.'}
              </p>
              {loadError?.requestId && (
                <div
                  style={{
                    marginTop: '8px',
                    fontSize: '11px',
                    color: '#64748B',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  Request ID: {loadError.requestId}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginTop: '24px' }}>
            <Link
              href="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '42px',
                padding: '0 16px',
                borderRadius: '8px',
                border: '1px solid #E2E8F0',
                backgroundColor: '#FFFFFF',
                color: '#334155',
                fontSize: '14px',
                fontWeight: 600,
              }}
            >
              Return Home
            </Link>
            {tx && (
              <button
                type="button"
                onClick={loadContext}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  height: '42px',
                  padding: '0 18px',
                  borderRadius: '8px',
                  backgroundColor: '#4F46E5',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <RefreshCw size={15} />
                Retry Verification
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const badge = getClientBadgeMeta(ctx.client);
  const redirectHost = formatRedirectHost(ctx.client.redirect_uri);
  const readScopes = (ctx.requested_scopes || []).filter((s) => !isWriteSensitiveScope(s));
  const writeScopes = (ctx.requested_scopes || []).filter((s) => isWriteSensitiveScope(s));
  const effectiveErrorBanner = actionError || ctx.error_message;

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#F8FAFC',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '28px 16px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          backgroundColor: '#FFFFFF',
          border: '1px solid #EAECF0',
          borderRadius: '12px',
          padding: '28px',
          boxShadow: '0 4px 20px rgba(15, 23, 42, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
      >
        {/* Brand Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <KavachLogo size={26} />
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              fontWeight: 600,
              color: '#4F46E5',
              backgroundColor: '#EEF2FF',
              border: '1px solid #C7D2FE',
              borderRadius: '9999px',
              padding: '4px 10px',
            }}
          >
            <ShieldCheck size={13} />
            OAuth 2.1 • PKCE S256
          </span>
        </div>

        {/* Title */}
        <div>
          <h1
            style={{
              fontSize: '20px',
              fontWeight: 700,
              color: '#0F172A',
              letterSpacing: '-0.02em',
              lineHeight: 1.3,
              margin: 0,
            }}
          >
            {ctx.authenticated
              ? `Authorize ${ctx.client.client_name}`
              : `Sign in to Kavach to authorize ${ctx.client.client_name}`}
          </h1>
          <p style={{ fontSize: '13.5px', color: '#475569', marginTop: '6px', lineHeight: 1.5 }}>
            {ctx.authenticated
              ? 'Review the workspace, project scope, and MCP permissions before granting access.'
              : 'Authenticate with your Kavach identity provider to select a project and approve MCP access.'}
          </p>
        </div>

        {/* Inline Error Banner */}
        {effectiveErrorBanner && (
          <div
            role="alert"
            style={{
              backgroundColor: '#FEF2F2',
              border: '1px solid #FECACA',
              borderRadius: '8px',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
            }}
          >
            <AlertCircle size={16} color="#DC2626" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '13px', color: '#991B1B', lineHeight: 1.45 }}>
              {effectiveErrorBanner}
            </div>
          </div>
        )}

        {/* AI Client Trust Card */}
        <div
          style={{
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '10px',
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={16} color="#4F46E5" />
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
                {ctx.client.client_name}
              </span>
            </div>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '11px',
                fontWeight: 600,
                padding: '3px 9px',
                borderRadius: '9999px',
                backgroundColor: badge.bg,
                color: badge.color,
                border: `1px solid ${badge.border}`,
              }}
            >
              {badge.verified && <BadgeCheck size={12} />}
              {badge.label}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#475569' }}>
            <Globe size={13} color="#64748B" />
            <span>Redirect destination:</span>
            <code
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11.5px',
                color: '#0F172A',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '4px',
                padding: '1px 6px',
              }}
            >
              {redirectHost}
            </code>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              fontSize: '12px',
              color: '#059669',
              backgroundColor: '#ECFDF5',
              border: '1px solid #A7F3D0',
              borderRadius: '6px',
              padding: '7px 10px',
            }}
          >
            <Lock size={13} style={{ flexShrink: 0 }} />
            <span>Your Kavach password and personal credentials are never shared with this AI client.</span>
          </div>
        </div>

        {/* UNAUTHENTICATED VIEW: SSO Only (No Password Form) */}
        {!ctx.authenticated && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Compact Permissions Preview */}
            {ctx.requested_scopes && ctx.requested_scopes.length > 0 && (
              <div
                style={{
                  border: '1px solid #EAECF0',
                  borderRadius: '10px',
                  padding: '14px 16px',
                }}
              >
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: '#64748B',
                    marginBottom: '8px',
                  }}
                >
                  Requested Permissions ({ctx.requested_scopes.length})
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {ctx.requested_scopes.map((sc) => (
                    <span
                      key={sc.scope}
                      style={{
                        fontSize: '11.5px',
                        fontWeight: 500,
                        color: isWriteSensitiveScope(sc) ? '#B45309' : '#334155',
                        backgroundColor: isWriteSensitiveScope(sc) ? '#FFFBEB' : '#F1F5F9',
                        border: `1px solid ${isWriteSensitiveScope(sc) ? '#FDE68A' : '#E2E8F0'}`,
                        borderRadius: '6px',
                        padding: '3px 8px',
                      }}
                    >
                      {sc.label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                type="button"
                onClick={handleGithubLogin}
                disabled={ssoProviderLoading !== null || submittingAction !== null}
                style={{
                  width: '100%',
                  height: '46px',
                  borderRadius: '8px',
                  backgroundColor: '#0F172A',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  cursor: ssoProviderLoading ? 'not-allowed' : 'pointer',
                  opacity: ssoProviderLoading && ssoProviderLoading !== 'github' ? 0.6 : 1,
                }}
              >
                {ssoProviderLoading === 'github' ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <GithubIcon size={18} />
                )}
                <span>Continue with GitHub</span>
              </button>

              {ctx.login_providers?.google !== false && (
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={ssoProviderLoading !== null || submittingAction !== null}
                  style={{
                    width: '100%',
                    height: '46px',
                    borderRadius: '8px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    color: '#0F172A',
                    fontSize: '14px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    cursor: ssoProviderLoading ? 'not-allowed' : 'pointer',
                    opacity: ssoProviderLoading && ssoProviderLoading !== 'google' ? 0.6 : 1,
                  }}
                >
                  {ssoProviderLoading === 'google' ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <GoogleIcon size={18} />
                  )}
                  <span>Continue with Google</span>
                </button>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px' }}>
              <span style={{ fontSize: '12px', color: '#64748B' }}>
                Single Kavach account sign-in
              </span>
              <button
                type="button"
                onClick={handleDeny}
                disabled={submittingAction !== null || ssoProviderLoading !== null}
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#64748B',
                  cursor: 'pointer',
                  padding: '6px 10px',
                  borderRadius: '6px',
                }}
              >
                {submittingAction === 'deny' ? 'Cancelling...' : 'Deny / Cancel'}
              </button>
            </div>
          </div>
        )}

        {/* AUTHENTICATED VIEW: Account + Workspace + Project + Scopes */}
        {ctx.authenticated && ctx.user && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Signed-in Account & Workspace Selector */}
            <div
              style={{
                border: '1px solid #EAECF0',
                borderRadius: '10px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <div
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '9999px',
                      backgroundColor: '#EEF2FF',
                      color: '#4F46E5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '13px',
                      flexShrink: 0,
                    }}
                  >
                    {(ctx.user.name || ctx.user.email || 'U').slice(0, 1).toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ctx.user.name || ctx.user.email}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ctx.user.email}
                    </div>
                  </div>
                </div>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#059669',
                    backgroundColor: '#ECFDF5',
                    border: '1px solid #A7F3D0',
                    borderRadius: '9999px',
                    padding: '3px 9px',
                    flexShrink: 0,
                  }}
                >
                  <UserCheck size={12} />
                  Signed In
                </span>
              </div>

              {/* Workspace Selector */}
              {ctx.workspaces && ctx.workspaces.length > 0 && (
                <div>
                  <label
                    htmlFor="consent-workspace"
                    style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}
                  >
                    Authorized Workspace
                  </label>
                  <select
                    id="consent-workspace"
                    value={selectedWorkspaceId}
                    onChange={(e) => handleWorkspaceChange(e.target.value)}
                    style={{
                      width: '100%',
                      height: '42px',
                      padding: '0 12px',
                      fontSize: '13.5px',
                      color: '#0F172A',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      borderRadius: '8px',
                    }}
                  >
                    {ctx.workspaces.map((ws) => (
                      <option key={ws.id} value={ws.id}>
                        {ws.name} {ws.workspace_type ? `(${ws.workspace_type})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Project Access Selector OR Inline Onboarding */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label
                    htmlFor="consent-project"
                    style={{ fontSize: '12.5px', fontWeight: 600, color: '#334155' }}
                  >
                    Project Access Scope
                  </label>
                  {projects.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowCreateProjectForm((prev) => !prev)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#4F46E5',
                        cursor: 'pointer',
                      }}
                    >
                      <Plus size={13} />
                      {showCreateProjectForm ? 'Choose existing project' : 'Create new project'}
                    </button>
                  )}
                </div>

                {!showCreateProjectForm && workspaceProjects.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <select
                      id="consent-project"
                      value={selectedProjectId}
                      onChange={(e) => setSelectedProjectId(e.target.value)}
                      style={{
                        width: '100%',
                        height: '42px',
                        padding: '0 12px',
                        fontSize: '13.5px',
                        color: '#0F172A',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #CBD5E1',
                        borderRadius: '8px',
                      }}
                    >
                      {workspaceProjects.map((proj) => (
                        <option key={proj.id} value={proj.id}>
                          {proj.name}
                          {proj.is_default ? ' (Default)' : ''}
                          {proj.environment ? ` • ${proj.environment}` : ''}
                        </option>
                      ))}
                    </select>

                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '12.5px',
                        color: '#475569',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={setAsDefault}
                        onChange={(e) => setSetAsDefault(e.target.checked)}
                        style={{
                          width: '16px',
                          height: '16px',
                          minHeight: '16px',
                          accentColor: '#4F46E5',
                          cursor: 'pointer',
                        }}
                      />
                      <span>Set as my default Kavach project for MCP clients</span>
                    </label>
                  </div>
                ) : (
                  /* Inline Onboarding Form */
                  <div
                    style={{
                      backgroundColor: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                      padding: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FolderGit2 size={15} color="#4F46E5" />
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                        Onboarding: Create Project / Connect Repository
                      </span>
                    </div>
                    <p style={{ fontSize: '12px', color: '#475569', margin: 0, lineHeight: 1.45 }}>
                      {projects.length === 0
                        ? 'You have no projects in this workspace yet. Create a project or link a repository to scope this AI client.'
                        : 'Create a project inside the selected workspace and bind it to this MCP connection.'}
                    </p>

                    {createProjectError && (
                      <div
                        style={{
                          backgroundColor: '#FEF2F2',
                          border: '1px solid #FECACA',
                          borderRadius: '6px',
                          padding: '8px 10px',
                          fontSize: '12px',
                          color: '#DC2626',
                        }}
                      >
                        {createProjectError}
                      </div>
                    )}

                    {ctx.github_repositories && ctx.github_repositories.length > 0 && (
                      <div>
                        <label
                          htmlFor="onboarding-gh-repo"
                          style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}
                        >
                          Connected GitHub Repository (Optional)
                        </label>
                        <select
                          id="onboarding-gh-repo"
                          value={selectedGithubRepoId}
                          onChange={(e) => handleSelectGithubRepo(e.target.value)}
                          style={{
                            width: '100%',
                            height: '40px',
                            padding: '0 10px',
                            fontSize: '13px',
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #CBD5E1',
                            borderRadius: '6px',
                            color: '#0F172A',
                          }}
                        >
                          <option value="">Manual repository entry</option>
                          {ctx.github_repositories.map((repo) => (
                            <option key={repo.id} value={repo.id}>
                              {repo.full_name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div>
                      <label
                        htmlFor="onboarding-project-name"
                        style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}
                      >
                        Project Name
                      </label>
                      <input
                        id="onboarding-project-name"
                        type="text"
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        placeholder="e.g. payments-api"
                        style={{
                          width: '100%',
                          height: '40px',
                          padding: '0 10px',
                          fontSize: '13px',
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #CBD5E1',
                          borderRadius: '6px',
                          color: '#0F172A',
                        }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '8px' }}>
                      <div>
                        <label
                          htmlFor="onboarding-repo-url"
                          style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}
                        >
                          GitHub Repo URL (Optional)
                        </label>
                        <input
                          id="onboarding-repo-url"
                          type="url"
                          value={newRepoUrl}
                          onChange={(e) => setNewRepoUrl(e.target.value)}
                          placeholder="https://github.com/org/repo"
                          style={{
                            width: '100%',
                            height: '40px',
                            padding: '0 10px',
                            fontSize: '13px',
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #CBD5E1',
                            borderRadius: '6px',
                            color: '#0F172A',
                          }}
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="onboarding-env"
                          style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}
                        >
                          Environment
                        </label>
                        <select
                          id="onboarding-env"
                          value={newEnvironment}
                          onChange={(e) => setNewEnvironment(e.target.value)}
                          style={{
                            width: '100%',
                            height: '40px',
                            padding: '0 10px',
                            fontSize: '13px',
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #CBD5E1',
                            borderRadius: '6px',
                            color: '#0F172A',
                          }}
                        >
                          <option value="production">production</option>
                          <option value="staging">staging</option>
                          <option value="development">development</option>
                        </select>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleCreateOnboardingProject}
                      disabled={creatingProject || !newProjectName.trim()}
                      style={{
                        height: '40px',
                        padding: '0 14px',
                        borderRadius: '8px',
                        backgroundColor: '#0F172A',
                        color: '#FFFFFF',
                        fontSize: '13px',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        cursor: creatingProject || !newProjectName.trim() ? 'not-allowed' : 'pointer',
                        opacity: creatingProject || !newProjectName.trim() ? 0.6 : 1,
                      }}
                    >
                      {creatingProject ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                      <span>{creatingProject ? 'Creating Project...' : 'Create Project & Select'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Requested Permissions Breakdown */}
            <div
              style={{
                border: '1px solid #EAECF0',
                borderRadius: '10px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                Requested Permissions
              </div>

              {readScopes.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: '#64748B',
                    }}
                  >
                    Read-Only &amp; Identity Access
                  </div>
                  {readScopes.map((sc) => {
                    const checked = selectedScopes.includes(sc.scope);
                    const locked = sc.scope === 'openid';
                    return (
                      <label
                        key={sc.scope}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '10px',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          backgroundColor: '#F8FAFC',
                          border: '1px solid #E2E8F0',
                          cursor: locked ? 'default' : 'pointer',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={locked}
                          onChange={() => handleToggleScope(sc.scope)}
                          style={{
                            width: '16px',
                            height: '16px',
                            minHeight: '16px',
                            marginTop: '2px',
                            accentColor: '#4F46E5',
                          }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                              {sc.label}
                            </span>
                            <code style={{ fontSize: '11px', color: '#475569', fontFamily: 'var(--font-mono)' }}>
                              {sc.scope}
                            </code>
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px', lineHeight: 1.4 }}>
                            {sc.description}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}

              {writeScopes.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: '#B45309',
                    }}
                  >
                    Write &amp; Sensitive Execution Permissions
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      backgroundColor: '#FFFBEB',
                      border: '1px solid #FDE68A',
                      fontSize: '12px',
                      color: '#92400E',
                      lineHeight: 1.45,
                    }}
                  >
                    <ShieldAlert size={15} color="#B45309" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span>
                      Enforced by deterministic OPA policies. Sensitive remediation &amp; production actions require explicit policy clearance and human approval.
                    </span>
                  </div>

                  {writeScopes.map((sc) => {
                    const checked = selectedScopes.includes(sc.scope);
                    return (
                      <label
                        key={sc.scope}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '10px',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #E2E8F0',
                          cursor: 'pointer',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleToggleScope(sc.scope)}
                          style={{
                            width: '16px',
                            height: '16px',
                            minHeight: '16px',
                            marginTop: '2px',
                            accentColor: '#4F46E5',
                          }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                              {sc.label}
                            </span>
                            <code style={{ fontSize: '11px', color: '#B45309', fontFamily: 'var(--font-mono)' }}>
                              {sc.scope}
                            </code>
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px', lineHeight: 1.4 }}>
                            {sc.description}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer Action Buttons (Never HTML <form action=...>) */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', paddingTop: '4px' }}>
              <button
                type="button"
                onClick={handleDeny}
                disabled={submittingAction !== null}
                style={{
                  height: '44px',
                  padding: '0 18px',
                  borderRadius: '8px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  color: '#334155',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: submittingAction ? 'not-allowed' : 'pointer',
                }}
              >
                {submittingAction === 'deny' ? 'Denying...' : 'Deny / Cancel'}
              </button>

              <button
                type="button"
                onClick={handleApprove}
                disabled={submittingAction !== null || !selectedProjectId}
                style={{
                  flex: 1,
                  height: '44px',
                  padding: '0 20px',
                  borderRadius: '8px',
                  backgroundColor: '#4F46E5',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: submittingAction !== null || !selectedProjectId ? 'not-allowed' : 'pointer',
                  opacity: submittingAction !== null || !selectedProjectId ? 0.6 : 1,
                }}
              >
                {submittingAction === 'approve' ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Authorizing Client...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Approve Access</span>
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function OAuthConsentPage() {
  return (
    <Suspense fallback={<ConsentSkeletonCard />}>
      <ConsentContent />
    </Suspense>
  );
}
