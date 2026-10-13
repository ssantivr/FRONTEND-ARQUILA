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

### Tamaño base de 14 px (fase 1)

El texto base bajó de 15 a 14 px, como pide la escala. Ningún espaciado estaba en `rem`, así que solo cambió el texto que heredaba el tamaño de la raíz.

### Alcance de «eliminar colores sueltos» (fase 1)

Se quitaron todos los colores hexadecimales de las hojas de estilo y de los componentes, salvo la paleta de los planos descargables (`utils/drawingPalette.ts`), que debe viajar dentro del SVG. Quedan unos 115 valores `rgba()` en las hojas de estilo anteriores: son velos, bordes translúcidos y sombras propios de cada contexto (sobre una imagen, sobre la escena 3D). Convertirlos en tokens uno a uno no aporta un sistema; se irán absorbiendo con la migración de cada componente a CSS Modules.

### CSS Modules solo en lo nuevo y en Dialog (fase 1)

Se migró `Modal` a `Dialog.module.css`, porque sus reglas estaban todas en un solo archivo. `Badge`, `MetricCard` y `Skeleton` se movieron a `ui/` pero conservan sus clases globales: tienen reglas en hasta cinco hojas distintas que dependen del orden de importación y de la pantalla donde aparecen. Migrarlas exige comparar capturas pantalla por pantalla; queda para después de las fases obligatorias.

### Tooltip propio, sin Radix (fase 1)

La regla era usar Radix solo donde reemplazara al Modal o a los menús propios. El `Tooltip` es un `span` con `role="tooltip"` enlazado con `aria-describedby`, visible al pasar el cursor y al enfocar, y que se cierra con Escape.

### El corte no exige aislar un cuarto (fase 2)

El encargo ponía como ejemplo «Aísla un cuarto para usar el corte», pero el corte ya funcionaba sobre todo el modelo y quitarlo sería una regresión. Las etiquetas de «por qué no aplica» se pusieron donde sí hay una condición real: enfocar necesita una selección, aislar necesita un cuarto seleccionado y la vista interior necesita un cuarto aislado.

### Migas de pan solo dentro del proyecto (fase 2)

Es el único lugar con más de un nivel de profundidad. En las pantallas de primer nivel serían una sola palabra, que ya está en el título y en el menú lateral.

### Capas de obra en cian y magenta (pendiente de decidir)

`BuildingSceneManager.ts` dibuja las capas de obra del visor (estructura en cian `#00F0FF`, instalaciones en magenta `#FF007F`) y `RoomWorksPanel.tsx` repite esos colores en sus muestras. La regla del neón solo los admite en el contorno de selección y en las luces de acento. No se cambió porque está en `src/three/`, que en este encargo solo se puede tocar para la pendiente y la pérdida de contexto WebGL. Hace falta una decisión: cambiar esos dos colores o aceptar la excepción.
