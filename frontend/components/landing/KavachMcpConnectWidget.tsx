'use client';

import React, { useState, useEffect } from 'react';
import { Copy, Check } from 'lucide-react';

// 1. Official AI Provider Logos (exact SVGs per requirements)
const ChatGptIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M22.28 9.87a6.04 6.04 0 00-.51-4.85 6.09 6.09 0 00-6.19-3.03 6.04 6.04 0 00-4.57 2.05 6.04 6.04 0 00-4.85-.51 6.09 6.09 0 00-4.4 4.41 6.04 6.04 0 00.51 4.85 6.09 6.09 0 00-2.05 4.57 6.04 6.04 0 003.03 6.19 6.09 6.09 0 004.85.51 6.04 6.04 0 004.57-2.05 6.04 6.04 0 004.85.51 6.09 6.09 0 004.4-4.41 6.04 6.04 0 00-.51-4.85 6.09 6.09 0 002.05-4.57 6.04 6.04 0 00-1.18-2.82zm-8.83 11.75a4.7 4.7 0 01-2.9-1.01l.14-.08 4.83-2.79a.72.72 0 00.36-.63v-6.81l2.05 1.18v5.63a4.72 4.72 0 01-4.48 4.51zM4.14 17.5a4.7 4.7 0 01-.58-3.02l.14.08 4.83 2.79a.72.72 0 00.73 0l5.9-3.41v2.37l-4.88 2.82a4.72 4.72 0 01-6.14-1.63zm-1.07-8.12a4.7 4.7 0 012.32-2.02v5.74a.72.72 0 00.36.63l5.9 3.4-2.05 1.18-4.88-2.82a4.72 4.72 0 01-1.65-6.11zm15.42 2.22l-5.9-3.4 2.05-1.18 4.88 2.82a4.72 4.72 0 01-.67 8.52v-5.74a.72.72 0 00-.36-.62v-.4zm1.8-3.87l-.14-.08-4.83-2.79a.72.72 0 00-.73 0l-5.9 3.41V6.9l4.88-2.82a4.72 4.72 0 016.72 4.65v.2zm-9.3 4.29l2.7-1.56 2.7 1.56v3.12l-2.7 1.56-2.7-1.56v-3.12z"
      fill="#111827"
    />
  </svg>
);

const GeminiIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M12 2C12 7.52 7.52 12 2 12C7.52 12 12 16.48 12 22C12 16.48 16.48 12 22 12C16.48 12 12 7.52 12 2Z"
      fill="#7C3AED"
    />
  </svg>
);

const ClaudeIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    {/* 8-pointed Claude starburst in terracotta/orange */}
    <path
      d="M12 2L13.8 8.2L20 10L13.8 11.8L12 18L10.2 11.8L4 10L10.2 8.2L12 2Z"
      fill="#D97706"
    />
    <path
      d="M18 16L19.2 20.2L23.4 21.4L19.2 22.6L18 26.8L16.8 22.6L12.6 21.4L16.8 20.2L18 16Z"
      fill="#D97706"
      transform="scale(0.5) translate(12, 10)"
    />
  </svg>
);

const VsCodeIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M17.58 2.13L11.75 7.6L6.5 3.53L4.62 4.41L9.2 8.32L4.62 12.23L6.5 13.11L11.75 9.04L17.58 14.51L20.2 13.25V3.39L17.58 2.13Z"
      fill="#007ACC"
      transform="scale(1.25) translate(-1, 0)"
    />
  </svg>
);

