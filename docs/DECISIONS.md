# ARQUILA · decisions on the client requirements

Decisions taken in row R0 that resolve conflicts between the client requirements (R01–R18, see `ARQUILA/REQUIREMENTS.md`) and earlier rules or work. `docs/DECISIONES.md` is the earlier, historic record in Spanish and is kept unchanged.

## Conflicts

### C1 · R11 vs IMP-F1

IMP-F1 (budget CSV) is archived on the local branch `archive/imp-f1-budget-csv` (commit 3702bac) and removed from `feat/imp-batch1` by revert ec93280.

Note: `docs/DECISIONES.md:260` still mentions `utils/budgetCsv.ts`; the file no longer exists.

To finish R11 remove only the Materials UI: route `/materiales`, project section `materiales`, sidebar, command palette and breadcrumb entries, `MaterialsPage`, `MaterialsPanel`, `CostChart`, related tests and e2e. Keep the backend endpoints, the `materials` table and snapshot fields (old saved versions must still restore). Keep `SurfaceLibrary` (room surfaces differ from budget materials). Check summary cards, activity, progress, recommendations and templates for references to materials. If `recharts` is no longer used, remove it and report the bundle before and after (charts chunk was 356.71 kB).

### C2 · R02 vs S1

Test accounts exist only when `ENVIRONMENT` is not `production`: the seed script refuses to run otherwise, with a test. Plain passwords only in `docs\TEST_ACCOUNTS.md`, marked development and staging only. Login quick-fill only under `import.meta.env.DEV`, verified absent from the production build (grep `dist`). The daily reset workflow must never load these accounts.

### C3 · R07 exceptions

The 200-character limit applies to every free text a user types. Exceptions: password (8 to 128), email (254), AI chat messages and AI-generated content, uploaded file contents, JSON settings, system-generated history values (shortened for display). Existing rows over 200: count them per column with read-only queries, never truncate silently, add the CHECK as `NOT VALID`, report the rows and ask the owner.

### C4 · R06 map

Leaflet in a lazy chunk, one-line justification and bundle size reported. CSP changes only for the tile host (`img-src`). Tile URL from an env variable, attribution visible, provider usage policy noted. Manual latitude and longitude inputs always work as a fallback.

### C5 · R08 and R13 provider and privacy

Model provider configured by environment variables, keys only in the backend. Files go to an external provider, so show a Spanish consent notice before the first use. Provider unavailable or not configured: say so in Spanish and keep the manual flow working.

### C6 · R01 and R05 vs earlier design rules

"No gradients, no glassmorphism" stop being binding; the chosen direction decides. Keep: token architecture, AA contrast in both themes, accessibility, `prefers-reduced-motion`, no horizontal scroll at 360, 768, 1280 and 1920 px.

### C7 · R13 and R15 interpretation

AI-first, not AI-only. The AI proposes through the same validated services as manual edits, in one transaction, with a version snapshot before applying and undo afterwards. For R15 auto-apply is allowed only with the snapshot, a visible undo, AI-field marking and a fallback to a review modal when confidence is low or a required field is missing. Manual creation stays as a secondary path.

## Navigation

### N1 · Navigation

Final sidebar: Dashboard (R12), Proyectos, Planos (contains Terreno), Visor 3D (contains Recorrido), Tareas, Configuración. Removed: Terrenos, Recorrido, Asistente, Materiales. Project sections: resumen, planos (with terreno), modelo-3d (with recorrido), elevaciones, tareas, versiones, historial, analisis, archivos. Old URLs (`/terrenos`, `/recorrido`, `/asistente`, section values `terreno`, `asistente`) redirect so bookmarks keep working; update the command palette, breadcrumbs, shortcuts dialog and e2e.

### N2 · Walkthrough inside the viewer (R14)

URL `/visor?modo=recorrido`; the viewer container mounts the interior viewer; one dispose path; `reduce_motion` respected. It still ignores project data; feeding it the project's rooms is a later improvement.

### N3 · Terrain inside plans (R16), D-NEST (OPEN)

