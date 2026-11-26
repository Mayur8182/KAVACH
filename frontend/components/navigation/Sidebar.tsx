'use client';

/**
 * Kavach Enterprise Sidebar Navigation
 * Matches Image 3 specification:
 * - 14 clean vertical items (10 Product + 4 Governance & Config)
 * - Single-plane styling (#FFFFFF / #FAFAFA)
 * - Active pill (#F1F5F9, #0F172A bold)
 * - Zero nested accordion clutter
 */

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Code2,
  Key,
  Layers,
  Box,
  Cloud,
  FileCode2,
  Network,
  Link2,
  ShieldCheck,
  Boxes,
  CheckSquare,
  FileText,
  Plug,
  Settings,
  X,
} from 'lucide-react';
import { KavachLogo, KavachMark } from '@/components/common/KavachLogo';

interface NavItem {
  id: string;
  label: string;
  shortLabel?: string;
  href: string;
  icon: React.ComponentType<{ size?: number; color?: string; style?: React.CSSProperties }>;
  exact?: boolean;
  matchPrefixes?: string[];
}

const HOME_NAV_ITEM: NavItem = {
  id: 'home',
  label: 'Home',
  shortLabel: 'Home',
  href: '/home',
  icon: Home,
  exact: true,
  matchPrefixes: ['/home', '/repositories', '/dashboard'],
};

const SECURITY_NAV_ITEMS: NavItem[] = [
  {
    id: 'code-security',
    label: 'Code Security',
    shortLabel: 'Code',
    href: '/code',
    icon: Code2,
    matchPrefixes: ['/code', '/code-security', '/code/sast'],
  },
  {
    id: 'secrets',
    label: 'Secrets',
    shortLabel: 'Secrets',
    href: '/code/secrets',
    icon: Key,
    matchPrefixes: ['/code/secrets', '/secrets'],
  },
  {
    id: 'dependencies',
    label: 'Dependencies',
    shortLabel: 'Deps',
    href: '/code/dependencies',
    icon: Layers,
    matchPrefixes: ['/code/dependencies', '/dependencies'],
  },
  {
    id: 'container',
    label: 'Container',
    shortLabel: 'Container',
    href: '/container-security',
    icon: Box,
    matchPrefixes: ['/container-security', '/code/container'],
  },
  {
    id: 'cloud',
    label: 'Cloud',
    shortLabel: 'Cloud',
    href: '/cloud',
    icon: Cloud,
    matchPrefixes: ['/cloud'],
  },
  {
    id: 'iac',
    label: 'IaC',
    shortLabel: 'IaC',
    href: '/iac',
    icon: FileCode2,
    matchPrefixes: ['/iac', '/code/iac'],
  },
  {
    id: 'api-security',
    label: 'API Security',
    shortLabel: 'APIs',
    href: '/api-security',
    icon: Network,
    matchPrefixes: ['/api-security'],
  },
  {
    id: 'supply-chain',
    label: 'Supply Chain',
    shortLabel: 'Supply',
    href: '/code/supply-chain',
    icon: Link2,
    matchPrefixes: ['/code/supply-chain', '/supply-chain'],
  },
  {
    id: 'compliance',
    label: 'Compliance',
    shortLabel: 'Audit',
    href: '/compliance',
    icon: ShieldCheck,
    matchPrefixes: ['/compliance'],
  },
];

const WORKSPACE_NAV_ITEMS: NavItem[] = [
  {
    id: 'integrations',
    label: 'Integrations',
    shortLabel: 'Connect',
    href: '/integrations',
    icon: Boxes,
    matchPrefixes: ['/integrations'],
  },
  {
    id: 'policies',
    label: 'Policies',
    shortLabel: 'Rules',
    href: '/policies',
    icon: CheckSquare,
    matchPrefixes: ['/policies', '/code/policies'],
  },
  {
    id: 'reports',
    label: 'Reports',
    shortLabel: 'Reports',
    href: '/reports',
    icon: FileText,
    matchPrefixes: ['/reports'],
  },
  {
    id: 'mcp-connections',
    label: 'MCP Connections',
    shortLabel: 'MCP',
    href: '/settings/mcp',
    icon: Plug,
    matchPrefixes: ['/settings/mcp'],
  },
  {
    id: 'settings',
    label: 'Settings',
    shortLabel: 'Settings',
    href: '/settings',
    icon: Settings,
    matchPrefixes: ['/settings'],
  },
];

