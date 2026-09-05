/**
 * CLI credential store — reads/writes ~/.fob/fob-actual/config.yml (mode 0600)
 * and resolves which credentials the current command uses.
 *
 * Config lives under the shared family root ~/.fob/ so every fob-<tool> wrapper
 * keeps its config in one place. Path is home-dir based (os.homedir()) for
 * multi-OS support; not XDG. Override the whole dir with FOB_ACTUAL_CONFIG_DIR.
 *
 * A profile holds the connection credentials (server URL + session token) plus
 * the budget it points at and cached, non-secret metadata (budget_name). Because
 * the engine loads one budget at a time, a profile maps 1:1 to a budget file —
 * `--profile` switches budgets the way it switches orgs in the other wrappers.
 *
 * Each profile also owns a **data dir**: the engine materialises a local SQLite
 * copy of the budget, cached between runs. It defaults to
 * ~/.fob/fob-actual/data/<profile>/ so two profiles never share one budget cache.
 *
 * CLI-only: the importable client (src/index.js) never imports this. CLI handlers
 * call resolveCredentials() and pass the result to fobActual() as the credentials.
 *
 * Precedence: `--profile` flag > FOB_ACTUAL_* env (full set) > config `current_profile`.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import yaml from 'js-yaml';

const CONFIG_DIR = process.env.FOB_ACTUAL_CONFIG_DIR || join(homedir(), '.fob', 'fob-actual');
const CONFIG_PATH = join(CONFIG_DIR, 'config.yml');

/** Secret fields never shown in `profiles list` / `current`. */
const SECRET_FIELDS = ['session_token', 'encryption_password'];

let profileOverride = null;

/** Set by the `--profile <name>` global flag (yargs middleware). Beats env + current_profile. */
export function setProfileOverride(name) {
  profileOverride = name;
}

export function loadConfig() {
  if (existsSync(CONFIG_PATH)) {
    const cfg = yaml.load(readFileSync(CONFIG_PATH, 'utf8')) || {};
    return { current_profile: cfg.current_profile ?? null, profiles: cfg.profiles ?? {} };
  }
  return { current_profile: null, profiles: {} };
}

export function saveConfig(cfg) {
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_PATH, yaml.dump(cfg), { mode: 0o600 });
}

/** Absolute path to the config file (shown in the `profiles list` footer). */
export function configPath() {
  return CONFIG_PATH;
}

/**
 * Where a profile's local budget cache lives. Kept out of the config file unless
 * explicitly overridden, so the default relocates with FOB_ACTUAL_CONFIG_DIR.
 */
export function defaultDataDir(name) {
  return join(CONFIG_DIR, 'data', name || 'default');
}

/**
 * Create or replace a profile's stored fields. Merges into any existing profile
 * so metadata (budget_name) survives a credential update.
 */
export function addProfile(name, fields) {
  const cfg = loadConfig();
  cfg.profiles[name] = { ...cfg.profiles[name], ...fields };
  if (!cfg.current_profile) cfg.current_profile = name;
  saveConfig(cfg);
  return cfg.profiles[name];
}

export function removeProfile(name) {
  const cfg = loadConfig();
  if (!cfg.profiles[name]) throw new Error(`No profile named '${name}'.`);
  delete cfg.profiles[name];
  if (cfg.current_profile === name) cfg.current_profile = Object.keys(cfg.profiles)[0] ?? null;
  saveConfig(cfg);
  return cfg;
}

export function useProfile(name) {
  const cfg = loadConfig();
  if (!cfg.profiles[name]) {
    throw new Error(`No profile named '${name}'. Run \`fob-actual config profiles add ${name}\`.`);
  }
  cfg.current_profile = name;
  saveConfig(cfg);
  return cfg;
}

/** Raw stored fields for a named profile (includes secrets — for internal use). */
export function getProfile(name) {
  const cfg = loadConfig();
  const p = cfg.profiles[name];
  if (!p) throw new Error(`No profile named '${name}'.`);
  return { ...p };
}

/**
 * Merge cached, non-secret identity/metadata into a stored profile
 * (sync_id, budget_name). Leaves credentials untouched.
 */
export function setProfileIdentity(name, meta = {}) {
  const cfg = loadConfig();
  if (!cfg.profiles[name]) throw new Error(`No profile named '${name}'.`);
  const allowed = {};
  for (const k of ['sync_id', 'budget_name', 'server_url']) {
    if (meta[k] !== undefined) allowed[k] = meta[k];
  }
  cfg.profiles[name] = { ...cfg.profiles[name], ...allowed };
  saveConfig(cfg);
  return cfg.profiles[name];
}

