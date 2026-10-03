import { jest } from '@jest/globals';
import { captureOutput, ExitError } from './helpers.js';

// Mock the client factory so no engine session is ever opened.
const budgets = {
  list: jest.fn(),
  get: jest.fn(),
  months: jest.fn(),
  month: jest.fn(),
  sync: jest.fn(),
  setAmount: jest.fn(),
};

jest.unstable_mockModule('../src/cli/_helpers.js', () => ({
  clientFor: () => ({ budgets }),
  requireCreds: () => ({ name: 'test', server_url: 'https://x', source: "profile 'test'" }),
  safe: (h) => h,
  localOptions: (y) => y,
  jsonOption: (y) => y,
  listOptions: (y) => y,
  listOutputOptions: (y) => y,
  writeOptions: (y) => y,
  credsForBudget: () => ({}),
}));

const { listBudgetsHandler } = await import('../src/cli/budgets/list.js');
const { showBudgetHandler } = await import('../src/cli/budgets/show.js');
const { monthBudgetHandler } = await import('../src/cli/budgets/month.js');
const { setAmountBudgetHandler } = await import('../src/cli/budgets/set-amount.js');

const BUDGETS = [
  { groupId: 'g1', cloudFileId: 'f1', name: 'Household Budget', state: 'remote', encryptKeyId: null, usersWithAccess: [{ userName: 'a@b.c', displayName: 'A', owner: true }] },
  { groupId: 'g2', cloudFileId: 'f2', name: 'Business Budget', state: 'remote', encryptKeyId: 'k1', usersWithAccess: [] },
];

let out;
beforeEach(() => { jest.clearAllMocks(); out = captureOutput(); });
afterEach(() => out.restore());

describe('listBudgetsHandler', () => {
  it('renders a table of budgets', async () => {
    budgets.list.mockResolvedValue(BUDGETS);
    await listBudgetsHandler({});
    expect(out.stdout).toContain('Household Budget');
    expect(out.stdout).toContain('g1');
  });

  it('emits raw records under --json', async () => {
    budgets.list.mockResolvedValue(BUDGETS);
    await listBudgetsHandler({ json: true });
    const parsed = JSON.parse(out.stdout);
    expect(parsed.budgets).toHaveLength(2);
    expect(parsed.budgets[0].cloudFileId).toBe('f1');
  });

  it('reports the encrypted flag', async () => {
    budgets.list.mockResolvedValue(BUDGETS);
    await listBudgetsHandler({ fields: 'name,encrypted' });
    expect(out.stdout).toMatch(/Business Budget\s+yes/);
  });

  it('trims with --limit and says so', async () => {
    budgets.list.mockResolvedValue(BUDGETS);
    await listBudgetsHandler({ limit: 1 });
    expect(out.stdout).toContain('showing 1 of 2');
  });

  it('rejects an unknown --fields value', async () => {
    budgets.list.mockResolvedValue(BUDGETS);
    await expect(listBudgetsHandler({ fields: 'nope' })).rejects.toThrow(/Unknown field/);
  });

  it('prints a placeholder when there are none', async () => {
    budgets.list.mockResolvedValue([]);
    await listBudgetsHandler({});
    expect(out.stdout).toContain('(no budgets)');
  });
});

describe('showBudgetHandler', () => {
  it('shows the budget and its users', async () => {
    budgets.get.mockResolvedValue(BUDGETS[0]);
    await showBudgetHandler({ id: 'g1' });
    expect(budgets.get).toHaveBeenCalledWith('g1');
    expect(out.stdout).toContain('Household Budget');
    expect(out.stdout).toContain('a@b.c');
  });

  it('exits 1 when not found', async () => {
    budgets.get.mockResolvedValue(null);
    await expect(showBudgetHandler({ id: 'nope' })).rejects.toThrow(ExitError);
    expect(out.stderr).toContain('No budget found');
  });
});

describe('monthBudgetHandler', () => {
  const MONTH = {
    month: '2026-09',
    incomeAvailable: -16284679,
    totalBudgeted: -46500000,
    toBudget: -62784679,
    totalSpent: -3578179,
    categoryGroups: [{ name: 'Necessity', categories: [{ name: 'Rent', budgeted: 4500000, spent: 0, balance: 4500000 }] }],
  };

  it('formats amounts from minor units', async () => {
    budgets.month.mockResolvedValue(MONTH);
    await monthBudgetHandler({ month: '2026-09' });
    expect(out.stdout).toContain('45,000.00');
    expect(out.stdout).toContain('Rent');
  });

  it('exits 1 for a month with no budget', async () => {
    budgets.month.mockResolvedValue(null);
    await expect(monthBudgetHandler({ month: '1999-01' })).rejects.toThrow(ExitError);
    expect(out.stderr).toContain('No budget found for month');
  });
});

describe('setAmountBudgetHandler', () => {
  it('converts the amount and calls the client', async () => {
    await setAmountBudgetHandler({ month: '2026-09', categoryId: 'c1', amount: '1250.00' });
    expect(budgets.setAmount).toHaveBeenCalledWith('2026-09', 'c1', 125000);
  });

  it('writes nothing under --dry-run', async () => {
    await setAmountBudgetHandler({ month: '2026-09', categoryId: 'c1', amount: '1250.00', dryRun: true });
    expect(budgets.setAmount).not.toHaveBeenCalled();
    expect(out.stdout).toContain('[dry-run]');
  });

  it('rejects a non-numeric amount in the flag vocabulary', async () => {
    await expect(
      setAmountBudgetHandler({ month: '2026-09', categoryId: 'c1', amount: 'abc' }),
    ).rejects.toThrow('--amount must be a number');
  });
});
