// @ts-check
/** The `tags` resource — free-form labels applied to transactions. */
import { findById } from './_base.js';

/**
 * @typedef {Object} TagsApi
 * @property {() => Promise<any[]>} list
 * @property {(id: string) => Promise<any|null>} get
 * @property {(tag: object) => Promise<string>} create
 * @property {(id: string, fields: object) => Promise<any>} update
 * @property {(id: string) => Promise<any>} delete
 */

/** @param {ReturnType<typeof import('./_base.js').createContext>} ctx @returns {TagsApi} */
export function buildTags(ctx) {
  return {
    list: () => ctx.read((api) => api.getTags()),
    get: async (id) => findById(await ctx.read((api) => api.getTags()), id),
    create: (tag) => ctx.write((api) => api.createTag(tag)),
    update: (id, fields) => ctx.write((api) => api.updateTag(id, fields)),
    delete: (id) => ctx.write((api) => api.deleteTag(id)),
  };
}
