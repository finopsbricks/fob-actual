// @ts-check
import { clientFor } from '../_helpers.js';
import { parseAmount, formatAmount } from '../utils/format.js';

/** Set the budgeted amount for one category in one month. */
export async function setAmountBudgetHandler(argv) {
  const amount = parseAmount(argv.amount, '--amount');
  const actual = clientFor();

  if (argv.dryRun) {
    console.log(
      `[dry-run] Would set ${argv.month} category ${argv.categoryId} budget to ${formatAmount(amount)}.`,
    );
    return;
  }

  await actual.budgets.setAmount(argv.month, argv.categoryId, amount);
  if (argv.json) {
    console.log(JSON.stringify({ month: argv.month, category_id: argv.categoryId, budgeted: amount }, null, 2));
    return;
  }
  console.log(`Set ${argv.month} budget for category ${argv.categoryId} to ${formatAmount(amount)}.`);
}
