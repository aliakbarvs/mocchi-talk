#!/usr/bin/env python3
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
        raise RuntimeError(f"Missing expected text in {path}: {old[:120]!r}")
    write(path, text.replace(old, new, 1))


def patch_index() -> None:
    replace_once(
        "index.html",
        '<span id="word-of-day-label">Word of the day</span>',
        '<span id="word-of-day-label" data-testid="word-of-day-label">Word of the day</span>',
    )
    replace_once(
        "index.html",
        'Tap Mocchi for a friendly reaction. Session count is saved only in this browser.',
        'Tap Mocchi or open today’s word. Learning stays gently on this device.',
    )
    replace_once(
        "index.html",
        '''              <p class="word-detail-note" id="word-detail-parent-prompt"></p>
            </section>''',
        '''              <p class="word-detail-note" id="word-detail-parent-prompt"></p>
              <div id="daily-bloom" class="daily-bloom-card" data-testid="daily-bloom">
                <p id="daily-bloom-status" class="daily-bloom-status">
                  Meet today’s word, then practice it with Mocchi.
                </p>
                <button
                  id="practice-daily-word"
                  class="prompt-button daily-bloom-action"
                  type="button"
                  data-testid="practice-daily-word"
                  disabled
                >
                  Practice today’s word
                </button>
              </div>
            </section>''',
    )


