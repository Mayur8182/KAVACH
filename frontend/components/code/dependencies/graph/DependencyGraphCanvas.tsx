'use client';

import React, { useState, useRef, useMemo } from 'react';
import { DependencyGraphNode, DependencyGraphEdge } from '@/types/api/dependencies';
import {
  Search,
  Filter,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Crosshair,
  Package,
  Layers,
  ShieldAlert,
  AlertTriangle,
} from 'lucide-react';

interface DependencyGraphCanvasProps {
  nodes: DependencyGraphNode[];
  edges: DependencyGraphEdge[];
  selectedNodeId?: string | null;
  onSelectNode: (node: DependencyGraphNode) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  ecosystemFilter: string;
  onEcosystemChange: (e: string) => void;
  viewFilter: string;
  onViewChange: (v: string) => void;
  riskFilter: string;
  onRiskChange: (r: string) => void;
  loading?: boolean;
}

export const DependencyGraphCanvas: React.FC<DependencyGraphCanvasProps> = ({
  nodes,
  edges,
  selectedNodeId,
  onSelectNode,
  searchQuery,
  onSearchChange,
  ecosystemFilter,
  onEcosystemChange,
  viewFilter,
  onViewChange,
  riskFilter,
  onRiskChange,
  loading = false,
}) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Filtered nodes
  const filteredNodes = useMemo(() => {
    return nodes.filter((n) => {
      if (searchQuery && !n.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      if (ecosystemFilter && ecosystemFilter !== 'all' && n.ecosystem.toLowerCase() !== ecosystemFilter.toLowerCase()) {
        return false;
      }
      if (riskFilter && riskFilter !== 'all') {
        if (riskFilter.toLowerCase() === 'vulnerable') {
          if (n.risk_level === 'Safe' || n.risk_level === 'Low') return false;
        } else if (n.risk_level.toLowerCase() !== riskFilter.toLowerCase()) {
          return false;
        }
      }
      if (viewFilter === 'direct' && !n.is_direct) return false;
      if (viewFilter === 'transitive' && n.is_direct) return false;
      if (viewFilter === 'risk' && (n.risk_level === 'Safe' || n.risk_level === 'Low')) return false;
      return true;
    });
  }, [nodes, searchQuery, ecosystemFilter, riskFilter, viewFilter]);

  const visibleNodeIds = useMemo(() => new Set(filteredNodes.map((n) => n.id)), [filteredNodes]);

  // Filtered edges
  const filteredEdges = useMemo(() => {
    return edges.filter(
      (e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target)
    );
  }, [edges, visibleNodeIds]);

  // Center node or primary focus
  const primaryNode = useMemo(() => {
    if (selectedNodeId) {
      return nodes.find((n) => n.id === selectedNodeId) || nodes[0];
    }
    return nodes.find((n) => n.depth === 0) || nodes[0];
  }, [nodes, selectedNodeId]);

  // Zoom handlers
  const handleZoomIn = () => setZoom((z) => Math.min(2.5, z + 0.2));
  const handleZoomOut = () => setZoom((z) => Math.max(0.5, z - 0.2));
  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName.toLowerCase() === 'circle' || (e.target as HTMLElement).tagName.toLowerCase() === 'text') {
      return;
    }
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Node position map
  const nodePosMap = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    nodes.forEach((n) => map.set(n.id, { x: n.x, y: n.y }));
    return map;
  }, [nodes]);

  // Color mappings
  const getNodeColor = (node: DependencyGraphNode, isSelected: boolean) => {
    if (isSelected) return '#2563EB'; // vibrant royal blue
    if (node.risk_level === 'Critical') return '#EF4444'; // red
    if (node.risk_level === 'High') return '#F97316'; // orange
    if (node.risk_level === 'Medium') return '#F59E0B'; // amber
    if (node.is_direct) return '#3B82F6'; // blue
    return '#94A3B8'; // slate for safe transitive
  };

  const getNodeFill = (node: DependencyGraphNode, isSelected: boolean) => {
    if (isSelected) return '#EFF6FF';
    if (node.risk_level === 'Critical') return '#FEF2F2';
    if (node.risk_level === 'High') return '#FFF7ED';
    if (node.risk_level === 'Medium') return '#FFFBEB';
    if (node.is_direct) return '#F0F9FF';
    return '#F8FAFC';
  };

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '12px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        position: 'relative',
        height: '560px',
        overflow: 'hidden',
      }}
    >
      {/* Top Toolbar matching Screenshot 06 */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid #F1F5F9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          backgroundColor: '#FFFFFF',
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
            Dependency Graph
          </h2>
          <span
            style={{
              fontSize: '11px',
              padding: '2px 8px',
              backgroundColor: '#F1F5F9',
              color: '#475569',
              borderRadius: '12px',
              fontWeight: 600,
            }}
          >
            {filteredNodes.length} nodes
          </span>
        </div>

        {/* Filter Toolbar Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Search Box */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '6px 10px',
              width: '180px',
            }}
          >
            <Search size={14} color="#94A3B8" />
            <input
              type="text"
              placeholder="Search package..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '12px',
                color: '#1E293B',
                width: '100%',
              }}
            />
          </div>

          {/* Ecosystem Filter */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '6px 10px',
              fontSize: '12px',
            }}
          >
            <select
              aria-label="Filter by ecosystem"
              value={ecosystemFilter}
              onChange={(e) => onEcosystemChange(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '12px',
                color: '#334155',
                cursor: 'pointer',
              }}
            >
              <option value="all">Ecosystem (All)</option>
              <option value="npm">npm</option>
              <option value="pypi">PyPI</option>
              <option value="maven">Maven</option>
              <option value="go">Go</option>
              <option value="cargo">Cargo</option>
            </select>
          </div>

          {/* View Filter */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '6px 10px',
              fontSize: '12px',
            }}
          >
            <select
              aria-label="Filter by view type"
              value={viewFilter}
              onChange={(e) => onViewChange(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '12px',
                color: '#334155',
                cursor: 'pointer',
              }}
            >
              <option value="all">View: All</option>
              <option value="direct">Direct Only</option>
              <option value="transitive">Transitive Only</option>
              <option value="risk">Risk Paths Only</option>
            </select>
          </div>

          {/* Risk Level Filter */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '6px 10px',
              fontSize: '12px',
            }}
          >
            <select
              aria-label="Filter by risk level"
              value={riskFilter}
              onChange={(e) => onRiskChange(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '12px',
                color: '#334155',
                cursor: 'pointer',
              }}
            >
              <option value="all">Risk Level: All</option>
              <option value="vulnerable">All Vulnerable</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="safe">Safe Only</option>
            </select>
          </div>

          {/* Center / Reset view icon */}
          <button
            onClick={handleResetZoom}
            title="Reset & Center View"
            style={{
              border: '1px solid #E2E8F0',
              background: '#FFFFFF',
              borderRadius: '8px',
              padding: '6px 8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              color: '#475569',
            }}
          >
            <Crosshair size={14} />
          </button>
        </div>
      </div>

      {/* Interactive SVG Canvas */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          flex: 1,
          width: '100%',
          height: '100%',
          cursor: isDragging ? 'grabbing' : 'grab',
          position: 'relative',
          backgroundColor: '#FAFCFF',
          backgroundImage:
            'radial-gradient(circle, #E2E8F0 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      >
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 900 480"
          style={{ overflow: 'hidden' }}
        >
          <defs>
            {/* Standard arrow marker */}
            <marker
              id="arrow-gray"
              viewBox="0 0 10 10"
              refX="18"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#CBD5E1" />
            </marker>

            {/* Red risk arrow marker */}
            <marker
              id="arrow-red"
              viewBox="0 0 10 10"
              refX="18"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#EF4444" />
            </marker>

            {/* Blue active arrow marker */}
            <marker
              id="arrow-blue"
              viewBox="0 0 10 10"
              refX="18"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#3B82F6" />
            </marker>

            {/* Glowing filter for risk path */}
            <filter id="glow-red" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#EF4444" floodOpacity="0.4" />
            </filter>
            <filter id="glow-blue" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#3B82F6" floodOpacity="0.3" />
            </filter>
          </defs>

          <g
            transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}
            style={{ transformOrigin: '450px 240px', transition: isDragging ? 'none' : 'transform 120ms ease-out' }}
          >
            {/* 1. EDGES */}
            {filteredEdges.map((edge) => {
              const srcPos = nodePosMap.get(edge.source);
              const tgtPos = nodePosMap.get(edge.target);
              if (!srcPos || !tgtPos) return null;

              const isRisk = edge.is_risk_path;
              const isSelectedConnected =
                selectedNodeId &&
                (edge.source === selectedNodeId || edge.target === selectedNodeId);

              // Curved bezier edge calculation
              const dx = tgtPos.x - srcPos.x;
              const dy = tgtPos.y - srcPos.y;
              const cx1 = srcPos.x + dx * 0.5;
              const cy1 = srcPos.y;
              const cx2 = srcPos.x + dx * 0.5;
              const cy2 = tgtPos.y;
              const d = `M ${srcPos.x} ${srcPos.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${tgtPos.x} ${tgtPos.y}`;

              const strokeColor = isRisk
                ? '#EF4444'
                : isSelectedConnected
                ? '#3B82F6'
                : '#CBD5E1';

              const strokeWidth = isRisk ? 2.5 : isSelectedConnected ? 2 : 1.5;
              const markerEnd = isRisk
                ? 'url(#arrow-red)'
                : isSelectedConnected
                ? 'url(#arrow-blue)'
                : 'url(#arrow-gray)';

              return (
                <g key={edge.id}>
                  <path
                    d={d}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeDasharray={isRisk ? '4,3' : undefined}
                    markerEnd={markerEnd}
                    filter={isRisk ? 'url(#glow-red)' : undefined}
                    opacity={isSelectedConnected || isRisk ? 1 : 0.65}
                  />
                </g>
              );
            })}

            {/* 2. NODES */}
            {filteredNodes.map((node) => {
              const isSelected = node.id === selectedNodeId || (primaryNode && primaryNode.id === node.id);
              const isRoot = node.depth === 0;
              const strokeColor = getNodeColor(node, isSelected);
              const fillColor = getNodeFill(node, isSelected);
              const isRisk = node.risk_level === 'Critical' || node.risk_level === 'High';

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectNode(node);
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Outer pulse aura for root or critical node */}
                  {isRoot && (
                    <circle
                      r="32"
                      fill="#3B82F6"
                      fillOpacity="0.1"
                      stroke="#93C5FD"
                      strokeWidth="1.5"
                      strokeDasharray="3,3"
                    />
                  )}
                  {isSelected && (
                    <circle
                      r="28"
                      fill="#2563EB"
                      fillOpacity="0.15"
                      stroke="#60A5FA"
                      strokeWidth="2"
                    />
                  )}
                  {isRisk && !isSelected && (
                    <circle
                      r="24"
                      fill="#EF4444"
                      fillOpacity="0.1"
                      stroke="#FCA5A5"
                      strokeWidth="1.5"
                    />
                  )}

                  {/* Main Node Circle */}
                  <circle
                    r={isRoot ? 22 : isSelected ? 20 : 16}
                    fill={fillColor}
                    stroke={strokeColor}
                    strokeWidth={isSelected ? 3 : 2}
                    filter={isRisk ? 'url(#glow-red)' : isSelected ? 'url(#glow-blue)' : undefined}
                  />

                  {/* Inner Icon representation */}
                  {isRisk ? (
                    <g transform="translate(-7, -7) scale(0.7)">
                      <path
                        d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4m0 4h.01"
                        fill="none"
                        stroke="#EF4444"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </g>
                  ) : (
                    <g transform="translate(-6, -6) scale(0.6)">
                      <path
                        d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth="2.2"
                      />
                    </g>
                  )}

                  {/* Label Pill */}
                  <g transform={`translate(0, ${isRoot ? 32 : 26})`}>
                    <rect
                      x="-45"
                      y="-10"
                      width="90"
                      height="18"
                      rx="9"
                      fill="#FFFFFF"
                      stroke={isSelected ? '#3B82F6' : '#E2E8F0'}
                      strokeWidth="1"
                      style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.06))' }}
                    />
                    <text
                      textAnchor="middle"
                      y="3"
                      fontSize="9.5"
                      fontWeight={isSelected ? '700' : '600'}
                      fill={isSelected ? '#1D4ED8' : '#334155'}
                      style={{ userSelect: 'none' }}
                    >
                      {node.name.length > 13 ? `${node.name.slice(0, 11)}..` : node.name}
                    </text>
                  </g>
                </g>
              );
            })}
          </g>
        </svg>

        {/* Zoom & Canvas controls (Bottom-Left) */}
        <div
          style={{
            position: 'absolute',
            bottom: '16px',
            left: '16px',
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            overflow: 'hidden',
          }}
        >
          <button
            onClick={handleZoomIn}
            title="Zoom In"
            style={{
              padding: '6px 10px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: '#475569',
              borderRight: '1px solid #F1F5F9',
            }}
          >
            <ZoomIn size={14} />
          </button>
          <button
            onClick={handleZoomOut}
            title="Zoom Out"
            style={{
              padding: '6px 10px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: '#475569',
              borderRight: '1px solid #F1F5F9',
            }}
          >
            <ZoomOut size={14} />
          </button>
          <button
            onClick={handleResetZoom}
            title="Fit to Screen"
            style={{
              padding: '6px 10px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: '#475569',
            }}
          >
            <Maximize2 size={14} />
          </button>
        </div>

        {/* Legend (Bottom-Right) matching Screenshot 06 */}
        <div
          style={{
            position: 'absolute',
            bottom: '16px',
            right: '16px',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(4px)',
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            padding: '6px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '11px',
            fontWeight: 500,
            color: '#64748B',
            boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#3B82F6' }} />
            <span>Direct</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#EF4444' }} />
            <span>Vulnerable / Risk</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#F59E0B' }} />
            <span>Transitive Warning</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#94A3B8' }} />
            <span>Safe Transitive</span>
          </div>
        </div>
      </div>
    </div>
  );
};
