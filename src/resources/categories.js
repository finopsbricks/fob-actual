// @ts-check
/** The `categories` resource — spending categories inside category groups. */
import { findById } from './_base.js';

/**
 * @typedef {Object} CategoriesApi
 * @property {(opts?: {hidden?: boolean}) => Promise<any[]>} list
 * @property {(id: string) => Promise<any|null>} get
 * @property {(category: object) => Promise<string>} create
 * @property {(id: string, fields: object) => Promise<any>} update
 * @property {(id: string, opts?: object) => Promise<any>} delete
 */

/** @param {ReturnType<typeof import('./_base.js').createContext>} ctx @returns {CategoriesApi} */
export function buildCategories(ctx) {
  return {
    list: (opts = {}) => ctx.read((api) => api.getCategories(opts)),
    get: async (id) => findById(await ctx.read((api) => api.getCategories({ hidden: true })), id),
    create: (category) => ctx.write((api) => api.createCategory(category)),
    update: (id, fields) => ctx.write((api) => api.updateCategory(id, fields)),
    /** `transferCategoryId` reassigns existing transactions before deleting. */
    delete: (id, opts = {}) => ctx.write((api) => api.deleteCategory(id, opts.transferCategoryId)),
  };
}