def patch_main() -> None:
    replace_once(
        "src/main.ts",
        '''type WordJarEntry = {
  word: string;
  addedAt: string;
};''',
        '''type WordJarEntry = {
  word: string;
  addedAt: string;
};

type DailyBloomRecord = {
  date: string;
  word: string;
};''',
    )
    replace_once(
        "src/main.ts",
        "const sessionKey = 'mocchi-talk.session-count';\n",
        "",
    )
    replace_once(
        "src/main.ts",
        "const visitKey = 'mocchi-talk.has-visited';\n",
        "const visitKey = 'mocchi-talk.has-visited';\nconst dailyBloomKey = 'mocchi-talk.daily-bloom';\n",
    )
    replace_once(
        "src/main.ts",
        "const wordOfDayButton = mustGet<HTMLButtonElement>('word-of-day');\n",
        "const wordOfDayButton = mustGet<HTMLButtonElement>('word-of-day');\nconst wordOfDayLabel = mustGet<HTMLElement>('word-of-day-label');\n",
    )
    replace_once(
        "src/main.ts",
        "const wordDetailParentPrompt = mustGet<HTMLElement>('word-detail-parent-prompt');\n",
        "const wordDetailParentPrompt = mustGet<HTMLElement>('word-detail-parent-prompt');\nconst dailyBloomCard = mustGet<HTMLElement>('daily-bloom');\nconst dailyBloomStatus = mustGet<HTMLElement>('daily-bloom-status');\nconst practiceDailyWordButton = mustGet<HTMLButtonElement>('practice-daily-word');\n",
    )
    replace_once(
        "src/main.ts",
        "let wordJar = loadWordJar();\n",
        "let wordJar = loadWordJar();\nlet dailyBloom = loadDailyBloom();\n",
    )
    replace_once(
        "src/main.ts",
        '''function renderWordOfDay(word: MatchaWord): void {
  wordOfDayArabic.textContent = word.arabic;''',
        '''function renderWordOfDay(word: MatchaWord): void {
  wordOfDayArabic.textContent = word.arabic;''',
    )
    replace_once(
        "src/main.ts",
        '''  wordDetailCulturalNote.textContent = word.cultural_note;
  wordDetailParentPrompt.textContent = word.parent_prompt;
}''',
        '''  wordDetailCulturalNote.textContent = word.cultural_note;
  wordDetailParentPrompt.textContent = word.parent_prompt;
  updateDailyBloomUi();
}''',
    )
    replace_once(
        "src/main.ts",
        '''  wordOfDayButton.addEventListener('click', () => {
    wordDetailSheet.hidden = false;
    closeWordDetailButton.focus();
  });''',
        '''  wordOfDayButton.addEventListener('click', () => {
    updateDailyBloomUi();
    wordDetailSheet.hidden = false;
    closeWordDetailButton.focus();
  });''',
    )
    replace_once(
        "src/main.ts",
        '''  wordDetailSheet.addEventListener('click', (event) => {
    if (event.target === wordDetailSheet) {
      wordDetailSheet.hidden = true;
      wordOfDayButton.focus();
    }
  });
}''',
        '''  wordDetailSheet.addEventListener('click', (event) => {
    if (event.target === wordDetailSheet) {
      wordDetailSheet.hidden = true;
      wordOfDayButton.focus();
    }
  });

  practiceDailyWordButton.addEventListener('click', () => {
    if (!dailyWord) {
      return;
    }

    wordDetailSheet.hidden = true;
    startPractice(dailyWord);
  });
}''',
    )

    old_record = '''  recordButton.addEventListener('click', () => {
    clearTimeout(recordTimer);
    speechLockedByInteraction = true;
    const simulatedOnly = !navigator.mediaDevices?.getUserMedia;
    const listeningText = simulatedOnly
      ? 'Pretending to listen. Mocchi can practice without microphone permission.'
      : 'Listening in practice mode. No microphone permission needed.';

    recordButton.setAttribute('aria-pressed', 'true');
    recordButton.classList.add('is-recording');
    setMood('listening');
    updateSpeech(listeningText);
    showToast('Voice practice is local demo mode.');

    recordTimer = window.setTimeout(() => {
      recordButton.setAttribute('aria-pressed', 'false');
      recordButton.classList.remove('is-recording');
      recordWord('practice voice');
      applyResponse({
        id: 'feel',
        mood: 'happy',
        response: 'Mocchi heard a brave practice voice.',
        toast: 'Practice complete.',
        audioClip: 'practice-complete'
      });
    }, reducedMotion ? 900 : 1800);
  });'''
    new_record = '''  recordButton.addEventListener('click', () => {
    startPractice(dailyWord);
  });'''
    replace_once("src/main.ts", old_record, new_record)

    practice_functions = '''
function startPractice(word?: MatchaWord): void {
  clearTimeout(recordTimer);
  speechLockedByInteraction = true;
  const simulatedOnly = !navigator.mediaDevices?.getUserMedia;
  const practiceWord = word?.transliteration;
  const listeningText = practiceWord
    ? `Say ${practiceWord} with Mocchi. Your voice stays on this device.`
    : simulatedOnly
      ? 'Pretending to listen. Mocchi can practice without microphone permission.'
      : 'Listening in practice mode. No microphone permission needed.';

  recordButton.setAttribute('aria-pressed', 'true');
  recordButton.classList.add('is-recording');
  setMood('listening');
  updateSpeech(listeningText);
  showToast(practiceWord ? `Practice ${practiceWord}, softly.` : 'Voice practice is local demo mode.');

  recordTimer = window.setTimeout(() => {
    recordButton.setAttribute('aria-pressed', 'false');
    recordButton.classList.remove('is-recording');

    if (word) {
      const firstBloomToday = completeDailyBloom(word);
      applyResponse({
        id: 'feel',
        mood: 'happy',
        response: firstBloomToday
          ? `${capitalize(word.transliteration)} bloomed today. Mocchi will remember your practice.`
          : `Mocchi heard ${word.transliteration} again. Repeating is always welcome.`,
        toast: firstBloomToday ? 'Today’s word bloomed.' : 'Gentle repeat complete.',
        audioClip: 'practice-complete'
      });
      return;
    }

    recordWord('practice voice');
    applyResponse({
      id: 'feel',
      mood: 'happy',
      response: 'Mocchi heard a brave practice voice.',
      toast: 'Practice complete.',
      audioClip: 'practice-complete'
    });
  }, reducedMotion ? 900 : 1800);
}

function localDateStamp(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function loadDailyBloom(): DailyBloomRecord | undefined {
  const stored = readStorage(dailyBloomKey);
  if (!stored) {
    return undefined;
  }

  try {
    const candidate = JSON.parse(stored) as Partial<DailyBloomRecord>;
    if (typeof candidate.date !== 'string' || typeof candidate.word !== 'string') {
      return undefined;
    }

    return { date: candidate.date, word: candidate.word };
  } catch {
    return undefined;
  }
}

function hasCompletedDailyBloom(word: MatchaWord): boolean {
  return (
    dailyBloom?.date === localDateStamp() &&
    dailyBloom.word.toLocaleLowerCase() === word.transliteration.toLocaleLowerCase()
  );
}

function completeDailyBloom(word: MatchaWord): boolean {
  if (hasCompletedDailyBloom(word)) {
    updateDailyBloomUi();
    return false;
  }

  dailyBloom = { date: localDateStamp(), word: word.transliteration };
  writeStorage(dailyBloomKey, JSON.stringify(dailyBloom));
  recordWord(word.transliteration);
  updateDailyBloomUi();
  return true;
}

function updateDailyBloomUi(): void {
  if (!dailyWord) {
    dailyBloomStatus.textContent = 'Meet today’s word, then practice it with Mocchi.';
    practiceDailyWordButton.textContent = 'Practice today’s word';
    practiceDailyWordButton.disabled = true;
    dailyBloomCard.classList.remove('is-complete');
    wordOfDayButton.dataset.complete = 'false';
    return;
  }

  const completed = hasCompletedDailyBloom(dailyWord);
  const word = dailyWord.transliteration;
  wordOfDayLabel.textContent = completed ? 'Bloomed today' : 'Word of the day';
  wordOfDayButton.dataset.complete = String(completed);
  dailyBloomCard.classList.toggle('is-complete', completed);
  dailyBloomStatus.textContent = completed
    ? `${capitalize(word)} has bloomed today. Repeat it whenever it feels good.`
    : `Meet ${word}, say it with Mocchi, and let today’s word bloom.`;
  practiceDailyWordButton.textContent = completed ? `Practice ${word} again` : `Practice ${word}`;
  practiceDailyWordButton.setAttribute('aria-label', completed ? `Practice ${word} again` : `Practice today’s word ${word}`);
  practiceDailyWordButton.disabled = false;
  recordButton.setAttribute('aria-label', completed ? `Practice ${word} again` : `Practice today’s word ${word}`);
}
'''
    anchor = "\nfunction applyResponse(prompt: Prompt): void {"
    text = read("src/main.ts")
    if "function startPractice(word?: MatchaWord): void" not in text:
        if anchor not in text:
            raise RuntimeError("Could not locate applyResponse anchor")
        write("src/main.ts", text.replace(anchor, practice_functions + anchor, 1))


