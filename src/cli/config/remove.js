import { removeProfile, loadConfig } from '../config-store.js';

export async function removeConfigHandler(argv) {
  if (!argv.yes) {
    throw new Error(`Refusing to remove profile '${argv.name}' without --yes.`);
  }
  removeProfile(argv.name);
  const { current_profile } = loadConfig();
  console.log(`Removed profile '${argv.name}'.`);
  console.error(
    current_profile ? `(current profile is now '${current_profile}')` : '(no profiles remain)',
  );
}
