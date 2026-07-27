#!/usr/bin/env node
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url);
const mainSource = readFileSync(join(root.pathname, 'src/main.ts'), 'utf8');
const indexSource = readFileSync(join(root.pathname, 'index.html'), 'utf8');
const vocabPath = join(root.pathname, 'public/matcha-vocab/current.json');

assert.ok(existsSync(vocabPath), 'Matcha WOTD JSON must be bundled at public/matcha-vocab/current.json.');

const vocab = JSON.parse(readFileSync(vocabPath, 'utf8'));
assert.equal(vocab.word?.arabic, 'سَلَام', 'Bundled Matcha vocab must keep the Arabic word.');
assert.equal(vocab.word?.transliteration, 'salām', 'Bundled Matcha vocab must keep the transliteration.');
assert.equal(vocab.word?.meaning, 'Peace', 'Bundled Matcha vocab must keep the meaning.');
for (const field of [
  'root',
  'root_meaning',
  'root_words',
  'example',
  'example_translation',
  'cultural_note',
  'parent_prompt',
  'ayah_reference'
]) {
  assert.equal(typeof vocab.word?.[field], 'string', `Bundled Matcha vocab must include word.${field}.`);
}

assert.match(
  mainSource,
  /matcha-vocab\/current\.json/,
  'App must read the bundled Matcha vocabulary pack.'
);
assert.match(
  mainSource,
  /preserveDrawingBuffer:\s*true/,
  'WebGLRenderer must preserve the drawing buffer for bloom-card readback.'
);
assert.match(
  mainSource,
  /toDataURL\('image\/png'\)/,
  'Bloom card capture must read a PNG data URL from canvas readback.'
);
assert.match(
  mainSource,
  /navigator\.share/,
  'Bloom card must use the Web Share API when available.'
);
assert.match(
  mainSource,
  /A calm friend who grows when you learn/,
  'Bloom card must include the required soft tagline.'
);
assert.match(
  mainSource,
  /Today's word is/,
  'Fresh visitors without practice history must get the daily word recall.'
);

for (const testId of [
  'bloom-card-button',
  'bloom-card-preview',
  'bloom-card-status',
  'save-bloom-card',
  'share-bloom-card',
  'word-of-day',
  'word-detail'
]) {
  assert.match(indexSource, new RegExp(`data-testid="${testId}"`), `Missing Phase 3 UI hook: ${testId}.`);
}

console.log('Phase 3 contract test passed.');
