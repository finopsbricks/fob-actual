import { safe, localOptions, jsonOption, listOptions, listOutputOptions, writeOptions } from '../_helpers.js';
import { listAccountsHandler } from './list.js';
import { showAccountHandler } from './show.js';
import { balanceAccountHandler } from './balance.js';
import {
  createAccountHandler,
  editAccountHandler,
  closeAccountHandler,
  reopenAccountHandler,
  deleteAccountHandler,
} from './write.js';

export function buildAccountsSubcommands(yargs) {
  return yargs
    .usage('$0 accounts <action> [target] [options]')
    .command(
      'list',
      'List accounts with balances',
      (y) =>
        listOutputOptions(listOptions(y)).option('all', {
          describe: 'Include closed accounts',
          type: 'boolean',
        }),
      safe(listAccountsHandler),
    )
    .command(
      'show <id>',
      'Show one account by id or name',
      (y) => jsonOption(y.positional('id', { describe: 'Account id or name', type: 'string' })),
      safe(showAccountHandler),
    )
    .command(
      'balance <id>',
      "Show an account's balance",
      (y) =>
        jsonOption(y.positional('id', { describe: 'Account id or name', type: 'string' })).option('as-of', {
          describe: 'Balance as of a date (YYYY-MM-DD)',
          type: 'string',
        }),
      safe(balanceAccountHandler),
    )
    .command(
      'create',
      'Create an account',
      (y) =>
        writeOptions(y)
          .option('name', { describe: 'Account name', type: 'string', demandOption: true })
          .option('offbudget', { describe: 'Create as an off-budget account', type: 'boolean' })
          .option('balance', { describe: 'Starting balance, e.g. 1000.00', type: 'string' }),
      safe(createAccountHandler),
    )
    .command(
      'edit <id>',
      'Update an account (only passed flags change)',
      (y) =>
        writeOptions(y.positional('id', { describe: 'Account id or name', type: 'string' }))
          .option('name', { describe: 'Account name', type: 'string' })
          .option('offbudget', { describe: 'Move on/off budget', type: 'boolean' }),
      safe(editAccountHandler),
    )
    .command(
      'close <id>',
      'Close an account, optionally moving its balance',
      (y) =>
        writeOptions(y.positional('id', { describe: 'Account id or name', type: 'string' }))
          .option('transfer-account', { describe: 'Move the remaining balance to this account', type: 'string' })
          .option('transfer-category', { describe: 'Category for the transfer', type: 'string' }),
      safe(closeAccountHandler),
    )
    .command(
      'reopen <id>',
      'Reopen a closed account',
      (y) => writeOptions(y.positional('id', { describe: 'Account id or name', type: 'string' })),
      safe(reopenAccountHandler),
    )
    .command(
      'delete <id>',
      'Delete an account and its transactions (requires --yes)',
      (y) =>
        writeOptions(y.positional('id', { describe: 'Account id or name', type: 'string' })).option('yes', {
          describe: 'Confirm deletion',
          type: 'boolean',
          alias: 'y',
        }),
      safe(deleteAccountHandler),
    )
    .demandCommand(1, 'Specify an action: list, show, balance, create, edit, close, reopen, delete');
}
