import { jest } from '@jest/globals';
import { captureOutput, ExitError } from './helpers.js';

const accounts = {
  list: jest.fn(),
  balance: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  close: jest.fn(),
  reopen: jest.fn(),
  delete: jest.fn(),
};

// hold() runs its callback straight through — the session is the engine's
// concern, not the handler's.
const client = { accounts, hold: (fn) => fn() };

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

const { listAccountsHandler } = await import('../src/cli/accounts/list.js');
const { showAccountHandler } = await import('../src/cli/accounts/show.js');
const { balanceAccountHandler } = await import('../src/cli/accounts/balance.js');
const { createAccountHandler, deleteAccountHandler, editAccountHandler } = await import('../src/cli/accounts/write.js');

const ACCOUNTS = [
  { id: 'a1', name: 'Checking 1234', offbudget: false, closed: false },
  { id: 'a2', name: 'Old Card', offbudget: false, closed: true },
];

let out;
beforeEach(() => {
  jest.clearAllMocks();
  out = captureOutput();
  accounts.list.mockResolvedValue(ACCOUNTS);
  accounts.balance.mockResolvedValue(5176357);
});
afterEach(() => out.restore());

describe('listAccountsHandler', () => {
  it('formats balances from minor units', async () => {
    await listAccountsHandler({});
    expect(out.stdout).toContain('51,763.57');
  });

  it('hides closed accounts unless --all', async () => {
    await listAccountsHandler({});
    expect(out.stdout).not.toContain('Old Card');
    out.restore();
    out = captureOutput();
    await listAccountsHandler({ all: true });
    expect(out.stdout).toContain('Old Card');
  });

  it('skips the balance fetch when no balance column is requested', async () => {
    await listAccountsHandler({ fields: 'id,name' });
    expect(accounts.balance).not.toHaveBeenCalled();
  });
});

describe('resolveAccount (via handlers)', () => {
  it('resolves an account by name, case-insensitively', async () => {
    await showAccountHandler({ id: 'checking 1234' });
    expect(out.stdout).toContain('Checking 1234');
  });

  it('resolves by id', async () => {
    await showAccountHandler({ id: 'a1' });
    expect(out.stdout).toContain('Checking 1234');
  });

  it('exits 1 for an unknown account', async () => {
    await expect(showAccountHandler({ id: 'nope' })).rejects.toThrow(ExitError);
    expect(out.stderr).toContain('No account found');
  });

  it('refuses an ambiguous name rather than guessing', async () => {
    accounts.list.mockResolvedValue([
      { id: 'x1', name: 'Shared' },
      { id: 'x2', name: 'Shared' },
    ]);
    await expect(showAccountHandler({ id: 'Shared' })).rejects.toThrow(/ambiguous/);
  });
});

describe('balanceAccountHandler', () => {
  it('validates --as-of in the flag vocabulary', async () => {
    await expect(balanceAccountHandler({ id: 'a1', asOf: '01-2026' })).rejects.toThrow(
      '--as-of must be in YYYY-MM-DD format',
    );
  });

  it('passes the cutoff through as a Date', async () => {
    await balanceAccountHandler({ id: 'a1', asOf: '2026-06-30' });
    expect(accounts.balance).toHaveBeenCalledWith('a1', new Date('2026-06-30'));
  });
});

describe('writes', () => {
  it('parses the starting balance into minor units', async () => {
    accounts.create.mockResolvedValue('new-id');
    await createAccountHandler({ name: 'New', balance: '1000.00' });
    expect(accounts.create).toHaveBeenCalledWith({ name: 'New', offbudget: false }, 100000);
  });

  it('refuses a delete without --yes', async () => {
    await expect(deleteAccountHandler({ id: 'a1' })).rejects.toThrow(/--yes/);
    expect(accounts.delete).not.toHaveBeenCalled();
  });

  it('deletes with --yes', async () => {
    await deleteAccountHandler({ id: 'a1', yes: true });
    expect(accounts.delete).toHaveBeenCalledWith('a1');
  });

  it('writes nothing under --dry-run, even with --yes', async () => {
    await deleteAccountHandler({ id: 'a1', yes: true, dryRun: true });
    expect(accounts.delete).not.toHaveBeenCalled();
    expect(out.stdout).toContain('[dry-run]');
  });

  it('rejects an edit with no changed fields', async () => {
    await expect(editAccountHandler({ id: 'a1' })).rejects.toThrow(/Nothing to change/);
  });
});
