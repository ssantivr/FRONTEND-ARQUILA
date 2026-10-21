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

**Sustituida el 14 de octubre por `npm run local:wasm`.** El override viajaba en `package.json` y en `package-lock.json` hacia CI y Vercel, y revertirlo ya no era limpio: los commits posteriores también tocaron el lockfile, y `git revert` choca en él. Se consideraron tres salidas:

- Un archivo ignorado por git: npm no lee `overrides` de `.npmrc` ni de otro archivo que no sea `package.json`.
- `git update-index --skip-worktree` sobre los dos archivos: esconde el cambio, pero se puede confirmar por accidente y rompe los `pull` que toquen esos archivos.
- Un script que cambie `node_modules/rollup` después de instalar. **Elegida**, porque es la única en la que el repositorio queda exactamente como lo usan CI y Vercel. El cambio vive solo en `node_modules`, el siguiente `npm ci` lo deshace y fuera de Windows el script no hace nada. Toma la versión de Rollup instalada, así que sigue sirviendo cuando Dependabot la suba.

### Commits con `--no-verify` (fase 0)

El hook de pre-commit es un guion de `sh` y git no puede lanzarlo («cannot spawn .git/hooks/pre-commit»), por el mismo bloqueo. El hook solo pasa Prettier por `src/`, `vite.config.ts` y `eslint.config.js`. Antes de cada commit se ejecuta `npm run format:check`, que comprueba esos mismos archivos, y se confirma con `--no-verify`.

**Ya no hace falta desde el 14 de octubre:** el hook vuelve a ejecutarse y los commits de esa sesión pasaron por él, sin `--no-verify`.

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

### Validación con nodos añadidos a mano (fase 3)

`LiveForm` escribe el mensaje de error en un `span` que inserta tras el campo, fuera del control de React. La alternativa limpia, envolver cada campo en `Field`, obligaba a reescribir unos ochenta campos en catorce formularios y cambiaba su maquetación (hoy la etiqueta envuelve al control). El nodo se añade justo después del campo. Como React no lo conoce, `LiveForm` lo cuida: tras cada dibujo quita el mensaje de un campo cuyo valor cambió sin que el usuario escribiera (al cancelar o al cargar otra fila para editar).

### Recharts cargado aparte (fase 3)

Recharts añade unos 107 kB comprimidos. Va en su propio archivo (`lazy`), que el navegador solo pide en Materiales y cuando hay costos que dibujar.

### Tarjetas sin área ni niveles (fase 3)

El encargo original pedía área y número de niveles en cada tarjeta. La lista de proyectos de la API no trae esos datos y pedir el modelo de cada proyecto sería una petición por tarjeta. Queda propuesto en `CAMBIOS_BACKEND.md`.

### Límite de CLS distinto para el inicio y para el resto (fase 3b)

`npm run movimiento` exige 0,001 o menos en el inicio, que es donde el encargo pide CLS = 0, y 0,1 (el umbral «bueno» de web.dev) en las demás. Planos y Materiales quedan en 0,04 y 0,01: la tabla que llega es más alta que su marcador y empuja lo que tiene debajo. Igualarlo exige saber cuántas filas vendrán antes de pedirlas.

### La API de muestra responde tarde en esa comprobación (fase 3b)

Sin retraso, el resultado dependía de si los datos llegaban antes o después del primer dibujo: la misma pantalla daba 0,0007 en una ejecución y 0,0635 en la siguiente. Con 350 ms fijos la carga se ve siempre y la medida se repite.

### `@types/node` (fase 3b)

Dependencia de desarrollo fuera de la lista aprobada. La prueba que vigila las hojas de estilo las lee del disco, y Vitest no entrega el texto de un `.css` importado.

### Entrada del modelo 3D dentro del motor (fase 3b)

Son siete líneas en `BuildingSceneManager.ts`: la primera vez que se muestra un modelo, el despiece arranca en 0,25 y la amortiguación que ya existía lo lleva a su sitio. No se añadió el pulso del contorno de selección ni el fundido del terreno: piden tocar los materiales del motor y se dejaron para la fase 6b.

### Dónde toca el suelo a la casa en un terreno con pendiente (fase 4)

Había que elegir una altura de referencia. Si el suelo tocara el nivel 0 en el frente del lote, subiría hacia atrás y enterraría la planta baja. Se eligió el muro posterior de la edificación: el suelo cae hacia el frente bajo la casa, donde un zócalo llena el hueco, y sube por detrás. Es como se construye en ladera y nunca tapa un cuarto. El corte usa la misma referencia.

### Retiro redondeado en las esquinas entrantes (fase 4)

