# Progreso del rediseño

Memoria de trabajo de la rama `rediseno-ui`. Se actualiza al cerrar cada fase, para poder retomar si la sesión se corta. Las decisiones y su motivo están en `DECISIONES.md`.

## Estado

| Fase | Grupo | Estado |
|---|---|---|
| 0. Desbloqueo | Obligatorio | Hecha |
| 1. Sistema de diseño | Obligatorio | Hecha |
| 2. Navegación | Obligatorio | Hecha (punto de control 2 aprobado el 13 de octubre de 2026) |
| 3. Pantallas | Obligatorio | Hecha |
| 3b. Animaciones básicas (F1 y F2) | Obligatorio | Hecha y revisada |
| 4. Correcciones | Obligatorio | Hecha |
| 5. Datos | Deseable | En curso (datos de muestra de Casa Mirador hechos) |
| 6. Producto | Deseable | Pendiente |
| 6b. Animaciones expresivas (F3) y selector de movimiento | Deseable | Pendiente: falta recibir la especificación de F3 y del selector |
| 7. Calidad | Obligatorio | En curso: CI, cobertura, e2e, carga bajo demanda y cabeceras hechos; falta la revisión independiente |
| 8. Entrega | Obligatorio | Pendiente (capturas a 1280, 820 y 390 px ya regeneradas) |

Opcional (Sentry, Storybook, Docker, Web Worker, Lighthouse CI): sin empezar.

Si falta tiempo se sacrifica en este orden: lo opcional, la fase 6b, lo avanzado de la fase 3b (puntos 11 a 13 de F2), la fase 6, la fase 5, el GIF y los CSS Modules más allá de `ui/`.

Revisión independiente: al cerrar las fases 2, 3b y 7.

## Encargo del 18 de octubre de 2026: cerrar huecos y pulir

Encargo nuevo, con su complemento, sobre la misma rama: no reconstruir, sino cerrar lo que falta frente a una apariencia de software profesional de arquitectura. Tiene su propia numeración de fases, distinta de la tabla de arriba.

| Fase | Estado |
|---|---|
| 1. Auditoría | Hecha: informe en la conversación, sin cambios en el código |
| 2. Sistema visual (bloques A, B y C) | Hecha |
| 3. Login y dashboard (bloques A y B) | Hecha |
| 4. Proyectos (con cronograma), materiales y terrenos | Pendiente: espera el «continúa» |
| 5. Editor 3D (mover y redimensionar cuartos), planos e iluminación (sol por fecha) | Pendiente |
| 6. Renderizado y recorridos con datos del proyecto | Pendiente |
| 7. Responsive, accesibilidad, animación de entrada, preferencias | Pendiente |
| 8. Pruebas, capturas y guía de VS Code | Pendiente |

Antes de empezar se confirmaron, a petición, los 8 archivos que había sin confirmar (`f01d515`, altura del visor y encuadre).

### Fase 2. Sistema visual y navegación

| Bloque | Commit | Qué |
|---|---|---|
| A | `80a2788` | Paleta del encargo, paneles sólidos sin desenfoque, sombras discretas, filas con `--row-height` y densidad compacta |
| B | `f3b4a21` | `Drawer`, `ConfirmDialog`, `SegmentedControl`, `Switch`, `Spinner`, `SaveIndicator`, `DataTable` y `FilterBar`, con pruebas y en `/design-system` |
| C | `93b1bbf` | `TopBar`, `MobileNav`, asistente y estado de guardado en la barra superior, barra lateral plana con flechas y nombres al contraerse |

Detalle y decisiones en `FRONTEND.md`, «Sistema visual y navegación».

Pruebas adaptadas, no eliminadas:

- `GlobalSearch.test.tsx`: buscaba el botón por «Abrir la paleta de comandos»; ahora su nombre es «Ctrl K: abrir la paleta de comandos» y la prueba comprueba además que empieza por el texto visible.
- `e2e/flujos.spec.ts`, tema: pulsaba el botón «Modo claro» (`aria-pressed`); ahora pulsa la opción «Tema claro» del grupo «Tema» y comprueba cuál está marcada.

