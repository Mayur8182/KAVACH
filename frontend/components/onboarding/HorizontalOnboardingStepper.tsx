'use client';

import React from 'react';
import { Check, Building2, Layers, ShieldCheck, Rocket } from 'lucide-react';

export interface HorizontalStepperProps {
  currentStep: number;
  totalSteps?: number;
  onStepClick?: (step: number) => void;
  className?: string;
}

export interface StepItem {
  number: number;
  label: string;
  sublabel: string;
  icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
}

const ONBOARDING_STEPS: StepItem[] = [
  { number: 1, label: 'Organization', sublabel: 'Tenant & workspace', icon: Building2 },
  { number: 2, label: 'Environment', sublabel: 'Cloud & tech stack', icon: Layers },
  { number: 3, label: 'Security Products', sublabel: 'AppSec, Cloud & DAST', icon: ShieldCheck },
  { number: 4, label: 'Launch Console', sublabel: 'Ready for scans', icon: Rocket },
];

export const HorizontalOnboardingStepper: React.FC<HorizontalStepperProps> = ({
  currentStep,
  totalSteps = 4,
  onStepClick,
  className = '',
}) => {
  const steps = ONBOARDING_STEPS.slice(0, totalSteps);
  const progressPercent = Math.min(100, Math.round(((currentStep - 1) / (totalSteps - 1 || 1)) * 100));

  return (
    <div
      className={`w-full max-w-3xl mx-auto mb-8 px-2 ${className}`}
      style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
    >
      {/* Top Meta Header: Step Count and Progress Percentage */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200">
            Step {currentStep} of {totalSteps}
          </span>
          <span className="text-xs text-slate-500 font-medium hidden sm:inline">
            {steps[currentStep - 1]?.label || 'Workspace Setup'}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-slate-700">
            {progressPercent}% Complete
          </span>
        </div>
      </div>

      {/* Thin Horizontal Linear Segmented Progress Bar */}
      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mb-6 flex gap-1">
        {steps.map((st) => {
          const isCompleted = st.number < currentStep;
          const isCurrent = st.number === currentStep;
          return (
            <div
              key={st.number}
              className="flex-1 h-full transition-all duration-500 rounded-full"
              style={{
                backgroundColor: isCompleted
                  ? '#10B981' // Emerald
                  : isCurrent
                  ? '#4F46E5' // Indigo
                  : '#E2E8F0', // Slate-200
              }}
            />
          );
        })}
      </div>

      {/* Step Indicators with Icons */}
      <div className="grid grid-cols-4 gap-2">
        {steps.map((st) => {
          const isCompleted = st.number < currentStep;
          const isCurrent = st.number === currentStep;
          const Icon = st.icon;

          return (
            <div
              key={st.number}
              onClick={() => onStepClick && st.number < currentStep && onStepClick(st.number)}
              className={`flex items-center gap-2.5 p-2 rounded-xl transition-all ${
                st.number < currentStep ? 'cursor-pointer hover:bg-slate-100/80' : ''
              } ${isCurrent ? 'bg-indigo-50/70 border border-indigo-200 shadow-xs' : ''}`}
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold transition-all"
                style={{
                  backgroundColor: isCompleted
                    ? '#ECFDF5'
                    : isCurrent
                    ? '#EEF2FF'
                    : '#F8FAFC',
                  color: isCompleted
                    ? '#059669'
                    : isCurrent
                    ? '#4F46E5'
                    : '#94A3B8',
                  border: isCompleted
                    ? '1px solid #A7F3D0'
                    : isCurrent
                    ? '1px solid #C7D2FE'
                    : '1px solid #E2E8F0',
                }}
              >
                {isCompleted ? <Check size={14} strokeWidth={2.8} /> : <Icon size={14} />}
              </div>

              <div className="min-w-0 hidden md:block">
                <div
                  className="text-xs font-bold truncate leading-tight"
                  style={{ color: isCurrent ? '#0F172A' : isCompleted ? '#334155' : '#94A3B8' }}
                >
                  {st.label}
                </div>
                <div className="text-[10.5px] text-slate-400 truncate leading-tight">
                  {st.sublabel}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
