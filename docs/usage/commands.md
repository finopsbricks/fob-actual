# Commands

```
fob-actual <resource> <action> [target] [options]
```

Every read command takes `--json`. Every `list` also takes `--fields`, `--format table|csv|json`,
`--output <file>`, and `--limit`. Every write takes `--dry-run`; every destructive action needs
`--yes`.

## budgets

`budgets` covers two things Actual both calls "budget": the **files** on the server, and the
**monthly envelope plan** inside the bound one.

```bash
fob-actual budgets list                       # files this token can see
fob-actual budgets show "Alex Budget"         # by sync id, file id, or name
fob-actual budgets sync                       # pull + push
fob-actual budgets months                     # months covered
fob-actual budgets month 2026-09              # the plan, by category group
fob-actual budgets set-amount 2026-09 <cat-id> --amount 1250.00
fob-actual budgets carryover 2026-09 <cat-id> # roll leftovers forward (--off to disable)
fob-actual budgets hold 2026-09 --amount 500.00
fob-actual budgets reset-hold 2026-09
```

Sign convention in `month` is the engine's own: `Budgeted` and income totals are stored negative
(budgeting draws down what's available). The app shows the same numbers with an explicit +/- sign.

## accounts

Accounts accept a **name** anywhere an id is expected. An ambiguous name is refused, not guessed.

```bash
fob-actual accounts list                      # open accounts + balances
fob-actual accounts list --all                # include closed
fob-actual accounts show "HDFC 1680"
fob-actual accounts balance "HDFC 1680" --as-of 2026-06-30
fob-actual accounts create --name "Savings" --balance 1000.00 [--offbudget]
fob-actual accounts edit <id> --name "New name"
fob-actual accounts close <id> --transfer-account "HDFC 1680"
fob-actual accounts reopen <id>
fob-actual accounts delete <id> --yes
```

## transactions

```bash
fob-actual transactions list --account "HDFC 1680"                  # last 30 days
fob-actual transactions list --account "HDFC 1680" --from 2026-08-01 --to 2026-08-31
fob-actual transactions add --account "HDFC 1680" --date 2026-09-05 --amount -42.50 \
  --payee "Cafe" --notes "lunch"
fob-actual transactions add --account "HDFC 1680" --file txns.json
fob-actual transactions import --account "HDFC 1680" --file txns.json --dry-run
fob-actual transactions edit <id> --category <cat-id>
fob-actual transactions delete <id> --yes
```

`list` resolves payee and category ids to **names** for the table; `--json` keeps the raw ids,
because that's what the write commands speak.

`add` inserts as given. `import` runs Actual's dedupe and rules — use it for bank data. Its
`--dry-run` is the engine's real preview mode, so it reports actual dedupe decisions.

The `--file` format is an array (or `{"transactions": [...]}`), amounts in **minor units**:

```json
[{ "date": "2026-09-01", "amount": -4250, "payee_name": "Cafe", "notes": "lunch" }]
```

## categories, category-groups, payees, tags

```bash
fob-actual categories list [--all]            # --all includes hidden
fob-actual categories create --name "Books" --group <group-id>
fob-actual categories delete <id> --transfer-to <other-cat-id> --yes

fob-actual category-groups list
fob-actual payees list [--common]
fob-actual payees merge <keep-id> --from <id> --from <id> --yes
fob-actual tags create --tag "reimbursable" --color "#ff0000"
```

## rules and schedules

Both carry nested structures, so create/edit take a JSON body — the same shape `show --json`
emits, which makes edit-and-resubmit the natural loop.

```bash
fob-actual rules list [--payee <id>]
fob-actual rules show <id>
fob-actual rules create --rule '{"stage":"pre","conditionsOp":"and","conditions":[...],"actions":[...]}'
fob-actual rules edit <id> --file rule.json

fob-actual schedules list [--all]
fob-actual schedules edit <id> --amount -1200.00 --reset-next-date
```

## query

The ActualQL escape hatch, for anything the typed resources don't expose.

```bash
fob-actual query run --table accounts --select "id,name"
fob-actual query run --table transactions \
  --filter '{"amount":{"$lt":-100000}}' --order-by date --desc --limit 10
fob-actual query run --file query.json --format csv
```

`--filter` is repeatable and takes JSON. `--query`/`--file` accept a whole serialized query, so a
query built in a script can be handed straight to the CLI.

## server, auth, config

```bash
fob-actual server info
fob-actual auth login|status|logout
fob-actual config profiles list|current|add|use|remove|refresh
```

## Piping

Data goes to stdout, diagnostics to stderr, so pipes stay clean:

```bash
fob-actual accounts list --json | jq '.accounts[] | {name, balance}'
fob-actual transactions list --account "HDFC 1680" --format csv --output txns.csv
```

## Related

- [Configuration](./configuration.md)
- [Authentication](./authentication.md)
