# Mocchi Talk — Phase 2: "Make Mocchi alive, not a menu"

Apply a Steve-Jobs-style product edit to the Mocchi Talk web app at /home/clawdbot/clawd/projects/mocchi-talk.
The goal is DISCIPLINE: cut forgettable mechanics, keep the one true idea (a pet that grows from *learning*, not feeding), and make that idea feel alive.

## Hard constraints (same as before)
- Vite + TypeScript + Three.js. No React. No backend. No accounts.
- Calm, child-safe: NO points, leaderboards, streaks, quizzes, ads. NO pet death, NO hunger/health bars.
- Every interactive control must be at least 48px tall. Reduced-motion + accessible labels + safe-area.
- Character factory API must stay GLB-replaceable. `setMood/triggerTap/setSpeaking/update/dispose` stay intact as the seam.

## CUT (remove from UI and code)
1. **Sleep lullaby** — remove the sleep toggle button and all sleep UI wiring (sleeping state, dimming). You MAY keep the `setSleeping` rig method as a harmless no-op seam, but nothing in the UI may call it.
2. **Brush gesture** — remove the pointer-drag brush handler and the brush-shine element/style. A tap already reacts; that is enough.
3. **Visible word-jar counter + manual "save word" button** — remove the on-screen jar count, jar fill bar, and the per-response "Save word" affordance. Remove the friction. Words are still recorded (see below) but never shown as a meter.

## KEEP / REFINE
- Core loop: tap Mocchi -> reaction + speech -> choose a prompt -> answer. Untouched.
- Pronunciation "Motchi" audio: untouched.
- The **localStorage word history** stays — it is the growth engine. Auto-record a word when a practice completes AND when any prompt answer is shown (no manual save). Cap stored words at ~40; keep most-recent order.
- **Continuous growth (replace discrete tiers).** Replace `setGrowthTier(0..3)` with a continuous growth level `setGrowthLevel(value: number)` where value is 0..1 (e.g. clamp(wordCount/40)). In the rig's `update(delta, elapsed)` loop, smoothly interpolate Mocchi's appearance from this value:
  - body warmth/saturation lerps up subtly,
  - headband opacity fades in as value passes ~0.12,
  - emblem bloom scales/opacity rises with value,
  - a gentle bloom (small soft sprite or scaled emissive accent) appears and grows with value,
  - optional tiny scale breathing that intensifies slightly with growth.
  Use damped interpolation so it feels alive, not snapped. No visible "tier" number anywhere.
- **Opening moment.** On load, Mocchi plays a short "wake up" intro (eyes open + small stretch + happy mood) before becoming idle. Use localStorage to detect first-ever visit vs returning visitor.
- **Local memory / recall (calm, no guilt).** On a returning visit, Mocchi's greeting speech bubble shows recall of the last practiced word (e.g. "Last time we practiced konnichiwa 🌿") as TEXT ONLY (reuse existing hello audio; do NOT regenerate audio). Never a streak, never "you missed X days".
- **Quiet sound control.** Keep mute capability but remove it from the bottom dock. Make it a single small, calm icon in a top corner (still >=48px tap target, aria-labeled). One tap toggles. Nothing else.

## Tests (update, do not delete coverage)
- `tests/smoke.py`: replace sleep-toggle / word-jar-count / save-word / brush-shine assertions with the new design:
  - opening moment runs without error and Mocchi reaches an idle/happy state,
  - a practice or prompt answer auto-records a word (assert via a `data-testid="growth-level"` attribute or an exposed `window.__mocchiGrowth` value increasing, NOT a visible counter),
  - growth level is continuous (0..1) and increases after words are added,
  - sound toggle still toggles muted state (now top-corner),
  - keep existing tap->happy, prompt->thinking, audio URL resolution assertions.
- `tests/character-contract.mjs`: update if the rig interface changed (setGrowthLevel instead of setGrowthTier); keep geometry/pivot contract.
- `npm run build` and `npm test` MUST both pass.

## Forbidden
- DO NOT deploy. DO NOT push git. DO NOT modify any project outside this directory.
- DO NOT add new visible meters, scores, or buttons.

## Report
Files changed, how continuous growth is rendered (the interpolation), how the opening/recall moment works, and build+test results.