def patch_styles() -> None:
    replace_once(
        "src/style.css",
        '''.word-of-day .word-of-day-arabic {
  color: var(--teal);
  font-size: 1rem;
  font-weight: 900;
}
''',
        '''.word-of-day .word-of-day-arabic {
  color: var(--teal);
  font-size: 1rem;
  font-weight: 900;
}

.word-of-day[data-complete="true"] {
  border-color: rgba(255, 107, 87, 0.42);
  background: rgba(255, 249, 236, 0.94);
  box-shadow: 0 8px 20px rgba(255, 107, 87, 0.12);
}

.word-of-day[data-complete="true"] #word-of-day-label {
  color: var(--coral);
}
''',
    )
    replace_once(
        "src/style.css",
        '''.word-detail-example {
  padding: 12px;
  border-radius: 8px;
  background: rgba(79, 199, 197, 0.12);
}
''',
        '''.word-detail-example {
  padding: 12px;
  border-radius: 8px;
  background: rgba(79, 199, 197, 0.12);
}

.daily-bloom-card {
  display: grid;
  gap: 10px;
  margin-top: 16px;
  padding: 14px;
  border: 1px solid rgba(255, 211, 77, 0.64);
  border-radius: 8px;
  background: rgba(255, 211, 77, 0.1);
}

.daily-bloom-card.is-complete {
  border-color: rgba(255, 107, 87, 0.32);
  background: rgba(255, 107, 87, 0.08);
}

.daily-bloom-status {
  margin: 0;
  color: rgba(22, 72, 74, 0.88);
  font-weight: 800;
  line-height: 1.35;
}

.daily-bloom-action {
  border-color: rgba(255, 211, 77, 0.78);
}

.daily-bloom-card.is-complete .daily-bloom-action {
  border-color: rgba(255, 107, 87, 0.44);
}
''',
    )


def patch_contract() -> None:
    write(
        "tests/daily-bloom-contract.mjs",
        '''import assert from 'node:assert/strict';
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
''',
    )

    package_path = ROOT / "package.json"
    package = json.loads(package_path.read_text(encoding="utf-8"))
    test_script = package["scripts"]["test"]
    contract = "node tests/daily-bloom-contract.mjs"
    if contract not in test_script:
        package["scripts"]["test"] = test_script.replace(
            "node tests/word-garden-contract.mjs",
            "node tests/word-garden-contract.mjs && node tests/daily-bloom-contract.mjs",
        )
    package_path.write_text(json.dumps(package, indent=2) + "\n", encoding="utf-8")


