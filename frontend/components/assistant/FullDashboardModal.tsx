'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  X,
  LayoutDashboard,
  Shield,
  Box,
  Layers,
  Cloud,
  GitPullRequest,
  FileCheck,
  Lock,
  Radio,
  Plug,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { KavachLogo } from '@/components/common/KavachLogo';

interface FullDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FullDashboardModal({
  isOpen,
  onClose,
}: FullDashboardModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  const modules = [
    {
      title: 'Code Security',
      subtitle: 'SAST, secrets, SCA',
      href: '/code',
      icon: Shield,
      color: '#4F46E5',
      bg: '#EEF2FF',
    },
    {
      title: 'Container Security',
      subtitle: 'Images, runtime, K8s',
      href: '/code/containers',
      icon: Box,
      color: '#0284C7',
      bg: '#E0F2FE',
    },
    {
      title: 'IaC Security',
      subtitle: 'Terraform, K8s, Cloud',
      href: '/code/iac',
      icon: Layers,
      color: '#7C3AED',
      bg: '#F3E8FF',
    },
    {
      title: 'Cloud Security',
      subtitle: 'AWS, Azure, GCP',
      href: '/cloud',
      icon: Cloud,
      color: '#0D9488',
      bg: '#CCFBF1',
    },
    {
      title: 'Pull Requests',
      subtitle: 'Fixes, automated PRs',
      href: '/code/pull-requests',
      icon: GitPullRequest,
      color: '#EA580C',
      bg: '#FFEDD5',
    },
    {
      title: 'Evidence & Compliance',
      subtitle: 'Reports, compliance',
      href: '/evidence',
      icon: FileCheck,
      color: '#059669',
      bg: '#D1FAE5',
    },
    {
      title: 'Policies',
      subtitle: 'Security governance',
      href: '/policies',
      icon: Lock,
      color: '#DC2626',
      bg: '#FEE2E2',
    },
    {
      title: 'Threat Intel',
      subtitle: 'CVE feeds, zero-days',
      href: '/threat-intel',
      icon: Radio,
      color: '#9333EA',
      bg: '#F3E8FF',
    },
    {
      title: 'Integrations',
      subtitle: 'Slack, Jira, GitHub, AWS',
      href: '/integrations',
      icon: Plug,
      color: '#2563EB',
      bg: '#DBEAFE',
    },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '780px',
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
        {/* Header (Stage 15 Header) */}
        <div
          style={{
            padding: '24px 28px 16px',
            borderBottom: '1px solid #F1F5F9',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <KavachLogo width={110} height={28} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
              Open the full Kavach dashboard
            </h3>
            <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0' }}>
              You can access all security modules, detailed analytics, configurations, and management features.
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

        {/* 9-Module Grid (Matches Stage 15 Grid Exactly) */}
        <div
          style={{
            padding: '24px 28px',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '14px',
            overflowY: 'auto',
            maxHeight: '60vh',
          }}
        >
          {modules.map((mod, idx) => {
            const Icon = mod.icon;
            return (
              <button
                key={idx}
                onClick={() => {
                  onClose();
                  router.push(mod.href);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '16px',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '12px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  outline: 'none',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                  e.currentTarget.style.borderColor = '#CBD5E1';
                  e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#F8FAFC';
                  e.currentTarget.style.borderColor = '#E2E8F0';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    backgroundColor: mod.bg,
                    color: mod.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Icon size={18} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>{mod.title}</span>
                    <ExternalLink size={12} color="#94A3B8" />
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B', marginTop: '3px' }}>
                    {mod.subtitle}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer with Big Primary Button */}
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
          <span style={{ fontSize: '12px', color: '#64748B' }}>
            All operations executed in the AI Assistant synchronize directly with these dashboards.
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={onClose}
              style={{
                padding: '10px 16px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#64748B',
                backgroundColor: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              Stay in Assistant
            </button>

            <button
              onClick={() => {
                onClose();
                router.push('/home');
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 22px',
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
              <span>Open Full Dashboard</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
