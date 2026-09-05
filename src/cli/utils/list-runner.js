// @ts-check
/**
 * Shared driver for `list` handlers. Every list command has the same shape:
 * default to a human table, `--json` dumps raw, `--format csv|json` exports,
 * `--output` writes to a file, `--fields` selects columns, `--limit` trims.
 *
 * Simpler than the HTTP wrappers' runner: Actual's engine queries a local copy
 * of the budget and returns the entire result set in one call, so there is no
 * pagination to walk and no separate `getAll` path — `fetch` returns everything
 * and `--limit` trims client-side.
 *
 * Data goes to stdout; diagnostics (file-written notices, truncation hints) go
 * to stderr per the output standard.
 */

import { writeFileSync } from 'node:fs';
import { formatTable, formatCsv, formatPaginationHint } from './format.js';

/**
 * @param {object} opts
 * @param {object} opts.argv               Parsed yargs argv (reads fields/format/json/output/limit)
 * @param {object} opts.selector           buildColumnSelector() result
 * @param {() => Promise<any[]>} opts.fetch  Fetch every row
 * @param {string} opts.jsonKey            Envelope key for --format json (e.g. 'accounts')
 * @param {string} opts.emptyLabel         Printed when there are no rows (e.g. '(no accounts)')
 */
export async function runList({ argv, selector, fetch, jsonKey, emptyLabel }) {
  const fields = selector.parseFields(argv.fields);
  const format = argv.format ?? (argv.json ? 'json' : 'table');

  const emit = (text) => {
    if (argv.output) {
      writeFileSync(argv.output, text);
      console.error(`Wrote ${argv.output}`);
    } else {
      console.log(text);
    }
  };

  const all = await fetch();
  const total = all.length;
  const items = argv.limit ? all.slice(0, argv.limit) : all;

  if (format === 'json') {
    // --json is the scripting escape hatch: emit the engine's own records
    // untouched, not the column projection.
    emit(JSON.stringify({ [jsonKey]: items }, null, 2));
    return;
  }

  if (format === 'csv') {
    emit(formatCsv(selector.headersFor(fields), selector.rawRows(items, fields)));
    return;
  }

  if (items.length === 0) {
    console.log(emptyLabel);
    return;
  }

  emit(
    formatTable(selector.headersFor(fields), selector.renderRows(items, fields), {
      align: selector.alignFor(fields),
    }),
  );
  const hint = formatPaginationHint({ shown: items.length, total });
  if (hint) console.log(`\n${hint}`);
}
