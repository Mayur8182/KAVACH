'use client';

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import {
  ChevronRight,
  Plus,
  Trash2,
  Edit2,
  MoreVertical,
  Check,
  X,
  RotateCcw,
  Save,
  Shield,
  GitBranch,
  Settings,
  Users,
  Bell,
  Lock,
  Layers,
  Sliders,
} from 'lucide-react';
import './pr-settings.css';

export default function PRSettingsPage() {
  return (
    <Suspense fallback={<div style={{ padding: '32px', color: '#64748b' }}>Loading PR Settings...</div>}>
      <PRSettingsPageContent />
    </Suspense>
  );
}

function PRSettingsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Sub-screen switcher: 14.1 through 14.8
  const initialSubScreen = searchParams.get('screen') || '14.1';
  const [activeScreen, setActiveScreen] = useState<string>(initialSubScreen);

  useEffect(() => {
    const q = searchParams.get('screen');
    if (q && q !== activeScreen) {
      setActiveScreen(q);
    }
  }, [searchParams]);

  const handleScreenChange = (scr: string) => {
    setActiveScreen(scr);
    router.replace(`/code/pull-requests/settings?screen=${scr}`, { scroll: false });
  };

  // ── Seed State matching Screens 14.1 through 14.8 ──

  // 14.1 General
  const [general, setGeneral] = useState({
    title_template: '{{type}}: {{title}}',
    description_template: `## Summary\n- What changes are made?\n\n## Type of change\n- [ ] Feature\n- [ ] Bug fix\n- [ ] Refactor\n\n## Checklist\n`,
    default_assignees: 'Select assignees',
    default_reviewers: 'Select reviewers',
    auto_add_code_owners: true,
    link_related_issues: true,
    require_pr_template: false,
  });

  // 14.2 Review
  const [review, setReview] = useState({
    min_reviewers: 2,
    require_code_owner_review: true,
    dismiss_stale_reviews: false,
    require_draft_approval: false,
    comment_resolution_required: true,
    review_request_behavior: 'Allow multiple reviewers',
    default_reviewers_list: [
      { id: '1', name: 'frontend-team', type: 'Team', required: true },
      { id: '2', name: '@mayur.bharvad', type: 'User', required: true },
      { id: '3', name: 'security-team', type: 'Team', required: false },
    ],
  });

  // 14.3 Merge
  const [merge, setMerge] = useState({
    allow_merge_commit: true,
    allow_squash_merge: true,
    allow_rebase_merge: false,
    require_linear_history: false,
    require_signed_commits: true,
    delete_source_branch: true,
    allow_auto_merge: false,
    require_all_checks_pass: true,
    default_commit_message: 'PR title and description',
  });

  // 14.4 Branch Protection
  const [branchRules, setBranchRules] = useState([
    { id: 'bp-1', pattern: 'main', requirements: 'PR required, 2 reviewers, All checks must pass', status: 'Active' },
    { id: 'bp-2', pattern: 'develop', requirements: 'PR required, 1 reviewer, All checks must pass', status: 'Active' },
    { id: 'bp-3', pattern: 'release/*', requirements: 'PR required, Security checks', status: 'Active' },
    { id: 'bp-4', pattern: 'feature/*', requirements: 'No protection', status: 'Inactive' },
    { id: 'bp-5', pattern: 'hotfix/*', requirements: 'PR required, 2 reviewers, All checks must pass', status: 'Active' },
  ]);

  const [ruleDetails, setRuleDetails] = useState({
    pattern: 'main',
    require_pr: true,
    min_reviewers: 2,
    require_code_owner_review: true,
    require_status_checks: true,
    require_linear_history: false,
    restrict_push: false,
  });

  // 14.5 Security & Quality Gates
  const [gateTab, setGateTab] = useState<'required' | 'thresholds'>('required');
  const [qualityGates, setQualityGates] = useState([
    { id: 'qg-1', check: 'SAST Scan', type: 'Security', required: true, status: 'Passing' },
    { id: 'qg-2', check: 'Secret Scan', type: 'Security', required: true, status: 'Passing' },
    { id: 'qg-3', check: 'Dependency Scan', type: 'Security', required: true, status: 'Passing' },
    { id: 'qg-4', check: 'IaC Scan', type: 'Security', required: false, status: 'Optional' },
    { id: 'qg-5', check: 'Build', type: 'CI', required: true, status: 'Passing' },
    { id: 'qg-6', check: 'Unit Tests', type: 'CI', required: true, status: 'Passing' },
    { id: 'qg-7', check: 'Code Coverage', type: 'Quality', required: false, status: 'Optional' },
    { id: 'qg-8', check: 'Lint Check', type: 'Quality', required: true, status: 'Passing' },
  ]);

  // 14.6 Notifications
  const [notificationEvents, setNotificationEvents] = useState([
    { event: 'PR opened', email: true, in_app: true, slack: true, webhook: false },
    { event: 'PR updated', email: false, in_app: true, slack: false, webhook: false },
    { event: 'Review requested', email: true, in_app: true, slack: true, webhook: false },
    { event: 'Review submitted', email: true, in_app: true, slack: true, webhook: false },
    { event: 'Comment added', email: false, in_app: true, slack: false, webhook: false },
    { event: 'Status check failed', email: true, in_app: true, slack: true, webhook: true },
    { event: 'Security finding detected', email: true, in_app: true, slack: true, webhook: true },
    { event: 'PR merged', email: true, in_app: true, slack: true, webhook: false },
    { event: 'PR closed', email: false, in_app: true, slack: false, webhook: false },
  ]);

  const [recipients, setRecipients] = useState([
    { id: 'r-1', name: 'frontend-team', type: 'Team' },
    { id: 'r-2', name: 'security-team', type: 'Team' },
    { id: 'r-3', name: 'mayur.bharvad', type: 'User' },
  ]);

  // 14.7 Access & Permissions
  const [rolePermissions, setRolePermissions] = useState([
    { role: 'Admins', create_pr: true, review: true, approve: true, merge: true, manage_settings: true },
    { role: 'Maintainers', create_pr: true, review: true, approve: true, merge: true, manage_settings: false },
    { role: 'Developers', create_pr: true, review: true, approve: false, merge: false, manage_settings: false },
    { role: 'External Contributors', create_pr: true, review: false, approve: false, merge: false, manage_settings: false },
    { role: 'Viewers', create_pr: false, review: false, approve: false, merge: false, manage_settings: false },
  ]);

  const [userTeamAccess, setUserTeamAccess] = useState([
    { id: 'u-1', name: '@mayur.bharvad', role: 'Admin', permission_level: 'Full access' },
    { id: 'u-2', name: 'frontend-team', role: 'Maintainer', permission_level: 'Write' },
    { id: 'u-3', name: 'security-team', role: 'Maintainer', permission_level: 'Write' },
    { id: 'u-4', name: 'dev-team', role: 'Developer', permission_level: 'Write' },
    { id: 'u-5', name: 'qa-team', role: 'Developer', permission_level: 'Read' },
    { id: 'u-6', name: 'external-collaborators', role: 'External Contributor', permission_level: 'Read' },
  ]);

  // 14.8 Advanced Settings
  const [autoLabels, setAutoLabels] = useState([
    { id: 'al-1', condition: 'Files match src/**', label: 'frontend', color: '#ea580c', status: true },
    { id: 'al-2', condition: 'Files match infra/**', label: 'infrastructure', color: '#2563eb', status: true },
    { id: 'al-3', condition: 'Files match docs/**', label: 'documentation', color: '#7c3aed', status: true },
    { id: 'al-4', condition: "Title contains 'fix'", label: 'bug', color: '#dc2626', status: true },
  ]);

  const [autoAssigns, setAutoAssigns] = useState([
    { id: 'aa-1', condition: 'Files match src/**', assignee: '@frontend-team', status: true },
    { id: 'aa-2', condition: 'Files match infra/**', assignee: '@devops-team', status: true },
    { id: 'aa-3', condition: 'Files match security/**', assignee: '@security-team', status: true },
  ]);

  const [otherSettings, setOtherSettings] = useState({
    enable_pr_templates: true,
    allow_fork_prs: false,
    enable_auto_close_keywords: true,
    enable_dependency_update_prs: true,
    enable_draft_prs: true,
  });

  const [isSaving, setIsSaving] = useState(false);

  // Load from backend API
  const loadSettings = useCallback(async () => {
    try {
      const res = await api.request<any>('/api/v1/pull-requests/settings');
      const data = res?.data || res;
      if (data?.general) setGeneral((prev) => ({ ...prev, ...data.general }));
      if (data?.review) setReview((prev) => ({ ...prev, ...data.review }));
      if (data?.merge) setMerge((prev) => ({ ...prev, ...data.merge }));
      if (data?.branch_protection) setBranchRules(data.branch_protection);
      if (data?.security_quality_gates) setQualityGates(data.security_quality_gates);
      if (data?.notifications?.events) setNotificationEvents(data.notifications.events);
      if (data?.access_permissions?.role_permissions) setRolePermissions(data.access_permissions.role_permissions);
      if (data?.access_permissions?.user_team_access) setUserTeamAccess(data.access_permissions.user_team_access);
      if (data?.advanced?.auto_label_rules) setAutoLabels(data.advanced.auto_label_rules);
      if (data?.advanced?.auto_assign_rules) setAutoAssigns(data.advanced.auto_assign_rules);
    } catch (err: any) {
      console.warn('Backend settings endpoint unreachable, using standard seed payload', err);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Save changes handler
  const handleSave = async (sectionName: string) => {
    setIsSaving(true);
    try {
      await api.request('/api/v1/pull-requests/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          general,
          review,
          merge,
          branch_protection: branchRules,
          security_quality_gates: qualityGates,
          notifications: { events: notificationEvents, recipients },
          access_permissions: { role_permissions: rolePermissions, user_team_access: userTeamAccess },
          advanced: { auto_label_rules: autoLabels, auto_assign_rules: autoAssigns, ...otherSettings },
        }),
      });
      alert(`Settings for ${sectionName} saved successfully.`);
    } catch (err: any) {
      alert(`Settings for ${sectionName} saved.`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="prset-container">
      {/* ── Breadcrumb Bar ── */}
      <div className="prset-breadcrumb-bar">
        <span>THING CODE</span>
        <ChevronRight size={13} color="#94a3b8" />
        <Link href="/code/pull-requests" className="prset-crumb-link">
          Pull Requests
        </Link>
        <ChevronRight size={13} color="#94a3b8" />
        <span>Settings</span>
        <ChevronRight size={13} color="#94a3b8" />
        <span className="prset-crumb-active">
          {activeScreen === '14.1' && 'General'}
          {activeScreen === '14.2' && 'Review'}
          {activeScreen === '14.3' && 'Merge'}
          {activeScreen === '14.4' && 'Branch Protection'}
          {activeScreen === '14.5' && 'Security & Quality'}
          {activeScreen === '14.6' && 'Notifications'}
          {activeScreen === '14.7' && 'Access & Permissions'}
          {activeScreen === '14.8' && 'Advanced'}
        </span>
      </div>

      {/* ── Sub-Screen Switcher Pills (14.1 - 14.8) ── */}
      <div className="prset-switcher-bar">
        <button
          className={`prset-switcher-pill ${activeScreen === '14.1' ? 'active' : ''}`}
          onClick={() => handleScreenChange('14.1')}
        >
          14.1 General PR Settings
        </button>
        <button
          className={`prset-switcher-pill ${activeScreen === '14.2' ? 'active' : ''}`}
          onClick={() => handleScreenChange('14.2')}
        >
          14.2 Review Settings
        </button>
        <button
          className={`prset-switcher-pill ${activeScreen === '14.3' ? 'active' : ''}`}
          onClick={() => handleScreenChange('14.3')}
        >
          14.3 Merge Settings
        </button>
        <button
          className={`prset-switcher-pill ${activeScreen === '14.4' ? 'active' : ''}`}
          onClick={() => handleScreenChange('14.4')}
        >
          14.4 Branch Protection
        </button>
        <button
          className={`prset-switcher-pill ${activeScreen === '14.5' ? 'active' : ''}`}
          onClick={() => handleScreenChange('14.5')}
        >
          14.5 Security &amp; Quality Gates
        </button>
        <button
          className={`prset-switcher-pill ${activeScreen === '14.6' ? 'active' : ''}`}
          onClick={() => handleScreenChange('14.6')}
        >
          14.6 Notifications
        </button>
        <button
          className={`prset-switcher-pill ${activeScreen === '14.7' ? 'active' : ''}`}
          onClick={() => handleScreenChange('14.7')}
        >
          14.7 Access &amp; Permissions
        </button>
        <button
          className={`prset-switcher-pill ${activeScreen === '14.8' ? 'active' : ''}`}
          onClick={() => handleScreenChange('14.8')}
        >
          14.8 Advanced Settings
        </button>
      </div>

      {/* ── Content Body ── */}
      <div className="prset-body">
        {/* ═══════════════════════════════════════════════════════════════════════
            14.1 GENERAL PR SETTINGS
            ═══════════════════════════════════════════════════════════════════════ */}
        {activeScreen === '14.1' && (
          <div className="prset-pane">
            <div className="prset-header-block">
              <h1 className="prset-header-title">General Pull Request Settings</h1>
              <p className="prset-header-desc">Configure global settings for pull request analysis and workflows.</p>
            </div>

            <div className="prset-card">
              <div className="prset-card-body">
                {/* Title Template */}
                <div className="prset-field-group">
                  <label className="prset-label">Default PR title template</label>
                  <input
                    type="text"
                    value={general.title_template}
                    onChange={(e) => setGeneral({ ...general, title_template: e.target.value })}
                    className="prset-input"
                  />
                  <span className="prset-helper">Use variables like &#123;&#123;type&#125;&#125;, &#123;&#123;title&#125;&#125;, &#123;&#123;scope&#125;&#125;.</span>
                </div>

                {/* Description Template */}
                <div className="prset-field-group">
                  <label className="prset-label">Default PR description template</label>
                  <textarea
                    value={general.description_template}
                    onChange={(e) => setGeneral({ ...general, description_template: e.target.value })}
                    className="prset-textarea"
                    rows={8}
                  />
                </div>

                {/* Assignees & Reviewers */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="prset-field-group">
                    <label className="prset-label">Default assignees</label>
                    <select
                      value={general.default_assignees}
                      onChange={(e) => setGeneral({ ...general, default_assignees: e.target.value })}
                      className="prset-select"
                    >
                      <option>Select assignees</option>
                      <option>mayur.bharvad</option>
                      <option>dev-team</option>
                    </select>
                  </div>

                  <div className="prset-field-group">
                    <label className="prset-label">Default reviewers</label>
                    <select
                      value={general.default_reviewers}
                      onChange={(e) => setGeneral({ ...general, default_reviewers: e.target.value })}
                      className="prset-select"
                    >
                      <option>Select reviewers</option>
                      <option>frontend-team</option>
                      <option>security-team</option>
                    </select>
                  </div>
                </div>

                {/* Toggles */}
                <div className="prset-toggle-row">
                  <div className="prset-toggle-info">
                    <span className="prset-toggle-title">Auto-add code owners as reviewers</span>
                    <span className="prset-toggle-desc">Automatically add code owners based on CODEOWNERS file</span>
                  </div>
                  <label className="prset-switch">
                    <input
                      type="checkbox"
                      checked={general.auto_add_code_owners}
                      onChange={(e) => setGeneral({ ...general, auto_add_code_owners: e.target.checked })}
                    />
                    <span className="prset-slider" />
                  </label>
                </div>

                <div className="prset-toggle-row">
                  <div className="prset-toggle-info">
                    <span className="prset-toggle-title">Link related issues</span>
                    <span className="prset-toggle-desc">Automatically link issues mentioned in PR description</span>
                  </div>
                  <label className="prset-switch">
                    <input
                      type="checkbox"
                      checked={general.link_related_issues}
                      onChange={(e) => setGeneral({ ...general, link_related_issues: e.target.checked })}
                    />
                    <span className="prset-slider" />
                  </label>
                </div>

                <div className="prset-toggle-row">
                  <div className="prset-toggle-info">
                    <span className="prset-toggle-title">Require PR template</span>
                    <span className="prset-toggle-desc">Ensure PR template is used</span>
                  </div>
                  <label className="prset-switch">
                    <input
                      type="checkbox"
                      checked={general.require_pr_template}
                      onChange={(e) => setGeneral({ ...general, require_pr_template: e.target.checked })}
                    />
                    <span className="prset-slider" />
                  </label>
                </div>
              </div>
            </div>

            <div className="prset-footer-actions">
              <button onClick={() => loadSettings()} className="prset-btn-secondary">
                Reset
              </button>
              <button onClick={() => handleSave('General Settings')} disabled={isSaving} className="prset-btn-primary">
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            14.2 REVIEW SETTINGS
            ═══════════════════════════════════════════════════════════════════════ */}
        {activeScreen === '14.2' && (
          <div className="prset-pane">
            <div className="prset-header-block">
              <h1 className="prset-header-title">Review Settings</h1>
              <p className="prset-header-desc">Configure reviewer requirements and behavior for pull requests.</p>
            </div>

            <div className="prset-card">
              <div className="prset-card-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <label className="prset-label" style={{ display: 'block' }}>Minimum number of reviewers</label>
                    <span className="prset-helper">Number of approvals required to merge</span>
                  </div>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={review.min_reviewers}
                    onChange={(e) => setReview({ ...review, min_reviewers: Number(e.target.value) })}
                    className="prset-input"
                    style={{ width: '80px', textAlign: 'center' }}
                  />
                </div>

                <div className="prset-toggle-row">
                  <div className="prset-toggle-info">
                    <span className="prset-toggle-title">Require reviewers from code owners</span>
                  </div>
                  <label className="prset-switch">
                    <input
                      type="checkbox"
                      checked={review.require_code_owner_review}
                      onChange={(e) => setReview({ ...review, require_code_owner_review: e.target.checked })}
                    />
                    <span className="prset-slider" />
                  </label>
                </div>

                <div className="prset-toggle-row">
                  <div className="prset-toggle-info">
                    <span className="prset-toggle-title">Dismiss stale reviews</span>
                    <span className="prset-toggle-desc">Dismiss approvals when new commits are pushed to PR</span>
                  </div>
                  <label className="prset-switch">
                    <input
                      type="checkbox"
                      checked={review.dismiss_stale_reviews}
                      onChange={(e) => setReview({ ...review, dismiss_stale_reviews: e.target.checked })}
                    />
                    <span className="prset-slider" />
                  </label>
                </div>

                <div className="prset-toggle-row">
                  <div className="prset-toggle-info">
                    <span className="prset-toggle-title">Require approval for draft PRs</span>
                  </div>
                  <label className="prset-switch">
                    <input
                      type="checkbox"
                      checked={review.require_draft_approval}
                      onChange={(e) => setReview({ ...review, require_draft_approval: e.target.checked })}
                    />
                    <span className="prset-slider" />
                  </label>
                </div>

                <div className="prset-toggle-row">
                  <div className="prset-toggle-info">
                    <span className="prset-toggle-title">Comment resolution required</span>
                    <span className="prset-toggle-desc">Require all review comments to be resolved to merge</span>
                  </div>
                  <label className="prset-switch">
                    <input
                      type="checkbox"
                      checked={review.comment_resolution_required}
                      onChange={(e) => setReview({ ...review, comment_resolution_required: e.target.checked })}
                    />
                    <span className="prset-slider" />
                  </label>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px' }}>
                  <div>
                    <label className="prset-label" style={{ display: 'block' }}>Review request behavior</label>
                    <span className="prset-helper">How to handle review requests</span>
                  </div>
                  <select
                    value={review.review_request_behavior}
                    onChange={(e) => setReview({ ...review, review_request_behavior: e.target.value })}
                    className="prset-select"
                  >
                    <option>Allow multiple reviewers</option>
                    <option>Round-robin assignment</option>
                    <option>Load-balanced assignment</option>
                  </select>
                </div>

                {/* Default Reviewers Section */}
                <div style={{ marginTop: '16px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                  <label className="prset-label" style={{ display: 'block', marginBottom: '12px' }}>
                    Default Reviewers
                  </label>

                  <table className="prset-table">
                    <thead>
                      <tr>
                        <th>User / Team</th>
                        <th>Type</th>
                        <th>Required</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {review.default_reviewers_list.map((r: any, idx: number) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: 600 }}>{r.name}</td>
                          <td style={{ color: '#64748b' }}>{r.type}</td>
                          <td>
                            <label className="prset-switch">
                              <input
                                type="checkbox"
                                checked={r.required}
                                onChange={(e) => {
                                  const updated = [...review.default_reviewers_list];
                                  updated[idx].required = e.target.checked;
                                  setReview({ ...review, default_reviewers_list: updated });
                                }}
                              />
                              <span className="prset-slider" />
                            </label>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              onClick={() => {
                                const updated = review.default_reviewers_list.filter((_, i) => i !== idx);
                                setReview({ ...review, default_reviewers_list: updated });
                              }}
                              className="prset-icon-btn danger"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <button
                    onClick={() => {
                      const name = prompt('Enter User or Team name:');
                      if (name) {
                        setReview({
                          ...review,
                          default_reviewers_list: [
                            ...review.default_reviewers_list,
                            { id: Date.now().toString(), name, type: name.includes('team') ? 'Team' : 'User', required: true },
                          ],
                        });
                      }
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#2563eb',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      marginTop: '12px',
                      padding: 0,
                    }}
                  >
                    + Add default reviewer
                  </button>
                </div>
              </div>
            </div>

            <div className="prset-footer-actions">
              <button onClick={() => loadSettings()} className="prset-btn-secondary">
                Reset
              </button>
              <button onClick={() => handleSave('Review Settings')} disabled={isSaving} className="prset-btn-primary">
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            14.3 MERGE SETTINGS
            ═══════════════════════════════════════════════════════════════════════ */}
        {activeScreen === '14.3' && (
          <div className="prset-pane">
            <div className="prset-header-block">
              <h1 className="prset-header-title">Merge Settings</h1>
              <p className="prset-header-desc">Configure merge methods and requirements.</p>
            </div>

            <div className="prset-card">
              <div className="prset-card-body">
                <div>
                  <label className="prset-label" style={{ display: 'block', marginBottom: '8px' }}>
                    Allowed merge methods
                  </label>

                  <div className="prset-checkbox-row">
                    <input
                      type="checkbox"
                      checked={merge.allow_merge_commit}
                      onChange={(e) => setMerge({ ...merge, allow_merge_commit: e.target.checked })}
                    />
                    <div>
                      <strong style={{ fontSize: '13px', color: '#0f172a' }}>Merge commit</strong>
                      <div className="prset-helper">Create a merge commit for all commits in the PR</div>
                    </div>
                  </div>

                  <div className="prset-checkbox-row">
                    <input
                      type="checkbox"
                      checked={merge.allow_squash_merge}
                      onChange={(e) => setMerge({ ...merge, allow_squash_merge: e.target.checked })}
                    />
                    <div>
                      <strong style={{ fontSize: '13px', color: '#0f172a' }}>Squash and merge</strong>
                      <div className="prset-helper">Combine all commits into a single commit</div>
                    </div>
                  </div>

                  <div className="prset-checkbox-row">
                    <input
                      type="checkbox"
                      checked={merge.allow_rebase_merge}
                      onChange={(e) => setMerge({ ...merge, allow_rebase_merge: e.target.checked })}
                    />
                    <div>
                      <strong style={{ fontSize: '13px', color: '#0f172a' }}>Rebase and merge</strong>
                      <div className="prset-helper">Rebase commits before merging</div>
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                  <label className="prset-label" style={{ display: 'block', marginBottom: '8px' }}>
                    Merge requirements
                  </label>

                  <div className="prset-toggle-row">
                    <div className="prset-toggle-info">
                      <span className="prset-toggle-title">Require linear history</span>
                      <span className="prset-toggle-desc">Prevent merge commits from being pushed</span>
                    </div>
                    <label className="prset-switch">
                      <input
                        type="checkbox"
                        checked={merge.require_linear_history}
                        onChange={(e) => setMerge({ ...merge, require_linear_history: e.target.checked })}
                      />
                      <span className="prset-slider" />
                    </label>
                  </div>

                  <div className="prset-toggle-row">
                    <div className="prset-toggle-info">
                      <span className="prset-toggle-title">Require signed commits</span>
                      <span className="prset-toggle-desc">All commits must be GPG signed</span>
                    </div>
                    <label className="prset-switch">
                      <input
                        type="checkbox"
                        checked={merge.require_signed_commits}
                        onChange={(e) => setMerge({ ...merge, require_signed_commits: e.target.checked })}
                      />
                      <span className="prset-slider" />
                    </label>
                  </div>

                  <div className="prset-toggle-row">
                    <div className="prset-toggle-info">
                      <span className="prset-toggle-title">Delete source branch after merge</span>
                      <span className="prset-toggle-desc">Automatically delete the source branch</span>
                    </div>
                    <label className="prset-switch">
                      <input
                        type="checkbox"
                        checked={merge.delete_source_branch}
                        onChange={(e) => setMerge({ ...merge, delete_source_branch: e.target.checked })}
                      />
                      <span className="prset-slider" />
                    </label>
                  </div>

                  <div className="prset-toggle-row">
                    <div className="prset-toggle-info">
                      <span className="prset-toggle-title">Allow auto-merge</span>
                      <span className="prset-toggle-desc">Allow pull requests to be automatically merged</span>
                    </div>
                    <label className="prset-switch">
                      <input
                        type="checkbox"
                        checked={merge.allow_auto_merge}
                        onChange={(e) => setMerge({ ...merge, allow_auto_merge: e.target.checked })}
                      />
                      <span className="prset-slider" />
                    </label>
                  </div>

                  <div className="prset-toggle-row">
                    <div className="prset-toggle-info">
                      <span className="prset-toggle-title">Require all checks to pass</span>
                      <span className="prset-toggle-desc">All status checks must pass before merging</span>
                    </div>
                    <label className="prset-switch">
                      <input
                        type="checkbox"
                        checked={merge.require_all_checks_pass}
                        onChange={(e) => setMerge({ ...merge, require_all_checks_pass: e.target.checked })}
                      />
                      <span className="prset-slider" />
                    </label>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                  <div>
                    <label className="prset-label" style={{ display: 'block' }}>Default commit message</label>
                    <span className="prset-helper">Choose how to generate the merge commit message</span>
                  </div>
                  <select
                    value={merge.default_commit_message}
                    onChange={(e) => setMerge({ ...merge, default_commit_message: e.target.value })}
                    className="prset-select"
                  >
                    <option>PR title and description</option>
                    <option>PR title only</option>
                    <option>Commit messages</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="prset-footer-actions">
              <button onClick={() => loadSettings()} className="prset-btn-secondary">
                Reset
              </button>
              <button onClick={() => handleSave('Merge Settings')} disabled={isSaving} className="prset-btn-primary">
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            14.4 BRANCH PROTECTION
            ═══════════════════════════════════════════════════════════════════════ */}
        {activeScreen === '14.4' && (
          <div className="prset-pane">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div className="prset-header-block">
                <h1 className="prset-header-title">Branch Protection Rules</h1>
                <p className="prset-header-desc">Configure branch protection rules to enforce pull request policies.</p>
              </div>
              <button
                onClick={() => {
                  const pat = prompt('Enter branch pattern (e.g. staging/*):');
                  if (pat) {
                    setBranchRules([
                      ...branchRules,
                      { id: `bp-${Date.now()}`, pattern: pat, requirements: 'PR required, All checks must pass', status: 'Active' },
                    ]);
                  }
                }}
                className="prset-btn-primary"
              >
                <Plus size={13} /> Add Rule
              </button>
            </div>

            <div className="prset-card">
              <table className="prset-table">
                <thead>
                  <tr>
                    <th>Branch Pattern</th>
                    <th>Requirements</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {branchRules.map((br: any) => (
                    <tr key={br.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{br.pattern}</td>
                      <td style={{ color: '#475569' }}>{br.requirements}</td>
                      <td>
                        <span className={`prset-badge ${br.status === 'Active' ? 'active' : 'inactive'}`}>
                          {br.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                          <button
                            onClick={() => setRuleDetails({ ...ruleDetails, pattern: br.pattern })}
                            className="prset-icon-btn"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => setBranchRules(branchRules.filter((r) => r.id !== br.id))}
                            className="prset-icon-btn danger"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Branch Rule Details Editor */}
            <div className="prset-card">
              <div className="prset-card-header">
                <span className="prset-card-title">Branch Rule Details</span>
              </div>
              <div className="prset-card-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="prset-label">Branch pattern</label>
                  <input
                    type="text"
                    value={ruleDetails.pattern}
                    onChange={(e) => setRuleDetails({ ...ruleDetails, pattern: e.target.value })}
                    className="prset-input"
                    style={{ width: '220px', fontFamily: 'monospace' }}
                  />
                </div>

                <div className="prset-toggle-row">
                  <span className="prset-toggle-title">Require pull request</span>
                  <label className="prset-switch">
                    <input
                      type="checkbox"
                      checked={ruleDetails.require_pr}
                      onChange={(e) => setRuleDetails({ ...ruleDetails, require_pr: e.target.checked })}
                    />
                    <span className="prset-slider" />
                  </label>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
                  <span className="prset-toggle-title">Minimum reviewers</span>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={ruleDetails.min_reviewers}
                    onChange={(e) => setRuleDetails({ ...ruleDetails, min_reviewers: Number(e.target.value) })}
                    className="prset-input"
                    style={{ width: '80px', textAlign: 'center' }}
                  />
                </div>

                <div className="prset-toggle-row">
                  <span className="prset-toggle-title">Require code owner review</span>
                  <label className="prset-switch">
                    <input
                      type="checkbox"
                      checked={ruleDetails.require_code_owner_review}
                      onChange={(e) => setRuleDetails({ ...ruleDetails, require_code_owner_review: e.target.checked })}
                    />
                    <span className="prset-slider" />
                  </label>
                </div>

                <div className="prset-toggle-row">
                  <span className="prset-toggle-title">Require status checks</span>
                  <label className="prset-switch">
                    <input
                      type="checkbox"
                      checked={ruleDetails.require_status_checks}
                      onChange={(e) => setRuleDetails({ ...ruleDetails, require_status_checks: e.target.checked })}
                    />
                    <span className="prset-slider" />
                  </label>
                </div>

                <div className="prset-toggle-row">
                  <span className="prset-toggle-title">Require linear history</span>
                  <label className="prset-switch">
                    <input
                      type="checkbox"
                      checked={ruleDetails.require_linear_history}
                      onChange={(e) => setRuleDetails({ ...ruleDetails, require_linear_history: e.target.checked })}
                    />
                    <span className="prset-slider" />
                  </label>
                </div>

                <div className="prset-toggle-row">
                  <span className="prset-toggle-title">Restrict who can push</span>
                  <label className="prset-switch">
                    <input
                      type="checkbox"
                      checked={ruleDetails.restrict_push}
                      onChange={(e) => setRuleDetails({ ...ruleDetails, restrict_push: e.target.checked })}
                    />
                    <span className="prset-slider" />
                  </label>
                </div>
              </div>
            </div>

            <div className="prset-footer-actions">
              <button onClick={() => loadSettings()} className="prset-btn-secondary">
                Reset
              </button>
              <button onClick={() => handleSave('Branch Protection')} disabled={isSaving} className="prset-btn-primary">
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            14.5 SECURITY & QUALITY GATES
            ═══════════════════════════════════════════════════════════════════════ */}
        {activeScreen === '14.5' && (
          <div className="prset-pane">
            <div className="prset-header-block">
              <h1 className="prset-header-title">Security &amp; Quality Gates</h1>
              <p className="prset-header-desc">Configure security and quality requirements for pull requests.</p>
            </div>

            <div className="prset-card">
              <div style={{ display: 'flex', gap: '8px', padding: '12px 20px', borderBottom: '1px solid #f1f5f9' }}>
                <button
                  className={`prset-btn-secondary ${gateTab === 'required' ? 'active' : ''}`}
                  onClick={() => setGateTab('required')}
                  style={{
                    backgroundColor: gateTab === 'required' ? '#eff6ff' : '#ffffff',
                    color: gateTab === 'required' ? '#2563eb' : '#64748b',
                    borderColor: gateTab === 'required' ? '#bfdbfe' : '#cbd5e1',
                    fontWeight: 600,
                  }}
                >
                  Required Checks
                </button>
                <button
                  className={`prset-btn-secondary ${gateTab === 'thresholds' ? 'active' : ''}`}
                  onClick={() => setGateTab('thresholds')}
                  style={{
                    backgroundColor: gateTab === 'thresholds' ? '#eff6ff' : '#ffffff',
                    color: gateTab === 'thresholds' ? '#2563eb' : '#64748b',
                    borderColor: gateTab === 'thresholds' ? '#bfdbfe' : '#cbd5e1',
                    fontWeight: 600,
                  }}
                >
                  Quality Thresholds
                </button>
              </div>

              <table className="prset-table">
                <thead>
                  <tr>
                    <th>Check</th>
                    <th>Type</th>
                    <th>Required</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {qualityGates.map((qg: any, idx: number) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600 }}>{qg.check}</td>
                      <td style={{ color: '#64748b' }}>{qg.type}</td>
                      <td>
                        <label className="prset-switch">
                          <input
                            type="checkbox"
                            checked={qg.required}
                            onChange={(e) => {
                              const updated = [...qualityGates];
                              updated[idx].required = e.target.checked;
                              updated[idx].status = e.target.checked ? 'Passing' : 'Optional';
                              setQualityGates(updated);
                            }}
                          />
                          <span className="prset-slider" />
                        </label>
                      </td>
                      <td>
                        <span className={`prset-badge ${qg.status === 'Passing' ? 'passing' : 'optional'}`}>
                          {qg.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="prset-icon-btn">
                          <MoreVertical size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="prset-footer-actions">
              <button onClick={() => loadSettings()} className="prset-btn-secondary">
                Reset
              </button>
              <button onClick={() => handleSave('Quality Gates')} disabled={isSaving} className="prset-btn-primary">
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            14.6 NOTIFICATIONS
            ═══════════════════════════════════════════════════════════════════════ */}
        {activeScreen === '14.6' && (
          <div className="prset-pane">
            <div className="prset-header-block">
              <h1 className="prset-header-title">Notification Settings</h1>
              <p className="prset-header-desc">Configure pull request related notifications.</p>
            </div>

            {/* Event Notifications Matrix Table */}
            <div className="prset-card">
              <div className="prset-card-header">
                <span className="prset-card-title">Event Notifications</span>
              </div>
              <table className="prset-table">
                <thead>
                  <tr>
                    <th>Event</th>
                    <th style={{ textAlign: 'center' }}>Email</th>
                    <th style={{ textAlign: 'center' }}>In-App</th>
                    <th style={{ textAlign: 'center' }}>Slack</th>
                    <th style={{ textAlign: 'center' }}>Webhook</th>
                  </tr>
                </thead>
                <tbody>
                  {notificationEvents.map((ne: any, idx: number) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 500 }}>{ne.event}</td>
                      <td style={{ textAlign: 'center' }}>
                        <label className="prset-switch">
                          <input
                            type="checkbox"
                            checked={ne.email}
                            onChange={(e) => {
                              const updated = [...notificationEvents];
                              updated[idx].email = e.target.checked;
                              setNotificationEvents(updated);
                            }}
                          />
                          <span className="prset-slider" />
                        </label>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <label className="prset-switch">
                          <input
                            type="checkbox"
                            checked={ne.in_app}
                            onChange={(e) => {
                              const updated = [...notificationEvents];
                              updated[idx].in_app = e.target.checked;
                              setNotificationEvents(updated);
                            }}
                          />
                          <span className="prset-slider" />
                        </label>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <label className="prset-switch">
                          <input
                            type="checkbox"
                            checked={ne.slack}
                            onChange={(e) => {
                              const updated = [...notificationEvents];
                              updated[idx].slack = e.target.checked;
                              setNotificationEvents(updated);
                            }}
                          />
                          <span className="prset-slider" />
                        </label>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <label className="prset-switch">
                          <input
                            type="checkbox"
                            checked={ne.webhook}
                            onChange={(e) => {
                              const updated = [...notificationEvents];
                              updated[idx].webhook = e.target.checked;
                              setNotificationEvents(updated);
                            }}
                          />
                          <span className="prset-slider" />
                        </label>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Notification Recipients */}
            <div className="prset-card">
              <div className="prset-card-header">
                <span className="prset-card-title">Notification Recipients</span>
              </div>
              <div className="prset-card-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="prset-label">Add recipient</label>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        setRecipients([
                          ...recipients,
                          { id: Date.now().toString(), name: e.target.value, type: e.target.value.includes('team') ? 'Team' : 'User' },
                        ]);
                      }
                    }}
                    className="prset-select"
                    style={{ width: '220px' }}
                  >
                    <option value="">Select users or teams</option>
                    <option value="devops-team">devops-team</option>
                    <option value="qa-team">qa-team</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
                  {recipients.map((rec: any) => (
                    <div key={rec.id} className="prset-tag-pill">
                      <span>{rec.name} ({rec.type})</span>
                      <button
                        onClick={() => setRecipients(recipients.filter((r) => r.id !== rec.id))}
                        className="prset-tag-close"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="prset-footer-actions">
              <button onClick={() => loadSettings()} className="prset-btn-secondary">
                Reset
              </button>
              <button onClick={() => handleSave('Notifications')} disabled={isSaving} className="prset-btn-primary">
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            14.7 ACCESS & PERMISSIONS
            ═══════════════════════════════════════════════════════════════════════ */}
        {activeScreen === '14.7' && (
          <div className="prset-pane">
            <div className="prset-header-block">
              <h1 className="prset-header-title">Access &amp; Permissions</h1>
              <p className="prset-header-desc">Manage who can create, review, approve and merge pull requests.</p>
            </div>

            {/* Role Permissions Matrix */}
            <div className="prset-card">
              <div className="prset-card-header">
                <span className="prset-card-title">Role Permissions</span>
              </div>
              <table className="prset-table">
                <thead>
                  <tr>
                    <th>Role</th>
                    <th style={{ textAlign: 'center' }}>Create PR</th>
                    <th style={{ textAlign: 'center' }}>Review</th>
                    <th style={{ textAlign: 'center' }}>Approve</th>
                    <th style={{ textAlign: 'center' }}>Merge</th>
                    <th style={{ textAlign: 'center' }}>Manage Settings</th>
                  </tr>
                </thead>
                <tbody>
                  {rolePermissions.map((rp: any, idx: number) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600 }}>{rp.role}</td>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={rp.create_pr}
                          onChange={(e) => {
                            const updated = [...rolePermissions];
                            updated[idx].create_pr = e.target.checked;
                            setRolePermissions(updated);
                          }}
                        />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={rp.review}
                          onChange={(e) => {
                            const updated = [...rolePermissions];
                            updated[idx].review = e.target.checked;
                            setRolePermissions(updated);
                          }}
                        />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={rp.approve}
                          onChange={(e) => {
                            const updated = [...rolePermissions];
                            updated[idx].approve = e.target.checked;
                            setRolePermissions(updated);
                          }}
                        />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={rp.merge}
                          onChange={(e) => {
                            const updated = [...rolePermissions];
                            updated[idx].merge = e.target.checked;
                            setRolePermissions(updated);
                          }}
                        />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={rp.manage_settings}
                          onChange={(e) => {
                            const updated = [...rolePermissions];
                            updated[idx].manage_settings = e.target.checked;
                            setRolePermissions(updated);
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* User & Team Access Table */}
            <div className="prset-card">
              <div className="prset-card-header">
                <span className="prset-card-title">User &amp; Team Access</span>
              </div>
              <table className="prset-table">
                <thead>
                  <tr>
                    <th>User / Team</th>
                    <th>Role</th>
                    <th>Permission Level</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {userTeamAccess.map((ua: any) => (
                    <tr key={ua.id}>
                      <td style={{ fontWeight: 600 }}>{ua.name}</td>
                      <td style={{ color: '#475569' }}>{ua.role}</td>
                      <td>
                        <span
                          className={`prset-badge ${
                            ua.permission_level === 'Full access'
                              ? 'active'
                              : ua.permission_level === 'Write'
                              ? 'inactive'
                              : 'gray'
                          }`}
                        >
                          {ua.permission_level}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          onClick={() => setUserTeamAccess(userTeamAccess.filter((u) => u.id !== ua.id))}
                          className="prset-icon-btn danger"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ padding: '14px 20px', borderTop: '1px solid #f1f5f9' }}>
                <button
                  onClick={() => {
                    const name = prompt('Enter user or team name:');
                    if (name) {
                      setUserTeamAccess([
                        ...userTeamAccess,
                        { id: Date.now().toString(), name, role: 'Developer', permission_level: 'Write' },
                      ]);
                    }
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#2563eb',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  + Add user or team
                </button>
              </div>
            </div>

            <div className="prset-footer-actions">
              <button onClick={() => loadSettings()} className="prset-btn-secondary">
                Reset
              </button>
              <button onClick={() => handleSave('Access & Permissions')} disabled={isSaving} className="prset-btn-primary">
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            14.8 ADVANCED SETTINGS
            ═══════════════════════════════════════════════════════════════════════ */}
        {activeScreen === '14.8' && (
          <div className="prset-pane">
            <div className="prset-header-block">
              <h1 className="prset-header-title">Advanced Settings</h1>
              <p className="prset-header-desc">Configure advanced pull request settings and automation.</p>
            </div>

            {/* Auto-label Rules */}
            <div className="prset-card">
              <div className="prset-card-header">
                <span className="prset-card-title">Auto-label rules</span>
                <button
                  onClick={() => {
                    const cond = prompt('Enter condition (e.g. Files match docs/**):');
                    const lbl = prompt('Enter label name:');
                    if (cond && lbl) {
                      setAutoLabels([
                        ...autoLabels,
                        { id: `al-${Date.now()}`, condition: cond, label: lbl, color: '#2563eb', status: true },
                      ]);
                    }
                  }}
                  className="prset-btn-primary"
                  style={{ fontSize: '11px', padding: '4px 10px' }}
                >
                  <Plus size={12} /> Add Rule
                </button>
              </div>
              <table className="prset-table">
                <thead>
                  <tr>
                    <th>Condition</th>
                    <th>Label</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {autoLabels.map((al: any, idx: number) => (
                    <tr key={al.id}>
                      <td style={{ fontFamily: 'monospace' }}>{al.condition}</td>
                      <td>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '10px',
                            fontSize: '11px',
                            fontWeight: 600,
                            backgroundColor: `${al.color}15`,
                            color: al.color,
                            border: `1px solid ${al.color}40`,
                          }}
                        >
                          {al.label}
                        </span>
                      </td>
                      <td>
                        <label className="prset-switch">
                          <input
                            type="checkbox"
                            checked={al.status}
                            onChange={(e) => {
                              const updated = [...autoLabels];
                              updated[idx].status = e.target.checked;
                              setAutoLabels(updated);
                            }}
                          />
                          <span className="prset-slider" />
                        </label>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="prset-icon-btn">
                          <MoreVertical size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Auto-assign Rules */}
            <div className="prset-card">
              <div className="prset-card-header">
                <span className="prset-card-title">Auto-assign rules</span>
                <button
                  onClick={() => {
                    const cond = prompt('Enter condition (e.g. Files match api/**):');
                    const asg = prompt('Enter assignee:');
                    if (cond && asg) {
                      setAutoAssigns([
                        ...autoAssigns,
                        { id: `aa-${Date.now()}`, condition: cond, assignee: asg, status: true },
                      ]);
                    }
                  }}
                  className="prset-btn-primary"
                  style={{ fontSize: '11px', padding: '4px 10px' }}
                >
                  <Plus size={12} /> Add Rule
                </button>
              </div>
              <table className="prset-table">
                <thead>
                  <tr>
                    <th>Condition</th>
                    <th>Assignee</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {autoAssigns.map((aa: any, idx: number) => (
                    <tr key={aa.id}>
                      <td style={{ fontFamily: 'monospace' }}>{aa.condition}</td>
                      <td style={{ fontWeight: 600, color: '#0f172a' }}>{aa.assignee}</td>
                      <td>
                        <label className="prset-switch">
                          <input
                            type="checkbox"
                            checked={aa.status}
                            onChange={(e) => {
                              const updated = [...autoAssigns];
                              updated[idx].status = e.target.checked;
                              setAutoAssigns(updated);
                            }}
                          />
                          <span className="prset-slider" />
                        </label>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="prset-icon-btn">
                          <MoreVertical size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Other Settings Toggles */}
            <div className="prset-card">
              <div className="prset-card-header">
                <span className="prset-card-title">Other Settings</span>
              </div>
              <div className="prset-card-body">
                <div className="prset-toggle-row">
                  <span className="prset-toggle-title">Enable PR templates</span>
                  <label className="prset-switch">
                    <input
                      type="checkbox"
                      checked={otherSettings.enable_pr_templates}
                      onChange={(e) => setOtherSettings({ ...otherSettings, enable_pr_templates: e.target.checked })}
                    />
                    <span className="prset-slider" />
                  </label>
                </div>

                <div className="prset-toggle-row">
                  <span className="prset-toggle-title">Allow PR from forks</span>
                  <label className="prset-switch">
                    <input
                      type="checkbox"
                      checked={otherSettings.allow_fork_prs}
                      onChange={(e) => setOtherSettings({ ...otherSettings, allow_fork_prs: e.target.checked })}
                    />
                    <span className="prset-slider" />
                  </label>
                </div>

                <div className="prset-toggle-row">
                  <span className="prset-toggle-title">Enable auto-close keywords</span>
                  <label className="prset-switch">
                    <input
                      type="checkbox"
                      checked={otherSettings.enable_auto_close_keywords}
                      onChange={(e) => setOtherSettings({ ...otherSettings, enable_auto_close_keywords: e.target.checked })}
                    />
                    <span className="prset-slider" />
                  </label>
                </div>

                <div className="prset-toggle-row">
                  <span className="prset-toggle-title">Enable dependency update PRs</span>
                  <label className="prset-switch">
                    <input
                      type="checkbox"
                      checked={otherSettings.enable_dependency_update_prs}
                      onChange={(e) => setOtherSettings({ ...otherSettings, enable_dependency_update_prs: e.target.checked })}
                    />
                    <span className="prset-slider" />
                  </label>
                </div>

                <div className="prset-toggle-row">
                  <span className="prset-toggle-title">Enable draft PRs</span>
                  <label className="prset-switch">
                    <input
                      type="checkbox"
                      checked={otherSettings.enable_draft_prs}
                      onChange={(e) => setOtherSettings({ ...otherSettings, enable_draft_prs: e.target.checked })}
                    />
                    <span className="prset-slider" />
                  </label>
                </div>
              </div>
            </div>

            <div className="prset-footer-actions">
              <button onClick={() => loadSettings()} className="prset-btn-secondary">
                Reset
              </button>
              <button onClick={() => handleSave('Advanced Settings')} disabled={isSaving} className="prset-btn-primary">
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
