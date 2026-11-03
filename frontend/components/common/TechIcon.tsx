import React from 'react';
import { Layers, Shield, Box, Server, Database, Code2 } from 'lucide-react';

export type TechName =
  | 'aws'
  | 'azure'
  | 'gcp'
  | 'google'
  | 'github'
  | 'gitlab'
  | 'docker'
  | 'kubernetes'
  | 'k8s'
  | 'terraform'
  | 'helm'
  | 'cloudformation'
  | 'react'
  | 'nextjs'
  | 'next'
  | 'postgres'
  | 'postgresql'
  | 'redis'
  | 'nginx'
  | 'python'
  | 'nodejs'
  | 'node'
  | string;

interface TechIconProps {
  name: TechName;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const TechIcon: React.FC<TechIconProps> = ({
  name,
  size = 18,
  className = '',
  style = {},
}) => {
  const normalized = (name || '').toLowerCase().trim();

  switch (normalized) {
    case 'aws':
    case 'amazon':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
          <path d="M18.8 17.5c-2.3 1.7-5.5 2.6-8.4 2.6-4 0-7.7-1.5-10.4-4-.2-.2 0-.5.2-.4 3.7 2.1 8.2 3.3 12.8 3.3 2.7 0 5.6-.5 8.2-1.7.4-.2.7.2.4.5l-2.8-.3z" fill="#FF9900"/>
          <path d="M19.7 16.3c-.3-.4-1.9-.2-2.7-.1-.2 0-.3-.2-.1-.3 1-.7 2.7-.5 3-.2.3.4.1 2.1-.8 2.9-.2.1-.3 0-.3-.2.1-.7.9-1.7.9-2.1z" fill="#FF9900"/>
          <path d="M12.3 8.3c-.6-.7-1.5-1-2.4-1-1.8 0-3.1 1.3-3.1 3.2 0 1.9 1.2 3.2 3.1 3.2.9 0 1.7-.4 2.3-1v.8c0 .3.2.5.5.5h1.2c.3 0 .5-.2.5-.5V7.5c0-.3-.2-.5-.5-.5h-1.2c-.3 0-.5.2-.5.5v.8zm-1.8 4.2c-1 0-1.8-.8-1.8-1.9s.8-1.9 1.8-1.9 1.8.8 1.8 1.9-.8 1.9-1.8 1.9z" fill="#232F3E"/>
        </svg>
      );

    case 'azure':
    case 'microsoft azure':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
          <path d="M13.3 3.5l-6.8 12.3h5l4.8-8.7 3.7 8.7H24L17.2 3.5h-3.9z" fill="#0089D6"/>
          <path d="M6.5 15.8L0 19.5h11.4l2.1-3.7H6.5z" fill="#0072C6"/>
        </svg>
      );

