'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check, Terminal, ChevronDown, ChevronUp } from 'lucide-react';

interface MCPManifestData {
  endpoints?: {
    sse?: string;
  };
  configs?: {
    claude_desktop?: {
      mcpServers?: {
        kavach?: {
          command?: string;
          args?: string[];
          env?: Record<string, string>;
        };
      };
    };
    cursor?: {
      mcpServers?: {
        'kavach-security'?: {
          url?: string;
          headers?: Record<string, string>;
        };
      };
    };
    antigravity?: {
      name?: string;
      transport?: string;
      url?: string;
    };
  };
}

interface MCPStatusData {
  status?: string;
  registered_tools_count?: number;
}

const ClaudeLogo = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M4.709 15.955l4.72-2.647.08-.23-.08-.128H9.2l-.79-.048-2.698-.073-2.339-.097-2.266-.122-.571-.121L0 11.784l.055-.352.48-.321.686.06 1.52.103 2.278.158 1.652.097 2.449.255h.389l.055-.157-.134-.098-.103-.097-2.358-1.596-2.552-1.688-1.336-.972-.724-.491-.364-.462-.158-1.008.656-.722.881.06.225.061.893.686 1.908 1.476 2.491 1.833.365.304.145-.103.019-.073-.164-.274-1.355-2.446-1.446-2.49-.644-1.032-.17-.619a2.97 2.97 0 01-.104-.729L6.283.134 6.696 0l.996.134.42.364.62 1.414 1.002 2.229 1.555 3.03.456.898.243.832.091.255h.158V9.01l.128-1.706.237-2.095.23-2.695.08-.76.376-.91.747-.492.584.28.48.685-.067.444-.286 1.851-.559 2.903-.364 1.942h.212l.243-.242.985-1.306 1.652-2.064.73-.82.85-.904.547-.431h1.033l.76 1.129-.34 1.166-1.064 1.347-.881 1.142-1.264 1.7-.79 1.36.073.11.188-.02 2.856-.606 1.543-.28 1.841-.315.833.388.091.395-.328.807-1.969.486-2.309.462-3.439.813-.042.03.049.061 1.549.146.662.036h1.622l3.02.225.79.522.474.638-.079.485-1.215.62-1.64-.389-3.829-.91-1.312-.329h-.182v.11l1.093 1.068 2.006 1.81 2.509 2.33.127.578-.322.455-.34-.049-2.205-1.657-.851-.747-1.926-1.62h-.128v.17l.444.649 2.345 3.521.122 1.08-.17.353-.608.213-.668-.122-1.374-1.925-1.415-2.167-1.143-1.943-.14.08-.674 7.254-.316.37-.729.28-.607-.461-.322-.747.322-1.476.389-1.924.315-1.53.286-1.9.17-.632-.012-.042-.14.018-1.434 1.967-2.18 2.945-1.726 1.845-.414.164-.717-.37.067-.662.401-.589 2.388-3.036 1.44-1.882.93-1.086-.006-.158h-.055L4.132 18.56l-1.13.146-.487-.456.061-.746.231-.243 1.908-1.312-.006.006z"
      fill="#D97757"
    />
  </svg>
);

