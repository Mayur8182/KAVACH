import http from 'node:http';
import chalk from 'chalk';
import { AgentLifecycleManager } from '../../../local-agent/src/lifecycle.js';
import { DEFAULT_AGENT_HOST, DEFAULT_AGENT_PORT } from '../../../../packages/shared/src/constants.js';

export async function callAgentApi<T = any>(
  method: string,
  pathname: string,
  body?: any,
  port: number = DEFAULT_AGENT_PORT
): Promise<T> {
  const token = AgentLifecycleManager.getSessionToken();

  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: DEFAULT_AGENT_HOST,
        port,
        path: pathname,
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'X-Kavach-Token': token,
          ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {}),
        },
        timeout: 5000,
      },
      (res) => {
        let responseBody = '';
        res.on('data', (chunk) => { responseBody += chunk; });
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(responseBody ? JSON.parse(responseBody) : ({} as T));
            } catch {
              resolve(responseBody as any);
            }
          } else {
            try {
              const errJson = JSON.parse(responseBody);
              reject(new Error(errJson.message || errJson.error || `HTTP ${res.statusCode}`));
            } catch {
              reject(new Error(`HTTP ${res.statusCode}: ${responseBody}`));
            }
          }
        });
      }
    );

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Agent request timed out. Is the agent responsive?'));
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

export function printKeyValue(key: string, value: string, indent: number = 2): void {
  const spaces = ' '.repeat(indent);
  console.log(`${spaces}${chalk.gray(key.padEnd(16))}: ${value}`);
}

