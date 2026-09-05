// @ts-check
import { clientFor } from '../_helpers.js';
import { formatAmount } from '../utils/format.js';
import { resolveAccount } from './_resolve.js';

/** Show an account's balance, optionally as of a cutoff date. */
export async function balanceAccountHandler(argv) {
  if (argv.asOf && !/^\d{4}-\d{2}-\d{2}$/.test(argv.asOf)) {
    throw new Error('--as-of must be in YYYY-MM-DD format');
  }

  const actual = clientFor();
  const cutoff = argv.asOf ? new Date(argv.asOf) : undefined;
  // resolveAccount + balance are two calls: one held session covers both.
  const { account, balance } = await actual.hold(async () => {
    const found = await resolveAccount(actual, argv.id);
    return { account: found, balance: found ? await actual.accounts.balance(found.id, cutoff) : null };
  });

  if (!account) {
    console.error(`No account found for: ${argv.id}`);
    process.exit(1);
  }

  if (argv.json) {
    console.log(
      JSON.stringify({ id: account.id, name: account.name, balance, as_of: argv.asOf ?? null }, null, 2),
    );
    return;
  }
  console.log(formatAmount(balance));
}
