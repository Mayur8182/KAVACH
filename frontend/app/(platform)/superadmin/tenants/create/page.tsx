'use client';

import React, { useState, useId } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Check,
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  Shield,
  CreditCard,
  Users,
  Boxes,
  Lock,
  Plus,
  Trash2,
  Edit2,
  ExternalLink,
  Cloud,
  CheckCircle2,
  AlertCircle,
  Upload,
  Code2,
  FileCode,
  KeyRound,
  Workflow,
  Server,
  BarChart3,
  ShieldAlert,
  Headphones,
  Package,
  Layers,
  X,
  Radio,
} from 'lucide-react';
import { SuperAdminShell } from '@/components/superadmin/SuperAdminShell';
import { api } from '@/lib/api/client';

// ─────────────────────────────────────────────────────────────────────────────
// Provider SVG Icons (Pixel-accurate for Integrations Grid)
// ─────────────────────────────────────────────────────────────────────────────
function GitHubIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}

function GitLabIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path
        d="M22.65 14.39L20.61 8.12a.84.84 0 00-.31-.41.88.88 0 00-.51-.14.89.89 0 00-.5.15.86.86 0 00-.31.4l-1.9 5.86H6.92L5.02 8.12a.84.84 0 00-.31-.4.88.88 0 00-.51-.15.89.89 0 00-.5.14.86.86 0 00-.31.41L1.35 14.39a.9.9 0 00.33 1.02l10.04 7.29a.57.57 0 00.56 0l10.04-7.29a.9.9 0 00.33-1.02z"
        fill="#FC6D26"
      />
      <path
        d="M22.65 14.39l-10.37 7.53L17.5 14.4h5.15z"
        fill="#E24329"
      />
      <path
        d="M1.35 14.39l10.37 7.53L6.5 14.4H1.35z"
        fill="#E24329"
      />
      <path
        d="M6.5 14.4l5.5 3.99 5.5-3.99H6.5z"
        fill="#FCA326"
      />
    </svg>
  );
}

function BitbucketIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="#0052CC">
      <path d="M2.56 3.01A1.03 1.03 0 001.53 4.2l2.67 16.03a1.04 1.04 0 001.02.87h13.56a1.03 1.03 0 001.02-.87L22.47 4.2a1.03 1.03 0 00-1.03-1.19H2.56zm9.83 12.63H8.38l-1.05-6.28h9.34l-1.05 6.28h-3.23z" />
    </svg>
  );
}

function JenkinsIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" fill="#D33833" />
      <path
        d="M12 6a3.5 3.5 0 00-3.5 3.5c0 .65.18 1.25.5 1.77L7.5 17h9l-1.5-5.73c.32-.52.5-1.12.5-1.77A3.5 3.5 0 0012 6zm-1 3.5a1 1 0 112 0 1 1 0 01-2 0z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

function GitHubActionsIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="4" fill="#2088FF" />
      <circle cx="7" cy="12" r="2.5" fill="#FFFFFF" />
      <circle cx="17" cy="7" r="2.5" fill="#FFFFFF" />
      <circle cx="17" cy="17" r="2.5" fill="#FFFFFF" />
      <path d="M9.5 12h5M14.5 12l-2-3M14.5 12l-2 3" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function GitLabCiIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" fill="#E24329" />
      <path
        d="M7 12l3 3 7-7"
        stroke="#FFFFFF"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AwsIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="4" fill="#232F3E" />
      <path
        d="M6 15c3.5 2.5 8.5 2.5 12 0M16.5 14.5l1.5.5-.5 1.5"
        stroke="#FF9900"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <text x="6.5" y="11" fill="#FFFFFF" fontSize="6" fontWeight="bold" fontFamily="sans-serif">
        AWS
      </text>
    </svg>
  );
}

function AzureIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path
        d="M13.2 3.5l-6.8 9.3 5.4 5.7h7.2L13.2 3.5z"
        fill="#0089D6"
      />
      <path
        d="M5.5 13.5l-3 4.2a.8.8 0 00.6 1.3h8.1l-5.7-5.5z"
        fill="#0072C6"
      />
    </svg>
  );
}

function GcpIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" fill="#F8F9FA" stroke="#E5E7EB" />
      <path d="M12 6v6l5 3" stroke="#4285F4" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="12" r="3" fill="#EA4335" />
      <circle cx="17" cy="15" r="2" fill="#FBBC05" />
      <circle cx="7" cy="15" r="2" fill="#34A853" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Types & Defaults
