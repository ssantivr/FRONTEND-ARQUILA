# Decisiones

Decisiones tomadas durante el rediseño y su motivo. Las de la interfaz en sí (qué hace cada pantalla y por qué) están en `FRONTEND.md`.

## Aprobadas antes de empezar

1. **Se construye sobre `rediseno-ui`.** La rama ya tenía rutas, Error Boundary, toasts, skeletons, el visor en piezas y los scripts de capturas. El encargo se aplica solo a lo que falta.
2. **Identidad verde bosque y lima.** Se conservan los colores de `src/styles/tokens.css`, no la paleta índigo del encargo original. El resto de las reglas del sistema de diseño sí se aplican.
3. **Menú lateral y pestañas del proyecto.** Las pestañas hacen de selector de modo; se añaden migas de pan y la pestaña Comparar, en vez de mover todo a una barra superior.
4. **`/proyectos/:id/modelo-3d`.** La dirección anterior, `/modelo`, redirige a la nueva.
5. **Toasts propios.** No se añade Sonner: los de `state/toasts.ts` ya hacen lo que se necesita.
6. **Barra vertical en el visor** con las acciones que ya existían (enfocar, aislar, corte, vista interior, guardar imagen).
7. **Capturas «antes».** Las de `docs/capturas-antes/` son del 12 de octubre de 2026, ya dentro del rediseño; se rotulan como «estado previo».
8. **Capturas finales** a 390, 820 y 1280 px con nombres ordenados, en la fase 8.
9. **CSS Modules gradual.** Empieza por `ui/`, un componente por commit y comparando capturas, porque en el CSS plano el orden de importación decide qué regla gana.

## Tomadas durante el trabajo

### Rollup en WebAssembly (fase 0)

Smart App Control bloquea `rollup.win32-x64-msvc.node`, que no está firmado, y ni Vitest ni `vite build` arrancan. El override de `package.json` cambia `rollup` por `@rollup/wasm-node` 4.64.0. Va en un commit aparte para revertirlo antes de fusionar o desplegar.

### Commits con `--no-verify` (fase 0)

El hook de pre-commit es un guion de `sh` y git no puede lanzarlo («cannot spawn .git/hooks/pre-commit»), por el mismo bloqueo. El hook solo pasa Prettier por `src/`, `vite.config.ts` y `eslint.config.js`. Antes de cada commit se ejecuta `npm run format:check`, que comprueba esos mismos archivos, y se confirma con `--no-verify`.

### `save-exact` en `.npmrc` (fase 0)

Para que una instalación futura no vuelva a escribir `^` en `package.json`.
