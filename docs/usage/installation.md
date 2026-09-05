# Installation

```bash
npm install -g @finopsbricks/fob-actual
```

**Node ≥ 22 is required** — `@actual-app/api` enforces it at startup. This is stricter than the
other `fob-*` wrappers (≥ 18); check your worker runtime before depending on this package there.

Verify:

```bash
fob-actual --version
node --version        # must be >= 22
```

## Via the dispatcher

Once installed, the `fob` launcher finds it on `PATH`:

```bash
fob actual budgets list      # same as: fob-actual budgets list
```

## What it stores locally

| Path | Contents |
|---|---|
| `~/.fob/fob-actual/config.yml` | Profiles: server URL, session token, sync id (mode `0600`) |
| `~/.fob/fob-actual/data/<profile>/` | A local SQLite copy of that profile's budget |

The data dir is a **cache**, not a source of truth — deleting it just forces a fresh download.
It can grow to the size of the budget, so keep an eye on it if you track many profiles.

Relocate everything with `FOB_ACTUAL_CONFIG_DIR` (useful in CI and containers).

## Related

- [Configuration](./configuration.md)
- [Commands](./commands.md)
