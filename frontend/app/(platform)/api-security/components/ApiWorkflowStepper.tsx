'use client';

/**
 * ApiWorkflowStepper — DEPRECATED & REMOVED
 * Old legacy linear stepper banner has been eliminated from the UI.
 * Returns null to prevent rendering anywhere.
 */
export interface ApiWorkflowStepperProps {
  currentStep?: number;
  summaryText?: string;
  nextStepHref?: string;
  nextStepLabel?: string;
}

export function ApiWorkflowStepper(_props: ApiWorkflowStepperProps) {
  return null;
}
