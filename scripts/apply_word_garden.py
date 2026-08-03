#!/usr/bin/env python3
# Apply the Word Garden product slice to Mocchi Talk.

from __future__ import annotations

import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def write(path: str, content: str) -> None:
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")


def replace_once(path: str, old: str, new: str) -> None:
    text = read(path)
    if new in text:
        return
    if old not in text:
        raise RuntimeError(f"Could not find expected text in {path}: {old[:100]!r}")
    write(path, text.replace(old, new, 1))


def regex_replace_once(path: str, pattern: str, replacement: str) -> None:
    text = read(path)
    updated, count = re.subn(pattern, replacement, text, count=1, flags=re.DOTALL)
    if count == 0:
        if replacement in text:
            return
        raise RuntimeError(f"Could not match expected pattern in {path}: {pattern[:100]!r}")
    write(path, updated)


def patch_index() -> None:
    garden_sheet = '''          <div
            id="word-garden-sheet"
            class="sheet-backdrop"
            role="dialog"
            aria-modal="true"
            aria-labelledby="word-garden-title"
            hidden
          >
            <section class="sheet-panel word-garden-panel" data-testid="word-garden">
              <button
                id="close-word-garden"
                class="icon-button sheet-close"
                type="button"
                aria-label="Close word garden"
              >
                <span aria-hidden="true">×</span>
              </button>
              <p class="sheet-kicker" id="word-garden-title">Word garden</p>
              <h2>Words Mocchi remembers</h2>
              <p id="word-garden-summary" class="word-garden-summary"></p>
              <div id="word-garden-list" class="word-garden-list"></div>
            </section>
          </div>
'''
    anchor = '''          <div
            id="bloom-card-sheet"'''
    text = read("index.html")
    if 'id="word-garden-sheet"' not in text:
        if anchor not in text:
            raise RuntimeError("Could not locate bloom card sheet anchor in index.html")
        text = text.replace(anchor, garden_sheet + anchor, 1)
        write("index.html", text)

    replace_once(
        "index.html",
        '''            <span class="session-pill" data-testid="session-count" aria-label="Local session count">Session 1</span>''',
        '''            <button
              id="word-garden-button"
              class="word-garden-button"
              type="button"
              data-testid="word-garden-button"
              aria-label="Open word garden"
            >
              <span aria-hidden="true">❧</span>
              <span>Word garden</span>
            </button>''',
    )


