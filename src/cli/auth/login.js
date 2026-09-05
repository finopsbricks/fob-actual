import { input } from '@inquirer/prompts';

import { addProfile, getProfile, loadConfig, defaultDataDir } from '../config-store.js';
import { refreshIdentity } from '../config/_identity.js';
import { fobActual } from '../../index.js';

/**
 * Store a session token for a profile, then validate it against the server.
 *
 * Actual has no headless login when the server uses OpenID/OAuth: the flow is a
 * browser redirect with PKCE, and upstream documents `ACTUAL_SESSION_TOKEN`
 * without saying how to obtain one. So this command guides the retrieval rather
 * than automating it — paste the token from a logged-in browser session.
 *
 * With `--password`, a password-auth server can mint the token directly; that is
 * the officially documented path and needs no browser.
 */
export async function loginHandler(argv) {
  const cfg = loadConfig();
  const name = argv.profile || cfg.current_profile || 'default';

  let existing = {};
  try {
    existing = getProfile(name);
  } catch {
    /* new profile */
  }

  const serverUrl = (argv.serverUrl || existing.server_url || '').replace(/\/+$/, '');
  if (!serverUrl) {
    throw new Error('No server URL. Pass --server-url <url> (or configure the profile first).');
  }

  let token = argv.sessionToken;

  if (!token && argv.password) {
    token = await mintTokenWithPassword(serverUrl, argv.password);
    console.error('Signed in with password.');
  }

  if (!token) {
    printTokenInstructions(serverUrl);
    token = (await input({ message: 'Paste the user-token value:' })).trim();
  }
  if (!token) throw new Error('No token provided.');

  addProfile(name, { server_url: serverUrl, session_token: token });
  console.log(`Stored session token for profile '${name}'.`);

  // Validate immediately — a token that does not work should fail here, not on
  // the user's next command.
  const client = fobActual({
    ...getProfile(name),
    data_dir: existing.data_dir || defaultDataDir(name),
  });
  const budgets = await client.budgets.list();
  console.log(`Token valid — ${budgets.length} budget(s) visible.`);

  const identity = await refreshIdentity(name);
  if (identity) {
    console.log(`Profile '${name}' is bound to budget '${identity.budget_name}'.`);
  } else if (budgets.length > 1) {
    console.error('Multiple budgets found. Bind one with:');
    for (const b of budgets) {
      console.error(`  fob-actual config profiles add ${name} --sync-id ${b.groupId}   # ${b.name}`);
    }
  }
}

/** Exchange a server password for a session token (password-auth servers only). */
async function mintTokenWithPassword(serverUrl, password) {
  const res = await fetch(`${serverUrl}/account/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ loginMethod: 'password', password }),
  });
  const body = await res.json().catch(() => ({}));
  if (body?.status !== 'ok' || !body?.data?.token) {
    const reason = body?.reason || `HTTP ${res.status}`;
    throw new Error(
      `Password login failed (${reason}). ` +
        'If this server uses OpenID, omit --password and paste a browser token instead.',
    );
  }
  return body.data.token;
}

/** Print the browser-retrieval steps for an OpenID/OAuth server. */
function printTokenInstructions(serverUrl) {
  console.error(`
This server may use OpenID/OAuth, which has no headless login. Get the token
from a browser already signed in to Actual:

  1. Open ${serverUrl} and log in.
  2. Open DevTools -> Application -> IndexedDB -> "actual" -> "asyncStorage".
  3. Copy the value of the "user-token" key.

Or paste this in the DevTools Console on that page:

  (await new Promise(r => { const q = indexedDB.open('actual'); q.onsuccess = e => r(e.target.result); }))
    .transaction(['asyncStorage'], 'readonly').objectStore('asyncStorage').get('user-token')
    .onsuccess = e => console.log(e.target.result);
`);
}
