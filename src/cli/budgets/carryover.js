// @ts-check
import { clientFor } from '../_helpers.js';

/**
 * Toggle carryover (rollover) for a category in a month — whether a leftover
 * balance rolls into the next month instead of returning to "to budget".
 */
export async function carryoverBudgetHandler(argv) {
  const flag = !argv.off;
  const actual = clientFor();

  if (argv.dryRun) {
    console.log(
      `[dry-run] Would turn carryover ${flag ? 'on' : 'off'} for ${argv.categoryId} in ${argv.month}.`,
    );
    return;
  }

  await actual.budgets.setCarryover(argv.month, argv.categoryId, flag);
  console.log(`Carryover ${flag ? 'enabled' : 'disabled'} for ${argv.categoryId} in ${argv.month}.`);
}
