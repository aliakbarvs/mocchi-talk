#!/usr/bin/env python3
from pathlib import Path

main_path = Path('src/main.ts')
main = main_path.read_text(encoding='utf-8')
old = '''    wordDetailSheet.hidden = true;
    startPractice(dailyWord);'''
new = '''    wordDetailSheet.hidden = true;
    recordButton.focus();
    startPractice(dailyWord);'''
if new not in main:
    if old not in main:
        raise RuntimeError('Could not locate Daily Bloom practice transition')
    main = main.replace(old, new, 1)
main_path.write_text(main, encoding='utf-8')

smoke_path = Path('tests/smoke.py')
smoke = smoke_path.read_text(encoding='utf-8')
old_smoke = '''        page.get_by_test_id("practice-daily-word").click()
        expect(page.get_by_role("dialog", name="Word of the day")).to_be_hidden()
        expect(record_button).to_have_attribute("aria-pressed", "true")'''
new_smoke = '''        page.get_by_test_id("practice-daily-word").click()
        expect(page.get_by_role("dialog", name="Word of the day")).to_be_hidden()
        assert page.evaluate("() => document.activeElement?.id") == "record-button", "Daily Bloom must move focus to the active practice control."
        expect(record_button).to_have_attribute("aria-pressed", "true")'''
if new_smoke not in smoke:
    if old_smoke not in smoke:
        raise RuntimeError('Could not locate Daily Bloom smoke transition')
    smoke = smoke.replace(old_smoke, new_smoke, 1)
smoke_path.write_text(smoke, encoding='utf-8')

print('Daily Bloom focus transition patched.')
