'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, useScroll, useSpring } from 'framer-motion';
import {
  ArrowRight,
  Calendar,
  Check,
  Code2,
  ShieldCheck,
  KeyRound,
  Container,
  Package,
  GitPullRequest,
  Shield,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { SecuLayerHeader } from '@/components/navigation/SecuLayerHeader';
import { ProductShowcase } from '@/components/landing/ProductShowcase';
import { KavachFeatureDiagrams } from '@/components/landing/KavachFeatureDiagrams';
import { KavachSecurityPipelineFlow } from '@/components/pipeline/KavachSecurityPipelineFlow';
import { KavachMcpConnectWidget } from '@/components/landing/KavachMcpConnectWidget';
import { EnterpriseFooter } from '@/components/ui/EnterpriseFooter';
import { ScrollRevealText } from '@/components/landing/ScrollRevealText';
import '@/styles/kavach-home.css';

const SearchModal = dynamic(
  () => import('@/components/common/SearchModal').then((mod) => mod.SearchModal),
  { ssr: false }
);

const BookDemoModal = dynamic(
  () => import('@/components/common/BookDemoModal').then((mod) => mod.BookDemoModal),
  { ssr: false }
);

const INTEGRATED_ENGINES = [
  { name: 'Semgrep', role: 'Code Scanning', icon: Code2 },
  { name: 'Gitleaks', role: 'Secret Checks', icon: KeyRound },
  { name: 'Trivy', role: 'Container Scans', icon: Container },
  { name: 'OSV', role: 'Package Risks', icon: Package },
  { name: 'Checkov', role: 'Cloud Config', icon: Shield },
  { name: 'OPA Policy', role: 'Security Rules', icon: ShieldCheck },
  { name: 'GitHub PRs', role: 'Safe Fixes', icon: GitPullRequest },
];

const HERO_SCROLL_WORDS = [
  'AI Agents.',
  'Pull Requests.',
  'Cloud Apps.',
  'MCP Tools.',
];

const KITA_GUARANTEES = [
  { num: 'i.', title: 'Never AI-only decisions', desc: 'Rules and scanners hold final allow/block authority.' },
  { num: 'ii.', title: 'Zero unverified diffs', desc: 'Every fix is re-scanned cleanly before opening a PR.' },
  { num: 'iii.', title: 'Scoped MCP gateway', desc: 'Coding agents pass identity and permission checks.' },
  { num: 'iv.', title: 'Real CLI engines', desc: 'Semgrep, Gitleaks, Trivy, OSV & Checkov run live.' },
  { num: 'v.', title: 'PostgreSQL evidence', desc: 'Rule matches, diffs, and approvals log permanently.' },
];

export default function KavachHomePage() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [expertOpen, setExpertOpen] = useState(false);
  const [activeCta, setActiveCta] = useState<'get-started' | 'book-now' | null>(null);
  const [wordIndex, setWordIndex] = useState(0);
  const [systemStatus, setSystemStatus] = useState<'checking' | 'operational' | 'offline'>('checking');

  const { scrollYProgress } = useScroll();
  const smoothProgress = useSpring(scrollYProgress, { stiffness: 280, damping: 32, restDelta: 0.001 });

  useEffect(() => {
    const wordTimer = window.setInterval(() => {
      setWordIndex((prev) => (prev + 1) % HERO_SCROLL_WORDS.length);
    }, 3200);
    return () => window.clearInterval(wordTimer);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('book-demo') === 'true') {
        const t = window.setTimeout(() => setExpertOpen(true), 0);
        return () => window.clearTimeout(t);
      }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function checkSystemStatus() {
      try {
        const res = await fetch('/api/v1/health', { cache: 'no-store' });
        if (!cancelled) {
          if (res.ok) {
            const json = (await res.json()) as { status?: string };
            setSystemStatus(json.status === 'operational' ? 'operational' : 'offline');
          } else {
            setSystemStatus('offline');
          }
        }
      } catch {
        if (!cancelled) setSystemStatus('offline');
      }
    }
    void checkSystemStatus();
    const timer = window.setInterval(checkSystemStatus, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#FFFFFF',
        color: '#0F172A',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "var(--font-sans, 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif)",
        WebkitFontSmoothing: 'antialiased',
      }}
    >
      {/* Top Minimalist Hairline Scroll Progress Track */}
      <motion.div
        style={{ scaleX: smoothProgress }}
        aria-hidden="true"
        className="fixed top-0 left-0 right-0 h-[1.5px] bg-slate-900/75 origin-left z-[60] pointer-events-none"
      />

      <SecuLayerHeader
        onOpenSearch={() => setSearchOpen(true)}
        onOpenExpert={() => setExpertOpen(true)}
      />

      <main id="main-content" style={{ flex: 1, width: '100%', overflowX: 'hidden' }}>
        {/* ========================================================= */}
        {/* 1. SPLIT HERO + PRODUCT DEMO STAGE                        */}
        {/* ========================================================= */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-[520px] opacity-35"
            style={{
              backgroundImage: 'radial-gradient(#CBD5E1 1px, transparent 1px)',
              backgroundSize: '24px 24px',
              maskImage: 'radial-gradient(ellipse 75% 70% at 50% 25%, #000 40%, transparent 100%)',
              WebkitMaskImage: 'radial-gradient(ellipse 75% 70% at 50% 25%, #000 40%, transparent 100%)',
            }}
          />

          <div className="relative max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10 pt-10 sm:pt-14 pb-12 sm:pb-16">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              {/* LEFT HERO COLUMN */}
              <motion.div
                initial={{ y: 10 }}
                animate={{ y: 0 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="lg:col-span-7 text-left"
              >
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold tracking-[0.08em] uppercase bg-white text-slate-700 border border-slate-200 shadow-sm mb-5 select-none">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Code, Cloud &amp; AI Security</span>
                </div>

                <h1
                  className="text-[#0F172A] font-extrabold tracking-[-0.035em] leading-[1.08] mb-4"
                  style={{ fontSize: 'clamp(38px, 5vw, 62px)' }}
                >
                  <span>Secure Code, Cloud</span>
                  <br />
                  <span className="inline-flex items-baseline gap-x-2.5 flex-wrap">
                    <span>&amp;</span>
                    <span
                      aria-live="polite"
                      className="relative inline-block overflow-hidden align-bottom h-[1.18em] min-w-[230px] sm:min-w-[390px]"
                    >
                      <AnimatePresence mode="wait" initial={false}>
                        <motion.span
                          key={HERO_SCROLL_WORDS[wordIndex]}
                          initial={{ y: '48%', opacity: 0 }}
                          animate={{ y: '0%', opacity: 1 }}
                          exit={{ y: '-48%', opacity: 0 }}
                          transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
                          className="inline-block text-slate-600 whitespace-nowrap"
                        >
                          {HERO_SCROLL_WORDS[wordIndex]}
                        </motion.span>
                      </AnimatePresence>
                    </span>
                  </span>
                </h1>

                <p className="text-[17px] sm:text-[18.5px] text-slate-600 leading-[1.55] max-w-[540px] mb-8">
                  Find security bugs in your code and cloud, test every AI fix automatically, and ship safe pull requests.
                </p>

                {/* CTAs — Clean Charcoal at Rest, Vibrant Orange (#EA580C) on Hover */}
                <div className="flex flex-wrap items-center gap-3.5">
                  <Link
                    href="/signup"
                    onClick={() => setActiveCta('get-started')}
                    className={`group inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl font-semibold text-[15px] transition-all duration-200 shadow-sm cursor-pointer active:scale-95 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C]/60 ${
                      activeCta === 'get-started'
                        ? 'bg-[#09090B] hover:bg-[#EA580C] text-white border border-[#09090B] hover:border-[#EA580C] shadow-[0_10px_24px_-6px_rgba(15,23,42,0.32)] hover:shadow-[0_12px_28px_-6px_rgba(234,88,12,0.38)]'
                        : 'bg-[#0F172A] hover:bg-[#EA580C] text-white border border-[#0F172A] hover:border-[#EA580C] hover:shadow-[0_12px_28px_-6px_rgba(234,88,12,0.38)]'
                    }`}
                  >
                    <span>Get Started</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveCta('book-now');
                      setExpertOpen(true);
                    }}
                    className={`group inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-[15px] transition-all duration-200 shadow-sm cursor-pointer active:scale-95 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C]/60 ${
                      activeCta === 'book-now'
                        ? 'bg-[#09090B] hover:bg-[#EA580C] text-white border border-[#09090B] hover:border-[#EA580C] shadow-[0_10px_24px_-6px_rgba(15,23,42,0.28)] hover:shadow-[0_12px_28px_-6px_rgba(234,88,12,0.35)]'
                        : 'bg-white hover:bg-[#EA580C] hover:text-white hover:border-[#EA580C] text-slate-900 border border-slate-300 hover:shadow-[0_12px_28px_-6px_rgba(234,88,12,0.28)]'
                    }`}
                  >
                    <Calendar
                      className={`w-4 h-4 transition-colors ${
                        activeCta === 'book-now' ? 'text-white' : 'text-slate-700 group-hover:text-slate-950'
                      }`}
                    />
                    <span>Book Now</span>
                  </button>
                </div>
              </motion.div>

              {/* RIGHT HERO COLUMN: Crisp Fuse-Style Inline MCP Gateway */}
              <motion.div
                id="autonomous-mcp"
                initial={{ y: 12 }}
                animate={{ y: 0 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="lg:col-span-5"
              >
                <KavachMcpConnectWidget />
              </motion.div>
            </div>

            {/* PLANE.SO + GLASSMORPHISM VIDEO STAGE DIRECTLY BENEATH HERO */}
            <div id="product-demo">
              <ProductShowcase embeddedHero />
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* 2. KINETIC INTEGRATED SCANNERS MARQUEE                    */}
        {/* ========================================================= */}
        <section className="border-y border-slate-200 bg-[#FAF9F6] overflow-hidden">
          <div className="max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10 py-9">
            <p className="text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600 mb-5">
              Powered by Trusted Open-Source Security Tools
            </p>
            <div className="relative overflow-hidden py-1">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 left-0 w-14 sm:w-24 bg-gradient-to-r from-[#FAF9F6] to-transparent z-10"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 right-0 w-14 sm:w-24 bg-gradient-to-l from-[#FAF9F6] to-transparent z-10"
              />

              <motion.div
                className="flex items-center gap-3.5 w-max"
                animate={{ x: ['0%', '-50%'] }}
                transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
              >
                {[...INTEGRATED_ENGINES, ...INTEGRATED_ENGINES].map((engine, index) => {
                  const Icon = engine.icon;
                  return (
                    <motion.div
                      key={`${engine.name}-${index}`}
                      whileHover={{ y: -3, scale: 1.02 }}
                      transition={{ type: 'spring', stiffness: 420, damping: 24 }}
                      className="group shrink-0 w-[184px] rounded-xl border border-slate-200/90 bg-white px-3.5 py-3 flex items-center gap-3 shadow-sm hover:border-[#EA580C]/50 hover:shadow-[0_10px_24px_-8px_rgba(234,88,12,0.22)] hover:-translate-y-0.5 transition-all"
                    >
                      <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center shrink-0">
                        <Icon size={16} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[13px] font-bold text-slate-900 truncate">
                          {engine.name}
                        </div>
                        <div className="text-[11px] text-slate-600 truncate">
                          {engine.role}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* 3. FUSE + GLASSMORPHISM INTERACTIVE FEATURE DIAGRAMS      */}
        {/* ========================================================= */}
        <KavachFeatureDiagrams />

        {/* ========================================================= */}
        {/* 4. LIVE SECURITY PIPELINE WORKBENCH                       */}
        {/* ========================================================= */}
        <section id="security-pipeline" className="border-t border-slate-200 bg-white">
          <div className="max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10 py-14 sm:py-20">
            <div className="mb-8 max-w-xl">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="inline-flex items-center gap-2 text-xs font-bold tracking-[0.12em] uppercase text-slate-600 mb-2.5"
              >
                <span className="w-2 h-2 rounded-[2px] bg-[#EA580C]" />
                <span>Live Pipeline</span>
              </motion.div>
              <ScrollRevealText
                as="h2"
                className="text-[#0F172A] font-extrabold tracking-[-0.03em] leading-[1.12] mb-2"
                style={{ fontSize: 'clamp(28px, 3.8vw, 42px)' }}
                segments={[
                  { text: 'Watch every check' },
                  { text: 'decide live.', className: 'text-slate-500' },
                ]}
              />
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.4, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
                className="text-[15.5px] text-slate-600"
              >
                Click any stage below to trace every security check.
              </motion.p>
            </div>

            <KavachSecurityPipelineFlow theme="light" />
          </div>
        </section>

        {/* ========================================================= */}
        {/* 5. MINIMALIST ARCHITECTURAL PERIMETER STRIP (i - v)       */}
        {/* ========================================================= */}
        <section className="border-t border-slate-200 bg-white">
          <div className="max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10 py-14 sm:py-20">
            <div className="mb-10 max-w-2xl">
              <ScrollRevealText
                as="h2"
                className="text-[#0F172A] font-extrabold tracking-[-0.03em] leading-[1.12] mb-2.5"
                style={{ fontSize: 'clamp(28px, 3.8vw, 42px)' }}
                segments={[
                  { text: 'Kavach fits inside your workflow,' },
                  { text: 'not around it.', className: 'text-slate-500' },
                ]}
              />
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.4, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
                className="text-[15.5px] text-slate-600"
              >
                Security rules, scanners, and audit logs running directly with your code and AI tools.
              </motion.p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 border-t border-slate-200 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
              {KITA_GUARANTEES.map((item, idx) => (
                <motion.div
                  key={item.num}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.4, delay: idx * 0.06, ease: [0.22, 1, 0.36, 1] }}
                  whileHover={{ y: -2, backgroundColor: 'rgba(255, 247, 237, 0.72)' }}
                  className="pt-6 pb-5 sm:px-5 first:sm:pl-0 last:sm:pr-0 transition-colors rounded-xl hover:[&>span:first-child]:text-[#EA580C]"
                >
                  <span className="block font-mono text-[12px] font-semibold text-slate-500 mb-3">
                    {item.num}
                  </span>
                  <h3 className="text-[15px] font-bold text-slate-900 mb-1.5">
                    {item.title}
                  </h3>
                  <p className="text-[13px] text-slate-600 leading-relaxed">
                    {item.desc}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* 6. SIMPLE COMPARISON (WITHOUT vs WITH KAVACH)             */}
        {/* ========================================================= */}
        <section id="why-kavach" className="border-t border-slate-200 bg-[#FAF9F6]">
          <div className="max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10 py-14 sm:py-20">
            <div className="mb-8 max-w-xl">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="inline-flex items-center gap-2 text-xs font-bold tracking-[0.12em] uppercase text-slate-600 mb-2.5"
              >
                <span className="w-2 h-2 rounded-[2px] bg-[#EA580C]" />
                <span>Why Kavach</span>
              </motion.div>
              <ScrollRevealText
                as="h2"
                className="text-[#0F172A] font-extrabold tracking-[-0.03em] leading-[1.12]"
                style={{ fontSize: 'clamp(28px, 3.8vw, 42px)' }}
                segments={[
                  { text: 'Tested fixes,' },
                  { text: 'not alert noise.', className: 'text-slate-500' },
                ]}
              />
            </div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
              className="grid grid-cols-1 md:grid-cols-2 border border-slate-200 rounded-2xl overflow-hidden divide-y md:divide-y-0 md:divide-x divide-slate-200 bg-white shadow-sm"
            >
              <div className="p-7 sm:p-8 bg-slate-50/70">
                <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-slate-600 mb-2">
                  Without Kavach
                </h3>
                <ul className="space-y-3.5 text-[15px] text-slate-600">
                  <li className="flex items-start gap-3">
                    <span aria-hidden="true" className="text-slate-500 font-bold mt-0.5">—</span>
                    <span>Disconnected scanners for code, containers, and cloud.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span aria-hidden="true" className="text-slate-500 font-bold mt-0.5">—</span>
                    <span>AI patches shipped with zero scanner re-testing.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span aria-hidden="true" className="text-slate-500 font-bold mt-0.5">—</span>
                    <span>Coding agents running tools without rule checks.</span>
                  </li>
                </ul>
              </div>

              <div className="p-7 sm:p-8 bg-white">
                <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-slate-900 mb-2">
                  With Kavach
                </h3>
                <ul className="space-y-3.5 text-[15px] text-slate-800 font-medium">
                  <li className="flex items-start gap-3">
                    <Check size={17} className="text-emerald-600 shrink-0 mt-1" />
                    <span>Semgrep, Gitleaks, Trivy, OSV, and Checkov in one flow.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check size={17} className="text-emerald-600 shrink-0 mt-1" />
                    <span>Every AI fix verified by scanners before opening a PR.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check size={17} className="text-emerald-600 shrink-0 mt-1" />
                    <span>Hard policy gates and PostgreSQL logs on every action.</span>
                  </li>
                </ul>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* 7. CLOSING CTA BANNER (MINIMALIST MONOCHROME + LIFT)      */}
        {/* ========================================================= */}
        <section className="bg-white py-12 sm:py-16">
          <div className="max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-2xl bg-[#FAF9F6] border border-slate-200 px-7 py-9 sm:px-12 sm:py-12 flex flex-col lg:flex-row lg:items-center justify-between gap-6"
            >
              <div className="max-w-lg">
                <ScrollRevealText
                  as="h2"
                  className="text-[#0F172A] font-extrabold tracking-[-0.03em] leading-[1.12] mb-2"
                  style={{ fontSize: 'clamp(26px, 3.6vw, 38px)' }}
                  segments={[
                    { text: 'Start securing' },
                    { text: 'your code today.', className: 'text-slate-600' },
                  ]}
                />
                <p className="text-[15px] text-slate-600">
                  Connect GitHub, Google, or link Kavach directly to your agent.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3.5 shrink-0">
                <Link
                  href="/signup"
                  onClick={() => setActiveCta('get-started')}
                  className={`group inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-[15px] transition-all duration-200 shadow-sm cursor-pointer active:scale-95 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C]/60 ${
                    activeCta === 'get-started'
                      ? 'bg-[#09090B] hover:bg-[#EA580C] text-white border border-[#09090B] hover:border-[#EA580C] hover:shadow-[0_12px_28px_-6px_rgba(234,88,12,0.35)]'
                      : 'bg-[#0F172A] hover:bg-[#EA580C] text-white border border-[#0F172A] hover:border-[#EA580C] hover:shadow-[0_12px_28px_-6px_rgba(234,88,12,0.35)]'
                  }`}
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setActiveCta('book-now');
                    setExpertOpen(true);
                  }}
                  className={`group inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-[15px] transition-all duration-200 shadow-sm cursor-pointer active:scale-95 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C]/60 ${
                    activeCta === 'book-now'
                      ? 'bg-[#09090B] hover:bg-[#EA580C] text-white border border-[#09090B] hover:border-[#EA580C] hover:shadow-[0_12px_28px_-6px_rgba(234,88,12,0.32)]'
                      : 'bg-white hover:bg-[#EA580C] hover:text-white hover:border-[#EA580C] text-slate-900 border border-slate-300 hover:shadow-[0_12px_28px_-6px_rgba(234,88,12,0.28)]'
                  }`}
                >
                  <Calendar
                    className={`w-4 h-4 transition-colors ${
                      activeCta === 'book-now' ? 'text-white' : 'text-slate-700 group-hover:text-slate-950'
                    }`}
                  />
                  <span>Book Now</span>
                </button>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      {/* Unified Pure-Black Kira-Motion Architectural Footer */}
      <EnterpriseFooter
        onOpenDemo={() => setExpertOpen(true)}
        systemStatus={systemStatus}
      />

      {searchOpen && <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />}
      {expertOpen && (
        <BookDemoModal isOpen={expertOpen} onClose={() => setExpertOpen(false)} />
      )}
    </div>
  );
}
