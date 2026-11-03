'use client';

import React, { useState } from 'react';
import { X, Lock, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck, KeyRound } from 'lucide-react';
import type { ProviderCatalogItem, CentralConnectPayload } from '@/types/api/integrations';

interface ConnectProviderModalProps {
  providerItem?: ProviderCatalogItem;
  provider?: ProviderCatalogItem;
  isOpen?: boolean;
  onClose: () => void;
  onSuccess?: (updated: ProviderCatalogItem) => void;
  onConnect?: (payload: CentralConnectPayload) => Promise<ProviderCatalogItem>;
  onConnectApi?: (payload: CentralConnectPayload) => Promise<ProviderCatalogItem>;
}

export const ConnectProviderModal: React.FC<ConnectProviderModalProps> = ({
  providerItem: propProviderItem,
  provider: propProvider,
  isOpen = true,
  onClose,
  onSuccess,
  onConnect,
  onConnectApi,
}) => {
  const providerItem = propProviderItem || propProvider!;
  const connectFn = onConnectApi || onConnect;
  const [formData, setFormData] = useState<Record<string, string>>({
    account_name: providerItem?.account_name || '',
    organization_name: providerItem?.organization_name || '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleChange = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    if (errorMsg) setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const payload: CentralConnectPayload = {
        provider: providerItem.provider,
        account_name: formData.account_name || formData.org || formData.account || undefined,
        organization_name: formData.organization_name || formData.org || undefined,
        token: formData.token || formData.api_key || undefined,
        role_arn: formData.role_arn || undefined,
        external_id: formData.external_id || undefined,
        client_id: formData.client_id || undefined,
        client_secret: formData.client_secret || undefined,
        tenant_id: formData.tenant_id || undefined,
        project_id: formData.project_id || undefined,
        instance_url: formData.url || formData.jenkins_url || undefined,
        webhook_url: formData.webhook_url || undefined,
        channel: formData.channel || undefined,
        jira_domain: formData.jira_domain || undefined,
        user_email: formData.user_email || undefined,
      };

      if (connectFn) {
        const result = await connectFn(payload);
        if (onSuccess) onSuccess(result);
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to authenticate and link provider. Please check credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 shadow-sm flex items-center justify-center font-bold text-slate-800 text-sm">
              {providerItem.name.charAt(0)}
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Connect {providerItem.name}
              </h3>
              <p className="text-xs text-slate-500">{providerItem.category_label}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            {providerItem.description} Connecting once grants authorized workspace modules access to inspect and secure resources.
          </p>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-700">
              <AlertCircle size={15} className="mt-0.5 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="space-y-3.5">
            {providerItem.config_fields.map((field) => (
              <div key={field.key} className="space-y-1">
                <label className="block text-xs font-medium text-slate-700">
                  {field.label}
                </label>
                <div className="relative">
                  <input
                    type={field.type === 'password' ? 'password' : 'text'}
                    value={formData[field.key] || ''}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    required={field.key.includes('token') || field.key.includes('arn') || field.key.includes('org')}
                    className="w-full px-3 py-2 text-xs text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all font-mono placeholder:font-sans placeholder:text-slate-400"
                  />
                  {field.type === 'password' && (
                    <KeyRound size={14} className="absolute right-3 top-2.5 text-slate-400" />
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1 text-emerald-700">
              <ShieldCheck size={14} /> Encrypted at rest (AES-256)
            </span>
            <span>Zero plaintext token exposure</span>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? (
                <>Authenticating...</>
              ) : (
                <>
                  Connect & Synchronize <ArrowRight size={14} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
