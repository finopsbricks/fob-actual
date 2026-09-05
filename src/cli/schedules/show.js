// @ts-check
import { clientFor } from '../_helpers.js';
import { formatField, formatAmount, formatDate } from '../utils/format.js';

export async function showScheduleHandler(argv) {
  const actual = clientFor();
  const s = await actual.schedules.get(argv.id);

  if (argv.json) {
    console.log(JSON.stringify(s, null, 2));
    return;
  }
  if (!s) {
    console.error(`No schedule found for id: ${argv.id}`);
    process.exit(1);
  }

  const w = 18;
  console.log(formatField('ID', s.id, w));
  console.log(formatField('Name', s.name, w));
  console.log(formatField('Account', s.account, w));
  console.log(formatField('Payee', s.payee, w));
  console.log(formatField('Amount', formatAmount(s.amount), w));
  console.log(formatField('Next date', formatDate(s.next_date), w));
  console.log(formatField('Completed', s.completed ? 'yes' : 'no', w));
  console.log(formatField('Auto-post', s.posts_transaction ? 'yes' : 'no', w));
}
