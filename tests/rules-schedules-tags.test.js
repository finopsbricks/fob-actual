import { jest } from '@jest/globals';
import { captureOutput, ExitError } from './helpers.js';

const rules = { list: jest.fn(), get: jest.fn(), forPayee: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() };
const schedules = { list: jest.fn(), get: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() };
const tags = { list: jest.fn(), get: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() };
const query = { run: jest.fn(), q: jest.fn() };
const client = { rules, schedules, tags, query, hold: (fn) => fn() };

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

const { listRulesHandler } = await import('../src/cli/rules/list.js');
const { createRuleHandler } = await import('../src/cli/rules/write.js');
const { listSchedulesHandler } = await import('../src/cli/schedules/list.js');
const { editScheduleHandler } = await import('../src/cli/schedules/write.js');
const { showTagHandler } = await import('../src/cli/tags/show.js');
const { runQueryHandler } = await import('../src/cli/query/run.js');

let out;
beforeEach(() => { jest.clearAllMocks(); out = captureOutput(); });
afterEach(() => out.restore());

describe('rules', () => {
  it('summarises conditions and actions on one line', async () => {
    rules.list.mockResolvedValue([
      { id: 'r1', stage: 'pre', conditions: [{ field: 'payee', op: 'is', value: 'p1' }], actions: [{ field: 'category', op: 'set', value: 'c1' }] },
    ]);
    await listRulesHandler({});
    expect(out.stdout).toContain('payee is');
    expect(out.stdout).toContain('category set');
  });

  it('filters by payee when --payee is given', async () => {
    rules.forPayee.mockResolvedValue([]);
    await listRulesHandler({ payee: 'p1' });
    expect(rules.forPayee).toHaveBeenCalledWith('p1');
    expect(rules.list).not.toHaveBeenCalled();
  });

  it('rejects malformed --rule JSON in the flag vocabulary', async () => {
    await expect(createRuleHandler({ rule: '{bad' })).rejects.toThrow(/--rule is not valid JSON/);
  });

  it('requires a rule body', async () => {
    await expect(createRuleHandler({})).rejects.toThrow(/--rule <json> or --file/);
  });
});

describe('schedules', () => {
  it('hides completed schedules unless --all', async () => {
    schedules.list.mockResolvedValue([
      { id: 's1', name: 'Rent', completed: false, amount: -4500000 },
      { id: 's2', name: 'Old', completed: true, amount: -100 },
    ]);
    await listSchedulesHandler({});
    expect(out.stdout).toContain('Rent');
    expect(out.stdout).not.toContain('Old');
  });

  it('passes resetNextDate through to the client', async () => {
    await editScheduleHandler({ id: 's1', name: 'New', resetNextDate: true });
    expect(schedules.update).toHaveBeenCalledWith('s1', { name: 'New' }, true);
  });

  it('rejects an edit with nothing to change', async () => {
    await expect(editScheduleHandler({ id: 's1' })).rejects.toThrow(/Nothing to change/);
  });
});

describe('tags', () => {
  it('exits 1 for an unknown tag', async () => {
    tags.get.mockResolvedValue(null);
    await expect(showTagHandler({ id: 'nope' })).rejects.toThrow(ExitError);
    expect(out.stderr).toContain('No tag found');
  });
});

describe('query run', () => {
  it('builds a Query through q() and derives columns from the rows', async () => {
    const builder = {
      filter: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
    };
    query.q.mockResolvedValue(builder);
    query.run.mockResolvedValue({ data: [{ id: 'a1', name: 'HDFC' }] });

    await runQueryHandler({ table: 'accounts', select: 'id,name' });
    expect(query.q).toHaveBeenCalledWith('accounts');
    expect(builder.select).toHaveBeenCalledWith(['id', 'name']);
    expect(out.stdout).toContain('HDFC');
  });

  it('requires a table or a full query', async () => {
    await expect(runQueryHandler({})).rejects.toThrow(/--table/);
  });

  it('reports invalid --filter JSON with an example', async () => {
    await expect(runQueryHandler({ table: 'transactions', filter: ['{bad'] })).rejects.toThrow(
      /--filter must be JSON/,
    );
  });
});
