'use client';

import React, { useState } from 'react';
import { Maximize2, Minimize2, Box, Info } from 'lucide-react';
import { SBOMRelationshipMap, SBOMRelationshipNode } from '@/types/api/dependencies';

interface ComponentRelationshipMapProps {
  data: SBOMRelationshipMap;
  loading?: boolean;
}

export const ComponentRelationshipMap: React.FC<ComponentRelationshipMapProps> = ({
  data,
  loading = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<SBOMRelationshipNode | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  if (loading) {
    return (
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          height: '270px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ height: '18px', width: '200px', backgroundColor: '#F1F5F9', borderRadius: '4px' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '160px' }}>
          <div style={{ width: '120px', height: '120px', borderRadius: '50%', backgroundColor: '#F8FAFC' }} />
        </div>
      </div>
    );
  }

  // Define circular coordinates for nodes centered around (175, 105)
  const center = { x: 175, y: 105 };
  const radius = 68;

  // Root node is placed in center
  const rootNode = data.nodes.find((n) => n.type === 'root') || data.nodes[0] || {
    id: 'root-1',
    name: 'web-api',
    type: 'root',
    ecosystem: 'npm',
    status: 'healthy',
  };

  const otherNodes = data.nodes.filter((n) => n.id !== rootNode.id);

  // Position other nodes in circle or arc
  const nodePositions: Record<string, { x: number; y: number }> = {};
  nodePositions[rootNode.id] = center;

  const count = otherNodes.length;
  otherNodes.forEach((node, index) => {
    const angle = (index / Math.max(count, 1)) * 2 * Math.PI - Math.PI / 2;
    nodePositions[node.id] = {
      x: Math.round(center.x + radius * Math.cos(angle)),
      y: Math.round(center.y + radius * Math.sin(angle)),
    };
  });

  const getNodeColors = (node: SBOMRelationshipNode) => {
    if (node.type === 'root') {
      return { border: '#2563EB', bg: '#EFF6FF', icon: '#2563EB', text: '#1E40AF' };
    }
    if (node.status === 'critical') {
      return { border: '#EF4444', bg: '#FEF2F2', icon: '#EF4444', text: '#991B1B' };
    }
    if (node.status === 'warning') {
      return { border: '#F59E0B', bg: '#FFFBEB', icon: '#F59E0B', text: '#92400E' };
    }
    if (node.type === 'direct') {
      return { border: '#10B981', bg: '#ECFDF5', icon: '#10B981', text: '#065F46' };
    }
    return { border: '#8B5CF6', bg: '#F5F3FF', icon: '#8B5CF6', text: '#5B21B6' };
  };

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: isExpanded ? '460px' : '270px',
        position: 'relative',
        transition: 'height 0.3s ease',
      }}
    >
      {/* Card Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', margin: 0 }}>
            Component Relationship Map
          </h3>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          title={isExpanded ? 'Collapse Map' : 'Expand Map'}
          style={{
            background: 'none',
            border: 'none',
            color: '#64748B',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
      </div>

      {/* SVG Canvas */}
      <div
        style={{
          position: 'relative',
          flexGrow: 1,
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <svg
          viewBox={isExpanded ? '0 0 350 320' : '0 0 350 200'}
          style={{ width: '100%', height: '100%', maxHeight: isExpanded ? '380px' : '190px' }}
        >
          {/* Edges / Connections */}
          {data.edges.map((edge, idx) => {
            const src = nodePositions[edge.source] || center;
            const tgt = nodePositions[edge.target] || center;
            const isHighlight =
              selectedNodeId && (edge.source === selectedNodeId || edge.target === selectedNodeId);

            return (
              <line
                key={`edge-${idx}`}
                x1={src.x}
                y1={src.y}
                x2={tgt.x}
                y2={tgt.y}
                stroke={isHighlight ? '#3B82F6' : '#E2E8F0'}
                strokeWidth={isHighlight ? '2.5' : '1.5'}
                strokeDasharray={isHighlight ? 'none' : '3 3'}
              />
            );
          })}

          {/* Root Central Node */}
          {(() => {
            const pos = nodePositions[rootNode.id] || center;
            const colors = getNodeColors(rootNode);
            const isSelected = selectedNodeId === rootNode.id;

            return (
              <g
                key={rootNode.id}
                transform={`translate(${pos.x}, ${pos.y})`}
                onClick={() => setSelectedNodeId(isSelected ? null : rootNode.id)}
                onMouseEnter={() => setHoveredNode(rootNode)}
                onMouseLeave={() => setHoveredNode(null)}
                style={{ cursor: 'pointer' }}
              >
                <circle
                  r={isSelected ? '22' : '19'}
                  fill={colors.bg}
                  stroke={colors.border}
                  strokeWidth="2"
                  filter="drop-shadow(0px 2px 4px rgba(0, 0, 0, 0.08))"
                />
                <circle r="14" fill="#FFFFFF" />
                <rect
                  x="-6"
                  y="-6"
                  width="12"
                  height="12"
                  rx="2"
                  fill="none"
                  stroke={colors.border}
                  strokeWidth="1.5"
                />
                <text
                  x="0"
                  y="30"
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="600"
                  fill="#0F172A"
                >
                  {rootNode.name}
                </text>
              </g>
            );
          })()}

          {/* Leaf & Dependency Nodes */}
          {otherNodes.map((node) => {
            const pos = nodePositions[node.id] || center;
            const colors = getNodeColors(node);
            const isSelected = selectedNodeId === node.id;

            return (
              <g
                key={node.id}
                transform={`translate(${pos.x}, ${pos.y})`}
                onClick={() => setSelectedNodeId(isSelected ? null : node.id)}
                onMouseEnter={() => setHoveredNode(node)}
                onMouseLeave={() => setHoveredNode(null)}
                style={{ cursor: 'pointer' }}
              >
                <circle
                  r={isSelected ? '16' : '13'}
                  fill={colors.bg}
                  stroke={colors.border}
                  strokeWidth="1.5"
                  filter="drop-shadow(0px 1px 2px rgba(0, 0, 0, 0.05))"
                />
                <circle r="9" fill="#FFFFFF" />
                <rect
                  x="-4"
                  y="-4"
                  width="8"
                  height="8"
                  rx="1.5"
                  fill="none"
                  stroke={colors.border}
                  strokeWidth="1.2"
                />
                <text
                  x="0"
                  y="23"
                  textAnchor="middle"
                  fontSize="9"
                  fontWeight="500"
                  fill="#475569"
                >
                  {node.name.length > 10 ? node.name.slice(0, 9) + '…' : node.name}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredNode && (
          <div
            style={{
              position: 'absolute',
              bottom: '10px',
              left: '12px',
              backgroundColor: '#0F172A',
              color: '#FFFFFF',
              padding: '6px 10px',
              borderRadius: '6px',
              fontSize: '11px',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
              pointerEvents: 'none',
              zIndex: 10,
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
            }}
          >
            <div style={{ fontWeight: 600 }}>{hoveredNode.name}</div>
            <div style={{ fontSize: '10px', color: '#94A3B8' }}>
              Type: {hoveredNode.type} • Status: {hoveredNode.status}
            </div>
          </div>
        )}
      </div>

      <div style={{ paddingTop: '8px', borderTop: '1px solid #F1F5F9' }}>
        <span style={{ fontSize: '11px', color: '#94A3B8' }}>
          Interactive radial hierarchy derived from manifest dependency declarations.
        </span>
      </div>
    </div>
  );
};