Resultados al cerrar el bloque C:

| Comando | Resultado |
|---|---|
| `npm run lint` | sin errores ni avisos |
| `npm test` | `Test Files 52 passed (52)`, `Tests 369 passed (369)` (antes 50 y 344) |
| `npm run build` | `✓ built in 9.00s`; `index` 144,37 kB (44,46 kB gzip), CSS 125,63 kB (25,46 kB gzip) |
| `npm run contraste` | `Todos los pares llegan a 4.5:1.` |
| `npm run test:e2e` | `8 passed (1.1m)` |

Revisión visual: Inicio, Proyectos, pestaña Materiales, Modelo 3D y Configuración a 1280, 820 y 390 px, claro y oscuro, en el scratchpad de la sesión (no en `docs/capturas/`). Visto sin corregir: a 820 px la tabla de materiales del proyecto se sale de su panel (fase 4).

También: `.vscode/extensions.json` con ESLint y Prettier recomendados. `.gitignore` ignoraba toda la carpeta `.vscode/`; ahora ignora su contenido salvo ese archivo.

No hubo revisión independiente en esta fase.

### Fase 3. Inicio de sesión y dashboard

| Bloque | Commit | Qué |
|---|---|---|
| A | `c8cb02e` | Pantalla de acceso dividida (formulario primero en la página, render entero, texto sobre verde sólido), ojo en el campo de contraseña, botón con carga, animación de entrada del logotipo |
| B | `9402e69` | Héroe con el render a la vista, cifras de `/summary` en tarjetas aparte, plural corregido, «Crear proyecto» abre el formulario, «Eliminar…» con confirmación, accesos rápidos sin cortar |

Detalle en `FRONTEND.md`, «Inicio de sesión y dashboard». «Recordar sesión» no está: la API no lo soporta (`CAMBIOS_BACKEND.md`, punto 7).

Pruebas adaptadas, no eliminadas:

- `LoginPage.test.tsx`: el botón del ojo se buscaba por «Mostrar» y «Ocultar»; ahora tiene un solo nombre, «Mostrar contraseña», y la prueba comprueba `aria-pressed`.
- `HomePage.test.tsx`: esperaba «1 archivados» y ahora espera «1 archivado»; el botón «Abrir el visor 3D» pasó a ser «Explorar proyectos», y «Crear proyecto» llama a `onCreateProject`.

Pruebas nuevas: `AuthScreen` (3), `BrandIntro` (4), `LoginPage` (2: correo inválido al salir del campo y sin casilla de recordar) y `HomePage` (eliminar solo tras confirmar).

Resultados al cerrar cada bloque:

| Comando | Bloque A | Bloque B |
|---|---|---|
| `npm run lint` | sin errores ni avisos | sin errores ni avisos |
| `npm test` | `54 passed`, `378 passed` | `54 passed`, `379 passed` |
| `npm run build` | `✓ built in 9.12s`, `index` 146,97 kB | `✓ built in 11.58s`, `index` 149,61 kB (46,73 kB gzip) |
| `npm run contraste` | `Todos los pares llegan a 4.5:1.` | igual |
| `npm run test:e2e` | `8 passed (51.6s)` | `8 passed (1.1m)` |

Revisión visual (capturas en el scratchpad de la sesión, no en `docs/capturas/`): inicio de sesión e inicio a 1280, 820 y 390 px en los dos temas. La animación de entrada se comprobó en el navegador: a los 380 ms está en pantalla, al segundo ha desaparecido y al recargar en la misma pestaña no vuelve.

No se ejecutó `npm run movimiento` (CLS). La fila de cifras del inicio guarda 124 px mientras carga, pero no se midió.

La tabla de materiales a 820 px no se corrigió: no era un cambio pequeño (medidas en `FRONTEND.md`). Pasa a la fase 4.


## Antes de fusionar o desplegar

