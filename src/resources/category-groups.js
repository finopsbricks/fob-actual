// @ts-check
/** The `category-groups` resource — the groups categories are filed under. */
import { findById } from './_base.js';

/**
 * @typedef {Object} CategoryGroupsApi
 * @property {(opts?: {hidden?: boolean}) => Promise<any[]>} list
 * @property {(id: string) => Promise<any|null>} get
 * @property {(group: object) => Promise<string>} create
 * @property {(id: string, fields: object) => Promise<any>} update
 * @property {(id: string, opts?: object) => Promise<any>} delete
 */

/** @param {ReturnType<typeof import('./_base.js').createContext>} ctx @returns {CategoryGroupsApi} */
export function buildCategoryGroups(ctx) {
  return {
    list: (opts = {}) => ctx.read((api) => api.getCategoryGroups(opts)),
    get: async (id) => findById(await ctx.read((api) => api.getCategoryGroups({ hidden: true })), id),
    create: (group) => ctx.write((api) => api.createCategoryGroup(group)),
    update: (id, fields) => ctx.write((api) => api.updateCategoryGroup(id, fields)),
    delete: (id, opts = {}) => ctx.write((api) => api.deleteCategoryGroup(id, opts.transferCategoryId)),
  };
}
