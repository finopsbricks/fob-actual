import { listProfiles } from '../config-store.js';
import { formatTable } from '../utils/format.js';

export async function listConfigHandler(argv) {
  const { current, path, profiles } = listProfiles();

  if (argv.json) {
    console.log(JSON.stringify({ current, profiles }, null, 2));
    return;
  }

  if (profiles.length === 0) {
    console.log('(no profiles configured — run `fob-actual config profiles add <name>`)');
    return;
  }

  const headers = ['', 'NAME', 'SERVER', 'BUDGET', 'SYNC ID', 'AUTH'];
  const rows = profiles.map((p) => [
    p.current ? '*' : ' ',
    p.name,
    p.server_url ?? '',
    p.budget_name ?? '',
    p.sync_id ?? '',
    p.has_session_token ? 'ok' : 'missing',
  ]);

  console.log(formatTable(headers, rows));
  console.log(`\n(* = current)  config: ${path}`);
}
