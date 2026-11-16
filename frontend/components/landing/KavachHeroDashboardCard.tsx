'use client';

import React from 'react';
import {
  Boxes,
  AlertTriangle,
  Wrench,
  ShieldCheck,
  LayoutDashboard,
  Scan,
  ShieldAlert,
  GitPullRequest,
  Network,
  Cpu,
  Lock,
} from 'lucide-react';
import { KavachLogo, KavachMark } from '@/components/common/KavachLogo';

/**
 * KavachHeroDashboardCard
 * 
 * Recreates the high-converting Security Overview dashboard preview card
 * from reference design with real metrics, downward vulnerability trendline,
 * and clean blue/neutral ambient elevation (replaces unwanted violet glow).
 */
export const KavachHeroDashboardCard: React.FC = () => {
  return (
    <div className="relative w-full max-w-[1040px] mx-auto mt-10 mb-8 select-none">
      {/* Non-violet ambient glow backdrop (refined subtle blue/slate aura) */}
      <div
        className="absolute -inset-4 sm:-inset-6 rounded-[32px] opacity-40 blur-2xl pointer-events-none transition-opacity duration-500"
        style={{
          background:
            'radial-gradient(circle at 50% 30%, rgba(37, 99, 235, 0.12), rgba(14, 165, 233, 0.08) 40%, rgba(15, 23, 42, 0.04) 70%, transparent 90%)',
        }}
        aria-hidden="true"
      />

      {/* Main Glass/White Card */}
      <div className="relative bg-white rounded-2xl sm:rounded-[24px] border border-gray-200/90 shadow-[0_12px_40px_-10px_rgba(15,23,42,0.08),0_2px_8px_rgba(0,0,0,0.02)] overflow-hidden">
        {/* Card Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-[#FCFDFE]">
          <div className="flex items-center gap-2">
            <KavachLogo size={22} showText={true} />
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Runtime Active
            </span>
            <KavachMark size={20} />
          </div>
        </div>

        {/* Dashboard Body (Left Navigation + Main Overview Area) */}
        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] min-h-[340px]">
          {/* Left Mini Sidebar */}
          <aside className="hidden md:flex flex-col gap-1 p-4 border-r border-gray-100 bg-[#FAFBFC]">
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white text-gray-900 border border-gray-200/80 shadow-xs">
              <LayoutDashboard className="w-4 h-4 text-gray-800" />
              <span>Overview</span>
            </div>
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100/60 transition-colors">
              <Scan className="w-4 h-4 text-gray-400" />
              <span>Scans</span>
            </div>
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100/60 transition-colors">
              <ShieldAlert className="w-4 h-4 text-gray-400" />
              <span>Findings</span>
            </div>
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100/60 transition-colors">
              <GitPullRequest className="w-4 h-4 text-gray-400" />
              <span>Remediation</span>
            </div>
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100/60 transition-colors">
              <Network className="w-4 h-4 text-gray-400" />
              <span>Integrations</span>
            </div>
          </aside>

          {/* Main Dashboard Canvas */}
          <div className="p-5 sm:p-6 flex flex-col justify-between bg-white">
            <div>
              {/* Heading */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight">
                  Security Overview
                </h3>
                <span className="text-[11px] font-medium text-gray-400">
                  Real-time telemetry · Production
                </span>
              </div>

              {/* 4 Quantitative Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {/* 1. Checks Run */}
                <div className="p-3.5 rounded-xl bg-gray-50/80 border border-gray-100 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-white border border-gray-200/80 flex items-center justify-center shrink-0 shadow-xs">
                    <Boxes className="w-4 h-4 text-gray-800" />
                  </div>
                  <div>
                    <div className="text-base sm:text-lg font-bold text-gray-900 leading-tight">140+</div>
                    <div className="text-[11px] text-gray-500 font-medium">Checks Run</div>
                  </div>
                </div>

                {/* 2. Findings */}
                <div className="p-3.5 rounded-xl bg-red-50/50 border border-red-100/80 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-red-100/70 border border-red-200/60 flex items-center justify-center shrink-0 text-red-600">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                  </div>
                  <div>
                    <div className="text-base sm:text-lg font-bold text-gray-900 leading-tight">12</div>
                    <div className="text-[11px] text-red-700/80 font-medium">Findings</div>
                  </div>
                </div>

                {/* 3. Auto Fixes */}
                <div className="p-3.5 rounded-xl bg-emerald-50/40 border border-emerald-100/80 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-100/70 border border-emerald-200/60 flex items-center justify-center shrink-0 text-emerald-600">
                    <Wrench className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <div className="text-base sm:text-lg font-bold text-gray-900 leading-tight">8</div>
                    <div className="text-[11px] text-emerald-700/80 font-medium">Auto Fixes</div>
                  </div>
                </div>

                {/* 4. Policy Compliant */}
                <div className="p-3.5 rounded-xl bg-emerald-50/40 border border-emerald-100/80 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-100/70 border border-emerald-200/60 flex items-center justify-center shrink-0 text-emerald-600">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <div className="text-base sm:text-lg font-bold text-gray-900 leading-tight">100%</div>
                    <div className="text-[11px] text-emerald-700/80 font-medium truncate">Policy Compliant</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Downward Trendline Chart with Badge */}
            <div className="relative pt-2 pb-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Vulnerability Velocity Reduction
                </span>
                {/* Green badge from reference image */}
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 shadow-xs">
                  <span>↓ 72%</span>
                  <span className="text-[11px] font-semibold text-emerald-600">Vulnerabilities</span>
                </span>
              </div>

              {/* Smooth Downward Curve SVG Chart (Non-violet blue/teal palette) */}
              <div className="relative w-full h-24 sm:h-28">
                <svg
                  className="w-full h-full overflow-visible"
                  viewBox="0 0 600 100"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <defs>
                    <linearGradient id="chartBlueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563EB" stopOpacity="0.14" />
                      <stop offset="100%" stopColor="#2563EB" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  {/* Fill area */}
                  <path
                    d="M 0,20 Q 80,18 160,52 T 320,68 T 460,82 T 600,88 L 600,100 L 0,100 Z"
                    fill="url(#chartBlueGradient)"
                  />
                  {/* Stroke path */}
                  <path
                    d="M 0,20 Q 80,18 160,52 T 320,68 T 460,82 T 600,88"
                    fill="none"
                    stroke="#2563EB"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Glowing end point */}
                  <circle cx="600" cy="88" r="4" fill="#2563EB" />
                  <circle cx="600" cy="88" r="8" fill="#2563EB" opacity="0.25" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Highlights Row Directly Below Card (from bottom of reference image) */}
      <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 mt-6 text-xs sm:text-sm font-semibold text-gray-700">
        <div className="flex items-center gap-2">
          <KavachMark size={16} />
          <span>AI-Powered Remediation</span>
        </div>
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Runtime Protection</span>
        </div>
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-blue-600" />
          <span>OPA Policy Governance</span>
        </div>
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-slate-700" />
          <span>Deterministic Proof Engine</span>
        </div>
      </div>
    </div>
  );
};

