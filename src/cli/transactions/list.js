// @ts-check
import { clientFor } from '../_helpers.js';
import { formatAmount, formatDate } from '../utils/format.js';
import { buildColumnSelector } from '../utils/list.js';
import { runList } from '../utils/list-runner.js';
import { resolveAccount } from '../accounts/_resolve.js';

const PUBLIC_FIELDS = ['id', 'date', 'payee', 'category', 'notes', 'amount', 'cleared', 'reconciled', 'account'];
const DEFAULT_FIELDS = ['date', 'payee', 'category', 'notes', 'amount'];

/** Truncate a cell so one long note can't blow out the table width. */
const clip = (s, n = 40) => (s && s.length > n ? `${s.slice(0, n - 1)}…` : (s ?? ''));

const COLUMNS = {
  id:         { header: 'ID',        align: 'left',  render: (t) => t.id ?? '',                      raw: (t) => t.id },
  date:       { header: 'DATE',      align: 'left',  render: (t) => formatDate(t.date),              raw: (t) => t.date },
  payee:      { header: 'PAYEE',     align: 'left',  render: (t) => clip(t.payee_name ?? t.payee),   raw: (t) => t.payee_name ?? t.payee },
  category:   { header: 'CATEGORY',  align: 'left',  render: (t) => clip(t.category_name ?? t.category), raw: (t) => t.category_name ?? t.category },
  notes:      { header: 'NOTES',     align: 'left',  render: (t) => clip(t.notes),                   raw: (t) => t.notes },
  amount:     { header: 'AMOUNT',    align: 'right', render: (t) => formatAmount(t.amount),          raw: (t) => t.amount },
  cleared:    { header: 'CLEARED',   align: 'left',  render: (t) => (t.cleared ? 'yes' : 'no'),      raw: (t) => Boolean(t.cleared) },
  reconciled: { header: 'RECONCILED',align: 'left',  render: (t) => (t.reconciled ? 'yes' : 'no'),   raw: (t) => Boolean(t.reconciled) },
  account:    { header: 'ACCOUNT',   align: 'left',  render: (t) => t.account ?? '',                 raw: (t) => t.account },
};

const selector = buildColumnSelector({ columns: COLUMNS, defaultFields: DEFAULT_FIELDS, publicFields: PUBLIC_FIELDS });

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Validate the date range in the flags the user typed, not the engine's field names. */
export function validateDateRange({ from, to }) {
  if (from && !DATE_RE.test(from)) throw new Error('--from must be in YYYY-MM-DD format');
  if (to && !DATE_RE.test(to)) throw new Error('--to must be in YYYY-MM-DD format');
  if (from && to && from > to) throw new Error('--from must be before or equal to --to');
}

/** Default window: the last 30 days, so a bare `list` is useful and bounded. */
function defaultRange() {
  const end = new Date();
  const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
  const iso = (d) => d.toISOString().slice(0, 10);
  return { from: iso(start), to: iso(end) };
}

export async function listTransactionsHandler(argv) {
  validateDateRange(argv);
  const fallback = defaultRange();
  const from = argv.from ?? fallback.from;
  const to = argv.to ?? fallback.to;

  const actual = clientFor();
  await runList({
    argv,
    selector,
    jsonKey: 'transactions',
    emptyLabel: `(no transactions between ${from} and ${to})`,
    // The engine returns payee/category as ids. Resolve them to names in one
    // held session so the table is readable; --json keeps the raw ids, since
    // that is what the engine and every write command speak.
    fetch: () =>
      actual.hold(async () => {
        const account = await resolveAccount(actual, argv.account);
        if (!account) throw new Error(`No account found for: ${argv.account}`);

        const transactions = await actual.transactions.list(account.id, from, to);
        if (argv.json || argv.format === 'json') return transactions;

        const [payees, categories] = await Promise.all([
          actual.payees.list(),
          actual.categories.listAll(),
        ]);
        const payeeName = new Map(payees.map((p) => [p.id, p.name]));
        const categoryName = new Map(categories.map((c) => [c.id, c.name]));

        return transactions.map((t) => ({
          ...t,
          payee_name: t.payee_name ?? payeeName.get(t.payee) ?? t.payee,
          category_name: t.category_name ?? categoryName.get(t.category) ?? t.category,
        }));
      }),
  });
}
