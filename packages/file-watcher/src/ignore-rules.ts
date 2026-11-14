import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_IGNORED_PATTERNS } from '../../shared/src/constants.js';

export class IgnoreRulesManager {
  private projectRoot: string;
  private ignorePatterns: string[] = [];

  constructor(projectRoot: string) {
    this.projectRoot = path.resolve(projectRoot);
    this.loadRules();
  }

  public loadRules(): void {
    const patterns = new Set<string>(DEFAULT_IGNORED_PATTERNS);

    // 1. Read .gitignore if present
    const gitignorePath = path.join(this.projectRoot, '.gitignore');
    if (fs.existsSync(gitignorePath)) {
      this.parseAndAdd(gitignorePath, patterns);
    }

    // 2. Read .kavach/ignore if present
    const kavachIgnorePath = path.join(this.projectRoot, '.kavach', 'ignore');
    if (fs.existsSync(kavachIgnorePath)) {
      this.parseAndAdd(kavachIgnorePath, patterns);
    }

    this.ignorePatterns = Array.from(patterns);
  }

  private parseAndAdd(filePath: string, targetSet: Set<string>): void {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) continue;

        // Invariant: NEVER ignore security-critical files (.env, Dockerfile, migrations)
        if (
          line.includes('.env') ||
          line.toLowerCase().includes('dockerfile') ||
          line.includes('migration')
        ) {
          continue;
        }

        let pattern = line;
        if (pattern.endsWith('/')) {
          pattern = `**/${pattern}**`;
        } else if (!pattern.startsWith('*') && !pattern.startsWith('/')) {
          pattern = `**/${pattern}`;
        }
        targetSet.add(pattern);
      }
    } catch {}
  }

  public shouldIgnore(relativeFilePath: string): boolean {
    const normalized = relativeFilePath.replace(/\\/g, '/');

    // Never ignore security-critical files from local watching
    const basename = path.basename(normalized);
    if (
      basename.startsWith('.env') ||
      basename.toLowerCase().includes('dockerfile') ||
      normalized.includes('/migrations/')
    ) {
      return false;
    }

    // Always ignore .git and .kavach internal files
    if (
      normalized.startsWith('.git/') ||
      normalized === '.git' ||
      normalized.startsWith('.kavach/state/') ||
      normalized.startsWith('.kavach/events/')
    ) {
      return true;
    }

    // Check against patterns
    for (const pat of this.ignorePatterns) {
      if (this.matchPattern(normalized, pat)) {
        return true;
      }
    }

    return false;
  }

  private matchPattern(filePath: string, pattern: string): boolean {
    const cleanPattern = pattern.replace(/^\*\*\//, '').replace(/\/\*\*$/, '');
    if (filePath.includes(cleanPattern)) return true;
    if (path.basename(filePath) === cleanPattern) return true;
    return false;
  }

  public getPatterns(): string[] {
    return [...this.ignorePatterns];
  }
}

