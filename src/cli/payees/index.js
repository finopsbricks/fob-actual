import { safe, jsonOption, listOptions, listOutputOptions, writeOptions } from '../_helpers.js';
import { listPayeesHandler } from './list.js';
import { showPayeeHandler } from './show.js';
import {
  createPayeeHandler,
  editPayeeHandler,
  deletePayeeHandler,
  mergePayeesHandler,
} from './write.js';

export function buildPayeesSubcommands(yargs) {
  return yargs
    .usage('$0 payees <action> [target] [options]')
    .command(
      'list',
      'List payees',
      (y) =>
        listOutputOptions(listOptions(y)).option('common', {
          describe: 'Only frequently-used payees',
          type: 'boolean',
        }),
      safe(listPayeesHandler),
    )
    .command(
      'show <id>',
      'Show one payee and its rules',
      (y) => jsonOption(y.positional('id', { describe: 'Payee id', type: 'string' })),
      safe(showPayeeHandler),
    )
    .command(
      'create',
      'Create a payee',
      (y) => writeOptions(y).option('name', { describe: 'Payee name', type: 'string', demandOption: true }),
      safe(createPayeeHandler),
    )
    .command(
      'edit <id>',
      'Update a payee (only passed flags change)',
      (y) =>
        writeOptions(y.positional('id', { describe: 'Payee id', type: 'string' }))
          .option('name', { describe: 'Payee name', type: 'string' })
          .option('favorite', { describe: 'Mark as a favorite', type: 'boolean' }),
      safe(editPayeeHandler),
    )
    .command(
      'delete <id>',
      'Delete a payee (requires --yes)',
      (y) =>
        writeOptions(y.positional('id', { describe: 'Payee id', type: 'string' })).option('yes', {
          describe: 'Confirm deletion',
          type: 'boolean',
          alias: 'y',
        }),
      safe(deletePayeeHandler),
    )
    .command(
      'merge <id>',
      'Merge other payees into this one (requires --yes)',
      (y) =>
        writeOptions(y.positional('id', { describe: 'Payee id to keep', type: 'string' }))
          .option('from', {
            describe: 'Payee id to merge in (repeatable)',
            type: 'string',
            array: true,
            demandOption: true,
          })
          .option('yes', { describe: 'Confirm the merge', type: 'boolean', alias: 'y' }),
      safe(mergePayeesHandler),
    )
    .demandCommand(1, 'Specify an action: list, show, create, edit, delete, merge');
}
