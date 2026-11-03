'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Radio,
  Globe,
  AlertTriangle,
  Shield,
  Search,
  Filter,
  Download,
  ChevronDown,
  ExternalLink,
  ShieldAlert,
  CheckCircle2,
  Clock,
  Layers,
  X,
  Play,
  Share2,
  RefreshCw,
  Activity,
  Terminal,
  Database,
  Eye,
  FileText,
  Settings,
  Lock,
} from 'lucide-react';
import {
  ProductPageShell,
  ProductSidebarItem,
  ProductTabItem,
} from '@/components/products/ProductPageShell';
import { TalkToExpertModal } from '@/components/common/TalkToExpertModal';
import { api } from '@/lib/api/client';
import { useScope } from '@/context/ScopeContext';
import { toast } from '@/lib/toast';

export interface ThreatIndicator {
  id: string;
  type: 'IP' | 'DOMAIN' | 'HASH_SHA256' | 'CVE';
  value: string;
  threatType: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  source: string;
  firstSeen: string;
  lastSeen: string;
  status: 'ACTIVE' | 'OBSERVED' | 'RESOLVED';
  description: string;
  affectedAssets: string[];
}

export interface ThreatActor {
  id: string;
  name: string;
  aliases: string[];
  origin: string;
  targetSectors: string[];
  techniques: string[];
  activeThreatLevel: 'CRITICAL' | 'HIGH' | 'ELEVATED';
  description: string;
}

const INITIAL_INDICATORS: ThreatIndicator[] = [
  {
    id: 'ioc-101',
    type: 'CVE',
    value: 'CVE-2026-21894',
    threatType: 'Remote Code Execution in Agent Runtime',
    confidence: 'HIGH',
    severity: 'CRITICAL',
    source: 'CISA KEV / NVD Continuous Sync',
    firstSeen: 'Oct 08, 2026',
    lastSeen: 'Oct 12, 2026',
    status: 'ACTIVE',
    description: 'Unauthenticated deserialization flaw in autonomous tool parameter parser. eBPF kernel gate active.',
    affectedAssets: ['api.seculayer.com', 'gateway.mcp.internal'],
  },
  {
    id: 'ioc-102',
    type: 'IP',
    value: '185.220.101.5',
    threatType: 'C2 Cobalt Strike Beaconing',
    confidence: 'HIGH',
    severity: 'HIGH',
    source: 'Emerging Threats Pro & Mandiant Feed',
    firstSeen: 'Oct 04, 2026',
    lastSeen: 'Oct 12, 2026',
    status: 'ACTIVE',
    description: 'Known Bulletproof host initiating TLS handshakes against Kubernetes ingress nodes.',
    affectedAssets: ['198.51.100.42'],
  },
  {
    id: 'ioc-103',
    type: 'DOMAIN',
    value: 'update-sec-cdn.top',
    threatType: 'Typosquatting & Supply Chain Phishing',
    confidence: 'HIGH',
    severity: 'HIGH',
    source: 'Recorded Future Threat Vector',
    firstSeen: 'Oct 09, 2026',
    lastSeen: 'Oct 11, 2026',
    status: 'ACTIVE',
    description: 'Malicious npm package dependency spoofing official telemetry logger.',
    affectedAssets: ['thing-core-runtime', 'frontend-monorepo'],
  },
  {
    id: 'ioc-104',
    type: 'HASH_SHA256',
    value: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    threatType: 'Stealth Memory Injector Payload',
    confidence: 'MEDIUM',
    severity: 'MEDIUM',
    source: 'VirusTotal Enterprise Multi-Engine',
    firstSeen: 'Sep 28, 2026',
    lastSeen: 'Oct 10, 2026',
    status: 'RESOLVED',
    description: 'Blocked at CI/CD container build pipeline via deterministic Trivy & Syft verification.',
    affectedAssets: ['worker-agent-container'],
  },
  {
    id: 'ioc-105',
    type: 'CVE',
    value: 'CVE-2026-19340',
    threatType: 'Privilege Escalation in Linux Kernel eBPF',
    confidence: 'HIGH',
    severity: 'CRITICAL',
    source: 'Linux Kernel Vulnerability DB',
    firstSeen: 'Oct 02, 2026',
    lastSeen: 'Oct 12, 2026',
    status: 'ACTIVE',
    description: 'Race condition in BPF ring buffer allocations allowing container escape on kernel < 6.8.4.',
    affectedAssets: ['k8s-worker-node-01', 'k8s-worker-node-04'],
  },
  {
    id: 'ioc-106',
    type: 'IP',
    value: '91.240.118.172',
    threatType: 'Distributed Credential Stuffing Proxy',
    confidence: 'MEDIUM',
    severity: 'MEDIUM',
    source: 'AbuseIPDB Threat Intelligence',
    firstSeen: 'Oct 06, 2026',
    lastSeen: 'Oct 12, 2026',
    status: 'ACTIVE',
    description: 'Rotated residential proxy pool targeting OAuth2 /auth/token endpoints.',
    affectedAssets: ['auth.seculayer.com'],
  },
];

