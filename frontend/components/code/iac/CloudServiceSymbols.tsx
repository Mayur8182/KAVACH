'use client';

import React from 'react';

export type CloudProviderType = 'AWS' | 'Azure' | 'GCP';

interface CloudServiceSymbolProps {
  provider?: string;
  symbol?: string;
  size?: number;
  className?: string;
}

export const CloudServiceSymbol: React.FC<CloudServiceSymbolProps> = ({
  provider = 'AWS',
  symbol = '',
  size = 28,
  className = '',
}) => {
  const normProv = (provider || 'AWS').toUpperCase();
  const s = (symbol || '').toLowerCase();

  // AWS SYMBOLS
  if (normProv.includes('AWS') || s.startsWith('aws')) {
    if (s.includes('route53') || s.includes('dns')) {
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
          <rect width="32" height="32" rx="7" fill="#EDE9FE" />
          <path d="M16 6L26 16L16 26L6 16Z" stroke="#7C3AED" strokeWidth="2.2" strokeLinejoin="round" />
          <circle cx="16" cy="16" r="3" fill="#7C3AED" />
          <path d="M16 6V11M16 21V26M6 16H11M21 16H26" stroke="#A78BFA" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    }
    if (s.includes('cloudfront') || s.includes('cdn')) {
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
          <rect width="32" height="32" rx="7" fill="#EDE9FE" />
          <circle cx="16" cy="16" r="9" stroke="#7C3AED" strokeWidth="2" />
          <path d="M7 16H25M16 7C18.5 10 19.5 13 19.5 16C19.5 19 18.5 22 16 25C13.5 22 12.5 19 12.5 16C12.5 13 13.5 10 16 7Z" stroke="#A78BFA" strokeWidth="1.6" />
          <circle cx="23" cy="9" r="2.5" fill="#7C3AED" />
        </svg>
      );
    }
    if (s.includes('alb') || s.includes('lb') || s.includes('load_balancer')) {
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
          <rect width="32" height="32" rx="7" fill="#EEF2FF" />
          <path d="M16 7V13M9 13H23M9 13V22M23 13V22" stroke="#4F46E5" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="9" cy="22" r="3" fill="#6366F1" />
          <circle cx="23" cy="22" r="3" fill="#6366F1" />
          <rect x="13" y="5" width="6" height="5" rx="1.5" fill="#4F46E5" />
        </svg>
      );
    }
    if (s.includes('eks') || s.includes('kubernetes') || s.includes('k8s')) {
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
          <rect width="32" height="32" rx="7" fill="#FFEDD5" />
          <circle cx="16" cy="16" r="8" stroke="#EA580C" strokeWidth="2" strokeDasharray="3 2" />
          <circle cx="16" cy="16" r="3.5" fill="#EA580C" />
          <path d="M16 5V10M16 22V27M5 16H10M22 16H27M8.5 8.5L12 12M20 20L23.5 23.5M23.5 8.5L20 12M12 20L8.5 23.5" stroke="#EA580C" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    }
    if (s.includes('ec2') || s.includes('compute') || s.includes('instance')) {
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
          <rect width="32" height="32" rx="7" fill="#FFEDD5" />
          <rect x="8" y="8" width="16" height="16" rx="3" stroke="#EA580C" strokeWidth="2" />
          <rect x="12" y="12" width="8" height="8" rx="1.5" fill="#FB923C" />
          <path d="M12 5V8M20 5V8M12 24V27M20 24V27M5 12H8M5 20H8M24 12H27M24 20H27" stroke="#EA580C" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    }
    if (s.includes('rds') || s.includes('database') || s.includes('sql') || s.includes('db')) {
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
          <rect width="32" height="32" rx="7" fill="#DBEAFE" />
          <ellipse cx="16" cy="10" rx="8" ry="3.5" fill="#3B82F6" stroke="#1D4ED8" strokeWidth="1.6" />
          <path d="M8 10V22C8 24 11.5 25.5 16 25.5C20.5 25.5 24 24 24 22V10" stroke="#1D4ED8" strokeWidth="1.8" />
          <path d="M8 16C8 18 11.5 19.5 16 19.5C20.5 19.5 24 18 24 16" stroke="#60A5FA" strokeWidth="1.6" />
        </svg>
      );
    }
    if (s.includes('s3') || s.includes('storage') || s.includes('bucket')) {
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
          <rect width="32" height="32" rx="7" fill="#DCFCE7" />
          <path d="M7 11L9 24C9.2 25.5 12 26.5 16 26.5C20 26.5 22.8 25.5 23 24L25 11" stroke="#15803D" strokeWidth="2" strokeLinejoin="round" />
          <ellipse cx="16" cy="11" rx="9" ry="4" fill="#22C55E" stroke="#15803D" strokeWidth="1.6" />
          <path d="M12 17C13 18 15 18.5 16 18.5C17 18.5 19 18 20 17" stroke="#15803D" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    }
  }

  // AZURE SYMBOLS
  if (normProv.includes('AZURE') || s.startsWith('az')) {
    if (s.includes('traffic') || s.includes('dns')) {
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
          <rect width="32" height="32" rx="7" fill="#E0F2FE" />
          <path d="M16 6L25 24H7L16 6Z" stroke="#0284C7" strokeWidth="2" strokeLinejoin="round" />
          <circle cx="16" cy="17" r="2.5" fill="#0284C7" />
          <path d="M16 11V14M12 20L14 18M20 20L18 18" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    }
    if (s.includes('front_door') || s.includes('frontdoor') || s.includes('cdn')) {
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
          <rect width="32" height="32" rx="7" fill="#E0F2FE" />
          <circle cx="16" cy="16" r="9" stroke="#0284C7" strokeWidth="1.8" />
          <rect x="12" y="11" width="8" height="11" rx="1.5" fill="#0284C7" />
          <circle cx="14" cy="17" r="1" fill="#FFFFFF" />
        </svg>
      );
    }
    if (s.includes('app_gw') || s.includes('gateway') || s.includes('lb')) {
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
          <rect width="32" height="32" rx="7" fill="#E0F2FE" />
          <path d="M7 16H25M16 7V25" stroke="#0284C7" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="7" cy="16" r="2.5" fill="#0369A1" />
          <circle cx="25" cy="16" r="2.5" fill="#0369A1" />
          <circle cx="16" cy="7" r="2.5" fill="#0369A1" />
          <circle cx="16" cy="25" r="2.5" fill="#0369A1" />
          <rect x="13" y="13" width="6" height="6" rx="1" fill="#38BDF8" />
        </svg>
      );
    }
    if (s.includes('aks') || s.includes('kubernetes') || s.includes('k8s')) {
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
          <rect width="32" height="32" rx="7" fill="#E0F2FE" />
          <circle cx="16" cy="16" r="8.5" stroke="#0284C7" strokeWidth="2" />
          <polygon points="16,8 23,12 23,20 16,24 9,20 9,12" stroke="#0369A1" strokeWidth="1.6" fill="#38BDF8" />
          <circle cx="16" cy="16" r="3" fill="#FFFFFF" />
        </svg>
      );
    }
    if (s.includes('vm') || s.includes('vmss') || s.includes('virtual_machine')) {
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
          <rect width="32" height="32" rx="7" fill="#FEF3C7" />
          <rect x="8" y="9" width="16" height="14" rx="2.5" stroke="#D97706" strokeWidth="2" fill="#FDE68A" />
          <path d="M12 23H20M16 23V26M10 26H22" stroke="#D97706" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="12" cy="14" r="1.5" fill="#D97706" />
          <circle cx="16" cy="14" r="1.5" fill="#D97706" />
        </svg>
      );
    }
    if (s.includes('sql') || s.includes('database') || s.includes('db')) {
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
          <rect width="32" height="32" rx="7" fill="#DBEAFE" />
          <ellipse cx="16" cy="9" rx="8" ry="3.5" fill="#2563EB" stroke="#1E40AF" strokeWidth="1.6" />
          <path d="M8 9V22C8 24 11.5 25.5 16 25.5C20.5 25.5 24 24 24 22V9" stroke="#1E40AF" strokeWidth="1.8" />
          <path d="M8 15C8 17 11.5 18.5 16 18.5C20.5 18.5 24 17 24 15" stroke="#60A5FA" strokeWidth="1.6" />
          <rect x="13" y="19" width="6" height="4" rx="1" fill="#FFFFFF" />
        </svg>
      );
    }
    if (s.includes('blob') || s.includes('storage')) {
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
          <rect width="32" height="32" rx="7" fill="#DCFCE7" />
          <rect x="8" y="8" width="16" height="16" rx="3" stroke="#15803D" strokeWidth="2" fill="#86EFAC" />
          <path d="M12 12H20M12 16H20M12 20H17" stroke="#15803D" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    }
  }

  // GCP SYMBOLS
  if (normProv.includes('GCP') || s.startsWith('gcp') || normProv.includes('GOOGLE')) {
    if (s.includes('dns')) {
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
          <rect width="32" height="32" rx="7" fill="#E8F0FE" />
          <circle cx="16" cy="16" r="8" stroke="#1A73E8" strokeWidth="2" />
          <circle cx="16" cy="16" r="3" fill="#EA4335" />
          <path d="M16 8V13M16 19V24M8 16H13M19 16H24" stroke="#34A853" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    }
    if (s.includes('cdn')) {
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
          <rect width="32" height="32" rx="7" fill="#E8F0FE" />
          <path d="M8 16A8 8 0 0 1 24 16" stroke="#1A73E8" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M11 19A5 5 0 0 1 21 19" stroke="#FBBC04" strokeWidth="2" strokeLinecap="round" />
          <circle cx="16" cy="21" r="2.5" fill="#EA4335" />
        </svg>
      );
    }
    if (s.includes('lb') || s.includes('load_balancing')) {
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
          <rect width="32" height="32" rx="7" fill="#E8F0FE" />
          <rect x="13" y="6" width="6" height="6" rx="1.5" fill="#1A73E8" />
          <path d="M16 12V18M16 18H9V24M16 18H23V24" stroke="#1A73E8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="9" cy="25" r="2.5" fill="#34A853" />
          <circle cx="23" cy="25" r="2.5" fill="#EA4335" />
        </svg>
      );
    }
    if (s.includes('gke') || s.includes('kubernetes')) {
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
          <rect width="32" height="32" rx="7" fill="#E8F0FE" />
          <polygon points="16,6 25,11 25,21 16,26 7,21 7,11" stroke="#1A73E8" strokeWidth="2" fill="#D2E3FC" />
          <circle cx="16" cy="16" r="3.5" fill="#1A73E8" />
          <circle cx="16" cy="9" r="1.5" fill="#EA4335" />
          <circle cx="22" cy="13" r="1.5" fill="#FBBC04" />
          <circle cx="22" cy="19" r="1.5" fill="#34A853" />
        </svg>
      );
    }
    if (s.includes('compute') || s.includes('gce') || s.includes('vm')) {
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
          <rect width="32" height="32" rx="7" fill="#FEF3C7" />
          <rect x="9" y="9" width="14" height="14" rx="3" stroke="#D97706" strokeWidth="2" fill="#FDE68A" />
          <circle cx="16" cy="16" r="3" fill="#D97706" />
          <path d="M16 5V8M16 24V27M5 16H8M24 16H27" stroke="#D97706" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    }
    if (s.includes('sql') || s.includes('database')) {
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
          <rect width="32" height="32" rx="7" fill="#DBEAFE" />
          <ellipse cx="16" cy="9" rx="8" ry="3.5" fill="#1A73E8" stroke="#174EA6" strokeWidth="1.6" />
          <path d="M8 9V22C8 24 11.5 25.5 16 25.5C20.5 25.5 24 24 24 22V9" stroke="#174EA6" strokeWidth="1.8" />
          <path d="M8 15C8 17 11.5 18.5 16 18.5C20.5 18.5 24 17 24 15" stroke="#4285F4" strokeWidth="1.6" />
        </svg>
      );
    }
    if (s.includes('storage') || s.includes('gcs') || s.includes('bucket')) {
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
          <rect width="32" height="32" rx="7" fill="#DCFCE7" />
          <path d="M7 11L9 24C9.2 25.5 12 26.5 16 26.5C20 26.5 22.8 25.5 23 24L25 11" stroke="#137333" strokeWidth="2" strokeLinejoin="round" />
          <ellipse cx="16" cy="11" rx="9" ry="4" fill="#34A853" stroke="#137333" strokeWidth="1.6" />
        </svg>
      );
    }
  }

  // DEFAULT / USERS / INGRESS
  if (s.includes('users') || s.includes('client') || s.includes('traffic')) {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
        <rect width="32" height="32" rx="16" fill="#F1F5F9" stroke="#94A3B8" strokeWidth="1.5" />
        <circle cx="16" cy="13" r="4.5" fill="#64748B" />
        <path d="M9 25C9 20.5 12 19 16 19C20 19 23 20.5 23 25" fill="#64748B" />
      </svg>
    );
  }

  // Fallback network icon
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <rect width="32" height="32" rx="7" fill="#F1F5F9" />
      <circle cx="16" cy="16" r="6" stroke="#64748B" strokeWidth="2" />
      <path d="M16 6V10M16 22V26M6 16H10M22 16H26" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
};
