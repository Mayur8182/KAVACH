'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api/client';

export interface ProductEntitlementItem {
  key: string;
  name: string;
  tagline: string;
  description: string;
  category: string;
  icon: string;
  primary_route: string;
  is_enabled: boolean;
  status: 'ENABLED' | 'LOCKED' | 'TRIAL' | 'ADDON';
  badge: string;
  price_per_month: number;
  features: Array<{ name: string; included: boolean }>;
  granted_at?: string | null;
  expires_at?: string | null;
  source: string;
}

export interface WorkspaceSubscription {
  plan: string;
  status: string;
  billing_cycle: string;
  trial_active: boolean;
  days_remaining: number | null;
  max_seats: number;
  used_seats: number;
}

export interface EntitlementsState {
  organization_id: string;
  organization_name: string;
  organization_slug: string;
  onboarding_completed: boolean;
  subscription: WorkspaceSubscription;
  products: Record<string, ProductEntitlementItem>;
  enabled_products_count: number;
}

const DEFAULT_STATE: EntitlementsState = {
  organization_id: '',
  organization_name: 'Workspace',
  organization_slug: 'default',
  onboarding_completed: true,
  subscription: {
    plan: 'FREE_TIER',
    status: 'ACTIVE',
    billing_cycle: 'monthly',
    trial_active: false,
    days_remaining: null,
    max_seats: 5,
    used_seats: 1,
  },
  products: {
    thing_code: {
      key: 'thing_code',
      name: 'Code Security',
      tagline: 'Code quality, SAST, secrets, dependency and PR checks',
      description: 'Deterministic code security engine running Semgrep, Gitleaks, OSV, and PR reviews.',
      category: 'Application Security & SAST',
      icon: 'Code2',
      primary_route: '/code',
      is_enabled: true,
      status: 'ENABLED',
      badge: 'Core AppSec',
      price_per_month: 29,
      features: [],
      source: 'DEFAULT',
    },
    thing_cloud: {
      key: 'thing_cloud',
      name: 'Cloud Security',
      tagline: 'Cloud infrastructure security',
      description: 'CSPM, Kubernetes security, Docker hardening, and IaC drift detection.',
      category: 'Cloud Security Posture (CSPM)',
      icon: 'Cloud',
      primary_route: '/cloud',
      is_enabled: false,
      status: 'LOCKED',
      badge: 'Infrastructure',
      price_per_month: 79,
      features: [],
      source: 'DEFAULT',
    },
    thing_attack: {
      key: 'thing_attack',
      name: 'Attack Surface',
      tagline: 'DAST, API testing and authorized security testing',
      description: 'Offensive security platform featuring automated DAST scanning and API testing.',
      category: 'Offensive Security & DAST',
      icon: 'Crosshair',
      primary_route: '/attack',
      is_enabled: false,
      status: 'LOCKED',
      badge: 'Offensive',
      price_per_month: 99,
      features: [],
      source: 'DEFAULT',
    },
    thing_protect: {
      key: 'thing_protect',
      name: 'Runtime Defense',
      tagline: 'Runtime and application defense',
      description: 'Zero-trust runtime protection, MCP tool security gateway, and agent guardrails.',
      category: 'Runtime Defense & Gateway',
      icon: 'ShieldCheck',
      primary_route: '/protect',
      is_enabled: false,
      status: 'LOCKED',
      badge: 'Runtime Zero-Trust',
      price_per_month: 149,
      features: [],
      source: 'DEFAULT',
    },
  },
  enabled_products_count: 1,
};

// Global broadcast channel / custom event for instant cross-tab / cross-component updates
const ENTITLEMENTS_CHANGED_EVENT = 'seculayer:entitlements_changed';

export function useEntitlements() {
  const [data, setData] = useState<EntitlementsState>(DEFAULT_STATE);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEntitlements = useCallback(async () => {
    try {
      const res = await api.entitlements.getMe();
      if (res && res.products) {
        setData(res);
      }
      setError(null);
    } catch (err: any) {
      // Keep sensible default if offline or initializing
      console.warn('Could not load workspace entitlements:', err?.message || err);
      setError(err?.message || 'Failed to load entitlements');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntitlements();

    const handleUpdate = () => {
      fetchEntitlements();
    };

    window.addEventListener(ENTITLEMENTS_CHANGED_EVENT, handleUpdate);
    return () => {
      window.removeEventListener(ENTITLEMENTS_CHANGED_EVENT, handleUpdate);
    };
  }, [fetchEntitlements]);

  const isProductEnabled = useCallback(
    (productKey: string): boolean => {
      if (!data?.products) return productKey === 'thing_code';
      const prod = data.products[productKey];
      return Boolean(prod?.is_enabled);
    },
    [data]
  );

  const upgradeProduct = useCallback(
    async (productKey: string, planName?: string): Promise<boolean> => {
      try {
        const res = await api.entitlements.upgrade({
          product_key: productKey,
          plan_name: planName || 'Add-on Subscription',
          payment_token: `auth_tx_${Math.random().toString(36).substring(2, 10)}`,
        });
        if (res?.data) {
          setData(res.data);
          window.dispatchEvent(new CustomEvent(ENTITLEMENTS_CHANGED_EVENT));
          return true;
        }
        return false;
      } catch (err: any) {
        console.error('Upgrade failed:', err);
        throw err;
      }
    },
    []
  );

  return {
    entitlements: data,
    products: data.products,
    subscription: data.subscription,
    onboardingCompleted: data.onboarding_completed,
    isLoading: loading,
    error,
    isProductEnabled,
    upgradeProduct,
    refreshEntitlements: fetchEntitlements,
  };
}
