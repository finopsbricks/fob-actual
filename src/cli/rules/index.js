import { safe, jsonOption, listOptions, listOutputOptions, writeOptions } from '../_helpers.js';
import { listRulesHandler } from './list.js';
import { showRuleHandler } from './show.js';
import { createRuleHandler, editRuleHandler, deleteRuleHandler } from './write.js';

/** Rules take nested JSON, so create/edit share these two input flags. */
const ruleInput = (y) =>
  y
    .option('rule', { describe: 'Rule as a JSON string', type: 'string' })
    .option('file', { describe: 'Read the rule JSON from a file', type: 'string' });

export function buildRulesSubcommands(yargs) {
  return yargs
    .usage('$0 rules <action> [target] [options]')
    .command(
      'list',
      'List import rules',
      (y) =>
        listOutputOptions(listOptions(y)).option('payee', {
          describe: 'Only rules for this payee id',
          type: 'string',
        }),
      safe(listRulesHandler),
    )
    .command(
      'show <id>',
      'Show one rule with its conditions and actions',
      (y) => jsonOption(y.positional('id', { describe: 'Rule id', type: 'string' })),
      safe(showRuleHandler),
    )
    .command('create', 'Create a rule from JSON', (y) => ruleInput(writeOptions(y)), safe(createRuleHandler))
    .command(
      'edit <id>',
      'Replace a rule from JSON',
      (y) => ruleInput(writeOptions(y.positional('id', { describe: 'Rule id', type: 'string' }))),
      safe(editRuleHandler),
    )
    .command(
      'delete <id>',
      'Delete a rule (requires --yes)',
      (y) =>
        writeOptions(y.positional('id', { describe: 'Rule id', type: 'string' })).option('yes', {
          describe: 'Confirm deletion',
          type: 'boolean',
          alias: 'y',
        }),
      safe(deleteRuleHandler),
    )
    .demandCommand(1, 'Specify an action: list, show, create, edit, delete');
}
