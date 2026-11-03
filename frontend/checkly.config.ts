import { defineConfig } from 'checkly';

/**
 * Checkly Monitoring Configuration for Kavach Platform
 * Docs: https://www.checklyhq.com/docs/cli/
 */
export default defineConfig({
  projectName: 'Kavach Autonomous Security Platform',
  logicalId: 'kavach-security-platform',
  repoUrl: 'https://github.com/Mayur8182/KAVACH',
  checks: {
    activated: true,
    muted: false,
    runtimeId: '2024.02',
    frequency: 10,
    locations: ['us-east-1', 'eu-west-1'],
    tags: ['kavach', 'security', 'control-plane'],
    checkMatch: '**/__checks__/**/*.check.ts',
    browserChecks: {
      frequency: 30,
      testMatch: '**/__checks__/**/*.spec.ts',
    },
  },
  cli: {
    runLocation: 'us-east-1',
  },
});
