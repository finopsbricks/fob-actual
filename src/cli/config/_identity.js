/**
 * Resolve a profile's server-side identity (which budget its sync id points at)
 * and cache it as non-secret metadata, so `profiles list` is self-describing.
 *
 * Per the config standard: the server is the source of truth, the cache is for
 * display, and `refresh` fixes drift. Adding credentials must never block on
 * this network call — every path here returns rather than throws.
 */

import { fobActual } from '../../index.js';
import { getProfile, setProfileIdentity, defaultDataDir } from '../config-store.js';

/**
 * Look up the budget a profile points at and cache its name.
 * @returns {Promise<{sync_id: string, budget_name: string}|null>} null if unresolvable
 */
export async function refreshIdentity(name) {
  let profile;
  try {
    profile = getProfile(name);
  } catch {
    return null;
  }
  if (!profile.server_url || !profile.session_token) return null;

  try {
    const client = fobActual({ ...profile, data_dir: profile.data_dir || defaultDataDir(name) });
    const budgets = await client.budgets.list();

    // Match on the configured sync id; with none set and exactly one budget
    // available, adopt it — the common single-budget case.
    const match = profile.sync_id
      ? budgets.find((b) => b.groupId === profile.sync_id || b.cloudFileId === profile.sync_id)
      : budgets.length === 1
        ? budgets[0]
        : null;
    if (!match) return null;

    const identity = { sync_id: match.groupId, budget_name: match.name };
    setProfileIdentity(name, identity);
    return identity;
  } catch {
    return null;
  }
}
