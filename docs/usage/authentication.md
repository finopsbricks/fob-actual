# Authentication

Actual authenticates with a **session token**, sent as the `x-actual-token` header. How you get one
depends on how the server is configured.

## Password servers

The documented path. One command:

```bash
fob-actual auth login --server-url https://budget.example.com --password <pw>
```

This calls `POST /account/login` and stores the returned token.

## OpenID / OAuth servers (Google, Authentik, Keycloak, …)

**There is no headless login.** The flow is a browser redirect with PKCE, and upstream documents
`ACTUAL_SESSION_TOKEN` without ever saying how to obtain one. So `auth login` guides you:

```bash
fob-actual auth login --server-url https://budget.example.com
```

It prints the retrieval steps and prompts for a paste:

1. Open the server in a browser and log in.
2. DevTools → Application → **IndexedDB** → `actual` → `asyncStorage` → copy `user-token`.

   (It's IndexedDB, *not* Local Storage — in the browser build Actual's `asyncStorage` is backed by
   `indexedDB.open('actual')`.)

Or from the DevTools Console on that page:

```js
(await new Promise(r => { const q = indexedDB.open('actual'); q.onsuccess = e => r(e.target.result); }))
  .transaction(['asyncStorage'], 'readonly').objectStore('asyncStorage').get('user-token')
  .onsuccess = e => console.log(e.target.result);
```

Then pass it non-interactively if you prefer:

```bash
fob-actual auth login --server-url https://budget.example.com --session-token <token>
```

`auth login` validates the token immediately and reports the budgets it can reach — a bad token
fails there, not on your next command.

## Do tokens expire?

That's the **server's** `ACTUAL_TOKEN_EXPIRATION` setting:

| Value | Behaviour |
|---|---|
| `never` | **The default.** Tokens keep working — this is what makes worker use practical. |
| `openid-provider` | Follows the identity provider's expiry |
| *a number* | Seconds |

When a token does expire, the engine reports `token-expired` and the CLI tells you to re-run
`auth login`.

## Checking and clearing

```bash
fob-actual auth status    # validates the token, shows the bound budget
fob-actual auth logout    # forgets the local token
```

`logout` is **local only** — the token stays valid on the server until it expires or you log out in
the Actual web UI. Rotate there if a token leaks.

## Security notes

- `config.yml` is written `0600`; secrets are never printed by `profiles list` or `current`.
- A session token grants full access to **every budget the user can see**, not just the bound one.

## Related

- [Configuration](./configuration.md)
