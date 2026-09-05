import { safe, localOptions } from '../_helpers.js';
import { runQueryHandler } from './run.js';

export function buildQuerySubcommands(yargs) {
  return yargs
    .usage('$0 query run [options]')
    .command(
      'run',
      'Run an ActualQL query',
      (y) =>
        localOptions(y)
          .option('table', { describe: 'Table to query (transactions, accounts, …)', type: 'string' })
          .option('select', { describe: 'Columns to select, comma-separated', type: 'string' })
          .option('filter', {
            describe: 'Filter as JSON, e.g. \'{"amount":{"$lt":0}}\' (repeatable)',
            type: 'string',
            array: true,
          })
          .option('order-by', { describe: 'Order by this field', type: 'string' })
          .option('desc', { describe: 'Order descending', type: 'boolean' })
          .option('limit', { describe: 'Maximum rows', type: 'number' })
          .option('query', { describe: 'A full serialized query as JSON', type: 'string' })
          .option('file', { describe: 'Read the serialized query from a file', type: 'string' })
          .option('format', { describe: 'Output format', type: 'string', choices: ['table', 'csv'] })
          .option('json', { describe: 'Output the raw result envelope', type: 'boolean' }),
      safe(runQueryHandler),
    )
    .demandCommand(1, 'Specify an action: run');
}