// ─────────────────────────────────────────────────────────────────────────────
interface AdditionalMember {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function CreateTenantWizardPage() {
  const router = useRouter();
  const fileInputId = useId();

  // Wizard Step (1 to 5)
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Step 1: Organization Details
  const [name, setName] = useState<string>('TechCorp Solutions');
  const [domain, setDomain] = useState<string>('techcorp.com');
  const [orgType, setOrgType] = useState<string>('Technology');
  const [industry, setIndustry] = useState<string>('Software Development');
  const [description, setDescription] = useState<string>(
    'A modern software company focused on building secure applications.'
  );
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [primaryColor, setPrimaryColor] = useState<string>('#2563EB');

  // Step 2: Plan & Entitlements
  const [selectedPlan, setSelectedPlan] = useState<'STARTER' | 'BUSINESS' | 'PRO' | 'ENTERPRISE'>('PRO');

  // Step 3: Admin & Members
  const [adminName, setAdminName] = useState<string>('Rahul Patel');
  const [adminEmail, setAdminEmail] = useState<string>('rahul@techcorp.com');
  const [adminRole, setAdminRole] = useState<string>('Organization Admin');
  const [sendInviteEmail, setSendInviteEmail] = useState<boolean>(true);

  // Additional Members list (matching screenshot default rows)
  const [members, setMembers] = useState<AdditionalMember[]>([
    { id: '1', name: 'Rahul Patel', email: 'rahul@company.com', role: 'Developer' },
    { id: '2', name: 'Priya Sharma', email: 'priya@company.com', role: 'Security' },
    { id: '3', name: 'Amit Singh', email: 'amit@company.com', role: 'Auditor' },
  ]);

  // Inline Add Member state
  const [showAddMember, setShowAddMember] = useState<boolean>(false);
  const [newMemberName, setNewMemberName] = useState<string>('');
  const [newMemberEmail, setNewMemberEmail] = useState<string>('');
  const [newMemberRole, setNewMemberRole] = useState<string>('Developer');

  // Step 4: Integrations (3x3 grid)
  const [integrations, setIntegrations] = useState<Record<string, boolean>>({
    github: false,
    gitlab: false,
    bitbucket: false,
    jenkins: false,
    github_actions: false,
    gitlab_ci: false,
    aws: false,
    azure: false,
    gcp: false,
  });

  // UI / Async State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // ─────────────────────────────────────────────────────────────────────────
  // Step Navigation Validation
  // ─────────────────────────────────────────────────────────────────────────
  const validateStep1 = () => {
    if (!name.trim()) {
      setError('Organization name is required.');
      return false;
    }
    setError(null);
    return true;
  };

  const validateStep3 = () => {
    if (!adminName.trim()) {
      setError('Admin full name is required.');
      return false;
    }
    if (!adminEmail.trim() || !adminEmail.includes('@')) {
      setError('Please provide a valid administrator email address.');
      return false;
    }
    setError(null);
    return true;
  };

  const handleNext = () => {
    setError(null);
    if (currentStep === 1 && !validateStep1()) return;
    if (currentStep === 3 && !validateStep3()) return;
    setCurrentStep((prev) => Math.min(prev + 1, 5));
  };

