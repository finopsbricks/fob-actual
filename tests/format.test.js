import { formatAmount, parseAmount, formatTable, formatCsv, formatPaginationHint, formatField } from '../src/cli/utils/format.js';

describe('formatAmount', () => {
  it('converts integer minor units to decimal', () => {
    expect(formatAmount(5176357)).toBe('51,763.57');
    expect(formatAmount(-2469519)).toBe('-24,695.19');
  });

  it('renders an explicit zero, unlike formatCurrency', () => {
    // A zero balance is meaningful data in a budget, not an absent value.
    expect(formatAmount(0)).toBe('0.00');
  });

  it('returns empty for null/undefined', () => {
    expect(formatAmount(null)).toBe('');
    expect(formatAmount(undefined)).toBe('');
  });
});

describe('parseAmount', () => {
  it('converts a decimal string to minor units', () => {
    expect(parseAmount('51763.57')).toBe(5176357);
    expect(parseAmount('1,250.00')).toBe(125000);
    expect(parseAmount('-10.5')).toBe(-1050);
  });

  it('rounds rather than truncating float error', () => {
    expect(parseAmount('0.07')).toBe(7);
    expect(parseAmount('1.005')).toBe(101);
  });

  it('errors in the flag vocabulary the user typed', () => {
    expect(() => parseAmount('abc', '--amount')).toThrow('--amount must be a number');
    expect(() => parseAmount('', '--amount')).toThrow('--amount is required');
  });
});

describe('formatTable', () => {
  it('aligns columns and marks empty cells', () => {
    const out = formatTable(['A', 'B'], [['x', ''], ['longer', 'y']], { align: ['left', 'right'] });
    expect(out).toContain('longer');
    expect(out).toContain('—');
  });

  it('renders a placeholder for no rows', () => {
    expect(formatTable(['A'], [])).toContain('(none)');
  });
});

describe('formatCsv', () => {
  it('quotes cells containing commas and quotes', () => {
    const out = formatCsv(['A', 'B'], [['x,y', 'say "hi"']]);
    expect(out).toContain('"x,y"');
    expect(out).toContain('"say ""hi"""');
  });
});

describe('formatPaginationHint', () => {
  it('reports a client-side trim', () => {
    expect(formatPaginationHint({ shown: 10, total: 50 })).toContain('showing 10 of 50');
  });

  it('is silent when nothing was trimmed', () => {
    expect(formatPaginationHint({ shown: 50, total: 50 })).toBeNull();
    expect(formatPaginationHint({})).toBeNull();
  });
});

describe('formatField', () => {
  it('pads the label and dashes an empty value', () => {
    expect(formatField('Name', 'Acme', 10)).toBe('Name:       Acme');
    expect(formatField('Name', null, 10)).toContain('—');
  });
});
