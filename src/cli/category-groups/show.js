// @ts-check
import { clientFor } from '../_helpers.js';
import { formatField, formatSection, formatTable } from '../utils/format.js';

export async function showCategoryGroupHandler(argv) {
  const actual = clientFor();
  const group = await actual.categoryGroups.get(argv.id);

  if (argv.json) {
    console.log(JSON.stringify(group, null, 2));
    return;
  }
  if (!group) {
    console.error(`No category group found for id: ${argv.id}`);
    process.exit(1);
  }

  const w = 12;
  console.log(formatField('ID', group.id, w));
  console.log(formatField('Name', group.name, w));
  console.log(formatField('Income', group.is_income ? 'yes' : 'no', w));
  console.log(formatField('Hidden', group.hidden ? 'yes' : 'no', w));

  const categories = group.categories ?? [];
  if (categories.length) {
    console.log(formatSection('Categories'));
    console.log(
      formatTable(
        ['ID', 'NAME', 'HIDDEN'],
        categories.map((c) => [c.id ?? '', c.name ?? '', c.hidden ? 'yes' : 'no']),
      ),
    );
  }
}
