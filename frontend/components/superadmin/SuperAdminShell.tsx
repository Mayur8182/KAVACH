'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Building2,
  UserCheck,
  CreditCard,
  Receipt,
  Layers,
  Activity,
  ShieldAlert,
  Sparkles,
  Key,
  GitBranch,
  ShieldCheck,
  Boxes,
  Headphones,
  Bell,
  Server,
  Scale,
  Flag,
  Lock,
  Search,
  LogOut,
  ChevronDown,
  Shield,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { clearAuthToken } from '@/lib/auth/token';
import { toast } from '@/lib/toast';
import { KavachMark } from '@/components/common/KavachLogo';

const SuperAdminShellContext = React.createContext(false);

interface SuperAdminShellProps {
  children: React.ReactNode;
}

interface NavSection {
  label: string;
  items: Array<{
    title: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    matchSubroutes?: boolean;
  }>;
}

export function SuperAdminShell({ children }: SuperAdminShellProps) {
  const isInsideShell = React.useContext(SuperAdminShellContext);
  const pathname = usePathname();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [systemHealthy, setSystemHealthy] = useState<boolean | null>(true);

  useEffect(() => {
    let mounted = true;
    api.auth
      .me()
      .then((user) => {
        if (mounted && user) {
          setCurrentUser(user);
        }
      })
      .catch(() => {});

    api.superadmin
      .getOverviewStats()
      .then((stats) => {
        if (mounted && stats?.scanner_nodes) {
          const healthy = Object.values(stats.scanner_nodes).some((v) => v === 'READY');
          setSystemHealthy(healthy);
        }
      })
      .catch(() => {
        if (mounted) setSystemHealthy(null);
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (isInsideShell) {
    return <>{children}</>;
  }

  const handleLogout = () => {
    toast.success('Signed out successfully', {
      description: 'Founder SuperAdmin session terminated.',
    });
    clearAuthToken();
    localStorage.removeItem('token');
    router.push('/login?logged_out=1');
  };

  const navSections: NavSection[] = [
    {
      label: 'PLATFORM',
      items: [
        { title: 'Overview', href: '/superadmin', icon: LayoutDashboard },
        { title: 'Customers', href: '/superadmin/customers', icon: Users, matchSubroutes: true },
        { title: 'Organizations', href: '/superadmin/tenants', icon: Building2, matchSubroutes: true },
        { title: 'Users & Access', href: '/superadmin/access', icon: UserCheck, matchSubroutes: true },
      ],
    },
    {
      label: 'BUSINESS',
      items: [
        { title: 'Subscriptions', href: '/superadmin/subscriptions', icon: CreditCard, matchSubroutes: true },
        { title: 'Billing & Revenue', href: '/superadmin/billing', icon: Receipt, matchSubroutes: true },
        { title: 'Products & Plans', href: '/superadmin/plans', icon: Layers, matchSubroutes: true },
        { title: 'Analytics', href: '/superadmin/analytics', icon: Activity, matchSubroutes: true },
      ],
    },
    {
      label: 'SECURITY OPERATIONS',
      items: [
        { title: 'Security Ops', href: '/superadmin/security-ops', icon: ShieldAlert, matchSubroutes: true },
        { title: 'AI Agents & MCP', href: '/superadmin/ai-agents', icon: Sparkles, matchSubroutes: true },
        { title: 'API Security', href: '/superadmin/api-security', icon: Key, matchSubroutes: true },
        { title: 'Scan Management', href: '/superadmin/scans', icon: GitBranch, matchSubroutes: true },
        { title: 'Vulnerabilities', href: '/superadmin/vulnerabilities', icon: ShieldCheck, matchSubroutes: true },
      ],
    },
    {
      label: 'OPERATIONS',
      items: [
        { title: 'Integrations', href: '/superadmin/integrations', icon: Boxes, matchSubroutes: true },
        { title: 'Support Center', href: '/superadmin/support', icon: Headphones, matchSubroutes: true },
        { title: 'Notifications', href: '/superadmin/notifications', icon: Bell, matchSubroutes: true },
        { title: 'System Health', href: '/superadmin/infrastructure', icon: Server, matchSubroutes: true },
      ],
    },
    {
      label: 'GOVERNANCE',
      items: [
        { title: 'Audit Logs', href: '/superadmin/security', icon: Scale, matchSubroutes: true },
        { title: 'Platform Settings', href: '/superadmin/flags', icon: Flag, matchSubroutes: true },
        { title: 'Break-Glass Access', href: '/superadmin/internal-access', icon: Lock, matchSubroutes: true },
      ],
    },
  ];

  const isItemActive = (item: { href: string; matchSubroutes?: boolean }) => {
    if (item.href === '/superadmin') {
      return pathname === '/superadmin';
    }
    if (item.matchSubroutes) {
      return pathname === item.href || pathname?.startsWith(item.href + '/');
    }
    return pathname === item.href;
  };

  return (
    <SuperAdminShellContext.Provider value={true}>
      <div className="flex min-h-screen w-full bg-[#FAF9F6] text-[#0F172A] font-sans antialiased">
        {/* SuperAdmin Sidebar with Warm Ivory / Slate Style */}
        <aside className="w-64 flex-shrink-0 bg-white border-r border-[#E8E6E1] flex flex-col justify-between select-none h-screen sticky top-0 overflow-y-auto">
          <div className="flex flex-col">
            {/* Logo Brand Header */}
            <div className="h-16 flex items-center justify-between px-5 border-b border-[#E8E6E1] flex-shrink-0 bg-white">
              <Link href="/superadmin" className="flex items-center gap-2.5">
                <KavachMark size={24} />
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm tracking-tight text-[#0F172A]">Kavach</span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#0B0F17] text-white">
                      Admin
                    </span>
                  </div>
                  <span className="text-[10px] text-[#94A3B8] font-mono leading-none">Founder Center</span>
                </div>
              </Link>
            </div>

            {/* Navigation grouped into 5 enterprise sections */}
            <nav className="p-3 space-y-4">
              {navSections.map((section) => (
                <div key={section.label} className="space-y-1">
                  <div className="px-3 py-1 text-[10px] font-bold tracking-wider text-[#94A3B8] uppercase">
                    {section.label}
                  </div>
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const active = isItemActive(item);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors ${
                          active
                            ? 'bg-[#0B0F17] text-white font-medium shadow-sm'
                            : 'text-[#475569] hover:text-[#0F172A] hover:bg-[#F8FAFC]'
                        }`}
                      >
                        <Icon
                          className={`w-4 h-4 flex-shrink-0 ${
                            active ? 'text-white' : 'text-[#94A3B8]'
                          }`}
                        />
                        <span className="flex-1 truncate">{item.title}</span>
                      </Link>
                    );
                  })}
                </div>
              ))}
            </nav>
          </div>

          {/* System Telemetry & Version Badge */}
          <div className="p-3.5 border-t border-[#E8E6E1] bg-[#FDFCFA] flex-shrink-0 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  systemHealthy ? 'bg-[#16A34A] animate-pulse' : 'bg-[#D97706]'
                }`}
              />
              <span className="text-[11px] font-mono text-[#475569]">
                {systemHealthy ? 'SYSTEM READY' : 'TELEMETRY CHECK'}
              </span>
            </div>
            <span className="text-[10px] font-mono text-[#94A3B8]">v3.2</span>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#FAF9F6]">
          {/* Top Header */}
          <header className="h-16 bg-white border-b border-[#E8E6E1] flex items-center justify-between px-8 gap-4 z-20 sticky top-0">
            {/* Search or Breadcrumbs */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Global search tenants, CVEs, agents, logs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-14 py-1.5 bg-[#FAF9F6] border border-[#E8E6E1] rounded-lg text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#0B0F17] focus:bg-white transition-all"
                />
                <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-[#94A3B8] bg-white px-1 py-0.5 rounded border border-[#E8E6E1] pointer-events-none">
                  /
                </kbd>
              </div>
            </div>

            {/* Right Header: System status + User Profile */}
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-[#E8E6E1] bg-[#FDFCFA] text-[11px] text-[#475569] font-mono">
                <Shield className="w-3 h-3 text-[#16A34A]" />
                <span>Deterministic Mode Active</span>
              </div>

              {/* Profile Menu */}
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-[#F8FAFC] border border-transparent hover:border-[#E8E6E1] transition-colors text-left"
                >
                  <div className="w-7 h-7 rounded-full bg-[#0B0F17] text-white flex items-center justify-center font-bold text-xs font-mono">
                    {currentUser?.name ? currentUser.name.slice(0, 2).toUpperCase() : 'FO'}
                  </div>
                  <div className="hidden sm:flex flex-col">
                    <span className="text-xs font-semibold text-[#0F172A] leading-tight">
                      {currentUser?.name || 'Founder SuperAdmin'}
                    </span>
                    <span className="text-[10px] text-[#94A3B8] font-mono leading-none">
                      {currentUser?.email || 'founder@kavachsecurity.me'}
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-[#94A3B8]" />
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-[#E8E6E1] py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-4 py-2.5 border-b border-[#F3F4F6]">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-xs font-bold text-[#0F172A]">
                          {currentUser?.name || 'Founder SuperAdmin'}
                        </span>
                        <span className="text-[9px] uppercase tracking-wider font-mono bg-[#DCFCE7] text-[#166534] px-1.5 py-0.2 rounded font-semibold">
                          Superuser
                        </span>
                      </div>
                      <p className="text-[11px] text-[#64748B] font-mono truncate">
                        {currentUser?.email || 'founder@kavachsecurity.me'}
                      </p>
                    </div>

                    <Link
                      href="/code"
                      className="flex items-center gap-2 px-4 py-2 text-xs text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                    >
                      <Layers className="w-3.5 h-3.5 text-[#94A3B8]" />
                      <span>Switch to Customer Workspace</span>
                    </Link>

                    <Link
                      href="/superadmin/internal-access"
                      className="flex items-center gap-2 px-4 py-2 text-xs text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                    >
                      <Lock className="w-3.5 h-3.5 text-[#94A3B8]" />
                      <span>Break-Glass Emergency Console</span>
                    </Link>

                    <div className="border-t border-[#F3F4F6] my-1" />

                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2 text-xs text-[#DC2626] hover:bg-[#FEF2F2] text-left transition-colors font-medium"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign out of Control Center</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Page Content Body */}
          <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-[#FAF9F6]">
            <div className="max-w-7xl mx-auto">{children}</div>
          </main>
        </div>
      </div>
    </SuperAdminShellContext.Provider>
  );
}

export default SuperAdminShell;
