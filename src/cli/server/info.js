// @ts-check
import { clientFor, requireCreds } from '../_helpers.js';
import { formatField } from '../utils/format.js';

/** Show the configured server and the version it reports. */
export async function infoServerHandler(argv) {
  const creds = requireCreds();
  const actual = clientFor();
  const version = await actual.serverVersion();

  if (argv.json) {
    console.log(JSON.stringify({ server_url: creds.server_url, version }, null, 2));
    return;
  }

  const w = 12;
  console.log(formatField('Server', creds.server_url, w));
  console.log(formatField('Version', version, w));
}
