// @ts-check
/** The `category-groups` resource — the groups categories are filed under. */
import { findById } from './_base.js';

/**
 * @typedef {Object} CategoryGroupsApi
 * @property {(opts?: {hidden?: boolean}) => Promise<any[]>} list
 * @property {() => Promise<any[]>} listAll
 * @property {(id: string) => Promise<any|null>} get
 * @property {(group: object) => Promise<string>} create
 * @property {(id: string, fields: object) => Promise<any>} update
 * @property {(id: string, opts?: object) => Promise<any>} delete
 */

/** @param {ReturnType<typeof import('./_base.js').createContext>} ctx @returns {CategoryGroupsApi} */
export function buildCategoryGroups(ctx) {
  return {
    /**
     * List category groups. `hidden` is a **filter, not an include-flag**:
     * omitted or false returns the visible ones, true returns *only* hidden ones.
     */
    list: (opts = {}) => ctx.read((api) => api.getCategoryGroups(opts)),
    /** Visible + hidden, for lookups that must resolve any id. */
    listAll: () =>
      ctx.read(async (api) => [
        ...(await api.getCategoryGroups()),
        ...(await api.getCategoryGroups({ hidden: true })),
      ]),
    get: async (id) =>
      findById(
        await ctx.read(async (api) => [
          ...(await api.getCategoryGroups()),
          ...(await api.getCategoryGroups({ hidden: true })),
        ]),
        id,
      ),
    create: (group) => ctx.write((api) => api.createCategoryGroup(group)),
    update: (id, fields) => ctx.write((api) => api.updateCategoryGroup(id, fields)),
    delete: (id, opts = {}) => ctx.write((api) => api.deleteCategoryGroup(id, opts.transferCategoryId)),
  };
}
