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
- Money helpers `formatAmount` / `parseAmount` for Actual's integer minor units, with
  decimal-string scaling so `1.005` does not lose a cent to float error.

[Unreleased]: https://github.com/finopsbricks/fob-actual
