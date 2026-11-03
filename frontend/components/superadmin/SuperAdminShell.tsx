'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  ShieldCheck,
  Server,
  Receipt,
  ShieldAlert,
  Headphones,
  Boxes,
  Flag,
  Scale,
  Settings,
  Search,
  Bell,
  Activity,
  LogOut,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Shield,
  Layers,
  Home,
  User,
  GitBranch,
  UserCheck,
  Key,
  Database,
  Clock,
  Users,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { clearAuthToken } from '@/lib/auth/token';
import { toast } from '@/lib/toast';

const SuperAdminShellContext = React.createContext(false);

interface SuperAdminShellProps {
  children: React.ReactNode;
}

export function SuperAdminShell({ children }: SuperAdminShellProps) {
  const isInsideShell = React.useContext(SuperAdminShellContext);
  const pathname = usePathname();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

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
    return () => {
      mounted = false;
    };
  }, []);

  if (isInsideShell) {
    return <>{children}</>;
  }

  const handleLogout = () => {
    toast.success('Signed out successfully', {
      description: 'SuperAdmin session terminated.',
    });
    clearAuthToken();
    localStorage.removeItem('token');
    router.push('/login?logged_out=1');
  };

  const navItems = [
    {
      title: 'Dashboard',
      href: '/superadmin',
      icon: LayoutDashboard,
      active: pathname === '/superadmin',
    },
    {
      title: 'Tenant Management',
      href: '/superadmin/tenants',
      icon: Building2,
      active: pathname?.startsWith('/superadmin/tenants'),
    },
    {
      title: 'Plans & Licensing',
      href: '/superadmin/plans',
      icon: CreditCard,
      active:
        pathname === '/superadmin/plans' ||
        pathname?.startsWith('/superadmin/plans/') ||
        pathname?.startsWith('/superadmin/entitlements') ||
        pathname?.startsWith('/superadmin/quotas'),
    },
    {
      title: 'Access Control',
      href: '/superadmin/access',
      icon: UserCheck,
      active: pathname === '/superadmin/access',
    },
    {
      title: 'Infrastructure',
      href: '/superadmin/infrastructure',
      icon: Server,
      active: pathname === '/superadmin/infrastructure',
    },
    {
      title: 'Billing',
      href: '/superadmin/billing',
      icon: Receipt,
      active: pathname === '/superadmin/billing',
    },
    {
      title: 'Security & Compliance',
      href: '/superadmin/security',
      icon: ShieldCheck,
      active: pathname === '/superadmin/security',
    },
    {
      title: 'Support',
      href: '/superadmin/support',
      icon: Headphones,
      active: pathname === '/superadmin/support',
    },
    {
      title: 'Integrations',
      href: '/superadmin/integrations',
      icon: Boxes,
      active: pathname === '/superadmin/integrations',
    },
    {
      title: 'Feature Flags',
      href: '/superadmin/flags',
      icon: Flag,
      active: pathname === '/superadmin/flags',
    },
    {
      title: 'Founder Profile',
      href: '/superadmin/founder',
      icon: User,
      active: pathname === '/superadmin/founder',
    },
    {
      title: 'Internal Access',
      href: '/superadmin/internal-access',
      icon: ShieldAlert,
      active: pathname === '/superadmin/internal-access',
    },
  ];

  return (
    <SuperAdminShellContext.Provider value={true}>
      <div className="flex min-h-screen w-full bg-[#F8FAFC] text-[#0F172A] font-sans antialiased">
        {/* SuperAdmin Sidebar with Sticky Height & Smooth Scrolling */}
        <aside className="w-64 flex-shrink-0 bg-white border-r border-[#E2E8F0] flex flex-col justify-between select-none h-screen sticky top-0 overflow-y-auto">
          <div className="flex flex-col">
            {/* Logo Brand Header */}
            <div className="h-16 flex items-center px-6 border-b border-[#E2E8F0] flex-shrink-0">
              <span className="font-extrabold text-2xl tracking-tight text-slate-900">
                THiNG
              </span>
            </div>

            {/* Navigation */}
            <nav className="p-3 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isTenantMgmt = item.title === 'Tenant Management';

                return (
                  <div key={item.title} className="space-y-0.5">
                    <Link
                      href={item.href}
                      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs transition-all ${
                        item.active
                          ? 'bg-blue-50 text-blue-600 font-semibold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 flex-shrink-0 ${
                          item.active ? 'text-blue-600' : 'text-slate-500'
                        }`}
                      />
                      <span className="flex-1 truncate">{item.title}</span>
                    </Link>

                    {isTenantMgmt && item.active && (
                      <div className="pl-9 pr-2 py-0.5 space-y-0.5">
                        <Link
                          href="/superadmin/tenants"
                          className={`block px-2.5 py-1.5 rounded-md text-[11px] transition-colors ${
                            pathname === '/superadmin/tenants'
                              ? 'bg-blue-100/60 text-blue-700 font-semibold'
                              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50 font-medium'
                          }`}
                        >
                          All Organizations
                        </Link>
                        <Link
                          href="/superadmin/tenants/create"
                          className={`block px-2.5 py-1.5 rounded-md text-[11px] transition-colors ${
                            pathname === '/superadmin/tenants/create'
                              ? 'bg-blue-100/60 text-blue-700 font-semibold'
                              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50 font-medium'
                          }`}
                        >
                          Create Organization
                        </Link>
                        <Link
                          href="/superadmin/tenants/techcorp"
                          className={`block px-2.5 py-1.5 rounded-md text-[11px] transition-colors ${
                            pathname?.includes('/superadmin/tenants/') &&
                            !pathname?.endsWith('/provisioning') &&
                            !pathname?.endsWith('/create')
                              ? 'bg-blue-100/60 text-blue-700 font-semibold'
                              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50 font-medium'
                          }`}
                        >
                          Tenant Details
                        </Link>
                        <Link
                          href="/superadmin/tenants/provisioning"
                          className={`block px-2.5 py-1.5 rounded-md text-[11px] transition-colors ${
                            pathname === '/superadmin/tenants/provisioning'
                              ? 'bg-blue-100/70 text-blue-700 font-semibold'
                              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50 font-medium'
                          }`}
                        >
                          Provisioning Status
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </div>

          {/* Bottom Space or Version */}
          <div className="p-4 border-t border-[#E2E8F0] bg-slate-50/50 flex-shrink-0">
            <p className="text-[11px] text-slate-400 font-medium">THiNG Control Plane v2.4</p>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Top Header */}
          <header className="h-16 bg-white border-b border-[#E2E8F0] flex items-center justify-between px-8 gap-4 z-20">
            {/* Left Header Spacer */}
            <div className="flex-1 max-w-lg">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search tenants, domains..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-14 py-2 bg-slate-50/70 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all"
                />
                <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200 pointer-events-none">
                  ⌘ K
                </kbd>
              </div>
            </div>

            {/* Right Header: Notification & Founder Profile */}
            <div className="flex items-center gap-4">
              <button
                className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                title="Notifications"
              >
                <Bell className="w-4 h-4 text-slate-600" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full" />
              </button>

              {/* Profile Menu */}
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-slate-50 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-slate-700 text-white flex items-center justify-center font-bold text-xs">
                    SA
                  </div>
                  <span className="text-xs font-semibold text-slate-900">
                    Super Admin
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-xs font-semibold text-slate-900">
                      {currentUser?.name || 'Superadmin User'}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {currentUser?.email || 'admin@kavachsecurity.me'}
                    </p>
                  </div>
                  <Link
                    href="/code"
                    className="flex items-center gap-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50"
                  >
                    <Layers className="w-3.5 h-3.5 text-slate-400" />
                    <span>Switch to Platform Workspace</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 text-left"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content Body */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-[#F8FAFC]">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
    </SuperAdminShellContext.Provider>
  );
}
