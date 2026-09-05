// @ts-check
/**
 * The `query` resource — the ActualQL escape hatch.
 *
 * ActualQL reaches data the typed resources don't expose (arbitrary filters,
 * groupings, aggregates across tables). `q()` builds a query; `run()` executes it.
 */

/**
 * @typedef {Object} QueryApi
 * @property {(query: any) => Promise<any>} run
 * @property {(table: string) => Promise<any>} q
 */

/** @param {ReturnType<typeof import('./_base.js').createContext>} ctx @returns {QueryApi} */
export function buildQuery(ctx) {
  return {
    /** Execute an ActualQL query, returning `{ data, dependencies }`. */
    run: (query) => ctx.read((api) => api.aqlQuery(query)),
    /**
     * Start a query against a table (`transactions`, `accounts`, …).
     * The builder itself needs no engine session — only `run` does.
     */
    q: async (table) => {
      const { q } = await import('@actual-app/api');
      return q(table);
    },
  };
}
