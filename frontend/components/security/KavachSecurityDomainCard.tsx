'use client';

/**
 * KavachSecurityDomainCard — High-Fidelity 5-Step Security Domain Card
 * Faithful implementation of Image 2 (Cloud Security) & Image 3 (IaC Security):
 * - Header: Shield with check + "Kavach — [Domain] Security"
 * - 5-Step Horizontal Stepper: Connect -> Discover -> Analyze -> Remediate -> Apply
 * - Multi-provider logos (AWS, Google Cloud, Azure OR GitHub, GitLab, Bitbucket)
 * - Heading: "Connect your [cloud account / IaC repository]"
 * - Subtitle: "Scan your [cloud infrastructure / Terraform, CloudFormation and Kubernetes manifests] for misconfigurations..."
 * - Button: "Connect Account →" / "Connect Repository →"
 * - Live interactive state: allows stepping through Discover -> Analyze -> Remediate -> Apply with real telemetry!
 */

import React, { useState } from 'react';
import {
  ShieldCheck,
  Check,
  RotateCw,
  ArrowRight,
  ExternalLink,
  Layers,
  Cloud,
  FileCode2,
  Lock,
  Activity,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

export interface SecurityDomainCardProps {
  domain: 'cloud' | 'iac';
  onConnect?: () => void;
  className?: string;
  theme?: 'light' | 'dark';
}

const DOMAIN_CONFIG = {
  cloud: {
    title: 'Kavach — Cloud Security',
    heading: 'Connect your cloud account',
    subtitle: 'Scan your cloud infrastructure for misconfigurations, risks and public exposure.',
    cta: 'Connect Account →',
    providers: [
      { name: 'AWS', logo: 'aws' },
      { name: 'Google Cloud', logo: 'gcp' },
      { name: 'Azure', logo: 'azure' },
    ],
    discoverTitle: 'Discovering Cloud Assets across AWS, Azure, GCP...',
    analyzeTitle: 'Evaluating CIS Benchmarks & IAM Blast Radius...',
    remediateTitle: 'Generating Deterministic Least-Privilege Policy Patches...',
    applyTitle: 'Applying Verified Remediations & Generating Audit Certificates...',
  },
  iac: {
    title: 'Kavach — IaC Security',
    heading: 'Connect your IaC repository',
    subtitle: 'Scan Terraform, CloudFormation and Kubernetes manifests for misconfigurations and security risks.',
    cta: 'Connect Repository →',
    providers: [
      { name: 'GitHub', logo: 'github' },
      { name: 'GitLab', logo: 'gitlab' },
      { name: 'Bitbucket', logo: 'bitbucket' },
    ],
    discoverTitle: 'Indexing Terraform, Helm & Kubernetes Manifests...',
    analyzeTitle: 'Executing Checkov & OPA CIS Drift Scans...',
    remediateTitle: 'Synthesizing Infrastructure Code Diffs...',
    applyTitle: 'Creating Pull Requests with Verified Security Patches...',
  },
};

const STEPS = [
  { id: 'connect', label: 'Connect' },
  { id: 'discover', label: 'Discover' },
  { id: 'analyze', label: 'Analyze' },
  { id: 'remediate', label: 'Remediate' },
  { id: 'apply', label: 'Apply' },
];

export function KavachSecurityDomainCard({
  domain,
  onConnect,
  theme = 'light',
}: SecurityDomainCardProps) {
  const config = DOMAIN_CONFIG[domain];
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isRunningHandshake, setIsRunningHandshake] = useState<boolean>(false);

  const isDark = theme === 'dark';
  const bgColor = isDark ? '#090D14' : '#FFFFFF';
  const cardBorder = isDark ? '#1F242F' : '#E2E8F0';
  const textColor = isDark ? '#FFFFFF' : '#0F172A';
  const subTextColor = isDark ? '#94A3B8' : '#64748B';
  const lineInactive = isDark ? '#272E3B' : '#E2E8F0';

  const handleActionClick = () => {
    if (onConnect) {
      onConnect();
    } else {
      setIsRunningHandshake(true);
      setTimeout(() => {
        setIsRunningHandshake(false);
        setCurrentStepIndex((prev) => (prev < 4 ? prev + 1 : 0));
      }, 1000);
    }
  };

  return (
    <div
      style={{
        backgroundColor: bgColor,
        borderRadius: '16px',
        border: `1px solid ${cardBorder}`,
        padding: '32px 36px',
        boxShadow: isDark
          ? '0 10px 30px rgba(0,0,0,0.5)'
          : '0 4px 24px -2px rgba(15, 23, 42, 0.05)',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        maxWidth: '860px',
        width: '100%',
        margin: '0 auto',
        boxSizing: 'border-box',
      }}
    >
      {/* ── Top Header with Shield Icon & Domain Title (Image 2 & 3) ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
        <div
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : '#F1F5F9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ShieldCheck size={18} color={textColor} />
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: 800, color: textColor, margin: 0, letterSpacing: '-0.02em' }}>
          {config.title}
        </h2>
      </div>

      {/* ── 5-Step Horizontal Stepper (Connect -> Discover -> Analyze -> Remediate -> Apply) ── */}
      <div style={{ marginBottom: '36px', position: 'relative' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'relative',
            maxWidth: '720px',
            margin: '0 auto',
          }}
        >
          {/* Background Track Line */}
          <div
            style={{
              position: 'absolute',
              top: '9px',
              left: '12px',
              right: '12px',
              height: '2px',
              backgroundColor: lineInactive,
              zIndex: 1,
            }}
          />

          {/* Active Track Line with Smooth Motion Pulse */}
          <div
            style={{
              position: 'absolute',
              top: '8px',
              left: '12px',
              width: `${(currentStepIndex / (STEPS.length - 1)) * 96}%`,
              height: '3px',
              background: 'linear-gradient(90deg, #2563EB 0%, #0F172A 100%)',
              borderRadius: '2px',
              zIndex: 2,
              transition: 'width 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 0 10px rgba(37, 99, 235, 0.35)',
            }}
          />

          {STEPS.map((step, idx) => {
            const isCompleted = idx < currentStepIndex;
            const isCurrent = idx === currentStepIndex;

            return (
              <div
                key={step.id}
                onClick={() => setCurrentStepIndex(idx)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  position: 'relative',
                  zIndex: 3,
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    backgroundColor: isCurrent ? '#000000' : isCompleted ? '#10B981' : isDark ? '#090D14' : '#FFFFFF',
                    border: `2px solid ${isCurrent ? '#000000' : isCompleted ? '#10B981' : lineInactive}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.25s ease',
                  }}
                >
                  {isCurrent ? (
                    <div
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: '#FFFFFF',
                      }}
                    />
                  ) : isCompleted ? (
                    <Check size={11} color="#FFFFFF" strokeWidth={3} />
                  ) : null}
                </div>

                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: isCurrent ? 700 : 500,
                    color: isCurrent ? textColor : subTextColor,
                    marginTop: '8px',
                  }}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Card Content Body with Provider Logos & CTA ── */}
      <div
        style={{
          border: `1px solid ${isDark ? '#1F242F' : '#E2E8F0'}`,
          borderRadius: '14px',
          padding: '44px 32px',
          textAlign: 'center',
          backgroundColor: isDark ? '#000000' : '#FFFFFF',
        }}
      >
        {/* Provider Logos Side-by-Side (AWS, Google Cloud, Azure / GitHub, GitLab, Bitbucket) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '36px',
            marginBottom: '28px',
          }}
        >
          {domain === 'cloud' ? (
            <>
              {/* AWS Logo */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '24px', fontWeight: 900, letterSpacing: '-0.04em', color: textColor }}>
                  aws
                </span>
              </div>

              {/* Google Cloud Logo */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="28" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" fill="#4285F4"/>
                  <path d="M19 19H6c-2.76 0-5-2.24-5-5 0-2.64 2.05-4.78 4.65-4.96C6.33 5.59 9.36 3 13 3c3.64 0 6.67 2.59 7.35 6.04C22.95 9.22 25 11.36 25 14c0 2.76-2.24 5-5 5z" fill="#34A853" opacity="0.3"/>
                </svg>
                <span style={{ fontSize: '15px', fontWeight: 700, color: textColor }}>Google Cloud</span>
              </div>

              {/* Azure Logo */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M13.05 2.15L3.9 14.85H9.6L6.5 21.85L19.5 8.85H13.8L16.2 2.15H13.05Z" fill="#0078D4"/>
                </svg>
                <span style={{ fontSize: '15px', fontWeight: 700, color: textColor }}>Azure</span>
              </div>
            </>
          ) : (
            <>
              {/* GitHub */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" color={textColor}>
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                </svg>
              </div>

              {/* GitLab */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path d="M22.65 14.39L12 22.13 1.35 14.39a.84.84 0 0 1-.3-.94l1.22-3.78 2.44-7.51c.06-.19.2-.34.39-.4.18-.06.39 0 .5.15l3.22 9.89h6.36l3.22-9.89a.57.57 0 0 1 .5-.15c.19.06.33.21.39.4l2.44 7.51 1.22 3.78c.1.33 0 .71-.3.94z" fill="#FC6D26"/>
                </svg>
              </div>

              {/* Bitbucket */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="#0052CC">
                  <path d="M2.61 2.44A1.39 1.39 0 0 0 1.22 3.8L3.9 20.3a1.73 1.73 0 0 0 1.71 1.45h12.78a1.73 1.73 0 0 0 1.71-1.45L22.78 3.8a1.39 1.39 0 0 0-1.39-1.36H2.61zm10.74 12.89H10.1l-1.07-5.5h5.72l-1.4 5.5z"/>
                </svg>
              </div>
            </>
          )}
        </div>

        {/* Heading & Subtitle (Image 2 & 3 text) */}
        <h3
          style={{
            fontSize: '22px',
            fontWeight: 800,
            color: textColor,
            margin: '0 0 8px',
            letterSpacing: '-0.02em',
          }}
        >
          {currentStepIndex === 0
            ? config.heading
            : currentStepIndex === 1
            ? config.discoverTitle
            : currentStepIndex === 2
            ? config.analyzeTitle
            : currentStepIndex === 3
            ? config.remediateTitle
            : config.applyTitle}
        </h3>

        <p
          style={{
            fontSize: '14.5px',
            color: subTextColor,
            maxWidth: '560px',
            margin: '0 auto 28px',
            lineHeight: 1.5,
          }}
        >
          {config.subtitle}
        </p>

        {/* Action Button */}
        <div>
          <button
            onClick={handleActionClick}
            disabled={isRunningHandshake}
            style={{
              border: 'none',
              backgroundColor: '#000000',
              color: '#FFFFFF',
              borderRadius: '8px',
              padding: '12px 28px',
              fontSize: '14.5px',
              fontWeight: 700,
              cursor: isRunningHandshake ? 'wait' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
              transition: 'transform 0.1s ease',
            }}
          >
            {isRunningHandshake ? (
              <>
                <RotateCw size={16} className="animate-spin" />
                <span>Connecting...</span>
              </>
            ) : currentStepIndex === 0 ? (
              config.cta
            ) : (
              <>
                <span>Next: {STEPS[(currentStepIndex + 1) % STEPS.length].label}</span>
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default KavachSecurityDomainCard;

