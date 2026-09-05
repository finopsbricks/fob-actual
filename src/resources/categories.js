// @ts-check
/** The `categories` resource — spending categories inside category groups. */
import { findById } from './_base.js';

/**
 * @typedef {Object} CategoriesApi
 * @property {(opts?: {hidden?: boolean}) => Promise<any[]>} list
 * @property {() => Promise<any[]>} listAll
 * @property {(id: string) => Promise<any|null>} get
 * @property {(category: object) => Promise<string>} create
 * @property {(id: string, fields: object) => Promise<any>} update
 * @property {(id: string, opts?: object) => Promise<any>} delete
 */

/** @param {ReturnType<typeof import('./_base.js').createContext>} ctx @returns {CategoriesApi} */
export function buildCategories(ctx) {
  return {
    /**
     * List categories. `hidden` is a **filter, not an include-flag**: omitted or
     * false returns the visible ones, true returns *only* the hidden ones.
     */
    list: (opts = {}) => ctx.read((api) => api.getCategories(opts)),
    /** Visible + hidden, for lookups that must resolve any id. */
    listAll: () =>
      ctx.read(async (api) => [
        ...(await api.getCategories()),
        ...(await api.getCategories({ hidden: true })),
      ]),
    get: async (id) =>
      findById(
        await ctx.read(async (api) => [
          ...(await api.getCategories()),
          ...(await api.getCategories({ hidden: true })),
        ]),
        id,
      ),
    create: (category) => ctx.write((api) => api.createCategory(category)),
    update: (id, fields) => ctx.write((api) => api.updateCategory(id, fields)),
    /** `transferCategoryId` reassigns existing transactions before deleting. */
    delete: (id, opts = {}) => ctx.write((api) => api.deleteCategory(id, opts.transferCategoryId)),
  };
}
