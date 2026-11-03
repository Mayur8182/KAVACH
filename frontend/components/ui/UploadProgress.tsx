'use client';

import React from 'react';
import { UploadCloud, CheckCircle2, AlertCircle, X, FileCode } from 'lucide-react';

export interface UploadProgressProps {
  fileName: string;
  fileSizeMb?: number;
  uploadedBytes?: number;
  totalBytes?: number;
  status: 'UPLOADING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  errorMessage?: string;
  onCancel?: () => void;
  className?: string;
}

export function UploadProgress({
  fileName,
  fileSizeMb = 4.2,
  uploadedBytes = 3145728,
  totalBytes = 4404019,
  status,
  errorMessage,
  onCancel,
  className = '',
}: UploadProgressProps) {
  const percent = Math.min(100, Math.round((uploadedBytes / (totalBytes || 1)) * 100));

  return (
    <div className={`bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-2.5 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5 truncate">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
            <FileCode size={16} />
          </div>
          <div className="truncate">
            <div className="text-[13px] font-semibold text-slate-900 truncate">{fileName}</div>
            <div className="text-[11px] font-mono text-slate-400">
              {(uploadedBytes / (1024 * 1024)).toFixed(1)} MB of {(totalBytes / (1024 * 1024)).toFixed(1)} MB
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {status === 'COMPLETED' ? (
            <span className="text-emerald-600 font-mono text-[11px] font-bold flex items-center gap-1">
              <CheckCircle2 size={13} /> 100%
            </span>
          ) : status === 'FAILED' ? (
            <span className="text-rose-600 font-mono text-[11px] font-bold flex items-center gap-1">
              <AlertCircle size={13} /> FAILED
            </span>
          ) : (
            <span className="text-blue-600 font-mono text-[11px] font-bold">{percent}%</span>
          )}

          {onCancel && status !== 'COMPLETED' && (
            <button
              type="button"
              onClick={onCancel}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-1.5 rounded-full transition-all duration-200 ${
            status === 'FAILED'
              ? 'bg-rose-500'
              : status === 'COMPLETED'
              ? 'bg-emerald-500'
              : 'bg-blue-600'
          }`}
          style={{ width: `${status === 'FAILED' ? 100 : percent}%` }}
        />
      </div>

      {errorMessage && (
        <div className="text-[11px] text-rose-600 font-mono">{errorMessage}</div>
      )}
    </div>
  );
}

export default UploadProgress;
