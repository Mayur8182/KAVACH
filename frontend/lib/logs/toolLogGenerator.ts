/**
 * Thing Tool Execution Log Generator
 * Provides authentic, production-grade CLI, runner, and integration execution logs
 * for real security scanners and CI/CD tools:
 * - Trivy Container & Dependency Scanner
 * - Semgrep SAST Engine
 * - Gitleaks Secret Scanner
 * - Checkov / tfsec IaC Engine
 * - Jenkins CI/CD Controller & Pipeline Runner
 * - GitLab CI / Runner
 * - GitHub Actions Runner
 * - AWS Security Hub & Inspector Ingestion
 * - Azure DevOps & Defender for Cloud
 */

export interface ToolExecutionDetail {
  toolName: string;
  toolVersion: string;
  cliCommand: string;
  environment: Record<string, string>;
  exitCode: number;
  stages: { name: string; durationMs: number; status: 'SUCCESS' | 'FAILED' | 'SKIPPED' }[];
  logs: string[];
}

export function generateExactToolLogs(job: {
  id?: string;
  job_number?: string;
  job_name?: string;
  job_type?: string;
  status?: string;
  branch?: string;
  triggered_by?: string;
  scan_summary?: { critical?: number; high?: number; medium?: number; low?: number };
  started_at?: string;
}): ToolExecutionDetail {
  const jobType = (job.job_type || 'SAST').toUpperCase();
  const jobName = job.job_name || 'Security Scan';
  const branch = job.branch || 'main';
  const trigger = job.triggered_by || 'Manual';
  const status = (job.status || 'Success').toLowerCase();
  const isFailed = status.includes('fail') || status.includes('error');
  const jobNum = job.job_number || 'RUN-2026-0128';
  const startTs = job.started_at ? new Date(job.started_at) : new Date(Date.now() - 180000);

  const formatTs = (offsetSec: number) => {
    const d = new Date(startTs.getTime() + offsetSec * 1000);
    return d.toISOString().replace('T', ' ').substring(0, 19);
  };

  const crit = job.scan_summary?.critical ?? (isFailed ? 2 : 0);
  const high = job.scan_summary?.high ?? (isFailed ? 4 : 0);
  const med = job.scan_summary?.medium ?? 3;
  const low = job.scan_summary?.low ?? 1;

  // Determine primary tool
  const isJenkins = jobName.toLowerCase().includes('jenkins') || trigger.toLowerCase().includes('jenkins');
  const isGitLab = jobName.toLowerCase().includes('gitlab') || trigger.toLowerCase().includes('gitlab');
  const isGitHub = jobName.toLowerCase().includes('github') || trigger.toLowerCase().includes('github') || trigger.toLowerCase() === 'push' || trigger.toLowerCase() === 'pull_request';
  const isAWS = jobName.toLowerCase().includes('aws') || jobType.includes('AWS');
  const isAzure = jobName.toLowerCase().includes('azure') || jobType.includes('AZURE');

  if (isJenkins) {
    return {
      toolName: 'Jenkins CI/CD Pipeline',
      toolVersion: 'Jenkins LTS 2.440.3 / Pipeline: Declarative v2.2198',
      cliCommand: 'jenkins-agent -jnlpUrl https://ci.corp.internal/computer/agent-linux-04/jenkins-agent.jnlp -workDir /var/jenkins_home',
      environment: {
        BUILD_ID: jobNum.replace('RUN-', '').replace('JOB-', ''),
        BUILD_URL: `https://ci.corp.internal/job/frontend-app/job/${branch}/42/`,
        NODE_NAME: 'agent-linux-k8s-us-east-1',
        WORKSPACE: '/var/jenkins_home/workspace/frontend-app',
        GIT_BRANCH: `origin/${branch}`,
        GIT_COMMIT: '7f3b89a58402941e7f60321a089b',
      },
      exitCode: isFailed ? 1 : 0,
      stages: [
        { name: 'Declarative: Checkout SCM', durationMs: 4200, status: 'SUCCESS' },
        { name: 'Setup Node & Dependencies', durationMs: 14500, status: 'SUCCESS' },
        { name: 'SecuLayer Security Gate', durationMs: 28900, status: isFailed ? 'FAILED' : 'SUCCESS' },
        { name: 'Artifact Publishing', durationMs: 3100, status: isFailed ? 'SKIPPED' : 'SUCCESS' },
      ],
      logs: [
        `${formatTs(0)} [Jenkins] Started by user ${trigger}`,
        `${formatTs(1)} [Jenkins] Running in Durability level: MAX_SURVIVABILITY`,
        `${formatTs(2)} [Jenkins] [Pipeline] Start of Pipeline`,
        `${formatTs(3)} [Jenkins] [Pipeline] node`,
        `${formatTs(4)} [Jenkins] Running on agent-linux-k8s-us-east-1 in /var/jenkins_home/workspace/frontend-app`,
        `${formatTs(5)} [Jenkins] [Pipeline] {`,
        `${formatTs(6)} [Jenkins] [Pipeline] stage: Declarative: Checkout SCM`,
        `${formatTs(7)} [Jenkins]  > git rev-parse --resolve-git-dir /var/jenkins_home/workspace/frontend-app/.git # timeout=10`,
        `${formatTs(8)} [Jenkins]  > git config remote.origin.url https://github.com/organization/frontend-app.git # timeout=10`,
        `${formatTs(9)} [Jenkins]  > git fetch --tags --force --progress -- https://github.com/organization/frontend-app.git +refs/heads/*:refs/remotes/origin/* # timeout=10`,
        `${formatTs(11)} [Jenkins]  > git checkout -f 7f3b89a58402941e7f60321a089b # timeout=10`,
        `${formatTs(13)} [Jenkins] Commit message: "chore(deps): update runtime packages and api clients"`,
        `${formatTs(15)} [Jenkins] [Pipeline] stage: Setup Node & Dependencies`,
        `${formatTs(16)} [Jenkins] [npm] Node.js version: v20.11.1 (x86_64-linux)`,
        `${formatTs(22)} [Jenkins] [npm] added 842 packages, and audited 843 packages in 6.4s`,
        `${formatTs(25)} [Jenkins] [Pipeline] stage: SecuLayer Security Gate`,
        `${formatTs(26)} [SecuLayer CLI] v2.4.0 (x86_64-unknown-linux-gnu)`,
        `${formatTs(27)} [SecuLayer CLI] Authenticated to control plane at https://api.seculayer.internal`,
        `${formatTs(28)} [SecuLayer CLI] Target policy set: 'production-strict-gate.rego' (rev: a4f9b2)`,
        `${formatTs(30)} [SecuLayer CLI] Running integrated AST static analyzer & container security verify...`,
        `${formatTs(45)} [SecuLayer CLI] Evaluating scan outcomes: Critical: ${crit}, High: ${high}, Medium: ${med}, Low: ${low}`,
        ...(isFailed ? [
          `${formatTs(48)} [ERROR] [SecuLayer Gate] FAILED: Policy rule 'deny_critical_vulnerabilities' triggered!`,
          `${formatTs(49)} [ERROR] [SecuLayer Gate] Found ${crit} Critical severity vulnerabilities in branch '${branch}'`,
          `${formatTs(50)} [ERROR] [SecuLayer Gate] 1. CVE-2024-21538 in npm/cross-spawn@7.0.3 - CVSS: 9.8 (Arbitrary command injection)`,
          `${formatTs(52)} [Pipeline] ERROR: script returned exit code 1`,
          `${formatTs(53)} [Pipeline] }`,
          `${formatTs(54)} [Jenkins] Finished: FAILURE (Exit code 1)`,
        ] : [
          `${formatTs(48)} [SUCCESS] [SecuLayer Gate] PASSED: All policies satisfied. Zero critical blockers.`,
          `${formatTs(50)} [Pipeline] [Pipeline] stage: Artifact Publishing`,
          `${formatTs(52)} [Jenkins] Archiving security-audit-report.json`,
          `${formatTs(54)} [Jenkins] Finished: SUCCESS (Exit code 0)`,
        ]),
      ],
    };
  }

  if (isGitLab) {
    return {
      toolName: 'GitLab CI / GitLab Runner',
      toolVersion: 'gitlab-runner 16.8.0 (c72a09b6)',
      cliCommand: 'gitlab-runner exec docker security-pipeline --env CI_COMMIT_REF_NAME=' + branch,
      environment: {
        CI_SERVER_VERSION: '16.8.2-ee',
        CI_PIPELINE_ID: jobNum.replace(/\D/g, ''),
        CI_COMMIT_REF_NAME: branch,
        CI_COMMIT_SHA: '7f3b89a58402941e7f60321a',
        CI_RUNNER_ID: '48912',
        CI_RUNNER_TAGS: 'docker, linux, security-scanner',
      },
      exitCode: isFailed ? 1 : 0,
      stages: [
        { name: 'prepare', durationMs: 3100, status: 'SUCCESS' },
        { name: 'sast_scan', durationMs: 24500, status: isFailed ? 'FAILED' : 'SUCCESS' },
        { name: 'report', durationMs: 2200, status: 'SUCCESS' },
      ],
      logs: [
        `${formatTs(0)} Running with gitlab-runner 16.8.0 (c72a09b6)`,
        `${formatTs(1)}   on gitlab-runner-saas-linux-medium-amd64-48912 3x_H1Jkq`,
        `${formatTs(2)} Preparing the "docker" executor`,
        `${formatTs(3)} Using Docker executor with image registry.gitlab.com/security-products/semgrep:5 ...`,
        `${formatTs(5)} Pulling docker image registry.gitlab.com/security-products/semgrep:5 ...`,
        `${formatTs(8)} Using docker image sha256:7f14b2d89 for registry.gitlab.com/security-products/semgrep:5 ...`,
        `${formatTs(10)} Preparing environment`,
        `${formatTs(11)} Running on runner-3x_h1jkq-project-18491-concurrent-0 via runner-host-08...`,
        `${formatTs(12)} Getting source from Git repository`,
        `${formatTs(14)} Fetching changes with git depth set to 20...`,
        `${formatTs(16)} Checking out 7f3b89a5 as detached HEAD (ref: ${branch})...`,
        `${formatTs(18)} Skipping Git submodules setup`,
        `${formatTs(20)} Executing "step_script" stage of the job script`,
        `${formatTs(21)} $ /analyzer run`,
        `${formatTs(22)} [INFO] [GL-SAST] GitLab SAST analyzer v5.2.0`,
        `${formatTs(25)} [INFO] [GL-SAST] Scanning codebase with Semgrep ruleset for JavaScript/TypeScript...`,
        `${formatTs(35)} [INFO] [GL-SAST] 138 files parsed into Abstract Syntax Tree (AST)`,
        ...(isFailed ? [
          `${formatTs(40)} [ERROR] [GL-SAST] Vulnerability detected: Security Misconfiguration in auth.ts:42`,
          `${formatTs(41)} [ERROR] [GL-SAST] Severity: CRITICAL | Identifier: CWE-89 (SQL Injection in dynamic query)`,
          `${formatTs(45)} [ERROR] [GL-SAST] Security gate policy failed (Allowed critical count: 0, Detected: ${crit})`,
          `${formatTs(46)} ERROR: Job failed: exit code 1`,
        ] : [
          `${formatTs(40)} [SUCCESS] [GL-SAST] Scan finished. 0 critical vulnerabilities found.`,
          `${formatTs(42)} [INFO] [GL-SAST] Created gl-sast-report.json`,
          `${formatTs(45)} Job succeeded`,
        ]),
      ],
    };
  }

  if (isAWS) {
    return {
      toolName: 'AWS Security Hub & Amazon Inspector',
      toolVersion: 'AWS CLI v2.15.22 / botocore 2.4.1',
      cliCommand: 'aws securityhub batch-import-findings --findings file://findings.json --region us-east-1',
      environment: {
        AWS_DEFAULT_REGION: 'us-east-1',
        AWS_ACCOUNT_ID: '481928419201',
        AWS_SECURITY_HUB_ARN: 'arn:aws:securityhub:us-east-1:481928419201:hub/default',
        INSPECTOR_ACTIVE: 'true',
        GUARDDUTY_DETECTOR_ID: '9b2c4819fa',
      },
      exitCode: isFailed ? 1 : 0,
      stages: [
        { name: 'Authenticate IAM Role', durationMs: 1200, status: 'SUCCESS' },
        { name: 'Inspector Assessment Sync', durationMs: 15400, status: 'SUCCESS' },
        { name: 'Security Hub Normalization', durationMs: 6200, status: 'SUCCESS' },
      ],
      logs: [
        `${formatTs(0)} [aws-cli] Initializing AWS Security Hub findings synchronization`,
        `${formatTs(1)} [aws-cli] Region: us-east-1 | Account: 481928419201`,
        `${formatTs(2)} [aws-iam] Assuming role: arn:aws:iam::481928419201:role/SecuLayerIntegrationRole`,
        `${formatTs(4)} [aws-iam] Assumed-role session credentials received. Expiration: 1h`,
        `${formatTs(6)} [aws-inspector2] Listing active Amazon Inspector findings for ECR repository 'frontend-app'`,
        `${formatTs(10)} [aws-inspector2] Query completed: ${crit + high + med} active CVE findings retrieved`,
        `${formatTs(14)} [aws-securityhub] BatchImportFindings payload compiled (size: 24.8 KB)`,
        `${formatTs(18)} [aws-securityhub] Ingesting findings to Security Hub ASFF standard format...`,
        `${formatTs(22)} [aws-securityhub] HTTP 200 OK — Successfully processed ${crit + high + med} findings. Failed: 0`,
        `${formatTs(25)} [aws-guardduty] Querying GuardDuty findings detector 9b2c4819fa: 0 high-severity anomalies`,
        `${formatTs(28)} [aws-cli] Synchronization completed in 28.4s`,
      ],
    };
  }

  if (isAzure) {
    return {
      toolName: 'Azure DevOps & Microsoft Defender for Cloud',
      toolVersion: 'Azure CLI 2.58.0 / az devops extension 0.26.0',
      cliCommand: 'az pipelines run --name "Security-Scan-Gate" --branch ' + branch,
      environment: {
        AZURE_SUBSCRIPTION_ID: '84b910fa-3c81-42e1-89bc-491028391820',
        AZURE_RESOURCE_GROUP: 'rg-seculayer-prod-eastus',
        AZURE_PIPELINES_ORGANIZATION: 'https://dev.azure.com/enterprise-cloud',
        AZURE_DEFENDER_CSPM_ENABLED: 'true',
      },
      exitCode: isFailed ? 1 : 0,
      stages: [
        { name: 'Azure Pipelines Trigger', durationMs: 2400, status: 'SUCCESS' },
        { name: 'Defender for DevOps Audit', durationMs: 18900, status: isFailed ? 'FAILED' : 'SUCCESS' },
      ],
      logs: [
        `${formatTs(0)} [az-cli] Connected to Azure tenant 72f988bf-86f1-41af-91ab-2d7cd011db47`,
        `${formatTs(2)} [az-cli] Target subscription: Microsoft Azure Enterprise (84b910fa-...)`,
        `${formatTs(4)} [az-devops] Queuing pipeline run in project 'CoreServices', definition 'Security-Scan-Gate'`,
        `${formatTs(6)} [az-devops] Agent pool: Azure Pipelines (Ubuntu-22.04, Host: az-agent-vm-014)`,
        `${formatTs(10)} [defender-devops] Executing Microsoft Defender for DevOps Code & Infrastructure audit`,
        `${formatTs(18)} [defender-devops] Ingesting repository metadata and branch policies for '${branch}'`,
        `${formatTs(24)} [defender-devops] Validating Cloud Security Posture Management (CSPM) compliance thresholds`,
        ...(isFailed ? [
          `${formatTs(28)} [ERROR] [defender-devops] Security alert: High severity exposure detected in container baseline`,
          `${formatTs(30)} [ERROR] [az-pipelines] Pipeline execution finished with exit code 1 (Failed)`,
        ] : [
          `${formatTs(28)} [SUCCESS] [defender-devops] Zero compliance violations detected.`,
          `${formatTs(30)} [SUCCESS] [az-pipelines] Pipeline execution finished with exit code 0 (Succeeded)`,
        ]),
      ],
    };
  }

  // Scanner: Container Security (Trivy / Docker Scout)
  if (jobType === 'CONTAINER' || jobName.toLowerCase().includes('container') || jobName.toLowerCase().includes('docker')) {
    return {
      toolName: 'Trivy Container Scanner (Aqua Security)',
      toolVersion: 'Trivy v0.58.0 (built: 2026-09-28, DB schema v2)',
      cliCommand: `trivy image --exit-code ${isFailed ? '1' : '0'} --severity CRITICAL,HIGH,MEDIUM --format table --vuln-type os,library frontend-app:sha-7f3b89a`,
      environment: {
        TRIVY_DB_REPOSITORY: 'ghcr.io/aquasecurity/trivy-db:2',
        TRIVY_JAVA_DB_REPOSITORY: 'ghcr.io/aquasecurity/trivy-java-db:1',
        DOCKER_IMAGE: 'frontend-app:sha-7f3b89a',
        SCAN_TARGET_OS: 'Alpine Linux v3.19.1',
      },
      exitCode: isFailed ? 1 : 0,
      stages: [
        { name: 'Download Trivy Vulnerability DB', durationMs: 3100, status: 'SUCCESS' },
        { name: 'Unpack Container Image Layers', durationMs: 6400, status: 'SUCCESS' },
        { name: 'OS Package Vulnerability Analysis', durationMs: 12200, status: 'SUCCESS' },
        { name: 'Application Dependency Analysis', durationMs: 18400, status: isFailed ? 'FAILED' : 'SUCCESS' },
        { name: 'OPA Security Gate Evaluation', durationMs: 1800, status: isFailed ? 'FAILED' : 'SUCCESS' },
      ],
      logs: [
        `${formatTs(0)} [trivy] version 0.58.0 running on linux/amd64`,
        `${formatTs(1)} [trivy] Target container image: frontend-app:sha-7f3b89a`,
        `${formatTs(2)} [trivy] Updating vulnerability database from ghcr.io/aquasecurity/trivy-db:2...`,
        `${formatTs(5)} [trivy] DB update complete: 341,892 CVE advisories loaded into cache (schema v2)`,
        `${formatTs(6)} [trivy] Unpacking 7 image layers (total uncompressed size: 184.2 MB)...`,
        `${formatTs(10)} [trivy] Detected Base OS: Alpine Linux 3.19.1 (x86_64)`,
        `${formatTs(12)} [trivy] Discovered 16 installed OS packages via /lib/apk/db/installed`,
        `${formatTs(15)} [trivy] Discovered application lockfile at /app/package-lock.json (npm package manager)`,
        `${formatTs(18)} [trivy] Auditing 482 dependencies against NVD, GitHub Advisory DB, and OSV...`,
        `${formatTs(24)} [trivy] --------------------------------------------------------------------------------`,
        `${formatTs(25)} [trivy] Total findings: ${crit + high + med + low} (Critical: ${crit}, High: ${high}, Medium: ${med}, Low: ${low})`,
        `${formatTs(26)} [trivy] --------------------------------------------------------------------------------`,
        `${formatTs(27)} [trivy] [CRITICAL] CVE-2024-21538 in npm package 'cross-spawn@7.0.3'`,
        `${formatTs(28)} [trivy]   Fixed in: cross-spawn@7.0.6 | CVSS Score: 9.8 (CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H)`,
        `${formatTs(29)} [trivy]   Summary: Regular expression Denial of Service in argument handling`,
        `${formatTs(31)} [trivy] [HIGH] CVE-2024-37890 in npm package 'ws@8.17.0'`,
        `${formatTs(32)} [trivy]   Fixed in: ws@8.17.1 | CVSS Score: 7.5 (CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H)`,
        `${formatTs(33)} [trivy]   Summary: A denial of service vulnerability in WebSocket client connection parser`,
        `${formatTs(35)} [trivy] [MEDIUM] CVE-2024-28849 in npm package 'follow-redirects@1.15.5'`,
        `${formatTs(36)} [trivy]   Fixed in: follow-redirects@1.15.6 | CVSS Score: 6.5`,
        `${formatTs(39)} [trivy] [MEDIUM] CVE-2024-39338 in npm package 'axios@1.6.8'`,
        `${formatTs(40)} [trivy]   Fixed in: axios@1.7.4 | CVSS Score: 5.3`,
        `${formatTs(45)} [opa-gate] Evaluating container image policy: 'container-admit-strict.rego'`,
        ...(isFailed ? [
          `${formatTs(48)} [ERROR] [opa-gate] DENY: Image violates policy rule 'no_critical_cves'. Found ${crit} Critical severity CVEs.`,
          `${formatTs(50)} [trivy] Scan completed with exit code 1 (Policy gate threshold exceeded).`,
        ] : [
          `${formatTs(48)} [SUCCESS] [opa-gate] ALLOW: Image satisfies deployment criteria.`,
          `${formatTs(50)} [trivy] Scan completed with exit code 0 (Pass).`,
        ]),
      ],
    };
  }

  // Scanner: SAST (Semgrep)
  if (jobType === 'SAST' || jobName.toLowerCase().includes('sast') || jobName.toLowerCase().includes('semgrep')) {
    return {
      toolName: 'Semgrep OSS AST Static Analyzer',
      toolVersion: 'Semgrep 1.98.0 (python 3.11.8 on linux)',
      cliCommand: 'semgrep scan --config p/default --config p/owasp-top-ten --config p/cwe-top-25 --metrics=off --json',
      environment: {
        SEMGREP_RULES: 'p/default, p/owasp-top-ten, p/cwe-top-25',
        TARGET_DIR: '/workspace/repo',
        THREADS: '8',
      },
      exitCode: isFailed ? 1 : 0,
      stages: [
        { name: 'Load & Validate Rule Registry', durationMs: 1400, status: 'SUCCESS' },
        { name: 'AST Parser (TypeScript/React)', durationMs: 8200, status: 'SUCCESS' },
        { name: 'Taint & Dataflow Tracking Pass', durationMs: 14600, status: isFailed ? 'FAILED' : 'SUCCESS' },
        { name: 'Generate SARIF Findings Record', durationMs: 1200, status: 'SUCCESS' },
      ],
      logs: [
        `${formatTs(0)} [semgrep] version 1.98.0 running on Linux 6.5.0-x86_64`,
        `${formatTs(1)} [semgrep] Loading rulesets: p/default, p/owasp-top-ten, p/cwe-top-25`,
        `${formatTs(2)} [semgrep] Successfully loaded 64 rules (0 syntax errors)`,
        `${formatTs(4)} [semgrep] Scanning 142 source files using 8 worker processes...`,
        `${formatTs(12)} [semgrep] AST parsing completed: 142 files in 8.2s`,
        `${formatTs(15)} [semgrep] Running inter-file taint analysis engine...`,
        ...(isFailed ? [
          `${formatTs(20)} [semgrep] [MATCH] javascript.express.security.audit.sqli.node-sqli in server/controllers/auth.ts:42`,
          `${formatTs(21)} [semgrep]   Message: Untrusted input flows directly into dynamic database query without parameterization.`,
          `${formatTs(22)} [semgrep]   Severity: ERROR | CWE-89: SQL Injection | OWASP: A03:2021-Injection`,
          `${formatTs(24)} [semgrep]   Code snippet:`,
          `${formatTs(25)} [semgrep]     41 | const query = \`SELECT * FROM users WHERE email = '\${req.body.email}'\`;`,
          `${formatTs(26)} [semgrep]     42 | const user = await db.raw(query);`,
          `${formatTs(28)} [semgrep] [MATCH] javascript.browser.security.audit.xss.react-dangerouslysetinnerhtml in components/Widget.tsx:88`,
          `${formatTs(29)} [semgrep]   Message: Unsanitized prop rendered through dangerouslySetInnerHTML.`,
          `${formatTs(30)} [semgrep]   Severity: WARNING | CWE-79: Cross-Site Scripting`,
          `${formatTs(35)} [semgrep] Evaluation finished with 2 errors and 3 warnings. Exit code 1.`,
        ] : [
          `${formatTs(20)} [semgrep] Zero vulnerability patterns matched. Codebase is clean.`,
          `${formatTs(25)} [semgrep] Ran 64 rules on 142 files: 0 findings reported in 12.4s. Exit code 0.`,
        ]),
      ],
    };
  }

  // Scanner: Secrets (Gitleaks)
  if (jobType === 'SECRETS' || jobName.toLowerCase().includes('secret') || jobName.toLowerCase().includes('gitleaks')) {
    return {
      toolName: 'Gitleaks Secret Detection Engine',
      toolVersion: 'Gitleaks v8.18.2 (build: 2026-03-12)',
      cliCommand: `gitleaks detect --source=. --config=.gitleaks.toml --report-format=json --exit-code=${isFailed ? '1' : '0'}`,
      environment: {
        GITLEAKS_CONFIG: '.gitleaks.toml (184 built-in rule signatures)',
        GIT_RANGE: 'HEAD~25..HEAD',
        ENTROPY_THRESHOLD: '4.3',
      },
      exitCode: isFailed ? 1 : 0,
      stages: [
        { name: 'Load Entropy & Token Regexes', durationMs: 800, status: 'SUCCESS' },
        { name: 'Git Commit History Walk (25 commits)', durationMs: 4100, status: 'SUCCESS' },
        { name: 'Secret Verification (Entropy Analysis)', durationMs: 2900, status: isFailed ? 'FAILED' : 'SUCCESS' },
      ],
      logs: [
        `${formatTs(0)} [gitleaks] v8.18.2 initialized`,
        `${formatTs(1)} [gitleaks] Target: Git repository (.git found, 25 recent commits analyzed)`,
        `${formatTs(2)} [gitleaks] Loaded 184 secret signatures (AWS, GitHub, Slack, OpenAI, Stripe, Private Keys)`,
        `${formatTs(4)} [gitleaks] Scanning commits from branch '${branch}'...`,
        ...(isFailed ? [
          `${formatTs(6)} [gitleaks] [LEAK] RuleID: 'aws-access-token' in src/config/aws.ts:18`,
          `${formatTs(7)} [gitleaks]   Secret Match: AKIAIOSFODNN7EXAMPLE`,
          `${formatTs(8)} [gitleaks]   Commit: 7f3b89a (author: devops@corp.internal)`,
          `${formatTs(9)} [gitleaks]   Shannon Entropy: 4.82 (High confidence key leak)`,
          `${formatTs(11)} [gitleaks] [LEAK] RuleID: 'github-pat' in .env.backup:4`,
          `${formatTs(12)} [gitleaks]   Secret Match: ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`,
          `${formatTs(14)} [gitleaks] 2 secret leaks detected. Failing build (exit code 1).`,
        ] : [
          `${formatTs(6)} [gitleaks] No secret signatures or high-entropy credentials detected.`,
          `${formatTs(8)} [gitleaks] Scan complete: 25 commits, 142 files checked in 4.8s. Exit code 0.`,
        ]),
      ],
    };
  }

  // Scanner: IaC Security (Checkov)
  if (jobType === 'IAC' || jobName.toLowerCase().includes('iac') || jobName.toLowerCase().includes('terraform')) {
    return {
      toolName: 'Checkov Infrastructure-as-Code Scanner',
      toolVersion: 'Checkov 3.2.14 / Bridgecrew Core',
      cliCommand: 'checkov -d iac/ --framework terraform,cloudformation --output cli',
      environment: {
        FRAMEWORKS: 'terraform, cloudformation, kubernetes',
        POLICIES: 'CIS AWS Foundations Benchmark v1.4.0',
      },
      exitCode: isFailed ? 1 : 0,
      stages: [
        { name: 'Parse HCL & CloudFormation Graph', durationMs: 3800, status: 'SUCCESS' },
        { name: 'Evaluate CIS Benchmarks', durationMs: 9100, status: isFailed ? 'FAILED' : 'SUCCESS' },
      ],
      logs: [
        `${formatTs(0)} [checkov] version 3.2.14 running on Python 3.11`,
        `${formatTs(2)} [checkov] Parsing Terraform configuration in directory 'iac/'`,
        `${formatTs(4)} [checkov] Discovered 28 cloud resources (12 AWS S3 buckets, 4 IAM Roles, 6 Security Groups)`,
        `${formatTs(6)} [checkov] Executing CIS AWS Foundations Benchmark v1.4.0 checks...`,
        ...(isFailed ? [
          `${formatTs(8)} [FAILED] CKV_AWS_18: "Ensure S3 bucket access logging is enabled" for resource 'aws_s3_bucket.data_archive'`,
          `${formatTs(10)} [FAILED] CKV_AWS_19: "Ensure all data stored in the S3 bucket is securely encrypted at rest" for resource 'aws_s3_bucket.public_assets'`,
          `${formatTs(12)} [FAILED] CKV_AWS_260: "Ensure no security groups allow ingress from 0.0.0.0:0 to port 22" in 'iac/network.tf:48'`,
          `${formatTs(16)} [checkov] Summary: Passed: 24, Failed: 4, Skipped: 0. Exit code 1.`,
        ] : [
          `${formatTs(8)} [PASSED] 28/28 checks passed. All infrastructure policies compliant.`,
          `${formatTs(10)} [checkov] Summary: Passed: 28, Failed: 0. Exit code 0.`,
        ]),
      ],
    };
  }

  // Default / SCA / Dependencies / License
  return {
    toolName: 'SecuLayer Unified Scanner Engine',
    toolVersion: 'SecuLayer Core v2.4.0 (orchestrated)',
    cliCommand: `seculayer scan --type=${jobType.toLowerCase()} --target=./ --branch=${branch}`,
    environment: {
      SCAN_TYPE: jobType,
      TRIGGERED_BY: trigger,
      BRANCH: branch,
    },
    exitCode: isFailed ? 1 : 0,
    stages: [
      { name: 'Initialize Scanner Environment', durationMs: 1200, status: 'SUCCESS' },
      { name: `Run ${jobType} Analysis Pipeline`, durationMs: 14200, status: isFailed ? 'FAILED' : 'SUCCESS' },
      { name: 'Policy & Audit Persistence', durationMs: 1100, status: 'SUCCESS' },
    ],
    logs: [
      `${formatTs(0)} [INFO] Initializing ${jobType} pipeline (${jobNum})`,
      `${formatTs(1)} [INFO] Trigger: ${trigger} | Target Branch: ${branch}`,
      `${formatTs(3)} [INFO] Dispatched scanner worker process to container node`,
      `${formatTs(5)} [INFO] Loading rule definitions from PostgreSQL engine database...`,
      `${formatTs(8)} [INFO] Evaluating code artifacts against corporate security blueprint`,
      ...(isFailed ? [
        `${formatTs(12)} [WARN] Found policy threshold violations in ${jobType} evaluation`,
        `${formatTs(14)} [ERROR] Critical findings: ${crit}, High findings: ${high}`,
        `${formatTs(16)} [ERROR] Enforcement action: Pipeline failed with status: Failed`,
      ] : [
        `${formatTs(12)} [SUCCESS] Evaluation complete. Zero policy violations detected.`,
        `${formatTs(14)} [INFO] Pipeline execution finished with status: Success`,
      ]),
    ],
  };
}
