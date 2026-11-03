'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Lock,
  CheckCircle2,
  ArrowRight,
  ShieldAlert,
  Zap,
  ArrowLeft,
  Cloud,
  Code2,
  Crosshair,
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  Home,
  Database,
  FileCode,
  FileCheck,
  Layers,
  Cpu,
} from 'lucide-react';
import { useEntitlements } from '@/lib/hooks/useEntitlements';
import { useAccessControl } from '@/lib/hooks/useAccessControl';
import { getRouteByPath, RouteContract } from '@/types/navigation/routeRegistry';

const PRODUCT_ICONS: Record<string, React.ComponentType<{ size?: number; color?: string; style?: React.CSSProperties }>> = {
  thing_code: Code2,
  thing_cloud: Cloud,
  thing_attack: Crosshair,
  thing_protect: ShieldCheck,
  thing_data: Database,
  thing_qa: CheckCircle2,
  thing_iac: FileCode,
  thing_compliance: FileCheck,
  thing_supply: Layers,
  thing_ai: Cpu,
  thing_audit: ShieldAlert,
};

interface RouteGuardProps {
  children: React.ReactNode;
}

export const RouteGuard: React.FC<RouteGuardProps> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { isProductEnabled, products, upgradeProduct, isLoading: entitlementsLoading } = useEntitlements();
  const { hasPermission, role, isLoading: accessLoading } = useAccessControl();

  const [upgrading, setUpgrading] = React.useState(false);
  const [upgradeError, setUpgradeError] = React.useState<string | null>(null);

  // Loading state while checking either entitlement or RBAC permission
  if (entitlementsLoading || accessLoading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          gap: '14px',
          color: '#64748B',
          fontSize: '13px',
          fontFamily: 'Inter, -apple-system, sans-serif',
        }}
      >
        <div
          style={{
            width: '32px',
            height: '32px',
            border: '2.5px solid #E2E8F0',
            borderTopColor: '#2563EB',
            borderRadius: '50%',
            animation: 'spin 0.7s linear infinite',
          }}
        />
        <span>Evaluating security entitlements & role authorization...</span>
        <style jsx>{`
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  // Resolve current route contract from canonical route registry
  const currentRoute: RouteContract | undefined = getRouteByPath(pathname || '');

  // If route is not recognized or is platform-wide authenticated route without restrictions
  if (!currentRoute) {
    return <>{children}</>;
  }

  // ── LAYER 1: PRODUCT ENTITLEMENT CHECK ─────────────────────────────────────
  const isPlatformProduct = currentRoute.product === 'platform';
  if (!isPlatformProduct) {
    const isEntitled = isProductEnabled(currentRoute.product);

    if (!isEntitled) {
      const productKey = currentRoute.product;
      const knownModules: Record<string, { name: string; tagline: string; description: string; domain: string }> = {
        thing_code: {
          name: 'Code Security',
          tagline: 'Static application security testing and dependency governance',
          description: 'Deterministic SAST scanning via Semgrep OSS, Gitleaks secrets detection, OSV SCA checks, CycloneDX SBOM generation, and automated GitHub PR security gates.',
          domain: 'Application Security',
        },
        thing_cloud: {
          name: 'Cloud Security',
          tagline: 'Cloud infrastructure security posture management (CSPM / CNAPP)',
          description: 'Multi-cloud resource posture assessment, Kubernetes cluster hardening, Docker CIS benchmarks, and infrastructure-as-code (IaC) drift detection.',
          domain: 'Cloud Infrastructure',
        },
        thing_attack: {
          name: 'Attack Surface',
          tagline: 'Dynamic application security testing and external asset fuzzing',
          description: 'Dynamic Application Security Testing (DAST), automated API fuzzing, continuous external attack path traversal, and verified penetration testing workflows.',
          domain: 'Offensive Security',
        },
        thing_protect: {
          name: 'Runtime Defense',
          tagline: 'Zero-trust runtime defense and MCP tool security gateway',
          description: 'eBPF-driven runtime threat detection, official MCP security gateway, autonomous AI agent guardrails, and instant break-glass administrative controls.',
          domain: 'Zero-Trust Defense',
        },
        thing_data: {
          name: 'Data Security (DSPM)',
          tagline: 'Data security posture management and sensitive data discovery',
          description: 'Continuous discovery and automated classification of sensitive records (PII, credentials, access keys) across S3, RDS, PostgreSQL, and Snowflake data stores.',
          domain: 'Data Governance & DSPM',
        },
        thing_qa: {
          name: 'QA Automation',
          tagline: 'Nexora automated test suite orchestration and browser cloud execution',
          description: 'Automated test suite execution, cloud browser grid runners, visual regression diffs, and end-to-end API contract testing.',
          domain: 'Quality Engineering',
        },
        thing_iac: {
          name: 'Infrastructure as Code',
          tagline: 'IaC misconfiguration scanning and Terraform drift remediation',
          description: 'Checkov and OPA-based Terraform/CloudFormation compliance policies with deterministic remediation diff generation.',
          domain: 'Infrastructure as Code',
        },
        thing_compliance: {
          name: 'Continuous Compliance',
          tagline: 'Automated SOC2, ISO 27001, HIPAA, and PCI-DSS evidence ledger',
          description: 'Continuous audit controls verification, automated evidence metadata gathering, and auditor-ready export packages.',
          domain: 'Governance & Compliance',
        },
      };

      const meta = knownModules[productKey] || {
        name: currentRoute.navigationLabel || 'Enterprise Capability',
        tagline: currentRoute.ownershipSummary || 'Advanced enterprise security module',
        description: currentRoute.ownershipSummary || 'This capability is governed by workspace entitlement policies.',
        domain: currentRoute.ownershipDomain || 'SecuLayer Security Suite',
      };
      const Icon = PRODUCT_ICONS[productKey] || ShieldCheck;

      const handleInstantUpgrade = async () => {
        setUpgrading(true);
        setUpgradeError(null);
        try {
          await upgradeProduct(productKey, `${meta.name} Enterprise Trial`);
        } catch (err: any) {
          setUpgradeError(err?.message || 'Failed to activate module trial. Verify administrator permissions.');
        } finally {
          setUpgrading(false);
        }
      };

      return (
        <div
          style={{
            minHeight: '75vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 16px',
          }}
        >
          <div
            style={{
              maxWidth: '720px',
              width: '100%',
              backgroundColor: '#FFFFFF',
              borderRadius: '14px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(0, 0, 0, 0.02)',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '28px 32px 24px 32px',
                borderBottom: '1px solid #F1F5F9',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '10px',
                    backgroundColor: '#EFF6FF',
                    border: '1px solid #DBEAFE',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#2563EB',
                    flexShrink: 0,
                  }}
                >
                  <Icon size={22} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h1 style={{ fontSize: '19px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                      {meta.name}
                    </h1>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        backgroundColor: '#FEF3C7',
                        color: '#92400E',
                        border: '1px solid #FDE68A',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Lock size={10} />
                      Entitlement Required
                    </span>
                  </div>
                  <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
                    {meta.tagline}
                  </p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div style={{ padding: '24px 32px' }}>
              <p style={{ fontSize: '13px', color: '#334155', lineHeight: 1.6, margin: '0 0 20px 0' }}>
                {meta.description}
              </p>

              {/* Policy & Route Diagnostic Panel */}
              <div
                style={{
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '10px',
                  padding: '16px 18px',
                  marginBottom: '20px',
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '10px' }}>
                  Access Governance Diagnostics
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', fontSize: '12px' }}>
                  <div>
                    <span style={{ color: '#64748B' }}>Protected URI: </span>
                    <code style={{ color: '#0F172A', fontWeight: 600, backgroundColor: '#FFFFFF', padding: '2px 6px', borderRadius: '4px', border: '1px solid #E2E8F0' }}>
                      {currentRoute.path}
                    </code>
                  </div>
                  <div>
                    <span style={{ color: '#64748B' }}>Domain: </span>
                    <strong style={{ color: '#0F172A' }}>{meta.domain}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748B' }}>Entitlement Key: </span>
                    <code style={{ color: '#2563EB', backgroundColor: '#FFFFFF', padding: '2px 6px', borderRadius: '4px', border: '1px solid #E2E8F0' }}>
                      {productKey}
                    </code>
                  </div>
                  <div>
                    <span style={{ color: '#64748B' }}>Required Scope: </span>
                    <code style={{ color: '#0F172A', backgroundColor: '#FFFFFF', padding: '2px 6px', borderRadius: '4px', border: '1px solid #E2E8F0' }}>
                      {currentRoute.requiredPermission}
                    </code>
                  </div>
                </div>
              </div>

              {/* Trial Callout Banner */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '14px 16px',
                  backgroundColor: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  borderRadius: '8px',
                  color: '#1E40AF',
                  fontSize: '13px',
                  lineHeight: 1.45,
                }}
              >
                <Zap size={16} color="#2563EB" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <span style={{ fontWeight: 600 }}>14-Day Evaluation Available: </span>
                  Workspace administrators can immediately activate a 14-day full-capability trial for{' '}
                  <strong>{meta.name}</strong> directly within this workspace.
                </div>
              </div>

              {upgradeError && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 16px',
                    backgroundColor: '#FEF2F2',
                    border: '1px solid #FECACA',
                    borderRadius: '8px',
                    marginTop: '16px',
                    color: '#DC2626',
                    fontSize: '13px',
                  }}
                >
                  <AlertTriangle size={15} color="#DC2626" />
                  <span>{upgradeError}</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              style={{
                padding: '18px 32px',
                backgroundColor: '#FAFAFA',
                borderTop: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Link
                href="/code"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#64748B',
                  textDecoration: 'none',
                }}
              >
                <ArrowLeft size={14} />
                <span>Back to Code Security</span>
              </Link>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Link
                  href="/catalog"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    color: '#0F172A',
                    fontSize: '13px',
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  Product Catalog
                </Link>

                <button
                  type="button"
                  onClick={handleInstantUpgrade}
                  disabled={upgrading}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 18px',
                    borderRadius: '8px',
                    backgroundColor: '#2563EB',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: upgrading ? 'wait' : 'pointer',
                    boxShadow: '0 1px 3px rgba(37, 99, 235, 0.2)',
                  }}
                >
                  {upgrading ? (
                    <>
                      <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />
                      <span>Activating {meta.name}...</span>
                    </>
                  ) : (
                    <>
                      <Zap size={14} />
                      <span>Activate 14-Day Trial</span>
                      <ArrowRight size={13} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }
  }

  // ── LAYER 2: ROLE AUTHORIZATION CHECK (RBAC) ───────────────────────────────
  const isAuthorized = hasPermission(currentRoute.requiredPermission);

  if (!isAuthorized) {
    return (
      <div
        style={{
          minHeight: '75vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px 16px',
          fontFamily: 'Inter, -apple-system, sans-serif',
        }}
      >
        <div
          style={{
            maxWidth: '640px',
            width: '100%',
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 20px 40px -15px rgba(15, 23, 42, 0.08)',
            padding: '36px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              backgroundColor: '#FEF2F2',
              border: '1px solid #FEE2E2',
              color: '#EF4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}
          >
            <ShieldAlert size={28} />
          </div>

          <span
            style={{
              fontSize: '12px',
              fontWeight: 700,
              backgroundColor: '#FEF2F2',
              color: '#DC2626',
              padding: '3px 10px',
              borderRadius: '9999px',
              display: 'inline-block',
              marginBottom: '10px',
              letterSpacing: '0.04em',
            }}
          >
            HTTP 403 — FORBIDDEN
          </span>

          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', margin: '0 0 10px' }}>
            Role Authorization Required
          </h2>

          <p style={{ fontSize: '14px', color: '#64748B', lineHeight: 1.5, margin: '0 0 24px' }}>
            You do not have the required permissions to access <strong>{currentRoute.navigationLabel}</strong> (
            <code>{currentRoute.path}</code>).
          </p>

          <div
            style={{
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '10px',
              padding: '16px 20px',
              marginBottom: '28px',
              textAlign: 'left',
              fontSize: '13px',
              color: '#334155',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: '#64748B' }}>Required Permission:</span>
              <code style={{ color: '#DC2626', fontWeight: 600 }}>{currentRoute.requiredPermission}</code>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: '#64748B' }}>Your Organization Role:</span>
              <span style={{ fontWeight: 600, color: '#0F172A', textTransform: 'capitalize' }}>{role}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748B' }}>Action:</span>
              <span style={{ color: '#475569' }}>Contact workspace owner or security administrator for role elevation.</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
            <button
              type="button"
              onClick={() => router.back()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 16px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#334155',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <ArrowLeft size={14} />
              <span>Go Back</span>
            </button>

            <Link
              href="/home"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 18px',
                borderRadius: '8px',
                backgroundColor: '#0F172A',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              <Home size={14} />
              <span>Return to Command Center</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Authorized and Entitled
  return <>{children}</>;
};
