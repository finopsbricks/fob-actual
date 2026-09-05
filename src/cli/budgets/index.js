import { safe, localOptions, jsonOption, listOptions, listOutputOptions, writeOptions } from '../_helpers.js';
import { listBudgetsHandler } from './list.js';
import { showBudgetHandler } from './show.js';
import { syncBudgetHandler } from './sync.js';
import { monthsBudgetHandler } from './months.js';
import { monthBudgetHandler } from './month.js';
import { setAmountBudgetHandler } from './set-amount.js';
import { carryoverBudgetHandler } from './carryover.js';
import { holdBudgetHandler } from './hold.js';
import { resetHoldBudgetHandler } from './reset-hold.js';

/**
 * `budgets` covers two things Actual both calls "budget": the budget *files* on
 * the server (list, show, sync) and the monthly envelope plan inside the bound
 * one (months, month, set-amount, carryover, hold).
 */
export function buildBudgetsSubcommands(yargs) {
  return yargs
    .usage('$0 budgets <action> [options]')
    .command(
      'list',
      'List budget files on the server',
      (y) => listOutputOptions(listOptions(y)),
      safe(listBudgetsHandler),
    )
    .command(
      'show <id>',
      'Show one budget file by sync id or name',
      (y) => jsonOption(y.positional('id', { describe: 'Sync id, file id, or budget name', type: 'string' })),
      safe(showBudgetHandler),
    )
    .command('sync', 'Sync the bound budget with the server', (y) => jsonOption(y), safe(syncBudgetHandler))
    .command('months', 'List the months this budget covers', (y) => jsonOption(y), safe(monthsBudgetHandler))
    .command(
      'month <month>',
      "Show one month's budget by category (YYYY-MM)",
      (y) => jsonOption(y.positional('month', { describe: 'Month, YYYY-MM', type: 'string' })),
      safe(monthBudgetHandler),
    )
    .command(
      'set-amount <month> <category-id>',
      'Set the budgeted amount for a category in a month',
      (y) =>
        writeOptions(
          y
            .positional('month', { describe: 'Month, YYYY-MM', type: 'string' })
            .positional('category-id', { describe: 'Category id', type: 'string' }),
        ).option('amount', { describe: 'Amount, e.g. 1250.00', type: 'string', demandOption: true }),
      safe(setAmountBudgetHandler),
    )
    .command(
      'carryover <month> <category-id>',
      "Roll a category's leftover balance into next month",
      (y) =>
        writeOptions(
          y
            .positional('month', { describe: 'Month, YYYY-MM', type: 'string' })
            .positional('category-id', { describe: 'Category id', type: 'string' }),
        ).option('off', { describe: 'Turn carryover off instead of on', type: 'boolean' }),
      safe(carryoverBudgetHandler),
    )
    .command(
      'hold <month>',
      "Hold part of a month's leftover funds for next month",
      (y) =>
        writeOptions(y.positional('month', { describe: 'Month, YYYY-MM', type: 'string' })).option('amount', {
          describe: 'Amount to hold, e.g. 500.00',
          type: 'string',
          demandOption: true,
        }),
      safe(holdBudgetHandler),
    )
    .command(
      'reset-hold <month>',
      'Release a hold previously set on a month',
      (y) => writeOptions(y.positional('month', { describe: 'Month, YYYY-MM', type: 'string' })),
      safe(resetHoldBudgetHandler),
    )
    .demandCommand(1, 'Specify an action: list, show, sync, months, month, set-amount, carryover, hold, reset-hold');
}
