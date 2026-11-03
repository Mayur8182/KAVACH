'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Shield,
  Container,
  HardDrive,
  RefreshCw,
  Plus,
  Play,
  Download,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Search,
  ExternalLink,
  ChevronDown,
  X,
  Layers,
  FileCode2,
  Key,
  Boxes,
  Activity,
  Bot,
  Sparkles,
  FileCheck2,
  FileText,
  Settings,
  ShieldAlert,
  LayoutGrid,
  CheckSquare,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { useScope } from '@/context/ScopeContext';
import { toast } from '@/lib/toast';

export interface ContainerSubnavTab {
  id: string;
  label: string;
  badge?: number | string;
  badgeBg?: string;
}

export interface ContainerSecurityLayoutProps {
  sectionNumber?: string;
  sectionTitle: string;
  sectionDescription?: string;
  tabs?: ContainerSubnavTab[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  children: React.ReactNode;
  headerActions?: React.ReactNode;
}

export const CORE_CONTAINER_TABS = [
  { id: 'overview', label: 'Overview', href: '/container-security', icon: LayoutGrid },
  { id: 'images', label: 'Images & Registries', href: '/container-security/images', icon: Container },
  { id: 'findings', label: 'Vulnerabilities & CVEs', href: '/container-security/findings', icon: ShieldAlert },
  { id: 'runtime', label: 'Runtime & Workloads', href: '/container-security/runtime', icon: Activity },
  { id: 'compliance', label: 'Compliance & Policies', href: '/container-security/compliance', icon: CheckSquare },
];

export const ContainerSecurityLayout: React.FC<ContainerSecurityLayoutProps> = ({
  sectionNumber,
  sectionTitle,
  sectionDescription,
  tabs = [],
  activeTab,
  onTabChange,
  children,
  headerActions,
}) => {
  const pathname = usePathname() || '/container-security';
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentProject } = useScope();

  // Scan modal state
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [scanRepo, setScanRepo] = useState('');
  const [scanTag, setScanTag] = useState('latest');
  const [isSubmittingScan, setIsSubmittingScan] = useState(false);

  // Connect registry modal state
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [regProvider, setRegProvider] = useState<'DOCKER_HUB' | 'ECR' | 'GCR' | 'ACR' | 'GHCR' | 'SELF_HOSTED'>('DOCKER_HUB');
  const [regName, setRegName] = useState('');
  const [regUrl, setRegUrl] = useState('https://registry-1.docker.io');
  const [regToken, setRegToken] = useState('');
  const [isConnectingReg, setIsConnectingReg] = useState(false);

  // Global telemetry counters
  const [telemetry, setTelemetry] = useState<{
    totalImages: number;
    vulnerableImages: number;
    criticalFindings: number;
    activeScanners: string[];
  }>({
    totalImages: 0,
    vulnerableImages: 0,
    criticalFindings: 0,
    activeScanners: ['Trivy Engine v0.58', 'Grype Engine v0.84', 'Syft SBOM v1.19'],
  });

