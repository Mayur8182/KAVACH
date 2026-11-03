'use client';

/**
 * /onboarding/complete — Step 6 of 6: Onboarding Complete
 * Matches screen 35 in the specification exactly.
 * Real data summary fetched from GET /api/v1/onboarding/summary.
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Check,
  Building,
  Box,
  LayoutGrid,
  Server,
  Shield,
  Search,
  Bell,
  HelpCircle,
  ExternalLink,
  ArrowRight,
  Code2,
  Lock,
  Cloud,
  FileCode,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { KavachMark } from '@/components/common/KavachLogo';

const GithubIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
  </svg>
);

const Logo = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
    <KavachMark size={24} />
    <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em', color: '#0F172A' }}>Kavach</span>
  </div>
);

export default function OnboardingCompletePage() {
  const router = useRouter();

  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);

  const handleGoToWorkspace = async () => {
    setFinishing(true);
    try {
      await api.onboarding.complete();
    } catch (err) {
      console.warn('Could not mark onboarding completed:', err);
    } finally {
      router.push('/assistant');
    }
  };

  useEffect(() => {
    let isMounted = true;
    async function loadSummary() {
      try {
        setLoading(true);
        setError(null);
        const res = await api.onboarding.getSummary();
        if (isMounted) {
          setSummary(res);
          setLoading(false);
        }
      } catch (err: any) {
        console.error('Failed to load onboarding summary:', err);
        if (isMounted) {
          setError(err?.message || 'Failed to retrieve onboarding configuration from server.');
          setLoading(false);
        }
      }
    }
    loadSummary();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#F8FAFC', fontFamily: 'Inter, -apple-system, sans-serif' }}>
      {/* Top Header Navigation */}
      <header style={{ padding: '12px 32px', backgroundColor: '#FFFFFF', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <Logo />
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, fontSize: 13, color: '#475569' }}>
            <Link href="/platform" style={{ textDecoration: 'none', color: '#475569' }}>Platform</Link>
            <Link href="/products" style={{ textDecoration: 'none', color: '#2563EB', fontWeight: 600 }}>Products</Link>
            <Link href="/solutions" style={{ textDecoration: 'none', color: '#475569' }}>Solutions</Link>
            <Link href="/enterprise" style={{ textDecoration: 'none', color: '#475569' }}>Enterprise</Link>
            <Link href="/pricing" style={{ textDecoration: 'none', color: '#475569' }}>Pricing</Link>
            <Link href="/resources" style={{ textDecoration: 'none', color: '#475569' }}>Resources</Link>
            <Link href="/docs" style={{ textDecoration: 'none', color: '#475569' }}>Docs</Link>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ position: 'relative', width: 200 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
            <input
              type="text"
              placeholder="Search..."
              style={{
                width: '100%',
                padding: '6px 10px 6px 30px',
                fontSize: 12,
                borderRadius: 6,
                border: '1px solid #E2E8F0',
                backgroundColor: '#F8FAFC',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <button type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', position: 'relative' }}>
            <Bell size={18} />
            <span style={{ position: 'absolute', top: -2, right: -2, width: 7, height: 7, borderRadius: '50%', backgroundColor: '#EF4444' }} />
          </button>
          <button type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}>
            <HelpCircle size={18} />
          </button>
          <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: '#0F172A', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
            {summary?.user?.initials || 'SL'}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ flex: 1, padding: '28px 36px', maxWidth: 1280, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        {/* Breadcrumb */}
        <div style={{ fontSize: 12, color: '#64748B', marginBottom: 16 }}>
          <Link href="/" style={{ color: '#64748B', textDecoration: 'none' }}>Home</Link>
          <span style={{ margin: '0 6px' }}>&gt;</span>
          <Link href="/onboarding/organization" style={{ color: '#64748B', textDecoration: 'none' }}>Onboarding</Link>
          <span style={{ margin: '0 6px' }}>&gt;</span>
          <span style={{ color: '#0F172A', fontWeight: 600 }}>Complete</span>
        </div>

        {/* Layout Grid: Stepper + Main Content */}
        <div style={{ display: 'grid', gridTemplateColumns: '240px minmax(0, 1fr)', gap: 36, alignItems: 'start' }} className="onboarding-page-grid">
          {/* Left Stepper Sidebar (All completed) */}
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: '0 0 20px', letterSpacing: '-0.01em' }}>
              Onboarding
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Step 1 - Completed */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: '#16A34A', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, flexShrink: 0 }}>
                  <Check size={14} strokeWidth={2.5} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#334155' }}>Organization</span>
              </div>

              {/* Step 2 - Completed */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: '#16A34A', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, flexShrink: 0 }}>
                  <Check size={14} strokeWidth={2.5} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#334155' }}>Workspace</span>
              </div>

              {/* Step 3 - Completed */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: '#16A34A', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, flexShrink: 0 }}>
                  <Check size={14} strokeWidth={2.5} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#334155' }}>Project & Git</span>
              </div>

              {/* Step 4 - Completed */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: '#16A34A', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, flexShrink: 0 }}>
                  <Check size={14} strokeWidth={2.5} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#334155' }}>Environment</span>
              </div>

              {/* Step 5 - Completed */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: '#16A34A', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, flexShrink: 0 }}>
                  <Check size={14} strokeWidth={2.5} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#334155' }}>Security Products</span>
              </div>

              {/* Step 6 - Active / Completed */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: '#2563EB', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                  <Check size={14} strokeWidth={2.5} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#2563EB' }}>Configuration & Ready</span>
              </div>
            </div>
          </div>

          {/* Right Main Content */}
          <div>
            {/* Header Hero + Setup Completed Badge */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
              <div>
                <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0F172A', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
                  You&apos;re all set, {summary?.user?.name || 'Developer'}!
                </h1>
                <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>
                  Your Kavach workspace is ready. You can now start securing your code, cloud and infrastructure.
                </p>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 18px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: 10,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    backgroundColor: '#10B981',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Check size={18} strokeWidth={2.5} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Setup Completed</div>
                  <div style={{ fontSize: 11, color: '#64748B' }}>Welcome to Kavach</div>
                </div>
              </div>
            </div>

            {/* 6 Grid Summary Cards */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 18,
                marginBottom: 28,
              }}
              className="summary-grid"
            >
              {/* Card 1: GitHub Connected */}
              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <GithubIcon size={18} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>GitHub Connected</span>
                  </div>
                  <Link href="/onboarding/connect-github" style={{ textDecoration: 'none', padding: '3px 10px', fontSize: 11, fontWeight: 600, color: '#475569', backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: 4, display: 'inline-block' }}>
                    Manage
                  </Link>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 2 }}>
                  {summary?.github?.username || (summary?.github?.connected ? 'GitHub Connected' : 'Not Connected')}
                </div>
                <div style={{ fontSize: 11, color: '#64748B', marginBottom: 14 }}>
                  {summary?.github?.repositories?.length ? `${summary.github.repositories.length} repositories selected` : 'No repositories imported'}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {summary?.github?.repositories && summary.github.repositories.length > 0 ? (
                    summary.github.repositories.map((repo: any) => (
                      <div key={repo.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: '#334155' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <GithubIcon size={13} />
                          <span>{repo.name}</span>
                        </span>
                        <span style={{ fontSize: 10, color: '#64748B', backgroundColor: '#F1F5F9', padding: '1px 6px', borderRadius: 4 }}>
                          {repo.visibility || 'Private'}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div style={{ fontSize: 12, color: '#94A3B8', fontStyle: 'italic' }}>No repositories configured</div>
                  )}
                </div>
              </div>

              {/* Card 2: Organization */}
              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Building size={16} color="#2563EB" />
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Organization</span>
                  </div>
                  <Link href="/onboarding/organization" style={{ textDecoration: 'none', padding: '3px 10px', fontSize: 11, fontWeight: 600, color: '#475569', backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: 4, display: 'inline-block' }}>
                    View
                  </Link>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 2 }}>
                  {summary?.organization?.name || 'Primary Organization'}
                </div>
                <div style={{ fontSize: 11, color: '#64748B', marginBottom: 14 }}>
                  {summary?.organization?.slug || 'primary-org'}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: '#475569' }}>
                  <div>{summary?.organization?.industry || 'Technology'}</div>
                  <div>{summary?.organization?.team_size ? `${summary.organization.team_size} members` : '11-50 members'}</div>
                  <div>{summary?.organization?.region || 'Asia Pacific (Mumbai)'}</div>
                </div>
              </div>

              {/* Card 3: Workspace */}
              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Box size={16} color="#2563EB" />
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Workspace</span>
                  </div>
                  <Link href="/onboarding/workspace" style={{ textDecoration: 'none', padding: '3px 10px', fontSize: 11, fontWeight: 600, color: '#475569', backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: 4, display: 'inline-block' }}>
                    View
                  </Link>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 2 }}>
                  {summary?.workspace?.name || 'Primary Workspace'}
                </div>
                <div style={{ fontSize: 11, color: '#64748B', marginBottom: 14 }}>
                  {summary?.workspace?.slug || 'primary-workspace'}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: '#475569' }}>
                  <div>Default visibility: {summary?.workspace?.visibility || 'Private'}</div>
                  <div>Region: {summary?.workspace?.region || 'ap-south-1 (Mumbai)'}</div>
                  <div>{summary?.workspace?.environments_count ?? 3} environments</div>
                </div>
              </div>

              {/* Card 4: Selected Products */}
              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <LayoutGrid size={16} color="#2563EB" />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Selected Products</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { key: 'code_security', label: 'Code Security', icon: Code2 },
                    { key: 'cloud_security', label: 'Cloud Security', icon: Cloud },
                    { key: 'secrets_detection', label: 'Secrets Detection', icon: Lock },
                    { key: 'iac_security', label: 'Infrastructure as Code', icon: FileCode },
                    { key: 'sca_security', label: 'Dependency Scanning (SCA)', icon: Shield },
                  ].map(prod => (
                    <div key={prod.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#334155' }}>
                        <prod.icon size={13} color="#64748B" />
                        <span>{prod.label}</span>
                      </span>
                      <span style={{ fontSize: 11, color: '#15803D', backgroundColor: '#DCFCE7', padding: '1px 8px', borderRadius: 10, fontWeight: 600 }}>
                        {summary?.security_products?.find((p: any) => p.id === prod.key)?.status || 'Enabled'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card 5: Environments */}
              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <Server size={16} color="#2563EB" />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Environments</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[
                    { label: 'Development', dotColor: '#10B981' },
                    { label: 'Staging', dotColor: '#3B82F6' },
                    { label: 'Production', dotColor: '#F59E0B' },
                  ].map(env => (
                    <div key={env.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#334155' }}>
                        <div style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: env.dotColor }} />
                        <span>{env.label}</span>
                      </span>
                      <span style={{ fontSize: 11, color: '#15803D', backgroundColor: '#DCFCE7', padding: '1px 8px', borderRadius: 10, fontWeight: 600 }}>
                        {summary?.environments?.find((e: any) => e.name === env.label)?.status || 'Configured'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card 6: Security Scan Status */}
              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <Shield size={16} color="#2563EB" />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Security Scan Status</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { key: 'code_scan', label: 'Code Scan', icon: Code2 },
                    { key: 'dependency_scan', label: 'Dependency Scan', icon: Shield },
                    { key: 'iac_scan', label: 'IaC Scan', icon: FileCode },
                    { key: 'secret_scan', label: 'Secret Scan', icon: Lock },
                    { key: 'container_scan', label: 'Container Scan', icon: Server },
                  ].map(scan => (
                    <div key={scan.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#334155' }}>
                        <scan.icon size={13} color="#64748B" />
                        <span>{scan.label}</span>
                      </span>
                      <span style={{ fontSize: 11, color: '#15803D', backgroundColor: '#DCFCE7', padding: '1px 8px', borderRadius: 10, fontWeight: 600 }}>
                        {summary?.scan_status?.find((s: any) => s.id === scan.key)?.status || 'Ready'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Actions Bar */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: 10,
                padding: '20px 24px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              }}
              className="bottom-cta-bar"
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>
                  Next Steps
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px 24px', fontSize: 12, color: '#64748B' }}>
                  <div>1. Explore your dashboard and security findings</div>
                  <div>2. Set up team members and access controls</div>
                  <div>3. Configure additional repositories and projects</div>
                  <div>4. Customize security policies and scan settings</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, flexShrink: 0 }}>
                <Link
                  href="/docs"
                  style={{
                    padding: '10px 18px',
                    border: '1px solid #CBD5E1',
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#334155',
                    textDecoration: 'none',
                    backgroundColor: '#FFFFFF',
                  }}
                >
                  View Onboarding Guide
                </Link>

                <button
                  type="button"
                  id="go-to-workspace-btn"
                  onClick={handleGoToWorkspace}
                  disabled={finishing}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 22px',
                    backgroundColor: '#2563EB',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: finishing ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)',
                  }}
                >
                  <span>{finishing ? 'Finalizing Setup...' : 'Go to Workspace'}</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <style jsx>{`
        @media (max-width: 1024px) {
          .summary-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 800px) {
          .summary-grid {
            grid-template-columns: 1fr !important;
          }
          .bottom-cta-bar {
            flex-direction: column !important;
            gap: 16px !important;
            align-items: flex-start !important;
          }
          .onboarding-page-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
