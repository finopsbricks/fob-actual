// @ts-check
import { readFileSync } from 'node:fs';

import { clientFor } from '../_helpers.js';
import { formatTable, formatCsv } from '../utils/format.js';

/**
 * Run an ActualQL query — the escape hatch for anything the typed resources
 * don't expose.
 *
 * A query is built from flags (`--table`, `--filter`, `--select`, …) or supplied
 * whole as serialized JSON, which is exactly what `Query.serialize()` produces,
 * so a query composed in a script can be handed straight to the CLI.
 */
export async function runQueryHandler(argv) {
  const actual = clientFor();

  let state;
  if (argv.file || argv.query) {
    const raw = argv.file ? readFileSync(argv.file, 'utf8') : argv.query;
    try {
      state = JSON.parse(raw);
    } catch (err) {
      throw new Error(`Query is not valid JSON: ${err.message}`);
    }
    if (!state.table) throw new Error('A serialized query must include a "table".');
  } else {
    if (!argv.table) throw new Error('Pass --table <name>, or a full query with --query/--file.');
    state = buildFromFlags(argv);
  }

  // aqlQuery calls query.serialize(), so it needs a real Query — the serialized
  // state alone is not enough. Rebuild one through the exported `q()` builder,
  // which is the supported way to construct it.
  const query = await buildQuery(actual, state);

  const result = await actual.query.run(query);
  const rows = result?.data ?? [];

  if (argv.json || !rows.length) {
    console.log(JSON.stringify(argv.json ? result : { data: rows }, null, 2));
    return;
  }

  // Columns come from the rows themselves — a query's shape isn't known ahead.
  const headers = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const cells = rows.map((r) => headers.map((h) => (r[h] == null ? '' : String(r[h]))));

  if (argv.format === 'csv') {
    console.log(formatCsv(headers, cells));
    return;
  }
  console.log(formatTable(headers, cells));
}

/**
 * Turn serialized query state back into a Query instance via `q()` and its
 * chainable methods.
 */
async function buildQuery(actual, state) {
  let query = await actual.query.q(state.table);
  for (const filter of state.filterExpressions ?? []) query = query.filter(filter);
  const select = state.selectExpressions ?? [];
  if (select.length && !(select.length === 1 && select[0] === '*')) {
    query = query.select(select);
  } else {
    query = query.select('*');
  }
  for (const group of state.groupExpressions ?? []) query = query.groupBy(group);
  for (const order of state.orderExpressions ?? []) query = query.orderBy(order);
  if (state.limit != null) query = query.limit(state.limit);
  if (state.offset != null) query = query.offset(state.offset);
  if (state.calculation) query = query.calculate(select[0]);
  if (state.withDead) query = query.withDead();
  if (state.rawMode) query = query.raw();
  return query;
}

/** Assemble a serialized query from the convenience flags. */
function buildFromFlags(argv) {
  const state = {
    table: argv.table,
    filterExpressions: [],
    selectExpressions: argv.select ? argv.select.split(',').map((s) => s.trim()) : ['*'],
    groupExpressions: [],
    orderExpressions: [],
    calculation: false,
    rawMode: false,
    withDead: false,
    validateRefs: true,
    limit: argv.limit ?? null,
    offset: null,
  };

  for (const filter of argv.filter ?? []) {
    let parsed;
    try {
      parsed = JSON.parse(filter);
    } catch (err) {
      throw new Error(
        `--filter must be JSON, e.g. --filter '{"amount":{"$lt":0}}' (${err.message})`,
      );
    }
    state.filterExpressions.push(parsed);
  }

  if (argv.orderBy) {
    state.orderExpressions.push(
      argv.desc ? { [argv.orderBy]: 'desc' } : argv.orderBy,
    );
  }

  return state;
}