- ~~Revertir el commit `chore(local): rollup wasm por Smart App Control`~~. Ya no hace falta: `546f590` sacó el override del repositorio (ver la sesión del 14 de octubre). El commit `06851ba` sigue en el historial, pero desde `546f590` ni `package.json` ni `package-lock.json` lo llevan.
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

## Fase 3. Pantallas (13 de octubre de 2026)

- Miniatura real del modelo 3D en las tarjetas de proyecto, guardada en este navegador.
- Costo por categoría con Recharts en Materiales (pantalla general y pestaña del proyecto), con tabla equivalente para lectores de pantalla.
- Validación en vivo por campo en los catorce formularios (`LiveForm`).
- Red de seguridad propia del visor: fallo al dibujar y pérdida de contexto WebGL, con «Volver a cargar el modelo».
- `docs/CAMBIOS_BACKEND.md` creado con las dos primeras propuestas (portada y cifras de la lista de proyectos).

No hecho: área y número de niveles en las tarjetas (necesita backend).

Resultado: ver el commit de la fase; `Test Files 44 passed`, `Tests 277 passed`.

## Fase 3b. Animaciones básicas (13 de octubre de 2026)

- `styles/motion.css`: las tres curvas, los keyframes compartidos y el único interruptor de movimiento reducido. Ninguna otra hoja define curvas, keyframes ni duraciones a mano; lo vigila `styles/motion.test.ts`.
- F2.1 cambio de ruta (View Transitions donde existen; si no, la pantalla sube 8 px, también con el botón atrás), F2.2 ventanas, menús, ayudas y paleta con escala 0,96 y salida más rápida, F2.3 paneles del visor que se deslizan con `transform`, F2.4 listas escalonadas a 35 ms (ocho como máximo) y tarjetas que suben 2 px, F2.5 brillo de carga y fundido del contenido, F2.6 avisos con barra de tiempo, pausa y salida, F2.7 botón que pasa de «Guardando…» a «Guardado», F2.8 cambio de tema, F2.9 subrayado de pestañas solo con `transform`, F2.10 mensaje de error con fundido y sacudida del campo.
- Avanzado: F2.11 conteo en «Ocupación del lote» (además del que ya tenía el inicio) y barras de gráficos y de progreso que se dibujan; F2.12 entrada del modelo 3D (los niveles se asientan); F2.13 cotas de las plantas que se trazan, solo en pantalla.
- Demos en `/design-system`, sección «Movimiento» en `FRONTEND.md` y `npm run movimiento`.
- Las pantallas reservan su forma final mientras cargan (Inicio, Proyectos, Terrenos, Materiales, Modelo 3D).
- Capturas regeneradas con movimiento reducido (99 imágenes) y las ocho comprobaciones del visor en verde.

No hecho de lo avanzado: el pulso del contorno de selección y el fundido del terreno en el visor (piden tocar los materiales del motor; pasan a la fase 6b), y el trazado de cotas en el plano de implantación y en las fachadas (solo se hizo en las plantas).

Sin ver en pantalla: la entrada del modelo 3D. Está en el motor y sus pruebas no lo ejecutan; en las capturas no aparece porque se toman con movimiento reducido. El trazado de las cotas sí se comprobó en el navegador (animación `draw-line` de 0,6 s activa).

### La comprobación que detuvo la fase

`npm run movimiento` falló tres veces seguidas y el trabajo se detuvo por la regla de parada; se reanudó con autorización.

| Intento | Qué falló | Qué se hizo |
|---|---|---|
| 1 | Materiales (CLS 0,0148) y Terrenos (0,2240) | Reservar en Terrenos cifras, filtros, lista y detalle durante la carga; placeholders en la banda de Materiales |
| 2 | Inicio (0,0635), Materiales (0,0909), Terrenos (0,0303), Configuración (0,0011) | El resultado dependía de la velocidad de la ejecución: la API de muestra pasó a responder con 350 ms de retraso fijo; se reservó el sitio en Inicio, Proyectos, Modelo 3D y Materiales |
| 3 | Solo Inicio: CLS 0,0012 | Diagnóstico: la franja de cifras de la portada medía 135 px con su marcador de carga y 123 px con las cifras, y como va anclada abajo se movía 12 px. Se le dio alto fijo |
| 4 | Nada | Inicio, Proyectos, Modelo 3D, Terrenos y Configuración en 0,0000; Planos 0,0414 y Materiales 0,0131 |

