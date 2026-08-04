import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [html, main, styles] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../src/main.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/style.css', import.meta.url), 'utf8')
]);

assert.match(html, /data-testid="daily-bloom"/, 'Daily Bloom card must be present in the word detail sheet.');
assert.match(html, /data-testid="practice-daily-word"/, 'Daily word practice action must be present.');
assert.doesNotMatch(html, /Session count is saved/, 'Stale session-count onboarding copy must stay removed.');

assert.match(main, /function startPractice\(word\?: MatchaWord\): void/, 'Practice must support the daily word.');
assert.match(main, /function completeDailyBloom\(word: MatchaWord\): boolean/, 'Daily completion must be explicit and idempotent.');
assert.match(main, /dailyBloom\?\.date === localDateStamp\(\)/, 'Daily Bloom must reset by local calendar date.');
assert.match(main, /if \(hasCompletedDailyBloom\(word\)\)[\s\S]*?return false;/, 'Repeat practice must not add duplicate daily growth.');
assert.match(main, /wordOfDayLabel\.textContent = completed \? 'Bloomed today' : 'Word of the day'/, 'The daily word entry must show calm completion.');

assert.match(styles, /\.daily-bloom-card\s*\{/, 'Daily Bloom card must be styled.');
assert.match(styles, /\.word-of-day\[data-complete="true"\]/, 'Completed daily word needs a visible calm state.');

console.log('Daily Bloom contract checks passed.');
