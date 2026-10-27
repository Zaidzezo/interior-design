# Verification

Run from the repository root, with `export XDG_DATA_HOME=/workspace/.local/share` in this cloud machine.

- `./scripts/setup.sh`: frozen dependency installation, Compose health, Prisma generation/migration, strict typecheck and unit tests. Tested on the existing populated database without reinitializing it.
- `pnpm typecheck`: web app, shared packages consumed by it, and custom `.mts` server.
- `pnpm test`: Vitest. Pure geometry, architecture, scene/template validity, catalog identity/count, exact estimate math and wall-cutout panels. These are unit tests, not database integration tests.
- `pnpm dev`, then `pnpm test:e2e`: Playwright uses `/usr/bin/chromium`, one worker, real loopback application/API, real PostgreSQL, and software WebGL. No backend mocks. The API tests cover account login/logout, ownership/viewer access, revocation, a competing revision race, immutable versions, schema/geometry rejection, exact scene persistence and estimate parity. Browser tests exercise catalog placement, inspector dimensions/rotation, reload, undo/redo, duplicate/lock, version creation, genuine 3D, JSON/SVG/PNG/PDF/GLB downloads, drawing/resizing a room, two browser sessions, responsive panels, JSON import and reference-image persistence.
- `pnpm build`: optimized Next production build. Development and production output directories differ. Run `pnpm start` afterward for production runtime validation; `PORT=3001 pnpm start` avoids the dev port.
- `pnpm exec tsx scripts/benchmark.ts`: actual Node geometry timings for the sample and 1,000 separated items. Writes `artifacts/geometry-benchmark.json`; not an FPS/GPU benchmark.

Screenshots: `artifacts/editor-1600.png`, `editor-1440.png`, `editor-1280.png`, `editor-390.png`, and `editor-3d.png`. Desktop dimensions are 1600×900, 1440×900 and 1280×800. Mobile is 390×844. The screenshot suite checks overflow/pane visibility; qualitative image review was performed separately. Reference-file absence is documented in LIMITATIONS.md.

Generated validation files include an editable JSON scene, actual SVG geometry, nonempty PNG, PDF with a valid header, and a binary GLB. The app reloads GLB data with GLTFLoader and requires nonzero mesh content before download. `artifacts/e2e-full-results.json` records the seven-test full suite; `artifacts/e2e-results.json` records the most recent targeted run; Playwright retains failure traces under test-results.

Do not describe current tests as covering every acceptance gate. In particular: arbitrary topology, direct 3D gizmo pointer gestures, exact material/lighting undo combinations, named-version restoration across all entity classes, remote conflict/reconnect/revocation adversarial cases, DXF browser import, image two-point calibration gestures and broad touch behavior need additional coverage. See PROGRESS.md for final counts and exact remaining work.

Final verified results: strict typecheck passed; 21 unit tests passed; seven full browser/API tests passed (0 skipped, 0 failures), followed by a passing targeted editing/3D/export regression after a grouped-copy identity fix. The final production build passed. `PORT=3001 pnpm start` plus `pnpm exec tsx scripts/production-smoke.ts` verified database health, seven-room rendering, acknowledged edit/save, reload persistence, and zero browser page errors against production output.

Final import hardening: wall colors are constrained to hex, tracing URLs to base64 PNG/JPEG data, and SVG IDs are escaped. The additional validation unit test passed; the JSON import/reference persistence browser regression passed again after this change.
