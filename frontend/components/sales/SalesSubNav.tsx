'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ChevronRight,
  Sparkles,
  RefreshCw,
  LayoutGrid,
  Workflow,
  Calendar,
  Send,
  Box,
  HardDrive,
  FileCode2,
  Lock,
  Rocket,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

export interface SalesSubNavProps {
  currentModuleTitle?: string;
  currentStepNumber?: number; // 1 to 8
  activeStepKey?: string; // 'lead' | 'qual' | 'demo' | 'poc' | 'proposal' | 'contract' | 'onboard'
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

const STEP_KEY_MAP: Record<string, number> = {
  lead: 1,
  interest: 1,
  intake: 2,
  qual: 3,
  qualification: 3,
  demo: 4,
  sandbox: 4,
  poc: 5,
  proposal: 6,
  quote: 6,
  contract: 7,
  onboard: 8,
  onboarding: 8,
};

export const SalesSubNav: React.FC<SalesSubNavProps> = ({
  currentModuleTitle,
  currentStepNumber,
  activeStepKey,
  onRefresh,
  isRefreshing = false,
}) => {
  const pathname = usePathname();
  const effectiveStepNumber = currentStepNumber ?? (activeStepKey ? STEP_KEY_MAP[activeStepKey] : undefined);

  const lifecycleStages = [
    { num: 1, name: 'Interest', route: '/sales/book-demo' },
    { num: 2, name: 'Demo Request', route: '/sales/request-demo' },
    { num: 3, name: 'Qualification', route: '/sales/qualification' },
    { num: 4, name: 'Product Demo', route: '/sales/demo-workspace' },
    { num: 5, name: 'POC', route: '/sales/poc-workspace' },
    { num: 6, name: 'Proposal', route: '/sales/proposal' },
    { num: 7, name: 'Contract', route: '/sales/contract' },
    { num: 8, name: 'Onboarding', route: '/sales/enterprise-onboarding' },
  ];

  const quickTabs = [
    { label: 'Overview', href: '/sales', icon: LayoutGrid },
    { label: 'Pipeline', href: '/sales/pipeline', icon: Workflow },
    { label: 'Book Demo', href: '/sales/book-demo', icon: Calendar },
    { label: 'Intake', href: '/sales/request-demo', icon: Send },
    { label: 'Sandbox Demo', href: '/sales/demo-workspace', icon: Box },
    { label: 'POC Workspace', href: '/sales/poc-workspace', icon: HardDrive },
    { label: 'CPQ Quote', href: '/sales/proposal', icon: FileCode2 },
    { label: 'Contract', href: '/sales/contract', icon: Lock },
    { label: 'Onboarding', href: '/sales/enterprise-onboarding', icon: Rocket },
  ];

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E2E8F0',
        fontFamily: "var(--font-sans, 'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif)",
        position: 'sticky',
        top: 0,
        zIndex: 30,
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)',
      }}
    >
      {/* Top Bar: Breadcrumb + System Status + Refresh */}
      <div
        style={{
          maxWidth: '1440px',
          margin: '0 auto',
          padding: '10px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #F1F5F9',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        {/* Left: Breadcrumbs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px' }}>
          <Link
            href="/home"
            style={{ color: '#64748B', textDecoration: 'none', fontWeight: 500 }}
            onMouseOver={(e) => (e.currentTarget.style.color = '#0F172A')}
            onMouseOut={(e) => (e.currentTarget.style.color = '#64748B')}
          >
            Kavach
          </Link>
          <ChevronRight size={12} color="#94A3B8" />
          <Link
            href="/sales"
            style={{ color: '#64748B', textDecoration: 'none', fontWeight: 500 }}
            onMouseOver={(e) => (e.currentTarget.style.color = '#0F172A')}
            onMouseOut={(e) => (e.currentTarget.style.color = '#64748B')}
          >
            Sales &amp; Enterprise
          </Link>
          {currentModuleTitle && (
            <>
              <ChevronRight size={12} color="#94A3B8" />
              <span style={{ color: '#0F172A', fontWeight: 600 }}>{currentModuleTitle}</span>
            </>
          )}
        </div>

        {/* Right: Live Telemetry Indicator & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              padding: '3px 9px',
              borderRadius: '9999px',
              backgroundColor: '#F0FDF4',
              color: '#166534',
              border: '1px solid #DCFCE7',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: '#16A34A',
              }}
            />
            PostgreSQL Live Telemetry
          </span>

          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 10px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#334155',
                fontSize: '11.5px',
                fontWeight: 600,
                cursor: isRefreshing ? 'not-allowed' : 'pointer',
              }}
            >
              <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
          )}
        </div>
      </div>

      {/* Middle Bar: 8-Stage Interactive Lifecycle Ribbon */}
      <div
        style={{
          maxWidth: '1440px',
          margin: '0 auto',
          padding: '8px 24px',
          display: 'flex',
          alignItems: 'center',
          overflowX: 'auto',
          gap: '8px',
          borderBottom: '1px solid #F1F5F9',
        }}
      >
        <span
          style={{
            fontSize: '11px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            color: '#64748B',
            flexShrink: 0,
            marginRight: '6px',
          }}
        >
          Lifecycle:
        </span>

        {lifecycleStages.map((stage, idx) => {
          const isCurrent = effectiveStepNumber === stage.num || pathname === stage.route;
          const isPassed = effectiveStepNumber ? effectiveStepNumber > stage.num : false;

          return (
            <React.Fragment key={stage.num}>
              {idx > 0 && (
                <div
                  style={{
                    width: '16px',
                    height: '1px',
                    backgroundColor: isPassed ? '#0F172A' : '#E2E8F0',
                    flexShrink: 0,
                  }}
                />
              )}
              <Link
                href={stage.route}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  fontSize: '12px',
                  fontWeight: isCurrent ? 700 : 500,
                  color: isCurrent ? '#0F172A' : isPassed ? '#334155' : '#64748B',
                  backgroundColor: isCurrent ? '#F1F5F9' : 'transparent',
                  border: isCurrent ? '1px solid #CBD5E1' : '1px solid transparent',
                  flexShrink: 0,
                  transition: 'all 0.15s ease',
                }}
                onMouseOver={(e) => {
                  if (!isCurrent) e.currentTarget.style.backgroundColor = '#F8FAFC';
                }}
                onMouseOut={(e) => {
                  if (!isCurrent) e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <span
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    backgroundColor: isCurrent ? '#0F172A' : isPassed ? '#10B981' : '#E2E8F0',
                    color: isCurrent || isPassed ? '#FFFFFF' : '#64748B',
                    fontSize: '10px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {isPassed ? <CheckCircle2 size={12} /> : stage.num}
                </span>
                <span>{stage.name}</span>
              </Link>
            </React.Fragment>
          );
        })}
      </div>

      {/* Bottom Bar: Quick Jump Navigation Tabs */}
      <div
        style={{
          maxWidth: '1440px',
          margin: '0 auto',
          padding: '4px 24px',
          display: 'flex',
          alignItems: 'center',
          overflowX: 'auto',
          gap: '4px',
        }}
      >
        {quickTabs.map((tab) => {
          const isActive = pathname === tab.href;
          const Icon = tab.icon;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? '#0F172A' : '#64748B',
                textDecoration: 'none',
                backgroundColor: isActive ? '#F1F5F9' : 'transparent',
                flexShrink: 0,
                transition: 'background-color 0.12s ease',
              }}
              onMouseOver={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = '#F8FAFC';
              }}
              onMouseOut={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <Icon size={14} color={isActive ? '#0F172A' : '#64748B'} />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default SalesSubNav;
