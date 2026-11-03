'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ChevronRight,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Plus,
  Save,
  ArrowLeft,
  X,
} from 'lucide-react';
import { SuperAdminShell } from '@/components/superadmin/SuperAdminShell';
import { api } from '@/lib/api/client';

export default function QuotaAlertsPage() {
  const [activeSubTab, setActiveSubTab] = useState<'rules' | 'settings'>('rules');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [alertRules, setAlertRules] = useState<any[]>([]);
  const [notificationSettings, setNotificationSettings] = useState({
    send_daily_summary: false,
    notify_tenant_admins: true,
    notify_platform_users: true,
  });

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [newRule, setNewRule] = useState({
    rule_name: '',
    quota_type: 'Repositories',
    threshold_percent: 80,
    channels: 'Email, Slack',
  });

  const loadAlerts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.superadmin.listQuotaAlerts();
      setAlertRules(res.alert_rules || []);
      if (res.notification_settings) {
        setNotificationSettings(res.notification_settings);
      }
    } catch (err: any) {
      console.error('Failed to load alert rules:', err);
      setError(err?.message || 'Failed to retrieve quota alert rules.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const handleToggleRule = async (ruleId: string) => {
    try {
      const updated = await api.superadmin.toggleQuotaAlertRule(ruleId);
      setAlertRules((prev) =>
        prev.map((r) => (r.id === ruleId ? { ...r, status: updated.status } : r))
      );
    } catch (err: any) {
      setError(err?.message || 'Failed to toggle alert rule.');
    }
  };

  const handleToggleNotification = (key: keyof typeof notificationSettings) => {
    setNotificationSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSaveNotifications = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.superadmin.updateQuotaNotificationSettings(notificationSettings);
      setSuccess('Notification settings updated successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err?.message || 'Failed to update notification settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.superadmin.createQuotaAlertRule(newRule);
      setSuccess(`Alert rule "${newRule.rule_name}" created!`);
      setModalOpen(false);
      setNewRule({
        rule_name: '',
        quota_type: 'Repositories',
        threshold_percent: 80,
        channels: 'Email, Slack',
      });
      loadAlerts();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err?.message || 'Failed to create alert rule.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SuperAdminShell>
      <div className="p-8 max-w-5xl mx-auto space-y-6">
        {/* Sub-Navigation */}
        <div className="flex items-center gap-6 border-b border-slate-200 pb-3 text-xs font-semibold">
          <Link href="/superadmin/plans" className="text-slate-500 hover:text-slate-800 transition-colors">
            Subscription Plans
          </Link>
          <Link href="/superadmin/entitlements" className="text-slate-500 hover:text-slate-800 transition-colors">
            Feature Entitlements
          </Link>
          <Link href="/superadmin/tenants/plan" className="text-slate-500 hover:text-slate-800 transition-colors">
            Tenant Plan Assignment
          </Link>
          <Link href="/superadmin/quotas" className="text-blue-600 border-b-2 border-blue-600 pb-3 -mb-3.5 font-bold">
            Quotas & Usage
          </Link>
          <Link href="/superadmin/seat-limits" className="text-slate-500 hover:text-slate-800 transition-colors">
            Seat Limits
          </Link>
          <Link href="/superadmin/trials" className="text-slate-500 hover:text-slate-800 transition-colors">
            Trials
          </Link>
        </div>

        {/* Breadcrumbs */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <span>SuperAdmin</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link href="/superadmin/quotas" className="hover:underline">
              Quotas
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-900 font-semibold">Alerts & Notifications</span>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Quota Alerts & Notifications</h1>
              <p className="text-xs text-slate-500">Define threshold triggers and dispatch channels for quota monitoring.</p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/superadmin/quotas"
                className="px-3 py-1.5 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Overview
              </Link>
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Alert Rule
              </button>
            </div>
          </div>
        </div>

        {/* Notifications */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-800 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <p className="font-medium">{error}</p>
          </div>
        )}
        {success && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-3 text-emerald-800 text-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <p className="font-medium">{success}</p>
          </div>
        )}

        {/* Sub-tabs: Alert Rules | Notification Settings */}
        <div className="flex items-center gap-6 border-b border-slate-200 text-xs font-semibold">
          <button
            onClick={() => setActiveSubTab('rules')}
            className={`pb-2.5 transition-colors ${
              activeSubTab === 'rules'
                ? 'text-blue-600 border-b-2 border-blue-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Alert Rules
          </button>
          <button
            onClick={() => setActiveSubTab('settings')}
            className={`pb-2.5 transition-colors ${
              activeSubTab === 'settings'
                ? 'text-blue-600 border-b-2 border-blue-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Notification Settings
          </button>
        </div>

        {/* Alert Rules Table (Screen 8) */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Rule Name</th>
                <th className="py-3 px-4">Quota Type</th>
                <th className="py-3 px-4">Threshold</th>
                <th className="py-3 px-4">Channels</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {alertRules.map((rule) => (
                <tr key={rule.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                    {rule.rule_name}
                  </td>
                  <td className="py-3.5 px-4 font-medium text-slate-700 whitespace-nowrap">
                    {rule.quota_type}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-blue-600 whitespace-nowrap">
                    {rule.threshold_percent}%
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                    {rule.channels}
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <button
                      onClick={() => handleToggleRule(rule.id)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${
                        rule.status === 'Active'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}
                    >
                      {rule.status}
                    </button>
                  </td>
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <button
                      onClick={() => handleToggleRule(rule.id)}
                      className="text-xs font-semibold text-blue-600 hover:underline"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Global Notification Settings Card (Screen 8) */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Global Notification Settings</h3>
              <p className="text-xs text-slate-500">Configure delivery preferences for operational quota notices.</p>
            </div>
            <button
              onClick={handleSaveNotifications}
              disabled={saving}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
            >
              {saving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              Save Settings
            </button>
          </div>

          <div className="space-y-4 pt-1">
            {/* Setting 1 */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-900">Send daily quota usage summary</span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Sends an aggregate PDF and email summary of platform consumption every morning at 08:00 UTC.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleToggleNotification('send_daily_summary')}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                  notificationSettings.send_daily_summary ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    notificationSettings.send_daily_summary ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Setting 2 */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <div>
                <span className="text-xs font-bold text-slate-900">Notify tenant admins</span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Sends automated alert dispatch directly to designated customer organization administrators.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleToggleNotification('notify_tenant_admins')}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                  notificationSettings.notify_tenant_admins ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    notificationSettings.notify_tenant_admins ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Setting 3 */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <div>
                <span className="text-xs font-bold text-slate-900">Notify platform users</span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Dispatches high-priority Slack and Webhook notifications to internal SecuLayer operations teams.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleToggleNotification('notify_platform_users')}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                  notificationSettings.notify_platform_users ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    notificationSettings.notify_platform_users ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Modal: Add Alert Rule */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
            <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">Add Quota Alert Rule</h3>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateRule} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Rule Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Critical Scan Overage Alert"
                    value={newRule.rule_name}
                    onChange={(e) => setNewRule({ ...newRule, rule_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Quota Type</label>
                  <select
                    value={newRule.quota_type}
                    onChange={(e) => setNewRule({ ...newRule, quota_type: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Repositories">Repositories</option>
                    <option value="Scan Minutes">Scan Minutes</option>
                    <option value="API Calls">API Calls</option>
                    <option value="Storage">Storage</option>
                    <option value="Concurrent Scans">Concurrent Scans</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Threshold Percentage (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={newRule.threshold_percent}
                    onChange={(e) => setNewRule({ ...newRule, threshold_percent: parseInt(e.target.value) || 80 })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Dispatch Channels</label>
                  <input
                    type="text"
                    required
                    value={newRule.channels}
                    onChange={(e) => setNewRule({ ...newRule, channels: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-3.5 py-1.5 border border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center gap-1.5"
                  >
                    {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    Add Rule
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </SuperAdminShell>
  );
}
