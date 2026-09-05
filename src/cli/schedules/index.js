import { safe, jsonOption, listOptions, listOutputOptions, writeOptions } from '../_helpers.js';
import { listSchedulesHandler } from './list.js';
import { showScheduleHandler } from './show.js';
import { createScheduleHandler, editScheduleHandler, deleteScheduleHandler } from './write.js';

const scheduleInput = (y) =>
  y
    .option('schedule', { describe: 'Schedule as a JSON string', type: 'string' })
    .option('file', { describe: 'Read the schedule JSON from a file', type: 'string' });

export function buildSchedulesSubcommands(yargs) {
  return yargs
    .usage('$0 schedules <action> [target] [options]')
    .command(
      'list',
      'List scheduled transactions',
      (y) =>
        listOutputOptions(listOptions(y)).option('all', {
          describe: 'Include completed schedules',
          type: 'boolean',
        }),
      safe(listSchedulesHandler),
    )
    .command(
      'show <id>',
      'Show one schedule',
      (y) => jsonOption(y.positional('id', { describe: 'Schedule id', type: 'string' })),
      safe(showScheduleHandler),
    )
    .command(
      'create',
      'Create a schedule from JSON',
      (y) => scheduleInput(writeOptions(y)),
      safe(createScheduleHandler),
    )
    .command(
      'edit <id>',
      'Update a schedule (only passed fields change)',
      (y) =>
        scheduleInput(writeOptions(y.positional('id', { describe: 'Schedule id', type: 'string' })))
          .option('name', { describe: 'Schedule name', type: 'string' })
          .option('amount', { describe: 'Amount, e.g. -1200.00', type: 'string' })
          .option('completed', { describe: 'Mark completed', type: 'boolean' })
          .option('reset-next-date', { describe: 'Recompute the next occurrence', type: 'boolean' }),
      safe(editScheduleHandler),
    )
    .command(
      'delete <id>',
      'Delete a schedule (requires --yes)',
      (y) =>
        writeOptions(y.positional('id', { describe: 'Schedule id', type: 'string' })).option('yes', {
          describe: 'Confirm deletion',
          type: 'boolean',
          alias: 'y',
        }),
      safe(deleteScheduleHandler),
    )
    .demandCommand(1, 'Specify an action: list, show, create, edit, delete');
}
