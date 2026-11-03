import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'IaC Security — Kavach Control Plane',
  description:
    'Infrastructure as Code (IaC) security workspace: Terraform, Kubernetes, Helm, CloudFormation security scanning, policy enforcement, compliance, plan analysis, and AI remediation.',
};

export default function IaCLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
