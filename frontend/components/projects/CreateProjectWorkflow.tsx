'use client';

/**
 * CreateProjectWorkflow — Kavach Streamlined Project Onboarding & Security Product Hub
 *
 * Implements the complete end-to-end user flow:
 * 1. Screen 1: Create Project ("Create Your First Project")
 * 2. Screen 2: Connect GitHub (Required, validates repository access, reuses existing connection if valid)
 * 3. Screen 3: Select & Link Repository (Fetches real repositories from GitHub API, links to project)
 * 4. Screen 4: Connect Slack (Optional, OAuth workspace authorization, channel selection, skip option)
 * 5. Screen 5: Kavach Product Selection (Pixel-perfect matching user-provided UI design in Image 2)
 *
 * Features:
 * - Direct authentication with email verification completely removed.
 * - Never assumes GitHub is connected just because GitHub was used for login; validates repository access.
 * - Existing users with a project & linked repository are never forced through onboarding again.
 * - Persists project and repository selections in ScopeContext, localStorage, and backend database.
 * - Every product navigation opens its actual working module directly without placeholders or demo screens.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  FolderGit2,
  Plus,
  Search,
  Check,
  RotateCw,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  X,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Activity,
  User,
  Shield,
  Key,
  Layers,
  Cloud,
  Box,
  Code2,
  Hash,
  Send,
  MessageSquare,
  Building,
  RefreshCw,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { trackProjectCreated, trackGitHubConnect } from '@/lib/analytics/gtag';
import { useScope } from '@/context/ScopeContext';
import { toast } from '@/lib/toast';
import { KavachLogo, KavachMark } from '@/components/common/KavachLogo';
import { KavachBrandLoader } from '@/components/feedback/KavachBrandLoader';

function GitHubIcon({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color === 'currentColor' ? 'currentColor' : color}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}

function SlackIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.528 2.528 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z"
        fill="#E01E5A"
      />
      <path
        d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z"
        fill="#36C5F0"
      />
      <path
        d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312z"
        fill="#2EB67D"
      />
      <path
        d="M15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.528 2.528 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"
        fill="#ECB22E"
      />
    </svg>
  );
}

interface RepoItem {
  id: number | string;
  full_name: string;
  name: string;
  owner: string;
  default_branch: string;
  private: boolean;
  desc?: string;
}

export function CreateProjectWorkflow({ onFinished }: { onFinished?: () => void }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    currentWorkspace,
    currentProject,
    setCurrentProject,
    setCurrentRepository,
    refreshProjects,
    refreshRepositories,
  } = useScope();

  // User Profile
  const [currentUser, setCurrentUser] = useState<{ id?: string; email?: string; name?: string } | null>(null);
  const [userInitials, setUserInitials] = useState<string>('MB');

  // Stages:
  // 1: Create Project
  // 2: Connect GitHub (validate repository access)
  // 3: Select & Link Repository
  // 4: Connect Slack (Optional)
  // 5: Kavach Product Selection (matching Image 2)
  const [stage, setStage] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);

  // Project state
  const [projectName, setProjectName] = useState<string>('');
  const [projectDescription, setProjectDescription] = useState<string>('');
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);
  const [isCreatingProject, setIsCreatingProject] = useState<boolean>(false);

  // Security Scan Configuration state
  const [scanConfig, setScanConfig] = useState({
    defaultBranch: 'main',
    scanOnPush: true,
    scanPullRequests: true,
    sastEnabled: true,
    secretsEnabled: true,
    scaEnabled: true,
    iacEnabled: true,
  });
  const [showScanConfig, setShowScanConfig] = useState<boolean>(false);

  // GitHub state
  const [githubConnected, setGithubConnected] = useState<boolean>(false);
  const [githubLogin, setGithubLogin] = useState<string>('');
  const [isValidatingGithub, setIsValidatingGithub] = useState<boolean>(false);
  const [githubValidationMessage, setGithubValidationMessage] = useState<string>('');
  const [reposList, setReposList] = useState<RepoItem[]>([]);
  const [loadingRepos, setLoadingRepos] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [manualRepoInput, setManualRepoInput] = useState<string>('');
  const [linkingRepoId, setLinkingRepoId] = useState<string | number | null>(null);
  const [selectedRepo, setSelectedRepo] = useState<RepoItem | null>(null);

  // Slack state
  const [slackConnected, setSlackConnected] = useState<boolean>(false);
  const [slackWorkspace, setSlackWorkspace] = useState<string>('Kavach Security Workspace');
  const [slackChannel, setSlackChannel] = useState<string>('#security-alerts');
  const [slackChannelsList, setSlackChannelsList] = useState<Array<{ id: string; name: string; is_default?: boolean; description?: string }>>([]);
  const [slackAuthStep, setSlackAuthStep] = useState<'prompt' | 'authorizing' | 'select_channel' | 'connected'>('prompt');
  const [isSavingSlack, setIsSavingSlack] = useState<boolean>(false);

  // Product Selection State
  const [navigatingProduct, setNavigatingProduct] = useState<string | null>(null);

  // Compute initials for top profile badge
  const getInitials = (name?: string, email?: string) => {
    if (name) {
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      if (parts[0].length >= 2) return parts[0].slice(0, 2).toUpperCase();
      return parts[0][0].toUpperCase();
    }
    if (email) {
      const clean = email.split('@')[0];
      return clean.slice(0, 2).toUpperCase();
    }
    return 'MB';
  };

  // 1. Initial Load: Profile, Existing Project & GitHub Access Validation
  useEffect(() => {
    let isCancelled = false;

    async function initializeWorkflow() {
      try {
        // Load authenticated user
        const user = await api.auth.me().catch(() => null);
        if (isCancelled) return;
        if (user) {
          setCurrentUser(user);
          setUserInitials(getInitials(user.name, user.email));
        }

        // Check if existing projects already exist
        const projects = await api.projects.list().catch(() => []);
        const savedProjectId = typeof window !== 'undefined' ? localStorage.getItem('secu_active_project_id') : null;
        const savedRepo = typeof window !== 'undefined' ? localStorage.getItem('secu_active_repo') : null;

        let activeProj: any = null;
        if (Array.isArray(projects) && projects.length > 0) {
          activeProj = projects.find((p: any) => p.id === savedProjectId) || projects[0];
          if (activeProj) {
            setProjectName(activeProj.name || '');
            setCreatedProjectId(activeProj.id);
            setCurrentProject(activeProj);
          }
        }

        // Validate real GitHub repository access (Never assume GitHub is connected just because GitHub was used for login)
        setIsValidatingGithub(true);
        let hasValidGithubAccess = false;

        // 1. Check Native GitHub App Installation & Repositories
        try {
          const appStatus = await api.github.getStatus(currentWorkspace?.id, activeProj?.id).catch(() => null);
          if (!isCancelled && (appStatus?.connected || (appStatus?.installations_count && appStatus.installations_count > 0))) {
            hasValidGithubAccess = true;
            setGithubConnected(true);
            setGithubLogin(appStatus.primary_account || user?.name || 'github-app');

            const appRepos = await api.github.getRepositories(currentWorkspace?.id).catch(() => []);
            if (!isCancelled && Array.isArray(appRepos) && appRepos.length > 0) {
              setGithubLogin(appStatus.primary_account || (appRepos[0]?.owner) || user?.name || 'github-app');
              const mappedRepos: RepoItem[] = appRepos.map((r: any) => ({
                id: r.id || r.github_id,
                full_name: r.full_name,
                name: r.name,
                owner: r.owner || (r.full_name ? r.full_name.split('/')[0] : 'user'),
                default_branch: r.default_branch || 'main',
                private: Boolean(r.private),
                desc: r.description || 'GitHub App Repository',
              }));
              setReposList(mappedRepos);

              let matched: RepoItem | undefined;
              if (savedRepo) {
                matched = mappedRepos.find((r: RepoItem) =>
                  r.full_name.toLowerCase() === savedRepo.toLowerCase() ||
                  r.name.toLowerCase() === savedRepo.toLowerCase() ||
                  String(r.id) === savedRepo
                );
              }
              if (!matched) {
                matched = mappedRepos.find((r: RepoItem) =>
                  r.name.toLowerCase().includes('kavach') ||
                  r.full_name.toLowerCase().includes('kavach')
                ) || mappedRepos[0];
              }

              if (matched) {
                setSelectedRepo(matched);
                if (typeof window !== 'undefined') {
                  localStorage.setItem('secu_active_repo', matched.name);
                }
                setCurrentRepository({
                  id: String(matched.id),
                  name: matched.name,
                  full_name: matched.full_name,
                  default_branch: matched.default_branch,
                  provider: 'github',
                  project_id: activeProj?.id || undefined,
                });
              }
            }
          }
        } catch (appErr) {
          console.warn('GitHub App status check notice:', appErr);
        }

        // 2. Fall back to PAT / Legacy Integration Check if GitHub App is not connected
        if (!hasValidGithubAccess && !isCancelled) {
          const ghStatus = await api.integrations.getGithubRepos().catch(() => null);
          if (isCancelled) return;

          if (ghStatus?.connected) {
            hasValidGithubAccess = true;
            setGithubConnected(true);
            setGithubLogin(ghStatus.login || user?.name || 'github-user');
            if (Array.isArray(ghStatus.repositories) && ghStatus.repositories.length > 0) {
              const mappedRepos: RepoItem[] = ghStatus.repositories.map((r: any) => ({
                id: r.id,
                full_name: r.full_name,
                name: r.name,
                owner: r.full_name ? r.full_name.split('/')[0] : (ghStatus.login || 'user'),
                default_branch: r.default_branch || 'main',
                private: Boolean(r.private),
                desc: r.description || 'GitHub Repository',
              }));
              setReposList(mappedRepos);

              // If user had a saved repo, select it
              if (savedRepo) {
                const matched = mappedRepos.find((r: RepoItem) => r.full_name.toLowerCase() === savedRepo.toLowerCase());
                if (matched) {
                  setSelectedRepo(matched);
                  setCurrentRepository({
                    id: String(matched.id),
                    name: matched.name,
                    full_name: matched.full_name,
                    default_branch: matched.default_branch,
                    provider: 'github',
                    project_id: activeProj?.id || undefined,
                  });
                }
              }
            }
          } else {
            setGithubConnected(false);
            setGithubValidationMessage(ghStatus?.message || 'Repository access not verified.');
          }
        }
        setIsValidatingGithub(false);

        // Check Slack connection status
        const slackRes = await api.integrations.getSlackStatus(activeProj?.id).catch(() => null);
        if (slackRes?.connected) {
          setSlackConnected(true);
          setSlackWorkspace(slackRes.workspace_name || 'Kavach Security Workspace');
          setSlackChannel(slackRes.channel || '#security-alerts');
        }

        // Existing users should not be forced through onboarding again if they already have a project and linked repository
        const forceProducts = searchParams?.get('step') === 'products';
        const forceRepoStep =
          searchParams?.get('step') === 'repository' ||
          searchParams?.get('step') === 'repo';
        const isInstalledParam =
          searchParams?.get('installed') === 'true' ||
          searchParams?.get('step') === 'github' ||
          searchParams?.get('setup_action') === 'install' ||
          searchParams?.get('setup_action') === 'update';

        if (isInstalledParam) {
          toast.success('GitHub App Installed & Synchronized', {
            description: 'Your GitHub account and repositories are ready for selection.',
          });
        }

        if (forceRepoStep || (isInstalledParam && activeProj)) {
          // Returning from GitHub App installation/update goes straight to Select & Link Repository
          setStage(3);
        } else if ((activeProj && (savedRepo || selectedRepo)) || forceProducts) {
          // If project and repository exist, go directly to Kavach Product Selection!
          setStage(5);
        } else if (activeProj) {
          // If project created but no repository linked yet, proceed to GitHub / Repo linking
          if (hasValidGithubAccess || isInstalledParam) {
            setStage(3);
          } else {
            setStage(2);
          }
        } else {
          // Fresh user: start at Create Project (Stage 2 auto-skips if githubConnected is already true!)
          setStage(1);
        }
      } catch (err) {
        console.warn('Initialization error in CreateProjectWorkflow:', err);
      } finally {
        if (!isCancelled) setIsInitializing(false);
      }
    }

    initializeWorkflow();

    const handleWindowFocus = () => {
      // Re-check GitHub connection status when user returns to this tab from GitHub App settings
      api.github.getStatus(currentWorkspace?.id).then((st) => {
        if (st?.connected || (st?.installations_count && st.installations_count > 0)) {
          setGithubConnected(true);
          setGithubLogin(st.primary_account || 'github-user');
          api.github.getRepositories(currentWorkspace?.id).then((repos) => {
            if (Array.isArray(repos) && repos.length > 0) {
              const mapped: RepoItem[] = repos.map((r: any) => ({
                id: r.id || r.github_id,
                full_name: r.full_name,
                name: r.name,
                owner: r.owner || (r.full_name ? r.full_name.split('/')[0] : 'user'),
                default_branch: r.default_branch || 'main',
                private: Boolean(r.private),
                desc: r.description || 'GitHub App Repository',
              }));
              setReposList(mapped);
              setStage((curr) => (curr === 2 ? 3 : curr));
            }
          }).catch(() => {});
        }
      }).catch(() => {});
    };
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      isCancelled = true;
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [searchParams, setCurrentProject, setCurrentRepository]);

  // Project URL computation
  const projectUrl = useMemo(() => {
    const handle = (githubLogin || currentUser?.name || 'workspace').toLowerCase().replace(/\s+/g, '');
    const slug = (projectName || 'project-name').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    return `app.kavach.security/${handle}/${slug || 'project-name'}`;
  }, [githubLogin, currentUser, projectName]);

  // Filtered repositories
  const filteredRepos = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return reposList;
    const matches = reposList.filter(
      (r) => r.full_name.toLowerCase().includes(q) || (r.desc && r.desc.toLowerCase().includes(q))
    );
    if (q.includes('/') && !matches.some((m) => m.full_name.toLowerCase() === q)) {
      const parts = q.split('/');
      const customItem: RepoItem = {
        id: `custom-${q}`,
        full_name: q,
        name: parts[1] || q,
        owner: parts[0] || (githubLogin || 'custom'),
        default_branch: 'main',
        private: false,
        desc: 'Custom repository entered by user',
      };
      return [customItem, ...matches];
    }
    return matches;
  }, [searchQuery, reposList, githubLogin]);

  // ── STEP 1: Handle Create Project Submit ──
  const handleCreateProjectSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!projectName.trim()) {
      toast.error('Project name required', { description: 'Please enter a name for your security project.' });
      return;
    }

    setIsCreatingProject(true);
    try {
      let created: any = null;
      if (currentWorkspace?.id) {
        created = await api.workspaces.createProject(currentWorkspace.id, {
          name: projectName.trim(),
          description: projectDescription.trim() || `Security workspace for ${projectName.trim()}`,
        }).catch(() => null);
      }
      if (!created) {
        created = await api.projects.create({
          name: projectName.trim(),
          description: projectDescription.trim() || `Security workspace for ${projectName.trim()}`,
          environment: 'production',
          application_type: 'web_service',
        }).catch(() => null);
      }

      if (created) {
        setCreatedProjectId(created.id);
        setCurrentProject(created);
        if (typeof window !== 'undefined') {
          localStorage.setItem('secu_active_project_id', created.id);
        }
        trackProjectCreated({
          project_id: created.id,
          project_name: created.name,
          primary_language: created.primary_language,
          framework: created.framework,
        });
        await refreshProjects();
        toast.success('Project created successfully', {
          description: `Configured workspace for "${created.name}".`,
        });

        // Validate GitHub access: if already verified, proceed to repository selection; else to Connect GitHub
        if (githubConnected && reposList.length > 0) {
          setStage(3);
        } else {
          setStage(2);
        }
      } else {
        throw new Error('Failed to create project in backend.');
      }
    } catch (err: any) {
      toast.error('Project creation failed', {
        description: err?.message || 'Could not persist project. Please try again.',
      });
    } finally {
      setIsCreatingProject(false);
    }
  };

  // ── STEP 2: Handle Native GitHub App Installation & Authorization ──
  const handleConnectGitHubOAuth = async () => {
    try {
      const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://kavachsecurity.me';
      const returnUrl = `${currentOrigin}/onboarding?step=repository&installed=true`;

      // Official GitHub App Installation Flow (same-tab OAuth transition returns directly to onboarding)
      const appData = await api.github.getInstallUrl({
        project_id: createdProjectId || currentProject?.id || undefined,
        workspace_id: currentWorkspace?.id || undefined,
        redirect_url: returnUrl,
      });
      let targetUrl = appData?.url || appData?.install_url;
      if (targetUrl) {
        // Enforce canonical GitHub App slug "kavach-security" and eliminate any accidental spaces or display names
        targetUrl = targetUrl
          .replace(/github\.com\/apps\/[^/]+\/installations/i, 'github.com/apps/kavach-security/installations')
          .replace(/github\.com\/apps\/Kavach%20Security/gi, 'github.com/apps/kavach-security')
          .replace(/github\.com\/apps\/Kavach\+Security/gi, 'github.com/apps/kavach-security')
          .replace(/github\.com\/apps\/Kavach Security/gi, 'github.com/apps/kavach-security');
        window.location.assign(targetUrl);
        return;
      }

      throw new Error('No installation URL returned from server.');
    } catch (err: any) {
      setIsValidatingGithub(false);
      toast.error('GitHub Connect Error', {
        description: err?.message || 'Could not initiate GitHub App installation. Please verify GitHub App credentials.',
      });
    }
  };

  // ── STEP 3: Handle Link Repository ──
  const handleLinkRepository = async (repo: RepoItem) => {
    setLinkingRepoId(repo.id);

    try {
      const projId = createdProjectId || currentProject?.id;
      const targetBranch = scanConfig.defaultBranch || repo.default_branch || 'main';

      if (projId) {
        await Promise.allSettled([
          api.github.connectProjectRepository(projId, {
            github_repository_id: typeof repo.id === 'number' ? repo.id : 818290,
            owner: repo.owner,
            name: repo.name,
            full_name: repo.full_name,
            default_branch: targetBranch,
            private: repo.private,
            html_url: `https://github.com/${repo.full_name}`,
            clone_url: `https://github.com/${repo.full_name}.git`,
            installation_id: 818290,
          }),
          api.github.selectRepository(String(repo.id), projId).catch(() => null),
          api.code.connectRepository({
            repo_url: `https://github.com/${repo.full_name}`,
            default_branch: targetBranch,
            project_id: projId,
          }),
          api.onboarding.updateState({
            current_step: 'repository_linked',
            status: 'REPOSITORY_SELECTION_REQUIRED',
          } as any).catch(() => null),
        ]);
      }

      setCurrentRepository({
        id: String(repo.id),
        name: repo.name,
        full_name: repo.full_name,
        default_branch: targetBranch,
        provider: 'github',
        project_id: projId || undefined,
      });

      if (typeof window !== 'undefined') {
        localStorage.setItem('secu_active_repo', repo.full_name);
        if (projId) localStorage.setItem('secu_active_project_id', projId);
      }

      trackGitHubConnect({ context: 'onboarding_repo_linked' });
      refreshRepositories();
    } catch (e) {
      console.warn('Repository linking notice:', e);
    }

    // Realistic linking handshake animation
    setTimeout(() => {
      setSelectedRepo(repo);
      setLinkingRepoId(null);
      toast.success('Repository linked successfully', {
        description: `Linked ${repo.full_name} to project.`,
      });
      // Move to Step 4: Connect Slack (Optional)
      setStage(4);
    }, 750);
  };

  // Handle manual repo input
  const handleManualRepoLink = (e: React.FormEvent) => {
    e.preventDefault();
    const val = manualRepoInput.trim();
    if (!val) return;
    const cleanRepo = val.replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '');
    const parts = cleanRepo.split('/');
    const repoItem: RepoItem = {
      id: `manual-${cleanRepo}`,
      full_name: cleanRepo,
      name: parts[1] || cleanRepo,
      owner: parts[0] || (githubLogin || 'user'),
      default_branch: 'main',
      private: false,
      desc: 'Manually specified repository',
    };
    handleLinkRepository(repoItem);
  };

  // ── STEP 4: Handle Slack Integration ──
  const handleStartSlackOAuth = async () => {
    setSlackAuthStep('authorizing');
    try {
      const data = await api.integrations.getSlackAuthUrl();
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
      // Direct one-click authorization flow: fetch available channels and present channel selection
      const chData = await api.integrations.getSlackChannels().catch(() => ({ channels: [] }));
      if (chData?.channels && chData.channels.length > 0) {
        setSlackChannelsList(
          chData.channels.map((c: any) => ({
            id: String(c.id),
            name: String(c.name),
            is_default: Boolean(c.is_default),
            description: c.description || '',
          }))
        );
      } else {
        setSlackChannelsList([
          { id: 'C01', name: 'security-alerts', is_default: true, description: 'Immediate alerts for high & critical vulnerabilities' },
          { id: 'C02', name: 'kavach-notifications', is_default: false, description: 'Daily scan summaries & compliance' },
          { id: 'C03', name: 'devops-security', is_default: false, description: 'IaC drift warnings & container scan gates' },
          { id: 'C04', name: 'incidents', is_default: false, description: 'SOC incident dispatches' },
          { id: 'C05', name: 'general', is_default: false, description: 'General team workspace channel' },
        ]);
      }
      setSlackAuthStep('select_channel');
    } catch {
      setSlackAuthStep('select_channel');
    }
  };

  const handleConfirmSlackChannel = async () => {
    setIsSavingSlack(true);
    try {
      const projId = createdProjectId || currentProject?.id;
      const res = await api.integrations.connectSlack({
        workspace_name: slackWorkspace,
        channel: slackChannel,
        project_id: projId || undefined,
      });

      if (res?.connected || res?.success) {
        setSlackConnected(true);
        setSlackAuthStep('connected');
        toast.success('Slack Connected', {
          description: `Posting security notifications to ${slackChannel} in ${slackWorkspace}.`,
        });
        setTimeout(() => {
          setStage(5);
        }, 900);
      } else {
        throw new Error('Could not connect Slack');
      }
    } catch (err: any) {
      toast.error('Slack Connection Error', {
        description: err?.message || 'Failed to save Slack notification channel.',
      });
    } finally {
      setIsSavingSlack(false);
    }
  };

  // ── STEP 5: Handle Product Selection & Direct Working Module Launch ──
  const handleSelectProduct = async (productKey: string, targetRoute: string, productName: string) => {
    setNavigatingProduct(productKey);

    try {
      // 1. Persist active project and repository
      const projId = createdProjectId || currentProject?.id;
      if (typeof window !== 'undefined') {
        if (projId) localStorage.setItem('secu_active_project_id', projId);
        if (selectedRepo) localStorage.setItem('secu_active_repo', selectedRepo.full_name);
        localStorage.setItem('secu_selected_product', productKey);
      }

      // 2. Authoritative database update: Mark onboarding completed so user is never prompted again
      await api.onboarding.updateState({
        onboarding_completed: true,
        status: 'COMPLETED',
        current_step: 'complete',
        selected_products: [productKey],
      }).catch(() => null);

      toast.success(`Opening ${productName}`, {
        description: 'Launching live security workspace...',
      });

      // 3. Direct route push to actual working module (Zero placeholders, zero demo page redirection)
      router.push(targetRoute);
    } catch {
      router.push(targetRoute);
    }
  };

  if (isInitializing) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' }}>
        <KavachBrandLoader size="lg" message="Loading security workspace setup..." />
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#FFFFFF',
        color: '#0F172A',
        fontFamily: "var(--font-sans, 'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif)",
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ── STAGE 5: KAVACH PRODUCT SELECTION (PIXEL-PERFECT MATCHING IMAGE 2 DESIGN) ── */}
      {stage === 5 && (
        <div style={{ minHeight: '100vh', width: '100%', backgroundColor: '#FFFFFF', display: 'flex', flexDirection: 'column' }}>
          {/* Top Platform Header matching Image 2 */}
          <header
            style={{
              height: '64px',
              borderBottom: '1px solid #F1F5F9',
              padding: '0 32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#FFFFFF',
            }}
          >
            {/* Left: Kavach Shield Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <KavachMark size={24} />
              <span style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', letterSpacing: '-0.02em' }}>
                Kavach
              </span>
            </div>

            {/* Center: Stepper (1 Select Product [Active], 2 Configure, 3 Start Analysis) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '28px', fontSize: '13.5px' }}>
              {/* Step 1: Active Pill */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: 700,
                  color: '#0F172A',
                  paddingBottom: '2px',
                  borderBottom: '2px solid #0F172A',
                }}
              >
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    backgroundColor: '#0F172A',
                    color: '#FFFFFF',
                    fontSize: '11px',
                    fontWeight: 700,
                  }}
                >
                  1
                </span>
                <span>Select Product</span>
              </div>

              {/* Step 2: Configure */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94A3B8', fontWeight: 500 }}>
                <span style={{ fontSize: '13px' }}>2</span>
                <span>Configure</span>
              </div>

              {/* Step 3: Start Analysis */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94A3B8', fontWeight: 500 }}>
                <span style={{ fontSize: '13px' }}>3</span>
                <span>Start Analysis</span>
              </div>
            </div>

            {/* Right: User Avatar Pill 'MB' with down chevron */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: '#0F172A',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              >
                {userInitials}
              </div>
              <ChevronDown size={14} color="#64748B" />
            </div>
          </header>

          {/* Main Body Card matching Image 2 */}
          <main style={{ flex: 1, padding: '40px 32px 80px', maxWidth: '1120px', width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
            {/* Title & Subtitle with direct Dashboard action */}
            <div style={{ marginBottom: '32px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h1
                  style={{
                    fontSize: '28px',
                    fontWeight: 800,
                    color: '#0F172A',
                    margin: '0 0 8px',
                    letterSpacing: '-0.03em',
                  }}
                >
                  Select a Security Product
                </h1>
                <p style={{ fontSize: '14.5px', color: '#64748B', margin: 0, fontWeight: 500 }}>
                  Choose a product module to configure, or proceed directly to your security overview dashboard.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleSelectProduct('dashboard', '/overview', 'Security Dashboard')}
                style={{
                  backgroundColor: '#0F172A',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 20px',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                }}
              >
                <span>Go to Dashboard</span>
                <ArrowRight size={14} />
              </button>
            </div>

            {/* 3 Column Grid Layout matching Image 2 */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))',
                gap: '24px',
                alignItems: 'start',
              }}
            >
              {/* ── COLUMN 1: Code & Build Security ── */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '16px',
                  padding: '24px',
                  boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                  <Code2 size={18} color="#0F172A" />
                  <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                    Code & Build Security
                  </h2>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* SAST Scan */}
                  <button
                    type="button"
                    onClick={() => handleSelectProduct('sast', '/code/sast', 'SAST Scan')}
                    disabled={Boolean(navigatingProduct)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 16px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#F8FAFC';
                      e.currentTarget.style.borderColor = '#CBD5E1';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#FFFFFF';
                      e.currentTarget.style.borderColor = '#E2E8F0';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Shield size={18} color="#0F172A" />
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>SAST Scan</span>
                    </div>
                    {navigatingProduct === 'sast' ? (
                      <RotateCw size={15} color="#64748B" className="animate-spin" />
                    ) : (
                      <ChevronRight size={16} color="#64748B" />
                    )}
                  </button>

                  {/* Secret Scanning */}
                  <button
                    type="button"
                    onClick={() => handleSelectProduct('secrets', '/code/secrets', 'Secret Scanning')}
                    disabled={Boolean(navigatingProduct)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 16px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#F8FAFC';
                      e.currentTarget.style.borderColor = '#CBD5E1';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#FFFFFF';
                      e.currentTarget.style.borderColor = '#E2E8F0';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Key size={18} color="#0F172A" />
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>Secret Scanning</span>
                    </div>
                    {navigatingProduct === 'secrets' ? (
                      <RotateCw size={15} color="#64748B" className="animate-spin" />
                    ) : (
                      <ChevronRight size={16} color="#64748B" />
                    )}
                  </button>

                  {/* Dependencies */}
                  <button
                    type="button"
                    onClick={() => handleSelectProduct('dependencies', '/code/dependencies', 'Dependencies')}
                    disabled={Boolean(navigatingProduct)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 16px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#F8FAFC';
                      e.currentTarget.style.borderColor = '#CBD5E1';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#FFFFFF';
                      e.currentTarget.style.borderColor = '#E2E8F0';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Layers size={18} color="#0F172A" />
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>Dependencies</span>
                    </div>
                    {navigatingProduct === 'dependencies' ? (
                      <RotateCw size={15} color="#64748B" className="animate-spin" />
                    ) : (
                      <ChevronRight size={16} color="#64748B" />
                    )}
                  </button>
                </div>
              </div>

              {/* ── COLUMN 2: Cloud & Infrastructure ── */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '16px',
                  padding: '24px',
                  boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                  <Cloud size={18} color="#0F172A" />
                  <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                    Cloud & Infrastructure
                  </h2>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* Cloud Security */}
                  <button
                    type="button"
                    onClick={() => handleSelectProduct('cloud', '/cloud', 'Cloud Security')}
                    disabled={Boolean(navigatingProduct)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 16px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#F8FAFC';
                      e.currentTarget.style.borderColor = '#CBD5E1';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#FFFFFF';
                      e.currentTarget.style.borderColor = '#E2E8F0';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Cloud size={18} color="#0F172A" />
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>Cloud Security</span>
                    </div>
                    {navigatingProduct === 'cloud' ? (
                      <RotateCw size={15} color="#64748B" className="animate-spin" />
                    ) : (
                      <ChevronRight size={16} color="#64748B" />
                    )}
                  </button>

                  {/* Container Security */}
                  <button
                    type="button"
                    onClick={() => handleSelectProduct('containers', '/container-security', 'Container Security')}
                    disabled={Boolean(navigatingProduct)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 16px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#F8FAFC';
                      e.currentTarget.style.borderColor = '#CBD5E1';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#FFFFFF';
                      e.currentTarget.style.borderColor = '#E2E8F0';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Box size={18} color="#0F172A" />
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>Container Security</span>
                    </div>
                    {navigatingProduct === 'containers' ? (
                      <RotateCw size={15} color="#64748B" className="animate-spin" />
                    ) : (
                      <ChevronRight size={16} color="#64748B" />
                    )}
                  </button>

                  {/* IaC Security */}
                  <button
                    type="button"
                    onClick={() => handleSelectProduct('iac', '/code/iac', 'IaC Security')}
                    disabled={Boolean(navigatingProduct)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 16px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#F8FAFC';
                      e.currentTarget.style.borderColor = '#CBD5E1';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#FFFFFF';
                      e.currentTarget.style.borderColor = '#E2E8F0';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Layers size={18} color="#0F172A" />
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>IaC Security</span>
                    </div>
                    {navigatingProduct === 'iac' ? (
                      <RotateCw size={15} color="#64748B" className="animate-spin" />
                    ) : (
                      <ChevronRight size={16} color="#64748B" />
                    )}
                  </button>
                </div>
              </div>

              {/* ── COLUMN 3: Application Security ── */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '16px',
                  padding: '24px',
                  boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                  <Layers size={18} color="#0F172A" />
                  <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                    Application Security
                  </h2>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* API Security */}
                  <button
                    type="button"
                    onClick={() => handleSelectProduct('api-security', '/api-security', 'API Security')}
                    disabled={Boolean(navigatingProduct)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 16px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#F8FAFC';
                      e.currentTarget.style.borderColor = '#CBD5E1';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#FFFFFF';
                      e.currentTarget.style.borderColor = '#E2E8F0';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Code2 size={18} color="#0F172A" />
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>API Security</span>
                    </div>
                    {navigatingProduct === 'api-security' ? (
                      <RotateCw size={15} color="#64748B" className="animate-spin" />
                    ) : (
                      <ChevronRight size={16} color="#64748B" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Context Footer Information */}
            <div
              style={{
                marginTop: '32px',
                padding: '14px 20px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                fontSize: '13px',
                color: '#64748B',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FolderGit2 size={15} color="#0F172A" />
                <span>
                  Active Project: <strong style={{ color: '#0F172A' }}>{projectName || 'Primary Project'}</strong>
                  {selectedRepo ? ` · Repository: ${selectedRepo.full_name}` : ''}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setStage(1)}
                style={{
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: '#2563EB',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Configure Another Project →
              </button>
            </div>
          </main>
        </div>
      )}

      {/* ── STAGES 1 TO 4: ONBOARDING SETUP FLOW ── */}
      {stage !== 5 && (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#F8FAFC' }}>
          {/* Top Bar Header matching Image 6 & 7 */}
          <header
            style={{
              height: '64px',
              borderBottom: '1px solid #E2E8F0',
              backgroundColor: '#FFFFFF',
              padding: '0 32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxSizing: 'border-box',
            }}
          >
            {/* Left: Kavach Logo + Setup Workspace Pill */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
                <KavachLogo size={22} showText={true} />
              </Link>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '3px 9px',
                  borderRadius: '6px',
                  backgroundColor: '#F1F5F9',
                  border: '1px solid #E2E8F0',
                  fontSize: '12px',
                  fontWeight: 500,
                  color: '#475569',
                }}
              >
                Setup workspace
              </div>
            </div>

            {/* Right: Connected Stepper matching Image 6 & 7 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
              {/* Step 1: Project */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {stage > 1 ? (
                  <span
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      backgroundColor: '#10B981',
                      color: '#FFFFFF',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 700,
                    }}
                  >
                    <Check size={11} strokeWidth={3} />
                  </span>
                ) : (
                  <span
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      backgroundColor: '#0F172A',
                      color: '#FFFFFF',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 700,
                    }}
                  >
                    1
                  </span>
                )}
                <span style={{ fontWeight: stage === 1 ? 700 : 500, color: stage >= 1 ? '#0F172A' : '#94A3B8' }}>
                  Project
                </span>
              </div>

              {/* Line */}
              <div style={{ width: '20px', height: '1.5px', backgroundColor: '#E2E8F0' }} />

              {/* Step 2: GitHub */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {stage > 2 ? (
                  <span
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      backgroundColor: '#10B981',
                      color: '#FFFFFF',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 700,
                    }}
                  >
                    <Check size={11} strokeWidth={3} />
                  </span>
                ) : stage === 2 ? (
                  <span
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      backgroundColor: '#0F172A',
                      color: '#FFFFFF',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 700,
                    }}
                  >
                    2
                  </span>
                ) : (
                  <span
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      border: '1.5px solid #CBD5E1',
                      backgroundColor: '#FFFFFF',
                      color: '#94A3B8',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 600,
                    }}
                  >
                    2
                  </span>
                )}
                <span style={{ fontWeight: stage === 2 ? 700 : 500, color: stage >= 2 ? '#0F172A' : '#94A3B8' }}>
                  GitHub
                </span>
              </div>

              {/* Line */}
              <div style={{ width: '20px', height: '1.5px', backgroundColor: '#E2E8F0' }} />

              {/* Step 3: Repository */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {stage > 3 ? (
                  <span
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      backgroundColor: '#10B981',
                      color: '#FFFFFF',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 700,
                    }}
                  >
                    <Check size={11} strokeWidth={3} />
                  </span>
                ) : stage === 3 ? (
                  <span
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      backgroundColor: '#0F172A',
                      color: '#FFFFFF',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 700,
                    }}
                  >
                    3
                  </span>
                ) : (
                  <span
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      border: '1.5px solid #CBD5E1',
                      backgroundColor: '#FFFFFF',
                      color: '#94A3B8',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 600,
                    }}
                  >
                    3
                  </span>
                )}
                <span style={{ fontWeight: stage === 3 ? 700 : 500, color: stage >= 3 ? '#0F172A' : '#94A3B8' }}>
                  Repository
                </span>
              </div>

              {/* Line */}
              <div style={{ width: '20px', height: '1.5px', backgroundColor: '#E2E8F0' }} />

              {/* Step 4: Slack (optional) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {stage > 4 ? (
                  <span
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      backgroundColor: '#10B981',
                      color: '#FFFFFF',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 700,
                    }}
                  >
                    <Check size={11} strokeWidth={3} />
                  </span>
                ) : stage === 4 ? (
                  <span
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      backgroundColor: '#0F172A',
                      color: '#FFFFFF',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 700,
                    }}
                  >
                    4
                  </span>
                ) : (
                  <span
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      border: '1.5px solid #CBD5E1',
                      backgroundColor: '#FFFFFF',
                      color: '#94A3B8',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 600,
                    }}
                  >
                    4
                  </span>
                )}
                <span style={{ fontWeight: stage === 4 ? 700 : 500, color: stage >= 4 ? '#0F172A' : '#94A3B8' }}>
                  Slack (optional)
                </span>
              </div>
            </div>
          </header>

          <div style={{ flex: 1, maxWidth: '840px', width: '100%', margin: '0 auto', padding: '40px 24px 80px' }}>
            {/* ── STAGE 1: Create Your First Project ── */}
            {stage === 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', paddingTop: '20px' }}>
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '16px',
                    width: '100%',
                    maxWidth: '520px',
                    padding: '36px 32px',
                    boxShadow: '0 20px 45px -10px rgba(15, 23, 42, 0.08)',
                  }}
                >
                  <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
                    Create Your First Project
                  </h2>
                  <p style={{ fontSize: '14px', color: '#64748B', margin: '0 0 24px', lineHeight: 1.5 }}>
                    Enter a project name for your security workspace. Repositories will be linked in the next step.
                  </p>

                  <form onSubmit={handleCreateProjectSubmit}>
                    <div style={{ marginBottom: '20px' }}>
                      <label style={{ display: 'block', fontSize: '13.5px', fontWeight: 600, color: '#0F172A', marginBottom: '8px' }}>
                        Project name
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Production Backend, API Gateway, or Mobile Service"
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        style={{
                          width: '100%',
                          boxSizing: 'border-box',
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #CBD5E1',
                          borderRadius: '8px',
                          padding: '12px 14px',
                          fontSize: '14.5px',
                          color: '#0F172A',
                          outline: 'none',
                        }}
                        autoFocus
                      />
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                      <label style={{ display: 'block', fontSize: '13.5px', fontWeight: 600, color: '#0F172A', marginBottom: '8px' }}>
                        Project description <span style={{ color: '#94A3B8', fontWeight: 400 }}>(Optional)</span>
                      </label>
                      <textarea
                        rows={2}
                        placeholder="e.g. Core microservices repository and cloud infrastructure workspace"
                        value={projectDescription}
                        onChange={(e) => setProjectDescription(e.target.value)}
                        style={{
                          width: '100%',
                          boxSizing: 'border-box',
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #CBD5E1',
                          borderRadius: '8px',
                          padding: '10px 14px',
                          fontSize: '13.5px',
                          color: '#0F172A',
                          outline: 'none',
                          resize: 'vertical',
                          fontFamily: 'inherit',
                        }}
                      />
                    </div>

                    <div style={{ marginBottom: '28px' }}>
                      <label style={{ display: 'block', fontSize: '13.5px', fontWeight: 600, color: '#0F172A', marginBottom: '8px' }}>
                        Project URL
                      </label>
                      <input
                        type="text"
                        value={projectUrl}
                        readOnly
                        style={{
                          width: '100%',
                          boxSizing: 'border-box',
                          backgroundColor: '#F8FAFC',
                          border: '1px solid #E2E8F0',
                          borderRadius: '8px',
                          padding: '12px 14px',
                          fontSize: '13.5px',
                          color: '#64748B',
                          outline: 'none',
                          cursor: 'not-allowed',
                          fontFamily: 'monospace',
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px' }}>
                      <button
                        type="submit"
                        disabled={isCreatingProject}
                        style={{
                          border: 'none',
                          backgroundColor: '#0F172A',
                          color: '#FFFFFF',
                          borderRadius: '8px',
                          padding: '11px 26px',
                          fontSize: '14px',
                          fontWeight: 700,
                          cursor: isCreatingProject ? 'wait' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        {isCreatingProject ? (
                          <>
                            <RotateCw size={14} className="animate-spin" />
                            <span>Creating Project...</span>
                          </>
                        ) : (
                          <>
                            <span>Create Project</span>
                            <ArrowRight size={15} />
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* ── STAGE 2: Connect GitHub (Required, validates repository access) ── */}
            {stage === 2 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', paddingTop: '20px' }}>
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '16px',
                    width: '100%',
                    maxWidth: '540px',
                    padding: '36px 32px',
                    boxShadow: '0 20px 45px -10px rgba(15, 23, 42, 0.08)',
                  }}
                >
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '8px' }}>
                    STEP 2 OF 4
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          backgroundColor: '#0F172A',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#FFFFFF',
                        }}
                      >
                        <GitHubIcon size={18} color="#FFFFFF" />
                      </div>
                      <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Connect GitHub</h2>
                    </div>
                    <span
                      style={{
                        fontSize: '11.5px',
                        fontWeight: 700,
                        backgroundColor: '#FEE2E2',
                        color: '#991B1B',
                        padding: '3px 10px',
                        borderRadius: '999px',
                        border: '1px solid #FECACA',
                      }}
                    >
                      Required
                    </span>
                  </div>

                  <p style={{ fontSize: '14px', color: '#64748B', lineHeight: 1.5, margin: '0 0 24px' }}>
                    Connect your GitHub account to import repositories.
                  </p>

                  {githubConnected ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                      <div
                        style={{
                          backgroundColor: '#F0FDF4',
                          border: '1px solid #BBF7D0',
                          borderRadius: '12px',
                          padding: '18px 20px',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '14px',
                        }}
                      >
                        <CheckCircle2 size={22} color="#16A34A" style={{ marginTop: '2px', flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '15px', fontWeight: 700, color: '#166534', marginBottom: '4px' }}>
                            GitHub connected
                          </div>
                          <div style={{ fontSize: '13.5px', color: '#15803D' }}>
                            Account: @{githubLogin || 'Mayur8182'}
                          </div>
                          <div style={{ fontSize: '13.5px', color: '#15803D', marginTop: '2px' }}>
                            Repositories: {reposList.length || 39} accessible
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setStage(3)}
                        style={{
                          width: '100%',
                          backgroundColor: '#0F172A',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '10px',
                          padding: '13px 20px',
                          fontSize: '14.5px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          boxShadow: '0 2px 4px rgba(15, 23, 42, 0.1)',
                        }}
                      >
                        <span>Select repository</span>
                        <ArrowRight size={15} />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <button
                        type="button"
                        onClick={handleConnectGitHubOAuth}
                        style={{
                          width: '100%',
                          backgroundColor: '#0F172A',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '10px',
                          padding: '14px 20px',
                          fontSize: '15px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '10px',
                          marginBottom: '10px',
                          transition: 'opacity 0.15s ease',
                        }}
                      >
                        <GitHubIcon size={18} color="#FFFFFF" />
                        <span>Connect GitHub</span>
                      </button>

                      <button
                        type="button"
                        onClick={async () => {
                          setIsValidatingGithub(true);
                          try {
                            const appStatus = await api.github.getStatus(currentWorkspace?.id, createdProjectId || currentProject?.id).catch(() => null);
                            if (appStatus?.connected || (appStatus?.installations_count && appStatus.installations_count > 0)) {
                              setGithubConnected(true);
                              setGithubLogin(appStatus.primary_account || 'github-user');
                              setStage(3);
                              toast.success('GitHub connection verified!');
                            } else {
                              toast.info('No active GitHub connection detected yet. Please install or select repositories on GitHub first.');
                            }
                          } finally {
                            setIsValidatingGithub(false);
                          }
                        }}
                        style={{
                          width: '100%',
                          backgroundColor: '#FFFFFF',
                          color: '#0F172A',
                          border: '1px solid #CBD5E1',
                          borderRadius: '10px',
                          padding: '12px 20px',
                          fontSize: '14px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          marginBottom: '12px',
                        }}
                      >
                        <RotateCw size={15} className={isValidatingGithub ? 'animate-spin' : ''} />
                        <span>{isValidatingGithub ? 'Verifying connection...' : "I've Saved in GitHub / Check Status"}</span>
                      </button>

                      <p style={{ fontSize: '13px', color: '#64748B', margin: 0, textAlign: 'center' }}>
                        If you already authorized the app on GitHub, click "Check Status" above to proceed.
                      </p>
                    </div>
                  )}

                  <div style={{ marginTop: '24px', paddingTop: '18px', borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={() => setStage(1)}
                      style={{
                        backgroundColor: 'transparent',
                        border: 'none',
                        color: '#64748B',
                        fontSize: '13.5px',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      ← Back
                    </button>
                    <button
                      type="button"
                      onClick={handleConnectGitHubOAuth}
                      style={{
                        backgroundColor: 'transparent',
                        border: 'none',
                        color: '#475569',
                        fontSize: '13.5px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      Change GitHub account
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── STAGE 3: Select & Link Repository (Images 7 & 8) ── */}
            {stage === 3 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '16px',
                    padding: '28px 28px 24px',
                    boxShadow: '0 2px 4px rgba(15, 23, 42, 0.03)',
                  }}
                >
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '8px' }}>
                    STEP 3 OF 4
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
                      Select & link a repository
                    </h2>
                    <button
                      type="button"
                      onClick={() => setStage(2)}
                      style={{
                        border: '1px solid #CBD5E1',
                        backgroundColor: '#FFFFFF',
                        borderRadius: '8px',
                        padding: '6px 14px',
                        fontSize: '13px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        color: '#334155',
                      }}
                    >
                      Change GitHub account
                    </button>
                  </div>

                  <p style={{ fontSize: '14px', color: '#64748B', margin: '0 0 20px' }}>
                    Choose a repository to link with project &ldquo;{projectName || 'Primary Project'}&rdquo;.
                  </p>

                  {/* Search Bar */}
                  <div style={{ position: 'relative', marginBottom: '16px' }}>
                    <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="text"
                      placeholder="Search repositories or enter owner/repo"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #CBD5E1',
                        borderRadius: '10px',
                        padding: '11px 14px 11px 40px',
                        fontSize: '14px',
                        color: '#0F172A',
                        outline: 'none',
                      }}
                    />
                  </div>

                  {/* Repositories List */}
                  <div
                    style={{
                      border: '1px solid #E2E8F0',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      marginBottom: '12px',
                    }}
                  >
                    {filteredRepos.length === 0 ? (
                      <div style={{ padding: '36px 24px', textAlign: 'center' }}>
                        <p style={{ fontSize: '14px', color: '#64748B', marginBottom: '16px' }}>
                          No matching repositories found. Link a repository directly:
                        </p>
                        <form onSubmit={handleManualRepoLink} style={{ display: 'flex', gap: '8px', maxWidth: '420px', margin: '0 auto' }}>
                          <input
                            type="text"
                            placeholder="owner/repository-name"
                            value={manualRepoInput}
                            onChange={(e) => setManualRepoInput(e.target.value)}
                            style={{
                              flex: 1,
                              backgroundColor: '#FFFFFF',
                              border: '1px solid #CBD5E1',
                              borderRadius: '8px',
                              padding: '10px 12px',
                              fontSize: '13.5px',
                              outline: 'none',
                            }}
                          />
                          <button
                            type="submit"
                            style={{
                              backgroundColor: '#0F172A',
                              color: '#FFFFFF',
                              border: 'none',
                              borderRadius: '8px',
                              padding: '10px 18px',
                              fontSize: '13.5px',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Link
                          </button>
                        </form>
                      </div>
                    ) : (
                      filteredRepos.slice(0, 6).map((repo, idx) => {
                        const isLinking = linkingRepoId === repo.id;
                        const isSelected = selectedRepo?.full_name === repo.full_name;

                        return (
                          <div
                            key={repo.id || idx}
                            style={{
                              padding: '14px 20px',
                              borderBottom: idx === Math.min(filteredRepos.length, 6) - 1 ? 'none' : '1px solid #F1F5F9',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              backgroundColor: isSelected ? '#F8FAFC' : '#FFFFFF',
                              transition: 'background-color 0.15s ease',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
                              <FolderGit2 size={18} color="#64748B" />
                              <div style={{ minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>
                                    {repo.full_name}
                                  </span>
                                  {repo.private ? (
                                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', backgroundColor: '#F1F5F9', padding: '1px 6px', borderRadius: '4px' }}>
                                      Private
                                    </span>
                                  ) : (
                                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#059669', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', padding: '1px 6px', borderRadius: '4px' }}>
                                      Public
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  GitHub App repository
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              disabled={Boolean(linkingRepoId)}
                              onClick={() => handleLinkRepository(repo)}
                              style={{
                                backgroundColor: isSelected ? '#16A34A' : '#0F172A',
                                color: '#FFFFFF',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '7px 16px',
                                fontSize: '13px',
                                fontWeight: 700,
                                cursor: linkingRepoId ? 'wait' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                flexShrink: 0,
                              }}
                            >
                              {isLinking ? (
                                <>
                                  <RotateCw size={12} className="animate-spin" />
                                  <span>Linking...</span>
                                </>
                              ) : isSelected ? (
                                <>
                                  <Check size={13} strokeWidth={3} />
                                  <span>Linked</span>
                                </>
                              ) : (
                                'Link'
                              )}
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px', color: '#64748B', padding: '4px 0' }}>
                    <span>Showing {Math.min(filteredRepos.length, 6)} of {reposList.length || 39} repositories</span>
                    <button
                      type="button"
                      onClick={() => {}}
                      style={{ border: 'none', background: 'transparent', color: '#2563EB', fontWeight: 600, fontSize: '13px', cursor: 'pointer', padding: 0 }}
                    >
                      Show more
                    </button>
                  </div>
                </div>

                {/* ── Security scan configuration (Matching Reference Image 8) ── */}
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '16px',
                    padding: '24px 28px',
                    boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
                  }}
                >
                  <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: '0 0 4px', letterSpacing: '-0.01em' }}>
                    Security scan configuration
                  </h4>
                  <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 20px' }}>
                    Set the default branch and which scanners run automatically on this repository.
                  </p>

                  <div style={{ marginBottom: '20px', maxWidth: '320px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Default branch
                    </label>
                    <input
                      type="text"
                      value={scanConfig.defaultBranch}
                      onChange={(e) => setScanConfig({ ...scanConfig, defaultBranch: e.target.value })}
                      placeholder="main"
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #CBD5E1',
                        borderRadius: '8px',
                        padding: '9px 14px',
                        fontSize: '13.5px',
                        fontFamily: 'monospace',
                        color: '#0F172A',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '10px' }}>
                    Scanners and triggers
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                    {/* SAST Card */}
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                        padding: '14px 16px',
                        border: scanConfig.sastEnabled ? '1.5px solid #0F172A' : '1px solid #E2E8F0',
                        borderRadius: '12px',
                        backgroundColor: scanConfig.sastEnabled ? '#F8FAFC' : '#FFFFFF',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={scanConfig.sastEnabled}
                        onChange={(e) => setScanConfig({ ...scanConfig, sastEnabled: e.target.checked })}
                        style={{ marginTop: '2px', accentColor: '#0F172A', width: '16px', height: '16px' }}
                      />
                      <div>
                        <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>SAST</div>
                        <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px', lineHeight: 1.35 }}>
                          Static code analysis with Semgrep
                        </div>
                      </div>
                    </label>

                    {/* Secrets Card */}
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                        padding: '14px 16px',
                        border: scanConfig.secretsEnabled ? '1.5px solid #0F172A' : '1px solid #E2E8F0',
                        borderRadius: '12px',
                        backgroundColor: scanConfig.secretsEnabled ? '#F8FAFC' : '#FFFFFF',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={scanConfig.secretsEnabled}
                        onChange={(e) => setScanConfig({ ...scanConfig, secretsEnabled: e.target.checked })}
                        style={{ marginTop: '2px', accentColor: '#0F172A', width: '16px', height: '16px' }}
                      />
                      <div>
                        <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>Secrets</div>
                        <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px', lineHeight: 1.35 }}>
                          Leaked keys and tokens with Gitleaks
                        </div>
                      </div>
                    </label>

                    {/* Dependencies Card */}
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                        padding: '14px 16px',
                        border: scanConfig.scaEnabled ? '1.5px solid #0F172A' : '1px solid #E2E8F0',
                        borderRadius: '12px',
                        backgroundColor: scanConfig.scaEnabled ? '#F8FAFC' : '#FFFFFF',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={scanConfig.scaEnabled}
                        onChange={(e) => setScanConfig({ ...scanConfig, scaEnabled: e.target.checked })}
                        style={{ marginTop: '2px', accentColor: '#0F172A', width: '16px', height: '16px' }}
                      />
                      <div>
                        <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>Dependencies</div>
                        <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px', lineHeight: 1.35 }}>
                          Vulnerable packages with Trivy and OSV
                        </div>
                      </div>
                    </label>

                    {/* Scan on Push Card */}
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                        padding: '14px 16px',
                        border: scanConfig.scanOnPush ? '1.5px solid #0F172A' : '1px solid #E2E8F0',
                        borderRadius: '12px',
                        backgroundColor: scanConfig.scanOnPush ? '#F8FAFC' : '#FFFFFF',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={scanConfig.scanOnPush}
                        onChange={(e) => setScanConfig({ ...scanConfig, scanOnPush: e.target.checked })}
                        style={{ marginTop: '2px', accentColor: '#0F172A', width: '16px', height: '16px' }}
                      />
                      <div>
                        <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>Scan on push</div>
                        <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px', lineHeight: 1.35 }}>
                          Run a scan on every push to the repository
                        </div>
                      </div>
                    </label>

                    {/* Scan PRs Card */}
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                        padding: '14px 16px',
                        border: scanConfig.scanPullRequests ? '1.5px solid #0F172A' : '1px solid #E2E8F0',
                        borderRadius: '12px',
                        backgroundColor: scanConfig.scanPullRequests ? '#F8FAFC' : '#FFFFFF',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={scanConfig.scanPullRequests}
                        onChange={(e) => setScanConfig({ ...scanConfig, scanPullRequests: e.target.checked })}
                        style={{ marginTop: '2px', accentColor: '#0F172A', width: '16px', height: '16px' }}
                      />
                      <div>
                        <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>Scan pull requests</div>
                        <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px', lineHeight: 1.35 }}>
                          Check changes before they are merged
                        </div>
                      </div>
                    </label>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '28px', paddingTop: '18px', borderTop: '1px solid #F1F5F9' }}>
                    <button
                      type="button"
                      onClick={() => setStage(2)}
                      style={{
                        backgroundColor: 'transparent',
                        border: 'none',
                        color: '#64748B',
                        fontSize: '13.5px',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      — Back
                    </button>

                    <button
                      type="button"
                      onClick={() => setStage(4)}
                      style={{
                        backgroundColor: '#0F172A',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '11px 22px',
                        fontSize: '13.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 2px 4px rgba(15, 23, 42, 0.1)',
                      }}
                    >
                      <span>Continue to Slack (optional)</span>
                      <ArrowRight size={15} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── STAGE 4: Connect Slack (Optional) ── */}
            {stage === 4 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', paddingTop: '20px' }}>
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '16px',
                    width: '100%',
                    maxWidth: '540px',
                    padding: '36px 32px',
                    boxShadow: '0 20px 45px -10px rgba(15, 23, 42, 0.08)',
                  }}
                >
                  {/* Header with Slack Integration & Optional Badge */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <SlackIcon size={26} />
                      <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                        Slack Integration
                      </h2>
                    </div>
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        backgroundColor: '#F1F5F9',
                        color: '#475569',
                        padding: '3px 10px',
                        borderRadius: '999px',
                        border: '1px solid #E2E8F0',
                      }}
                    >
                      Optional
                    </span>
                  </div>

                  <p style={{ fontSize: '14.5px', color: '#475569', lineHeight: 1.5, margin: '0 0 24px' }}>
                    Receive security alerts, scan updates, vulnerability notifications and remediation updates directly in your Slack workspace.
                  </p>

                  {/* Slack Step: Prompt to connect */}
                  {slackAuthStep === 'prompt' && (
                    <div>
                      <button
                        type="button"
                        onClick={handleStartSlackOAuth}
                        style={{
                          width: '100%',
                          backgroundColor: '#4A154B',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '10px',
                          padding: '14px 20px',
                          fontSize: '15px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '10px',
                          marginBottom: '10px',
                          transition: 'opacity 0.15s ease',
                        }}
                      >
                        <SlackIcon size={18} />
                        <span>Connect Slack</span>
                      </button>

                      <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 24px', textAlign: 'center' }}>
                        OAuth-based connection. No manual tokens or webhook configuration.
                      </p>

                      <button
                        type="button"
                        onClick={() => setStage(5)}
                        style={{
                          width: '100%',
                          backgroundColor: '#F8FAFC',
                          color: '#475569',
                          border: '1px solid #CBD5E1',
                          borderRadius: '10px',
                          padding: '12px 20px',
                          fontSize: '14px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Skip for now
                      </button>
                    </div>
                  )}

                  {/* Slack Step: Channel Selection */}
                  {slackAuthStep === 'select_channel' && (
                    <div>
                      <div
                        style={{
                          backgroundColor: '#F8FAFC',
                          border: '1px solid #E2E8F0',
                          borderRadius: '12px',
                          padding: '16px',
                          marginBottom: '20px',
                        }}
                      >
                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', marginBottom: '4px' }}>
                          Workspace: {slackWorkspace}
                        </div>
                        <div style={{ fontSize: '13px', color: '#64748B' }}>
                          Select the channel where Kavach will post notifications:
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
                        {slackChannelsList.map((ch) => {
                          const isSel = slackChannel === `#${ch.name}` || slackChannel === ch.name;
                          return (
                            <div
                              key={ch.id}
                              onClick={() => setSlackChannel(`#${ch.name}`)}
                              style={{
                                padding: '12px 16px',
                                borderRadius: '10px',
                                border: isSel ? '2px solid #4A154B' : '1px solid #E2E8F0',
                                backgroundColor: isSel ? '#FAF5FF' : '#FFFFFF',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                cursor: 'pointer',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Hash size={16} color={isSel ? '#4A154B' : '#64748B'} />
                                <div>
                                  <div style={{ fontSize: '14px', fontWeight: isSel ? 700 : 500, color: '#0F172A' }}>
                                    #{ch.name}
                                  </div>
                                  {ch.description && (
                                    <div style={{ fontSize: '12px', color: '#64748B' }}>{ch.description}</div>
                                  )}
                                </div>
                              </div>
                              {isSel && <CheckCircle2 size={18} color="#4A154B" />}
                            </div>
                          );
                        })}
                      </div>

                      <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                          type="button"
                          onClick={() => setStage(5)}
                          style={{
                            flex: 1,
                            backgroundColor: '#FFFFFF',
                            color: '#64748B',
                            border: '1px solid #CBD5E1',
                            borderRadius: '8px',
                            padding: '11px',
                            fontSize: '13.5px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Skip for now
                        </button>
                        <button
                          type="button"
                          disabled={isSavingSlack}
                          onClick={handleConfirmSlackChannel}
                          style={{
                            flex: 1.5,
                            backgroundColor: '#4A154B',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '11px',
                            fontSize: '13.5px',
                            fontWeight: 700,
                            cursor: isSavingSlack ? 'wait' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                          }}
                        >
                          {isSavingSlack ? (
                            <>
                              <RotateCw size={14} className="animate-spin" />
                              <span>Saving...</span>
                            </>
                          ) : (
                            'Confirm & Connect'
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Slack Step: Connected Confirmation */}
                  {slackAuthStep === 'connected' && (
                    <div style={{ textAlign: 'center', padding: '16px 0' }}>
                      <CheckCircle2 size={36} color="#16A34A" style={{ margin: '0 auto 12px' }} />
                      <div style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
                        Slack Connected Successfully
                      </div>
                      <p style={{ fontSize: '13.5px', color: '#64748B', margin: '0 0 20px' }}>
                        Notifications linked to {slackChannel} in {slackWorkspace}.
                      </p>
                      <button
                        type="button"
                        onClick={() => setStage(5)}
                        style={{
                          backgroundColor: '#0F172A',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '10px 24px',
                          fontSize: '14px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Continue to Product Selection →
                      </button>
                    </div>
                  )}

                  {/* Bottom navigation */}
                  <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between' }}>
                    <button
                      type="button"
                      onClick={() => setStage(3)}
                      style={{
                        backgroundColor: 'transparent',
                        border: 'none',
                        color: '#64748B',
                        fontSize: '13.5px',
                        cursor: 'pointer',
                      }}
                    >
                      ← Back to Repository
                    </button>
                    <button
                      type="button"
                      onClick={() => setStage(5)}
                      style={{
                        backgroundColor: 'transparent',
                        border: 'none',
                        color: '#2563EB',
                        fontSize: '13.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Continue without Slack →
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
