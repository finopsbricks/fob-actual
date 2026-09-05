// @ts-check
import { clientFor } from '../_helpers.js';
import { buildColumnSelector } from '../utils/list.js';
import { runList } from '../utils/list-runner.js';

const PUBLIC_FIELDS = ['id', 'name', 'is_income', 'hidden', 'categories'];
const DEFAULT_FIELDS = ['id', 'name', 'is_income', 'categories'];

const COLUMNS = {
  id:         { header: 'ID',         align: 'left',  render: (g) => g.id ?? '',                    raw: (g) => g.id },
  name:       { header: 'NAME',       align: 'left',  render: (g) => g.name ?? '',                  raw: (g) => g.name },
  is_income:  { header: 'INCOME',     align: 'left',  render: (g) => (g.is_income ? 'yes' : 'no'),  raw: (g) => Boolean(g.is_income) },
  hidden:     { header: 'HIDDEN',     align: 'left',  render: (g) => (g.hidden ? 'yes' : 'no'),     raw: (g) => Boolean(g.hidden) },
  categories: { header: 'CATEGORIES', align: 'right', render: (g) => String(g.categories?.length ?? 0), raw: (g) => g.categories?.length ?? 0 },
};

const selector = buildColumnSelector({ columns: COLUMNS, defaultFields: DEFAULT_FIELDS, publicFields: PUBLIC_FIELDS });

export async function listCategoryGroupsHandler(argv) {
  const actual = clientFor();
  await runList({
    argv,
    selector,
    jsonKey: 'category_groups',
    emptyLabel: '(no category groups)',
    fetch: () => (argv.all ? actual.categoryGroups.listAll() : actual.categoryGroups.list()),
  });
}
