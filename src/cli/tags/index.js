import { safe, jsonOption, listOptions, listOutputOptions, writeOptions } from '../_helpers.js';
import { listTagsHandler } from './list.js';
import { showTagHandler } from './show.js';
import { createTagHandler, editTagHandler, deleteTagHandler } from './write.js';

export function buildTagsSubcommands(yargs) {
  return yargs
    .usage('$0 tags <action> [target] [options]')
    .command('list', 'List tags', (y) => listOutputOptions(listOptions(y)), safe(listTagsHandler))
    .command(
      'show <id>',
      'Show one tag',
      (y) => jsonOption(y.positional('id', { describe: 'Tag id', type: 'string' })),
      safe(showTagHandler),
    )
    .command(
      'create',
      'Create a tag',
      (y) =>
        writeOptions(y)
          .option('tag', { describe: 'Tag text', type: 'string', demandOption: true })
          .option('color', { describe: 'Colour, e.g. #ff0000', type: 'string' })
          .option('description', { describe: 'Description', type: 'string' }),
      safe(createTagHandler),
    )
    .command(
      'edit <id>',
      'Update a tag (only passed flags change)',
      (y) =>
        writeOptions(y.positional('id', { describe: 'Tag id', type: 'string' }))
          .option('tag', { describe: 'Tag text', type: 'string' })
          .option('color', { describe: 'Colour, e.g. #ff0000', type: 'string' })
          .option('description', { describe: 'Description', type: 'string' }),
      safe(editTagHandler),
    )
    .command(
      'delete <id>',
      'Delete a tag (requires --yes)',
      (y) =>
        writeOptions(y.positional('id', { describe: 'Tag id', type: 'string' })).option('yes', {
          describe: 'Confirm deletion',
          type: 'boolean',
          alias: 'y',
        }),
      safe(deleteTagHandler),
    )
    .demandCommand(1, 'Specify an action: list, show, create, edit, delete');
}
