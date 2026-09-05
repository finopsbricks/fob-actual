// @ts-check
import { readFileSync } from 'node:fs';

import { clientFor } from '../_helpers.js';
import { parseAmount } from '../utils/format.js';

/**
 * A schedule carries a nested recurrence `_date` rule, so like rules it is
 * supplied as JSON — the same shape `schedules show --json` emits.
 */
function readSchedule(argv) {
  if (argv.file) {
    try {
      return JSON.parse(readFileSync(argv.file, 'utf8'));
    } catch (err) {
      throw new Error(`Could not read --file ${argv.file}: ${err.message}`);
    }
  }
  if (argv.schedule) {
    try {
      return JSON.parse(argv.schedule);
    } catch (err) {
      throw new Error(`--schedule is not valid JSON: ${err.message}`);
    }
  }
  return null;
}

export async function createScheduleHandler(argv) {
  const schedule = readSchedule(argv);
  if (!schedule) throw new Error('Pass the schedule as --schedule <json> or --file <path>.');

  const actual = clientFor();
  if (argv.dryRun) {
    console.log(`[dry-run] Would create schedule: ${JSON.stringify(schedule)}`);
    return;
  }

  const id = await actual.schedules.create(schedule);
  if (argv.json) {
    console.log(JSON.stringify({ id, ...schedule }, null, 2));
    return;
  }
  console.log(`Created schedule ${id}.`);
}

export async function editScheduleHandler(argv) {
  // Either a whole JSON body, or the handful of scalar fields worth flags.
  const fields = readSchedule(argv) ?? {};
  if (argv.name !== undefined) fields.name = argv.name;
  if (argv.amount !== undefined) fields.amount = parseAmount(argv.amount, '--amount');
  if (argv.completed !== undefined) fields.completed = argv.completed;

  if (Object.keys(fields).length === 0) {
    throw new Error('Nothing to change. Pass --name, --amount, --completed, --schedule, or --file.');
  }

  const actual = clientFor();
  if (argv.dryRun) {
    console.log(`[dry-run] Would update schedule ${argv.id}: ${JSON.stringify(fields)}`);
    return;
  }

  await actual.schedules.update(argv.id, fields, argv.resetNextDate);
  console.log(`Updated schedule ${argv.id}.`);
}

export async function deleteScheduleHandler(argv) {
  const actual = clientFor();
  if (argv.dryRun) {
    console.log(`[dry-run] Would delete schedule ${argv.id}.`);
    return;
  }
  if (!argv.yes) throw new Error(`Refusing to delete schedule ${argv.id} without --yes.`);

  await actual.schedules.delete(argv.id);
  console.log(`Deleted schedule ${argv.id}.`);
}
