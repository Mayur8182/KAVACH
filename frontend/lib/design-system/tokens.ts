/**
 * Kavach Enterprise Design System Tokens
 * Engineered for Security Operations Centers (SOC) & DevSecOps Workflows.
 * Generated in alignment with Stitch "Kavach Sentinel Core" specification.
 */

export const KAVACH_TOKENS = {
  colors: {
    // Structural Baselines
    canvas: '#F8FAFC',
    canvasSubtle: '#F1F5F9',
    surface: '#FFFFFF',
    surfaceSubtle: '#F8FAFC',
    surfaceContainerLow: '#EFF4FF',
    surfaceContainer: '#E5EEFF',
    surfaceContainerHigh: '#DCE9FF',

    // Text & Foregrounds
    textPrimary: '#0F172A',
    textSecondary: '#475569',
    textMuted: '#64748B',
    textInverse: '#FFFFFF',

    // Borders & Dividers
    borderSubtle: '#F1F5F9',
    borderDefault: '#E2E8F0',
    borderStrong: '#CBD5E1',
    borderFocus: '#0F172A',
    borderAi: '#818CF8',

    // Primary Accents
    primary: '#0F172A',
    primaryHover: '#1E293B',
    secondary: '#4F46E5', // Autonomous AI Agent & Pipeline Telemetry
    cyan: '#06B6D4',      // Active Probing / Kernel Heuristics

    // Cybersecurity Semantic Status Indicators
    status: {
      secured: {
        base: '#059669',
        bg: '#ECFDF5',
        border: '#A7F3D0',
        text: '#065F46',
        beacon: '#10B981',
      },
      warning: {
        base: '#D97706',
        bg: '#FFFBEB',
        border: '#FDE68A',
        text: '#92400E',
        beacon: '#F59E0B',
      },
      critical: {
        base: '#E11D48',
        bg: '#FFF1F2',
        border: '#FECDD3',
        text: '#9F1239',
        beacon: '#F43F5E',
      },
      info: {
        base: '#2563EB',
        bg: '#EFF6FF',
        border: '#BFDBFE',
        text: '#1E40AF',
        beacon: '#3B82F6',
      },
      neutral: {
        base: '#64748B',
        bg: '#F8FAFC',
        border: '#E2E8F0',
        text: '#334155',
        beacon: '#94A3B8',
      },
      ai: {
        base: '#6366F1',
        bg: '#EEF2FF',
        border: '#C7D2FE',
        text: '#3730A3',
        beacon: '#818CF8',
      },
    },
  },

  typography: {
    fontSans: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontHeading: "Geist, Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontMono: "'JetBrains Mono', 'SF Mono', Consolas, Menlo, monospace",
  },

  radii: {
    sm: '4px',
    md: '6px',
    lg: '8px',
    xl: '12px',
    full: '9999px',
  },

  shadows: {
    sm: '0 1px 2px 0 rgba(15, 23, 42, 0.05)',
    md: '0 4px 6px -1px rgba(15, 23, 42, 0.08), 0 2px 4px -2px rgba(15, 23, 42, 0.04)',
    lg: '0 10px 15px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -4px rgba(15, 23, 42, 0.03)',
    overlay: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
  },
} as const;

export type KavachTheme = typeof KAVACH_TOKENS;
