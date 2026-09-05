# fob-actual — Actual Budget CLI + Client (2-in-1)

## Status: IMPLEMENTED (Phases 0-5 complete)

All five phases are built, live-verified against both budgets, and committed. 90 tests passing,
typecheck clean, tarball verified. What follows is the original design doc, kept as the research
trail; see "Implementation notes" at the end for what changed during the build.

Research done against the live server (`https://budget.echoalex.com`, sync-server **26.8.1**) and
the vendored upstream source at `finopsbricks/actual/`. **Connectivity is proven end-to-end**: both
budgets download and read via `@actual-app/api` with a session token (see "Live verification").
This WIP locks the architecture before any code is written; no blockers remain.

`@finopsbricks/fob-actual` will be the Actual Budget client library **and** the `fob-actual` CLI in
one package, built to `alex/engineering-standards/cli/`. It wraps Actual's budget engine behind the
family-standard `fob-actual <resource> <action> [target] [options]` grammar and an importable
`fobActual(credentials)` factory that workers use.

The thing that makes this wrapper different from every other `fob-*`: **Actual has no server-side
REST API for budget data.** The sync server stores opaque, optionally end-to-end-encrypted blobs.
All domain logic lives in a local engine that downloads the budget, materialises a local SQLite
copy, and syncs CRDT messages back. That single fact drives every decision below.

---

## Problem Statement

Actual Budget is the system of record for personal/household budget data — accounts, transactions,
categories, payees, rules, schedules, and the monthly budget itself. There is currently no
FinOpsBricks seam to (a) read balances/transactions for reporting or reconciliation, (b) push
transactions in from workers, or (c) drive budget ops from the terminal or an LLM.

We want one artifact serving both the terminal (explore, script, feed an LLM) and workers
(`import { fobActual } from '@finopsbricks/fob-actual'`) with no rewrite between prototype and
production — the 2-in-1 shape the CLI standard mandates.

## Research findings (verified, not assumed)

### 1. The server is reachable and identified

```
GET https://budget.echoalex.com/info
→ {"build":{"name":"@actual-app/sync-server","description":"actual syncing server","version":"26.8.1"}}
```

### 2. Auth is OpenID (Google) — password login is disabled

```
GET /account/needs-bootstrap
→ {"bootstrapped":true,"loginMethod":"openid","multiuser":true,
   "availableLoginMethods":[{"method":"password","active":0},{"method":"openid","active":1}]}
```

`POST /account/login {loginMethod:"password"}` returns `invalid-password`; the password method is
inactive. `POST /account/login {loginMethod:"openid"}` returns a Google consent URL
(`accounts.google.com/o/oauth2/v2/auth?...&redirect_uri=https://budget.echoalex.com/openid/callback`)
with PKCE. **Completing it requires an interactive browser session** — there is no headless path.

**Upstream docs confirm the gap.** `docs/config/oauth-auth.md` documents how to *configure* an
OpenID provider, and `docs/api/cli.md` documents `ACTUAL_SESSION_TOKEN` / `--session-token` as "an
alternative to password" — but **neither explains how to obtain a token when OpenID is enabled**.
The API docs (`docs/api/index.md`) show only `password:` in `init()`. So the browser-retrieval step
is genuinely undocumented upstream, not something we missed; our `auth login` must own it.

**Token lifetime is a server setting, `ACTUAL_TOKEN_EXPIRATION`**, whose values are `"never"`
(**the current default**), `"openid-provider"`, or a number of seconds. Since this server leaves it
at the default, session tokens **do not expire** — which makes the stored-token model viable for
workers. If that setting is ever changed, headless use degrades and `auth login` must be re-run.

Every data endpoint requires an `x-actual-token` session token:

```
GET /sync/list-user-files  (no token)
→ {"status":"error","reason":"unauthorized","details":"token-not-found"}
```

### 3. There is no REST API for budget data — this is the key architectural constraint

