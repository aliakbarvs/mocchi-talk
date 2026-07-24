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

The smoke test uses Python Playwright with the local Chromium under `~/.cache/ms-playwright` when available. It builds the app and serves `dist/` over a temporary local HTTP server so Vite’s CSS and module assets are exercised correctly. If Playwright, Chromium, or local socket binding is unavailable in an environment, the script prints manual verification steps: run `npm run dev`, open the printed local URL, tap Mocchi, use each prompt, toggle sound, and press the mic practice button.

## Architecture

- `src/main.ts` owns UI state, prompt responses, local audio narration playback, localStorage session counting, record demo state, WebGL startup, and the render loop.
- `src/mocchiCharacter.ts` exports `createMocchiCharacter()`, returning a narrow `group`, `setMood()`, `triggerTap()`, `setSpeaking()`, `update()`, and `dispose()` interface. The current implementation is smooth procedural Three.js geometry, so a future GLB-backed factory can replace it without rewriting the UI loop.
- `src/webgl.ts` contains feature detection for the fallback message.
- `src/style.css` contains the mobile-first fullscreen layout, safe-area handling, large touch controls, calm Matcha SoftWonder visual language, and reduced-motion support.
- `tests/character-contract.mjs` checks the procedural rig identity markers, named pivots, material roughness, and public factory API.
- `tests/smoke.py` checks the key child-safe interaction loop with visible controls and stable `data-testid` selectors.

## Animation Rig

Mocchi is still self-contained procedural Three.js: no GLB, CDN, or runtime image assets are loaded. The factory now builds an animation-ready rig with named root, body, head, arm, foot, headband, face, eye, and mouth pivots. Mood changes set rest poses, and `update(delta, elapsed)` eases the rig toward those poses while layering idle float, tap squash/stretch, happy waving, curious/thinking/shy/listening head and brow poses, and speech mouth chatter.

The public factory methods are the replacement seam for a future GLB rig. A GLB-backed implementation can map the same `setMood()`, `triggerTap()`, `setSpeaking()`, `update()`, and `dispose()` calls to authored bones or clips without changing `src/main.ts`.

## Narration Assets

Mocchi narration is played from offline WAV assets at `public/audio/mocchi/<clip>.wav`, which Vite serves relative to the app route. The app does not call a runtime TTS model, browser speech synthesis, or a network voice service.

The local generation helper is `scripts/generate_pip_audio.py`. It uses Qwen3-TTS VoiceDesign with the manifest voice label `Pip-style original VoiceDesign`; this is an original designed voice style, not an exact voice identity, clone, or impersonation.

```bash
python3 scripts/generate_pip_audio.py --output public/audio/mocchi
```

## Subpath deployment

The Vite build uses relative URLs, so the same `dist/` output works locally and when served at `/mocchi/` under `matcha-i.com`. Deploy the contents of `dist/` to the `/var/www/matcha-i.com/mocchi/` subdirectory; the app has no backend or account dependency.

## Visual Note

The reference sheet at `/home/clawdbot/matcha-mocchi-character-sheet.png` guided the cream oblate body, cat-like ears, coral headband, three-pill emblem, deep-teal face, expressive brows, and blush. The app is self-contained at runtime: the procedural 3D Mocchi is an approximation ready for future GLB replacement and does not load that image.
