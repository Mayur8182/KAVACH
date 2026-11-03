'use client';

import React from 'react';
import {
  ShieldCheck,
  Inbox,
  Search,
  FilterX,
  History,
  BellOff,
  GitBranch,
  Network,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';

export type EmptyStateVariant =
  | 'no_repositories'
  | 'no_vulnerabilities'
  | 'no_policies'
  | 'no_activity'
  | 'no_search_results'
  | 'no_filter_results'
  | 'no_notifications'
  | 'custom';

export interface EmptyStateProps {
  variant?: EmptyStateVariant;
  title?: string;
  description?: string;
  badgeText?: string;
  badgeTone?: 'secured' | 'warning' | 'info' | 'neutral';
  primaryAction?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
    loading?: boolean;
  };
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
    loading?: boolean;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  searchQuery?: string;
  onReset?: () => void;
  metadataLeft?: string;
  metadataRight?: string;
  className?: string;
}

const PRESETS: Record<EmptyStateVariant, {
  title: string;
  description: string;
  badgeText?: string;
  badgeTone?: 'secured' | 'warning' | 'info' | 'neutral';
  icon: React.ReactNode;
  primaryLabel?: string;
  secondaryLabel?: string;
}> = {
  no_vulnerabilities: {
    title: 'No Active Threat Incidents Detected',
    description: 'No high or critical CVE alerts triggered in the monitored codebase or container runtimes.',
    badgeText: 'PERIMETER SECURED: 100% NOMINAL',
    badgeTone: 'secured',
    icon: <ShieldCheck size={28} className="text-emerald-600" />,
    primaryLabel: 'Run On-Demand Heuristic Scan',
    secondaryLabel: 'Adjust Sensitivity Threshold',
  },
  no_repositories: {
    title: 'No Connected Repositories Found',
    description: 'Connect your GitHub or GitLab repositories to enable automated continuous security scanning.',
    badgeText: 'INTEGRATION REQUIRED',
    badgeTone: 'info',
    icon: <GitBranch size={28} className="text-blue-600" />,
    primaryLabel: 'Connect GitHub Repository',
    secondaryLabel: 'Import via Git URL',
  },
  no_policies: {
    title: 'Zero Micro-segmentation Policies Configured',
    description: 'Target namespace has default open ingress. Enable automated eBPF isolation rules to limit lateral blast radius.',
    badgeText: 'WARNING: UNCONFINED INGRESS',
    badgeTone: 'warning',
    icon: <Network size={28} className="text-amber-600" />,
    primaryLabel: 'Deploy Recommended Baseline Rules',
    secondaryLabel: 'Import Custom OPA Policy',
  },
  no_search_results: {
    title: 'No Matching Security Records',
    description: 'No findings, repositories, or audit events matched your search query. Try broadening your terms.',
    badgeText: 'SEARCH RESULTS: 0',
    badgeTone: 'neutral',
    icon: <Search size={28} className="text-slate-500" />,
    primaryLabel: 'Clear Search Query',
  },
  no_filter_results: {
    title: 'No Results Matching Active Filters',
    description: 'Active severity, module, or status filters returned zero records.',
    badgeText: 'FILTERS EXHAUSTED',
    badgeTone: 'neutral',
    icon: <FilterX size={28} className="text-slate-500" />,
    primaryLabel: 'Reset All Filters',
  },
  no_activity: {
    title: 'No Historical Activity Recorded',
    description: 'Zero audit events or scan executions recorded in the current project window.',
    badgeText: 'TIMELINE EMPTY',
    badgeTone: 'neutral',
    icon: <History size={28} className="text-slate-500" />,
    primaryLabel: 'Trigger Baseline Assessment',
  },
  no_notifications: {
    title: 'All Clear — No Unread Notifications',
    description: 'Your security inbox is up to date. You will be alerted when new high-severity CVEs or threats emerge.',
    badgeText: 'NOTIFICATIONS ZERO',
    badgeTone: 'secured',
    icon: <BellOff size={28} className="text-emerald-600" />,
  },
  custom: {
    title: 'No Data Available',
    description: 'There are currently no items to display in this view.',
    badgeTone: 'neutral',
    icon: <Inbox size={28} className="text-slate-500" />,
  },
};

export function EmptyState({
  variant = 'custom',
  title,
  description,
  badgeText,
  badgeTone,
  primaryAction,
  action,
  secondaryAction,
  searchQuery,
  onReset,
  metadataLeft,
  metadataRight,
  className = '',
}: EmptyStateProps) {
  const preset = PRESETS[variant];
  const finalTitle = title || preset.title;
  const finalDesc =
    description ||
    (searchQuery
      ? `No matching records found for "${searchQuery}". Check your query or clear the filter.`
      : preset.description);
  const finalBadgeText = badgeText || (searchQuery ? `QUERY: "${searchQuery}"` : preset.badgeText);
  const finalBadgeTone = badgeTone || preset.badgeTone || 'neutral';

  const effectivePrimaryAction =
    primaryAction ||
    action ||
    (onReset
      ? {
          label: 'Clear Search Query',
          onClick: onReset,
        }
      : undefined);

  const badgeBg =
    finalBadgeTone === 'secured'
      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
      : finalBadgeTone === 'warning'
      ? 'bg-amber-50 text-amber-800 border-amber-200'
      : finalBadgeTone === 'info'
      ? 'bg-blue-50 text-blue-800 border-blue-200'
      : 'bg-slate-100 text-slate-700 border-slate-200';

  return (
    <div
      className={`bg-white border border-slate-200 rounded-xl p-8 shadow-sm flex flex-col justify-between relative overflow-hidden ${className}`}
      style={{ minHeight: '260px' }}
    >
      <div className="flex flex-col items-center text-center max-w-lg mx-auto py-3">
        {/* Central Icon Container */}
        <div className="w-14 h-14 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center mb-4 shadow-sm relative">
          {preset.icon}
          {finalBadgeTone === 'secured' && (
            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white" />
          )}
        </div>

        {/* Micro-badge */}
        {finalBadgeText && (
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-mono font-semibold tracking-wide border mb-3 ${badgeBg}`}
          >
            <span>{finalBadgeText}</span>
          </div>
        )}

        {/* Headline */}
        <h3 className="text-[17px] font-semibold text-slate-900 tracking-tight">{finalTitle}</h3>

        {/* Narrative Description */}
        <p className="text-[13px] text-slate-600 mt-2 mb-6 leading-relaxed max-w-md">{finalDesc}</p>

        {/* Action CTAs */}
        {(effectivePrimaryAction || secondaryAction || preset.primaryLabel) && (
          <div className="flex flex-wrap items-center justify-center gap-2.5 w-full">
            {effectivePrimaryAction && (
              <button
                type="button"
                onClick={effectivePrimaryAction.onClick}
                disabled={effectivePrimaryAction.loading}
                className="px-4 py-2 bg-slate-900 text-white text-[13px] font-semibold rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-60 cursor-pointer"
              >
                {effectivePrimaryAction.loading ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  effectivePrimaryAction.icon || <ArrowRight size={14} />
                )}
                <span>{effectivePrimaryAction.label}</span>
              </button>
            )}

            {secondaryAction && (
              <button
                type="button"
                onClick={secondaryAction.onClick}
                className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-[13px] font-semibold rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2 cursor-pointer"
              >
                {secondaryAction.icon}
                <span>{secondaryAction.label}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Audit & Telemetry Footer */}
      {(metadataLeft || metadataRight) && (
        <div className="pt-4 mt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span>{metadataLeft}</span>
          <span>{metadataRight}</span>
        </div>
      )}
    </div>
  );
}

export default EmptyState;
