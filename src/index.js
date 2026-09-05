// @ts-check
/**
 * @finopsbricks/fob-actual — the importable Actual Budget client.
 *
 * Construct a client with credentials bound once, then call resource namespaces:
 *
 *   import { fobActual } from '@finopsbricks/fob-actual';
 *   const actual = fobActual({ server_url, session_token, sync_id, data_dir });
 *   const accounts = await actual.accounts.list();
 *   const balance  = await actual.accounts.balance(accounts[0].id);
 *
 * The `fob-actual` CLI builds the same client (see src/cli/_helpers.js
 * `clientFor`) and calls these same namespaces — so the CLI and library can never
 * drift: every engine call is defined once, in src/resources/.
 *
 * Unlike the HTTP wrappers in this family, the transport is a **stateful engine
 * session**: Actual exposes no callable REST API, so `@actual-app/api` downloads
 * the budget to a local SQLite copy, answers queries from it, and syncs CRDT
 * messages back. Each call opens and closes a session (see src/engine.js), so the
 * client is safe to hold across calls but is not concurrent — the engine allows
 * one session per process. Multi-budget workers construct one client per budget:
 * `fobActual(budgetACreds)`, `fobActual(budgetBCreds)`, used in sequence.
 *
 * @typedef {import('./resources/accounts.js').AccountsApi} AccountsApi
 * @typedef {import('./resources/transactions.js').TransactionsApi} TransactionsApi
 * @typedef {import('./resources/categories.js').CategoriesApi} CategoriesApi
 * @typedef {import('./resources/category-groups.js').CategoryGroupsApi} CategoryGroupsApi
 * @typedef {import('./resources/payees.js').PayeesApi} PayeesApi
 * @typedef {import('./resources/rules.js').RulesApi} RulesApi
 * @typedef {import('./resources/schedules.js').SchedulesApi} SchedulesApi
 * @typedef {import('./resources/tags.js').TagsApi} TagsApi
 * @typedef {import('./resources/budgets.js').BudgetsApi} BudgetsApi
 * @typedef {import('./resources/query.js').QueryApi} QueryApi
 */

import { createContext } from './resources/_base.js';
import { buildBudgets } from './resources/budgets.js';
import { buildAccounts } from './resources/accounts.js';
import { buildTransactions } from './resources/transactions.js';
import { buildCategories } from './resources/categories.js';
import { buildCategoryGroups } from './resources/category-groups.js';
import { buildPayees } from './resources/payees.js';
import { buildRules } from './resources/rules.js';
import { buildSchedules } from './resources/schedules.js';
import { buildTags } from './resources/tags.js';
import { buildQuery } from './resources/query.js';

/**
 * The Actual Budget client surface. Explicit (not inferred) so callers get a
 * checked, autocompleted surface.
 * @typedef {Object} ActualClient
 * @property {BudgetsApi} budgets
 * @property {AccountsApi} accounts
 * @property {TransactionsApi} transactions
 * @property {CategoriesApi} categories
 * @property {CategoryGroupsApi} categoryGroups
 * @property {PayeesApi} payees
 * @property {RulesApi} rules
 * @property {SchedulesApi} schedules
 * @property {TagsApi} tags
 * @property {QueryApi} query
 * @property {() => Promise<string>} serverVersion
 */

/**
 * @param {object} credentials  Required: `{ server_url, session_token, data_dir }`,
 *   plus `sync_id` for any call that reads or writes a budget. Optional
 *   `encryption_password` for an end-to-end encrypted budget. The library never
 *   reads these from the environment — inject them explicitly.
 * @returns {ActualClient}
 */
export function fobActual(credentials) {
  const ctx = createContext(credentials);
  return {
    budgets: buildBudgets(ctx),
    accounts: buildAccounts(ctx),
    transactions: buildTransactions(ctx),
    categories: buildCategories(ctx),
    categoryGroups: buildCategoryGroups(ctx),
    payees: buildPayees(ctx),
    rules: buildRules(ctx),
    schedules: buildSchedules(ctx),
    tags: buildTags(ctx),
    query: buildQuery(ctx),
    /** The sync server's version string. */
    serverVersion: () => ctx.server((api) => api.getServerVersion()),
  };
}

// Engine primitives — an escape hatch for one-off calls and the CLI's auth layer.
export { ActualError, withSession, toActualError } from './engine.js';
