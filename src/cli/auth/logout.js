import { clearProfileToken, loadConfig } from '../config-store.js';

/** Forget the stored session token, leaving the rest of the profile intact. */
export async function logoutHandler(argv) {
  const cfg = loadConfig();
  const name = argv.profile || cfg.current_profile;
  if (!name) throw new Error('No profile selected.');

  clearProfileToken(name);
  console.log(`Cleared session token for profile '${name}'.`);
  console.error(
    'The token remains valid on the server until it expires or is revoked there — ' +
      'log out in the Actual web UI to invalidate it.',
  );
}
