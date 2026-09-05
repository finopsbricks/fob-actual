import { describeCurrent } from '../config-store.js';
import { formatField } from '../utils/format.js';

/** Show which identity the CLI would use right now, and where it came from. */
export async function currentConfigHandler(argv) {
  const creds = describeCurrent();

  if (argv.json) {
    console.log(JSON.stringify(creds, null, 2));
    return;
  }

  if (!creds) {
    console.error('No profile selected. Run `fob-actual config profiles add <name>`.');
    process.exit(1);
  }

  const w = 16;
  console.log(formatField('Profile', creds.name ?? '(env)', w));
  console.log(formatField('Source', creds.source, w));
  console.log(formatField('Server', creds.server_url, w));
  console.log(formatField('Budget', creds.budget_name, w));
  console.log(formatField('Sync ID', creds.sync_id, w));
  console.log(formatField('Data dir', creds.data_dir, w));
}
