import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api/client';
import type { Environment } from '@/types/api/environments';
import { Layers, ChevronDown } from 'lucide-react';

interface EnvironmentSelectorProps {
  projectId?: string;
  selectedEnvId?: string;
  onSelectEnv: (env: Environment) => void;
}

export const EnvironmentSelector: React.FC<EnvironmentSelectorProps> = ({
  projectId,
  selectedEnvId,
  onSelectEnv,
}) => {
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const onSelectRef = React.useRef(onSelectEnv);
  onSelectRef.current = onSelectEnv;

  useEffect(() => {
    let mounted = true;
    if (!projectId) {
      setEnvironments([]);
      setLoading(false);
      return;
    }
    api.environments
      .list(projectId)
      .then((res) => {
        if (!mounted) return;
        setEnvironments(res.items || []);
        if (res.items && res.items.length > 0 && !selectedEnvId) {
          onSelectRef.current(res.items[0]);
        }
      })
      .catch(() => {
        if (mounted) setEnvironments([]);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [projectId]);

  const currentEnv = environments.find((e) => e.id === selectedEnvId) || environments[0];

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
        <Layers size={14} style={{ color: 'var(--color-text-muted)' }} />
        <span>{loading ? 'Checking Envs...' : currentEnv ? currentEnv.name : 'No environments configured'}</span>
        <ChevronDown size={12} style={{ color: 'var(--color-text-muted)' }} />
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            width: '210px',
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
          {environments.length === 0 ? (
            <div style={{ padding: '8px 10px', fontSize: '11px', color: 'var(--color-text-muted)' }}>
              No environments configured
            </div>
          ) : (
            environments.map((env) => (
              <button
                key={env.id}
                onClick={() => {
                  onSelectEnv(env);
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
                  background: env.id === currentEnv?.id ? 'var(--color-primary-subtle)' : 'transparent',
                  color: env.id === currentEnv?.id ? 'var(--color-primary-text)' : 'var(--color-text-secondary)',
                  cursor: 'pointer',
                }}
              >
                <span>{env.name}</span>
                <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {env.status}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};
