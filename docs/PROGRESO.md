# Progreso del rediseño

Memoria de trabajo de la rama `rediseno-ui`. Se actualiza al cerrar cada fase, para poder retomar si la sesión se corta. Las decisiones y su motivo están en `DECISIONES.md`.

## Estado

| Fase | Grupo | Estado |
|---|---|---|
| 0. Desbloqueo | Obligatorio | Hecha |
| 1. Sistema de diseño | Obligatorio | Hecha |
| 2. Navegación | Obligatorio | Hecha (punto de control 2 aprobado el 13 de octubre de 2026) |
| 3. Pantallas | Obligatorio | En curso |
| 3b. Animaciones básicas (F1 y F2) | Obligatorio | Pendiente |
| 4. Correcciones | Obligatorio | Pendiente |
| 5. Datos | Deseable | Pendiente |
| 6. Producto | Deseable | Pendiente |
| 6b. Animaciones expresivas (F3) y selector de movimiento | Deseable | Pendiente |
| 7. Calidad | Obligatorio | Pendiente |
| 8. Entrega | Obligatorio | Pendiente |

Opcional (Sentry, Storybook, Docker, Web Worker, Lighthouse CI): sin empezar.

Si falta tiempo se sacrifica en este orden: lo opcional, la fase 6b, lo avanzado de la fase 3b (puntos 11 a 13 de F2), la fase 6, la fase 5, el GIF y los CSS Modules más allá de `ui/`.

Revisión independiente: al cerrar las fases 2, 3b y 7.

## Antes de fusionar o desplegar

- **Revertir el commit `chore(local): rollup wasm por Smart App Control`.** CI y Vercel usan Linux con el Rollup nativo.
- Nada se ha subido a `origin`. No subir sin autorización.

## Respaldos

- Ramas `respaldo-rediseno-ui-2026-10-13` (commit `72efcf7`) y `respaldo-rediseno-ui-2026-10-13-sin-confirmar` (`bd7a97f`).
- Bundle en `C:\Users\LENOVO\Desktop\ARQUILA-respaldos\frontend-arquila-2026-10-13.bundle`.

## Fase 0. Desbloqueo (13 de octubre de 2026)

- Commit `chore: cambios de la sesión anterior` con las pantallas de Iluminación, Planos, Renderizado y Tareas que estaban sin confirmar.
- Commit aparte con el override de Rollup a `@rollup/wasm-node` 4.64.0.
- Versiones exactas en las cuatro dependencias que llevaban `^` (`@fontsource-variable/inter`, `react-router`, `axe-core`, `playwright-core`) y `.npmrc` con `save-exact=true`. El encargo hablaba de cinco; en `package.json` solo había cuatro.
- Línea base, ya con el Rollup en WebAssembly:

| Comando | Resultado |
|---|---|
| `npm run format:check` | `All matched files use Prettier code style!` |
| `npm run lint` | Sin avisos ni errores |
| `npm test` | `Test Files 39 passed (39)`, `Tests 230 passed (230)` |
| `npm run build` | `✓ built in 18.03s`; `index` 351,59 kB (110,48 kB gzip), `three` 621,01 kB (158,20 kB gzip), CSS 100,46 kB |

## Fase 1. Sistema de diseño (13 de octubre de 2026)

Commits `16b608b` (iconos), `15136f6` (tokens) y `f1a4c35` (componentes `ui/`).

- Tokens completos en `tokens.css`: escala tipográfica 12 a 36 px con 14 de base, radios 6/10/14, espaciado en múltiplos de 4, dos sombras y duraciones 120/180/240 ms. Un guion pasó a variables 153 tamaños de letra, 43 radios, 29 duraciones y 50 colores sueltos.
- JetBrains Mono en las cifras (`styles/numbers.css`).
- `npm run contraste`: todos los pares llegan a 4,5:1; se corrigió el verde de éxito del tema claro.
- lucide-react detrás de `Icon`; Radix Dialog detrás de `Modal` (ahora `ui/Dialog`).
- `Badge`, `Panel` y `MetricCard` en `ui/`; nuevos `Card`, `Tooltip`, `Skeleton`, `Input` y `Select`.
- CSS Modules en `Dialog`, `Card` y `Tooltip`. El resto, pendiente (ver `DECISIONES.md`).

Pendiente de esta fase: las curvas de movimiento de la sección F se añaden en la fase 3b, junto con `motion.css`.

## Fase 2. Navegación (13 de octubre de 2026)

Commit `04259e3`.

