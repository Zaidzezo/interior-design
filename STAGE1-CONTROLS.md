# Stage 1 — object controls

Stage 2 has not started. The attached request explicitly requires approval of the 3D redesign plan after Stage 1 verification.

## Reproduction and root causes

A real Chromium regression seeded a small rug, selected it, zoomed to 12px/m and dragged its top-left corner. Before the fix its width stayed at approximately 0.8m instead of increasing. The same screen-space handle targets overlap on small projected objects; native canvas hit order can dispatch to another anchor. The previous single-corner test at one ordinary zoom did not cover this case.

The native transformer also mixed a five-screen-pixel minimum with a separate 0.1m commit clamp. That makes effective constraints depend on zoom and can change the pivot/aspect ratio on commit. Handle geometry included selection strokes instead of using the canonical item dimensions. There was no dedicated move handle. Canvas transform handling used a separate mouse/touch stream, while capture was assigned to the canvas rather than the actual control.

## Changes

- Replaced only the control layer, keeping the Konva scene, catalog, geometry, store, history and persistence architecture. DOM controls sit above the canvas and capture the actual pointer on the control element. The visible resize square remains small, with an 18px hit target; very small objects use a 36px minimum control frame so neighboring hit regions remain independently reachable. A grab offset maps this display padding back to actual geometry without jumps. Move/rotate controls use 24px targets.
- Resolve overlapping control regions by the nearest displayed control center, independent of DOM paint order. Empty overlay areas do not intercept scene input. Cursor direction accounts for object rotation.
- Pure shared transform math uses world coordinates and an immutable gesture snapshot. All eight resize handles, rotation and movement use the same canonical bounds. Display padding never changes saved dimensions. Limits are in meters: minimum 0.1m, maximum 1000m; dimensions do not flip. Shift preserves aspect ratio, Alt preserves the center; Shift rotation uses 15-degree increments.
- Multiple selections scale uniformly to avoid introducing shear that the canonical item model cannot represent. Each completed gesture is one atomic undoable command. Cancellation, Escape and window blur restore the snapshot without adding history; failed commits restore canonical rendered state.
- Body selection continues through shared finite-shape hit testing; no full-area drag overlay was added. Move-handle snapping uses the existing bounded screen-space snap guide and toggle. Resizing does not snap selection.
- Wheel handling belongs to the entire editor surface, with a non-passive native listener and cleanup. Zoom works over handles as well as canvas. The camera is held fixed during a control gesture.

## Verification

Tests: tests/e2e/controls.spec.ts simulates real mouse events for all eight handles at low/mid/high zoom and rotations 0/33/90 degrees (72 resize gestures), with one-step undo checks. Additional cases cover the small-object reproduction, dedicated move/rotate controls, release outside the canvas, and pointer cancellation. Controls follow native body dragging before release; extra assertions check that low-zoom controls stay under the pointer during resizing. Existing regressions check Shift+Alt resizing, default wall movement/endpoint editing, floor-color undo/save/reload and registered profile state. Pure tests cover rotated fixed pivots, centered aspect locking and minimum/maximum bounds.

See the final verification section below for actual completed results. No timeout increases or delayed event workarounds are used.

## Manual checks

1. Select a small or rotated object. Zoom out and drag each white square; verify the intended edge/corner moves.
2. Hold Shift, Alt, and Shift+Alt while resizing. Check opposite corner/center behavior; undo once.
3. Use the move and rotate controls; drag outside the canvas before releasing. Press Escape mid-drag and check cancellation.
4. Resize to the minimum; confirm no flipping. Check meter dimensions at different zooms.
5. Edit a default wall; change a room color, undo/redo and reload. Open the account profile while signed in.

Controls have real pointer-capture and cancellation paths; physical touchscreen/stylus acceptance on the user's device remains a separate manual check.


## Final completed results

- Type checking, lint and production build passed.
- 39 unit tests passed, including rotated pivots, minimum/maximum dimensions and independent minimum screen-space handle regions.
- Complete controls browser file: 12 passed, including nine matrix configurations (72 resize gestures), low-zoom reproduction, move/rotate/cancel/outside release and live bounds during native body dragging.
- Broader browser/API run excluding the matrix: 14 passed, including existing editing, exports, JSON import, collaboration, responsiveness, profile, floor-color and default-wall regressions.
- Final focused rerun: three passed, including pointer/control alignment assertions for all eight handles at low zoom with rotations 0 and 33 degrees.
- An earlier initial page-readiness assertion timed out; warm reruns passed without increasing test timeouts. See artifacts/stage1-controls-summary.json for the run summary.
- Existing scene format and saved object IDs are unchanged. No database migration is needed for Stage 1.

The selected-object control layer uses a minimum display cage only for very small projected objects. During capture its padding is held constant so the dragged control stays under the pointer; padding never alters saved dimensions. External scene changes cancel a gesture instead of committing a stale snapshot.
