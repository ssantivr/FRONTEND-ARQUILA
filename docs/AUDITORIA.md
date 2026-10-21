# Auditoría del frontend

Fecha: 20 de octubre de 2026. Rama `rediseno-final`, HEAD `f31a47d`, árbol limpio. Esta auditoría no cambia código: solo añade este archivo.

## 0. Fuentes y huecos

- **`docs/PROMPT_MAESTRO.md` no existe.** El documento que hace ese papel es `docs/DISENO_ARQUILA.md`, cuyo título es «PROMPT MAESTRO — REDISEÑO COMPLETO DE ARQUILA» (paleta, módulos, reglas de no simular y plan en 8 fases). Es el que se usa aquí, junto con las reglas del encargo: paleta `#0B211A` / `#12382A` / `#236B42` / `#B8F36B`, sin datos inventados, sin botones falsos, respetar el backend y la cookie `HttpOnly`.
- **`docs/API_CONTRATO.md` no existe** ni en el frontend ni en `BACKEND-ARQUILA`. El contrato se reconstruyó con `BACKEND-ARQUILA/docs/BACKEND_Y_API.md` y con los decoradores de rutas de `BACKEND-ARQUILA/app/api/**` y `app/main.py`. Conviene generar ese archivo desde el OpenAPI del backend (`/openapi.json`) antes de la fase R4 (ver §8).
- Contexto previo: `docs/PROGRESO.md` (R1 hecha, R2 a R9 pendientes), `docs/DECISIONES.md`, `docs/FRONTEND.md`, `docs/CAMBIOS_BACKEND.md` (16 peticiones al backend con su apaño actual).

## 1. Estado del repositorio

| Elemento | Estado |
|---|---|
| Rama actual | `rediseno-final`, sincronizada con `origin/rediseno-final` |
| Último commit | `f31a47d Revert "wip: recorridos (para R7)"` |
| Trabajo de Recorridos | En la rama `wip-recorridos` (`930930f`: `TourPage.tsx` 642 líneas, `utils/tour.ts`, `PlanThumb.tsx`, `tour.css`, e2e) y en `stash@{0}` «wip-recorridos». No está en `rediseno-final`. |
| Otras ramas | `main`, `rediseno-ui`, `santiago`, dos `respaldo-rediseno-ui-2026-10-13*` |
| Archivos ignorados | `.env.local` (solo `VERCEL_OIDC_TOKEN`, sin prefijo `VITE_`: no llega al bundle), `dist/`, `coverage/`, `test-results/` |
| Capturas versionadas | 153 archivos en `docs/capturas*` |

## 2. `package.json`

**Scripts:** `dev`, `demo` (MSW con datos de muestra de «Casa Mirador», sin backend), `build` (`tsc --noEmit && vite build`), `typecheck`, `test` (Vitest), `test:cobertura`, `test:e2e` (Playwright), `analizar`, `lint`, `format`/`format:check`, y comprobaciones propias en `scripts/`: `capturas`, `accesibilidad`, `contraste`, `movimiento` (CLS y movimiento reducido), `renders`, `favicon`, `local:wasm`.

**Dependencias de ejecución (10), todas con versión exacta (`.npmrc` `save-exact`):**

| Paquete | Uso real | Valoración |
|---|---|---|
| `react`, `react-dom` 18.3.1 | Base | Necesario |
| `react-router` 7.18.4 | Lectura de la URL; las rutas se resuelven a mano en `routes.ts` | Necesario |
| `three` 0.186.1 | Visor, editor, iluminación, renderizado, recorrido | Necesario; es el chunk más pesado (671 kB, 172 kB gzip), cargado bajo demanda |
| `recharts` 3.10.1 | Solo `CostChart` | Pesa 357 kB (105 kB gzip) para un gráfico. Candidato a sustituir por SVG propio (ya hay utilidades en `utils/svg.ts`); se carga aparte (`DECISIONES.md`) |
| `@radix-ui/react-dialog` 1.3.1 | `ui/Dialog`, `Drawer`, `ConfirmDialog` | Justificado (foco, Escape, `aria-modal`) |
| `lucide-react` 1.56.0 | Iconos vía `components/Icon.tsx` | Justificado |
| `polygon-clipping` 0.15.7 | Retiros y ocupación de lotes no rectangulares | Justificado |
| `@fontsource-variable/inter`, `jetbrains-mono` | Fuentes alojadas en el proyecto (la CSP prohíbe fuentes externas) | Justificado |

