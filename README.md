# fob-actual — Actual Budget CLI and client library

Work with your [Actual Budget](https://actualbudget.org/) from the terminal, from an AI agent,
or from Node code. One package, two ways in:

- **The CLI** (`fob-actual`): accounts, transactions, the monthly budget, categories, payees,
  rules, schedules and ActualQL queries. `--json` and CSV output for scripts, `--dry-run` on
  every write, and agent-friendly.
  → [finopsbricks.com/cli/fob-actual](https://finopsbricks.com/cli/fob-actual)
- **The library** (`import { fobActual }`): the same operations as a Node client for scripts
  and workers. The CLI calls the same code, so the two never drift.
  → [Docs](https://finopsbricks.com/docs/actual)

You need your own Actual **sync server** (self-hosted, or a hosted one such as PikaPods).

Beta. Actual Budget is MIT-licensed open source; this project is not affiliated with or
endorsed by it.

## Install

```bash
npm install -g @finopsbricks/fob-actual
```

Requires Node.js 22 or later. If you use the [`fob` dispatcher](https://www.npmjs.com/package/@finopsbricks/fob-cli),
`fob actual …` and `fob-actual …` are the same command.

## Connect your budget

One command signs in, stores a profile and picks your budget:

```bash
read -rs ACTUAL_PW        # your Actual server password; keeps it out of your shell history
fob-actual auth login --profile household \
  --server-url https://budget.example.com --password "$ACTUAL_PW"
unset ACTUAL_PW
```

```text
Signed in with password.
Stored session token for profile 'household'.
Token valid — 1 budget(s) visible.
Profile 'household' is bound to budget 'Household Budget'.
```

- **Several budgets on the server?** `auth login` prints a `config profiles add … --sync-id`
  line for each. Run the one you want. The Sync ID is also in Actual under
  **Settings → Show advanced settings**.
- **Server signs in with OpenID** (Google, Authentik…)? Leave out `--password`: `auth login`
  shows how to copy your session token from a browser that's signed in to Actual, and asks you
  to paste it.
- **End-to-end encrypted budget?** Add `--encryption-password` with `config profiles add`.

Then:

```bash
fob-actual accounts list
fob-actual transactions list --account Checking --from 2026-09-01
```

Full guide: [Connect your budget](https://finopsbricks.com/docs/actual/connect).
Problems: [Troubleshooting](https://finopsbricks.com/docs/actual/troubleshooting).

## Use the CLI

Grammar: `fob-actual <resource> <action> [target] [options]`. Run `fob-actual <resource> --help`
for its actions, or `fob-actual <resource> <action> --help` for flags.

| Resource | Actions |
| --- | --- |
| `config profiles` | `list`, `current`, `add`, `use`, `remove`, `refresh` |
| `auth` | `login`, `status`, `logout` |
| `budgets` | `list`, `show`, `sync`, `months`, `month`, `set-amount`, `carryover`, `hold`, `reset-hold` |
| `accounts` | `list`, `show`, `balance`, `create`, `edit`, `close`, `reopen`, `delete` |
| `transactions` | `list`, `add`, `import`, `edit`, `delete` |
| `categories`, `category-groups`, `tags` | `list`, `show`, `create`, `edit`, `delete` |
| `payees` | `list`, `show`, `create`, `edit`, `delete`, `merge` |
| `rules`, `schedules` | `list`, `show`, `create`, `edit`, `delete` |
| `query` | `run` (ActualQL) |
| `server` | `info` |

```bash
fob-actual budgets month 2026-09
fob-actual transactions add --account Checking --date 2026-09-20 --amount -42.50 --payee "Coffee Shop" --dry-run
fob-actual transactions import --account Checking --file txns.json --dry-run   # Actual's dedupe and rules
fob-actual payees list --format csv --output payees.csv
fob-actual query run --table transactions --select date,amount,payee.name --filter '{"amount":{"$lt":0}}'
```

- **Accounts accept a name or an ID.** An ambiguous name is refused rather than guessed.
- **Every write has `--dry-run`**, and every destructive action needs `--yes`. Writes sync into
  your live budget, which other people may share.
- **`--json`** keeps money in Actual's integer minor units (`-4250` is −42.50). Tables format
  it. On the command line you type decimals (`--amount -42.50`); import files use minor units.
- **Every `list`** takes `--fields`, `--format table|csv|json`, `--output <file>` and
  `--limit`. Data goes to stdout, notes and errors to stderr.

## Use as a library

```js
import { fobActual } from '@finopsbricks/fob-actual';

const actual = fobActual({
  server_url: 'https://budget.example.com',
  session_token: process.env.ACTUAL_TOKEN,
  sync_id: '1b4e28ba-2fa1-41d2-883f-0016d3cca427',
  data_dir: '/var/cache/fob-actual',
});

// Several calls share one session inside hold(); without it each call reopens the budget.
const balances = await actual.hold(async () => {
  const out = {};
  for (const a of await actual.accounts.list()) out[a.name] = await actual.accounts.balance(a.id);
  return out;
});
```

The library takes credentials as arguments and never reads the environment or the config file.
The Actual engine allows one budget session per process, so a client isn't safe for concurrent
use: use clients one after another. See [Use the library](https://finopsbricks.com/docs/actual/integration/library).

## Credentials and configuration

- **CLI:** profiles in `~/.fob/fob-actual/config.yml` (mode 0600), one per budget. Switch with
  `config profiles use` or `--profile`. Override the folder with `FOB_ACTUAL_CONFIG_DIR`.
- **Workers and CI:** `FOB_ACTUAL_SERVER_URL` plus `FOB_ACTUAL_SESSION_TOKEN` (both required),
  and optionally `FOB_ACTUAL_SYNC_ID`, `FOB_ACTUAL_ENCRYPTION_PASSWORD` and
  `FOB_ACTUAL_DATA_DIR`. See `.env.example`.
- **Precedence:** `--profile` > `FOB_ACTUAL_*` environment > current profile.
- **Local copy:** each profile keeps a copy of its budget (decrypted, if encrypted) under
  `~/.fob/fob-actual/data/<profile>/`, owner-only (mode 0700).

Credentials go only to your Actual server, never to FinOpsBricks.

## Beta limits

- Needs an Actual sync server; budgets that live only on one device aren't supported.
- OpenID servers: the session token is copied from a browser. There's no browser login flow.
- Bank sync isn't available from fob-actual.
- One budget session per process; two commands running at once on the same profile aren't
  guarded against each other.
- `--limit` trims results after they're read; there's no server-side paging.
- Tables show amounts with two decimals and no currency symbol.
- `auth logout` only forgets the token locally. Passwords and tokens passed as flags land in
  your shell history; use `read -rs` as above.
- Built and tested against Actual 26.9 (`@actual-app/api` 26.9.0).

Missing something? [Open an issue](https://github.com/finopsbricks/fob-actual/issues).

## Develop

```bash
npm install
npm test                      # jest (ESM)
npm run typecheck             # tsc over JSDoc types
FOB_DEBUG=1 fob-actual …      # full stack traces and the engine's own logging
```

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

Apache-2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE).
