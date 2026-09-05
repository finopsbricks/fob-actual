// @ts-check
import { readFileSync } from 'node:fs';

import { clientFor } from '../_helpers.js';

/**
 * Rules carry arbitrary nested conditions/actions, so they are supplied as JSON
 * rather than flattened into flags — the same shape `rules show --json` emits,
 * which makes edit-and-resubmit the natural workflow.
 */
function readRule(argv) {
  if (argv.file) {
    try {
      return JSON.parse(readFileSync(argv.file, 'utf8'));
    } catch (err) {
      throw new Error(`Could not read --file ${argv.file}: ${err.message}`);
    }
  }
  if (argv.rule) {
    try {
      return JSON.parse(argv.rule);
    } catch (err) {
      throw new Error(`--rule is not valid JSON: ${err.message}`);
    }
  }
  throw new Error('Pass the rule as --rule <json> or --file <path>.');
}

export async function createRuleHandler(argv) {
  const rule = readRule(argv);
  const actual = clientFor();

  if (argv.dryRun) {
    console.log(`[dry-run] Would create rule: ${JSON.stringify(rule)}`);
    return;
  }

  const created = await actual.rules.create(rule);
  if (argv.json) {
    console.log(JSON.stringify(created, null, 2));
    return;
  }
  console.log(`Created rule ${created?.id ?? ''}.`);
}

export async function editRuleHandler(argv) {
  const rule = { ...readRule(argv), id: argv.id };
  const actual = clientFor();

  if (argv.dryRun) {
    console.log(`[dry-run] Would update rule ${argv.id}: ${JSON.stringify(rule)}`);
    return;
  }

  const updated = await actual.rules.update(rule);
  if (argv.json) {
    console.log(JSON.stringify(updated, null, 2));
    return;
  }
  console.log(`Updated rule ${argv.id}.`);
}

export async function deleteRuleHandler(argv) {
  const actual = clientFor();
  if (argv.dryRun) {
    console.log(`[dry-run] Would delete rule ${argv.id}.`);
    return;
  }
  if (!argv.yes) throw new Error(`Refusing to delete rule ${argv.id} without --yes.`);

  await actual.rules.delete(argv.id);
  console.log(`Deleted rule ${argv.id}.`);
}