**Desarrollo:** Vite 6.4.3, TypeScript 5.9.3, ESLint 10 + typescript-eslint + react-hooks, Prettier, Vitest 5 + Testing Library + jsdom + jest-axe/axe-core, MSW 2 (demo y pruebas), Playwright 1.64, `rollup-plugin-visualizer`. Nada sobra a primera vista.

**Recomendación:** no añadir dependencias en el rediseño. Las piezas que pide el prompt maestro (menús, tooltips, tabs, segmentados, tablas, cámara, selector de materiales) ya existen en `src/components/ui/`.

## 3. Rutas

Definidas en `src/routes.ts` (no hay `<Routes>`: `App.tsx` lee `location.pathname` con `parsePath`).

| URL | Pantalla | Carga |
|---|---|---|
| `/` | `HomePage` | Con la app |
| `/proyectos` | `ProjectsPage` | Con la app |
| `/proyectos/:id/:sección` (`terreno`, `planos`, `modelo-3d`, `elevaciones`, `materiales`, `analisis`, `archivos`, `asistente`) | `ProjectDetailPage` | Diferida |
| `/terrenos`, `/materiales`, `/planos`, `/iluminacion`, `/renderizado`, `/tareas`, `/configuracion` | Página propia | Diferida |
| `/visor`, `/asistente` | `ProjectToolPage` (elige proyecto y monta el visor o el asistente) | Diferida |
| `/recorrido` | `InteriorPage` | Diferida |
| `/design-system` | `DesignSystemPage` | Solo en desarrollo |
| `?reset_token=` en cualquier URL | `ResetPasswordPage` | Con la app; el token se quita de la barra al leerlo |
| Desconocida | «Página no encontrada» | — |

`/proyectos/:id/modelo` (antigua) se reescribe a `modelo-3d` sin entrada de historial. Sin sesión (401) se muestra el login **sin cambiar la URL**. `vercel.json` reenvía `/api/*` al backend y el resto a `index.html`, y fija CSP y cabeceras de seguridad.

## 4. Páginas (`src/pages/`)

| Página | Líneas | Datos | Estado |
|---|---|---|---|
| `LoginPage` | — | `authApi.login/register/requestPasswordReset` | Funciona. Sin «Recordar sesión» porque el backend no lo admite (`CAMBIOS_BACKEND.md` §7) |
| `ResetPasswordPage` | — | `confirmPasswordReset` | Funciona |
| `HomePage` | 469 | `summaryApi`, `projectsApi` | Funciona; cifras reales de `/summary` |
| `ProjectsPage` | 526 | proyectos, plantillas, resumen, tareas de cada proyecto | Funciona: cuadrícula, lista, cronograma. Sin duplicar ni tipo (no hay backend) |
| `ProjectDetailPage` | 370 | proyecto, deshacer, archivos y paneles por sección | Funciona |
| `TerrainsPage` | 437 | terrenos de todos los proyectos (N peticiones) | Funciona |
| `MaterialsPage` | — | materiales de todos los proyectos + superficies del motor | Funciona; controles PBR deshabilitados con motivo |
| `PlansPage` | 360 | estructura + terrenos | Funciona: láminas, zoom, medir, SVG, PDF por impresión; 9 herramientas de dibujo deshabilitadas con motivo |
| `LightingPage` | 342 | estructura + terrenos; luz en `localStorage` | Funciona; sol NOAA con coordenadas reales |
| `RenderPage` | 721 | visor | Funciona como «Captura de la vista» y lo dice; no es fotorrealista |
| `InteriorPage` | — | **Ninguno**: escena de loft fija | Rotulada «Escena de muestra». Choca con la regla «sin datos inventados» (§6) |
| `TasksPage` | 418 | `interior-walkthrough` de cada proyecto | Funciona (crear tarea, cambiar estado) |
| `ProjectToolPage` | — | elige proyecto | Funciona |
| `SettingsPage` | — | `/health`, `/assistant/status`, `requestPasswordReset` | Funciona; preferencias en el navegador |
| `DesignSystemPage` | 630 | — | Herramienta de desarrollo, excluida del build |

