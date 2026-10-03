# Changelog

All notable changes to this project are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-10-03

First release on npm.

### Added
- CLI `fob-actual <resource> <action>` over an Actual Budget sync server: `config profiles`,
  `auth` (password login, or a session token copied from the browser for OpenID servers),
  `budgets` (list, show, sync, months, month, set-amount, carryover, hold, reset-hold),
  `accounts`, `transactions` (list, add, import with Actual's dedupe and rules, edit, delete),
  `categories`, `category-groups`, `payees` (including merge), `rules`, `schedules`, `tags`,
  `query run` (ActualQL) and `server info`.
- `--dry-run` on every write and `--yes` on every destructive action. `--json` on every command;
  `--fields`, `--format table|csv|json`, `--output` and `--limit` on every list.
- Library `fobActual(credentials)` with the same resources, and `hold()` to share one engine
  session across several calls.
- `--help` links the docs and landing page; errors link the matching troubleshooting section.

### Notes
- Built and tested against `@actual-app/api` 26.9.0, pinned exactly.
- The engine runs with its own logging off, so `--json` output stays clean. `FOB_DEBUG=1` turns
  it back on, along with full stack traces.
- Each profile's local budget copy lives in an owner-only (0700) folder.

[Unreleased]: https://github.com/finopsbricks/fob-actual/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/finopsbricks/fob-actual/releases/tag/v0.1.0
