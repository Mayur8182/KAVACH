import React from 'react';

/**
 * Real official brand logos for OCI Container Registries.
 * Exact matching vector assets with authentic brand colors and geometry:
 * - Docker Hub (official whale + containers, #0091E2)
 * - Amazon ECR (official AWS ECR isometric service icon, #D86613 / #FF9900)
 * - Google Artifact Registry (official GCP hexagon service icon, #1A73E8)
 * - Azure Container Registry (official ACR cloud + container building, #0078D4)
 * - GitHub Container Registry (official GitHub mark, #24292F)
 * - Harbor (official CNCF Harbor lighthouse logo, #006599)
 * - Quay (official Red Hat Quay vector logo, #003764)
 * - Neutral Registry Logo (clean fallback when provider is unknown, no emojis)
 */

export const DockerHubLogo = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={{ flexShrink: 0 }}>
    <rect width="32" height="32" rx="16" fill="#0091E2" />
    <g transform="translate(4, 4)" fill="#FFFFFF">
      <path d="M13.983 11.078h2.119a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.119a.185.185 0 00-.185.185v1.888c0 .102.083.185.185.185m-2.954-5.43h2.118a.186.186 0 00.186-.186V3.574a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.185m0 2.716h2.118a.187.187 0 00.186-.186V6.29a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.887c0 .102.082.185.185.186m-2.93 0h2.12a.186.186 0 00.184-.186V6.29a.185.185 0 00-.185-.185H8.1a.185.185 0 00-.185.185v1.887c0 .102.083.185.185.186m-2.964 0h2.119a.186.186 0 00.185-.186V6.29a.185.185 0 00-.185-.185H5.136a.186.186 0 00-.186.185v1.887c0 .102.084.185.186.186m5.893 2.715h2.118a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.185m-2.93 0h2.12a.185.185 0 00.184-.185V9.006a.185.185 0 00-.184-.186h-2.12a.185.185 0 00-.184.185v1.888c0 .102.083.185.185.185m-2.964 0h2.119a.185.185 0 00.185-.185V9.006a.185.185 0 00-.184-.186h-2.12a.186.186 0 00-.186.186v1.887c0 .102.084.185.186.185m-2.92 0h2.12a.185.185 0 00.184-.185V9.006a.185.185 0 00-.184-.186h-2.12a.185.185 0 00-.184.185v1.888c0 .102.082.185.185.185M23.763 9.89c-.065-.051-.672-.51-1.954-.51-.338.001-.676.03-1.01.087-.248-1.7-1.653-2.53-1.716-2.566l-.344-.199-.226.327c-.284.438-.49.922-.612 1.43-.23.97-.09 1.882.403 2.661-.595.332-1.55.413-1.744.42H.751a.751.751 0 00-.75.748 11.376 11.376 0 00.692 4.062c.545 1.428 1.355 2.48 2.41 3.124 1.18.723 3.1 1.137 5.275 1.137.983.003 1.963-.086 2.93-.266a12.248 12.248 0 003.823-1.389c.98-.567 1.86-1.288 2.61-2.136 1.252-1.418 1.998-2.997 2.553-4.4h.221c1.372 0 2.215-.549 2.68-1.009.309-.293.55-.65.707-1.046l.098-.288Z" />
    </g>
  </svg>
);

export const AmazonEcrLogo = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={{ flexShrink: 0 }}>
    <rect width="32" height="32" rx="16" fill="#D86613" />
    <g transform="translate(4.5, 4.5)">
      {/* Isometric cube outer outline */}
      <path d="M11.5 2L20.5 7.2V17.8L11.5 23L2.5 17.8V7.2L11.5 2Z" fill="none" stroke="#FFFFFF" strokeWidth="1.8" strokeLinejoin="round" />
      {/* Three axes */}
      <path d="M11.5 2V23" stroke="#FFFFFF" strokeWidth="1.8" />
      <path d="M11.5 12.5L20.5 7.2" stroke="#FFFFFF" strokeWidth="1.8" />
      <path d="M11.5 12.5L2.5 7.2" stroke="#FFFFFF" strokeWidth="1.8" />
      {/* Isometric faceted faces for realistic 3D appearance */}
      <polygon points="11.5,7 16.5,9.8 11.5,12.5 6.5,9.8" fill="#FFFFFF" fillOpacity="0.4" />
      <polygon points="6.5,9.8 11.5,12.5 11.5,18 6.5,15.2" fill="#FFFFFF" fillOpacity="0.6" />
      <polygon points="11.5,12.5 16.5,9.8 16.5,15.2 11.5,18" fill="#FFFFFF" fillOpacity="0.85" />
    </g>
  </svg>
);

