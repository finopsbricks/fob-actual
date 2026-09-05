/**
 * Shared yargs helpers.
 */

import { resolveCredentials } from './config-store.js';
import { fobActual } from '../index.js';

/**
 * Wrap a handler so unexpected exceptions exit cleanly without a stack trace.
 * Set FOB_DEBUG=1 to see the full stack.
 */
export function safe(handler) {
  return async (argv) => {
    try {
      await handler(argv);
    } catch (err) {
      console.error(`Error: ${err.message}`);
      if (process.env.FOB_DEBUG) console.error(err.stack);
      process.exit(1);
    }
  };
}

/**
 * Register a command's own "Options:" group so it renders *above* the inherited
 * "Global Options:". yargs merges an instance's groups before the preserved
 * global ones, and otherwise materialises the default "Options:" group last — so
 * pre-creating it on the command instance is what fixes the order. Call at the
 * start of a command's builder; ungrouped options then fall into this group.
 */
export function localOptions(yargs) {
  return yargs.group([], 'Options:');
}

/**
 * Standard options for list commands.
 *
 * There is no `--page`: Actual's engine queries a local copy of the budget and
 * returns the whole result set, so there is nothing to paginate server-side.
 * `--limit` trims client-side instead.
 */
export function listOptions(yargs) {
  return localOptions(yargs)
    .option('limit', { describe: 'Maximum rows to show', type: 'number' })
    .option('json', { describe: 'Output raw JSON', type: 'boolean' });
}

/** Column-selection + format/output options shared by every `list` command. */
export function listOutputOptions(yargs) {
  return yargs
    .option('fields', { describe: 'Columns to show, comma-separated', type: 'string' })
    .option('format', {
      describe: 'Output format',
      type: 'string',
      choices: ['table', 'csv', 'json'],
    })
    .option('output', { describe: 'Write output to a file instead of stdout', type: 'string' });
}

/** `--json` alone, for `show`-style commands. */
export function jsonOption(yargs) {
  return localOptions(yargs).option('json', { describe: 'Output raw JSON', type: 'boolean' });
}

/**
 * Options every write command carries: a dry-run preview and a confirmation
 * flag for destructive actions.
 *
 * Writes here are not ordinary API calls — they sync CRDT messages into a live
 * budget that other people may share — so the standard's baseline is raised:
 * `--dry-run` on writes, `--yes` required on deletes.
 */
export function writeOptions(yargs) {
  return localOptions(yargs)
    .option('dry-run', { describe: 'Show what would change without writing', type: 'boolean' })
    .option('json', { describe: 'Output raw JSON', type: 'boolean' });
}

// Print the credential-source hint at most once per invocation.
let hintPrinted = false;

/**
 * Resolve the current command's credentials, printing a one-time hint to stderr
 * about which identity is in use.
 */
export function requireCreds() {
  const creds = resolveCredentials();
  if (!hintPrinted) {
    const budget = creds.budget_name ? `, budget '${creds.budget_name}'` : '';
    console.error(`(using Actual credentials from ${creds.source}${budget})`);
    hintPrinted = true;
  }
  return creds;
}

/**
 * Build a credential-bound `fobActual` client for the current command — the same
 * client workers construct, so a handler exercises the exact library path.
 */
export function clientFor() {
  return fobActual(requireCreds());
}

/**
 * Resolve `--budget <name|syncId>` for commands that can target a budget other
 * than the profile's. Returns credentials with `sync_id` overridden.
 */
export function credsForBudget(argv) {
  const creds = requireCreds();
  return argv.budget ? { ...creds, sync_id: argv.budget, budget_name: undefined } : creds;
}
