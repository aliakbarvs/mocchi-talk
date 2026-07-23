# Mocchi procedural 3D quality contract

## Reference verdict

The supplied image is a valid **character design sheet**, but not a single isolated 3D ground-truth view. The deterministic admission gate correctly returned `conditional` because the sheet contains multiple separated character views, logo/detail panels, and color swatches. It is suitable for stylized reconstruction and animation design, not photogrammetry.

## Intended use

Real-time browser hero character for Mocchi Talk. Target: 60fps mobile rendering, touch-reactive, animation-ready, procedural Three.js model with a future GLB replacement seam.

## Identity-defining geometry

- Cream oblate mochi body: wide and softly flattened, roughly 1.3x wider than tall.
- Two small rounded triangular cat-like ears attached into the upper body silhouette.
- Two short rounded arms attached at the lateral body midline; two flattened feet grounded below.
- Coral fabric headband wrapping across the forehead, with a small right-side tie/knot.
- Center headband emblem: three rounded vertical pills in coral, sunshine yellow, and aqua, backed by a white embroidered plate.
- Face landmarks: two dark bead eyes, thick slanted teal eyebrows, small w-shaped mouth, symmetrical pink cheek blush.

## Material contract

- Body/limbs: warm cream `#F7F3E8`, high roughness 0.86–0.94, soft matte tactile response.
- Headband/tie: coral `#FF6B57`, roughness 0.82–0.9, cloth-like matte response.
- Emblem: coral `#FF6B57`, sunshine `#FFD34D`, aqua `#4FC7C5`, white border/plate.
- Face/linework: deep teal `#0F6B6D`.
- Blush: translucent warm pink, low-contrast.
- Lighting: warm key, aqua fill, soft contact shadow, rice-paper transparent scene.

## Animation contract

- `idle`: 2–3% vertical float, slow 3–6° yaw drift, subtle breathing scale.
- `tap`: 250–450ms spring squash/stretch, tiny forward nod, recover to idle.
- `happy`: closed eyes, smile, both arms raised/waving, 2–3 small celebratory bob cycles.
- `curious`: uneven brows, widened eye, slight head yaw/tilt.
- `thinking`: furrowed brows, one arm pivots to chin, slower bob.
- `shy`: lowered gaze, stronger blush, one arm pivots to cheek, small side sway.
- `listening`: widened eyes, attentive brows, small side-to-side head motion.
- `speaking`: mouth open/closed chatter pulse while speech synthesis is active.

## Acceptance

The model is accepted as an MVP approximation when the front silhouette, headband/emblem, face landmarks, palette, and all seven animation states are visibly readable in the browser. A future GLB may replace the factory without changing the UI interaction API.
