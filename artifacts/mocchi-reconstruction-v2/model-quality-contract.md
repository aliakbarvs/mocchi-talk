# Mocchi reconstruction contract v2

## Reference status
The source is a multi-view character sheet, so it is a conditional reference for a stylized reconstruction, not a single photogrammetry target. Use the front and 3/4 turnarounds for silhouette; use the expression row for facial poses; use the emblem and palette panels for materials.

## Identity lock
- Overall silhouette: compact, rounded oblate mochi, wider than tall; warm cream matte body.
- Body proportions: body width 1.00, body height 0.82, body depth 0.68; feet keep the base grounded.
- Ears: two small rounded cat ears, each about 0.20 body-width, outward cant 12 degrees, no sharp cones.
- Face: dark deep-teal bead eyes with expressive thick brows; eyes sit slightly above midline; small centered w-mouth; blush ovals low on both cheeks.
- Headband: coral fabric-like band wraps the forehead, sits above the brows, with a centered three-pill Matcha emblem and a visible tied knot/two short tails at the back/right silhouette.
- Limbs: stubby arms attached at mid-lower sides and two small oval feet partially embedded under the body.
- Palette: cream #F7F3E8, coral #FF6B57, sunshine #FFD34D, aqua #4FC7C5, deep teal #0F6B6D, blush #F58D93.

## Material contract
Use matte-but-soft MeshStandardMaterial: cream roughness 0.86, coral 0.78, emblem pills 0.72, teal facial parts 0.62, blush transparent 0.9. Add subtle vertex/normal variation only if it improves the soft molded look; no metallic finish.

## Rig contract
Named pivots: root, body, head, eyes, mouth, leftArm, rightArm, leftFoot, rightFoot, headband, face. Keep the existing public factory API. All poses ease toward targets; no unbounded sine-only animation.

## Visible animation targets
idle float/breathe; tap 420ms squash + forward nod; happy closed eyes + broad open smile + raised waving arms; curious asymmetrical brows + head tilt; thinking right hand near chin; shy lowered gaze + hand to cheek + stronger blush; listening widened eyes + head scan; speaking mouth chatter.

## Review risks
The sheet does not expose true depth or a clean isolated front crop. Do not claim exact 3D likeness. Prioritize silhouette, headband/emblem identity, facial landmarks, and readable pose changes.
