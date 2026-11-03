'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, Trash2, X, ShieldAlert } from 'lucide-react';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  severity?: 'critical' | 'warning' | 'info';
  requiresConfirmationWord?: string;
  undoSeconds?: number;
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title = 'Confirm Destructive Operation',
  description = 'This operation cannot be automatically reversed. Please verify your intent.',
  confirmLabel = 'Confirm Action',
  cancelLabel = 'Cancel',
  severity = 'critical',
  requiresConfirmationWord,
  undoSeconds,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [typedWord, setTypedWord] = useState('');
  const [loading, setLoading] = useState(false);
  const [undoCountdown, setUndoCountdown] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTypedWord('');
      setLoading(false);
      setUndoCountdown(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const canConfirm = !requiresConfirmationWord || typedWord.trim().toUpperCase() === requiresConfirmationWord.toUpperCase();

  const handleExecute = async () => {
    if (!canConfirm || loading) return;

    if (undoSeconds && undoSeconds > 0 && undoCountdown === null) {
      setUndoCountdown(undoSeconds);
      return;
    }

    setLoading(true);
    await onConfirm();
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-6 pb-4 border-b border-slate-100 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                severity === 'critical'
                  ? 'bg-rose-50 text-rose-600 border-rose-200'
                  : 'bg-amber-50 text-amber-600 border-amber-200'
              }`}
            >
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3 className="text-[16px] font-bold text-slate-900 tracking-tight">{title}</h3>
              <span className="text-[10px] font-mono text-slate-400">SOC GOVERNANCE GATE</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600 p-1 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 pt-5 space-y-4">
          <p className="text-[13px] text-slate-600 leading-relaxed">{description}</p>

          {requiresConfirmationWord && (
            <div>
              <label className="block text-[12px] font-semibold text-slate-700 mb-1.5">
                Type <span className="font-mono text-rose-600 font-bold">{requiresConfirmationWord}</span> to proceed:
              </label>
              <input
                type="text"
                value={typedWord}
                onChange={(e) => setTypedWord(e.target.value)}
                placeholder={requiresConfirmationWord}
                className="w-full px-3 py-2 text-[13px] font-mono border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900 uppercase"
              />
            </div>
          )}

          {undoCountdown !== null && undoCountdown > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between text-amber-800 text-[12px]">
              <span>Action executing in {undoCountdown} seconds...</span>
              <button
                type="button"
                onClick={() => setUndoCountdown(null)}
                className="font-bold underline cursor-pointer"
              >
                Undo
              </button>
            </div>
          )}
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-[12.5px] font-semibold rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            onClick={handleExecute}
            disabled={!canConfirm || loading}
            className={`px-4 py-2 text-white text-[12.5px] font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer ${
              severity === 'critical' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-slate-900 hover:bg-slate-800'
            }`}
          >
            <Trash2 size={13} />
            <span>{loading ? 'Executing...' : confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
