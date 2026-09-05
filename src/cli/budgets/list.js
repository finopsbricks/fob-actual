// @ts-check
import { clientFor } from '../_helpers.js';
import { buildColumnSelector } from '../utils/list.js';
import { runList } from '../utils/list-runner.js';

const PUBLIC_FIELDS = ['sync_id', 'name', 'file_id', 'state', 'encrypted', 'users'];
const DEFAULT_FIELDS = ['sync_id', 'name', 'state', 'encrypted'];

const COLUMNS = {
  sync_id:   { header: 'SYNC ID',   align: 'left',  render: (b) => b.groupId ?? '',                 raw: (b) => b.groupId },
  name:      { header: 'NAME',      align: 'left',  render: (b) => b.name ?? '',                    raw: (b) => b.name },
  file_id:   { header: 'FILE ID',   align: 'left',  render: (b) => b.cloudFileId ?? '',             raw: (b) => b.cloudFileId },
  state:     { header: 'STATE',     align: 'left',  render: (b) => b.state ?? '',                   raw: (b) => b.state },
  encrypted: { header: 'ENCRYPTED', align: 'left',  render: (b) => (b.encryptKeyId ? 'yes' : 'no'), raw: (b) => Boolean(b.encryptKeyId) },
  users:     { header: 'USERS',     align: 'right', render: (b) => String(b.usersWithAccess?.length ?? ''), raw: (b) => b.usersWithAccess?.length },
};

const selector = buildColumnSelector({ columns: COLUMNS, defaultFields: DEFAULT_FIELDS, publicFields: PUBLIC_FIELDS });

/** List the budget files this session token can see (no budget need be loaded). */
export async function listBudgetsHandler(argv) {
  const actual = clientFor();
  await runList({
    argv,
    selector,
    jsonKey: 'budgets',
    emptyLabel: '(no budgets)',
    fetch: () => actual.budgets.list(),
  });
}
