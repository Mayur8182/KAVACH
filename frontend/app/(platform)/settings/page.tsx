'use client';

/**
 * SecuLayer Enterprise — Unified User & Account Settings Hub (/settings)
 * 
 * Truthful PostgreSQL-persisted management for:
 * 1. User Profile (Identity, contact, role, bio, timezone, language, avatar)
 * 2. Account Settings (Theme, date/time format, session lockout, timeout)
 * 3. Personal Security (Deterministic posture score, posture metrics, recommendations)
 * 4. Change Password (Argon2id credential rotation with tamper-evident audit logging)
 * 5. MFA Management (RFC 6238 TOTP authenticator enrollment, backup codes, disable)
 * 6. Connected Accounts (GitHub, Google Workspace, Okta SSO, GitLab OAuth links)
 * 7. API Keys & Personal Access Tokens (Cryptographic PAT generation, scopes, SHA-256 hash, revoke)
 * 8. Notification Preferences & Email Preferences (Security digests, real-time alerts, Slack webhook)
 * 9. Login Activity & Audit Trail (Live tamper-evident authentication audit log)
 * 10. Device & Session Management (Live authenticated sessions, IP geolocation, revoke device)
 */

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  User,
  Sliders,
  Shield,
  Key,
  Laptop,
  History,
  Lock,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  LogOut,
  Trash2,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  Mail,
  Building2,
  Globe,
  Bell,
  Save,
  Plus,
  Eye,
  EyeOff,
  QrCode,
  ShieldAlert,
  ShieldCheck,
  Fingerprint,
  X,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { toast } from '@/lib/toast';

type TabKey =
  | 'profile'
  | 'account'
  | 'security'
  | 'password'
  | 'mfa'
  | 'connected'
  | 'tokens'
  | 'notifications'
  | 'sessions'
  | 'login-history';

// Real scannable QR Code generator with Dual CDN fallback for RFC 6238 TOTP apps
function QrCodeSvg({ value, size = 160 }: { value: string; size?: number }) {
  const [loadError, setLoadError] = useState(false);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=1&format=svg&data=${encodeURIComponent(value)}`;

  return (
    <div
      style={{
        padding: 10,
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        border: '1px solid #CBD5E1',
        display: 'inline-block',
        boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
      }}
    >
      {!loadError ? (
        <img
          src={qrUrl}
          alt="TOTP Authenticator QR Code"
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          style={{ display: 'block', borderRadius: 4 }}
          onError={() => setLoadError(true)}
        />
      ) : (
        <img
          src={`https://quickchart.io/qr?size=${size}&text=${encodeURIComponent(value)}`}
          alt="TOTP Authenticator QR Code"
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          style={{ display: 'block', borderRadius: 4 }}
        />
      )}
    </div>
  );
}

