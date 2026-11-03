'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  X,
  Check,
  CheckCircle2,
  ExternalLink,
  Shield,
  Loader2,
  Bell,
  Sliders,
  ArrowRight,
} from 'lucide-react';
import { toast } from '@/lib/toast';

export const SlackIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" fill="#E01E5A" />
    <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52z" fill="#36C5F0" />
    <path d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834z" fill="#2EB67D" />
    <path d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834z" fill="#ECB22E" />
  </svg>
);

export const JiraIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M11.53 2c0 5.26 4.27 9.53 9.53 9.53H22V2h-10.47z" fill="#0052CC" />
    <path d="M2 11.53c5.26 0 9.53 4.27 9.53 9.53V22H2v-10.47z" fill="#2684FF" />
    <path d="M11.53 11.53c0-5.26-4.27-9.53-9.53-9.53H2v10.47h9.53z" fill="#0052CC" />
  </svg>
);

export const GitHubIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
  </svg>
);

export const AwsIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M6.5 13.5c3.5 2.5 8.5 2.5 12 0" stroke="#FF9900" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M18.5 13.5l1.5 2.5-2.5.5" stroke="#FF9900" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="3" y="4" width="18" height="6" rx="2" fill="#232F3E" />
  </svg>
);

export const DatadogIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#632CA6">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14.93V18h-2v-1.07c-2.83-.48-5-2.94-5-5.93h2c0 2.21 1.79 4 4 4s4-1.79 4-4h2c0 2.99-2.17 5.45-5 5.93z" />
  </svg>
);

export const PagerDutyIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#06AC38">
    <path d="M13.2 2H5v20h4.2v-6.3h4c4.6 0 7.8-3 7.8-6.9C21 4.9 17.8 2 13.2 2zm-.2 9.6H9.2V6.2h3.8c2.4 0 3.8 1.4 3.8 2.7 0 1.4-1.4 2.7-3.8 2.7z" />
  </svg>
);

export const ProviderIcon = ({ provider, size = 22 }: { provider: string; size?: number }) => {
  const p = (provider || '').toLowerCase();
  if (p === 'slack') return <SlackIcon size={size} />;
  if (p === 'jira') return <JiraIcon size={size} />;
  if (p === 'github') return <GitHubIcon size={size} />;
  if (p === 'aws') return <AwsIcon size={size} />;
  if (p === 'datadog') return <DatadogIcon size={size} />;
  if (p === 'pagerduty') return <PagerDutyIcon size={size} />;
  return <Shield size={size} color="#2563EB" />;
};

// ─────────────────────────────────────────────────────────────────────────────
// STAGE 02: Proposed Integration Card
// ─────────────────────────────────────────────────────────────────────────────
interface ProposedIntegrationCardProps {
  provider: string;
  providerName: string;
  cardData: {
    title: string;
    description: string;
    button_text: string;
  };
  onConnectClick: () => void;
}

