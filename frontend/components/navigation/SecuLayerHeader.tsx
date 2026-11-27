'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { getAuthToken, clearAuthToken } from '@/lib/auth/token';
import { toast } from '@/lib/toast';
import {
  Search,
  Menu,
  X,
  ArrowRight,
  ArrowUpRight,
  ExternalLink,
  ChevronDown,
  Code2,
  Cloud,
  ShieldAlert,
  ShieldCheck,
  Bot,
  Database,
  Network,
  Radio,
  Activity,
  Box,
  Terminal,
  FileCode2,
  Sparkles,
  MessageSquare,
  Mail,
  Calendar,
  Users,
} from 'lucide-react';
import { SearchModal } from '@/components/common/SearchModal';
import { BookDemoModal } from '@/components/common/BookDemoModal';
import { FeedbackModal } from '@/components/common/FeedbackModal';
import { KavachMark, KavachLogo } from '@/components/common/KavachLogo';
import { api } from '@/lib/api/client';
import type { UserProfile } from '@/types/api/auth';

interface SecuLayerHeaderProps {
  onOpenSearch?: () => void;
  onOpenExpert?: () => void;
  onOpenTalkToExpert?: () => void;
  title?: string;
  subtitle?: string;
  variant?: 'default' | 'minimal';
}

export const SecuLayerHexLogo: React.FC<{ size?: number; className?: string }> = ({ size = 26 }) => (
  <KavachLogo size={size} showText={true} />
);

