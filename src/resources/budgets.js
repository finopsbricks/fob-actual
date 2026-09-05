// @ts-check
/**
 * The `budgets` resource — the budget files on the server, and the monthly
 * budget (envelope allocations) inside the loaded one.
 *
 * Two different things share this namespace because Actual calls both "budget":
 * the *file* (a sync id you connect to) and the *monthly plan* (what you budgeted
 * per category). `list`/`sync` act on files; `months`/`month`/`setAmount` act on
 * the plan inside the currently-selected file.
 *
 * @typedef {import('./_base.js').createContext} Ctx
 */

/**
 * @typedef {Object} BudgetsApi
 * @property {() => Promise<any[]>} list                       Budget files visible to this session
 * @property {(idOrName: string) => Promise<any|null>} get     One budget file by sync id or name
 * @property {() => Promise<string[]>} months                  Months with a budget, "YYYY-MM"
 * @property {(month: string) => Promise<any>} month           One month's categories + totals
 * @property {() => Promise<void>} sync                        Pull/push changes for the loaded budget
 * @property {(month: string, categoryId: string, amount: number) => Promise<void>} setAmount
 * @property {(month: string, categoryId: string, flag: boolean) => Promise<void>} setCarryover
 * @property {(month: string, amount: number) => Promise<void>} hold
 * @property {(month: string) => Promise<void>} resetHold
 */

/**
 * `getBudgets()` returns a budget **twice** once it has been downloaded: the
 * local copy (`id` set, `state` null) and the server's entry (`state: 'remote'`).
 * They are the same budget, so merge them on `cloudFileId` — keeping the local
 * `id` and reporting `state: 'local'` for one that is cached on this machine.
 * @param {any[]} budgets
 */
function dedupe(budgets) {
  const merged = new Map();
  for (const b of budgets) {
    const key = b.cloudFileId ?? b.groupId ?? b.id;
    const existing = merged.get(key);
    merged.set(key, existing ? { ...existing, ...b, id: existing.id ?? b.id } : { ...b });
  }
  return [...merged.values()].map((b) => ({ ...b, state: b.id ? 'local' : (b.state ?? 'remote') }));
}

/** @param {ReturnType<typeof import('./_base.js').createContext>} ctx @returns {BudgetsApi} */
export function buildBudgets(ctx) {
  return {
    list: async () => dedupe(await ctx.server((api) => api.getBudgets())),

    get: async (idOrName) => {
      const budgets = dedupe(await ctx.server((api) => api.getBudgets()));
      return (
        budgets.find((b) => b.groupId === idOrName || b.cloudFileId === idOrName || b.name === idOrName) ?? null
      );
    },

    months: () => ctx.read((api) => api.getBudgetMonths()),

    month: (month) => ctx.read((api) => api.getBudgetMonth(month)),

    sync: () => ctx.read((api) => api.sync()),

    setAmount: (month, categoryId, amount) =>
      ctx.write((api) => api.setBudgetAmount(month, categoryId, amount)),

    setCarryover: (month, categoryId, flag) =>
      ctx.write((api) => api.setBudgetCarryover(month, categoryId, flag)),

    hold: (month, amount) => ctx.write((api) => api.holdBudgetForNextMonth(month, amount)),

    resetHold: (month) => ctx.write((api) => api.resetBudgetHold(month)),
  };
}
