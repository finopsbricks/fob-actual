# Security policy

Please report vulnerabilities privately through GitHub's
[private vulnerability reporting](https://github.com/finopsbricks/fob-actual/security/advisories/new),
not in a public issue.

fob-actual runs on your machine and talks directly to your own Actual sync server. Credentials
(server URL, session token, optional encryption password) are stored in
`~/.fob/fob-actual/config.yml` (file mode 0600) or read from `FOB_ACTUAL_*` environment
variables. They are never sent to FinOpsBricks. Each profile keeps a local copy of its budget
under `~/.fob/fob-actual/data/`.

If you think a session token was exposed, tell whoever runs your Actual server. Actual has no
per-token revocation, and changing your password does not end existing sessions; the server
administrator can clear sessions on the server. Then run `fob-actual auth login` again.