Resultado al cerrar: `format:check` y `lint` limpios, `Test Files 46 passed (46)`, `Tests 292 passed (292)`, `✓ built in 19.85s` (`index` 430,15 kB, 134,28 kB gzip).

### Revisión independiente de las fases 3 y 3b

Segundo agente, que solo vio el diff `fda2338..a70fb50` y el encargo. Cuatro hallazgos graves, todos corregidos:

| Hallazgo | Resultado |
|---|---|
| Con View Transitions el navegador capturaba la pantalla anterior como si fuera la nueva (el router aplazaba su actualización) | Corregido: `BrowserRouter useTransitions={false}`. Comprobado en Edge: al empezar la transición el título ya es el de la pantalla nueva |
| El contenido se animaba dos veces al terminar cada transición | Corregido: se quitó el atributo que apagaba y volvía a encender la subida. Comprobado: no queda ninguna animación al acabar |
| La transición movía toda la ventana, cabecera y menú incluidos | Corregido: solo cruza el área de contenido (`view-transition-name`) |
| Un aviso cerrado dos veces se quedaba para siempre, invisible y tapando clics | Corregido y con prueba |

De gravedad media:

| Hallazgo | Resultado |
|---|---|
| Una ventana podía quedarse a medio cerrar si su animación no terminaba | Corregido: un límite de 400 ms la cierra de todos modos |
| Mensajes de validación viejos al cancelar o cargar otra fila | Corregido y con prueba; además el campo ya no se valida al pasar a un botón de su formulario |
| El cambio de tema se animaba con movimiento reducido | Corregido y con prueba |
| «Guardando…/Guardado» dependía de dónde estaba el foco (falla en Safari) | Corregido: el formulario avisa cuando se envía. El resultado se anuncia a lectores de pantalla |
| Pausa de avisos incoherente entre el reloj y la barra | Corregido: se guardan las causas (cursor, foco) y la barra dura lo mismo que el reloj |
| El gráfico solo mostraba el porcentaje al pasar el cursor, y un fallo al cargarlo tumbaba la pantalla | Corregido: el porcentaje va junto al importe y, si el gráfico no carga, se ve una lista con las mismas cifras |

Menores corregidos: el desplazamiento suave de seis paneles ahora respeta el interruptor de movimiento; el conteo de cifras continúa desde lo que muestra en vez de volver a cero; COS y CUS con coma decimal; el estado pulsado usa `scale` y no pisa otros `transform`; transiciones sin curva en `base.css` y `shell.css`.

No corregido, con su motivo:

- «Guardando…/Guardado» solo está en los formularios de las pestañas del proyecto. Crear proyecto, Tareas, Recomendaciones y «Agregar obra» usan otro mecanismo de envío; llevarlo allí pide unificar cómo se envían, que es trabajo de la fase 5 (TanStack Query).
- CLS fuera del inicio: Planos 0,0414 y Materiales 0,0131. Con más de tres categorías el gráfico es más alto que su marcador.
- Demos de `/design-system`: hay ocho; faltan las que necesitan una pantalla entera (cambio de ruta, paneles del visor, entrada del modelo, cotas).
- La entrada del modelo hace bajar los niveles hasta su sitio en vez de subirlos, y un modelo de un solo nivel no muestra nada.
- `motion.test.ts` no ve duraciones escritas en TS ni exige una curva en cada transición.
- Miniaturas: no se borran al cerrar sesión ni al eliminar un proyecto. Se resuelve con la portada en el backend.
- Varios mensajes de error a la vez se anuncian todos (`role="alert"` en cada uno).

## Fase 4. Correcciones (13 de octubre de 2026)

