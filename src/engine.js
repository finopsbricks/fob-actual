// @ts-check
/**
 * The Actual engine session — this wrapper's transport layer.
 *
 * Every other fob-<tool> talks to a REST API over HTTP. Actual deliberately has
 * none: "Actual **does not** expose HTTP endpoints that can be called" (upstream
 * docs, api/index.md). The sync server stores opaque, optionally end-to-end
 * encrypted blobs and cannot read or modify a budget. All domain logic lives in
 * `@actual-app/api`, which downloads the budget, materialises a local SQLite copy,
 * queries it, and syncs CRDT messages back.
 *
 * So the "transport" here is a stateful engine session, not a request builder —
 * closer to Auth Pattern C (protocol/connection) than to the HTTP patterns:
 *
 *   init(serverURL, sessionToken, dataDir) -> downloadBudget|loadBudget -> ops -> sync -> shutdown
 *
 * Two consequences shape the design:
 *
 * 1. **The engine is a process-wide singleton.** `@actual-app/api` keeps module
 *    -level state and one open SQLite handle, so a process can hold exactly one
 *    session over one budget. `withSession()` is therefore the only entry point:
 *    it opens, runs, and always closes. Nested calls reuse the open session.
 * 2. **Startup is expensive** (network download + sqlite open), which is why the
 *    data dir is a persistent cache keyed by profile — re-runs load locally and
 *    only sync the delta.
 */

import { mkdirSync } from 'node:fs';

/**
 * Error thrown by the engine layer, carrying the machine-readable code the
 * engine reports (`token-expired`, `network-failure`, …) so handlers and
 * `--json` callers can distinguish failures. Mirrors ApiError in the HTTP
 * wrappers.
 */
export class ActualError extends Error {
  /** @param {string} message @param {{ code?: string, cause?: unknown }} [meta] */
  constructor(message, { code, cause } = {}) {
    super(message);
    this.name = 'ActualError';
    this.code = code;
    this.cause = cause;
  }
}

/**
 * Map a raw engine error onto an ActualError with an actionable message.
 * The engine reports its cause via `err.meta.errorCode` / `err.type`, and for
 * plain failures we keep the original message.
 * @param {any} err
 * @returns {ActualError}
 */
export function toActualError(err) {
  const code = err?.meta?.errorCode ?? err?.errorCode ?? err?.type;
  const message = err?.message ?? String(err);

  if (code === 'token-expired' || /invalid or expired session token/i.test(message)) {
    return new ActualError(
      'Session token is invalid or expired. Run `fob-actual auth login` to store a fresh one.',
      { code: 'token-expired', cause: err },
    );
  }
  if (code === 'network-failure' || /server offline or unreachable/i.test(message)) {
    return new ActualError(
      'Could not reach the Actual server. Check the server URL and your connection.',
      { code: 'network-failure', cause: err },
    );
  }
  if (/file-not-found|budget.*not found/i.test(message) || code === 'file-not-found') {
    return new ActualError(
      'Budget not found on the server. Check the sync id with `fob-actual budgets list`.',
      { code: 'file-not-found', cause: err },
    );
  }
  if (code === 'needs-key' || /needs-key|decrypt/i.test(message)) {
    return new ActualError(
      'This budget is end-to-end encrypted. Set the encryption password on the profile ' +
        '(`fob-actual config profiles add <name> --encryption-password ...`).',
      { code: 'needs-key', cause: err },
    );
  }
  return new ActualError(message, { code, cause: err });
}

/**
 * Silence the engine's own stdout chatter for the duration of `fn`.
 *
 * `@actual-app/api` writes progress lines ("Syncing since…", "[Breadcrumb] …",
 * "Loaded spreadsheet from cache") to **stdout** via console.log. That would
 * corrupt `--json` output and any pipe, so it is captured and re-emitted to
 * stderr, where diagnostics belong per the output standard.
 *
 * Scope matters: this wraps only engine lifecycle calls (init/download/sync/
 * shutdown), never the handler body — a handler's own console.log is the
 * command's data and must reach stdout untouched. FOB_DEBUG=1 lets the raw
 * chatter through for debugging.
 *
 * @template T
 * @param {() => Promise<T>} fn
 * @returns {Promise<T>}
 */
async function muffle(fn) {
  if (process.env.FOB_DEBUG) return fn();

  const originalLog = console.log;
  const originalInfo = console.info;
  console.log = (...args) => console.error(...args);
  console.info = (...args) => console.error(...args);
  try {
    return await fn();
  } finally {
    console.log = originalLog;
    console.info = originalInfo;
  }
}

/** The open session, or null. The engine allows only one per process. */
let current = null;

/**
 * Open an engine session, run `fn`, and always close.
 *
 * @template T
 * @param {object} credentials  Resolved credentials: `{ server_url, session_token, sync_id, data_dir, encryption_password? }`
 * @param {(api: any) => Promise<T>} fn  Receives the `@actual-app/api` module
 * @param {{ budget?: boolean, sync?: boolean }} [opts]
 *   `budget: false` skips loading a budget (for budget-independent calls like
 *   listing budgets); `sync: true` pushes local changes back after `fn` succeeds.
 * @returns {Promise<T>}
 */
export async function withSession(credentials, fn, opts = {}) {
  const { budget = true, sync = false } = opts;

  // Reuse an already-open session (nested handler calls).
  if (current) return fn(current.api);

  const { server_url, session_token, sync_id, data_dir, encryption_password } = credentials;
  if (!server_url) throw new ActualError('No server URL configured. Run `fob-actual config profiles add <name>`.');
  if (!session_token) throw new ActualError('No session token configured. Run `fob-actual auth login`.');
  if (budget && !sync_id) {
    throw new ActualError(
      'No budget selected. Set one with `fob-actual config profiles add <name> --sync-id <id>` ' +
        '(list them with `fob-actual budgets list`).',
    );
  }

  const api = await import('@actual-app/api');
  mkdirSync(data_dir, { recursive: true });

  try {
    await muffle(() => api.init({ dataDir: data_dir, serverURL: server_url, sessionToken: session_token }));
  } catch (err) {
    throw toActualError(err);
  }
  current = { api };

  try {
    if (budget) {
      try {
        // downloadBudget is idempotent: it reuses the local cache when present
        // and only pulls the delta, so it doubles as "load".
        await muffle(() =>
          api.downloadBudget(sync_id, encryption_password ? { password: encryption_password } : undefined),
        );
      } catch (err) {
        throw toActualError(err);
      }
    }

    const result = await fn(api);

    if (sync) {
      try {
        await muffle(() => api.sync());
      } catch (err) {
        throw toActualError(err);
      }
    }
    return result;
  } catch (err) {
    throw err instanceof ActualError ? err : toActualError(err);
  } finally {
    current = null;
    try {
      await muffle(() => api.shutdown());
    } catch {
      // Shutdown failures must not mask the real error from `fn`.
    }
  }
}
