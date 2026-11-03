'use client';

import React, { useState, useEffect } from 'react';
import {
  Shield,
  CheckCircle2,
  Lock,
  GitBranch,
  Save,
  AlertTriangle,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { KavachApiLayout } from '../components/KavachApiLayout';
import { useApiSecurity } from '../context/ApiSecurityContext';
import { api } from '@/lib/api/client';

export interface PolicyItem {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  severity: string;
  priority?: number;
  updated_at?: string;
}

export default function ApiSecurityPoliciesPage() {
  const { selectedApi } = useApiSecurity();

  const [policies, setPolicies] = useState<PolicyItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchPolicies = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await api.apiSecurity.getPolicies(selectedApi?.id);
      if (res?.policies) {
        setPolicies(res.policies);
      }
    } catch (err: any) {
      console.error('Failed to load API policies:', err);
      setErrorMessage(err?.message || 'Failed to connect to backend policy engine');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, [selectedApi?.id]);

  const togglePolicy = (id: string) => {
    setPolicies((prev) =>
      prev.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p))
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    setErrorMessage(null);
    setSaveSuccess(null);
    try {
      const res = await api.apiSecurity.savePolicies(policies, selectedApi?.id);
      if (res?.policies) {
        setPolicies(res.policies);
      }
      setSaveSuccess(res?.message || 'Security policies successfully persisted to PostgreSQL.');
      setTimeout(() => setSaveSuccess(null), 3500);
    } catch (err: any) {
      console.error('Failed to save policies:', err);
      setErrorMessage(err?.message || 'Failed to save policies to database');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KavachApiLayout activeApiId={selectedApi?.id}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
              Security Policies
            </h1>
            <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
              Configure deterministic guardrails, CI/CD security gates, and automated test enforcement.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={fetchPolicies}
              disabled={isLoading || isSaving}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#FFFFFF',
                color: '#475569',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                padding: '8px 14px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || isLoading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: saveSuccess ? '#10B981' : '#2563EB',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 18px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: isSaving ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s',
              }}
            >
              {isSaving ? (
                <Loader2 size={15} className="animate-spin" />
              ) : saveSuccess ? (
                <CheckCircle2 size={15} />
              ) : (
                <Save size={15} />
              )}
              <span>{isSaving ? 'Persisting...' : saveSuccess ? 'Policies Saved' : 'Save Policies'}</span>
            </button>
          </div>
        </div>

        {saveSuccess && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              backgroundColor: '#F0FDF4',
              border: '1px solid #86EFAC',
              color: '#166534',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <CheckCircle2 size={16} />
            <span>{saveSuccess}</span>
          </div>
        )}

        {errorMessage && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              backgroundColor: '#FEF2F2',
              border: '1px solid #FCA5A5',
              color: '#991B1B',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertTriangle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '10px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {isLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 0', gap: '8px', color: '#64748B' }}>
              <Loader2 size={20} className="animate-spin" />
              <span style={{ fontSize: '13px' }}>Loading policies from PostgreSQL...</span>
            </div>
          ) : policies.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: '#64748B', fontSize: '13px' }}>
              No security policies configured for this scope. Click refresh to initialize standard guardrails.
            </div>
          ) : (
            policies.map((pol) => (
              <div
                key={pol.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  borderRadius: '8px',
                  backgroundColor: pol.enabled ? '#F8FAFC' : '#FFFFFF',
                  border: `1px solid ${pol.enabled ? '#BFDBFE' : '#E2E8F0'}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '6px',
                      backgroundColor: pol.enabled ? '#EFF6FF' : '#F1F5F9',
                      color: pol.enabled ? '#2563EB' : '#94A3B8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Shield size={16} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                        {pol.name}
                      </span>
                      <span
                        style={{
                          padding: '1px 6px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: 700,
                          backgroundColor: pol.severity === 'CRITICAL' ? '#FEF2F2' : pol.severity === 'HIGH' ? '#FFF7ED' : '#F1F5F9',
                          color: pol.severity === 'CRITICAL' ? '#DC2626' : pol.severity === 'HIGH' ? '#EA580C' : '#475569',
                        }}
                      >
                        {pol.severity}
                      </span>
                    </div>
                    <span style={{ fontSize: '12px', color: '#64748B' }}>
                      {pol.description}
                    </span>
                  </div>
                </div>

                <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={pol.enabled}
                    onChange={() => togglePolicy(pol.id)}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      inset: 0,
                      backgroundColor: pol.enabled ? '#2563EB' : '#CBD5E1',
                      borderRadius: '9999px',
                      transition: '0.2s',
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        content: '""',
                        height: '18px',
                        width: '18px',
                        left: pol.enabled ? '23px' : '3px',
                        bottom: '3px',
                        backgroundColor: '#FFFFFF',
                        borderRadius: '50%',
                        transition: '0.2s',
                      }}
                    />
                  </span>
                </label>
              </div>
            ))
          )}
        </div>
      </div>
    </KavachApiLayout>
  );
}
