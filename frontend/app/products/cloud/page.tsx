'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Cloud,
  Shield,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Server,
  Database,
  Lock,
  Search,
  Filter,
  ArrowRight,
  ChevronRight,
  Cpu,
  FileCode,
  SlidersHorizontal,
  ExternalLink,
  Boxes,
  Globe,
  Radio,
} from 'lucide-react';
import { SecuLayerHeader } from '@/components/navigation/SecuLayerHeader';
import { SearchModal } from '@/components/common/SearchModal';
import { TalkToExpertModal } from '@/components/common/TalkToExpertModal';
import { FindingDetailDrawer, FindingDetailData } from '@/components/common/FindingDetailDrawer';
import { SecuLayerDashboardCard } from '@/components/dashboard/SecuLayerDashboardCard';

export default function SecuLayerCloudProductPage() {
  const router = useRouter();

  // Modals & Drawers
  const [searchOpen, setSearchOpen] = useState(false);
  const [expertOpen, setExpertOpen] = useState(false);
  const [selectedFinding, setSelectedFinding] = useState<FindingDetailData | null>(null);

  // Live Workspace Controls
  const [selectedAccount, setSelectedAccount] = useState('AWS - Production');
  const [timeRange, setTimeRange] = useState('Last 30 days');
  const [resourceTypeFilter, setResourceTypeFilter] = useState('All resources');
  const [severityFilter, setSeverityFilter] = useState('All severities');
  const [searchFilter, setSearchFilter] = useState('');
  const [workspaceSidebarTab, setWorkspaceSidebarTab] = useState('Accounts');

  // Bottom Tabs
  const [activeBottomTab, setActiveBottomTab] = useState<'capabilities' | 'providers' | 'compliance' | 'resources'>('capabilities');

  // Real Cloud findings dataset matching screenshot
  const [cloudFindings, setCloudFindings] = useState<FindingDetailData[]>([
    {
      id: 'CLOUD-1',
      resource: 's3://prod-data',
      title: 'Public bucket',
      severity: 'Critical',
      status: 'Open',
      tool: 'CSPM Engine',
      category: 'Storage Misconfiguration',
      detectedAt: 'Sep 30, 2026, 09:21 AM',
      description: 'S3 bucket has Block Public Access explicitly disabled and bucket ACL grants global Read to AllUsers.',
      cloudResource: {
        arn: 'arn:aws:s3:::prod-data',
        service: 'Amazon S3',
        region: 'us-east-1',
      },
      remediation: {
        summary: 'Enable AWS S3 Block Public Access on the bucket and remove public ACL grants.',
        commands: [
          'aws s3api put-public-access-block --bucket prod-data --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true',
        ],
      },
    },
    {
      id: 'CLOUD-2',
      resource: 'iam:admin-role',
      title: 'Overly permissive policy',
      severity: 'Critical',
      status: 'Open',
      tool: 'IAM Scanner',
      category: 'Identity & Access',
      detectedAt: 'Sep 29, 2026, 03:15 PM',
      description: 'IAM role specifies Action: ["*"] and Resource: ["*"] without conditions or boundary restrictions.',
      cloudResource: {
        arn: 'arn:aws:iam::123456789012:role/admin-role',
        service: 'AWS IAM',
        region: 'global',
      },
      remediation: {
        summary: 'Replace administrator wildcard with scoped resource ARNs and service-specific actions.',
        commands: [
          'aws iam attach-role-policy --role-name admin-role --policy-arn arn:aws:iam::aws:policy/PowerUserAccess',
        ],
      },
    },
    {
      id: 'CLOUD-3',
      resource: 'ec2:prod-1',
      title: 'Unencrypted volume',
      severity: 'High',
      status: 'In Progress',
      tool: 'CSPM Engine',
      category: 'Compute Security',
      detectedAt: 'Sep 29, 2026, 11:10 AM',
      description: 'EBS root volume attached to production web tier without KMS encryption at rest.',
      cloudResource: {
        arn: 'arn:aws:ec2:us-east-1:123456789012:volume/vol-09a8b7c6d5e4f3a21',
        service: 'Amazon EC2 / EBS',
        region: 'us-east-1',
      },
      remediation: {
        summary: 'Create an encrypted snapshot and replace root volume using KMS customer-managed key.',
      },
    },
    {
      id: 'CLOUD-4',
      resource: 'rds:db-prod',
      title: 'Public access enabled',
      severity: 'High',
      status: 'Open',
      tool: 'CSPM Engine',
      category: 'Database Security',
      detectedAt: 'Sep 28, 2026, 08:45 AM',
      description: 'Production PostgreSQL RDS instance is publicly accessible on port 5432 with public IP.',
      cloudResource: {
        arn: 'arn:aws:rds:us-east-1:123456789012:db:db-prod',
        service: 'Amazon RDS',
        region: 'us-east-1',
      },
      remediation: {
        summary: 'Modify RDS instance to set PubliclyAccessible=false and route traffic via private VPC subnets.',
        commands: [
          'aws rds modify-db-instance --db-instance-identifier db-prod --no-publicly-accessible --apply-immediately',
        ],
      },
    },
    {
      id: 'CLOUD-5',
      resource: 'k8s:cluster-1',
      title: 'Insecure admission',
      severity: 'Medium',
      status: 'Resolved',
      tool: 'KSPM Engine',
      category: 'Kubernetes Posture',
      detectedAt: 'Sep 27, 2026, 04:22 PM',
      description: 'Pod Security Standards not enforced in default namespace; privileged pods permitted.',
      cloudResource: {
        arn: 'arn:aws:eks:us-east-1:123456789012:cluster/cluster-1',
        service: 'Amazon EKS',
        region: 'us-east-1',
      },
      remediation: {
        summary: 'Apply baseline or restricted Pod Security Admission labels to all application namespaces.',
        commands: [
          'kubectl label --overwrite ns default pod-security.kubernetes.io/enforce=restricted',
        ],
      },
    },
    {
      id: 'CLOUD-6',
      resource: 'lambda:fn-1',
      title: 'Outdated runtime',
      severity: 'Medium',
      status: 'Open',
      tool: 'CSPM Engine',
      category: 'Serverless Posture',
      detectedAt: 'Sep 26, 2026, 02:30 PM',
      description: 'Lambda function running Node.js 14 runtime which reached official End-of-Life.',
      cloudResource: {
        arn: 'arn:aws:lambda:us-east-1:123456789012:function:fn-1',
        service: 'AWS Lambda',
        region: 'us-east-1',
      },
      remediation: {
        summary: 'Upgrade runtime to nodejs20.x or nodejs22.x in Lambda configuration.',
        commands: [
          'aws lambda update-function-configuration --function-name fn-1 --runtime nodejs20.x',
        ],
      },
    },
    {
      id: 'CLOUD-7',
      resource: 'vpc:main',
      title: 'Open security group',
      severity: 'Low',
      status: 'Open',
      tool: 'Network Posture',
      category: 'Network Security',
      detectedAt: 'Sep 25, 2026, 06:15 PM',
      description: 'Security group rule allows inbound SSH (port 22) from 0.0.0.0/0.',
      cloudResource: {
        arn: 'arn:aws:ec2:us-east-1:123456789012:security-group/sg-0123456789abcdef0',
        service: 'Amazon VPC',
        region: 'us-east-1',
      },
      remediation: {
        summary: 'Restrict port 22 ingress to corporate VPN CIDR blocks or migrate to AWS Systems Manager Session Manager.',
      },
    },
    {
      id: 'CLOUD-8',
      resource: 'cloudtrail',
      title: 'Logging disabled',
      severity: 'Low',
      status: 'Open',
      tool: 'CSPM Engine',
      category: 'Audit & Governance',
      detectedAt: 'Sep 24, 2026, 11:00 AM',
      description: 'Multi-region CloudTrail trail logging is suspended in secondary region us-west-2.',
      cloudResource: {
        arn: 'arn:aws:cloudtrail:us-east-1:123456789012:trail/main-trail',
        service: 'AWS CloudTrail',
        region: 'global',
      },
      remediation: {
        summary: 'Enable CloudTrail logging across all active AWS regions.',
        commands: ['aws cloudtrail start-logging --name main-trail'],
      },
    },
  ]);

  const handleUpdateStatus = (id: string, newStatus: string) => {
    setCloudFindings((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
    );
    if (selectedFinding && selectedFinding.id === id) {
      setSelectedFinding({ ...selectedFinding, status: newStatus });
    }
  };

  const filteredFindings = useMemo(() => {
    return cloudFindings.filter((item) => {
      const matchesSearch =
        searchFilter.trim() === '' ||
        item.resource?.toLowerCase().includes(searchFilter.toLowerCase()) ||
        item.title.toLowerCase().includes(searchFilter.toLowerCase());

      const matchesSeverity =
        severityFilter === 'All severities' || item.severity.toLowerCase() === severityFilter.toLowerCase();

      const matchesResource =
        resourceTypeFilter === 'All resources' ||
        (item.resource && item.resource.startsWith(resourceTypeFilter.toLowerCase()));

      return matchesSearch && matchesSeverity && matchesResource;
    });
  }, [cloudFindings, searchFilter, severityFilter, resourceTypeFilter]);

  const getSeverityBadge = (sev: string) => {
    const isCrit = sev === 'Critical';
    const isHigh = sev === 'High';
    const isMed = sev === 'Medium';
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '11px',
          fontWeight: 600,
          padding: '2px 7px',
          borderRadius: '4px',
          backgroundColor: isCrit ? '#FEF2F2' : isHigh ? '#FFF7ED' : isMed ? '#FFFBEB' : '#F1F5F9',
          color: isCrit ? '#DC2626' : isHigh ? '#C2410C' : isMed ? '#B45309' : '#475569',
          border: `1px solid ${isCrit ? '#FECACA' : isHigh ? '#FFEDD5' : isMed ? '#FEF3C7' : '#E2E8F0'}`,
        }}
      >
        <span
          style={{
            width: '5px',
            height: '5px',
            borderRadius: '50%',
            backgroundColor: isCrit ? '#DC2626' : isHigh ? '#C2410C' : isMed ? '#D97706' : '#64748B',
          }}
        />
        {sev}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const isOpen = status === 'Open';
    const isProg = status === 'In Progress';
    const isFixed = status === 'Fixed' || status === 'Resolved';
    return (
      <span
        style={{
          fontSize: '11px',
          fontWeight: 600,
          padding: '2px 8px',
          borderRadius: '12px',
          backgroundColor: isOpen ? '#FEF2F2' : isProg ? '#FFFBEB' : isFixed ? '#ECFDF5' : '#F1F5F9',
          color: isOpen ? '#DC2626' : isProg ? '#D97706' : isFixed ? '#059669' : '#475569',
          border: `1px solid ${isOpen ? '#FECACA' : isProg ? '#FDE68A' : isFixed ? '#A7F3D0' : '#E2E8F0'}`,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        <span
          style={{
            width: '5px',
            height: '5px',
            borderRadius: '50%',
            backgroundColor: isOpen ? '#DC2626' : isProg ? '#D97706' : '#059669',
          }}
        />
        {status}
      </span>
    );
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FFFFFF', display: 'flex', flexDirection: 'column' }}>
      {/* Top Header */}
      <SecuLayerHeader
        onOpenSearch={() => setSearchOpen(true)}
        onOpenExpert={() => setExpertOpen(true)}
      />

      {/* Main Container */}
      <main style={{ flex: 1, padding: '32px 24px 70px', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748B', marginBottom: '20px' }}>
          <Link href="/products" style={{ color: '#475569', fontWeight: 500 }}>
            Products
          </Link>
          <ChevronRight size={14} />
          <span style={{ color: '#0F172A', fontWeight: 600 }}>Cloud</span>
        </div>

        {/* Hero Section Split: Left Copy & Right Interactive Cloud Workspace */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.45fr)',
            gap: '36px',
            alignItems: 'flex-start',
            marginBottom: '60px',
          }}
          className="cloud-hero-grid"
        >
          {/* Hero Left */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingTop: '12px' }}>
            <div>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 12px',
                  borderRadius: '16px',
                  backgroundColor: '#ECFDF5',
                  border: '1px solid #A7F3D0',
                  color: '#059669',
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                <Cloud size={13} />
                SecuLayer Cloud &bull;
              </span>
            </div>

            <h1
              style={{
                fontSize: '42px',
                fontWeight: 800,
                color: '#0F172A',
                letterSpacing: '-0.03em',
                lineHeight: 1.15,
                margin: 0,
                fontFamily: 'var(--font-sans)',
              }}
            >
              Secure your cloud infrastructure across environments.
            </h1>

            <p
              style={{
                fontSize: '15px',
                color: '#475569',
                lineHeight: 1.6,
                margin: 0,
                maxWidth: '520px',
              }}
            >
              Detect misconfigurations, enforce compliance and monitor runtime threats across AWS, Azure, GCP and
              multi-cloud environments.
            </p>

            {/* CTAs */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => router.push('/home')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  fontSize: '14px',
                  boxShadow: '0 2px 4px rgba(37, 99, 235, 0.25)',
                  cursor: 'pointer',
                  border: 'none',
                }}
              >
                <span>Get Started</span>
                <ArrowRight size={16} />
              </button>

              <button
                type="button"
                onClick={() => setExpertOpen(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 22px',
                  borderRadius: '8px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  color: '#0F172A',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                <span>View Documentation</span>
              </button>
            </div>
          </div>

          {/* Hero Right: Live Interactive Cloud Security Workspace matching Screenshot styling */}
          <div style={{ width: '100%' }}>
            <SecuLayerDashboardCard
              mode="cloud"
              initialRepo="AWS - Production"
              initialBranch="us-east-1"
              initialTimeRange="Last 30 days"
              initialTab="Assets"
              initialEngine="Storage"
              onSelectFinding={(f) => setSelectedFinding(f)}
            />
          </div>
        </div>

        {/* ========================================================= */}
        {/* BOTTOM SECTION: TABS & CAPABILITY CARDS */}
        {/* ========================================================= */}
        <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '32px' }}>
          {/* Navigation Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '28px', borderBottom: '1px solid #E2E8F0', paddingBottom: '12px', marginBottom: '28px' }}>
            {[
              { id: 'capabilities', label: 'Key Capabilities' },
              { id: 'providers', label: 'Supported Providers' },
              { id: 'compliance', label: 'Compliance' },
              { id: 'resources', label: 'Resources' },
            ].map((tab) => {
              const isActive = activeBottomTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveBottomTab(tab.id as any)}
                  style={{
                    fontSize: '14px',
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? '#0F172A' : '#64748B',
                    position: 'relative',
                    padding: '4px 0',
                    border: 'none',
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  {tab.label}
                  {isActive && (
                    <span
                      style={{
                        position: 'absolute',
                        bottom: '-13px',
                        left: 0,
                        right: 0,
                        height: '2px',
                        backgroundColor: '#2563EB',
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Tab 1: Key Capabilities (4 Cards in a grid) */}
          {activeBottomTab === 'capabilities' && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '20px',
              }}
              className="capabilities-grid"
            >
              {/* Card 1 */}
              <div
                style={{
                  padding: '20px',
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                  backgroundColor: '#FFFFFF',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    backgroundColor: '#ECFDF5',
                    color: '#059669',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Cloud size={20} />
                </div>
                <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Cloud Security Posture Management (CSPM)
                </h4>
                <p style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.5, margin: 0 }}>
                  Detect and fix misconfigurations across cloud accounts, IAM policies, and storage resources.
                </p>
              </div>

              {/* Card 2 */}
              <div
                style={{
                  padding: '20px',
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                  backgroundColor: '#FFFFFF',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    backgroundColor: '#ECFDF5',
                    color: '#059669',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <FileCode size={20} />
                </div>
                <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Infrastructure as Code Security
                </h4>
                <p style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.5, margin: 0 }}>
                  Scan Terraform, CloudFormation, Kubernetes YAML, and Helm charts before provisioning cloud assets.
                </p>
              </div>

              {/* Card 3 */}
              <div
                style={{
                  padding: '20px',
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                  backgroundColor: '#FFFFFF',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    backgroundColor: '#ECFDF5',
                    color: '#059669',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Boxes size={20} />
                </div>
                <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Kubernetes Security (KSPM)
                </h4>
                <p style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.5, margin: 0 }}>
                  Secure your Kubernetes environments with RBAC auditing, pod security standards, and network policies.
                </p>
              </div>

              {/* Card 4 */}
              <div
                style={{
                  padding: '20px',
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                  backgroundColor: '#FFFFFF',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    backgroundColor: '#ECFDF5',
                    color: '#059669',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <CheckCircle2 size={20} />
                </div>
                <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Compliance & Governance
                </h4>
                <p style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.5, margin: 0 }}>
                  Ensure continuous compliance with industry standards including SOC2, ISO27001, and CIS Benchmarks.
                </p>
              </div>
            </div>
          )}

          {/* Tab 2: Supported Providers */}
          {activeBottomTab === 'providers' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }} className="capabilities-grid">
              {[
                { name: 'Amazon Web Services (AWS)', desc: 'IAM, S3, EC2, RDS, Lambda, EKS, CloudTrail, KMS' },
                { name: 'Google Cloud Platform (GCP)', desc: 'Cloud IAM, GCS, GKE, Cloud Functions, BigQuery' },
                { name: 'Microsoft Azure', desc: 'Azure AD, Key Vault, AKS, Storage Blobs, Virtual Machines' },
                { name: 'Kubernetes Multi-Cluster', desc: 'Managed EKS, GKE, AKS, and Self-Hosted k8s clusters' },
              ].map((prov) => (
                <div key={prov.name} style={{ padding: '16px', borderRadius: '8px', border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC' }}>
                  <div style={{ fontWeight: 600, color: '#0F172A', fontSize: '14px' }}>{prov.name}</div>
                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>{prov.desc}</div>
                </div>
              ))}
            </div>
          )}

          {/* Tab 3: Compliance */}
          {activeBottomTab === 'compliance' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }} className="capabilities-grid">
              {[
                { name: 'CIS Benchmarks v1.4', desc: 'Automated evaluation across AWS, GCP, Azure, and K8s foundations.' },
                { name: 'SOC 2 Type II', desc: 'Security, Confidentiality & Availability trust criteria mapping.' },
                { name: 'ISO/IEC 27001:2022', desc: 'Annex A controls verification and evidence exports.' },
                { name: 'PCI-DSS v4.0', desc: 'Payment card industry multi-cloud compliance posture.' },
              ].map((comp) => (
                <div key={comp.name} style={{ padding: '16px', borderRadius: '8px', border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC' }}>
                  <div style={{ fontWeight: 600, color: '#0F172A', fontSize: '14px' }}>{comp.name}</div>
                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>{comp.desc}</div>
                </div>
              ))}
            </div>
          )}

          {/* Tab 4: Resources */}
          {activeBottomTab === 'resources' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }} className="capabilities-grid">
              {[
                { title: 'CSPM Architecture Guide', desc: 'Agentless read-only IAM role deployment across AWS Organizations and GCP Folders.' },
                { title: 'Terraform Remediation Templates', desc: 'Pre-tested HCL snippets for automatically hardening misconfigured resources.' },
                { title: 'Kubernetes Admission Webhooks', desc: 'Automated OPA Gatekeeper policies for blocking non-compliant cluster pods.' },
              ].map((res) => (
                <div key={res.title} style={{ padding: '18px', borderRadius: '8px', border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC' }}>
                  <div style={{ fontWeight: 600, color: '#0F172A', fontSize: '14px' }}>{res.title}</div>
                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '6px' }}>{res.desc}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Global Modals & Drawers */}
      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} onSelectFinding={(f) => setSelectedFinding(f)} />
      <TalkToExpertModal isOpen={expertOpen} onClose={() => setExpertOpen(false)} />
      <FindingDetailDrawer
        finding={selectedFinding}
        onClose={() => setSelectedFinding(null)}
        onUpdateStatus={handleUpdateStatus}
      />

      <style jsx>{`
        @media (max-width: 1080px) {
          .cloud-hero-grid {
            grid-template-columns: 1fr !important;
          }
          .cloud-mini-sidebar {
            display: none !important;
          }
        }
        @media (max-width: 768px) {
          .capabilities-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
