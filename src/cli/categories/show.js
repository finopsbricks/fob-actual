// @ts-check
import { clientFor } from '../_helpers.js';
import { formatField } from '../utils/format.js';

export async function showCategoryHandler(argv) {
  const actual = clientFor();
  const { category, group } = await actual.hold(async () => {
    const found = await actual.categories.get(argv.id);
    if (!found) return { category: null, group: null };
    const groups = await actual.categoryGroups.listAll();
    return { category: found, group: groups.find((g) => g.id === found.group_id) ?? null };
  });

  if (argv.json) {
    console.log(JSON.stringify(category, null, 2));
    return;
  }
  if (!category) {
    console.error(`No category found for id: ${argv.id}`);
    process.exit(1);
  }

  const w = 12;
  console.log(formatField('ID', category.id, w));
  console.log(formatField('Name', category.name, w));
  console.log(formatField('Group', group ? `${group.name} (${group.id})` : category.group_id, w));
  console.log(formatField('Income', category.is_income ? 'yes' : 'no', w));
  console.log(formatField('Hidden', category.hidden ? 'yes' : 'no', w));
}
