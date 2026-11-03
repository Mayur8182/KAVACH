'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';
import { useEntitlements } from '@/lib/hooks/useEntitlements';

const PRODUCT_ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
  thing_code: Code2,
  thing_cloud: Cloud,
  thing_attack: Crosshair,
  thing_protect: ShieldCheck,
};

interface ProductGuardProps {
  productKey: 'thing_code' | 'thing_cloud' | 'thing_attack' | 'thing_protect';
  children: React.ReactNode;
}

export const ProductGuard: React.FC<ProductGuardProps> = ({ productKey, children }) => {
  const { isProductEnabled, products, upgradeProduct, isLoading } = useEntitlements();
  const [upgrading, setUpgrading] = useState(false);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          gap: '12px',
          color: '#64748B',
          fontSize: '14px',
        }}
      >
        <div
          style={{
            width: '28px',
            height: '28px',
            border: '2.5px solid #E2E8F0',
            borderTopColor: '#2563EB',
            borderRadius: '50%',
            animation: 'spin 0.7s linear infinite',
          }}
        />
        <span>Checking subscription entitlements...</span>
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

  const enabled = isProductEnabled(productKey);

  if (enabled) {
    return <>{children}</>;
  }

  const product = products?.[productKey] || {
    name: productKey === 'thing_cloud' ? 'Cloud Security' : productKey === 'thing_attack' ? 'Attack Surface' : 'Runtime Defense',
    tagline: 'Advanced enterprise security product',
    description: 'This product is locked in your current subscription tier.',
    price_per_month: 79,
    features: [],
  };

  const Icon = PRODUCT_ICONS[productKey] || Code2;

  const handleInstantUpgrade = async () => {
    setUpgrading(true);
    setUpgradeError(null);
    try {
      await upgradeProduct(productKey, `${product.name} Pro Trial`);
    } catch (err: any) {
      setUpgradeError(err?.message || 'Upgrade failed. Please contact your organization administrator.');
    } finally {
      setUpgrading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
        fontFamily: 'Inter, -apple-system, sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: '720px',
          width: '100%',
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 20px 40px -15px rgba(15, 23, 42, 0.08), 0 0 1px 1px rgba(15, 23, 42, 0.02)',
          overflow: 'hidden',
        }}
      >
        {/* Top Header Banner */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
            padding: '32px 36px',
            color: '#FFFFFF',
            position: 'relative',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#60A5FA',
                }}
              >
                <Icon size={24} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h1 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: '#FFFFFF' }}>{product.name}</h1>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      backgroundColor: '#EF4444',
                      color: '#FFFFFF',
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Lock size={10} />
                    LOCKED
                  </span>
                </div>
                <p style={{ fontSize: '13px', color: '#94A3B8', margin: '3px 0 0 0' }}>{product.tagline}</p>
              </div>
            </div>

            <div
              style={{
                textAlign: 'right',
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                padding: '8px 14px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <span style={{ fontSize: '11px', color: '#94A3B8', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Add-on Pricing
              </span>
              <span style={{ fontSize: '18px', fontWeight: 800, color: '#38BDF8' }}>
                ${product.price_per_month}
                <span style={{ fontSize: '12px', fontWeight: 500, color: '#94A3B8' }}>/mo</span>
              </span>
            </div>
          </div>

          <p style={{ fontSize: '13px', color: '#CBD5E1', margin: 0, lineHeight: 1.5, maxWidth: '580px' }}>
            {product.description}
          </p>
        </div>

        {/* Content Body */}
        <div style={{ padding: '32px 36px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              padding: '12px 16px',
              backgroundColor: '#FEF2F2',
              border: '1px solid #FECACA',
              borderRadius: '8px',
              marginBottom: '28px',
              color: '#991B1B',
              fontSize: '13px',
              lineHeight: 1.45,
            }}
          >
            <ShieldAlert size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <span style={{ fontWeight: 600 }}>Product Access Required: </span>
              This feature is restricted because <strong>{product.name}</strong> is not enabled in your current workspace subscription.
              Only products explicitly selected during onboarding or purchased as add-ons are authorized.
            </div>
          </div>

          {upgradeError && (
            <div
              style={{
                padding: '12px 16px',
                backgroundColor: '#FFF1F2',
                border: '1px solid #FDA4AF',
                borderRadius: '8px',
                marginBottom: '20px',
                color: '#BE123C',
                fontSize: '13px',
              }}
            >
              {upgradeError}
            </div>
          )}

          {/* Features List */}
          <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Features Included with {product.name}
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: '12px',
              marginBottom: '32px',
            }}
          >
            {product.features && product.features.length > 0 ? (
              product.features.map((feat, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    backgroundColor: '#F8FAFC',
                    borderRadius: '8px',
                    border: '1px solid #F1F5F9',
                    fontSize: '13px',
                    color: '#334155',
                  }}
                >
                  <CheckCircle2 size={16} color="#16A34A" style={{ flexShrink: 0 }} />
                  <span style={{ fontWeight: 500 }}>{feat.name}</span>
                </div>
              ))
            ) : (
              [
                'Full automated scanner execution',
                'Real-time alerts and security intelligence',
                'Continuous policy gate enforcement',
                'Verified audit evidence generation',
              ].map((text, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    backgroundColor: '#F8FAFC',
                    borderRadius: '8px',
                    border: '1px solid #F1F5F9',
                    fontSize: '13px',
                    color: '#334155',
                  }}
                >
                  <CheckCircle2 size={16} color="#16A34A" style={{ flexShrink: 0 }} />
                  <span style={{ fontWeight: 500 }}>{text}</span>
                </div>
              ))
            )}
          </div>

          {/* Action CTAs */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: '20px',
              borderTop: '1px solid #E2E8F0',
            }}
          >
            <Link
              href="/code"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#64748B',
                textDecoration: 'none',
              }}
            >
              <ArrowLeft size={14} />
              <span>Back to Code Security</span>
            </Link>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Link
                href="/catalog"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  color: '#334155',
                  fontSize: '13px',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                <span>Compare All Products</span>
              </Link>

              <button
                type="button"
                onClick={handleInstantUpgrade}
                disabled={upgrading}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 22px',
                  borderRadius: '8px',
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: upgrading ? 'not-allowed' : 'pointer',
                  opacity: upgrading ? 0.75 : 1,
                  boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)',
                  transition: 'background-color 0.15s ease',
                }}
              >
                {upgrading ? (
                  <>
                    <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Activating {product.name}...</span>
                  </>
                ) : (
                  <>
                    <Zap size={14} />
                    <span>Start 14-Day Free Trial</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
