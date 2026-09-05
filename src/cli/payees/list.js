// @ts-check
import { clientFor } from '../_helpers.js';
import { buildColumnSelector } from '../utils/list.js';
import { runList } from '../utils/list-runner.js';

const PUBLIC_FIELDS = ['id', 'name', 'transfer_acct', 'favorite'];
const DEFAULT_FIELDS = ['id', 'name', 'transfer_acct'];

const COLUMNS = {
  id:            { header: 'ID',       align: 'left', render: (p) => p.id ?? '',                     raw: (p) => p.id },
  name:          { header: 'NAME',     align: 'left', render: (p) => p.name ?? '',                   raw: (p) => p.name },
  transfer_acct: { header: 'TRANSFER', align: 'left', render: (p) => p.transfer_acct ?? '',          raw: (p) => p.transfer_acct },
  favorite:      { header: 'FAVORITE', align: 'left', render: (p) => (p.favorite ? 'yes' : 'no'),    raw: (p) => Boolean(p.favorite) },
};

const selector = buildColumnSelector({ columns: COLUMNS, defaultFields: DEFAULT_FIELDS, publicFields: PUBLIC_FIELDS });

export async function listPayeesHandler(argv) {
  const actual = clientFor();
  await runList({
    argv,
    selector,
    jsonKey: 'payees',
    emptyLabel: '(no payees)',
    fetch: () => (argv.common ? actual.payees.common() : actual.payees.list()),
  });
}
