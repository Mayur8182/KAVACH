'use client';

import React, { useState } from 'react';
import {
  Settings,
  Save,
  CheckCircle2,
  Sliders,
  Shield,
  Clock,
  Cpu,
  Zap,
} from 'lucide-react';
import { KavachApiLayout } from '../components/KavachApiLayout';
import { useApiSecurity } from '../context/ApiSecurityContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';

export default function ApiSecuritySettingsPage() {
  const { selectedApi } = useApiSecurity();

  const [workerConcurrency, setWorkerConcurrency] = useState('4');
  const [requestTimeout, setRequestTimeout] = useState('15');
  const [maxRps, setMaxRps] = useState('50');
  const [autoVerification, setAutoVerification] = useState(true);
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  return (
    <KavachApiLayout activeApiId={selectedApi?.id}>
      <div className="w-full space-y-6">
        <PageHeader
          title="API Security Configuration"
          subtitle="Configure isolated scan workers, concurrency limits, and execution safeguards."
          breadcrumbs={[
            { label: 'API Security', href: '/api-security' },
            { label: 'Settings' },
          ]}
          actions={
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
            >
              {isSaved ? <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
              <span>{isSaved ? 'Settings Saved' : 'Save Changes'}</span>
            </Button>
          }
        />

        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-6 shadow-xs max-w-3xl space-y-6">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
              Worker Concurrency
            </label>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Maximum parallel security worker tasks dispatched simultaneously during active fuzzing.
            </p>
            <input
              type="number"
              value={workerConcurrency}
              onChange={(e) => setWorkerConcurrency(e.target.value)}
              className="w-48 px-3 py-2 text-xs bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
              Request Timeout (seconds)
            </label>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Hard deadline for individual HTTP, GraphQL, and RPC security probes before aborting.
            </p>
            <input
              type="number"
              value={requestTimeout}
              onChange={(e) => setRequestTimeout(e.target.value)}
              className="w-48 px-3 py-2 text-xs bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
              Maximum Request Rate (Requests/Sec)
            </label>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Throttles test probes to prevent accidental denial-of-service on staging or production targets.
            </p>
            <input
              type="number"
              value={maxRps}
              onChange={(e) => setMaxRps(e.target.value)}
              className="w-48 px-3 py-2 text-xs bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-zinc-800">
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                Automated Verification on PR Merge
              </span>
              <span className="text-xs text-slate-500 dark:text-zinc-400">
                Automatically triggers a targeted security test when pull requests addressing findings are merged.
              </span>
            </div>

            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={autoVerification}
                onChange={(e) => setAutoVerification(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>
    </KavachApiLayout>
  );
}