const ChatGptLogo = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M9.205 8.658v-2.26c0-.19.072-.333.238-.428l4.543-2.616c.619-.357 1.356-.523 2.117-.523 2.854 0 4.662 2.212 4.662 4.566 0 .167 0 .357-.024.547l-4.71-2.759a.797.797 0 00-.856 0l-5.97 3.473zm10.609 8.8V12.06c0-.333-.143-.57-.429-.737l-5.97-3.473 1.95-1.118a.433.433 0 01.476 0l4.543 2.617c1.309.76 2.189 2.378 2.189 3.948 0 1.808-1.07 3.473-2.76 4.163zM7.802 12.703l-1.95-1.142c-.167-.095-.239-.238-.239-.428V5.899c0-2.545 1.95-4.472 4.591-4.472 1 0 1.927.333 2.712.928L8.23 5.067c-.285.166-.428.404-.428.737v6.898zM12 15.128l-2.795-1.57v-3.33L12 8.658l2.795 1.57v3.33L12 15.128zm1.796 7.23c-1 0-1.927-.332-2.712-.927l4.686-2.712c.285-.166.428-.404.428-.737v-6.898l1.974 1.142c.167.095.238.238.238.428v5.233c0 2.545-1.974 4.472-4.614 4.472zm-5.637-5.303l-4.544-2.617c-1.308-.761-2.188-2.378-2.188-3.948A4.482 4.482 0 014.21 6.327v5.423c0 .333.143.571.428.738l5.947 3.449-1.95 1.118a.432.432 0 01-.476 0zm-.262 3.9c-2.688 0-4.662-2.021-4.662-4.519 0-.19.024-.38.047-.57l4.686 2.71c.286.167.571.167.856 0l5.97-3.448v2.26c0 .19-.07.333-.237.428l-4.543 2.616c-.619.357-1.356.523-2.117.523z"
      fill="#0F172A"
    />
  </svg>
);

const CursorLogo = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M12 2L20.66 7V17L12 22L3.34 17V7L12 2Z" fill="#27272A" />
    <path d="M12 2L20.66 7L12 12L3.34 7L12 2Z" fill="#71717A" />
    <path d="M12 12V22L3.34 17V7L12 12Z" fill="#52525B" />
    <path d="M12 12L20.66 7V17L12 22V12Z" fill="#18181B" />
  </svg>
);

const GeminiLogo = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M20.616 10.835a14.147 14.147 0 01-4.45-3.001 14.111 14.111 0 01-3.678-6.452.503.503 0 00-.975 0 14.134 14.134 0 01-3.679 6.452 14.155 14.155 0 01-4.45 3.001c-.65.28-1.318.505-2.002.678a.502.502 0 000 .975c.684.172 1.35.397 2.002.677a14.147 14.147 0 014.45 3.001 14.112 14.112 0 013.679 6.453.502.502 0 00.975 0c.172-.685.397-1.351.677-2.003a14.145 14.145 0 013.001-4.45 14.113 14.113 0 016.453-3.678.503.503 0 000-.975 13.245 13.245 0 01-2.003-.678z"
      fill="url(#kavach-gem-dock)"
    />
    <defs>
      <linearGradient id="kavach-gem-dock" x1="2" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#3186FF" />
        <stop offset="45%" stopColor="#08B962" />
        <stop offset="80%" stopColor="#FABC12" />
        <stop offset="100%" stopColor="#F94543" />
      </linearGradient>
    </defs>
  </svg>
);

