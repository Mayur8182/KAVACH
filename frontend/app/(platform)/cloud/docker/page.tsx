'use client';

/**
 * Thing Cloud — Docker & Container Security Workspace
 * Route: /cloud/docker
 * Inspect container images, registries, SBOMs, image signatures, and base OS CVEs.
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Container,
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  CheckCircle2,
  XCircle,
  FileText,
  KeyRound,
  ExternalLink,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import type { CloudDockerImageItem } from '@/types/api/cloud';
import { CloudWorkshell } from '@/components/cloud/CloudWorkshell';

export default function DockerWorkspacePage() {
  const [images, setImages] = useState<CloudDockerImageItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchImages = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.cloud.docker();
      setImages(res.images);
      setTotal(res.total_images);
    } catch (err: any) {
      setError(err.message || 'Failed to load container image security.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, []);

  return (
    <CloudWorkshell>
      <div style={{ padding: '24px', maxWidth: '1440px', width: '100%', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '6px',
                  background: '#F1F5F9',
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Container size={14} color="#0F172A" />
              </div>
              <h1 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-text-primary)', margin: 0 }}>
                Docker &amp; Container Security
              </h1>
            </div>
            <p style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              Base image vulnerability scans, SBOM tracking, Cosign/Sigstore signatures, and registry posture across ECR, ACR, and GCR.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Link
              href="/code/container-security"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#0F172A',
                backgroundColor: '#F1F5F9',
                border: '1px solid #E2E8F0',
                padding: '5px 12px',
                borderRadius: '6px',
                textDecoration: 'none',
              }}
            >
              <span>Container Center</span>
              <ExternalLink size={12} />
            </Link>
            <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', background: 'var(--color-surface)', padding: '5px 10px', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
              Images Scanned: <strong style={{ color: 'var(--color-text-primary)' }}>{total}</strong>
            </span>
          </div>
        </div>

        {error && (
          <div style={{ padding: '12px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontSize: '12px', marginBottom: '20px' }}>
            {error}
          </div>
        )}

        {isLoading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>
            <RefreshCw size={15} className="animate-spin" style={{ marginRight: '6px' }} />
            Loading container security catalog...
          </div>
        ) : images.length === 0 ? (
          <div
            style={{
              padding: '60px',
              textAlign: 'center',
              background: 'var(--color-surface)',
              border: '1px dashed var(--color-border)',
              borderRadius: '8px',
            }}
          >
            <Container size={36} style={{ color: 'var(--color-text-muted)', margin: '0 auto 12px auto' }} />
            <h3 style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--color-text-primary)', margin: '0 0 4px 0' }}>
              No Container Images Found
            </h3>
            <p style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', maxWidth: '400px', margin: '0 auto 16px auto' }}>
              Connect container registries or push container images during CI/CD to inspect vulnerability reports and signatures.
            </p>
            <Link
              href="/code/container-security"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#FFFFFF',
                backgroundColor: '#09090B',
                border: '1px solid #09090B',
                padding: '6px 14px',
                borderRadius: '6px',
                textDecoration: 'none',
              }}
            >
              <span>Open Container Security Center</span>
              <ExternalLink size={12} />
            </Link>
          </div>
        ) : (
          <div
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              overflow: 'hidden',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'rgba(255,255,255,0.02)' }}>
                  <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)', fontSize: '11px' }}>IMAGE REPOSITORY &amp; TAG</th>
                  <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)', fontSize: '11px' }}>REGISTRY</th>
                  <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)', fontSize: '11px' }}>DIGEST</th>
                  <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)', fontSize: '11px' }}>SBOM</th>
                  <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)', fontSize: '11px' }}>SIGNATURE</th>
                  <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)', fontSize: '11px' }}>CRITICAL CVEs</th>
                  <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)', fontSize: '11px' }}>HIGH CVEs</th>
                  <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)', fontSize: '11px' }}>SCANNED</th>
                </tr>
              </thead>
              <tbody>
                {images.map((img) => (
                  <tr key={img.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: '600', color: 'var(--color-text-primary)' }}>
                        {img.image_name}:{img.tag}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--color-text-secondary)', fontSize: '11px' }}>
                      {img.registry}
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '11px', color: 'var(--color-text-muted)' }}>
                      {img.digest.substring(0, 16)}...
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {img.sbom_available ? (
                        <span style={{ color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '11px' }}>
                          <CheckCircle2 size={12} /> Yes
                        </span>
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '11px' }}>No</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {img.signature_verified ? (
                        <span style={{ color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '11px', fontWeight: '600' }}>
                          <CheckCircle2 size={12} /> Verified
                        </span>
                      ) : (
                        <span style={{ color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '11px' }}>
                          <XCircle size={12} /> Unsigned
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {img.vulnerabilities_critical > 0 ? (
                        <span style={{ color: '#ef4444', fontWeight: 'bold' }}>{img.vulnerabilities_critical}</span>
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)' }}>0</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {img.vulnerabilities_high > 0 ? (
                        <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>{img.vulnerabilities_high}</span>
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)' }}>0</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--color-text-muted)', fontSize: '11px' }}>
                      {img.last_scanned_at ? new Date(img.last_scanned_at).toLocaleDateString() : 'Pending'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </CloudWorkshell>
  );
}
