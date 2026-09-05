// @ts-check
import { clientFor } from '../_helpers.js';
import { formatField, formatSection, formatTable } from '../utils/format.js';

export async function showRuleHandler(argv) {
  const actual = clientFor();
  const rule = await actual.rules.get(argv.id);

  if (argv.json) {
    console.log(JSON.stringify(rule, null, 2));
    return;
  }
  if (!rule) {
    console.error(`No rule found for id: ${argv.id}`);
    process.exit(1);
  }

  const w = 14;
  console.log(formatField('ID', rule.id, w));
  console.log(formatField('Stage', rule.stage ?? 'default', w));
  console.log(formatField('Conditions op', rule.conditionsOp, w));

  const rows = (parts) =>
    (parts ?? []).map((p) => [p.field ?? '', p.op ?? '', JSON.stringify(p.value ?? '')]);

  console.log(formatSection('Conditions'));
  console.log(formatTable(['FIELD', 'OP', 'VALUE'], rows(rule.conditions)));
  console.log(formatSection('Actions'));
  console.log(formatTable(['FIELD', 'OP', 'VALUE'], rows(rule.actions)));
}
