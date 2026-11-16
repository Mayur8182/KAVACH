'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Mail } from 'lucide-react';
import { SecuLayerHeader } from '@/components/navigation/SecuLayerHeader';
import { EnterpriseFooter } from '@/components/ui/EnterpriseFooter';

export default function CareersPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#FFFFFF',
        color: '#0F172A',
        fontFamily: "var(--font-sans, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif)",
      }}
    >
      <SecuLayerHeader />

      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '80px 24px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            maxWidth: '540px',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '24px',
          }}
        >
          {/* Kavach Official Emblem */}
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '20px',
              backgroundColor: '#FAFAFA',
              border: '1px solid #E4E4E7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.04)',
            }}
          >
            <Image
              src="/kavach-cube.png"
              alt="Kavach"
              width={44}
              height={44}
              priority
              style={{ objectFit: 'contain' }}
            />
          </div>

          {/* Status Badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              backgroundColor: '#F4F4F5',
              borderRadius: '9999px',
              border: '1px solid #E4E4E7',
              fontSize: '12px',
              fontWeight: 600,
              color: '#52525B',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: '#71717A',
              }}
            />
            <span>Positions Filled</span>
          </div>

          {/* Heading */}
          <div>
            <h1
              style={{
                fontSize: '32px',
                fontWeight: 700,
                letterSpacing: '-0.02em',
                color: '#09090B',
                margin: '0 0 10px 0',
              }}
            >
              No Hiring Currently
            </h1>
            <p
              style={{
                fontSize: '15px',
                color: '#71717A',
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              We are not actively hiring for any open roles at this moment.
              Our engineering team is focused on core platform execution.
            </p>
          </div>

          {/* Contact note */}
          <div
            style={{
              padding: '16px 20px',
              backgroundColor: '#FAFAFA',
              border: '1px solid #E4E4E7',
              borderRadius: '12px',
              fontSize: '13.5px',
              color: '#52525B',
              lineHeight: 1.5,
              width: '100%',
            }}
          >
            For prospective inquiries, general questions, or responsible disclosures, contact our team directly at{' '}
            <a
              href="mailto:support@kavachsecurity.me"
              style={{
                color: '#09090B',
                fontWeight: 600,
                textDecoration: 'underline',
              }}
            >
              support@kavachsecurity.me
            </a>
            .
          </div>

          {/* Navigation Links */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginTop: '8px',
            }}
          >
            <Link
              href="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                borderRadius: '10px',
                backgroundColor: '#09090B',
                color: '#FFFFFF',
                fontSize: '14px',
                fontWeight: 600,
                textDecoration: 'none',
                transition: 'background-color 0.15s ease',
              }}
            >
              <ArrowLeft size={16} />
              <span>Back to Home</span>
            </Link>

            <Link
              href="/contact"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                borderRadius: '10px',
                backgroundColor: '#FFFFFF',
                color: '#09090B',
                border: '1px solid #E4E4E7',
                fontSize: '14px',
                fontWeight: 600,
                textDecoration: 'none',
                transition: 'background-color 0.15s ease',
              }}
            >
              <Mail size={16} />
              <span>Contact Team</span>
            </Link>
          </div>
        </div>
      </main>

      <EnterpriseFooter />
    </div>
  );
}