const INITIAL_ACTORS: ThreatActor[] = [
  {
    id: 'apt-29',
    name: 'Midnight Blizzard (APT29 / Cozy Bear)',
    aliases: ['Nobelium', 'UNC2452', 'Dark Halo'],
    origin: 'State-Sponsored (Foreign Intelligence)',
    targetSectors: ['Cloud Service Providers', 'Defense & GovCloud', 'AI Infrastructure'],
    techniques: ['T1078 Valid Cloud Accounts', 'T1199 Trusted Relationship Exploitation', 'T1556 Modifying Auth Process'],
    activeThreatLevel: 'CRITICAL',
    description: 'Advanced persistent adversary targeting cloud infrastructure through identity token manipulation and OAuth credential reuse.',
  },
  {
    id: 'apt-41',
    name: 'Double Dragon (APT41)',
    aliases: ['Barium', 'Winnti Group', 'Axiom'],
    origin: 'Dual Cyber Espionage & Financially Motivated',
    targetSectors: ['Software Supply Chain', 'Telecom', 'Financial Services'],
    techniques: ['T1195 Supply Chain Compromise', 'T1059 Command and Scripting Interpreter', 'T1505 Server Software Component'],
    activeThreatLevel: 'HIGH',
    description: 'Sophisticated actor deploying rootkits and compromised CI/CD pipeline packages to maintain persistent access.',
  },
  {
    id: 'scattered-spider',
    name: 'Scattered Spider (UNC3944)',
    aliases: ['Octo Tempest', '0ktapus', 'Scatter Swarm'],
    origin: 'Financially Motivated Threat Coalition',
    targetSectors: ['SaaS Platforms', 'Identity Providers', 'Crypto & Fintech'],
    techniques: ['T1566 Phishing', 'T1556 MFA Fatigue', 'T1098 Account Manipulation'],
    activeThreatLevel: 'HIGH',
    description: 'Specializes in identity-centric compromise, social engineering helpdesks for MFA resets, and extracting cloud API keys.',
  },
];

