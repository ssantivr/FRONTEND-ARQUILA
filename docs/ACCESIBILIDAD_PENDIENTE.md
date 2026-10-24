# Accesibilidad: fallos abiertos

Salida de `npm run accesibilidad` (axe-core, reglas WCAG 2.1 A y AA) del 24 de octubre de 2026, en Windows con Edge y el servidor de desarrollo en el puerto 5173. El código de la aplicación es el de `24f5c1c`: entre ese commit y la conversión de los scripts a TypeScript, `src/` solo cambió dos `import`.

En cinco de seis ejecuciones termina con código 1 y **27 fallos graves**: 24 de `label-content-name-mismatch` y 3 de `color-contrast` (SHA-256 de la salida: `0eda6ba2ad9af3bca08711dae8d1c16e6b5b3436edfefbf1262a43548ca234cc`). En la otra da 28; ver «Fallo intermitente». Las dos pantallas de inicio de sesión pasan (24 reglas comprobadas).

El script muestra como mucho cuatro selectores por fallo (`violation.nodes.slice(0, 4)`), así que una pantalla puede tener más elementos afectados de los que aparecen aquí.

## `label-content-name-mismatch` (serious): 24 fallos

«Elements must have their visible text as part of their accessible name». Sale en los dos temas, en 12 pantallas.

| Pantalla | Ruta | Claro | Oscuro | Selector |
|---|---|---|---|---|
| inicio | `/` | sí | sí | `summary[title="Usuario demo: cuenta y sesión"]` |
| proyectos | `/proyectos` | sí | sí | `summary[title="Usuario demo: cuenta y sesión"]` |
| proyecto: terreno | `/proyectos/1/terreno` | sí | sí | `summary` |
| proyecto: materiales | `/proyectos/1/materiales` | sí | sí | `summary` |
| proyecto: modelo 3D | `/proyectos/1/modelo-3d` | sí | sí | `._trigger_1t2yq_11` |
| terrenos | `/terrenos` | sí | sí | `summary` |
| materiales | `/materiales` | sí | sí | `summary` |
| planos | `/planos` | sí | sí | `summary` |
| iluminación | `/iluminacion` | sí | sí | `summary` |
| renderizado | `/renderizado` | sí | sí | `summary` |
| tareas | `/tareas` | sí | sí | `summary` |
| configuración | `/configuracion` | sí | sí | `summary` |

Por selector: `summary[title="Usuario demo: cuenta y sesión"]`, 4 fallos; `summary`, 18; `._trigger_1t2yq_11`, 2.

## `color-contrast` (serious): 3 fallos

«Elements must meet minimum color contrast ratio thresholds». Solo en el tema claro.

| Pantalla | Ruta | Selectores |
|---|---|---|
| proyectos | `/proyectos` | `._option_iikol_19[role="radio"]:nth-child(2) > span`, `._option_iikol_19[role="radio"]:nth-child(3) > span` |
| iluminación | `/iluminacion` | `.segmented > .button-secondary:nth-child(2)`, `.button-secondary:nth-child(3)`, `.button-secondary:nth-child(4)` |
| renderizado | `/renderizado` | `div[aria-label="Vista"] > .button-secondary:nth-child(2)`, `div[aria-label="Vista"] > .button-secondary:nth-child(3)`, `div[aria-label="Vista"] > .button-secondary:nth-child(4)`, `div[aria-label="Proyección"] > .button-secondary:nth-child(2)` (cuatro mostrados) |

`npm run contraste`, que mide los pares de tokens texto/fondo de `tokens.css`, pasa en esas mismas ejecuciones.

## Fallo intermitente: `color-contrast` en la tabla del panel del modelo 3D

| Pantalla | Ruta | Tema | Selectores |
|---|---|---|---|
| proyecto: modelo 3D | `/proyectos/1/modelo-3d` | claro | `.panel._panel_1likl_1._regular_1likl_19:nth-child(4) > table > thead > tr > th:nth-child(1)` a `th:nth-child(4)` (cuatro mostrados) |

Ejecuciones del 24 de octubre, con el mismo código de la aplicación:

| Versión del script | Termina | Fallos graves | Líneas | SHA-256 de la salida |
|---|---|---|---|---|
| `accesibilidad.mjs` | mañana (dos veces) | 27 | 63 | `0eda6ba2…` |
| `accesibilidad.mjs` | 9:12 | **28** | 68 | `e199086530f1370d…` |
| `accesibilidad.ts` | 9:14 | 27 | 63 | `0eda6ba2…` |
| `accesibilidad.mjs` | 10:06 | 27 | 63 | `0eda6ba2…` |
| `accesibilidad.ts` | 10:09 | 27 | 63 | `0eda6ba2…` |

El fallo de más de la ejecución de las 9:12 es este. Aparte de él, todas las salidas son idénticas byte a byte.

**Hipótesis, sin verificar.** El script mide tras `networkidle` y una espera fija de 1,2 s (`waitForTimeout(1200)`); si el panel sigue en su animación de entrada en ese momento, el contraste calculado de sus cabeceras puede bajar de 4,5:1.
