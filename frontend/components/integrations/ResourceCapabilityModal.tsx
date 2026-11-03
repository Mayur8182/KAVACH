'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Shield,
  Layers,
  GitBranch,
  Lock,
  Globe,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  ExternalLink,
  Save,
} from 'lucide-react';
import type {
  ProviderCatalogItem,
  CentralResourceCapabilityItem,
  UpdateCapabilitiesPayload,
} from '@/types/api/integrations';

interface ResourceCapabilityModalProps {
  providerItem?: ProviderCatalogItem;
  provider?: ProviderCatalogItem;
  isOpen?: boolean;
  onClose: () => void;
  onFetchResources: (connectionIdOrProvider: string) => Promise<CentralResourceCapabilityItem[]>;
  onUpdateCapabilities: (payload: UpdateCapabilitiesPayload) => Promise<CentralResourceCapabilityItem>;
}

const AVAILABLE_CAPABILITIES = [
  { key: 'sast', label: 'SAST (Static Analysis)', description: 'Semgrep & custom rule AST vulnerability scanning' },
  { key: 'sca', label: 'SCA (Dependencies)', description: 'Trivy & OSV CVE vulnerability analysis for manifests' },
  { key: 'iac', label: 'IaC Security', description: 'Terraform, Dockerfile, & K8s misconfiguration analysis' },
  { key: 'secrets', label: 'Secret Detection', description: 'Gitleaks token, private key & credential leakage checks' },
  { key: 'container', label: 'Container Security', description: 'Base image vulnerability & malware inspection' },
];