| Limitación | Qué se hizo |
|---|---|
| Contorno que se cruza a sí mismo | `selfIntersection`: el formulario no deja guardar y dice qué lados se cortan |
| Vértices al deshacer la eliminación de un terreno | La interfaz los recuerda y los reenvía tras deshacer; propuesto al backend |
| Área edificable en lotes irregulares | `buildableArea` con `polygon-clipping`, para cualquier forma; avisa si el retiro parte el lote |
| Cuartos solapados | El área de cada nivel es la unión de sus cuartos; aviso con los pares que se solapan |
| Retiro, norte y máximos de COS y CUS | Recordados por proyecto en `localStorage`; propuesto al backend |
| Pendiente en el 3D y en el corte | Terreno cizallado, zócalo bajo la planta baja, árboles y borde del lote sobre la pendiente; el corte dibuja el suelo inclinado |

Visto en el navegador con los datos de muestra (lote de cinco vértices con pendiente del 4 %): el plano de implantación da 233,6 m² edificables de 480 m², el modelo muestra el zócalo y el corte el terreno inclinado, sin errores en la consola.

Resultado: `format:check` y `lint` limpios, `Test Files 49 passed (49)`, `Tests 338 passed (338)`, build correcto.

Sin regenerar: las capturas de `docs/capturas/` son de la fase 3b. Se rehacen todas en la fase 8, con los datos de Casa Mirador.

## Sesión del 14 de octubre de 2026: cierre de pendientes

Al empezar había 15 archivos modificados y 7 nuevos sin confirmar, de trabajo de las fases 5 y 7. Se repartieron en commits por tema y se cerró lo que quedaba a la vista. No hubo revisión independiente en esta sesión: la siguiente toca al cerrar la fase 7.

| Commit | Qué |
|---|---|
| `d83fd55` build(deps) | Playwright, cobertura v8, jest-axe y el visor del paquete |
| `152aa93` feat(muestra) | Datos de muestra de Casa Mirador (fase 5) |
| `274bc00` perf(carga) | Pantallas bajo demanda y bibliotecas en archivos propios |
| `4330776` test | Cobertura con umbrales, axe en unitarias y flujos e2e en CI |
| `dee75a3` feat(seo) | Título y vista previa Open Graph |
| `12c41eb` chore(seguridad) | CSP y cabeceras en Vercel |
| `295b661` ci(deps) | Dependabot |
| `546f590` build(local) | Fuera el override de Rollup WASM; `npm run local:wasm` en su lugar |
| `5bf4140` test(cobertura) | Umbrales por archivo para las utilidades críticas |
| `e35dd0e` test | Solo se callan los errores esperados en la salida de las pruebas |
| `12363af` test(e2e) | Cambio de tema y paleta con Ctrl+K y Cmd+K |

- **Override de Rollup.** El commit `06851ba` no se podía revertir sin conflictos: probado con `git revert --no-commit` en un worktree aparte, choca en `package-lock.json`. Se sacó del repositorio (`546f590`) y se sustituyó por `npm run local:wasm`, que cambia `node_modules/rollup` solo en el equipo que lo necesite. Con el lockfile nuevo (Rollup 4.64.6), el binario nativo carga en este equipo y no hace falta el script, aunque el registro marca Smart App Control como activo.
- **CI sin el override, en Linux.** Clon limpio de la rama en WSL2 (Ubuntu 26.04, Node 24.22.0 para Linux): los siete pasos del job `frontend` y los 6 flujos del job `e2e` pasan, con `rollup-linux-x64-gnu`. No es idéntico a GitHub Actions: `ubuntu-latest` es 24.04, y sin sudo las cuatro bibliotecas del navegador (`libnss3`, `libnspr4`, `libnssutil3`, `libasound`) se desempaquetaron a mano en lugar de instalarlas con `--with-deps`.
- **Cobertura.** Las seis utilidades críticas ya pasaban del 80 % (la más baja, `elevations.ts`, con 89,28 % de ramas). Quedaron con umbrales por archivo; se comprobó que un umbral por encima de lo real hace fallar `test:cobertura`. El 61 % global lo bajan componentes y pantallas.
- **Salida de las pruebas.** «Error: boom» y «Error: sin gráfico» salían aunque `console.error` estaba espiado: los imprime jsdom al ver el error que React 18 relanza en un evento. `silenceExpectedError` cancela ese evento solo para el mensaje esperado; se comprobó que otro error sí sale.
- **e2e.** 8 flujos (antes 6). El nuevo de tema falló una vez porque leía el fondo antes de que se asentara; se corrigió la prueba, no la app.
- **Aviso de esbuild.** Ver `DECISIONES.md`. Pendiente de aprobación el cambio en `allowScripts`.

