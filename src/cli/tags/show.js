// @ts-check
import { clientFor } from '../_helpers.js';
import { formatField } from '../utils/format.js';

export async function showTagHandler(argv) {
  const actual = clientFor();
  const tag = await actual.tags.get(argv.id);

  if (argv.json) {
    console.log(JSON.stringify(tag, null, 2));
    return;
  }
  if (!tag) {
    console.error(`No tag found for id: ${argv.id}`);
    process.exit(1);
  }

  const w = 14;
  console.log(formatField('ID', tag.id, w));
  console.log(formatField('Tag', tag.tag, w));
  console.log(formatField('Color', tag.color, w));
  console.log(formatField('Description', tag.description, w));
}
