'use client';

import React from 'react';
import { PipelineStageItem } from '@/types/api/dependencies';
import {
  Code2,
  Cpu,
  ShieldAlert,
  CheckCircle,
  Package,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from 'lucide-react';

interface PipelineStagesFlowProps {
  stages: PipelineStageItem[];
  loading?: boolean;
}

export const PipelineStagesFlow: React.FC<PipelineStagesFlowProps> = ({
  stages,
  loading = false,
}) => {
  if (loading) {
    return (
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          height: '280px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ height: '18px', width: '160px', backgroundColor: '#F1F5F9', borderRadius: '4px' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: '#F1F5F9' }} />
          ))}
        </div>
      </div>
    );
  }

  // Fallback stages if empty
  const defaultStages: PipelineStageItem[] = [
    {
      stage_key: 'source',
      name: 'Source',
      status: 'SUCCESS',
      icon_type: 'code',
      duration: '12s',
      order: 1,
      details: 'Clean git checkout',
    },
    {
      stage_key: 'build',
      name: 'Build',
      status: 'SUCCESS',
      icon_type: 'build',
      duration: '45s',
      order: 2,
      details: 'Artifact compiled',
    },
    {
      stage_key: 'scan',
      name: 'Dependency Scan',
      status: 'SUCCESS',
      icon_type: 'scan',
      duration: '1m 15s',
      order: 3,
      details: '248 dependencies analyzed',
    },
    {
      stage_key: 'gates',
      name: 'Quality Gates',
      status: 'SUCCESS',
      icon_type: 'gates',
      duration: '4s',
      order: 4,
      details: 'Zero critical CVEs passed',
    },
    {
      stage_key: 'deploy',
      name: 'Deploy',
      status: 'SUCCESS',
      icon_type: 'deploy',
      duration: '28s',
      order: 5,
      details: 'Staging deployment ready',
    },
  ];

  const displayStages = stages && stages.length > 0 ? stages : defaultStages;

  const getStageIcon = (key: string, iconType: string) => {
    switch (key.toLowerCase()) {
      case 'source':
      case 'checkout':
        return <Code2 size={18} color="#2563EB" />;
      case 'build':
      case 'compile':
        return <Cpu size={18} color="#059669" />;
      case 'dependency_scan':
      case 'scan':
        return <ShieldCheck size={18} color="#D97706" />;
      case 'quality_gates':
      case 'gates':
        return <CheckCircle size={18} color="#059669" />;
      case 'deploy':
      case 'release':
        return <Package size={18} color="#9333EA" />;
      default:
        return <Package size={18} color="#475569" />;
    }
  };

  const getStageBgColor = (key: string) => {
    switch (key.toLowerCase()) {
      case 'source':
        return '#EFF6FF';
      case 'build':
        return '#ECFDF5';
      case 'dependency_scan':
      case 'scan':
        return '#FFFBEB';
      case 'quality_gates':
      case 'gates':
        return '#ECFDF5';
      case 'deploy':
        return '#FAF5FF';
      default:
        return '#F8FAFC';
    }
  };

  const getStageBorderColor = (key: string) => {
    switch (key.toLowerCase()) {
      case 'source':
        return '#BFDBFE';
      case 'build':
        return '#A7F3D0';
      case 'dependency_scan':
      case 'scan':
        return '#FDE68A';
      case 'quality_gates':
      case 'gates':
        return '#A7F3D0';
      case 'deploy':
        return '#E9D5FF';
      default:
        return '#E2E8F0';
    }
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
        height: '280px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', margin: 0 }}>
          Pipeline Stages
        </h3>
        <span
          style={{
            fontSize: '11px',
            fontWeight: 500,
            color: '#64748B',
            backgroundColor: '#F8FAFC',
            padding: '3px 8px',
            borderRadius: '6px',
            border: '1px solid #E2E8F0',
          }}
        >
          5-Stage Flow
        </span>
      </div>

      {/* Horizontal Flow matching Screenshot 12 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexGrow: 1,
          padding: '10px 0',
        }}
      >
        {displayStages.map((stage, idx) => {
          const isLast = idx === displayStages.length - 1;
          const bg = getStageBgColor(stage.stage_key);
          const border = getStageBorderColor(stage.stage_key);

          return (
            <React.Fragment key={stage.stage_key || idx}>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  flex: '0 0 auto',
                  minWidth: '55px',
                }}
              >
                {/* Stage Circular Icon */}
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    backgroundColor: bg,
                    border: `1.5px solid ${border}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '8px',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                  }}
                >
                  {getStageIcon(stage.stage_key, stage.icon_type)}
                </div>

                {/* Stage Name */}
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A', marginBottom: '4px' }}>
                  {stage.name}
                </span>

                {/* Duration / Status Pill */}
                <span
                  style={{
                    fontSize: '10px',
                    color: '#059669',
                    backgroundColor: '#ECFDF5',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontWeight: 500,
                  }}
                >
                  {stage.duration}
                </span>
              </div>

              {/* Connecting Arrow */}
              {!isLast && (
                <div style={{ flex: '1 1 auto', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 4px', marginBottom: '24px' }}>
                  <ArrowRight size={14} color="#94A3B8" />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Footer Info */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: '10px',
          borderTop: '1px solid #F1F5F9',
          fontSize: '11px',
          color: '#64748B',
        }}
      >
        <span>Security checks integrated into Stage 3 &amp; 4</span>
        <span style={{ color: '#059669', fontWeight: 600 }}>Active Enforcement</span>
      </div>
    </div>
  );
};