## 5. Componentes, motor 3D, servicios, estado y hooks

**`components/ui/` (≈40 componentes, cada uno con su `.module.css`).** Hechos en R1 con el sistema «Blueprint premium»: `Button`, `IconButton`, `Input`, `Field`, `Menu`, `ContextMenu`, `Tooltip`, `Tabs`, `SegmentedControl`, `Dialog`, `Drawer`, `ConfirmDialog`, `DataTable`, `FilterBar`, `EmptyState`, `Skeleton`, `Loader`, `Spinner`, `ProgressBar`, `SaveIndicator`, `PropertyPanel`, `MaterialPicker`, `CameraControls`, `Quantity`, `Range`, `Switch`, `Tag`, `Badge`, `Kbd`, `MetricCard`, `Panel`, `Card`, `Breadcrumbs`, `Logo` y `Blueprint` (motivo de plano). Con pruebas (`ui.test.tsx`, `identity.test.tsx`, `LiveForm.test.tsx`). **Reutilizables tal cual.**

**`components/viewer/`:** `Toolbar`, `ToolRail`, `ObjectTree`, `ScenePanel`, `TransformPanel`, `StatusBar`, `ViewBar`, `ViewGizmo`, `WorkspaceBar`, `ShortcutsDialog`, `ViewerBoundary`. Reutilizables; la mayoría aún con estilos `legacy`.

**Componentes de dominio (~70):** paneles por sección (`TerrainsPanel`, `PlansPanel`, `ElevationsPanel`, `RoomsPanel`, `ComponentsPanel`, `MaterialsPanel`, `FilesPanel`, `RecommendationsPanel`, `AssistantPanel`, `RoomWorksPanel`, `StructurePanel`…), dibujos SVG (`FloorPlan`, `SitePlan`, `ElevationDrawing`, `TerrainDiagrams`, `PlanViewport`), envoltorios del visor (`StructureViewer` 1431 líneas, `LitModel`, `ProjectModel`, `ProjectPreview`, `Terrain3D`, `InteriorViewer`), shell (`Sidebar`, `TopBar`, `MobileNav`, `CommandPalette`, `GlobalSearch`, `Toasts`, `BrandIntro`). La lógica es reutilizable; la capa visual es la que se reconstruye en R2 a R8.

**`three/`:** `BuildingSceneManager.ts` (2106 líneas: escena, cámara, selección, capas, cubierta, superficies, sol, sombras, captura), `cameraRig`, `postprocessing`, `lightingPalette`, `patterns`, `vegetation`, `roomGeometry` (con pruebas), `dispose` (con pruebas; la liberación de recursos se midió en `PROGRESO.md`), `interior/` (escena de loft, cámara de primera persona con pruebas, texturas, ciudad de fondo). **Se conserva**; partir `BuildingSceneManager` solo si una fase lo necesita.

**`services/`:**
- `http.ts`: `fetch` con `credentials: "include"` (cookie `HttpOnly`, el script nunca ve el token), errores `ApiError` con el `detail` de FastAPI, evento `arquila:session-ended` en 401 fuera de `/auth/*`, `onWrite` para invalidar cachés, subida `multipart`.
- `api.ts`: un objeto por recurso (ver §6). `loadAcrossProjects` (caché de 30 s) suple la falta de rutas globales de terrenos, materiales y tareas. `structureApi.get` completa `slope_percent` si falta.
- `terrainUndo.ts`: guarda los vértices de un terreno en `sessionStorage` para devolverlos tras deshacer (`CAMBIOS_BACKEND.md` §3).

