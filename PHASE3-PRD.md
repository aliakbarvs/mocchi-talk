# Mocchi Talk — Phase 3: Shareable Bloom Card + Matcha Vocabulary Pack

Apply to the Mocchi Talk web app at /home/clawdbot/clawd/projects/mocchi-talk.
Two self-contained, no-backend features that deepen the brand truth ("Mocchi grows from learning") and give calm organic reach.

## Hard constraints (same as before)
- Vite + TypeScript + Three.js. No React. No backend. No accounts.
- Calm, child-safe: NO points, leaderboards, streaks, quizzes, ads. NO pet death, NO hunger/health bars.
- Every interactive control >= 48px tall. Reduced-motion + accessible labels + safe-area.
- Character factory API stays GLB-replaceable. Do NOT break `setMood/triggerTap/setSpeaking/setGrowthLevel/update/dispose`.

## Feature A — Shareable Bloom Card
Goal: when Mocchi has grown (or any time), a parent/child can capture a calm keepsake image of Mocchi and share it. No ads, no upsell — pure delight + organic reach.
- Add a quiet, top-area "bloom card" affordance (>=48px, aria-labeled, icon-only like the existing sound toggle). It must NOT clutter the bottom dock.
- On tap: composer captures the WebGL canvas to a PNG (renderer.domElement.toDataURL or preserveDrawingBuffer-safe readback), overlays a calm card: Mocchi's current growth (e.g. "Mocchi has learned N words" — derive N from word history length, never a score), the latest learned word if any, the Matcha-i.com/mocchi wordmark, and a soft tagline ("A calm friend who grows when you learn"). Render the composite on a 2D canvas (1080x1080 or 1080x1350 portrait) for shareable sizing.
- Provide a "Save image" action that downloads the PNG (anchor download) AND a "Share" action using the Web Share API (navigator.share with files) when available, gracefully hiding Share if unavailable.
- Must work under reduced-motion (capture is a one-shot, no animation needed).
- IMPORTANT: WebGLRenderer must be created with `preserveDrawingBuffer: true` (or capture immediately after a render in the same frame) so toDataURL returns pixels, not a blank buffer. Verify the captured PNG is non-blank.

## Feature B — Matcha Vocabulary Pack
Goal: Mocchi's "favorites" become REAL Matcha vocabulary, not generic strings.
- Copy /home/clawdbot/clawd/projects/matcha-i/public/wotd/current.json into this repo at public/matcha-vocab/current.json (bundle it — do NOT fetch from matcha-i.com at runtime; it 404s there).
- On app load, read the bundled JSON. Surface its content as Mocchi's calm "favorites" / recall:
  - The returning-visitor recall (currently "Last time we practiced X") should, when the user has NOT practiced yet, instead greet with the daily Matcha word context, e.g. "Today's word is salām — peace." Keep it TEXT ONLY (reuse existing audio; do NOT regenerate TTS).
  - Add a small, calm "Word of the day" element (>=48px tap target to open a detail sheet) showing arabic, transliteration, meaning, root, and cultural_note from the JSON. Opening it must NOT add friction to the core loop and must be dismissible.
- Auto-recorded practice/prompt words continue to accumulate in the existing localStorage word history (unchanged). The vocab pack is a *source of content Mocchi shows*, not a replacement for the history.
- Use the REAL schema fields: arabic, transliteration, meaning, root, root_meaning, root_words, example, example_translation, cultural_note, parent_prompt, ayah_reference. Do not assume the older field names from memory.

## Tests (update, keep coverage)
- `tests/smoke.py`: add assertions that (a) the bloom-card affordance exists and produces a non-blank PNG (capture the data URL / object URL and assert length > some threshold, or assert a canvas with non-background pixels); (b) the Word-of-the-day element shows the bundled word "salām" / "Peace" text; (c) the reduced-motion path still works.
- Keep existing Phase 2 assertions (opening moment, continuous growth, recall, sound toggle).
- `npm run build` and `npm test` MUST both pass.

## Forbidden
- DO NOT deploy. DO NOT push git. DO NOT modify any project outside this directory (read-only copy of the matcha-i JSON is fine; do NOT edit matcha-i).
- DO NOT add ads, upsells, scores, streaks, or new bottom-dock buttons.

## Report
Files changed, how the bloom capture works (preserveDrawingBuffer / readback), the vocab-pack bundling, and build+test results.