export const ResourceCapabilityModal: React.FC<ResourceCapabilityModalProps> = ({
  providerItem: rawProviderItem,
  provider,
  isOpen = true,
  onClose,
  onFetchResources,
  onUpdateCapabilities,
}) => {
  const providerItem = (rawProviderItem || provider) as ProviderCatalogItem;
  const [resources, setResources] = useState<CentralResourceCapabilityItem[]>([]);
  const [selectedResource, setSelectedResource] = useState<CentralResourceCapabilityItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Active resource editable state
  const [editCaps, setEditCaps] = useState<Record<string, string>>({});
  const [editPush, setEditPush] = useState(true);
  const [editPr, setEditPr] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const data = await onFetchResources(providerItem.connection_id || providerItem.provider);
        if (!cancelled) {
          setResources(data);
          if (data.length > 0) {
            setSelectedResource(data[0]);
            setEditCaps(data[0].capabilities || {});
            setEditPush(data[0].scan_on_push);
            setEditPr(data[0].scan_on_pr);
          }
        }
      } catch (err: any) {
        console.error('Failed to load resources:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [isOpen, providerItem, onFetchResources]);

  if (!isOpen) return null;

  const handleSelectResource = (res: CentralResourceCapabilityItem) => {
    setSelectedResource(res);
    setEditCaps(res.capabilities || {});
    setEditPush(res.scan_on_push);
    setEditPr(res.scan_on_pr);
    setFeedbackMsg(null);
  };

  const toggleCapability = (capKey: string) => {
    setEditCaps((prev) => {
      const current = prev[capKey]?.toUpperCase();
      const next = current === 'ENABLED' ? 'DISABLED' : 'ENABLED';
      return { ...prev, [capKey]: next };
    });
  };

  const handleSave = async () => {
    if (!selectedResource) return;
    setSaving(true);
    setFeedbackMsg(null);

    try {
      const updated = await onUpdateCapabilities({
        resource_id: selectedResource.id,
        capabilities: editCaps,
        scan_on_push: editPush,
        scan_on_pr: editPr,
      });

      // Update in local list
      setResources((prev) =>
        prev.map((r) => (r.id === updated.id ? updated : r))
      );
      setSelectedResource(updated);
      setFeedbackMsg({ type: 'success', text: `Capabilities saved for ${updated.name}` });
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to update capabilities' });
    } finally {
      setSaving(false);
    }
  };

  const filteredResources = resources.filter((r) =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold flex items-center justify-center text-sm">
              <Layers size={18} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <span>{providerItem.name} Resources & Capability Governance</span>
                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-100 text-emerald-800">
                  {resources.length} Discovered
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Grant least-privilege security module capabilities per repository or cloud enclave
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body: Master-Detail Split */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Master List */}
          <div className="w-80 border-r border-slate-200 flex flex-col bg-slate-50/50">
            <div className="p-3 border-b border-slate-200 bg-white">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter resources..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1">
              {loading ? (
                <div className="p-8 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
                  <RefreshCw size={16} className="animate-spin text-indigo-600" />
                  Loading connected resources...
                </div>
              ) : filteredResources.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  No resources match &ldquo;{searchQuery}&rdquo;
                </div>
              ) : (
                filteredResources.map((res) => {
                  const isSelected = selectedResource?.id === res.id;
                  const enabledCount = Object.values(res.capabilities || {}).filter(
                    (v) => v.toUpperCase() === 'ENABLED'
                  ).length;

                  return (
                    <button
                      key={res.id}
                      onClick={() => handleSelectResource(res)}
                      className={`w-full text-left p-2.5 rounded-lg transition-all flex flex-col gap-1 ${
                        isSelected
                          ? 'bg-indigo-50 border border-indigo-200 shadow-xs'
                          : 'hover:bg-slate-100 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-semibold text-slate-900 truncate max-w-[170px]">
                          {res.name}
                        </span>
                        {res.private ? (
                          <Lock size={12} className="text-slate-400 shrink-0" />
                        ) : (
                          <Globe size={12} className="text-slate-400 shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span className="flex items-center gap-1">
                          <GitBranch size={10} /> {res.default_branch || 'main'}
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-200/80 text-slate-700">
                          {enabledCount} active
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Detail Pane */}
          <div className="flex-1 flex flex-col overflow-y-auto p-6 bg-white">
            {selectedResource ? (
              <div className="space-y-6">
                {/* Resource Header */}
                <div className="flex items-start justify-between pb-4 border-b border-slate-100">
                  <div>
                    <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <span>{selectedResource.full_name}</span>
                      {selectedResource.url && (
                        <a
                          href={selectedResource.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-slate-400 hover:text-indigo-600 transition-colors"
                        >
                          <ExternalLink size={14} />
                        </a>
                      )}
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Resource ID: <span className="font-mono text-slate-700">{selectedResource.external_id}</span> · Default branch:{' '}
                      <span className="font-semibold text-slate-700">{selectedResource.default_branch || 'main'}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Save size={13} />
                      {saving ? 'Saving...' : 'Apply Changes'}
                    </button>
                  </div>
                </div>

                {feedbackMsg && (
                  <div
                    className={`p-3 rounded-lg flex items-center gap-2 text-xs border ${
                      feedbackMsg.type === 'success'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-rose-50 text-rose-800 border-rose-200'
                    }`}
                  >
                    {feedbackMsg.type === 'success' ? (
                      <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle size={14} className="text-rose-600 shrink-0" />
                    )}
                    <span>{feedbackMsg.text}</span>
                  </div>
                )}

                {/* Automation Triggers */}
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    CI/CD & Git Automation Triggers
                  </h5>
                  <div className="grid grid-cols-2 gap-4">
                    <label className="flex items-center gap-2.5 text-xs text-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editPush}
                        onChange={(e) => setEditPush(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>
                        <strong>Scan on Push:</strong> Automatically inspect commits to protected branches
                      </span>
                    </label>
                    <label className="flex items-center gap-2.5 text-xs text-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editPr}
                        onChange={(e) => setEditPr(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>
                        <strong>Scan on Pull Request:</strong> Evaluate PR security gates & quality policy
                      </span>
                    </label>
                  </div>
                </div>

                {/* Capability Matrix */}
                <div className="space-y-3">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
                    <span>Authorized Security Capabilities</span>
                    <span className="text-[11px] font-normal text-slate-500">
                      Module permissions enforced by deterministic policy engine
                    </span>
                  </h5>

                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                    {AVAILABLE_CAPABILITIES.map((cap) => {
                      const isEnabled = editCaps[cap.key]?.toUpperCase() === 'ENABLED';

                      return (
                        <div
                          key={cap.key}
                          className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors"
                        >
                          <div className="space-y-0.5">
                            <span className="text-xs font-bold text-slate-900 flex items-center gap-2">
                              <Shield size={13} className={isEnabled ? 'text-indigo-600' : 'text-slate-400'} />
                              {cap.label}
                            </span>
                            <p className="text-[11px] text-slate-500">{cap.description}</p>
                          </div>

                          <button
                            type="button"
                            onClick={() => toggleCapability(cap.key)}
                            className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              isEnabled ? 'bg-indigo-600' : 'bg-slate-300'
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                isEnabled ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-xs text-slate-400">
                Select a resource on the left to configure capabilities
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