**`state/`:** almacenes pequeños sin librería (`useSyncExternalStore`): `theme`, `motion`, `toasts`, `saveStatus`, `projectSave`, `lighting`, `siteSettings`, `thumbnails`, `appState`, `topBarSlot`, `viewTransition`. Con pruebas. Varios guardan en `localStorage` lo que el backend aún no guarda (portadas, retiro y norte, luz, favoritos).

**`hooks/`:** `useAsync`, `useEditHistory` (deshacer/rehacer del editor, con pruebas), `useProjectSearch`, `useProjectChoice`, `useFavorites`, `useMediaQuery`, `useSolarSite`, `useAnimatedClose`.

**`utils/`:** geometría, polígonos, ajuste a cuadrícula, aberturas, elevaciones, iluminación solar, materiales, tareas, cronograma, formatos y errores. Casi todo con pruebas. Reutilizable.

**Estilos:** `styles/index.css` ordena dos capas: `foundation` (tokens, base, movimiento) y `legacy` (27 hojas del diseño anterior, ~8 200 líneas). Los módulos CSS (~4 700 líneas) van sin capa y ganan. La paleta del encargo está en `tokens.css` (`--color-surface-inverse: #0b211a`, `--brand-forest-raised: #12382a`, `--color-action: #236b42`, `--color-accent: #b8f36b`). No hay colores hexadecimales sueltos en CSS fuera de `tokens.css`; en TS solo en `utils/drawingPalette.ts` (16, colores de dibujo técnico) y `DesignSystemPage` (4).

## 6. Uso de la API

Base: `VITE_API_URL` (por defecto `/api`). Vite (`API_PROXY_TARGET`, por defecto `http://localhost:8000`) y Vercel quitan `/api` y reenvían al backend. Las rutas v1 se piden como `/api/api/v1/...`, que llega al backend como `/api/v1/...`: correcto, aunque se lee raro.

### 6.1 Endpoints que usa hoy

| Recurso | Rutas usadas |
|---|---|
| Salud | `GET /health` |
| Sesión | `GET /auth/me`, `POST /auth/register`, `/auth/login`, `/auth/logout`, `/auth/password-reset`, `/auth/password-reset/confirm` |
| Proyectos | `GET/POST /projects`, `GET/PATCH/DELETE /projects/{id}` |
| Plantillas | `GET /templates`, `POST /templates/{id}/projects` |
| Resumen | `GET /summary` |
| Terrenos | `GET/POST /projects/{id}/terrains`, `PATCH/DELETE /terrains/{id}` |
| Materiales de obra | `GET/POST /projects/{id}/materials`, `PATCH/DELETE /materials/{id}` |
| Planos | `GET/POST /projects/{id}/plans`, `PATCH/DELETE /plans/{id}` |
| Elevaciones | `GET/POST /projects/{id}/elevations`, `PATCH/DELETE /elevations/{id}` |
| Cuartos | `GET/POST /projects/{id}/rooms`, `PATCH/DELETE /rooms/{id}` |
| Componentes | `GET/POST /projects/{id}/components`, `PATCH/DELETE /components/{id}` |
| Modelo | `GET /projects/{id}/structure`, `PATCH .../structure/roof`, `PATCH .../structure/{kind}/{id}/surface` |
| Archivos | `GET/POST /projects/{id}/files`, `GET /files/{id}/content`, `DELETE /files/{id}` |
| Recomendaciones | `GET/POST /projects/{id}/recommendations`, `POST .../generate`, `DELETE /recommendations/{id}` |
| Deshacer | `GET/POST /projects/{id}/undo` |
| Asistente | `GET /assistant/status`, `GET/POST /projects/{id}/conversations`, `GET /conversations/{id}`, `POST /conversations/{id}/messages` |
| v1 espacial | `GET /api/v1/rooms?project_id=`, `GET /api/v1/spatial-data?project_id=` |
| v1 obras (tareas) | `GET /api/v1/interior-walkthrough?project_id=`, `POST /api/v1/interior-walkthrough/logs`, `PATCH .../logs/{id}` |

