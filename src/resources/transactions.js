// @ts-check
/**
 * The `transactions` resource.
 *
 * `list` requires an account plus a date range — the engine has no
 * "all transactions" call, so the CLI supplies defaults. Amounts are integer
 * minor units; negative is an outflow.
 */

/**
 * @typedef {Object} TransactionsApi
 * @property {(accountId: string, start: string, end: string) => Promise<any[]>} list
 * @property {(accountId: string, transactions: object[], opts?: object) => Promise<any>} add
 * @property {(accountId: string, transactions: object[], opts?: object) => Promise<any>} import
 * @property {(id: string, fields: object) => Promise<any>} update
 * @property {(id: string) => Promise<any>} delete
 */

/** @param {ReturnType<typeof import('./_base.js').createContext>} ctx @returns {TransactionsApi} */
export function buildTransactions(ctx) {
  return {
    list: (accountId, start, end) => ctx.read((api) => api.getTransactions(accountId, start, end)),
    /** Add transactions as-is. `opts` may set `runTransfers` / `learnCategories`. */
    add: (accountId, transactions, opts) =>
      ctx.write((api) => api.addTransactions(accountId, transactions, opts)),
    /**
     * Import with Actual's dedupe + rule matching — the importer path.
     * `opts.dryRun` previews the result without writing (the engine's own
     * preview mode), so a dry run never opens a syncing write.
     */
    import: (accountId, transactions, opts = {}) => {
      const options = { defaultCleared: true, dryRun: false, ...opts };
      const run = (api) => api.importTransactions(accountId, transactions, options);
      return options.dryRun ? ctx.read(run) : ctx.write(run);
    },
    update: (id, fields) => ctx.write((api) => api.updateTransaction(id, fields)),
    delete: (id) => ctx.write((api) => api.deleteTransaction(id)),
  };
}
