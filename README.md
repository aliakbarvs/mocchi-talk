# Mocchi Talk MVP

Mocchi Talk is a standalone Vite + TypeScript + Three.js MVP for a mobile-first, touch-native Matcha character interaction game. It uses no React and has no backend, accounts, ads, scoring, or runtime asset dependency.

## Commands

```bash
npm install
npm run dev
npm run build
npm run lint
npm test
```

The smoke test uses Python Playwright with the local Chromium under `~/.cache/ms-playwright` when available. It builds the app and opens `dist/index.html` directly, so it also works in sandboxes that cannot bind a local dev server. If Playwright or Chromium is not installed in an environment, the script prints manual verification steps: run `npm run dev`, open the printed local URL, tap Mocchi, use each prompt, toggle sound, and press the mic practice button.

## Architecture

- `src/main.ts` owns UI state, prompt responses, speech synthesis, localStorage session counting, record demo state, WebGL startup, and the render loop.
- `src/mocchiCharacter.ts` exports `createMocchiCharacter()`, returning a narrow `group`, `setMood()`, `update()`, and `dispose()` interface. The current implementation is procedural low-poly Three.js geometry, so a future GLB-backed factory can replace it without rewriting the UI loop.
- `src/webgl.ts` contains feature detection for the fallback message.
- `src/style.css` contains the mobile-first fullscreen layout, safe-area handling, large touch controls, calm Matcha SoftWonder visual language, and reduced-motion support.
- `tests/smoke.py` checks the key child-safe interaction loop with visible controls and stable `data-testid` selectors.

## Visual Note

The reference sheet at `/home/clawdbot/matcha-mocchi-character-sheet.png` guided the cream oblate body, cat-like ears, coral headband, three-pill emblem, deep-teal face, expressive brows, and blush. The app is self-contained at runtime: the procedural 3D Mocchi is an approximation ready for future GLB replacement and does not load that image.