The sync server (`packages/sync-server/src/app-sync.ts`) exposes only blob/sync plumbing:
`/sync/list-user-files`, `/sync/download-user-file`, `/sync/upload-user-file`, `/sync/sync`,
`/sync/user-get-key`. Files carry `encryptKeyId`/`encryptSalt`/`encryptTest` — budgets may be
**end-to-end encrypted**, meaning the server literally cannot read them.

Domain data (accounts, transactions, categories…) is only accessible by running Actual's engine
locally: download the budget → local SQLite → query → sync CRDT messages back. Hand-rolling an
HTTP client against the sync server would get us opaque blobs, not budget data.

### 4. `@actual-app/api` is the supported engine, and it supports session tokens

`packages/api` (v26.8.1) exports `init()`, `downloadBudget()`, `loadBudget()`, `getBudgets()`,
`sync()`, `shutdown()` plus ~60 domain methods that map cleanly onto our grammar:
`getAccounts`, `getTransactions`, `addTransactions`, `getCategories`, `getPayees`, `getRules`,
`getSchedules`, `getBudgetMonth`, `setBudgetAmount`, `getAccountBalance`, `aqlQuery`, …

`InitConfig` (`loot-core/src/server/main.ts:232-266`) is a discriminated union of three auth shapes:

| Shape | Fields |
|---|---|
| `PasswordAuthConfig` | `serverURL` + `password` |
| `SessionTokenAuthConfig` | `serverURL` + `sessionToken` |
| `NoServerConfig` | neither (local files only) |

`init()` with `sessionToken` calls `subscribe-set-token`, then validates via `subscribe-get-user`,
throwing coded errors `token-expired` / `network-failure` on failure. **`sessionToken` is our path**,
since password auth is disabled on this server.

### 5. Prior art: an official `@actual-app/cli` exists (v26.8.1)

`packages/cli` ships commands for accounts, transactions, categories, payees, rules, schedules,
budgets, query, sync, server. It is TypeScript, uses cosmiconfig, env vars
(`ACTUAL_SERVER_URL`, `ACTUAL_PASSWORD`, `ACTUAL_SESSION_TOKEN`, `ACTUAL_SYNC_ID`), a data-dir cache,
and a **lock file** (`src/lock.ts`) — confirming the engine must not run concurrently.

This is **prior art to learn from, not to adopt**: it does not follow our grammar, `safe()`,
`format.js`, `--json`/`--fields`/`--format` conventions, `~/.fob/` profile model, or the 2-in-1
importable-client shape. We wrap `@actual-app/api`; we do not fork or re-implement it. Its `lock.ts`
and `cache.ts` validate two design points we'd otherwise discover the hard way.

---

## Proposed Solution

A standard 2-in-1 wrapper mirroring `fob-zb`'s structure, with an **engine-session transport** in
place of the HTTP transport.

- **Client core** — `fobActual(credentials)` returns a credential-bound `ctx` holding the engine
  session, handed to `buildX(ctx)` resource modules (`accounts`, `transactions`, `categories`, …).
  Each resource file is the only place `@actual-app/api` calls live. Workers import the factory; the
  CLI calls the same methods. No `console.*` in the client.
- **Engine session transport** (`src/engine.js`) — owns the lifecycle the other wrappers don't have:
  `init({serverURL, sessionToken, dataDir})` → `downloadBudget(syncId)` (first run) or
  `loadBudget(id)` (cached) → operations → `sync()` → `shutdown()`. Also owns the data-dir cache,
  the single-process lock, and mapping engine errors → `ActualError` (typed, carrying the engine's
  error code).
- **CLI shell** — yargs tree (`src/cli/index.js`), one file per action
  (`src/cli/<resource>/<action>.js`), `safe()` wrapper, `clientFor()` credential binding, shared
  `format.js` helpers, `--json` on every read, column selector on `list` commands.
