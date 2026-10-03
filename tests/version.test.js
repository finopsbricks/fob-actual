import { describe, it, expect } from '@jest/globals';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const bin = join(root, 'bin', 'cli.js');
const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

function run(args, cwd) {
  const { NODE_OPTIONS, ...env } = process.env;
  return execFileSync('node', args, { encoding: 'utf8', cwd, env }).trim();
}

// Guards the explicit version read in src/cli/index.js. From an npm install,
// yargs' bare `.version()` printed "unknown"; that only reproduces from an
// installed copy, so it was verified by installing a packed tarball.
describe('--version and --help', () => {
  it("prints the package's version from any working directory", () => {
    expect(run([bin, '--version'], mkdtempSync(join(tmpdir(), 'actual-ver-')))).toBe(version);
  });

  it('prints it when run through a symlink, as npm installs the bin', () => {
    const dir = mkdtempSync(join(tmpdir(), 'actual-ver-'));
    const link = join(dir, 'fob-actual');
    symlinkSync(bin, link);
    expect(run([link, '--version'], dir)).toBe(version);
  });

  it('--help ends with the connect guide, docs and landing links', () => {
    const out = run([bin, '--help'], root);
    expect(out).toContain('New here? Connect your server: https://finopsbricks.com/docs/actual/connect');
    expect(out).toContain('Docs: https://finopsbricks.com/docs/actual');
    expect(out).toContain('About: https://finopsbricks.com/cli/fob-actual');
  });
});
