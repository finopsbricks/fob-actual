// @ts-check
import { clientFor } from '../_helpers.js';
import { buildColumnSelector } from '../utils/list.js';
import { runList } from '../utils/list-runner.js';

const PUBLIC_FIELDS = ['id', 'tag', 'color', 'description'];
const DEFAULT_FIELDS = ['id', 'tag', 'color', 'description'];

const COLUMNS = {
  id:          { header: 'ID',          align: 'left', render: (t) => t.id ?? '',          raw: (t) => t.id },
  tag:         { header: 'TAG',         align: 'left', render: (t) => t.tag ?? '',         raw: (t) => t.tag },
  color:       { header: 'COLOR',       align: 'left', render: (t) => t.color ?? '',       raw: (t) => t.color },
  description: { header: 'DESCRIPTION', align: 'left', render: (t) => t.description ?? '', raw: (t) => t.description },
};

const selector = buildColumnSelector({ columns: COLUMNS, defaultFields: DEFAULT_FIELDS, publicFields: PUBLIC_FIELDS });

export async function listTagsHandler(argv) {
  const actual = clientFor();
  await runList({
    argv,
    selector,
    jsonKey: 'tags',
    emptyLabel: '(no tags)',
    fetch: () => actual.tags.list(),
  });
}