- **Config & auth** — profiles in `~/.fob/fob-actual/config.yml` (0600), matching the sibling shape
  (`current_profile` + `profiles` map, per `fob-zb`/`fob-lgr`).

### Auth Pattern: a new variant (Pattern D — session token)

None of the three documented patterns fit exactly. This is **closest to Pattern B (OAuth2)** but
differs in one material way: with OpenID + PKCE there is **no long-lived refresh token we can store
and exchange headlessly**. The session token is what we persist, and when it expires the user must
re-authenticate through a browser.

The `getHeaders(credentials)` seam is replaced by a `sessionFor(credentials)` seam — same intent
(per-call credentials override, env → config → flag precedence), different mechanism, because the
engine holds a stateful session rather than making stateless calls. This mirrors how **Pattern C
(protocol/connection)** relaxes the HTTP assumptions for lib-email.

Proposed config shape:

```yaml
# ~/.fob/fob-actual/config.yml   (0600)
current_profile: personal
profiles:
  personal:
    server_url: https://budget.echoalex.com
    session_token: <secret>
    sync_id: <budget sync id>          # server truth, non-secret
    budget_name: Personal              # cached identity, for display
    encryption_password: <secret>      # only if the budget is E2E-encrypted
    data_dir: ~/.fob/fob-actual/data/personal
```

Env override convention: `FOB_ACTUAL_SERVER_URL`, `FOB_ACTUAL_SESSION_TOKEN`, `FOB_ACTUAL_SYNC_ID`,
`FOB_ACTUAL_ENCRYPTION_PASSWORD`. Precedence stays **flag > env > current profile**.

Per the standard's "profiles cache their server-resolved identity": resolve `sync_id`/`budget_name`
from `getBudgets()` on `config profiles add`, warn on stderr rather than blocking if the network
call fails, and re-sync with `profiles refresh`.

### Key decisions (proposed — locked once approved)

| Decision | Choice |
|---|---|
| Package | `@finopsbricks/fob-actual`, `type: module`, `bin: { "fob-actual": "./bin/cli.js" }`, ESM |
| Node engine | **≥22** — forced by `@actual-app/api`'s `validateNodeVersion()`; siblings say ≥18 |
| Deps | `@actual-app/api`, `yargs`, `js-yaml`, `@inquirer/prompts`; dev: `jest`, `@jest/globals`, `typescript` |
| Language | Plain JS + JSDoc `@ts-check` (per engineering standards), wrapping the TS `@actual-app/api` |
| Auth | Session token (Pattern D). Stored in config; `auth login` guides browser retrieval; `auth status` validates |
| Transport | `@actual-app/api` engine session — **not** hand-rolled HTTP against the sync server |
| Budget selection | `--budget <name|syncId>` flag + `sync_id` per profile; one profile per budget |
| Concurrency | Single-process lock on the data dir (engine cannot run twice) |
| Publishing | `files` allow-list, `Apache-2.0`, `publishConfig.access: public` |

### Two budgets = two profiles

The server hosts 2 budgets. Since a profile caches a server-resolved identity and the engine loads
one budget at a time, **one profile per budget** is the natural model — `--profile` switches budgets,
exactly like it switches orgs in `fob-zb`. `fob-actual budgets list` shows all budgets visible to the
session token regardless of the active profile.

---

## Command surface (draft)

Mapping `@actual-app/api` onto the family grammar. Not every resource needs every verb.

| Resource | Actions |
|---|---|
| `config profiles` | `list`, `add`, `use`, `remove`, `refresh` |
| `auth` | `login`, `status`, `logout` |
| `budgets` | `list`, `show`, `sync`, `months`, `month <YYYY-MM>`, `set-amount`, `hold`, `reset-hold` |
| `accounts` | `list`, `show`, `balance`, `create`, `edit`, `close`, `reopen`, `delete` |
| `transactions` | `list`, `add`, `import`, `edit`, `delete` |
| `categories` | `list`, `show`, `create`, `edit`, `delete` |
| `category-groups` | `list`, `create`, `edit`, `delete` |
| `payees` | `list`, `create`, `edit`, `delete`, `merge` |
| `rules` | `list`, `show`, `create`, `edit`, `delete` |
| `schedules` | `list`, `create`, `edit`, `delete` |
| `tags` | `list`, `create`, `edit`, `delete` |
| `query` | `run` (AQL escape hatch via `aqlQuery`) |
| `server` | `info`, `version` |