const VsCodeLogo = () => (
  <svg width="19" height="19" viewBox="0 0 100 100" fill="none" aria-hidden="true">
    <mask id="kavach-vscode-m4" width="100" height="100" x="0" y="0" maskUnits="userSpaceOnUse">
      <path
        fill="#FFFFFF"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M70.912 99.317a6.223 6.223 0 0 0 4.96-.19l20.589-9.907A6.25 6.25 0 0 0 100 83.587V16.413a6.25 6.25 0 0 0-3.54-5.632L75.874.874a6.226 6.226 0 0 0-7.104 1.21L29.355 38.04 12.187 25.01a4.162 4.162 0 0 0-5.318.236l-5.506 5.009a4.168 4.168 0 0 0-.004 6.162L16.247 50 1.36 63.583a4.168 4.168 0 0 0 .004 6.162l5.506 5.01a4.162 4.162 0 0 0 5.318.236l17.168-13.032L68.77 97.917a6.217 6.217 0 0 0 2.143 1.4ZM75.015 27.3 45.11 50l29.906 22.701V27.3Z"
      />
    </mask>
    <g mask="url(#kavach-vscode-m4)">
      <path
        fill="#0065A9"
        d="M96.461 10.796 75.857.876a6.23 6.23 0 0 0-7.107 1.207l-67.451 61.5a4.167 4.167 0 0 0 .004 6.162l5.51 5.009a4.167 4.167 0 0 0 5.32.236l81.228-61.62c2.725-2.067 6.639-.124 6.639 3.297v-.24a6.25 6.25 0 0 0-3.539-5.63Z"
      />
      <path
        fill="#007ACC"
        d="m96.461 89.204-20.604 9.92a6.229 6.229 0 0 1-7.107-1.207l-67.451-61.5a4.167 4.167 0 0 1 .004-6.162l5.51-5.009a4.167 4.167 0 0 1 5.32-.236l81.228 61.62c2.725 2.067 6.639.124 6.639-3.297v.24a6.25 6.25 0 0 1-3.539 5.63Z"
      />
      <path
        fill="#1F9CF0"
        d="M75.858 99.126a6.232 6.232 0 0 1-7.108-1.21c2.306 2.307 6.25.674 6.25-2.588V4.672c0-3.262-3.944-4.895-6.25-2.589a6.232 6.232 0 0 1 7.108-1.21l20.6 9.908A6.25 6.25 0 0 1 100 16.413v67.174a6.25 6.25 0 0 1-3.541 5.633l-20.601 9.906Z"
      />
    </g>
  </svg>
);

type AgentId = 'claude' | 'chatgpt' | 'cursor' | 'gemini' | 'vscode';

const MCP_AGENTS: { id: AgentId; name: string; Logo: React.FC }[] = [
  { id: 'claude', name: 'Claude', Logo: ClaudeLogo },
  { id: 'chatgpt', name: 'ChatGPT', Logo: ChatGptLogo },
  { id: 'cursor', name: 'Cursor', Logo: CursorLogo },
  { id: 'gemini', name: 'Gemini', Logo: GeminiLogo },
  { id: 'vscode', name: 'VS Code', Logo: VsCodeLogo },
];

