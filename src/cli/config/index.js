import { safe, localOptions, jsonOption } from '../_helpers.js';
import { addConfigHandler } from './add.js';
import { listConfigHandler } from './list.js';
import { useConfigHandler } from './use.js';
import { removeConfigHandler } from './remove.js';
import { currentConfigHandler } from './current.js';
import { refreshConfigHandler } from './refresh.js';

/**
 * The multi-tenant object is a "profile" — a named Actual credential set. Because
 * the engine loads one budget at a time, a profile maps 1:1 to a budget file, so
 * `budgets` is offered as an alias. `config` is a namespace, not the object:
 * `fob-actual config profiles <action>`.
 */
function buildProfilesSubcommands(yargs) {
  return yargs
    .usage('$0 config profiles <action> [options]')
    .command(
      'list',
      'List profiles (current marked with *)',
      (y) => jsonOption(y),
      safe(listConfigHandler),
    )
    .command(
      ['current', 'whoami'],
      'Show the active profile + resolution source',
      (y) => jsonOption(y),
      safe(currentConfigHandler),
    )
    .command(
      'add <name>',
      "Add or update a profile's Actual credentials (upsert)",
      (y) =>
        localOptions(y.positional('name', { describe: 'Profile name', type: 'string' }))
          .option('server-url', { describe: 'Actual sync server URL', type: 'string' })
          .option('session-token', {
            describe: 'Session token (see `fob-actual auth login`)',
            type: 'string',
          })
          .option('sync-id', {
            describe: 'Budget sync id to bind this profile to',
            type: 'string',
          })
          .option('encryption-password', {
            describe: 'Password for an end-to-end encrypted budget',
            type: 'string',
          })
          .option('data-dir', {
            describe: 'Local budget cache directory (defaults to ~/.fob/fob-actual/data/<name>)',
            type: 'string',
          }),
      safe(addConfigHandler),
    )
    .command(
      'use <name>',
      'Set the current profile',
      (y) => localOptions(y.positional('name', { describe: 'Profile name', type: 'string' })),
      safe(useConfigHandler),
    )
    .command(
      'remove <name>',
      'Remove a profile (requires --yes)',
      (y) =>
        localOptions(y.positional('name', { describe: 'Profile name', type: 'string' })).option('yes', {
          describe: 'Confirm removal',
          type: 'boolean',
          alias: 'y',
        }),
      safe(removeConfigHandler),
    )
    .command(
      'refresh [name]',
      "Re-sync a profile's cached budget metadata from the server",
      (y) =>
        localOptions(y.positional('name', { describe: 'Profile name', type: 'string' })).option('all', {
          describe: 'Refresh every configured profile',
          type: 'boolean',
        }),
      safe(refreshConfigHandler),
    )
    .demandCommand(1, 'Specify an action: list, current, add, use, remove, refresh');
}

export function buildConfigSubcommands(yargs) {
  return yargs
    .usage('$0 config <resource> <action> [options]')
    .command(['profiles', 'budgets'], 'Manage credential profiles', buildProfilesSubcommands)
    .demandCommand(1, 'Specify a resource: profiles');
}
