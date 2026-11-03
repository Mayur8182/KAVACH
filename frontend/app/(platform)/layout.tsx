import React from 'react';
import type { Metadata } from 'next';
import { PlatformShellWrapper } from './PlatformShellWrapper';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PlatformShellWrapper>{children}</PlatformShellWrapper>;
}
