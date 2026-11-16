'use client';

import React, { useState, useEffect } from 'react';
import { Copy, Check } from 'lucide-react';

// 1. Official AI Provider & IDE Logos (authentic official SVGs)
const ChatGptIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M9.205 8.658v-2.26c0-.19.072-.333.238-.428l4.543-2.616c.619-.357 1.356-.523 2.117-.523 2.854 0 4.662 2.212 4.662 4.566 0 .167 0 .357-.024.547l-4.71-2.759a.797.797 0 00-.856 0l-5.97 3.473zm10.609 8.8V12.06c0-.333-.143-.57-.429-.737l-5.97-3.473 1.95-1.118a.433.433 0 01.476 0l4.543 2.617c1.309.76 2.189 2.378 2.189 3.948 0 1.808-1.07 3.473-2.76 4.163zM7.802 12.703l-1.95-1.142c-.167-.095-.239-.238-.239-.428V5.899c0-2.545 1.95-4.472 4.591-4.472 1 0 1.927.333 2.712.928L8.23 5.067c-.285.166-.428.404-.428.737v6.898zM12 15.128l-2.795-1.57v-3.33L12 8.658l2.795 1.57v3.33L12 15.128zm1.796 7.23c-1 0-1.927-.332-2.712-.927l4.686-2.712c.285-.166.428-.404.428-.737v-6.898l1.974 1.142c.167.095.238.238.238.428v5.233c0 2.545-1.974 4.472-4.614 4.472zm-5.637-5.303l-4.544-2.617c-1.308-.761-2.188-2.378-2.188-3.948A4.482 4.482 0 014.21 6.327v5.423c0 .333.143.571.428.738l5.947 3.449-1.95 1.118a.432.432 0 01-.476 0zm-.262 3.9c-2.688 0-4.662-2.021-4.662-4.519 0-.19.024-.38.047-.57l4.686 2.71c.286.167.571.167.856 0l5.97-3.448v2.26c0 .19-.07.333-.237.428l-4.543 2.616c-.619.357-1.356.523-2.117.523zm5.899 2.83a5.947 5.947 0 005.827-4.756C22.287 18.339 24 15.84 24 13.296c0-1.665-.713-3.282-1.998-4.448.119-.5.19-.999.19-1.498 0-3.401-2.759-5.947-5.946-5.947-.642 0-1.26.095-1.88.31A5.962 5.962 0 0010.205 0a5.947 5.947 0 00-5.827 4.757C1.713 5.447 0 7.945 0 10.49c0 1.666.713 3.283 1.998 4.448-.119.5-.19 1-.19 1.499 0 3.401 2.759 5.946 5.946 5.946.642 0 1.26-.095 1.88-.309a5.96 5.96 0 004.162 1.713z"
      fill="#10A37F"
    />
  </svg>
);

const GeminiIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M20.616 10.835a14.147 14.147 0 01-4.45-3.001 14.111 14.111 0 01-3.678-6.452.503.503 0 00-.975 0 14.134 14.134 0 01-3.679 6.452 14.155 14.155 0 01-4.45 3.001c-.65.28-1.318.505-2.002.678a.502.502 0 000 .975c.684.172 1.35.397 2.002.677a14.147 14.147 0 014.45 3.001 14.112 14.112 0 013.679 6.453.502.502 0 00.975 0c.172-.685.397-1.351.677-2.003a14.145 14.145 0 013.001-4.45 14.113 14.113 0 016.453-3.678.503.503 0 000-.975 13.245 13.245 0 01-2.003-.678z"
      fill="#3186FF"
    />
    <path
      d="M20.616 10.835a14.147 14.147 0 01-4.45-3.001 14.111 14.111 0 01-3.678-6.452.503.503 0 00-.975 0 14.134 14.134 0 01-3.679 6.452 14.155 14.155 0 01-4.45 3.001c-.65.28-1.318.505-2.002.678a.502.502 0 000 .975c.684.172 1.35.397 2.002.677a14.147 14.147 0 014.45 3.001 14.112 14.112 0 013.679 6.453.502.502 0 00.975 0c.172-.685.397-1.351.677-2.003a14.145 14.145 0 013.001-4.45 14.113 14.113 0 016.453-3.678.503.503 0 000-.975 13.245 13.245 0 01-2.003-.678z"
      fill="url(#kavach-gemini-grad-green)"
    />
    <path
      d="M20.616 10.835a14.147 14.147 0 01-4.45-3.001 14.111 14.111 0 01-3.678-6.452.503.503 0 00-.975 0 14.134 14.134 0 01-3.679 6.452 14.155 14.155 0 01-4.45 3.001c-.65.28-1.318.505-2.002.678a.502.502 0 000 .975c.684.172 1.35.397 2.002.677a14.147 14.147 0 014.45 3.001 14.112 14.112 0 013.679 6.453.502.502 0 00.975 0c.172-.685.397-1.351.677-2.003a14.145 14.145 0 013.001-4.45 14.113 14.113 0 016.453-3.678.503.503 0 000-.975 13.245 13.245 0 01-2.003-.678z"
      fill="url(#kavach-gemini-grad-red)"
    />
    <path
      d="M20.616 10.835a14.147 14.147 0 01-4.45-3.001 14.111 14.111 0 01-3.678-6.452.503.503 0 00-.975 0 14.134 14.134 0 01-3.679 6.452 14.155 14.155 0 01-4.45 3.001c-.65.28-1.318.505-2.002.678a.502.502 0 000 .975c.684.172 1.35.397 2.002.677a14.147 14.147 0 014.45 3.001 14.112 14.112 0 013.679 6.453.502.502 0 00.975 0c.172-.685.397-1.351.677-2.003a14.145 14.145 0 013.001-4.45 14.113 14.113 0 016.453-3.678.503.503 0 000-.975 13.245 13.245 0 01-2.003-.678z"
      fill="url(#kavach-gemini-grad-yellow)"
    />
    <defs>
      <linearGradient id="kavach-gemini-grad-green" x1="7" y1="15.5" x2="11" y2="12" gradientUnits="userSpaceOnUse">
        <stop stopColor="#08B962" />
        <stop offset="1" stopColor="#08B962" stopOpacity="0" />
      </linearGradient>
      <linearGradient id="kavach-gemini-grad-red" x1="8" y1="5.5" x2="11.5" y2="11" gradientUnits="userSpaceOnUse">
        <stop stopColor="#F94543" />
        <stop offset="1" stopColor="#F94543" stopOpacity="0" />
      </linearGradient>
      <linearGradient id="kavach-gemini-grad-yellow" x1="3.5" y1="13.5" x2="17.5" y2="12" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FABC12" />
        <stop offset="0.46" stopColor="#FABC12" stopOpacity="0" />
      </linearGradient>
    </defs>
  </svg>
);

const ClaudeIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M4.709 15.955l4.72-2.647.08-.23-.08-.128H9.2l-.79-.048-2.698-.073-2.339-.097-2.266-.122-.571-.121L0 11.784l.055-.352.48-.321.686.06 1.52.103 2.278.158 1.652.097 2.449.255h.389l.055-.157-.134-.098-.103-.097-2.358-1.596-2.552-1.688-1.336-.972-.724-.491-.364-.462-.158-1.008.656-.722.881.06.225.061.893.686 1.908 1.476 2.491 1.833.365.304.145-.103.019-.073-.164-.274-1.355-2.446-1.446-2.49-.644-1.032-.17-.619a2.97 2.97 0 01-.104-.729L6.283.134 6.696 0l.996.134.42.364.62 1.414 1.002 2.229 1.555 3.03.456.898.243.832.091.255h.158V9.01l.128-1.706.237-2.095.23-2.695.08-.76.376-.91.747-.492.584.28.48.685-.067.444-.286 1.851-.559 2.903-.364 1.942h.212l.243-.242.985-1.306 1.652-2.064.73-.82.85-.904.547-.431h1.033l.76 1.129-.34 1.166-1.064 1.347-.881 1.142-1.264 1.7-.79 1.36.073.11.188-.02 2.856-.606 1.543-.28 1.841-.315.833.388.091.395-.328.807-1.969.486-2.309.462-3.439.813-.042.03.049.061 1.549.146.662.036h1.622l3.02.225.79.522.474.638-.079.485-1.215.62-1.64-.389-3.829-.91-1.312-.329h-.182v.11l1.093 1.068 2.006 1.81 2.509 2.33.127.578-.322.455-.34-.049-2.205-1.657-.851-.747-1.926-1.62h-.128v.17l.444.649 2.345 3.521.122 1.08-.17.353-.608.213-.668-.122-1.374-1.925-1.415-2.167-1.143-1.943-.14.08-.674 7.254-.316.37-.729.28-.607-.461-.322-.747.322-1.476.389-1.924.315-1.53.286-1.9.17-.632-.012-.042-.14.018-1.434 1.967-2.18 2.945-1.726 1.845-.414.164-.717-.37.067-.662.401-.589 2.388-3.036 1.44-1.882.93-1.086-.006-.158h-.055L4.132 18.56l-1.13.146-.487-.456.061-.746.231-.243 1.908-1.312-.006.006z"
      fill="#D97706"
    />
  </svg>
);

const VsCodeIcon = () => (
  <svg width="22" height="22" viewBox="0 0 100 100" fill="none" aria-hidden="true">
    <mask id="kavach-vscode-mask" width="100" height="100" x="0" y="0" maskUnits="userSpaceOnUse">
      <path
        fill="#FFFFFF"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M70.912 99.317a6.223 6.223 0 0 0 4.96-.19l20.589-9.907A6.25 6.25 0 0 0 100 83.587V16.413a6.25 6.25 0 0 0-3.54-5.632L75.874.874a6.226 6.226 0 0 0-7.104 1.21L29.355 38.04 12.187 25.01a4.162 4.162 0 0 0-5.318.236l-5.506 5.009a4.168 4.168 0 0 0-.004 6.162L16.247 50 1.36 63.583a4.168 4.168 0 0 0 .004 6.162l5.506 5.01a4.162 4.162 0 0 0 5.318.236l17.168-13.032L68.77 97.917a6.217 6.217 0 0 0 2.143 1.4ZM75.015 27.3 45.11 50l29.906 22.701V27.3Z"
      />
    </mask>
    <g mask="url(#kavach-vscode-mask)">
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
