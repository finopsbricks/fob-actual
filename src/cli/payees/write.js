// @ts-check
import { clientFor } from '../_helpers.js';

export async function createPayeeHandler(argv) {
  const actual = clientFor();
  if (argv.dryRun) {
    console.log(`[dry-run] Would create payee '${argv.name}'.`);
    return;
  }
  const id = await actual.payees.create({ name: argv.name });
  if (argv.json) {
    console.log(JSON.stringify({ id, name: argv.name }, null, 2));
    return;
  }
  console.log(`Created payee '${argv.name}' (${id}).`);
}

export async function editPayeeHandler(argv) {
  const fields = {};
  if (argv.name !== undefined) fields.name = argv.name;
  if (argv.favorite !== undefined) fields.favorite = argv.favorite;
  if (Object.keys(fields).length === 0) {
    throw new Error('Nothing to change. Pass --name or --favorite.');
  }

  const actual = clientFor();
  if (argv.dryRun) {
    console.log(`[dry-run] Would update payee ${argv.id}: ${JSON.stringify(fields)}`);
    return;
  }
  await actual.payees.update(argv.id, fields);
  console.log(`Updated payee ${argv.id}.`);
}

export async function deletePayeeHandler(argv) {
  const actual = clientFor();
  if (argv.dryRun) {
    console.log(`[dry-run] Would delete payee ${argv.id}.`);
    return;
  }
  if (!argv.yes) throw new Error(`Refusing to delete payee ${argv.id} without --yes.`);

  await actual.payees.delete(argv.id);
  console.log(`Deleted payee ${argv.id}.`);
}

export async function mergePayeesHandler(argv) {
  const actual = clientFor();
  const from = argv.from;

  if (argv.dryRun) {
    console.log(`[dry-run] Would merge ${from.join(', ')} into ${argv.id}.`);
    return;
  }
  if (!argv.yes) {
    throw new Error('Refusing to merge without --yes. Merging rewrites transactions and cannot be undone.');
  }

  await actual.payees.merge(argv.id, from);
  console.log(`Merged ${from.length} payee(s) into ${argv.id}.`);
}
