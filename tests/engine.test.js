import { jest } from '@jest/globals';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// A fake @actual-app/api recording the lifecycle calls the engine makes.
const calls = [];
const api = {
  init: jest.fn(async () => calls.push('init')),
  downloadBudget: jest.fn(async () => calls.push('download')),
  sync: jest.fn(async () => calls.push('sync')),
  shutdown: jest.fn(async () => calls.push('shutdown')),
  getAccounts: jest.fn(async () => [{ id: 'a1' }]),
};
jest.unstable_mockModule('@actual-app/api', () => api);

const { withSession, hold, toActualError, ActualError } = await import('../src/engine.js');

const creds = {
  server_url: 'https://budget.example.com',
  session_token: 'tok',
  sync_id: 'sync-1',
  data_dir: mkdtempSync(join(tmpdir(), 'fob-actual-engine-')),
};

beforeEach(() => {
  jest.clearAllMocks();
  calls.length = 0;
});

describe('withSession', () => {
  it('opens, runs, and always closes', async () => {
    const result = await withSession(creds, async (a) => a.getAccounts());
    expect(result).toEqual([{ id: 'a1' }]);
    expect(calls).toEqual(['init', 'download', 'shutdown']);
  });

  it('syncs after a write, before closing', async () => {
    await withSession(creds, async () => 'done', { sync: true });
    expect(calls).toEqual(['init', 'download', 'sync', 'shutdown']);
  });

  it('skips loading a budget when budget:false', async () => {
    await withSession(creds, async () => 'done', { budget: false });
    expect(api.downloadBudget).not.toHaveBeenCalled();
  });

  it('closes even when the handler throws', async () => {
    await expect(
      withSession(creds, async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    expect(api.shutdown).toHaveBeenCalled();
  });

  it('requires a sync id for budget calls, naming the fix', async () => {
    await expect(withSession({ ...creds, sync_id: undefined }, async () => 1)).rejects.toThrow(
      /No budget selected/,
    );
  });

  it('requires a token', async () => {
    await expect(withSession({ ...creds, session_token: undefined }, async () => 1)).rejects.toThrow(
      /auth login/,
    );
  });
});

describe('hold', () => {
  it('opens one session for many calls', async () => {
    await hold(creds, async () => {
      await withSession(creds, async (a) => a.getAccounts());
      await withSession(creds, async (a) => a.getAccounts());
      await withSession(creds, async (a) => a.getAccounts());
    });
    // One open/close, not three — the bug this exists to prevent.
    expect(calls.filter((c) => c === 'init')).toHaveLength(1);
    expect(calls.filter((c) => c === 'shutdown')).toHaveLength(1);
  });

  it('syncs once when a nested call wrote', async () => {
    await hold(creds, async () => {
      await withSession(creds, async () => 'read');
      await withSession(creds, async () => 'write', { sync: true });
    });
    expect(calls.filter((c) => c === 'sync')).toHaveLength(1);
  });

  it('does not sync when every nested call was a read', async () => {
    await hold(creds, async () => {
      await withSession(creds, async () => 'read');
    });
    expect(api.sync).not.toHaveBeenCalled();
  });
});

describe('toActualError', () => {
  it('maps an expired token to an actionable message', () => {
    const err = toActualError({ message: 'Authentication failed: invalid or expired session token' });
    expect(err).toBeInstanceOf(ActualError);
    expect(err.code).toBe('token-expired');
    expect(err.message).toContain('auth login');
  });

  it('maps an unreachable server', () => {
    const err = toActualError({ meta: { errorCode: 'network-failure' }, message: 'x' });
    expect(err.code).toBe('network-failure');
    expect(err.message).toContain('server URL');
  });

  it('points an encrypted budget at the encryption password', () => {
    const err = toActualError({ meta: { errorCode: 'needs-key' }, message: 'x' });
    expect(err.message).toContain('encryption-password');
  });

  it('preserves an unrecognised message', () => {
    expect(toActualError(new Error('something odd')).message).toBe('something odd');
  });
});
