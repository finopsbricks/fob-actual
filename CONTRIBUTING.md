# Contributing to fob-actual

Thanks for helping. Bug reports and pull requests are welcome.

## Before you open an issue

- Run with `FOB_DEBUG=1` and include the command and error output.
- **Remove secrets first.** Never paste a password, session token or encryption password.
  Replace real account names, payees and amounts with placeholders.
- Include your Actual server version (`fob-actual server info`).

## Development

```bash
npm install
npm test          # jest (ESM)
npm run typecheck # tsc against jsconfig
```

- Source is plain JavaScript (ES modules) with JSDoc types.
- The library (`src/index.js`, `src/resources/`, `src/engine.js`) takes credentials as arguments
  and never reads the config file. Credential resolution lives in the CLI layer
  (`src/cli/config-store.js`).
- Each CLI command lives in `src/cli/<resource>/<action>.js`. Tests mock the Actual engine;
  they never contact a server.
- Test writes against a throwaway budget, never your real one.

## Pull requests

- One change per pull request, with tests.
- Add a line under `## [Unreleased]` in `CHANGELOG.md`.
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/)
  (`feat:`, `fix:`, `docs:` …).

By contributing, you agree that your contributions are licensed under the Apache-2.0 license.
