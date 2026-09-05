// @ts-check
/**
 * The `accounts` resource — on-budget and off-budget accounts, and their balances.
 *
 * Balances come back as integer minor units (5176357 = 51,763.57); formatting is
 * the CLI's job, never the client's.
 */
import { findById } from './_base.js';

/**
 * @typedef {Object} AccountsApi
 * @property {() => Promise<any[]>} list
 * @property {(id: string) => Promise<any|null>} get
 * @property {(id: string, cutoff?: Date) => Promise<number>} balance
 * @property {(account: object, initialBalance?: number) => Promise<string>} create
 * @property {(id: string, fields: object) => Promise<any>} update
 * @property {(id: string, opts?: object) => Promise<any>} close
 * @property {(id: string) => Promise<any>} reopen
 * @property {(id: string) => Promise<any>} delete
 */

/** @param {ReturnType<typeof import('./_base.js').createContext>} ctx @returns {AccountsApi} */
export function buildAccounts(ctx) {
  return {
    list: () => ctx.read((api) => api.getAccounts()),
    get: async (id) => findById(await ctx.read((api) => api.getAccounts()), id),
    balance: (id, cutoff) => ctx.read((api) => api.getAccountBalance(id, cutoff)),
    create: (account, initialBalance) => ctx.write((api) => api.createAccount(account, initialBalance)),
    update: (id, fields) => ctx.write((api) => api.updateAccount(id, fields)),
    /** Close an account; `transferAccountId`/`transferCategoryId` move any residual balance. */
    close: (id, opts = {}) =>
      ctx.write((api) => api.closeAccount(id, opts.transferAccountId, opts.transferCategoryId)),
    reopen: (id) => ctx.write((api) => api.reopenAccount(id)),
    delete: (id) => ctx.write((api) => api.deleteAccount(id)),
  };
}
