'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  Bell,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  Database,
  ExternalLink,
  Eye,
  Filter,
  Globe,
  Key,
  Layers,
  Lock,
  Play,
  Plus,
  RefreshCw,
  Send,
  Server,
  Settings,
  Shield,
  Trash2,
  Webhook,
  Zap,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { IntegrationHealthBadge } from '@/components/integrations/IntegrationHealthBadge';

type TabType =
  | 'Overview'
  | 'Resources'
  | 'Events & Triggers'
  | 'Notifications'
  | 'Delivery Logs'
  | 'Permissions'
  | 'Settings';

export default function IntegrationDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const provider = (params?.provider as string) || 'github';

  const [activeTab, setActiveTab] = useState<TabType>('Overview');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [rules, setRules] = useState<any[]>([]);
  const [deadLetters, setDeadLetters] = useState<any[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Notifications form state
  const [slackWebhook, setSlackWebhook] = useState('');
  const [slackChannel, setSlackChannel] = useState('#security-alerts');
  const [isTestingSlack, setIsTestingSlack] = useState(false);
  const [teamsWebhook, setTeamsWebhook] = useState('');
  const [isTestingTeams, setIsTestingTeams] = useState(false);

  // New Rule Modal
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleEvent, setNewRuleEvent] = useState('repository.push');
  const [newRuleBranch, setNewRuleBranch] = useState('main');
  const [newRuleAction, setNewRuleAction] = useState('trigger_scan');

  // Payload viewer modal
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadDetails = async () => {
    try {
      setLoading(true);
      const res = await api.integrations.getProviderDetails(provider);
      setData(res);
      if (res?.notifications) {
        setSlackWebhook(res.notifications.slack_webhook_url || '');
        setSlackChannel(res.notifications.slack_channel || '#security-alerts');
        setTeamsWebhook(res.notifications.teams_webhook_url || '');
      }

      // Load automation rules
      const r = await api.integrations.listRules();
      setRules(r || []);

      // Load dead letters
      const dlq = await api.integrations.listDeadLetters();
      setDeadLetters(dlq || []);
    } catch (err: any) {
      console.error('Failed loading provider details:', err);
      showToast('Error loading provider details from backend');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetails();
  }, [provider]);

  const handleTestSlack = async () => {
    setIsTestingSlack(true);
    try {
      const res = await api.integrations.testSlack({
        webhook_url: slackWebhook || undefined,
        channel: slackChannel,
      });
      if (res.success) {
        showToast('✅ Slack Block Kit alert sent successfully to ' + (slackChannel || 'channel'));
      } else {
        showToast('❌ Slack delivery failed: ' + (res.error || 'Check webhook URL'));
      }
    } catch (err: any) {
      showToast('❌ Slack test failed: ' + (err.message || 'Error'));
    } finally {
      setIsTestingSlack(false);
    }
  };

  const handleTestTeams = async () => {
    if (!teamsWebhook) {
      showToast('Please provide a Microsoft Teams webhook URL');
      return;
    }
    setIsTestingTeams(true);
    try {
      const res = await api.integrations.testTeams({ webhook_url: teamsWebhook });
      if (res.success) {
        showToast('✅ Teams Adaptive Card sent successfully');
      } else {
        showToast('❌ Teams delivery failed: ' + (res.error || 'Check webhook URL'));
      }
    } catch (err: any) {
      showToast('❌ Teams test failed: ' + (err.message || 'Error'));
    } finally {
      setIsTestingTeams(false);
    }
  };

  const handleCreateRule = async () => {
    if (!newRuleName.trim()) {
      showToast('Please enter a rule name');
      return;
    }
    try {
      await api.integrations.createRule({
        name: newRuleName,
        event_trigger: newRuleEvent,
        conditions: { branches: [newRuleBranch] },
        actions: [{ type: newRuleAction, scanners: ['SAST', 'SCA', 'SECRETS'] }],
      });
      showToast('✅ Automation rule created successfully');
      setIsRuleModalOpen(false);
      setNewRuleName('');
      const r = await api.integrations.listRules();
      setRules(r || []);
    } catch (err: any) {
      showToast('Failed creating rule: ' + err.message);
    }
  };

  const handleToggleRule = async (ruleId: string, currentStatus: boolean) => {
    try {
      await api.integrations.toggleRule(ruleId, !currentStatus);
      showToast(`Rule ${!currentStatus ? 'enabled' : 'disabled'}`);
      const r = await api.integrations.listRules();
      setRules(r || []);
    } catch (err: any) {
      showToast('Failed toggling rule');
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this automation rule?')) return;
    try {
      await api.integrations.deleteRule(ruleId);
      showToast('Rule deleted');
      const r = await api.integrations.listRules();
      setRules(r || []);
    } catch (err: any) {
      showToast('Failed deleting rule');
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`Copied ${label} to clipboard`);
  };

  const overview = data?.overview || {};
  const resources = data?.resources || [];
  const events = data?.events || [];
  const deliveryLogs = data?.delivery_logs || [];
  const permissions = data?.permissions || {};
  const settings = data?.settings || {};

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs px-4 py-3 rounded-lg shadow-xl flex items-center gap-2 border border-slate-700 animate-in slide-in-from-bottom duration-200">
          <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Breadcrumb & Top Bar */}
      <div className="border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
            <Link href="/integrations" className="hover:text-slate-900 flex items-center gap-1">
              <ArrowLeft size={13} />
              Integrations Registry
            </Link>
            <ChevronRight size={12} className="text-slate-400" />
            <span className="font-semibold text-slate-900 capitalize">{overview.display_name || provider}</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-lg shadow-xs">
                {overview.display_name?.charAt(0) || provider.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                    {overview.display_name || provider.toUpperCase()}
                  </h1>
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                    {overview.category || 'Developer Tools'}
                  </span>
                  <IntegrationHealthBadge status={overview.status || 'CONNECTED'} health={overview.health || 'HEALTHY'} />
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                  <span>
                    Account: <strong className="text-slate-700">{overview.account_name}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Last Synced: <strong className="text-slate-700">{overview.last_synced_at}</strong>
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={loadDetails}
                disabled={loading}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs flex items-center gap-1.5"
              >
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                Refresh State
              </button>
              <button
                onClick={() => setActiveTab('Events & Triggers')}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs flex items-center gap-1.5"
              >
                <Zap size={13} />
                Configure Triggers
              </button>
            </div>
          </div>

          {/* 7 Tabs Navigation (Mobbin/Google Stitch Pattern) */}
          <div className="flex items-center gap-1 mt-6 border-b border-slate-200 overflow-x-auto">
            {(
              [
                'Overview',
                'Resources',
                'Events & Triggers',
                'Notifications',
                'Delivery Logs',
                'Permissions',
                'Settings',
              ] as TabType[]
            ).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  activeTab === tab
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                {tab === 'Overview' && <Layers size={13} />}
                {tab === 'Resources' && <Database size={13} />}
                {tab === 'Events & Triggers' && <Zap size={13} />}
                {tab === 'Notifications' && <Bell size={13} />}
                {tab === 'Delivery Logs' && <Webhook size={13} />}
                {tab === 'Permissions' && <Lock size={13} />}
                {tab === 'Settings' && <Settings size={13} />}
                {tab}
                {tab === 'Resources' && resources.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-600">
                    {resources.length}
                  </span>
                )}
                {tab === 'Delivery Logs' && deadLetters.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-rose-100 text-rose-700 font-bold">
                    {deadLetters.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {loading ? (
          <div className="p-16 text-center text-xs text-slate-500 flex flex-col items-center gap-3">
            <RefreshCw size={22} className="animate-spin text-blue-600" />
            <span>Loading integration state from backend...</span>
          </div>
        ) : (
          <>
            {/* 1. OVERVIEW TAB */}
            {activeTab === 'Overview' && (
              <div className="space-y-6">
                {/* Metric Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
                    <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                      Managed Assets
                    </div>
                    <div className="text-xl font-bold text-slate-900 mt-1 flex items-baseline gap-2">
                      <span>{overview.resources_count}</span>
                      <span className="text-xs font-normal text-slate-500">authorized</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
                    <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                      Continuous Scanning
                    </div>
                    <div className="text-xl font-bold text-emerald-600 mt-1 flex items-baseline gap-2">
                      <span>ACTIVE</span>
                      <span className="text-xs font-normal text-slate-500">on push & PR</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
                    <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                      Automation Rules
                    </div>
                    <div className="text-xl font-bold text-slate-900 mt-1 flex items-baseline gap-2">
                      <span>{rules.length}</span>
                      <span className="text-xs font-normal text-slate-500">configured</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
                    <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                      Telemetry Latency
                    </div>
                    <div className="text-xl font-bold text-slate-900 mt-1 flex items-baseline gap-2">
                      <span>42ms</span>
                      <span className="text-xs font-normal text-emerald-600 font-semibold">Healthy</span>
                    </div>
                  </div>
                </div>

                {/* Subsystems Participation Matrix */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5">
                  <h3 className="text-sm font-bold text-slate-900 mb-1">
                    Platform Security Subsystems Participation
                  </h3>
                  <p className="text-xs text-slate-500 mb-4">
                    Authorized integrations automatically feed telemetry and security gating across all core platform modules.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 flex items-start gap-3">
                      <Shield size={18} className="text-blue-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-bold text-slate-900">Code Security (SAST & SCA)</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Semgrep AST and Trivy lockfile analysis on push & pull requests.
                        </div>
                        <span className="inline-block mt-2 px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 rounded border border-emerald-200">
                          Active & Enforced
                        </span>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 flex items-start gap-3">
                      <Zap size={18} className="text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-bold text-slate-900">Real-Time Alerts</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Instant Block Kit notifications dispatched to Slack and configured webhooks.
                        </div>
                        <span className="inline-block mt-2 px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 rounded border border-emerald-200">
                          Connected
                        </span>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 flex items-start gap-3">
                      <Lock size={18} className="text-indigo-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-bold text-slate-900">Governance & Policies</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Deterministic OPA evaluation block-listing high-risk commits before merge.
                        </div>
                        <span className="inline-block mt-2 px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 rounded border border-emerald-200">
                          Deterministic
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Events Snippet */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Recent Inbound Webhook Activity
                    </h3>
                    <button
                      onClick={() => setActiveTab('Events & Triggers')}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                    >
                      View all ({events.length})
                    </button>
                  </div>
                  {events.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500">
                      No events received yet. Push a commit or create a PR to trigger scanning.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {events.slice(0, 5).map((ev: any) => (
                        <div key={ev.id} className="px-5 py-3 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-3">
                            <span className="w-2 h-2 rounded-full bg-blue-600" />
                            <div>
                              <strong className="text-slate-800 font-mono">{ev.event_type}</strong>
                              <span className="text-slate-500 ml-2">{ev.payload_reference}</span>
                            </div>
                          </div>
                          <span className="text-slate-400 text-[11px]">{ev.received_at}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 2. RESOURCES TAB */}
            {activeTab === 'Resources' && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                <div className="p-5 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Synchronized Repositories & Assets</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Fine-tune autonomous scanning capabilities per repository or cloud resource.
                    </p>
                  </div>
                  <span className="text-xs font-medium text-slate-600 bg-slate-100 px-3 py-1 rounded-lg">
                    {resources.length} Total
                  </span>
                </div>

                {resources.length === 0 ? (
                  <div className="p-12 text-center text-xs text-slate-500">
                    No resources discovered yet. Click "Refresh State" to fetch repositories.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-700">
                      <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                        <tr>
                          <th className="py-3 px-4">Resource Name</th>
                          <th className="py-3 px-4">Default Branch</th>
                          <th className="py-3 px-4">Capabilities Active</th>
                          <th className="py-3 px-4">Last Scanned</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {resources.map((r: any) => (
                          <tr key={r.resource_id} className="hover:bg-slate-50/60">
                            <td className="py-3 px-4">
                              <div className="font-semibold text-slate-900">{r.resource_name}</div>
                              <div className="text-[11px] text-slate-400 font-mono truncate max-w-xs">
                                {r.external_id}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-100 text-slate-700">
                                {r.default_branch || 'main'}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {r.capabilities?.map((cap: any) => (
                                  <span
                                    key={cap.module}
                                    className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                                      cap.enabled
                                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                                        : 'bg-slate-50 text-slate-400 border-slate-200'
                                    }`}
                                  >
                                    {cap.module}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-slate-500">
                              {r.last_scan_at ? r.last_scan_at : 'Never Scanned'}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <Link
                                href={`/code/repositories/${r.resource_id}?tab=Overview`}
                                className="px-3 py-1 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors inline-flex items-center gap-1"
                              >
                                Inspect
                                <ExternalLink size={12} />
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* 3. EVENTS & TRIGGERS TAB */}
            {activeTab === 'Events & Triggers' && (
              <div className="space-y-6">
                {/* Webhook Endpoint & Secret Card */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Inbound Webhook Configuration</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Configure this webhook URL in {overview.display_name || provider} to receive automatic push and pull request events.
                      </p>
                    </div>
                    <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      HMAC-SHA256 Enforced
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                        Webhook Ingress URL
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={settings.webhook_ingress_url || ''}
                          className="w-full px-3 py-1.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                        />
                        <button
                          onClick={() => handleCopy(settings.webhook_ingress_url || '', 'Webhook URL')}
                          className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600"
                        >
                          <Copy size={13} />
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                        Signing Secret (HMAC)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="password"
                          readOnly
                          value={settings.signing_secret || '••••••••••••••••••••••••'}
                          className="w-full px-3 py-1.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                        />
                        <button
                          onClick={() => handleCopy(settings.signing_secret || '', 'Signing Secret')}
                          className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600"
                        >
                          <Copy size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Automation Rules (WHEN-THEN Engine) */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                  <div className="p-5 border-b border-slate-200 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Event Automation Rules</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Define automated security policies: WHEN an event occurs, THEN execute configured scans and alerts.
                      </p>
                    </div>
                    <button
                      onClick={() => setIsRuleModalOpen(true)}
                      className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs flex items-center gap-1.5"
                    >
                      <Plus size={13} />
                      Add Rule
                    </button>
                  </div>

                  {rules.length === 0 ? (
                    <div className="p-12 text-center text-xs text-slate-500">
                      No custom automation rules defined. Click "Add Rule" to create your first WHEN-THEN workflow.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {rules.map((rule) => (
                        <div key={rule.id} className="p-5 flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-slate-900">{rule.name}</span>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                  rule.is_enabled
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-slate-100 text-slate-500'
                                }`}
                              >
                                {rule.is_enabled ? 'ENABLED' : 'PAUSED'}
                              </span>
                            </div>
                            <div className="text-xs text-slate-600 mt-1 flex items-center gap-2">
                              <span>WHEN <code>{rule.event_trigger}</code></span>
                              <span>→</span>
                              <span>
                                THEN execute{' '}
                                <strong className="text-slate-800">
                                  {rule.actions?.map((a: any) => a.type).join(', ') || 'Security Pipeline'}
                                </strong>
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 mt-1">
                              Executed {rule.execution_count} times • Last run {rule.last_executed_at}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleToggleRule(rule.id, rule.is_enabled)}
                              className="px-3 py-1 text-xs font-medium border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700"
                            >
                              {rule.is_enabled ? 'Disable' : 'Enable'}
                            </button>
                            <button
                              onClick={() => handleDeleteRule(rule.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 4. NOTIFICATIONS TAB */}
            {activeTab === 'Notifications' && (
              <div className="space-y-6">
                {/* Slack Section */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <span>Slack Integration (Interactive Block Kit)</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Broadcasts live vulnerability alerts and scan summaries directly into your team channels.
                      </p>
                    </div>
                    <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                      Block Kit Enabled
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                        Slack Incoming Webhook URL
                      </label>
                      <input
                        type="password"
                        placeholder="https://hooks.slack.com/services/T.../B.../..."
                        value={slackWebhook}
                        onChange={(e) => setSlackWebhook(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                        Channel Name
                      </label>
                      <input
                        type="text"
                        placeholder="#security-alerts"
                        value={slackChannel}
                        onChange={(e) => setSlackChannel(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      Sends real findings summary with interactive inspection button.
                    </span>
                    <button
                      onClick={handleTestSlack}
                      disabled={isTestingSlack}
                      className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs flex items-center gap-1.5"
                    >
                      <Send size={12} className={isTestingSlack ? 'animate-spin' : ''} />
                      {isTestingSlack ? 'Dispatching...' : 'Send Test Notification'}
                    </button>
                  </div>
                </div>

                {/* Microsoft Teams Section */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Microsoft Teams (Adaptive Cards)</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Delivers structured connector cards for critical findings and scan failures.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                      Teams Webhook URL
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="password"
                        placeholder="https://outlook.office.com/webhook/..."
                        value={teamsWebhook}
                        onChange={(e) => setTeamsWebhook(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                      <button
                        onClick={handleTestTeams}
                        disabled={isTestingTeams}
                        className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shrink-0 flex items-center gap-1.5"
                      >
                        <Send size={12} />
                        Test Teams
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 5. DELIVERY LOGS TAB */}
            {activeTab === 'Delivery Logs' && (
              <div className="space-y-6">
                {/* Dead Letter Alert if any */}
                {deadLetters.length > 0 && (
                  <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3">
                    <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold text-rose-900">
                        {deadLetters.length} Unprocessed Events in Dead-Letter Queue (DLQ)
                      </div>
                      <div className="text-xs text-rose-700 mt-0.5">
                        These events failed signature verification or encountered unexpected payloads.
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                  <div className="p-5 border-b border-slate-200 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Live Delivery & Ingress Audit Trail</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Immutable audit logs of all HTTP deliveries, latency, and status codes.
                      </p>
                    </div>
                    <span className="text-xs font-medium text-slate-600 bg-slate-100 px-3 py-1 rounded-lg">
                      {deliveryLogs.length} Records
                    </span>
                  </div>

                  {deliveryLogs.length === 0 ? (
                    <div className="p-12 text-center text-xs text-slate-500">
                      No webhook deliveries recorded yet.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-slate-700">
                        <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                          <tr>
                            <th className="py-3 px-4">Event Type</th>
                            <th className="py-3 px-4">HTTP Status</th>
                            <th className="py-3 px-4">Latency</th>
                            <th className="py-3 px-4">Timestamp</th>
                            <th className="py-3 px-4 text-right">Payload</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {deliveryLogs.map((log: any) => (
                            <tr key={log.id} className="hover:bg-slate-50/60">
                              <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                                {log.event_type}
                              </td>
                              <td className="py-3 px-4">
                                <span
                                  className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold ${
                                    log.success
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                                  }`}
                                >
                                  {log.status_code || (log.success ? '200 OK' : 'FAILED')}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-slate-500 font-mono">
                                {log.latency_ms}ms
                              </td>
                              <td className="py-3 px-4 text-slate-500">{log.created_at}</td>
                              <td className="py-3 px-4 text-right">
                                <button
                                  onClick={() => setSelectedLog(log)}
                                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
                                >
                                  <Eye size={12} />
                                  Inspect
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 6. PERMISSIONS TAB */}
            {activeTab === 'Permissions' && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Security & Scopes Boundary</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tenant isolation and authorized scopes granted to Kavach.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                    <div className="text-xs font-bold text-slate-900 mb-2">Granted Scopes</div>
                    <div className="flex flex-wrap gap-2">
                      {(permissions.authorized_scopes || ['repo', 'read:user', 'security_events']).map(
                        (scope: string) => (
                          <span
                            key={scope}
                            className="px-2.5 py-1 rounded text-xs font-mono bg-white border border-slate-200 text-slate-800"
                          >
                            {scope}
                          </span>
                        )
                      )}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                    <div className="text-xs font-bold text-slate-900 mb-2">Tenant Isolation</div>
                    <div className="text-xs text-slate-600 space-y-1">
                      <div>
                        • <strong>Access Model:</strong> {permissions.access_type || 'OAuth 2.0'}
                      </div>
                      <div>
                        • <strong>Isolation:</strong> {permissions.tenant_isolation || 'Strict Organization Level'}
                      </div>
                      <div>
                        • <strong>Secret Storage:</strong> Encrypted at rest (AES-256-GCM)
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 7. SETTINGS TAB */}
            {activeTab === 'Settings' && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Provider Connection Settings</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Manage synchronization frequencies, tokens, or disconnect this integration.
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-900">Disconnect Integration</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Revokes access tokens and terminates automated scanning for this provider.
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      if (!confirm(`Are you sure you want to disconnect ${overview.display_name || provider}?`))
                        return;
                      await api.integrations.disconnectCentral(provider);
                      showToast(`${overview.display_name || provider} disconnected`);
                      router.push('/integrations');
                    }}
                    className="px-4 py-2 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors"
                  >
                    Disconnect Provider
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* CREATE AUTOMATION RULE MODAL */}
      {isRuleModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6">
            <h3 className="text-base font-bold text-slate-900">Create Automation Rule</h3>
            <p className="text-xs text-slate-500 mt-1">
              Automate security scans and alerts whenever an event occurs.
            </p>

            <div className="space-y-4 mt-5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Rule Name</label>
                <input
                  type="text"
                  placeholder="e.g. Scan Main Branch & Notify Slack"
                  value={newRuleName}
                  onChange={(e) => setNewRuleName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">WHEN Event Occurs</label>
                <select
                  value={newRuleEvent}
                  onChange={(e) => setNewRuleEvent(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="repository.push">Commit Pushed (repository.push)</option>
                  <option value="repository.pull_request.opened">Pull Request Opened</option>
                  <option value="scan.completed">Security Scan Completed</option>
                  <option value="finding.new">New Critical Vulnerability Detected</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">AND Branch Matches</label>
                <input
                  type="text"
                  placeholder="main"
                  value={newRuleBranch}
                  onChange={(e) => setNewRuleBranch(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">THEN Execute Action</label>
                <select
                  value={newRuleAction}
                  onChange={(e) => setNewRuleAction(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="trigger_scan">Run Security Scanners (SAST + SCA + Secrets)</option>
                  <option value="notify_slack">Send Alert to Slack Channel</option>
                  <option value="create_jira_issue">Create Jira Ticket</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-slate-100">
              <button
                onClick={() => setIsRuleModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateRule}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs"
              >
                Save Rule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PAYLOAD INSPECTOR MODAL */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Delivery Payload Inspector</h3>
                <span className="text-[11px] text-slate-500 font-mono">{selectedLog.id}</span>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                ×
              </button>
            </div>

            <div className="overflow-y-auto py-4 space-y-3 text-xs flex-1">
              <div>
                <div className="font-semibold text-slate-700 mb-1">Status Code & Latency</div>
                <div className="font-mono text-slate-800">
                  {selectedLog.status_code || 200} OK • {selectedLog.latency_ms}ms
                </div>
              </div>

              <div>
                <div className="font-semibold text-slate-700 mb-1">Payload Content</div>
                <pre className="p-3 bg-slate-900 text-slate-100 rounded-lg font-mono text-[11px] overflow-x-auto whitespace-pre-wrap">
                  {selectedLog.payload_snippet || 'No payload body'}
                </pre>
              </div>

              {selectedLog.error && (
                <div>
                  <div className="font-semibold text-rose-700 mb-1">Error Message</div>
                  <pre className="p-3 bg-rose-50 text-rose-800 rounded-lg font-mono text-[11px]">
                    {selectedLog.error}
                  </pre>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