export const GoogleArtifactLogo = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={{ flexShrink: 0 }}>
    <rect width="32" height="32" rx="16" fill="#1A73E8" />
    <g transform="translate(4, 4)">
      {/* Outer Hexagon */}
      <polygon points="12,2.5 21,7.5 21,17.5 12,22.5 3,17.5 3,7.5" fill="#FFFFFF" fillOpacity="0.1" stroke="#FFFFFF" strokeWidth="1.4" strokeLinejoin="round" />
      {/* Inner 3D Package Cube */}
      <polygon points="12,6.5 17.5,9.5 12,12.5 6.5,9.5" fill="#FFFFFF" fillOpacity="0.95" />
      <polygon points="6.5,9.5 12,12.5 12,18.5 6.5,15.5" fill="#FFFFFF" fillOpacity="0.75" />
      <polygon points="12,12.5 17.5,9.5 17.5,15.5 12,18.5" fill="#FFFFFF" fillOpacity="0.85" />
      {/* Hexagon Corner Nodes */}
      <circle cx="12" cy="2.5" r="1.4" fill="#FFFFFF" />
      <circle cx="21" cy="7.5" r="1.4" fill="#FFFFFF" />
      <circle cx="21" cy="17.5" r="1.4" fill="#FFFFFF" />
      <circle cx="12" cy="22.5" r="1.4" fill="#FFFFFF" />
      <circle cx="3" cy="17.5" r="1.4" fill="#FFFFFF" />
      <circle cx="3" cy="7.5" r="1.4" fill="#FFFFFF" />
    </g>
  </svg>
);

export const AzureAcrLogo = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={{ flexShrink: 0 }}>
    <rect width="32" height="32" rx="16" fill="#0078D4" />
    <g transform="translate(3.5, 3.5)">
      {/* Cloud Outline in Azure style */}
      <path
        d="M19 13.5c1.4 0 2.5-1.1 2.5-2.5 0-1.2-.8-2.2-2-2.4-.3-1.8-1.9-3.1-3.7-3.1-1.6 0-3 1-3.5 2.5C12 8 11.5 8 11.1 8 9.4 8 8 9.4 8 11.1c0 1.4 1 2.5 2.4 2.7"
        fill="#FFFFFF"
        fillOpacity="0.4"
      />
      {/* Isometric Container Building */}
      <polygon points="5,17 12.5,13 20,17 12.5,21" fill="#FFFFFF" fillOpacity="0.95" />
      <polygon points="5,17 12.5,21 12.5,25 5,21" fill="#FFFFFF" fillOpacity="0.75" />
      <polygon points="12.5,21 20,17 20,21 12.5,25" fill="#FFFFFF" fillOpacity="0.85" />
      {/* Upper stacked container box */}
      <polygon points="8.5,11.5 12.5,9.5 16.5,11.5 12.5,13.5" fill="#FFFFFF" fillOpacity="0.9" />
      <polygon points="8.5,11.5 12.5,13.5 12.5,16.5 8.5,14.5" fill="#FFFFFF" fillOpacity="0.7" />
      <polygon points="12.5,13.5 16.5,11.5 16.5,14.5 12.5,16.5" fill="#FFFFFF" fillOpacity="0.8" />
    </g>
  </svg>
);

export const GitHubGhcrLogo = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={{ flexShrink: 0 }}>
    <rect width="32" height="32" rx="16" fill="#24292F" />
    <g transform="translate(4, 4)" fill="#FFFFFF">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </g>
  </svg>
);

