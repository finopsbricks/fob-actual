import { safe, jsonOption, listOptions, listOutputOptions, writeOptions } from '../_helpers.js';
import { listTransactionsHandler } from './list.js';
import {
  addTransactionsHandler,
  importTransactionsHandler,
  editTransactionHandler,
  deleteTransactionHandler,
} from './write.js';

export function buildTransactionsSubcommands(yargs) {
  return yargs
    .usage('$0 transactions <action> [target] [options]')
    .command(
      'list',
      'List transactions in an account (defaults to the last 30 days)',
      (y) =>
        listOutputOptions(listOptions(y))
          .option('account', { describe: 'Account id or name', type: 'string', demandOption: true })
          .option('from', { describe: 'Start date, YYYY-MM-DD', type: 'string' })
          .option('to', { describe: 'End date, YYYY-MM-DD', type: 'string' }),
      safe(listTransactionsHandler),
    )
    .command(
      'add',
      'Add transactions to an account',
      (y) =>
        writeOptions(y)
          .option('account', { describe: 'Account id or name', type: 'string', demandOption: true })
          .option('date', { describe: 'Transaction date, YYYY-MM-DD', type: 'string' })
          .option('amount', { describe: 'Amount, e.g. -42.50 (negative is an outflow)', type: 'string' })
          .option('payee', { describe: 'Payee name', type: 'string' })
          .option('category', { describe: 'Category id', type: 'string' })
          .option('notes', { describe: 'Notes', type: 'string' })
          .option('cleared', { describe: 'Mark as cleared', type: 'boolean' })
          .option('file', { describe: 'JSON file of transactions to add instead of flags', type: 'string' })
          .option('run-transfers', { describe: 'Create transfers for matching entries', type: 'boolean' })
          .option('learn-categories', { describe: 'Let Actual learn payee categories', type: 'boolean' }),
      safe(addTransactionsHandler),
    )
    .command(
      'import',
      "Import transactions with Actual's dedupe + rules",
      (y) =>
        writeOptions(y)
          .option('account', { describe: 'Account id or name', type: 'string', demandOption: true })
          .option('file', { describe: 'JSON file of transactions', type: 'string', demandOption: true }),
      safe(importTransactionsHandler),
    )
    .command(
      'edit <id>',
      'Update a transaction (only passed flags change)',
      (y) =>
        writeOptions(y.positional('id', { describe: 'Transaction id', type: 'string' }))
          .option('date', { describe: 'Transaction date, YYYY-MM-DD', type: 'string' })
          .option('amount', { describe: 'Amount, e.g. -42.50', type: 'string' })
          .option('payee', { describe: 'Payee name', type: 'string' })
          .option('category', { describe: 'Category id', type: 'string' })
          .option('notes', { describe: 'Notes', type: 'string' })
          .option('cleared', { describe: 'Mark as cleared', type: 'boolean' }),
      safe(editTransactionHandler),
    )
    .command(
      'delete <id>',
      'Delete a transaction (requires --yes)',
      (y) =>
        writeOptions(y.positional('id', { describe: 'Transaction id', type: 'string' })).option('yes', {
          describe: 'Confirm deletion',
          type: 'boolean',
          alias: 'y',
        }),
      safe(deleteTransactionHandler),
    )
    .demandCommand(1, 'Specify an action: list, add, import, edit, delete');
}