### 6.2 Endpoints del backend que no usa

| Ruta | Para qué serviría | Prioridad |
|---|---|---|
| `POST /projects/{id}/redo` | Rehacer una eliminación deshecha. **No está en `api.ts`.** | Alta (R4), barato |
| `POST/PATCH/DELETE /api/v1/interior-walkthrough/steps[/{id}]` | Puntos del recorrido con `view_config.camera`. Base real para Recorridos (R7) en lugar de la escena de muestra | Alta (R7) |
| `GET /api/v1/spatial-data/scene`, `GET /api/v1/rooms/{id}/mesh` (`format=gltf\|json`) | Escena glTF del proyecto; exportación 3D real («Descargar glTF») | Media (R7) |
| `POST /api/v1/spatial-data/import`, `GET .../providers` | Importar glTF o formato nativo | Media |
| `POST/PATCH/DELETE /api/v1/spatial-data/elements[/{id}]`, `GET .../elements/{id}` | Editar elementos espaciales (capas de obra) desde el editor | Media (R5) |
| `PATCH /api/v1/rooms/{id}`, `GET /api/v1/rooms/{id}` | Cambiar unidad, categoría y malla de un cuarto | Baja |
| `GET /api/v1/auth/me` | Roles y permisos propios: ocultar o deshabilitar acciones que darían 403 | Media (R8) |
| `/api/v1/properties`, `/api/v1/units` (CRUD) | Propiedades y unidades | Baja: no hay pantalla prevista |
| `GET/DELETE /api/v1/interior-walkthrough/logs`, `/api/v1/renovations/logs` | Lista y borrado de tareas por separado | Baja: falta **eliminar tarea** en Tareas |
| `DELETE /conversations/{id}` | Borrar conversación. **Está en `api.ts` pero nada lo llama** | Baja |
| `GET /terrains/{id}`, `/materials/{id}`, `/plans/{id}`, `/elevations/{id}` | Están en `api.ts` sin uso; las pantallas cargan listas | Ninguna |
| `GET /rooms/{id}`, `/components/{id}`, `/files/{id}` | Lectura individual | Ninguna |
| `POST /api/v1/auth/token`, `PATCH /api/v1/users/{id}/roles` | JWT para clientes externos y administración de roles | **No usar**: la web sigue con la cookie `HttpOnly` (decisión del backend) |

### 6.3 Lo que la interfaz necesita y el backend no tiene

Está detallado en `docs/CAMBIOS_BACKEND.md` (16 puntos). Resumen: portada, tipo, fechas y duplicado de proyecto; rutas globales de terrenos y materiales; retiro, norte, COS/CUS y luz por proyecto (hoy en `localStorage`); rotación de elementos; historial persistente; entidades de dibujo 2D; superficies PBR propias y favoritos en la cuenta; imagen de materiales; «Recordar sesión»; render en servidor. **Ninguna pantalla nueva debe mostrar estos datos como si existieran.**

## 7. Qué funciona, qué está roto y qué se reutiliza

### Funciona (verificado con build, lint, pruebas y lo documentado en `PROGRESO.md`)

- Sesión por cookie `HttpOnly`, caducidad (401 → login sin perder la URL), recuperación de contraseña.
- CRUD real de proyectos, terrenos, materiales, planos, elevaciones, cuartos, componentes, archivos, recomendaciones, conversaciones; deshacer eliminaciones.
- Editor 3D sobre escena real: órbita, vistas, perspectiva/ortográfica, selección, árbol, visibilidad, mover y redimensionar cuartos con `PATCH /rooms/{id}`, cuadrícula, deshacer/rehacer de sesión, cubierta y superficies.
- Planos 2D generados con medir, zoom, reglas, escala, SVG y PDF por impresión.
- Iluminación con sol calculado; cada control cambia la escena (medido por píxeles).
- Captura de la vista en PNG/JPEG/WebP con progreso real.
- Temas claro y oscuro, movimiento reducido, paleta de comandos, navegación móvil.
- Modo demo con MSW, que no entra en el build de producción.