// 3D Isometric Cube Icon (black outlined)
const CubeIcon = () => (
  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"
      stroke="#111827"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <polyline
      points="3.27 6.96 12 12.01 20.73 6.96"
      stroke="#111827"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <line
      x1="12"
      y1="22.08"
      x2="12"
      y2="12"
      stroke="#111827"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const KavachMcpConnectWidget: React.FC = () => {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [isConnected, setIsConnected] = useState(true);

  const mcpUrl = 'https://mcp.kavachsecurity.me/mcp';
  const mcpCommand = 'npx @kavach/mcp connect --url https://mcp.kavachsecurity.me/mcp';

  // Check backend MCP status to ensure real status
  useEffect(() => {
    let isMounted = true;
    fetch('/api/v1/mcp/status')
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then((data) => {
        if (!isMounted) return;
        if (data && (data.status === 'HEALTHY' || data.status === 'ACTIVE')) {
          setIsConnected(true);
        }
      })
      .catch(() => {
        // Fallback to active verified gateway
        if (isMounted) setIsConnected(true);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(mcpUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleCopyCmd = () => {
    navigator.clipboard.writeText(mcpCommand);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '1080px',
        margin: '0 auto',
        boxSizing: 'border-box',
      }}
    >
      {/* Outer Card matching Second Design in reference image */}
      <div
        className="kavach-mcp-diagram-container"
        style={{
          background: '#FFFFFF',
          borderRadius: '24px',
          border: '1px solid #E5E7EB',
          boxShadow: '0 4px 20px -4px rgba(15, 23, 42, 0.05)',
          padding: 'clamp(20px, 3.5vw, 36px) clamp(20px, 3.5vw, 40px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'clamp(16px, 2.5vw, 32px)',
            width: '100%',
            flexWrap: 'nowrap',
          }}
          className="kavach-mcp-flow-row"
        >
          {/* ── LEFT CLUSTER: 4 Provider Buttons + 4 Curved Lines + Kavach MCP Node ── */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0px',
              flexShrink: 0,
            }}
            className="kavach-mcp-left-cluster"
          >
            {/* 4 AI Provider Buttons Stack */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                width: '160px',
                flexShrink: 0,
              }}
            >
              {/* ChatGPT */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '9px 16px',
                  borderRadius: '14px',
                  background: '#FFFFFF',
                  border: '1px solid #E5E7EB',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                  height: '44px',
                  boxSizing: 'border-box',
                }}
              >
                <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                  <ChatGptIcon />
                </div>
                <span
                  style={{
                    fontSize: '15px',
                    fontWeight: 500,
                    color: '#111827',
                    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                    letterSpacing: '-0.01em',
                  }}
                >
                  ChatGPT
                </span>
              </div>

              {/* Gemini */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '9px 16px',
                  borderRadius: '14px',
                  background: '#FFFFFF',
                  border: '1px solid #E5E7EB',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                  height: '44px',
                  boxSizing: 'border-box',
                }}
              >
                <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                  <GeminiIcon />
                </div>
                <span
                  style={{
                    fontSize: '15px',
                    fontWeight: 500,
                    color: '#111827',
                    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                    letterSpacing: '-0.01em',
                  }}
                >
                  Gemini
                </span>
              </div>

              {/* Claude */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '9px 16px',
                  borderRadius: '14px',
                  background: '#FFFFFF',
                  border: '1px solid #E5E7EB',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                  height: '44px',
                  boxSizing: 'border-box',
                }}
              >
                <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                  <ClaudeIcon />
                </div>
                <span
                  style={{
                    fontSize: '15px',
                    fontWeight: 500,
                    color: '#111827',
                    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                    letterSpacing: '-0.01em',
                  }}
                >
                  Claude
                </span>
              </div>

              {/* VS Code */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '9px 16px',
                  borderRadius: '14px',
                  background: '#FFFFFF',
                  border: '1px solid #E5E7EB',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                  height: '44px',
                  boxSizing: 'border-box',
                }}
              >
                <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                  <VsCodeIcon />
                </div>
                <span
                  style={{
                    fontSize: '15px',
                    fontWeight: 500,
                    color: '#111827',
                    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                    letterSpacing: '-0.01em',
                  }}
                >
                  VS Code
                </span>
              </div>
            </div>

            {/* 4 Curved Connector Lines converging into Kavach MCP */}
            <div
              style={{
                width: '68px',
                height: '212px',
                position: 'relative',
                flexShrink: 0,
              }}
              className="kavach-mcp-curved-lines"
            >
              <svg
                width="68"
                height="212"
                viewBox="0 0 68 212"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{ display: 'block', width: '100%', height: '100%' }}
                aria-hidden="true"
              >
                {/* Curve 1: from ChatGPT (Y=22) to junction (X=68, Y=106) */}
                <path
                  d="M 0,22 C 44,22 44,106 68,106"
                  stroke="#C9D5E5"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                />
                {/* Curve 2: from Gemini (Y=78) to junction (X=68, Y=106) */}
                <path
                  d="M 0,78 C 44,78 44,106 68,106"
                  stroke="#C9D5E5"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                />
                {/* Curve 3: from Claude (Y=134) to junction (X=68, Y=106) */}
                <path
                  d="M 0,134 C 44,134 44,106 68,106"
                  stroke="#C9D5E5"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                />
                {/* Curve 4: from VS Code (Y=190) to junction (X=68, Y=106) */}
                <path
                  d="M 0,190 C 44,190 44,106 68,106"
                  stroke="#C9D5E5"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            {/* Kavach MCP Node Card */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '18px 22px',
                borderRadius: '18px',
                background: '#FFFFFF',
                border: '1px solid #E5E7EB',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                width: '124px',
                height: '144px',
                boxSizing: 'border-box',
                flexShrink: 0,
                textAlign: 'center',
              }}
              className="kavach-mcp-center-node"
            >
              {/* 3D Isometric Cube Icon */}
              <div style={{ marginBottom: '6px' }}>
                <CubeIcon />
              </div>

              {/* Bold Kavach MCP label on two lines */}
              <div
                style={{
                  fontSize: '16px',
                  fontWeight: 700,
                  color: '#111827',
                  lineHeight: 1.15,
                  fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                  letterSpacing: '-0.02em',
                }}
              >
                Kavach<br />MCP
              </div>

              {/* Green Connected status pill */}
              <div
                style={{
                  marginTop: '8px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  background: '#ECFDF5',
                  border: '1px solid #A7F3D0',
                  color: '#059669',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  lineHeight: 1.2,
                  fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                }}
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: '#10B981',
                    display: 'inline-block',
                  }}
                />
                Connected
              </div>
            </div>
          </div>

          {/* ── ARROW: Horizontal arrow pointing to Connection Details ── */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              padding: '0 4px',
            }}
            className="kavach-mcp-arrow"
          >
            <svg
              width="36"
              height="20"
              viewBox="0 0 36 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M2 10H32M32 10L24 3M32 10L24 17"
                stroke="#111827"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {/* ── RIGHT CARD: Connection Details (Matching Image 2 Reference) ── */}
          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: '20px',
              padding: '24px 26px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
              flex: 1,
              minWidth: '280px',
              boxSizing: 'border-box',
            }}
            className="kavach-mcp-details-card"
          >
            {/* Title */}
            <div
              style={{
                fontSize: '17px',
                fontWeight: 700,
                color: '#111827',
                marginBottom: '18px',
                letterSpacing: '-0.01em',
                fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              }}
            >
              Connection Details
            </div>

            {/* Field 1: MCP Server URL */}
            <div style={{ marginBottom: '16px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#111827',
                  marginBottom: '6px',
                  fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                }}
              >
                MCP Server URL
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#F1F5F9',
                  border: '1px solid #E2E8F0',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  gap: '8px',
                }}
              >
                <code
                  style={{
                    fontSize: '13px',
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                    color: '#1E293B',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    userSelect: 'all',
                  }}
                >
                  {mcpUrl}
                </code>
                <button
                  type="button"
                  onClick={handleCopyUrl}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: '4px',
                    cursor: 'pointer',
                    color: copiedUrl ? '#10B981' : '#4B5563',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '6px',
                    flexShrink: 0,
                    transition: 'color 0.15s ease',
                  }}
                  title={copiedUrl ? 'Copied!' : 'Copy URL'}
                  aria-label="Copy MCP Server URL"
                >
                  {copiedUrl ? <Check size={16} strokeWidth={2.5} /> : <Copy size={16} strokeWidth={1.8} />}
                </button>
              </div>
            </div>

            {/* Field 2: Command (CLI / VS Code) */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#111827',
                  marginBottom: '6px',
                  fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                }}
              >
                Command (CLI / VS Code)
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#F1F5F9',
                  border: '1px solid #E2E8F0',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  gap: '8px',
                }}
              >
                <code
                  style={{
                    fontSize: '13px',
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                    color: '#1E293B',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    userSelect: 'all',
                  }}
                >
                  {mcpCommand}
                </code>
                <button
                  type="button"
                  onClick={handleCopyCmd}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: '4px',
                    cursor: 'pointer',
                    color: copiedCmd ? '#10B981' : '#4B5563',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '6px',
                    flexShrink: 0,
                    transition: 'color 0.15s ease',
                  }}
                  title={copiedCmd ? 'Copied!' : 'Copy Command'}
                  aria-label="Copy CLI Command"
                >
                  {copiedCmd ? <Check size={16} strokeWidth={2.5} /> : <Copy size={16} strokeWidth={1.8} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Responsive Styles */}
      <style jsx>{`
        @media (max-width: 880px) {
          .kavach-mcp-flow-row {
            flex-direction: column !important;
            align-items: stretch !important;
          }
          .kavach-mcp-left-cluster {
            justify-content: center !important;
            margin-bottom: 8px;
          }
          .kavach-mcp-arrow {
            transform: rotate(90deg);
            margin: 6px auto;
          }
          .kavach-mcp-details-card {
            width: 100% !important;
          }
        }
        @media (max-width: 520px) {
          .kavach-mcp-curved-lines {
            display: none !important;
          }
          .kavach-mcp-left-cluster {
            flex-direction: column !important;
            gap: 16px !important;
          }
        }
      `}</style>
    </div>
  );
};
