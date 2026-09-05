// @ts-check
import { clientFor } from '../_helpers.js';
import { buildColumnSelector } from '../utils/list.js';
import { runList } from '../utils/list-runner.js';

const PUBLIC_FIELDS = ['id', 'stage', 'conditions_op', 'conditions', 'actions'];
const DEFAULT_FIELDS = ['id', 'stage', 'conditions', 'actions'];

/** One-line summary of a rule's conditions/actions, so the table stays scannable. */
const summarize = (parts) =>
  (parts ?? [])
    .map((p) => `${p.field ?? ''} ${p.op ?? ''} ${JSON.stringify(p.value ?? '')}`.trim())
    .join('; ');

const COLUMNS = {
  id:            { header: 'ID',         align: 'left',  render: (r) => r.id ?? '',                  raw: (r) => r.id },
  stage:         { header: 'STAGE',      align: 'left',  render: (r) => r.stage ?? 'default',        raw: (r) => r.stage },
  conditions_op: { header: 'OP',         align: 'left',  render: (r) => r.conditionsOp ?? '',        raw: (r) => r.conditionsOp },
  conditions:    { header: 'CONDITIONS', align: 'left',  render: (r) => summarize(r.conditions),     raw: (r) => JSON.stringify(r.conditions ?? []) },
  actions:       { header: 'ACTIONS',    align: 'left',  render: (r) => summarize(r.actions),        raw: (r) => JSON.stringify(r.actions ?? []) },
};

const selector = buildColumnSelector({ columns: COLUMNS, defaultFields: DEFAULT_FIELDS, publicFields: PUBLIC_FIELDS });

export async function listRulesHandler(argv) {
  const actual = clientFor();
  await runList({
    argv,
    selector,
    jsonKey: 'rules',
    emptyLabel: '(no rules)',
    fetch: () => (argv.payee ? actual.rules.forPayee(argv.payee) : actual.rules.list()),
  });
}
