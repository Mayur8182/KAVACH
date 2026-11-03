import { toast } from '@/lib/toast';

/**
 * Standardized Feedback Helpers for Kavach Cybersecurity Workflows
 */
export const feedback = {
  scanCompleted: (findingsCount: number, repoName: string) => {
    if (findingsCount === 0) {
      toast.success('Security Scan Passed', {
        description: `All deterministic scanners completed clean for ${repoName}. Zero vulnerabilities found.`,
      });
    } else {
      toast.warning('Security Scan Completed with Findings', {
        description: `${findingsCount} vulnerability findings detected for ${repoName}. Triage recommended.`,
      });
    }
  },

  scanFailed: (repoName: string, reason?: string) => {
    toast.error('Security Scan Execution Failed', {
      description: reason || `Scan failed for ${repoName}. Ensure target workspace exists and tools are reachable.`,
    });
  },

  prCreated: (prNumber: number, prUrl: string, repoName: string) => {
    toast.success(`Pull Request #${prNumber} Created`, {
      description: `Automated remediation patch submitted to ${repoName}.`,
    });
  },

  permissionDenied: (resource: string, requiredTier = 'SecOps Tier 3') => {
    toast.error('Permission Denied', {
      description: `Access restricted for ${resource}. Requires ${requiredTier} authorization.`,
    });
  },

  networkOffline: () => {
    toast.error('Network Offline', {
      description: 'Connection severed. Running in local encrypted buffer cache mode.',
    });
  },

  networkRestored: () => {
    toast.success('Network Connection Restored', {
      description: 'Reconnected to Kavach SecOps control plane. Buffers synced.',
    });
  },

  policyEnforced: (policyName: string) => {
    toast.success('Policy Enforced', {
      description: `Policy "${policyName}" active across all monitored workloads.`,
    });
  },
};

export default feedback;
