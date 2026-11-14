import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import type { TechnologyStack, ProjectMetadata } from '../../shared/src/types.js';
import { generateRandomToken } from '../../shared/src/crypto.js';

export class ProjectDetector {
  /**
   * Find project root directory by traversing upwards looking for project indicator markers.
   */
  public static findProjectRoot(startDir: string = process.cwd()): string {
    let current = path.resolve(startDir);
    const root = path.parse(current).root;

    while (current !== root) {
      if (
        fs.existsSync(path.join(current, '.kavach')) ||
        fs.existsSync(path.join(current, '.git')) ||
        fs.existsSync(path.join(current, 'package.json')) ||
        fs.existsSync(path.join(current, 'pyproject.toml')) ||
        fs.existsSync(path.join(current, 'requirements.txt')) ||
        fs.existsSync(path.join(current, 'go.mod')) ||
        fs.existsSync(path.join(current, 'pom.xml')) ||
        fs.existsSync(path.join(current, 'Cargo.toml'))
      ) {
        return current;
      }
      current = path.dirname(current);
    }

    return path.resolve(startDir);
  }

  /**
   * Inspect Git repository attributes (branch, remote, isRepo).
   */
  public static inspectGit(projectRoot: string): {
    isRepo: boolean;
    branch?: string;
    remote?: string;
  } {
    const gitDir = path.join(projectRoot, '.git');
    if (!fs.existsSync(gitDir)) {
      return { isRepo: false };
    }

    let branch: string | undefined;
    let remote: string | undefined;

    try {
      branch = execSync('git rev-parse --abbrev-ref HEAD', {
        cwd: projectRoot,
        stdio: ['ignore', 'pipe', 'ignore'],
      })
        .toString()
        .trim();
    } catch {}

    try {
      remote = execSync('git config --get remote.origin.url', {
        cwd: projectRoot,
        stdio: ['ignore', 'pipe', 'ignore'],
      })
        .toString()
        .trim();
    } catch {}

    return {
      isRepo: true,
      branch: branch || 'main',
      remote,
    };
  }

