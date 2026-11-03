'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Link2,
  ExternalLink,
  Settings,
  Layers,
  Activity,
  Trash2,
  Check,
  RefreshCw,
  Shield,
  ArrowRight,
  Database,
  Cloud,
  Code2,
  GitBranch,
  ChevronRight,
} from 'lucide-react';
import type { ProviderCatalogItem } from '@/types/api/integrations';
import { IntegrationHealthBadge } from './IntegrationHealthBadge';

interface IntegrationProviderCardProps {
  item: ProviderCatalogItem;
  onConnectClick: (item: ProviderCatalogItem) => void;
  onManageResourcesClick: (item: ProviderCatalogItem) => void;
  onCheckHealthClick: (item: ProviderCatalogItem) => Promise<void>;
  onDisconnectClick: (item: ProviderCatalogItem) => Promise<void>;
}

function renderBrandIcon(provider: string) {
  const p = (provider || '').toLowerCase();
  if (p === 'github' || p === 'github_actions') {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="#0F172A" aria-hidden="true">
        <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
      </svg>
    );
  }
  if (p === 'gitlab' || p === 'gitlab_ci') {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M22.65 14.39L12 22.13 1.35 14.39a.84.84 0 01-.3-.94l1.22-3.78L4.2 3.65a.61.61 0 011.16 0L7.3 9.77h9.4l1.94-6.12a.61.61 0 011.16 0l1.93 6.02 1.22 3.78a.84.84 0 01-.3.94z" fill="#E24329" />
        <path d="M12 22.13l-4.7-12.36h9.4L12 22.13z" fill="#E24329" />
        <path d="M12 22.13L7.3 9.77H1.35L12 22.13z" fill="#FC6D26" />
        <path d="M12 22.13l4.7-12.36h5.95L12 22.13z" fill="#FC6D26" />
      </svg>
    );
  }
  if (p === 'aws' || p === 'aws_ecr') {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="#FF9900" aria-hidden="true">
        <path d="M6.7 13.8c-2.4 0-4.2-1.3-4.2-3.8 0-2.8 2.2-4.1 4.7-4.1 1.7 0 3.3.6 4.3 1.2v-.8c0-1.8-1.2-2.7-3.1-2.7-1.3 0-2.6.4-3.6 1.1l-.8-1.4C5.2 2.5 7 2 8.7 2c3.1 0 5 1.5 5 4.3v7.3h-1.8v-1.3c-.9.9-2.3 1.5-3.8 1.5zm.5-1.5c1.8 0 3.3-1 3.8-2.2v-1.6c-.8-.5-2.1-.9-3.4-.9-1.6 0-2.8.7-2.8 2.3-.1 1.5 1 2.4 2.4 2.4zm14.4 7.2c-5.7 3.5-12.8 3.3-17.8.2-.3-.2-.5-.6-.2-.9.2-.3.6-.3.9-.1 4.5 2.8 11 3 16.3-.2.4-.3.9 0 1 .4.2.3 0 .5-.2.6zm-1.1-1.3c-.4.5-1.3 1.4-2.5 1.5-.3 0-.5-.3-.3-.5.9-1.2 2.4-2.4 2.4-2.4.2-.2.5 0 .5.3-.1.4-.1.8-.1 1.1z" />
      </svg>
    );
  }
  if (p === 'azure' || p === 'azure_devops' || p === 'azure-devops' || p === 'azuredevops') {
    return (
      <svg width="24" height="24" viewBox="0 0 96 96" fill="none" aria-hidden="true">
        <path d="M54.5 9.5L25.3 64.2H46.8L59.7 39.8L72.2 64.2H93.5L54.5 9.5Z" fill="#0089D6" />
        <path d="M22.5 69.5L14.2 84.5H58.7L67.1 69.5H22.5Z" fill="#0089D6" />
        <path d="M54.5 9.5L34.2 47.7L46.8 64.2H72.2L54.5 9.5Z" fill="#007FFF" />
      </svg>
    );
  }
  if (p === 'gcp') {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" fill="#4285F4" />
        <path d="M19 18H6c-2.21 0-4-1.79-4-4 0-2.05 1.53-3.76 3.56-3.97l1.07-.11.5-.95C8.08 7.14 9.94 6 12 6c2.62 0 4.88 1.86 5.39 4.43l.3 1.5 1.53.11c1.56.1 2.78 1.41 2.78 2.96 0 1.65-1.35 3-3 3z" fill="#EA4335" opacity="0.8" />
      </svg>
    );
  }
  if (p === 'jenkins') {
    return (
      <svg width="24" height="24" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <circle cx="16" cy="16" r="16" fill="#D33833" />
        <path d="M16 6c-3.3 0-6 2.7-6 6 0 1.9.9 3.6 2.3 4.7-.2.4-.3.9-.3 1.3 0 2 1.8 3.5 4 3.5s4-1.5 4-3.5c0-.4-.1-.9-.3-1.3 1.4-1.1 2.3-2.8 2.3-4.7 0-3.3-2.7-6-6-6zm-2.5 5.5c.6 0 1 .4 1 1s-.4 1-1 1-1-.4-1-1 .4-1 1-1zm5 0c.6 0 1 .4 1 1s-.4 1-1 1-1-.4-1-1 .4-1 1-1zm-2.5 7.5c-1.7 0-3-1-3-2h6c0 1-1.3 2-3 2z" fill="#FFFFFF" />
      </svg>
    );
  }
  if (p === 'docker_hub' || p === 'docker') {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="#0db7ed" aria-hidden="true">
        <path d="M13.983 11.078h2.119a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.119a.185.185 0 00-.185.185v1.888c0 .102.083.185.185.185m-2.954-5.43h2.118a.186.186 0 00.186-.186V3.574a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.185m0 2.716h2.118a.187.187 0 00.186-.186V6.29a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.887c0 .102.082.186.185.186m-2.93 0h2.12a.186.186 0 00.184-.186V6.29a.185.185 0 00-.185-.185H8.1a.185.185 0 00-.185.185v1.887c0 .102.083.186.185.186m-2.964 0h2.119a.186.186 0 00.185-.186V6.29a.185.185 0 00-.185-.185H5.136a.186.186 0 00-.186.185v1.887c0 .102.084.186.186.186m5.893 2.714h2.119a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.119a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.185m-2.93 0h2.12a.185.185 0 00.184-.185V9.006a.185.185 0 00-.184-.186h-2.12a.185.185 0 00-.184.185v1.888c0 .102.083.185.185.185m-2.964 0h2.119a.185.185 0 00.185-.185V9.006a.185.185 0 00-.185-.186H5.136a.186.186 0 00-.186.185v1.888c0 .102.084.185.186.185m-2.928 0h2.119a.185.185 0 00.185-.185V9.006a.185.185 0 00-.185-.186H2.208a.186.186 0 00-.186.185v1.888c0 .102.084.185.186.185M23.73 9.406c-.4-.553-1.464-.69-2.26-.35-.295-.55-.788-1.04-1.428-1.43l-.337-.184-.236.302c-.378.473-.59.98-.636 1.503-.984-.136-2.07-.06-3.18.243V4.996a.555.555 0 00-.555-.555H1.423a.555.555 0 00-.555.555v7.214C.868 15.65 3.197 19.5 8.16 19.5c5.38 0 8.878-3.328 10.37-7.234 1.703.11 3.842-.485 5.2-2.86" />
      </svg>
    );
  }
  if (p === 'bitbucket') {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="#0052CC" aria-hidden="true">
        <path d="M2.44 3h19.12c.38 0 .67.36.57.72l-3.3 16.5c-.06.32-.34.56-.67.56H5.84c-.33 0-.61-.24-.67-.56L1.87 3.72c-.1-.36.19-.72.57-.72zm10.74 11.25h-2.36l-.77-4.5h3.9l-.77 4.5z" />
      </svg>
    );
  }
  if (p === 'slack') {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M5.04 14.5c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2h2v2zm1 0c0-1.1.9-2 2-2s2 .9 2 2v5c0 1.1-.9 2-2 2s-2-.9-2-2v-5z" fill="#E01E5A" />
        <path d="M9.5 5.04c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2v2h-2zm0 1c1.1 0 2 .9 2 2s-.9 2-2 2h-5c-1.1 0-2-.9-2-2s.9-2 2-2h5z" fill="#36C5F0" />
        <path d="M18.96 9.5c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2h-2v-2zm-1 0c0 1.1-.9 2-2 2s-2-.9-2-2v-5c0-1.1.9-2 2-2s2 .9 2 2v5z" fill="#2EB67D" />
        <path d="M14.5 18.96c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2v-2h2zm0-1c-1.1 0-2-.9-2-2s.9-2 2-2h5c1.1 0 2 .9 2 2s-.9 2-2 2h-5z" fill="#ECB22E" />
      </svg>
    );
  }
  if (p === 'jira') {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="#0052CC" aria-hidden="true">
        <path d="M11.53 2c0 2.4-1.97 4.35-4.4 4.35H2.76c-.42 0-.76.34-.76.76v4.37c0 .42.34.76.76.76h4.37c5.23 0 9.47-4.24 9.47-9.47V2h-5.07zm0 5.46c0 2.4-1.97 4.35-4.4 4.35H2.76c-.42 0-.76.34-.76.76v4.37c0 .42.34.76.76.76h4.37c5.23 0 9.47-4.24 9.47-9.47V7.46h-5.07zM17.6 13.9c0 2.4-1.97 4.35-4.4 4.35H8.83c-.42 0-.76.34-.76.76v4.23c0 .42.34.76.76.76h4.37c5.23 0 9.47-4.24 9.47-9.47v-.63H17.6z" />
      </svg>
    );
  }
  return <Cloud size={24} className="text-slate-500" />;
}

