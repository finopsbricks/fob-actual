// @ts-check
import { clientFor } from '../_helpers.js';

export async function createTagHandler(argv) {
  const actual = clientFor();
  const tag = { tag: argv.tag };
  if (argv.color !== undefined) tag.color = argv.color;
  if (argv.description !== undefined) tag.description = argv.description;

  if (argv.dryRun) {
    console.log(`[dry-run] Would create tag '${argv.tag}'.`);
    return;
  }

  const id = await actual.tags.create(tag);
  if (argv.json) {
    console.log(JSON.stringify({ id, ...tag }, null, 2));
    return;
  }
  console.log(`Created tag '${argv.tag}' (${id}).`);
}

export async function editTagHandler(argv) {
  const fields = {};
  if (argv.tag !== undefined) fields.tag = argv.tag;
  if (argv.color !== undefined) fields.color = argv.color;
  if (argv.description !== undefined) fields.description = argv.description;
  if (Object.keys(fields).length === 0) {
    throw new Error('Nothing to change. Pass --tag, --color, or --description.');
  }

  const actual = clientFor();
  if (argv.dryRun) {
    console.log(`[dry-run] Would update tag ${argv.id}: ${JSON.stringify(fields)}`);
    return;
  }
  await actual.tags.update(argv.id, fields);
  console.log(`Updated tag ${argv.id}.`);
}

export async function deleteTagHandler(argv) {
  const actual = clientFor();
  if (argv.dryRun) {
    console.log(`[dry-run] Would delete tag ${argv.id}.`);
    return;
  }
  if (!argv.yes) throw new Error(`Refusing to delete tag ${argv.id} without --yes.`);

  await actual.tags.delete(argv.id);
  console.log(`Deleted tag ${argv.id}.`);
}
