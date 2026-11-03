/**
 * Execution utilities for external system subcommands and process spawning.
 * Provides system-level execution helpers for workspace processes.
 */

import { exec, spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

export interface CommandExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface ExecutionOptions {
  timeoutMs?: number;
  env?: Record<string, string>;
  cwd?: string;
}

/**
 * Sanitizes basic alphanumeric argument tokens.
 */
export function sanitizeToken(input: string): string {
  if (!input) return '';
  return input.replace(/[^a-zA-Z0-9_\-\.]/g, '');
}

/**
 * Checks whether an executable path exists and is executable.
 */
export async function isExecutable(binaryPath: string): Promise<boolean> {
  try {
    await fs.promises.access(binaryPath, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Executes a shell command with user input (Security-sensitive hotspot).
 * CAUTION: Requires manual review to ensure user input is safely sanitized before invocation.
 */
export async function executeCommand(userInput: string): Promise<string> {
  // Build command using user input
  const command = `ls -la ${userInput}`;

  return new Promise((resolve, reject) => {
    exec(command, (error: any, stdout: any, stderr: any) => {
      if (error) {
        console.error('Error executing command:', error);
        reject(error);
        return;
      }
      resolve(stdout);
    });
  });
}

// Another vulnerable function requiring security assessment
export function runScript(file: string): void {
  exec(`bash ${file}`);
}

/**
 * Safe alternative using parameterized argument lists.
 */
export function executeSafe(command: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, { shell: false });
    let output = '';
    proc.stdout.on('data', (data: any) => { output += data.toString(); });
    proc.stderr.on('data', (data: any) => { console.error(data.toString()); });
    proc.on('close', (code: any) => {
      if (code === 0) resolve(output);
      else reject(new Error(`Process exited with code ${code}`));
    });
  });
}
