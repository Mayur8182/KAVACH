'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Check,
  ArrowRight,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import { api } from '@/lib/api/client';

function OnboardingPlansContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const prods = searchParams.get('products');
  const parsedKeys = prods ? prods.split(',').filter(Boolean) : [];
  const [selectedProductKeys] = useState<string[]>(parsedKeys.length > 0 ? parsedKeys : ['thing_code']);
  const [selectedPlan, setSelectedPlan] = useState<'FREE_TIER' | 'PRO_TRIAL' | 'TEAM'>('PRO_TRIAL');
  const [billingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirmAccess = async () => {
    setLoading(true);
    setError(null);
    try {
      await api.entitlements.selectProducts({
        products: selectedProductKeys,
        plan: selectedPlan,
        billing_cycle: billingCycle,
      });

      // Proceed to Step 6: Product Security Configuration
      router.push('/onboarding/configuration');
    } catch (err: any) {
      console.error('Failed to configure access:', err);
      setError(err?.message || 'Failed to activate plan. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getProductName = (key: string) => {
    switch (key) {
      case 'thing_code':
        return 'Thing Code';
      case 'thing_cloud':
        return 'Thing Cloud';
      case 'thing_attack':
        return 'Thing Attack';
      case 'thing_protect':
        return 'Thing Protect';
      default:
        return key;
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#F8FAFC',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Inter, -apple-system, sans-serif',
      }}
    >
      {/* Top Header */}
      <header
        style={{
          height: '60px',
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 32px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              backgroundColor: '#2563EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: '14px',
            }}
          >
            S
          </div>
          <span style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>SecuLayer Platform</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748B' }}>
          <span style={{ fontWeight: 600, color: '#2563EB' }}>Step 5 of 7</span>
          <span>•</span>
          <span>Plan & Access Confirmation</span>
        </div>
      </header>

      {/* Main Content */}
      <main
        style={{
          flex: 1,
          maxWidth: '1040px',
          width: '100%',
          margin: '0 auto',
          padding: '40px 24px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
              Select your plan & confirm access
            </h1>
          </div>
          <p style={{ fontSize: '14px', color: '#64748B', margin: 0, lineHeight: 1.5 }}>
            Confirm subscription tier for your selected products ({selectedProductKeys.map(getProductName).join(', ')}).
            No credit card is required to start the trial.
          </p>
        </div>

        {error && (
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: '#FEF2F2',
              border: '1px solid #FECACA',
              borderRadius: '8px',
              color: '#B91C1C',
              fontSize: '13px',
              marginBottom: '24px',
            }}
          >
            {error}
          </div>
        )}

        {/* Plan Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: '20px',
            marginBottom: '32px',
          }}
        >
          {/* 1. Free Tier */}
          <div
            onClick={() => setSelectedPlan('FREE_TIER')}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: selectedPlan === 'FREE_TIER' ? '2px solid #2563EB' : '1px solid #E2E8F0',
              padding: '28px 24px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: selectedPlan === 'FREE_TIER' ? '0 8px 20px -4px rgba(37,99,235,0.1)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', marginBottom: '4px' }}>Free Tier</div>
            <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '16px' }}>For individual developers & testing</div>

            <div style={{ fontSize: '28px', fontWeight: 800, color: '#0F172A', marginBottom: '16px' }}>
              $0 <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748B' }}>/ forever</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', color: '#334155', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Check size={16} color="#16A34A" /> Up to 5 repositories
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Check size={16} color="#16A34A" /> Standard vulnerability scans
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Check size={16} color="#16A34A" /> Community support
              </div>
            </div>

            <div
              style={{
                marginTop: 'auto',
                padding: '8px 12px',
                borderRadius: '6px',
                textAlign: 'center',
                fontSize: '13px',
                fontWeight: 600,
                backgroundColor: selectedPlan === 'FREE_TIER' ? '#EFF6FF' : '#F8FAFC',
                color: selectedPlan === 'FREE_TIER' ? '#1D4ED8' : '#64748B',
                border: `1px solid ${selectedPlan === 'FREE_TIER' ? '#BFDBFE' : '#E2E8F0'}`,
              }}
            >
              {selectedPlan === 'FREE_TIER' ? 'Selected' : 'Select Free'}
            </div>
          </div>

          {/* 2. 14-Day Pro Trial (Recommended) */}
          <div
            onClick={() => setSelectedPlan('PRO_TRIAL')}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: selectedPlan === 'PRO_TRIAL' ? '2px solid #2563EB' : '1px solid #E2E8F0',
              padding: '28px 24px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              boxShadow: selectedPlan === 'PRO_TRIAL' ? '0 12px 28px -4px rgba(37,99,235,0.18)' : '0 4px 12px rgba(0,0,0,0.03)',
              transition: 'all 0.15s ease',
            }}
          >
            {/* Recommended Badge */}
            <div
              style={{
                position: 'absolute',
                top: '-12px',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: '#2563EB',
                color: '#FFFFFF',
                fontSize: '11px',
                fontWeight: 700,
                padding: '3px 12px',
                borderRadius: '9999px',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Sparkles size={11} />
              Recommended
            </div>

            <div style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', marginBottom: '4px' }}>14-Day Pro Trial</div>
            <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '16px' }}>Full access to all selected products</div>

            <div style={{ fontSize: '28px', fontWeight: 800, color: '#2563EB', marginBottom: '16px' }}>
              $0 <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748B' }}>/ 14 days free</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', color: '#334155', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Check size={16} color="#16A34A" /> Unlimited scan executions
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Check size={16} color="#16A34A" /> Real-time GitHub PR security gates
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Check size={16} color="#16A34A" /> Full deterministic policy engine
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Check size={16} color="#16A34A" /> No credit card required
              </div>
            </div>

            <div
              style={{
                marginTop: 'auto',
                padding: '8px 12px',
                borderRadius: '6px',
                textAlign: 'center',
                fontSize: '13px',
                fontWeight: 600,
                backgroundColor: selectedPlan === 'PRO_TRIAL' ? '#2563EB' : '#EFF6FF',
                color: selectedPlan === 'PRO_TRIAL' ? '#FFFFFF' : '#1D4ED8',
              }}
            >
              {selectedPlan === 'PRO_TRIAL' ? 'Selected Plan' : 'Select Pro Trial'}
            </div>
          </div>

          {/* 3. Team & Enterprise */}
          <div
            onClick={() => setSelectedPlan('TEAM')}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: selectedPlan === 'TEAM' ? '2px solid #2563EB' : '1px solid #E2E8F0',
              padding: '28px 24px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: selectedPlan === 'TEAM' ? '0 8px 20px -4px rgba(37,99,235,0.1)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', marginBottom: '4px' }}>Team Workspace</div>
            <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '16px' }}>For engineering teams & organizations</div>

            <div style={{ fontSize: '28px', fontWeight: 800, color: '#0F172A', marginBottom: '16px' }}>
              $49 <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748B' }}>/ dev / month</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', color: '#334155', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Check size={16} color="#16A34A" /> Multi-seat collaboration
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Check size={16} color="#16A34A" /> Role-based access control (RBAC)
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Check size={16} color="#16A34A" /> Priority queue & SLA
              </div>
            </div>

            <div
              style={{
                marginTop: 'auto',
                padding: '8px 12px',
                borderRadius: '6px',
                textAlign: 'center',
                fontSize: '13px',
                fontWeight: 600,
                backgroundColor: selectedPlan === 'TEAM' ? '#EFF6FF' : '#F8FAFC',
                color: selectedPlan === 'TEAM' ? '#1D4ED8' : '#64748B',
                border: `1px solid ${selectedPlan === 'TEAM' ? '#BFDBFE' : '#E2E8F0'}`,
              }}
            >
              {selectedPlan === 'TEAM' ? 'Selected' : 'Select Team'}
            </div>
          </div>
        </div>

        {/* Footer Navigation */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: '20px',
            borderTop: '1px solid #E2E8F0',
            marginTop: 'auto',
          }}
        >
          <button
            type="button"
            onClick={() => router.push('/onboarding/products')}
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
            }}
          >
            <ArrowLeft size={14} />
            <span>Back to Products</span>
          </button>

          <button
            type="button"
            onClick={handleConfirmAccess}
            disabled={loading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '11px 26px',
              backgroundColor: '#2563EB',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.75 : 1,
              boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)',
            }}
          >
            <span>{loading ? 'Activating Workspace Access...' : 'Confirm & Activate Access'}</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </main>
    </div>
  );
}

export default function OnboardingPlansPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span>Loading plans...</span>
        </div>
      }
    >
      <OnboardingPlansContent />
    </Suspense>
  );
}