export const KavachMcpConnectWidget: React.FC = () => {
  const [mcpUrl, setMcpUrl] = useState<string>('');
  const [cliCommand, setCliCommand] = useState<string>('');
  const [manifestConfigs, setManifestConfigs] = useState<MCPManifestData['configs']>();
  const [gatewayStatus, setGatewayStatus] = useState<'loading' | 'online' | 'offline'>('loading');
  const [toolsCount, setToolsCount] = useState<number | null>(null);
  const [showTerminal, setShowTerminal] = useState(false);
  const [snippetMode, setSnippetMode] = useState<'cli' | 'json'>('cli');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedCli, setCopiedCli] = useState(false);
  const [hoveredAgent, setHoveredAgent] = useState<AgentId | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<AgentId | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadGatewayMeta() {
      try {
        const [statusRes, manifestRes] = await Promise.all([
          fetch('/api/v1/mcp/status', { cache: 'no-store' }),
          fetch('/api/v1/mcp/manifest', { cache: 'no-store' }),
        ]);

        if (cancelled) return;

        if (statusRes.ok) {
          const st = (await statusRes.json()) as MCPStatusData;
          if (!cancelled) {
            setGatewayStatus(st.status === 'ONLINE' ? 'online' : 'offline');
            if (typeof st.registered_tools_count === 'number') {
              setToolsCount(st.registered_tools_count);
            }
          }
        } else if (!cancelled) {
          setGatewayStatus('offline');
        }

        if (manifestRes.ok) {
          const mf = (await manifestRes.json()) as MCPManifestData;
          if (!cancelled) {
            if (mf.endpoints?.sse) {
              setMcpUrl(mf.endpoints.sse);
            }
            if (mf.configs) {
              setManifestConfigs(mf.configs);
            }
            const claudeCfg = mf.configs?.claude_desktop?.mcpServers?.kavach;
            if (claudeCfg?.command && Array.isArray(claudeCfg.args)) {
              setCliCommand(`${claudeCfg.command} ${claudeCfg.args.join(' ')}`);
            }
          }
        }
      } catch {
        if (!cancelled) {
          setGatewayStatus('offline');
        }
      }
    }

    void loadGatewayMeta();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCopy = async (text: string, which: 'url' | 'cli') => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      if (which === 'url') {
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 1800);
      } else {
        setCopiedCli(true);
        setTimeout(() => setCopiedCli(false), 1800);
      }
    } catch {
      // Clipboard blocked in restricted browser mode
    }
  };

  const activeAgentId = hoveredAgent ?? selectedAgent;
  const activeAgentName = activeAgentId
    ? MCP_AGENTS.find((a) => a.id === activeAgentId)?.name
    : null;
  const selectedAgentName = selectedAgent
    ? MCP_AGENTS.find((a) => a.id === selectedAgent)?.name
    : null;

  const selectedJsonSnippet = React.useMemo(() => {
    if (!mcpUrl) return '';
    if (selectedAgent === 'claude' && manifestConfigs?.claude_desktop) {
      return JSON.stringify(manifestConfigs.claude_desktop, null, 2);
    }
    if (selectedAgent === 'cursor' && manifestConfigs?.cursor) {
      return JSON.stringify(manifestConfigs.cursor, null, 2);
    }
    return JSON.stringify(
      {
        mcpServers: {
          kavach: {
            url: mcpUrl,
          },
        },
      },
      null,
      2
    );
  }, [mcpUrl, selectedAgent, manifestConfigs]);

  const terminalCopyPayload = snippetMode === 'cli' ? cliCommand : selectedJsonSnippet;

  return (
    <div className="w-full rounded-2xl border border-slate-200/90 bg-white p-6 shadow-[0_14px_38px_-16px_rgba(15,23,42,0.10)] text-left">
      {/* Fuse-Inspired Single Header Row: Label + 5 Bare Multi-Color Client Logos */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 mb-3">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
          <span className="text-[11px] font-semibold tracking-[0.07em] uppercase text-slate-600">
            Give this to your agent
          </span>

          <div className="flex items-center gap-1" role="group" aria-label="Supported AI clients">
            {MCP_AGENTS.map((agent) => {
              const isSelected = selectedAgent === agent.id;
              const isHovered = hoveredAgent === agent.id;
              return (
                <motion.button
                  key={agent.id}
                  type="button"
                  whileHover={{ y: -2, scale: 1.12 }}
                  whileTap={{ scale: 0.94 }}
                  transition={{ type: 'spring', stiffness: 460, damping: 24 }}
                  onMouseEnter={() => setHoveredAgent(agent.id)}
                  onMouseLeave={() => setHoveredAgent(null)}
                  onFocus={() => setHoveredAgent(agent.id)}
                  onBlur={() => setHoveredAgent(null)}
                  onClick={() => {
                    setSelectedAgent((prev) => (prev === agent.id ? null : agent.id));
                  }}
                  aria-label={agent.name}
                  aria-pressed={isSelected}
                  className="relative w-8 h-8 rounded-lg flex items-center justify-center bg-transparent border-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                >
                  {(isSelected || isHovered) && (
                    <motion.span
                      layoutId="mcpClientHalo"
                      transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                      className={`absolute inset-0 rounded-lg ${
                        isHovered
                          ? 'bg-orange-50/90 ring-1 ring-[#EA580C]/50'
                          : 'bg-slate-100 ring-1 ring-slate-300'
                      }`}
                    />
                  )}

                  {/* Centered dark tooltip floating cleanly above the card top border */}
                  <AnimatePresence>
                    {isHovered && (
                      <motion.span
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 2 }}
                        transition={{ duration: 0.14 }}
                        className="pointer-events-none absolute bottom-[calc(100%+28px)] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-0.5 text-[10.5px] font-medium text-white shadow-md z-30"
                      >
                        {agent.name}
                      </motion.span>
                    )}
                  </AnimatePresence>

                  <span className="relative z-10 flex items-center justify-center">
                    <agent.Logo />
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Short Clear One-Line Caption */}
      <p className="text-[14px] text-slate-600 mb-4 leading-snug">
        {activeAgentName
          ? `Works with ${activeAgentName} over MCP. You approve every change.`
          : 'Connect your coding tool over MCP. You approve every fix.'}
      </p>

      {/* Clean High-Contrast URL Box + Black Copy Action */}
      <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200/95 bg-white pl-3.5 pr-1.5 py-1.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] focus-within:border-slate-400 transition-colors">
        <code
          className={`text-[13.5px] font-mono truncate ${
            mcpUrl ? 'text-slate-900 select-all' : 'text-slate-400 select-none'
          }`}
        >
          {mcpUrl || (gatewayStatus === 'offline' ? 'MCP gateway not connected' : 'Connecting to MCP gateway...')}
        </code>
        <motion.button
          type="button"
          whileTap={{ scale: 0.96 }}
          disabled={!mcpUrl}
          onClick={() => void handleCopy(mcpUrl, 'url')}
          className={`inline-flex items-center gap-1.5 shrink-0 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all duration-150 ${
            mcpUrl
              ? 'bg-[#09090B] hover:bg-[#EA580C] text-white cursor-pointer hover:shadow-[0_6px_16px_-4px_rgba(234,88,12,0.4)]'
              : 'bg-slate-200 text-slate-500 cursor-not-allowed'
          }`}
        >
          {copiedUrl ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
          <span>{copiedUrl ? 'Copied' : 'Copy'}</span>
        </motion.button>
      </div>

      {/* Subtle Footer Bar: Fixed min-h-[24px] Prevents Any CLS */}
      <div className="mt-3.5 min-h-[24px] flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setShowTerminal((prev) => !prev)}
          className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-slate-600 hover:text-[#EA580C] transition-colors cursor-pointer bg-transparent border-0 py-0.5 px-0"
        >
          <Terminal size={13} />
          <span>Prefer to use the terminal?</span>
          {showTerminal ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>

        {gatewayStatus === 'online' && toolsCount !== null ? (
          <span className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-slate-600">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
            <span>{toolsCount} MCP tools ready</span>
          </span>
        ) : gatewayStatus === 'offline' ? (
          <span className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-slate-600">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            <span>Not connected</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-slate-500">
            <span>Checking gateway...</span>
          </span>
        )}
      </div>

      {/* Smooth Expandable CLI Command / JSON Config Panel */}
      <AnimatePresence initial={false}>
        {showTerminal && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/75 p-3">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="inline-flex items-center rounded-lg bg-white border border-slate-200 p-0.5 text-[11px] font-semibold">
                  <button
                    type="button"
                    onClick={() => setSnippetMode('cli')}
                    className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                      snippetMode === 'cli' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    CLI
                  </button>
                  <button
                    type="button"
                    onClick={() => setSnippetMode('json')}
                    className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                      snippetMode === 'json' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {selectedAgentName ? `${selectedAgentName} JSON` : 'JSON'}
                  </button>
                </div>

                <button
                  type="button"
                  disabled={!terminalCopyPayload}
                  onClick={() => void handleCopy(terminalCopyPayload, 'cli')}
                  aria-label="Copy terminal setup"
                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-[#EA580C] hover:text-white hover:border-[#EA580C] transition-colors cursor-pointer disabled:opacity-50"
                >
                  {copiedCli ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                  <span>{copiedCli ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              {snippetMode === 'cli' ? (
                <code className="block text-[11.5px] font-mono text-slate-800 break-all select-all">
                  {cliCommand || (gatewayStatus === 'offline' ? 'Start the backend server to load MCP CLI config.' : 'Loading CLI command...')}
                </code>
              ) : (
                <pre className="text-[11px] font-mono text-slate-800 overflow-x-auto leading-relaxed select-all m-0">
                  {selectedJsonSnippet || 'Connect MCP server to inspect JSON config.'}
                </pre>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
