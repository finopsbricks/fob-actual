// @ts-check
import { clientFor } from '../_helpers.js';

/** Release a hold previously set on a month. */
export async function resetHoldBudgetHandler(argv) {
  const actual = clientFor();

  if (argv.dryRun) {
    console.log(`[dry-run] Would release the hold on ${argv.month}.`);
    return;
  }

  await actual.budgets.resetHold(argv.month);
  console.log(`Released the hold on ${argv.month}.`);
}
