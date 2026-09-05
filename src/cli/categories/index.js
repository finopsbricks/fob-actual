import { safe, jsonOption, listOptions, listOutputOptions, writeOptions } from '../_helpers.js';
import { listCategoriesHandler } from './list.js';
import { showCategoryHandler } from './show.js';
import { createCategoryHandler, editCategoryHandler, deleteCategoryHandler } from './write.js';

export function buildCategoriesSubcommands(yargs) {
  return yargs
    .usage('$0 categories <action> [target] [options]')
    .command(
      'list',
      'List categories',
      (y) =>
        listOutputOptions(listOptions(y)).option('all', {
          describe: 'Include hidden categories',
          type: 'boolean',
        }),
      safe(listCategoriesHandler),
    )
    .command(
      'show <id>',
      'Show one category by id',
      (y) => jsonOption(y.positional('id', { describe: 'Category id', type: 'string' })),
      safe(showCategoryHandler),
    )
    .command(
      'create',
      'Create a category',
      (y) =>
        writeOptions(y)
          .option('name', { describe: 'Category name', type: 'string', demandOption: true })
          .option('group', { describe: 'Category group id', type: 'string', demandOption: true })
          .option('is-income', { describe: 'Mark as an income category', type: 'boolean' })
          .option('hidden', { describe: 'Create hidden', type: 'boolean' }),
      safe(createCategoryHandler),
    )
    .command(
      'edit <id>',
      'Update a category (only passed flags change)',
      (y) =>
        writeOptions(y.positional('id', { describe: 'Category id', type: 'string' }))
          .option('name', { describe: 'Category name', type: 'string' })
          .option('group', { describe: 'Move to this category group id', type: 'string' })
          .option('hidden', { describe: 'Hide or unhide', type: 'boolean' }),
      safe(editCategoryHandler),
    )
    .command(
      'delete <id>',
      'Delete a category (requires --yes)',
      (y) =>
        writeOptions(y.positional('id', { describe: 'Category id', type: 'string' }))
          .option('transfer-to', { describe: 'Move existing transactions to this category id', type: 'string' })
          .option('yes', { describe: 'Confirm deletion', type: 'boolean', alias: 'y' }),
      safe(deleteCategoryHandler),
    )
    .demandCommand(1, 'Specify an action: list, show, create, edit, delete');
}
