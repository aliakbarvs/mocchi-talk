# Mocchi Talk MVP

Standalone Vite + TypeScript + Three.js touch-first web game for Matcha Interactive.

## Product
- Core loop: tap Mocchi -> she reacts/speaks -> choose a prompt -> she answers.
- Child-safe, calm, no points, leaderboard, ads, accounts, or backend.
- Mobile-first native touch feel; every interactive control must be at least 48px.

## Character
- Mocchi is a warm cream oblate mochi with cat-like ears, stubby limbs, coral headband, simplified three-pill Matcha emblem, thick expressive deep-teal eyebrows, dark teal eyes/mouth, and coral-pink cheek blush.
- Palette: cream #F7F3E8, coral #FF6B57, sunshine #FFD34D, aqua #4FC7C5, deep teal #0F6B6D.
- Procedural Three.js geometry is acceptable for MVP and must be structured so a future GLB can replace the character without rewriting UI state.

## Workflow
- Keep the app self-contained and runnable from this directory.
- Run npm install, npm run build, and browser smoke tests before claiming completion.
- Do not modify sibling projects or deploy/publish.
- Prefer transform/opacity animation, reduced-motion support, accessible labels, and safe-area insets.
