'use client';

import React from 'react';
import { GooeyToaster } from 'goey-toast';

/**
 * Global Toast Provider for Kavach Platform
 * Mounts the goey-toast viewport once at the root of the application.
 */
export function ToastProvider({ children }: { children?: React.ReactNode }) {
  return (
    <>
      {children}
      <GooeyToaster
        position="top-right"
        theme="light"
        duration={4000}
        preset="subtle"
        bounce={0.08}
        closeButton="top-right"
        closeOnEscape={true}
        swipeToDismiss={true}
        showProgress={false}
        showTimestamp={false}
        maxQueue={5}
        queueOverflow="drop-oldest"
      />
    </>
  );
}

export default ToastProvider;
