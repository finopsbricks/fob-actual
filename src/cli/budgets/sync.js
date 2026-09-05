// @ts-check
import { clientFor } from '../_helpers.js';

/** Pull remote changes and push local ones for the bound budget. */
export async function syncBudgetHandler(argv) {
  const actual = clientFor();
  await actual.budgets.sync();
  if (argv.json) {
    console.log(JSON.stringify({ synced: true }, null, 2));
    return;
  }
  console.log('Budget synced.');
}
