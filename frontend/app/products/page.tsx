'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Code2,
  Cloud,
  Target,
  Shield,
  Bot,
  Database,
  Network,
  Radio,
  SlidersHorizontal,
  ArrowRight,
  Sparkles,
  Layers,
  CheckCircle2,
  Lock,
  Zap,
} from 'lucide-react';
import { SecuLayerHeader } from '@/components/navigation/SecuLayerHeader';
import { SearchModal } from '@/components/common/SearchModal';
import { TalkToExpertModal } from '@/components/common/TalkToExpertModal';

export default function KavachProductsPage() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [expertOpen, setExpertOpen] = useState(false);
  const [filterLayer, setFilterLayer] = useState<'all' | 'code' | 'cloud' | 'runtime' | 'ai' | 'ops'>('all');

  const products = [
    {
      id: 'code',
      title: 'Code',
      tagline: 'Secure your source code, dependencies and supply chain.',
      layer: 'code',
      icon: <Code2 size={24} color="#2563EB" />,
      color: '#2563EB',
      bg: '#EFF6FF',
      border: '#BFDBFE',
      href: '/products/code',
      metrics: 'SAST, SCA, Secrets & IaC',
    },
    {
      id: 'cloud',
      title: 'Cloud',
      tagline: 'Secure multi-cloud environments and infrastructure.',
      layer: 'cloud',
      icon: <Cloud size={24} color="#059669" />,
      color: '#059669',
      bg: '#ECFDF5',
      border: '#A7F3D0',
      href: '/products/cloud',
      metrics: 'CSPM, KSPM & Compliance',
    },
    {
      id: 'attack',
      title: 'Attack',
      tagline: 'Simulate attacks and validate your security posture.',
      layer: 'ops',
      icon: <Target size={24} color="#DC2626" />,
      color: '#DC2626',
      bg: '#FEF2F2',
      border: '#FECACA',
      href: '/products/attack',
      metrics: 'BAS, DAST & Pentesting',
    },
    {
      id: 'protect',
      title: 'Protect',
      tagline: 'Runtime security for applications and workloads.',
      layer: 'runtime',
      icon: <Shield size={24} color="#7C3AED" />,
      color: '#7C3AED',
      bg: '#F5F3FF',
      border: '#DDD6FE',
      href: '/products/protect',
      metrics: 'eBPF & Container Defense',
    },
    {
      id: 'agent',
      title: 'Agent',
      tagline: 'AI-powered security agents for autonomous protection.',
      layer: 'ai',
      icon: <Bot size={24} color="#D97706" />,
      color: '#D97706',
      bg: '#FFFBEB',
      border: '#FDE68A',
      href: '/products/agent',
      metrics: 'Autonomous Triage & Patching',
    },
    {
      id: 'data',
      title: 'Data',
      tagline: 'Discover, classify and protect sensitive data.',
      layer: 'cloud',
      icon: <Database size={24} color="#0284C7" />,
      color: '#0284C7',
      bg: '#F0F9FF',
      border: '#BAE6FD',
      href: '/products/data',
      metrics: 'DSPM & PII Classification',
    },
    {
      id: 'graph',
      title: 'Graph',
      tagline: 'Security knowledge graph for deeper insights.',
      layer: 'ops',
      icon: <Network size={24} color="#E11D48" />,
      color: '#E11D48',
      bg: '#FFF1F2',
      border: '#FECDD3',
      href: '/products/graph',
      metrics: 'Attack Paths & Blast Radius',
    },
    {
      id: 'intelligence',
      title: 'Intelligence',
      tagline: 'Real-time threat intelligence and contextual analysis.',
      layer: 'ops',
      icon: <Radio size={24} color="#4F46E5" />,
      color: '#4F46E5',
      bg: '#EEF2FF',
      border: '#C7D2FE',
      href: '/products/intelligence',
      metrics: 'Global Feeds & CVE Context',
    },
    {
      id: 'soc',
      title: 'SOC',
      tagline: 'Modern security operations for faster response.',
      layer: 'ops',
      icon: <SlidersHorizontal size={24} color="#0D9488" />,
      color: '#0D9488',
      bg: '#F0FDFA',
      border: '#99F6E4',
      href: '/products/soc',
      metrics: 'Incident Response & Playbooks',
    },
  ];

  const filteredProducts = products.filter(
    (p) => filterLayer === 'all' || p.layer === filterLayer
  );

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FFFFFF', display: 'flex', flexDirection: 'column' }}>
      {/* Top Header */}
      <SecuLayerHeader
        onOpenSearch={() => setSearchOpen(true)}
        onOpenExpert={() => setExpertOpen(true)}
      />

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '48px 24px 80px', maxWidth: '1360px', margin: '0 auto', width: '100%' }}>
        {/* Hero Section */}
        <div style={{ maxWidth: '800px', marginBottom: '36px' }}>
          <div>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                borderRadius: '16px',
                backgroundColor: '#EFF6FF',
                border: '1px solid #BFDBFE',
                color: '#2563EB',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                marginBottom: '14px',
              }}
            >
              <Layers size={13} />
              Products
            </span>
          </div>

          <h1
            style={{
              fontSize: '44px',
              fontWeight: 800,
              color: '#0F172A',
              letterSpacing: '-0.03em',
              lineHeight: 1.15,
              margin: '0 0 14px 0',
              fontFamily: 'var(--font-sans)',
            }}
          >
            Purpose-built security products for every layer of your stack.
          </h1>

          <p
            style={{
              fontSize: '16px',
              color: '#475569',
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            Choose the products you need or get the complete platform. All products work together for unified security
            and visibility.
          </p>
        </div>

        {/* Layer Filters */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '32px',
            flexWrap: 'wrap',
          }}
        >
          {[
            { id: 'all', label: 'All Products' },
            { id: 'code', label: 'Code & Build' },
            { id: 'cloud', label: 'Cloud & Infra' },
            { id: 'runtime', label: 'Runtime & Workloads' },
            { id: 'ai', label: 'AI & Autonomous' },
            { id: 'ops', label: 'Operations & SOC' },
          ].map((btn) => {
            const isSelected = filterLayer === btn.id;
            return (
              <button
                key={btn.id}
                onClick={() => setFilterLayer(btn.id as any)}
                style={{
                  fontSize: '13px',
                  fontWeight: isSelected ? 600 : 500,
                  color: isSelected ? '#2563EB' : '#475569',
                  backgroundColor: isSelected ? '#EFF6FF' : '#F8FAFC',
                  border: `1px solid ${isSelected ? '#BFDBFE' : '#E2E8F0'}`,
                  padding: '6px 14px',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {btn.label}
              </button>
            );
          })}
        </div>

        {/* 9 Product Cards Grid (3 columns x 3 rows) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '24px',
          }}
          className="products-grid"
        >
          {filteredProducts.map((p) => (
            <div
              key={p.id}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: '190px',
                transition: 'all 0.15s ease',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#CBD5E1';
                e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.07)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#E2E8F0';
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.04)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '8px',
                      backgroundColor: p.bg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {p.icon}
                  </div>
                  <span
                    style={{
                      fontSize: '11px',
                      color: '#64748B',
                      backgroundColor: '#F8FAFC',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      border: '1px solid #E2E8F0',
                    }}
                  >
                    {p.metrics}
                  </span>
                </div>

                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: '0 0 6px 0' }}>
                  {p.title}
                </h3>

                <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5, margin: 0 }}>
                  {p.tagline}
                </p>
              </div>

              <div style={{ marginTop: '20px', paddingTop: '14px', borderTop: '1px solid #F1F5F9' }}>
                <Link
                  href={p.href}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#2563EB',
                  }}
                >
                  <span>Learn More</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* 10th Card: Full-width Control Plane Banner */}
        <div
          style={{
            marginTop: '32px',
            backgroundColor: '#F8FAFC',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            padding: '24px 28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '8px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #CBD5E1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0F172A',
              }}
            >
              <SlidersHorizontal size={22} />
            </div>
            <div>
              <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: '0 0 4px 0' }}>
                Control Plane
              </h4>
              <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>
                Unified management, policies and governance across your security stack.
              </p>
            </div>
          </div>

          <Link
            href="/platform"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 18px',
              backgroundColor: '#0F172A',
              color: '#FFFFFF',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '13px',
            }}
          >
            <span>Learn More</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </main>

      {/* Global Modals */}
      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
      <TalkToExpertModal isOpen={expertOpen} onClose={() => setExpertOpen(false)} />

      <style jsx>{`
        @media (max-width: 1024px) {
          .products-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 640px) {
          .products-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
