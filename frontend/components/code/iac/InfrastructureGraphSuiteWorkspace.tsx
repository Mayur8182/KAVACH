'use client';

/**
 * THING Code — Infrastructure as Code (IaC) Infrastructure Graph Suite
 * Section 12: Screens 12.1 through 12.8
 * 
 * 100% Sourced from Real Backend APIs: /api/v1/iac/graph-suite/*
 * 
 * Screens:
 *   12.1 Infrastructure Graph Overview (4 KPIs, Logical Canvas: Users -> Route 53 -> CloudFront -> ALB -> EKS, EC2, RDS, S3)
 *   12.2 Resource Graph (Topology Tree: VPC prod-vpc, Subnets, Gateways, EKS, RDS, S3, Zoom/Pan controls)
 *   12.3 Resource Detail (EKS Cluster deep-dive, High Risk badge, Basic Info, Risk Summary breakdown, Config Status checklist)
 *   12.4 Risk View (Severity-weighted canvas: Route 53, ALB, EKS, RDS, EC2, S3 with finding counts and legend)
 *   12.5 Relationships (Upstream/Downstream matrix, Search, Filter by type, 10 baseline relationships, pagination)
 *   12.6 Blast Radius (Impact analysis for EKS Cluster, 12 affected resources, direct & indirect dependents tree)
 *   12.7 Change History (Timeline table, date range, resource filter, 9 change events with authors and details)
 *   12.8 Graph Settings (Visualization toggles, Analysis depth slider, Export format PNG/SVG, Save Changes)
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Layers,
  Network,
  Shield,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Info,
  Search,
  Filter,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
  Save,
  CheckCircle2,
  XCircle,
  Clock,
  Server,
  Database,
  Cloud,
  FileCode,
  GitBranch,
  Tag,
  ArrowRight,
  User,
  Sliders,
  Check,
  X,
  Play,
  Share2,
  HardDrive,
  Cpu,
  Globe,
  Radio,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { CloudServiceSymbol, type CloudProviderType } from './CloudServiceSymbols';
import type {
  GraphOverviewResponse,
  ResourceGraphResponse,
  ResourceTreeNode,
  ResourceDetailResponse,
  RiskViewResponse,
  RelationshipsPageResponse,
  BlastRadiusResponse,
  ChangeHistoryPageResponse,
  GraphSettingsDTO,
  ExportGraphRequest,
} from '@/types/api/iac';

export type GraphSuiteTab =
  | 'overview'
  | 'resource-graph'
  | 'resource-detail'
  | 'risk-view'
  | 'relationships'
  | 'blast-radius'
  | 'change-history'
  | 'settings';

interface InfrastructureGraphSuiteWorkspaceProps {
  initialTab?: GraphSuiteTab;
  initialResourceId?: string;
}

export const InfrastructureGraphSuiteWorkspace: React.FC<InfrastructureGraphSuiteWorkspaceProps> = ({
  initialTab = 'overview',
  initialResourceId = 'eks-prod-cluster',
}) => {
  // Navigation & Tab State
  const [activeTab, setActiveTab] = useState<GraphSuiteTab>(initialTab);
  const [resourceId, setResourceId] = useState<string>(initialResourceId);

  // Common Filters & Cloud Provider
  const [repository, setRepository] = useState<string>('frontend-app');
  const [environment, setEnvironment] = useState<string>('production');
  const [cloudProvider, setCloudProvider] = useState<CloudProviderType>('AWS');

  // Loading & Toast State
  const [loading, setLoading] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // ── 12.1 Overview State ──
  const [overviewData, setOverviewData] = useState<GraphOverviewResponse | null>(null);
  const [logicalViewMode, setLogicalViewMode] = useState<string>('Logical');

  // ── 12.2 Resource Graph State ──
  const [resourceGraphData, setResourceGraphData] = useState<ResourceGraphResponse | null>(null);
  const [resourceGraphType, setResourceGraphType] = useState<string>('All Resource Types');
  const [resourceGraphSearch, setResourceGraphSearch] = useState<string>('');
  const [resourceGraphZoom, setResourceGraphZoom] = useState<number>(1);
  const [graphModeView, setGraphModeView] = useState<'graph' | 'table'>('graph');

  // ── 12.3 Resource Detail State ──
  const [resourceDetail, setResourceDetail] = useState<ResourceDetailResponse | null>(null);
  const [detailSubTab, setDetailSubTab] = useState<'overview' | 'config' | 'relationships' | 'findings' | 'compliance' | 'activity'>('overview');

  // ── 12.4 Risk View State ──
  const [riskViewData, setRiskViewData] = useState<RiskViewResponse | null>(null);
  const [riskLevelFilter, setRiskLevelFilter] = useState<string>('All');
  const [riskZoom, setRiskZoom] = useState<number>(1);

  // ── 12.5 Relationships State ──
  const [relationshipsData, setRelationshipsData] = useState<RelationshipsPageResponse | null>(null);
  const [relSearch, setRelSearch] = useState<string>('');
  const [relTypeFilter, setRelTypeFilter] = useState<string>('All Relationship Types');
  const [relPage, setRelPage] = useState<number>(1);
  const [relPageSize, setRelPageSize] = useState<number>(10);

  // ── 12.6 Blast Radius State ──
  const [blastRadiusData, setBlastRadiusData] = useState<BlastRadiusResponse | null>(null);
  const [blastSelectedResource, setBlastSelectedResource] = useState<string>('eks-prod-cluster');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  // ── 12.7 Change History State ──
  const [changeHistoryData, setChangeHistoryData] = useState<ChangeHistoryPageResponse | null>(null);
  const [changeResourceFilter, setChangeResourceFilter] = useState<string>('All Resources');
  const [changePage, setChangePage] = useState<number>(1);
  const [changePageSize, setChangePageSize] = useState<number>(10);

  // ── 12.8 Graph Settings State ──
  const [settingsData, setSettingsData] = useState<GraphSettingsDTO>({
    visualization: {
      default_view: 'Logical View',
      show_resource_labels: true,
      show_relationships: true,
      group_by_environment: false,
      show_risk_indicators: true,
    },
    analysis: {
      include_external_resources: true,
      enable_blast_radius_analysis: true,
      maximum_depth: 3,
      show_deprecated_resources: false,
    },
    export: {
      export_format: 'PNG',
    },
  });
  const [savingSettings, setSavingSettings] = useState<boolean>(false);

  // Toast feedback helper
  // Toast feedback helper
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  }, []);

  // Compute dynamic last 30 days date range
  const currentDateRange = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 30);
    const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
    return `${fmt(start)} - ${fmt(end)}`;
  }, []);

  // ── Data Fetchers ──
  const fetchOverview = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.iac.graphSuite.getOverview({ repository, environment, provider: cloudProvider });
      setOverviewData(res);
    } catch (err: any) {
      showToast(`Error loading overview: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [repository, environment, cloudProvider, showToast]);

  const fetchResourceGraph = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.iac.graphSuite.getResourceGraph({
        repository,
        environment,
        resourceType: resourceGraphType,
        provider: cloudProvider,
      });
      setResourceGraphData(res);
    } catch (err: any) {
      showToast(`Error loading resource graph: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [repository, environment, resourceGraphType, cloudProvider, showToast]);

  const fetchResourceDetail = useCallback(async (id: string) => {
    try {
      setLoading(true);
      const res = await api.iac.graphSuite.getResourceDetail(id, cloudProvider);
      setResourceDetail(res);
    } catch (err: any) {
      showToast(`Error loading resource detail: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [cloudProvider, showToast]);

  const fetchRiskView = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.iac.graphSuite.getRiskView({ repository, environment, provider: cloudProvider });
      setRiskViewData(res);
    } catch (err: any) {
      showToast(`Error loading risk view: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [repository, environment, cloudProvider, showToast]);

  const fetchRelationships = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.iac.graphSuite.getRelationships({
        search: relSearch,
        relationshipType: relTypeFilter,
        page: relPage,
        pageSize: relPageSize,
        provider: cloudProvider,
      });
      setRelationshipsData(res);
    } catch (err: any) {
      showToast(`Error loading relationships: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [relSearch, relTypeFilter, relPage, relPageSize, cloudProvider, showToast]);

  const fetchBlastRadius = useCallback(async (id: string) => {
    try {
      setIsAnalyzing(true);
      const res = await api.iac.graphSuite.getBlastRadius(id, cloudProvider);
      setBlastRadiusData(res);
      showToast('Blast radius analysis completed successfully.');
    } catch (err: any) {
      showToast(`Error running blast radius: ${err.message || 'Unknown error'}`);
    } finally {
      setIsAnalyzing(false);
    }
  }, [cloudProvider, showToast]);

  const fetchChangeHistory = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.iac.graphSuite.getChangeHistory({
        resource: changeResourceFilter,
        page: changePage,
        pageSize: changePageSize,
        provider: cloudProvider,
      });
      setChangeHistoryData(res);
    } catch (err: any) {
      showToast(`Error loading change history: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [changeResourceFilter, changePage, changePageSize, cloudProvider, showToast]);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.iac.graphSuite.getSettings();
      setSettingsData(res);
    } catch (err: any) {
      showToast(`Error loading settings: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // Load active tab data on change or when cloudProvider changes
  useEffect(() => {
    switch (activeTab) {
      case 'overview':
        fetchOverview();
        break;
      case 'resource-graph':
        fetchResourceGraph();
        break;
      case 'resource-detail':
        fetchResourceDetail(resourceId);
        break;
      case 'risk-view':
        fetchRiskView();
        break;
      case 'relationships':
        fetchRelationships();
        break;
      case 'blast-radius':
        fetchBlastRadius(blastSelectedResource);
        break;
      case 'change-history':
        fetchChangeHistory();
        break;
      case 'settings':
        fetchSettings();
        break;
    }
  }, [
    activeTab,
    cloudProvider,
    fetchOverview,
    fetchResourceGraph,
    fetchResourceDetail,
    fetchRiskView,
    fetchRelationships,
    fetchBlastRadius,
    fetchChangeHistory,
    fetchSettings,
    resourceId,
    blastSelectedResource,
  ]);

  // Handlers for Settings
  const handleSaveSettings = async () => {
    try {
      setSavingSettings(true);
      const res = await api.iac.graphSuite.updateSettings(settingsData);
      setSettingsData(res);
      showToast('Infrastructure graph settings updated successfully.');
    } catch (err: any) {
      showToast(`Failed to update settings: ${err.message}`);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleExportGraph = async () => {
    try {
      const res = await api.iac.graphSuite.exportGraph({
        view: settingsData.visualization.default_view,
        format: settingsData.export.export_format,
      });
      showToast(res.message);
    } catch (err: any) {
      showToast(`Export failed: ${err.message}`);
    }
  };

  // Helper styling for category tags and risks
  const getCategoryColor = (cat: string) => {
    switch (cat.toLowerCase()) {
      case 'compute':
        return '#F97316'; // orange
      case 'storage':
        return '#10B981'; // green
      case 'database':
        return '#3B82F6'; // blue
      case 'networking':
        return '#8B5CF6'; // purple
      case 'security':
        return '#EF4444'; // red
      case 'identity':
        return '#EC4899'; // pink
      default:
        return '#64748B'; // slate
    }
  };

  const getRiskBadge = (level: string) => {
    switch (level.toLowerCase()) {
      case 'critical':
        return 'bg-red-500/10 text-red-400 border-red-500/30';
      case 'high':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
      case 'medium':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'low':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      default:
        return 'bg-slate-500/10 text-[#64748B] border-slate-500/30';
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col font-sans selection:bg-blue-600/30">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 bg-white border border-blue-200 text-[#0F172A] px-4 py-2.5 rounded-lg shadow-xl text-xs">
          <Info className="w-4 h-4 text-blue-600 shrink-0" />
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 text-[#64748B] hover:text-slate-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
        {/* Horizontal Sub-view Tabs */}
        <div className="flex items-center gap-1.5 mb-6 border-b border-[#E2E8F0] pb-3 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview', icon: Network },
            { id: 'resource-graph', label: 'Resource Graph', icon: Layers },
            { id: 'resource-detail', label: 'Resource Detail', icon: FileCode },
            { id: 'risk-view', label: 'Risk View', icon: ShieldAlert },
            { id: 'relationships', label: 'Relationships', icon: GitBranch },
            { id: 'blast-radius', label: 'Blast Radius', icon: AlertTriangle },
            { id: 'change-history', label: 'Change History', icon: Clock },
            { id: 'settings', label: 'Settings', icon: Sliders },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Breadcrumb Header + Global Cloud Provider Switcher */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-[#64748B] font-mono">
            <span>THING CODE</span>
            <ChevronRight className="h-3 w-3 text-[#64748B]" />
            <span>IaC Security</span>
            <ChevronRight className="h-3 w-3 text-[#64748B]" />
            <span>Infrastructure Graph</span>
            <ChevronRight className="h-3 w-3 text-[#64748B]" />
            <span className="text-blue-600 capitalize font-semibold">{activeTab.replace('-', ' ')}</span>
          </div>

          {/* Global Cloud Provider Switcher */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 p-1 rounded-xl shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 pl-2 pr-1">Cloud Provider:</span>
            {(['AWS', 'Azure', 'GCP'] as CloudProviderType[]).map((prov) => {
              const isSelected = cloudProvider === prov;
              return (
                <button
                  key={prov}
                  type="button"
                  onClick={() => setCloudProvider(prov)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-slate-900 text-white shadow-sm font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <CloudServiceSymbol
                    provider={prov}
                    symbol={prov === 'AWS' ? 'aws_alb' : prov === 'Azure' ? 'azure_app_gateway' : 'gcp_lb'}
                    size={15}
                  />
                  <span>{prov}</span>
                </button>
              );
            })}
          </div>
        </div>

          {/* ========================================================================= */}
          {/* SCREEN 12.1: Infrastructure Graph Overview */}
          {/* ========================================================================= */}
          {activeTab === 'overview' && (
            <div className="flex flex-col gap-6 max-w-7xl mx-auto">
              {/* Header & Subtitle */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <h1 className="text-xl font-bold text-[#0F172A] tracking-tight">Infrastructure Graph</h1>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                    <CloudServiceSymbol provider={cloudProvider} symbol="cloud" size={14} />
                    <span>{cloudProvider} Infrastructure Active</span>
                  </span>
                </div>
                <p className="text-xs text-[#64748B]">
                  Visualize and explore your cloud infrastructure defined in code.
                </p>
              </div>

              {/* Filters Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-[#E2E8F0] rounded-lg p-3 text-xs">
                <div className="flex items-center gap-3">
                  <select
                    value={repository}
                    onChange={(e) => setRepository(e.target.value)}
                    className="bg-[#F8FAFC] border border-[#CBD5E1]/80 rounded px-3 py-1.5 text-[#334155] focus:outline-none"
                  >
                    <option value="frontend-app">All Repositories</option>
                    <option value="backend-service">backend-service</option>
                    <option value="infrastructure">infrastructure</option>
                  </select>

                  <select
                    value={environment}
                    onChange={(e) => setEnvironment(e.target.value)}
                    className="bg-[#F8FAFC] border border-[#CBD5E1]/80 rounded px-3 py-1.5 text-[#334155] focus:outline-none"
                  >
                    <option value="production">All Environments</option>
                    <option value="staging">Staging</option>
                    <option value="development">Development</option>
                  </select>
                </div>

                <div className="text-[#64748B] text-xs">
                  Latest Scan ({overviewData?.latest_scan_date || 'Recently'})
                </div>
              </div>

              {/* 4 KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Resources */}
                <div className="bg-white border border-[#E2E8F0] rounded-lg p-4 shadow-sm flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-[#0F172A]">
                      {overviewData?.kpis.total_resources ?? 268}
                    </div>
                    <div className="text-xs text-[#64748B]">Total Resources</div>
                  </div>
                </div>

                {/* High Risk */}
                <div className="bg-white border border-[#E2E8F0] rounded-lg p-4 shadow-sm flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-[#0F172A]">
                      {overviewData?.kpis.high_risk ?? 42}
                    </div>
                    <div className="text-xs text-[#64748B]">High Risk</div>
                  </div>
                </div>

                {/* Medium Risk */}
                <div className="bg-white border border-[#E2E8F0] rounded-lg p-4 shadow-sm flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-[#0F172A]">
                      {overviewData?.kpis.medium_risk ?? 86}
                    </div>
                    <div className="text-xs text-[#64748B]">Medium Risk</div>
                  </div>
                </div>

                {/* Low Risk */}
                <div className="bg-white border border-[#E2E8F0] rounded-lg p-4 shadow-sm flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-[#0F172A]">
                      {overviewData?.kpis.low_risk ?? 140}
                    </div>
                    <div className="text-xs text-[#64748B]">Low Risk</div>
                  </div>
                </div>
              </div>

              {/* Infrastructure Overview Canvas Card */}
              <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 shadow-sm flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
                  <h2 className="text-sm font-semibold text-[#0F172A]">Infrastructure Overview</h2>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-[#64748B]">View:</span>
                    <select
                      value={logicalViewMode}
                      onChange={(e) => setLogicalViewMode(e.target.value)}
                      className="bg-white border border-slate-300 rounded px-2.5 py-1 text-slate-800 focus:outline-none"
                    >
                      <option value="Logical">Logical</option>
                      <option value="Physical">Physical</option>
                      <option value="Network">Network</option>
                    </select>
                  </div>
                </div>

                {/* Interactive SVG Logical Canvas */}
                <div className="w-full min-h-[380px] bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] relative overflow-hidden flex items-center justify-center p-4">
                  {overviewData?.nodes && overviewData.nodes.length > 0 ? (
                    <svg className="w-full h-full min-h-[360px]" viewBox="0 0 920 340">
                      <defs>
                        <linearGradient id="edgeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#94A3B8" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="#64748B" stopOpacity="0.7" />
                        </linearGradient>
                      </defs>

                      {/* Dynamic Bezier Spline Curves connecting nodes */}
                      {overviewData.edges.map((edge, idx) => {
                        const sourceNode = overviewData.nodes.find((n) => n.id === edge.source);
                        const targetNode = overviewData.nodes.find((n) => n.id === edge.target);
                        if (!sourceNode || !targetNode) return null;

                        // Calculate connection points
                        const x1 = sourceNode.x * 1.35 + 85;
                        const y1 = sourceNode.y * 1.1 + 25;
                        const x2 = targetNode.x * 1.35 - 15;
                        const y2 = targetNode.y * 1.1 + 25;
                        const dx = Math.abs(x2 - x1) * 0.5;

                        return (
                          <g key={`edge-${idx}`}>
                            <path
                              d={`M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`}
                              stroke="#CBD5E1"
                              strokeWidth="2"
                              strokeDasharray={edge.label ? '4 2' : undefined}
                              fill="none"
                              className="transition-all"
                            />
                            {edge.label && (
                              <text
                                x={(x1 + x2) / 2}
                                y={(y1 + y2) / 2 - 4}
                                fill="#94A3B8"
                                fontSize="9"
                                textAnchor="middle"
                              >
                                {edge.label}
                              </text>
                            )}
                          </g>
                        );
                      })}

                      {/* Dynamic Nodes rendered as clean Sentinel cards */}
                      {overviewData.nodes.map((node) => {
                        const posX = node.x * 1.35 - 35;
                        const posY = node.y * 1.1 - 10;
                        const isIngress = node.id === 'users';

                        return (
                          <foreignObject
                            key={node.id}
                            x={posX}
                            y={posY}
                            width={isIngress ? 100 : 135}
                            height={64}
                            className="overflow-visible"
                          >
                            <div
                              onClick={() => {
                                if (!isIngress) {
                                  setResourceId(node.id);
                                  setActiveTab('resource-detail');
                                }
                              }}
                              className={`w-full h-full bg-white rounded-xl border p-2 flex items-center gap-2 shadow-xs transition-all cursor-pointer group ${
                                node.risk_level === 'Critical'
                                  ? 'border-red-300 ring-1 ring-red-100 hover:border-red-400'
                                  : node.risk_level === 'High'
                                  ? 'border-orange-300 ring-1 ring-orange-100 hover:border-orange-400'
                                  : node.risk_level === 'Medium'
                                  ? 'border-amber-300 ring-1 ring-amber-100 hover:border-amber-400'
                                  : 'border-slate-200 hover:border-blue-400 hover:shadow-sm'
                              }`}
                            >
                              <div className="shrink-0 p-1.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center">
                                <CloudServiceSymbol
                                  provider={node.cloud_provider || cloudProvider}
                                  symbol={node.symbol || node.name}
                                  size={24}
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-[11px] font-bold text-slate-800 truncate leading-tight group-hover:text-blue-600">
                                  {node.name}
                                </div>
                                <div className="text-[9px] text-slate-600 truncate mt-0.5">
                                  {node.subtext || node.category}
                                </div>
                                {!isIngress && (
                                  <div className="mt-1 flex items-center gap-1">
                                    <span
                                      className={`w-1.5 h-1.5 rounded-full ${
                                        node.risk_level === 'Critical'
                                          ? 'bg-red-500'
                                          : node.risk_level === 'High'
                                          ? 'bg-orange-500'
                                          : node.risk_level === 'Medium'
                                          ? 'bg-amber-500'
                                          : 'bg-emerald-500'
                                      }`}
                                    />
                                    <span className="text-[8px] font-semibold text-slate-600">
                                      {node.risk_level}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </foreignObject>
                        );
                      })}
                    </svg>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-500 text-xs">
                      <Network className="w-8 h-8 text-slate-300 mb-2 animate-pulse" />
                      <span>Loading infrastructure topology from backend...</span>
                    </div>
                  )}
                </div>

                {/* Category Legend */}
                <div className="flex items-center justify-center flex-wrap gap-5 text-xs text-[#64748B] pt-2 border-t border-[#E2E8F0]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#F97316]" />
                    <span>Compute</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
                    <span>Storage</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6]" />
                    <span>Database</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#8B5CF6]" />
                    <span>Networking</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" />
                    <span>Security</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#EC4899]" />
                    <span>Identity</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#64748B]" />
                    <span>Other</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SCREEN 12.2: Resource Graph */}
          {/* ========================================================================= */}
          {activeTab === 'resource-graph' && (
            <div className="flex flex-col gap-6 max-w-7xl mx-auto">
              {/* Header */}
              <div className="flex flex-col gap-1">
                <h1 className="text-xl font-bold text-[#0F172A] tracking-tight">Resource Graph</h1>
                <p className="text-xs text-[#64748B]">
                  Explore resource relationships and dependencies.
                </p>
              </div>

              {/* Filter & View Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-[#E2E8F0] rounded-lg p-3 text-xs">
                <div className="flex flex-wrap items-center gap-3">
                  <select
                    value={repository}
                    onChange={(e) => setRepository(e.target.value)}
                    className="bg-[#F8FAFC] border border-[#CBD5E1]/80 rounded px-3 py-1.5 text-[#334155] focus:outline-none"
                  >
                    <option value="frontend-app">All Repositories</option>
                    <option value="infrastructure">infrastructure</option>
                  </select>

                  <select
                    value={resourceGraphType}
                    onChange={(e) => setResourceGraphType(e.target.value)}
                    className="bg-[#F8FAFC] border border-[#CBD5E1]/80 rounded px-3 py-1.5 text-[#334155] focus:outline-none"
                  >
                    <option value="All Resource Types">All Resource Types</option>
                    <option value="aws_vpc">aws_vpc</option>
                    <option value="aws_subnet">aws_subnet</option>
                    <option value="aws_eks_cluster">aws_eks_cluster</option>
                    <option value="aws_rds_cluster">aws_rds_cluster</option>
                    <option value="aws_s3_bucket">aws_s3_bucket</option>
                  </select>

                  <select
                    value={environment}
                    onChange={(e) => setEnvironment(e.target.value)}
                    className="bg-[#F8FAFC] border border-[#CBD5E1]/80 rounded px-3 py-1.5 text-[#334155] focus:outline-none"
                  >
                    <option value="production">All Environments</option>
                    <option value="staging">Staging</option>
                  </select>

                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      value={resourceGraphSearch}
                      onChange={(e) => setResourceGraphSearch(e.target.value)}
                      placeholder="Search resources (e.g., vpc, eks, rds...)"
                      className="pl-8 pr-3 py-1.5 text-xs rounded bg-[#F8FAFC] border border-[#CBD5E1]/80 text-[#334155] placeholder-slate-500 focus:outline-none w-64"
                    />
                  </div>
                </div>

                {/* View switcher: Graph vs Table */}
                <div className="flex items-center bg-[#F8FAFC] border border-[#E2E8F0] rounded p-0.5">
                  <button
                    onClick={() => setGraphModeView('graph')}
                    className={`px-3 py-1 rounded text-xs transition-colors ${
                      graphModeView === 'graph' ? 'bg-blue-600 text-[#0F172A] font-medium' : 'text-[#64748B] hover:text-[#0F172A]'
                    }`}
                  >
                    Graph
                  </button>
                  <button
                    onClick={() => setGraphModeView('table')}
                    className={`px-3 py-1 rounded text-xs transition-colors ${
                      graphModeView === 'table' ? 'bg-blue-600 text-[#0F172A] font-medium' : 'text-[#64748B] hover:text-[#0F172A]'
                    }`}
                  >
                    Table
                  </button>
                </div>
              </div>

              {/* Canvas / Tree Container */}
              <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 shadow-sm relative overflow-hidden min-h-[460px] flex flex-col justify-center items-center">
                {graphModeView === 'graph' ? (
                  <div
                    className="w-full flex justify-center items-center py-6 transition-transform overflow-x-auto"
                    style={{ transform: `scale(${resourceGraphZoom})` }}
                  >
                    {resourceGraphData?.root_nodes && resourceGraphData.root_nodes.length > 0 ? (
                      (() => {
                        const root = resourceGraphData.root_nodes[0];
                        const subnets = root?.children || [];
                        const rootX = 60;
                        const rootY = 180;

                        return (
                          <svg className="w-full max-w-4xl h-96" viewBox="0 0 860 380">
                            {/* Connection lines from Root to Subnets & Subnets to Leaves */}
                            {subnets.map((subnet, sIdx) => {
                              const sY = subnets.length === 2 ? (sIdx === 0 ? 100 : 260) : 55 + sIdx * 85;
                              const sX = 290;
                              const leaves = subnet.children || [];

                              return (
                                <g key={`sub-branch-${subnet.id}`}>
                                  {/* Curve from Root to Subnet */}
                                  <path
                                    d={`M ${rootX + 60} ${rootY + 25} C ${rootX + 160} ${rootY + 25}, ${sX - 30} ${sY + 22}, ${sX} ${sY + 22}`}
                                    stroke="#CBD5E1"
                                    strokeWidth="2"
                                    fill="none"
                                  />

                                  {/* Curves from Subnet to Leaf Resources */}
                                  {leaves.map((leaf, lIdx) => {
                                    const lY = leaves.length === 1 ? sY : sY - 22 + lIdx * 45;
                                    const lX = 540;
                                    return (
                                      <path
                                        key={`leaf-edge-${leaf.id}`}
                                        d={`M ${sX + 140} ${sY + 22} C ${sX + 210} ${sY + 22}, ${lX - 30} ${lY + 20}, ${lX} ${lY + 20}`}
                                        stroke="#CBD5E1"
                                        strokeWidth="1.8"
                                        fill="none"
                                      />
                                    );
                                  })}
                                </g>
                              );
                            })}

                            {/* Root Node (VPC / VNet / VPC Network) */}
                            {root && (
                              <foreignObject x={rootX - 20} y={rootY - 10} width={130} height={70} className="overflow-visible">
                                <div
                                  onClick={() => {
                                    setResourceId(root.id);
                                    setActiveTab('resource-detail');
                                  }}
                                  className="w-full h-full bg-white rounded-xl border border-indigo-200 p-2 flex items-center gap-2 shadow-xs hover:border-indigo-400 hover:shadow-sm cursor-pointer"
                                >
                                  <div className="shrink-0 p-1.5 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                                    <CloudServiceSymbol provider={root.cloud_provider || cloudProvider} symbol={root.symbol || root.type} size={22} />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="text-[11px] font-bold text-slate-800 truncate leading-tight">{root.name.split(' ')[0]}</div>
                                    <div className="text-[9px] text-slate-500 font-mono truncate">{root.id}</div>
                                  </div>
                                </div>
                              </foreignObject>
                            )}

                            {/* Subnet Nodes */}
                            {subnets.map((subnet, sIdx) => {
                              const sY = subnets.length === 2 ? (sIdx === 0 ? 100 : 260) : 55 + sIdx * 85;
                              const sX = 290;
                              const leaves = subnet.children || [];

                              return (
                                <g key={`subnet-group-${subnet.id}`}>
                                  <foreignObject x={sX} y={sY - 2} width={145} height={52} className="overflow-visible">
                                    <div
                                      onClick={() => {
                                        setResourceId(subnet.id);
                                        setActiveTab('resource-detail');
                                      }}
                                      className="w-full h-full bg-white rounded-xl border border-slate-200 p-2 flex items-center gap-2 shadow-xs hover:border-blue-400 hover:shadow-sm cursor-pointer"
                                    >
                                      <div className="shrink-0 p-1 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                                        <CloudServiceSymbol provider={subnet.cloud_provider || cloudProvider} symbol={subnet.symbol || subnet.type} size={18} />
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <div className="text-[10px] font-bold text-slate-800 truncate leading-tight">{subnet.name}</div>
                                        <div className="text-[8px] text-slate-500 font-mono truncate">{subnet.id}</div>
                                      </div>
                                    </div>
                                  </foreignObject>

                                  {/* Leaf Nodes */}
                                  {leaves.map((leaf, lIdx) => {
                                    const lY = leaves.length === 1 ? sY : sY - 22 + lIdx * 45;
                                    const lX = 540;

                                    return (
                                      <foreignObject key={`leaf-${leaf.id}`} x={lX} y={lY - 2} width={160} height={48} className="overflow-visible">
                                        <div
                                          onClick={() => {
                                            setResourceId(leaf.id);
                                            setActiveTab('resource-detail');
                                          }}
                                          className={`w-full h-full bg-white rounded-xl border p-2 flex items-center gap-2 shadow-xs transition-all cursor-pointer ${
                                            leaf.risk_level === 'High' ? 'border-orange-300 ring-1 ring-orange-100 hover:border-orange-400' :
                                            leaf.risk_level === 'Critical' ? 'border-red-300 ring-1 ring-red-100 hover:border-red-400' :
                                            'border-slate-200 hover:border-blue-400'
                                          }`}
                                        >
                                          <div className="shrink-0 p-1 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center">
                                            <CloudServiceSymbol provider={leaf.cloud_provider || cloudProvider} symbol={leaf.symbol || leaf.type} size={18} />
                                          </div>
                                          <div className="min-w-0 flex-1">
                                            <div className="text-[10px] font-bold text-slate-800 truncate leading-tight">{leaf.name}</div>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                              <span className="text-[8px] text-slate-500 font-mono truncate">{leaf.id}</span>
                                              <span className={`px-1 py-0.2 rounded text-[8px] font-bold ${
                                                leaf.risk_level === 'High' ? 'bg-orange-50 text-orange-600' :
                                                leaf.risk_level === 'Critical' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
                                              }`}>
                                                {leaf.risk_level}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      </foreignObject>
                                    );
                                  })}
                                </g>
                              );
                            })}
                          </svg>
                        );
                      })()
                    ) : (
                      <div className="flex flex-col items-center justify-center py-16 text-slate-500 text-xs">
                        <Layers className="w-8 h-8 text-slate-300 mb-2 animate-pulse" />
                        <span>Loading resource graph hierarchy...</span>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Dynamic Table view of resources */
                  <div className="w-full overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-[#F8FAFC] text-[#64748B] border-b border-[#E2E8F0]">
                        <tr>
                          <th className="py-2.5 px-3">Resource Name</th>
                          <th className="py-2.5 px-3">Type</th>
                          <th className="py-2.5 px-3">Category</th>
                          <th className="py-2.5 px-3">Risk Level</th>
                          <th className="py-2.5 px-3">Parent</th>
                          <th className="py-2.5 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E8F0]/60">
                        {(() => {
                          const flattenNodes = (nodes: ResourceTreeNode[]): ResourceTreeNode[] => {
                            const acc: ResourceTreeNode[] = [];
                            const walk = (items: ResourceTreeNode[]) => {
                              for (const item of items) {
                                acc.push(item);
                                if (item.children && item.children.length > 0) walk(item.children);
                              }
                            };
                            walk(nodes);
                            return acc;
                          };
                          const allFlat = flattenNodes(resourceGraphData?.root_nodes || []);
                          const filtered = resourceGraphSearch
                            ? allFlat.filter(r => r.name.toLowerCase().includes(resourceGraphSearch.toLowerCase()) || r.type.toLowerCase().includes(resourceGraphSearch.toLowerCase()))
                            : allFlat;

                          if (filtered.length === 0) {
                            return (
                              <tr>
                                <td colSpan={6} className="py-8 text-center text-slate-500">
                                  No resources found matching filter.
                                </td>
                              </tr>
                            );
                          }

                          return filtered.map((res) => (
                            <tr key={res.id} className="hover:bg-slate-50 transition-colors">
                              <td className="py-2.5 px-3 font-medium text-[#0F172A] flex items-center gap-2">
                                <CloudServiceSymbol provider={res.cloud_provider || cloudProvider} symbol={res.symbol || res.type} size={18} />
                                <span>{res.name}</span>
                              </td>
                              <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">{res.type}</td>
                              <td className="py-2.5 px-3 text-slate-700 font-medium">{res.category}</td>
                              <td className="py-2.5 px-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getRiskBadge(res.risk_level)}`}>
                                  {res.risk_level}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">{res.parent_id || '-'}</td>
                              <td className="py-2.5 px-3 text-right">
                                <button
                                  onClick={() => {
                                    setResourceId(res.id);
                                    setActiveTab('resource-detail');
                                  }}
                                  className="text-blue-600 hover:text-blue-800 font-semibold text-xs"
                                >
                                  Inspect →
                                </button>
                              </td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Floating Canvas Controls */}
                <div className="absolute bottom-4 right-4 flex items-center gap-1.5 bg-[#F8FAFC] border border-[#CBD5E1]/80 rounded-lg p-1 shadow-lg">
                  <button
                    onClick={() => setResourceGraphZoom((prev) => Math.min(prev + 0.1, 1.6))}
                    className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 text-[#334155] hover:text-[#0F172A]"
                    title="Zoom in"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setResourceGraphZoom((prev) => Math.max(prev - 0.1, 0.6))}
                    className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 text-[#334155] hover:text-[#0F172A]"
                    title="Zoom out"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setResourceGraphZoom(1)}
                    className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 text-[#334155] hover:text-[#0F172A]"
                    title="Fit to view"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SCREEN 12.3: Resource Detail */}
          {/* ========================================================================= */}
          {activeTab === 'resource-detail' && (
            <div className="flex flex-col gap-6 max-w-7xl mx-auto">
              {/* Header with Navigation & AWS Action */}
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold text-[#0F172A] tracking-tight">Resource Detail</h1>
                  <p className="text-xs text-[#64748B]">
                    View detailed information about a specific infrastructure resource.
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <button
                    onClick={() => showToast('Navigating to previous resource...')}
                    className="flex items-center gap-1 px-3 py-1.5 rounded bg-slate-100 border border-[#CBD5E1] text-[#334155] hover:bg-slate-100"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Previous</span>
                  </button>
                  <button
                    onClick={() => showToast('Navigating to next resource...')}
                    className="flex items-center gap-1 px-3 py-1.5 rounded bg-slate-100 border border-[#CBD5E1] text-[#334155] hover:bg-slate-100"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Resource Hero Banner */}
              <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center">
                    <CloudServiceSymbol
                      provider={resourceDetail?.cloud_provider || cloudProvider}
                      symbol={resourceDetail?.resource_type}
                      size={28}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-lg font-bold text-[#0F172A]">
                        {resourceDetail?.display_title || resourceDetail?.name || resourceId}
                      </h2>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getRiskBadge(resourceDetail?.risk_level || 'High')}`}>
                        ● {resourceDetail?.risk_level || 'High'} Risk
                      </span>
                    </div>
                    <div className="text-xs text-[#64748B] font-mono mt-0.5">
                      {resourceDetail?.name || resourceId}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => showToast(`Opening resource in ${cloudProvider} Console...`)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 border border-[#CBD5E1] text-xs text-[#334155] transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-[#64748B]" />
                  <span>Open in {cloudProvider}</span>
                </button>
              </div>

              {/* Secondary Navigation Tabs */}
              <div className="flex items-center gap-6 border-b border-[#E2E8F0] text-xs">
                {(['overview', 'configuration', 'relationships', 'findings', 'compliance', 'activity'] as const).map(
                  (tab) => (
                    <button
                      key={tab}
                      onClick={() => setDetailSubTab(tab as any)}
                      className={`pb-2.5 font-medium transition-colors relative capitalize ${
                        detailSubTab === tab
                          ? 'text-blue-600 font-semibold'
                          : 'text-[#64748B] hover:text-[#334155]'
                      }`}
                    >
                      {tab === 'findings' ? `Findings (${resourceDetail?.open_findings_count ?? 8})` : tab}
                      {detailSubTab === tab && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded" />
                      )}
                    </button>
                  )
                )}
              </div>

              {/* 3 Detail Columns (Basic Info, Risk Summary, Configuration Status) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 1. Basic Information */}
                <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 shadow-sm flex flex-col gap-3">
                  <h3 className="text-sm font-semibold text-[#0F172A] border-b border-[#E2E8F0] pb-2">
                    Basic Information
                  </h3>
                  <div className="flex flex-col gap-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[#64748B]">Resource Type</span>
                      <span className="text-[#334155] font-medium">{resourceDetail?.resource_type || `${cloudProvider} Resource`}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#64748B]">Name</span>
                      <span className="text-[#334155] font-medium">{resourceDetail?.name || resourceId}</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[#64748B]">ID</span>
                      <span className="text-[#334155] font-mono text-[11px] truncate" title={resourceDetail?.arn || resourceDetail?.resource_id || resourceId}>
                        {resourceDetail?.arn || resourceDetail?.resource_id || resourceId}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#64748B]">Region</span>
                      <span className="text-[#334155]">{resourceDetail?.region || 'ap-south-1 (Mumbai)'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#64748B]">Environment</span>
                      <span className="text-[#334155]">{resourceDetail?.environment || environment}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#64748B]">Repository</span>
                      <span className="text-[#334155]">{resourceDetail?.repository || repository}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#64748B]">File Path</span>
                      <span className="text-blue-600 font-mono text-[11px]">{resourceDetail?.file_path || 'infra/main.tf'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#64748B]">Created</span>
                      <span className="text-[#334155]">{resourceDetail?.created_at || 'Recently'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#64748B]">Last Updated</span>
                      <span className="text-[#334155]">{resourceDetail?.last_updated || 'Recently'}</span>
                    </div>
                    <div className="flex flex-col gap-1.5 pt-2 border-t border-[#E2E8F0]">
                      <span className="text-[#64748B]">Tags</span>
                      <div className="flex flex-wrap gap-1.5">
                        {resourceDetail?.tags && resourceDetail.tags.length > 0 ? (
                          resourceDetail.tags.map((tag) => (
                            <span key={`${tag.key}-${tag.value}`} className="px-2 py-0.5 rounded bg-slate-100 text-[10px] text-[#334155] border border-[#CBD5E1]">
                              {tag.key}: {tag.value}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 text-[11px]">No tags configured</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Risk Summary */}
                <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 shadow-sm flex flex-col gap-3">
                  <h3 className="text-sm font-semibold text-[#0F172A] border-b border-[#E2E8F0] pb-2">
                    Risk Summary
                  </h3>
                  <div className="flex flex-col gap-3.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[#64748B]">Risk Level</span>
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/30">
                        High
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#64748B]">Open Findings</span>
                      <span className="text-[#0F172A] font-bold text-sm">8</span>
                    </div>

                    <div className="flex flex-col gap-2 pt-2 border-t border-[#E2E8F0]">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                          <span className="text-[#334155]">Critical</span>
                        </div>
                        <span className="font-semibold text-[#0F172A]">2</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                          <span className="text-[#334155]">High</span>
                        </div>
                        <span className="font-semibold text-[#0F172A]">4</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                          <span className="text-[#334155]">Medium</span>
                        </div>
                        <span className="font-semibold text-[#0F172A]">2</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                          <span className="text-[#334155]">Low</span>
                        </div>
                        <span className="font-semibold text-[#64748B]">0</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Configuration Status */}
                <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 shadow-sm flex flex-col gap-3">
                  <h3 className="text-sm font-semibold text-[#0F172A] border-b border-[#E2E8F0] pb-2">
                    Configuration Status
                  </h3>
                  <div className="flex flex-col gap-3 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span className="text-[#334155]">Encrypted at rest</span>
                      </div>
                      <span className="text-[#334155] font-medium">Yes</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span className="text-[#334155]">Private endpoint</span>
                      </div>
                      <span className="text-[#334155] font-medium">Yes</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span className="text-[#334155]">Public endpoint</span>
                      </div>
                      <span className="text-[#334155] font-medium">No</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span className="text-[#334155]">Version</span>
                      </div>
                      <span className="text-[#334155] font-medium">1.28</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span className="text-[#334155]">Node groups</span>
                      </div>
                      <span className="text-[#334155] font-medium">3</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SCREEN 12.4: Risk View */}
          {/* ========================================================================= */}
          {activeTab === 'risk-view' && (
            <div className="flex flex-col gap-6 max-w-7xl mx-auto">
              {/* Header */}
              <div className="flex flex-col gap-1">
                <h1 className="text-xl font-bold text-[#0F172A] tracking-tight">Infrastructure Risk View</h1>
                <p className="text-xs text-[#64748B]">
                  Visualize risk across your infrastructure resources.
                </p>
              </div>

              {/* Filters */}
              <div className="flex items-center justify-between bg-white border border-[#E2E8F0] rounded-lg p-3 text-xs">
                <div className="flex items-center gap-3">
                  <select
                    value={repository}
                    onChange={(e) => setRepository(e.target.value)}
                    className="bg-[#F8FAFC] border border-[#CBD5E1]/80 rounded px-3 py-1.5 text-[#334155] focus:outline-none"
                  >
                    <option value="frontend-app">All Repositories</option>
                  </select>

                  <select
                    value={environment}
                    onChange={(e) => setEnvironment(e.target.value)}
                    className="bg-[#F8FAFC] border border-[#CBD5E1]/80 rounded px-3 py-1.5 text-[#334155] focus:outline-none"
                  >
                    <option value="production">All Environments</option>
                  </select>

                  <select
                    value={riskLevelFilter}
                    onChange={(e) => setRiskLevelFilter(e.target.value)}
                    className="bg-[#F8FAFC] border border-[#CBD5E1]/80 rounded px-3 py-1.5 text-[#334155] focus:outline-none"
                  >
                    <option value="All">Risk Level: All</option>
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              {/* Interactive Risk Canvas Card */}
              <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 shadow-sm relative overflow-hidden min-h-[420px] flex flex-col justify-between">
                <div
                  className="w-full h-80 flex items-center justify-center transition-transform"
                  style={{ transform: `scale(${riskZoom})` }}
                >
                  <svg className="w-full max-w-2xl h-80" viewBox="0 0 620 300">
                    {/* Connections */}
                    {riskViewData?.edges?.map((edge, idx) => {
                      const source = (riskViewData.nodes || []).find((n) => n.id === edge.source);
                      const target = (riskViewData.nodes || []).find((n) => n.id === edge.target);
                      if (!source || !target) return null;
                      const x1 = source.x * 1.8 + 40;
                      const y1 = source.y * 1.1 + 22;
                      const x2 = target.x * 1.8 + 40;
                      const y2 = target.y * 1.1 + 22;
                      return (
                        <line
                          key={`risk-edge-${idx}`}
                          x1={x1}
                          y1={y1}
                          x2={x2}
                          y2={y2}
                          stroke="#CBD5E1"
                          strokeWidth="2"
                          strokeDasharray="4 2"
                        />
                      );
                    })}

                    {/* Dynamic Risk Nodes */}
                    {(riskViewData?.nodes || [])
                      .filter((n) => {
                        if (riskLevelFilter === 'All') return true;
                        return n.risk_level.toLowerCase() === riskLevelFilter.toLowerCase();
                      })
                      .map((node) => (
                        <foreignObject
                          key={node.id}
                          x={node.x * 1.8 - 25}
                          y={node.y * 1.1 - 6}
                          width={130}
                          height={56}
                          className="overflow-visible"
                        >
                          <div
                            onClick={() => {
                              setResourceId(node.id);
                              setActiveTab('resource-detail');
                            }}
                            className={`w-full h-full bg-white rounded-xl border p-2 flex items-center gap-2 shadow-xs transition-all cursor-pointer group ${
                              node.risk_level === 'Critical'
                                ? 'border-red-400 ring-2 ring-red-100 hover:border-red-500'
                                : node.risk_level === 'High'
                                ? 'border-orange-400 ring-2 ring-orange-100 hover:border-orange-500'
                                : node.risk_level === 'Medium'
                                ? 'border-amber-300 ring-1 ring-amber-100 hover:border-amber-400'
                                : 'border-emerald-300 ring-1 ring-emerald-100 hover:border-emerald-400'
                            }`}
                          >
                            <div className="shrink-0 p-1.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center">
                              <CloudServiceSymbol
                                provider={node.cloud_provider || cloudProvider}
                                symbol={node.symbol || node.name}
                                size={22}
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-[11px] font-bold text-slate-800 truncate leading-tight group-hover:text-blue-600">
                                {node.name}
                              </div>
                              <div className="mt-1 flex items-center gap-1">
                                <span
                                  className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                    node.risk_level === 'Critical'
                                      ? 'bg-red-50 text-red-600 border border-red-200'
                                      : node.risk_level === 'High'
                                      ? 'bg-orange-50 text-orange-600 border border-orange-200'
                                      : node.risk_level === 'Medium'
                                      ? 'bg-amber-50 text-amber-600 border border-amber-200'
                                      : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                                  }`}
                                >
                                  {node.risk_level} ({node.findings_count})
                                </span>
                              </div>
                            </div>
                          </div>
                        </foreignObject>
                      ))}
                  </svg>
                </div>

                {/* Floating zoom controls */}
                <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-[#F8FAFC] border border-[#CBD5E1]/80 rounded-lg p-1 shadow">
                  <button
                    onClick={() => setRiskZoom((prev) => Math.min(prev + 0.1, 1.5))}
                    className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 text-[#334155]"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setRiskZoom((prev) => Math.max(prev - 0.1, 0.7))}
                    className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 text-[#334155]"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Risk Legend */}
                <div className="flex items-center justify-center gap-6 text-xs text-[#64748B] pt-3 border-t border-[#E2E8F0]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                    <span>Critical</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                    <span>High</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span>Medium</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span>Low</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SCREEN 12.5: Relationships */}
          {/* ========================================================================= */}
          {activeTab === 'relationships' && (
            <div className="flex flex-col gap-6 max-w-7xl mx-auto">
              {/* Header */}
              <div className="flex flex-col gap-1">
                <h1 className="text-xl font-bold text-[#0F172A] tracking-tight">Resource Relationships</h1>
                <p className="text-xs text-[#64748B]">
                  View upstream and downstream dependencies.
                </p>
              </div>

              {/* Filters */}
              <div className="flex items-center justify-between gap-3 bg-white border border-[#E2E8F0] rounded-lg p-3 text-xs">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={relSearch}
                    onChange={(e) => setRelSearch(e.target.value)}
                    placeholder="Search resources..."
                    className="pl-8 pr-3 py-1.5 text-xs rounded bg-[#F8FAFC] border border-[#CBD5E1]/80 text-[#334155] placeholder-slate-500 focus:outline-none w-72"
                  />
                </div>

                <select
                  value={relTypeFilter}
                  onChange={(e) => setRelTypeFilter(e.target.value)}
                  className="bg-[#F8FAFC] border border-[#CBD5E1]/80 rounded px-3 py-1.5 text-[#334155] focus:outline-none"
                >
                  <option value="All Relationship Types">All Relationship Types</option>
                  <option value="Routes to">Routes to</option>
                  <option value="Forwards to">Forwards to</option>
                  <option value="Uses">Uses</option>
                  <option value="Stores data in">Stores data in</option>
                  <option value="Connects to">Connects to</option>
                  <option value="Provides egress to">Provides egress to</option>
                  <option value="Assumed by">Assumed by</option>
                  <option value="Allows traffic from">Allows traffic from</option>
                  <option value="Encrypts">Encrypts</option>
                </select>
              </div>

              {/* Relationships Table */}
              <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#F8FAFC]/80 text-[#64748B] border-b border-[#E2E8F0]">
                    <tr>
                      <th className="py-3 px-4 font-medium">Source Resource</th>
                      <th className="py-3 px-4 font-medium">Relationship</th>
                      <th className="py-3 px-4 font-medium">Target Resource</th>
                      <th className="py-3 px-4 font-medium">Risk Impact</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]/60">
                    {relationshipsData?.items && relationshipsData.items.length > 0 ? (
                      relationshipsData.items.map((rel) => (
                        <tr key={rel.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-4 font-medium text-[#0F172A] flex items-center gap-2">
                            <CloudServiceSymbol provider={rel.cloud_provider || cloudProvider} symbol={rel.source_resource} size={16} />
                            <span>{rel.source_resource}</span>
                          </td>
                          <td className="py-2.5 px-4 text-[#64748B] font-medium">
                            <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 font-mono text-[11px]">
                              {rel.relationship}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-[#334155] flex items-center gap-2">
                            <CloudServiceSymbol provider={rel.cloud_provider || cloudProvider} symbol={rel.target_resource} size={16} />
                            <span>{rel.target_resource}</span>
                          </td>
                          <td className="py-2.5 px-4">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${getRiskBadge(rel.risk_impact)}`}>
                              {rel.risk_impact}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-500">
                          No relationships matching filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {/* Pagination */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-[#E2E8F0] bg-[#F8FAFC]/40 text-xs text-[#64748B]">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((pageNum) => (
                      <button
                        key={pageNum}
                        onClick={() => setRelPage(pageNum)}
                        className={`w-7 h-7 flex items-center justify-center rounded ${
                          relPage === pageNum
                            ? 'bg-blue-600 text-[#0F172A] font-medium'
                            : 'hover:bg-slate-100 text-[#64748B]'
                        }`}
                      >
                        {pageNum}
                      </button>
                    ))}
                    <button
                      onClick={() => setRelPage((p) => p + 1)}
                      className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 text-[#64748B]"
                    >
                      &gt;
                    </button>
                  </div>

                  <select
                    value={relPageSize}
                    onChange={(e) => setRelPageSize(Number(e.target.value))}
                    className="bg-[#F8FAFC] border border-[#CBD5E1]/80 rounded px-2.5 py-1 text-[#334155] focus:outline-none"
                  >
                    <option value={10}>10 / page</option>
                    <option value={20}>20 / page</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SCREEN 12.6: Blast Radius */}
          {/* ========================================================================= */}
          {activeTab === 'blast-radius' && (
            <div className="flex flex-col gap-6 max-w-7xl mx-auto">
              {/* Header */}
              <div className="flex flex-col gap-1">
                <h1 className="text-xl font-bold text-[#0F172A] tracking-tight">Blast Radius Analysis</h1>
                <p className="text-xs text-[#64748B]">
                  See the potential impact if a resource is compromised or removed.
                </p>
              </div>

              {/* Action Bar */}
              <div className="flex items-center gap-3 bg-white border border-[#E2E8F0] rounded-lg p-3 text-xs">
                <span className="text-[#64748B] font-medium">Select Resource:</span>
                <select
                  value={blastSelectedResource}
                  onChange={(e) => setBlastSelectedResource(e.target.value)}
                  className="bg-[#F8FAFC] border border-[#CBD5E1]/80 rounded px-3 py-1.5 text-[#334155] focus:outline-none min-w-[240px]"
                >
                  <option value="eks-prod-cluster">EKS Cluster (eks-prod-cluster)</option>
                  <option value="rds-prod-db">RDS (prod-db)</option>
                  <option value="app-alb">ALB (app-alb)</option>
                </select>

                <button
                  onClick={() => fetchBlastRadius(blastSelectedResource)}
                  disabled={isAnalyzing}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-[#0F172A] font-medium text-xs transition-colors disabled:opacity-50"
                >
                  {isAnalyzing ? (
                    <>
                      <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                      <span>Analyzing...</span>
                    </>
                  ) : (
                    <span>Analyze</span>
                  )}
                </button>
              </div>

              {/* Summary of Affected Resources */}
              <div className="flex items-center justify-between bg-white border border-[#E2E8F0] rounded-lg p-4 shadow-sm text-xs">
                <div className="text-sm font-semibold text-[#0F172A]">
                  Affected Resources ({blastRadiusData?.summary.total_affected || 12})
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                    <span className="text-[#334155] font-medium">{blastRadiusData?.summary.critical || 2} Critical</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                    <span className="text-[#334155] font-medium">{blastRadiusData?.summary.high || 6} High</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span className="text-[#334155] font-medium">{blastRadiusData?.summary.medium || 3} Medium</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-[#334155] font-medium">{blastRadiusData?.summary.low || 1} Low</span>
                  </div>
                </div>
              </div>

              {/* Dependency Impact Canvas */}
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 relative overflow-hidden min-h-[380px] flex items-center justify-center">
                {blastRadiusData?.nodes && blastRadiusData.nodes.length > 0 ? (
                  (() => {
                    const rootNode = blastRadiusData.nodes.find((n) => n.level === 0) || blastRadiusData.nodes[0];
                    const level1Nodes = blastRadiusData.nodes.filter((n) => n.level === 1);
                    const level2Nodes = blastRadiusData.nodes.filter((n) => n.level === 2);

                    const rootX = 350;
                    const rootY = 30;

                    return (
                      <svg className="w-full max-w-3xl h-80" viewBox="0 0 700 320">
                        {/* Connecting lines from Root to Level 1 */}
                        {level1Nodes.map((node, idx) => {
                          const nX = level1Nodes.length === 1 ? 350 : 120 + idx * (460 / Math.max(1, level1Nodes.length - 1));
                          const nY = 135;
                          return (
                            <line
                              key={`root-edge-${node.id}`}
                              x1={rootX}
                              y1={rootY + 45}
                              x2={nX + 60}
                              y2={nY}
                              stroke="#EF4444"
                              strokeWidth="2"
                              strokeDasharray="4 2"
                            />
                          );
                        })}

                        {/* Connecting lines from Level 1 to Level 2 */}
                        {level2Nodes.map((node, idx) => {
                          const nX = level2Nodes.length === 1 ? 350 : 180 + idx * (340 / Math.max(1, level2Nodes.length - 1));
                          const nY = 240;
                          return (
                            <line
                              key={`l2-edge-${node.id}`}
                              x1={nX + 60}
                              y1={185}
                              x2={nX + 60}
                              y2={nY}
                              stroke="#F59E0B"
                              strokeWidth="1.5"
                              strokeDasharray="3 3"
                            />
                          );
                        })}

                        {/* Root Node: Compromised Resource */}
                        {rootNode && (
                          <foreignObject x={rootX - 90} y={rootY} width={180} height={56} className="overflow-visible">
                            <div className="w-full h-full bg-white rounded-xl border-2 border-red-500 p-2 flex items-center gap-2 shadow-sm ring-4 ring-red-100">
                              <div className="shrink-0 p-1.5 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center">
                                <CloudServiceSymbol provider={rootNode.cloud_provider || cloudProvider} symbol={rootNode.symbol || rootNode.type} size={22} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-[11px] font-bold text-red-700 truncate leading-tight">
                                  {rootNode.name}
                                </div>
                                <div className="text-[9px] text-red-500 font-semibold uppercase tracking-wider mt-0.5">
                                  Root Compromised
                                </div>
                              </div>
                            </div>
                          </foreignObject>
                        )}

                        {/* Level 1 Nodes */}
                        {level1Nodes.map((node, idx) => {
                          const nX = level1Nodes.length === 1 ? 350 : 120 + idx * (460 / Math.max(1, level1Nodes.length - 1));
                          const nY = 135;

                          return (
                            <foreignObject key={`blast-l1-${node.id}`} x={nX} y={nY} width={140} height={52} className="overflow-visible">
                              <div className={`w-full h-full bg-white rounded-xl border p-2 flex items-center gap-2 shadow-xs ${
                                node.risk_level === 'Critical' ? 'border-red-400 ring-2 ring-red-50' : 'border-orange-300 ring-1 ring-orange-50'
                              }`}>
                                <div className="shrink-0 p-1 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center">
                                  <CloudServiceSymbol provider={node.cloud_provider || cloudProvider} symbol={node.symbol || node.type} size={20} />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="text-[10px] font-bold text-slate-800 truncate leading-tight">{node.name}</div>
                                  <div className="mt-0.5 flex items-center gap-1">
                                    <span className={`px-1 py-0.2 rounded text-[8px] font-bold ${
                                      node.risk_level === 'Critical' ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'
                                    }`}>
                                      {node.risk_level} Impact
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </foreignObject>
                          );
                        })}

                        {/* Level 2 Nodes */}
                        {level2Nodes.map((node, idx) => {
                          const nX = level2Nodes.length === 1 ? 350 : 180 + idx * (340 / Math.max(1, level2Nodes.length - 1));
                          const nY = 240;

                          return (
                            <foreignObject key={`blast-l2-${node.id}`} x={nX} y={nY} width={140} height={52} className="overflow-visible">
                              <div className="w-full h-full bg-white rounded-xl border border-amber-300 ring-1 ring-amber-50 p-2 flex items-center gap-2 shadow-xs">
                                <div className="shrink-0 p-1 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center">
                                  <CloudServiceSymbol provider={node.cloud_provider || cloudProvider} symbol={node.symbol || node.type} size={20} />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="text-[10px] font-bold text-slate-800 truncate leading-tight">{node.name}</div>
                                  <div className="mt-0.5 flex items-center gap-1">
                                    <span className="px-1 py-0.2 rounded text-[8px] font-bold bg-amber-50 text-amber-600">
                                      {node.risk_level} Downstream
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </foreignObject>
                          );
                        })}
                      </svg>
                    );
                  })()
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-500 text-xs">
                    <AlertTriangle className="w-8 h-8 text-slate-300 mb-2 animate-pulse" />
                    <span>Analyzing dependency blast radius...</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SCREEN 12.7: Change History */}
          {/* ========================================================================= */}
          {activeTab === 'change-history' && (
            <div className="flex flex-col gap-6 max-w-7xl mx-auto">
              {/* Header */}
              <div className="flex flex-col gap-1">
                <h1 className="text-xl font-bold text-[#0F172A] tracking-tight">Infrastructure Changes</h1>
                <p className="text-xs text-[#64748B]">
                  Track changes to infrastructure resources over time.
                </p>
              </div>

              {/* Filters */}
              <div className="flex items-center justify-between gap-3 bg-white border border-[#E2E8F0] rounded-lg p-3 text-xs">
                <select
                  value={changeResourceFilter}
                  onChange={(e) => setChangeResourceFilter(e.target.value)}
                  className="bg-[#F8FAFC] border border-[#CBD5E1]/80 rounded px-3 py-1.5 text-[#334155] focus:outline-none"
                >
                  <option value="All Resources">All Resources</option>
                  <option value="EKS Cluster">EKS Cluster</option>
                  <option value="RDS">RDS</option>
                  <option value="S3 Bucket">S3 Bucket</option>
                  <option value="Security Group">Security Group</option>
                  <option value="ALB">ALB</option>
                  <option value="VPC">VPC</option>
                  <option value="EC2">EC2</option>
                  <option value="IAM Role">IAM Role</option>
                </select>

                <div className="text-[#64748B] text-xs font-medium">
                  {currentDateRange}
                </div>
              </div>

              {/* History Table */}
              <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#F8FAFC]/80 text-[#64748B] border-b border-[#E2E8F0]">
                    <tr>
                      <th className="py-3 px-4 font-medium">Time</th>
                      <th className="py-3 px-4 font-medium">Resource</th>
                      <th className="py-3 px-4 font-medium">Change</th>
                      <th className="py-3 px-4 font-medium">User</th>
                      <th className="py-3 px-4 font-medium">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]/60">
                    {changeHistoryData?.items && changeHistoryData.items.length > 0 ? (
                      changeHistoryData.items.map((chg) => (
                        <tr key={chg.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-4 text-[#64748B] font-mono text-[11px] whitespace-nowrap">
                            {chg.time}
                          </td>
                          <td className="py-2.5 px-4 font-medium text-[#0F172A] flex items-center gap-2">
                            <CloudServiceSymbol provider={chg.cloud_provider || cloudProvider} symbol={chg.resource} size={16} />
                            <span>{chg.resource}</span>
                          </td>
                          <td className="py-2.5 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                chg.change_type === 'Modified'
                                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                  : chg.change_type === 'Created'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                  : chg.change_type === 'Deleted'
                                  ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                                  : 'bg-slate-500/10 text-[#64748B] border border-slate-500/30'
                              }`}
                            >
                              {chg.change_type}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-[#334155] font-mono text-[11px]">
                            {chg.user}
                          </td>
                          <td className="py-2.5 px-4 text-[#64748B]">
                            {chg.details}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-500">
                          No changes recorded for selected filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {/* Pagination */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-[#E2E8F0] bg-[#F8FAFC]/40 text-xs text-[#64748B]">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((pageNum) => (
                      <button
                        key={pageNum}
                        onClick={() => setChangePage(pageNum)}
                        className={`w-7 h-7 flex items-center justify-center rounded ${
                          changePage === pageNum
                            ? 'bg-blue-600 text-[#0F172A] font-medium'
                            : 'hover:bg-slate-100 text-[#64748B]'
                        }`}
                      >
                        {pageNum}
                      </button>
                    ))}
                    <button
                      onClick={() => setChangePage((p) => p + 1)}
                      className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 text-[#64748B]"
                    >
                      &gt;
                    </button>
                  </div>

                  <select
                    value={changePageSize}
                    onChange={(e) => setChangePageSize(Number(e.target.value))}
                    className="bg-[#F8FAFC] border border-[#CBD5E1]/80 rounded px-2.5 py-1 text-[#334155] focus:outline-none"
                  >
                    <option value={10}>10 / page</option>
                    <option value={20}>20 / page</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SCREEN 12.8: Graph Settings */}
          {/* ========================================================================= */}
          {activeTab === 'settings' && (
            <div className="flex flex-col gap-6 max-w-4xl mx-auto">
              {/* Header */}
              <div className="flex flex-col gap-1">
                <h1 className="text-xl font-bold text-[#0F172A] tracking-tight">Infrastructure Graph Settings</h1>
                <p className="text-xs text-[#64748B]">
                  Configure visualization and analysis options.
                </p>
              </div>

              {/* 1. Visualization Settings */}
              <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 shadow-sm flex flex-col gap-4">
                <h2 className="text-sm font-semibold text-[#0F172A] border-b border-[#E2E8F0] pb-2">
                  Visualization Settings
                </h2>

                <div className="flex flex-col gap-3.5 text-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[#334155] font-medium block">Default View</span>
                      <span className="text-slate-500 text-[11px]">Primary diagram layout</span>
                    </div>
                    <select
                      value={settingsData.visualization.default_view}
                      onChange={(e) =>
                        setSettingsData((prev) => ({
                          ...prev,
                          visualization: { ...prev.visualization, default_view: e.target.value },
                        }))
                      }
                      className="bg-[#F8FAFC] border border-[#CBD5E1]/80 rounded px-3 py-1.5 text-[#334155] focus:outline-none min-w-[140px]"
                    >
                      <option value="Logical View">Logical View</option>
                      <option value="Physical View">Physical View</option>
                      <option value="Network View">Network View</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#E2E8F0]">
                    <span className="text-[#334155] font-medium">Show Resource Labels</span>
                    <button
                      type="button"
                      onClick={() =>
                        setSettingsData((prev) => ({
                          ...prev,
                          visualization: {
                            ...prev.visualization,
                            show_resource_labels: !prev.visualization.show_resource_labels,
                          },
                        }))
                      }
                      className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
                        settingsData.visualization.show_resource_labels ? 'bg-blue-600' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                          settingsData.visualization.show_resource_labels ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#E2E8F0]">
                    <span className="text-[#334155] font-medium">Show Relationships</span>
                    <button
                      type="button"
                      onClick={() =>
                        setSettingsData((prev) => ({
                          ...prev,
                          visualization: {
                            ...prev.visualization,
                            show_relationships: !prev.visualization.show_relationships,
                          },
                        }))
                      }
                      className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
                        settingsData.visualization.show_relationships ? 'bg-blue-600' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                          settingsData.visualization.show_relationships ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#E2E8F0]">
                    <span className="text-[#334155] font-medium">Group by Environment</span>
                    <button
                      type="button"
                      onClick={() =>
                        setSettingsData((prev) => ({
                          ...prev,
                          visualization: {
                            ...prev.visualization,
                            group_by_environment: !prev.visualization.group_by_environment,
                          },
                        }))
                      }
                      className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
                        settingsData.visualization.group_by_environment ? 'bg-blue-600' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                          settingsData.visualization.group_by_environment ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#E2E8F0]">
                    <span className="text-[#334155] font-medium">Show Risk Indicators</span>
                    <button
                      type="button"
                      onClick={() =>
                        setSettingsData((prev) => ({
                          ...prev,
                          visualization: {
                            ...prev.visualization,
                            show_risk_indicators: !prev.visualization.show_risk_indicators,
                          },
                        }))
                      }
                      className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
                        settingsData.visualization.show_risk_indicators ? 'bg-blue-600' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                          settingsData.visualization.show_risk_indicators ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* 2. Analysis Settings */}
              <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 shadow-sm flex flex-col gap-4">
                <h2 className="text-sm font-semibold text-[#0F172A] border-b border-[#E2E8F0] pb-2">
                  Analysis Settings
                </h2>

                <div className="flex flex-col gap-3.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[#334155] font-medium">Include External Resources</span>
                    <button
                      type="button"
                      onClick={() =>
                        setSettingsData((prev) => ({
                          ...prev,
                          analysis: {
                            ...prev.analysis,
                            include_external_resources: !prev.analysis.include_external_resources,
                          },
                        }))
                      }
                      className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
                        settingsData.analysis.include_external_resources ? 'bg-blue-600' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                          settingsData.analysis.include_external_resources ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#E2E8F0]">
                    <span className="text-[#334155] font-medium">Enable Blast Radius Analysis</span>
                    <button
                      type="button"
                      onClick={() =>
                        setSettingsData((prev) => ({
                          ...prev,
                          analysis: {
                            ...prev.analysis,
                            enable_blast_radius_analysis: !prev.analysis.enable_blast_radius_analysis,
                          },
                        }))
                      }
                      className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
                        settingsData.analysis.enable_blast_radius_analysis ? 'bg-blue-600' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                          settingsData.analysis.enable_blast_radius_analysis ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#E2E8F0]">
                    <span className="text-[#334155] font-medium">Maximum Depth</span>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={settingsData.analysis.maximum_depth}
                      onChange={(e) =>
                        setSettingsData((prev) => ({
                          ...prev,
                          analysis: {
                            ...prev.analysis,
                            maximum_depth: Number(e.target.value),
                          },
                        }))
                      }
                      className="w-16 bg-[#F8FAFC] border border-[#CBD5E1]/80 rounded px-2.5 py-1 text-[#334155] text-center focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#E2E8F0]">
                    <span className="text-[#334155] font-medium">Show Deprecated Resources</span>
                    <button
                      type="button"
                      onClick={() =>
                        setSettingsData((prev) => ({
                          ...prev,
                          analysis: {
                            ...prev.analysis,
                            show_deprecated_resources: !prev.analysis.show_deprecated_resources,
                          },
                        }))
                      }
                      className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
                        settingsData.analysis.show_deprecated_resources ? 'bg-blue-600' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                          settingsData.analysis.show_deprecated_resources ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* 3. Export Settings */}
              <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 shadow-sm flex flex-col gap-4">
                <h2 className="text-sm font-semibold text-[#0F172A] border-b border-[#E2E8F0] pb-2">
                  Export Settings
                </h2>

                <div className="flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[#334155] font-medium block">Export Format</span>
                    <span className="text-slate-500 text-[11px]">Export the current graph view</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <select
                      value={settingsData.export.export_format}
                      onChange={(e) =>
                        setSettingsData((prev) => ({
                          ...prev,
                          export: { export_format: e.target.value },
                        }))
                      }
                      className="bg-[#F8FAFC] border border-[#CBD5E1]/80 rounded px-3 py-1.5 text-[#334155] focus:outline-none min-w-[100px]"
                    >
                      <option value="PNG">PNG</option>
                      <option value="SVG">SVG</option>
                      <option value="PDF">PDF</option>
                    </select>

                    <button
                      onClick={handleExportGraph}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-100 hover:bg-slate-100 border border-[#CBD5E1] text-xs text-[#334155] transition-colors"
                    >
                      <Download className="w-3.5 h-3.5 text-[#64748B]" />
                      <span>Export</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Save Changes Footer */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={handleSaveSettings}
                  disabled={savingSettings}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-[#0F172A] font-medium text-xs shadow-md shadow-blue-600/30 transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingSettings ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </div>
          )}
        </main>
    </div>
  );
};

export default InfrastructureGraphSuiteWorkspace;
