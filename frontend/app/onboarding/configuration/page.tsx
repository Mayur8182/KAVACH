'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Rocket,
  Check,
  ChevronDown,
  Info,
  ArrowLeft,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { OnboardingLayout } from '@/components/onboarding/OnboardingLayout';
import { api } from '@/lib/api/client';

export default function OnboardingConfigurationPage() {
  const router = useRouter();

  // Active configuration tab
  const [activeTab, setActiveTab] = useState<'code' | 'cloud' | 'build' | 'runtime'>('code');

  // Code Security Settings
  const [scanFrequency, setScanFrequency] = useState('Daily');
  const [scanScope, setScanScope] = useState('Full Repository');
  const [secretScanning, setSecretScanning] = useState(true);
  const [aiAnalysis, setAiAnalysis] = useState(true);
  const [failBuildOnCritical, setFailBuildOnCritical] = useState(false);
  const [prComments, setPrComments] = useState(true);

  // Cloud Security Settings
  const [cspmInterval, setCspmInterval] = useState('Hourly');
  const [complianceChecks, setComplianceChecks] = useState(true);

  // Build Security Settings
  const [slsaVerification, setSlsaVerification] = useState(true);
  const [sbomGeneration, setSbomGeneration] = useState(true);

  // Runtime Security Settings
  const [ebpfMode, setEbpfMode] = useState('Monitor & Block');
  const [anomalyDetection, setAnomalyDetection] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadConfig() {
      try {
        const [productsRes, configRes] = await Promise.allSettled([
          api.onboarding.getProducts(),
          api.onboarding.getConfiguration(),
        ]);
        if (!isMounted) return;

        if (configRes.status === 'fulfilled' && configRes.value) {
          const cfg = configRes.value;
          if (cfg.scan_frequency) setScanFrequency(cfg.scan_frequency);
          if (cfg.scan_scope) setScanScope(cfg.scan_scope);
          if (typeof cfg.secret_scanning === 'boolean') setSecretScanning(cfg.secret_scanning);
          if (typeof cfg.ai_analysis === 'boolean') setAiAnalysis(cfg.ai_analysis);
          if (typeof cfg.fail_build_on_critical === 'boolean') setFailBuildOnCritical(cfg.fail_build_on_critical);
          if (typeof cfg.pr_comments === 'boolean') setPrComments(cfg.pr_comments);
          if (cfg.cspm_interval) setCspmInterval(cfg.cspm_interval);
          if (typeof cfg.compliance_checks === 'boolean') setComplianceChecks(cfg.compliance_checks);
          if (typeof cfg.slsa_verification === 'boolean') setSlsaVerification(cfg.slsa_verification);
          if (typeof cfg.sbom_generation === 'boolean') setSbomGeneration(cfg.sbom_generation);
          if (cfg.ebpf_mode) setEbpfMode(cfg.ebpf_mode);
          if (typeof cfg.anomaly_detection === 'boolean') setAnomalyDetection(cfg.anomaly_detection);
        }
      } catch (err) {
        console.warn('Could not prefill configuration:', err);
      }
    }
    loadConfig();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleFinish = async () => {
    setLoading(true);
    setError(null);
    try {
      await api.onboarding.saveConfiguration({
        scan_frequency: scanFrequency,
        scan_scope: scanScope,
        secret_scanning: secretScanning,
        ai_analysis: aiAnalysis,
        fail_build_on_critical: failBuildOnCritical,
        pr_comments: prComments,
        cspm_interval: cspmInterval,
        compliance_checks: complianceChecks,
        slsa_verification: slsaVerification,
        sbom_generation: sbomGeneration,
        ebpf_mode: ebpfMode,
        anomaly_detection: anomalyDetection,
      });
      try {
        await api.onboarding.complete();
      } catch (compErr) {
        console.warn('Could not mark onboarding complete:', compErr);
      }
      router.push('/onboarding/complete');
    } catch (err: any) {
      console.error('Failed to save configuration:', err);
      setError(err?.message || 'Failed to finalize setup. Please verify your settings and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <OnboardingLayout
      currentStep={6}
      title="Configure Selected Products"
      subtitle="Set up the initial configuration for your selected products."
    >
      <div style={{ maxWidth: '680px', margin: '0 auto', width: '100%' }}>
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '6px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', fontSize: '13px', marginBottom: '18px' }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Product Tabs Navigation */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '24px',
              borderBottom: '1px solid #E2E8F0',
              paddingBottom: '2px',
              marginBottom: '20px',
            }}
          >
            {[
              { id: 'code', label: 'Code Security' },
              { id: 'cloud', label: 'Cloud Security' },
              { id: 'build', label: 'Build Security' },
              { id: 'runtime', label: 'Runtime Security' },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  style={{
                    position: 'relative',
                    padding: '8px 4px 12px',
                    fontSize: '13px',
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? '#0F172A' : '#64748B',
                    border: 'none',
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                    transition: 'color 0.15s ease',
                  }}
                  className={!isActive ? 'hover:text-slate-900' : ''}
                >
                  <span>{tab.label}</span>
                  {isActive && (
                    <span
                      style={{
                        position: 'absolute',
                        bottom: '-1px',
                        left: 0,
                        right: 0,
                        height: '2px',
                        backgroundColor: '#2563EB',
                        borderRadius: '2px 2px 0 0',
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Form Card for Code Security */}
          {activeTab === 'code' && (
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '10px',
                padding: '24px 28px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              }}
            >
              <div style={{ marginBottom: '18px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: '0 0 4px 0' }}>
                  Code Security Configuration
                </h3>
                <p style={{ fontSize: '12px', color: '#64748B', margin: 0 }}>
                  Configure how Kavach scans and analyzes your code.
                </p>
              </div>

              {/* Scan Frequency & Scope */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '22px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Scan Frequency
                  </label>
                  <div style={{ position: 'relative' }}>
                    <select
                      value={scanFrequency}
                      onChange={(e) => setScanFrequency(e.target.value)}
                      style={{
                        width: '100%',
                        appearance: 'none',
                        padding: '9px 32px 9px 12px',
                        border: '1px solid #CBD5E1',
                        borderRadius: '6px',
                        fontSize: '13px',
                        color: '#0F172A',
                        backgroundColor: '#FFFFFF',
                        outline: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      <option value="Daily">Daily</option>
                      <option value="On Every Push/PR">On Every Push/PR</option>
                      <option value="Weekly">Weekly</option>
                    </select>
                    <ChevronDown size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748B' }} />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Scan Scope
                  </label>
                  <div style={{ position: 'relative' }}>
                    <select
                      value={scanScope}
                      onChange={(e) => setScanScope(e.target.value)}
                      style={{
                        width: '100%',
                        appearance: 'none',
                        padding: '9px 32px 9px 12px',
                        border: '1px solid #CBD5E1',
                        borderRadius: '6px',
                        fontSize: '13px',
                        color: '#0F172A',
                        backgroundColor: '#FFFFFF',
                        outline: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      <option value="Full Repository">Full Repository</option>
                      <option value="Changed Files Only">Changed Files Only</option>
                      <option value="Main Branch Only">Main Branch Only</option>
                    </select>
                    <ChevronDown size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748B' }} />
                  </div>
                </div>
              </div>

              {/* Toggles */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* 1. Secret Scanning */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                      Enable Secret Scanning
                    </span>
                    <Info size={13} style={{ color: '#94A3B8' }} />
                  </div>
                  <button
                    type="button"
                    onClick={() => setSecretScanning(!secretScanning)}
                    style={{
                      width: '42px',
                      height: '22px',
                      borderRadius: '12px',
                      backgroundColor: secretScanning ? '#2563EB' : '#CBD5E1',
                      border: 'none',
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'background-color 0.2s',
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        top: '2px',
                        left: secretScanning ? '22px' : '2px',
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        backgroundColor: '#FFFFFF',
                        transition: 'left 0.2s',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      }}
                    />
                  </button>
                </div>

                {/* 2. AI-Powered Analysis */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                      Enable AI-Powered Analysis
                    </span>
                    <Info size={13} style={{ color: '#94A3B8' }} />
                  </div>
                  <button
                    type="button"
                    onClick={() => setAiAnalysis(!aiAnalysis)}
                    style={{
                      width: '42px',
                      height: '22px',
                      borderRadius: '12px',
                      backgroundColor: aiAnalysis ? '#2563EB' : '#CBD5E1',
                      border: 'none',
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'background-color 0.2s',
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        top: '2px',
                        left: aiAnalysis ? '22px' : '2px',
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        backgroundColor: '#FFFFFF',
                        transition: 'left 0.2s',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      }}
                    />
                  </button>
                </div>

                {/* 3. Fail Build on Critical Issues */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                      Fail Build on Critical Issues
                    </span>
                    <Info size={13} style={{ color: '#94A3B8' }} />
                  </div>
                  <button
                    type="button"
                    onClick={() => setFailBuildOnCritical(!failBuildOnCritical)}
                    style={{
                      width: '42px',
                      height: '22px',
                      borderRadius: '12px',
                      backgroundColor: failBuildOnCritical ? '#2563EB' : '#CBD5E1',
                      border: 'none',
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'background-color 0.2s',
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        top: '2px',
                        left: failBuildOnCritical ? '22px' : '2px',
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        backgroundColor: '#FFFFFF',
                        transition: 'left 0.2s',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      }}
                    />
                  </button>
                </div>

                {/* 4. Generate Pull Request Comments */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                      Generate Pull Request Comments
                    </span>
                    <Info size={13} style={{ color: '#94A3B8' }} />
                  </div>
                  <button
                    type="button"
                    onClick={() => setPrComments(!prComments)}
                    style={{
                      width: '42px',
                      height: '22px',
                      borderRadius: '12px',
                      backgroundColor: prComments ? '#2563EB' : '#CBD5E1',
                      border: 'none',
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'background-color 0.2s',
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        top: '2px',
                        left: prComments ? '22px' : '2px',
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        backgroundColor: '#FFFFFF',
                        transition: 'left 0.2s',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      }}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Form Card for Cloud Security */}
          {activeTab === 'cloud' && (
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '10px',
                padding: '24px 28px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              }}
            >
              <div style={{ marginBottom: '18px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: '0 0 4px 0' }}>
                  Cloud Security Configuration
                </h3>
                <p style={{ fontSize: '12px', color: '#64748B', margin: 0 }}>
                  Continuous multi-cloud asset discovery and misconfiguration scanning.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    CSPM Scan Interval
                  </label>
                  <select
                    value={cspmInterval}
                    onChange={(e) => setCspmInterval(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      border: '1px solid #CBD5E1',
                      borderRadius: '6px',
                      fontSize: '13px',
                      color: '#0F172A',
                      backgroundColor: '#FFFFFF',
                    }}
                  >
                    <option value="Real-time (Webhook / CloudTrail)">Real-time (Webhook / CloudTrail)</option>
                    <option value="Hourly">Hourly</option>
                    <option value="Daily">Daily</option>
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                    Auto-remediation of public S3 buckets
                  </span>
                  <button
                    type="button"
                    onClick={() => setComplianceChecks(!complianceChecks)}
                    style={{
                      width: '42px',
                      height: '22px',
                      borderRadius: '12px',
                      backgroundColor: complianceChecks ? '#2563EB' : '#CBD5E1',
                      border: 'none',
                      cursor: 'pointer',
                      position: 'relative',
                    }}
                  >
                    <span style={{ position: 'absolute', top: '2px', left: complianceChecks ? '22px' : '2px', width: '18px', height: '18px', borderRadius: '50%', backgroundColor: '#FFFFFF' }} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Form Card for Build Security */}
          {activeTab === 'build' && (
            <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '24px 28px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: '0 0 12px 0' }}>Build & CI/CD Security</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>Cryptographic SLSA Provenance Verification</span>
                  <button type="button" onClick={() => setSlsaVerification(!slsaVerification)} style={{ width: '42px', height: '22px', borderRadius: '12px', backgroundColor: slsaVerification ? '#2563EB' : '#CBD5E1', border: 'none', cursor: 'pointer', position: 'relative' }}>
                    <span style={{ position: 'absolute', top: '2px', left: slsaVerification ? '22px' : '2px', width: '18px', height: '18px', borderRadius: '50%', backgroundColor: '#FFFFFF' }} />
                  </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>Generate CycloneDX SBOM on Container Builds</span>
                  <button type="button" onClick={() => setSbomGeneration(!sbomGeneration)} style={{ width: '42px', height: '22px', borderRadius: '12px', backgroundColor: sbomGeneration ? '#2563EB' : '#CBD5E1', border: 'none', cursor: 'pointer', position: 'relative' }}>
                    <span style={{ position: 'absolute', top: '2px', left: sbomGeneration ? '22px' : '2px', width: '18px', height: '18px', borderRadius: '50%', backgroundColor: '#FFFFFF' }} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Form Card for Runtime Security */}
          {activeTab === 'runtime' && (
            <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '24px 28px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: '0 0 12px 0' }}>Runtime Defense (eBPF)</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>eBPF Enforcement Mode</label>
                  <select value={ebpfMode} onChange={(e) => setEbpfMode(e.target.value)} style={{ width: '100%', padding: '9px 12px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '13px' }}>
                    <option value="Monitor & Block">Monitor & Block (Recommended)</option>
                    <option value="Audit Mode Only">Audit Mode Only</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Navigation Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '24px', paddingTop: '18px', borderTop: '1px solid #E2E8F0' }}>
            <button
              type="button"
              onClick={() => router.push('/onboarding/products')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 18px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#475569',
                cursor: 'pointer',
              }}
              className="hover:bg-slate-50"
            >
              <ArrowLeft size={14} />
              <span>Back</span>
            </button>

            <button
              type="button"
              onClick={handleFinish}
              disabled={loading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '11px 26px',
                backgroundColor: '#09090B',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                color: '#FFFFFF',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                transition: 'background-color 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#27272A')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#09090B')}
            >
              <Check size={16} strokeWidth={2.5} />
              <span>{loading ? 'Finalizing Setup...' : 'Finish Setup & Launch'}</span>
            </button>
          </div>
      </div>
    </OnboardingLayout>
  );
}
