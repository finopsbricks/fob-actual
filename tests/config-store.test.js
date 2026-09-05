import { mkdtempSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Point the store at a throwaway dir and clear any ambient env creds BEFORE import
// (config-store resolves its config path at module load).
const dir = mkdtempSync(join(tmpdir(), 'fob-actual-cfg-'));
process.env.FOB_ACTUAL_CONFIG_DIR = dir;
const ENV_KEYS = [
  'FOB_ACTUAL_SERVER_URL',
  'FOB_ACTUAL_SESSION_TOKEN',
  'FOB_ACTUAL_SYNC_ID',
  'FOB_ACTUAL_ENCRYPTION_PASSWORD',
  'FOB_ACTUAL_DATA_DIR',
];
for (const k of ENV_KEYS) delete process.env[k];

const store = await import('../src/cli/config-store.js');

const creds = {
  server_url: 'https://budget.example.com',
  session_token: 'tok-1',
  sync_id: 'sync-1',
};

afterEach(() => {
  store.setProfileOverride(null);
  for (const k of ENV_KEYS) delete process.env[k];
});

it('adds a profile, makes it current, and resolves it', () => {
  store.addProfile('acme', creds);
  const r = store.resolveCredentials();
  expect(r.name).toBe('acme');
  expect(r.server_url).toBe('https://budget.example.com');
  expect(r.source).toContain("profile 'acme'");
});

it('defaults the data dir per profile so budgets never share a cache', () => {
  store.addProfile('acme', creds);
  store.addProfile('other', creds);
  expect(store.resolveCredentials().data_dir).toBe(join(dir, 'data', 'acme'));
  store.setProfileOverride('other');
  expect(store.resolveCredentials().data_dir).toBe(join(dir, 'data', 'other'));
});

it('env (full set) beats the current profile', () => {
  store.addProfile('acme', creds);
  process.env.FOB_ACTUAL_SERVER_URL = 'https://env.example.com';
  process.env.FOB_ACTUAL_SESSION_TOKEN = 'env-tok';
  const r = store.resolveCredentials();
  expect(r.source).toBe('FOB_ACTUAL_* env');
  expect(r.server_url).toBe('https://env.example.com');
  expect(r.name).toBeNull();
});

it('a partial env set does NOT override the profile', () => {
  store.addProfile('acme', creds);
  process.env.FOB_ACTUAL_SERVER_URL = 'https://env.example.com'; // no token
  const r = store.resolveCredentials();
  expect(r.source).toContain("profile 'acme'");
  expect(r.server_url).toBe('https://budget.example.com');
});

it('--profile beats both env and the current profile', () => {
  store.addProfile('acme', creds);
  store.addProfile('other', { ...creds, server_url: 'https://other.example.com' });
  process.env.FOB_ACTUAL_SERVER_URL = 'https://env.example.com';
  process.env.FOB_ACTUAL_SESSION_TOKEN = 'env-tok';
  store.setProfileOverride('other');
  const r = store.resolveCredentials();
  expect(r.name).toBe('other');
  expect(r.server_url).toBe('https://other.example.com');
});

it('throws a helpful error for an unknown --profile', () => {
  store.setProfileOverride('nope');
  expect(() => store.resolveCredentials()).toThrow(/not configured/);
});

it('writes the config file 0600', () => {
  store.addProfile('acme', creds);
  const mode = statSync(store.configPath()).mode & 0o777;
  expect(mode).toBe(0o600);
});

it('keeps secrets out of the display list', () => {
  store.addProfile('acme', { ...creds, encryption_password: 'pw' });
  const { profiles } = store.listProfiles();
  const row = profiles.find((p) => p.name === 'acme');
  expect(row.has_session_token).toBe(true);
  expect(row.encrypted).toBe(true);
  expect(JSON.stringify(row)).not.toContain('tok-1');
  expect(JSON.stringify(row)).not.toContain('pw');
});

it('describeCurrent scrubs secrets', () => {
  store.addProfile('acme', { ...creds, encryption_password: 'pw' });
  const shown = store.describeCurrent();
  expect(shown.server_url).toBe('https://budget.example.com');
  expect(shown.session_token).toBeUndefined();
  expect(shown.encryption_password).toBeUndefined();
});

it('merges on upsert so metadata survives a credential update', () => {
  store.addProfile('acme', creds);
  store.setProfileIdentity('acme', { budget_name: 'My Budget' });
  store.addProfile('acme', { session_token: 'tok-2' });
  const p = store.getProfile('acme');
  expect(p.budget_name).toBe('My Budget');
  expect(p.session_token).toBe('tok-2');
});

it('clearProfileToken removes only the token', () => {
  store.addProfile('acme', creds);
  store.clearProfileToken('acme');
  const p = store.getProfile('acme');
  expect(p.session_token).toBeUndefined();
  expect(p.server_url).toBe('https://budget.example.com');
});

it('removing the current profile repoints current at another', () => {
  store.addProfile('acme', creds);
  store.addProfile('other', creds);
  store.useProfile('acme');
  store.removeProfile('acme');
  expect(store.loadConfig().current_profile).toBe('other');
});
