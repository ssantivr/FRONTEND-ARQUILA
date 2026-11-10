# ARQUILA · design options comparison (row R1, R01 and R05)

Three static mockups for decision D-DESIGN (DECIDED by the owner: option A, see `docs/DECISIONS.md`). This file does not recommend an option.

Only `option-a-studio-editorial.html` and this file are committed as the design record. Options B and C, `README.md`, `capture.mjs` and the screenshots stay on the owner's disk, outside the repo.

Files (open from disk, select a screen with `?screen=` and a theme with `&theme=light|dark`; see `README.md`):

- `option-a-studio-editorial.html`
- `option-b-soft-modern.html`
- `option-c-dark-pro.html`

Screens: `login`, `login-error`, `panel`, `empty`, `error`, `detail`, `historial`, `historial-empty`, `delete` (five states: name mismatch, name match, deleting, error with «Reintentar», deleted with «Deshacer»). Screenshots: 81 PNG files (9 screens × 1280 light, 1280 dark, 390 light per option), git-ignored, regenerated with `node docs/design-options/capture.mjs` (last run: `screenshots: 81`, `blocked network requests: 0`, `problems: 0`).

All project data is mock and marked as an example.

## Summary

| Option | Average score | Strengths | Weaknesses | Contrast issues | Effort to implement | How well it suits the 3D viewer |
|---|---|---|---|---|---|---|
| A · Studio Editorial | 4.30 | Strongest brand feel (5) and typography (5): serif display face, Graphite/Stone/Terracotta/Mineral color blocks; closest to the current identity | Serif is a system stack (Palatino on Windows, Iowan on macOS): fallback must be tested or a font self-hosted; dark login hero separation is subtle | None (AA in both themes; disabled controls exempt). Closest margin: light subtab ring 3.55 against 3:1 | Low: palette, flat shadows and radius scale already exist in `src/styles/tokens.css`; change `--font-display`, tighten radius, add KPI blocks and state components | Good: dark graphite viewer in both themes matches the existing scene tokens; terracotta selection reads clearly |
| B · Soft Modern | 4.00 | Friendly, rich visuals (5), soft elevation, rounded components | Brand feel 3: peach gradients `#e2774a`→`#f0a05a`, no Terracotta `#D66A3D` or Mineral; recent-activity time still wraps before the «·» separator | None (AA in both themes; disabled controls exempt) | Medium-high: new neutrals, gradient tokens, 8–24 px radius scale touching every component, elevation instead of borders, floating sidebar, light-theme scene tokens | Weakest: light viewer needs per-theme Three.js clear color, grid and lighting; lowest figure-ground contrast |
| C · Dark Pro | 3.90 | Strongest 3D stage: always-dark viewer with a CSS glow (no WebGL cost); technical feel | Brand feel 3: neon accent `#ff6a3d`, no Mineral; dark walls nearly vanish on the dark slab; display font (Bahnschrift) is Windows-only | None (AA in both themes; disabled control exempt). Closest margin: dark subtab ring 3.50 against 3:1 | Medium: new neutrals and accent replacing the brand tokens, glow token, always-dark viewer tokens, dark-first «automático» theme (`tokens.css`, `theme.ts`) | Strongest stage, but the real scene needs rim light or edge lines for the dark materials (check under `arquila-threejs-safety`) |

## Scores (design-director, final round, 1 to 5)

| Criterion | A | B | C |
|---|---|---|---|
| Hierarchy | 4 | 4 | 4 |
| Spacing rhythm | 4 | 4 | 4 |
| Color harmony | 4 | 4 | 4 |
| Typography | 5 | 4 | 4 |
| Visual richness | 5 | 5 | 4 |
| Consistency | 4 | 4 | 4 |
| Motion (scored from the CSS) | 4 | 4 | 4 |
| Density | 4 | 4 | 4 |
| Brand feel | 5 | 3 | 3 |
| Delight | 4 | 4 | 4 |
| **Average** | **4.30** | **4.00** | **3.90** |

Score history: round 1 A 4.00, B 3.60, C 3.40; round 2 A 4.20, B 3.90, C 3.80; round 3 as above.

Skill target (at least 4 on every criterion): A meets it. B and C miss it only on brand feel. The reviewer's fix for both is to use Terracotta `#D66A3D` as `--accent` and Mineral `#89968C` for secondary geometry; that was not applied, so each option keeps its own direction for the owner to compare.

## Reviews

| Review | Agent | Result |
|---|---|---|
| Art direction | design-director | Scores above; three rounds |
| Spanish copy | ux-copy-es | Round 1 FAIL (22 findings, all three options); round 2 PASS for A, B and C |
| Contrast (AA, both themes) | ui-reviewer | Round 1 FAIL (all three); round 2 A and B PASS, C light FAIL on 3 pairs; round 3 PASS for A, B and C (396 measurements, failures only on exempt disabled controls) |

## Remaining notes (not blocking)

- B: in «Actividad reciente» the relative time wraps before the «·» separator; put the separator inside the nowrap span.
- All options: the panel error state has only an icon, no illustration.
- Mockup tabs and the viewer toolbar have no arrow-key handling; the real build must add it.
- The mockup copy for delete undo («Podrás deshacerlo desde el aviso…») depends on R10: today the app says «No se puede deshacer» and the backend has no restore for a deleted project.
- The app sidebar still says «Inicio»; R3 renames it to «Panel».
