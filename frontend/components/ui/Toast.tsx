'use client';

import React, { createContext, useContext, useCallback } from 'react';
import { toast, type ToastCustomOptions } from '@/lib/toast';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  onUndo?: () => void;
  undoLabel?: string;
  durationMs?: number;
}

export interface ToastContextValue {
  showToast: (options: Omit<ToastMessage, 'id'>) => string;
  dismissToast: (id: string) => void;
  toast: typeof toast;
}

const ToastContext = createContext<ToastContextValue>({
  showToast: () => '',
  dismissToast: () => {},
  toast,
});

/**
 * Enterprise Toast Context Provider (Unified with goey-toast)
 * Maintains backwards compatibility for legacy components using useToast().
 */
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dismissToast = useCallback((id: string) => {
    toast.dismiss(id);
  }, []);

  const showToast = useCallback(
    ({ type = 'info', title, description, durationMs, onUndo, undoLabel }: Omit<ToastMessage, 'id'>): string => {
      const opts: ToastCustomOptions = {
        description,
        duration: durationMs,
      };

      if (onUndo) {
        opts.action = {
          label: undoLabel || 'Undo action',
          onClick: onUndo,
        };
      }

      const method = toast[type] || toast.info;
      const res = method(title, opts);
      return String(res);
    },
    []
  );

  return (
    <ToastContext.Provider value={{ showToast, dismissToast, toast }}>
      {children}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  return useContext(ToastContext);
};

export { toast };
export default toast;
