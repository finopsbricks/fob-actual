import { safe, localOptions, jsonOption } from '../_helpers.js';
import { loginHandler } from './login.js';
import { statusHandler } from './status.js';
import { logoutHandler } from './logout.js';

export function buildAuthSubcommands(yargs) {
  return yargs
    .usage('$0 auth <action> [options]')
    .command(
      'login',
      'Store a session token for the current profile',
      (y) =>
        localOptions(y)
          .option('server-url', { describe: 'Actual sync server URL', type: 'string' })
          .option('session-token', {
            describe: 'Token to store (skips the interactive prompt)',
            type: 'string',
          })
          .option('password', {
            describe: 'Sign in with a server password (password-auth servers only)',
            type: 'string',
          }),
      safe(loginHandler),
    )
    .command(
      'status',
      'Validate the stored token and show the bound budget',
      (y) => jsonOption(y),
      safe(statusHandler),
    )
    .command('logout', 'Forget the stored session token', (y) => localOptions(y), safe(logoutHandler))
    .demandCommand(1, 'Specify an action: login, status, logout');
}
