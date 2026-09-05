// @ts-check
import { clientFor } from '../_helpers.js';
import { formatAmount } from '../utils/format.js';
import { buildColumnSelector } from '../utils/list.js';
import { runList } from '../utils/list-runner.js';

const PUBLIC_FIELDS = ['id', 'name', 'balance', 'offbudget', 'closed', 'type'];
const DEFAULT_FIELDS = ['id', 'name', 'balance', 'offbudget', 'closed'];

const COLUMNS = {
  id:        { header: 'ID',       align: 'left',  render: (a) => a.id ?? '',                     raw: (a) => a.id },
  name:      { header: 'NAME',     align: 'left',  render: (a) => a.name ?? '',                   raw: (a) => a.name },
  balance:   { header: 'BALANCE',  align: 'right', render: (a) => formatAmount(a.balance),        raw: (a) => a.balance },
  offbudget: { header: 'OFFBUDGET',align: 'left',  render: (a) => (a.offbudget ? 'yes' : 'no'),   raw: (a) => Boolean(a.offbudget) },
  closed:    { header: 'CLOSED',   align: 'left',  render: (a) => (a.closed ? 'yes' : 'no'),      raw: (a) => Boolean(a.closed) },
  type:      { header: 'TYPE',     align: 'left',  render: (a) => a.type ?? '',                   raw: (a) => a.type },
};

const selector = buildColumnSelector({ columns: COLUMNS, defaultFields: DEFAULT_FIELDS, publicFields: PUBLIC_FIELDS });

/**
 * List accounts, with balances.
 *
 * `getAccounts()` does not carry balances, so they are fetched per account and
 * merged — done here rather than in the client so a caller who only wants names
 * pays nothing for it.
 */
export async function listAccountsHandler(argv) {
  const actual = clientFor();
  await runList({
    argv,
    selector,
    jsonKey: 'accounts',
    emptyLabel: '(no accounts)',
    // One held session for the list plus every balance call.
    fetch: () =>
      actual.hold(async () => {
        const accounts = await actual.accounts.list();
        const visible = argv.all ? accounts : accounts.filter((a) => !a.closed);
        const wantsBalance = !argv.fields || argv.fields.includes('balance');
        if (!wantsBalance) return visible;
        const balances = [];
        for (const a of visible) {
          // Sequential: the engine has one connection, so parallel queries buy
          // nothing and interleave badly.
          balances.push({ ...a, balance: await actual.accounts.balance(a.id) });
        }
        return balances;
      }),
  });
}
