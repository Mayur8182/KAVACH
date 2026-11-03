'use client';

import React, { useState } from 'react';
import { Lock, Key, ShieldCheck, RefreshCw, X } from 'lucide-react';

export interface SessionExpiredDialogProps {
  isOpen: boolean;
  userEmail?: string;
  onReauthenticate: (passwordOrKey: string) => Promise<{ success: boolean; error?: string }>;
  onClose?: () => void;
}

export function SessionExpiredDialog({
  isOpen,
  userEmail = 'security-engineer@kavach.corp',
  onReauthenticate,
  onClose,
}: SessionExpiredDialogProps) {
  const [credential, setCredential] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!credential) return;

    setLoading(true);
    setError(null);
    const res = await onReauthenticate(credential);
    setLoading(false);
    if (!res.success) {
      setError(res.error || 'Authentication failed. Please verify your credentials.');
    }
  };

  const handleYubikey = async () => {
    setLoading(true);
    setError(null);
    // Simulate WebAuthn/FIDO2 hardware key verification
    await new Promise((r) => setTimeout(r, 800));
    const res = await onReauthenticate('webauthn-hardware-token');
    setLoading(false);
    if (!res.success) {
      setError(res.error || 'WebAuthn hardware verification failed.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-100 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0">
              <Lock size={20} />
            </div>
            <div>
              <h3 className="text-[16px] font-bold text-slate-900 tracking-tight">Session Timed Out</h3>
              <span className="text-[11px] font-mono text-slate-500">SOC-2 & HIPAA COMPLIANCE POLICY</span>
            </div>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1 transition-colors"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Narrative & Preserved work notice */}
        <div className="p-6 pt-5 space-y-4">
          <p className="text-[13px] text-slate-600 leading-relaxed">
            Your active session as <span className="font-semibold text-slate-900">{userEmail}</span> exceeded the 15-minute idle threshold.
          </p>

          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-emerald-800 text-[12px]">
            <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
            <span>Unsaved work and active draft policies have been preserved locally in memory.</span>
          </div>

          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-[12px]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[12px] font-semibold text-slate-700 mb-1.5">
                Master Password or Security Token
              </label>
              <input
                type="password"
                value={credential}
                onChange={(e) => setCredential(e.target.value)}
                placeholder="Enter password to resume..."
                className="w-full px-3 py-2 text-[13px] border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
                autoFocus
              />
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="submit"
                disabled={loading || !credential}
                className="w-full py-2.5 bg-slate-900 text-white text-[13px] font-semibold rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-60 cursor-pointer"
              >
                {loading && <RefreshCw size={14} className="animate-spin" />}
                <span>{loading ? 'Re-Authenticating...' : 'Re-Authenticate Session'}</span>
              </button>

              <button
                type="button"
                onClick={handleYubikey}
                disabled={loading}
                className="w-full py-2 bg-slate-50 border border-slate-200 text-slate-700 text-[12px] font-semibold rounded-lg hover:bg-slate-100 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Key size={14} />
                <span>Unlock with Hardware YubiKey / WebAuthn</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default SessionExpiredDialog;
