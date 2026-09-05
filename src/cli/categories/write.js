// @ts-check
import { clientFor } from '../_helpers.js';

export async function createCategoryHandler(argv) {
  const actual = clientFor();
  const category = { name: argv.name, group_id: argv.group };
  if (argv.isIncome !== undefined) category.is_income = argv.isIncome;
  if (argv.hidden !== undefined) category.hidden = argv.hidden;

  if (argv.dryRun) {
    console.log(`[dry-run] Would create category '${argv.name}' in group ${argv.group}.`);
    return;
  }

  const id = await actual.categories.create(category);
  if (argv.json) {
    console.log(JSON.stringify({ id, ...category }, null, 2));
    return;
  }
  console.log(`Created category '${argv.name}' (${id}).`);
}

export async function editCategoryHandler(argv) {
  const fields = {};
  if (argv.name !== undefined) fields.name = argv.name;
  if (argv.group !== undefined) fields.group_id = argv.group;
  if (argv.hidden !== undefined) fields.hidden = argv.hidden;
  if (Object.keys(fields).length === 0) {
    throw new Error('Nothing to change. Pass --name, --group, or --hidden.');
  }

  const actual = clientFor();
  if (argv.dryRun) {
    console.log(`[dry-run] Would update category ${argv.id}: ${JSON.stringify(fields)}`);
    return;
  }

  await actual.categories.update(argv.id, fields);
  console.log(`Updated category ${argv.id}.`);
}

export async function deleteCategoryHandler(argv) {
  const actual = clientFor();

  if (argv.dryRun) {
    console.log(
      `[dry-run] Would delete category ${argv.id}` +
        (argv.transferTo ? `, moving its transactions to ${argv.transferTo}` : '') + '.',
    );
    return;
  }
  if (!argv.yes) {
    throw new Error(`Refusing to delete category ${argv.id} without --yes.`);
  }

  await actual.categories.delete(argv.id, { transferCategoryId: argv.transferTo });
  console.log(`Deleted category ${argv.id}.`);
}