Un retiro medido desde el lindero da una esquina redonda junto a un vértice entrante. El disco se aproxima con un polígono de 24 lados inscrito, así que ahí el resultado es generoso en unas centésimas de metro cuadrado. Se prefirió a la alternativa de esquinas cuadradas, que quita más suelo del que el retiro exige.

### Los máximos de COS y CUS se guardan como texto (fase 4)

Para que «0.60» vuelva como «0.60» y no como «0.6» mientras se escribe.

### `allowScripts` para esbuild (14 de octubre, aprobado)

`npm ci` termina con «1 package has install scripts not yet covered by allowScripts: esbuild@0.25.12 (postinstall: node install.js)». Según la documentación de nuestra versión (npm 11.19.0, `docs/content/commands/npm-install-scripts.md` y `using-npm/config.md`), npm 11 bloquea por defecto los scripts de instalación de las dependencias. Solo los ejecuta para las que aprueba el campo `allowScripts` de `package.json`, que se mantiene con `npm install-scripts approve <paquete>`, y por defecto fija la versión (`esbuild@0.25.12`).

- **esbuild funciona sin su script.** `npx esbuild --version` da `0.25.12`, y `vite build` y Vitest pasan en Windows y en Linux. El binario llega por la dependencia opcional `@esbuild/<plataforma>`. `install.js` solo lo comprueba y lo deja a mano.
- **Aprobado y aplicado** el 14 de octubre, ligado a la versión exacta. Se escribió a mano, sin `npm install-scripts approve`, por lo de `--dry-run` de abajo. Con él, `npm ci` ya no avisa y el `postinstall` de esbuild corre. Es este bloque al final de `package.json`:

    ```diff
         "vitest": "5.0.3"
    -    }
    +    },
    +    "allowScripts": {
    +        "esbuild@0.25.12": true
    +    }
     }
    ```

    Al ir fijado a la versión, cuando Dependabot suba Vite y con él esbuild, el aviso volverá hasta aprobar la versión nueva. Para aprobar cualquier versión: `--no-allow-scripts-pin` (`"esbuild": true`).
- **Cuidado con `--dry-run`:** en npm 11.19.0, `npm install-scripts approve esbuild --dry-run` **sí escribió** el bloque en `package.json`, aunque la documentación dice que no cambia nada. Se deshizo a mano. Para ver qué falta sin tocar nada, usar `npm install-scripts ls`.

### Umbrales de cobertura por archivo (14 de octubre)

Los umbrales globales (60 % de líneas) no protegen el código del que dependen las cifras: una utilidad podía perder pruebas mientras otra pantalla las ganaba. `geometry`, `building`, `elevations`, `errors`, `appState` y `services/http` tienen cada una el suyo en `vite.config.ts`, en lo que alcanzan hoy redondeado hacia abajo (de 89 % a 100 %). Ninguno está por debajo del 80 %, y ninguno se baja.

### Callar solo el error esperado en las pruebas (14 de octubre)

Espiar `console.error` no basta: en modo desarrollo React 18 vuelve a lanzar el error capturado dentro de un evento de jsdom, y jsdom lo imprime con toda su pila si nadie cancela el evento. `src/test/expectedError.ts` cancela ese evento y calla `console.error` solo cuando el mensaje es el que la prueba provoca. Callar todo habría escondido un fallo real.

### Datos de muestra: MSW para la demo, Playwright para las pruebas (14 de octubre)

MSW se aprobó el 14 de octubre para `npm run demo`: la app en el navegador con Casa Mirador y sin backend. Se fijó en **2.15.0**. La 3.x es una versión mayor de finales de septiembre y su 3.0.3 tenía cuatro días.

- **Una sola API de muestra.** `scripts/api-de-muestra.mjs` guarda la sesión y los proyectos creados, y responde con `datos-de-muestra.mjs`. La usan MSW (`src/demo/start.ts`) y Playwright (`e2e/api.ts`), así que la demo y las pruebas ven lo mismo.
- **Las pruebas y las capturas siguen con Playwright** (`page.route`) y no se migraron a MSW. `page.route` responde desde la primera petición de cada contexto. Con MSW, cada contexto nuevo tendría que registrar el service worker y esperar a que controle la página antes de pedir nada. Además, `movimiento.mjs` mete un retraso fijo que con `page.route` es una línea.
- **Nada llega a producción.** `main.tsx` solo importa la demo cuando `MODE === "demo"`, que es una constante del build. El worker (`mockServiceWorker.js`) no se copia a `public/`: lo sirve un plugin del servidor de desarrollo, solo en ese modo. Se comprobó que `dist/` no contiene `setupWorker`, ni los datos de muestra, ni el worker.
- **El script de instalación de MSW está denegado** (`"msw": false` en `allowScripts`): solo copia el worker a la carpeta que se le configure, y aquí no hace falta.

