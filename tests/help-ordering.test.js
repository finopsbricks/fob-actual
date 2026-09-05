import { describe, it, expect } from '@jest/globals';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const bin = join(dirname(fileURLToPath(import.meta.url)), '..', 'bin', 'cli.js');

/** Run `<command> --help` and return the heading lines in the order shown. */
function helpHeadings(args) {
  // Drop NODE_OPTIONS so a VS Code debugger bootloader can't pollute stdout.
  const { NODE_OPTIONS, ...env } = process.env;
  const out = execFileSync('node', [bin, ...args.split(' '), '--help'], {
    encoding: 'utf8',
    env,
  });
  return out
    .split('\n')
    .filter((l) => /^(Positionals:|Options:|Global Options:)$/.test(l));
}

describe('help layout', () => {
  it("shows a command's own options above the inherited global ones", () => {
    // budgets show <id>: Positionals (id) → Options (json) → Global Options
    expect(helpHeadings('budgets show x')).toEqual([
      'Positionals:',
      'Options:',
      'Global Options:',
    ]);
  });

  it('keeps positionals first when write options wrap the positional', () => {
    // budgets set-amount passes the positionals INTO writeOptions(); they must still lead.
    expect(helpHeadings('budgets set-amount 2026-09 c1')).toEqual([
      'Positionals:',
      'Options:',
      'Global Options:',
    ]);
  });

  it('groups global options under their own heading even without positionals', () => {
    // auth status: local --json, no positional.
    expect(helpHeadings('auth status')).toEqual(['Options:', 'Global Options:']);
  });

  it('hang-indents wrapped descriptions instead of breaking at column 0', () => {
    const { NODE_OPTIONS, ...env } = process.env;
    const out = execFileSync('node', [bin, '--help'], {
      encoding: 'utf8',
      env: { ...env, COLUMNS: '100' },
    });
    // Every line inside the Commands block either starts a new entry (indented
    // two spaces then the script name) or is a continuation indented past the
    // description column — never flush left.
    const lines = out.split('\n');
    const start = lines.findIndex((l) => l === 'Commands:');
    const end = lines.findIndex((l, i) => i > start && l.trim() === '');
    for (const line of lines.slice(start + 1, end)) {
      expect(line).toMatch(/^ {2,}/);
    }
  });
});
