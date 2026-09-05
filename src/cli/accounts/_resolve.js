// @ts-check
/**
 * Resolve an account reference to the account record.
 *
 * Accounts are addressed by uuid, but nobody remembers a uuid — so every command
 * that takes an account accepts its **name** too, matched case-insensitively.
 * Centralised here so `show`, `balance`, and the transaction commands all resolve
 * identically and report an ambiguous name the same way.
 *
 * @param {object} actual  A fobActual client
 * @param {string} ref     Account id or name
 * @returns {Promise<object|null>}
 */
export async function resolveAccount(actual, ref) {
  const accounts = await actual.accounts.list();
  const byId = accounts.find((a) => a.id === ref);
  if (byId) return byId;

  const matches = accounts.filter((a) => a.name?.toLowerCase() === String(ref).toLowerCase());
  if (matches.length > 1) {
    throw new Error(
      `Account name '${ref}' is ambiguous (${matches.length} matches). Use the id instead: ` +
        matches.map((a) => a.id).join(', '),
    );
  }
  return matches[0] ?? null;
}

/** Resolve an account reference to its id, throwing when unknown. */
export async function resolveAccountId(actual, ref) {
  const account = await resolveAccount(actual, ref);
  if (!account) throw new Error(`No account found for: ${ref}`);
  return account.id;
}
