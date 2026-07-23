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
            "--no-zygote",
            "--single-process",
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
        page.goto(index_url)

        expect(page.get_by_test_id("mocchi")).to_be_visible()
        expect(page.get_by_test_id("session-count")).to_contain_text("Session")
        expect(page.get_by_test_id("speech-bubble")).to_contain_text("Tap Mocchi")

        prompt = page.get_by_test_id("prompt-say-hello")
        box = prompt.bounding_box()
        assert box is not None and box["height"] >= 48, "Prompt button must be at least 48px tall."

        page.get_by_test_id("mocchi").click()
        expect(page.get_by_test_id("speech-bubble")).not_to_contain_text("Tap Mocchi")

        page.get_by_test_id("prompt-teach-word").click()
        expect(page.get_by_test_id("speech-bubble")).to_contain_text("Konnichiwa")

        sound_toggle = page.get_by_test_id("sound-toggle")
        expect(sound_toggle).to_have_attribute("aria-pressed", "true")
        sound_toggle.click()
        expect(sound_toggle).to_have_attribute("aria-pressed", "false")

        record_button = page.get_by_test_id("record-button")
        record_button.click()
        expect(record_button).to_have_attribute("aria-pressed", "true")
        expect(page.get_by_test_id("speech-bubble")).to_contain_text(re.compile("Listening|Pretending"))

      finally:
        stop_dist_server(server)
        browser.close()

    print("Browser smoke test passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