export const IntegrationProviderCard: React.FC<IntegrationProviderCardProps> = ({
  item,
  onConnectClick,
  onManageResourcesClick,
  onCheckHealthClick,
  onDisconnectClick,
}) => {
  const [checking, setChecking] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const handleHealth = async () => {
    setChecking(true);
    try {
      await onCheckHealthClick(item);
    } finally {
      setChecking(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await onDisconnectClick(item);
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group">
      {/* Top Banner & Info */}
      <div className="p-5 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-center p-2 shadow-2xs group-hover:scale-105 transition-transform">
              {renderBrandIcon(item.provider)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-slate-900">{item.name}</h4>
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200/60 uppercase tracking-wide">
                  {item.category_label}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {item.connected && item.account_name ? (
                  <span className="font-medium text-slate-800">@{item.account_name}</span>
                ) : (
                  <span>Ready to integrate</span>
                )}
              </p>
            </div>
          </div>

          <IntegrationHealthBadge status={item.status} health={item.health} />
        </div>

        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
          {item.description}
        </p>

        {/* Capabilities Pill Strip */}
        {item.supported_capabilities && item.supported_capabilities.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {item.supported_capabilities.slice(0, 4).map((cap) => (
              <span
                key={cap}
                className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-50 text-slate-600 border border-slate-200/60"
              >
                {cap}
              </span>
            ))}
            {item.supported_capabilities.length > 4 && (
              <span className="text-[10px] text-slate-400">
                +{item.supported_capabilities.length - 4} more
              </span>
            )}
          </div>
        )}

        {/* Connected Resource & Telemetry Footer */}
        {item.connected && (
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1 font-medium text-slate-700">
              <Database size={12} className="text-indigo-600" />
              {item.resources_count} {item.category === 'cloud' ? 'cloud account' : 'resources'}
            </span>
            {item.last_synced_at && (
              <span>Synced {item.last_synced_at}</span>
            )}
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="px-5 py-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between">
        {item.connected ? (
          <>
            <div className="flex items-center gap-1">
              <Link
                href={`/integrations/${encodeURIComponent(item.provider)}`}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 py-1 px-2 rounded hover:bg-blue-50/80 transition-colors"
              >
                Workspace
                <ChevronRight size={12} />
              </Link>
              <button
                onClick={() => onManageResourcesClick(item)}
                className="text-xs font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1 py-1 px-2 rounded hover:bg-slate-200/60 transition-colors"
                title="Configure capabilities"
              >
                <Settings size={12} />
                Matrix
              </button>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleHealth}
                disabled={checking}
                title="Verify live connection health"
                className="p-1.5 text-slate-500 hover:text-slate-800 rounded hover:bg-slate-200/60 transition-colors"
              >
                <RefreshCw size={13} className={checking ? 'animate-spin text-indigo-600' : ''} />
              </button>
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                title="Disconnect integration"
                className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </>
        ) : (
          <button
            onClick={() => onConnectClick(item)}
            className="w-full py-1.5 px-3 text-xs font-semibold text-indigo-600 hover:text-white bg-indigo-50 hover:bg-indigo-600 rounded-lg transition-all flex items-center justify-center gap-1.5 border border-indigo-200 hover:border-transparent shadow-2xs"
          >
            <span>Connect {item.name}</span>
            <ArrowRight size={13} />
          </button>
        )}
      </div>
    </div>
  );
};