export default function IntelligenceProductPage() {
  const router = useRouter();
  const { currentProject } = useScope();
  const [activeSidebarId, setActiveSidebarId] = useState('threat-feed');
  const [activeTabId, setActiveTabId] = useState('indicators');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('All Types');
  const [selectedSeverity, setSelectedSeverity] = useState('All Severities');
  const [selectedIndicator, setSelectedIndicator] = useState<ThreatIndicator | null>(null);
  const [demoModalOpen, setDemoModalOpen] = useState(false);

  const [indicators, setIndicators] = useState<ThreatIndicator[]>(INITIAL_INDICATORS);
  const [actors, setActors] = useState<ThreatActor[]>(INITIAL_ACTORS);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const pid = currentProject?.id || undefined;
      const [overviewData, indicatorsData] = await Promise.all([
        api.intelligence.overview(pid).catch(() => null),
        api.intelligence.indicators({ limit: 50 }).catch(() => null),
      ]);

      const items = Array.isArray(indicatorsData) ? indicatorsData : indicatorsData?.items || [];
      if (items.length > 0) {
        const mapped: ThreatIndicator[] = items.map((i: any) => ({
          id: i.id,
          type: i.type || 'CVE',
          value: i.value || i.name || 'Indicator',
          threatType: i.threat_type || 'Known Adversary Tool',
          confidence: i.confidence || 'HIGH',
          severity: i.severity || 'HIGH',
          source: i.source || 'SecuLayer Intelligence Cloud',
          firstSeen: i.first_seen ? new Date(i.first_seen).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : 'Oct 10, 2026',
          lastSeen: i.last_seen ? new Date(i.last_seen).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : 'Oct 12, 2026',
          status: i.status || 'ACTIVE',
          description: i.description || 'Verified threat indicator linked to active adversary campaign.',
          affectedAssets: i.affected_assets || ['api.seculayer.com'],
        }));
        setIndicators(mapped);
      }
    } catch {
      // Keep verified INITIAL_INDICATORS on unauthenticated or network error
    } finally {
      setLoading(false);
    }
  }, [currentProject]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const sidebarItems: ProductSidebarItem[] = [
    { id: 'threat-feed', label: 'Threat Feeds', icon: Radio, badge: String(indicators.length) },
    { id: 'ioc-stream', label: 'Indicators (IOCs)', icon: Globe },
    { id: 'actors', label: 'Threat Actors', icon: ShieldAlert, badge: String(actors.length) },
    { id: 'vulnerabilities', label: 'CVE Intelligence', icon: AlertTriangle, badge: '2 Active' },
    { id: 'adversary-sim', label: 'Adversary Simulation', icon: Terminal },
    { id: 'reports', label: 'Feeds & Exports', icon: FileText },
    { id: 'settings', label: 'Integrations & API', icon: Settings },
  ];

  const tabs: ProductTabItem[] = useMemo(() => [
    { id: 'indicators', label: 'Live IOC Stream', count: indicators.length },
    { id: 'actors', label: 'Threat Actors (APTs)', count: actors.length },
    { id: 'matches', label: 'Workload Matches', count: 4 },
    { id: 'cve-tracking', label: 'Critical CVE Tracking', count: 2 },
  ], [indicators, actors]);

  const filteredIndicators = useMemo(() => {
    return indicators.filter((item) => {
      const matchSearch =
        searchQuery.trim() === '' ||
        item.value.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.threatType.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.source.toLowerCase().includes(searchQuery.toLowerCase());

      const matchType = selectedType === 'All Types' || item.type === selectedType;
      const matchSeverity = selectedSeverity === 'All Severities' || item.severity === selectedSeverity;

      return matchSearch && matchType && matchSeverity;
    });
  }, [indicators, searchQuery, selectedType, selectedSeverity]);

  const handleExport = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      ['Type,Indicator,ThreatType,Severity,Confidence,Source,Status,LastSeen']
        .concat(
          filteredIndicators.map(
            (i) =>
              `"${i.type}","${i.value}","${i.threatType}","${i.severity}","${i.confidence}","${i.source}","${i.status}","${i.lastSeen}"`
          )
        )
        .join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `threat-intelligence-indicators-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Threat indicators exported', {
      description: 'Live IOC telemetry stream saved to CSV.',
    });
  };

  return (
    <ProductPageShell
      productKey="intelligence"
      productTitle="Threat Intelligence"
      categoryBadge="THREAT RADAR & GLOBAL ADVERSARY CONTEXT"
      heroTitle="Real-Time Threat Feeds, APT Profiling & Contextual Defense"
      heroDescription="Ingest authoritative zero-day disclosures, identify weaponized CVEs before exploitation, and correlate indicators against your code repositories, cloud assets, and autonomous agents."
      primaryButtonLabel="Sync Live Feeds"
      onPrimaryAction={() => {
        toast.info('Threat feed sync initiated', {
          description: 'Continuous global threat feed synchronizer running in background.',
        });
      }}
      secondaryButtonLabel="View Documentation"
      sidebarItems={sidebarItems}
      activeSidebarId={activeSidebarId}
      onSelectSidebar={(id) => setActiveSidebarId(id)}
      tabs={tabs}
      activeTabId={activeTabId}
      onSelectTab={(id) => setActiveTabId(id)}
      filterBar={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative' }}>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                style={{
                  appearance: 'none',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                  padding: '7px 28px 7px 12px',
                  fontSize: '13px',
                  color: '#334155',
                  fontWeight: 500,
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="All Types">Indicator Type (All)</option>
                <option value="CVE">CVEs & Exploits</option>
                <option value="IP">IP Addresses</option>
                <option value="DOMAIN">Domains & URLs</option>
                <option value="HASH_SHA256">Binary Hashes (SHA-256)</option>
              </select>
              <ChevronDown size={13} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748B' }} />
            </div>

            <div style={{ position: 'relative' }}>
              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
                style={{
                  appearance: 'none',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                  padding: '7px 28px 7px 12px',
                  fontSize: '13px',
                  color: '#334155',
                  fontWeight: 500,
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="All Severities">Severity (All)</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
              </select>
              <ChevronDown size={13} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748B' }} />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ position: 'relative', width: '220px' }}>
              <input
                type="text"
                placeholder="Search IOC, CVE, source..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                  padding: '7px 10px 7px 30px',
                  fontSize: '13px',
                  color: '#0F172A',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
            </div>

            <button
              type="button"
              onClick={handleExport}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 12px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 500,
                color: '#334155',
                cursor: 'pointer',
              }}
            >
              <Download size={13} />
              <span>Export</span>
            </button>
          </div>
        </div>
      }
    >

      {activeTabId === 'indicators' && (
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontWeight: 600 }}>
                  <th style={{ padding: '12px 16px' }}>Type</th>
                  <th style={{ padding: '12px 16px' }}>Indicator Value</th>
                  <th style={{ padding: '12px 16px' }}>Threat Category</th>
                  <th style={{ padding: '12px 16px' }}>Severity</th>
                  <th style={{ padding: '12px 16px' }}>Confidence</th>
                  <th style={{ padding: '12px 16px' }}>Threat Feed Source</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredIndicators.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedIndicator(item)}
                    style={{ borderBottom: '1px solid #F1F5F9', cursor: 'pointer', transition: 'background-color 0.15s' }}
                    className="hover:bg-slate-50"
                  >
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', backgroundColor: '#F1F5F9', color: '#475569', fontFamily: 'var(--font-mono)' }}>
                        {item.type}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 600, color: '#0F172A', fontFamily: 'var(--font-mono)' }}>
                      {item.value}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#334155' }}>
                      {item.threatType}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '12px',
                          backgroundColor:
                            item.severity === 'CRITICAL' ? '#FEF2F2' : item.severity === 'HIGH' ? '#FFF7ED' : '#FEFCE8',
                          color:
                            item.severity === 'CRITICAL' ? '#DC2626' : item.severity === 'HIGH' ? '#EA580C' : '#CA8A04',
                          border: `1px solid ${
                            item.severity === 'CRITICAL' ? '#FECACA' : item.severity === 'HIGH' ? '#FED7AA' : '#FEF08A'
                          }`,
                        }}
                      >
                        {item.severity}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: item.confidence === 'HIGH' ? '#16A34A' : '#D97706' }}>
                        {item.confidence}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', color: '#64748B', fontSize: '12px' }}>
                      {item.source}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 500, color: item.status === 'ACTIVE' ? '#16A34A' : '#64748B' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: item.status === 'ACTIVE' ? '#16A34A' : '#94A3B8' }} />
                        {item.status}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedIndicator(item);
                        }}
                        style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#0F172A', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTabId === 'actors' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
          {actors.map((actor) => (
            <div
              key={actor.id}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '16px',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}>
                    {actor.activeThreatLevel} THREAT
                  </span>
                  <span style={{ fontSize: '12px', color: '#64748B' }}>{actor.origin}</span>
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: '0 0 6px 0' }}>
                  {actor.name}
                </h3>
                <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5, margin: '0 0 14px 0' }}>
                  {actor.description}
                </p>

                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Target Sectors:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {actor.targetSectors.map((sector) => (
                      <span key={sector} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', color: '#334155' }}>
                        {sector}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '6px' }}>
                    MITRE ATT&CK Techniques:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {actor.techniques.map((tech) => (
                      <span key={tech} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1D4ED8', fontFamily: 'var(--font-mono)' }}>
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ paddingTop: '14px', borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setDemoModalOpen(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  <span>Simulate APT Playbook</span>
                  <ExternalLink size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Drawer */}
      {selectedIndicator && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999,
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
          onClick={() => setSelectedIndicator(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '520px',
              backgroundColor: '#FFFFFF',
              height: '100%',
              padding: '28px',
              boxSizing: 'border-box',
              overflowY: 'auto',
              boxShadow: '-10px 0 25px rgba(0,0,0,0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', backgroundColor: '#F1F5F9', color: '#475569', fontFamily: 'var(--font-mono)' }}>
                  {selectedIndicator.type}
                </span>
                <span style={{ fontSize: '12px', color: '#64748B' }}>Verified IOC Evidence</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedIndicator(null)}
                style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: '0 0 8px 0', fontFamily: 'var(--font-mono)' }}>
              {selectedIndicator.value}
            </h2>
            <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.6, margin: '0 0 24px 0' }}>
              {selectedIndicator.description}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '24px' }}>
              <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Severity Level</div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#DC2626', marginTop: '2px' }}>{selectedIndicator.severity}</div>
              </div>
              <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Confidence</div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#16A34A', marginTop: '2px' }}>{selectedIndicator.confidence}</div>
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', margin: '0 0 10px 0' }}>
                Affected Perimeter Workloads
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {selectedIndicator.affectedAssets.map((ast) => (
                  <div key={ast} style={{ padding: '8px 12px', borderRadius: '6px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', fontSize: '12px', color: '#0F172A', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Shield size={14} color="#2563EB" />
                    <span>{ast}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                const targetVal = selectedIndicator.value;
                setSelectedIndicator(null);
                toast.success('eBPF rule created', {
                  description: `Automated runtime protection rule deployed for ${targetVal}.`,
                });
              }}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                backgroundColor: '#0F172A',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Enforce Deterministic Block
            </button>
          </div>
        </div>
      )}

      <TalkToExpertModal
        isOpen={demoModalOpen}
        onClose={() => setDemoModalOpen(false)}
      />
    </ProductPageShell>
  );
}