  const handleBack = () => {
    setError(null);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  // Jump to specific step (from Step 5 Edit buttons)
  const handleEditJump = (stepNumber: number) => {
    setError(null);
    setCurrentStep(stepNumber);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Members Management
  // ─────────────────────────────────────────────────────────────────────────
  const handleAddMember = () => {
    if (!newMemberEmail.trim() || !newMemberEmail.includes('@')) {
      setError('Please enter a valid member email address.');
      return;
    }
    const newMember: AdditionalMember = {
      id: Date.now().toString(),
      name: newMemberName.trim() || newMemberEmail.split('@')[0],
      email: newMemberEmail.trim().toLowerCase(),
      role: newMemberRole,
    };
    setMembers((prev) => [...prev, newMember]);
    setNewMemberName('');
    setNewMemberEmail('');
    setNewMemberRole('Developer');
    setShowAddMember(false);
    setError(null);
  };

  const handleRemoveMember = (id: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
  };

  const handleMemberRoleChange = (id: string, newRole: string) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, role: newRole } : m))
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Logo Upload Handler
  // ─────────────────────────────────────────────────────────────────────────
  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError('Logo file size must be less than 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setLogoUrl(reader.result as string);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Submission Execution (Rule 1 & 6: Real PostgreSQL Persistence)
  // ─────────────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validateStep1() || !validateStep3()) return;
    setIsSubmitting(true);
    setError(null);

    const payload = {
      name: name.trim(),
      domain: domain.trim().toLowerCase(),
      org_type: orgType,
      industry: industry,
      description: description.trim(),
      logo_url: logoUrl.trim() || undefined,
      primary_color: primaryColor,
      region: 'ap-south-1 (Mumbai)',
      plan: selectedPlan,
      repository_limit:
        selectedPlan === 'STARTER'
          ? 5
          : selectedPlan === 'BUSINESS'
          ? 10
          : selectedPlan === 'PRO'
          ? 25
          : 100,
      scan_minutes:
        selectedPlan === 'STARTER'
          ? 1000
          : selectedPlan === 'BUSINESS'
          ? 5000
          : selectedPlan === 'PRO'
          ? 10000
          : 50000,
      team_seats:
        selectedPlan === 'STARTER'
          ? 5
          : selectedPlan === 'BUSINESS'
          ? 10
          : selectedPlan === 'PRO'
          ? 20
          : 100,
      admin_name: adminName.trim(),
      admin_email: adminEmail.trim().toLowerCase(),
      admin_role: adminRole,
      send_invite: sendInviteEmail,
      additional_members: members.map((m) => ({
        name: m.name,
        email: m.email,
        role: m.role.toLowerCase(),
      })),
      integrations_to_enable: Object.entries(integrations)
        .filter(([_, isEnabled]) => isEnabled)
        .map(([key]) => key),
    };

    try {
      const res = await api.superadmin.createTenant(payload);
      if (res && res.id) {
        router.push(`/superadmin/tenants/${res.id}`);
      } else {
        setError('Organization creation completed, but failed to return tenant ID.');
      }
    } catch (err: any) {
      console.error('Tenant creation failed:', err);
      setError(
        err?.message ||
          'Server failed to persist organization. Ensure domain is unique and try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Dynamic Entitlements State based on Selected Plan
  // ─────────────────────────────────────────────────────────────────────────
  const entitlementsList = [
    {
      key: 'sast',
      title: 'SAST',
      icon: Code2,
      enabled: true,
    },
    {
      key: 'cicd_security',
      title: 'CI/CD Security',
      icon: Workflow,
      enabled: true,
    },
    {
      key: 'dast',
      title: 'DAST',
      icon: Shield,
      enabled: selectedPlan !== 'STARTER',
    },
    {
      key: 'cloud_security',
      title: 'Cloud Security',
      icon: Cloud,
      enabled: true,
    },
    {
      key: 'sca',
      title: 'SCA',
      icon: Package,
      enabled: true,
    },
    {
      key: 'infra_management',
      title: 'Infrastructure Management',
      icon: Server,
      enabled: true,
    },
    {
      key: 'container_security',
      title: 'Container Security',
      icon: Boxes,
      enabled: selectedPlan !== 'STARTER',
    },
    {
      key: 'advanced_reporting',
      title: 'Advanced Reporting',
      icon: BarChart3,
      enabled: true,
    },
    {
      key: 'iac_scanning',
      title: 'IaC Scanning',
      icon: FileCode,
      enabled: true,
    },
    {
      key: 'custom_policies',
      title: 'Custom Policies',
      icon: ShieldAlert,
      enabled: selectedPlan === 'ENTERPRISE',
    },
    {
      key: 'secrets_detection',
      title: 'Secrets Detection',
      icon: KeyRound,
      enabled: true,
    },
    {
      key: 'priority_support',
      title: 'Priority Support',
      icon: Headphones,
      enabled: selectedPlan === 'ENTERPRISE',
    },
  ];

  // 9 Integrations
  const integrationsList = [
    {
      id: 'github',
      name: 'GitHub',
      description: 'Connect GitHub for repository import and scanning.',
      icon: GitHubIcon,
    },
    {
      id: 'gitlab',
      name: 'GitLab',
      description: 'Connect GitLab for repository import and scanning.',
      icon: GitLabIcon,
    },
    {
      id: 'bitbucket',
      name: 'Bitbucket',
      description: 'Connect Bitbucket for repository import and scanning.',
      icon: BitbucketIcon,
    },
    {
      id: 'jenkins',
      name: 'Jenkins',
      description: 'Connect Jenkins for CI/CD integration.',
      icon: JenkinsIcon,
    },
    {
      id: 'github_actions',
      name: 'GitHub Actions',
      description: 'Connect GitHub Actions for CI/CD.',
      icon: GitHubActionsIcon,
    },
    {
      id: 'gitlab_ci',
      name: 'GitLab CI',
      description: 'Connect GitLab CI for CI/CD integration.',
      icon: GitLabCiIcon,
    },
    {
      id: 'aws',
      name: 'AWS',
      description: 'Connect AWS for cloud security and infrastructure scanning.',
      icon: AwsIcon,
    },
    {
      id: 'azure',
      name: 'Azure',
      description: 'Connect Azure for cloud security and infrastructure scanning.',
      icon: AzureIcon,
    },
    {
      id: 'gcp',
      name: 'GCP',
      description: 'Connect GCP for cloud security and infrastructure scanning.',
      icon: GcpIcon,
    },
  ];

  const steps = [
    { num: 1, title: 'Organization Details' },
    { num: 2, title: 'Plan & Entitlements' },
    { num: 3, title: 'Admin & Members' },
    { num: 4, title: 'Integrations' },
    { num: 5, title: 'Review & Create' },
  ];

  return (
    <SuperAdminShell>
      <div className="max-w-6xl mx-auto space-y-6 pb-12">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <Link href="/superadmin/tenants" className="hover:text-slate-900 transition-colors">
            Tenant Management
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-900 font-semibold">Create Organization</span>
        </div>

        {/* Page Title & Subtitle + Top Action on Step 5 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Create Organization
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              {currentStep === 5
                ? 'Review the configuration before creating the organization.'
                : 'Set up a new tenant organization on the platform.'}
            </p>
          </div>

          {currentStep === 5 && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Creating Organization...</span>
                </>
              ) : (
                <span>Create Organization</span>
              )}
            </button>
          )}
        </div>

        {/* Stepper Progress Bar */}
        <div className="bg-white px-6 py-4 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="relative flex items-center justify-between max-w-4xl mx-auto">
            {steps.map((s, idx) => {
              const isCompleted = currentStep > s.num;
              const isCurrent = currentStep === s.num;

              return (
                <React.Fragment key={s.num}>
                  <button
                    type="button"
                    onClick={() => {
                      if (currentStep > s.num) {
                        setCurrentStep(s.num);
                      }
                    }}
                    disabled={currentStep < s.num}
                    className={`flex flex-col items-center group relative z-10 focus:outline-none ${
                      currentStep > s.num ? 'cursor-pointer' : 'cursor-default'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 ${
                        isCurrent
                          ? 'bg-blue-600 text-white ring-4 ring-blue-100 shadow-sm'
                          : isCompleted
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-slate-100 text-slate-400 border border-slate-200'
                      }`}
                    >
                      {isCompleted ? <Check className="w-4 h-4" /> : s.num}
                    </div>
                    <span
                      className={`text-xs mt-2 font-medium tracking-tight whitespace-nowrap transition-colors ${
                        isCurrent
                          ? 'text-blue-600 font-bold border-b-2 border-blue-600 pb-0.5'
                          : isCompleted
                          ? 'text-slate-800'
                          : 'text-slate-400'
                      }`}
                    >
                      {s.title}
                    </span>
                  </button>

                  {idx < steps.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-2 -mt-6 transition-colors duration-300 ${
                        currentStep > s.num ? 'bg-blue-600' : 'bg-slate-200'
                      }`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center justify-between gap-3 text-rose-700 text-xs font-medium animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-rose-400 hover:text-rose-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step Content Container */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {/* ================================================================= */}
          {/* STEP 1: ORGANIZATION DETAILS                                      */}
          {/* ================================================================= */}
          {currentStep === 1 && (
            <div className="p-6 sm:p-8 space-y-8">
              {/* Basic Information */}
              <div className="space-y-4">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Basic Information
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Org Name */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Organization name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter organization name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      This will be the display name for the organization.
                    </p>
                  </div>

                  {/* Domain */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Domain (optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. company.com"
                      value={domain}
                      onChange={(e) => setDomain(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Used for SSO and verification.
                    </p>
                  </div>

                  {/* Org Type */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Organization type
                    </label>
                    <div className="relative">
                      <select
                        value={orgType}
                        onChange={(e) => setOrgType(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none transition-all cursor-pointer"
                      >
                        <option value="Technology">Technology</option>
                        <option value="Enterprise">Enterprise</option>
                        <option value="Financial Services">Financial Services</option>
                        <option value="Healthcare">Healthcare</option>
                        <option value="Startup">Startup</option>
                        <option value="Mid-Market">Mid-Market</option>
                        <option value="Academic">Academic</option>
                        <option value="Government">Government</option>
                      </select>
                      <ChevronRight className="w-4 h-4 text-slate-400 absolute right-3 top-3 rotate-90 pointer-events-none" />
                    </div>
                  </div>

                  {/* Industry */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Industry (optional)
                    </label>
                    <div className="relative">
                      <select
                        value={industry}
                        onChange={(e) => setIndustry(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none transition-all cursor-pointer"
                      >
                        <option value="Software Development">Software Development</option>
                        <option value="Technology">Technology</option>
                        <option value="Financial Services">Financial Services</option>
                        <option value="Healthcare">Healthcare</option>
                        <option value="E-Commerce">E-Commerce</option>
                        <option value="Telecommunications">Telecommunications</option>
                        <option value="Consulting">Consulting</option>
                        <option value="Other">Other</option>
                      </select>
                      <ChevronRight className="w-4 h-4 text-slate-400 absolute right-3 top-3 rotate-90 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Description (optional)
                    </label>
                  </div>
                  <div className="relative">
                    <textarea
                      rows={3}
                      maxLength={500}
                      placeholder="Enter a short description about the organization..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                    <div className="absolute right-3 bottom-3 text-[11px] text-slate-400 font-mono">
                      {description.length}/500
                    </div>
                  </div>
                </div>
              </div>

              {/* Branding (optional) */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Branding <span className="text-xs font-normal text-slate-500 lowercase">(optional)</span>
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  {/* Logo Upload Box */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Logo
                    </label>
                    <input
                      id={fileInputId}
                      type="file"
                      accept="image/png, image/jpeg, image/svg+xml"
                      onChange={handleLogoFileChange}
                      className="hidden"
                    />
                    <label
                      htmlFor={fileInputId}
                      className="border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50/50 hover:bg-blue-50/10 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all group"
                    >
                      {logoUrl ? (
                        <div className="flex items-center gap-3">
                          <img
                            src={logoUrl}
                            alt="Logo preview"
                            className="w-12 h-12 object-contain rounded-lg border border-slate-200 bg-white p-1"
                          />
                          <div className="text-left">
                            <p className="text-xs font-bold text-slate-900">Custom Logo Uploaded</p>
                            <p className="text-[11px] text-blue-600">Click to change</p>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                            <Upload className="w-5 h-5" />
                          </div>
                          <p className="text-xs font-bold text-slate-900">Upload logo</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            PNG, JPG Up to 2MB
                          </p>
                        </>
                      )}
                    </label>
                  </div>

                  {/* Primary Color */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Primary color
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <input
                          type="color"
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          className="w-10 h-10 rounded-lg cursor-pointer border border-slate-200 p-0.5 bg-white"
                        />
                      </div>
                      <input
                        type="text"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-[140px]"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Used for tenant branding (optional)
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 1 Actions */}
              <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                <Link
                  href="/superadmin/tenants"
                  className="px-5 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </Link>
                <button
                  type="button"
                  onClick={handleNext}
                  className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
                >
                  <span>Next</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* STEP 2: PLAN & ENTITLEMENTS                                       */}
          {/* ================================================================= */}
          {currentStep === 2 && (
            <div className="p-6 sm:p-8 space-y-8">
              {/* Select Plan */}
              <div className="space-y-4">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Select Plan
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Starter */}
                  <div
                    onClick={() => setSelectedPlan('STARTER')}
                    className={`p-5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                      selectedPlan === 'STARTER'
                        ? 'border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/20 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-sm font-bold text-slate-900">Starter</h3>
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            selectedPlan === 'STARTER'
                              ? 'border-blue-600 bg-blue-600'
                              : 'border-slate-300'
                          }`}
                        >
                          {selectedPlan === 'STARTER' && (
                            <div className="w-1.5 h-1.5 rounded-full bg-white" />
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 mb-6">
                        For small teams getting started.
                      </p>
                    </div>
                    <div>
                      <span className="text-2xl font-bold text-slate-900">$0</span>
                      <span className="text-xs text-slate-500">/month</span>
                    </div>
                  </div>

                  {/* Business */}
                  <div
                    onClick={() => setSelectedPlan('BUSINESS')}
                    className={`p-5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                      selectedPlan === 'BUSINESS'
                        ? 'border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/20 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-sm font-bold text-slate-900">Business</h3>
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            selectedPlan === 'BUSINESS'
                              ? 'border-blue-600 bg-blue-600'
                              : 'border-slate-300'
                          }`}
                        >
                          {selectedPlan === 'BUSINESS' && (
                            <div className="w-1.5 h-1.5 rounded-full bg-white" />
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 mb-6">
                        For growing organizations.
                      </p>
                    </div>
                    <div>
                      <span className="text-2xl font-bold text-slate-900">$99</span>
                      <span className="text-xs text-slate-500">/month</span>
                    </div>
                  </div>

                  {/* Pro (Default Selected) */}
                  <div
                    onClick={() => setSelectedPlan('PRO')}
                    className={`p-5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                      selectedPlan === 'PRO'
                        ? 'border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/30 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-sm font-bold text-slate-900">Pro</h3>
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            selectedPlan === 'PRO'
                              ? 'border-blue-600 bg-blue-600'
                              : 'border-slate-300'
                          }`}
                        >
                          {selectedPlan === 'PRO' && (
                            <div className="w-1.5 h-1.5 rounded-full bg-white" />
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 mb-6">
                        For advanced security teams.
                      </p>
                    </div>
                    <div>
                      <span className="text-2xl font-bold text-slate-900">$299</span>
                      <span className="text-xs text-slate-500">/month</span>
                    </div>
                  </div>

                  {/* Enterprise */}
                  <div
                    onClick={() => setSelectedPlan('ENTERPRISE')}
                    className={`p-5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                      selectedPlan === 'ENTERPRISE'
                        ? 'border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/20 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-sm font-bold text-slate-900">Enterprise</h3>
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            selectedPlan === 'ENTERPRISE'
                              ? 'border-blue-600 bg-blue-600'
                              : 'border-slate-300'
                          }`}
                        >
                          {selectedPlan === 'ENTERPRISE' && (
                            <div className="w-1.5 h-1.5 rounded-full bg-white" />
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 mb-6">
                        Custom pricing with dedicated support.
                      </p>
                    </div>
                    <div>
                      <span className="text-base font-bold text-slate-900">Contact Sales</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Feature Entitlements */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Feature Entitlements
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    These features will be enabled for the organization based on the selected plan.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                  {entitlementsList.map((item) => {
                    const IconComponent = item.icon;
                    return (
                      <div
                        key={item.key}
                        className="flex items-center justify-between py-2 border-b border-slate-100"
                      >
                        <div className="flex items-center gap-3">
                          <IconComponent className="w-4 h-4 text-blue-600" />
                          <span className="text-xs font-medium text-slate-800">
                            {item.title}
                          </span>
                        </div>
                        <span
                          className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                            item.enabled
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                              : 'bg-amber-50 text-amber-700 border border-amber-200/60'
                          }`}
                        >
                          {item.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Step 2 Actions */}
              <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleBack}
                  className="inline-flex items-center gap-2 px-5 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
                >
                  <span>Next</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* STEP 3: ADMIN & MEMBERS                                           */}
          {/* ================================================================= */}
          {currentStep === 3 && (
            <div className="p-6 sm:p-8 space-y-8">
              {/* Organization Admin */}
              <div className="space-y-4">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Organization Admin
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Add the initial organization administrator.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Full name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter full name"
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Email address <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      placeholder="admin@company.com"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Role
                  </label>
                  <div className="relative max-w-md">
                    <select
                      value={adminRole}
                      onChange={(e) => setAdminRole(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none transition-all cursor-pointer"
                    >
                      <option value="Organization Admin">Organization Admin</option>
                      <option value="Security Lead">Security Lead</option>
                      <option value="DevSecOps Admin">DevSecOps Admin</option>
                    </select>
                    <ChevronRight className="w-4 h-4 text-slate-400 absolute right-3 top-3 rotate-90 pointer-events-none" />
                  </div>
                </div>

                <div className="pt-2">
                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={sendInviteEmail}
                      onChange={(e) => setSendInviteEmail(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900">
                        Send invite email
                      </span>
                      <p className="text-[11px] text-slate-400">
                        An invitation email will be sent to join the organization.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Additional Members (optional) */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                      Additional Members <span className="text-xs font-normal text-slate-500 lowercase">(optional)</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      You can add more members now or invite them later.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddMember(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 border border-slate-200 hover:border-slate-300 bg-white rounded-lg text-xs font-semibold text-slate-700 shadow-sm transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Member</span>
                  </button>
                </div>

                {/* Inline Add Member Box */}
                {showAddMember && (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 animate-in fade-in">
                    <p className="text-xs font-bold text-slate-800">New Member Details</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <input
                        type="text"
                        placeholder="Full Name"
                        value={newMemberName}
                        onChange={(e) => setNewMemberName(e.target.value)}
                        className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                      <input
                        type="email"
                        placeholder="Email Address *"
                        value={newMemberEmail}
                        onChange={(e) => setNewMemberEmail(e.target.value)}
                        className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                      <select
                        value={newMemberRole}
                        onChange={(e) => setNewMemberRole(e.target.value)}
                        className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                      >
                        <option value="Developer">Developer</option>
                        <option value="Security">Security</option>
                        <option value="Auditor">Auditor</option>
                        <option value="Admin">Admin</option>
                      </select>
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowAddMember(false)}
                        className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleAddMember}
                        className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold"
                      >
                        Add to List
                      </button>
                    </div>
                  </div>
                )}

                {/* Members Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Name</th>
                        <th className="px-4 py-3">Email</th>
                        <th className="px-4 py-3">Role</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {members.map((member) => (
                        <tr key={member.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3 font-medium text-slate-900">
                            {member.name}
                          </td>
                          <td className="px-4 py-3 text-slate-600">{member.email}</td>
                          <td className="px-4 py-3">
                            <select
                              value={member.role}
                              onChange={(e) =>
                                handleMemberRoleChange(member.id, e.target.value)
                              }
                              className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 font-medium focus:ring-1 focus:ring-blue-500 cursor-pointer"
                            >
                              <option value="Developer">Developer</option>
                              <option value="Security">Security</option>
                              <option value="Auditor">Auditor</option>
                              <option value="Admin">Admin</option>
                            </select>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveMember(member.id)}
                              className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
                              title="Remove member"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {members.length === 0 && (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-4 py-6 text-center text-xs text-slate-400"
                          >
                            No additional members added yet. Click &quot;Add Member&quot; to invite colleagues.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Step 3 Actions */}
              <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleBack}
                  className="inline-flex items-center gap-2 px-5 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
                >
                  <span>Next</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* STEP 4: INTEGRATIONS (3x3 Grid)                                   */}
          {/* ================================================================= */}
          {currentStep === 4 && (
            <div className="p-6 sm:p-8 space-y-6">
              <div>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Integrations
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {integrationsList.map((item) => {
                  const Icon = item.icon;
                  const isConnected = !!integrations[item.id];

                  return (
                    <div
                      key={item.id}
                      className="p-5 rounded-xl border border-slate-200/90 bg-white hover:border-slate-300 transition-all flex flex-col justify-between"
                    >
                      <div className="flex items-start gap-3.5">
                        <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center">
                          <Icon className="w-7 h-7" />
                        </div>
                        <div>
                          <h3 className="text-xs font-bold text-slate-900">{item.name}</h3>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                            {item.description}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() =>
                            setIntegrations((prev) => ({
                              ...prev,
                              [item.id]: !prev[item.id],
                            }))
                          }
                          className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                            isConnected
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold'
                              : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {isConnected ? 'Connected' : 'Connect'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Step 4 Actions */}
              <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-5 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
                >
                  <span>Next</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* STEP 5: REVIEW & CREATE                                           */}
          {/* ================================================================= */}
          {currentStep === 5 && (
            <div className="p-6 sm:p-8 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                {/* ── Left Column ─────────────────────────────────────────── */}
                <div className="space-y-6">
                  {/* Card 1: Organization Details */}
                  <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3.5">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Organization Details
                      </h3>
                      <button
                        type="button"
                        onClick={() => handleEditJump(1)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1">
                        <span className="text-slate-500">Name</span>
                        <span className="font-semibold text-slate-900">{name || 'TechCorp Solutions'}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-500">Domain</span>
                        <span className="font-medium text-slate-700">{domain || 'techcorp.com'}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-500">Type</span>
                        <span className="font-medium text-slate-700">{orgType}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-500">Industry</span>
                        <span className="font-medium text-slate-700">{industry}</span>
                      </div>
                      <div className="flex flex-col py-1">
                        <span className="text-slate-500 mb-1">Description</span>
                        <span className="text-slate-700 leading-relaxed">
                          {description || 'A modern software company focused on building secure applications.'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-2">
                        <span className="text-slate-500">Logo</span>
                        <div className="flex items-center gap-2">
                          {logoUrl ? (
                            <img
                              src={logoUrl}
                              alt="Logo"
                              className="w-8 h-8 rounded object-contain border border-slate-200"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded bg-black text-white flex items-center justify-center font-bold text-xs">
                              {name ? name.slice(0, 1).toUpperCase() : 'T'}
                            </div>
                          )}
                          <span className="font-bold text-slate-900 text-xs">
                            {name || 'TechCorp'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Plan & Entitlements */}
                  <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3.5">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Plan & Entitlements
                      </h3>
                      <button
                        type="button"
                        onClick={() => handleEditJump(2)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div className="flex justify-between items-center py-1">
                        <span className="text-slate-500">Plan</span>
                        <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-bold text-xs uppercase">
                          {selectedPlan}
                        </span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-500">Price</span>
                        <span className="font-semibold text-slate-900">
                          {selectedPlan === 'STARTER'
                            ? '$0/month'
                            : selectedPlan === 'BUSINESS'
                            ? '$99/month'
                            : selectedPlan === 'PRO'
                            ? '$299/month'
                            : 'Contact Sales'}
                        </span>
                      </div>
                      <div className="pt-2">
                        <span className="text-slate-500 block mb-2">Enabled Features</span>
                        <div className="flex flex-wrap gap-1.5">
                          {entitlementsList
                            .filter((item) => item.enabled)
                            .map((item) => (
                              <span
                                key={item.key}
                                className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium"
                              >
                                {item.title}
                              </span>
                            ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Right Column ────────────────────────────────────────── */}
                <div className="space-y-6">
                  {/* Card 3: Organization Admin */}
                  <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3.5">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Organization Admin
                      </h3>
                      <button
                        type="button"
                        onClick={() => handleEditJump(3)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1">
                        <span className="text-slate-500">Name</span>
                        <span className="font-semibold text-slate-900">{adminName || 'Rahul Patel'}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-500">Email</span>
                        <span className="font-medium text-slate-700">{adminEmail || 'rahul@techcorp.com'}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-500">Role</span>
                        <span className="font-medium text-slate-700">{adminRole}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-500">Send Invite</span>
                        <span className="font-medium text-slate-700">
                          {sendInviteEmail ? 'Yes' : 'No'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card 4: Additional Members */}
                  <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3.5">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Additional Members
                      </h3>
                      <button
                        type="button"
                        onClick={() => handleEditJump(3)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                    </div>

                    <div className="space-y-2">
                      {members.map((m) => (
                        <div
                          key={m.id}
                          className="flex items-center justify-between py-1.5 text-xs border-b border-slate-50 last:border-0"
                        >
                          <div>
                            <span className="font-medium text-slate-900">{m.name}</span>
                            <span className="text-slate-500 ml-2">{m.email}</span>
                          </div>
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium">
                            {m.role}
                          </span>
                        </div>
                      ))}
                      {members.length === 0 && (
                        <p className="text-xs text-slate-400 py-1">No additional members added.</p>
                      )}
                    </div>
                  </div>

                  {/* Card 5: Integrations */}
                  <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3.5">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Integrations
                      </h3>
                      <button
                        type="button"
                        onClick={() => handleEditJump(4)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                    </div>

                    <div className="space-y-2">
                      {[
                        { id: 'github', name: 'GitHub', icon: GitHubIcon },
                        { id: 'gitlab', name: 'GitLab', icon: GitLabIcon },
                        { id: 'bitbucket', name: 'Bitbucket', icon: BitbucketIcon },
                        { id: 'aws', name: 'AWS', icon: AwsIcon },
                        { id: 'azure', name: 'Azure', icon: AzureIcon },
                      ].map((prov) => {
                        const Icon = prov.icon;
                        const isConnected = !!integrations[prov.id];

                        return (
                          <div
                            key={prov.id}
                            className="flex items-center justify-between py-1 text-xs"
                          >
                            <div className="flex items-center gap-2.5">
                              <Icon className="w-4 h-4" />
                              <span className="font-medium text-slate-800">{prov.name}</span>
                            </div>
                            <span
                              className={`text-[11px] font-medium ${
                                isConnected ? 'text-emerald-600 font-bold' : 'text-slate-400'
                              }`}
                            >
                              {isConnected ? 'Connected' : 'Not connected'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 5 Back Action */}
              <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleBack}
                  className="inline-flex items-center gap-2 px-5 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Creating Organization...</span>
                    </>
                  ) : (
                    <span>Create Organization</span>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </SuperAdminShell>
  );
}
