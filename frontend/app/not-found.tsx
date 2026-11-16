'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Home, ArrowLeft, Headphones, Info } from 'lucide-react';
import { KavachLogo } from '@/components/common/KavachLogo';

export default function NotFound() {
  const router = useRouter();

  const handleGoBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/');
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-white text-slate-900 antialiased font-sans selection:bg-rose-100 selection:text-rose-900">
      {/* Left Column: Brand, Status Badge, Content & Controls */}
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

        {/* Center Content Section */}
        <main className="my-auto py-10 sm:py-14 max-w-lg w-full">
          {/* Status Pill Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFF1F2] border border-[#FFE4E6] text-[#E11D48] text-xs font-semibold tracking-wide uppercase shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[#E11D48] animate-pulse" />
            <span>HTTP 404 — Not Found</span>
          </div>

          {/* Heading */}
          <h1 className="text-3xl sm:text-4xl lg:text-[40px] font-bold tracking-tight text-slate-950 mt-5 mb-3.5 leading-tight">
            404 — Page Not Found
          </h1>

          {/* Subtitle Description */}
          <p className="text-sm sm:text-base text-slate-500 leading-relaxed max-w-md mb-8">
            The page you&apos;re looking for doesn&apos;t exist or may have been moved. Please check the URL or return to your workspace.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3.5">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#0B0F19] hover:bg-slate-800 active:scale-[0.99] text-white text-sm font-medium rounded-xl transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900/40"
            >
              <Home size={16} className="text-white" />
              <span>Go to Dashboard</span>
            </Link>

            <button
              type="button"
              onClick={handleGoBack}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white hover:bg-slate-50 active:scale-[0.99] border border-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
            >
              <ArrowLeft size={16} className="text-slate-600" />
              <span>Go Back</span>
            </button>
          </div>

          {/* Assistance Footer Links */}
          <div className="mt-10 sm:mt-12 flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span>Need assistance?</span>
            <Headphones size={13} className="text-slate-400" />
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

        {/* Bottom subtle spacer / copyright alignment */}
        <footer className="text-[11px] text-slate-400 tracking-wide">
          <span>Kavach Autonomous Zero-Trust Security Control Plane</span>
        </footer>
      </div>

      {/* Right Column: 3D Isometric Illustration on Soft Warm Beige Canvas */}
      <div className="w-full lg:w-1/2 min-h-[360px] lg:min-h-screen bg-[#FAF5EF] flex items-center justify-center p-8 lg:p-14 relative overflow-hidden border-t lg:border-t-0 lg:border-l border-amber-100/40">
        <div className="relative max-w-lg w-full flex items-center justify-center">
          <img
            src="/images/error-404-illustration.png"
            alt="404 Page Not Found Illustration"
            className="w-full max-w-[460px] xl:max-w-[500px] h-auto object-contain select-none pointer-events-none drop-shadow-sm transition-transform duration-500 hover:scale-[1.02]"
            loading="eager"
            decoding="async"
          />
        </div>
      </div>
    </div>
  );
}
