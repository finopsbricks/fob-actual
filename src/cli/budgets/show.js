// @ts-check
import { clientFor } from '../_helpers.js';
import { formatField, formatSection, formatTable } from '../utils/format.js';

/** Show one budget file by sync id, cloud file id, or name. */
export async function showBudgetHandler(argv) {
  const actual = clientFor();
  const b = await actual.budgets.get(argv.id);

  if (argv.json) {
    console.log(JSON.stringify(b, null, 2));
    return;
  }
  if (!b) {
    console.error(`No budget found for: ${argv.id}`);
    process.exit(1);
  }

  const w = 16;
  console.log(formatField('Name', b.name, w));
  console.log(formatField('Sync ID', b.groupId, w));
  console.log(formatField('File ID', b.cloudFileId, w));
  console.log(formatField('State', b.state, w));
  console.log(formatField('Encrypted', b.encryptKeyId ? 'yes' : 'no', w));

  const users = b.usersWithAccess ?? [];
  if (users.length) {
    console.log(formatSection('Users with access'));
    console.log(
      formatTable(
        ['USER', 'NAME', 'OWNER'],
        users.map((u) => [u.userName || '(unnamed)', u.displayName || '', u.owner ? 'yes' : 'no']),
      ),
    );
  }
}