Default: UI nesting plus a nullable `terrain_id` on `plans` (composite same-project FK), new migration with down script. Backfill only when a project has exactly one terrain; otherwise NULL and report the count. The `terrains` table and endpoints stay. If "platos" meant something else, revert this default.

### N4 · AI inside terrains (R15)

Immediate job with progress; extraction into terrain and plan proposals (per-field value, source, confidence); auto-apply per C7; badges "Rellenado por IA" and "Revisar"; never invent coordinates, dimensions, slope, soil type or polygon points (the polygon is filled only when the document gives explicit vertices). The standalone assistant page is removed; the R13 project builder stays reachable from dashboard creation and the command palette.

### N5 · Login toggle (R17)

`PasswordField` first on Login, then the other forms in row R4.

## Change history (R18)

### H1 · History source

Reuse `activity_log` (has `created_at`) and `GET /projects/{id}/activity`. First verify, read-only, which mutations write entries and which do not. Extend the existing endpoint (filters `entity_type`, `entity_id`, `user_id`, date range; pagination); no invented endpoints.

### H2 · What is recorded

Server-side, same transaction as the change, database clock in UTC (`timestamptz`), actor (user or `ai`), action (`created`, `updated`, `deleted`, `restored`, `undone`, `redone`, `ai_applied`), entity type and id, and a `changes` JSON with only the changed fields as before and after. If `detail` cannot hold it, add a `changes jsonb` column with a new migration (next free number, idempotent, down script, `pg_dump` outside the repos first). Never log secrets, password data or file contents. Existing rows stay untouched.

### H3 · Display

Spanish, `Intl.DateTimeFormat('es-CO')`, absolute and relative time, `<time datetime>`, UTC tooltip, grouped by day, field names through `labels.ts`, "Última modificación" on project and plan cards and headers, time shown in success toasts. Test with a fixed timezone.

## Verified state at R0

The sections above are the decisions as given by the owner. These are the facts checked against the repositories at R0 that the work rows must account for:

- **H2 and the time zone.** `activity_log.created_at` is `TIMESTAMP` without a time zone today (`BASE-DE-DATOS-ARQUILA/migrations/021_activity_log.sql:9`; no timezone in `BACKEND-ARQUILA/app/models.py:762`). H2 asks for `timestamptz`, so row R5b needs a type conversion migration (new, idempotent, with a down script) that H2 does not yet describe; it changes the column type of existing rows. How to convert existing values is for the owner to confirm at R5b.
- **`PasswordField` does not exist yet.** The existing component is `PasswordInput` (`src/components/ui/Input.tsx:80-108`), used on Login and Reset password. `PasswordField` is to be created or renamed in row R4.
- **`labels.ts`.** The only `labels.ts` is `src/components/viewer/labels.ts` (3D viewer labels). H3 field names need either an extension of that file or a new labels module; decided in row R5b.
- **`docs\TEST_ACCOUNTS.md` does not exist yet**; it is to be created in row R4. The daily reset workflow in C2 is `BASE-DE-DATOS-ARQUILA/.github/workflows/reset-demo.yml`.
- **`docs/DECISIONES.md:260`** names `utils/budgetCsv.ts`, removed by ec93280 (see C1).

## Open decisions

Status OPEN; the owner is asked at the right step. Row numbers are as recorded at R0; they do not yet match the block R order in `ARQUILA/PROGRESS.md` (the 200-character limit is R6, the map R8, the AI rows R10 and R11) and are pending confirmation by the owner.

- D-DESIGN · visual direction, row R1 · OPEN
- D-AI · model provider, row R9 · OPEN
- D-AI-2 · hide the manual path or not, row R10 · OPEN
- D-AI-3 · auto-apply threshold for R15 · OPEN
- D-ENC · encryption of stored files, default no · OPEN
- D-200 · rows over 200 characters, row R5 · OPEN
- D-MAP · tile provider, row R7 · OPEN
- D-NEST · terrain inside plans, default in N3 · OPEN
