// @ts-check
import { clientFor } from '../_helpers.js';
import { parseAmount, formatAmount } from '../utils/format.js';
import { resolveAccount, resolveAccountId } from './_resolve.js';

/** Build the mutable field set from the flags actually passed (undefined = unchanged). */
function accountFields(argv) {
  const fields = {};
  if (argv.name !== undefined) fields.name = argv.name;
  if (argv.offbudget !== undefined) fields.offbudget = argv.offbudget;
  return fields;
}

export async function createAccountHandler(argv) {
  const actual = clientFor();
  const account = { name: argv.name, offbudget: Boolean(argv.offbudget) };
  const initial = argv.balance !== undefined ? parseAmount(argv.balance, '--balance') : undefined;

  if (argv.dryRun) {
    console.log(
      `[dry-run] Would create account '${argv.name}'` +
        (initial !== undefined ? ` with balance ${formatAmount(initial)}` : '') +
        (account.offbudget ? ' (off-budget)' : '') + '.',
    );
    return;
  }

  const id = await actual.accounts.create(account, initial);
  if (argv.json) {
    console.log(JSON.stringify({ id, ...account }, null, 2));
    return;
  }
  console.log(`Created account '${argv.name}' (${id}).`);
}

export async function editAccountHandler(argv) {
  const actual = clientFor();
  const account = await resolveAccount(actual, argv.id);
  if (!account) throw new Error(`No account found for: ${argv.id}`);

  const fields = accountFields(argv);
  if (Object.keys(fields).length === 0) {
    throw new Error('Nothing to change. Pass --name or --offbudget/--no-offbudget.');
  }

  if (argv.dryRun) {
    console.log(`[dry-run] Would update account '${account.name}' (${account.id}): ${JSON.stringify(fields)}`);
    return;
  }

  await actual.accounts.update(account.id, fields);
  console.log(`Updated account '${account.name}' (${account.id}).`);
}

export async function closeAccountHandler(argv) {
  const actual = clientFor();
  const account = await resolveAccount(actual, argv.id);
  if (!account) throw new Error(`No account found for: ${argv.id}`);

  const opts = {};
  if (argv.transferAccount) opts.transferAccountId = await resolveAccountId(actual, argv.transferAccount);
  if (argv.transferCategory) opts.transferCategoryId = argv.transferCategory;

  if (argv.dryRun) {
    console.log(`[dry-run] Would close account '${account.name}' (${account.id}).`);
    return;
  }

  await actual.accounts.close(account.id, opts);
  console.log(`Closed account '${account.name}' (${account.id}).`);
}

export async function reopenAccountHandler(argv) {
  const actual = clientFor();
  const account = await resolveAccount(actual, argv.id);
  if (!account) throw new Error(`No account found for: ${argv.id}`);

  if (argv.dryRun) {
    console.log(`[dry-run] Would reopen account '${account.name}' (${account.id}).`);
    return;
  }

  await actual.accounts.reopen(account.id);
  console.log(`Reopened account '${account.name}' (${account.id}).`);
}

export async function deleteAccountHandler(argv) {
  const actual = clientFor();
  const account = await resolveAccount(actual, argv.id);
  if (!account) throw new Error(`No account found for: ${argv.id}`);

  if (argv.dryRun) {
    console.log(`[dry-run] Would delete account '${account.name}' (${account.id}) and its transactions.`);
    return;
  }
  if (!argv.yes) {
    throw new Error(
      `Refusing to delete account '${account.name}' without --yes. ` +
        'This removes its transactions from the shared budget.',
    );
  }

  await actual.accounts.delete(account.id);
  console.log(`Deleted account '${account.name}' (${account.id}).`);
}