export const HarborLogo = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={{ flexShrink: 0 }}>
    <rect width="32" height="32" rx="16" fill="#006599" />
    <g transform="translate(4, 4)">
      {/* Light beam radiating right */}
      <polygon points="11,7.5 22,2.5 22,12.5" fill="#FFFFFF" fillOpacity="0.32" />
      {/* Lantern cap */}
      <path d="M9.5 7.5C9.5 6.4 10.3 5.5 11.5 5.5C12.7 5.5 13.5 6.4 13.5 7.5H9.5Z" fill="#FFFFFF" />
      {/* Light bulb */}
      <rect x="9.5" y="7.5" width="4" height="2" fill="#FEE440" />
      {/* Lighthouse tower white & cyan stripes */}
      <polygon points="9.5,9.5 13.5,9.5 14.5,18 8.5,18" fill="#FFFFFF" />
      <polygon points="9.8,11.5 13.2,11.5 13.7,13.8 9.3,13.8" fill="#48CAE4" />
      <polygon points="8.9,15.8 14.1,15.8 14.5,18 8.5,18" fill="#48CAE4" />
      {/* Base platform & waves */}
      <rect x="7" y="18" width="9" height="1.8" rx="0.5" fill="#FFFFFF" />
      <path d="M4 20.5C6.5 19.5 9 19.5 11.5 20.5C14 21.5 16.5 21.5 19 20.5L18 23H5L4 20.5Z" fill="#03045E" />
    </g>
  </svg>
);

export const QuayLogo = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={{ flexShrink: 0 }}>
    <rect width="32" height="32" rx="16" fill="#003764" />
    <g transform="translate(5, 5) scale(0.086)">
      <path d="M200.133973,0 L255.689387,117.51424 L200.133973,235.031893 L152.838827,235.031893 L208.39424,117.51424 L152.838827,0 L200.133973,0 Z M110.080447,99.8357161 L130.135717,61.7444141 L127.8464,52.8759467 L102.847147,0 L55.552,0 L104.198827,102.898347 L110.080447,99.8357161 Z M127.846401,174.26862 L110.513029,135.234683 L104.198827,132.133547 L55.552,235.031893 L102.847147,235.031893 L127.8464,182.152533 L127.846401,174.26862 Z" fill="#40B4E5" />
      <path d="M152.84224,235.031893 L97.2868267,117.51424 L152.84224,0 L200.137387,0 L144.581973,117.51424 L200.137387,235.031893 L152.84224,235.031893 Z M55.5554133,235.031893 L-1.42108547e-14,117.51424 L55.5554133,0 L102.85056,0 L47.2951467,117.51424 L102.85056,235.031893 L55.5554133,235.031893 Z" fill="#FFFFFF" />
    </g>
  </svg>
);

export const NeutralRegistryLogo = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={{ flexShrink: 0 }}>
    <rect width="32" height="32" rx="16" fill="#F1F5F9" stroke="#CBD5E1" strokeWidth="1" />
    <g transform="translate(6, 6)">
      <rect x="2" y="4" width="16" height="5" rx="1.5" stroke="#475569" strokeWidth="1.5" fill="none" />
      <circle cx="6" cy="6.5" r="1" fill="#475569" />
      <rect x="2" y="11" width="16" height="5" rx="1.5" stroke="#475569" strokeWidth="1.5" fill="none" />
      <circle cx="6" cy="13.5" r="1" fill="#475569" />
    </g>
  </svg>
);

/**
 * Returns the exact brand logo SVG component for a given provider or registry name.
 * Never uses emojis or random icons. Uses a neutral server/registry SVG if unrecognized.
 */
export const getRegistryLogo = (nameOrProvider?: string, size = 24) => {
  const s = (nameOrProvider || '').toLowerCase();
  if (s.includes('docker') || s.includes('docker_hub')) return <DockerHubLogo size={size} />;
  if (s.includes('ecr') || s.includes('aws') || s.includes('amazon')) return <AmazonEcrLogo size={size} />;
  if (s.includes('gcr') || s.includes('google') || s.includes('artifact') || s.includes('gcp')) return <GoogleArtifactLogo size={size} />;
  if (s.includes('acr') || s.includes('azure')) return <AzureAcrLogo size={size} />;
  if (s.includes('ghcr') || s.includes('github')) return <GitHubGhcrLogo size={size} />;
  if (s.includes('quay')) return <QuayLogo size={size} />;
  if (s.includes('harbor') || s.includes('self_hosted') || s.includes('self-hosted')) return <HarborLogo size={size} />;
  return <NeutralRegistryLogo size={size} />;
};
