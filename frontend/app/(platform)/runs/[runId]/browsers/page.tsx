'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Lock,
  Globe,
  ExternalLink,
  Shield,
  Layers,
  ArrowRight,
  FolderGit2,
  Terminal,
  Play,
  RotateCcw,
} from 'lucide-react';

export default function RunBrowsersActionPage() {
  const params = useParams();
  const router = useRouter();
  const runId = (params?.runId as string) || '';
  const runDisplayNumber = runId.length > 8 ? runId.slice(0, 4) : (runId || '482');

  const [activeTab, setActiveTab] = useState<'list' | 'agent' | 'browsers'>('browsers');
  const [selectedStep, setSelectedStep] = useState<number>(5);

  const steps = [
    {
      id: 1,
      title: '1. Open onboarding',
      url: 'https://app.kavach.security/onboarding',
      previewType: 'onboarding',
    },
    {
      id: 2,
      title: '2. Authorize GitHub',
      url: 'https://github.com/login/oauth/authorize?client_id=kavach_sec',
      previewType: 'github-auth',
    },
    {
      id: 3,
      title: '3. Select repository',
      url: 'https://app.kavach.security/repositories/connect',
      previewType: 'select-repo',
    },
    {
      id: 4,
      title: '4. Configuring agents',
      url: 'https://app.kavach.security/runs/new',
      previewType: 'config-agents',
    },
    {
      id: 5,
      title: '5. Run started',
      url: `https://app.kavach.security/runs/${runDisplayNumber}`,
      previewType: 'run-started',
    },
  ];

  const renderBrowserContent = (type: string) => {
    switch (type) {
      case 'onboarding':
        return (
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
              <Shield size={14} color="#FFFFFF" />
            </div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#0F172A' }}>Kavach Security</div>
            <div style={{ fontSize: '9px', color: '#64748B', marginTop: '2px' }}>Autonomous multi-agent code defense</div>
            <div style={{ marginTop: '12px', width: '80%', height: '16px', backgroundColor: '#0F172A', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', fontSize: '9px', fontWeight: 600 }}>
              Get Started
            </div>
          </div>
        );

      case 'github-auth':
        return (
          <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#24292F', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FolderGit2 size={10} color="#FFFFFF" />
              </div>
              <span style={{ fontSize: '10px', fontWeight: 600, color: '#0F172A' }}>Authorize Kavach</span>
            </div>
            <div style={{ fontSize: '9px', color: '#475569', marginBottom: '8px', lineHeight: '1.3' }}>
              Grant read access to repositories and commit checks.
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              <div style={{ flex: 1, height: '18px', backgroundColor: '#2DA44E', borderRadius: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', fontSize: '8px', fontWeight: 600 }}>
                Authorize
              </div>
              <div style={{ width: '36px', height: '18px', backgroundColor: '#F6F8FA', border: '1px solid #D0D7DE', borderRadius: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#24292F', fontSize: '8px' }}>
                Cancel
              </div>
            </div>
          </div>
        );

      case 'select-repo':
        return (
          <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', height: '100%', gap: '6px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#0F172A' }}>Select repository</div>
            <div style={{ padding: '4px 6px', backgroundColor: '#F1F5F9', borderRadius: '3px', fontSize: '8px', color: '#64748B' }}>
              Search repos...
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '2px' }}>
              <div style={{ padding: '4px 6px', backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '3px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '9px', fontWeight: 600, color: '#16A34A' }}>✓ acme/storefront</span>
                <span style={{ fontSize: '7px', color: '#64748B' }}>Private</span>
              </div>
              <div style={{ padding: '4px 6px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '3px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '9px', color: '#475569' }}>acme/platform</span>
                <span style={{ fontSize: '7px', color: '#64748B' }}>Private</span>
              </div>
            </div>
          </div>
        );

      case 'config-agents':
        return (
          <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', height: '100%', gap: '4px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#0F172A' }}>Configure agents</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '2px' }}>
              {['SAST Agent', 'IaC Agent', 'Container', 'API Security'].map((ag, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '8px', color: '#0F172A' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontSize: '6px' }}>✓</div>
                  <span>{ag}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 'auto', height: '16px', backgroundColor: '#0F172A', borderRadius: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', fontSize: '8px', fontWeight: 600 }}>
              Run Analysis
            </div>
          </div>
        );

      case 'run-started':
      default:
        return (
          <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', height: '100%', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '9px', fontWeight: 700, color: '#0F172A' }}>RUN-{runDisplayNumber}</span>
              <span style={{ fontSize: '7px', color: '#16A34A', backgroundColor: '#F0FDF4', padding: '1px 4px', borderRadius: '4px', fontWeight: 600 }}>Running</span>
            </div>
            <div style={{ width: '100%', height: '4px', backgroundColor: '#E2E8F0', borderRadius: '2px', marginTop: '4px', overflow: 'hidden' }}>
              <div style={{ width: '78%', height: '100%', backgroundColor: '#22C55E' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px' }}>
              <div style={{ fontSize: '7px', color: '#334155' }}>✓ SAST: Analyzing session.ts</div>
              <div style={{ fontSize: '7px', color: '#334155' }}>✓ IaC: Evaluating storage.tf</div>
              <div style={{ fontSize: '7px', color: '#334155' }}>✓ Container: Scanning layers</div>
            </div>
          </div>
        );
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        padding: '24px 32px',
        backgroundColor: '#F8FAFC',
        minHeight: '100vh',
        fontFamily: 'Inter, -apple-system, sans-serif',
      }}
    >
      {/* 1. Top Breadcrumb & Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#64748B', marginBottom: '4px' }}>
            <Link href="/runs" style={{ color: '#64748B', textDecoration: 'none' }}>Runs</Link>
            <ChevronRight size={12} />
            <span style={{ color: '#0F172A', fontWeight: 600 }}>Run #{runDisplayNumber}</span>
          </div>
        </div>
      </div>

      {/* 2. Workspace Navigation Tabs matching Panel 8 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px', borderBottom: '1px solid #E2E8F0', paddingBottom: '2px' }}>
        <button
          onClick={() => router.push(`/runs/${runId}`)}
          style={{
            padding: '8px 4px',
            fontSize: '13px',
            fontWeight: 500,
            color: '#64748B',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          List View
        </button>

        <button
          onClick={() => router.push(`/runs/${runId}/agents/sast`)}
          style={{
            padding: '8px 4px',
            fontSize: '13px',
            fontWeight: 500,
            color: '#64748B',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Agent Action View
        </button>

        <button
          style={{
            padding: '8px 4px',
            fontSize: '13px',
            fontWeight: 600,
            color: '#0F172A',
            borderBottom: '2px solid #0F172A',
            background: 'none',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            cursor: 'pointer',
          }}
        >
          Browsers
        </button>
      </div>

      {/* 3. Test Case Header Card matching Panel 8 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '8px',
          padding: '16px 20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: '#F0FDF4',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #BBF7D0',
            }}
          >
            <CheckCircle2 size={16} color="#16A34A" />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                TC004-Set up a project and connect a repository
              </h2>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: '#F0FDF4',
                  color: '#16A34A',
                  border: '1px solid #BBF7D0',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: 600,
                }}
              >
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#16A34A' }} />
                Running
              </span>
            </div>
            <p style={{ fontSize: '12px', color: '#64748B', margin: '4px 0 0 0' }}>
              Verify that a project can be created and a repository can be connected successfully.
            </p>
          </div>
        </div>
      </div>

      {/* 4. Sequential 5-Browser Walkthrough Frames matching Panel 8 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '16px',
        }}
      >
        {steps.map((step) => {
          const isSelected = selectedStep === step.id;
          return (
            <div
              key={step.id}
              onClick={() => setSelectedStep(step.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                cursor: 'pointer',
              }}
            >
              {/* Browser Window Frame */}
              <div
                style={{
                  height: '190px',
                  backgroundColor: '#FFFFFF',
                  border: isSelected ? '2px solid #0F172A' : '1px solid #E2E8F0',
                  borderRadius: '8px',
                  boxShadow: isSelected ? '0 4px 12px rgba(15,23,42,0.08)' : '0 1px 3px rgba(0,0,0,0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  transition: 'all 0.15s ease',
                }}
              >
                {/* Browser Chrome Header */}
                <div
                  style={{
                    backgroundColor: '#F8FAFC',
                    borderBottom: '1px solid #E2E8F0',
                    padding: '6px 8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {/* Traffic lights */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#EF4444' }} />
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#F59E0B' }} />
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981' }} />
                  </div>

                  {/* Address pill */}
                  <div
                    style={{
                      flex: 1,
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: '4px',
                      padding: '2px 6px',
                      fontSize: '8px',
                      color: '#64748B',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Lock size={8} color="#94A3B8" />
                    <span>{step.url.replace('https://', '')}</span>
                  </div>
                </div>

                {/* Viewport content */}
                <div style={{ flex: 1, backgroundColor: '#FFFFFF', overflow: 'hidden' }}>
                  {renderBrowserContent(step.previewType)}
                </div>
              </div>

              {/* Step Title Label */}
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: isSelected ? 600 : 500,
                  color: isSelected ? '#0F172A' : '#64748B',
                  textAlign: 'center',
                }}
              >
                {step.title}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

