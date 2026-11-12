'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChevronRight,
  ArrowRight,
  ExternalLink,
  BookOpen,
} from 'lucide-react';
import { SecuLayerHeader } from '@/components/navigation/SecuLayerHeader';
import { SearchModal } from '@/components/common/SearchModal';
import { TalkToExpertModal } from '@/components/common/TalkToExpertModal';

export interface ProductSidebarItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
  href?: string;
  badge?: string;
}

export interface ProductTabItem {
  id: string;
  label: string;
  count?: number;
}

export interface ProductPageShellProps {
  productKey?: 'attack' | 'protect' | 'agent' | 'data' | 'graph' | 'cloud' | 'code' | string;
  activeProductId?: string;
  productTitle?: string;
  title?: string;
  categoryBadge?: string;
  category?: string;
  heroTitle?: string;
  heroDescription?: string;
  primaryButtonLabel?: string;
  onPrimaryAction?: () => void;
  secondaryButtonLabel?: string;
  onSecondaryAction?: () => void;
  sidebarItems: ProductSidebarItem[];
  activeSidebarId: string;
  onSelectSidebar?: (id: string) => void;
  tabs: ProductTabItem[];
  activeTabId: string;
  onSelectTab: (id: string) => void;
  filterBar?: React.ReactNode;
  filterControls?: React.ReactNode;
  children?: React.ReactNode;
}

