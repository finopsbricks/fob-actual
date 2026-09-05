// @ts-check
import { clientFor } from '../_helpers.js';
import { parseAmount, formatAmount } from '../utils/format.js';

/** Hold part of this month's leftover funds for next month. */
export async function holdBudgetHandler(argv) {
  const amount = parseAmount(argv.amount, '--amount');
  const actual = clientFor();

  if (argv.dryRun) {
    console.log(`[dry-run] Would hold ${formatAmount(amount)} from ${argv.month} for next month.`);
    return;
  }

  await actual.budgets.hold(argv.month, amount);
  console.log(`Held ${formatAmount(amount)} from ${argv.month} for next month.`);
}
