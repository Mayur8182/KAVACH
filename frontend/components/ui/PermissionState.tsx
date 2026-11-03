'use client';

import React, { useState } from 'react';
import { Lock, ShieldAlert, ArrowRight, CheckCircle2, UserCheck, HelpCircle } from 'lucide-react';

export interface PermissionStateProps {
  requiredTier?: string;
  userRole?: string;
  targetResource?: string;
  missingCapability?: string;
  auditTrailId?: string;
  onRequestElevation?: (reason: string) => Promise<boolean>;
  className?: string;
}

export function PermissionState({
  requiredTier = 'SecOps Tier 3',
  userRole = 'SecOps Analyst L1',
  targetResource = 'Production Firewall Rule Revocation (Cluster ID: us-east-k8s-core)',
  missingCapability = 'CAP_SYS_ADMIN',
  auditTrailId = 'AUD-9912',
  onRequestElevation,
  className = '',
}: PermissionStateProps) {
  const [elevationRequested, setElevationRequested] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleElevation = async () => {
    setSubmitting(true);
    if (onRequestElevation) {
      await onRequestElevation(`JIT Elevation required for ${missingCapability}`);
    } else {
      await new Promise((r) => setTimeout(r, 600));
    }
    setSubmitting(false);
    setElevationRequested(true);
  };

  return (
    <div
      className={`bg-white border-2 border-slate-900 rounded-xl p-6 shadow-sm max-w-xl mx-auto flex flex-col justify-between ${className}`}
    >
      <div>
        <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Lock size={18} />
            </div>
            <div>
              <div className="text-[15px] font-bold text-slate-900 tracking-tight">
                Access Restricted — {requiredTier} Required
              </div>
              <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                AUTHORIZATION POLICY: POL-RBAC-STRICT
              </div>
            </div>
          </div>
          <span className="text-[10px] font-mono bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded font-bold">
            DENIED
          </span>
        </div>

        <div className="py-4 space-y-3">
          <p className="text-[13px] text-slate-600 leading-relaxed">
            Your current assigned role (<span className="font-semibold text-slate-900">{userRole}</span>) lacks the{' '}
            <code className="font-mono text-rose-700 bg-rose-50 px-1 py-0.5 rounded text-[12px] border border-rose-100">
              {missingCapability}
            </code>{' '}
            override capability required to execute modifications on{' '}
            <span className="font-semibold text-slate-900">{targetResource}</span>.
          </p>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-[11px] font-mono text-slate-500 flex items-center justify-between">
            <span>AUDIT TRAIL RECORDED</span>
            <span className="font-semibold text-slate-800">#{auditTrailId}</span>
          </div>

          {elevationRequested && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-emerald-800 text-[12px]">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>JIT Elevation Request #JIT-8491 submitted to Security Admin for 2-hour temporary authorization.</span>
            </div>
          )}
        </div>
      </div>

      <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
        <button
          type="button"
          onClick={() => alert('SOC Administrator contacted. An on-call engineer has been notified.')}
          className="text-[12px] font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer flex items-center gap-1"
        >
          <HelpCircle size={13} />
          <span>Contact SOC Administrator</span>
        </button>

        {!elevationRequested ? (
          <button
            type="button"
            onClick={handleElevation}
            disabled={submitting}
            className="px-4 py-2 bg-slate-900 text-white text-[12.5px] font-semibold rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-60 cursor-pointer"
          >
            <UserCheck size={14} />
            <span>{submitting ? 'Submitting...' : 'Request JIT Temporary Role Elevation'}</span>
          </button>
        ) : (
          <span className="text-[12px] font-semibold text-emerald-700">Approval Pending</span>
        )}
      </div>
    </div>
  );
}

export default PermissionState;
