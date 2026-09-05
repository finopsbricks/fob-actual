// @ts-check
import { clientFor } from '../_helpers.js';
import { buildColumnSelector } from '../utils/list.js';
import { runList } from '../utils/list-runner.js';

const PUBLIC_FIELDS = ['id', 'name', 'group', 'group_id', 'is_income', 'hidden'];
const DEFAULT_FIELDS = ['id', 'name', 'group', 'is_income'];

const COLUMNS = {
  id:        { header: 'ID',      align: 'left', render: (c) => c.id ?? '',                    raw: (c) => c.id },
  name:      { header: 'NAME',    align: 'left', render: (c) => c.name ?? '',                  raw: (c) => c.name },
  group:     { header: 'GROUP',   align: 'left', render: (c) => c.group_name ?? '',            raw: (c) => c.group_name },
  group_id:  { header: 'GROUP ID',align: 'left', render: (c) => c.group_id ?? '',              raw: (c) => c.group_id },
  is_income: { header: 'INCOME',  align: 'left', render: (c) => (c.is_income ? 'yes' : 'no'),  raw: (c) => Boolean(c.is_income) },
  hidden:    { header: 'HIDDEN',  align: 'left', render: (c) => (c.hidden ? 'yes' : 'no'),     raw: (c) => Boolean(c.hidden) },
};

const selector = buildColumnSelector({ columns: COLUMNS, defaultFields: DEFAULT_FIELDS, publicFields: PUBLIC_FIELDS });

export async function listCategoriesHandler(argv) {
  const actual = clientFor();
  await runList({
    argv,
    selector,
    jsonKey: 'categories',
    emptyLabel: '(no categories)',
    fetch: () =>
      actual.hold(async () => {
        // `hidden` is a filter, not an include-flag, so "all" is both queries.
        const categories = argv.all
          ? await actual.categories.listAll()
          : await actual.categories.list();
        const groups = await actual.categoryGroups.listAll();
        const groupName = new Map(groups.map((g) => [g.id, g.name]));
        return categories.map((c) => ({ ...c, group_name: groupName.get(c.group_id) ?? '' }));
      }),
  });
}