def patch_main() -> None:
    replace_once("src/main.ts", "const sessionKey = 'mocchi-talk.session-count';\n", "")
    replace_once(
        "src/main.ts",
        '''const sessionCount = document.querySelector<HTMLElement>('[data-testid="session-count"]');''',
        '''const wordGardenButton = mustGet<HTMLButtonElement>('word-garden-button');
const wordGardenSheet = mustGet<HTMLElement>('word-garden-sheet');
const closeWordGardenButton = mustGet<HTMLButtonElement>('close-word-garden');
const wordGardenSummary = mustGet<HTMLElement>('word-garden-summary');
const wordGardenList = mustGet<HTMLElement>('word-garden-list');''',
    )
    replace_once("src/main.ts", "setupSessionCounter();", "setupWordGarden();")

    setup_function = '''function setupWordGarden(): void {
  if (readStorage(hintKey) === 'true') {
    onboardingHint.classList.add('is-compact');
  }

  renderWordGarden();

  wordGardenButton.addEventListener('click', () => {
    renderWordGarden();
    wordGardenSheet.hidden = false;
    closeWordGardenButton.focus();
  });

  closeWordGardenButton.addEventListener('click', closeWordGarden);

  wordGardenSheet.addEventListener('click', (event) => {
    if (event.target === wordGardenSheet) {
      closeWordGarden();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !wordGardenSheet.hidden) {
      closeWordGarden();
    }
  });
}

function closeWordGarden(): void {
  wordGardenSheet.hidden = true;
  wordGardenButton.focus();
}

function recentUniqueWords(): WordJarEntry[] {
  const seen = new Set<string>();
  const words: WordJarEntry[] = [];

  for (const entry of wordJar) {
    const key = entry.word.toLocaleLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    words.push(entry);
    if (words.length >= 12) {
      break;
    }
  }

  return words;
}

function renderWordGarden(): void {
  const words = recentUniqueWords();
  wordGardenList.replaceChildren();

  if (words.length === 0) {
    wordGardenSummary.textContent = 'Words you practice will grow here.';
    const emptyState = document.createElement('p');
    emptyState.className = 'word-garden-empty';
    emptyState.textContent = 'Choose “Teach me a word” or practice speaking with Mocchi.';
    wordGardenList.append(emptyState);
    wordGardenButton.setAttribute('aria-label', 'Open word garden. No words remembered yet.');
    return;
  }

  const countLabel = words.length === 1 ? 'word' : 'words';
  wordGardenSummary.textContent = `Mocchi remembers ${words.length} ${countLabel}. Tap one to revisit it.`;
  wordGardenButton.setAttribute('aria-label', `Open word garden with ${words.length} remembered ${countLabel}.`);

  for (const entry of words) {
    const button = document.createElement('button');
    button.className = 'word-garden-word';
    button.type = 'button';
    button.textContent = entry.word;
    button.setAttribute('aria-label', `Revisit word ${entry.word}`);
    button.addEventListener('click', () => revisitWord(entry.word));
    wordGardenList.append(button);
  }
}

function revisitWord(word: string): void {
  closeWordGarden();
  speechLockedByInteraction = true;
  setMood('happy');
  updateSpeech(`We remember ${word} together.`);
  showToast(`${capitalize(word)} is growing with Mocchi.`);
}'''

    regex_replace_once(
        "src/main.ts",
        r"function setupSessionCounter\(\): void \{.*?\n\}\n\nfunction setupSoundToggle",
        setup_function + "\n\nfunction setupSoundToggle",
    )

    replace_once(
        "src/main.ts",
        '''  writeStorage(wordJarKey, JSON.stringify(wordJar));
  updateGrowthLevel();
}''',
        '''  writeStorage(wordJarKey, JSON.stringify(wordJar));
  updateGrowthLevel();
  renderWordGarden();
}''',
    )


def patch_styles() -> None:
    replace_once(
        "src/style.css",
        '''.session-pill,
.icon-button,
.prompt-button {''',
        '''.word-garden-button,
.icon-button,
.prompt-button {''',
    )
    replace_once(
        "src/style.css",
        '''.session-pill {
  justify-content: flex-start;
  border-radius: 8px;
  color: rgba(15, 107, 109, 0.86);
}''',
        '''.word-garden-button {
  gap: 8px;
  justify-content: flex-start;
  border-radius: 8px;
  color: rgba(15, 107, 109, 0.86);
  text-align: left;
}

.word-garden-button > span:first-child {
  color: var(--coral);
  font-size: 1.25rem;
}''',
    )
    garden_styles = '''.word-garden-panel h2 {
  margin: 0 56px 8px 0;
  color: var(--ink);
  font-size: 1.45rem;
  line-height: 1.18;
}

.word-garden-summary {
  margin: 0 56px 16px 0;
  color: rgba(22, 72, 74, 0.78);
  font-weight: 750;
  line-height: 1.35;
}

.word-garden-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.word-garden-word {
  min-height: 52px;
  padding: 11px 14px;
  border: 1px solid rgba(15, 107, 109, 0.16);
  background: rgba(79, 199, 197, 0.1);
  color: var(--ink);
  font-weight: 850;
  overflow-wrap: anywhere;
}

.word-garden-word:active {
  transform: translateY(1px) scale(0.99);
}

.word-garden-empty {
  grid-column: 1 / -1;
  margin: 0;
  padding: 18px;
  border: 1px dashed rgba(15, 107, 109, 0.22);
  border-radius: 8px;
  background: rgba(255, 211, 77, 0.1);
  color: rgba(22, 72, 74, 0.78);
  font-weight: 750;
  line-height: 1.4;
}

'''
    text = read("src/style.css")
    if ".word-garden-panel h2" not in text:
        anchor = ".bloom-card-status {"
        if anchor not in text:
            raise RuntimeError("Could not locate bloom card status style anchor")
        write("src/style.css", text.replace(anchor, garden_styles + anchor, 1))

    replace_once(
        "src/style.css",
        '''  .session-pill {
    grid-column: 1 / -1;
  }''',
        '''  .word-garden-button {
    grid-column: 1 / -1;
  }

  .word-garden-list {
    grid-template-columns: 1fr;
  }''',
    )