export const ProductPageShell: React.FC<ProductPageShellProps> = (props) => {
  const {
    productTitle = props.title || 'Kavach Security Product',
    categoryBadge = props.category || 'DEFENSIVE SECURITY CONTROL',
    heroTitle = 'Deterministic Security Control Plane',
    heroDescription = 'Continuously discover, evaluate and protect your assets with policy enforcement and runtime evidence.',
    primaryButtonLabel = 'Get Started',
    onPrimaryAction,
    secondaryButtonLabel = 'View Documentation',
    onSecondaryAction,
    sidebarItems,
    activeSidebarId,
    onSelectSidebar,
    tabs,
    activeTabId,
    onSelectTab,
    filterBar = props.filterControls,
    children,
  } = props;
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [expertOpen, setExpertOpen] = useState(false);

  const handlePrimaryClick = () => {
    if (onPrimaryAction) {
      onPrimaryAction();
    } else {
      setExpertOpen(true);
    }
  };

  const handleSecondaryClick = () => {
    if (onSecondaryAction) {
      onSecondaryAction();
    } else {
      window.open('https://docs.kavachsecurity.me', '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FFFFFF', display: 'flex', flexDirection: 'column' }}>
      {/* Top SecuLayer Navigation Header */}
      <SecuLayerHeader
        onOpenSearch={() => setSearchOpen(true)}
        onOpenExpert={() => setExpertOpen(true)}
      />

      {/* Main Page Layout Container */}
      <div style={{ width: '100%', maxWidth: '1440px', margin: '0 auto', padding: '16px 24px 60px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Breadcrumb row: Home > Products > [Product] */}
        <nav
          aria-label="Breadcrumb"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
            color: '#64748B',
            marginBottom: '20px',
          }}
        >
          <Link href="/" style={{ color: '#64748B', textDecoration: 'none', transition: 'color 0.15s' }} className="hover:text-slate-900">
            Home
          </Link>
          <ChevronRight size={13} style={{ color: '#94A3B8' }} />
          <Link href="/products" style={{ color: '#64748B', textDecoration: 'none', transition: 'color 0.15s' }} className="hover:text-slate-900">
            Products
          </Link>
          <ChevronRight size={13} style={{ color: '#94A3B8' }} />
          <span style={{ color: '#0F172A', fontWeight: 600 }}>{productTitle}</span>
        </nav>

        {/* Two-Column Workspace Layout */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '220px 1fr',
            gap: '32px',
            alignItems: 'start',
            flex: 1,
          }}
          className="product-workspace-grid"
        >
          {/* LEFT SIDEBAR */}
          <aside
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              borderRight: '1px solid #E2E8F0',
              paddingRight: '18px',
              minHeight: '680px',
            }}
          >
            {/* Sidebar Title */}
            <div style={{ padding: '0 8px 14px', borderBottom: '1px solid #F1F5F9', marginBottom: '8px' }}>
              <h2
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  color: '#0F172A',
                  letterSpacing: '-0.02em',
                  margin: 0,
                  fontFamily: 'var(--font-sans)',
                }}
              >
                {productTitle}
              </h2>
            </div>

            {/* Sidebar Nav Items */}
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {sidebarItems.map((item) => {
                const isActive = activeSidebarId === item.id;
                const IconComponent = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      if (onSelectSidebar) {
                        onSelectSidebar(item.id);
                      } else if (item.href) {
                        router.push(item.href);
                      }
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? '#2563EB' : '#475569',
                      backgroundColor: isActive ? '#EFF6FF' : 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                    }}
                    className={!isActive ? 'hover:bg-slate-50 hover:text-slate-900' : ''}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                      <IconComponent
                        size={16}
                        style={{
                          color: isActive ? '#2563EB' : '#64748B',
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.label}
                      </span>
                    </div>

                    {item.badge && (
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '1px 5px',
                          borderRadius: '10px',
                          backgroundColor: isActive ? '#DBEAFE' : '#F1F5F9',
                          color: isActive ? '#1D4ED8' : '#64748B',
                        }}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* RIGHT MAIN CONTENT */}
          <main style={{ display: 'flex', flexDirection: 'column', gap: '22px', minWidth: 0 }}>
            {/* Top Hero Section */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '24px',
                paddingBottom: '20px',
                borderBottom: '1px solid #F1F5F9',
              }}
              className="product-hero-container"
            >
              <div style={{ maxWidth: '820px' }}>
                <span
                  style={{
                    display: 'inline-block',
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    color: '#2563EB',
                    textTransform: 'uppercase',
                    marginBottom: '8px',
                    fontFamily: 'var(--font-mono, monospace)',
                  }}
                >
                  {categoryBadge}
                </span>
                <h1
                  style={{
                    fontSize: '32px',
                    fontWeight: 800,
                    color: '#0F172A',
                    letterSpacing: '-0.03em',
                    lineHeight: 1.2,
                    margin: '0 0 10px 0',
                    fontFamily: 'var(--font-sans)',
                  }}
                >
                  {heroTitle}
                </h1>
                <p
                  style={{
                    fontSize: '14px',
                    color: '#475569',
                    lineHeight: 1.55,
                    margin: 0,
                    maxWidth: '740px',
                  }}
                >
                  {heroDescription}
                </p>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={handlePrimaryClick}
                  style={{
                    backgroundColor: '#0F172A',
                    color: '#FFFFFF',
                    border: '1px solid #0F172A',
                    padding: '9px 18px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                  }}
                  className="hover:bg-slate-800"
                >
                  {primaryButtonLabel}
                </button>

                <button
                  type="button"
                  onClick={handleSecondaryClick}
                  style={{
                    backgroundColor: '#FFFFFF',
                    color: '#0F172A',
                    border: '1px solid #CBD5E1',
                    padding: '9px 16px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  className="hover:bg-slate-50 hover:border-slate-300"
                >
                  {secondaryButtonLabel}
                </button>
              </div>
            </div>

            {/* Sub-Navigation Tabs Row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '24px',
                borderBottom: '1px solid #E2E8F0',
                paddingBottom: '2px',
                overflowX: 'auto',
              }}
            >
              {tabs.map((tab) => {
                const isActive = activeTabId === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => onSelectTab(tab.id)}
                    style={{
                      position: 'relative',
                      padding: '8px 4px 12px',
                      fontSize: '13px',
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? '#0F172A' : '#64748B',
                      border: 'none',
                      backgroundColor: 'transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      whiteSpace: 'nowrap',
                      transition: 'color 0.15s ease',
                    }}
                    className={!isActive ? 'hover:text-slate-900' : ''}
                  >
                    <span>{tab.label}</span>
                    {tab.count !== undefined && (
                      <span
                        style={{
                          fontSize: '11px',
                          padding: '1px 6px',
                          borderRadius: '10px',
                          backgroundColor: isActive ? '#EFF6FF' : '#F1F5F9',
                          color: isActive ? '#2563EB' : '#64748B',
                          fontWeight: 600,
                        }}
                      >
                        {tab.count}
                      </span>
                    )}
                    {isActive && (
                      <span
                        style={{
                          position: 'absolute',
                          bottom: '-1px',
                          left: 0,
                          right: 0,
                          height: '2px',
                          backgroundColor: '#2563EB',
                          borderRadius: '2px 2px 0 0',
                        }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Filter Bar if provided */}
            {filterBar && (
              <div style={{ width: '100%' }}>
                {filterBar}
              </div>
            )}

            {/* Main Interactive Table / View Content */}
            <div style={{ width: '100%', minHeight: '400px' }}>
              {children}
            </div>
          </main>
        </div>
      </div>

      {/* Global Modals */}
      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
      <TalkToExpertModal isOpen={expertOpen} onClose={() => setExpertOpen(false)} />
    </div>
  );
};
