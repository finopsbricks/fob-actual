# fob-actual

Actual Budget client **and** CLI in one package — import it in a worker, or drive it from the
terminal.

```bash
fob-actual accounts list
fob-actual budgets month 2026-09
fob-actual transactions list --account "Checking 1234" --from 2026-08-01
```

## How this wrapper differs

Actual has **no callable REST API**. Upstream is explicit: *"Actual does not expose HTTP endpoints
that can be called."* The sync server stores opaque, optionally end-to-end-encrypted blobs and
cannot read or modify a budget — all the domain logic lives in the official `@actual-app/api`
package, which downloads the budget to a local SQLite copy, queries it, and syncs CRDT messages
back.

So where the other `fob-*` wrappers hold an HTTP transport, this one holds an **engine session**
(`src/engine.js`), and two things follow:

- **One budget at a time.** The engine is a process-wide singleton, so a profile pins one budget
  and `--profile` switches between them.
- **A local cache.** Each profile keeps a SQLite copy of its budget under
  `~/.fob/fob-actual/data/<profile>/`. First run downloads; later runs sync the delta.

## Install

```bash
npm install -g @finopsbricks/fob-actual
```

Requires **Node ≥ 22** (the engine enforces this).

## Authentication

Actual authenticates with a **session token**. How you get one depends on the server:

| Server login method | How to authenticate |
|---|---|
| Password | `fob-actual auth login --password <pw>` — mints a token directly |
| OpenID / OAuth (Google, Authentik, …) | `fob-actual auth login` — guides you through copying the token from a logged-in browser |

OpenID servers have **no headless login**: the flow is a browser redirect with PKCE, and upstream
documents `ACTUAL_SESSION_TOKEN` without saying how to obtain one. `auth login` walks you through
retrieving it from the browser's IndexedDB (`actual` → `asyncStorage` → `user-token`).

Whether tokens expire is a **server** setting (`ACTUAL_TOKEN_EXPIRATION`), which defaults to
`never`. On such a server a stored token keeps working, which is what makes worker use practical.

### Getting started

```bash
# 1. Store a token (prompts if you don't pass --session-token)
fob-actual auth login --server-url https://budget.example.com

# 2. See which budgets that token can reach
fob-actual budgets list

# 3. Bind a profile to one of them
fob-actual config profiles add personal \
  --server-url https://budget.example.com \
  --session-token <token> \
  --sync-id 1b4e28ba-2fa1-41d2-883f-0016d3cca427

# 4. Confirm
fob-actual auth status
```

## Configuration

Profiles live in `~/.fob/fob-actual/config.yml` (mode `0600`). One profile = one budget.

```yaml
current_profile: personal
profiles:
  personal:
    server_url: https://budget.example.com
    session_token: <secret>
    sync_id: 1b4e28ba-2fa1-41d2-883f-0016d3cca427
    budget_name: Household Budget          # cached from the server, for display
  fob:
    server_url: https://budget.example.com
    session_token: <secret>
    sync_id: 6fa459ea-ee8a-4ca4-894e-db77e160355e
    budget_name: Business Budget
```

**Precedence: `--profile` flag > `FOB_ACTUAL_*` env > current profile.**

| Variable | Purpose |
|---|---|
| `FOB_ACTUAL_SERVER_URL` | Sync server URL |
| `FOB_ACTUAL_SESSION_TOKEN` | Session token |
| `FOB_ACTUAL_SYNC_ID` | Budget sync id |
| `FOB_ACTUAL_ENCRYPTION_PASSWORD` | Password for an end-to-end encrypted budget |
| `FOB_ACTUAL_DATA_DIR` | Local budget cache location |
| `FOB_ACTUAL_CONFIG_DIR` | Relocate the whole config dir (tests, containers, CI) |

```bash
fob-actual config profiles list        # all profiles, current marked with *
fob-actual config profiles use fob     # switch budget
fob-actual config profiles refresh --all
fob-actual --profile fob accounts list # override for one command
```

## Command grammar

```
fob-actual <resource> <action> [target] [options]
```

| Resource | Actions |
|---|---|
| `config profiles` | `list`, `current`, `add`, `use`, `remove`, `refresh` |
| `auth` | `login`, `status`, `logout` |
| `budgets` | `list`, `show`, `sync`, `months`, `month`, `set-amount`, `carryover`, `hold`, `reset-hold` |
| `accounts` | `list`, `show`, `balance`, `create`, `edit`, `close`, `reopen`, `delete` |
| `transactions` | `list`, `add`, `import`, `edit`, `delete` |
| `categories` | `list`, `show`, `create`, `edit`, `delete` |
| `category-groups` | `list`, `show`, `create`, `edit`, `delete` |
| `payees` | `list`, `show`, `create`, `edit`, `delete`, `merge` |
| `rules` | `list`, `show`, `create`, `edit`, `delete` |
| `schedules` | `list`, `show`, `create`, `edit`, `delete` |
| `tags` | `list`, `show`, `create`, `edit`, `delete` |
| `query` | `run` |
| `server` | `info` |

Every read command takes `--json`; every `list` also takes `--fields`, `--format table|csv|json`,
`--output <file>`, and `--limit`. Data goes to stdout, diagnostics to stderr, so pipes stay clean:

```bash
fob-actual accounts list --json | jq '.accounts[].name'
fob-actual transactions list --account "Checking 1234" --format csv --output txns.csv
```

### Money is in integer minor units

The engine stores amounts as integers (`5176357` = `51,763.57`). The CLI formats them for display
and parses decimals you type (`--amount 1250.00`), but `--json` shows the raw integers — that is
the engine's own representation, kept faithful for scripting.

## Writes are real, and shared

Writes sync CRDT messages into a live budget that other people may share. Beyond the standard's
baseline:

- **`--dry-run`** on every write command shows what would change without writing.
- **`--yes`** is required for every destructive action.

## Use as a library

Workers import the same functions the CLI calls, so a terminal prototype ships unchanged:

```js
import { fobActual } from '@finopsbricks/fob-actual';

const actual = fobActual({
  server_url: process.env.FOB_ACTUAL_SERVER_URL,
  session_token: process.env.FOB_ACTUAL_SESSION_TOKEN,
  sync_id: process.env.FOB_ACTUAL_SYNC_ID,
  data_dir: '/var/cache/fob-actual',
});

const accounts = await actual.accounts.list();
const balance = await actual.accounts.balance(accounts[0].id);
```

Each call opens and closes an engine session, so a client is safe to hold across calls but is **not
concurrent** — the engine allows one session per process. For several budgets, construct one client
each and use them in sequence.

## Development

```bash
npm test              # jest (ESM)
npm run typecheck     # tsc over JSDoc types
FOB_DEBUG=1 fob-actual ...   # full stack traces + raw engine chatter
```

## License

Apache-2.0
