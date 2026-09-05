// @ts-check
/** The `rules` resource — payee/category automation applied on import. */
import { findById } from './_base.js';

/**
 * @typedef {Object} RulesApi
 * @property {() => Promise<any[]>} list
 * @property {(id: string) => Promise<any|null>} get
 * @property {(payeeId: string) => Promise<any[]>} forPayee
 * @property {(rule: object) => Promise<any>} create
 * @property {(rule: object) => Promise<any>} update
 * @property {(id: string) => Promise<any>} delete
 */

/** @param {ReturnType<typeof import('./_base.js').createContext>} ctx @returns {RulesApi} */
export function buildRules(ctx) {
  return {
    list: () => ctx.read((api) => api.getRules()),
    get: async (id) => findById(await ctx.read((api) => api.getRules()), id),
    forPayee: (payeeId) => ctx.read((api) => api.getPayeeRules(payeeId)),
    create: (rule) => ctx.write((api) => api.createRule(rule)),
    /** Update takes the whole rule object (it carries its own id). */
    update: (rule) => ctx.write((api) => api.updateRule(rule)),
    delete: (id) => ctx.write((api) => api.deleteRule(id)),
  };
}
