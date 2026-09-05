import { listProfiles } from '../config-store.js';
import { refreshIdentity } from './_identity.js';

/**
 * Re-sync cached budget metadata from the server. The server is the source of
 * truth; this fixes drift after a budget is renamed or re-pointed.
 */
export async function refreshConfigHandler(argv) {
  const names = argv.all ? listProfiles().profiles.map((p) => p.name) : [argv.name];
  if (!names.length || (!argv.all && !argv.name)) {
    throw new Error('Specify a profile name, or --all.');
  }

  let failed = 0;
  for (const name of names) {
    const identity = await refreshIdentity(name);
    if (identity) {
      console.log(`${name}: ${identity.budget_name} (${identity.sync_id})`);
    } else {
      console.error(`${name}: could not resolve (check credentials and --sync-id)`);
      failed += 1;
    }
  }
  if (failed === names.length) process.exit(1);
}
