import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api/client';
import type { Project } from '@/types/api/projects';
import { FolderGit2, ChevronDown, Plus } from 'lucide-react';

interface ProjectSelectorProps {
  selectedProjectId?: string;
  onSelectProject: (project: Project) => void;
  organizationId?: string;
}

export const ProjectSelector: React.FC<ProjectSelectorProps> = ({
  selectedProjectId,
  onSelectProject,
  organizationId,
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const onSelectRef = React.useRef(onSelectProject);
  onSelectRef.current = onSelectProject;

  useEffect(() => {
    let mounted = true;
    api.projects
      .list({ limit: 100 })
      .then((res) => {
        if (!mounted) return;
        setProjects(res || []);
        if (res && res.length > 0 && !selectedProjectId) {
          onSelectRef.current(res[0]);
        }
      })
      .catch(() => {
        if (mounted) setProjects([]);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [organizationId]);

  const currentProject = projects.find((p) => p.id === selectedProjectId) || projects[0];

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
        <FolderGit2 size={14} style={{ color: 'var(--color-text-muted)' }} />
        <span>{loading ? 'Loading Projects...' : currentProject ? currentProject.name : 'Select Project'}</span>
        <ChevronDown size={12} style={{ color: 'var(--color-text-muted)' }} />
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            width: '240px',
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
          <div style={{ padding: '6px 8px', fontSize: '10px', fontWeight: 'var(--weight-semibold)', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
            Workspaces ({projects.length})
          </div>

          {projects.length === 0 ? (
            <div style={{ padding: '8px 10px', fontSize: '11px', color: 'var(--color-text-muted)' }}>
              No projects found in database
            </div>
          ) : (
            projects.map((proj) => (
              <button
                key={proj.id}
                onClick={() => {
                  onSelectProject(proj);
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
                  background: proj.id === currentProject?.id ? 'var(--color-primary-subtle)' : 'transparent',
                  color: proj.id === currentProject?.id ? 'var(--color-primary-text)' : 'var(--color-text-secondary)',
                  cursor: 'pointer',
                }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {proj.name}
                </span>
                {proj.primary_language && (
                  <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>
                    {proj.primary_language}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};