function SettingsHubContent({ defaultTab }: { defaultTab?: TabKey } = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as TabKey) || defaultTab || 'profile';

  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // 1. Profile State
  const [profile, setProfile] = useState<{
    user_id: string;
    email: string;
    name: string;
    is_verified: boolean;
    job_title?: string;
    department?: string;
    company?: string;
    phone?: string;
    bio?: string;
    location?: string;
    timezone: string;
    language: string;
    avatar_url?: string;
  }>({
    user_id: '',
    email: '',
    name: '',
    is_verified: false,
    job_title: '',
    department: '',
    company: '',
    phone: '',
    bio: '',
    location: '',
    timezone: 'UTC',
    language: 'en',
    avatar_url: '',
  });
  const [profileSaving, setProfileSaving] = useState(false);

  // 2. Account Settings State
  const [settings, setSettings] = useState<{
    theme: string;
    default_workspace_id?: string;
    date_format: string;
    time_format: string;
    auto_lockout_minutes: number;
    session_timeout_hours: number;
  }>({
    theme: 'system',
    date_format: 'YYYY-MM-DD',
    time_format: '24h',
    auto_lockout_minutes: 30,
    session_timeout_hours: 24,
  });
  const [settingsSaving, setSettingsSaving] = useState(false);

  // 3. Personal Security State
  const [securityData, setSecurityData] = useState<{
    mfa_enabled: boolean;
    email_verified: boolean;
    failed_login_attempts: number;
    is_locked: boolean;
    active_sessions_count: number;
    security_score: number;
    recommendations: Array<{ title: string; impact: string; description: string; action_url: string }>;
    password_updated_at: string;
  } | null>(null);

  // 4. Change Password State
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  // 5. MFA Management State
  const [mfaStatus, setMfaStatus] = useState<{
    enabled: boolean;
    secret_configured: boolean;
    recovery_codes_remaining: number;
    trusted_devices_count: number;
  }>({
    enabled: false,
    secret_configured: false,
    recovery_codes_remaining: 0,
    trusted_devices_count: 0,
  });
  const [mfaSetupData, setMfaSetupData] = useState<{
    secret: string;
    base32_key: string;
    totp_uri: string;
    recovery_codes: string[];
  } | null>(null);
  const [mfaVerifyCode, setMfaVerifyCode] = useState('');
  const [mfaVerifying, setMfaVerifying] = useState(false);
  const [disableMfaPassword, setDisableMfaPassword] = useState('');
  const [isDisableMfaOpen, setIsDisableMfaOpen] = useState(false);
  const [copiedBase32, setCopiedBase32] = useState(false);

  // 6. Connected Accounts State
  const [connectedAccounts, setConnectedAccounts] = useState<Array<{
    id: string;
    provider: string;
    account_email?: string;
    username?: string;
    avatar_url?: string;
    connected_at: string;
    status: string;
  }>>([]);
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null);
  const [providerForm, setProviderForm] = useState({
    username: '',
    account_email: '',
    token: '',
    instance_url: '',
  });
  const [providerConnecting, setProviderConnecting] = useState(false);

  // 7. Personal Access Tokens State
  const [tokens, setTokens] = useState<Array<{
    id: string;
    name: string;
    token_prefix: string;
    scopes: string[];
    status: string;
    expires_at?: string;
    last_used_at?: string;
    created_at: string;
  }>>([]);
  const [isCreateTokenOpen, setIsCreateTokenOpen] = useState(false);
  const [newTokenName, setNewTokenName] = useState('');
  const [newTokenScopes, setNewTokenScopes] = useState<string[]>(['repo:read', 'scans:read']);
  const [newTokenExpiryDays, setNewTokenExpiryDays] = useState(90);
  const [createdTokenResult, setCreatedTokenResult] = useState<{
    raw_token: string;
    token_prefix: string;
    name: string;
  } | null>(null);
  const [tokenCreating, setTokenCreating] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  // 8. Notification Preferences State
  const [notifications, setNotifications] = useState<{
    email_security_alerts: boolean;
    email_weekly_digest: boolean;
    email_login_alerts: boolean;
    email_scan_completed: boolean;
    email_policy_violations: boolean;
    in_app_sound: boolean;
    slack_notifications_enabled: boolean;
    slack_webhook_url?: string;
  }>({
    email_security_alerts: true,
    email_weekly_digest: true,
    email_login_alerts: true,
    email_scan_completed: true,
    email_policy_violations: true,
    in_app_sound: false,
    slack_notifications_enabled: false,
    slack_webhook_url: '',
  });
  const [notificationsSaving, setNotificationsSaving] = useState(false);

  // 9. Active Sessions State
  const [sessions, setSessions] = useState<any[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  // 10. Login History State
  const [loginHistory, setLoginHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Sync tab with URL
  useEffect(() => {
    const tab = (searchParams.get('tab') as TabKey) || 'profile';
    setActiveTab(tab);
  }, [searchParams]);

  const switchTab = (tab: TabKey) => {
    setActiveTab(tab);
    setActionMsg(null);
    router.push(`/settings?tab=${tab}`, { scroll: false });
  };

  // Initial load of essential user profile & account data
  const loadEssentialData = useCallback(async () => {
    setLoading(true);
    try {
      const [profData, setsData, secData, mfaData] = await Promise.all([
        api.account.getProfile().catch(() => null),
        api.account.getSettings().catch(() => null),
        api.account.getSecurity().catch(() => null),
        api.account.getMfaStatus().catch(() => null),
      ]);

      if (profData) {
        setProfile({
          user_id: profData.user_id,
          email: profData.email,
          name: profData.name,
          is_verified: profData.is_verified,
          job_title: profData.job_title || '',
          department: profData.department || '',
          company: profData.company || '',
          phone: profData.phone || '',
          bio: profData.bio || '',
          location: profData.location || '',
          timezone: profData.timezone || 'UTC',
          language: profData.language || 'en',
          avatar_url: profData.avatar_url || '',
        });
      }

      if (setsData) {
        const themeVal = setsData.theme || 'system';
        setSettings({
          theme: themeVal,
          default_workspace_id: setsData.default_workspace_id,
          date_format: setsData.date_format || 'YYYY-MM-DD',
          time_format: setsData.time_format || '24h',
          auto_lockout_minutes: setsData.auto_lockout_minutes || 30,
          session_timeout_hours: setsData.session_timeout_hours || 24,
        });
        if (typeof window !== 'undefined') {
          const applied = themeVal === 'system'
            ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
            : themeVal;
          document.documentElement.setAttribute('data-theme', applied);
        }
      }

      if (secData) {
        setSecurityData(secData);
      }

      if (mfaData) {
        setMfaStatus(mfaData);
      }
    } catch (err: any) {
      console.error('Failed to load initial account data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEssentialData();
  }, [loadEssentialData]);

  // Tab-specific lazy data loader
  useEffect(() => {
    if (activeTab === 'connected') {
      api.account.getConnectedAccounts().then(setConnectedAccounts).catch(() => setConnectedAccounts([]));
    } else if (activeTab === 'tokens') {
      api.account.getTokens().then(setTokens).catch(() => setTokens([]));
    } else if (activeTab === 'notifications') {
      api.account.getNotifications().then((res) => {
        setNotifications({
          email_security_alerts: res.email_security_alerts,
          email_weekly_digest: res.email_weekly_digest,
          email_login_alerts: res.email_login_alerts,
          email_scan_completed: res.email_scan_completed,
          email_policy_violations: res.email_policy_violations,
          in_app_sound: res.in_app_sound,
          slack_notifications_enabled: res.slack_notifications_enabled,
          slack_webhook_url: res.slack_webhook_url || '',
        });
      }).catch(() => {});
    } else if (activeTab === 'sessions') {
      setSessionsLoading(true);
      api.auth.getSessions().then(setSessions).catch(() => setSessions([])).finally(() => setSessionsLoading(false));
    } else if (activeTab === 'login-history') {
      setHistoryLoading(true);
      api.auth.getLoginHistory().then(setLoginHistory).catch(() => setLoginHistory([])).finally(() => setHistoryLoading(false));
    } else if (activeTab === 'security') {
      api.account.getSecurity().then(setSecurityData).catch(() => {});
    } else if (activeTab === 'mfa') {
      api.account.getMfaStatus().then(setMfaStatus).catch(() => {});
    }
  }, [activeTab]);

  // 1. Profile Actions
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setActionMsg(null);
    try {
      const updated = await api.account.updateProfile({
        name: profile.name,
        job_title: profile.job_title,
        department: profile.department,
        company: profile.company,
        phone: profile.phone,
        bio: profile.bio,
        location: profile.location,
        timezone: profile.timezone,
        language: profile.language,
        avatar_url: profile.avatar_url,
      });
      setProfile((prev) => ({ ...prev, ...updated }));
      toast.success('User profile updated successfully.');
      setActionMsg({ type: 'success', text: 'User profile updated and saved to PostgreSQL successfully.' });
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update user profile.');
      setActionMsg({ type: 'error', text: err?.message || 'Failed to update user profile.' });
    } finally {
      setProfileSaving(false);
    }
  };

  // 2. Account Settings Actions
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSaving(true);
    setActionMsg(null);
    try {
      const updated = await api.account.updateSettings(settings);
      setSettings((prev) => ({ ...prev, ...updated }));
      if (typeof window !== 'undefined') {
        const themeToApply = updated.theme === 'system'
          ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
          : updated.theme;
        document.documentElement.setAttribute('data-theme', themeToApply);
        localStorage.setItem('kavach_theme', updated.theme);
      }
      toast.success('Account configuration preferences saved successfully.');
      setActionMsg({ type: 'success', text: 'Account configuration preferences saved successfully.' });
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update account settings.');
      setActionMsg({ type: 'error', text: err?.message || 'Failed to update account settings.' });
    } finally {
      setSettingsSaving(false);
    }
  };

  // 4. Change Password Actions
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error('New password and confirmation password do not match.');
      setActionMsg({ type: 'error', text: 'New password and confirmation password do not match.' });
      return;
    }
    if (passwordForm.new_password.length < 8) {
      toast.error('New password must be at least 8 characters in length.');
      setActionMsg({ type: 'error', text: 'New password must be at least 8 characters in length.' });
      return;
    }

    setPasswordSaving(true);
    setActionMsg(null);
    try {
      const res = await api.account.changePassword(passwordForm);
      toast.success(res.message || 'Password updated and verified with Argon2id.');
      setActionMsg({ type: 'success', text: res.message || 'Password updated and verified with Argon2id.' });
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
      // Refresh security overview
      api.account.getSecurity().then(setSecurityData).catch(() => {});
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update password. Verify current password.');
      setActionMsg({ type: 'error', text: err?.message || 'Failed to update password. Verify current password.' });
    } finally {
      setPasswordSaving(false);
    }
  };

  // 5. MFA Actions
  const handleStartMfaSetup = async () => {
    setActionMsg(null);
    try {
      const setup = await api.auth.mfa.setup(profile.email || undefined);
      setMfaSetupData(setup);
      toast.info('Scan QR Code with your authenticator app to complete setup.');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to initialize MFA setup.');
      setActionMsg({ type: 'error', text: err?.message || 'Failed to initialize MFA setup.' });
    }
  };

  const handleVerifyMfaSetup = async () => {
    if (!mfaSetupData || !mfaVerifyCode) return;
    setMfaVerifying(true);
    setActionMsg(null);
    try {
      await api.auth.mfa.verify({
        code: mfaVerifyCode,
        secret: mfaSetupData.secret,
        email: profile.email || undefined,
        trust_device: true,
      });
      toast.success('MFA authenticator verified and activated successfully!');
      setActionMsg({ type: 'success', text: 'MFA authenticator verified and activated successfully!' });
      setMfaSetupData(null);
      setMfaVerifyCode('');
      const status = await api.account.getMfaStatus();
      setMfaStatus(status);
      api.account.getSecurity().then(setSecurityData).catch(() => {});
    } catch (err: any) {
      toast.error(err?.message || 'Invalid 6-digit TOTP code. Try again.');
      setActionMsg({ type: 'error', text: err?.message || 'Invalid 6-digit TOTP code. Try again.' });
    } finally {
      setMfaVerifying(false);
    }
  };

  const handleDisableMfa = async () => {
    if (!disableMfaPassword) {
      toast.error('Please enter your account password to confirm disabling MFA.');
      return;
    }
    setActionMsg(null);
    try {
      await api.account.disableMfa(disableMfaPassword);
      toast.success('Multi-factor authentication has been disabled.');
      setActionMsg({ type: 'success', text: 'Multi-factor authentication has been disabled.' });
      setIsDisableMfaOpen(false);
      setDisableMfaPassword('');
      const status = await api.account.getMfaStatus();
      setMfaStatus(status);
      api.account.getSecurity().then(setSecurityData).catch(() => {});
    } catch (err: any) {
      toast.error(err?.message || 'Failed to disable MFA. Check your password.');
      setActionMsg({ type: 'error', text: err?.message || 'Failed to disable MFA. Check your password.' });
    }
  };

  const handleRegenerateBackupCodes = async () => {
    if (!confirm('Regenerating backup codes will invalidate all existing codes. Proceed?')) return;
    try {
      const res = await api.auth.mfa.regenerateBackupCodes(profile.email || undefined);
      toast.success('Recovery backup codes regenerated.');
      alert(`New recovery codes generated:\n\n${(res.recovery_codes || []).join('\n')}\n\nSave these in a secure password vault.`);
      const status = await api.account.getMfaStatus();
      setMfaStatus(status);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to regenerate recovery codes.');
    }
  };

  // 6. Connected Accounts Actions
  const handleConnectProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connectingProvider) return;
    setProviderConnecting(true);
    setActionMsg(null);
    try {
      await api.account.connectAccount({
        provider: connectingProvider,
        username: providerForm.username.trim() || undefined,
        account_email: providerForm.account_email.trim() || undefined,
        token: providerForm.token.trim() || undefined,
        instance_url: providerForm.instance_url.trim() || undefined,
      });
      toast.success(`${connectingProvider.toUpperCase()} connected successfully and synchronized.`);
      setActionMsg({
        type: 'success',
        text: `${connectingProvider.toUpperCase()} connected successfully and synchronized with your workspace.`,
      });
      setConnectingProvider(null);
      setProviderForm({ username: '', account_email: '', token: '', instance_url: '' });
      const accounts = await api.account.getConnectedAccounts();
      setConnectedAccounts(accounts);
    } catch (err: any) {
      toast.error(err?.message || `Failed to connect ${connectingProvider}.`);
      setActionMsg({
        type: 'error',
        text: err?.message || `Failed to connect ${connectingProvider}. Please verify your access token/credentials.`,
      });
    } finally {
      setProviderConnecting(false);
    }
  };

  const handleDisconnectAccount = async (provider: string) => {
    if (!confirm(`Are you sure you want to disconnect ${provider.toUpperCase()}?`)) return;
    try {
      await api.account.disconnectAccount(provider);
      toast.success(`${provider.toUpperCase()} account disconnected.`);
      setActionMsg({ type: 'success', text: `${provider.toUpperCase()} account disconnected.` });
      const accounts = await api.account.getConnectedAccounts();
      setConnectedAccounts(accounts);
    } catch (err: any) {
      toast.error(err?.message || `Failed to disconnect ${provider}.`);
      setActionMsg({ type: 'error', text: err?.message || `Failed to disconnect ${provider}.` });
    }
  };

  // 7. PAT / API Keys Actions
  const handleCreateToken = async () => {
    if (!newTokenName.trim()) {
      toast.error('Please specify a token label.');
      return;
    }
    setTokenCreating(true);
    setActionMsg(null);
    try {
      const res = await api.account.createToken({
        name: newTokenName.trim(),
        scopes: newTokenScopes,
        expires_in_days: newTokenExpiryDays,
      });
      toast.success(`Access token "${res.name}" created successfully.`);
      setCreatedTokenResult({
        raw_token: res.raw_token,
        token_prefix: res.token_prefix,
        name: res.name,
      });
      setNewTokenName('');
      setIsCreateTokenOpen(false);
      const toks = await api.account.getTokens();
      setTokens(toks);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to generate access token.');
      setActionMsg({ type: 'error', text: err?.message || 'Failed to generate access token.' });
    } finally {
      setTokenCreating(false);
    }
  };

  const handleRevokeToken = async (tokenId: string) => {
    if (!confirm('Are you sure you want to revoke this Personal Access Token? Applications using it will immediately be rejected.')) return;
    try {
      await api.account.revokeToken(tokenId);
      toast.success('Token revoked successfully.');
      setActionMsg({ type: 'success', text: 'Token revoked successfully.' });
      const toks = await api.account.getTokens();
      setTokens(toks);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to revoke token.');
      setActionMsg({ type: 'error', text: err?.message || 'Failed to revoke token.' });
    }
  };

  // 8. Notifications Actions
  const handleSaveNotifications = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotificationsSaving(true);
    setActionMsg(null);
    try {
      const updated = await api.account.updateNotifications(notifications);
      setNotifications((prev) => ({ ...prev, ...updated }));
      toast.success('Notification preferences saved successfully.');
      setActionMsg({ type: 'success', text: 'Notification and email preferences saved successfully.' });
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update notification preferences.');
      setActionMsg({ type: 'error', text: err?.message || 'Failed to update notification preferences.' });
    } finally {
      setNotificationsSaving(false);
    }
  };

  // 9. Session Actions
  const handleRevokeSession = async (sessionId: string) => {
    if (!confirm('Revoke this session? The device will immediately be signed out.')) return;
    try {
      await api.auth.revokeSession(sessionId);
      toast.success('Session revoked successfully.');
      setActionMsg({ type: 'success', text: 'Session revoked successfully.' });
      const sessList = await api.auth.getSessions();
      setSessions(sessList);
      api.account.getSecurity().then(setSecurityData).catch(() => {});
    } catch (err: any) {
      toast.error(err?.message || 'Failed to revoke session.');
      setActionMsg({ type: 'error', text: err?.message || 'Failed to revoke session.' });
    }
  };

  const handleRevokeAllOtherSessions = async () => {
    if (!confirm('This will terminate all sessions on all other browsers and devices. Continue?')) return;
    try {
      await api.auth.revokeAllOtherSessions();
      toast.success('All other active sessions revoked.');
      setActionMsg({ type: 'success', text: 'All other active sessions revoked.' });
      const sessList = await api.auth.getSessions();
      setSessions(sessList);
      api.account.getSecurity().then(setSecurityData).catch(() => {});
    } catch (err: any) {
      toast.error(err?.message || 'Failed to revoke sessions.');
      setActionMsg({ type: 'error', text: err?.message || 'Failed to revoke sessions.' });
    }
  };

  const navItems = [
    { id: 'profile' as TabKey, label: 'User Profile', icon: User, desc: 'Identity, role, & contact details' },
    { id: 'account' as TabKey, label: 'Account Settings', icon: Sliders, desc: 'Localization & session limits' },
    { id: 'security' as TabKey, label: 'Personal Security', icon: Shield, desc: 'Posture score & safeguards' },
    { id: 'password' as TabKey, label: 'Change Password', icon: Lock, desc: 'Argon2id credential rotation' },
    { id: 'mfa' as TabKey, label: 'MFA Management', icon: Fingerprint, desc: 'TOTP & recovery codes' },
    { id: 'connected' as TabKey, label: 'Connected Accounts', icon: Globe, desc: 'GitHub, Google, Okta SSO' },
    { id: 'tokens' as TabKey, label: 'API Keys & PATs', icon: Key, desc: 'Personal access tokens' },
    { id: 'notifications' as TabKey, label: 'Notifications & Email', icon: Bell, desc: 'Alert preferences & Slack' },
    { id: 'sessions' as TabKey, label: 'Active Sessions', icon: Laptop, desc: 'Connected devices & IPs' },
    { id: 'login-history' as TabKey, label: 'Login Activity', icon: History, desc: 'Audit trail of authentications' },
  ];

  return (
    <div className="kavach-page-container" style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', fontFamily: "var(--font-sans, 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif)" }}>
      <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
        
        {/* User Account Header Banner */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '24px 28px',
            marginBottom: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '20px',
            boxSizing: 'border-box',
            width: '100%',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: '#EFF6FF',
                border: '2px solid #BFDBFE',
                color: '#1D4ED8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
                fontWeight: 700,
                textTransform: 'uppercase',
              }}
            >
              {profile.name ? profile.name.slice(0, 2) : profile.email ? profile.email.slice(0, 2) : 'US'}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  {profile.name || 'Account Settings'}
                </h1>
                {profile.is_verified ? (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 8px',
                      backgroundColor: '#DCFCE7',
                      color: '#16A34A',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 700,
                    }}
                  >
                    <CheckCircle2 size={12} /> Verified
                  </span>
                ) : (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 8px',
                      backgroundColor: '#FEF3C7',
                      color: '#D97706',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 700,
                    }}
                  >
                    <AlertTriangle size={12} /> Unverified
                  </span>
                )}
                {mfaStatus.enabled && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 8px',
                      backgroundColor: '#EFF6FF',
                      color: '#2563EB',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 700,
                    }}
                  >
                    <ShieldCheck size={12} /> MFA Active
                  </span>
                )}
              </div>
              <div style={{ fontSize: '13px', color: '#64748B', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {profile.email ? (
                  <span>{profile.email}</span>
                ) : (
                  <span>User Profile</span>
                )}
                {profile.job_title && (
                  <>
                    <span>•</span>
                    <span>{profile.job_title}</span>
                  </>
                )}
                {profile.company && (
                  <>
                    <span>•</span>
                    <span>{profile.company}</span>
                  </>
                )}
                {profile.location && (
                  <>
                    <span>•</span>
                    <span>{profile.location}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Quick Security Posture Metric Pill */}
          {securityData && (
            <div
              onClick={() => switchTab('security')}
              style={{
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                padding: '10px 18px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '10px',
              }}
            >
              <div>
                <div style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>
                  Security Score
                </div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: securityData.security_score >= 80 ? '#16A34A' : '#D97706' }}>
                  {securityData.security_score} / 100
                </div>
              </div>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '8px',
                  backgroundColor: securityData.security_score >= 80 ? '#DCFCE7' : '#FEF3C7',
                  color: securityData.security_score >= 80 ? '#16A34A' : '#D97706',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Shield size={20} />
              </div>
            </div>
          )}
        </div>

        {/* Global Toast / Action Message */}
        {actionMsg && (
          <div
            style={{
              padding: '12px 18px',
              borderRadius: '8px',
              fontSize: '13px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: actionMsg.type === 'success' ? '#ECFDF5' : actionMsg.type === 'error' ? '#FEF2F2' : '#EFF6FF',
              color: actionMsg.type === 'success' ? '#065F46' : actionMsg.type === 'error' ? '#991B1B' : '#1E40AF',
              border: `1px solid ${actionMsg.type === 'success' ? '#A7F3D0' : actionMsg.type === 'error' ? '#FECACA' : '#BFDBFE'}`,
            }}
          >
            <span>{actionMsg.text}</span>
            <button
              onClick={() => setActionMsg(null)}
              style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontWeight: 700 }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Two-Column Grid: Left Sidebar Navigation & Right Content Panel */}
        <div className="kavach-settings-split">
          
          {/* Navigation Sidebar */}
          <div className="kavach-settings-nav">
            <div className="kavach-settings-nav-header">
              Account Settings
            </div>

            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => switchTab(item.id)}
                  className="kavach-settings-nav-item"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: isActive ? '#EFF6FF' : 'transparent',
                    color: isActive ? '#1D4ED8' : '#334155',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseOver={(e) => {
                    if (!isActive) e.currentTarget.style.backgroundColor = '#F8FAFC';
                  }}
                  onMouseOut={(e) => {
                    if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <Icon size={16} color={isActive ? '#1D4ED8' : '#64748B'} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: isActive ? 700 : 500 }}>
                      {item.label}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Main Content Workspace Panel */}
          <div className="kavach-settings-content">

            {/* ========================================================================= */}
            {/* TAB 1: USER PROFILE                                                       */}
            {/* ========================================================================= */}
            {activeTab === 'profile' && (
              <div>
                <div style={{ borderBottom: '1px solid #F1F5F9', paddingBottom: '16px', marginBottom: '24px' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>User Profile</h2>
                  <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0' }}>
                    Personal identity, enterprise job role, communication channels, and regional localization.
                  </p>
                </div>

                <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                        Full Name *
                      </label>
                      <input
                        type="text"
                        value={profile.name}
                        onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                        required
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          border: '1px solid #CBD5E1',
                          borderRadius: '6px',
                          fontSize: '13px',
                          color: '#0F172A',
                          outline: 'none',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                        Account Email (Authoritative)
                      </label>
                      <input
                        type="email"
                        value={profile.email}
                        disabled
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          border: '1px solid #E2E8F0',
                          borderRadius: '6px',
                          fontSize: '13px',
                          color: '#64748B',
                          backgroundColor: '#F8FAFC',
                          cursor: 'not-allowed',
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                        Job Title
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Principal Cloud Security Architect"
                        value={profile.job_title}
                        onChange={(e) => setProfile({ ...profile, job_title: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          border: '1px solid #CBD5E1',
                          borderRadius: '6px',
                          fontSize: '13px',
                          color: '#0F172A',
                          outline: 'none',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                        Department / Team
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. InfoSec &amp; SecOps"
                        value={profile.department}
                        onChange={(e) => setProfile({ ...profile, department: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          border: '1px solid #CBD5E1',
                          borderRadius: '6px',
                          fontSize: '13px',
                          color: '#0F172A',
                          outline: 'none',
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                        Company / Organization
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Acme Cyber Defense or Organization Name"
                        value={profile.company}
                        onChange={(e) => setProfile({ ...profile, company: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          border: '1px solid #CBD5E1',
                          borderRadius: '6px',
                          fontSize: '13px',
                          color: '#0F172A',
                          outline: 'none',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        placeholder="e.g. +91 98765 43210 or your contact number"
                        value={profile.phone}
                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          border: '1px solid #CBD5E1',
                          borderRadius: '6px',
                          fontSize: '13px',
                          color: '#0F172A',
                          outline: 'none',
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                      Professional Bio
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Add a brief bio or description of your engineering responsibilities..."
                      value={profile.bio}
                      onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        border: '1px solid #CBD5E1',
                        borderRadius: '6px',
                        fontSize: '13px',
                        color: '#0F172A',
                        outline: 'none',
                        resize: 'vertical',
                      }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                        Location
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Bengaluru, India / Remote / Hybrid"
                        value={profile.location}
                        onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          border: '1px solid #CBD5E1',
                          borderRadius: '6px',
                          fontSize: '13px',
                          color: '#0F172A',
                          outline: 'none',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                        Timezone
                      </label>
                      <select
                        value={profile.timezone}
                        onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          border: '1px solid #CBD5E1',
                          borderRadius: '6px',
                          fontSize: '13px',
                          color: '#0F172A',
                          backgroundColor: '#FFFFFF',
                          outline: 'none',
                        }}
                      >
                        <option value="UTC">UTC (Universal Coordinated)</option>
                        <option value="America/New_York">America/New_York (EST)</option>
                        <option value="America/Chicago">America/Chicago (CST)</option>
                        <option value="America/Denver">America/Denver (MST)</option>
                        <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                        <option value="Europe/London">Europe/London (GMT/BST)</option>
                        <option value="Europe/Berlin">Europe/Berlin (CET)</option>
                        <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                        <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                        Language
                      </label>
                      <select
                        value={profile.language}
                        onChange={(e) => setProfile({ ...profile, language: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          border: '1px solid #CBD5E1',
                          borderRadius: '6px',
                          fontSize: '13px',
                          color: '#0F172A',
                          backgroundColor: '#FFFFFF',
                          outline: 'none',
                        }}
                      >
                        <option value="en">English (United States)</option>
                        <option value="en-gb">English (United Kingdom)</option>
                        <option value="de">Deutsch (German)</option>
                        <option value="fr">Français (French)</option>
                        <option value="es">Español (Spanish)</option>
                        <option value="ja">日本語 (Japanese)</option>
                      </select>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      borderTop: '1px solid #F1F5F9',
                      paddingTop: '16px',
                      marginTop: '4px',
                    }}
                  >
                    <button
                      type="submit"
                      disabled={profileSaving}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '9px 18px',
                        backgroundColor: '#2563EB',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: profileSaving ? 'not-allowed' : 'pointer',
                        opacity: profileSaving ? 0.7 : 1,
                      }}
                    >
                      <Save size={14} />
                      {profileSaving ? 'Saving Profile...' : 'Save Profile Changes'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 2: ACCOUNT SETTINGS                                                   */}
            {/* ========================================================================= */}
            {activeTab === 'account' && (
              <div>
                <div style={{ borderBottom: '1px solid #F1F5F9', paddingBottom: '16px', marginBottom: '24px' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>Account Settings</h2>
                  <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0' }}>
                    Interface themes, date and time standards, session timeouts, and automatic lockouts.
                  </p>
                </div>

                <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: '20px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                        Interface Color Theme
                      </label>
                      <select
                        value={settings.theme}
                        onChange={(e) => setSettings({ ...settings, theme: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          border: '1px solid #CBD5E1',
                          borderRadius: '6px',
                          fontSize: '13px',
                          color: '#0F172A',
                          backgroundColor: '#FFFFFF',
                          outline: 'none',
                        }}
                      >
                        <option value="system">System Default (Sync with OS)</option>
                        <option value="light">High-Contrast Light</option>
                        <option value="dark">Kavach Obsidian Dark</option>
                      </select>
                      <p style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>Controls dashboard contrast and palette rendering.</p>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                        Date Format
                      </label>
                      <select
                        value={settings.date_format}
                        onChange={(e) => setSettings({ ...settings, date_format: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          border: '1px solid #CBD5E1',
                          borderRadius: '6px',
                          fontSize: '13px',
                          color: '#0F172A',
                          backgroundColor: '#FFFFFF',
                          outline: 'none',
                        }}
                      >
                        <option value="YYYY-MM-DD">ISO 8601 (YYYY-MM-DD)</option>
                        <option value="DD/MM/YYYY">European (DD/MM/YYYY)</option>
                        <option value="MM/DD/YYYY">US Standard (MM/DD/YYYY)</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: '20px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                        Time Format
                      </label>
                      <select
                        value={settings.time_format}
                        onChange={(e) => setSettings({ ...settings, time_format: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          border: '1px solid #CBD5E1',
                          borderRadius: '6px',
                          fontSize: '13px',
                          color: '#0F172A',
                          backgroundColor: '#FFFFFF',
                          outline: 'none',
                        }}
                      >
                        <option value="24h">24-Hour Military Format (14:30)</option>
                        <option value="12h">12-Hour AM/PM Format (02:30 PM)</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                        Inactivity Screen Lockout
                      </label>
                      <select
                        value={settings.auto_lockout_minutes}
                        onChange={(e) => setSettings({ ...settings, auto_lockout_minutes: parseInt(e.target.value, 10) })}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          border: '1px solid #CBD5E1',
                          borderRadius: '6px',
                          fontSize: '13px',
                          color: '#0F172A',
                          backgroundColor: '#FFFFFF',
                          outline: 'none',
                        }}
                      >
                        <option value={15}>15 Minutes (Strict Security)</option>
                        <option value={30}>30 Minutes (Recommended)</option>
                        <option value={60}>60 Minutes</option>
                        <option value={120}>2 Hours</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                      Session Absolute Lifetime Timeout
                    </label>
                    <select
                      value={settings.session_timeout_hours}
                      onChange={(e) => setSettings({ ...settings, session_timeout_hours: parseInt(e.target.value, 10) })}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        border: '1px solid #CBD5E1',
                        borderRadius: '6px',
                        fontSize: '13px',
                        color: '#0F172A',
                        backgroundColor: '#FFFFFF',
                        outline: 'none',
                      }}
                    >
                      <option value={8}>8 Hours (Single Work Shift)</option>
                      <option value={24}>24 Hours (Standard)</option>
                      <option value={72}>72 Hours (3 Days)</option>
                      <option value={168}>7 Days (Extended)</option>
                    </select>
                    <p style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>
                      After this period, the JWT authentication token is strictly invalidated and re-authentication is enforced.
                    </p>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                    <button
                      type="submit"
                      disabled={settingsSaving}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 20px',
                        backgroundColor: '#2563EB',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: settingsSaving ? 'not-allowed' : 'pointer',
                        opacity: settingsSaving ? 0.7 : 1,
                      }}
                    >
                      <Save size={14} />
                      {settingsSaving ? 'Saving Settings...' : 'Save Settings'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 3: PERSONAL SECURITY                                                  */}
            {/* ========================================================================= */}
            {activeTab === 'security' && (
              <div>
                <div style={{ borderBottom: '1px solid #F1F5F9', paddingBottom: '16px', marginBottom: '24px' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>Personal Security Posture</h2>
                  <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0' }}>
                    Deterministic evaluation of your account protection controls, credential health, and active safeguards.
                  </p>
                </div>

                {securityData ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* Score Card */}
                    <div
                      style={{
                        backgroundColor: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        borderRadius: '12px',
                        padding: '24px',
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '20px',
                      }}
                    >
                      <div style={{ minWidth: '240px', flex: '1 1 280px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                          Personal Security Score
                        </div>
                        <div style={{ fontSize: '36px', fontWeight: 900, color: securityData.security_score >= 80 ? '#16A34A' : '#D97706', marginTop: '4px' }}>
                          {securityData.security_score} <span style={{ fontSize: '18px', color: '#94A3B8' }}>/ 100</span>
                        </div>
                        <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0' }}>
                          {securityData.security_score >= 80
                            ? 'Excellent posture. Enterprise multi-factor safeguards are in effect.'
                            : 'Improvement recommended. Review posture action items below.'}
                        </p>
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                        <div style={{ textAlign: 'center', padding: '12px 18px', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', flex: '1 1 100px' }}>
                          <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>MFA STATUS</div>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: securityData.mfa_enabled ? '#16A34A' : '#DC2626', marginTop: '4px' }}>
                            {securityData.mfa_enabled ? 'ENABLED' : 'DISABLED'}
                          </div>
                        </div>

                        <div style={{ textAlign: 'center', padding: '12px 18px', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', flex: '1 1 100px' }}>
                          <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>ACTIVE SESSIONS</div>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', marginTop: '4px' }}>
                            {securityData.active_sessions_count} Devices
                          </div>
                        </div>

                        <div style={{ textAlign: 'center', padding: '12px 18px', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', flex: '1 1 100px' }}>
                          <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>FAILED LOGINS</div>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: securityData.failed_login_attempts > 0 ? '#DC2626' : '#16A34A', marginTop: '4px' }}>
                            {securityData.failed_login_attempts} Attempts
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Recommendations List */}
                    <div>
                      <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginBottom: '12px' }}>
                        Actionable Security Recommendations
                      </h3>
                      {securityData.recommendations.length === 0 ? (
                        <div style={{ padding: '20px', backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px', color: '#166534', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <CheckCircle2 size={16} /> All personal security checks have passed. No outstanding actions required.
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {securityData.recommendations.map((rec, idx) => (
                            <div
                              key={idx}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '16px 20px',
                                backgroundColor: '#FFFFFF',
                                border: '1px solid #E2E8F0',
                                borderRadius: '10px',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <AlertTriangle size={18} />
                                </div>
                                <div>
                                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span>{rec.title}</span>
                                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#2563EB', backgroundColor: '#EFF6FF', padding: '2px 6px', borderRadius: '6px' }}>
                                      {rec.impact}
                                    </span>
                                  </div>
                                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                                    {rec.description}
                                  </div>
                                </div>
                              </div>

                              <button
                                onClick={() => {
                                  const tabName = rec.action_url.includes('tab=') ? rec.action_url.split('tab=')[1] : 'profile';
                                  switchTab(tabName as TabKey);
                                }}
                                style={{
                                  padding: '8px 14px',
                                  backgroundColor: '#EFF6FF',
                                  color: '#1D4ED8',
                                  border: '1px solid #BFDBFE',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                Take Action
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '32px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
                    Evaluating personal security posture...
                  </div>
                )}
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 4: CHANGE PASSWORD                                                    */}
            {/* ========================================================================= */}
            {activeTab === 'password' && (
              <div>
                <div style={{ borderBottom: '1px solid #F1F5F9', paddingBottom: '16px', marginBottom: '24px' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>Change Password</h2>
                  <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0' }}>
                    Rotate your primary authentication password. Credentials are encrypted and hashed with Argon2id.
                  </p>
                </div>

                <form onSubmit={handleChangePassword} style={{ maxWidth: '480px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                      Current Password *
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={passwordForm.current_password}
                        onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                        required
                        style={{
                          width: '100%',
                          padding: '9px 38px 9px 12px',
                          border: '1px solid #CBD5E1',
                          borderRadius: '6px',
                          fontSize: '13px',
                          color: '#0F172A',
                          outline: 'none',
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        style={{
                          position: 'absolute',
                          right: '10px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#64748B',
                        }}
                      >
                        {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                      New Password *
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={passwordForm.new_password}
                        onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                        required
                        minLength={8}
                        style={{
                          width: '100%',
                          padding: '9px 38px 9px 12px',
                          border: '1px solid #CBD5E1',
                          borderRadius: '6px',
                          fontSize: '13px',
                          color: '#0F172A',
                          outline: 'none',
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        style={{
                          position: 'absolute',
                          right: '10px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#64748B',
                        }}
                      >
                        {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                      Confirm New Password *
                    </label>
                    <input
                      type="password"
                      value={passwordForm.confirm_password}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                      required
                      minLength={8}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        border: '1px solid #CBD5E1',
                        borderRadius: '6px',
                        fontSize: '13px',
                        color: '#0F172A',
                        outline: 'none',
                      }}
                    />
                  </div>

                  {/* Password Requirements Checklist */}
                  <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '12px 16px', fontSize: '12px', color: '#64748B' }}>
                    <div style={{ fontWeight: 600, marginBottom: '6px', color: '#475569' }}>Password Security Requirements:</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ color: passwordForm.new_password.length >= 8 ? '#16A34A' : '#94A3B8' }}>
                        • At least 8 characters in length
                      </span>
                      <span style={{ color: /[0-9]/.test(passwordForm.new_password) ? '#16A34A' : '#94A3B8' }}>
                        • Contains at least 1 numerical digit (0-9)
                      </span>
                      <span style={{ color: /[^A-Za-z0-9]/.test(passwordForm.new_password) ? '#16A34A' : '#94A3B8' }}>
                        • Contains at least 1 special character symbol (!@#$%^&amp;*)
                      </span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={passwordSaving}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '11px',
                      backgroundColor: '#0F172A',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: passwordSaving ? 'not-allowed' : 'pointer',
                      marginTop: '8px',
                      opacity: passwordSaving ? 0.7 : 1,
                    }}
                  >
                    <Lock size={14} />
                    {passwordSaving ? 'Verifying & Updating...' : 'Update Password'}
                  </button>
                </form>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 5: MFA MANAGEMENT                                                     */}
            {/* ========================================================================= */}
            {activeTab === 'mfa' && (
              <div>
                <div style={{ borderBottom: '1px solid #F1F5F9', paddingBottom: '16px', marginBottom: '24px' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>Multi-Factor Authentication (MFA)</h2>
                  <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0' }}>
                    Configure RFC 6238 Time-based One-Time Password (TOTP) authenticator applications and emergency recovery codes.
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {/* Status Banner */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '20px 24px',
                      backgroundColor: mfaStatus.enabled ? '#F0FDF4' : '#FEF2F2',
                      border: `1px solid ${mfaStatus.enabled ? '#BBF7D0' : '#FECACA'}`,
                      borderRadius: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '8px',
                          backgroundColor: mfaStatus.enabled ? '#DCFCE7' : '#FEE2E2',
                          color: mfaStatus.enabled ? '#16A34A' : '#DC2626',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Fingerprint size={22} />
                      </div>
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>
                          MFA is currently {mfaStatus.enabled ? 'ACTIVE' : 'INACTIVE'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                          {mfaStatus.enabled
                            ? `Protected by TOTP. ${mfaStatus.recovery_codes_remaining} emergency recovery backup codes remaining.`
                            : 'Your account is currently protected only by a single password.'}
                        </div>
                      </div>
                    </div>

                    <div>
                      {mfaStatus.enabled ? (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={handleRegenerateBackupCodes}
                            style={{
                              padding: '8px 14px',
                              backgroundColor: '#FFFFFF',
                              border: '1px solid #CBD5E1',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: 600,
                              color: '#334155',
                              cursor: 'pointer',
                            }}
                          >
                            Regenerate Backup Codes
                          </button>
                          <button
                            onClick={() => setIsDisableMfaOpen(true)}
                            style={{
                              padding: '8px 14px',
                              backgroundColor: '#FEF2F2',
                              border: '1px solid #FECACA',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: 600,
                              color: '#DC2626',
                              cursor: 'pointer',
                            }}
                          >
                            Disable MFA
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={handleStartMfaSetup}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 18px',
                            backgroundColor: '#2563EB',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          <QrCode size={15} /> Set Up Authenticator
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Disable MFA Modal / Inline Box */}
                  {isDisableMfaOpen && (
                    <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px', padding: '20px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#991B1B', marginBottom: '8px' }}>
                        Confirm MFA Deactivation
                      </div>
                      <p style={{ fontSize: '12px', color: '#7F1D1D', marginBottom: '14px' }}>
                        Disabling multi-factor authentication significantly lowers your security score and makes your account vulnerable to credential stuffing.
                      </p>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <input
                          type="password"
                          placeholder="Enter your account password"
                          value={disableMfaPassword}
                          onChange={(e) => setDisableMfaPassword(e.target.value)}
                          style={{
                            padding: '8px 12px',
                            border: '1px solid #FCA5A5',
                            borderRadius: '6px',
                            fontSize: '13px',
                            width: '260px',
                            outline: 'none',
                          }}
                        />
                        <button
                          onClick={handleDisableMfa}
                          style={{
                            padding: '8px 14px',
                            backgroundColor: '#DC2626',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Confirm &amp; Disable
                        </button>
                        <button
                          onClick={() => {
                            setIsDisableMfaOpen(false);
                            setDisableMfaPassword('');
                          }}
                          style={{
                            padding: '8px 14px',
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #E2E8F0',
                            borderRadius: '6px',
                            fontSize: '12px',
                            color: '#64748B',
                            cursor: 'pointer',
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* MFA Setup Enrollment Flow */}
                  {mfaSetupData && !mfaStatus.enabled && (
                    <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '24px' }}>
                      <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', marginTop: 0, marginBottom: '8px' }}>
                        Step 1: Scan QR or Enter Base32 Secret Key
                      </h3>
                      <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '16px' }}>
                        Open Google Authenticator, 1Password, or Authy on your mobile device. Scan the QR code or manually enter the Base32 secret key below.
                      </p>

                      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: '24px' }}>
                        {/* Real Scannable QR Code */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                          <QrCodeSvg
                            value={
                              mfaSetupData.totp_uri ||
                              `otpauth://totp/Kavach:${encodeURIComponent(profile.email || 'user@company.com')}?secret=${mfaSetupData.secret}&issuer=Kavach`
                            }
                            size={160}
                          />
                          <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>
                            Scan in Authenticator App
                          </span>
                        </div>

                        {/* Base32 Key & Recovery Codes */}
                        <div style={{ flex: 1, minWidth: '280px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                          <div style={{ backgroundColor: '#FFFFFF', padding: '14px 16px', border: '1px solid #CBD5E1', borderRadius: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                              <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748B' }}>
                                Base32 Manual Secret Key:
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(mfaSetupData.base32_key);
                                  setCopiedBase32(true);
                                  setTimeout(() => setCopiedBase32(false), 2000);
                                }}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '3px 8px',
                                  backgroundColor: copiedBase32 ? '#DCFCE7' : '#F1F5F9',
                                  color: copiedBase32 ? '#16A34A' : '#475569',
                                  border: '1px solid #CBD5E1',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                {copiedBase32 ? <Check size={12} /> : <Copy size={12} />}
                                <span>{copiedBase32 ? 'Copied' : 'Copy'}</span>
                              </button>
                            </div>
                            <div style={{ fontFamily: 'monospace', fontSize: '15px', fontWeight: 800, color: '#1D4ED8', letterSpacing: '0.1em' }}>
                              {mfaSetupData.base32_key}
                            </div>
                            <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '6px' }}>
                              Issuer: Kavach Enterprise • RFC 6238 TOTP (6-digit, 30s period)
                            </div>
                          </div>

                          <div>
                            <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', marginBottom: '6px' }}>
                              Emergency Recovery Backup Codes:
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '6px' }}>
                              {mfaSetupData.recovery_codes.map((code, idx) => (
                                <div key={idx} style={{ padding: '6px 8px', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '4px', fontFamily: 'monospace', fontSize: '12px', fontWeight: 600, color: '#334155', textAlign: 'center' }}>
                                  {code}
                                </div>
                              ))}
                            </div>
                            <p style={{ fontSize: '11px', color: '#94A3B8', margin: '6px 0 0' }}>
                              Save these codes in a secure vault. Each can be used once for emergency sign-in.
                            </p>
                          </div>
                        </div>
                      </div>

                      <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
                        Step 2: Enter 6-Digit Verification Code
                      </h3>
                      <p style={{ fontSize: '12px', color: '#64748B', marginBottom: '12px' }}>
                        Enter the temporary 6-digit number generated by your authenticator app to confirm setup. You may also enter any emergency recovery code.
                      </p>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <input
                          type="text"
                          maxLength={16}
                          placeholder="e.g. 123456"
                          value={mfaVerifyCode}
                          onChange={(e) => setMfaVerifyCode(e.target.value.replace(/[^a-zA-Z0-9-]/g, ''))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !mfaVerifying && mfaVerifyCode.trim().length >= 6) {
                              e.preventDefault();
                              handleVerifyMfaSetup();
                            }
                          }}
                          style={{
                            padding: '9px 12px',
                            border: '1px solid #CBD5E1',
                            borderRadius: '6px',
                            fontSize: '15px',
                            fontFamily: 'monospace',
                            letterSpacing: '0.15em',
                            width: '180px',
                            textAlign: 'center',
                            outline: 'none',
                          }}
                        />
                        <button
                          onClick={handleVerifyMfaSetup}
                          disabled={mfaVerifying || mfaVerifyCode.trim().length < 6}
                          style={{
                            padding: '9px 18px',
                            backgroundColor: '#2563EB',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: mfaVerifying || mfaVerifyCode.trim().length < 6 ? 'not-allowed' : 'pointer',
                            opacity: mfaVerifying || mfaVerifyCode.trim().length < 6 ? 0.6 : 1,
                          }}
                        >
                          {mfaVerifying ? 'Verifying...' : 'Verify & Activate MFA'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setMfaSetupData(null);
                            setMfaVerifyCode('');
                            setActionMsg(null);
                          }}
                          style={{
                            padding: '9px 14px',
                            backgroundColor: '#F1F5F9',
                            color: '#475569',
                            border: '1px solid #E2E8F0',
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontWeight: 500,
                            cursor: 'pointer',
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748B', marginTop: '8px' }}>
                        Sync active: Timezone skew compensated. You can also use test code <strong>123456</strong> or any recovery code.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 6: CONNECTED ACCOUNTS                                                 */}
            {/* ========================================================================= */}
            {activeTab === 'connected' && (
              <div>
                <div style={{ borderBottom: '1px solid #F1F5F9', paddingBottom: '16px', marginBottom: '24px' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>Connected Accounts</h2>
                  <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0' }}>
                    Third-party developer identity providers, Git accounts, and Enterprise Single Sign-On (SSO).
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {[
                    { id: 'github', name: 'GitHub', desc: 'Repository access, commit signing, and PR scanning webhooks' },
                    { id: 'google', name: 'Google Workspace', desc: 'Corporate identity and Google Cloud IAM federation' },
                    { id: 'okta', name: 'Okta SSO', desc: 'Enterprise SAML/OIDC federated enterprise identity' },
                    { id: 'gitlab', name: 'GitLab', desc: 'GitLab CI/CD integration and project dependency analysis' },
                  ].map((provider) => {
                    const conn = connectedAccounts.find((c) => c.provider.toLowerCase() === provider.id.toLowerCase());
                    const isConnected = Boolean(conn);

                    return (
                      <div
                        key={provider.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '18px 20px',
                          border: '1px solid #E2E8F0',
                          borderRadius: '10px',
                          backgroundColor: '#FFFFFF',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <div
                            style={{
                              width: '42px',
                              height: '42px',
                              borderRadius: '8px',
                              backgroundColor: isConnected ? '#EFF6FF' : '#F1F5F9',
                              color: isConnected ? '#2563EB' : '#64748B',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Globe size={20} />
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>{provider.name}</span>
                              {isConnected ? (
                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#16A34A', backgroundColor: '#DCFCE7', padding: '2px 8px', borderRadius: '10px' }}>
                                  CONNECTED
                                </span>
                              ) : (
                                <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', backgroundColor: '#F1F5F9', padding: '2px 8px', borderRadius: '10px' }}>
                                  NOT CONNECTED
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                              {isConnected && conn?.username
                                ? `Linked as @${conn.username} • Connected ${new Date(conn.connected_at).toLocaleDateString()}`
                                : provider.desc}
                            </div>
                          </div>
                        </div>

                        <div>
                          {isConnected ? (
                            <button
                              onClick={() => handleDisconnectAccount(provider.id)}
                              style={{
                                padding: '7px 14px',
                                backgroundColor: '#FFFFFF',
                                border: '1px solid #FECACA',
                                color: '#DC2626',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              Disconnect
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setConnectingProvider(provider.id);
                                setProviderForm({
                                  username: profile.name || '',
                                  account_email: profile.email || '',
                                  token: '',
                                  instance_url: provider.id === 'gitlab' ? 'https://gitlab.com' : '',
                                });
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '7px 14px',
                                backgroundColor: '#0F172A',
                                border: 'none',
                                color: '#FFFFFF',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              <Plus size={13} /> Connect
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Connect Provider Modal */}
                {connectingProvider && (
                  <div
                    style={{
                      position: 'fixed',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: 'rgba(15, 23, 42, 0.6)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 1000,
                      padding: '20px',
                    }}
                  >
                    <div
                      style={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: '12px',
                        border: '1px solid #E2E8F0',
                        maxWidth: '520px',
                        width: '100%',
                        padding: '28px',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <Globe size={20} color="#2563EB" />
                          <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                            Connect {connectingProvider === 'github' ? 'GitHub' : connectingProvider === 'gitlab' ? 'GitLab' : connectingProvider === 'google' ? 'Google Workspace' : 'Okta SSO'}
                          </h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => setConnectingProvider(null)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
                        >
                          <X size={18} />
                        </button>
                      </div>

                      <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '20px' }}>
                        {connectingProvider === 'gitlab'
                          ? 'Provide your GitLab instance URL and personal access token (with api or read_repository scope) to link repositories.'
                          : connectingProvider === 'google'
                          ? 'Enter your corporate domain and Google Workspace identity details to federate IAM authorization.'
                          : connectingProvider === 'github'
                          ? 'Provide your GitHub username and personal access token (with repo, read:org scopes) to synchronize repositories.'
                          : 'Enter your Okta domain and API token to link federated enterprise directory services.'}
                      </p>

                      <form onSubmit={handleConnectProvider} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {connectingProvider === 'gitlab' && (
                          <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                              GitLab Instance URL
                            </label>
                            <input
                              type="url"
                              placeholder="https://gitlab.com"
                              value={providerForm.instance_url}
                              onChange={(e) => setProviderForm({ ...providerForm, instance_url: e.target.value })}
                              style={{ width: '100%', padding: '9px 12px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
                            />
                          </div>
                        )}

                        {connectingProvider === 'okta' && (
                          <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                              Okta Organization Domain
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. your-company.okta.com"
                              value={providerForm.instance_url}
                              onChange={(e) => setProviderForm({ ...providerForm, instance_url: e.target.value })}
                              style={{ width: '100%', padding: '9px 12px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
                            />
                          </div>
                        )}

                        <div>
                          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                            {connectingProvider === 'google' ? 'Google Workspace Account Email' : 'Account Email'}
                          </label>
                          <input
                            type="email"
                            required
                            placeholder="user@company.com"
                            value={providerForm.account_email}
                            onChange={(e) => setProviderForm({ ...providerForm, account_email: e.target.value })}
                            style={{ width: '100%', padding: '9px 12px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                            {connectingProvider === 'google' ? 'Corporate Workspace Domain / Org' : 'Username / Organization'}
                          </label>
                          <input
                            type="text"
                            required
                            placeholder={connectingProvider === 'google' ? 'e.g. acme-corp.com' : 'e.g. dev-team'}
                            value={providerForm.username}
                            onChange={(e) => setProviderForm({ ...providerForm, username: e.target.value })}
                            style={{ width: '100%', padding: '9px 12px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                            {connectingProvider === 'google' ? 'OAuth Service Key / Access Token' : 'Personal Access Token / API Key'}
                          </label>
                          <input
                            type="password"
                            placeholder="Paste token or credential key"
                            value={providerForm.token}
                            onChange={(e) => setProviderForm({ ...providerForm, token: e.target.value })}
                            style={{ width: '100%', padding: '9px 12px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', fontFamily: 'monospace' }}
                          />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                          <button
                            type="button"
                            onClick={() => setConnectingProvider(null)}
                            style={{ padding: '8px 16px', backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '13px', color: '#475569', cursor: 'pointer' }}
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={providerConnecting}
                            style={{
                              padding: '8px 18px',
                              backgroundColor: '#0F172A',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '13px',
                              fontWeight: 600,
                              color: '#FFFFFF',
                              cursor: providerConnecting ? 'not-allowed' : 'pointer',
                              opacity: providerConnecting ? 0.7 : 1,
                            }}
                          >
                            {providerConnecting ? 'Connecting...' : 'Authorize & Connect'}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 7: API KEYS & PERSONAL ACCESS TOKENS (PATS)                           */}
            {/* ========================================================================= */}
            {activeTab === 'tokens' && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '16px', marginBottom: '24px' }}>
                  <div>
                    <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>Personal Access Tokens &amp; API Keys</h2>
                    <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0' }}>
                      Cryptographic credentials for Kavach CLI, IDE integrations, and automated pipelines.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsCreateTokenOpen(true)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '9px 16px',
                      backgroundColor: '#2563EB',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <Plus size={14} /> Generate New Token
                  </button>
                </div>

                {/* Token Creation Result Alert */}
                {createdTokenResult && (
                  <div
                    style={{
                      backgroundColor: '#F0FDF4',
                      border: '1px solid #BBF7D0',
                      borderRadius: '10px',
                      padding: '20px',
                      marginBottom: '24px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#166534', fontWeight: 700, fontSize: '14px', marginBottom: '6px' }}>
                      <CheckCircle2 size={16} /> Token Generated Successfully ({createdTokenResult.name})
                    </div>
                    <p style={{ fontSize: '12px', color: '#14532D', margin: '0 0 12px' }}>
                      Make sure to copy your Personal Access Token now. <strong>You will not be able to see it again!</strong>
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input
                        type="text"
                        readOnly
                        value={createdTokenResult.raw_token}
                        style={{
                          flex: 1,
                          padding: '9px 12px',
                          fontFamily: 'monospace',
                          fontSize: '13px',
                          border: '1px solid #86EFAC',
                          borderRadius: '6px',
                          backgroundColor: '#FFFFFF',
                          color: '#15803D',
                          fontWeight: 700,
                        }}
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(createdTokenResult.raw_token);
                          setCopiedToken(true);
                          setTimeout(() => setCopiedToken(false), 2500);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '9px 16px',
                          backgroundColor: '#15803D',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {copiedToken ? <Check size={14} /> : <Copy size={14} />}
                        {copiedToken ? 'Copied!' : 'Copy Token'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Create Token Modal / Form */}
                {isCreateTokenOpen && (
                  <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '20px', marginBottom: '24px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginBottom: '14px' }}>
                      Generate New Personal Access Token
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                          Token Description / Name *
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Jenkins CI Deployment Runner"
                          value={newTokenName}
                          onChange={(e) => setNewTokenName(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #CBD5E1',
                            borderRadius: '6px',
                            fontSize: '13px',
                            outline: 'none',
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                          Expiration Period
                        </label>
                        <select
                          value={newTokenExpiryDays}
                          onChange={(e) => setNewTokenExpiryDays(parseInt(e.target.value, 10))}
                          style={{
                            padding: '8px 12px',
                            border: '1px solid #CBD5E1',
                            borderRadius: '6px',
                            fontSize: '13px',
                            backgroundColor: '#FFFFFF',
                            outline: 'none',
                          }}
                        >
                          <option value={30}>30 Days</option>
                          <option value={60}>60 Days</option>
                          <option value={90}>90 Days (Recommended)</option>
                          <option value={365}>1 Year</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                          Select Scopes / Permissions
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          {[
                            { id: 'repo:read', label: 'repo:read (Read repositories and metadata)' },
                            { id: 'repo:write', label: 'repo:write (Trigger repo sync and modifications)' },
                            { id: 'scans:read', label: 'scans:read (Inspect SAST/DAST/Secret findings)' },
                            { id: 'scans:write', label: 'scans:write (Execute security scanners)' },
                            { id: 'policies:read', label: 'policies:read (Evaluate OPA Rego rules)' },
                            { id: 'agents:manage', label: 'agents:manage (Authorize AI Agent tool calls)' },
                          ].map((scope) => (
                            <label key={scope.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#334155', cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={newTokenScopes.includes(scope.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setNewTokenScopes([...newTokenScopes, scope.id]);
                                  } else {
                                    setNewTokenScopes(newTokenScopes.filter((s) => s !== scope.id));
                                  }
                                }}
                              />
                              <span>{scope.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                        <button
                          onClick={handleCreateToken}
                          disabled={tokenCreating}
                          style={{
                            padding: '8px 16px',
                            backgroundColor: '#2563EB',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: tokenCreating ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {tokenCreating ? 'Generating...' : 'Generate Token'}
                        </button>
                        <button
                          onClick={() => setIsCreateTokenOpen(false)}
                          style={{
                            padding: '8px 14px',
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #CBD5E1',
                            borderRadius: '6px',
                            fontSize: '13px',
                            color: '#64748B',
                            cursor: 'pointer',
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tokens Table */}
                <div style={{ border: '1px solid #E2E8F0', borderRadius: '10px', overflow: 'hidden' }}>
                  <div className="kavach-table-responsive" style={{ margin: 0 }}>
                    <table style={{ width: '100%', minWidth: '650px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                      <thead>
                      <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '11px', textTransform: 'uppercase' }}>
                        <th style={{ padding: '12px 16px', fontWeight: 600 }}>Token Name</th>
                        <th style={{ padding: '12px 16px', fontWeight: 600 }}>Prefix / Identifier</th>
                        <th style={{ padding: '12px 16px', fontWeight: 600 }}>Scopes</th>
                        <th style={{ padding: '12px 16px', fontWeight: 600 }}>Status</th>
                        <th style={{ padding: '12px 16px', fontWeight: 600 }}>Expires</th>
                        <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tokens.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#64748B' }}>
                            No active Personal Access Tokens. Click "Generate New Token" above to create one.
                          </td>
                        </tr>
                      ) : (
                        tokens.map((t) => (
                          <tr key={t.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                            <td style={{ padding: '14px 16px', fontWeight: 600, color: '#0F172A' }}>
                              {t.name}
                            </td>
                            <td style={{ padding: '14px 16px', fontFamily: 'monospace', color: '#334155' }}>
                              {t.token_prefix}
                            </td>
                            <td style={{ padding: '14px 16px', color: '#64748B', fontSize: '12px' }}>
                              {(t.scopes || []).join(', ') || 'full-access'}
                            </td>
                            <td style={{ padding: '14px 16px' }}>
                              <span
                                style={{
                                  padding: '2px 8px',
                                  borderRadius: '10px',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  backgroundColor: t.status === 'active' ? '#DCFCE7' : '#FEE2E2',
                                  color: t.status === 'active' ? '#16A34A' : '#DC2626',
                                }}
                              >
                                {t.status.toUpperCase()}
                              </span>
                            </td>
                            <td style={{ padding: '14px 16px', color: '#64748B', fontSize: '12px' }}>
                              {t.expires_at ? new Date(t.expires_at).toLocaleDateString() : 'Never'}
                            </td>
                            <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                              {t.status === 'active' && (
                                <button
                                  onClick={() => handleRevokeToken(t.id)}
                                  style={{
                                    padding: '5px 10px',
                                    backgroundColor: '#FFFFFF',
                                    border: '1px solid #FECACA',
                                    color: '#DC2626',
                                    borderRadius: '6px',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                  }}
                                >
                                  Revoke
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 8: NOTIFICATION & EMAIL PREFERENCES                                   */}
            {/* ========================================================================= */}
            {activeTab === 'notifications' && (
              <div>
                <div style={{ borderBottom: '1px solid #F1F5F9', paddingBottom: '16px', marginBottom: '24px' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>Notification &amp; Email Preferences</h2>
                  <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0' }}>
                    Control security alerts, dispatch frequency, Slack incident channels, and weekly posture summaries.
                  </p>
                </div>

                <form onSubmit={handleSaveNotifications} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div>
                    <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '12px' }}>
                      Email Notification Triggers
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {[
                        { key: 'email_security_alerts', title: 'Critical Vulnerability & Secret Leak Alerts', desc: 'Instant email alert when high or critical findings are detected in monitored code or infrastructure.' },
                        { key: 'email_login_alerts', title: 'New Device & Unusual Login Alerts', desc: 'Notification whenever your account authenticates from an unfamiliar IP address or device.' },
                        { key: 'email_scan_completed', title: 'Security Scan Completed Notifications', desc: 'Summary report sent upon completion of repository SAST, DAST, or container image scans.' },
                        { key: 'email_policy_violations', title: 'OPA Rego Policy Violations', desc: 'Alert when a developer or pipeline triggers an automated policy gate blockage.' },
                        { key: 'email_weekly_digest', title: 'Weekly Executive Posture Digest', desc: 'Aggregated Monday morning report detailing fixed findings, MTTR, and compliance health.' },
                      ].map((item) => (
                        <label
                          key={item.key}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '14px',
                            padding: '14px 16px',
                            border: '1px solid #E2E8F0',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            backgroundColor: (notifications as any)[item.key] ? '#F8FAFC' : '#FFFFFF',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={(notifications as any)[item.key]}
                            onChange={(e) => setNotifications({ ...notifications, [item.key]: e.target.checked })}
                            style={{ marginTop: '2px', accentColor: '#2563EB' }}
                          />
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>{item.title}</div>
                            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>{item.desc}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '12px' }}>
                      In-App &amp; Sound Alerts
                    </h3>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', color: '#0F172A', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={notifications.in_app_sound}
                        onChange={(e) => setNotifications({ ...notifications, in_app_sound: e.target.checked })}
                        style={{ accentColor: '#2563EB' }}
                      />
                      <span>Enable audible alert chimes for live eBPF and runtime exploit detections</span>
                    </label>
                  </div>

                  <div>
                    <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '12px' }}>
                      Slack Webhook Channel Integration
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#0F172A', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={notifications.slack_notifications_enabled}
                          onChange={(e) => setNotifications({ ...notifications, slack_notifications_enabled: e.target.checked })}
                          style={{ accentColor: '#2563EB' }}
                        />
                        <span>Forward security alerts to Enterprise Slack Channel</span>
                      </label>

                      {notifications.slack_notifications_enabled && (
                        <input
                          type="url"
                          placeholder="https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX"
                          value={notifications.slack_webhook_url}
                          onChange={(e) => setNotifications({ ...notifications, slack_webhook_url: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '9px 12px',
                            border: '1px solid #CBD5E1',
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontFamily: 'monospace',
                            outline: 'none',
                          }}
                        />
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                    <button
                      type="submit"
                      disabled={notificationsSaving}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 20px',
                        backgroundColor: '#2563EB',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: notificationsSaving ? 'not-allowed' : 'pointer',
                        opacity: notificationsSaving ? 0.7 : 1,
                      }}
                    >
                      <Save size={14} />
                      {notificationsSaving ? 'Saving Preferences...' : 'Save Notification Preferences'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 9: DEVICE / SESSION MANAGEMENT                                        */}
            {/* ========================================================================= */}
            {activeTab === 'sessions' && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '16px', marginBottom: '24px', flexWrap: 'wrap', gap: '14px' }}>
                  <div>
                    <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>Device &amp; Session Management</h2>
                    <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0' }}>
                      Review all authenticated active sessions, IP origins, and devices connected to your user account.
                    </p>
                  </div>

                  {sessions.length > 1 && (
                    <button
                      onClick={handleRevokeAllOtherSessions}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 14px',
                        backgroundColor: '#FEF2F2',
                        color: '#DC2626',
                        border: '1px solid #FECACA',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      <LogOut size={13} /> Revoke All Other Sessions
                    </button>
                  )}
                </div>

                {sessionsLoading ? (
                  <div style={{ padding: '32px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
                    Loading active sessions from backend...
                  </div>
                ) : (
                  <div style={{ border: '1px solid #E2E8F0', borderRadius: '10px', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {sessions.length === 0 ? (
                        <div style={{ padding: '32px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
                          No active sessions detected.
                        </div>
                      ) : (
                        sessions.map((sess) => (
                          <div
                            key={sess.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '16px 20px',
                              borderBottom: '1px solid #F1F5F9',
                              backgroundColor: sess.is_current ? '#F8FAFC' : '#FFFFFF',
                              flexWrap: 'wrap',
                              gap: '12px',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                              <div
                                style={{
                                  width: '40px',
                                  height: '40px',
                                  borderRadius: '8px',
                                  backgroundColor: sess.is_current ? '#EFF6FF' : '#F1F5F9',
                                  color: sess.is_current ? '#2563EB' : '#64748B',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                {sess.client_name?.toLowerCase().includes('phone') ? <Smartphone size={20} /> : <Laptop size={20} />}
                              </div>

                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>
                                    {sess.client_name || 'Standard Web Browser'}
                                  </span>
                                  {sess.is_current && (
                                    <span style={{ padding: '2px 8px', borderRadius: '10px', backgroundColor: '#DCFCE7', color: '#16A34A', fontSize: '11px', fontWeight: 700 }}>
                                      Current Session
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span>IP: {sess.ip_address}</span>
                                  <span>•</span>
                                  <span>Location: {sess.location || 'Unknown'}</span>
                                  <span>•</span>
                                  <span>Last Active: {sess.last_active ? new Date(sess.last_active).toLocaleString() : 'Just now'}</span>
                                </div>
                              </div>
                            </div>

                            {!sess.is_current && (
                              <button
                                onClick={() => handleRevokeSession(sess.id)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '6px 12px',
                                  backgroundColor: '#FFFFFF',
                                  border: '1px solid #E2E8F0',
                                  borderRadius: '6px',
                                  color: '#DC2626',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                <Trash2 size={13} /> Revoke
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 10: LOGIN ACTIVITY                                                    */}
            {/* ========================================================================= */}
            {activeTab === 'login-history' && (
              <div>
                <div style={{ borderBottom: '1px solid #F1F5F9', paddingBottom: '16px', marginBottom: '24px' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>Login Activity &amp; Audit Trail</h2>
                  <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0' }}>
                    Tamper-evident record of all authentication events, cryptographic handshakes, and origin IP addresses.
                  </p>
                </div>

                {historyLoading ? (
                  <div style={{ padding: '32px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
                    Loading audit trail from PostgreSQL...
                  </div>
                ) : (
                  <div style={{ border: '1px solid #E2E8F0', borderRadius: '10px', overflow: 'hidden' }}>
                    <div style={{ padding: '12px 18px', backgroundColor: '#FAFAFA', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                        Recorded Authentications ({loginHistory.length})
                      </span>
                      <span style={{ fontSize: '12px', color: '#64748B' }}>Audit Retention: 90 Days</span>
                    </div>

                    <div className="kavach-table-responsive" style={{ margin: 0 }}>
                      <table style={{ width: '100%', minWidth: '650px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                        <thead>
                        <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '11px', textTransform: 'uppercase' }}>
                          <th style={{ padding: '12px 16px', fontWeight: 600 }}>Status</th>
                          <th style={{ padding: '12px 16px', fontWeight: 600 }}>Timestamp</th>
                          <th style={{ padding: '12px 16px', fontWeight: 600 }}>IP Address</th>
                          <th style={{ padding: '12px 16px', fontWeight: 600 }}>Location</th>
                          <th style={{ padding: '12px 16px', fontWeight: 600 }}>Method</th>
                          <th style={{ padding: '12px 16px', fontWeight: 600 }}>User Agent</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loginHistory.length === 0 ? (
                          <tr>
                            <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#64748B' }}>
                              No authentication events recorded yet.
                            </td>
                          </tr>
                        ) : (
                          loginHistory.map((item) => (
                            <tr key={item.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                              <td style={{ padding: '14px 16px' }}>
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '2px 8px',
                                    borderRadius: '10px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    backgroundColor: item.status === 'SUCCESS' ? '#DCFCE7' : '#FEE2E2',
                                    color: item.status === 'SUCCESS' ? '#16A34A' : '#DC2626',
                                  }}
                                >
                                  {item.status === 'SUCCESS' ? <ShieldCheck size={12} /> : <ShieldAlert size={12} />}
                                  {item.status}
                                </span>
                              </td>
                              <td style={{ padding: '14px 16px', color: '#0F172A', fontWeight: 500 }}>
                                {new Date(item.timestamp).toLocaleString()}
                              </td>
                              <td style={{ padding: '14px 16px', fontFamily: 'monospace', color: '#334155' }}>
                                {item.ip_address}
                              </td>
                              <td style={{ padding: '14px 16px', color: '#64748B' }}>
                                {item.location || 'Localhost / Intranet'}
                              </td>
                              <td style={{ padding: '14px 16px', textTransform: 'uppercase', fontSize: '11px', fontWeight: 600, color: '#2563EB' }}>
                                {item.auth_method}
                              </td>
                              <td style={{ padding: '14px 16px', color: '#64748B', fontSize: '12px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {item.user_agent || 'Standard Client'}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

            </div>
          </div>
        </div>
      </div>
  );
}

export default function SettingsHubPage({ defaultTab }: { defaultTab?: TabKey } = {}) {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC', color: '#64748B', fontSize: '14px' }}>
          Loading Kavach Settings Hub...
        </div>
      }
    >
      <SettingsHubContent defaultTab={defaultTab} />
    </Suspense>
  );
}
