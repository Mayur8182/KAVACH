'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ContainerSecurityLayout } from './ContainerSecurityLayout';
import { useScope } from '@/context/ScopeContext';
import { api } from '@/lib/api/client';
import {
  FileText,
  Download,
  RefreshCw,
  Plus,
  CheckCircle2,
  Calendar,
  FileCheck2,
  Archive,
} from 'lucide-react';
import { toast } from '@/lib/toast';

const TABS = [
  { id: 'security', label: 'Security Reports' },
  { id: 'vulnerability', label: 'Vulnerability Reports' },
  { id: 'sbom', label: 'SBOM Exports' },
  { id: 'compliance', label: 'Image Compliance Reports' },
  { id: 'evidence', label: 'Scan Evidence' },
  { id: 'audit', label: 'Audit History' },
];

export const ContainerReportsView: React.FC = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { currentProject } = useScope();

  const tabParam = searchParams.get('tab') || 'security';
  const [activeTab, setActiveTab] = useState<string>(tabParam);
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<any[]>([]);

  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    router.push(`/container-security/reports?tab=${tabId}`);
  };

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.containers.reports(currentProject?.id || null);
      setReports(res?.reports || []);
    } catch {
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  return (
    <ContainerSecurityLayout
      sectionTitle="Evidence & Reports"
      sectionDescription="Cryptographically signed audit artifacts: SPDX/CycloneDX SBOM dumps, CVE posture reports, CIS Benchmark compliance audits, and immutable event evidence."
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={handleTabChange}
      headerActions={
        <button
          onClick={() => toast.success('New container security report queued')}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Generate Report
        </button>
      }
    >
      <div className="space-y-6">
        <div className="bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-500" />
              <h3 className="font-semibold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                Generated Reports & Evidence Bundles
              </h3>
            </div>
            <button
              onClick={fetchReports}
              disabled={loading}
              className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Report Title</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Format</th>
                  <th className="py-3 px-4">Scanned Images</th>
                  <th className="py-3 px-4">Generated At</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {reports.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                      {r.title}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{r.type}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">{r.format}</td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                      {r.scanned_images}
                    </td>
                    <td className="py-3 px-4 text-slate-500">{new Date(r.created_at).toLocaleDateString()}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => toast.success(`Downloading ${r.title}`)}
                        className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded border border-slate-200 dark:border-slate-700 flex items-center gap-1 ml-auto"
                      >
                        <Download className="w-3 h-3" />
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ContainerSecurityLayout>
  );
};

export default ContainerReportsView;
