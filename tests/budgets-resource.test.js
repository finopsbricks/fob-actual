import { jest } from '@jest/globals';

// Exercise the real buildBudgets() against a fake engine context, so the dedupe
// logic itself is covered rather than mocked past.
const { buildBudgets } = await import('../src/resources/budgets.js');

/** A downloaded budget is returned twice by the engine; a remote-only one once. */
const RAW = [
  { id: 'My-Finances-1', cloudFileId: 'f1', groupId: 'g1', name: 'Household Budget', state: null },
  { id: null, cloudFileId: 'f1', groupId: 'g1', name: 'Household Budget', state: 'remote' },
  { id: null, cloudFileId: 'f2', groupId: 'g2', name: 'Business Budget', state: 'remote' },
];

const ctx = { server: (fn) => fn({ getBudgets: async () => RAW }) };
const budgets = buildBudgets(ctx);

describe('budgets.list', () => {
  it('merges the local and remote entries for a downloaded budget', async () => {
    const list = await budgets.list();
    expect(list).toHaveLength(2);
    expect(list.filter((b) => b.name === 'Household Budget')).toHaveLength(1);
  });

  it("reports a downloaded budget as 'local' and keeps its local id", async () => {
    const [household] = await budgets.list();
    expect(household.state).toBe('local');
    expect(household.id).toBe('My-Finances-1');
  });

  it("leaves a not-yet-downloaded budget 'remote'", async () => {
    const fob = (await budgets.list()).find((b) => b.name === 'Business Budget');
    expect(fob.state).toBe('remote');
  });
});

describe('budgets.get', () => {
  it('resolves by sync id, file id, or name — all to the merged record', async () => {
    for (const ref of ['g1', 'f1', 'Household Budget']) {
      const found = await budgets.get(ref);
      expect(found.name).toBe('Household Budget');
      expect(found.state).toBe('local');
    }
  });

  it('returns null for an unknown reference', async () => {
    expect(await budgets.get('nope')).toBeNull();
  });
});
