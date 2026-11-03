'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Network,
  ChevronDown,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { useScope } from '@/context/ScopeContext';

export interface KavachApiLayoutProps {
  children: React.ReactNode;
  activeApiId?: string;
  onSelectApiId?: (id: string) => void;
  subnavTabs?: Array<{ id: string; label: string; href?: string; active?: boolean; onClick?: () => void }>;
  headerAction?: React.ReactNode;
}

export function KavachApiLayout({
  children,
  activeApiId,
  onSelectApiId,
  subnavTabs,
  headerAction,
}: KavachApiLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [apis, setApis] = useState<any[]>([]);
  const [selectedApi, setSelectedApi] = useState<any | null>(null);
  const [isApiDropdownOpen, setIsApiDropdownOpen] = useState(false);
  const [isLoadingApis, setIsLoadingApis] = useState(false);
  const apiDropdownRef = useRef<HTMLDivElement>(null);

  const { currentProject } = useScope();

  // Close API dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (apiDropdownRef.current && !apiDropdownRef.current.contains(event.target as Node)) {
        setIsApiDropdownOpen(false);
      }
    }
    if (isApiDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isApiDropdownOpen]);

  // Fetch available APIs for the switcher
  useEffect(() => {
    let mounted = true;
    setIsLoadingApis(true);
    api.apiSecurity
      .apis({ projectId: currentProject?.id || undefined })
      .then((res) => {
        if (!mounted) return;
        const items = res.items || [];
        setApis(items);
        if (items.length > 0) {
          if (activeApiId) {
            const found = items.find((a: any) => a.id === activeApiId);
            setSelectedApi(found || items[0]);
          } else {
            setSelectedApi(items[0]);
          }
        }
      })
      .catch((err) => {
        console.error('Failed to load APIs for switcher:', err);
      })
      .finally(() => {
        if (mounted) setIsLoadingApis(false);
      });

    return () => {
      mounted = false;
    };
  }, [activeApiId, currentProject?.id]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        width: '100%',
        minHeight: 0,
        backgroundColor: '#F8FAFC',
        color: '#0F172A',
        fontFamily: "var(--font-sans, 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif)",
      }}
    >
      {/* ── Sub-Navigation / API Target Context Bar ── */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0',
          padding: '8px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        {/* Left: API Target Selector Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {selectedApi ? (
            <div style={{ position: 'relative' }} ref={apiDropdownRef}>
              <button
                type="button"
                onClick={() => setIsApiDropdownOpen(!isApiDropdownOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  color: '#0F172A',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s, border-color 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#F1F5F9';
                  e.currentTarget.style.borderColor = '#CBD5E1';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#F8FAFC';
                  e.currentTarget.style.borderColor = '#E2E8F0';
                }}
              >
                <div
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '4px',
                    backgroundColor: '#0F172A',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                    fontSize: '9px',
                    fontWeight: 800,
                  }}
                >
                  API
                </div>
                <span>{selectedApi.name}</span>
                <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 500 }}>
                  v{selectedApi.version || '1.0'}
                </span>
                <ChevronDown size={13} color="#64748B" />
              </button>

              {/* API Dropdown Menu */}
              {isApiDropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    left: 0,
                    width: '280px',
                    maxHeight: '320px',
                    overflowY: 'auto',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
                    zIndex: 60,
                    padding: '6px',
                  }}
                >
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748B', padding: '6px 8px 4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Select Target API ({apis.length})
                  </div>
                  {apis.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => {
                        setSelectedApi(a);
                        setIsApiDropdownOpen(false);
                        if (onSelectApiId) onSelectApiId(a.id);
                        if (pathname.includes('/apis/')) {
                          const newPath = pathname.replace(/\/apis\/[^/?#]+/, `/apis/${a.id}`);
                          router.push(newPath);
                        } else if (pathname.includes('apiId=')) {
                          const url = new URL(window.location.href);
                          url.searchParams.set('apiId', a.id);
                          router.push(url.pathname + url.search);
                        }
                      }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '8px 10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: selectedApi.id === a.id ? '#F1F5F9' : 'transparent',
                        color: selectedApi.id === a.id ? '#09090B' : '#0F172A',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '12.5px',
                        fontWeight: 500,
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                        <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
                        <span style={{ fontSize: '11px', color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.base_url}</span>
                      </div>
                      <span style={{ fontSize: '10px', color: '#64748B', backgroundColor: '#F1F5F9', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 600 }}>{a.environment || 'prod'}</span>
                    </button>
                  ))}
                  <div style={{ borderTop: '1px solid #F1F5F9', marginTop: '6px', paddingTop: '6px' }}>
                    <Link
                      href="/api-security/apis?add=true"
                      onClick={() => setIsApiDropdownOpen(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 8px',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#0F172A',
                        textDecoration: 'none',
                        borderRadius: '4px',
                      }}
                    >
                      <Plus size={13} />
                      <span>Add New API Target</span>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '6px',
                  backgroundColor: '#F1F5F9',
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Network size={14} color="#0F172A" />
              </div>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                API Security Testing &amp; Governance
              </span>
            </div>
          )}
        </div>

        {/* Right: Header Action (e.g. Run Scan button) */}
        {headerAction && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {headerAction}
          </div>
        )}
      </div>

      {/* ── Sub-Header Tabs (if specified) ── */}
      {subnavTabs && subnavTabs.length > 0 && (
        <div
          className="kavach-tabs-scrollable"
          style={{
            backgroundColor: '#FFFFFF',
            borderBottom: '1px solid #E2E8F0',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          {subnavTabs.map((tab) => {
            const active = Boolean(tab.active);
            if (tab.href) {
              return (
                <Link
                  key={tab.id}
                  href={tab.href}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '10px 2px',
                    fontSize: '13px',
                    fontWeight: active ? 600 : 500,
                    color: active ? '#09090B' : '#64748B',
                    borderBottom: active ? '2px solid #09090B' : '2px solid transparent',
                    textDecoration: 'none',
                    transition: 'all 0.15s',
                  }}
                >
                  {tab.label}
                </Link>
              );
            }
            return (
              <button
                key={tab.id}
                type="button"
                onClick={tab.onClick}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '10px 2px',
                  fontSize: '13px',
                  fontWeight: active ? 600 : 500,
                  color: active ? '#09090B' : '#64748B',
                  borderBottom: active ? '2px solid #09090B' : '2px solid transparent',
                  transition: 'all 0.15s',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Page Content Body ── */}
      <main className="kavach-page-container" style={{ flex: 1, minHeight: 0, padding: '24px 28px', maxWidth: '1600px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        {children}
      </main>
    </div>
  );
}
