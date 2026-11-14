import fs from 'node:fs';
import path from 'node:path';
import { GLOBAL_LOGS_DIR, GLOBAL_LOG_FILE } from './constants.js';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

// Patterns for sensitive data that must NEVER be written to logs
const SENSITIVE_PATTERNS = [
  /bearer\s+[a-zA-Z0-9_\-\.]+/gi,
  /(token|secret|password|key|auth)["']?\s*[:=]\s*["']?([a-zA-Z0-9_\-\.]+)/gi,
  /ghp_[a-zA-Z0-9]{36}/g,
  /ey[a-zA-Z0-9_\-]+\.ey[a-zA-Z0-9_\-]+\.[a-zA-Z0-9_\-]+/g, // JWTs
];

export function sanitizeLogMessage(message: string): string {
  let clean = message;
  for (const pattern of SENSITIVE_PATTERNS) {
    clean = clean.replace(pattern, (match) => {
      if (match.toLowerCase().startsWith('bearer ')) {
        return 'Bearer [REDACTED]';
      }
      return '[REDACTED_SECRET]';
    });
  }
  return clean;
}

export class Logger {
  private name: string;
  private level: LogLevel;
  private logToFile: boolean;

  constructor(name: string, level: LogLevel = 'info', logToFile: boolean = true) {
    this.name = name;
    this.level = level;
    this.logToFile = logToFile;
    if (this.logToFile) {
      try {
        fs.mkdirSync(GLOBAL_LOGS_DIR, { recursive: true });
      } catch {}
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.level];
  }

  private write(level: LogLevel, message: string, meta?: Record<string, unknown>) {
    if (!this.shouldLog(level)) return;

    const timestamp = new Date().toISOString();
    const sanitizedMsg = sanitizeLogMessage(message);
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    const line = `[${timestamp}] [${level.toUpperCase()}] [${this.name}] ${sanitizedMsg}${metaStr}\n`;

    // Write to stderr/stdout
    if (level === 'error') {
      process.stderr.write(line);
    } else {
      process.stdout.write(line);
    }

    // Write to rotating file
    if (this.logToFile) {
      try {
        this.rotateIfNeeded();
        fs.appendFileSync(GLOBAL_LOG_FILE, line, { encoding: 'utf8' });
      } catch {}
    }
  }

  private rotateIfNeeded() {
    try {
      if (!fs.existsSync(GLOBAL_LOG_FILE)) return;
      const stat = fs.statSync(GLOBAL_LOG_FILE);
      const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
      if (stat.size > MAX_SIZE) {
        const backupFile = path.join(GLOBAL_LOGS_DIR, `agent.${Date.now()}.log`);
        fs.renameSync(GLOBAL_LOG_FILE, backupFile);
      }
    } catch {}
  }

  debug(msg: string, meta?: Record<string, unknown>) {
    this.write('debug', msg, meta);
  }

  info(msg: string, meta?: Record<string, unknown>) {
    this.write('info', msg, meta);
  }

  warn(msg: string, meta?: Record<string, unknown>) {
    this.write('warn', msg, meta);
  }

  error(msg: string, meta?: Record<string, unknown>) {
    this.write('error', msg, meta);
  }
}

export const defaultLogger = new Logger('kavach-agent');