def patch_smoke_test() -> None:
    replacement = '''        assert page.get_by_test_id("session-count").count() == 0, "Visible session counter must be removed."
        word_garden_button = page.get_by_test_id("word-garden-button")
        garden_box = word_garden_button.bounding_box()
        assert garden_box is not None and garden_box["height"] >= 48, "Word Garden tap target must be at least 48px."
        word_garden_button.click()
        expect(page.get_by_role("dialog", name="Word garden")).to_be_visible()
        expect(page.get_by_test_id("word-garden")).to_contain_text("konnichiwa")
        page.get_by_role("button", name="Close word garden").click()
        expect(page.get_by_role("dialog", name="Word garden")).to_be_hidden()'''
    replace_once(
        "tests/smoke.py",
        '''        expect(page.get_by_test_id("session-count")).to_contain_text("Session")''',
        replacement,
    )

    growth_anchor = '''        assert prompt_growth > initial_growth, "Prompt answers must auto-record their word and increase growth."'''
    garden_after_growth = growth_anchor + '''
        word_garden_button.click()
        expect(page.get_by_test_id("word-garden")).to_contain_text("salām")
        page.get_by_role("button", name="Close word garden").click()'''
    replace_once("tests/smoke.py", growth_anchor, garden_after_growth)


def write_contract_test() -> None:
    content = r'''import assert from 'node:assert/strict';
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
'''
    write("tests/word-garden-contract.mjs", content)


def patch_package() -> None:
    path = ROOT / "package.json"
    package = json.loads(path.read_text(encoding="utf-8"))
    test_script = package["scripts"]["test"]
    contract = "node tests/word-garden-contract.mjs"
    if contract not in test_script:
        package["scripts"]["test"] = test_script.replace("python3 tests/smoke.py", f"{contract} && python3 tests/smoke.py")
    path.write_text(json.dumps(package, indent=2) + "\n", encoding="utf-8")


def patch_readme() -> None:
    replace_once(
        "README.md",
        "- `src/main.ts` owns UI state, prompt responses, local audio narration playback, localStorage session counting, record demo state, WebGL startup, and the render loop.",
        "- `src/main.ts` owns UI state, prompt responses, local audio narration playback, the local Word Garden and growth history, record demo state, WebGL startup, and the render loop.",
    )
    text = read("README.md")
    section = '''
## Word Garden

The bottom status area is now useful rather than numerical: it opens a calm Word Garden containing up to 12 recent unique words from the existing local learning history. Reopening a word lets Mocchi remember it in conversation without creating points, streaks, or duplicate growth. The garden is stored only in the current browser and has an accessible empty state, Escape-key dismissal, and 48px-or-larger touch targets.
'''
    if "## Word Garden" not in text:
        anchor = "\n## Narration Assets"
        if anchor not in text:
            raise RuntimeError("Could not locate README narration section")
        write("README.md", text.replace(anchor, section + anchor, 1))


def write_ci() -> None:
    write(
        ".github/workflows/ci.yml",
        '''name: CI

on:
  push:
  pull_request:

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run build
      - run: npm test
''',
    )


def remove_bootstrap_files() -> None:
    for relative in ("scripts/apply_word_garden.py", ".github/workflows/bootstrap-word-garden.yml"):
        path = ROOT / relative
        if path.exists():
            path.unlink()


def main() -> None:
    patch_index()
    patch_main()
    patch_styles()
    patch_smoke_test()
    write_contract_test()
    patch_package()
    patch_readme()
    write_ci()
    remove_bootstrap_files()
    print("Word Garden product slice applied.")


if __name__ == "__main__":
    main()
