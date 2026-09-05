import { safe, jsonOption } from '../_helpers.js';
import { infoServerHandler } from './info.js';

export function buildServerSubcommands(yargs) {
  return yargs
    .usage('$0 server <action> [options]')
    .command(['info', 'version'], 'Show the server URL and version', (y) => jsonOption(y), safe(infoServerHandler))
    .demandCommand(1, 'Specify an action: info');
}
