// @ts-check
import { clientFor } from '../_helpers.js';
import { formatAmount, formatDate } from '../utils/format.js';
import { buildColumnSelector } from '../utils/list.js';
import { runList } from '../utils/list-runner.js';

const PUBLIC_FIELDS = ['id', 'name', 'account', 'payee', 'amount', 'next_date', 'completed', 'posts_transaction'];
const DEFAULT_FIELDS = ['id', 'name', 'next_date', 'amount', 'completed'];

const COLUMNS = {
  id:                { header: 'ID',        align: 'left',  render: (s) => s.id ?? '',                     raw: (s) => s.id },
  name:              { header: 'NAME',      align: 'left',  render: (s) => s.name ?? '',                   raw: (s) => s.name },
  account:           { header: 'ACCOUNT',   align: 'left',  render: (s) => s.account ?? '',                raw: (s) => s.account },
  payee:             { header: 'PAYEE',     align: 'left',  render: (s) => s.payee ?? '',                  raw: (s) => s.payee },
  amount:            { header: 'AMOUNT',    align: 'right', render: (s) => formatAmount(s.amount),         raw: (s) => s.amount },
  next_date:         { header: 'NEXT',      align: 'left',  render: (s) => formatDate(s.next_date),        raw: (s) => s.next_date },
  completed:         { header: 'DONE',      align: 'left',  render: (s) => (s.completed ? 'yes' : 'no'),   raw: (s) => Boolean(s.completed) },
  posts_transaction: { header: 'AUTO-POST', align: 'left',  render: (s) => (s.posts_transaction ? 'yes' : 'no'), raw: (s) => Boolean(s.posts_transaction) },
};

const selector = buildColumnSelector({ columns: COLUMNS, defaultFields: DEFAULT_FIELDS, publicFields: PUBLIC_FIELDS });

export async function listSchedulesHandler(argv) {
  const actual = clientFor();
  await runList({
    argv,
    selector,
    jsonKey: 'schedules',
    emptyLabel: '(no schedules)',
    fetch: async () => {
      const schedules = await actual.schedules.list();
      return argv.all ? schedules : schedules.filter((s) => !s.completed);
    },
  });
}
