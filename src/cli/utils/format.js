/**
 * Shared formatting helpers for CLI output.
 * Structured text readable by both humans and LLMs.
 *
 * Actual-specific note: the engine stores money as **integer minor units**
 * (`5176357` = 51,763.57), so `formatAmount` is the money helper here and
 * `formatCurrency` handles already-decimal values.
 */

/**
 * Format a label: value field with aligned label.
 * "Name:      Acme Corp"
 */
export function formatField(label, value, labelWidth = 0) {
  const padded = (label + ':').padEnd(labelWidth || label.length + 1);
  return `${padded}  ${value ?? '—'}`;
}

/**
 * Format a table with dynamic column widths.
 * @param {string[]} headers - Column header names
 * @param {string[][]} rows - Array of row arrays (strings)
 * @param {{ align?: Array<'left'|'right'> }} [options] - Per-column alignment; defaults to all 'left'
 * @returns {string} Formatted table string
 */
export function formatTable(headers, rows, options = {}) {
  if (rows.length === 0) {
    return headers.join('  ') + '\n(none)';
  }

  const align = options.align ?? [];
  const widths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map((r) => (r[i] || '').length)),
  );

  const pad = (text, width, i) =>
    align[i] === 'right' ? text.padStart(width) : text.padEnd(width);

  const headerLine = headers.map((h, i) => pad(h, widths[i], i)).join('  ');
  const separator = '-'.repeat(headerLine.length);
  const dataLines = rows.map((row) =>
    row.map((cell, i) => pad(cell || '—', widths[i], i)).join('  '),
  );

  return [headerLine, separator, ...dataLines].join('\n');
}

/**
 * Format rows as RFC-4180 CSV.
 * Cells containing commas, quotes, or newlines are double-quoted, and embedded
 * quotes are doubled. `null` / `undefined` become empty.
 */
export function formatCsv(headers, rows) {
  const escape = (value) => {
    if (value == null) return '';
    const s = String(value);
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const lines = [headers.map(escape).join(',')];
  for (const row of rows) lines.push(row.map(escape).join(','));
  return lines.join('\r\n');
}

/**
 * Format a decimal currency value with thousands separators and 2 decimals.
 * Returns '' for null / undefined / 0.
 */
export function formatCurrency(value) {
  if (value == null || value === '' || Number(value) === 0) return '';
  return Number(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Format an Actual integer amount (minor units) as decimal currency.
 * `5176357` -> "51,763.57", `-2469519` -> "-24,695.19".
 * Unlike formatCurrency, an explicit 0 renders as "0.00" — a zero balance is
 * meaningful data in a budget, not an absent value.
 */
export function formatAmount(minorUnits) {
  if (minorUnits == null || minorUnits === '') return '';
  const n = Number(minorUnits);
  if (Number.isNaN(n)) return String(minorUnits);
  return (n / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Parse a user-supplied decimal amount into Actual's integer minor units.
 * "51763.57" -> 5176357. Throws on anything non-numeric so a bad `--amount`
 * fails with the flag's own vocabulary rather than writing a wrong value.
 */
export function parseAmount(value, flag = '--amount') {
  if (value == null || value === '') throw new Error(`${flag} is required`);
  const text = String(value).trim().replace(/,/g, '');
  if (!/^-?\d*(\.\d*)?$/.test(text) || text === '' || text === '-' || text === '.') {
    throw new Error(`${flag} must be a number (e.g. 51763.57)`);
  }
  // Scale via the decimal string, not `n * 100`: binary floats cannot represent
  // most decimal fractions, so 1.005 * 100 is 100.49999... and Math.round would
  // silently drop a cent. Shifting the digits keeps the user's exact input.
  const negative = text.startsWith('-');
  const [whole, fraction = ''] = text.replace('-', '').split('.');
  const cents = Number(`${whole || '0'}${fraction.padEnd(2, '0').slice(0, 2)}`);
  // A third decimal place still rounds, now on the exact digits.
  const remainder = fraction.slice(2);
  const rounded = remainder && Number(remainder[0]) >= 5 ? cents + 1 : cents;
  if (Number.isNaN(rounded)) throw new Error(`${flag} must be a number (e.g. 51763.57)`);
  return negative ? -rounded : rounded;
}

/**
 * Format an ISO / yyyy-mm-dd date string to human-readable date-time.
 * "2026-03-15 10:23:01" — a bare date stays "2026-03-15".
 */
export function formatDate(iso) {
  if (!iso) return '—';
  // Actual dates are bare yyyy-mm-dd; keep them as-is rather than shifting TZ.
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toISOString().replace('T', ' ').slice(0, 19);
}

/**
 * One-line hint shown under a truncated list.
 *
 * Actual's engine has no server-side pagination — it queries a local copy of the
 * budget and returns the full result set — so there is no `page_context` to walk.
 * Lists are trimmed client-side with `--limit`, and this reports that trim.
 * Returns null when nothing was cut.
 */
export function formatPaginationHint({ shown, total } = {}) {
  if (!total || !shown || shown >= total) return null;
  return `(showing ${shown} of ${total} — use --limit ${total} to see all)`;
}

/**
 * Format a header line with right-aligned status.
 *   "Invoice: INV-001                  paid"
 */
export function formatHeader(label, id, status) {
  const left = `${label}: ${id}`;
  if (!status) return left;
  const minGap = 4;
  const width = Math.max(left.length + minGap + status.length, 60);
  return left + ' '.repeat(width - left.length - status.length) + status;
}

/**
 * Format a section divider.
 *   "--- Title ---"
 */
export function formatSection(title) {
  return `\n--- ${title} ---\n`;
}
