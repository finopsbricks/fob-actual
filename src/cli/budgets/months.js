// @ts-check
import { clientFor } from '../_helpers.js';

/** List the months this budget covers. */
export async function monthsBudgetHandler(argv) {
  const actual = clientFor();
  const months = await actual.budgets.months();

  if (argv.json) {
    console.log(JSON.stringify({ months }, null, 2));
    return;
  }
  if (!months.length) {
    console.log('(no budget months)');
    return;
  }
  for (const m of months) console.log(m);
}
