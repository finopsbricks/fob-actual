// @ts-check
import { clientFor } from '../_helpers.js';
import { formatField, formatAmount } from '../utils/format.js';
import { resolveAccount } from './_resolve.js';

/** Show one account by id or name. */
export async function showAccountHandler(argv) {
  const actual = clientFor();
  // resolveAccount + balance are two calls: one held session covers both.
  const { account: a, balance } = await actual.hold(async () => {
    const account = await resolveAccount(actual, argv.id);
    return { account, balance: account ? await actual.accounts.balance(account.id) : null };
  });

  if (!a) {
    if (argv.json) {
      console.log('null');
      return;
    }
    console.error(`No account found for: ${argv.id}`);
    process.exit(1);
  }

  if (argv.json) {
    console.log(JSON.stringify({ ...a, balance }, null, 2));
    return;
  }

  const w = 14;
  console.log(formatField('ID', a.id, w));
  console.log(formatField('Name', a.name, w));
  console.log(formatField('Balance', formatAmount(balance), w));
  console.log(formatField('Off-budget', a.offbudget ? 'yes' : 'no', w));
  console.log(formatField('Closed', a.closed ? 'yes' : 'no', w));
}
