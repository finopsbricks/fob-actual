// @ts-check
import { clientFor } from '../_helpers.js';
import { formatField, formatSection, formatTable, formatAmount } from '../utils/format.js';

/**
 * Show one month's budget: the envelope allocation, spend, and balance per
 * category, grouped as in the app.
 */
export async function monthBudgetHandler(argv) {
  const actual = clientFor();
  const month = await actual.budgets.month(argv.month);

  if (argv.json) {
    console.log(JSON.stringify(month, null, 2));
    return;
  }
  if (!month) {
    console.error(`No budget found for month: ${argv.month}`);
    process.exit(1);
  }

  // Sign convention is the engine's, preserved as-is rather than "corrected":
  // `totalBudgeted` and `lastMonthOverspent` are stored negative because
  // budgeting *draws down* what is available, and income categories are stored
  // negative too. The app renders the same values with an explicit +/- sign
  // (makeSignedFormatter in TotalsList.tsx); showing them raw keeps the CLI
  // consistent with `--json` and with ActualQL output.
  const w = 20;
  console.log(formatField('Month', month.month, w));
  console.log(formatField('Available income', formatAmount(month.incomeAvailable), w));
  console.log(formatField('From last month', formatAmount(month.fromLastMonth), w));
  console.log(formatField('Last month overspent', formatAmount(month.lastMonthOverspent), w));
  console.log(formatField('Budgeted', formatAmount(month.totalBudgeted), w));
  console.log(formatField('For next month', formatAmount(month.forNextMonth), w));
  console.log(formatField('To budget', formatAmount(month.toBudget), w));
  console.log(formatField('Total income', formatAmount(month.totalIncome), w));
  console.log(formatField('Total spent', formatAmount(month.totalSpent), w));
  console.log(formatField('Total balance', formatAmount(month.totalBalance), w));

  for (const group of month.categoryGroups ?? []) {
    console.log(formatSection(`${group.name}${group.is_income ? ' (income)' : ''}`));
    const rows = (group.categories ?? []).map((c) => [
      c.name ?? '',
      formatAmount(c.budgeted),
      formatAmount(c.spent),
      formatAmount(c.balance),
    ]);
    console.log(
      formatTable(['CATEGORY', 'BUDGETED', 'SPENT', 'BALANCE'], rows, {
        align: ['left', 'right', 'right', 'right'],
      }),
    );
  }
}