  /**
   * Deeply inspect files in project root to detect languages, frameworks, infrastructure, and databases.
   */
  public static detectStack(projectRoot: string): TechnologyStack {
    const languages = new Set<string>();
    const frameworks = new Set<string>();
    const infrastructure = new Set<string>();
    const packageManagers = new Set<string>();
    const databases = new Set<string>();

    const files = safeListDir(projectRoot);

    // 1. Package Managers & Node.js ecosystem
    if (files.includes('package.json')) {
      languages.add('JavaScript');
      packageManagers.add('npm');

      if (files.includes('yarn.lock')) packageManagers.add('yarn');
      if (files.includes('pnpm-lock.yaml')) packageManagers.add('pnpm');
      if (files.includes('bun.lockb')) packageManagers.add('bun');

      try {
        const pkgRaw = fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8');
        const pkg = JSON.parse(pkgRaw);
        const allDeps = {
          ...pkg.dependencies,
          ...pkg.devDependencies,
        };

        if (allDeps['typescript'] || files.includes('tsconfig.json')) {
          languages.add('TypeScript');
        }
        if (allDeps['next']) frameworks.add('Next.js');
        if (allDeps['react']) frameworks.add('React');
        if (allDeps['vue']) frameworks.add('Vue.js');
        if (allDeps['@angular/core']) frameworks.add('Angular');
        if (allDeps['express']) frameworks.add('Express');
        if (allDeps['@nestjs/core']) frameworks.add('NestJS');
        if (allDeps['fastify']) frameworks.add('Fastify');

        // DB libraries
        if (allDeps['pg'] || allDeps['postgres']) databases.add('PostgreSQL');
        if (allDeps['mysql'] || allDeps['mysql2']) databases.add('MySQL');
        if (allDeps['mongodb'] || allDeps['mongoose']) databases.add('MongoDB');
        if (allDeps['redis'] || allDeps['ioredis']) databases.add('Redis');
        if (allDeps['sqlite3'] || allDeps['better-sqlite3']) databases.add('SQLite');
        if (allDeps['prisma']) infrastructure.add('Prisma ORM');
      } catch {}
    }

    // 2. Python ecosystem
    if (
      files.includes('requirements.txt') ||
      files.includes('pyproject.toml') ||
      files.includes('Pipfile') ||
      files.includes('setup.py')
    ) {
      languages.add('Python');
      if (files.includes('requirements.txt')) packageManagers.add('pip');
      if (files.includes('pyproject.toml')) packageManagers.add('poetry');

      try {
        let pyContent = '';
        if (files.includes('requirements.txt')) {
          pyContent += fs.readFileSync(path.join(projectRoot, 'requirements.txt'), 'utf8') + '\n';
        }
        if (files.includes('pyproject.toml')) {
          pyContent += fs.readFileSync(path.join(projectRoot, 'pyproject.toml'), 'utf8') + '\n';
        }

        const lower = pyContent.toLowerCase();
        if (lower.includes('fastapi')) frameworks.add('FastAPI');
        if (lower.includes('flask')) frameworks.add('Flask');
        if (lower.includes('django')) frameworks.add('Django');
        if (lower.includes('sqlalchemy')) databases.add('SQLAlchemy ORM');
        if (lower.includes('pymongo')) databases.add('MongoDB');
        if (lower.includes('asyncpg') || lower.includes('psycopg2')) databases.add('PostgreSQL');
        if (lower.includes('redis')) databases.add('Redis');
      } catch {}
    }

    // 3. Go ecosystem
    if (files.includes('go.mod')) {
      languages.add('Go');
      packageManagers.add('go modules');
    }

    // 4. Java / Kotlin
    if (files.includes('pom.xml')) {
      languages.add('Java');
      packageManagers.add('Maven');
    }
    if (files.includes('build.gradle') || files.includes('build.gradle.kts')) {
      languages.add('Java');
      packageManagers.add('Gradle');
    }

    // 5. Rust
    if (files.includes('Cargo.toml')) {
      languages.add('Rust');
      packageManagers.add('Cargo');
    }

    // 6. PHP
    if (files.includes('composer.json')) {
      languages.add('PHP');
      packageManagers.add('Composer');
    }

    // 7. C# / .NET
    if (files.some((f) => f.endsWith('.csproj') || f.endsWith('.sln'))) {
      languages.add('C# / .NET');
    }

    // 8. Infrastructure & Containers
    if (files.includes('Dockerfile') || files.includes('Containerfile')) {
      infrastructure.add('Docker');
    }
    if (
      files.includes('docker-compose.yml') ||
      files.includes('docker-compose.yaml') ||
      files.includes('compose.yaml')
    ) {
      infrastructure.add('Docker Compose');
    }
    if (files.some((f) => f.endsWith('.tf') || f.endsWith('.tfvars'))) {
      infrastructure.add('Terraform');
    }
    if (files.includes('k8s') || files.includes('kubernetes') || files.some((f) => f.startsWith('k8s-'))) {
      infrastructure.add('Kubernetes');
    }
    if (files.includes('Chart.yaml')) {
      infrastructure.add('Helm');
    }

    return {
      languages: Array.from(languages),
      frameworks: Array.from(frameworks),
      infrastructure: Array.from(infrastructure),
      packageManagers: Array.from(packageManagers),
      databases: Array.from(databases),
    };
  }

  /**
   * Produce comprehensive project metadata.
   */
  public static inspectProject(projectRoot: string): ProjectMetadata {
    const root = path.resolve(projectRoot);
    const gitInfo = this.inspectGit(root);
    const stack = this.detectStack(root);
    const name = path.basename(root);

    return {
      id: `proj_${generateRandomToken(8)}`,
      name,
      rootPath: root,
      gitRepo: gitInfo.isRepo,
      gitBranch: gitInfo.branch,
      gitRemote: gitInfo.remote,
      stack,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      connectedCloud: false,
    };
  }
}

function safeListDir(dir: string): string[] {
  try {
    return fs.readdirSync(dir);
  } catch {
    return [];
  }
}

