# Editor interaction fixes

## Diagnosis and changes

1. Selection handlers were distributed between room fills, images, wall strokes, openings and the stage. Child event cancellation and rectangular image hit regions disagreed with the visible stack. `hitTest` now resolves the unsnapped world pointer against a consistent back-to-front scene order. Native furniture drag regions use the same catalog footprint; invisible labels and decorations do not intercept selection.
2. Each furniture transformer was interleaved with later furniture, with seven-pixel handles. A single transformer now lives in the final overlay layer, with 12px anchors and an expanded hit region. Konva supplies rotation-aware cursors, Shift aspect locking and Alt centered scaling. Browser pointer capture retains gestures outside the canvas. Multi-node transform results commit together as one undoable command.
3. The renderer received only a family kind, so differently named catalog entries shared geometry. Renderers and exports now receive catalog IDs. Catalog metadata drives cushion counts, sectional footprints, slats, drawers, basin counts, monitors and other physical details. Sizes were corrected for beds, seating, stools, tables and storage; office/classroom seating, desks and a bench were added. There are 105 entries; tests compare actual SVG geometry at the same color. Existing search, categories, favorites and material/color controls remain.
4. Wall projection clamped the projected point to the finite segment, but returned distance to its infinite supporting line. It now returns actual segment distance, including degenerate segments. Selection does not snap. Thin geometry uses a five-screen-pixel tolerance. Furniture drag snapping is independently toggled, limited to six screen pixels and accompanied by a visible guide.
5. Color/material-only room edits rebuilt architectural boundaries and could fail unrelated opening remapping. Only polygon changes rebuild. Color changes retain selected IDs and wall identity, go through normal history and persistence, and asynchronous texture loaders remove old callbacks.
6. Sample and drawn walls already shared the canonical wall array. Uniform hit testing now reaches both. Both have body movement, endpoint handles and inspector editing. Joined endpoint/room updates preserve wall and hosted-opening IDs. Deleted generated boundaries are recorded in scene data and excluded from subsequent rebuilds; undo restores them. Hosts with openings require explicitly removing their openings before deletion.
7. The account dialog unconditionally rendered credential fields beside Sign out. Shared session query options now serve startup, both avatars and account rendering. The dialog shows loading/error states, a registered-user profile, or guest/logged-out credential forms. Server session checks continue to guard protected API routes. Expired sessions freeze editing and request sign-in without discarding the scene; the HTTP-only session cookie persists across reloads.
8. Added a selection-aware context menu, arrow nudging (1cm; Shift 10cm), one-command multi-object resizing and selected/group drag movement. Fixed modal/contenteditable shortcut leakage, Space release on unrelated keys, time-based draw-click suppression, tracing-layer deletion, stale image callbacks and unnecessary selection-mode pointer rerenders. Wheel zoom uses current camera state; stage pan is synchronized during movement. API test contexts now respect BASE_URL.

## Checks

Verified: strict type checking, lint and production build passed; 31 unit tests passed. The full nine-test browser/API suite passed, followed by all three interaction regressions, including the added default-wall movement/endpoint test. Browser checks use real PostgreSQL, actual mouse gestures and acknowledged save/reload.

Run `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:e2e`, and `pnpm build`. Lint is now configured for JavaScript/TypeScript correctness without introducing styling rules. Tests use real PostgreSQL and Chromium; see TESTING.md and the latest artifacts/e2e-results.json for results.

## Manual checks

- At low and high zoom, select overlapping furniture, rugs, floor polygons, default walls, drawn walls, openings and annotations. Click beyond wall endpoints and in a sectional's empty corner: these must not select the distant object.
- Resize a rotated object and multiple selected objects from every handle. Try Shift, Alt, and Shift+Alt; release outside the canvas. Undo/redo should restore the entire gesture.
- Drag selected/grouped furniture with snapping on and off. Confirm the guide appears only near a grid coordinate and no object jumps from a distant click.
- Change floor color/material, undo, redo and reload. Move/resize/delete a default wall without openings, then edit a room and reload; verify IDs, joins and deletion remain correct.
- Inspect seating, tables, beds, storage, kitchen, bath, office/classroom and decor symbols. Search/filter and change colors/materials.
- Register/sign in, open either account avatar and reload. Verify profile persistence; sign out and check the credential form. Test expired-session rejection without losing a dirty draft.
- Test Delete, copy/cut/paste, duplicate, undo/redo, arrows, Escape, Space pan, wheel zoom, and right-click actions. Typing inside a field/dialog must not edit the canvas.

Automated checks do not establish exhaustive touch-device behavior, arbitrary architectural topology repair or production GPU performance. Existing full-product limitations remain in LIMITATIONS.md.
