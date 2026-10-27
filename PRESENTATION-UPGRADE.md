# Material studio update

## Part A audit and implementation

Kept the prior finite-segment hit testing, unsnapped selection, stacking order, top-layer 12px transform handles, Shift/Alt transforms, pointer capture, unified wall data, undoable color changes and shared session query. Existing browser regressions exercise those paths.

Added:
- Persistent recent furniture row; existing search, categories and favorites retained. Finish choices and mirror/arm-side controls use canonical catalog definitions and existing `flipX`.
- Wall color and finish inspector; thickness, length, endpoint edits, opening hosting and deletion controls retained.
- Profile initials avatar, name, email, saved-plan buttons, loading/error states and sign out. Session/API guards retained.
- Shift-drag marquee, group selection expansion and a working Ungroup control. Existing lock, order, context actions, clipboard, keyboard nudge and history retained.
- Floor choices for wood, herringbone, tile, marble, carpet, concrete, terrazzo and plain color, with local thumbnails.
- Trackpad Ctrl-wheel pinch and two-touch zoom/pan using a stable gesture anchor; touch pointer cleanup, focus labels and reduced-motion styles. Physical phone/tablet gesture acceptance is still needed.

## Part B procedural fallback

The environment proxy rejected the Poly Haven API request with HTTP 403. Used the explicitly authorized procedural fallback, rather than hotlinking or using unclear-license assets.

- 27 generated WebP albedo/normal/roughness maps; 1.2m texture repeats in 2D/3D. Generated maps total about 240KB on disk, before HTTP transfer overhead. Maps are synthetic approximations, not scanned materials.
- Existing 105 distinct plan symbols gain directional gradients, soft shadows and patterned finish options. Blueprint removes surface effects; Realistic restores them. View preference persists locally.
- Three.js furniture uses rounded geometry and finish-dependent roughness/metalness. Wall finishes, caps and baseboards added. Existing detailed opening symbols, frames and glass retained. The furnished seven-room sample is retained.
- Sidebar images load lazily. Texture loaders are lazy on 3D entry; shared source textures are cached and cloned/disposed for per-room repeats. No hotlinks, runtime paid services or model downloads.
- Existing studio composition retained, with restrained hover shadows, recent-item cards, profile styling and keyboard focus cues.

## Compatibility and assets

See PRESENTATION-MIGRATION.md for additive legacy-scene handling and CREDITS/ATTRIBUTIONS.md for asset names, authorship, source, license and a manual download/integration list. No CC-BY assets were used.

## Not delivered / verification limits

This is not the full photorealistic asset replacement requested in Part B. Imported GLB furniture, 105 unique detailed 3D assets, matching physically rendered top-down sprites, scanned PBR textures, HDRIs, Draco/KTX2 compression and category-based model loading remain unfinished because external asset sourcing was blocked. Procedural furniture still shares 3D family construction. Wood/brick/wallpaper and fabric effects are approximations. No 60fps promise, physically certified lighting or exhaustive touch/accessibility certification is made.

The 150-object performance script records idle animation-frame intervals under software rendering. It does not measure actual interactive drag/resize frame rates. See artifacts/canvas-performance.json when generated.

## Manual checklist

1. Place furniture and check the recent row after reload; search, filter and favorite items.
2. Choose a finish, color and mirror state; undo/redo, save and reload; inspect 3D.
3. Shift-drag around multiple items, group/ungroup, transform, lock, order and duplicate.
4. Edit default and drawn walls, finishes and openings; check save/reload and undo.
5. Choose each flooring type, then a custom color; compare Realistic and Blueprint.
6. Sign in, open the profile and switch saved plans; refresh and sign out.
7. Try trackpad pinch and two-finger pinch/pan on real devices; check pointer release, focus and Escape.
8. Export JSON/SVG/PNG/PDF/GLB and reopen outputs; verify colors and geometry.

SVG/PDF plan exports retain the original self-contained vector floor patterns; they do not yet embed the new WebP floor maps. GLB export retains texture/material data supported by Three.js. A final export regression validates downloadable JSON/SVG/PNG/PDF and re-decodes the GLB.

## Final verification

- Typecheck, lint and optimized production build: passed.
- Unit tests: 36 passed across seven files.
- Full browser/API suite: 12 passed, including existing editing/history/account/wall/import/export workflows and the two new presentation/marquee tests. No increased test timeouts were used.
- 150-object measurement: median idle frame interval 16.7ms, p95 16.8ms, max 316.6ms; four of 120 samples exceeded 33ms. Chromium software rendering, not interactive 60fps acceptance.
- Final build reported approximately 171KB first-load JS; 3D and its maps load separately. This is Next's reported bundle figure, not a measured cold-network transfer total.