/** Store a freshly-captured session token (used by `auth login`). */
export function updateProfileToken(name, session_token) {
  const cfg = loadConfig();
  if (!cfg.profiles[name]) throw new Error(`No profile named '${name}'.`);
  cfg.profiles[name] = { ...cfg.profiles[name], session_token };
  saveConfig(cfg);
}

/** Remove the stored session token from a profile (used by `auth logout`). */
export function clearProfileToken(name) {
  const cfg = loadConfig();
  if (!cfg.profiles[name]) throw new Error(`No profile named '${name}'.`);
  const { session_token, ...rest } = cfg.profiles[name];
  cfg.profiles[name] = rest;
  saveConfig(cfg);
}

/**
 * Profiles for display — non-secret metadata only.
 * @returns {{ current: string|null, path: string, profiles: object[] }}
 */
export function listProfiles() {
  const cfg = loadConfig();
  const profiles = Object.entries(cfg.profiles).map(([name, p]) => ({
    name,
    current: name === cfg.current_profile,
    server_url: p.server_url,
    sync_id: p.sync_id,
    budget_name: p.budget_name,
    data_dir: p.data_dir || defaultDataDir(name),
    has_session_token: Boolean(p.session_token),
    encrypted: Boolean(p.encryption_password),
  }));
  return { current: cfg.current_profile, path: CONFIG_PATH, profiles };
}

/** Strip secret fields from a resolved credentials object (for display). */
function scrub(creds) {
  const out = { ...creds };
  for (const k of SECRET_FIELDS) delete out[k];
  return out;
}

/**
 * Read the env credential set. Returns the credentials only when the full
 * required set is present, so a partial env never silently half-overrides a
 * profile. `sync_id` is optional here: `budgets list` works without one, and
 * commands that need a budget report the omission themselves.
 */
function envCredentials() {
  const {
    FOB_ACTUAL_SERVER_URL,
    FOB_ACTUAL_SESSION_TOKEN,
    FOB_ACTUAL_SYNC_ID,
    FOB_ACTUAL_ENCRYPTION_PASSWORD,
    FOB_ACTUAL_DATA_DIR,
  } = process.env;
  if (FOB_ACTUAL_SERVER_URL && FOB_ACTUAL_SESSION_TOKEN) {
    return {
      server_url: FOB_ACTUAL_SERVER_URL,
      session_token: FOB_ACTUAL_SESSION_TOKEN,
      sync_id: FOB_ACTUAL_SYNC_ID,
      encryption_password: FOB_ACTUAL_ENCRYPTION_PASSWORD,
      data_dir: FOB_ACTUAL_DATA_DIR || defaultDataDir('env'),
    };
  }
  return null;
}

/**
 * Resolve credentials for the current command.
 * Precedence: `--profile` override > FOB_ACTUAL_* env (full set) > `current_profile`.
 * @returns {object} credentials + `name` (profile name or null) + `source`
 */
export function resolveCredentials() {
  const cfg = loadConfig();

  if (profileOverride) {
    const p = cfg.profiles[profileOverride];
    if (!p) {
      throw new Error(
        `Profile '${profileOverride}' is not configured. Run \`fob-actual config profiles add ${profileOverride}\`.`,
      );
    }
    return {
      ...p,
      data_dir: p.data_dir || defaultDataDir(profileOverride),
      name: profileOverride,
      source: `profile '${profileOverride}'`,
    };
  }

  const env = envCredentials();
  if (env) return { ...env, name: null, source: 'FOB_ACTUAL_* env' };

  if (cfg.current_profile && cfg.profiles[cfg.current_profile]) {
    const p = cfg.profiles[cfg.current_profile];
    return {
      ...p,
      data_dir: p.data_dir || defaultDataDir(cfg.current_profile),
      name: cfg.current_profile,
      source: `profile '${cfg.current_profile}'`,
    };
  }

  throw new Error(
    'No Actual profile selected. Run `fob-actual config profiles add <name>` (or set FOB_ACTUAL_* env).',
  );
}

/**
 * Non-secret description of the identity the CLI would use right now — same
 * resolution as resolveCredentials(), minus secrets. Null when nothing is set.
 */
export function describeCurrent() {
  try {
    return scrub(resolveCredentials());
  } catch {
    return null;
  }
}
