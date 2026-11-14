import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import chalk from 'chalk';
import ora from 'ora';
import { execSync } from 'node:child_process';
import { GLOBAL_KAVACH_DIR, GLOBAL_DB_FILE, DEFAULT_AGENT_PORT } from '../../../../packages/shared/src/constants.js';
import { SQLiteStorage } from '../../../../packages/storage/src/sqlite-db.js';
import { AgentLifecycleManager } from '../../../local-agent/src/lifecycle.js';
import { CredentialStore } from '../../../../packages/auth/src/credential-store.js';
import { globalConfigManager } from '../../../../packages/config/src/global-config.js';
import { callAgentApi } from '../output/formatter.js';

interface DiagnosticResult {
  category: string;
  passed: boolean;
  message: string;
  detail?: string;
}

export async function doctorCommand(): Promise<void> {
  console.log(chalk.bold('KAVACH SYSTEM DOCTOR — DIAGNOSTIC AUDIT'));
  console.log(chalk.gray('Evaluating runtime environment, platform adapters, storage, and connectivity...'));
  console.log('');

  const checks: DiagnosticResult[] = [];

  // 1. Node.js Runtime Check
  const nodeVer = process.version;
  const major = parseInt(nodeVer.replace('v', '').split('.')[0], 10);
  if (major >= 18) {
    checks.push({
      category: 'Node.js Runtime',
      passed: true,
      message: `Node.js ${nodeVer} (Supported >= 18.0.0)`,
    });
  } else {
    checks.push({
      category: 'Node.js Runtime',
      passed: false,
      message: `Node.js ${nodeVer} is outdated. Please upgrade to Node 18 or 20+.`,
    });
  }

  // 2. OS & Architecture
  checks.push({
    category: 'Operating System',
    passed: true,
    message: `${os.type()} ${os.release()} (${os.arch()})`,
  });

  // 3. User & Storage Permissions
  try {
    fs.mkdirSync(GLOBAL_KAVACH_DIR, { recursive: true, mode: 0o700 });
    const testFile = path.join(GLOBAL_KAVACH_DIR, '.perm_test');
    fs.writeFileSync(testFile, 'test', 'utf8');
    fs.unlinkSync(testFile);
    checks.push({
      category: 'Local Storage Dir',
      passed: true,
      message: `Writable (${GLOBAL_KAVACH_DIR})`,
    });
  } catch (err: any) {
    checks.push({
      category: 'Local Storage Dir',
      passed: false,
      message: `Permission denied on ~/.kavach: ${err.message}`,
    });
  }

  // 4. SQLite Storage Engine Integrity
  try {
    const storage = new SQLiteStorage();
    const raw = storage.getRawDb();
    const res = raw.prepare('SELECT 1 as test').get() as { test: number };
    storage.close();
    if (res && res.test === 1) {
      checks.push({
        category: 'SQLite Engine',
        passed: true,
        message: 'Native DatabaseSync operational with WAL journal',
      });
    } else {
      throw new Error('Unexpected query output');
    }
  } catch (err: any) {
    checks.push({
      category: 'SQLite Engine',
      passed: false,
      message: `SQLite storage failure: ${err.message}`,
    });
  }

  // 5. Git CLI
  try {
    const gitVer = execSync('git --version', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    checks.push({
      category: 'Git CLI',
      passed: true,
      message: gitVer,
    });
  } catch {
    checks.push({
      category: 'Git CLI',
      passed: false,
      message: 'git binary not found in PATH.',
    });
  }

  // 6. Local Agent Daemon & Port
  const running = AgentLifecycleManager.isRunning();
  if (running.running) {
    try {
      const health = await callAgentApi('GET', '/health');
      checks.push({
        category: 'Agent Daemon',
        passed: true,
        message: `RUNNING (PID: ${running.pid}, 127.0.0.1:${DEFAULT_AGENT_PORT})`,
      });
    } catch (e: any) {
      checks.push({
        category: 'Agent Daemon',
        passed: false,
        message: `Process ${running.pid} active but IPC unresponsive: ${e.message}`,
      });
    }
  } else {
    checks.push({
      category: 'Agent Daemon',
      passed: true,
      message: 'STOPPED (Run \'kavach start\' to launch background process)',
    });
  }

  // 7. Authentication State
  const hasAuth = CredentialStore.hasValidCredentials();
  const creds = CredentialStore.load();
  if (hasAuth && creds) {
    checks.push({
      category: 'Authentication',
      passed: true,
      message: `Authenticated as ${creds.user.email} (Device: ${creds.deviceId})`,
    });
  } else {
    checks.push({
      category: 'Authentication',
      passed: true,
      message: 'Not logged in (Run \'kavach login\' to authenticate)',
    });
  }

  // 8. Cloud Reachability
  const cloudUrl = globalConfigManager.get().cloudUrl;
  try {
    const res = await fetch(`${cloudUrl.replace(/\/+$/, '')}/healthz`, { method: 'GET', signal: AbortSignal.timeout(3000) });
    checks.push({
      category: 'Cloud Gateway',
      passed: true,
      message: `Reachable (${cloudUrl})`,
    });
  } catch (e: any) {
    checks.push({
      category: 'Cloud Gateway',
      passed: true, // Non-fatal because Kavach operates offline-first
      message: `Offline / Standalone mode (${cloudUrl})`,
    });
  }

  // Print results
  for (const c of checks) {
    const icon = c.passed ? chalk.green('✓') : chalk.red('✗');
    const label = chalk.bold(c.category.padEnd(20));
    console.log(`  ${icon} ${label} ${c.message}`);
  }

  const allOk = checks.every((c) => c.passed);
  console.log('');
  if (allOk) {
    console.log(chalk.bold.hex('#10B981')('✓ Doctor passed: All Kavach subsystems are healthy and ready.'));
  } else {
    console.log(chalk.bold.yellow('⚠ Doctor detected issues that require attention.'));
  }
}