### Capturas a 1280, 820 y 390 px (14 de octubre)

Las de la entrega, como decía la decisión 8. Antes eran 1440 × 900 y 1024 × 768. La tablet se toma en vertical (820 × 1180), que es como se usa al revisar planos.

### Radix solo en `Dialog` (20 de octubre)

`@radix-ui/react-dialog` es la única pieza de Radix y la usan `ui/Dialog`, `ui/Drawer` y `ui/ConfirmDialog` (y la paleta de comandos, a través de `Dialog`). Una ventana modal accesible tiene que mantener el foco dentro, devolverlo al control que la abrió, cerrarse con Escape y con un clic fuera, marcar `aria-modal` y dejar el resto de la página inerte para los lectores de pantalla. Escribirlo a mano es fácil de hacer mal; Radix lo resuelve en un paquete pequeño sin estilos propios, y `ui/ui.test.tsx` comprueba el foco atrapado y el cierre con Escape. El resto de las piezas (`Tooltip`, `Menu`, `ContextMenu`, `Tabs`, `SegmentedControl`, `Select`, `Toast`) son propias o nativas: con `aria-describedby`, `role="menu"`, `role="tablist"`, un `<select>` del sistema y una región `aria-live` alcanza, y no hace falta otra dependencia. No se añade ningún otro paquete de Radix.

### Solo `transform` y `opacity`, también al cambiar de tema (20 de octubre)

Los componentes de `ui/` hacían una transición de color en hover (fondo, borde y texto), y el cambio de tema fundía los colores de toda la página con `transition` sobre `background-color`, `border-color`, `color`, `fill` y `stroke`. Ahora:

- **Hover, foco y pulsación** cambian el color al instante; lo único que se anima es la pulsación (`transform`/`scale`), la flecha del botón, la barra de las pestañas, el interruptor y el progreso, todo con `transform`.
- **El cambio de tema** usa una View Transition: el navegador toma una imagen de la página con los colores anteriores y otra con los nuevos, y funde las dos cambiando su `opacity` (`motion.css`, `html[data-theme-switching]::view-transition-*(root)`). Donde no hay View Transitions (Firefox hasta hoy) o el movimiento está reducido, el tema cambia al instante. En los dos casos, sin recargar.
- Una prueba (`styles/motion.test.ts`) falla si una hoja de `components/ui/`, `foundation.css` o `motion.css` anima otra propiedad. Las hojas de la capa `legacy` y los módulos de pantallas (por ejemplo `SurfaceLibrary.module.css`) todavía tienen transiciones de color; se quitan al reconstruir cada pantalla.

### `--color-accent-hi` (20 de octubre)

El encargo pedía un token `accent-hi`. `--color-accent` ya era el lima de relleno y lo usan los componentes de R1, así que no cambia. `--color-accent-hi` es el acento **cuando tiene que verse como línea, icono o texto** sobre las superficies del tema: en oscuro es el lima (`#b8f36b`); en claro, donde el lima no se lee (1,31:1), es el verde de interacción (`#236b42`). `npm run contraste` lo comprueba sobre todas las superficies.

### Avisos con tono (20 de octubre)

`ui/Toast.tsx` es la pieza visual y `components/Toasts.tsx` la conecta con `state/toasts.ts`. `showToast(texto, tono)` admite `success` (por defecto), `error` e `info`, cada uno con un icono de forma distinta. Antes todos llevaban la marca de éxito, incluido el fallo al guardar la imagen del modelo en `StructureViewer`, que ahora usa `error`. Los errores de un formulario siguen junto al campo; el aviso es para lo que no tiene sitio propio en pantalla.

### Sin React Hook Form, Zod ni TanStack Query (21 de octubre)

Los formularios de acceso tienen como mucho tres campos. `utils/authForm.ts` repite las reglas del backend (`app/schemas.py`) y `hooks/useFieldErrors.ts` decide cuándo se ve cada error (al salir del campo con algo escrito, o al enviar). Son unas 100 líneas con pruebas; React Hook Form y Zod añadirían dos dependencias para lo mismo. La carga y los errores siguen con `useAsync` y `AsyncStatus`, que ya usan todas las pantallas: pasar a TanStack Query solo en el dashboard dejaría dos mecanismos. Se reconsidera si llega un formulario largo (proyecto con muchos campos) o caché compartida entre pantallas.
