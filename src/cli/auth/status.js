import { clientFor, requireCreds } from '../_helpers.js';
import { formatField } from '../utils/format.js';

/**
 * Validate the stored session token against the server and report the identity
 * it authenticates as.
 */
export async function statusHandler(argv) {
  const creds = requireCreds();

  if (!creds.session_token) {
    console.error('No session token stored. Run `fob-actual auth login`.');
    process.exit(1);
  }

  const client = clientFor();
  const budgets = await client.budgets.list();
  const bound = creds.sync_id
    ? budgets.find((b) => b.groupId === creds.sync_id || b.cloudFileId === creds.sync_id)
    : null;

  if (argv.json) {
    console.log(
      JSON.stringify(
        {
          profile: creds.name,
          source: creds.source,
          server_url: creds.server_url,
          valid: true,
          sync_id: creds.sync_id ?? null,
          budget_name: bound?.name ?? null,
          budgets_visible: budgets.length,
        },
        null,
        2,
      ),
    );
    return;
  }

  const w = 18;
  console.log(formatField('Profile', creds.name ?? '(env)', w));
  console.log(formatField('Server', creds.server_url, w));
  console.log(formatField('Token', 'valid', w));
  console.log(formatField('Budgets visible', budgets.length, w));
  console.log(formatField('Bound budget', bound ? `${bound.name} (${bound.groupId})` : '(none)', w));
  if (creds.sync_id && !bound) {
    console.error(
      `\nWarning: sync id ${creds.sync_id} is not among the budgets this token can see.`,
    );
  }
}
