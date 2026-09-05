import { useProfile } from '../config-store.js';

export async function useConfigHandler(argv) {
  useProfile(argv.name);
  console.log(`Now using profile '${argv.name}'.`);
}
