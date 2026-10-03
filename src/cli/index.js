/**
 * CLI entry point:
 *
 *   fob-actual <resource> <action> [target] [options]
 *
 * An Actual Budget wrapper. Credentials come from ~/.fob/fob-actual/config.yml
 * (managed by `config`) or FOB_ACTUAL_* env. A profile pins one budget, since
 * the engine loads one at a time; `--profile <name>` switches budget for one
 * command.
 */

import { readFileSync } from 'node:fs';
import yargs from 'yargs';

import { setProfileOverride } from './config-store.js';
import { buildConfigSubcommands } from './config/index.js';
import { buildAuthSubcommands } from './auth/index.js';
import { buildBudgetsSubcommands } from './budgets/index.js';
import { buildAccountsSubcommands } from './accounts/index.js';
import { buildTransactionsSubcommands } from './transactions/index.js';
import { buildCategoriesSubcommands } from './categories/index.js';
import { buildCategoryGroupsSubcommands } from './category-groups/index.js';
import { buildPayeesSubcommands } from './payees/index.js';
import { buildRulesSubcommands } from './rules/index.js';
import { buildSchedulesSubcommands } from './schedules/index.js';
import { buildTagsSubcommands } from './tags/index.js';
import { buildQuerySubcommands } from './query/index.js';
import { buildServerSubcommands } from './server/index.js';
import { CONNECT_DOCS_URL, DOCS_URL, LANDING_URL } from '../links.js';

// Read our own package.json: yargs' bare `.version()` looks for the package.json
// above its own node_modules, which isn't ours once fob-actual is npm-installed.
const { version } = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));

export function run(argv) {
  return yargs(argv)
    .scriptName('fob-actual')
    .usage('$0 <resource> <action> [target] [options]')
    .option('profile', {
      describe: 'Use a specific configured profile (overrides current + env)',
      type: 'string',
    })
    .middleware((argv) => {
      if (argv.profile) setProfileOverride(argv.profile);
    })
    .command('config <resource>', 'Manage credential profiles (alias: budgets)', buildConfigSubcommands)
    .command('auth <action>', 'Session token operations (login, status, logout)', buildAuthSubcommands)
    .command('budgets <action>', 'List/show budget files and the monthly budget', buildBudgetsSubcommands)
    .command('accounts <action>', 'List/show/manage accounts and balances', buildAccountsSubcommands)
    .command('transactions <action>', 'List/add/import/edit transactions', buildTransactionsSubcommands)
    .command('categories <action>', 'List/show/manage spending categories', buildCategoriesSubcommands)
    .command('category-groups <action>', 'List/show/manage category groups', buildCategoryGroupsSubcommands)
    .command('payees <action>', 'List/show/manage payees', buildPayeesSubcommands)
    .command('rules <action>', 'List/show/manage import rules', buildRulesSubcommands)
    .command('schedules <action>', 'List/show/manage scheduled transactions', buildSchedulesSubcommands)
    .command('tags <action>', 'List/show/manage tags', buildTagsSubcommands)
    .command('query <action>', 'Run an ActualQL query', buildQuerySubcommands)
    .command('server <action>', 'Server info and version', buildServerSubcommands)
    .demandCommand(1, 'Specify a resource. Try `fob-actual --help`.')
    .strict()
    .help()
    .alias('h', 'help')
    .version(version)
    .alias('v', 'version')
    // Wrap to the terminal width so long descriptions hang-indent at the
    // description column. Never .wrap(null) — that defers to the terminal, which
    // breaks continuation lines at column 0 and makes the list unscannable.
    .wrap(process.stdout.columns || 100)
    // Global options (inherited by every command) render under their own
    // heading; each command's own options stay under "Options:", shown first
    // via localOptions() in the command builders.
    .group(['profile', 'help', 'version'], 'Global Options:')
    .epilogue(`New here? Connect your server: ${CONNECT_DOCS_URL}\nDocs: ${DOCS_URL}\nAbout: ${LANDING_URL}`)
    .parse();
}
