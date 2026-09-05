import { safe, jsonOption, listOptions, listOutputOptions, writeOptions } from '../_helpers.js';
import { listCategoryGroupsHandler } from './list.js';
import { showCategoryGroupHandler } from './show.js';
import {
  createCategoryGroupHandler,
  editCategoryGroupHandler,
  deleteCategoryGroupHandler,
} from './write.js';

export function buildCategoryGroupsSubcommands(yargs) {
  return yargs
    .usage('$0 category-groups <action> [target] [options]')
    .command(
      'list',
      'List category groups',
      (y) =>
        listOutputOptions(listOptions(y)).option('all', {
          describe: 'Include hidden groups',
          type: 'boolean',
        }),
      safe(listCategoryGroupsHandler),
    )
    .command(
      'show <id>',
      'Show one category group and its categories',
      (y) => jsonOption(y.positional('id', { describe: 'Category group id', type: 'string' })),
      safe(showCategoryGroupHandler),
    )
    .command(
      'create',
      'Create a category group',
      (y) =>
        writeOptions(y)
          .option('name', { describe: 'Group name', type: 'string', demandOption: true })
          .option('is-income', { describe: 'Mark as an income group', type: 'boolean' }),
      safe(createCategoryGroupHandler),
    )
    .command(
      'edit <id>',
      'Update a category group (only passed flags change)',
      (y) =>
        writeOptions(y.positional('id', { describe: 'Category group id', type: 'string' }))
          .option('name', { describe: 'Group name', type: 'string' })
          .option('hidden', { describe: 'Hide or unhide', type: 'boolean' }),
      safe(editCategoryGroupHandler),
    )
    .command(
      'delete <id>',
      'Delete a category group (requires --yes)',
      (y) =>
        writeOptions(y.positional('id', { describe: 'Category group id', type: 'string' }))
          .option('transfer-to', { describe: 'Move transactions to this category id', type: 'string' })
          .option('yes', { describe: 'Confirm deletion', type: 'boolean', alias: 'y' }),
      safe(deleteCategoryGroupHandler),
    )
    .demandCommand(1, 'Specify an action: list, show, create, edit, delete');
}
