# Scripts de comprobación que no terminan

Comprobado el 24 de octubre de 2026 en Windows con Edge, con el servidor de desarrollo en el puerto 5173, al convertir los scripts de `scripts/` a TypeScript. Las versiones `.mjs` (antes de la conversión) y `.ts` (después) fallan igual, en el mismo punto y con el mismo mensaje.

Ninguno de los dos corre en la CI: de `scripts/`, `.github/workflows/ci.yml` solo ejecuta `npm run contraste`.

## `npm run renders`

- **Mensaje.** `locator.click: Timeout 30000ms exceeded`, esperando `getByRole('button', { name: 'Paneles' })`, en `/proyectos/1/modelo-3d`. Termina con código 1.
- **Commit que cambió el control.** `d055d41` (18 de octubre de 2026, «feat(editor-3d): espacio de trabajo acoplado, mover y redimensionar cuartos, deshacer y rehacer») quitó el botón con la etiqueta `<span className="hud-label">Paneles</span>` y puso en su lugar `<div className="hud-group" role="group" aria-label="Paneles">` (`src/components/viewer/WorkspaceBar.tsx`, línea 84). «Paneles» es ahora un grupo, no un botón.
- **Archivos.** Se cae antes de escribir: `src/assets/renders/house-day.jpg` y `house-night.jpg` no cambian (mismo SHA-256 que los versionados, antes y después de la ejecución).
- **Código sin ejecutar.** Todo lo que sigue al clic en «Paneles»: acercar, desplazar la cámara, «Guardar imagen», pasar el PNG a JPEG y escribir los dos archivos. Tras la conversión a TypeScript esa parte solo se ha comprobado con `tsc -p tsconfig.scripts.json`, `stripTypeScriptTypes` y `node --check`.

## `npm run capturas`

- **Mensaje.** `locator.click: Timeout 30000ms exceeded`, esperando `getByRole('button', { name: 'Iniciar render' })`, dentro de `checkStudio`, después de pulsar «Renderizar con esta luz» en `/iluminacion`. Termina con código 1.
- **Commit que cambió el control.** `64b0727` (18 de octubre de 2026, «feat(renderizado): espacio de trabajo con pasos, estados y captura de la vista») quitó el texto `{result === null ? "Iniciar render" : "Renderizar de nuevo"}` de la pantalla de renderizado.
- **Archivos.** Con `CAPTURAS_SALIDA` apuntando a otra carpeta, escribe 109 de los 111 archivos que hay versionados en `docs/capturas/`. Faltan `comprobacion-render-pantalla.jpg` y `comprobacion-render.png`, que se escriben después del punto donde se cae.
- **Salida.** Imprime «comprobación del visor 3D:» y los nombres de las capturas, pero ninguna línea `ok`/`FALLA`: las comprobaciones se imprimen al final, después de `checkStudio`.
- **Código sin ejecutar.** El resto de `checkStudio` (esperar la imagen, comprobar que mide 1920x1080, descargarla y la última captura) y el final del script (imprimir las comprobaciones y fijar el código de salida). Tras la conversión a TypeScript esa parte solo se ha comprobado con `tsc -p tsconfig.scripts.json`, `stripTypeScriptTypes` y `node --check`.
