// @ts-check
/**
 * Shared scaffolding for Actual resources.
 *
 * Unlike the HTTP wrappers, there are no endpoint paths here: every resource is a
 * thin binding over `@actual-app/api` methods, run inside an engine session. What
 * *is* uniform is the session plumbing — a read opens a session, a write opens one
 * and syncs afterwards — so `readOp` / `writeOp` capture that once and each
 * `buildX(ctx)` just names the engine calls.
 *
 * Return shapes follow the family convention: `list` -> array, `get` -> the record
 * or null, writes -> the created/updated record.
 *
 * @typedef {import('../engine.js').ActualError} ActualError
 */

import { withSession, hold } from '../engine.js';

/**
 * Build the resource context handed to every `buildX(ctx)`.
 * @param {object} credentials
 */
export function createContext(credentials) {
  return {
    credentials,
    /**
     * Run a read against the loaded budget.
     * @template T @param {(api: any) => Promise<T>} fn @returns {Promise<T>}
     */
    read: (fn) => withSession(credentials, fn),
    /**
     * Run a write, then sync the resulting CRDT messages back to the server.
     * @template T @param {(api: any) => Promise<T>} fn @returns {Promise<T>}
     */
    write: (fn) => withSession(credentials, fn, { sync: true }),
    /**
     * Run a call that needs a server session but no loaded budget (e.g. listing
     * the budgets themselves).
     * @template T @param {(api: any) => Promise<T>} fn @returns {Promise<T>}
     */
    server: (fn) => withSession(credentials, fn, { budget: false }),
    /**
     * Keep one session open across several calls. Without this, each call opens
     * and closes its own session and the second fails — the engine allows one
     * open budget per process.
     * @template T @param {() => Promise<T>} fn @returns {Promise<T>}
     */
    hold: (fn) => hold(credentials, fn),
  };
}

/**
 * Find a record by id within a list, or null. Actual's API exposes list-only
 * reads for most entities (no `getCategory(id)`), so `show` handlers filter the
 * list — centralised here so every resource reports "not found" the same way.
 *
 * @template T
 * @param {T[]} items
 * @param {string} id
 * @param {string} [idField]
 * @returns {T|null}
 */
export function findById(items, id, idField = 'id') {
  return items.find((item) => item?.[idField] === id) ?? null;
}
