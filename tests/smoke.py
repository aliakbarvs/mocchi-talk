#!/usr/bin/env python3
"""Browser smoke test for Mocchi Talk.

The script intentionally skips with manual instructions when Python Playwright or
a local Chromium executable is unavailable, because the MVP must remain usable in
restricted environments.
"""

from __future__ import annotations

import os
import re
import selectors
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DIST_DIR = ROOT / "dist"


def find_chromium() -> str | None:
    browser_root = Path.home() / ".cache" / "ms-playwright"
    preferred = browser_root / "chromium-1208" / "chrome-linux" / "chrome"
    if preferred.exists():
      return str(preferred)

    if not browser_root.exists():
      return None

    for directory in sorted(browser_root.glob("chromium-*"), reverse=True):
      for candidate in (directory / "chrome-linux" / "chrome", directory / "chrome-linux64" / "chrome"):
        if candidate.exists():
          return str(candidate)

    return None


def skip_manual(reason: str) -> int:
    print(f"Skipping browser smoke test: {reason}")
    print("Manual verification: run `npm run dev`, open the local URL, tap Mocchi, use all prompts, toggle sound, and press Mic.")
    return 0


def collect_page_errors(page, errors: list[str]) -> None:
    page.on("console", lambda message: errors.append(message.text) if message.type == "error" else None)
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.on(
      "response",
      lambda response: errors.append(f"{response.status} {response.url}") if response.status >= 400 else None,
    )


def start_dist_server() -> tuple[subprocess.Popen[str], str] | tuple[None, str]:
    server_script = """
import functools
import http.server
import socketserver
import sys


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass


class LocalServer(socketserver.TCPServer):
    allow_reuse_address = True


try:
    handler = functools.partial(QuietHandler, directory=sys.argv[1])
    with LocalServer(("127.0.0.1", 0), handler) as httpd:
        print(httpd.server_address[1], flush=True)
        httpd.serve_forever()
except OSError as error:
    print(f"ERROR: {error}", flush=True)
    sys.exit(77)
"""
    server = subprocess.Popen(
      [sys.executable, "-u", "-c", server_script, str(DIST_DIR)],
      stdout=subprocess.PIPE,
      stderr=subprocess.PIPE,
      text=True,
    )

    assert server.stdout is not None
    selector = selectors.DefaultSelector()
    selector.register(server.stdout, selectors.EVENT_READ)
    try:
      if not selector.select(timeout=5):
        stop_dist_server(server)
        return None, "local HTTP server did not report a port."

      first_line = server.stdout.readline().strip()
    finally:
      selector.close()

    if first_line.startswith("ERROR:"):
      stop_dist_server(server)
      return None, f"local HTTP server could not listen on 127.0.0.1 ({first_line.removeprefix('ERROR:').strip()})."

    if not first_line.isdigit():
      stop_dist_server(server)
      return None, f"local HTTP server returned an unexpected startup message: {first_line!r}."

    return server, f"http://127.0.0.1:{first_line}/index.html"


def stop_dist_server(server: subprocess.Popen[str]) -> None:
    if server.poll() is not None:
      return

    server.terminate()
    try:
      server.wait(timeout=5)
    except subprocess.TimeoutExpired:
      server.kill()
      server.wait()


def reduced_motion_canvas_delta(page, wait_ms: int = 1200, tap: bool = False) -> int:
    return int(page.evaluate(
      """async ({ waitMs, tap }) => {
        const source = document.getElementById('scene-canvas');
        if (!(source instanceof HTMLCanvasElement)) {
          throw new Error('Scene canvas is missing.');
        }

        const capture = async () => {
          const image = new Image();
          image.src = source.toDataURL('image/png');
          await image.decode();
          const copy = document.createElement('canvas');
          copy.width = image.naturalWidth;
          copy.height = image.naturalHeight;
          const context = copy.getContext('2d', { willReadFrequently: true });
          if (!context) {
            throw new Error('Canvas 2D is unavailable.');
          }
          context.drawImage(image, 0, 0);
          return context.getImageData(0, 0, copy.width, copy.height).data;
        };

        const changedPixels = (before, after) => {
          let changed = 0;
          for (let index = 0; index < before.length; index += 4) {
            const distance =
              Math.abs(before[index] - after[index]) +
              Math.abs(before[index + 1] - after[index + 1]) +
              Math.abs(before[index + 2] - after[index + 2]) +
              Math.abs(before[index + 3] - after[index + 3]);
            if (distance > 18) {
              changed += 1;
            }
          }
          return changed;
        };

        const before = await capture();
        if (tap) {
          document.querySelector('[data-testid="mocchi"]')?.click();
        }
        await new Promise((resolve) => window.setTimeout(resolve, waitMs));
        const after = await capture();
        return changedPixels(before, after);
      }""",
      {"waitMs": wait_ms, "tap": tap},
    ))


