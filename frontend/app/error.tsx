'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { RotateCcw, Home, Info, AlertTriangle } from 'lucide-react';
import { KavachLogo } from '@/components/common/KavachLogo';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    // Log exception to console
    console.error('Unhandled Server Exception (500):', error);
  }, [error]);

  const handleRetry = () => {
    setIsRetrying(true);
    try {
      reset();
    } catch {
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    } finally {
      setTimeout(() => setIsRetrying(false), 1200);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-white text-slate-900 antialiased font-sans selection:bg-rose-100 selection:text-rose-900">
      {/* Left Column: Brand, Elevated Error Card & Assistance Links */}
      <div className="w-full lg:w-1/2 min-h-screen flex flex-col justify-between p-6 sm:p-10 lg:p-14 xl:p-16 bg-white relative z-10">
        {/* Top Header: Official Brand Logo */}
        <header className="flex items-center">
          <Link
            href="/"
            className="inline-flex items-center hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-slate-400/40 rounded-lg"
            title="Kavach Home"
          >
            <KavachLogo size={28} showText={true} />
          </Link>
        </header>

        {/* Center Content Section: Elevated Card */}
        <main className="my-auto py-10 sm:py-14 w-full flex flex-col items-center">
          {/* Floating Error Card */}
          <div className="w-full max-w-[440px] bg-white border border-slate-200/90 rounded-2xl p-7 sm:p-9 shadow-[0_12px_36px_-6px_rgba(15,23,42,0.06),0_0_1px_1px_rgba(15,23,42,0.03)] text-center transition-all">
            {/* Server Error Icon with Rose Ring */}
            <div className="relative w-14 h-14 rounded-full bg-[#FFF1F2] border border-[#FFE4E6] flex items-center justify-center mx-auto mb-5 shadow-sm">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#E11D48"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="2" y="3" width="20" height="7" rx="2" />
                <rect x="2" y="14" width="20" height="7" rx="2" />
                <line x1="6" y1="6.5" x2="6.01" y2="6.5" strokeWidth="2.5" />
                <line x1="8.5" y1="6.5" x2="8.51" y2="6.5" strokeWidth="2.5" />
                <line x1="6" y1="17.5" x2="6.01" y2="17.5" strokeWidth="2.5" />
                <line x1="8.5" y1="17.5" x2="8.51" y2="17.5" strokeWidth="2.5" />
              </svg>
              {/* Alert Badge */}
              <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#E11D48] text-white flex items-center justify-center text-[10px] font-bold ring-2 ring-white shadow-sm">
                !
              </span>
            </div>

            {/* Heading */}
            <h1 className="text-2xl sm:text-[26px] font-bold tracking-tight text-slate-950 mb-2">
              500 — Server Error
            </h1>

            {/* Description */}
            <p className="text-sm text-slate-500 leading-relaxed max-w-[340px] mx-auto mb-7">
              An unexpected error occurred on our servers. The issue has been logged and our team is working to resolve it.
            </p>

            {/* Buttons (Stacked) */}
            <div className="flex flex-col gap-3 w-full">
              <button
                type="button"
                onClick={handleRetry}
                disabled={isRetrying}
                className="w-full py-3 px-4 bg-[#0B0F19] hover:bg-slate-800 active:scale-[0.99] text-white text-sm font-medium rounded-xl flex items-center justify-center gap-2.5 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900/40 disabled:opacity-75"
              >
                <RotateCcw
                  size={16}
                  className={`text-white ${isRetrying ? 'animate-spin' : ''}`}
                />
                <span>{isRetrying ? 'Retrying...' : 'Retry Operation'}</span>
              </button>

              <Link
                href="/"
                className="w-full py-3 px-4 bg-white hover:bg-slate-50 active:scale-[0.99] border border-slate-200 text-slate-700 text-sm font-medium rounded-xl flex items-center justify-center gap-2.5 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
              >
                <Home size={16} className="text-slate-600" />
                <span>Go to Dashboard</span>
              </Link>
            </div>
          </div>

          {/* Assistance Footer Links */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-400">
            <Info size={13} className="text-slate-400" />
            <span>Need assistance?</span>
            <Link
              href="/contact"
              className="text-slate-800 hover:text-slate-950 font-medium transition-colors hover:underline underline-offset-4"
            >
              Contact Security Desk
            </Link>
            <span className="text-slate-300">•</span>
            <Link
              href="/docs"
              className="text-slate-500 hover:text-slate-900 transition-colors hover:underline underline-offset-4"
            >
              Documentation
            </Link>
          </div>
        </main>

        {/* Bottom subtle copyright / status */}
        <footer className="text-[11px] text-slate-400 tracking-wide">
          <span>Kavach Autonomous Zero-Trust Security Control Plane</span>
        </footer>
      </div>

      {/* Right Column: 3D Isometric Illustration on Soft Warm Beige Canvas */}
      <div className="w-full lg:w-1/2 min-h-[360px] lg:min-h-screen bg-[#FBF6F2] flex items-center justify-center p-8 lg:p-14 relative overflow-hidden border-t lg:border-t-0 lg:border-l border-amber-100/40">
        <div className="relative max-w-lg w-full flex items-center justify-center">
          <img
            src="/images/error-500-illustration.png"
            alt="500 Server Error Illustration"
            className="w-full max-w-[460px] xl:max-w-[500px] h-auto object-contain select-none pointer-events-none drop-shadow-sm transition-transform duration-500 hover:scale-[1.02]"
            loading="eager"
            decoding="async"
          />
        </div>
      </div>
    </div>
  );
}
