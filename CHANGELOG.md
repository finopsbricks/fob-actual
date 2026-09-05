# Changelog

All notable changes to this project are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- **Phase 0 — scaffold.** 2-in-1 lib+CLI structure per the CLI standard: `bin/cli.js`,
  `src/index.js` (client exports), `src/cli/` (yargs shell), shared `format.js` / `list.js` /
  `_helpers.js` copied from `fob-zb` and adapted.
- **Engine session transport** (`src/engine.js`) replacing the family's HTTP transport, since
  Actual exposes no callable REST API. Owns the `init -> download -> ops -> sync -> shutdown`
  lifecycle, typed `ActualError` codes, and muffling of the engine's stdout chatter so `--json`
  stays pipeable.
- **Phase 1 — auth, config, budgets.** `auth login|status|logout` (guided browser-token retrieval
  for OpenID servers, `--password` for password servers), `config profiles
  list|current|add|use|remove|refresh` with server-resolved budget identity caching, and
  `budgets list|show|sync|months|month|set-amount|carryover|hold|reset-hold`.
- `server info` reporting the sync server's version.
- **Phase 2 — read + write surface for the core resources.** `accounts`
  (list/show/balance/create/edit/close/reopen/delete, with account **names** accepted anywhere an
  id is), `transactions` (list/add/import/edit/delete, resolving payee + category ids to names for
  the table while `--json` keeps the raw ids), `categories`, `category-groups`, and `payees`
  (including `merge`).
- **Phases 3-4 — automation and the query escape hatch.** `rules` and `schedules` (JSON-bodied
  create/edit, since both carry nested structures — the same shape their `show --json` emits),
  `tags`, and `query run` for ActualQL with `--table`/`--filter`/`--select`/`--order-by`, or a
  whole serialized query via `--query`/`--file`.
- `hold()` on the client and engine: several calls share one open budget. The engine permits one
  session per process, so an unheld second call failed with "No budget file is open".
- Money helpers `formatAmount` / `parseAmount` for Actual's integer minor units, with
  decimal-string scaling so `1.005` does not lose a cent to float error.

- **Phase 5 — polish and packaging.** `files` allow-list verified with `npm pack --dry-run` (84
  files, no `.claude`/`.env`/`docs`/`tests`), `CLAUDE.md`, and `docs/usage/` (installation,
  configuration, authentication, commands).

### Fixed

- `budgets list` showed a downloaded budget twice — `getBudgets()` returns both the local copy and
  the server's entry for it. They are merged on `cloudFileId`, and `STATE` now reports `local` vs
  `remote` usefully.

### Added (cont.)

- Engine lifecycle tests covering `hold()` session reuse, sync-on-write, always-close, and the
  error-code mapping.

[Unreleased]: https://github.com/finopsbricks/fob-actual
