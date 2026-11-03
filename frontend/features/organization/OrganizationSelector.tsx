import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api/client';
import type { Organization } from '@/types/api/organizations';
import { Building2, ChevronDown } from 'lucide-react';

interface OrganizationSelectorProps {
  selectedOrgId?: string;
  onSelectOrg: (org: Organization) => void;
}

export const OrganizationSelector: React.FC<OrganizationSelectorProps> = ({
  selectedOrgId,
  onSelectOrg,
}) => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const onSelectRef = React.useRef(onSelectOrg);
  onSelectRef.current = onSelectOrg;

  useEffect(() => {
    let mounted = true;
    api.organizations
      .list()
      .then((res) => {
        if (!mounted) return;
        setOrganizations(res.items || []);
        if (res.items && res.items.length > 0 && !selectedOrgId) {
          onSelectRef.current(res.items[0]);
        }
      })
      .catch(() => {
        if (mounted) setOrganizations([]);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const currentOrg = organizations.find((o) => o.id === selectedOrgId) || organizations[0];

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 10px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--color-surface-elevated)',
          border: '1px solid var(--color-border)',
          color: 'var(--color-text-primary)',
          fontSize: '12px',
          fontWeight: 'var(--weight-medium)',
          cursor: 'pointer',
        }}
      >
        <Building2 size={14} style={{ color: 'var(--color-text-muted)' }} />
        <span>{loading ? 'Loading Org...' : currentOrg ? currentOrg.name : 'Default Organization'}</span>
        <ChevronDown size={12} style={{ color: 'var(--color-text-muted)' }} />
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            width: '200px',
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-md)',
            zIndex: 'var(--z-dropdown)',
            padding: '4px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
          }}
          onMouseLeave={() => setIsOpen(false)}
        >
          {organizations.length === 0 ? (
            <div style={{ padding: '8px 10px', fontSize: '11px', color: 'var(--color-text-muted)' }}>
              No organizations configured
            </div>
          ) : (
            organizations.map((org) => (
              <button
                key={org.id}
                onClick={() => {
                  onSelectOrg(org);
                  setIsOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12px',
                  textAlign: 'left',
                  background: org.id === currentOrg?.id ? 'var(--color-primary-subtle)' : 'transparent',
                  color: org.id === currentOrg?.id ? 'var(--color-primary-text)' : 'var(--color-text-secondary)',
                  cursor: 'pointer',
                }}
              >
                <span>{org.name}</span>
                {org.role && <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>{org.role}</span>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};