`--json` on every read; `--fields`/`--format table|csv|json`/`--output` on every `list`.

---

## Live verification (2026-09-06)

All of the following ran green against the real server with a session token pulled from a
logged-in browser (IndexedDB → `actual` → `asyncStorage` → `user-token`):

```
GET /sync/list-user-files                 → 2 budgets, both encryptKeyId: null
api.init({serverURL, sessionToken})       → "init OK — session token accepted by engine"
api.getBudgets()                          → both budgets, state: "remote", hasKey: false
api.downloadBudget(<syncId>)              → OK for both
```

| Budget | Sync ID (`groupId`) | Accounts | Categories | Payees | Budget months | E2EE |
|---|---|---|---|---|---|---|
| **Alex Budget** | `68e5ffc0-6a4d-4443-a747-0106a8fd6f72` | 5 (HDFC, NiYO CC, 3× ICICI) | 20 | 101 | 16 (2026-05 → 2027-08) | no |
| **FOB Budget** | `cb5d0af3-06c8-40ed-bdbc-071b6903ec08` | 5 (per-person) | 9 | 5 | 15 (2026-06 → 2027-08) | no |

`getAccounts`, `getAccountBalance`, `getCategories`, `getPayees`, `getBudgetMonths`, and
`getTransactions` all returned real data. Balances come back as **integer minor units**
(e.g. `5176357` = ₹51,763.57), so `formatAmount(milli)` in `format.js` is the right helper.

Environment confirmed: **Node v22.21.0** — satisfies the engine's ≥22 requirement.

Verification scripts are in the session scratchpad (`apitest/probe.mjs`, `apitest/read.mjs`), not
in the repo.

## Open questions

**Resolved by live verification:**

1. ~~**Are either budget end-to-end encrypted?**~~ **No** — both report `encryptKeyId: null` /
   `hasKey: false`. `encryption_password` becomes an *optional* per-profile field (supported for
   portability, unused today), and `downloadBudget()` needs no password for these two.
2. ~~**Session-token lifetime?**~~ **Tokens do not expire on this server.**
   `ACTUAL_TOKEN_EXPIRATION` defaults to `"never"` and is unset here. Headless worker use is
   viable. Caveat to document: if that server setting changes, tokens start expiring and the
   engine throws the coded `token-expired` error — `auth status` should surface that clearly.
3. ~~**Node ≥22?**~~ **Confirmed: v22.21.0 locally.** Still worth confirming the *worker* runtime is
   22+ before promising worker support in the README — that's the one part not yet verified.

**Still open:**

