#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url);
const mainSource = readFileSync(join(root.pathname, 'src/main.ts'), 'utf8');

for (const clipId of [
  'hello',
  'feel',
  'word',
  'joke',
  'tap-hello',
  'tap-feel',
  'tap-word',
  'tap-joke',
  'practice-complete'
]) {
  assert.match(
    mainSource,
    new RegExp(`audioClip:\\s*'${clipId}'`),
    `Expected src/main.ts to map an audioClip for ${clipId}.`
  );
}

assert.doesNotMatch(
  mainSource,
  /speechSynthesis|SpeechSynthesisUtterance/,
  'Narration must use local audio clips instead of browser speech synthesis.'
);
