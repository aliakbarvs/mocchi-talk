# Mocchi Talk — Phase 1 Pet Layer

You are implementing Phase 1 of a "pet layer" for the Mocchi Talk web app located at /home/clawdbot/clawd/projects/mocchi-talk.

## Context
- Stack: Vite + TypeScript + Three.js. No React. No backend. No accounts.
- Mocchi is a procedural 3D character. The factory `createMocchiCharacter(palette)` returns an object with methods: `group`, `setMood(mood)`, `triggerTap()`, `setSpeaking(bool)`, `update(delta, elapsed)`, `dispose()`. Supported moods include: neutral, happy, curious, thinking, shy, listening.
- UI/state lives in `src/main.ts`. Character rig in `src/mocchiCharacter.ts`. Styles in `src/style.css`.
- Existing tests: `tests/smoke.py` (Playwright), `tests/character-contract.mjs`, `tests/audio-contract.mjs`. The smoke test uses `data-testid` selectors (e.g. `mocchi`, `mocchi-animation-state`, `prompt-*`, `sound-toggle`, `record-button`, `session-count`, `speech-bubble`).
- `npm run build` runs `tsc --noEmit && vite build`. `npm test` runs the three test files. Both MUST pass at the end.

## Brand constraints (MANDATORY)
- Calm, child-safe. NO points, leaderboards, streaks, quizzes, ads, or accounts.
- NO pet death. NO hunger/health bars that punish the child. Mocchi is a gentle language-practice companion, NOT a Tamagotchi clone with failure states.
- Every interactive control must be at least 48px tall.
- Support reduced-motion and accessible labels. Respect safe-area insets.
- The character API (`setMood/triggerTap/setSpeaking/update/dispose`) is the seam for a future GLB replacement — keep it intact and do not break callers in `src/main.ts`.

## Phase 1 scope (local-only, localStorage)
1. **Word jar**: When the user completes a mic practice (`practice-complete`) OR taps a small "save word" affordance shown with each prompt response, store the word in a localStorage-backed jar (array of `{ word, addedAt }`). Render a calm visual "word jar" that gently fills as words accumulate. No scoring, no limit anxiety.
2. **Visual growth tiers**: Mocchi's appearance evolves through gentle milestones based on jar size — e.g. 0 words = plain mochi, 5 = headband appears, 15 = emblem blooms, 30 = a small leaf or whisk accessory. Implement as additional optional meshes / visibility toggles inside `mocchiCharacter.ts`, driven by a new `setGrowthTier(n: number)` method on the character. Keep the base rig fully intact and GLB-replaceable. Expose the current tier via a `data-testid="growth-tier"` element or attribute on the page.
3. **Gentle care gestures**: A calm "brush" interaction (drag/swipe across Mocchi's head triggers a brief happy/shy reaction + a soft shine or particle, no failure) and a "lullaby/sleep" toggle that dims the scene and sets a sleeping pose. No punishment state.

## Requirements
- Add stable `data-testid` hooks for new UI (word-jar count, growth tier) so tests can assert.
- Extend `tests/smoke.py` to cover: jar increments on practice complete; growth tier advances at a threshold; sleep toggle changes state. Keep all existing tests passing.
- `npm run build` must pass with zero TypeScript errors. `npm test` must pass.
- DO NOT deploy, DO NOT push to git, DO NOT modify any project outside /home/clawdbot/clawd/projects/mocchi-talk.
- Respect the existing architecture: `src/main.ts` owns UI state; the character factory API stays the seam.

## Report back
Files changed, how growth tiers are rendered, test results (build + test output), and any design decisions or tradeoffs.