export const SecuLayerHeader: React.FC<SecuLayerHeaderProps> = ({
  onOpenSearch,
  onOpenExpert,
  onOpenTalkToExpert,
  variant = 'default',
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const isMinimal = variant === 'minimal' || pathname === '/login' || pathname === '/register' || pathname === '/signup' || pathname === '/forgot-password';
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileProductsOpen, setMobileProductsOpen] = useState(false);
  const [internalSearchOpen, setInternalSearchOpen] = useState(false);
  const [bookDemoOpen, setBookDemoOpen] = useState(false);
  const [currentHash, setCurrentHash] = useState('');
  const [headerActiveBtn, setHeaderActiveBtn] = useState<'get-started' | 'book-demo' | null>(null);
  const [headerHoveredBtn, setHeaderHoveredBtn] = useState<'get-started' | 'book-demo' | null>(null);

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    const handleOpenBookDemo = (event?: Event) => {
      if (event?.cancelable) {
        event.preventDefault();
      }
      if (onOpenExpert) {
        onOpenExpert();
      } else {
        setBookDemoOpen(true);
      }
    };
    window.addEventListener('kavach:open-book-demo', handleOpenBookDemo as EventListener);
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('book-demo') === 'true') {
        if (onOpenExpert) {
          onOpenExpert();
        } else {
          setBookDemoOpen(true);
        }
      }
    }
    return () => window.removeEventListener('kavach:open-book-demo', handleOpenBookDemo as EventListener);
  }, [onOpenExpert]);

  useEffect(() => {
    const token = getAuthToken();
    setIsLoggedIn(!!token);
    if (token) {
      api.auth
        .me()
        .then((u) => {
          if (u) setCurrentUser(u);
        })
        .catch(() => {
          setCurrentUser(null);
        });
    } else {
      setCurrentUser(null);
    }
  }, [pathname]);

  const isOnboardingRoute =
    pathname?.startsWith('/verify-email') ||
    pathname?.startsWith('/mfa') ||
    pathname?.startsWith('/onboarding') ||
    pathname?.startsWith('/account-locked') ||
    pathname?.startsWith('/account-recovery');

  const handleConsoleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (isOnboardingRoute) {
      toast.warning('Onboarding In Progress', {
        description: 'Please complete your email verification and workspace setup before entering the Console.',
      });
      return;
    }

    let user = currentUser;
    if (!user) {
      try {
        user = await api.auth.me();
        if (user) setCurrentUser(user);
      } catch {
        router.push('/login');
        return;
      }
    }

    if (user && !user.is_superuser) {
      const hasExistingProject = typeof window !== 'undefined' && Boolean(
        localStorage.getItem('secu_active_project_id') || localStorage.getItem('secu_active_repo')
      );
      if (user.onboarding_completed === false && !hasExistingProject) {
        toast.warning('Setup Incomplete', {
          description: 'Please finish setting up your project workspace to access the Console.',
        });
        router.push(`/onboarding?email=${encodeURIComponent(user.email)}`);
        return;
      }
    }

    router.push('/home');
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentHash(window.location.hash);
      const handleHashChange = () => setCurrentHash(window.location.hash);
      window.addEventListener('hashchange', handleHashChange);
      return () => window.removeEventListener('hashchange', handleHashChange);
    }
  }, [pathname]);

  const handleSearchClick = () => {
    if (onOpenSearch) {
      onOpenSearch();
    } else {
      setInternalSearchOpen(true);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        handleSearchClick();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpenSearch]);

  const handleLogout = () => {
    toast.success('Signed out successfully', {
      description: 'Your Kavach session has been securely ended.',
    });
    clearAuthToken();
    setIsLoggedIn(false);
    router.push('/login?logged_out=1');
  };

  // Navbar hover & dropdown state
  const [hoveredNav, setHoveredNav] = useState<string | null>(null);
  const [isProductsDropdownOpen, setIsProductsDropdownOpen] = useState(false);
  const dropdownTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnterProducts = () => {
    if (dropdownTimeoutRef.current) {
      clearTimeout(dropdownTimeoutRef.current);
    }
    setHoveredNav('Products');
    setIsSolutionsDropdownOpen(false);
    setIsCompanyDropdownOpen(false);
    setIsProductsDropdownOpen(true);
  };

  const handleMouseLeaveProducts = () => {
    dropdownTimeoutRef.current = setTimeout(() => {
      setIsProductsDropdownOpen(false);
    }, 180);
  };

  // Solutions hover dropdown state & timeout
  const [isSolutionsDropdownOpen, setIsSolutionsDropdownOpen] = useState(false);
  const solutionsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnterSolutions = () => {
    if (solutionsTimeoutRef.current) {
      clearTimeout(solutionsTimeoutRef.current);
    }
    setHoveredNav('Solutions');
    setIsProductsDropdownOpen(false);
    setIsCompanyDropdownOpen(false);
    setIsSolutionsDropdownOpen(true);
  };

  const handleMouseLeaveSolutions = () => {
    solutionsTimeoutRef.current = setTimeout(() => {
      setIsSolutionsDropdownOpen(false);
    }, 180);
  };

  // Company hover dropdown state & timeout
  const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false);
  const [mobileCompanyOpen, setMobileCompanyOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const companyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnterCompany = () => {
    if (companyTimeoutRef.current) {
      clearTimeout(companyTimeoutRef.current);
    }
    setHoveredNav('Company');
    setIsProductsDropdownOpen(false);
    setIsSolutionsDropdownOpen(false);
    setIsCompanyDropdownOpen(true);
  };

  const handleMouseLeaveCompany = () => {
    companyTimeoutRef.current = setTimeout(() => {
      setIsCompanyDropdownOpen(false);
    }, 180);
  };

  useEffect(() => {
    return () => {
      if (dropdownTimeoutRef.current) clearTimeout(dropdownTimeoutRef.current);
      if (solutionsTimeoutRef.current) clearTimeout(solutionsTimeoutRef.current);
      if (companyTimeoutRef.current) clearTimeout(companyTimeoutRef.current);
    };
  }, []);

  // Products list for hover menu - Sleek Monochrome Identity
  const productCategories = [
    {
      group: 'Code & Build',
      items: [
        {
          title: 'Code Security',
          href: '/code/secrets',
          desc: 'SAST, SCA, Secrets & AI auto-remediation workspace',
          icon: Code2,
          color: '#09090B',
          bg: '#F4F4F5',
          badge: 'Workspace',
        },
        {
          title: 'Codebase Scanning',
          href: '/products/codebase-scanning',
          desc: 'Follow code findings from source to reviewed fix',
          icon: FileCode2,
          color: '#09090B',
          bg: '#F4F4F5',
        },
        {
          title: 'Vulnerability Management',
          href: '/products/vulnerability-management',
          desc: 'Prioritize vulnerabilities with reachability evidence',
          icon: ShieldAlert,
          color: '#09090B',
          bg: '#F4F4F5',
        },
        {
          title: 'Supply Chain Security',
          href: '/products/supply-chain',
          desc: 'Understand package relationships and upgrade risk',
          icon: Database,
          color: '#09090B',
          bg: '#F4F4F5',
        },
        {
          title: 'Secret Scanning',
          href: '/products/secret-scanning',
          desc: 'Trace exposed credentials and guide containment',
          icon: ShieldCheck,
          color: '#09090B',
          bg: '#F4F4F5',
        },
        {
          title: 'Container Security',
          href: '/code/container-security',
          desc: 'Image vulnerability scanning & SBOM tracking',
          icon: Box,
          color: '#09090B',
          bg: '#F4F4F5',
        },
        {
          title: 'CI/CD Pipeline Security',
          href: '/code/jobs',
          desc: 'GitHub Actions & build workflow protection',
          icon: Terminal,
          color: '#09090B',
          bg: '#F4F4F5',
        },
        {
          title: 'API Security',
          href: '/api-security',
          desc: 'Dynamic API route discovery, OWASP Top 10 & DAST testing',
          icon: Network,
          color: '#09090B',
          bg: '#F4F4F5',
          badge: 'New',
        },
      ],
    },
    {
      group: 'Cloud & Infrastructure',
      items: [
        {
          title: 'Cloud Security',
          href: '/cloud',
          desc: 'Multi-cloud CSPM, IAM & CIS benchmarks workspace',
          icon: Cloud,
          color: '#09090B',
          bg: '#F4F4F5',
          badge: 'Workspace',
        },
        {
          title: 'Attack Surface',
          href: '/attack',
          desc: 'External asset discovery & automated DAST',
          icon: ShieldAlert,
          color: '#09090B',
          bg: '#F4F4F5',
        },
      ],
    },
    {
      group: 'Runtime & AI Governance',
      items: [
        {
          title: 'Runtime Protection',
          href: '/protect',
          desc: 'eBPF behavioral defense & MCP gateway',
          icon: ShieldCheck,
          color: '#09090B',
          bg: '#F4F4F5',
        },
        {
          title: 'Agent Governance',
          href: '/agent',
          desc: 'Autonomous AI agent identity & tool policy',
          icon: Bot,
          color: '#09090B',
          bg: '#F4F4F5',
          badge: 'AI Guard',
        },
        {
          title: 'Security Operations (SOC)',
          href: '/soc',
          desc: 'Threat intel, security graph & incident triage',
          icon: Activity,
          color: '#09090B',
          bg: '#F4F4F5',
        },
      ],
    },
  ];

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsLoggedIn(!!getAuthToken());
  }, [pathname]);

  const navLinks: Array<{
    label: string;
    href: string;
    hasDropdown?: boolean;
    hasSolutionsDropdown?: boolean;
    hasCompanyDropdown?: boolean;
    external?: boolean;
    isModalAction?: boolean;
  }> = [
      { label: 'Products', href: '/products', hasDropdown: true },
      { label: 'Solutions', href: '/solutions', hasSolutionsDropdown: true },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Resources', href: '/resources' },
      { label: 'Docs', href: '/docs' },
      { label: 'Company', href: '/contact', hasCompanyDropdown: true },
    ];

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    if (href === '/platform') return pathname === '/platform';
    if (href === '/solutions') return pathname === '/solutions' || pathname.startsWith('/solutions');
    if (href === '/resources') return pathname === '/resources' || pathname.startsWith('/resources');
    if (href === '/pricing') return pathname === '/pricing';
    if (href === '/contact') return pathname === '/contact';
    if (href === '/demo' || href.startsWith('/demo')) return pathname.startsWith('/demo');
    if (href === '/products' || href.startsWith('/products')) return pathname.startsWith('/products');
    if (href === '/docs' || href.startsWith('/docs')) return pathname.startsWith('/docs');

    return pathname === href;
  };

  return (
    <>
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          backgroundColor: 'rgba(255, 255, 255, 0.86)',
          borderBottom: '1px solid rgba(15, 23, 42, 0.06)',
          boxShadow: 'none',
          width: '100%',
          backdropFilter: 'blur(14px)',
        }}
      >
        <div
          style={{
            maxWidth: '1380px',
            margin: '0 auto',
            padding: '0 24px',
            height: '68px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Brand Logo */}
          <Link href="/" style={{ display: 'flex', alignItems: 'center' }}>
            <SecuLayerHexLogo />
          </Link>

          {!isMinimal && (
            <>
              {/* Desktop Navigation Links — Minimalist Glass & Subtle Hover Slash */}
              <nav
                onMouseLeave={() => setHoveredNav(null)}
                style={{
                  display: 'none',
                  alignItems: 'center',
                  gap: '10px',
                }}
                className="desktop-nav"
              >
                {navLinks.map((link) => {
                  const active = isActive(link.href);
                  const isHovered = hoveredNav === link.label;

                  const navItemPill = (
                    <span className="relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors duration-150">
                      {isHovered && (
                        <motion.span
                          layoutId="kavachNavHoverPill"
                          transition={{ type: 'spring', stiffness: 460, damping: 34 }}
                          className="pointer-events-none absolute inset-0 rounded-lg bg-slate-100/85"
                        />
                      )}
                      {isHovered && (
                        <motion.span
                          layoutId="kavachNavHoverSlash"
                          transition={{ type: 'spring', stiffness: 520, damping: 34 }}
                          aria-hidden="true"
                          className="relative z-10 inline-block w-[2px] h-3.5 bg-[#EA580C] rotate-[16deg] rounded-full shrink-0"
                        />
                      )}
                      <span
                        className={`relative z-10 text-[14px] transition-colors ${
                          active || isHovered
                            ? 'font-semibold text-[#0F172A]'
                            : 'font-medium text-slate-600'
                        }`}
                      >
                        {link.label}
                      </span>
                    </span>
                  );

                  // 1. Products Dropdown Card
                  if (link.hasDropdown) {
                    return (
                      <div
                        key={link.label}
                        onMouseEnter={handleMouseEnterProducts}
                        onMouseLeave={handleMouseLeaveProducts}
                        style={{ position: 'relative', padding: '10px 0' }}
                      >
                        <Link
                          href={link.href}
                          className="inline-flex items-center gap-0.5 cursor-pointer"
                        >
                          <span className="relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg">
                            {isHovered && (
                              <motion.span
                                layoutId="kavachNavHoverPill"
                                transition={{ type: 'spring', stiffness: 460, damping: 34 }}
                                className="pointer-events-none absolute inset-0 rounded-lg bg-slate-100/85"
                              />
                            )}
                            {isHovered && (
                              <motion.span
                                layoutId="kavachNavHoverSlash"
                                transition={{ type: 'spring', stiffness: 520, damping: 34 }}
                                aria-hidden="true"
                                className="relative z-10 inline-block w-[2px] h-3.5 bg-[#EA580C] rotate-[16deg] rounded-full shrink-0"
                              />
                            )}
                            <span
                              className={`relative z-10 text-[14px] ${
                                active || isHovered || isProductsDropdownOpen
                                  ? 'font-semibold text-[#0F172A]'
                                  : 'font-medium text-slate-600'
                              }`}
                            >
                              {link.label}
                            </span>
                            <ChevronDown
                              size={13}
                              className="relative z-10 text-slate-500 transition-transform duration-200"
                              style={{
                                transform: isProductsDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                              }}
                            />
                          </span>
                        </Link>

                        <AnimatePresence>
                          {isProductsDropdownOpen && (
                            <motion.div
                              initial={{ opacity: 0, y: 6, scale: 0.98 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 4, scale: 0.98 }}
                              transition={{ duration: 0.16, ease: 'easeOut' }}
                              className="absolute top-full -left-4 w-[320px] rounded-2xl border border-slate-200/90 bg-white/95 backdrop-blur-xl p-2.5 shadow-[0_22px_48px_-14px_rgba(15,23,42,0.16)] z-50"
                            >
                              <div className="divide-y divide-slate-100">
                                {[
                                  {
                                    title: 'Code & Secrets Scanning',
                                    desc: 'SAST, secret leaks & package checks',
                                    href: '/code/sast',
                                    Icon: Code2,
                                  },
                                  {
                                    title: 'Verified Auto-Fix',
                                    desc: 'Patch bugs and re-scan before opening PRs',
                                    href: '/code/remediation',
                                    Icon: Sparkles,
                                  },
                                  {
                                    title: 'Cloud & IaC Posture',
                                    desc: 'Audit AWS, Kubernetes, Terraform & Docker',
                                    href: '/cloud',
                                    Icon: Cloud,
                                  },
                                  {
                                    title: 'Agent Governance & MCP',
                                    desc: 'OPA safety rules & 23 gateway security tools',
                                    href: '/agent',
                                    Icon: Bot,
                                  },
                                ].map((item) => (
                                  <Link
                                    key={item.title}
                                    href={item.href}
                                    onClick={() => setIsProductsDropdownOpen(false)}
                                    className="group flex items-start gap-3 p-2.5 rounded-xl hover:bg-[#FAF9F6] transition-colors"
                                  >
                                    <div className="w-9 h-9 rounded-lg border border-slate-200/80 bg-[#FAF9F6] group-hover:bg-white group-hover:border-orange-200 flex items-center justify-center shrink-0 text-slate-700 group-hover:text-[#EA580C] transition-colors">
                                      <item.Icon size={16} />
                                    </div>
                                    <div className="min-w-0">
                                      <div className="text-[13.5px] font-semibold text-slate-900 leading-tight">
                                        {item.title}
                                      </div>
                                      <div className="text-[12px] text-slate-600 mt-0.5 leading-snug">
                                        {item.desc}
                                      </div>
                                    </div>
                                  </Link>
                                ))}
                              </div>
                              <div className="mt-1.5 pt-1.5 border-t border-slate-100">
                                <Link
                                  href="/products"
                                  onClick={() => setIsProductsDropdownOpen(false)}
                                  className="flex items-center justify-between px-3 py-2 rounded-xl text-[12.5px] font-semibold text-slate-800 hover:bg-slate-50 hover:text-[#EA580C] transition-colors"
                                >
                                  <span>Explore all security products</span>
                                  <ArrowRight size={13} />
                                </Link>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  }

                  // 2. Solutions Dropdown Card
                  if (link.hasSolutionsDropdown) {
                    return (
                      <div
                        key={link.label}
                        onMouseEnter={handleMouseEnterSolutions}
                        onMouseLeave={handleMouseLeaveSolutions}
                        style={{ position: 'relative', padding: '10px 0' }}
                      >
                        <Link href={link.href} className="inline-flex items-center cursor-pointer">
                          <span className="relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg">
                            {isHovered && (
                              <motion.span
                                layoutId="kavachNavHoverPill"
                                transition={{ type: 'spring', stiffness: 460, damping: 34 }}
                                className="pointer-events-none absolute inset-0 rounded-lg bg-slate-100/85"
                              />
                            )}
                            {isHovered && (
                              <motion.span
                                layoutId="kavachNavHoverSlash"
                                transition={{ type: 'spring', stiffness: 520, damping: 34 }}
                                aria-hidden="true"
                                className="relative z-10 inline-block w-[2px] h-3.5 bg-[#EA580C] rotate-[16deg] rounded-full shrink-0"
                              />
                            )}
                            <span
                              className={`relative z-10 text-[14px] ${
                                active || isHovered || isSolutionsDropdownOpen
                                  ? 'font-semibold text-[#0F172A]'
                                  : 'font-medium text-slate-600'
                              }`}
                            >
                              {link.label}
                            </span>
                            <ChevronDown
                              size={13}
                              className="relative z-10 text-slate-500 transition-transform duration-200"
                              style={{
                                transform: isSolutionsDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                              }}
                            />
                          </span>
                        </Link>

                        <AnimatePresence>
                          {isSolutionsDropdownOpen && (
                            <motion.div
                              initial={{ opacity: 0, y: 6, scale: 0.98 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 4, scale: 0.98 }}
                              transition={{ duration: 0.16, ease: 'easeOut' }}
                              className="absolute top-full -left-4 w-[310px] rounded-2xl border border-slate-200/90 bg-white/95 backdrop-blur-xl p-2.5 shadow-[0_22px_48px_-14px_rgba(15,23,42,0.16)] z-50"
                            >
                              <div className="divide-y divide-slate-100">
                                {[
                                  {
                                    title: 'AI Engineering Teams',
                                    desc: 'Guard coding agents & auto-test patches',
                                    href: '/solutions',
                                    Icon: Bot,
                                  },
                                  {
                                    title: 'AppSec & DevSecOps',
                                    desc: 'Replace scattered scanners in one pipeline',
                                    href: '/code',
                                    Icon: ShieldCheck,
                                  },
                                  {
                                    title: 'Cloud Infrastructure',
                                    desc: 'Verify IAM, Kubernetes & Terraform rules',
                                    href: '/cloud',
                                    Icon: Cloud,
                                  },
                                  {
                                    title: 'Security Governance',
                                    desc: 'PostgreSQL evidence & traceable PR checks',
                                    href: '/governance',
                                    Icon: Database,
                                  },
                                ].map((item) => (
                                  <Link
                                    key={item.title}
                                    href={item.href}
                                    onClick={() => setIsSolutionsDropdownOpen(false)}
                                    className="group flex items-start gap-3 p-2.5 rounded-xl hover:bg-[#FAF9F6] transition-colors"
                                  >
                                    <div className="w-9 h-9 rounded-lg border border-slate-200/80 bg-[#FAF9F6] group-hover:bg-white group-hover:border-orange-200 flex items-center justify-center shrink-0 text-slate-700 group-hover:text-[#EA580C] transition-colors">
                                      <item.Icon size={16} />
                                    </div>
                                    <div className="min-w-0">
                                      <div className="text-[13.5px] font-semibold text-slate-900 leading-tight">
                                        {item.title}
                                      </div>
                                      <div className="text-[12px] text-slate-600 mt-0.5 leading-snug">
                                        {item.desc}
                                      </div>
                                    </div>
                                  </Link>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  }

                  // 3. Company Dropdown Card
                  if (link.hasCompanyDropdown) {
                    return (
                      <div
                        key={link.label}
                        onMouseEnter={handleMouseEnterCompany}
                        onMouseLeave={handleMouseLeaveCompany}
                        style={{ position: 'relative', padding: '10px 0' }}
                      >
                        <Link href={link.href} className="inline-flex items-center cursor-pointer">
                          <span className="relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg">
                            {isHovered && (
                              <motion.span
                                layoutId="kavachNavHoverPill"
                                transition={{ type: 'spring', stiffness: 460, damping: 34 }}
                                className="pointer-events-none absolute inset-0 rounded-lg bg-slate-100/85"
                              />
                            )}
                            {isHovered && (
                              <motion.span
                                layoutId="kavachNavHoverSlash"
                                transition={{ type: 'spring', stiffness: 520, damping: 34 }}
                                aria-hidden="true"
                                className="relative z-10 inline-block w-[2px] h-3.5 bg-[#EA580C] rotate-[16deg] rounded-full shrink-0"
                              />
                            )}
                            <span
                              className={`relative z-10 text-[14px] ${
                                active || isHovered || isCompanyDropdownOpen
                                  ? 'font-semibold text-[#0F172A]'
                                  : 'font-medium text-slate-600'
                              }`}
                            >
                              {link.label}
                            </span>
                            <ChevronDown
                              size={13}
                              className="relative z-10 text-slate-500 transition-transform duration-200"
                              style={{
                                transform: isCompanyDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                              }}
                            />
                          </span>
                        </Link>

                        <AnimatePresence>
                          {isCompanyDropdownOpen && (
                            <motion.div
                              initial={{ opacity: 0, y: 6, scale: 0.98 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 4, scale: 0.98 }}
                              transition={{ duration: 0.16, ease: 'easeOut' }}
                              className="absolute top-full right-0 w-[235px] rounded-2xl border border-slate-200/90 bg-white/95 backdrop-blur-xl p-2 shadow-[0_22px_48px_-14px_rgba(15,23,42,0.16)] z-50"
                            >
                              <div className="divide-y divide-slate-100">
                                {[
                                  { title: 'About Kavach', href: '/about', Icon: Users },
                                  { title: 'Team', href: '/team', Icon: ShieldCheck },
                                  { title: 'Careers', href: '/careers', Icon: Sparkles },
                                  { title: 'Contact Us', href: '/contact', Icon: Mail },
                                ].map((item) => (
                                  <Link
                                    key={item.title}
                                    href={item.href}
                                    onClick={() => setIsCompanyDropdownOpen(false)}
                                    className="group flex items-center gap-2.5 p-2 rounded-xl hover:bg-[#FAF9F6] transition-colors"
                                  >
                                    <div className="w-7 h-7 rounded-lg border border-slate-200/80 bg-[#FAF9F6] group-hover:bg-white group-hover:border-orange-200 flex items-center justify-center shrink-0 text-slate-700 group-hover:text-[#EA580C] transition-colors">
                                      <item.Icon size={14} />
                                    </div>
                                    <span className="text-[13.5px] font-medium text-slate-800">
                                      {item.title}
                                    </span>
                                  </Link>
                                ))}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsCompanyDropdownOpen(false);
                                    setFeedbackOpen(true);
                                  }}
                                  className="group w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-[#FAF9F6] transition-colors text-left cursor-pointer bg-transparent border-0"
                                >
                                  <div className="w-7 h-7 rounded-lg border border-slate-200/80 bg-[#FAF9F6] group-hover:bg-white group-hover:border-orange-200 flex items-center justify-center shrink-0 text-slate-700 group-hover:text-[#EA580C] transition-colors">
                                    <MessageSquare size={14} />
                                  </div>
                                  <span className="text-[13.5px] font-medium text-slate-800">
                                    Share Feedback
                                  </span>
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={link.label}
                      href={link.href}
                      onMouseEnter={() => {
                        setIsProductsDropdownOpen(false);
                        setIsSolutionsDropdownOpen(false);
                        setIsCompanyDropdownOpen(false);
                        setHoveredNav(link.label);
                      }}
                      className="relative inline-flex items-center cursor-pointer py-2"
                    >
                      {navItemPill}
                      {active && (
                        <span
                          className="absolute bottom-0.5 left-3 right-3 h-[2px] bg-[#0F172A] rounded-full"
                        />
                      )}
                    </Link>
                  );
                })}
              </nav>

              {/* Right Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {/* Auth State CTAs */}
                {mounted && isLoggedIn ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Link
                      href="/home"
                      onClick={(e) => {
                        void handleConsoleClick(e);
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 18px',
                        minHeight: '42px',
                        backgroundColor: '#09090B',
                        color: '#FFFFFF',
                        fontSize: '13.5px',
                        fontWeight: 600,
                        borderRadius: '12px',
                        textDecoration: 'none',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#EA580C')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#09090B')}
                    >
                      <span>Console</span>
                      <ArrowUpRight size={14} />
                    </Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="header-desktop-btn"
                      style={{
                        padding: '8px 14px',
                        minHeight: '42px',
                        fontSize: '13px',
                        fontWeight: 500,
                        color: '#64748B',
                        backgroundColor: 'transparent',
                        border: '1px solid #CBD5E1',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#FEF2F2';
                        e.currentTarget.style.color = '#EF4444';
                        e.currentTarget.style.borderColor = '#FECACA';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = '#64748B';
                        e.currentTarget.style.borderColor = '#CBD5E1';
                      }}
                    >
                      Sign Out
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setHeaderActiveBtn('book-demo');
                        if (onOpenExpert) {
                          onOpenExpert();
                        } else {
                          setBookDemoOpen(true);
                        }
                      }}
                      className="header-desktop-btn"
                      style={{
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '7px',
                        padding: '8px 18px',
                        minHeight: '42px',
                        fontSize: '13.5px',
                        fontWeight: 600,
                        color: headerHoveredBtn === 'book-demo' || headerActiveBtn === 'book-demo' ? '#FFFFFF' : '#18181B',
                        backgroundColor:
                          headerHoveredBtn === 'book-demo'
                            ? '#EA580C'
                            : headerActiveBtn === 'book-demo'
                            ? '#09090B'
                            : '#FFFFFF',
                        border:
                          headerHoveredBtn === 'book-demo'
                            ? '1px solid #EA580C'
                            : headerActiveBtn === 'book-demo'
                            ? '1px solid #09090B'
                            : '1px solid #E4E4E7',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                        boxShadow:
                          headerHoveredBtn === 'book-demo'
                            ? '0 8px 20px -4px rgba(234, 88, 12, 0.38)'
                            : headerActiveBtn === 'book-demo'
                            ? '0 0 0 3px rgba(15, 23, 42, 0.14)'
                            : '0 1px 2px rgba(0, 0, 0, 0.04)',
                        transform: headerHoveredBtn === 'book-demo' ? 'translateY(-1px)' : 'scale(1)',
                      }}
                      onMouseDown={(e) => {
                        e.currentTarget.style.transform = 'scale(0.96)';
                      }}
                      onMouseUp={(e) => {
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }}
                      onMouseEnter={() => setHeaderHoveredBtn('book-demo')}
                      onMouseLeave={() => setHeaderHoveredBtn(null)}
                    >
                      <Calendar
                        size={15}
                        color={headerHoveredBtn === 'book-demo' || headerActiveBtn === 'book-demo' ? '#FFFFFF' : '#18181B'}
                      />
                      <span>Book Now</span>
                    </button>

                    <Link
                      href="/signup"
                      onClick={() => setHeaderActiveBtn('get-started')}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '7px',
                        padding: '8px 20px',
                        minHeight: '42px',
                        backgroundColor:
                          headerHoveredBtn === 'get-started' ? '#EA580C' : '#09090B',
                        color: '#FFFFFF',
                        fontSize: '13.5px',
                        fontWeight: 600,
                        borderRadius: '12px',
                        textDecoration: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                        boxShadow:
                          headerHoveredBtn === 'get-started'
                            ? '0 8px 20px -4px rgba(234, 88, 12, 0.42)'
                            : headerActiveBtn === 'get-started'
                            ? '0 0 0 3px rgba(15, 23, 42, 0.18)'
                            : '0 2px 8px rgba(0, 0, 0, 0.10)',
                        transform: headerHoveredBtn === 'get-started' ? 'translateY(-1px)' : 'scale(1)',
                      }}
                      onMouseDown={(e) => {
                        e.currentTarget.style.transform = 'scale(0.96)';
                      }}
                      onMouseUp={(e) => {
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }}
                      onMouseEnter={() => setHeaderHoveredBtn('get-started')}
                      onMouseLeave={() => setHeaderHoveredBtn(null)}
                    >
                      <span>Get Started</span>
                      <ArrowRight size={15} color="#FFFFFF" />
                    </Link>
                  </div>
                )}

                {/* Mobile Menu Hamburger */}
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  style={{
                    padding: '8px',
                    borderRadius: '6px',
                    color: '#475569',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  className="mobile-toggle"
                  aria-label="Toggle navigation menu"
                >
                  {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
                </button>
              </div>
            </>
          )}

          {isMinimal && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span
                style={{ fontSize: '13px', color: '#64748B' }}
                className="auth-header-subtext"
              >
                {pathname === '/signup' || pathname === '/register'
                  ? 'Already have an account?'
                  : "Don't have an account?"}
              </span>
              <Link
                href={pathname === '/signup' || pathname === '/register' ? '/login' : '/signup'}
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#0F172A',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #CBD5E1',
                  borderRadius: '7px',
                  padding: '6px 14px',
                  textDecoration: 'none',
                  transition: 'all 0.15s ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
              >
                <span>{pathname === '/signup' || pathname === '/register' ? 'Sign in' : 'Create account'}</span>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Drawer */}
        {!isMinimal && mobileMenuOpen && (
          <div
            style={{
              borderTop: '1px solid #E2E8F0',
              backgroundColor: '#FFFFFF',
              padding: '16px 20px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              maxHeight: '85vh',
              overflowY: 'auto',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            {navLinks.map((link) => {
              if (link.hasDropdown) {
                return (
                  <div key={link.label} style={{ display: 'flex', flexDirection: 'column' }}>
                    <button
                      type="button"
                      onClick={() => setMobileProductsOpen(!mobileProductsOpen)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '15px',
                        fontWeight: 600,
                        color: isActive(link.href) ? '#2563EB' : '#1E293B',
                        padding: '10px 0',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                        width: '100%',
                      }}
                    >
                      <span>{link.label}</span>
                      <ChevronDown
                        size={16}
                        style={{
                          transform: mobileProductsOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s ease',
                        }}
                      />
                    </button>

                    {mobileProductsOpen && (
                      <div
                        style={{
                          paddingLeft: '14px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                          borderLeft: '2px solid #E2E8F0',
                          margin: '4px 0 10px 6px',
                        }}
                      >
                        {productCategories.flatMap((c) => c.items).map((prod) => (
                          <Link
                            key={prod.title}
                            href={prod.href}
                            onClick={() => setMobileMenuOpen(false)}
                            style={{
                              fontSize: '14px',
                              fontWeight: 500,
                              color: '#475569',
                              padding: '4px 0',
                            }}
                          >
                            {prod.title}
                          </Link>
                        ))}
                        <Link
                          href="/products"
                          onClick={() => setMobileMenuOpen(false)}
                          style={{
                            fontSize: '13px',
                            fontWeight: 600,
                            color: '#2563EB',
                            padding: '6px 0 2px',
                          }}
                        >
                          View All Products →
                        </Link>
                      </div>
                    )}
                  </div>
                );
              }

              if (link.hasCompanyDropdown) {
                return (
                  <div key={link.label} style={{ display: 'flex', flexDirection: 'column' }}>
                    <button
                      type="button"
                      onClick={() => setMobileCompanyOpen(!mobileCompanyOpen)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '15px',
                        fontWeight: 600,
                        color: isActive(link.href) ? '#2563EB' : '#1E293B',
                        padding: '10px 0',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                        width: '100%',
                      }}
                    >
                      <span>{link.label}</span>
                      <ChevronDown
                        size={16}
                        style={{
                          transform: mobileCompanyOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s ease',
                        }}
                      />
                    </button>

                    {mobileCompanyOpen && (
                      <div
                        style={{
                          paddingLeft: '14px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                          borderLeft: '2px solid #E2E8F0',
                          margin: '4px 0 10px 6px',
                        }}
                      >
                        <Link
                          href="/about"
                          onClick={() => setMobileMenuOpen(false)}
                          style={{
                            fontSize: '14px',
                            fontWeight: 500,
                            color: '#475569',
                            padding: '4px 0',
                          }}
                        >
                          About Kavach
                        </Link>
                        <Link
                          href="/about#team"
                          onClick={() => setMobileMenuOpen(false)}
                          style={{
                            fontSize: '14px',
                            fontWeight: 500,
                            color: '#475569',
                            padding: '4px 0',
                          }}
                        >
                          Team
                        </Link>
                        <Link
                          href="/contact"
                          onClick={() => setMobileMenuOpen(false)}
                          style={{
                            fontSize: '14px',
                            fontWeight: 500,
                            color: '#475569',
                            padding: '4px 0',
                          }}
                        >
                          Contact Us
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            setMobileMenuOpen(false);
                            setFeedbackOpen(true);
                          }}
                          style={{
                            fontSize: '14px',
                            fontWeight: 500,
                            color: '#475569',
                            padding: '4px 0',
                            background: 'none',
                            border: 'none',
                            textAlign: 'left',
                            cursor: 'pointer',
                          }}
                        >
                          Share Product Feedback
                        </button>
                      </div>
                    )}
                  </div>
                );
              }

              if (link.isModalAction) {
                return (
                  <button
                    key={link.label}
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      if (onOpenExpert) {
                        onOpenExpert();
                      } else {
                        setBookDemoOpen(true);
                      }
                    }}
                    style={{
                      fontSize: '15px',
                      fontWeight: 600,
                      color: '#1E293B',
                      padding: '10px 0',
                      background: 'none',
                      border: 'none',
                      textAlign: 'left',
                      cursor: 'pointer',
                      width: '100%',
                    }}
                  >
                    {link.label}
                  </button>
                );
              }

              return (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    fontSize: '15px',
                    fontWeight: 600,
                    color: isActive(link.href) ? '#2563EB' : '#1E293B',
                    padding: '10px 0',
                  }}
                >
                  {link.label}
                </Link>
              );
            })}

            <div style={{ height: '1px', backgroundColor: '#E2E8F0', margin: '8px 0' }} />

            {/* Mobile Auth Actions */}
            {isLoggedIn ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <Link
                  href="/home"
                  onClick={(e) => {
                    setMobileMenuOpen(false);
                    void handleConsoleClick(e);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '12px 16px',
                    backgroundColor: '#09090B',
                    color: '#FFFFFF',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  <span>Console</span>
                  <ArrowUpRight size={15} />
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  style={{
                    padding: '11px 16px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    color: '#EF4444',
                    fontWeight: 600,
                    fontSize: '14px',
                    textAlign: 'center',
                    cursor: 'pointer',
                  }}
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <Link
                  href="/signup"
                  onClick={() => {
                    setHeaderActiveBtn('get-started');
                    setMobileMenuOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '12px 16px',
                    backgroundColor: '#09090B',
                    color: '#FFFFFF',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 600,
                    textDecoration: 'none',
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    boxShadow: headerActiveBtn === 'get-started' ? '0 0 0 3px rgba(15, 23, 42, 0.18)' : 'none',
                  }}
                >
                  Get Started
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setHeaderActiveBtn('book-demo');
                    setMobileMenuOpen(false);
                    if (onOpenExpert) {
                      onOpenExpert();
                    } else {
                      setBookDemoOpen(true);
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '11px 16px',
                    borderRadius: '8px',
                    border: headerActiveBtn === 'book-demo' ? '1px solid #09090B' : '1px solid #E4E4E7',
                    backgroundColor: headerActiveBtn === 'book-demo' ? '#09090B' : '#F4F4F5',
                    color: headerActiveBtn === 'book-demo' ? '#FFFFFF' : '#18181B',
                    fontWeight: 600,
                    fontSize: '14px',
                    cursor: 'pointer',
                    width: '100%',
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    boxShadow: headerActiveBtn === 'book-demo' ? '0 0 0 3px rgba(15, 23, 42, 0.14)' : 'none',
                  }}
                >
                  Book Now
                </button>
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '11px 16px',
                    borderRadius: '8px',
                    color: '#0F172A',
                    fontWeight: 600,
                    fontSize: '14px',
                    textDecoration: 'none',
                  }}
                >
                  Sign In
                </Link>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                if (onOpenExpert) onOpenExpert();
              }}
              style={{
                marginTop: '4px',
                padding: '11px 16px',
                borderRadius: '8px',
                border: '1px solid #BFDBFE',
                backgroundColor: '#EFF6FF',
                color: '#1D4ED8',
                fontWeight: 600,
                fontSize: '14px',
                textAlign: 'center',
              }}
            >
              Talk to an Expert
            </button>
          </div>
        )}

        <style>{`
        @keyframes fadeInSlide {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @media (min-width: 980px) {
          .desktop-nav {
            display: flex !important;
          }
          .mobile-toggle {
            display: none !important;
          }
          .header-desktop-btn {
            display: inline-flex !important;
          }
        }
        @media (max-width: 580px) {
          .auth-header-subtext {
            display: none !important;
          }
        }
        @media (max-width: 979px) {
          .desktop-nav {
            display: none !important;
          }
          .mobile-toggle {
            display: inline-flex !important;
          }
          .header-desktop-btn {
            display: none !important;
          }
        }
      `}</style>

      </header>

      {/* Internal Search Modal for Pages without explicit onOpenSearch */}
      <SearchModal
        isOpen={onOpenSearch ? false : internalSearchOpen}
        onClose={() => setInternalSearchOpen(false)}
      />

      {/* Official Cal.com-powered Book a Demo Modal */}
      <BookDemoModal
        isOpen={onOpenExpert ? false : bookDemoOpen}
        onClose={() => setBookDemoOpen(false)}
      />

      {/* Product Feedback Modal */}
      <FeedbackModal
        isOpen={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
      />
    </>
  );
};

export const KavachHeader = SecuLayerHeader;

