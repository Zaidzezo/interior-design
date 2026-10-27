# BuildSpace development

Use the current checkout. Cloud tasks are already isolated; do not create a Git worktree unless the user asks.

Read PROGRESS.md, LIMITATIONS.md and TESTING.md before extending the product. Preserve the light three-pane editor and original furniture illustrations. Do not add AI or paid services. Never show successful persistence before API acknowledgement.

Keep canonical geometry in meters and UUID identities stable. Validate imports with SceneSchema. Domain geometry and estimates belong in packages/core, not canvas event handlers. Every semantic edit must be undoable, saved and reflected in both renderers. Do not silently detach wall openings or discard furniture.

Commands: export XDG_DATA_HOME=/workspace/.local/share; ./scripts/setup.sh; pnpm dev. Use the custom server for WebSockets. Restart it after server/Next configuration edits. Run pnpm typecheck, pnpm test and relevant Playwright tests. Production output and dev output are separated. Report actual failures and unfinished requirements; do not call this full release complete.

Do not delete existing PostgreSQL volumes. scripts/backup-db.sh writes a private dump outside the checkout; preserve that dump for snapshots. No secrets or credential values in logs, source, or saved startup instructions.
