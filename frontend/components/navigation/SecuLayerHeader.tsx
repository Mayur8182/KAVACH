'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    const handleOpenBookDemo = () => {
      if (onOpenExpert) {
        onOpenExpert();
      } else {
        setBookDemoOpen(true);
      }
    };
    window.addEventListener('kavach:open-book-demo', handleOpenBookDemo);
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
    return () => window.removeEventListener('kavach:open-book-demo', handleOpenBookDemo);
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

  // Products hover dropdown state & timeout
  const [isProductsDropdownOpen, setIsProductsDropdownOpen] = useState(false);
  const dropdownTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnterProducts = () => {
    if (dropdownTimeoutRef.current) {
      clearTimeout(dropdownTimeoutRef.current);
    }
    setIsProductsDropdownOpen(true);
  };

  const handleMouseLeaveProducts = () => {
    dropdownTimeoutRef.current = setTimeout(() => {
      setIsProductsDropdownOpen(false);
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
    hasCompanyDropdown?: boolean;
    external?: boolean;
    isModalAction?: boolean;
  }> = [
    { label: 'Products', href: '/products', hasDropdown: true },
    { label: 'Solutions', href: '/solutions' },
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
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E2E8F0',
        width: '100%',
        backdropFilter: 'blur(8px)',
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
            {/* Desktop Navigation Links */}
            <nav
          style={{
            display: 'none',
            alignItems: 'center',
            gap: '28px',
          }}
          className="desktop-nav"
        >
          {navLinks.map((link) => {
            const active = isActive(link.href);

            // Handle Products with hover dropdown
            if (link.hasDropdown) {
              return (
                <div
                  key={link.label}
                  onMouseEnter={handleMouseEnterProducts}
                  onMouseLeave={handleMouseLeaveProducts}
                  style={{ position: 'relative', padding: '16px 0' }}
                >
                  <Link
                    href={link.href}
                    style={{
                      fontSize: '14px',
                      fontWeight: active ? 600 : 500,
                      color: active ? '#0F172A' : '#475569',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      position: 'relative',
                      padding: '6px 0',
                      transition: 'color 0.15s ease',
                      cursor: 'pointer',
                    }}
                  >
                    <span>{link.label}</span>
                    <ChevronDown
                      size={14}
                      style={{
                        transform: isProductsDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease',
                        opacity: 0.7,
                      }}
                    />
                    {active && (
                      <span
                        style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          height: '2px',
                          backgroundColor: '#09090B',
                          borderRadius: '2px',
                        }}
                      />
                    )}
                  </Link>

                  {/* Products Dropdown (Complete suite of Kavach Security Products) */}
                  {isProductsDropdownOpen && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: '-20px',
                        width: '280px',
                        maxHeight: '480px',
                        overflowY: 'auto',
                        backgroundColor: '#FFFFFF',
                        borderRadius: '16px',
                        border: '1px solid #E2E8F0',
                        boxShadow:
                          '0 20px 35px -5px rgba(15, 23, 42, 0.12), 0 10px 15px -3px rgba(15, 23, 42, 0.06)',
                        padding: '12px',
                        zIndex: 100,
                        animation: 'fadeInSlide 0.18s ease-out forwards',
                      }}
                    >
                      {/* Dropdown Header with Icon */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '4px 8px 10px 8px',
                          borderBottom: '1px solid #F1F5F9',
                          marginBottom: '6px',
                        }}
                      >
                        <ShieldAlert size={16} color="#09090B" />
                        <span style={{ fontSize: '14px', fontWeight: 700, color: '#09090B' }}>Products</span>
                      </div>

                      {/* Clean Vertical Products List */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {[
                          { title: 'SAST & Code Security', href: '/code' },
                          { title: 'Secret Detection & Leaks', href: '/code/secrets' },
                          { title: 'SCA & Software Supply Chain', href: '/code/dependencies' },
                          { title: 'Container Security & Defense', href: '/protect/containers' },
                          { title: 'Cloud Security & CSPM', href: '/cloud' },
                          { title: 'IaC (Infrastructure as Code)', href: '/cloud/iac' },
                          { title: 'Universal API Security (OWASP)', href: '/api-security' },
                          { title: 'Model Security (AI / ML)', href: '/protect/models' },
                          { title: 'AI Agent Governance & MCP', href: '/agent' },
                          { title: 'Autonomous Sandbox AutoFix', href: '/remediation' },
                          { title: 'Kavach MCP Server', href: '/protect/mcp' },
                        ].map((prod) => (
                          <Link
                            key={prod.title}
                            href={prod.href}
                            onClick={() => setIsProductsDropdownOpen(false)}
                            style={{
                              display: 'block',
                              padding: '7px 10px',
                              borderRadius: '8px',
                              fontSize: '13px',
                              fontWeight: 500,
                              color: '#334155',
                              textDecoration: 'none',
                              transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#F8FAFC';
                              e.currentTarget.style.color = '#09090B';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                              e.currentTarget.style.color = '#334155';
                            }}
                          >
                            {prod.title}
                          </Link>
                        ))}
                      </div>

                      {/* Dropdown Footer Link */}
                      <div
                        style={{
                          marginTop: '6px',
                          paddingTop: '6px',
                          borderTop: '1px solid #F1F5F9',
                        }}
                      >
                        <Link
                          href="/products"
                          onClick={() => setIsProductsDropdownOpen(false)}
                          style={{
                            display: 'block',
                            padding: '6px 10px',
                            borderRadius: '8px',
                            fontSize: '12.5px',
                            fontWeight: 600,
                            color: '#09090B',
                            textDecoration: 'none',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#F8FAFC';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          View all products →
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              );
            }

            // Handle Company with hover dropdown
            if (link.hasCompanyDropdown) {
              return (
                <div
                  key={link.label}
                  onMouseEnter={handleMouseEnterCompany}
                  onMouseLeave={handleMouseLeaveCompany}
                  style={{ position: 'relative', padding: '16px 0' }}
                >
                  <Link
                    href={link.href}
                    style={{
                      fontSize: '14px',
                      fontWeight: active ? 600 : 500,
                      color: active ? '#0F172A' : '#475569',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      position: 'relative',
                      padding: '6px 0',
                      transition: 'color 0.15s ease',
                      cursor: 'pointer',
                    }}
                  >
                    <span>{link.label}</span>
                    <ChevronDown
                      size={14}
                      style={{
                        transform: isCompanyDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease',
                        opacity: 0.7,
                      }}
                    />
                    {active && (
                      <span
                        style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          height: '2px',
                          backgroundColor: '#09090B',
                          borderRadius: '2px',
                        }}
                      />
                    )}
                  </Link>

                  {/* Company Dropdown Card (Exact match to reference design) */}
                  {isCompanyDropdownOpen && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        right: '-20px',
                        width: '210px',
                        backgroundColor: '#FFFFFF',
                        borderRadius: '16px',
                        border: '1px solid #E2E8F0',
                        boxShadow:
                          '0 20px 35px -5px rgba(15, 23, 42, 0.12), 0 10px 15px -3px rgba(15, 23, 42, 0.06)',
                        padding: '12px',
                        zIndex: 100,
                        animation: 'fadeInSlide 0.18s ease-out forwards',
                      }}
                    >
                      {/* Dropdown Header with Users Icon */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '4px 8px 10px 8px',
                          borderBottom: '1px solid #F1F5F9',
                          marginBottom: '6px',
                        }}
                      >
                        <Users size={16} color="#09090B" />
                        <span style={{ fontSize: '14px', fontWeight: 700, color: '#09090B' }}>Company</span>
                      </div>

                      {/* Clean Vertical Company Links */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {/* 1. About Kavach */}
                        <Link
                          href="/about"
                          onClick={() => setIsCompanyDropdownOpen(false)}
                          style={{
                            display: 'block',
                            padding: '7px 10px',
                            borderRadius: '8px',
                            fontSize: '13.5px',
                            fontWeight: 500,
                            color: '#334155',
                            textDecoration: 'none',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#F8FAFC';
                            e.currentTarget.style.color = '#09090B';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.color = '#334155';
                          }}
                        >
                          About Kavach
                        </Link>

                        {/* 2. Team */}
                        <Link
                          href="/team"
                          onClick={() => setIsCompanyDropdownOpen(false)}
                          style={{
                            display: 'block',
                            padding: '7px 10px',
                            borderRadius: '8px',
                            fontSize: '13.5px',
                            fontWeight: 500,
                            color: '#334155',
                            textDecoration: 'none',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#F8FAFC';
                            e.currentTarget.style.color = '#09090B';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.color = '#334155';
                          }}
                        >
                          Team
                        </Link>

                        {/* 3. Careers */}
                        <Link
                          href="/careers"
                          onClick={() => setIsCompanyDropdownOpen(false)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '7px 10px',
                            borderRadius: '8px',
                            fontSize: '13.5px',
                            fontWeight: 500,
                            color: '#334155',
                            textDecoration: 'none',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#F8FAFC';
                            e.currentTarget.style.color = '#09090B';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.color = '#334155';
                          }}
                        >
                          <span>Careers</span>
                        </Link>

                        {/* 4. Contact Us */}
                        <Link
                          href="/contact"
                          onClick={() => setIsCompanyDropdownOpen(false)}
                          style={{
                            display: 'block',
                            padding: '7px 10px',
                            borderRadius: '8px',
                            fontSize: '13.5px',
                            fontWeight: 500,
                            color: '#334155',
                            textDecoration: 'none',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#F8FAFC';
                            e.currentTarget.style.color = '#09090B';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.color = '#334155';
                          }}
                        >
                          Contact Us
                        </Link>

                        {/* 5. Share Feedback (Interactive Modal) */}
                        <button
                          type="button"
                          onClick={() => {
                            setIsCompanyDropdownOpen(false);
                            setFeedbackOpen(true);
                          }}
                          style={{
                            display: 'block',
                            width: '100%',
                            textAlign: 'left',
                            padding: '7px 10px',
                            borderRadius: '8px',
                            fontSize: '13.5px',
                            fontWeight: 500,
                            color: '#334155',
                            backgroundColor: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#F8FAFC';
                            e.currentTarget.style.color = '#09090B';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.color = '#334155';
                          }}
                        >
                          Share Feedback
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            }

            return link.external ? (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                style={{
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#475569',
                  transition: 'color 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span>{link.label}</span>
                <ExternalLink size={12} style={{ opacity: 0.6 }} />
              </a>
            ) : link.isModalAction ? (
              <button
                key={link.label}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  if (onOpenExpert) {
                    onOpenExpert();
                  } else {
                    setBookDemoOpen(true);
                  }
                }}
                style={{
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#475569',
                  position: 'relative',
                  padding: '6px 0',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'color 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#0F172A')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#475569')}
              >
                {link.label}
              </button>
            ) : (
              <Link
                key={link.label}
                href={link.href}
                style={{
                  fontSize: '14px',
                  fontWeight: active ? 600 : 500,
                  color: active ? '#0F172A' : '#475569',
                  position: 'relative',
                  padding: '6px 0',
                  transition: 'color 0.15s ease',
                }}
              >
                {link.label}
                {active && (
                  <span
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: '2px',
                      backgroundColor: '#09090B',
                      borderRadius: '2px',
                    }}
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
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#27272A')}
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
                  color: '#18181B',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E4E4E7',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#F4F4F5';
                  e.currentTarget.style.borderColor = '#D4D4D8';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                  e.currentTarget.style.borderColor = '#E4E4E7';
                }}
              >
                <Calendar size={15} color="#18181B" />
                <span>Book a Demo</span>
              </button>

              <Link
                href="/signup"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '7px',
                  padding: '8px 20px',
                  minHeight: '42px',
                  backgroundColor: '#09090B',
                  color: '#FFFFFF',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  borderRadius: '12px',
                  textDecoration: 'none',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#27272A';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#09090B';
                }}
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
                onClick={() => setMobileMenuOpen(false)}
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
                }}
              >
                Get Started
              </Link>
              <button
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
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '11px 16px',
                  borderRadius: '8px',
                  border: '1px solid #E4E4E7',
                  backgroundColor: '#F4F4F5',
                  color: '#18181B',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                  width: '100%',
                }}
              >
                Book Demo
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

