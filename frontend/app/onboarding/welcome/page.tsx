'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Shield,
  Building,
  Layers,
  Sparkles,
  GitBranch,
  Scan,
  ArrowRight,
  Compass,
  CheckCircle2,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { KavachMark } from '@/components/common/KavachLogo';
import { api } from '@/lib/api/client';

export default function OnboardingWelcomePage() {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [isDeferring, setIsDeferring] = useState(false);

  useEffect(() => {
    let isMounted = true;
    api.auth
      .me()
      .then((user) => {
        if (!isMounted) return;
        if (user) {
          setUserName(user.name || user.full_name || '');
          setUserEmail(user.email || '');
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  const handleStartSetup = () => {
    router.push('/onboarding/organization');
  };

  const handleDeferSetup = async () => {
    setIsDeferring(true);
    try {
      await api.onboarding.updateState({
        status: 'DEFERRED',
        setup_deferred: true,
        last_step: 'welcome',
      });
    } catch (err) {
      console.warn('Could not update onboarding deferral:', err);
    } finally {
      setIsDeferring(false);
      router.push('/code');
    }
  };

  const steps = [
    {
      num: '01',
      title: 'Organization & Workspace',
      desc: 'Define your enterprise tenant, industry, and multi-region data residency boundaries.',
      icon: Building,
      badge: 'Required',
    },
    {
      num: '02',
      title: 'Project & Environment',
      desc: 'Set up isolated security scopes for Production, Staging, and Ephemeral CI branches.',
      icon: Layers,
      badge: 'Required',
    },
    {
      num: '03',
      title: 'Product Selection',
      desc: 'Activate subscribed modules: Thing Code, Thing Cloud, Thing Attack, Protect & Compliance.',
      icon: Sparkles,
      badge: 'Configurable',
    },
    {
      num: '04',
      title: 'Connect Repository',
      desc: 'Authorize GitHub or private Git providers with least-privilege read-only permissions.',
      icon: GitBranch,
      badge: 'Recommended',
    },
    {
      num: '05',
      title: 'Launch First Security Scan',
      desc: 'Run deterministic SAST, Secret leak detection, and SBOM dependency vulnerability scans.',
      icon: Scan,
      badge: 'Interactive',
    },
  ];

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#F8FAFC',
        color: '#0F172A',
        fontFamily: 'Inter, -apple-system, sans-serif',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top Header */}
      <header
        style={{
          height: '64px',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 32px',
          backgroundColor: '#FFFFFF',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <KavachMark size={28} />
          <div>
            <div
              style={{
                fontSize: '13px',
                fontWeight: 800,
                letterSpacing: '0.08em',
                color: '#0F172A',
                textTransform: 'uppercase',
              }}
            >
              KAVACH
            </div>
            <div
              style={{
                fontSize: '10px',
                fontWeight: 600,
                letterSpacing: '0.06em',
                color: '#64748B',
                textTransform: 'uppercase',
              }}
            >
              ENTERPRISE SECURITY ONBOARDING
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '12px', color: '#64748B' }}>
            Logged in as <strong style={{ color: '#0F172A' }}>{userEmail || 'Security Admin'}</strong>
          </span>
          <button
            type="button"
            onClick={handleDeferSetup}
            disabled={isDeferring}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              color: '#475569',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F1F5F9')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
          >
            {isDeferring ? 'Saving...' : 'Resume Setup Later →'}
          </button>
        </div>
      </header>

      {/* Main Content Hero */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 24px',
          maxWidth: '960px',
          margin: '0 auto',
          width: '100%',
        }}
      >
        {/* Welcome Tag */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '5px 14px',
            borderRadius: '9999px',
            backgroundColor: '#EFF6FF',
            border: '1px solid #BFDBFE',
            color: '#2563EB',
            fontSize: '12px',
            fontWeight: 600,
            marginBottom: '20px',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          <Sparkles size={14} />
          <span>First-Time Setup Experience</span>
        </div>

        {/* Heading */}
        <h1
          style={{
            fontSize: '32px',
            fontWeight: 800,
            color: '#0F172A',
            textAlign: 'center',
            margin: '0 0 12px 0',
            letterSpacing: '-0.02em',
            lineHeight: 1.25,
          }}
        >
          {userName ? `Welcome, ${userName}` : 'Welcome to Kavach'}
        </h1>

        <p
          style={{
            fontSize: '15px',
            color: '#64748B',
            textAlign: 'center',
            maxWidth: '640px',
            margin: '0 0 36px 0',
            lineHeight: 1.6,
          }}
        >
          Your deterministic application security control plane. In 5 straightforward steps, set up your workspace,
          connect your source repositories, and execute your first cryptographic security scan.
        </p>

        {/* Steps Card Grid */}
        <div
          style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            marginBottom: '36px',
          }}
        >
          {steps.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.num}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 20px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '12px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
                  transition: 'border-color 0.15s ease, transform 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      backgroundColor: '#EFF6FF',
                      border: '1px solid #DBEAFE',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#2563EB',
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={18} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontFamily: 'monospace',
                          fontWeight: 700,
                          color: '#2563EB',
                        }}
                      >
                        STEP {s.num}
                      </span>
                      <h3
                        style={{
                          fontSize: '14.5px',
                          fontWeight: 600,
                          color: '#0F172A',
                          margin: 0,
                        }}
                      >
                        {s.title}
                      </h3>
                    </div>
                    <p
                      style={{
                        fontSize: '12.5px',
                        color: '#64748B',
                        margin: '3px 0 0 0',
                      }}
                    >
                      {s.desc}
                    </p>
                  </div>
                </div>

                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '3px 8px',
                    borderRadius: '4px',
                    backgroundColor: s.badge === 'Required' ? '#FEF2F2' : '#F1F5F9',
                    color: s.badge === 'Required' ? '#DC2626' : '#475569',
                    border: `1px solid ${s.badge === 'Required' ? '#FECACA' : '#E2E8F0'}`,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {s.badge}
                </span>
              </div>
            );
          })}
        </div>

        {/* CTA Actions */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            width: '100%',
            justifyContent: 'center',
          }}
        >
          <button
            type="button"
            onClick={handleStartSetup}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 28px',
              borderRadius: '8px',
              backgroundColor: '#2563EB',
              color: '#FFFFFF',
              fontSize: '14px',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)',
              transition: 'transform 0.15s ease, background-color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1D4ED8')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#2563EB')}
          >
            <span>Start Guided Setup</span>
            <ArrowRight size={16} />
          </button>

          <button
            type="button"
            onClick={handleDeferSetup}
            disabled={isDeferring}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              borderRadius: '8px',
              backgroundColor: '#FFFFFF',
              color: '#334155',
              fontSize: '14px',
              fontWeight: 600,
              border: '1px solid #CBD5E1',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F1F5F9')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
          >
            <Compass size={16} />
            <span>{isDeferring ? 'Saving...' : 'Explore Dashboard (Resume Later)'}</span>
          </button>
        </div>
      </main>

      {/* Footer info note */}
      <footer
        style={{
          padding: '18px 32px',
          borderTop: '1px solid #E2E8F0',
          textAlign: 'center',
          fontSize: '12px',
          color: '#64748B',
          backgroundColor: '#FFFFFF',
        }}
      >
        <span>Kavach Production Security · Deterministic Policy & Scanners Engine · LLM Proposes, OPA Decides</span>
      </footer>
    </div>
  );
}
