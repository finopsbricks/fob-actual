import { jest } from '@jest/globals';
import { mkdtempSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// A fake @actual-app/api whose init can be made to print and fail like the real
// engine does on an unreachable server.
let initBehaviour = async () => {};
const api = {
  init: jest.fn(async (config) => initBehaviour(config)),
  downloadBudget: jest.fn(async () => {}),
  sync: jest.fn(async () => {}),
  shutdown: jest.fn(async () => {}),
  getServerVersion: jest.fn(async () => ({ version: '26.9.0' })),
};
jest.unstable_mockModule('@actual-app/api', () => api);

const { withSession } = await import('../src/engine.js');
const { fobActual } = await import('../src/index.js');

const base = { server_url: 'https://budget.example.com', session_token: 'tok', sync_id: 'sync-1' };
const freshDir = () => join(mkdtempSync(join(tmpdir(), 'fob-actual-out-')), 'data', 'p');

beforeEach(() => {
  jest.clearAllMocks();
  initBehaviour = async () => {};
  delete process.env.FOB_DEBUG;
});

test('starts the engine with verbose off, so its progress logs never reach stdout', async () => {
  await withSession({ ...base, data_dir: freshDir() }, async () => 1);
  expect(api.init).toHaveBeenCalledWith(expect.objectContaining({ verbose: false }));
});

test('FOB_DEBUG turns engine logging back on', async () => {
  process.env.FOB_DEBUG = '1';
  await withSession({ ...base, data_dir: freshDir() }, async () => 1);
  expect(api.init).toHaveBeenCalledWith(expect.objectContaining({ verbose: true }));
});

test("a failed init's own stderr output is dropped in favour of the friendly error", async () => {
  const printed = [];
  const spy = jest.spyOn(console, 'error').mockImplementation((...a) => printed.push(a.join(' ')));
  initBehaviour = async () => {
    console.error('TypeError: fetch failed\n    at node:internal/deps/undici …');
    const err = new Error('Network failure: server offline or unreachable');
    err.meta = { errorCode: 'network-failure' };
    throw err;
  };
  await expect(withSession({ ...base, data_dir: freshDir() }, async () => 1)).rejects.toThrow(
    /Could not reach the Actual server.*troubleshooting#could-not-reach-the-actual-server/,
  );
  spy.mockRestore();
  expect(printed.join('\n')).not.toMatch(/fetch failed/);
});

test('warnings from a successful engine call still reach stderr', async () => {
  const printed = [];
  const spy = jest.spyOn(console, 'error').mockImplementation((...a) => printed.push(a.join(' ')));
  initBehaviour = async () => {
    console.warn('engine warning');
  };
  await withSession({ ...base, data_dir: freshDir() }, async () => 1);
  spy.mockRestore();
  expect(printed).toContain('engine warning');
});

test('the data dir, which holds a decrypted budget copy, is owner-only', async () => {
  const dir = freshDir();
  await withSession({ ...base, data_dir: dir }, async () => 1);
  expect(statSync(dir).mode & 0o777).toBe(0o700);
});

test('serverVersion returns the version string, and throws on an engine error', async () => {
  const client = fobActual({ ...base, data_dir: freshDir() });
  await expect(client.serverVersion()).resolves.toBe('26.9.0');
  api.getServerVersion.mockResolvedValueOnce({ error: 'network-failure' });
  await expect(client.serverVersion()).rejects.toThrow(/Could not reach the Actual server/);
});
