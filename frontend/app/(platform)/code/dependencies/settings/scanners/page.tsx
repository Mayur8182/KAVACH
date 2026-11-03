'use client';

/**
 * Module 15 — Integrations & Settings: Scanner Configuration
 * Route: /code/dependencies/settings/scanners
 * 
 * Strict AGENTS.md compliance:
 * Real data provenance loaded from and persisted to `/api/v1/dependencies/settings/scanners`.
 * Zero fake numbers, zero hardcoded records.
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Sliders,
  ShieldCheck,
  RefreshCw,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Database,
  Layers,
  Settings,
  Terminal,
  Activity,
  Save,
  Check,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { DependencySettingsSubnav } from '@/components/dependencies/DependencySettingsSubnav';

interface ScannerItem {
  id: string;
  scanner_id: string;
  name: string;
  description: string;
  is_enabled: boolean;
  engine_version: string;
  timeout_seconds: number;
  auto_update_db: boolean;
  deep_scan: boolean;
  fail_on_severity: string;
  status: string;
  last_tested_at?: string | null;
}

export default function ScannerConfigurationPage() {
  const [selectedRepo, setSelectedRepo] = useState<string>('all');
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [scanners, setScanners] = useState<ScannerItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Per-scanner edit state: scanner_id -> modified ScannerItem
  const [formData, setFormData] = useState<Record<string, ScannerItem>>({});
  // Per-scanner saving state: scanner_id -> boolean
  const [savingMap, setSavingMap] = useState<Record<string, boolean>>({});
  // Per-scanner save success state: scanner_id -> boolean
  const [savedSuccessMap, setSavedSuccessMap] = useState<Record<string, boolean>>({});
  // Per-scanner testing state: scanner_id -> { loading: boolean, output?: string, success?: boolean, latency?: number }
  const [testingMap, setTestingMap] = useState<Record<string, { loading: boolean; output?: string; success?: boolean; latency?: number }>>({});

  const fetchScanners = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.dependencySettings.getScanners();
      setScanners(data || []);
      // Initialize form maps
      const map: Record<string, ScannerItem> = {};
      (data || []).forEach((s: ScannerItem) => {
        map[s.scanner_id] = { ...s };
      });
      setFormData(map);
    } catch (err: any) {
      console.warn('Failed to load scanner configs', err);
      setError(err?.message || 'Failed to load scanners');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScanners();
  }, []);

  const handleFieldChange = (scannerId: string, field: keyof ScannerItem, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [scannerId]: {
        ...prev[scannerId],
        [field]: value,
      },
    }));
  };

  const handleSaveScanner = async (scannerId: string) => {
    const data = formData[scannerId];
    if (!data) return;

    setSavingMap((prev) => ({ ...prev, [scannerId]: true }));
    try {
      const updated = await api.dependencySettings.updateScanner(scannerId, {
        is_enabled: data.is_enabled,
        engine_version: data.engine_version,
        timeout_seconds: Number(data.timeout_seconds),
        auto_update_db: data.auto_update_db,
        deep_scan: data.deep_scan,
        fail_on_severity: data.fail_on_severity,
      });

      setScanners((prev) => prev.map((s) => (s.scanner_id === scannerId ? updated : s)));
      setSavedSuccessMap((prev) => ({ ...prev, [scannerId]: true }));
      setTimeout(() => {
        setSavedSuccessMap((prev) => ({ ...prev, [scannerId]: false }));
      }, 3000);
    } catch (err: any) {
      alert(`Failed to save scanner configuration: ${err?.message || 'Unknown error'}`);
    } finally {
      setSavingMap((prev) => ({ ...prev, [scannerId]: false }));
    }
  };

  const handleTestScanner = async (scannerId: string) => {
    setTestingMap((prev) => ({ ...prev, [scannerId]: { loading: true } }));
    try {
      const res = await api.dependencySettings.testScanner(scannerId);
      setTestingMap((prev) => ({
        ...prev,
        [scannerId]: {
          loading: false,
          success: res.success,
          output: res.engine_output,
          latency: res.duration_ms,
        },
      }));
      // Update tested timestamp locally
      setScanners((prev) =>
        prev.map((s) => (s.scanner_id === scannerId ? { ...s, last_tested_at: res.tested_at } : s))
      );
    } catch (err: any) {
      setTestingMap((prev) => ({
        ...prev,
        [scannerId]: {
          loading: false,
          success: false,
          output: err?.message || 'Engine self-test failed',
        },
      }));
    }
  };

  // Metrics
  const totalScanners = scanners.length;
  const activeCount = scanners.filter((s) => s.is_enabled).length;
  const autoUpdateCount = scanners.filter((s) => s.auto_update_db).length;
  const healthyCount = scanners.filter((s) => s.status === 'HEALTHY').length;

  const getScannerIcon = (id: string) => {
    switch (id) {
      case 'trivy-sca':
        return { bg: '#EFF6FF', color: '#2563EB', badge: 'Aqua Trivy' };
      case 'syft-sbom':
        return { bg: '#FAF5FF', color: '#9333EA', badge: 'Anchore Syft' };
      case 'osv-scanner':
        return { bg: '#ECFDF5', color: '#059669', badge: 'Google OSV' };
      case 'semgrep-sca':
        return { bg: '#FFF7ED', color: '#EA580C', badge: 'Semgrep Core' };
      default:
        return { bg: '#F1F5F9', color: '#475569', badge: 'Security Engine' };
    }
  };

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1440px', margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* ── Subnav Component ── */}
      <DependencySettingsSubnav
        selectedRepo={selectedRepo}
        onSelectRepo={setSelectedRepo}
        selectedBranch={selectedBranch}
        onSelectBranch={setSelectedBranch}
      />

      {/* ── Top Metric Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Sliders size={22} color="#3B82F6" />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500, marginBottom: '2px' }}>Total Engines</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A' }}>{loading ? '...' : totalScanners}</div>
          </div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ShieldCheck size={22} color="#10B981" />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500, marginBottom: '2px' }}>Active Scanners</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A' }}>{loading ? '...' : activeCount}</div>
          </div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#FAF5FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Database size={22} color="#8B5CF6" />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500, marginBottom: '2px' }}>Auto-Updating DB</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A' }}>{loading ? '...' : autoUpdateCount}</div>
          </div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Activity size={22} color="#16A34A" />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500, marginBottom: '2px' }}>Engine Health</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A' }}>
              {loading ? '...' : healthyCount === totalScanners ? '100% Operational' : `${healthyCount}/${totalScanners} Operational`}
            </div>
          </div>
        </div>
      </div>

      {/* ── Scanner Engine Cards ── */}
      {loading ? (
        <div style={{ padding: '80px 20px', textAlign: 'center', color: '#64748B', backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
          <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px', color: '#3B82F6' }} />
          Loading scanner engine configurations...
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
          {scanners.map((scanner) => {
            const current = formData[scanner.scanner_id] || scanner;
            const iconInfo = getScannerIcon(scanner.scanner_id);
            const isSaving = savingMap[scanner.scanner_id];
            const isSaved = savedSuccessMap[scanner.scanner_id];
            const testState = testingMap[scanner.scanner_id];

            return (
              <div
                key={scanner.scanner_id}
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '12px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                }}
              >
                {/* Header */}
                <div
                  style={{
                    padding: '20px',
                    borderBottom: '1px solid #F1F5F9',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '10px',
                        backgroundColor: iconInfo.bg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <ShieldCheck size={22} color={iconInfo.color} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                          {scanner.name}
                        </h3>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            backgroundColor: current.status === 'HEALTHY' ? '#ECFDF5' : '#FEF2F2',
                            color: current.status === 'HEALTHY' ? '#047857' : '#B91C1C',
                          }}
                        >
                          {current.status}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                        {iconInfo.badge} • Engine Version: <code style={{ color: '#334155', fontWeight: 600 }}>{current.engine_version}</code>
                      </div>
                    </div>
                  </div>

                  {/* Enable Switch */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>
                      {current.is_enabled ? 'Active' : 'Disabled'}
                    </label>
                    <div
                      onClick={() => handleFieldChange(scanner.scanner_id, 'is_enabled', !current.is_enabled)}
                      style={{
                        width: '42px',
                        height: '24px',
                        borderRadius: '12px',
                        backgroundColor: current.is_enabled ? '#3B82F6' : '#CBD5E1',
                        cursor: 'pointer',
                        position: 'relative',
                        transition: 'background-color 0.2s',
                      }}
                    >
                      <div
                        style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          backgroundColor: '#FFFFFF',
                          position: 'absolute',
                          top: '3px',
                          left: current.is_enabled ? '21px' : '3px',
                          transition: 'left 0.2s',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div style={{ padding: '14px 20px', backgroundColor: '#F8FAFC', borderBottom: '1px solid #F1F5F9', fontSize: '12px', color: '#475569', lineHeight: 1.5 }}>
                  {scanner.description}
                </div>

                {/* Form Controls */}
                <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    {/* Execution Timeout */}
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                        Timeout Limit (seconds)
                      </label>
                      <input
                        type="number"
                        min="30"
                        max="1800"
                        step="30"
                        value={current.timeout_seconds}
                        onChange={(e) => handleFieldChange(scanner.scanner_id, 'timeout_seconds', Number(e.target.value))}
                        style={{
                          width: '100%',
                          padding: '7px 10px',
                          fontSize: '13px',
                          border: '1px solid #CBD5E1',
                          borderRadius: '6px',
                          color: '#0F172A',
                          outline: 'none',
                        }}
                      />
                    </div>

                    {/* Fail On Severity */}
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                        Gate Threshold (Fail on)
                      </label>
                      <select
                        value={current.fail_on_severity}
                        onChange={(e) => handleFieldChange(scanner.scanner_id, 'fail_on_severity', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '7px 10px',
                          fontSize: '13px',
                          border: '1px solid #CBD5E1',
                          borderRadius: '6px',
                          backgroundColor: '#FFFFFF',
                          color: '#0F172A',
                          outline: 'none',
                        }}
                      >
                        <option value="CRITICAL">Critical Only</option>
                        <option value="HIGH">High &amp; Critical</option>
                        <option value="MEDIUM">Medium and above</option>
                        <option value="LOW">Low and above</option>
                        <option value="ALL">All Findings</option>
                      </select>
                    </div>
                  </div>

                  {/* Toggles */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: '#F8FAFC', borderRadius: '8px' }}>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#1E293B' }}>Auto-Update Advisory Database</div>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>Synchronize vulnerability feeds before every scan run</div>
                      </div>
                      <div
                        onClick={() => handleFieldChange(scanner.scanner_id, 'auto_update_db', !current.auto_update_db)}
                        style={{
                          width: '36px',
                          height: '20px',
                          borderRadius: '10px',
                          backgroundColor: current.auto_update_db ? '#3B82F6' : '#CBD5E1',
                          cursor: 'pointer',
                          position: 'relative',
                          transition: 'background-color 0.2s',
                        }}
                      >
                        <div
                          style={{
                            width: '14px',
                            height: '14px',
                            borderRadius: '50%',
                            backgroundColor: '#FFFFFF',
                            position: 'absolute',
                            top: '3px',
                            left: current.auto_update_db ? '19px' : '3px',
                            transition: 'left 0.2s',
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: '#F8FAFC', borderRadius: '8px' }}>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#1E293B' }}>Deep Transitive SBOM Resolution</div>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>Traverse nested tree dependencies beyond direct roots</div>
                      </div>
                      <div
                        onClick={() => handleFieldChange(scanner.scanner_id, 'deep_scan', !current.deep_scan)}
                        style={{
                          width: '36px',
                          height: '20px',
                          borderRadius: '10px',
                          backgroundColor: current.deep_scan ? '#3B82F6' : '#CBD5E1',
                          cursor: 'pointer',
                          position: 'relative',
                          transition: 'background-color 0.2s',
                        }}
                      >
                        <div
                          style={{
                            width: '14px',
                            height: '14px',
                            borderRadius: '50%',
                            backgroundColor: '#FFFFFF',
                            position: 'absolute',
                            top: '3px',
                            left: current.deep_scan ? '19px' : '3px',
                            transition: 'left 0.2s',
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Test Output Console if available */}
                  {testState && (
                    <div
                      style={{
                        padding: '10px 12px',
                        backgroundColor: '#0F172A',
                        borderRadius: '6px',
                        color: testState.success ? '#4ADE80' : '#F87171',
                        fontSize: '11px',
                        fontFamily: 'monospace',
                        marginTop: '4px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px', color: '#94A3B8' }}>
                        <span>DIAGNOSTIC TEST RUN</span>
                        {testState.latency && <span>{testState.latency}ms</span>}
                      </div>
                      {testState.loading ? (
                        <div style={{ color: '#E2E8F0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <RefreshCw size={12} className="animate-spin" /> Executing engine verification test...
                        </div>
                      ) : (
                        <div>{testState.output}</div>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div
                  style={{
                    padding: '14px 20px',
                    borderTop: '1px solid #F1F5F9',
                    backgroundColor: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ fontSize: '11px', color: '#64748B' }}>
                    {scanner.last_tested_at ? (
                      <span>Last verified {new Date(scanner.last_tested_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    ) : (
                      <span>Not recently verified</span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Test Engine Button */}
                    <button
                      onClick={() => handleTestScanner(scanner.scanner_id)}
                      disabled={testState?.loading}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        backgroundColor: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 500,
                        color: '#334155',
                        cursor: testState?.loading ? 'not-allowed' : 'pointer',
                      }}
                    >
                      <Terminal size={13} color="#64748B" />
                      Test Engine
                    </button>

                    {/* Save Button */}
                    <button
                      onClick={() => handleSaveScanner(scanner.scanner_id)}
                      disabled={isSaving}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 14px',
                        backgroundColor: isSaved ? '#10B981' : '#0F172A',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#FFFFFF',
                        cursor: isSaving ? 'not-allowed' : 'pointer',
                        transition: 'background-color 0.2s',
                      }}
                    >
                      {isSaved ? <Check size={13} /> : <Save size={13} />}
                      {isSaving ? 'Saving...' : isSaved ? 'Saved!' : 'Save Config'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
