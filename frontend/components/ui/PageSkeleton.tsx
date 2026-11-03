'use client';

import React from 'react';

export function SkeletonShimmer({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`relative overflow-hidden bg-slate-100 rounded ${className}`}
      style={style}
    >
      <div
        className="absolute inset-0 -translate-x-full animate-[shimmer_1.8s_infinite]"
        style={{
          background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.7) 50%, rgba(255,255,255,0) 100%)',
        }}
      />
    </div>
  );
}

/**
 * SkeletonCard Component
 * Displays a pulsing metric card placeholder with sparkline shimmer.
 */
export function SkeletonCard({
  title = 'Metric Loading...',
  count = 1,
}: {
  title?: string;
  count?: number;
}) {
  if (count > 1) {
    return (
      <>
        {Array.from({ length: count }).map((_, idx) => (
          <SkeletonCard key={idx} title={title} count={1} />
        ))}
      </>
    );
  }

  return (
    <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <span className="text-[13px] font-semibold text-slate-800">{title}</span>
          <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
            POLLING
          </span>
        </div>

        <div className="space-y-3">
          <div className="flex items-baseline justify-between">
            <SkeletonShimmer className="w-28 h-8 rounded-lg" />
            <SkeletonShimmer className="w-14 h-5 rounded" />
          </div>
          <SkeletonShimmer className="w-40 h-3.5 rounded" />

          {/* Sparkline placeholder */}
          <div className="w-full h-14 bg-slate-50 border border-slate-100 rounded-lg p-2 flex items-end gap-1.5">
            <SkeletonShimmer className="w-full h-4 rounded" />
            <SkeletonShimmer className="w-full h-7 rounded" />
            <SkeletonShimmer className="w-full h-10 rounded" />
            <SkeletonShimmer className="w-full h-6 rounded" />
            <SkeletonShimmer className="w-full h-12 rounded" />
            <SkeletonShimmer className="w-full h-8 rounded" />
            <SkeletonShimmer className="w-full h-11 rounded" />
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-[11px] font-mono text-slate-400">
        <span>SAMPLING STREAM...</span>
        <span>SYNCHRONIZING</span>
      </div>
    </div>
  );
}

/**
 * SkeletonTable Component
 * High-density data table placeholder with column headers and 4-6 rows of shimmers.
 */
export function SkeletonTable({ rows = 4, title = 'Rehydrating Telemetry Dataset...' }: { rows?: number; title?: string }) {
  return (
    <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-slate-800">{title}</span>
          <span className="text-[10px] font-mono bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded">
            SYNCING
          </span>
        </div>
        <div className="flex items-center gap-2">
          <SkeletonShimmer className="w-20 h-6 rounded" />
          <SkeletonShimmer className="w-8 h-6 rounded" />
        </div>
      </div>

      <div className="w-full overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-mono text-slate-500">
              <th className="py-2.5 px-3">TIMESTAMP</th>
              <th className="py-2.5 px-3">TARGET</th>
              <th className="py-2.5 px-3">SEVERITY</th>
              <th className="py-2.5 px-3">MODULE</th>
              <th className="py-2.5 px-3 text-right">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {Array.from({ length: rows }).map((_, i) => (
              <tr key={i}>
                <td className="py-3 px-3">
                  <SkeletonShimmer className="w-24 h-4 rounded" />
                </td>
                <td className="py-3 px-3">
                  <SkeletonShimmer className="w-36 h-4 rounded" />
                </td>
                <td className="py-3 px-3">
                  <SkeletonShimmer className="w-16 h-4 rounded-full" />
                </td>
                <td className="py-3 px-3">
                  <SkeletonShimmer className="w-14 h-4 rounded" />
                </td>
                <td className="py-3 px-3 text-right">
                  <SkeletonShimmer className="w-8 h-4 rounded ml-auto" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] font-mono text-slate-400">
        <span>FETCHING REAL-TIME FINDINGS</span>
        <span>{rows} PLACEHOLDERS ACTIVE</span>
      </div>
    </div>
  );
}

/**
 * PageSkeleton Component
 * Full-page layout skeleton including header, metric cards, and table.
 */
export function PageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header bar skeleton */}
      <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm flex items-center justify-between">
        <div className="space-y-2">
          <SkeletonShimmer className="w-48 h-6 rounded" />
          <SkeletonShimmer className="w-80 h-4 rounded" />
        </div>
        <SkeletonShimmer className="w-32 h-9 rounded-lg" />
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <SkeletonCard title="Vulnerabilities Triaged" />
        <SkeletonCard title="Continuous Scans" />
        <SkeletonCard title="Runtime Enforcements" />
      </div>

      {/* Main Table Skeleton */}
      <SkeletonTable rows={5} />
    </div>
  );
}
