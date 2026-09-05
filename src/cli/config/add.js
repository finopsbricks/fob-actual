import { addProfile, getProfile } from '../config-store.js';
import { refreshIdentity } from './_identity.js';

/**
 * Add or update a profile (upsert — only the flags you pass are changed).
 *
 * A usable profile needs a server URL and a session token. The sync id (which
 * budget) can be filled in later, either explicitly with --sync-id or resolved
 * automatically when the server has exactly one budget.
 */
export async function addConfigHandler(argv) {
  let existing = {};
  try {
    existing = getProfile(argv.name);
  } catch {
    /* new profile */
  }

  const fields = {};
  if (argv.serverUrl) fields.server_url = argv.serverUrl.replace(/\/+$/, '');
  if (argv.sessionToken) fields.session_token = argv.sessionToken;
  if (argv.syncId) fields.sync_id = argv.syncId;
  if (argv.encryptionPassword) fields.encryption_password = argv.encryptionPassword;
  if (argv.dataDir) fields.data_dir = argv.dataDir;

  const merged = { ...existing, ...fields };
  const missing = ['server_url', 'session_token'].filter((k) => !merged[k]);
  if (missing.length) {
    throw new Error(
      `Profile '${argv.name}' is missing: ${missing.join(', ')}. ` +
        'Provide --server-url and --session-token (get a token with `fob-actual auth login`).',
    );
  }

  addProfile(argv.name, fields);
  console.log(`Saved Actual credentials for profile '${argv.name}'.`);

  // Best-effort self-describe. Never blocks the save.
  const resolved = await refreshIdentity(argv.name);
  if (resolved) {
    console.log(`Resolved budget '${resolved.budget_name}' for profile '${argv.name}'.`);
  } else if (!merged.sync_id) {
    console.error(
      'Could not auto-resolve the budget (multiple or zero budgets, or a fetch error). ' +
        `Run \`fob-actual budgets list\`, then \`fob-actual config profiles add ${argv.name} --sync-id <id>\`.`,
    );
  }
}
