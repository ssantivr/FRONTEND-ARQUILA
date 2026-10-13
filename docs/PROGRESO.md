# Progreso del rediseño

Memoria de trabajo de la rama `rediseno-ui`. Se actualiza al cerrar cada fase, para poder retomar si la sesión se corta. Las decisiones y su motivo están en `DECISIONES.md`.

## Estado

| Fase | Grupo | Estado |
|---|---|---|
| 0. Desbloqueo | Obligatorio | Hecha |
| 1. Sistema de diseño | Obligatorio | Pendiente |
| 2. Navegación | Obligatorio | Pendiente |
| 3. Pantallas | Obligatorio | Pendiente |
| 4. Correcciones | Obligatorio | Pendiente |
| 5. Datos | Deseable | Pendiente |
| 6. Producto | Deseable | Pendiente |
| 7. Calidad | Obligatorio | Pendiente |
| 8. Entrega | Obligatorio | Pendiente |

Opcional (Sentry, Storybook, Docker, Web Worker, Lighthouse CI): sin empezar.

## Antes de fusionar o desplegar

- **Revertir el commit `chore(local): rollup wasm por Smart App Control`.** CI y Vercel usan Linux con el Rollup nativo.
- Nada se ha subido a `origin`. No subir sin autorización.

## Respaldos

- Ramas `respaldo-rediseno-ui-2026-10-13` (commit `72efcf7`) y `respaldo-rediseno-ui-2026-10-13-sin-confirmar` (`bd7a97f`).
- Bundle en `C:\Users\LENOVO\Desktop\ARQUILA-respaldos\frontend-arquila-2026-10-13.bundle`.

## Fase 0. Desbloqueo (13 de octubre de 2026)

- Commit `chore: cambios de la sesión anterior` con las pantallas de Iluminación, Planos, Renderizado y Tareas que estaban sin confirmar.
- Commit aparte con el override de Rollup a `@rollup/wasm-node` 4.64.0.
- Versiones exactas en las cuatro dependencias que llevaban `^` (`@fontsource-variable/inter`, `react-router`, `axe-core`, `playwright-core`) y `.npmrc` con `save-exact=true`.
- Línea base, ya con el Rollup en WebAssembly:

| Comando | Resultado |
|---|---|
| `npm run format:check` | `All matched files use Prettier code style!` |
| `npm run lint` | Sin avisos ni errores |
| `npm test` | `Test Files 39 passed (39)`, `Tests 230 passed (230)` |
| `npm run build` | `✓ built in 18.03s`; `index` 351,59 kB (110,48 kB gzip), `three` 621,01 kB (158,20 kB gzip), CSS 100,46 kB |

## Problemas abiertos

- Smart App Control bloquea binarios sin firma: el Rollup nativo y `sh.exe` de Git. Otros binarios nativos que traiga una dependencia nueva pueden caer en lo mismo.
- El hook de pre-commit no se puede ejecutar en este equipo (ver `DECISIONES.md`).