4. **Data-dir footprint.** Each budget materialises a local SQLite copy under
   `~/.fob/fob-actual/data/<profile>/`. Confirm `~/.fob/` is an acceptable home for cached *data*,
   not just config — the standard only speaks to config files. (Upstream defaults to
   `~/.actual-cli/data`; the family root feels more consistent, but it's a judgement call.)
5. **Write safety.** Writes sync CRDT messages to a live budget shared with other users — `FOB
   Budget` has 3 users with access. Suggest `--dry-run` on write commands and explicit confirmation
   on `delete`, beyond the standard's baseline.
6. **Token acquisition UX.** Since upstream documents no headless path, `auth login` has to walk the
   user through browser retrieval (IndexedDB) or implement a local loopback listener against
   `/openid/callback`. Loopback is nicer but must be checked against the provider's registered
   redirect URI, which currently points at the server. Start with guided paste (Phase 1), consider
   loopback later — the same two-step approach `fob-zb` took.

---

## Phasing (proposed)

| Phase | Scope |
|---|---|
| **0** | Scaffold 2-in-1 structure; copy `format.js`, `_helpers.js` (`safe()`, `localOptions()`), test `captureOutput()` from `fob-zb` |
| **1** | Engine session transport + config/profiles + `auth`; `budgets list` working live |
| **2** | Read surface: accounts, transactions, categories, payees, balances (+ `--json`, column selector) |
| **3** | Write surface: transactions add/import/edit, accounts, categories, budget amounts |
| **4** | Rules, schedules, tags, `query run` (AQL), `server info` |
| **5** | Polish: `--dry-run`, publishing allow-list, `npm pack --dry-run` verification, README |

Phase 1 cannot start until the token blocker is cleared.

## Related

- `alex/engineering-standards/cli/` — the standard this is built to
- `finopsbricks/cli/fob-zb` — closest structural sibling (external SaaS, 2-in-1, profiles)
- `finopsbricks/actual/packages/api` — the engine we wrap
- `finopsbricks/actual/packages/cli` — upstream CLI, prior art only

---

## Implementation notes (2026-09-06)

Everything in the plan above shipped. Five things were learned only by building it:

1. **The engine allows one open budget per process.** A handler making several client calls (list
   accounts, then a balance each) failed with `No budget file is open` — the first call closed the
   budget on its way out. Added `hold()` on the engine and client: nested `withSession` calls share
   the open session, and it syncs once at the end if any nested call wrote. This is now the rule for
   any caller making more than one call, library users included.

2. **The engine writes progress chatter to stdout**, which would corrupt `--json` and any pipe.
   `muffle()` redirects it to stderr — but only around lifecycle calls, never around a handler body,
   since a handler's `console.log` *is* the command's data. An early version wrapped too much and
   swallowed the output.

3. **`getCategories({hidden: true})` is a filter, not an include-flag** — it returns *only* hidden
   rows. Id→name lookups silently resolved nothing until this was found. Added `listAll()`.

4. **`parseAmount` cannot use `n * 100`.** `1.005 * 100` is `100.49999…` in binary floating point,
   so `Math.round` drops a cent. It now scales via the decimal string. Caught by a test written
   against the intended behaviour rather than the implementation.

5. **`aqlQuery` calls `query.serialize()`**, so a serialized state object is rejected; `query run`
   rebuilds a real `Query` through the exported `q()` builder.

Two smaller deviations from the plan:

- **Account names are accepted anywhere an id is**, with ambiguity refused rather than guessed
  (`src/cli/accounts/_resolve.js`). Nobody remembers a uuid, and every transaction command needs an
  account.
- **`transactions import --dry-run` uses the engine's own preview mode** rather than simulating one,
  so it reports real dedupe decisions.

### Open questions, settled

- **Data-dir footprint** (Q4): each profile caches its budget under
  `~/.fob/fob-actual/data/<profile>/`, overridable per profile or with `FOB_ACTUAL_DATA_DIR`.
  Documented in `docs/usage/installation.md` as a cache that can be deleted freely.
- **Write safety** (Q5): `--dry-run` on every write, `--yes` on every destructive action. Verified
  live — a create/delete round-trip on the shared FOB Budget synced correctly and was cleaned up.
- **Token acquisition UX** (Q6): shipped the guided browser-retrieval flow. Loopback OAuth remains
  possible later, but needs the provider's redirect URI reconfigured, so it stays deferred.

### Still open

- **Worker runtime on Node ≥ 22.** Confirmed locally (v22.21.0), *not* yet confirmed on the worker
  fleet. This is the one thing that would block importing the client there.
- **Loopback `auth login`** for OpenID, as above.
- **Bank sync** (`runBankSync`) is exposed by the engine but not surfaced as a command yet.
