// @ts-check
import { clientFor } from '../_helpers.js';
import { formatField, formatSection, formatTable } from '../utils/format.js';

export async function showPayeeHandler(argv) {
  const actual = clientFor();
  const { payee, rules } = await actual.hold(async () => {
    const found = await actual.payees.get(argv.id);
    return { payee: found, rules: found ? await actual.rules.forPayee(found.id) : [] };
  });

  if (argv.json) {
    console.log(JSON.stringify(payee, null, 2));
    return;
  }
  if (!payee) {
    console.error(`No payee found for id: ${argv.id}`);
    process.exit(1);
  }

  const w = 12;
  console.log(formatField('ID', payee.id, w));
  console.log(formatField('Name', payee.name, w));
  console.log(formatField('Transfer', payee.transfer_acct, w));

  if (rules.length) {
    console.log(formatSection('Rules'));
    console.log(
      formatTable(
        ['ID', 'STAGE', 'CONDITIONS', 'ACTIONS'],
        rules.map((r) => [
          r.id ?? '',
          r.stage ?? '',
          String(r.conditions?.length ?? 0),
          String(r.actions?.length ?? 0),
        ]),
      ),
    );
  }
}
