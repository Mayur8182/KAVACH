/**
 * Comprehensive UI State Taxonomy across 15 Categories (A to O)
 * Provides centralized typing, tone mappings, and metadata for 200+ platform states.
 */

export type StateCategory =
  | 'DATA_CONTENT'
  | 'NETWORK_PERFORMANCE'
  | 'AUTH_PERMISSION'
  | 'FORM_INPUT'
  | 'ACTION_INTERACTION'
  | 'MODAL_DRAWER_DROPDOWN'
  | 'TABLE_VISUALIZATION'
  | 'FILE_INTEGRATION'
  | 'SECURITY_SPECIFIC'
  | 'RUNTIME_GOVERNANCE'
  | 'AI_AGENT'
  | 'NOTIFICATIONS_FEEDBACK'
  | 'RESPONSIVE_ACCESSIBILITY'
  | 'BROWSER_APPLICATION'
  | 'SECURITY_TRUST';

export type StateTone = 'secured' | 'warning' | 'critical' | 'info' | 'neutral' | 'ai';

export interface UIStateSpec {
  id: string;
  category: StateCategory;
  name: string;
  expectedBehavior: string;
  defaultTone: StateTone;
  icon: string;
  badgeText?: string;
  isRecoverable?: boolean;
}

export const UI_STATE_TAXONOMY: Record<string, UIStateSpec> = {
  // A. Data & Content States
  EMPTY_STATE: {
    id: '1',
    category: 'DATA_CONTENT',
    name: 'Empty State',
    expectedBehavior: 'No data available with helpful CTA',
    defaultTone: 'neutral',
    icon: 'inbox',
    isRecoverable: true,
  },
  INITIAL_LOADING: {
    id: '2',
    category: 'DATA_CONTENT',
    name: 'Initial Loading',
    expectedBehavior: 'First-time page loading with layout preserved',
    defaultTone: 'info',
    icon: 'loader',
  },
  SKELETON_LOADING: {
    id: '3',
    category: 'DATA_CONTENT',
    name: 'Skeleton Loading',
    expectedBehavior: 'Content-shaped animated shimmer placeholders',
    defaultTone: 'neutral',
    icon: 'view_agenda',
  },
  PARTIAL_LOADING: {
    id: '4',
    category: 'DATA_CONTENT',
    name: 'Partial Loading',
    expectedBehavior: 'Some sections loaded, others pending async fetch',
    defaultTone: 'info',
    icon: 'sync',
  },
  REFRESHING_STATE: {
    id: '5',
    category: 'DATA_CONTENT',
    name: 'Refreshing State',
    expectedBehavior: 'Existing data visible while background revalidation occurs',
    defaultTone: 'neutral',
    icon: 'refresh',
  },
  NO_SEARCH_RESULTS: {
    id: '6',
    category: 'DATA_CONTENT',
    name: 'No Search Results',
    expectedBehavior: 'Search query has zero matches with clear suggestions',
    defaultTone: 'neutral',
    icon: 'search_off',
    isRecoverable: true,
  },
  NO_FILTER_RESULTS: {
    id: '7',
    category: 'DATA_CONTENT',
    name: 'No Filter Results',
    expectedBehavior: 'Filters return zero records with a reset action',
    defaultTone: 'neutral',
    icon: 'filter_alt_off',
    isRecoverable: true,
  },
  NO_ACTIVITY: {
    id: '8',
    category: 'DATA_CONTENT',
    name: 'No Activity State',
    expectedBehavior: 'No historical activity recorded in tenant timeline',
    defaultTone: 'neutral',
    icon: 'history',
  },
  NO_NOTIFICATIONS: {
    id: '9',
    category: 'DATA_CONTENT',
    name: 'No Notifications',
    expectedBehavior: 'Zero alerts or notification items available in drawer',
    defaultTone: 'neutral',
    icon: 'notifications_none',
  },
  STALE_DATA: {
    id: '10',
    category: 'DATA_CONTENT',
    name: 'Stale Data State',
    expectedBehavior: 'Display last updated timestamp and on-demand refresh option',
    defaultTone: 'warning',
    icon: 'history_toggle_off',
    isRecoverable: true,
  },

  // B. Network & Performance States
  SLOW_NETWORK: {
    id: '11',
    category: 'NETWORK_PERFORMANCE',
    name: 'Slow Network',
    expectedBehavior: 'High latency detected (1,480ms RTT); degradation to backoff polling',
    defaultTone: 'warning',
    icon: 'network_check',
    badgeText: 'THROTTLED',
    isRecoverable: true,
  },
  OFFLINE_STATE: {
    id: '12',
    category: 'NETWORK_PERFORMANCE',
    name: 'Offline State',
    expectedBehavior: 'Connection severed; running in local encrypted cache mode with countdown',
    defaultTone: 'critical',
    icon: 'cloud_off',
    badgeText: 'AIR-GAPPED BUFFER',
    isRecoverable: true,
  },
  RECONNECTING: {
    id: '13',
    category: 'NETWORK_PERFORMANCE',
    name: 'Reconnecting',
    expectedBehavior: 'Active exponential backoff retry in progress',
    defaultTone: 'info',
    icon: 'sync',
    badgeText: 'SYNCHRONIZING',
  },
  REQUEST_TIMEOUT: {
    id: '14',
    category: 'NETWORK_PERFORMANCE',
    name: 'Request Timeout',
    expectedBehavior: 'Request exceeded gateway deadline (504); allows immediate retry',
    defaultTone: 'critical',
    icon: 'timer_off',
    isRecoverable: true,
  },
  SERVER_ERROR: {
    id: '15',
    category: 'NETWORK_PERFORMANCE',
    name: 'Server Error (500)',
    expectedBehavior: 'Handled gracefully without raw python/stack traces; actionable next step',
    defaultTone: 'critical',
    icon: 'error_outline',
    isRecoverable: true,
  },
  RATE_LIMITED: {
    id: '16',
    category: 'NETWORK_PERFORMANCE',
    name: 'Rate Limited (429)',
    expectedBehavior: 'Explain rate threshold and show retry-after countdown',
    defaultTone: 'warning',
    icon: 'speed',
    isRecoverable: true,
  },
  PARTIAL_API_FAILURE: {
    id: '17',
    category: 'NETWORK_PERFORMANCE',
    name: 'Partial API Failure',
    expectedBehavior: 'Preserve successfully loaded sections and flag degraded cards',
    defaultTone: 'warning',
    icon: 'warning',
    isRecoverable: true,
  },
  UPLOAD_PROGRESS: {
    id: '18',
    category: 'NETWORK_PERFORMANCE',
    name: 'Upload Progress',
    expectedBehavior: 'Shows real uploaded byte counter, percentage, and cancellation option',
    defaultTone: 'info',
    icon: 'upload_file',
  },
  DOWNLOAD_PROGRESS: {
    id: '19',
    category: 'NETWORK_PERFORMANCE',
    name: 'Download Progress',
    expectedBehavior: 'Shows export compilation and streaming progress',
    defaultTone: 'info',
    icon: 'download',
  },
  BACKGROUND_PROCESSING: {
    id: '20',
    category: 'NETWORK_PERFORMANCE',
    name: 'Background Processing',
    expectedBehavior: 'Asynchronous task running outside current view with notification indicator',
    defaultTone: 'neutral',
    icon: 'hourglass_top',
  },

  // C. Authentication & Permission States
  SESSION_EXPIRED: {
    id: '21',
    category: 'AUTH_PERMISSION',
    name: 'Session Expired',
    expectedBehavior: 'Compliance idle timeout modal; prompt for re-auth without losing work',
    defaultTone: 'warning',
    icon: 'lock_clock',
    isRecoverable: true,
  },
  UNAUTHORIZED: {
    id: '22',
    category: 'AUTH_PERMISSION',
    name: 'Unauthorized (401)',
    expectedBehavior: 'Redirect to login preserving return redirect query parameter',
    defaultTone: 'critical',
    icon: 'no_accounts',
  },
  PERMISSION_DENIED: {
    id: '23',
    category: 'AUTH_PERMISSION',
    name: 'Permission Denied (403)',
    expectedBehavior: 'Explains missing CAP role and provides JIT access request workflow',
    defaultTone: 'critical',
    icon: 'gpp_bad',
    badgeText: 'SECOPS TIER 3 REQUIRED',
    isRecoverable: true,
  },
  ROLE_RESTRICTED: {
    id: '24',
    category: 'AUTH_PERMISSION',
    name: 'Role Restricted',
    expectedBehavior: 'Disable actions with tooltip explaining role capabilities',
    defaultTone: 'neutral',
    icon: 'admin_panel_settings',
  },
  ACCOUNT_SUSPENDED: {
    id: '25',
    category: 'AUTH_PERMISSION',
    name: 'Account Suspended',
    expectedBehavior: 'Explain security suspension and direct to enterprise support',
    defaultTone: 'critical',
    icon: 'block',
  },
  MFA_REQUIRED: {
    id: '26',
    category: 'AUTH_PERMISSION',
    name: 'MFA Required',
    expectedBehavior: 'Prompt for TOTP or WebAuthn hardware key verification',
    defaultTone: 'info',
    icon: 'security',
    isRecoverable: true,
  },
  TOKEN_REFRESHING: {
    id: '27',
    category: 'AUTH_PERMISSION',
    name: 'Token Refreshing',
    expectedBehavior: 'Silent background JWT exchange without interrupting active tasks',
    defaultTone: 'neutral',
    icon: 'autorenew',
  },

  // I. Security-Specific States (Critical for Kavach)
  SCAN_QUEUED: {
    id: '101',
    category: 'SECURITY_SPECIFIC',
    name: 'Scan Queued',
    expectedBehavior: 'Pending worker pipeline allocation',
    defaultTone: 'neutral',
    icon: 'schedule',
    badgeText: 'QUEUED',
  },
  SCAN_RUNNING: {
    id: '102',
    category: 'SECURITY_SPECIFIC',
    name: 'Scan in Progress',
    expectedBehavior: 'Active deterministic scanning with real stage telemetry',
    defaultTone: 'info',
    icon: 'radar',
    badgeText: 'SCANNING',
  },
  SCAN_COMPLETED_FINDINGS: {
    id: '103',
    category: 'SECURITY_SPECIFIC',
    name: 'Completed with Findings',
    expectedBehavior: 'Real vulnerabilities recorded; classified by severity and module',
    defaultTone: 'critical',
    icon: 'error',
    badgeText: 'FINDINGS DETECTED',
  },
  SCAN_COMPLETED_CLEAN: {
    id: '104',
    category: 'SECURITY_SPECIFIC',
    name: 'Completed Clean (0 Findings)',
    expectedBehavior: 'All deterministic rules passed with zero violations',
    defaultTone: 'secured',
    icon: 'verified_user',
    badgeText: 'PERIMETER SAFE',
  },
  SCAN_FAILED: {
    id: '105',
    category: 'SECURITY_SPECIFIC',
    name: 'Scan Failed',
    expectedBehavior: 'Scanner exited non-zero; logged failure reason and remediation',
    defaultTone: 'critical',
    icon: 'report_problem',
    badgeText: 'SCAN FAILED',
    isRecoverable: true,
  },
  SCAN_CANCELLED: {
    id: '106',
    category: 'SECURITY_SPECIFIC',
    name: 'Scan Cancelled',
    expectedBehavior: 'Operator manually halted execution',
    defaultTone: 'neutral',
    icon: 'cancel',
    badgeText: 'CANCELLED',
  },

  // K. AI Agent States
  AGENT_THINKING: {
    id: '121',
    category: 'AI_AGENT',
    name: 'Agent Thinking',
    expectedBehavior: 'Autonomous agent correlating findings against threat intelligence',
    defaultTone: 'ai',
    icon: 'smart_toy',
    badgeText: 'ANALYZING',
  },
  AGENT_EXECUTING_TOOL: {
    id: '122',
    category: 'AI_AGENT',
    name: 'Agent Executing Tool',
    expectedBehavior: 'Secured tool request passed through identity & OPA policy gateway',
    defaultTone: 'info',
    icon: 'terminal',
    badgeText: 'TOOL EXECUTION',
  },
  AGENT_APPROVAL_REQUIRED: {
    id: '123',
    category: 'AI_AGENT',
    name: 'Agent Approval Required',
    expectedBehavior: 'High-risk tool execution paused waiting for human authorization',
    defaultTone: 'warning',
    icon: 'assignment_turned_in',
    badgeText: 'APPROVAL REQUIRED',
    isRecoverable: true,
  },
  AGENT_COMPLETED: {
    id: '124',
    category: 'AI_AGENT',
    name: 'Agent Completed',
    expectedBehavior: 'Autonomous patch or audit completed and verified',
    defaultTone: 'secured',
    icon: 'check_circle',
    badgeText: 'ACTION COMPLETE',
  },
  AGENT_FAILED: {
    id: '125',
    category: 'AI_AGENT',
    name: 'Agent Failed',
    expectedBehavior: 'Agent execution encountered constraint failure or tool error',
    defaultTone: 'critical',
    icon: 'error',
    badgeText: 'AGENT FAILED',
    isRecoverable: true,
  },
};
