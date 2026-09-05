# CLAUDE.md

Guidance for Claude Code when working with this package.

## Overview

`@finopsbricks/fob-actual` (binary `fob-actual`) is the **Actual Budget** wrapper: an importable
client **and** a CLI over the same functions, built to
`alex/engineering-standards/cli/`. Reachable via the `fob` dispatcher as `fob actual <resource>
<action>`.

Structurally it mirrors **`fob-zb`** (external SaaS, 2-in-1, profiles). Copy patterns from there
before inventing anything: `src/cli/utils/format.js`, `src/cli/utils/list.js`, `_helpers.js`
(`safe()`, `localOptions()`), and the `tests/helpers.js` `captureOutput()` harness all came from it.

## The one thing that makes this wrapper different

**Actual has no callable REST API.** Upstream is explicit: *"Actual does not expose HTTP endpoints
that can be called."* The sync server stores opaque, optionally end-to-end-encrypted blobs and
cannot read or modify a budget.

So where every other `fob-*` has `src/http.js`, this one has **`src/engine.js`** — a stateful
session over the official `@actual-app/api` package:

```
init(serverURL, sessionToken, dataDir) -> downloadBudget -> ops -> sync -> shutdown
```

Three consequences that will bite you if forgotten:

1. **One open budget per process.** The engine is a singleton. A handler making more than one
   client call **must** wrap them in `actual.hold(async () => { ... })`, or the second call fails
   with `No budget file is open` — the first closed the budget on its way out.
2. **The engine writes progress chatter to stdout.** `muffle()` in `engine.js` redirects it to
   stderr around lifecycle calls only, never around a handler body — a handler's `console.log` is
   the command's data. Without this, `--json | jq` breaks.
3. **Startup is expensive** (network sync + SQLite open), so the per-profile data dir is a cache.
   Never point two profiles at one data dir.

## Auth: session token (a fourth pattern)

None of the standard's three auth patterns fit. Closest to Pattern B (OAuth2), but with OpenID +
PKCE there is **no long-lived refresh token to store and exchange headlessly** — the session token
itself is what gets persisted.

Upstream documents `ACTUAL_SESSION_TOKEN` but **never says how to obtain one** when OpenID is on.
`auth login` fills that gap: it guides retrieval from the browser's IndexedDB
(`actual` → `asyncStorage` → `user-token`), or mints one directly with `--password` on a
password-auth server.

Whether tokens expire is the **server's** `ACTUAL_TOKEN_EXPIRATION` setting, which defaults to
`never`.

## Engine gotchas found the hard way

- **`getCategories({hidden: true})` is a filter, not an include-flag.** It returns *only* hidden
  rows. Use `categories.listAll()` / `categoryGroups.listAll()` for any id→name lookup.
- **Money is integer minor units** (`5176357` = 51,763.57). Use `formatAmount` / `parseAmount`;
  `parseAmount` scales via the decimal string because `1.005 * 100` is `100.49999…` in binary
  floating point and would silently drop a cent.
- **`aqlQuery` calls `query.serialize()`**, so a plain state object is rejected — rebuild a real
  `Query` through the exported `q()` builder.
- **Budget sign conventions are the engine's.** `totalBudgeted` and income totals are stored
  negative; the app renders them with an explicit +/- sign. The CLI shows them raw so the table
  matches `--json` and ActualQL.
- **`updateSchedule(id, fields, resetNextDate)`** takes three positional args, not a merged object.

## Commands

Pattern: `fob-actual <resource> <action> [target] [options]`

```bash
fob-actual budgets list                  # budget files this token can see
fob-actual accounts list                 # accounts + balances
fob-actual transactions list --account "HDFC 1680" --from 2026-08-01
fob-actual budgets month 2026-09         # the envelope plan
fob-actual query run --table transactions --filter '{"amount":{"$lt":0}}'
```

Accounts accept a **name** anywhere an id is expected (`src/cli/accounts/_resolve.js`), and an
ambiguous name is refused rather than guessed.

## Writes

Writes sync CRDT messages into a **live, possibly shared** budget, so the standard's baseline is
raised: `--dry-run` on every write, `--yes` required on every destructive action. `transactions
import --dry-run` uses the engine's own preview mode, so it reports real dedupe decisions.

## Testing

Mock `src/cli/_helpers.js` (so `clientFor()` returns a fake client) rather than the engine — no
test should open a session. In the fake, `hold: (fn) => fn()`. See `tests/accounts-handlers.test.js`.

```bash
npm test           # jest, ESM
npm run typecheck  # tsc over JSDoc
FOB_DEBUG=1 ...    # stack traces + raw engine chatter
```

## Related

- `cli/fob-zb` — the structural sibling to copy patterns from
- `actual/packages/api` — the engine this wraps (vendored upstream source)
- `actual/packages/cli` — upstream's own CLI; prior art only, different conventions
- `docs/wip/fob-actual-cli.md` — the design doc and research trail

## Git

Do not commit or push unless explicitly asked.
