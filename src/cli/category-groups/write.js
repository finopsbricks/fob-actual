// @ts-check
import { clientFor } from '../_helpers.js';

export async function createCategoryGroupHandler(argv) {
  const actual = clientFor();
  const group = { name: argv.name };
  if (argv.isIncome !== undefined) group.is_income = argv.isIncome;

  if (argv.dryRun) {
    console.log(`[dry-run] Would create category group '${argv.name}'.`);
    return;
  }

  const id = await actual.categoryGroups.create(group);
  if (argv.json) {
    console.log(JSON.stringify({ id, ...group }, null, 2));
    return;
  }
  console.log(`Created category group '${argv.name}' (${id}).`);
}

export async function editCategoryGroupHandler(argv) {
  const fields = {};
  if (argv.name !== undefined) fields.name = argv.name;
  if (argv.hidden !== undefined) fields.hidden = argv.hidden;
  if (Object.keys(fields).length === 0) {
    throw new Error('Nothing to change. Pass --name or --hidden.');
  }

  const actual = clientFor();
  if (argv.dryRun) {
    console.log(`[dry-run] Would update category group ${argv.id}: ${JSON.stringify(fields)}`);
    return;
  }
  await actual.categoryGroups.update(argv.id, fields);
  console.log(`Updated category group ${argv.id}.`);
}

export async function deleteCategoryGroupHandler(argv) {
  const actual = clientFor();
  if (argv.dryRun) {
    console.log(
      `[dry-run] Would delete category group ${argv.id}` +
        (argv.transferTo ? `, moving its categories' transactions to ${argv.transferTo}` : '') + '.',
    );
    return;
  }
  if (!argv.yes) {
    throw new Error(`Refusing to delete category group ${argv.id} without --yes.`);
  }

  await actual.categoryGroups.delete(argv.id, { transferCategoryId: argv.transferTo });
  console.log(`Deleted category group ${argv.id}.`);
}