### Roto o pendiente

No hay fallos de compilación, lint ni pruebas (§8). Lo abierto es de diseño o de alcance:

1. **Recorridos usa una escena inventada.** `InteriorPage` dibuja un loft fijo, rotulado «Escena de muestra». La API ya tiene pasos de recorrido (`/steps`) que no se usan. El trabajo de `TourPage` con datos del proyecto está fuera de la rama (`wip-recorridos`), y con él una prueba falla (`styles/motion.test.ts` detecta `@keyframes` en `tour.css`).
2. **Dos sistemas visuales a la vez.** 27 hojas `legacy` conviven con los módulos de R1: la hoja principal pesa 163,87 kB (32,46 kB gzip). Las pantallas siguen con el aspecto anterior hasta su fase.
3. **Huecos visuales ya medidos:** CLS distinto de 0 en Planos 2D (0,042), Iluminación (0,018), detalle de proyecto y editor; visor de 614 px a 1440 px con menú abierto; encuadre bajo a 390 px; título cortado en la barra superior a 768 px.
4. **Capas de obra en cian y magenta**, fuera de la paleta: decisión pendiente (`DECISIONES.md`).
5. **Peticiones N+1:** Terrenos, Materiales, Tareas y el cronograma piden una lista por proyecto. Con muchos proyectos se nota; solo se arregla en el backend.
6. **Datos que solo viven en un navegador:** portadas, retiro/norte, luz, favoritos, vértices al deshacer. La interfaz lo avisa donde aplica.
7. **Rehacer eliminaciones** no se ofrece aunque el backend lo tenga; **eliminar tarea** tampoco.
8. **Rutas v1 con permisos:** responden 403 sin el permiso. La interfaz no consulta `/api/v1/auth/me`, así que un usuario sin rol vería errores en lugar de acciones deshabilitadas.
9. Sin revisar: el recuento «6 tareas» frente a «Terminadas 1 de 5» en Tareas (`PROGRESO.md`).

### Se reutiliza

Todo `services/`, `state/`, `hooks/`, `utils/`, `three/` y `components/ui/`; la lógica de los paneles de dominio; `routes.ts`; los scripts de comprobación (`contraste`, `movimiento`, `accesibilidad`, `capturas`) y la API de muestra para la demo y el e2e. Lo que se rehace es la presentación de cada pantalla con los componentes `ui/`, para poder borrar `legacy`.

## 8. Resultados de las comprobaciones

Ejecutadas el 20 de octubre de 2026 sobre `f31a47d`, árbol limpio:

| Comando | Resultado |
|---|---|
| `npm run build` | Pasa: `tsc --noEmit` sin errores, `2805 modules transformed`, `✓ built in 12.68s`, sin avisos. Entrada `index` 176,84 kB (55,33 kB gzip), `react` 183,20 kB (60,24), `three` 671,03 kB (172,05), `charts` 356,71 kB (104,77), `StructureViewer` 65,22 kB (23,93), CSS `index` 163,87 kB (32,46) |
| `npm run lint` | Pasa: sin errores ni avisos |
| `npm test` | Pasa: `Test Files 61 passed (61)`, `Tests 445 passed (445)`, 23,60 s |
| `npm run format:check` | «All matched files use Prettier code style!» |

No se ejecutaron en esta auditoría: `test:e2e`, `contraste`, `movimiento`, `accesibilidad`. Sus últimos resultados (R1, 19 de octubre) están en `PROGRESO.md`: e2e `13 passed`, contraste ≥ 4,5:1 en todos los pares.