interface SidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const SecuLayerLogo: React.FC<{ size?: number; color?: string }> = ({ size = 26 }) => (
  <KavachLogo size={size} />
);

export const ThingHexLogo: React.FC<{ size?: number; color?: string }> = ({ size = 26 }) => (
  <KavachMark size={size} />
);

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed = false,
  onToggleCollapse,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const pathname = usePathname() || '';

  const isItemActive = (item: NavItem) => {
    if (item.id === 'code-security') {
      // Don't mark Code Security active if we are on secrets, dependencies, or supply-chain
      if (
        pathname.startsWith('/code/secrets') ||
        pathname.startsWith('/code/dependencies') ||
        pathname.startsWith('/code/supply-chain') ||
        pathname.startsWith('/code/iac')
      ) {
        return false;
      }
      return pathname === '/code' || pathname.startsWith('/code/');
    }

    if (item.id === 'settings' && pathname.startsWith('/settings/mcp')) {
      return false;
    }

    if (item.exact) {
      if (pathname === item.href) return true;
      if (item.matchPrefixes?.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
        return true;
      }
      return false;
    }

    if (pathname === item.href || pathname.startsWith(item.href + '/')) return true;
    if (item.matchPrefixes?.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
      return true;
    }
    return false;
  };

  const renderNavList = (isMobileDrawer: boolean = false) => {
    const collapsed = isCollapsed && !isMobileDrawer;

    const renderItem = (item: NavItem) => {
      const active = isItemActive(item);
      const Icon = item.icon;

      return (
        <Link
          key={item.id}
          href={item.href}
          prefetch={true}
          onClick={() => {
            if (isMobileDrawer && onCloseMobile) onCloseMobile();
          }}
          title={collapsed ? item.label : undefined}
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: '12px',
            padding: collapsed ? '9px 0' : '8px 12px',
            borderRadius: '8px',
            backgroundColor: active ? '#EEF0FD' : 'transparent',
            color: active ? '#4F46E5' : '#5B6175',
            fontWeight: active ? 600 : 500,
            fontSize: '13.5px',
            textDecoration: 'none',
            transition: 'background-color 140ms ease, color 140ms ease',
            margin: '1px 0',
          }}
          onMouseEnter={(e) => {
            if (!active) {
              e.currentTarget.style.backgroundColor = '#F6F7FB';
              e.currentTarget.style.color = '#0F1222';
            }
          }}
          onMouseLeave={(e) => {
            if (!active) {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#5B6175';
            }
          }}
        >
          <Icon
            size={18}
            color={active ? '#4F46E5' : '#5B6175'}
            style={{ flexShrink: 0 }}
          />
          {!collapsed && (
            <span
              style={{
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                letterSpacing: '-0.01em',
              }}
            >
              {item.label}
            </span>
          )}
        </Link>
      );
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {/* Home */}
        {renderItem(HOME_NAV_ITEM)}

        {/* SECURITY Section */}
        <div
          style={{
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: '#8A90A5',
            padding: '14px 12px 4px',
          }}
        >
          SECURITY
        </div>
        {SECURITY_NAV_ITEMS.map(renderItem)}

        {/* WORKSPACE Section */}
        <div
          style={{
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: '#8A90A5',
            padding: '14px 12px 4px',
          }}
        >
          WORKSPACE
        </div>
        {WORKSPACE_NAV_ITEMS.map(renderItem)}
      </div>
    );
  };

  const renderCompactRailItem = (item: NavItem) => {
    const active = isItemActive(item);
    const Icon = item.icon;

    return (
      <Link
        key={item.id}
        href={item.href}
        prefetch={true}
        title={item.label}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '3px',
          width: '44px',
          height: '44px',
          margin: '2px auto',
          borderRadius: '10px',
          backgroundColor: active ? '#EEF0FD' : 'transparent',
          color: active ? '#4F46E5' : '#64748B',
          textDecoration: 'none',
          transition: 'all 140ms ease',
          boxSizing: 'border-box',
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          if (!active) {
            e.currentTarget.style.backgroundColor = '#F1F5F9';
            e.currentTarget.style.color = '#0F172A';
          }
        }}
        onMouseLeave={(e) => {
          if (!active) {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = '#64748B';
          }
        }}
      >
        <Icon
          size={18}
          color={active ? '#4F46E5' : '#64748B'}
          style={{ flexShrink: 0 }}
        />
        <span
          style={{
            fontSize: '9.5px',
            fontWeight: active ? 600 : 500,
            lineHeight: 1,
            letterSpacing: '-0.01em',
            whiteSpace: 'nowrap',
            color: active ? '#4F46E5' : '#64748B',
          }}
        >
          {item.shortLabel || item.label}
        </span>
      </Link>
    );
  };

  const PRIMARY_RAIL_ITEMS: NavItem[] = [
    HOME_NAV_ITEM,
    ...SECURITY_NAV_ITEMS,
  ];

  return (
    <>
      {/* ── DESKTOP COMPACT ICON RAIL (56px Fixed Width) ── */}
      <aside
        aria-label="Kavach Enterprise Navigation Rail"
        className="kavach-desktop-sidebar"
        style={{
          width: '56px',
          minWidth: '56px',
          maxWidth: '56px',
          height: '100vh',
          backgroundColor: '#FFFFFF',
          borderRight: '1px solid #E2E8F0',
          display: 'flex',
          flexDirection: 'column',
          position: 'sticky',
          top: 0,
          zIndex: 40,
          boxSizing: 'border-box',
        }}
      >
        {/* Brand Header */}
        <div
          style={{
            height: '56px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: '1px solid #E2E8F0',
            boxSizing: 'border-box',
            flexShrink: 0,
          }}
        >
          <Link
            href="/repositories"
            prefetch={false}
            title="Kavach Platform"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textDecoration: 'none',
            }}
          >
            <KavachMark size={24} />
          </Link>
        </div>

        {/* Navigation List - Icon + Label Stacked Rail */}
        <nav
          style={{
            flexGrow: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '8px 0',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px',
          }}
        >
          {PRIMARY_RAIL_ITEMS.map(renderCompactRailItem)}
        </nav>

        {/* Bottom Rail: Settings */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '8px 0 12px',
            borderTop: '1px solid #E2E8F0',
            boxSizing: 'border-box',
            flexShrink: 0,
          }}
        >
          {renderCompactRailItem({
            id: 'settings',
            label: 'Settings',
            shortLabel: 'Settings',
            href: '/settings',
            icon: Settings,
            matchPrefixes: ['/settings'],
          })}
        </div>
      </aside>

      {/* ── MOBILE DRAWER ── */}
      {isMobileOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
          }}
        >
          {/* Backdrop */}
          <div
            onClick={onCloseMobile}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.4)',
              backdropFilter: 'blur(2px)',
            }}
          />

          {/* Drawer Body */}
          <div
            style={{
              position: 'relative',
              width: '260px',
              maxWidth: '80vw',
              height: '100%',
              backgroundColor: '#FFFFFF',
              display: 'flex',
              flexDirection: 'column',
              zIndex: 101,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div
              style={{
                height: '56px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 16px',
                borderBottom: '1px solid #F1F5F9',
              }}
            >
              <KavachLogo size={24} textSize={17} />
              <button
                type="button"
                onClick={onCloseMobile}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748B',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <X size={18} />
              </button>
            </div>
            <nav style={{ flexGrow: 1, overflowY: 'auto', padding: '12px' }}>
              {renderNavList(true)}
            </nav>
          </div>
        </div>
      )}
    </>
  );
};
