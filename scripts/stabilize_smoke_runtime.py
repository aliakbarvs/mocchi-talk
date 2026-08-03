#!/usr/bin/env python3
from pathlib import Path

path = Path("tests/smoke.py")
text = path.read_text(encoding="utf-8")

text = text.replace(
    '            "--no-zygote",\n            "--single-process",\n',
    '',
)

anchor = '        fresh_context = browser.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True)\n'
replacement = (
    '        # Release the graphics-heavy primary context before starting the isolated\n'
    '        # fresh-visitor and reduced-motion scenarios. Keeping several animated\n'
    '        # WebGL contexts alive can exhaust headless Chromium in CI.\n'
    '        page.context.close()\n\n'
    + anchor
)

if replacement not in text:
    if anchor not in text:
        raise RuntimeError("Could not locate fresh-context smoke-test anchor")
    text = text.replace(anchor, replacement, 1)

path.write_text(text, encoding="utf-8")
print("Stabilized Chromium launch and released the primary WebGL context.")
