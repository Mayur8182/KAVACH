'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import {
  ArrowLeft,
  ChevronRight,
  GitPullRequest,
  GitCommit,
  GitMerge,
  MessageSquare,
  ShieldCheck,
  ShieldAlert,
  Shield,
  Settings,
  Edit3,
  Check,
  X,
  UserCheck,
  MoreVertical,
  Users,
  Copy,
  ExternalLink,
  Calendar,
  LayoutGrid,
  FileCode,
  CheckSquare,
  GitBranch,
  Terminal,
  Bold,
  Italic,
  Code,
  Link as LinkIcon,
  Download,
  Filter,
  Play,
  RotateCw,
  Search,
} from 'lucide-react';
import './pr-activity.css';

// ── Realistic SVG Photo Avatars ──────────────────────────────────────────────
const WomanSecurityAvatar: React.FC = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="pr-act-photo-avatar">
    <circle cx="16" cy="16" r="16" fill="#FCE7F3" />
    <path d="M10 28C10 23.58 12.69 20 16 20C19.31 20 22 23.58 22 28" fill="#BE185D" />
    <circle cx="16" cy="12.5" r="5" fill="#FBCFE8" />
    <path
      d="M11.5 11C11.5 7.5 13.5 6 16 6C18.5 6 20.5 7.5 20.5 11C20.5 12 19.5 13.5 16 13.5C12.5 13.5 11.5 12 11.5 11Z"
      fill="#475569"
    />
    <rect x="13" y="11" width="2.5" height="1.8" rx="0.5" stroke="#1E293B" strokeWidth="0.8" fill="none" />
    <rect x="16.5" y="11" width="2.5" height="1.8" rx="0.5" stroke="#1E293B" strokeWidth="0.8" fill="none" />
    <line x1="15.5" y1="11.8" x2="16.5" y2="11.8" stroke="#1E293B" strokeWidth="0.8" />
    <circle cx="14.2" cy="11.9" r="0.4" fill="#1E293B" />
    <circle cx="17.7" cy="11.9" r="0.4" fill="#1E293B" />
  </svg>
);

const DevTeamAvatar: React.FC = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="pr-act-photo-avatar">
    <circle cx="16" cy="16" r="16" fill="#E0E7FF" />
    <path d="M10 28C10 23.58 12.69 20 16 20C19.31 20 22 23.58 22 28" fill="#4338CA" />
    <circle cx="16" cy="12.5" r="5" fill="#C7D2FE" />
    <path
      d="M12 10C12.5 7 14.5 6 16 6C17.5 6 19.5 7 20 10C19 10 18 9 16 9C14 9 13 10 12 10Z"
      fill="#1E1B4B"
    />
    <circle cx="14.2" cy="12" r="0.6" fill="#1E293B" />
    <circle cx="17.8" cy="12" r="0.6" fill="#1E293B" />
  </svg>
);

// ── Default Seed Data for Screens 8.1 - 8.8 ──────────────────────────────────
const DEFAULT_PR_INFO = {
  number: 237,
  title: 'Add authentication middleware',
  state: 'open',
  head_ref: 'feature/auth-middleware',
  base_ref: 'main',
  author: 'mayur.bharvad',
  commits_count: 12,
  description: 'Add authentication middleware for secure API endpoints.',
};

const DEFAULT_SUMMARY_STATS = {
  total_events: 12,
  commits: 4,
  comments: 6,
  review_events: 2,
  security_events: 5,
  cicd_events: 3,
};

const DEFAULT_TIMELINE_EVENTS = [
  {
    id: 'act-ev-1',
    time: '10:24 AM',
    date: 'Oct 04, 2026',
    category: 'Status Changes',
    author: 'mayur.bharvad',
    avatar_type: 'mk',
    title: 'mayur.bharvad opened this pull request',
    description: 'Add authentication middleware for secure API endpoints.',
    commit_badge: 'a1b2c3d',
    node_icon: 'pr',
    node_color: 'purple',
  },
  {
    id: 'act-ev-2',
    time: '10:32 AM',
    date: 'Oct 04, 2026',
    category: 'Commits',
    author: 'mayur.bharvad',
    avatar_type: 'mk',
    title: 'mayur.bharvad pushed 3 commits',
    commits: [
      { hash: 'f4e5d6c', message: 'Add JWT middleware' },
      { hash: 'd7e8f9a', message: 'Add auth routes' },
      { hash: 'e1f2a3b', message: 'Fix token validation' },
    ],
    node_icon: 'commit',
    node_color: 'blue',
  },
  {
    id: 'act-ev-3',
    time: '10:35 AM',
    date: 'Oct 04, 2026',
    category: 'Security Events',
    author: 'sec-bot',
    avatar_type: 'photo_woman',
    title: 'Security scan completed',
    description: 'SAST scan finished with 2 high, 3 medium findings.',
    badges: [
      { label: '2 High', type: 'danger' },
      { label: '3 Medium', type: 'warning' },
    ],
    node_icon: 'security',
    node_color: 'green',
  },
  {
    id: 'act-ev-4',
    time: '11:02 AM',
    date: 'Oct 04, 2026',
    category: 'CI/CD Events',
    author: 'github-actions',
    avatar_type: 'icon_x',
    title: 'CI checks failed',
    description: 'Build failed due to unit test errors.',
    badges: [{ label: 'Failed', type: 'danger' }],
    has_view_logs: true,
    node_icon: 'gear',
    node_color: 'dark',
  },
  {
    id: 'act-ev-5',
    time: '11:30 AM',
    date: 'Oct 04, 2026',
    category: 'Comments',
    author: 'dev-team',
    avatar_type: 'photo_dev',
    title: 'dev-team commented',
    description: 'Please add input validation for the new routes.',
    node_icon: 'comment',
    node_color: 'blue',
  },
  {
    id: 'act-ev-6',
    time: '12:15 PM',
    date: 'Oct 04, 2026',
    category: 'Commits',
    author: 'mayur.bharvad',
    avatar_type: 'mk',
    title: 'mayur.bharvad pushed new commits',
    commits: [
      { hash: '9c8b7a6', message: 'Add input validation' },
      { hash: '7a6b5c4', message: 'Fix unit tests' },
    ],
    commit_badge: '9c8b7a6',
    node_icon: 'commit',
    node_color: 'blue',
  },
  {
    id: 'act-ev-7',
    time: '12:28 PM',
    date: 'Oct 04, 2026',
    category: 'CI/CD Events',
    author: 'github-actions',
    avatar_type: 'icon_check',
    title: 'CI checks passed',
    description: 'All checks passed successfully.',
    badges: [{ label: 'Passed', type: 'success' }],
    has_view_logs: true,
    node_icon: 'gear',
    node_color: 'dark',
  },
  {
    id: 'act-ev-8',
    time: '12:40 PM',
    date: 'Oct 04, 2026',
    category: 'Security Events',
    author: 'sec-bot',
    avatar_type: 'icon_check',
    title: 'Security scan completed',
    description: 'SAST scan finished with 2 high, 3 medium findings.',
    badges: [
      { label: '2 High', type: 'danger' },
      { label: '3 Medium', type: 'warning' },
    ],
    node_icon: 'security',
    node_color: 'green',
  },
  {
    id: 'act-ev-9',
    time: '01:10 PM',
    date: 'Oct 04, 2026',
    category: 'Reviews',
    author: 'security-team',
    avatar_type: 'icon_user',
    title: 'security-team reviewed',
    description: 'Looks good after the fixes.',
    badges: [{ label: 'Approved', type: 'success' }],
    node_icon: 'user',
    node_color: 'blue',
  },
  {
    id: 'act-ev-10',
    time: '02:05 PM',
    date: 'Oct 04, 2026',
    category: 'Status Changes',
    author: 'mayur.bharvad',
    avatar_type: 'icon_check',
    title: 'Ready for merge',
    description: 'All required checks have passed.',
    node_icon: 'check',
    node_color: 'green',
  },
];

