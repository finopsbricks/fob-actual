import { jest } from '@jest/globals';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { captureOutput } from './helpers.js';

const transactions = { list: jest.fn(), add: jest.fn(), import: jest.fn(), update: jest.fn(), delete: jest.fn() };
const accounts = { list: jest.fn() };
const payees = { list: jest.fn() };
const categories = { listAll: jest.fn() };
const client = { transactions, accounts, payees, categories, hold: (fn) => fn() };

jest.unstable_mockModule('../src/cli/_helpers.js', () => ({
  clientFor: () => client,
  requireCreds: () => ({ name: 'test', source: "profile 'test'" }),
  safe: (h) => h,
  localOptions: (y) => y,
  jsonOption: (y) => y,
  listOptions: (y) => y,
  listOutputOptions: (y) => y,
  writeOptions: (y) => y,
  credsForBudget: () => ({}),
}));

const { listTransactionsHandler, validateDateRange } = await import('../src/cli/transactions/list.js');
const { addTransactionsHandler, importTransactionsHandler, deleteTransactionHandler } = await import('../src/cli/transactions/write.js');

const TXNS = [
  { id: 't1', date: '2026-09-04', payee: 'p1', category: 'c1', notes: 'lunch', amount: -20000 },
];

let out;
beforeEach(() => {
  jest.clearAllMocks();
  out = captureOutput();
  accounts.list.mockResolvedValue([{ id: 'a1', name: 'Checking 1234' }]);
  transactions.list.mockResolvedValue(TXNS);
  payees.list.mockResolvedValue([{ id: 'p1', name: 'Cafe' }]);
  categories.listAll.mockResolvedValue([{ id: 'c1', name: 'Work food' }]);
});
afterEach(() => out.restore());

describe('validateDateRange', () => {
  it('rejects a malformed --from', () => {
    expect(() => validateDateRange({ from: '09-2026' })).toThrow('--from must be in YYYY-MM-DD format');
  });

  it('rejects an inverted range using the flags the user typed', () => {
    expect(() => validateDateRange({ from: '2026-09-01', to: '2026-08-01' })).toThrow(
      '--from must be before or equal to --to',
    );
  });
});

describe('listTransactionsHandler', () => {
  it('resolves payee and category ids to names for the table', async () => {
    await listTransactionsHandler({ account: 'Checking 1234', from: '2026-09-01', to: '2026-09-30' });
    expect(out.stdout).toContain('Cafe');
    expect(out.stdout).toContain('Work food');
  });

  it('leaves raw ids in --json, which is what writes speak', async () => {
    await listTransactionsHandler({ account: 'a1', json: true });
    const parsed = JSON.parse(out.stdout);
    expect(parsed.transactions[0].payee).toBe('p1');
    expect(parsed.transactions[0].payee_name).toBeUndefined();
  });

  it('defaults to a bounded 30-day window', async () => {
    await listTransactionsHandler({ account: 'a1' });
    const [, from, to] = transactions.list.mock.calls[0];
    expect(from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(new Date(to) - new Date(from)).toBeCloseTo(30 * 24 * 3600 * 1000, -5);
  });
});

describe('addTransactionsHandler', () => {
  it('converts the amount to minor units', async () => {
    await addTransactionsHandler({ account: 'a1', date: '2026-09-05', amount: '-42.50' });
    const [, txns] = transactions.add.mock.calls[0];
    expect(txns[0].amount).toBe(-4250);
  });

  it('rejects a malformed --date', async () => {
    await expect(
      addTransactionsHandler({ account: 'a1', date: '05-09-2026', amount: '1' }),
    ).rejects.toThrow('--date must be in YYYY-MM-DD format');
  });

  it('reads a JSON file of transactions', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'fob-actual-txn-'));
    const file = join(dir, 'txns.json');
    writeFileSync(file, JSON.stringify([{ date: '2026-09-01', amount: -100 }]));
    await addTransactionsHandler({ account: 'a1', file });
    expect(transactions.add.mock.calls[0][1]).toHaveLength(1);
  });

  it('writes nothing under --dry-run', async () => {
    await addTransactionsHandler({ account: 'a1', date: '2026-09-05', amount: '-1.00', dryRun: true });
    expect(transactions.add).not.toHaveBeenCalled();
    expect(out.stdout).toContain('[dry-run]');
  });
});

describe('importTransactionsHandler', () => {
  it("uses the engine's own preview mode for --dry-run", async () => {
    const dir = mkdtempSync(join(tmpdir(), 'fob-actual-imp-'));
    const file = join(dir, 'txns.json');
    writeFileSync(file, JSON.stringify([{ date: '2026-09-01', amount: -100 }]));
    transactions.import.mockResolvedValue({ added: [], updated: [] });
    await importTransactionsHandler({ account: 'a1', file, dryRun: true });
    expect(transactions.import).toHaveBeenCalledWith('a1', expect.any(Array), { dryRun: true });
  });
});

describe('deleteTransactionHandler', () => {
  it('refuses without --yes', async () => {
    await expect(deleteTransactionHandler({ id: 't1' })).rejects.toThrow(/--yes/);
    expect(transactions.delete).not.toHaveBeenCalled();
  });
});
