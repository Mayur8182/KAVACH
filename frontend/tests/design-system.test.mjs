import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('Design System Tokens: All core semantic variables are defined', () => {
  const tokensPath = path.resolve(__dirname, '../styles/tokens.css');
  assert.ok(fs.existsSync(tokensPath), 'tokens.css must exist');

  const content = fs.readFileSync(tokensPath, 'utf8');

  // Core surfaces
  assert.match(content, /--color-bg:/);
  assert.match(content, /--color-surface:/);
  assert.match(content, /--color-surface-elevated:/);

  // Borders
  assert.match(content, /--color-border:/);
  assert.match(content, /--color-border-focus:/);

  // Semantic actions
  assert.match(content, /--color-primary:/);
  assert.match(content, /--color-success:/);
  assert.match(content, /--color-warning:/);
  assert.match(content, /--color-danger:/);

  // Security severity scale (Section 21)
  assert.match(content, /--severity-critical:/);
  assert.match(content, /--severity-high:/);
  assert.match(content, /--severity-medium:/);
  assert.match(content, /--severity-low:/);
  assert.match(content, /--severity-info:/);
  assert.match(content, /--severity-unknown:/);

  // Typography scale (Section 20)
  assert.match(content, /--font-sans:/);
  assert.match(content, /--font-mono:/);
  assert.match(content, /--text-xs:/);
  assert.match(content, /--text-sm:/);
  assert.match(content, /--text-base:/);
  assert.match(content, /--text-2xl:/);
  assert.match(content, /--text-display:/);
});

test('Folder Architecture: Core directories exist according to Section 4', () => {
  const root = path.resolve(__dirname, '..');
  const requiredDirs = [
    'app',
    'app/(auth)',
    'app/(platform)',
    'app/(platform)/home',
    'app/(platform)/code',
    'app/(platform)/cloud',
    'app/(platform)/attack',
    'app/(platform)/protect',
    'app/(platform)/agent',
    'app/(platform)/data',
    'app/(platform)/graph',
    'app/(platform)/intelligence',
    'app/(platform)/soc',
    'app/(platform)/control-plane',
    'app/(platform)/governance',
    'components/layout',
    'components/navigation',
    'components/data-display',
    'components/feedback',
    'components/overlays',
    'features/organization',
    'features/projects',
    'features/environments',
    'lib/api',
    'lib/auth',
    'lib/errors',
    'lib/telemetry',
    'styles',
  ];

  for (const dir of requiredDirs) {
    const p = path.join(root, dir);
    assert.ok(fs.existsSync(p), `Directory ${dir} must exist`);
  }
});