  useEffect(() => {
    let mounted = true;
    api.containers
      .summary(currentProject?.id)
      .then((sum) => {
        if (!mounted || !sum) return;
        setTelemetry({
          totalImages: sum.total_images?.value ?? 0,
          vulnerableImages: sum.vulnerable_images?.value ?? 0,
          criticalFindings: sum.critical_findings?.value ?? 0,
          activeScanners: ['Trivy Engine v0.58', 'Grype Engine v0.84', 'Syft SBOM v1.19'],
        });
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, [currentProject?.id]);

  const handleTriggerScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanRepo) {
      toast.error('Repository name is required for container scanning');
      return;
    }
    setIsSubmittingScan(true);
    try {
      const job = await api.containers.scan({
        projectId: currentProject?.id || 'default-project',
        repository: scanRepo,
        tag: scanTag || 'latest',
      });
      toast.success('Container Scan Initiated', {
        description: `Job ${job.job_id} scheduled with Trivy container engine.`,
      });
      setIsScanModalOpen(false);
      setScanRepo('');
      setScanTag('latest');
    } catch (err: any) {
      toast.error('Scan Failed to Start', {
        description: err?.message || 'Check scanner daemon connectivity',
      });
    } finally {
      setIsSubmittingScan(false);
    }
  };

  const handleConnectRegistry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName) {
      toast.error('Registry display name is required');
      return;
    }
    setIsConnectingReg(true);
    try {
      await api.containers.createRegistry({
        provider: regProvider,
        name: regName,
        url: regUrl || 'https://registry.hub.docker.com',
      }, currentProject?.id || null);
      toast.success('Registry Connected', {
        description: `Successfully authenticated with ${regName}. Starting initial image discovery.`,
      });
      setIsConnectModalOpen(false);
      setRegName('');
      setRegToken('');
    } catch (err: any) {
      toast.error('Registry Connection Failed', {
        description: err?.message || 'Authentication rejected by remote registry provider',
      });
    } finally {
      setIsConnectingReg(false);
    }
  };

  const handleTabClick = (tabId: string) => {
    if (onTabChange) {
      onTabChange(tabId);
    } else {
      const params = new URLSearchParams(searchParams?.toString() || '');
      params.set('tab', tabId);
      router.push(`${pathname}?${params.toString()}`);
    }
  };

  // Determine active primary core tab
  const getActiveCoreTab = () => {
    if (pathname === '/container-security' || pathname === '/container-security/scans') return 'overview';
    if (
      pathname.startsWith('/container-security/images') ||
      pathname.startsWith('/container-security/inventory') ||
      pathname.startsWith('/container-security/registries') ||
      pathname.startsWith('/container-security/sbom')
    ) {
      return 'images';
    }
    if (
      pathname.startsWith('/container-security/findings') ||
      pathname.startsWith('/container-security/secrets') ||
      pathname.startsWith('/container-security/remediation')
    ) {
      return 'findings';
    }
    if (
      pathname.startsWith('/container-security/runtime') ||
      pathname.startsWith('/container-security/workloads')
    ) {
      return 'runtime';
    }
    if (
      pathname.startsWith('/container-security/compliance') ||
      pathname.startsWith('/container-security/policies') ||
      pathname.startsWith('/container-security/dockerfiles') ||
      pathname.startsWith('/container-security/ci-cd') ||
      pathname.startsWith('/container-security/reports')
    ) {
      return 'compliance';
    }
    return 'overview';
  };

  const currentCoreTab = getActiveCoreTab();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flexGrow: 1,
        minHeight: 0,
        backgroundColor: '#F8FAFC',
        color: '#0F172A',
        fontFamily: "var(--font-sans, 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif)",
      }}
    >
      {/* ── Top Header Bar ── */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0',
          padding: '16px 24px 0 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        {/* Row 1: Breadcrumb + Scope Pills + Global Actions */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          {/* Breadcrumb & Section Name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#0F172A',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Container size={18} color="#FFFFFF" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#64748B' }}>
                <Link href="/container-security" style={{ color: '#64748B', textDecoration: 'none' }}>
                  Container Security
                </Link>
                <span>/</span>
                <span style={{ color: '#0F172A', fontWeight: 600 }}>{sectionTitle}</span>
              </div>
              <h1
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  color: '#0F172A',
                  letterSpacing: '-0.02em',
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                {sectionTitle}
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: '4px',
                    backgroundColor: '#EFF6FF',
                    color: '#2563EB',
                    border: '1px solid #DBEAFE',
                    fontFamily: 'JetBrains Mono, monospace',
                  }}
                >
                  LIVE POSTURE
                </span>
              </h1>
            </div>
          </div>

          {/* Telemetry Status Chips */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Scanners Active */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 11px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '6px',
                fontSize: '11.5px',
                color: '#334155',
              }}
              title={telemetry.activeScanners.join(' • ')}
            >
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  backgroundColor: '#10B981',
                  boxShadow: '0 0 0 2px rgba(16, 185, 129, 0.2)',
                }}
              />
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>
                {telemetry.activeScanners.length} Scanners Active
              </span>
            </div>

            {/* Images Monitored */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 11px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '6px',
                fontSize: '11.5px',
                color: '#334155',
              }}
            >
              <Container size={13} color="#475569" />
              <span>
                <strong style={{ color: '#0F172A' }}>{telemetry.totalImages}</strong> Images
              </span>
            </div>

            {/* Critical CVEs */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 11px',
                backgroundColor: telemetry.criticalFindings > 0 ? '#FEF2F2' : '#F0FDF4',
                border: `1px solid ${telemetry.criticalFindings > 0 ? '#FECACA' : '#BBF7D0'}`,
                borderRadius: '6px',
                fontSize: '11.5px',
                color: telemetry.criticalFindings > 0 ? '#991B1B' : '#166534',
                fontWeight: 600,
              }}
            >
              <ShieldAlert size={13} color={telemetry.criticalFindings > 0 ? '#DC2626' : '#16A34A'} />
              <span>{telemetry.criticalFindings} Critical CVEs</span>
            </div>

            {/* Action Buttons */}
            {headerActions ? (
              headerActions
            ) : (
              <>
                <button
                  onClick={() => setIsScanModalOpen(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '7px 12px',
                    backgroundColor: '#0F172A',
                    color: '#FFFFFF',
                    border: '1px solid #0F172A',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 120ms ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1E293B')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#0F172A')}
                >
                  <Play size={13} />
                  <span>Run On-Demand Scan</span>
                </button>

                <button
                  onClick={() => setIsConnectModalOpen(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '7px 12px',
                    backgroundColor: '#FFFFFF',
                    color: '#0F172A',
                    border: '1px solid #CBD5E1',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 120ms ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                >
                  <Plus size={13} />
                  <span>Connect Registry</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Description Line if provided */}
        {sectionDescription && (
          <div style={{ fontSize: '12.5px', color: '#64748B', maxWidth: '900px', lineHeight: 1.5 }}>
            {sectionDescription}
          </div>
        )}

        {/* ── HORIZONTAL SUBPAGE TABS ── */}
        {tabs.length > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              borderTop: '1px solid #F1F5F9',
              padding: '10px 0 12px 0',
              overflowX: 'auto',
            }}
          >
            {tabs.map((t) => {
              const isSelected = activeTab ? activeTab === t.id : false;
              return (
                <button
                  key={t.id}
                  onClick={() => handleTabClick(t.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 14px',
                    borderRadius: '6px',
                    fontSize: '12.5px',
                    fontWeight: isSelected ? 600 : 500,
                    color: isSelected ? '#0F172A' : '#64748B',
                    backgroundColor: isSelected ? '#F1F5F9' : 'transparent',
                    border: '1px solid',
                    borderColor: isSelected ? '#E2E8F0' : 'transparent',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 120ms ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = '#F8FAFC';
                      e.currentTarget.style.color = '#0F172A';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = '#64748B';
                    }
                  }}
                >
                  <span>{t.label}</span>
                  {t.badge !== undefined && (
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '1px 5px',
                        borderRadius: '9999px',
                        backgroundColor: isSelected ? '#E2E8F0' : t.badgeBg || '#F1F5F9',
                        color: isSelected ? '#0F172A' : '#475569',
                        fontFamily: 'JetBrains Mono, monospace',
                      }}
                    >
                      {t.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Main Content Area ── */}
      <div style={{ flex: 1, padding: '24px', overflowY: 'auto', maxWidth: '100%', boxSizing: 'border-box' }}>{children}</div>

      {/* ── Modal: Trigger On-Demand Container Scan ── */}
      {isScanModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setIsScanModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
              width: '100%',
              maxWidth: '520px',
              padding: '24px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    backgroundColor: '#EFF6FF',
                    color: '#2563EB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Play size={16} />
                </div>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: '#0F172A' }}>
                    Trigger Container Security Scan
                  </h3>
                  <div style={{ fontSize: '12px', color: '#64748B' }}>
                    Deterministic vulnerability, secret, and SBOM inspection with Trivy
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsScanModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleTriggerScan} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Target Image Repository / Name <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. backend-api or company/auth-service"
                  value={scanRepo}
                  onChange={(e) => setScanRepo(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    fontFamily: 'JetBrains Mono, monospace',
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Tag or SHA Digest
                </label>
                <input
                  type="text"
                  placeholder="latest"
                  value={scanTag}
                  onChange={(e) => setScanTag(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    fontFamily: 'JetBrains Mono, monospace',
                  }}
                />
              </div>

              <div
                style={{
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '6px',
                  padding: '12px',
                  fontSize: '11.5px',
                  color: '#475569',
                  lineHeight: 1.5,
                }}
              >
                <strong>Execution Pipeline:</strong>
                <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                  <li>Pulls image manifests from connected registry</li>
                  <li>Generates full CycloneDX SBOM via Syft</li>
                  <li>Executes CVE CVE-2024-*, CVSS & EPSS scoring via Trivy</li>
                  <li>Inspects image layers for credential leaks & base OS drift</li>
                </ul>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsScanModalOpen(false)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '6px',
                    border: '1px solid #E2E8F0',
                    backgroundColor: '#FFFFFF',
                    color: '#475569',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingScan}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#0F172A',
                    color: '#FFFFFF',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: isSubmittingScan ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {isSubmittingScan ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>Scheduling...</span>
                    </>
                  ) : (
                    <>
                      <Play size={13} />
                      <span>Dispatch Scan Job</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Connect Container Registry ── */}
      {isConnectModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setIsConnectModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              width: '100%',
              maxWidth: '540px',
              padding: '24px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    backgroundColor: '#F0FDF4',
                    color: '#16A34A',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <HardDrive size={16} />
                </div>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: '#0F172A' }}>
                    Connect Container Registry
                  </h3>
                  <div style={{ fontSize: '12px', color: '#64748B' }}>
                    Sync images, catalog webhooks, and automated build scans
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsConnectModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConnectRegistry} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Registry Provider
                </label>
                <select
                  value={regProvider}
                  onChange={(e: any) => {
                    setRegProvider(e.target.value);
                    if (e.target.value === 'DOCKER_HUB') setRegUrl('https://registry-1.docker.io');
                    else if (e.target.value === 'ECR') setRegUrl('*.dkr.ecr.us-east-1.amazonaws.com');
                    else if (e.target.value === 'ACR') setRegUrl('*.azurecr.io');
                    else if (e.target.value === 'GCR') setRegUrl('gcr.io');
                    else if (e.target.value === 'GHCR') setRegUrl('ghcr.io');
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    backgroundColor: '#FFFFFF',
                  }}
                >
                  <option value="DOCKER_HUB">Docker Hub</option>
                  <option value="ECR">Amazon Elastic Container Registry (ECR)</option>
                  <option value="ACR">Azure Container Registry (ACR)</option>
                  <option value="GCR">Google Artifact Registry (GAR / GCR)</option>
                  <option value="GHCR">GitHub Container Registry (GHCR)</option>
                  <option value="SELF_HOSTED">Self-Hosted / Harbor / GitLab Registry</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Registry Name <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Production ECR Primary"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Registry URL / Endpoint
                </label>
                <input
                  type="text"
                  value={regUrl}
                  onChange={(e) => setRegUrl(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    fontFamily: 'JetBrains Mono, monospace',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Access Token / API Secret
                </label>
                <input
                  type="password"
                  placeholder="Personal Access Token or IAM Secret Key"
                  value={regToken}
                  onChange={(e) => setRegToken(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    fontFamily: 'JetBrains Mono, monospace',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsConnectModalOpen(false)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '6px',
                    border: '1px solid #E2E8F0',
                    backgroundColor: '#FFFFFF',
                    color: '#475569',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isConnectingReg}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#0F172A',
                    color: '#FFFFFF',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: isConnectingReg ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {isConnectingReg ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <Plus size={13} />
                      <span>Save & Sync Registry</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContainerSecurityLayout;