const DEFAULT_COMMITS = [
  { hash: 'f4e5d6c', message: 'Add input validation for auth routes', author: 'mayur.bharvad', time: '2m ago', checks: 'passed' },
  { hash: 'd7e8f9a', message: 'Fix unit tests', author: 'mayur.bharvad', time: '12m ago', checks: 'passed' },
  { hash: 'e1f2a3b', message: 'Update middleware error handling', author: 'mayur.bharvad', time: '25m ago', checks: 'passed' },
  { hash: '9c8b7a6', message: 'Add JWT middleware', author: 'mayur.bharvad', time: '1h ago', checks: 'failed' },
  { hash: '7a6b5c4', message: 'Add auth routes', author: 'mayur.bharvad', time: '1h ago', checks: 'passed' },
  { hash: '3c2d1e0', message: 'Refactor auth service', author: 'mayur.bharvad', time: '2h ago', checks: 'passed' },
  { hash: '5b4a3c2', message: 'Update dependencies', author: 'mayur.bharvad', time: '3h ago', checks: 'passed' },
  { hash: '1a2b3c4', message: 'Initial auth structure', author: 'mayur.bharvad', time: '3h ago', checks: 'passed' },
];

const DEFAULT_COMMENTS_THREADS = [
  {
    id: 'th-1',
    author: 'dev-team',
    role: 'Team',
    time: '18m ago',
    avatar_type: 'photo_dev',
    content: 'Please add input validation for the new routes. We should also handle rate limiting.',
    replies: [
      {
        id: 'rep-1',
        author: 'mayur.bharvad',
        role: 'Author',
        time: '15m ago',
        avatar_type: 'mk',
        content: 'Added input validation in latest commit 9c8b7a6. Please review again.',
      },
    ],
  },
  {
    id: 'th-2',
    author: 'security-team',
    role: 'Team',
    time: '45m ago',
    avatar_type: 'photo_woman',
    content: 'Found a potential hardcoded secret in middleware.js. Please use environment variables.',
    diff: {
      file: 'middleware.js (Line 12)',
      removed: '- const jwtSecret = "mysecret123";',
      added: '+ const jwtSecret = process.env.JWT_SECRET;',
    },
    replies: [],
  },
  {
    id: 'th-3',
    author: 'dev-team',
    role: 'Team',
    time: '1h ago',
    avatar_type: 'photo_dev',
    content: 'Unit tests are failing. Check the CI logs.',
    replies: [],
  },
];

const DEFAULT_SECURITY_SCANS = [
  { time: '12:40 PM', type: 'SAST Scan', severity: 'High', status: 'Completed', details: '2 high, 3 medium findings' },
  { time: '10:35 AM', type: 'SAST Scan', severity: 'High', status: 'Completed', details: '2 high, 3 medium findings' },
  { time: 'Sep 30', type: 'Secrets Scan', severity: 'Medium', status: 'Completed', details: '1 medium finding' },
  { time: 'Sep 29', type: 'Dependency Scan', severity: 'Low', status: 'Completed', details: 'No issues' },
  { time: 'Sep 29', type: 'Code Quality', severity: 'Low', status: 'Completed', details: '2 minor issues' },
];

const DEFAULT_SECURITY_FINDINGS = [
  { id: 'SEC-001', rule: 'Hardcoded secret', severity: 'Critical', file: 'src/auth/middleware.js', status: 'Open' },
  { id: 'SEC-002', rule: 'Insecure JWT handling', severity: 'High', file: 'src/auth/jwt.js', status: 'Open' },
  { id: 'SEC-003', rule: 'Missing input validation', severity: 'High', file: 'src/routes.js', status: 'Open' },
  { id: 'SEC-004', rule: 'SQL injection risk', severity: 'Medium', file: 'src/controllers/db.js', status: 'Open' },
  { id: 'SEC-005', rule: 'XSS in User Input', severity: 'Medium', file: 'src/components/Login.jsx', status: 'Open' },
];

const DEFAULT_CICD_RUNS = [
  { time: '12:28 PM', workflow: 'build-and-test', status: 'Passed', duration: '2m 45s', details: '12/12 checks' },
  { time: '11:02 AM', workflow: 'build-and-test', status: 'Failed', duration: '3m 12s', details: '4/12 checks' },
  { time: 'Sep 30', workflow: 'security-scan', status: 'Passed', duration: '1m 20s', details: 'SAST, Secrets' },
  { time: 'Sep 30', workflow: 'deploy-preview', status: 'Passed', duration: '2m 10s', details: 'Preview env' },
  { time: 'Sep 29', workflow: 'build-and-test', status: 'Passed', duration: '2m 55s', details: '12/12 checks' },
];

const DEFAULT_AUDIT_LOGS = [
  { time: '02:05 PM', user: 'mayur.bharvad', action: 'merge_ready', details: 'All checks passed', ip: '49.207.12.10' },
  { time: '01:10 PM', user: 'security-team', action: 'review', details: 'Approved', ip: '12.234.56.78' },
  { time: '12:40 PM', user: 'sec-bot', action: 'scan_completed', details: '2 high, 3 medium', ip: '18.212.33.44' },
  { time: '11:02 AM', user: 'github-actions', action: 'check_failed', details: 'build-and-test', ip: '52.34.12.11' },
  { time: '10:24 AM', user: 'mayur.bharvad', action: 'pr_opened', details: '#237 created', ip: '49.207.12.10' },
];