def main() -> int:
    try:
      from playwright.sync_api import expect, sync_playwright
    except ImportError:
      return skip_manual("Python Playwright is not installed.")

    chromium_path = find_chromium()
    if chromium_path is None:
      return skip_manual("local Chromium was not found under ~/.cache/ms-playwright.")

    build = subprocess.run(
      ["npm", "run", "build"],
      cwd=ROOT,
      env={**os.environ, "BROWSER": "none"},
      text=True,
      capture_output=True,
    )
    if build.returncode != 0:
      print(build.stdout)
      print(build.stderr, file=sys.stderr)
      return build.returncode

    with sync_playwright() as playwright:
      try:
        browser = playwright.chromium.launch(
          executable_path=chromium_path,
          chromium_sandbox=False,
          args=[
            "--no-sandbox",
            "--disable-crash-reporter",
            "--disable-crashpad",
            "--disable-breakpad",
            "--disable-dev-shm-usage",
          ],
        )
      except Exception as error:
        return skip_manual(f"Chromium could not launch in this sandbox ({error.__class__.__name__}).")

      server, index_url = start_dist_server()
      if server is None:
        browser.close()
        return skip_manual(index_url)

      try:
        page = browser.new_page(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True)
        page_errors: list[str] = []
        collect_page_errors(page, page_errors)
        page.add_init_script("""
window.__mocchiPlayedAudio = [];
HTMLMediaElement.prototype.play = function() {
  window.__mocchiPlayedAudio.push(this.currentSrc || this.src);
  return Promise.reject(new DOMException("Headless audio rejected", "NotAllowedError"));
};
HTMLMediaElement.prototype.pause = function() {};
""")
        page.goto(index_url)

        page.evaluate("""
localStorage.setItem('mocchi-talk.word-jar', JSON.stringify([
  { word: 'konnichiwa', addedAt: '2026-07-25T00:00:00.000Z' }
]));
localStorage.setItem('mocchi-talk.has-visited', 'true');
""")
        page.goto(index_url)

        expect(page.get_by_test_id("mocchi")).to_be_visible()
        animation_state = page.get_by_test_id("mocchi-animation-state")
        expect(animation_state).to_contain_text("mood happy")
        expect(animation_state).to_contain_text("speaking false")
        expect(animation_state).to_contain_text("intro done")
        assert page.get_by_test_id("session-count").count() == 0, "Visible session counter must be removed."
        word_garden_button = page.get_by_test_id("word-garden-button")
        garden_box = word_garden_button.bounding_box()
        assert garden_box is not None and garden_box["height"] >= 48, "Word Garden tap target must be at least 48px."
        word_garden_button.click()
        expect(page.get_by_role("dialog", name="Word garden")).to_be_visible()
        expect(page.get_by_test_id("word-garden")).to_contain_text("konnichiwa")
        page.get_by_role("button", name="Close word garden").click()
        expect(page.get_by_role("dialog", name="Word garden")).to_be_hidden()
        expect(page.get_by_test_id("speech-bubble")).to_contain_text("Last time we practiced konnichiwa")
        expect(page.get_by_test_id("word-of-day")).to_contain_text("salām")
        expect(page.get_by_test_id("word-of-day")).to_contain_text("Peace")
        wotd_box = page.get_by_test_id("word-of-day").bounding_box()
        assert wotd_box is not None and wotd_box["height"] >= 48, "Word of the day tap target must be at least 48px tall."
        assert page.get_by_test_id("word-jar-count").count() == 0, "Visible word jar counter must be removed."
        assert page.get_by_test_id("growth-tier").count() == 0, "Visible growth tier must be removed."
        assert page.get_by_test_id("save-word").count() == 0, "Manual save-word button must be removed."
        assert page.get_by_test_id("sleep-toggle").count() == 0, "Sleep toggle must be removed."
        assert page.locator(".brush-shine").count() == 0, "Brush shine affordance must be removed."

        growth_level = page.get_by_test_id("growth-level")
        initial_growth = float(growth_level.get_attribute("data-growth") or "0")
        assert 0 < initial_growth < 1, "Growth level should be a continuous 0..1 value from stored words."
        assert page.evaluate("() => window.__mocchiGrowth") == initial_growth

        prompt = page.get_by_test_id("prompt-say-hello")
        box = prompt.bounding_box()
        assert box is not None and box["height"] >= 48, "Prompt button must be at least 48px tall."

        sound_box = page.get_by_test_id("sound-toggle").bounding_box()
        assert sound_box is not None and sound_box["height"] >= 48 and sound_box["width"] >= 48, "Sound toggle tap target must be at least 48px."
        assert sound_box["y"] < 80, "Sound toggle should live in the top corner, not the bottom dock."

        bloom_button = page.get_by_test_id("bloom-card-button")
        bloom_box = bloom_button.bounding_box()
        assert bloom_box is not None and bloom_box["height"] >= 48 and bloom_box["width"] >= 48, "Bloom card button must be at least 48px."
        assert bloom_box["y"] < 80, "Bloom card affordance should live in the top area."

        page.get_by_test_id("word-of-day").click()
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
        expect(page.get_by_role("dialog", name="Word of the day")).to_be_hidden()

        bloom_button.click()
        expect(page.get_by_role("dialog", name="Bloom card")).to_be_visible()
        expect(page.get_by_test_id("bloom-card-status")).to_contain_text("Mocchi has learned 1 word")
        bloom_data_url = page.get_by_test_id("bloom-card-preview").get_attribute("src") or ""
        assert bloom_data_url.startswith("data:image/png;base64,"), "Bloom preview must be a PNG data URL."
        assert len(bloom_data_url) > 20000, "Bloom capture PNG should be substantial enough to include scene pixels."
        non_blank_pixels = page.evaluate(
          """async (src) => {
            const image = new Image();
            image.src = src;
            await image.decode();
            const canvas = document.createElement('canvas');
            canvas.width = image.naturalWidth;
            canvas.height = image.naturalHeight;
            const context = canvas.getContext('2d');
            context.drawImage(image, 0, 0);
            const samples = [
              context.getImageData(Math.floor(canvas.width * 0.5), Math.floor(canvas.height * 0.34), 1, 1).data,
              context.getImageData(Math.floor(canvas.width * 0.5), Math.floor(canvas.height * 0.5), 1, 1).data,
              context.getImageData(Math.floor(canvas.width * 0.5), Math.floor(canvas.height * 0.7), 1, 1).data
            ];
            return samples.filter((pixel) => pixel[3] > 0 && (pixel[0] !== 247 || pixel[1] !== 243 || pixel[2] !== 232)).length;
          }""",
          bloom_data_url,
        )
        assert non_blank_pixels > 0, "Bloom capture must contain non-background pixels."
        save_box = page.get_by_test_id("save-bloom-card").bounding_box()
        assert save_box is not None and save_box["height"] >= 48, "Save image action must be at least 48px tall."
        page.get_by_role("button", name="Close bloom card").click()

        page.get_by_test_id("mocchi").click()
        expect(page.get_by_test_id("speech-bubble")).not_to_contain_text("Tap Mocchi")
        expect(animation_state).to_contain_text("mood happy")
        expect(animation_state).to_contain_text("tap active")
        page.wait_for_function(
          "() => window.__mocchiPlayedAudio.some((url) => url.includes('/audio/mocchi/tap-hello.wav'))"
        )
        expect(animation_state).to_contain_text("speaking false")

        page.get_by_test_id("prompt-teach-word").click()
        expect(page.get_by_test_id("speech-bubble")).to_contain_text("Salām")
        expect(animation_state).to_contain_text("mood thinking")
        prompt_growth = float(growth_level.get_attribute("data-growth") or "0")
        assert prompt_growth > initial_growth, "Prompt answers must auto-record their word and increase growth."
        word_garden_button.click()
        expect(page.get_by_test_id("word-garden")).to_contain_text("salām")
        page.get_by_role("button", name="Close word garden").click()
        page.wait_for_function(
          "() => window.__mocchiPlayedAudio.some((url) => url.includes('/audio/mocchi/word.wav'))"
        )
        expect(animation_state).to_contain_text("speaking false")

        sound_toggle = page.get_by_test_id("sound-toggle")
        expect(sound_toggle).to_have_attribute("aria-pressed", "true")
        sound_toggle.click()
        expect(sound_toggle).to_have_attribute("aria-pressed", "false")
        sound_toggle.click()
        expect(sound_toggle).to_have_attribute("aria-pressed", "true")

        record_button = page.get_by_test_id("record-button")
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
        assert repeated_growth == daily_growth, "Repeat practice on the same day must not add duplicate growth."
        assert page_errors == [], f"Primary page must not report console or HTTP errors: {page_errors}"

        # Release the graphics-heavy primary context before starting the isolated
        # fresh-visitor and reduced-motion scenarios. Keeping several animated
        # WebGL contexts alive can exhaust headless Chromium in CI.
        page.context.close()

        fresh_context = browser.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True)
        fresh_page = fresh_context.new_page()
        fresh_errors: list[str] = []
        collect_page_errors(fresh_page, fresh_errors)
        fresh_page.goto(index_url)
        expect(fresh_page.get_by_test_id("speech-bubble")).to_contain_text("Today's word is salām — Peace.")
        expect(fresh_page.get_by_test_id("word-of-day")).to_contain_text("salām")
        assert fresh_errors == [], f"Fresh page must not report console or HTTP errors: {fresh_errors}"
        fresh_context.close()

        reduce_context = browser.new_context(
          viewport={"width": 390, "height": 844},
          is_mobile=True,
          has_touch=True,
          reduced_motion="reduce",
        )
        reduce_page = reduce_context.new_page()
        reduce_errors: list[str] = []
        collect_page_errors(reduce_page, reduce_errors)
        reduce_page.goto(index_url)
        reduce_animation_state = reduce_page.get_by_test_id("mocchi-animation-state")
        expect(reduce_animation_state).to_contain_text("intro done")

        reduce_idle_delta = reduced_motion_canvas_delta(reduce_page, wait_ms=1200)
        print(f"Reduced-motion idle pixel delta: {reduce_idle_delta}")
        assert reduce_idle_delta > 200, "Reduced-motion idle breathing must be visible, not frozen."
        assert reduce_idle_delta < 8000, "Reduced-motion idle breathing must stay calm, not bouncy."

        reduce_page.get_by_test_id("prompt-teach-word").click()
        expect(reduce_animation_state).to_contain_text("mood thinking")
        reduce_tap_delta = reduced_motion_canvas_delta(reduce_page, wait_ms=120, tap=True)
        print(f"Reduced-motion tap pixel delta: {reduce_tap_delta}")
        assert reduce_tap_delta > 8000, "Reduced-motion tap reaction must still substantially change the canvas."

        reduce_growth = reduce_page.get_by_test_id("growth-level")
        reduce_growth_before = float(reduce_growth.get_attribute("data-growth") or "0")
        reduce_page.get_by_test_id("record-button").click()
        expect(reduce_page.get_by_test_id("record-button")).to_have_attribute("aria-pressed", "true")
        reduce_page.wait_for_timeout(1000)
        reduce_growth_after = float(reduce_growth.get_attribute("data-growth") or "0")
        assert reduce_growth_after > reduce_growth_before, "Reduced-motion practice must still advance growth."

        reduce_page.get_by_test_id("bloom-card-button").click()
        expect(reduce_page.get_by_role("dialog", name="Bloom card")).to_be_visible()
        reduce_data_url = reduce_page.get_by_test_id("bloom-card-preview").get_attribute("src") or ""
        assert reduce_data_url.startswith("data:image/png;base64,"), "Reduced-motion bloom capture must produce a PNG."
        assert len(reduce_data_url) > 20000, "Reduced-motion bloom capture must not be blank."
        assert reduce_errors == [], f"Reduced-motion page must not report console errors: {reduce_errors}"
        reduce_context.close()

      finally:
        stop_dist_server(server)
        browser.close()

    print("Browser smoke test passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
