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
} from 'lucide-react';
import { OnboardingLayout } from '@/components/onboarding/OnboardingLayout';
import { api } from '@/lib/api/client';

interface ProductCard {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  icon: any;
  badge: string;
  badgeColor: string;
  badgeBg: string;
  accentColor: string;
  checked: boolean;
  features: string[];
}

function OnboardingProductsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgId = searchParams?.get('org_id') || '';
  const workspaceId = searchParams?.get('workspace_id') || '';
  const projectId = searchParams?.get('project_id') || '';

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [products, setProducts] = useState<ProductCard[]>([
    {
      id: 'thing_code',
      name: 'Kavach Code',
      subtitle: 'Code quality and application security',
      description: 'Deterministic SAST, secrets detection, dependency checks, SBOM generator, and automated PR security gates.',
      icon: Code2,
      badge: 'AppSec',
      badgeColor: '#2563EB',
      badgeBg: '#EFF6FF',
      accentColor: '#2563EB',
      checked: true,
      features: ['SAST (Semgrep)', 'Secrets (Gitleaks)', 'Dependencies (OSV)', 'CycloneDX SBOM', 'PR Security Reviews'],
    },
    {
      id: 'thing_cloud',
      name: 'Kavach Cloud',
      subtitle: 'Cloud infrastructure security',
      description: 'Cloud security posture management (CSPM), Kubernetes cluster auditing, Docker hardening, and IaC drift detection.',
      icon: Cloud,
      badge: 'Infrastructure',
      badgeColor: '#0284C7',
      badgeBg: '#F0F9FF',
      accentColor: '#0284C7',
      checked: false,
      features: ['CSPM / CNAPP Posture', 'Kubernetes CIS Hardening', 'Docker Host Security', 'IaC Drift Detection'],
    },
    {
      id: 'thing_attack',
      name: 'Kavach Attack',
      subtitle: 'DAST, API testing and authorized security testing',
      description: 'Dynamic Application Security Testing (DAST), automated API endpoint fuzzing, external attack surface reconnaissance, and pentest verification.',
      icon: Crosshair,
      badge: 'Offensive',
      badgeColor: '#E11D48',
      badgeBg: '#FFF1F2',
      accentColor: '#E11D48',
      checked: false,
      features: ['DAST Engine', 'API Fuzzing & Discovery', 'Attack Surface Mapping', 'Pentest Scenarios'],
    },
    {
      id: 'thing_protect',
      name: 'Kavach Protect',
      subtitle: 'Runtime and application defense',
      description: 'Zero-trust runtime defense, official MCP tool security gateway, autonomous AI agent guardrails, and instant break-glass controls.',
      icon: ShieldCheck,
      badge: 'Runtime Zero-Trust',
      badgeColor: '#059669',
      badgeBg: '#ECFDF5',
      accentColor: '#059669',
      checked: false,
      features: ['Runtime Threat Defense', 'MCP Security Gateway', 'Autonomous Agent Guard', 'Break-Glass Approvals'],
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
        // use default
      }
    }
    loadSelected();
    return () => {
      isMounted = false;
    };
  }, []);

  const selectedProducts = products.filter((p) => p.checked);
  const selectedCount = selectedProducts.length;

  const toggleProduct = (id: string) => {
    setProducts((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          if (item.checked && selectedCount <= 1) {
            setError('Please keep at least one product selected for your workspace.');
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
      title="Choose Your Security Products"
      subtitle="Select the products your workspace needs. You can add more later as your security requirements grow."
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

        {/* Action Toolbar placed ABOVE product cards for immediate access on 730px viewports */}
        <div
          className="onboarding-button-row"
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '10px',
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              onClick={navigateBack}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#475569',
                cursor: 'pointer',
              }}
            >
              <ArrowLeft size={14} />
              <span>Back: Environment</span>
            </button>

            <span style={{ fontSize: '13px', color: '#64748B' }}>
              <strong>{selectedCount}</strong> {selectedCount === 1 ? 'product' : 'products'} selected
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              id="continue-products-btn"
              onClick={handleContinue}
              disabled={loading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 20px',
                backgroundColor: '#2563EB',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 1px 3px rgba(37, 99, 235, 0.25)',
              }}
            >
              <span>{loading ? 'Saving Products...' : 'Next: Configuration'}</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* 4 Interactive Product Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '18px',
          }}
          className="product-cards-grid"
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
                  borderRadius: '10px',
                  border: isChecked ? `2px solid ${item.accentColor}` : '1px solid #CBD5E1',
                  padding: '20px 22px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  cursor: 'pointer',
                  position: 'relative',
                  boxShadow: isChecked ? '0 4px 12px rgba(37, 99, 235, 0.08)' : '0 1px 3px rgba(0, 0, 0, 0.02)',
                  transition: 'all 0.15s ease',
                }}
              >
                {/* Header row: Icon, Name, Badge, and Checkbox */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '8px',
                        backgroundColor: item.badgeBg,
                        color: item.badgeColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={20} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                          {item.name}
                        </h2>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: '4px',
                            backgroundColor: item.badgeBg,
                            color: item.badgeColor,
                            textTransform: 'uppercase',
                          }}
                        >
                          {item.badge}
                        </span>
                      </div>
                      <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0 0' }}>
                        {item.subtitle}
                      </p>
                    </div>
                  </div>

                  {/* Checkbox */}
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '5px',
                      backgroundColor: isChecked ? item.accentColor : '#FFFFFF',
                      border: isChecked ? `1px solid ${item.accentColor}` : '1.5px solid #CBD5E1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FFFFFF',
                      flexShrink: 0,
                    }}
                  >
                    {isChecked && <Check size={13} strokeWidth={3} />}
                  </div>
                </div>

                {/* Description */}
                <p style={{ fontSize: '12.5px', color: '#475569', margin: 0, lineHeight: 1.45 }}>
                  {item.description}
                </p>

                {/* Feature Tags */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: 'auto', paddingTop: '6px' }}>
                  {item.features.map((feat, idx) => (
                    <span
                      key={idx}
                      style={{
                        fontSize: '11px',
                        color: '#475569',
                        backgroundColor: '#F1F5F9',
                        padding: '2px 7px',
                        borderRadius: '4px',
                      }}
                    >
                      {feat}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

      </div>

      <style jsx>{`
        @media (max-width: 768px) {
          .product-cards-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </OnboardingLayout>
  );
}

export default function OnboardingProductsPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>Loading products setup...</div>}>
      <OnboardingProductsContent />
    </Suspense>
  );
}