- Paleta de comandos (Ctrl/Cmd+K y botón al final del buscador).
- Visor 3D: barra vertical de herramientas con el motivo cuando una no aplica, atajos 1-4, F, I, Esc y `?`, y consejo en la barra de estado.
- Migas de pan en la cabecera del proyecto.
- `/proyectos/:id/modelo-3d`, con redirección desde `/modelo`.
- Resultado al cerrar el código de la fase: `Test Files 40 passed (40)`, `Tests 255 passed (255)`; `✓ built in 16.80s`, `index` 420,24 kB (130,71 kB gzip).

El paquete principal creció 69 kB (20 kB gzip) frente a la línea base, por Radix Dialog y lucide. Se revisa en la fase 7, con el análisis del bundle.

### Capturas de la fase 2

`npm run capturas` sobre la compilación de la fase 2: 95 imágenes en `docs/capturas/` y las ocho comprobaciones del visor en verde (ojo del árbol, sol a 180°, selección con cámara ortográfica, descarga PNG, atardecer, luz del render, imagen de 1920 × 1080 y su descarga).

### Revisión independiente de las fases 1 y 2

La hizo un segundo agente que solo vio el diff `22fa8d7..04259e3` y el encargo. No encontró nada bloqueante. Hallazgos y qué se hizo:

| Hallazgo | Resultado |
|---|---|
| La paleta no desplazaba la opción activa a la vista | Corregido (`scrollIntoView` al moverse con las flechas) |
| Atajos de una tecla activos con el foco en cualquier parte (WCAG 2.1.4) | Corregido: solo responden con el foco en el visor o en ningún control; no se repiten al mantener la tecla; una casilla o un deslizador ya no los bloquean |
| Ayudas de la barra recortadas en el móvil | Corregido: van arriba y con salto de línea; además, pulsar una herramienta que no aplica dice el motivo en la barra de estado y a los lectores de pantalla |
| En el móvil la barra quedaba debajo de todos los paneles | Corregido: va justo después de la barra de vistas |
| Fuente mono en textos que no son cifras, y ausente en las cifras del inspector | Corregido en los dos sentidos |
| La paleta no se veía con el visor en pantalla completa | Corregido: se dibuja dentro del elemento en pantalla completa |
| `/proyectos/7/constructor` se tomaba por una pestaña válida | Corregido y con prueba |
| La redirección de `/modelo` perdía la consulta y el ancla | Corregido |
| Ctrl+Mayús+K y Ctrl+Alt+K también abrían la paleta | Corregido |
| Escape sobre una ayuda también soltaba la selección del visor | Corregido y con prueba |
| «Enfocar» no servía con una instalación elegida; «Aislar» con otro cuarto seleccionado | Corregido |
| «Guardar imagen» no confirmaba ni avisaba si fallaba | Corregido con un aviso |
| Migas como botones | Ahora son enlaces con su dirección: se pueden abrir en otra pestaña |
| Valores a mano en los módulos nuevos (44 px, z-index, iconos) | Pasaron a tokens (`--touch-target`, `--z-overlay`, `--z-tooltip`, `--icon-sm`, `--icon-md`) |
| Colores de las capas de obra escritos en `RoomWorksPanel.tsx` | Pasaron a tokens (`--neon-*`, `--work-*`) |
| «Con el ratón», «Coste» | «Con el mouse», «Costo» |
| Orden del CSS: los módulos iban antes que las hojas globales | Corregido: `main.tsx` importa las hojas globales antes que `App` |

No corregido, con su motivo:

- Unas 110 `rgba()` y algunos tamaños, radios de 2 a 4 px, sombras y espaciados de 6, 10 y 14 px en las hojas de estilo anteriores. Se absorben al migrar cada componente a CSS Modules (ver `DECISIONES.md`).
- «Techo» frente a «cubierta» y «Corrida de interior» frente a «recorrido»: textos anteriores al rediseño; se unifican en la fase 7 con el repaso de textos.
- La paleta no se puede abrir en el móvil (su botón se oculta por debajo de 720 px). Allí no hay teclado y la navegación ya está en la fila superior.
- El `role="toolbar"` de la barra vertical no tiene navegación con flechas: son seis paradas de tabulación.
- El icono de una herramienta que no aplica tiene un contraste de unos 3,4:1. WCAG no exige 4,5:1 a un control inactivo, y el motivo sí se lee con contraste completo.

## Problemas abiertos

- Smart App Control bloquea binarios sin firma: el Rollup nativo y `sh.exe` de Git. Otros binarios nativos que traiga una dependencia nueva pueden caer en lo mismo.
- El hook de pre-commit no se puede ejecutar en este equipo (ver `DECISIONES.md`).
- Las capas de obra del visor usan cian y magenta, fuera de la regla del neón (ver `DECISIONES.md`): pendiente de decisión.
- El botón flotante «Asistente» tapa parte del panel «Color» del visor a 1440 px. Ya ocurría antes del rediseño.
