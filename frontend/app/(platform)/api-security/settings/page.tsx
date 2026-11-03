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
} from 'lucide-react';
import { KavachApiLayout } from '../components/KavachApiLayout';
import { useApiSecurity } from '../context/ApiSecurityContext';

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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
              API Security Settings
            </h1>
            <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
              Configure isolated scan workers, concurrency limits, and execution safeguards.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSave}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: isSaved ? '#10B981' : '#2563EB',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 18px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {isSaved ? <CheckCircle2 size={15} /> : <Save size={15} />}
            <span>{isSaved ? 'Settings Saved' : 'Save Changes'}</span>
          </button>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '10px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
              Worker Concurrency
            </label>
            <span style={{ fontSize: '12px', color: '#64748B' }}>
              Maximum parallel security worker tasks dispatched simultaneously.
            </span>
            <input
              type="number"
              value={workerConcurrency}
              onChange={(e) => setWorkerConcurrency(e.target.value)}
              style={{
                width: '180px',
                padding: '8px 12px',
                fontSize: '13px',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
              Request Timeout (seconds)
            </label>
            <span style={{ fontSize: '12px', color: '#64748B' }}>
              Hard deadline for individual HTTP/GraphQL security probes.
            </span>
            <input
              type="number"
              value={requestTimeout}
              onChange={(e) => setRequestTimeout(e.target.value)}
              style={{
                width: '180px',
                padding: '8px 12px',
                fontSize: '13px',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
              Maximum Request Rate (Requests/Sec)
            </label>
            <span style={{ fontSize: '12px', color: '#64748B' }}>
              Throttles test probes to prevent accidental denial-of-service on production targets.
            </span>
            <input
              type="number"
              value={maxRps}
              onChange={(e) => setMaxRps(e.target.value)}
              style={{
                width: '180px',
                padding: '8px 12px',
                fontSize: '13px',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
              }}
            />
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: '16px',
              borderTop: '1px solid #F1F5F9',
            }}
          >
            <div>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', display: 'block' }}>
                Automated Verification on PR Merge
              </span>
              <span style={{ fontSize: '12px', color: '#64748B' }}>
                Automatically triggers a targeted security test when pull requests addressing findings are merged.
              </span>
            </div>

            <input
              type="checkbox"
              checked={autoVerification}
              onChange={(e) => setAutoVerification(e.target.checked)}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
          </div>
        </div>
      </div>
    </KavachApiLayout>
  );
}
