'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { KavachLogo } from '@/components/common/KavachLogo';
import { KitaFooterDotCanvas } from '@/components/landing/KitaFooterDotCanvas';

type SystemStatusState = 'checking' | 'operational' | 'offline';

export interface EnterpriseFooterProps {
  onOpenDemo?: () => void;
  systemStatus?: SystemStatusState;
}

interface FooterLinkItem {
  label: string;
  href: string;
  isModal?: boolean;
}

interface FooterColumnGroup {
  title: string;
  items: FooterLinkItem[];
}

const LinkedinIcon: React.FC<{ size?: number }> = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 8.76a1.6 1.6 0 0 0 1.6-1.6 1.6 1.6 0 0 0-1.6-1.6 1.6 1.6 0 0 0-1.6 1.6c0 .88.72 1.6 1.6 1.6m1.4 9.74v-8.37H5.06v8.37h2.8z" />
  </svg>
);

const XIcon: React.FC<{ size?: number }> = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const YoutubeIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.5 12 3.5 12 3.5s-7.505 0-9.377.55a3.016 3.016 0 0 0-2.122 2.136C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.55 9.376.55 9.376.55s7.505 0 9.377-.55a3.016 3.016 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

const InstagramIcon: React.FC<{ size?: number }> = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
  </svg>
);

const ATTESTATION_ITEMS = [
  'SOC 2 Type II (In Progress)',
  'ISO 27001 (In Progress)',
  'SLSA Level 3 (Aligned)',
  'OPA Rego Policy Enforced',
];

const FOOTER_COLUMNS: FooterColumnGroup[] = [
  {
    title: 'Products',
    items: [
      { label: 'All Products Suite', href: '/products' },
      { label: 'Code Security', href: '/products/code' },
      { label: 'Cloud Security', href: '/products/cloud' },
      { label: 'Attack Surface', href: '/products/attack' },
      { label: 'Runtime Protect', href: '/products/protect' },
      { label: 'AI Agent Security', href: '/products/agent' },
      { label: 'API Security', href: '/products/api-security' },
      { label: 'Data Security', href: '/products/data' },
      { label: 'Security Ops (SOC)', href: '/products/soc' },
    ],
  },
  {
    title: 'Security Modules',
    items: [
      { label: 'Codebase Scanning', href: '/products/codebase-scanning' },
      { label: 'Secret Scanning', href: '/products/secret-scanning' },
      { label: 'IaC Security', href: '/products/iac-security' },
      { label: 'Container Security', href: '/products/container-security' },
      { label: 'Supply Chain & SBOM', href: '/products/supply-chain' },
      { label: 'Vulnerability Mgmt', href: '/products/vulnerability-management' },
      { label: 'Security Graph', href: '/products/graph' },
      { label: 'Threat Intelligence', href: '/products/intelligence' },
      { label: 'Dynamic Blueprints', href: '/blueprints' },
    ],
  },
  {
    title: 'Workspaces',
    items: [
      { label: 'Code (SAST & SCA)', href: '/code' },
      { label: 'Cloud (CSPM & IaC)', href: '/cloud' },
      { label: 'Attack (DAST & BAS)', href: '/attack' },
      { label: 'Protect (eBPF & MCP)', href: '/protect' },
      { label: 'AI Agent Governance', href: '/agent' },
      { label: 'Security Operations', href: '/soc' },
      { label: 'API Control Plane', href: '/api-security' },
      { label: 'OPA Rego Governance', href: '/governance' },
      { label: 'Security Solutions', href: '/solutions' },
    ],
  },
  {
    title: 'Platform & Resources',
    items: [
      { label: 'Docs & REST API', href: '/docs' },
      { label: 'Resources & Research', href: '/resources' },
      { label: 'Security Whitepaper', href: '/whitepaper' },
      { label: 'Pricing & Plans', href: '/pricing' },
      { label: 'Enterprise Blueprint', href: '/enterprise' },
      { label: 'POC Deployment', href: '/poc' },
      { label: 'Solutions Overview', href: '/solutions' },
      { label: 'Security Blueprints', href: '/blueprints' },
      { label: 'Book a Live Demo', href: '/contact', isModal: true },
    ],
  },
  {
    title: 'Company & Legal',
    items: [
      { label: 'About Kavach', href: '/about' },
      { label: 'Leadership & Team', href: '/team' },
      { label: 'Careers', href: '/careers' },
      { label: 'Contact & Support', href: '/contact' },
      { label: 'Trust Center', href: '/trust' },
      { label: 'Security Disclosure', href: '/security' },
      { label: 'System Status', href: '/status' },
      { label: 'Legal Center', href: '/legal' },
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service & MSA', href: '/terms' },
      { label: 'Data Processing (DPA)', href: '/dpa' },
      { label: 'Subprocessors', href: '/subprocessors' },
      { label: 'Acceptable Use', href: '/acceptable-use' },
      { label: 'Cookie Policy', href: '/cookies' },
    ],
  },
];