export default function PRMasterActivityPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const prId = (params?.prId as string) || '237';

  // Active Screen Tab (8.1 through 8.8)
  const initialTab = searchParams.get('tab') || '8.1';
  const [activeScreenTab, setActiveScreenTab] = useState<string>(initialTab);

  // Core Data State
  const [prInfo, setPrInfo] = useState<any>(DEFAULT_PR_INFO);
  const [stats, setStats] = useState<any>(DEFAULT_SUMMARY_STATS);
  const [timelineEvents, setTimelineEvents] = useState<any[]>(DEFAULT_TIMELINE_EVENTS);
  const [commits, setCommits] = useState<any[]>(DEFAULT_COMMITS);
  const [threads, setThreads] = useState<any[]>(DEFAULT_COMMENTS_THREADS);
  const [newCommentText, setNewCommentText] = useState('');
  const [securityScans] = useState<any[]>(DEFAULT_SECURITY_SCANS);
  const [securityFindings] = useState<any[]>(DEFAULT_SECURITY_FINDINGS);
  const [cicdRuns] = useState<any[]>(DEFAULT_CICD_RUNS);
  const [auditLogs] = useState<any[]>(DEFAULT_AUDIT_LOGS);

  // Sub-tab selections within screens
  const [timelineSubTab, setTimelineSubTab] = useState<'timeline' | 'all' | 'filter'>('timeline');
  const [commitSubTab, setCommitSubTab] = useState<'commits' | 'files' | 'authors'>('commits');
  const [commentsSubTab, setCommentsSubTab] = useState<'comments' | 'review' | 'resolved' | 'all'>('comments');
  const [securitySubTab, setSecuritySubTab] = useState<'all' | 'sast' | 'secrets' | 'deps' | 'quality'>('all');
  const [cicdSubTab, setCicdSubTab] = useState<'all' | 'builds' | 'tests' | 'deploy' | 'checks'>('all');
  const [reviewSubTab, setReviewSubTab] = useState<'all' | 'approvals' | 'requested' | 'pending'>('all');
  const [auditSubTab, setAuditSubTab] = useState<'filters' | 'log' | 'export'>('filters');

  // Audit Filters
  const [filterCheckboxes, setFilterCheckboxes] = useState({
    commits: true,
    comments: true,
    reviews: true,
    security: true,
    cicd: true,
    status: true,
    mentions: false,
    system: false,
  });

  // Modal State
  const [logModal, setLogModal] = useState<{ title: string; content: string } | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editTitle, setEditTitle] = useState(DEFAULT_PR_INFO.title);
  const [editDesc, setEditDesc] = useState(DEFAULT_PR_INFO.description);
  const [mergeModalOpen, setMergeModalOpen] = useState(false);
  const [isMerged, setIsMerged] = useState(false);

  // Fetch backend activity dataset
  const loadData = useCallback(async () => {
    try {
      const res = await api.request<any>(`/api/v1/pull-requests/${prId}/activity`);
      const payload = res?.data || res;
      if (payload) {
        if (payload.pr_info) setPrInfo((prev: any) => ({ ...prev, ...payload.pr_info }));
        if (payload.summary_stats) setStats(payload.summary_stats);
        if (payload.timeline_events) setTimelineEvents(payload.timeline_events);
        if (payload.commit_activity) setCommits(payload.commit_activity);
        if (payload.comments_activity) setThreads(payload.comments_activity);
      }
    } catch {
      // Deterministic fallback to initial seed dataset
    }
  }, [prId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle New Comment Post
  const handlePostComment = () => {
    if (!newCommentText.trim()) return;
    const newEntry = {
      id: `th-${Date.now()}`,
      author: 'mayur.bharvad',
      role: 'Author',
      time: 'Just now',
      avatar_type: 'mk',
      content: newCommentText.trim(),
      replies: [],
    };
    setThreads([newEntry, ...threads]);
    setNewCommentText('');
    alert('Comment posted to PR thread.');
  };

  // Screen Title Mapper for Breadcrumb
  const screenTitleMap: Record<string, string> = {
    '8.1': 'Overview',
    '8.2': 'Timeline',
    '8.3': 'Commit',
    '8.4': 'Activity',
    '8.5': 'Overview',
    '8.6': 'CI/CD Activity',
    '8.7': 'Activity',
    '8.8': 'Activity',
  };

  return (
    <div className="pr-act-container">
      {/* ── 1. Inner PR Sub-Sidebar (Left Navigation) ────────────────────────── */}
      <aside className="pr-act-sub-sidebar">
        <Link href="/code/pull-requests" className="pr-act-sub-back-top">
          <ArrowLeft size={16} />
          <span>Pull Requests</span>
        </Link>
        <Link href="/code/pull-requests" className="pr-act-sub-back-sub">
          <ArrowLeft size={12} />
          <span>Back to Pull Requests</span>
        </Link>

        <div className="pr-act-sub-pr-header">
          <span className="pr-act-sub-pr-title">
            #{prId} {prInfo.title}
          </span>
          <span className={isMerged ? 'pr-act-badge-merged' : 'pr-act-badge-open'}>
            {isMerged ? 'Merged' : 'Open'}
          </span>
        </div>

        <nav className="pr-act-sub-nav">
          <Link href={`/code/pull-requests/${prId}`} className="pr-act-sub-nav-item">
            <LayoutGrid size={15} />
            <span>Overview</span>
          </Link>
          <Link href={`/code/pull-requests/${prId}?tab=findings`} className="pr-act-sub-nav-item">
            <ShieldCheck size={15} />
            <span>Security</span>
          </Link>
          <Link href={`/code/pull-requests/${prId}?tab=checks`} className="pr-act-sub-nav-item">
            <CheckSquare size={15} />
            <span>Checks</span>
          </Link>
          <Link href={`/code/pull-requests/${prId}?tab=changes`} className="pr-act-sub-nav-item">
            <FileCode size={15} />
            <span>Files</span>
          </Link>
          <span className="pr-act-sub-nav-item active">
            <GitBranch size={15} />
            <span>Activity</span>
          </span>
          <Link href={`/code/pull-requests/${prId}?tab=comments`} className="pr-act-sub-nav-item">
            <Users size={15} />
            <span>Reviewers</span>
          </Link>
        </nav>
      </aside>

      {/* ── 2. Main Workspace ────────────────────────────────────────────────── */}
      <main className="pr-act-main-workspace">
        {/* Breadcrumb Bar */}
        <div className="pr-act-breadcrumb-bar">
          <div className="pr-act-breadcrumbs">
            <Link href="/code/pull-requests" className="pr-act-crumb-link">
              Pull Requests
            </Link>
            <ChevronRight size={13} color="#94a3b8" />
            <Link href={`/code/pull-requests/${prId}`} className="pr-act-crumb-link">
              #{prId}
            </Link>
            <ChevronRight size={13} color="#94a3b8" />
            <span className="pr-act-crumb-link">Activity</span>
            <ChevronRight size={13} color="#94a3b8" />
            <span className="pr-act-crumb-active">{screenTitleMap[activeScreenTab] || 'Activity'}</span>
          </div>
        </div>

        {/* PR Header Banner */}
        <div className="pr-act-header-banner">
          <div className="pr-act-header-left">
            <button
              onClick={() => router.push('/code/pull-requests')}
              className="pr-act-back-btn"
              title="Back to Pull Requests"
            >
              <ArrowLeft size={16} />
            </button>

            <div className="pr-act-header-titles">
              <div className="pr-act-title-row">
                <h1 className="pr-act-main-title">
                  #{prId} {prInfo.title}
                </h1>
                <span className={isMerged ? 'pr-act-badge-merged' : 'pr-act-badge-open'}>
                  {isMerged ? 'Merged' : 'Open'}
                </span>
              </div>
              <p className="pr-act-header-subtitle">
                <strong>{prInfo.author || 'mayur.bharvad'}</strong> wants to merge{' '}
                {prInfo.commits_count || 12} commits into{' '}
                <span className="pr-act-branch-mono">{prInfo.base_ref || 'main'}</span> from{' '}
                <span className="pr-act-branch-mono">{prInfo.head_ref || 'feature/auth-middleware'}</span>
              </p>
            </div>
          </div>

          <div className="pr-act-header-right-actions">
            <button onClick={() => setEditModalOpen(true)} className="pr-act-edit-btn">
              <Edit3 size={14} />
              Edit
            </button>

            <button
              onClick={() => setMergeModalOpen(true)}
              className={`pr-act-merge-btn ${isMerged ? 'merged-btn' : ''}`}
            >
              <GitMerge size={14} />
              {isMerged ? 'Merged' : 'Merge'}
            </button>
          </div>
        </div>

        {/* PR Level Navigation Tabs */}
        <div className="pr-act-tabs-bar">
          <Link href={`/code/pull-requests/${prId}`} className="pr-act-tab-item">
            Overview
          </Link>
          <Link href={`/code/pull-requests/${prId}?tab=findings`} className="pr-act-tab-item">
            Security
          </Link>
          <Link href={`/code/pull-requests/${prId}?tab=checks`} className="pr-act-tab-item">
            Checks
          </Link>
          <Link href={`/code/pull-requests/${prId}?tab=changes`} className="pr-act-tab-item">
            Files
          </Link>
          <span className="pr-act-tab-item active">Activity</span>
          <Link href={`/code/pull-requests/${prId}?tab=comments`} className="pr-act-tab-item">
            Reviewers
          </Link>
        </div>

        {/* ── Sub-Screen Switcher (Screens 8.1 - 8.8) ─────────────────────────── */}
        <div className="pr-act-sub-screen-switcher">
          <button
            className={`pr-act-sub-tab-btn ${activeScreenTab === '8.1' ? 'active' : ''}`}
            onClick={() => setActiveScreenTab('8.1')}
          >
            8.1 Activity Overview
          </button>
          <button
            className={`pr-act-sub-tab-btn ${activeScreenTab === '8.2' ? 'active' : ''}`}
            onClick={() => setActiveScreenTab('8.2')}
          >
            8.2 Event Timeline
          </button>
          <button
            className={`pr-act-sub-tab-btn ${activeScreenTab === '8.3' ? 'active' : ''}`}
            onClick={() => setActiveScreenTab('8.3')}
          >
            8.3 Commit Activity
          </button>
          <button
            className={`pr-act-sub-tab-btn ${activeScreenTab === '8.4' ? 'active' : ''}`}
            onClick={() => setActiveScreenTab('8.4')}
          >
            8.4 Comments & Conversations
          </button>
          <button
            className={`pr-act-sub-tab-btn ${activeScreenTab === '8.5' ? 'active' : ''}`}
            onClick={() => setActiveScreenTab('8.5')}
          >
            8.5 Security Activity
          </button>
          <button
            className={`pr-act-sub-tab-btn ${activeScreenTab === '8.6' ? 'active' : ''}`}
            onClick={() => setActiveScreenTab('8.6')}
          >
            8.6 CI/CD Activity
          </button>
          <button
            className={`pr-act-sub-tab-btn ${activeScreenTab === '8.7' ? 'active' : ''}`}
            onClick={() => setActiveScreenTab('8.7')}
          >
            8.7 Review Activity
          </button>
          <button
            className={`pr-act-sub-tab-btn ${activeScreenTab === '8.8' ? 'active' : ''}`}
            onClick={() => setActiveScreenTab('8.8')}
          >
            8.8 Filters & Audit Log
          </button>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════
            8.1 ACTIVITY OVERVIEW
            ═══════════════════════════════════════════════════════════════════════ */}
        {activeScreenTab === '8.1' && (
          <div className="pr-act-content-pane">
            {/* 6 Stats Row */}
            <div className="pr-act-stats-grid">
              <div className="pr-act-stat-card">
                <div className="pr-act-stat-icon-wrap blue"><GitPullRequest size={18} /></div>
                <div className="pr-act-stat-info">
                  <span className="pr-act-stat-number">{stats.total_events}</span>
                  <span className="pr-act-stat-label">Total Events</span>
                </div>
              </div>
              <div className="pr-act-stat-card">
                <div className="pr-act-stat-icon-wrap blue"><GitCommit size={18} /></div>
                <div className="pr-act-stat-info">
                  <span className="pr-act-stat-number">{stats.commits}</span>
                  <span className="pr-act-stat-label">Commits</span>
                </div>
              </div>
              <div className="pr-act-stat-card">
                <div className="pr-act-stat-icon-wrap blue"><MessageSquare size={18} /></div>
                <div className="pr-act-stat-info">
                  <span className="pr-act-stat-number">{stats.comments}</span>
                  <span className="pr-act-stat-label">Comments</span>
                </div>
              </div>
              <div className="pr-act-stat-card">
                <div className="pr-act-stat-icon-wrap blue"><UserCheck size={18} /></div>
                <div className="pr-act-stat-info">
                  <span className="pr-act-stat-number">{stats.review_events}</span>
                  <span className="pr-act-stat-label">Reviews</span>
                </div>
              </div>
              <div className="pr-act-stat-card">
                <div className="pr-act-stat-icon-wrap red"><ShieldAlert size={18} /></div>
                <div className="pr-act-stat-info">
                  <span className="pr-act-stat-number">{stats.security_events}</span>
                  <span className="pr-act-stat-label">Security Events</span>
                </div>
              </div>
              <div className="pr-act-stat-card">
                <div className="pr-act-stat-icon-wrap blue"><Settings size={18} /></div>
                <div className="pr-act-stat-info">
                  <span className="pr-act-stat-number">{stats.cicd_events}</span>
                  <span className="pr-act-stat-label">CI/CD Events</span>
                </div>
              </div>
            </div>

            {/* Activity Trend Card */}
            <div className="pr-act-card" style={{ marginTop: '20px' }}>
              <div className="pr-act-card-header">
                <span className="pr-act-card-title">Activity Trend</span>
                <div className="pr-act-chart-legend" style={{ margin: 0 }}>
                  <span><span className="pr-act-chart-dot blue" /> Commits</span>
                  <span><span className="pr-act-chart-dot purple" /> Comments</span>
                  <span><span className="pr-act-chart-dot dark" /> Reviews</span>
                  <span><span className="pr-act-chart-dot red" /> Security</span>
                  <span><span className="pr-act-chart-dot green" /> CI/CD</span>
                </div>
              </div>
              <div className="pr-act-card-body" style={{ height: '220px' }}>
                <svg width="100%" height="180" viewBox="0 0 600 180">
                  <line x1="30" y1="20" x2="580" y2="20" stroke="#f1f5f9" strokeWidth="1" />
                  <line x1="30" y1="60" x2="580" y2="60" stroke="#f1f5f9" strokeWidth="1" />
                  <line x1="30" y1="100" x2="580" y2="100" stroke="#f1f5f9" strokeWidth="1" />
                  <line x1="30" y1="140" x2="580" y2="140" stroke="#f1f5f9" strokeWidth="1" />
                  <line x1="30" y1="170" x2="580" y2="170" stroke="#e2e8f0" strokeWidth="1" />

                  <text x="10" y="24" fontSize="10" fill="#94a3b8">20</text>
                  <text x="10" y="64" fontSize="10" fill="#94a3b8">15</text>
                  <text x="10" y="104" fontSize="10" fill="#94a3b8">10</text>
                  <text x="10" y="144" fontSize="10" fill="#94a3b8">5</text>
                  <text x="10" y="174" fontSize="10" fill="#94a3b8">0</text>

                  {/* Grouped Bars */}
                  {/* Sep 29 */}
                  <rect x="70" y="90" width="8" height="80" fill="#3b82f6" rx="2" />
                  <rect x="80" y="130" width="8" height="40" fill="#8b5cf6" rx="2" />
                  <text x="70" y="185" fontSize="10" fill="#64748b">Sep 29</text>

                  {/* Sep 30 */}
                  <rect x="160" y="50" width="8" height="120" fill="#3b82f6" rx="2" />
                  <rect x="170" y="110" width="8" height="60" fill="#8b5cf6" rx="2" />
                  <rect x="180" y="140" width="8" height="30" fill="#ef4444" rx="2" />
                  <text x="160" y="185" fontSize="10" fill="#64748b">Sep 30</text>

                  {/* Oct 01 */}
                  <rect x="250" y="80" width="8" height="90" fill="#3b82f6" rx="2" />
                  <rect x="260" y="120" width="8" height="50" fill="#8b5cf6" rx="2" />
                  <text x="250" y="185" fontSize="10" fill="#64748b">Oct 01</text>

                  {/* Oct 02 */}
                  <rect x="340" y="30" width="8" height="140" fill="#3b82f6" rx="2" />
                  <rect x="350" y="90" width="8" height="80" fill="#ef4444" rx="2" />
                  <text x="340" y="185" fontSize="10" fill="#64748b">Oct 02</text>

                  {/* Oct 03 */}
                  <rect x="430" y="100" width="8" height="70" fill="#3b82f6" rx="2" />
                  <rect x="440" y="40" width="8" height="130" fill="#10b981" rx="2" />
                  <text x="430" y="185" fontSize="10" fill="#64748b">Oct 03</text>

                  {/* Oct 04 */}
                  <rect x="520" y="110" width="8" height="60" fill="#3b82f6" rx="2" />
                  <rect x="530" y="70" width="8" height="100" fill="#10b981" rx="2" />
                  <text x="520" y="185" fontSize="10" fill="#64748b">Oct 04</text>
                </svg>
              </div>
            </div>

            {/* Recent Activity Card */}
            <div className="pr-act-card" style={{ marginTop: '20px' }}>
              <div className="pr-act-card-header">
                <span className="pr-act-card-title">Recent Activity</span>
                <button
                  onClick={() => setActiveScreenTab('8.2')}
                  className="pr-act-card-clear-link"
                >
                  View All Activity →
                </button>
              </div>
              <div className="pr-act-card-body" style={{ padding: '8px 18px' }}>
                <div className="pr-act-recent-row">
                  <div className="pr-act-mk-avatar">MK</div>
                  <div className="pr-act-recent-info">
                    <strong>mayur.bharvad pushed 3 commits</strong>
                    <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                      <span className="pr-act-commit-pill">f4e5d6c</span>
                      <span className="pr-act-commit-pill">d7e8f9a</span>
                      <span className="pr-act-commit-pill">e1f2a3b</span>
                    </div>
                  </div>
                  <span className="pr-act-recent-time">2m ago</span>
                </div>

                <div className="pr-act-recent-row">
                  <WomanSecurityAvatar />
                  <div className="pr-act-recent-info">
                    <strong>Security scan completed</strong>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>2 high, 3 medium findings</span>
                  </div>
                  <span className="pr-act-recent-time">6m ago</span>
                </div>

                <div className="pr-act-recent-row">
                  <DevTeamAvatar />
                  <div className="pr-act-recent-info">
                    <strong>dev-team commented</strong>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>Please add input validation for new routes.</span>
                  </div>
                  <span className="pr-act-recent-time">18m ago</span>
                </div>

                <div className="pr-act-recent-row">
                  <div className="pr-act-circle-avatar red"><X size={14} /></div>
                  <div className="pr-act-recent-info">
                    <strong>CI checks failed</strong>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>Build failed due to unit test errors.</span>
                  </div>
                  <span className="pr-act-recent-time">32m ago</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            8.2 EVENT TIMELINE
            ═══════════════════════════════════════════════════════════════════════ */}
        {activeScreenTab === '8.2' && (
          <div className="pr-act-content-pane">
            <div className="pr-act-card">
              <div className="pr-act-sub-header-tabs">
                <button
                  className={`pr-act-sub-filter-pill ${timelineSubTab === 'timeline' ? 'active' : ''}`}
                  onClick={() => setTimelineSubTab('timeline')}
                >
                  Timeline
                </button>
                <button
                  className={`pr-act-sub-filter-pill ${timelineSubTab === 'all' ? 'active' : ''}`}
                  onClick={() => setTimelineSubTab('all')}
                >
                  All Events
                </button>
                <button
                  className={`pr-act-sub-filter-pill ${timelineSubTab === 'filter' ? 'active' : ''}`}
                  onClick={() => setTimelineSubTab('filter')}
                >
                  Filter
                </button>
              </div>

              <div className="pr-act-card-body">
                <div className="pr-act-date-header">Oct 04, 2026</div>

                <div className="pr-act-timeline-feed">
                  {timelineEvents.map((item) => (
                    <div key={item.id} className="pr-act-timeline-row">
                      {/* Node on Vertical Line */}
                      <div className={`pr-act-node ${item.node_color || 'blue'}`}>
                        {item.node_icon === 'pr' && <GitPullRequest size={14} />}
                        {item.node_icon === 'commit' && <GitCommit size={14} />}
                        {item.node_icon === 'security' && <Shield size={14} />}
                        {item.node_icon === 'gear' && <Settings size={14} />}
                        {item.node_icon === 'comment' && <MessageSquare size={14} />}
                        {item.node_icon === 'user' && <UserCheck size={14} />}
                        {item.node_icon === 'check' && <Check size={14} strokeWidth={3} />}
                      </div>

                      {/* Time */}
                      <div className="pr-act-time-col">
                        <span className="pr-act-date-txt">{item.time}</span>
                      </div>

                      {/* Body */}
                      <div className="pr-act-body-col">
                        <div className="pr-act-event-title">
                          <strong>{item.title}</strong>
                        </div>
                        {item.description && <div className="pr-act-event-desc">{item.description}</div>}
                        {item.commits && (
                          <div className="pr-act-commits-list">
                            {item.commits.map((c: any) => (
                              <div key={c.hash} className="pr-act-commit-row">
                                <span className="pr-act-commit-pill">{c.hash}</span>
                                <span className="pr-act-commit-msg">{c.message}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Right Badges & Avatars */}
                      <div className="pr-act-actions-col">
                        {item.commit_badge && (
                          <span className="pr-act-commit-pill">{item.commit_badge}</span>
                        )}
                        {item.badges &&
                          item.badges.map((b: any, bi: number) => (
                            <span key={bi} className={`pr-act-pill-badge ${b.type}`}>
                              {b.label}
                            </span>
                          ))}
                        <div style={{ marginLeft: '8px' }}>
                          {item.avatar_type === 'mk' && <div className="pr-act-mk-avatar">MK</div>}
                          {item.avatar_type === 'photo_woman' && <WomanSecurityAvatar />}
                          {item.avatar_type === 'photo_dev' && <DevTeamAvatar />}
                          {item.avatar_type === 'icon_x' && <div className="pr-act-circle-avatar red"><X size={14} /></div>}
                          {item.avatar_type === 'icon_check' && <div className="pr-act-circle-avatar green"><Check size={14} /></div>}
                          {item.avatar_type === 'icon_user' && <div className="pr-act-circle-avatar slate"><UserCheck size={14} /></div>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            8.3 COMMIT ACTIVITY
            ═══════════════════════════════════════════════════════════════════════ */}
        {activeScreenTab === '8.3' && (
          <div className="pr-act-content-pane">
            <div className="pr-act-card">
              <div className="pr-act-sub-header-tabs">
                <button
                  className={`pr-act-sub-filter-pill ${commitSubTab === 'commits' ? 'active' : ''}`}
                  onClick={() => setCommitSubTab('commits')}
                >
                  Commits
                </button>
                <button
                  className={`pr-act-sub-filter-pill ${commitSubTab === 'files' ? 'active' : ''}`}
                  onClick={() => setCommitSubTab('files')}
                >
                  Files Changed
                </button>
                <button
                  className={`pr-act-sub-filter-pill ${commitSubTab === 'authors' ? 'active' : ''}`}
                  onClick={() => setCommitSubTab('authors')}
                >
                  Authors
                </button>
              </div>

              <div className="pr-act-card-body" style={{ padding: 0 }}>
                {commitSubTab === 'commits' && (
                  <table className="pr-act-table">
                    <thead>
                      <tr>
                        <th>Commit</th>
                        <th>Message</th>
                        <th>Author</th>
                        <th>Time</th>
                        <th>Checks</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {commits.map((c) => (
                        <tr key={c.hash}>
                          <td>
                            <span className="pr-act-commit-pill">{c.hash}</span>
                          </td>
                          <td style={{ fontWeight: 500 }}>{c.message}</td>
                          <td style={{ color: '#64748b' }}>{c.author}</td>
                          <td style={{ color: '#64748b' }}>{c.time}</td>
                          <td>
                            {c.checks === 'passed' ? (
                              <div className="pr-act-circle-avatar green" style={{ width: '22px', height: '22px' }}>
                                <Check size={12} strokeWidth={3} />
                              </div>
                            ) : (
                              <div className="pr-act-circle-avatar red" style={{ width: '22px', height: '22px' }}>
                                <X size={12} strokeWidth={3} />
                              </div>
                            )}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button className="pr-act-menu-dots-btn">
                              <MoreVertical size={14} color="#64748b" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {commitSubTab === 'files' && (
                  <div style={{ padding: '18px' }}>
                    <div className="pr-act-file-stat-row">
                      <FileCode size={16} color="#2563eb" />
                      <strong>src/auth/middleware.js</strong>
                      <span className="pr-act-pill-badge warning">+48 -12</span>
                    </div>
                    <div className="pr-act-file-stat-row">
                      <FileCode size={16} color="#2563eb" />
                      <strong>src/routes/auth.js</strong>
                      <span className="pr-act-pill-badge success">+112 -4</span>
                    </div>
                    <div className="pr-act-file-stat-row">
                      <FileCode size={16} color="#2563eb" />
                      <strong>tests/auth.test.js</strong>
                      <span className="pr-act-pill-badge blue">+85 -2</span>
                    </div>
                  </div>
                )}

                {commitSubTab === 'authors' && (
                  <div style={{ padding: '18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div className="pr-act-mk-avatar">MK</div>
                      <div>
                        <strong>mayur.bharvad</strong>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>8 commits (100% of branch contribution)</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            8.4 COMMENTS & CONVERSATIONS
            ═══════════════════════════════════════════════════════════════════════ */}
        {activeScreenTab === '8.4' && (
          <div className="pr-act-content-pane">
            <div className="pr-act-card">
              <div className="pr-act-sub-header-tabs">
                <button
                  className={`pr-act-sub-filter-pill ${commentsSubTab === 'comments' ? 'active' : ''}`}
                  onClick={() => setCommentsSubTab('comments')}
                >
                  Comments
                </button>
                <button
                  className={`pr-act-sub-filter-pill ${commentsSubTab === 'review' ? 'active' : ''}`}
                  onClick={() => setCommentsSubTab('review')}
                >
                  Review Comments
                </button>
                <button
                  className={`pr-act-sub-filter-pill ${commentsSubTab === 'resolved' ? 'active' : ''}`}
                  onClick={() => setCommentsSubTab('resolved')}
                >
                  Resolved
                </button>
                <button
                  className={`pr-act-sub-filter-pill ${commentsSubTab === 'all' ? 'active' : ''}`}
                  onClick={() => setCommentsSubTab('all')}
                >
                  All
                </button>
              </div>

              <div className="pr-act-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {threads.map((t) => (
                  <div key={t.id} className="pr-act-thread-box">
                    <div className="pr-act-thread-header">
                      {t.avatar_type === 'photo_dev' && <DevTeamAvatar />}
                      {t.avatar_type === 'photo_woman' && <WomanSecurityAvatar />}
                      {t.avatar_type === 'mk' && <div className="pr-act-mk-avatar">MK</div>}
                      <span className="pr-act-thread-author">{t.author}</span>
                      <span className="pr-act-thread-time">{t.time}</span>
                      {t.role && <span className="pr-act-pill-badge blue">{t.role}</span>}
                    </div>

                    <div className="pr-act-thread-content">{t.content}</div>

                    {/* Inline Diff Box if present */}
                    {t.diff && (
                      <div className="pr-act-inline-diff-box">
                        <div className="pr-act-diff-header">{t.diff.file}</div>
                        <div className="pr-act-diff-line removed">{t.diff.removed}</div>
                        <div className="pr-act-diff-line added">{t.diff.added}</div>
                      </div>
                    )}

                    <div className="pr-act-thread-footer">
                      <button className="pr-act-reply-btn">Reply</button>
                    </div>

                    {/* Replies if present */}
                    {t.replies && t.replies.length > 0 && (
                      <div className="pr-act-replies-list">
                        {t.replies.map((r: any) => (
                          <div key={r.id} className="pr-act-reply-box">
                            <div className="pr-act-thread-header">
                              <div className="pr-act-mk-avatar">MK</div>
                              <span className="pr-act-thread-author">{r.author}</span>
                              <span className="pr-act-thread-time">{r.time}</span>
                              <span className="pr-act-pill-badge blue">{r.role}</span>
                            </div>
                            <div className="pr-act-thread-content">{r.content}</div>
                            <div className="pr-act-thread-footer">
                              <button className="pr-act-reply-btn">Reply</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {/* Add a Comment Input Box */}
                <div className="pr-act-comment-editor-box">
                  <span className="pr-act-comment-editor-title">Add a comment...</span>
                  <textarea
                    rows={3}
                    placeholder="Leave a comment, feedback, or review note..."
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    className="pr-act-comment-textarea"
                  />
                  <div className="pr-act-comment-toolbar">
                    <div className="pr-act-comment-tools-left">
                      <button title="Bold"><Bold size={14} /></button>
                      <button title="Italic"><Italic size={14} /></button>
                      <button title="Code"><Code size={14} /></button>
                      <button title="Link"><LinkIcon size={14} /></button>
                    </div>
                    <button onClick={handlePostComment} className="pr-act-merge-btn">
                      Comment
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            8.5 SECURITY ACTIVITY
            ═══════════════════════════════════════════════════════════════════════ */}
        {activeScreenTab === '8.5' && (
          <div className="pr-act-content-pane">
            <div className="pr-act-card">
              <div className="pr-act-sub-header-tabs">
                <button
                  className={`pr-act-sub-filter-pill ${securitySubTab === 'all' ? 'active' : ''}`}
                  onClick={() => setSecuritySubTab('all')}
                >
                  All
                </button>
                <button
                  className={`pr-act-sub-filter-pill ${securitySubTab === 'sast' ? 'active' : ''}`}
                  onClick={() => setSecuritySubTab('sast')}
                >
                  SAST
                </button>
                <button
                  className={`pr-act-sub-filter-pill ${securitySubTab === 'secrets' ? 'active' : ''}`}
                  onClick={() => setSecuritySubTab('secrets')}
                >
                  Secrets
                </button>
                <button
                  className={`pr-act-sub-filter-pill ${securitySubTab === 'deps' ? 'active' : ''}`}
                  onClick={() => setSecuritySubTab('deps')}
                >
                  Dependencies
                </button>
                <button
                  className={`pr-act-sub-filter-pill ${securitySubTab === 'quality' ? 'active' : ''}`}
                  onClick={() => setSecuritySubTab('quality')}
                >
                  Code Quality
                </button>
              </div>

              <div className="pr-act-card-body" style={{ padding: 0 }}>
                <table className="pr-act-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Type</th>
                      <th>Severity</th>
                      <th>Status</th>
                      <th>Details</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {securityScans.map((s, idx) => (
                      <tr key={idx}>
                        <td style={{ color: '#64748b' }}>{s.time}</td>
                        <td style={{ fontWeight: 500 }}>{s.type}</td>
                        <td>
                          <span
                            className={`pr-act-pill-badge ${
                              s.severity === 'High'
                                ? 'danger'
                                : s.severity === 'Medium'
                                ? 'warning'
                                : 'blue'
                            }`}
                          >
                            {s.severity}
                          </span>
                        </td>
                        <td>
                          <span className="pr-act-pill-badge success">{s.status}</span>
                        </td>
                        <td style={{ color: '#334155' }}>{s.details}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            onClick={() =>
                              setLogModal({
                                title: `${s.type} Security Scan Report`,
                                content: `Scan Target: feature/auth-middleware
Scanner Execution ID: scan-sec-48921
Timestamp: ${s.time}
Status: ${s.status}
Findings: ${s.details}

Evaluation Rules:
- Rule CWE-798 (Hardcoded Credentials) -> FAIL (1 finding)
- Rule CWE-89 (SQL Injection) -> PASS (0 findings)
- Rule CWE-287 (Improper Authentication) -> PASS`,
                              })
                            }
                            className="pr-act-card-clear-link"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Latest Security Findings Card */}
            <div className="pr-act-card" style={{ marginTop: '20px' }}>
              <div className="pr-act-card-header">
                <span className="pr-act-card-title">Latest Security Findings</span>
                <Link href={`/code/pull-requests/${prId}?tab=findings`} className="pr-act-card-clear-link">
                  View All Findings →
                </Link>
              </div>
              <div className="pr-act-card-body" style={{ padding: 0 }}>
                <table className="pr-act-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Rule</th>
                      <th>Severity</th>
                      <th>File</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {securityFindings.map((f) => (
                      <tr key={f.id}>
                        <td style={{ fontFamily: 'monospace', fontWeight: 600, color: '#2563eb' }}>
                          {f.id}
                        </td>
                        <td style={{ fontWeight: 500 }}>{f.rule}</td>
                        <td>
                          <span
                            className={`pr-act-pill-badge ${
                              f.severity === 'Critical' || f.severity === 'High'
                                ? 'danger'
                                : 'warning'
                            }`}
                          >
                            {f.severity}
                          </span>
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: '11px', color: '#64748b' }}>
                          {f.file}
                        </td>
                        <td>
                          <span className="pr-act-pill-badge danger">{f.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            8.6 CI/CD ACTIVITY
            ═══════════════════════════════════════════════════════════════════════ */}
        {activeScreenTab === '8.6' && (
          <div className="pr-act-content-pane">
            <div className="pr-act-card">
              <div className="pr-act-sub-header-tabs">
                <button
                  className={`pr-act-sub-filter-pill ${cicdSubTab === 'all' ? 'active' : ''}`}
                  onClick={() => setCicdSubTab('all')}
                >
                  All
                </button>
                <button
                  className={`pr-act-sub-filter-pill ${cicdSubTab === 'builds' ? 'active' : ''}`}
                  onClick={() => setCicdSubTab('builds')}
                >
                  Builds
                </button>
                <button
                  className={`pr-act-sub-filter-pill ${cicdSubTab === 'tests' ? 'active' : ''}`}
                  onClick={() => setCicdSubTab('tests')}
                >
                  Tests
                </button>
                <button
                  className={`pr-act-sub-filter-pill ${cicdSubTab === 'deploy' ? 'active' : ''}`}
                  onClick={() => setCicdSubTab('deploy')}
                >
                  Deploy
                </button>
                <button
                  className={`pr-act-sub-filter-pill ${cicdSubTab === 'checks' ? 'active' : ''}`}
                  onClick={() => setCicdSubTab('checks')}
                >
                  Status Checks
                </button>
              </div>

              <div className="pr-act-card-body" style={{ padding: 0 }}>
                <table className="pr-act-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Workflow</th>
                      <th>Status</th>
                      <th>Duration</th>
                      <th>Details</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cicdRuns.map((r, idx) => (
                      <tr key={idx}>
                        <td style={{ color: '#64748b' }}>{r.time}</td>
                        <td style={{ fontWeight: 500 }}>{r.workflow}</td>
                        <td>
                          <span
                            className={`pr-act-pill-badge ${
                              r.status === 'Passed' ? 'success' : 'danger'
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td style={{ color: '#64748b' }}>{r.duration}</td>
                        <td style={{ color: '#334155' }}>{r.details}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            onClick={() =>
                              setLogModal({
                                title: `${r.workflow} Execution Logs`,
                                content: `Workflow: ${r.workflow}
Status: ${r.status}
Duration: ${r.duration}
Checks Passed: ${r.details}

Job 1: Build Image -> OK (45s)
Job 2: Run Unit Tests -> ${r.status === 'Passed' ? 'PASS (1m 10s)' : 'FAIL (1m 40s)'}
Job 3: Static Analysis -> PASS (50s)`,
                              })
                            }
                            className="pr-act-card-clear-link"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Active Execution Terminal Card Matching Screen 8.6 Bottom */}
            <div className="pr-act-card" style={{ marginTop: '20px' }}>
              <div className="pr-act-card-header" style={{ alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div className="pr-act-circle-avatar red" style={{ width: '24px', height: '24px' }}>
                    <X size={14} />
                  </div>
                  <div>
                    <strong style={{ fontSize: '14px', color: '#0f172a' }}>
                      build-and-test <span style={{ color: '#dc2626' }}>(Failed)</span>
                    </strong>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                      Triggered by <strong>mayur.bharvad</strong> • Commit{' '}
                      <span className="pr-act-commit-pill">9c8b7a6</span> • Branch{' '}
                      <span className="pr-act-branch-mono">feature/auth-middleware</span> • Duration 3m 12s • Time Oct 04, 2026, 11:02 AM
                    </div>
                  </div>
                </div>

                <button
                  onClick={() =>
                    setLogModal({
                      title: 'build-and-test Full Execution Log',
                      content: `=== Full Runner Output ===
Run unit tests
FAIL src/auth/middleware.test.js
● Should validate token expiration
Expected true to be false
at Object.<anonymous> (src/auth/middleware.test.js:24:15)

Test Suites: 1 failed, 3 passed
Tests:       1 failed, 12 passed`,
                    })
                  }
                  className="pr-act-view-logs-btn"
                >
                  View Full Logs
                </button>
              </div>

              {/* Sub-tabs: Logs / Jobs / Artifacts */}
              <div className="pr-act-sub-header-tabs" style={{ borderTop: 'none' }}>
                <button className="pr-act-sub-filter-pill active">Logs</button>
                <button className="pr-act-sub-filter-pill">Jobs</button>
                <button className="pr-act-sub-filter-pill">Artifacts</button>
              </div>

              <div className="pr-act-terminal-block">
                <div className="pr-act-terminal-line">
                  <span className="pr-act-term-num">1</span>
                  <span className="pr-act-term-cmd">Run unit tests</span>
                </div>
                <div className="pr-act-terminal-line error">
                  <span className="pr-act-term-num">2</span>
                  <span>FAIL src/auth/middleware.test.js</span>
                </div>
                <div className="pr-act-terminal-line error">
                  <span className="pr-act-term-num">3</span>
                  <span>● Should validate token expiration</span>
                </div>
                <div className="pr-act-terminal-line">
                  <span className="pr-act-term-num">4</span>
                  <span>Expected true to be false</span>
                </div>
                <div className="pr-act-terminal-line muted">
                  <span className="pr-act-term-num">5</span>
                  <span>at Object.&lt;anonymous&gt; (src/auth/middleware.test.js:24:15)</span>
                </div>
                <div className="pr-act-terminal-line">
                  <span className="pr-act-term-num">6</span>
                  <span>Test Suites: 1 failed, 3 passed</span>
                </div>
                <div className="pr-act-terminal-line">
                  <span className="pr-act-term-num">7</span>
                  <span>Tests: 1 failed, 12 passed</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            8.7 REVIEW ACTIVITY
            ═══════════════════════════════════════════════════════════════════════ */}
        {activeScreenTab === '8.7' && (
          <div className="pr-act-content-pane">
            <div className="pr-act-card">
              <div className="pr-act-sub-header-tabs">
                <button
                  className={`pr-act-sub-filter-pill ${reviewSubTab === 'all' ? 'active' : ''}`}
                  onClick={() => setReviewSubTab('all')}
                >
                  All Reviews
                </button>
                <button
                  className={`pr-act-sub-filter-pill ${reviewSubTab === 'approvals' ? 'active' : ''}`}
                  onClick={() => setReviewSubTab('approvals')}
                >
                  Approvals
                </button>
                <button
                  className={`pr-act-sub-filter-pill ${reviewSubTab === 'requested' ? 'active' : ''}`}
                  onClick={() => setReviewSubTab('requested')}
                >
                  Changes Requested
                </button>
                <button
                  className={`pr-act-sub-filter-pill ${reviewSubTab === 'pending' ? 'active' : ''}`}
                  onClick={() => setReviewSubTab('pending')}
                >
                  Pending
                </button>
              </div>

              <div className="pr-act-card-body" style={{ padding: 0 }}>
                <table className="pr-act-table">
                  <thead>
                    <tr>
                      <th>Reviewer</th>
                      <th>Action</th>
                      <th>Status</th>
                      <th>Time</th>
                      <th>Comments</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <WomanSecurityAvatar />
                          <strong>security-team</strong>
                        </div>
                      </td>
                      <td>Review</td>
                      <td><span className="pr-act-pill-badge success">Approved</span></td>
                      <td style={{ color: '#64748b' }}>1h ago</td>
                      <td>Looks good after the fixes.</td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="pr-act-card-clear-link">View</button>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <DevTeamAvatar />
                          <strong>dev-team</strong>
                        </div>
                      </td>
                      <td>Review</td>
                      <td><span className="pr-act-pill-badge danger">Changes Requested</span></td>
                      <td style={{ color: '#64748b' }}>2h ago</td>
                      <td>Please add input validation.</td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="pr-act-card-clear-link">View</button>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div className="pr-act-circle-avatar slate" style={{ width: '32px', height: '32px' }}>
                            <UserCheck size={14} />
                          </div>
                          <strong>platform-team</strong>
                        </div>
                      </td>
                      <td>Review</td>
                      <td><span className="pr-act-pill-badge blue">Pending</span></td>
                      <td style={{ color: '#64748b' }}>-</td>
                      <td>Waiting for review</td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="pr-act-card-clear-link">View</button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom 2 Split Cards Matching Screen 8.7 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
              {/* Review Summary Donut */}
              <div className="pr-act-card">
                <div className="pr-act-card-header">
                  <span className="pr-act-card-title">Review Summary</span>
                </div>
                <div className="pr-act-card-body" style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
                  {/* SVG Donut Chart */}
                  <div style={{ position: 'relative', width: '110px', height: '110px' }}>
                    <svg width="110" height="110" viewBox="0 0 36 36">
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#e2e8f0"
                        strokeWidth="3.8"
                      />
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="3.8"
                        strokeDasharray="66, 100"
                      />
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="3.8"
                        strokeDasharray="33, 100"
                        strokeDashoffset="-66"
                      />
                    </svg>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <strong style={{ fontSize: '16px', color: '#0f172a' }}>2/3</strong>
                      <span style={{ fontSize: '10px', color: '#64748b' }}>Approvals</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="pr-act-chart-dot green" />
                      <span>Approved (2)</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="pr-act-chart-dot red" />
                      <span>Changes Requested (1)</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="pr-act-chart-dot dark" />
                      <span>Pending (0)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Review Comments (3) */}
              <div className="pr-act-card">
                <div className="pr-act-card-header">
                  <span className="pr-act-card-title">Review Comments (3)</span>
                </div>
                <div className="pr-act-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div>
                      <strong>security-team</strong> <span style={{ fontSize: '11px', color: '#94a3b8' }}>1h ago</span>
                      <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#475569' }}>Looks good after the fixes.</p>
                    </div>
                    <span className="pr-act-pill-badge success">Approved</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                    <div>
                      <strong>dev-team</strong> <span style={{ fontSize: '11px', color: '#94a3b8' }}>2h ago</span>
                      <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#475569' }}>Please add input validation for the new routes.</p>
                    </div>
                    <span className="pr-act-pill-badge danger">Changes Requested</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                    <div>
                      <strong>platform-team</strong>
                      <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>Not reviewed yet.</p>
                    </div>
                    <span className="pr-act-pill-badge blue">Pending</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            8.8 ACTIVITY FILTERS & AUDIT LOG
            ═══════════════════════════════════════════════════════════════════════ */}
        {activeScreenTab === '8.8' && (
          <div className="pr-act-content-pane">
            <div className="pr-act-card">
              <div className="pr-act-sub-header-tabs">
                <button
                  className={`pr-act-sub-filter-pill ${auditSubTab === 'filters' ? 'active' : ''}`}
                  onClick={() => setAuditSubTab('filters')}
                >
                  Filters
                </button>
                <button
                  className={`pr-act-sub-filter-pill ${auditSubTab === 'log' ? 'active' : ''}`}
                  onClick={() => setAuditSubTab('log')}
                >
                  Audit Log
                </button>
                <button
                  className={`pr-act-sub-filter-pill ${auditSubTab === 'export' ? 'active' : ''}`}
                  onClick={() => setAuditSubTab('export')}
                >
                  Export
                </button>
              </div>

              <div className="pr-act-card-body">
                <span className="pr-act-filter-heading">Activity Filters</span>
                
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>
                    Date Range
                  </label>
                  <select className="pr-act-filter-select" style={{ width: '220px' }}>
                    <option>Last 7 days</option>
                    <option>Last 30 days</option>
                    <option>All time</option>
                  </select>
                </div>

                <span className="pr-act-filter-heading">Event Types</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', maxWidth: '480px', marginBottom: '16px' }}>
                  <label className="pr-act-checkbox-row">
                    <div className="pr-act-checkbox-left">
                      <input
                        type="checkbox"
                        checked={filterCheckboxes.commits}
                        onChange={(e) => setFilterCheckboxes({ ...filterCheckboxes, commits: e.target.checked })}
                      />
                      <span>Commits</span>
                    </div>
                  </label>
                  <label className="pr-act-checkbox-row">
                    <div className="pr-act-checkbox-left">
                      <input
                        type="checkbox"
                        checked={filterCheckboxes.cicd}
                        onChange={(e) => setFilterCheckboxes({ ...filterCheckboxes, cicd: e.target.checked })}
                      />
                      <span>CI/CD Events</span>
                    </div>
                  </label>
                  <label className="pr-act-checkbox-row">
                    <div className="pr-act-checkbox-left">
                      <input
                        type="checkbox"
                        checked={filterCheckboxes.comments}
                        onChange={(e) => setFilterCheckboxes({ ...filterCheckboxes, comments: e.target.checked })}
                      />
                      <span>Comments</span>
                    </div>
                  </label>
                  <label className="pr-act-checkbox-row">
                    <div className="pr-act-checkbox-left">
                      <input
                        type="checkbox"
                        checked={filterCheckboxes.status}
                        onChange={(e) => setFilterCheckboxes({ ...filterCheckboxes, status: e.target.checked })}
                      />
                      <span>Status Changes</span>
                    </div>
                  </label>
                  <label className="pr-act-checkbox-row">
                    <div className="pr-act-checkbox-left">
                      <input
                        type="checkbox"
                        checked={filterCheckboxes.reviews}
                        onChange={(e) => setFilterCheckboxes({ ...filterCheckboxes, reviews: e.target.checked })}
                      />
                      <span>Reviews</span>
                    </div>
                  </label>
                  <label className="pr-act-checkbox-row">
                    <div className="pr-act-checkbox-left">
                      <input
                        type="checkbox"
                        checked={filterCheckboxes.mentions}
                        onChange={(e) => setFilterCheckboxes({ ...filterCheckboxes, mentions: e.target.checked })}
                      />
                      <span>Mentions</span>
                    </div>
                  </label>
                  <label className="pr-act-checkbox-row">
                    <div className="pr-act-checkbox-left">
                      <input
                        type="checkbox"
                        checked={filterCheckboxes.security}
                        onChange={(e) => setFilterCheckboxes({ ...filterCheckboxes, security: e.target.checked })}
                      />
                      <span>Security Events</span>
                    </div>
                  </label>
                  <label className="pr-act-checkbox-row">
                    <div className="pr-act-checkbox-left">
                      <input
                        type="checkbox"
                        checked={filterCheckboxes.system}
                        onChange={(e) => setFilterCheckboxes({ ...filterCheckboxes, system: e.target.checked })}
                      />
                      <span>System Events</span>
                    </div>
                  </label>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', maxWidth: '480px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>
                      Authors
                    </label>
                    <select className="pr-act-filter-select" style={{ width: '100%' }}>
                      <option>All Authors</option>
                      <option>mayur.bharvad</option>
                      <option>security-team</option>
                      <option>dev-team</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>
                      Severity (Security Events)
                    </label>
                    <select className="pr-act-filter-select" style={{ width: '100%' }}>
                      <option>All Severities</option>
                      <option>Critical</option>
                      <option>High</option>
                      <option>Medium</option>
                      <option>Low</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() =>
                      setFilterCheckboxes({
                        commits: true,
                        comments: true,
                        reviews: true,
                        security: true,
                        cicd: true,
                        status: true,
                        mentions: false,
                        system: false,
                      })
                    }
                    className="pr-act-edit-btn"
                  >
                    Reset
                  </button>
                  <button
                    onClick={() => alert('Filter parameters applied to audit log query.')}
                    className="pr-act-merge-btn"
                  >
                    Apply Filters
                  </button>
                </div>
              </div>
            </div>

            {/* Audit Log Table Card */}
            <div className="pr-act-card" style={{ marginTop: '20px' }}>
              <div className="pr-act-card-header">
                <span className="pr-act-card-title">Audit Log</span>
                <button
                  onClick={() => {
                    const csvContent =
                      'Time,User,Action,Details,IP Address\n' +
                      auditLogs
                        .map((l) => `${l.time},${l.user},${l.action},${l.details},${l.ip}`)
                        .join('\n');
                    const blob = new Blob([csvContent], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `pr_${prId}_audit_log.csv`;
                    a.click();
                  }}
                  className="pr-act-edit-btn"
                  style={{ fontSize: '12px', padding: '5px 12px' }}
                >
                  <Download size={13} /> Export
                </button>
              </div>
              <div className="pr-act-card-body" style={{ padding: 0 }}>
                <table className="pr-act-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>User</th>
                      <th>Action</th>
                      <th>Details</th>
                      <th>IP Address</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log, idx) => (
                      <tr key={idx}>
                        <td style={{ color: '#64748b' }}>{log.time}</td>
                        <td style={{ fontWeight: 600 }}>{log.user}</td>
                        <td>
                          <span className="pr-act-commit-pill">{log.action}</span>
                        </td>
                        <td style={{ color: '#334155' }}>{log.details}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: '11px', color: '#64748b' }}>
                          {log.ip}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── View Logs Terminal Modal ────────────────────────────────────────── */}
        {logModal && (
          <div className="pr-act-modal-overlay" onClick={() => setLogModal(null)}>
            <div className="pr-act-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="pr-act-modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Terminal size={16} color="#38bdf8" />
                  <strong style={{ fontSize: '14px', color: '#f8fafc' }}>{logModal.title}</strong>
                </div>
                <button
                  onClick={() => setLogModal(null)}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                >
                  <X size={18} />
                </button>
              </div>
              <pre className="pr-act-modal-terminal">{logModal.content}</pre>
              <div className="pr-act-modal-footer">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(logModal.content);
                    alert('Log output copied to clipboard');
                  }}
                  className="pr-act-edit-btn"
                  style={{ backgroundColor: '#1e293b', color: '#f8fafc', borderColor: '#475569' }}
                >
                  <Copy size={13} /> Copy Log
                </button>
                <button
                  onClick={() => setLogModal(null)}
                  className="pr-act-merge-btn"
                  style={{ backgroundColor: '#2563eb' }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Edit PR Modal ───────────────────────────────────────────────────── */}
        {editModalOpen && (
          <div className="pr-act-modal-overlay" onClick={() => setEditModalOpen(false)}>
            <div
              className="pr-act-modal-card"
              style={{ backgroundColor: '#ffffff', color: '#0f172a' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="pr-act-modal-header"
                style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}
              >
                <strong style={{ fontSize: '15px', color: '#0f172a' }}>
                  Edit Pull Request #{prId}
                </strong>
                <button
                  onClick={() => setEditModalOpen(false)}
                  style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
                >
                  <X size={18} />
                </button>
              </div>
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Title
                  </label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Description
                  </label>
                  <textarea
                    rows={4}
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>
              <div className="pr-act-modal-footer" style={{ borderTop: '1px solid #e2e8f0' }}>
                <button onClick={() => setEditModalOpen(false)} className="pr-act-edit-btn">
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setPrInfo((prev: any) => ({ ...prev, title: editTitle, description: editDesc }));
                    setEditModalOpen(false);
                    alert(`Pull Request #${prId} updated.`);
                  }}
                  className="pr-act-merge-btn"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Merge PR Modal ──────────────────────────────────────────────────── */}
        {mergeModalOpen && (
          <div className="pr-act-modal-overlay" onClick={() => setMergeModalOpen(false)}>
            <div
              className="pr-act-modal-card"
              style={{ backgroundColor: '#ffffff', color: '#0f172a', maxWidth: '480px' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="pr-act-modal-header"
                style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}
              >
                <strong style={{ fontSize: '15px', color: '#0f172a' }}>
                  Merge Pull Request #{prId}
                </strong>
                <button
                  onClick={() => setMergeModalOpen(false)}
                  style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
                >
                  <X size={18} />
                </button>
              </div>
              <div style={{ padding: '20px' }}>
                <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5, margin: 0 }}>
                  Are you sure you want to merge <strong>feature/auth-middleware</strong> into{' '}
                  <strong>main</strong>? All 12 commits and security gates have been verified.
                </p>
                <div
                  style={{
                    marginTop: '16px',
                    padding: '12px',
                    borderRadius: '6px',
                    backgroundColor: '#ecfdf5',
                    border: '1px solid #a7f3d0',
                    fontSize: '12px',
                    color: '#065f46',
                  }}
                >
                  ✓ Security Gate: 0 Critical issues. Ready for production merge.
                </div>
              </div>
              <div className="pr-act-modal-footer" style={{ borderTop: '1px solid #e2e8f0' }}>
                <button onClick={() => setMergeModalOpen(false)} className="pr-act-edit-btn">
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setIsMerged(true);
                    setPrInfo((prev: any) => ({ ...prev, state: 'merged' }));
                    setMergeModalOpen(false);
                    alert(`Pull Request #${prId} successfully merged into main.`);
                  }}
                  className="pr-act-merge-btn"
                >
                  Confirm Merge
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