export function ProposedIntegrationCard({
  provider,
  providerName,
  cardData,
  onConnectClick,
}: ProposedIntegrationCardProps) {
  return (
    <div
      style={{
        marginTop: 14,
        padding: '16px 20px',
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: 12,
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <ProviderIcon provider={provider} size={24} />
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>
            {providerName}
          </div>
          <div style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>
            {cardData.description}
          </div>
        </div>
      </div>

      <button
        type="button"
        id={`connect-with-${provider}-btn`}
        onClick={onConnectClick}
        style={{
          padding: '10px 18px',
          backgroundColor: '#0F172A',
          color: '#FFFFFF',
          border: 'none',
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          transition: 'all 0.15s ease',
        }}
      >
        <span>{cardData.button_text}</span>
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STAGE 03: Universal Modal Authorization
// ─────────────────────────────────────────────────────────────────────────────
export interface ConnectUniversalIntegrationModalProps {
  isOpen: boolean;
  provider: string;
  providerName?: string;
  permissions?: string[];
  onClose: () => void;
  onContinue: (configData?: any) => void;
}

export function ConnectUniversalIntegrationModal({
  isOpen,
  provider,
  providerName,
  permissions,
  onClose,
  onContinue,
}: ConnectUniversalIntegrationModalProps) {
  if (!isOpen) return null;
  const pName = providerName || (provider ? provider.charAt(0).toUpperCase() + provider.slice(1) : 'Service');
  const perms = permissions && permissions.length > 0 ? permissions : [
    `Read ${pName} workspace and configuration metadata`,
    `Send security telemetry and incident notifications to ${pName}`,
    `Enable interactive webhook remediation actions`,
    `Synchronize continuous compliance audit trail`,
  ];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 20,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 460,
          backgroundColor: '#FFFFFF',
          borderRadius: 16,
          boxShadow: '0 20px 40px -8px rgba(0,0,0,0.18)',
          border: '1px solid #E2E8F0',
          overflow: 'hidden',
          padding: '28px 24px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Center Provider Icon */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ProviderIcon provider={provider} size={32} />
          </div>
        </div>

        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', margin: 0 }}>
            Connect your {pName} workspace
          </h2>
          <p style={{ fontSize: 13, color: '#64748B', margin: '6px 0 0' }}>
            Authorize Kavach to connect with {pName}.
            <br />
            We only request necessary security telemetry permissions.
          </p>
        </div>

        {/* Permissions Required */}
        <div
          style={{
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: 10,
            padding: '16px 18px',
            marginBottom: 24,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', marginBottom: 10 }}>
            Permissions required
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {perms.map((perm, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#334155' }}>
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    backgroundColor: '#DCFCE7',
                    color: '#16A34A',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Check size={12} strokeWidth={3} />
                </div>
                <span>{perm}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '9px 18px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              color: '#475569',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            id={`modal-continue-${provider}-btn`}
            onClick={() => onContinue()}
            style={{
              padding: '9px 18px',
              backgroundColor: '#0F172A',
              border: 'none',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              color: '#FFFFFF',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>Continue with {pName}</span>
            <ExternalLink size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function ConnectSlackModal({ isOpen, onClose, onContinue }: { isOpen: boolean; onClose: () => void; onContinue: () => void }) {
  return (
    <ConnectUniversalIntegrationModal
      isOpen={isOpen}
      provider="slack"
      providerName="Slack"
      onClose={onClose}
      onContinue={onContinue}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STAGE 04: Connection Progress Timeline Card
// ─────────────────────────────────────────────────────────────────────────────
interface ConnectingIntegrationCardProps {
  provider: string;
  providerName?: string;
  currentStepIndex: number; // 0..4
}

export function ConnectingIntegrationCard({ provider, providerName, currentStepIndex }: ConnectingIntegrationCardProps) {
  const pName = providerName || (provider ? provider.charAt(0).toUpperCase() + provider.slice(1) : 'Service');
  const steps = [
    `Redirecting to ${pName}`,
    'Authorizing application identity',
    'Fetching workspace metadata',
    'Configuring security webhooks',
    'Validating secure connection',
  ];

  return (
    <div
      style={{
        marginTop: 14,
        padding: '20px 24px',
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: 14,
        boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
      }}
    >
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: 0 }}>
          Connecting {pName} workspace...
        </h3>
        <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 0' }}>
          Please wait while we complete the integration setup and verify security credentials.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {steps.map((label, idx) => {
          const isDone = idx < currentStepIndex;
          const isInProgress = idx === currentStepIndex;
          return (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: 13,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {isDone ? (
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      backgroundColor: '#16A34A',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Check size={13} strokeWidth={3} />
                  </div>
                ) : isInProgress ? (
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      backgroundColor: '#F97316',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Loader2 size={13} className="animate-spin" />
                  </div>
                ) : (
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      border: '2px solid #CBD5E1',
                    }}
                  />
                )}
                <span
                  style={{
                    color: isDone || isInProgress ? '#0F172A' : '#94A3B8',
                    fontWeight: isInProgress ? 600 : 400,
                  }}
                >
                  {label}
                </span>
              </div>

              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: isDone ? '#16A34A' : isInProgress ? '#F97316' : '#94A3B8',
                }}
              >
                {isDone ? 'Completed' : isInProgress ? 'In progress...' : 'Pending'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STAGE 05: Integration Success Card
// ─────────────────────────────────────────────────────────────────────────────
interface IntegrationSuccessCardProps {
  provider: string;
  providerName?: string;
  workspaceName: string;
  connectedBy: string;
  connectedAt: string;
  statusBadge?: string;
  onConfigureAlerts?: () => void;
}

export function IntegrationSuccessCard({
  provider,
  providerName,
  workspaceName,
  connectedBy,
  connectedAt,
  statusBadge = 'Connected',
  onConfigureAlerts,
}: IntegrationSuccessCardProps) {
  const pName = providerName || (provider ? provider.charAt(0).toUpperCase() + provider.slice(1) : 'Service');

  return (
    <div
      style={{
        marginTop: 14,
        padding: '24px 28px',
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: 16,
        boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
        textAlign: 'center',
      }}
    >
      {/* Big Green Check Circle */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            backgroundColor: '#DCFCE7',
            color: '#16A34A',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Check size={28} strokeWidth={3} />
        </div>
      </div>

      <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', margin: '0 0 4px' }}>
        {pName} connected successfully!
      </h2>
      <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 20px' }}>
        Your {pName} workspace is now connected to Kavach.
      </p>

      {/* Integration Details Inner Box */}
      <div
        style={{
          maxWidth: 420,
          margin: '0 auto 20px',
          padding: '16px 20px',
          backgroundColor: '#F8FAFC',
          border: '1px solid #E2E8F0',
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ProviderIcon provider={provider} size={22} />
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>
              {workspaceName || 'ADIT Security'}
            </div>
            <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
              Workspace: {workspaceName || 'ADIT Security'}
            </div>
            <div style={{ fontSize: 11, color: '#64748B' }}>
              Connected by: {connectedBy}
            </div>
            <div style={{ fontSize: 11, color: '#64748B' }}>
              Connected at: {connectedAt}
            </div>
          </div>
        </div>

        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            padding: '3px 8px',
            borderRadius: 9999,
            backgroundColor: '#DCFCE7',
            color: '#16A34A',
          }}
        >
          {statusBadge}
        </span>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
        <button
          type="button"
          onClick={() => {
            if (onConfigureAlerts) onConfigureAlerts();
            else toast.success(`Security alert webhooks configured for ${pName}!`);
          }}
          style={{
            padding: '9px 18px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #CBD5E1',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            color: '#334155',
            cursor: 'pointer',
          }}
        >
          Configure alerts
        </button>

        <Link
          href="/settings/integrations"
          style={{
            padding: '9px 18px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #CBD5E1',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            color: '#334155',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
          }}
        >
          View integration
        </Link>
      </div>
    </div>
  );
}
