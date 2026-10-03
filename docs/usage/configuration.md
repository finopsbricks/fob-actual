# Configuration

## Profiles

A profile is a named credential set bound to **one budget** — the engine loads one budget at a
time, so switching profile is how you switch budget.

```yaml
# ~/.fob/fob-actual/config.yml   (mode 0600)
current_profile: personal
profiles:
  personal:
    server_url: https://budget.example.com
    session_token: <secret>
    sync_id: 1b4e28ba-2fa1-41d2-883f-0016d3cca427
    budget_name: Household Budget       # cached from the server, for display only
  fob:
    server_url: https://budget.example.com
    session_token: <secret>
    sync_id: 6fa459ea-ee8a-4ca4-894e-db77e160355e
    budget_name: Business Budget
```

```bash
fob-actual config profiles list          # all profiles, current marked *
fob-actual config profiles current       # what would be used right now, and why
fob-actual config profiles use fob       # switch
fob-actual config profiles refresh --all # re-sync cached budget names
fob-actual --profile fob accounts list   # override for one command
```

`budget_name` is a **cache**; the server is the source of truth. `refresh` fixes drift after a
budget is renamed. Adding credentials never blocks on the network — if the lookup fails, the
profile still saves and warns on stderr.

## Precedence

**`--profile` flag > `FOB_ACTUAL_*` env > current profile.**

Env vars only take effect as a **complete set** (URL + token); a partial env never half-overrides
a profile.

| Variable | Purpose |
|---|---|
| `FOB_ACTUAL_SERVER_URL` | Sync server URL |
| `FOB_ACTUAL_SESSION_TOKEN` | Session token |
| `FOB_ACTUAL_SYNC_ID` | Budget sync id |
| `FOB_ACTUAL_ENCRYPTION_PASSWORD` | For an end-to-end encrypted budget |
| `FOB_ACTUAL_DATA_DIR` | Local budget cache location |
| `FOB_ACTUAL_CONFIG_DIR` | Relocate the whole config dir |
| `FOB_DEBUG` | Stack traces + raw engine chatter |

## Authentication

See [Authentication](./authentication.md) — the session-token model has enough moving parts to
deserve its own note.

## Encrypted budgets

If a budget is end-to-end encrypted, the server cannot read it and neither can the CLI without the
password:

```bash
fob-actual config profiles add personal --encryption-password <pw>
```

`budgets list` shows an `ENCRYPTED` column, so you can tell before you connect.

## Related

- [Authentication](./authentication.md)
- [Commands](./commands.md)