const SOCIAL_LINKS = [
  { href: 'https://www.linkedin.com/company/kavach-security/', label: 'Kavach on LinkedIn', Icon: LinkedinIcon, size: 14 },
  { href: 'https://x.com/Kavach_Secure', label: 'Kavach on X', Icon: XIcon, size: 12 },
  { href: 'https://www.youtube.com/@kavachsecurity/', label: 'Kavach on YouTube', Icon: YoutubeIcon, size: 15 },
  { href: 'https://www.instagram.com/kavach_secure/', label: 'Kavach on Instagram', Icon: InstagramIcon, size: 14 },
];

/**
 * EnterpriseFooter — Unified Pure-Black Kira-Motion Architectural Footer.
 * Consistent across landing page (/), all product suites, docs, resources, pricing,
 * company pages (about, team, careers, contact), POC workflows, and legal/trust routes.
 * Strictly monochrome black/zinc/white styling with white interactive halftone dot waves (zero green).
 */
export const EnterpriseFooter: React.FC<EnterpriseFooterProps> = ({
  onOpenDemo,
  systemStatus: propSystemStatus,
}) => {
  const router = useRouter();
  const [liveStatus, setLiveStatus] = useState<SystemStatusState>(propSystemStatus || 'checking');

  useEffect(() => {
    if (propSystemStatus) {
      setLiveStatus(propSystemStatus);
      return;
    }

    let cancelled = false;
    const pollHealth = async () => {
      try {
        const res = await fetch('/api/v1/health', { cache: 'no-store' });
        if (!cancelled) {
          if (res.ok) {
            const data = (await res.json().catch(() => null)) as { status?: string } | null;
            setLiveStatus(data?.status === 'operational' ? 'operational' : 'offline');
          } else {
            setLiveStatus('offline');
          }
        }
      } catch {
        if (!cancelled) {
          setLiveStatus('offline');
        }
      }
    };

    void pollHealth();
    const timer = window.setInterval(pollHealth, 15000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [propSystemStatus]);

  const effectiveStatus = propSystemStatus || liveStatus;

  const handleBookDemo = () => {
    if (onOpenDemo) {
      onOpenDemo();
      return;
    }
    if (typeof window !== 'undefined') {
      const evt = new CustomEvent('kavach:open-book-demo', { cancelable: true });
      const notCancelled = window.dispatchEvent(evt);
      if (notCancelled) {
        router.push('/contact');
      }
    }
  };

  const linkCls =
    "relative inline-block w-fit text-[13px] leading-snug text-zinc-400 hover:text-white transition-colors duration-150 after:content-[''] after:absolute after:bottom-[-2px] after:left-0 after:h-px after:w-full after:bg-white after:origin-right after:scale-x-0 after:transition-transform after:duration-300 hover:after:origin-left hover:after:scale-x-100";

  return (
    <footer
      className="relative overflow-hidden text-zinc-300"
      style={{
        backgroundColor: '#000000',
        fontFamily: "var(--font-sans, 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif)",
        zIndex: 10,
        perspective: '1400px',
      }}
    >
      {/* Top 3D Elevated Rounded Black Architectural Footer Card */}
      <div
        className="relative z-10 rounded-b-[28px] sm:rounded-b-[36px] border-t border-b"
        style={{
          backgroundColor: '#08080A',
          backgroundImage: 'linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, rgba(8, 8, 10, 0) 24%)',
          borderColor: 'rgba(255, 255, 255, 0.14)',
          boxShadow:
            '0 34px 96px rgba(0, 0, 0, 0.98), 0 14px 36px rgba(0, 0, 0, 0.9), inset 0 1px 0 rgba(255, 255, 255, 0.18), inset 0 -1px 0 rgba(255, 255, 255, 0.09)',
          transformStyle: 'preserve-3d',
        }}
      >
        <div className="max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10 pt-14 pb-12 sm:pt-16 sm:pb-14">
          {/* Upper Headline & Monochrome 3D Tactile CTAs */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-10 border-b border-white/[0.08]">
            <h2
              className="text-white font-bold tracking-[-0.03em] leading-[1.12] max-w-md m-0"
              style={{ fontSize: 'clamp(25px, 3vw, 34px)' }}
            >
              <span>Code security built </span>
              <span className="text-zinc-400">for the hardest checks.</span>
            </h2>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleBookDemo}
                className="inline-flex items-center gap-2 rounded-full bg-white text-black hover:bg-zinc-100 hover:-translate-y-0.5 active:translate-y-0 px-5 py-2.5 text-[13.5px] font-semibold transition-all duration-200 cursor-pointer border-0"
                style={{
                  boxShadow:
                    '0 10px 26px rgba(255, 255, 255, 0.12), 0 4px 10px rgba(0, 0, 0, 0.5), inset 0 -2px 0 rgba(0, 0, 0, 0.14)',
                }}
              >
                Book a call
              </button>
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/[0.03] text-white hover:bg-white hover:text-black hover:-translate-y-0.5 active:translate-y-0 px-5 py-2.5 text-[13.5px] font-semibold transition-all duration-200 no-underline"
                style={{
                  boxShadow:
                    '0 8px 20px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.14)',
                }}
              >
                <span>Get Started</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          {/* Attestation & Compliance Assurance Ribbon */}
          <div
            className="mt-8 rounded-xl px-5 py-4 flex items-center justify-between flex-wrap gap-4 border"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              borderColor: 'rgba(255, 255, 255, 0.09)',
            }}
          >
            <div className="flex items-center gap-2.5">
              <ShieldCheck size={17} color="#FFFFFF" />
              <span className="text-[13px] font-semibold text-white">
                Deterministic Cryptographic Security Guarantee
              </span>
            </div>

            <div className="flex items-center gap-x-5 gap-y-2 flex-wrap">
              {ATTESTATION_ITEMS.map((item) => (
                <div
                  key={item}
                  className="inline-flex items-center gap-1.5 text-[11.5px] font-mono text-zinc-400"
                >
                  <CheckCircle2 size={13} color="#FFFFFF" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Brand Metadata Row + Full 5-Column System Navigation */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-10 pt-10">
            {/* Brand, Live Status, Contact & Socials */}
            <div className="xl:col-span-3 flex flex-col gap-4">
              <Link
                href="/"
                className="inline-flex items-center w-fit no-underline"
                aria-label="Kavach Home"
              >
                <KavachLogo size={26} invert />
              </Link>

              {/* Monochrome Real Operational Status Pill */}
              <div className="inline-flex items-center gap-2 w-fit rounded-lg bg-white/[0.05] border border-white/10 px-3 py-1.5 text-[11px] font-mono tracking-wide uppercase">
                <span
                  className={`w-2 h-2 rounded-full ${
                    effectiveStatus === 'operational'
                      ? 'bg-white animate-pulse'
                      : effectiveStatus === 'offline'
                      ? 'bg-zinc-500'
                      : 'bg-zinc-400'
                  }`}
                />
                <span className="text-zinc-200">
                  {effectiveStatus === 'operational'
                    ? 'ALL SYSTEMS OPERATIONAL'
                    : effectiveStatus === 'offline'
                    ? 'BACKEND STATUS: OFFLINE'
                    : 'CHECKING SYSTEM STATUS'}
                </span>
              </div>

              <p className="text-[13px] text-zinc-400 leading-relaxed max-w-[270px] m-0">
                &ldquo;LLM proposes. Deterministic security systems decide. Runtime evidence proves.&rdquo;
                Real automated defense from repository to eBPF kernel.
              </p>

              <div className="flex flex-col gap-1.5 text-[12.5px] text-zinc-400 pt-1">
                <a
                  href="mailto:security@kavachsecurity.me"
                  className="text-zinc-400 hover:text-white transition-colors w-fit no-underline"
                >
                  security@kavachsecurity.me
                </a>
                <a
                  href="tel:+918780378086"
                  className="text-zinc-400 hover:text-white transition-colors w-fit no-underline"
                >
                  +91 8780378086
                </a>
              </div>

              <div className="flex items-center gap-2 pt-1">
                {SOCIAL_LINKS.map(({ href, label, Icon, size }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    title={label}
                    className="w-8 h-8 rounded-lg border border-white/15 bg-white/[0.04] hover:bg-white hover:text-black hover:border-white flex items-center justify-center text-zinc-300 transition-colors duration-150 no-underline"
                  >
                    <Icon size={size} />
                  </a>
                ))}
              </div>
            </div>

            {/* Complete Architectural Navigation Grid (Zero Missing Products or Pages) */}
            <div className="xl:col-span-9 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-5 gap-y-8">
              {FOOTER_COLUMNS.map((col) => (
                <div
                  key={col.title}
                  className="flex flex-col gap-2 lg:border-l lg:border-white/[0.08] lg:pl-5"
                >
                  <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em] text-zinc-300 mb-1.5">
                    {col.title}
                  </span>
                  <ul className="list-none p-0 m-0 flex flex-col gap-2">
                    {col.items.map((item) => (
                      <li key={item.label}>
                        {item.isModal ? (
                          <button
                            type="button"
                            onClick={handleBookDemo}
                            className={`${linkCls} text-left bg-transparent border-0 p-0 cursor-pointer`}
                            style={{ font: 'inherit' }}
                          >
                            {item.label}
                          </button>
                        ) : (
                          <Link href={item.href} className={`${linkCls} no-underline`}>
                            {item.label}
                          </Link>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Card Bottom Legal & Social Summary Bar */}
          <div className="border-t border-white/[0.08] mt-10 pt-6 flex items-center justify-between flex-wrap gap-4 text-[12px] text-zinc-400">
            <div>
              &copy; {new Date().getFullYear()} Kavach Security. All rights reserved. Ahmedabad, Gujarat, India.
            </div>
            <div className="flex items-center flex-wrap gap-x-3 gap-y-1">
              <a
                href="https://www.linkedin.com/company/kavach-security/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-400 hover:text-white transition-colors no-underline"
              >
                LinkedIn
              </a>
              <span aria-hidden="true" className="text-zinc-600">&bull;</span>
              <a
                href="https://www.youtube.com/@kavachsecurity/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-400 hover:text-white transition-colors no-underline"
              >
                YouTube
              </a>
              <span aria-hidden="true" className="text-zinc-600">&bull;</span>
              <a
                href="https://www.instagram.com/kavach_secure/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-400 hover:text-white transition-colors no-underline"
              >
                Instagram
              </a>
              <span aria-hidden="true" className="text-zinc-600">&bull;</span>
              <a
                href="https://x.com/Kavach_Secure"
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-400 hover:text-white transition-colors no-underline"
              >
                X
              </a>
              <span aria-hidden="true" className="text-zinc-600">&bull;</span>
              <span className="font-mono text-zinc-300">Kernel Defense: eBPF Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Pure-Black Interactive 3D Perspective White-Dot Wave Motion Floor (Zero Green) */}
      <div
        data-kita-floor="true"
        className="relative flex flex-col justify-end min-h-[250px] sm:min-h-[290px] pt-40 sm:pt-48 pb-10 px-5 text-center overflow-hidden"
        style={{ backgroundColor: '#000000' }}
      >
        <KitaFooterDotCanvas />
        {/* Overhead 3D cast shadow beneath the floating upper footer card */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-24 z-[1]"
          style={{
            background:
              'linear-gradient(180deg, rgba(0, 0, 0, 0.92) 0%, rgba(0, 0, 0, 0.28) 45%, rgba(0, 0, 0, 0) 100%)',
          }}
        />
        <div className="relative z-10 inline-flex mx-auto flex-wrap items-center justify-center gap-x-5 gap-y-2 rounded-full bg-black/55 backdrop-blur-[3px] border border-white/[0.08] px-5 py-2 text-[12px] font-mono text-zinc-300">
          <span>&copy; {new Date().getFullYear()} Kavach Security</span>
          <Link href="/privacy" className="text-zinc-400 hover:text-white transition-colors no-underline">
            Privacy
          </Link>
          <Link href="/terms" className="text-zinc-400 hover:text-white transition-colors no-underline">
            Terms
          </Link>
          <Link href="/legal" className="text-zinc-400 hover:text-white transition-colors no-underline">
            Legal
          </Link>
          <span aria-hidden="true" className="text-zinc-700">&bull;</span>
          <Link href="/security" className="text-zinc-300 hover:text-white transition-colors no-underline">
            Vulnerability Disclosure
          </Link>
          <span aria-hidden="true" className="text-zinc-700">&bull;</span>
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="text-zinc-300 hover:text-white transition-colors bg-transparent border-0 p-0 cursor-pointer font-mono text-[12px]"
          >
            Back to top &uarr;
          </button>
        </div>
      </div>
    </footer>
  );
};
