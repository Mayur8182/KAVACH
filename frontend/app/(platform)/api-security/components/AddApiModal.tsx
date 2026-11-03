'use client';

import React, { useState } from 'react';
import {
  X,
  Upload,
  Globe,
  FileCode,
  FolderGit2,
  Cloud,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { useApiSecurity } from '../context/ApiSecurityContext';

interface AddApiModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newApi: any) => void;
}

export function AddApiModal({ isOpen, onClose, onSuccess }: AddApiModalProps) {
  const { refreshApis, refreshOverview, setSelectedApi } = useApiSecurity();

  const [activeTab, setActiveTab] = useState<'openapi' | 'postman' | 'url' | 'github' | 'cloud'>('openapi');
  const [name, setName] = useState('');
  const [version, setVersion] = useState('1.0');
  const [baseUrl, setBaseUrl] = useState('https://api.example.com');
  const [environment, setEnvironment] = useState('PRODUCTION');
  const [specUrl, setSpecUrl] = useState('');
  const [specContent, setSpecContent] = useState('');
  const [authType, setAuthType] = useState('NONE');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    if (!name) {
      // Auto-populate name from file name
      setName(file.name.replace(/\.(json|yaml|yml)$/i, '').replace(/[-_]/g, ' '));
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setSpecContent(content);
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const targetName = name.trim() || (activeTab === 'postman' ? 'Postman Imported API' : 'E-Commerce API');

    setIsSubmitting(true);
    try {
      let finalContent = specContent;

      // If user provided a spec URL
      if ((activeTab === 'url' || !finalContent) && specUrl) {
        // Attempt to fetch URL client-side or pass URL to backend
        try {
          const fetched = await fetch(specUrl);
          if (fetched.ok) {
            finalContent = await fetched.text();
          }
        } catch {
          // If CORS prevents direct client fetch, backend service will parse fallback or stub
        }
      }

      if (!finalContent) {
        if (activeTab === 'openapi') {
          setErrorMsg('Please upload an OpenAPI specification file (.json or .yaml).');
          setIsSubmitting(false);
          return;
        } else if (activeTab === 'url') {
          setErrorMsg('Please provide a valid, accessible OpenAPI specification URL.');
          setIsSubmitting(false);
          return;
        } else if (activeTab === 'postman') {
          setErrorMsg('Please upload a Postman Collection (.json) file.');
          setIsSubmitting(false);
          return;
        }
      }

      const res = await api.apiSecurity.importApi({
        name: targetName,
        version: version || '1.0',
        base_url: baseUrl || 'https://api.example.com',
        environment: environment || 'PRODUCTION',
        spec_type: activeTab === 'postman' ? 'POSTMAN' : 'OPENAPI',
        spec_content: finalContent || undefined,
        auth_type: authType,
      });

      await refreshApis();
      await refreshOverview();
      setSelectedApi(res);

      if (onSuccess) onSuccess(res);
      onClose();
    } catch (err: any) {
      console.error('API Import error:', err);
      setErrorMsg(err?.message || 'Failed to import API specification. Please check format.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const tabs = [
    { id: 'openapi', label: 'OpenAPI / Swagger', icon: FileCode },
    { id: 'postman', label: 'Postman Collection', icon: Upload },
    { id: 'url', label: 'URL', icon: Globe },
    { id: 'github', label: 'GitHub', icon: FolderGit2 },
    { id: 'cloud', label: 'Cloud', icon: Cloud },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: '16px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '620px',
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          border: '1px solid #E2E8F0',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #F1F5F9',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Add API</h2>
            <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
              Import your API specification or connect directly.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94A3B8',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Selection */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid #E2E8F0',
            backgroundColor: '#F8FAFC',
            padding: '0 16px',
            gap: '8px',
          }}
        >
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '12px 14px',
                  fontSize: '12px',
                  fontWeight: active ? 600 : 500,
                  color: active ? '#2563EB' : '#64748B',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderBottom: active ? '2px solid #2563EB' : '2px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {errorMsg && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 14px',
                borderRadius: '6px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FCA5A5',
                color: '#991B1B',
                fontSize: '13px',
              }}
            >
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Tab 1 & 2: Dropzone for OpenAPI or Postman */}
          {(activeTab === 'openapi' || activeTab === 'postman') && (
            <div>
              <label
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '32px 20px',
                  borderRadius: '10px',
                  border: '2px dashed #CBD5E1',
                  backgroundColor: '#F8FAFC',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    backgroundColor: '#EFF6FF',
                    color: '#2563EB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '12px',
                  }}
                >
                  <Upload size={22} />
                </div>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>
                  {uploadedFileName ? uploadedFileName : `Drag and drop your ${activeTab === 'postman' ? 'Postman collection' : 'OpenAPI'} file`}
                </span>
                <span style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
                  Supports JSON or YAML files
                </span>
                <div
                  style={{
                    marginTop: '14px',
                    padding: '6px 16px',
                    backgroundColor: '#2563EB',
                    color: '#FFFFFF',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
                  Browse File
                </div>
                <input
                  type="file"
                  accept=".json,.yaml,.yml"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          )}

          {/* Tab 4: GitHub Repository Code Discovery */}
          {activeTab === 'github' && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '36px 20px',
                borderRadius: '10px',
                border: '1px solid #E2E8F0',
                backgroundColor: '#F8FAFC',
                textAlign: 'center',
                gap: '12px',
              }}
            >
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  backgroundColor: '#0F172A',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FolderGit2 size={22} />
              </div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                Scan Connected GitHub Repository
              </h3>
              <p style={{ fontSize: '13px', color: '#64748B', maxWidth: '440px', margin: 0, lineHeight: 1.5 }}>
                Kavach will analyze your repository source files, discover endpoints from AST route definitions (Express, NestJS, Next.js, FastAPI, Spring, Go, GraphQL), and reconcile with runtime targets.
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  window.location.href = '/api-security/discovery';
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginTop: '8px',
                  padding: '9px 20px',
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <FolderGit2 size={15} />
                <span>Launch GitHub Discovery Pipeline</span>
              </button>
            </div>
          )}

          {/* URL Input (Shown on URL tab or as alternative below dropzone) */}
          {activeTab !== 'github' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
              {activeTab === 'openapi' || activeTab === 'postman' ? 'Or enter URL' : 'API Specification URL'}
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="url"
                value={specUrl}
                onChange={(e) => setSpecUrl(e.target.value)}
                placeholder="https://api.example.com/openapi.json"
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  fontSize: '13px',
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                  outline: 'none',
                }}
              />
            </div>
          </div>
          )}

          {/* API Metadata Details */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>API Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. E-Commerce API"
                style={{
                  padding: '8px 12px',
                  fontSize: '13px',
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>Target Base URL</label>
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://api.example.com"
                style={{
                  padding: '8px 12px',
                  fontSize: '13px',
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>Environment</label>
              <select
                value={environment}
                onChange={(e) => setEnvironment(e.target.value)}
                style={{
                  padding: '8px 12px',
                  fontSize: '13px',
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                  backgroundColor: '#FFFFFF',
                }}
              >
                <option value="PRODUCTION">Production</option>
                <option value="STAGING">Staging</option>
                <option value="DEVELOPMENT">Development</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>Authentication Type</label>
              <select
                value={authType}
                onChange={(e) => setAuthType(e.target.value)}
                style={{
                  padding: '8px 12px',
                  fontSize: '13px',
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                  backgroundColor: '#FFFFFF',
                }}
              >
                <option value="NONE">None / Public API</option>
                <option value="BEARER">Bearer Token (JWT)</option>
                <option value="OAUTH2">OAuth 2.0</option>
                <option value="API_KEY">API Key</option>
                <option value="BASIC">Basic Auth</option>
              </select>
            </div>
          </div>

          {/* Footer Action Buttons */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '10px',
              paddingTop: '16px',
              borderTop: '1px solid #F1F5F9',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#64748B',
                backgroundColor: 'transparent',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 20px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#FFFFFF',
                backgroundColor: '#2563EB',
                border: 'none',
                borderRadius: '6px',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Importing & Parsing...</span>
                </>
              ) : (
                <span>Import</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
