'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ContainerSecurityLayout } from './ContainerSecurityLayout';
import { useScope } from '@/context/ScopeContext';
import { api } from '@/lib/api/client';
import {
  Settings,
  Shield,
  Save,
  RefreshCw,
  Bell,
  Lock,
  Key,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { toast } from '@/lib/toast';

const TABS = [
  { id: 'general', label: 'General Settings' },
  { id: 'scan', label: 'Scan Settings' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'access', label: 'Access Control' },
  { id: 'roles', label: 'Roles & Permissions' },
  { id: 'api-keys', label: 'API Keys' },
  { id: 'retention', label: 'Retention Settings' },
  { id: 'audit-logs', label: 'Audit Logs' },
];

export const ContainerSettingsView: React.FC = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { currentProject } = useScope();

  const tabParam = searchParams.get('tab') || 'general';
  const [activeTab, setActiveTab] = useState<string>(tabParam);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Settings form states
  const [scannerEngine, setScannerEngine] = useState('Trivy Engine v0.58');
  const [autoScanOnPush, setAutoScanOnPush] = useState(true);
  const [dailySchedule, setDailySchedule] = useState(true);
  const [blockOnCritical, setBlockOnCritical] = useState(true);
  const [retentionDays, setRetentionDays] = useState(90);
  const [notifySlack, setNotifySlack] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState(true);

  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    router.push(`/container-security/settings?tab=${tabId}`);
  };

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.containers.settings(currentProject?.id || null);
      if (res) {
        setScannerEngine(res.scanner_engine || 'Trivy Engine v0.58');
        setAutoScanOnPush(res.auto_scan_on_push ?? true);
        setDailySchedule(res.daily_schedule_enabled ?? true);
        setBlockOnCritical(res.block_on_critical_cves ?? true);
        setRetentionDays(res.retention_days || 90);
        if (res.notification_channels) {
          setNotifySlack(res.notification_channels.slack ?? true);
          setNotifyEmail(res.notification_channels.email ?? true);
        }
      }
    } catch {
      // Use defaults
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.containers.saveSettings({
        scanner_engine: scannerEngine,
        auto_scan_on_push: autoScanOnPush,
        daily_schedule_enabled: dailySchedule,
        block_on_critical_cves: blockOnCritical,
        retention_days: retentionDays,
        notification_channels: {
          slack: notifySlack,
          email: notifyEmail,
        },
      });
      toast.success('Container security configuration saved successfully');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ContainerSecurityLayout
      sectionTitle="Settings"
      sectionDescription="Global scanner preferences, vulnerability database update intervals, admission gate thresholds, and alerting channels."
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={handleTabChange}
      headerActions={
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
        >
          <Save className="w-3.5 h-3.5" />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      }
    >
      <div className="space-y-6 max-w-4xl">
        {/* Scanner Engine Settings */}
        <div className="bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm space-y-4">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 className="font-semibold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
              Container Scanner Engines
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Select primary deterministic scanning engine used for layer SBOM & vulnerability extraction.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label
              className={`p-4 rounded-lg border cursor-pointer transition-all ${
                scannerEngine === 'Trivy Engine v0.58'
                  ? 'border-blue-500 bg-blue-50/20 dark:bg-blue-950/20 ring-1 ring-blue-500'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <input
                    type="radio"
                    name="scanner"
                    checked={scannerEngine === 'Trivy Engine v0.58'}
                    onChange={() => setScannerEngine('Trivy Engine v0.58')}
                    className="sr-only"
                  />
                  <span className="font-semibold text-xs text-slate-900 dark:text-white block">
                    Trivy Engine v0.58 (Recommended)
                  </span>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Fast layer analysis, OS packages, app dependencies, secrets, and misconfigurations.
                  </span>
                </div>
                <Shield className="w-4 h-4 text-blue-500" />
              </div>
            </label>

            <label
              className={`p-4 rounded-lg border cursor-pointer transition-all ${
                scannerEngine === 'Grype Engine v0.84'
                  ? 'border-blue-500 bg-blue-50/20 dark:bg-blue-950/20 ring-1 ring-blue-500'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <input
                    type="radio"
                    name="scanner"
                    checked={scannerEngine === 'Grype Engine v0.84'}
                    onChange={() => setScannerEngine('Grype Engine v0.84')}
                    className="sr-only"
                  />
                  <span className="font-semibold text-xs text-slate-900 dark:text-white block">
                    Grype Engine v0.84
                  </span>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Anchore-backed vulnerability scanner matching Syft SBOM component IDs.
                  </span>
                </div>
                <Shield className="w-4 h-4 text-slate-400" />
              </div>
            </label>
          </div>
        </div>

        {/* Automation & Gates */}
        <div className="bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm space-y-4">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 className="font-semibold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
              Scan Automation & Admission Rules
            </h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold text-xs text-slate-900 dark:text-white block">
                  Automatic Scan on Registry Push
                </span>
                <span className="text-xs text-slate-500">
                  Trigger background Trivy scan as soon as new image digest is pushed.
                </span>
              </div>
              <input
                type="checkbox"
                checked={autoScanOnPush}
                onChange={(e) => setAutoScanOnPush(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold text-xs text-slate-900 dark:text-white block">
                  Daily Scheduled Fleet Rescan
                </span>
                <span className="text-xs text-slate-500">
                  Rescan all production images daily against newly published CVE advisories.
                </span>
              </div>
              <input
                type="checkbox"
                checked={dailySchedule}
                onChange={(e) => setDailySchedule(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold text-xs text-slate-900 dark:text-white block">
                  Block Deployments on Critical Vulnerabilities
                </span>
                <span className="text-xs text-slate-500">
                  Enforce AdmissionWebhook block if unsuppressed Critical CVE exists.
                </span>
              </div>
              <input
                type="checkbox"
                checked={blockOnCritical}
                onChange={(e) => setBlockOnCritical(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Data Retention */}
        <div className="bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm space-y-4">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 className="font-semibold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
              Audit Data Retention
            </h3>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-slate-600 dark:text-slate-400">Keep scan history for:</span>
              <span className="font-bold font-mono text-slate-900 dark:text-white">
                {retentionDays} Days
              </span>
            </div>
            <input
              type="range"
              min="30"
              max="365"
              step="30"
              value={retentionDays}
              onChange={(e) => setRetentionDays(Number(e.target.value))}
              className="w-full"
            />
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm space-y-4">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 className="font-semibold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
              Alert Notification Channels
            </h3>
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={notifySlack}
                onChange={(e) => setNotifySlack(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              Notify Slack webhook on newly discovered Critical CVEs
            </label>

            <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={notifyEmail}
                onChange={(e) => setNotifyEmail(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              Send daily security posture digest via email
            </label>
          </div>
        </div>
      </div>
    </ContainerSecurityLayout>
  );
};

export default ContainerSettingsView;