def patch_smoke() -> None:
    replace_once(
        "tests/smoke.py",
        '''        page.get_by_test_id("word-of-day").click()
        expect(page.get_by_role("dialog", name="Word of the day")).to_be_visible()
        expect(page.get_by_test_id("word-detail")).to_contain_text("سَلَام")
        expect(page.get_by_test_id("word-detail")).to_contain_text("root")
        expect(page.get_by_test_id("word-detail")).to_contain_text("peace, safety")
        page.get_by_role("button", name="Close word of the day").click()
        expect(page.get_by_role("dialog", name="Word of the day")).to_be_hidden()''',
        '''        page.get_by_test_id("word-of-day").click()
        expect(page.get_by_role("dialog", name="Word of the day")).to_be_visible()
        expect(page.get_by_test_id("word-detail")).to_contain_text("سَلَام")
        expect(page.get_by_test_id("word-detail")).to_contain_text("root")
        expect(page.get_by_test_id("word-detail")).to_contain_text("peace, safety")
        expect(page.get_by_test_id("daily-bloom")).to_contain_text("Meet salām")
        bloom_practice = page.get_by_test_id("practice-daily-word")
        bloom_practice_box = bloom_practice.bounding_box()
        assert bloom_practice_box is not None and bloom_practice_box["height"] >= 48, "Daily Bloom action must be at least 48px tall."
        expect(bloom_practice).to_contain_text("Practice salām")
        page.get_by_role("button", name="Close word of the day").click()
        expect(page.get_by_role("dialog", name="Word of the day")).to_be_hidden()''',
    )

    old_practice = '''        record_button = page.get_by_test_id("record-button")
        record_button.click()
        expect(record_button).to_have_attribute("aria-pressed", "true")
        expect(animation_state).to_contain_text("mood listening")
        expect(page.get_by_test_id("speech-bubble")).to_contain_text(re.compile("Listening|Pretending"))
        page.wait_for_function(
          "() => window.__mocchiPlayedAudio.some((url) => url.includes('/audio/mocchi/practice-complete.wav'))"
        )
        expect(animation_state).to_contain_text("speaking false")
        practice_growth = float(growth_level.get_attribute("data-growth") or "0")
        assert practice_growth > prompt_growth, "Practice completion must auto-record and increase growth."'''
    new_practice = '''        record_button = page.get_by_test_id("record-button")
        page.get_by_test_id("word-of-day").click()
        page.get_by_test_id("practice-daily-word").click()
        expect(page.get_by_role("dialog", name="Word of the day")).to_be_hidden()
        expect(record_button).to_have_attribute("aria-pressed", "true")
        expect(animation_state).to_contain_text("mood listening")
        expect(page.get_by_test_id("speech-bubble")).to_contain_text("Say salām")
        page.wait_for_function(
          "() => window.__mocchiPlayedAudio.some((url) => url.includes('/audio/mocchi/practice-complete.wav'))"
        )
        expect(animation_state).to_contain_text("speaking false")
        daily_growth = float(growth_level.get_attribute("data-growth") or "0")
        assert daily_growth > prompt_growth, "First Daily Bloom practice must increase growth."
        expect(page.get_by_test_id("word-of-day-label")).to_contain_text("Bloomed today")
        page.get_by_test_id("word-of-day").click()
        expect(page.get_by_test_id("daily-bloom")).to_contain_text("has bloomed today")
        expect(page.get_by_test_id("practice-daily-word")).to_contain_text("Practice salām again")
        page.get_by_role("button", name="Close word of the day").click()

        record_button.click()
        expect(record_button).to_have_attribute("aria-pressed", "true")
        page.wait_for_timeout(2200)
        repeated_growth = float(growth_level.get_attribute("data-growth") or "0")
        assert repeated_growth == daily_growth, "Repeat practice on the same day must not add duplicate growth."'''
    replace_once("tests/smoke.py", old_practice, new_practice)


def patch_readme() -> None:
    text = read("README.md")
    section = '''
## Daily Bloom

The word of the day now leads into one complete, pressure-free ritual: meet the word, practice it with Mocchi, and see it marked as **Bloomed today**. Completion is stored only in the browser and resets by local calendar day. Repeating the word is always welcome, but only the first daily completion adds growth, so the experience avoids streak pressure and accidental farming.
'''
    if "## Daily Bloom" not in text:
        anchor = "\n## Narration Assets"
        if anchor not in text:
            raise RuntimeError("Could not locate README narration anchor")
        write("README.md", text.replace(anchor, section + anchor, 1))


def main() -> None:
    patch_index()
    patch_main()
    patch_styles()
    patch_contract()
    patch_smoke()
    patch_readme()
    print("Daily Bloom product slice applied.")


if __name__ == "__main__":
    main()
