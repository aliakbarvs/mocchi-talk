# Mocchi Talk — Phase 4: Reduced-Motion "Alive" Idle (Feature F)

Repo: /home/clawdbot/clawd/projects/mocchi-talk. Vite + TypeScript + Three.js. No React, no backend.

## Problem
Under prefers-reduced-motion, the render loop sets `elapsed = 0` (see src/main.ts render() and captureSceneImage()), which kills the idle breathing/bob because all idle motion is `Math.sin(elapsed * freq)`. Result: Mocchi is a completely still statue when idle. Tap reactions and growth DO still work (they use `delta`), but a frozen idle character reads as "animation broken" to users. This is the #1 complaint.

## Goal
Under reduced-motion, Mocchi must still show a gentle, slow, living idle motion (slow breathing) — calm enough to honor the accessibility intent, but clearly ALIVE. No fast/bouncy oscillation, no looping "wiggle." Just a slow breath.

## Required change (minimal, surgical)
- Keep `delta = reducedMotion ? 1 : rawDelta` (so state/growth still snaps correctly).
- Do NOT set `elapsed = 0` for reduced motion. Instead, pass a SEPARATE slow time source for idle breathing only:
  - Maintain a `reducedMotionClock` (or reuse a dedicated accumulator) that advances by `rawDelta` every frame regardless of reduced-motion.
  - In mocchiCharacter.update(delta, elapsed, reducedMotion), when `reducedMotion` is true, drive ONLY the breathing/scale-sway using a slow frequency (e.g. sin(t * 0.6) → ~1 breath per ~10s) and a very small amplitude. Everything else (idle bob, headband pulse, bloom pulse) stays frozen.
  - When `reducedMotion` is false, behavior is unchanged (existing elapsed-driven motion).
- Signature change to update() must stay backward compatible with existing callers in main.ts (render() and captureSceneImage()). Add the `reducedMotion` param; non-reduced callers pass `false`.
- IMPORTANT: the opening "wake/stretch" animation and tap reactions must REMAIN visible under reduced motion (they already are — do not break them). Verify tap still changes the canvas and growth still converges.

## Constraints (unchanged)
- Calm, child-safe. No points/streaks/ads.
- Controls >= 48px. Reduced-motion + accessible labels + safe-area.
- Do NOT break setMood/triggerTap/setSpeaking/setGrowthLevel/update/dispose.
- Do NOT deploy. Do NOT push git. Do NOT modify projects outside this directory.

## Tests
- Add a Playwright check (tests/smoke.py or a new test) that, under `reduced_motion: 'reduce'`:
  - samples the canvas twice ~1.2s apart while IDLE (no tap) and asserts pixels change by a small-but-nonzero amount (e.g. > 200 px, which proves gentle breathing) but far less than the normal-motion idle churn (which is ~20k+ px) — proving "calm, not frozen, not bouncy."
  - asserts a tap still changes the canvas substantially (tap reaction intact) and growth still converges after practice.
  - asserts NO console errors.
- `npm run build` and `npm test` MUST pass.

## Report
Diff summary, the exact idle-breathing amplitude/frequency used, and build+test results (including the reduced-motion pixel-change number proving it is alive-but-calm).