## 9. Plan por fases

Sigue la numeración R2–R9 de `PROGRESO.md`, que encaja con el plan del prompt maestro (§23). Un commit por fase, validación completa (build, lint, test, e2e, contraste, movimiento) y espera del «continúa» entre fases.

| Fase | Qué | Endpoints nuevos | Riesgos y mitigación |
|---|---|---|---|
| **R0. Preparación** (corta) | Escribir `docs/API_CONTRATO.md` desde `/openapi.json` del backend; decidir el color de las capas de obra; decidir si `wip-recorridos` se rescata en R7 | Ninguno | Sin backend arrancado no hay OpenAPI: generarlo con `python -m app.dev` o leyendo los esquemas |
| **R2. Aplicación** | Layout, `Sidebar`, `TopBar`, `MobileNav`, `CommandPalette`, transiciones, entrada del logotipo, con `ui/`; sacar sus hojas de `legacy` | — | Las hojas `legacy` cruzan pantallas: quitar una puede romper otra. Mitigación: `npm run capturas` antes y después y comparar |
| **R3. Login y dashboard** | Login dividido, inicio con `/summary` y proyectos recientes | — | No inventar cifras: `/summary` da proyectos por estado (borrador, activo, archivado), terrenos, área total y costo de materiales. No da «completados» ni «planos creados» ni número de materiales: esos indicadores del prompt maestro se omiten o se piden al backend. Sin «Recordar sesión» |
| **R4. Proyectos y gestión** | Proyectos (3 vistas), detalle, Terrenos, Materiales, Tareas | `POST /projects/{id}/redo`; eliminar tarea (`DELETE .../logs/{id}`) | Rendimiento N+1 con muchos proyectos; tipo, fechas, duplicar y portada siguen sin backend y no se muestran |
| **R5. Espacio de trabajo 3D** | Editor y `/visor` | Opcional: `spatial-data/elements` para capas de obra | `BuildingSceneManager` y `StructureViewer` son grandes y poco cubiertos por pruebas unitarias: cambios solo en la capa React; medir búferes y contextos WebGL como en la fase 5 |
| **R6. Planos e iluminación** | Láminas, Iluminación y clima | — | CLS de Planos; herramientas de dibujo siguen deshabilitadas con motivo (no hay entidades 2D en la API) |
| **R7. Renderizado, recorridos, exportación** | Recorridos con datos reales; exportar glTF | `/interior-walkthrough/steps` (CRUD), `spatial-data/scene?format=gltf` | El trabajo de `wip-recorridos` está fuera de la rama y rompe `motion.test.ts`: integrarlo quitando las `@keyframes` o llevándolas a `motion.css`. Decidir qué queda de la escena de muestra (como mucho, una demostración rotulada y fuera del menú principal) |
| **R8. Configuración, accesibilidad, responsive** | Ajustes, roles, 768 y 390 px, teclado | `GET /api/v1/auth/me` para deshabilitar acciones sin permiso | Las rutas v1 dan 403 sin rol; comprobar con un usuario `architect` real |
| **R9. Consolidación** | Borrar la capa `legacy`, capturas finales, documentación | — | Reglas huérfanas que nadie usa y reglas que sí se usan: borrar hoja por hoja con capturas en los dos temas y tres anchos |

**Dependencias:** ninguna nueva prevista. La única revisión propuesta es **quitar** `recharts` si `CostChart` se rehace en SVG (ahorra unos 105 kB gzip cargados en Materiales); es opcional y se decide en R4.

**Riesgos transversales:**

- Smart App Control bloqueó Rollup y `sh.exe` el 13 de octubre; si vuelve, `npm run local:wasm` (`PROGRESO.md`).
- `rediseno-final` está igual que `origin/rediseno-final` (0 commits de diferencia). No subir más sin autorización.
- Las pruebas que comprueban clases del diseño anterior se adaptan, no se borran (criterio ya aplicado en R1).