    case 'gcp':
    case 'google':
    case 'google cloud':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
          <path d="M19.3 10.1c-.2-3.1-2.8-5.6-5.9-5.6-2.5 0-4.6 1.6-5.5 3.8-2.6.4-4.6 2.6-4.6 5.3 0 3 2.4 5.4 5.4 5.4h10.3c2.6 0 4.7-2.1 4.7-4.7 0-2.3-1.7-4.2-4.4-4.2z" fill="#EA4335"/>
          <path d="M13.4 4.5c2.2 0 4.1 1.3 5 3.2l1.6-.9c-1.3-2.6-4-4.3-7.1-4.3-4 0-7.3 2.9-7.9 6.8l1.9.3c.5-3 3-5.1 6.5-5.1z" fill="#4285F4"/>
          <path d="M8.7 19h10.3c2.6 0 4.7-2.1 4.7-4.7 0-2.3-1.7-4.2-4.4-4.2l-1.3.1.2-1.3c.2-2.1-1.3-4-3.4-4.4l-.4 1.9c1.4.3 2.3 1.5 2.1 2.9l-.3 1.9 1.9.2c1.7.2 2.8 1.4 2.8 2.9 0 1.6-1.3 2.9-2.9 2.9H8.7V19z" fill="#FBBC05"/>
          <path d="M8.7 19c-3 0-5.4-2.4-5.4-5.4 0-2.7 2-4.9 4.6-5.3l.3 1.9c-1.6.3-2.9 1.7-2.9 3.4 0 1.9 1.5 3.4 3.4 3.4V19z" fill="#34A853"/>
        </svg>
      );

    case 'github':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} style={style}>
          <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
        </svg>
      );

    case 'gitlab':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
          <path d="M22.65 14.39L20.61 8.1a.75.75 0 00-1.43 0l-1.8 5.54H6.62L4.82 8.1a.75.75 0 00-1.43 0L1.35 14.39a1.5 1.5 0 00.54 1.68l9.64 7a.75.75 0 00.88 0l9.64-7a1.5 1.5 0 00.6-1.68z" fill="#FC6D26"/>
          <path d="M12 23.07l-4.6-14.16h9.2L12 23.07z" fill="#E24329"/>
          <path d="M12 23.07L7.4 8.91H2.49l9.51 14.16z" fill="#FCA326"/>
          <path d="M12 23.07l4.6-14.16h4.91L12 23.07z" fill="#FCA326"/>
        </svg>
      );

    case 'docker':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="#2496ED" className={className} style={style}>
          <path d="M13.983 11.078h2.119a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.119a.185.185 0 00-.185.186v1.887c0 .102.083.185.185.185zm-2.954-5.43h2.118a.186.186 0 00.186-.186V3.574a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.185zm0 2.716h2.118a.187.187 0 00.186-.186V6.29a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.887c0 .102.082.186.185.186zm-2.93 0h2.12a.186.186 0 00.184-.186V6.29a.185.185 0 00-.185-.185H8.1a.185.185 0 00-.185.185v1.887c0 .102.083.186.185.186zm-2.964 0h2.119a.186.186 0 00.185-.186V6.29a.185.185 0 00-.185-.185H5.136a.186.186 0 00-.186.185v1.887c0 .102.084.186.186.186zm5.894 2.714h2.118a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.118a.185.185 0 00-.185.186v1.887c0 .102.082.185.185.185zm-2.93 0h2.12a.185.185 0 00.184-.185V9.006a.185.185 0 00-.184-.186h-2.12a.185.185 0 00-.184.186v1.887c0 .102.083.185.185.185zm-2.964 0h2.119a.185.185 0 00.185-.185V9.006a.185.185 0 00-.185-.186H5.136a.186.186 0 00-.186.186v1.887c0 .102.084.185.186.185zm-2.928 0h2.119a.185.185 0 00.185-.185V9.006a.185.185 0 00-.185-.186H2.208a.186.186 0 00-.186.186v1.887c0 .102.084.185.186.185zM23.792 11.7c-.52-.37-1.57-.49-2.37-.36-.45-.77-1.15-1.3-1.95-1.52l-.4-.11-.27.31c-.65.74-.98 1.67-.98 2.66 0 .42.06.84.19 1.25-.43.15-.9.23-1.39.23H1.05c-.15 0-.29.06-.39.17-.11.11-.17.26-.16.41.26 2.37 1.23 4.47 2.82 5.92 1.83 1.67 4.29 2.53 7.15 2.53 5.43 0 9.77-3.09 11.23-8.03.74-.08 1.48-.36 2.09-.84.22-.18.23-.48.01-.69z"/>
        </svg>
      );

    case 'kubernetes':
    case 'k8s':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="#326CE5" className={className} style={style}>
          <path d="M12 2L3 7.2v10.4L12 23l9-5.4V7.2L12 2zm0 2.3l6.9 4.1v7.6L12 20.1l-6.9-4.1V8.4L12 4.3z"/>
          <path d="M12 7.5a4.5 4.5 0 100 9 4.5 4.5 0 000-9zm0 2a2.5 2.5 0 110 5 2.5 2.5 0 010-5z"/>
        </svg>
      );

    case 'terraform':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="#844FBA" className={className} style={style}>
          <path d="M14.6 8.3L9.7 5.5v5.6l4.9 2.8V8.3zM9.1 5.5L4.2 8.3v5.6l4.9-2.8V5.5zm5.5 6.1l-4.9 2.8v5.6l4.9-2.8v-5.6zm5.5-6.1l-4.9 2.8v5.6l4.9-2.8V5.5z"/>
        </svg>
      );

    case 'helm':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="#0F1689" className={className} style={style}>
          <circle cx="12" cy="12" r="9" fill="none" stroke="#0F1689" strokeWidth="2"/>
          <circle cx="12" cy="12" r="3" fill="#0F1689"/>
          <path d="M12 3v6M12 15v6M3 12h6M15 12h6M5.6 5.6l4.3 4.3M14.1 14.1l4.3 4.3M5.6 18.4l4.3-4.3M14.1 9.9l4.3-4.3" stroke="#0F1689" strokeWidth="1.5"/>
        </svg>
      );

    case 'cloudformation':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
          <rect x="3" y="3" width="18" height="18" rx="2" fill="#FF9900"/>
          <path d="M8 8h8v2H8zm0 3h8v2H8zm0 3h5v2H8z" fill="#FFFFFF"/>
        </svg>
      );

    case 'react':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
          <ellipse cx="12" cy="12" rx="10" ry="4" stroke="#61DAFB" strokeWidth="1.5"/>
          <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)" stroke="#61DAFB" strokeWidth="1.5"/>
          <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)" stroke="#61DAFB" strokeWidth="1.5"/>
          <circle cx="12" cy="12" r="2" fill="#61DAFB"/>
        </svg>
      );

    case 'nextjs':
    case 'next':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} style={style}>
          <circle cx="12" cy="12" r="10" fill="#000000"/>
          <path d="M9.5 8.5v7h1.8v-4.1l3.5 4.1h1.7v-7h-1.8v4.1l-3.5-4.1H9.5z" fill="#FFFFFF"/>
        </svg>
      );

    case 'postgres':
    case 'postgresql':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="#336791" className={className} style={style}>
          <path d="M12 2C6.5 2 2 6.5 2 12c0 3.8 2.1 7.1 5.2 8.8l1.4-2.8C6.3 16.7 5 14.5 5 12c0-3.9 3.1-7 7-7s7 3.1 7 7c0 2.5-1.3 4.7-3.6 6l1.4 2.8C19.9 19.1 22 15.8 22 12c0-5.5-4.5-10-10-10z"/>
          <path d="M12 7c-2.8 0-5 2.2-5 5 0 1.9 1 3.5 2.5 4.3l1.1-2.1c-.8-.5-1.4-1.3-1.4-2.2 0-1.5 1.2-2.8 2.8-2.8s2.8 1.2 2.8 2.8c0 .9-.6 1.7-1.4 2.2l1.1 2.1c1.5-.8 2.5-2.4 2.5-4.3 0-2.8-2.2-5-5-5z"/>
        </svg>
      );

    case 'redis':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="#DC382D" className={className} style={style}>
          <path d="M21.2 7.8L12.5 3c-.3-.2-.7-.2-1 0L2.8 7.8c-.3.2-.5.5-.5.8v7.8c0 .3.2.7.5.8l8.7 4.8c.3.2.7.2 1 0l8.7-4.8c.3-.2.5-.5.5-.8V8.6c0-.3-.2-.7-.5-.8zM12 5.1l6.7 3.7-6.7 3.7L5.3 8.8 12 5.1zm-7.7 5l6.7 3.7v7.1L4.3 17.2v-7.1zm15.4 7.1l-6.7 3.7v-7.1l6.7-3.7v7.1z"/>
        </svg>
      );

    case 'nginx':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="#009639" className={className} style={style}>
          <path d="M12 2L2 7.8v8.4L12 22l10-5.8V7.8L12 2zm-4 6.5h2.2l3.8 5.7V8.5h2v7h-2.2L10 9.8v5.7H8v-7z"/>
        </svg>
      );

    case 'python':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
          <path d="M11.9 2c-3.1 0-4.9.4-4.9 2.5v1.9h4.9v.6H5.4C3.3 7 2 8.7 2 11.2c0 2.2 1.3 3.8 3.4 3.8h1.6v-2.3c0-2.3 2-4.2 4.3-4.2h4.9V4.5c0-2.1-1.8-2.5-4.3-2.5zm-1.4 1.3c.5 0 .9.4.9.9s-.4.9-.9.9-.9-.4-.9-.9.4-.9.9-.9z" fill="#3776AB"/>
          <path d="M12.1 22c3.1 0 4.9-.4 4.9-2.5v-1.9h-4.9v-.6h6.5c2.1 0 3.4-1.7 3.4-4.2 0-2.2-1.3-3.8-3.4-3.8H17v2.3c0 2.3-2 4.2-4.3 4.2H7.8v4c0 2.1 1.8 2.5 4.3 2.5zm1.4-1.3c-.5 0-.9-.4-.9-.9s.4-.9.9-.9.9.4.9.9-.4.9-.9.9z" fill="#FFD43B"/>
        </svg>
      );

    case 'nodejs':
    case 'node':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="#339933" className={className} style={style}>
          <path d="M12 2l9 5.2v10.4L12 22l-9-5.2V7.2L12 2zm-1 6.5c-1.7 0-3 1.3-3 3s1.3 3 3 3 3-1.3 3-3-1.3-3-3-3z"/>
        </svg>
      );

    default:
      return <Layers size={size} className={className} style={{ color: '#64748B', ...style }} />;
  }
};

export default TechIcon;
