// @ts-check
/** The `schedules` resource — recurring/planned transactions. */
import { findById } from './_base.js';

/**
 * @typedef {Object} SchedulesApi
 * @property {() => Promise<any[]>} list
 * @property {(id: string) => Promise<any|null>} get
 * @property {(schedule: object) => Promise<string>} create
 * @property {(id: string, fields: object, resetNextDate?: boolean) => Promise<any>} update
 * @property {(id: string) => Promise<any>} delete
 */

/** @param {ReturnType<typeof import('./_base.js').createContext>} ctx @returns {SchedulesApi} */
export function buildSchedules(ctx) {
  return {
    list: () => ctx.read((api) => api.getSchedules()),
    get: async (id) => findById(await ctx.read((api) => api.getSchedules()), id),
    create: (schedule) => ctx.write((api) => api.createSchedule(schedule)),
    /** `resetNextDate` recomputes the next occurrence from today. */
    update: (id, fields, resetNextDate) =>
      ctx.write((api) => api.updateSchedule(id, fields, resetNextDate)),
    delete: (id) => ctx.write((api) => api.deleteSchedule(id)),
  };
}
