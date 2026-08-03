import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [html, main, styles] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../src/main.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/style.css', import.meta.url), 'utf8')
]);

assert.match(html, /data-testid="word-garden-button"/, 'Word Garden must replace the session counter.');
assert.match(html, /data-testid="word-garden"/, 'Word Garden sheet must be present.');
assert.doesNotMatch(html, /data-testid="session-count"/, 'Visible session counter must stay removed.');

assert.match(main, /function setupWordGarden\(\): void/, 'Word Garden interaction setup must exist.');
assert.match(main, /function recentUniqueWords\(\): WordJarEntry\[\]/, 'Garden should deduplicate recent history.');
assert.match(main, /renderWordGarden\(\);\n\}/, 'Recording a word must refresh the garden.');
assert.match(main, /We remember \$\{word\} together\./, 'A remembered word must feed back into Mocchi conversation.');

assert.match(styles, /\.word-garden-button\s*\{/, 'Word Garden control must be styled.');
assert.match(styles, /\.word-garden-word\s*\{[\s\S]*?min-height:\s*52px/, 'Remembered words need child-safe tap targets.');

console.log('Word Garden contract checks passed.');
