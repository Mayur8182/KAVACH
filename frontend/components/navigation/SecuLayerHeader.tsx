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
} from 'lucide-react';
import { SearchModal } from '@/components/common/SearchModal';
import { KavachMark, KavachLogo } from '@/components/common/KavachLogo';

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
  const isMinimal = variant === 'minimal' || pathname === '/login' || pathname === '/register' || pathname === '/forgot-password';
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileProductsOpen, setMobileProductsOpen] = useState(false);
  const [internalSearchOpen, setInternalSearchOpen] = useState(false);
  const [currentHash, setCurrentHash] = useState('');

  useEffect(() => {
    setIsLoggedIn(!!getAuthToken());
  }, [pathname]);

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

  useEffect(() => {
    return () => {
      if (dropdownTimeoutRef.current) clearTimeout(dropdownTimeoutRef.current);
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
          href: '/onboarding?product=cloud&workspace=cloud',
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

  const navLinks: Array<{ label: string; href: string; hasDropdown?: boolean; external?: boolean }> = [
    { label: 'Platform', href: '/platform' },
    { label: 'Products', href: '/products', hasDropdown: true },
    { label: 'Solutions', href: '/solutions' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'Resources', href: '/resources' },
    { label: 'Demo', href: '/demo' },
    { label: 'Docs', href: '/docs' },
    { label: 'Company', href: '/contact' },
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

                  {/* Mega Menu Dropdown */}
                  {isProductsDropdownOpen && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: '-260px',
                        width: '840px',
                        backgroundColor: '#FFFFFF',
                        borderRadius: '16px',
                        border: '1px solid #CBD5E1',
                        boxShadow: '0 20px 35px -5px rgba(15, 23, 42, 0.15), 0 10px 15px -3px rgba(15, 23, 42, 0.08)',
                        padding: '24px 28px',
                        zIndex: 100,
                        animation: 'fadeInSlide 0.18s ease-out forwards',
                      }}
                    >
                      {/* Top Header inside Dropdown */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          borderBottom: '1px solid #F1F5F9',
                          paddingBottom: '14px',
                          marginBottom: '20px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              letterSpacing: '0.06em',
                              textTransform: 'uppercase',
                              color: '#2563EB',
                              backgroundColor: '#EFF6FF',
                              padding: '3px 8px',
                              borderRadius: '12px',
                              border: '1px solid #BFDBFE',
                            }}
                          >
                            SecuLayer Platform
                          </span>
                          <span style={{ fontSize: '13px', color: '#64748B' }}>
                            Unified security for development, cloud and autonomous runtimes
                          </span>
                        </div>
                        <Link
                          href="/products"
                          onClick={() => setIsProductsDropdownOpen(false)}
                          style={{
                            fontSize: '12px',
                            fontWeight: 600,
                            color: '#2563EB',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          View all products <ArrowRight size={13} />
                        </Link>
                      </div>

                      {/* 3-Column Categories Grid */}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(3, 1fr)',
                          gap: '24px',
                        }}
                      >
                        {productCategories.map((cat) => (
                          <div key={cat.group} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div
                              style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '0.06em',
                                color: '#94A3B8',
                                paddingLeft: '4px',
                              }}
                            >
                              {cat.group}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {cat.items.map((prod) => {
                                const IconComponent = prod.icon;
                                return (
                                  <Link
                                    key={prod.title}
                                    href={prod.href}
                                    onClick={() => setIsProductsDropdownOpen(false)}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'flex-start',
                                      gap: '12px',
                                      padding: '10px 10px',
                                      borderRadius: '10px',
                                      textDecoration: 'none',
                                      transition: 'background-color 0.15s ease, transform 0.15s ease',
                                    }}
                                    className="product-dropdown-item"
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.backgroundColor = '#F8FAFC';
                                      e.currentTarget.style.transform = 'translateX(2px)';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.backgroundColor = 'transparent';
                                      e.currentTarget.style.transform = 'translateX(0)';
                                    }}
                                  >
                                    <div
                                      style={{
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '8px',
                                        backgroundColor: prod.bg,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                        marginTop: '1px',
                                      }}
                                    >
                                      <IconComponent size={16} color={prod.color} />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span
                                          style={{
                                            fontSize: '13px',
                                            fontWeight: 600,
                                            color: '#0F172A',
                                          }}
                                        >
                                          {prod.title}
                                        </span>
                                        {prod.badge && (
                                          <span
                                            style={{
                                              fontSize: '9px',
                                              fontWeight: 700,
                                              padding: '1px 5px',
                                              borderRadius: '4px',
                                              backgroundColor: '#F4F4F5',
                                              border: '1px solid #E4E4E7',
                                              color: '#18181B',
                                            }}
                                          >
                                            {prod.badge}
                                          </span>
                                        )}
                                      </div>
                                      <span
                                        style={{
                                          fontSize: '11px',
                                          color: '#64748B',
                                          lineHeight: 1.35,
                                        }}
                                      >
                                        {prod.desc}
                                      </span>
                                    </div>
                                  </Link>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Dropdown Footer */}
                      <div
                        style={{
                          marginTop: '20px',
                          paddingTop: '16px',
                          borderTop: '1px solid #F1F5F9',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          backgroundColor: '#F8FAFC',
                          margin: '20px -28px -24px',
                          padding: '14px 28px',
                          borderBottomLeftRadius: '16px',
                          borderBottomRightRadius: '16px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#475569' }}>
                          <Sparkles size={14} color="#71717A" />
                          <span>All engines integrate with deterministic policy & runtime verification.</span>
                        </div>
                        <Link
                          href="/platform"
                          onClick={() => setIsProductsDropdownOpen(false)}
                          style={{
                            fontSize: '12px',
                            fontWeight: 600,
                            color: '#0F172A',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          Explore Control Plane Architecture <ArrowRight size={13} />
                        </Link>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {/* Search Trigger */}
          <button
            onClick={handleSearchClick}
            type="button"
            aria-label="Search SecuLayer"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '40px',
              minHeight: '40px',
              borderRadius: '6px',
              color: '#475569',
              backgroundColor: 'transparent',
              border: '1px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#F1F5F9';
              e.currentTarget.style.borderColor = '#E2E8F0';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.borderColor = 'transparent';
            }}
            title="Search code, cloud & findings (Cmd+K)"
          >
            <Search size={18} />
          </button>

          {/* Auth State CTAs */}
          {mounted && isLoggedIn ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Link
                href="/home"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  minHeight: '40px',
                  backgroundColor: '#09090B',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 600,
                  borderRadius: '8px',
                  textDecoration: 'none',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#27272A')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#09090B')}
              >
                <span>Console</span>
                <ArrowRight size={14} />
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="header-desktop-btn"
                style={{
                  padding: '8px 14px',
                  minHeight: '40px',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#64748B',
                  backgroundColor: 'transparent',
                  border: '1px solid #CBD5E1',
                  borderRadius: '8px',
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Link
                href="/login"
                className="header-desktop-btn"
                style={{
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '8px 14px',
                  minHeight: '40px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#0F172A',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#F1F5F9';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                Sign In
              </Link>
              <Link
                href="/demo"
                className="header-desktop-btn"
                style={{
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '8px 14px',
                  minHeight: '40px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#18181B',
                  backgroundColor: '#F4F4F5',
                  border: '1px solid #E4E4E7',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#E4E4E7';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#F4F4F5';
                }}
              >
                Book Demo
              </Link>
              <Link
                href="/signup"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '8px 16px',
                  minHeight: '40px',
                  backgroundColor: '#09090B',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 600,
                  borderRadius: '8px',
                  textDecoration: 'none',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#27272A';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#09090B';
                }}
              >
                Get Started
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
                onClick={() => setMobileMenuOpen(false)}
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
                <span>Go to Console</span>
                <ArrowRight size={15} />
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
              <Link
                href="/demo"
                onClick={() => setMobileMenuOpen(false)}
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
                  textDecoration: 'none',
                }}
              >
                Book Demo
              </Link>
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

      <style jsx>{`
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

      {/* Internal Search Modal for Pages without explicit onOpenSearch */}
      <SearchModal
        isOpen={onOpenSearch ? false : internalSearchOpen}
        onClose={() => setInternalSearchOpen(false)}
      />
    </header>
  );
};

export const KavachHeader = SecuLayerHeader;