### Verificación visual

`npm run capturas` con los datos de muestra (Playwright responde la API; no hay MSW en el proyecto): 111 imágenes en `docs/capturas/`, a 1280 × 800, 820 × 1180 y 390 × 844 en los dos temas, y las ocho comprobaciones del visor en verde. Revisadas a ojo y con una auditoría del DOM en las 15 pantallas y los tres tamaños (cifras sin la fuente mono, texto recortado, desplazamiento horizontal, controles bajo el botón «Asistente», anillo de foco en las primeras 12 paradas del teclado). `npm run accesibilidad` (axe-core en el navegador) también.

Bien: ninguna pantalla se desplaza en horizontal; todas las paradas de teclado probadas muestran el foco; axe no encuentra ningún fallo de contraste.

Mal, sin corregir:

| Dónde | Qué |
|---|---|
| Todas las pantallas con sesión | axe `label-content-name-mismatch` (grave): el botón «Ctrl K» del buscador se llama «Abrir la paleta de comandos» y no incluye el texto que se ve (WCAG 2.5.3). `npm run accesibilidad` no corre en CI |
| ~~Inicio de sesión, 390 px~~ | ~~La insignia tapa el logotipo~~. Resuelto en la fase 3 del 18 de octubre: el logotipo va sobre el formulario y la insignia sobre la imagen |
| ~~Inicio~~ | ~~«1 activos»~~. Resuelto en la fase 3 del 18 de octubre |
| Inicio, 1280 px | «22.124,00 US$» queda casi pegado al borde derecho de la tarjeta |
| ~~Inicio, todos los tamaños~~ | ~~Accesos rápidos cortados~~. Resuelto en la fase 3 del 18 de octubre: hasta dos líneas |
| Materiales, Planos, Elevaciones, Modelo 3D | El botón flotante «Asistente» tapa controles al abrir: Editar/Eliminar de la primera fila, «Lateral der.» y «Corte», el selector de cubierta |
| Cifras sin JetBrains Mono | Total de Materiales del proyecto (`th` «20.156,00 US$»), columna Nivel de Planos, áreas de la tabla de cuartos del Modelo 3D, área y pendiente del detalle en Terrenos, total de Materiales y presupuestos de Tareas (`dd`) |
| Modelo 3D, 1280 × 800 | El visor empieza a 380 px de altura: al abrir solo se ve su mitad superior |
| Recorrido, 1280 px | «6 × 5 × 2,8 m» del inspector parte la «m» a otra línea |
| Renderizado, 390 px | Franja vacía de unos 85 px sobre la imagen |
| Tareas | «6 tareas» arriba y «Terminadas 1 de 5»: sin revisar si es correcto (una tarea puede no contar) |

## Problemas abiertos

- Smart App Control: el 13 de octubre bloqueaba el Rollup nativo 4.64.0 y `sh.exe` de Git; el 14 cargan el Rollup nativo 4.64.6 y el hook de pre-commit. No se sabe si cambió la reputación de esos binarios o algo del equipo. Si vuelve a bloquear, `npm run local:wasm`.
- Las capas de obra del visor usan cian y magenta, fuera de la regla del neón (ver `DECISIONES.md`): pendiente de decisión.
- ~~El botón flotante «Asistente» tapa controles en varias pantallas~~. Resuelto en la fase 2 del 18 de octubre: el botón está en la barra superior.
- ~~axe `label-content-name-mismatch` en el botón «Ctrl K»~~. Resuelto en la misma fase.
