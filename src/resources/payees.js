// @ts-check
/** The `payees` resource. */
import { findById } from './_base.js';

/**
 * @typedef {Object} PayeesApi
 * @property {() => Promise<any[]>} list
 * @property {(id: string) => Promise<any|null>} get
 * @property {() => Promise<any[]>} common
 * @property {(payee: object) => Promise<string>} create
 * @property {(id: string, fields: object) => Promise<any>} update
 * @property {(id: string) => Promise<any>} delete
 * @property {(targetId: string, mergeIds: string[]) => Promise<any>} merge
 */

/** @param {ReturnType<typeof import('./_base.js').createContext>} ctx @returns {PayeesApi} */
export function buildPayees(ctx) {
  return {
    list: () => ctx.read((api) => api.getPayees()),
    get: async (id) => findById(await ctx.read((api) => api.getPayees()), id),
    /** Frequently-used payees, as the UI's quick-pick list. */
    common: () => ctx.read((api) => api.getCommonPayees()),
    create: (payee) => ctx.write((api) => api.createPayee(payee)),
    update: (id, fields) => ctx.write((api) => api.updatePayee(id, fields)),
    delete: (id) => ctx.write((api) => api.deletePayee(id)),
    /** Fold `mergeIds` into `targetId`, moving their transactions across. */
    merge: (targetId, mergeIds) => ctx.write((api) => api.mergePayees(targetId, mergeIds)),
  };
}
