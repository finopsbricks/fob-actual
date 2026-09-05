// @ts-check
import { readFileSync } from 'node:fs';

import { clientFor } from '../_helpers.js';
import { parseAmount, formatAmount, formatTable } from '../utils/format.js';
import { resolveAccount } from '../accounts/_resolve.js';

/** Build one transaction from the flags given. */
function transactionFromFlags(argv) {
  const txn = {
    date: argv.date,
    amount: parseAmount(argv.amount, '--amount'),
  };
  if (argv.payee !== undefined) txn.payee_name = argv.payee;
  if (argv.category !== undefined) txn.category = argv.category;
  if (argv.notes !== undefined) txn.notes = argv.notes;
  if (argv.cleared !== undefined) txn.cleared = argv.cleared;
  return txn;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Read transactions from a JSON file — an array, or {transactions: [...]}. */
function readTransactionsFile(path) {
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    throw new Error(`Could not read --file ${path}: ${err.message}`);
  }
  const rows = Array.isArray(parsed) ? parsed : parsed?.transactions;
  if (!Array.isArray(rows)) {
    throw new Error(`--file ${path} must contain a JSON array of transactions.`);
  }
  return rows;
}

export async function addTransactionsHandler(argv) {
  if (!argv.file && !argv.date) throw new Error('Pass --date and --amount, or --file <path>.');
  if (argv.date && !DATE_RE.test(argv.date)) throw new Error('--date must be in YYYY-MM-DD format');

  const transactions = argv.file ? readTransactionsFile(argv.file) : [transactionFromFlags(argv)];

  const actual = clientFor();
  await actual.hold(async () => {
    const account = await resolveAccount(actual, argv.account);
    if (!account) throw new Error(`No account found for: ${argv.account}`);

    if (argv.dryRun) {
      console.log(`[dry-run] Would add ${transactions.length} transaction(s) to '${account.name}':`);
      console.log(
        formatTable(
          ['DATE', 'PAYEE', 'AMOUNT', 'NOTES'],
          transactions.map((t) => [
            t.date ?? '',
            t.payee_name ?? t.payee ?? '',
            formatAmount(t.amount),
            t.notes ?? '',
          ]),
          { align: ['left', 'left', 'right', 'left'] },
        ),
      );
      return;
    }

    const result = await actual.transactions.add(account.id, transactions, {
      runTransfers: Boolean(argv.runTransfers),
      learnCategories: Boolean(argv.learnCategories),
    });

    if (argv.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    console.log(`Added ${transactions.length} transaction(s) to '${account.name}'.`);
  });
}

export async function importTransactionsHandler(argv) {
  const transactions = readTransactionsFile(argv.file);

  const actual = clientFor();
  await actual.hold(async () => {
    const account = await resolveAccount(actual, argv.account);
    if (!account) throw new Error(`No account found for: ${argv.account}`);

    // The engine has a real preview mode, so --dry-run reports what *it* would
    // do (including dedupe decisions) rather than a guess.
    const result = await actual.transactions.import(account.id, transactions, {
      dryRun: Boolean(argv.dryRun),
    });

    if (argv.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    const prefix = argv.dryRun ? '[dry-run] Would import' : 'Imported';
    console.log(
      `${prefix}: ${result?.added?.length ?? 0} added, ${result?.updated?.length ?? 0} updated` +
        (result?.errors?.length ? `, ${result.errors.length} error(s)` : '') +
        ` (${transactions.length} submitted to '${account.name}').`,
    );
    for (const err of result?.errors ?? []) console.error(`  ${err.message ?? JSON.stringify(err)}`);
  });
}

export async function editTransactionHandler(argv) {
  const fields = {};
  if (argv.date !== undefined) {
    if (!DATE_RE.test(argv.date)) throw new Error('--date must be in YYYY-MM-DD format');
    fields.date = argv.date;
  }
  if (argv.amount !== undefined) fields.amount = parseAmount(argv.amount, '--amount');
  if (argv.payee !== undefined) fields.payee_name = argv.payee;
  if (argv.category !== undefined) fields.category = argv.category;
  if (argv.notes !== undefined) fields.notes = argv.notes;
  if (argv.cleared !== undefined) fields.cleared = argv.cleared;

  if (Object.keys(fields).length === 0) {
    throw new Error('Nothing to change. Pass --date, --amount, --payee, --category, --notes, or --cleared.');
  }

  const actual = clientFor();
  if (argv.dryRun) {
    console.log(`[dry-run] Would update transaction ${argv.id}: ${JSON.stringify(fields)}`);
    return;
  }

  await actual.transactions.update(argv.id, fields);
  console.log(`Updated transaction ${argv.id}.`);
}

export async function deleteTransactionHandler(argv) {
  const actual = clientFor();

  if (argv.dryRun) {
    console.log(`[dry-run] Would delete transaction ${argv.id}.`);
    return;
  }
  if (!argv.yes) {
    throw new Error(`Refusing to delete transaction ${argv.id} without --yes.`);
  }

  await actual.transactions.delete(argv.id);
  console.log(`Deleted transaction ${argv.id}.`);
}
