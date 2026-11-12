'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Code2,
  Cloud,
  Crosshair,
  ShieldCheck,
  Check,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Sparkles,
  Layers,
  Zap,
  CheckCircle2,
  Terminal,
} from 'lucide-react';
import { OnboardingLayout } from '@/components/onboarding/OnboardingLayout';
import { api } from '@/lib/api/client';

interface SecurityProduct {
  id: string;
  name: string;
  tagline: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
  categoryBadge: string;
  badgeBg: string;
  badgeColor: string;
  accentBorder: string;
  accentText: string;
  checked: boolean;
  isCore?: boolean;
  engines: string[];
  capabilities: string[];
}

function OnboardingProductsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgId = searchParams?.get('org_id') || '';
  const workspaceId = searchParams?.get('workspace_id') || '';
  const projectId = searchParams?.get('project_id') || '';

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [products, setProducts] = useState<SecurityProduct[]>([
    {
      id: 'thing_code',
      name: 'Kavach Code',
      tagline: 'Source Code & Application Security',
      description: 'Comprehensive static analysis, hardcoded secret elimination, dependency vulnerability tracking, and automated GitHub PR security checks.',
      icon: Code2,
      categoryBadge: 'Essential AppSec',
      badgeBg: '#EEF2FF',
      badgeColor: '#4F46E5',
      accentBorder: '#6366F1',
      accentText: '#4F46E5',
      checked: true,
      isCore: true,
      engines: ['Semgrep SAST', 'Gitleaks Secrets', 'OSV & Trivy SCA', 'CycloneDX SBOM'],
      capabilities: [
        'Deterministic AST vulnerability detection',
        'High-entropy API key & token scanning',
        'Open-source dependency CVE resolution',
        'Automated PR review & fix proposals',
      ],
    },
    {
      id: 'thing_cloud',
      name: 'Kavach Cloud',
      tagline: 'Cloud Infrastructure & Container Security',
      description: 'Cloud Security Posture Management (CSPM), Kubernetes cluster CIS hardening, Docker daemon inspection, and Terraform IaC drift defense.',
      icon: Cloud,
      categoryBadge: 'Infrastructure CNAPP',
      badgeBg: '#F0F9FF',
      badgeColor: '#0284C7',
      accentBorder: '#0EA5E9',
      accentText: '#0284C7',
      checked: true,
      engines: ['Checkov CIS Rules', 'Trivy Image Scanner', 'Kubernetes Audit', 'Terraform AST'],
      capabilities: [
        'Multi-cloud posture & misconfiguration audit',
        'Container base image CVE vulnerability scan',
        'Kubernetes RBAC & pod security standards',
        'IaC security baseline enforcement',
      ],
    },
    {
      id: 'thing_attack',
      name: 'Kavach Attack',
      tagline: 'Dynamic API Security & Pentesting',
      description: 'Dynamic Application Security Testing (DAST), automated API endpoint route discovery, OWASP API Top 10 fuzzing, and verified exploit reproduction.',
      icon: Crosshair,
      categoryBadge: 'Offensive DAST',
      badgeBg: '#FFF1F2',
      badgeColor: '#E11D48',
      accentBorder: '#F43F5E',
      accentText: '#E11D48',
      checked: false,
      engines: ['OWASP API Fuzzer', 'Route Discovery AST', 'Auth Matrix Prober', 'Burst Tester'],
      capabilities: [
        'Automated REST & GraphQL route discovery',
        'OWASP API Top 10 fuzzing (BOLA, BFLA, Auth)',
        'Sensitive data exposure & burst rate testing',
        'Verifiable attack reproduction telemetry',
      ],
    },
    {
      id: 'thing_protect',
      name: 'Kavach Protect',
      tagline: 'Runtime Defense & MCP Security Gateway',
      description: 'Zero-trust runtime firewall, official MCP execution gateway wrapping AI tools with identity, deterministic policy enforcement, and audit proof.',
      icon: ShieldCheck,
      categoryBadge: 'Runtime Zero-Trust',
      badgeBg: '#ECFDF5',
      badgeColor: '#059669',
      accentBorder: '#10B981',
      accentText: '#059669',
      checked: true,
      engines: ['MCP Tool Gateway', 'OPA Rego Policies', 'Cryptographic Approvals', 'Immutable Audit'],
      capabilities: [
        'Official MCP protocol security proxy',
        'Deterministic OPA rule policy gate',
        'Cryptographic human-in-the-loop approvals',
        'Complete verifiable audit trail logging',
      ],
    },
  ]);

  // Load existing selected products if any
  useEffect(() => {
    let isMounted = true;
    async function loadSelected() {
      try {
        const res = await api.onboarding.getProducts();
        if (isMounted && res?.products && res.products.length > 0) {
          const selectedSet = new Set(res.products);
          setProducts((prev) =>
            prev.map((p) => ({
              ...p,
              checked: selectedSet.has(p.id) || p.id === 'thing_code',
            }))
          );
        }
      } catch (err) {
        // default state preserved
      }
    }
    loadSelected();
    return () => {
      isMounted = false;
    };
  }, []);

  const selectedCount = products.filter((p) => p.checked).length;

  const toggleProduct = (id: string) => {
    setProducts((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          if (item.checked && selectedCount <= 1) {
            setError('Please keep at least one core security product selected.');
            return item;
          }
          setError(null);
          return { ...item, checked: !item.checked };
        }
        return item;
      })
    );
  };

  const handleContinue = async () => {
    const selectedIds = products.filter((p) => p.checked).map((p) => p.id);
    if (selectedIds.length === 0) {
      setError('Please select at least one product to proceed.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.onboarding.saveProducts({ products: selectedIds });
    } catch (err: any) {
      console.warn('Could not save products to API:', err);
    } finally {
      setLoading(false);
      const q = new URLSearchParams();
      if (orgId) q.set('org_id', orgId);
      if (workspaceId) q.set('workspace_id', workspaceId);
      if (projectId) q.set('project_id', projectId);
      router.push(`/onboarding/configuration${q.toString() ? '?' + q.toString() : ''}`);
    }
  };

  const navigateBack = () => {
    const q = new URLSearchParams();
    if (orgId) q.set('org_id', orgId);
    if (workspaceId) q.set('workspace_id', workspaceId);
    if (projectId) q.set('project_id', projectId);
    router.push(`/onboarding/environment${q.toString() ? '?' + q.toString() : ''}`);
  };

  return (
    <OnboardingLayout
      currentStep={5}
      title="Select Your Security Capabilities"
      subtitle="Choose the protection modules for your workspace. Engines can be customized and expanded at any time."
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {error && (
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: '#FEF2F2',
              border: '1px solid #FECACA',
              borderRadius: '8px',
              color: '#B91C1C',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* 4 Interactive Security Product Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
            gap: '18px',
          }}
        >
          {products.map((item) => {
            const Icon = item.icon;
            const isChecked = item.checked;

            return (
              <div
                key={item.id}
                onClick={() => toggleProduct(item.id)}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  border: isChecked ? `2px solid ${item.accentBorder}` : '1px solid #E2E8F0',
                  padding: '22px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '16px',
                  cursor: 'pointer',
                  position: 'relative',
                  boxShadow: isChecked
                    ? '0 6px 20px -2px rgba(99, 102, 241, 0.12)'
                    : '0 1px 3px rgba(0, 0, 0, 0.02)',
                  transition: 'all 0.2s ease',
                  userSelect: 'none',
                }}
              >
                <div>
                  {/* Top Header: Icon, Badges, Checkbox */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '10px',
                          backgroundColor: item.badgeBg,
                          color: item.badgeColor,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          border: `1px solid ${item.badgeBg}`,
                        }}
                      >
                        <Icon size={22} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                            {item.name}
                          </h2>
                          {item.isCore && (
                            <span
                              style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                padding: '1px 6px',
                                borderRadius: '4px',
                                backgroundColor: '#EEF2FF',
                                color: '#4F46E5',
                              }}
                            >
                              RECOMMENDED
                            </span>
                          )}
                        </div>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: item.badgeColor,
                            letterSpacing: '0.02em',
                          }}
                        >
                          {item.categoryBadge}
                        </span>
                      </div>
                    </div>

                    {/* Styled Selection Checkbox */}
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '6px',
                        backgroundColor: isChecked ? item.accentBorder : '#FFFFFF',
                        border: isChecked ? `2px solid ${item.accentBorder}` : '2px solid #CBD5E1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#FFFFFF',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {isChecked && <Check size={16} strokeWidth={3} />}
                    </div>
                  </div>

                  <p style={{ fontSize: '12.5px', color: '#475569', lineHeight: 1.5, margin: '0 0 14px 0' }}>
                    {item.description}
                  </p>

                  {/* Capabilities List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
                    {item.capabilities.map((cap, cIdx) => (
                      <div key={cIdx} style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12px', color: '#334155' }}>
                        <CheckCircle2 size={13} color={isChecked ? '#10B981' : '#94A3B8'} strokeWidth={2.5} style={{ flexShrink: 0 }} />
                        <span>{cap}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom Engine Badges */}
                <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '12px' }}>
                  <div style={{ fontSize: '10.5px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                    Deterministic Engines
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                    {item.engines.map((eng, eIdx) => (
                      <span
                        key={eIdx}
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: '#F8FAFC',
                          border: '1px solid #E2E8F0',
                          color: '#475569',
                          fontFamily: 'monospace',
                        }}
                      >
                        {eng}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Live Workspace Coverage Summary */}
        <div
          style={{
            padding: '16px 20px',
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#EEF2FF',
                color: '#4F46E5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Sparkles size={18} />
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                {selectedCount} of 4 Protection Modules Active
              </div>
              <div style={{ fontSize: '12px', color: '#64748B' }}>
                All selected engines run with zero mock data and store complete cryptographic audit trails.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '11.5px',
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: '9999px',
                backgroundColor: '#ECFDF5',
                color: '#059669',
                border: '1px solid #A7F3D0',
              }}
            >
              Zero-Trust Policy Gate Ready
            </span>
          </div>
        </div>

        {/* Action Button Navigation Row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: '8px',
          }}
        >
          <button
            type="button"
            onClick={navigateBack}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 18px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#475569',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <ArrowLeft size={15} />
            <span>Back to Environment</span>
          </button>

          <button
            type="button"
            id="continue-products-btn"
            onClick={handleContinue}
            disabled={loading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '11px 24px',
              backgroundColor: '#4F46E5',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13.5px',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 8px rgba(79, 70, 229, 0.28)',
              transition: 'all 0.15s ease',
            }}
          >
            <span>{loading ? 'Saving Capabilities...' : 'Continue: Configure Repository'}</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </OnboardingLayout>
  );
}

export default function OnboardingProductsPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#64748B' }}>
            Loading security capabilities...
          </div>
        </div>
      }
    >
      <OnboardingProductsContent />
    </Suspense>
  );
}
