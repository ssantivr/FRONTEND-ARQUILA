# FRONTEND

Este documento explica las decisiones de la interfaz. El código no lleva comentarios, así que el porqué de cada decisión está aquí. Las decisiones de la API están en `BACKEND-ARQUILA/docs/BACKEND_Y_API.md`.

## Sistema de diseño «Blueprint premium» (reconstrucción, fase R1)

Es el sistema vigente. Las secciones que siguen a esta describen el diseño anterior y las decisiones de datos; se reescriben en la fase R9, cuando no quede ninguna pantalla del diseño anterior.

**Capas de estilos** (`src/styles/index.css`). `@layer foundation, legacy`: `foundation` tiene `foundation.css` (caja, tipografía, foco único, selección, `.visually-hidden`, `.tabular`) y `motion.css` (curvas, keyframes, movimiento reducido); `legacy` tiene las hojas del diseño anterior mientras sus pantallas se reconstruyen. Los CSS Modules de los componentes van sin capa, así que siempre ganan. Cada pantalla reconstruida deja de usar `legacy`; en R9 la capa y sus hojas se borran. `design-system.css` ya se borró en R1.

**Tokens** (`src/styles/tokens.css`), en dos niveles:

- *Tema* (`--color-*`, `--shadow-*`, `--focus-ring`), escrito entero para claro y para oscuro. El oscuro no es una inversión: niveles de verde casi negro (`#050f0b`, `#0b1d16`, `#10291f`), bordes `#1f4434` y lima solo en acción, selección y foco.
- *Escalas*, iguales en los dos temas: marca (`--brand-forest`, `--brand-forest-raised`, `--brand-lime`, caras del logotipo), tipografía (12 a 60 px, nada por debajo de 12), espacio en pasos de 4 px (`--space-0` a `--space-10`), radios de 2 a 14 px, alturas de control (28, 32, 40, 48; objetivo táctil 44), capas (`--z-*`) y duraciones (80, 120, 180 y 240 ms).
- *Densidad*: `data-density="compact"` en cualquier contenedor baja filas y controles (44→36 px y 40→32 px).
- Los nombres del diseño anterior (`--panel`, `--accent`, `--fs-*`…) apuntan a los nuevos y desaparecen en R9; el código nuevo no los usa.

**Lima.** Relleno de la acción principal, selección, progreso y estados activos. Sobre fondo claro no es legible como texto (1,31:1 sobre blanco): ahí solo es relleno, con texto `--color-on-accent` (`#0B211A`, 12,89:1). Sobre oscuro puede ser texto o contorno. `npm run contraste` comprueba todos los pares texto/fondo de los dos temas (mínimo 4,5:1).

**Sello visual** (`ui/Blueprint.tsx`, `ui/Logo.tsx`, `ui/EmptyState.tsx`):

- `BlueprintGrid` (cuadrícula técnica de 8, 12 o 16 px con línea mayor cada cinco celdas, que se desvanece hacia los bordes), `CornerMarks` (marcas de esquina de cajetín), `DimensionLine` (línea de cota con trazos oblicuos; su medida se lee si es un dato real, si no es decoración) y `GridAxes` (ejes con burbuja). Todo `aria-hidden` salvo la medida.
- Logotipo isométrico: cuatro volúmenes (muro, dintel, pilar y suelo) proyectados en `logoGeometry.ts`. Cada volumen es un `<g data-piece>` que la entrada y el cargador animan uno a uno. `npm run favicon` dibuja `public/favicon.svg` con la misma geometría, y una prueba falla si dejan de coincidir.
- Estados vacíos con dibujo lineal: planta, sección, volumen y lote (`art="plan" | "section" | "volume" | "site"`).
- Cifras técnicas (`ui/Quantity.tsx`): numerales tabulares, unidad siempre visible y la etiqueta «Derivado» (`DerivedTag`) cuando la interfaz calculó el valor. Un dato que falta dice «Sin dato» (o el texto que se le pase), nunca un cero.

**Componentes de `src/components/ui/`** (todos con su `*.module.css`, foco visible y los dos temas):

| Grupo | Componentes |
|---|---|
| Acciones | `Button` (primario, secundario, terciario, destructivo; tamaños sm/md/lg; icono, flecha, atajo, carga y `disabledReason`, que lo deja enfocable y explica por qué no se puede usar), `IconButton` (siempre con nombre y tooltip; tonos ghost, outline y escena), `Kbd` |
| Formularios | `Field`, `Input` (con unidad), `PasswordInput` (mostrar/ocultar con `aria-pressed`), `Select`, `Textarea`, `Checkbox`, `Range` (valor con unidad y motivo si está deshabilitado), `Switch`, `SegmentedControl`, `MaterialPicker` |
| Navegación | `Tabs` (barra lima que se desliza con `transform`), `Breadcrumbs`, `Menu`, `ContextMenu` (clic derecho, Mayús+F10 o tecla de menú; flechas, Escape devuelve el foco) |
| Superficies | `Panel`, `Card`, `MetricCard`, `PropertyPanel` / `PropertySection` / `PropertyRow` / `PropertyField` (valores que se envían solo al confirmar, admiten coma decimal, avisan si salen de rango y vuelven con Escape) |
| Capas | `Dialog`, `Drawer`, `ConfirmDialog` (abre en «Cancelar»), `Tooltip`, avisos (`Toasts.tsx`) |
| Estado | `ProgressBar` (se llena con `transform`), `Spinner`, `Loader` (el logotipo se ilumina pieza a pieza), `Skeleton` (reserva el alto), `SaveIndicator`, `Tag` / `StatusBadge`, `EmptyState` |
| Datos | `DataTable` (pasa a fichas según el ancho de su panel), `FilterBar` |
| 3D | `CameraControls` (solo dibuja los controles a los que la vista responde; una parada de tabulación y flechas dentro) |

Todos se muestran en claro y en oscuro, con interruptor de densidad compacta, en `/design-system` (solo en desarrollo). Pruebas: `ui/ui.test.tsx` y `ui/identity.test.tsx`.

## Esquemas del terreno

La pestaña Terreno dibuja cinco esquemas en SVG por cada terreno (`src/components/TerrainDiagrams.tsx` y `Terrain3D.tsx`), sin librerías adicionales:

- **Vista superior**: el contorno del lote a escala.
- **Curvas de nivel**: el lote visto desde arriba con una línea cada cierto desnivel y franjas más oscuras cuanto más alto está el terreno. El intervalo entre curvas se elige de una lista de valores redondos (0,1 m, 0,25 m, 0,5 m, 1 m, 2 m…) para que salgan como mucho seis. Como el terreno se modela como un plano inclinado, las curvas son rectas paralelas al frente.
- **Vista frontal**: el lote visto desde el frente, que es su lado más bajo. Conserva el ancho y convierte la profundidad de cada vértice en altura (`profundidad × pendiente / 100`), así que un lote rectangular se ve como una franja de ancho por desnivel.
- **Vista lateral**: el perfil del terreno, una línea con la pendiente real. El desnivel se calcula como `largo × pendiente / 100`.
- **Vista 3D**: el lote como una superficie inclinada según la pendiente, que se puede girar con un control. Es una proyección calculada a mano: cada vértice se rota alrededor del eje vertical y se proyecta con una inclinación fija de 30°.

La vista 3D tiene cuatro capas que se pueden mostrar u ocultar: superficie, plano base (el nivel de referencia), límites (contorno y aristas verticales) y medidas. No hay capas de construcción, vegetación ni vías, porque el proyecto no guarda esos datos.

### Lotes no rectangulares

Un terreno puede tener una lista de vértices `x y` en metros, guardados en la tabla `terrain_points` con su posición en el contorno. Si los tiene, los esquemas dibujan ese polígono; si no, usan el rectángulo de ancho por largo.

- Se aceptan entre 3 y 50 vértices, y deben encerrar un área mayor que cero.
- El área se calcula con la fórmula del área de Gauss (o «del cordón»), recorriendo los vértices una vez: O(n). Está en `BACKEND-ARQUILA/app/services/geometry.py` y en `src/utils/geometry.ts`.
- Al guardar se comprueba que el contorno no se cruce ni se toque a sí mismo (`selfIntersection` en `src/utils/geometry.ts`): se compara cada par de lados, O(n²) con 50 vértices como máximo. El mensaje dice qué dos lados se cortan y cómo arreglarlo («Escribe los vértices en el orden en que se recorre el borde del lote»). Sin esta comprobación, el área y el retiro de un contorno cruzado no significan nada.
- Al deshacer la eliminación de un terreno la API devuelve sus datos sin sus vértices. La interfaz los recuerda al eliminarlo (en `sessionStorage`, mientras la pestaña siga abierta) y, tras deshacer, los vuelve a enviar con un `PATCH` (`src/services/terrainUndo.ts`). Busca el terreno restaurado por su identificador y, si la API le dio uno nuevo, por su nombre entre los que no tienen vértices. Si ese segundo envío falla, deshacer sigue contando como hecho. Lo correcto es que el backend los restaure (`CAMBIOS_BACKEND.md`).

Simplificaciones: la superficie es un plano inclinado y se asume que la pendiente va en el sentido del largo (el eje `y`). El ancho y el largo son opcionales; si faltan, el esquema muestra qué dato falta. El área se guarda aparte porque un lote real puede no ser rectangular; el formulario la propone como ancho por largo si se deja vacía.

## Plano de implantación

La pestaña Planos dibuja, debajo de la lista de planos, un plano de implantación en SVG por cada terreno (`src/components/SitePlan.tsx`). Usa solo los datos del terreno:

- **Límite del terreno**: el contorno del lote a escala, con una cota en cada lado. La longitud de cada lado y hacia dónde queda el exterior se calculan recorriendo los vértices una vez: O(n) (`edges` en `src/utils/geometry.ts`).
- **Área edificable**: lo que queda al retirarse la misma distancia de todos los lados, en un lote de cualquier forma (`buildableArea` en `src/utils/polygons.ts`). Al lote se le resta una banda a lo largo de cada lado y un disco en cada vértice, con `polygon-clipping`: una esquina saliente conserva su ángulo y una entrante queda redondeada, que es lo que da un retiro medido desde el lindero. Las formas se restan de una en una, porque restarlas todas a la vez hacía fallar a la librería con tangencias exactas. Si el retiro parte el lote en dos, el plano dibuja las dos zonas y lo dice. El retiro se elige con un control (de 0 a 10 m; al abrir vale 3 m, o menos si el lote es estrecho, para que siempre quede área edificable) y el plano muestra el área resultante.
- **Acceso**: una marca en el frente del lote.
- **Norte**: una flecha cuya dirección se elige con un control.
- **Leyenda** y botón **Descargar plano (SVG)**. El archivo descargado lleva sus colores dentro, así que se ve igual fuera de la aplicación.
- Botón **Imprimir o guardar como PDF**: abre la impresión del navegador con el plano solo, en una hoja A4 horizontal. Para obtener el PDF se elige «Guardar como PDF» como impresora. No usa ninguna librería.

Simplificaciones:

- El retiro y el norte se recuerdan por terreno en este navegador (`state/siteSettings.ts`, clave `arquila:site:{proyecto}`), a la espera de que el backend los guarde (`CAMBIOS_BACKEND.md`).
- El acceso se asume por el frente, el lado más bajo, igual que en la vista frontal del terreno.
- El retiro es el mismo en todos los lados; no hay retiro frontal, lateral y posterior por separado.
- No se dibujan vivienda, áreas verdes, andenes ni parqueadero, porque el proyecto no guarda esos datos.

## Modelo 3D

La pestaña Modelo 3D muestra el proyecto en tres dimensiones con Three.js. Los datos salen de `GET /projects/{id}/structure` (`BACKEND-ARQUILA/app/services/structure_service.py`), que arma la respuesta con los terrenos, los planos, los cuartos y los componentes estructurales del proyecto, en metros.

- **Terrenos**: cada terreno con contorno (vértices, o ancho y largo) es una losa. Los terrenos se colocan uno al lado del otro sobre el eje `x`, separados 5 m, porque cada uno guarda sus coordenadas desde su propio origen.
- **Niveles**: un plano es un nivel si tiene cuartos o componentes, o si su campo Nivel es un número (`0`, `1`, `-1`, `0.5`). Así un plano de implantación o de detalles, con el nivel vacío o con texto, no se apila como si fuera un piso. Los niveles se apilan en el orden en que se crearon los planos, no por el número. Un plano con cuartos muestra sus cuartos (`kind: "room"`). El nivel mide lo que su cuarto, columna o muro más alto, o 3 m si no tiene ninguno. Mientras el proyecto no tenga ningún cuarto ni componente, cada nivel se dibuja como un volumen de 3 m (`kind: "volume"`) sobre el área edificable del primer terreno rectangular, con el mismo retiro inicial del plano de implantación (3 m, o menos si el lote es estrecho). En cuanto hay un cuarto o un componente, los volúmenes dejan de dibujarse: un nivel vacío conserva sus 3 m de altura, pero queda en blanco, para no mezclar cuartos reales con un volumen de relleno.

- **Componentes**: las columnas y los muros se apoyan en el piso de su nivel. Una viga se cuelga del techo: su base es la altura del nivel menos el alto de la viga.

En el frontend, `src/three/BuildingSceneManager.ts` arma la escena y no depende de React; `StructureViewer.tsx` la crea al montar, la destruye al desmontar y dibuja encima los paneles flotantes. Tres módulos vecinos se reparten el resto: `cameraRig.ts` (controles, límites y vuelos de la cámara), `postprocessing.ts` (resplandor) y `vegetation.ts` (árboles). Decisiones del visor:

- **Dibujo bajo demanda**: la escena solo se vuelve a dibujar cuando algo cambia (la cámara, la selección, una capa, el tamaño). En reposo no gasta GPU.
- **Sombras bajo demanda**: el mapa de sombras depende del sol y del modelo, no de la cámara, así que no se recalcula al girar o hacer zoom (`shadowMap.autoUpdate = false`). `invalidate` lo marca para recalcular cuando cambia la escena; un movimiento de cámara solo pide redibujar. El recorrido interior hace lo mismo: su sombra se calcula una vez y al encender o apagar el neón.
- **Cámara**: cambiar de vista, hacer zoom con los botones o enfocar un elemento (doble clic o el botón «Enfocar») mueve la cámara con una transición; arrastrar la cancela, y con «reducir movimiento» activado en el sistema el cambio es inmediato. El punto que orbita la cámara no puede alejarse del modelo.
- **Resplandor**: en el modo oscuro el contorno de la selección y el borde del lote llevan un color más brillante que el blanco, y un pase de `UnrealBloomPass` hace brillar solo lo que supera ese umbral. En el modo claro el pase no se crea y se dibuja directo al lienzo.
- **Aislar y cortar**: «Aislar cuarto» oculta el resto del modelo y deja el cuarto con las columnas, vigas y muros que lo tocan. El control «Corte» mueve un plano horizontal de recorte (`clippingPlanes` en los materiales, no en el renderizador, para no cortar el cielo ni el terreno); al aislar un cuarto el corte baja al 80 % de su altura para quitar la losa de techo.
- **Corrida de interior**: recorre las paradas que devuelve `/api/v1/interior-walkthrough` (título, descripción, duración y altura de corte de cada una); si el proyecto no tiene paradas, recorre los cuartos de abajo hacia arriba cada 5 s. En cada parada aísla el cuarto y gira un poco la cámara. Las flechas avanzan a mano y «Ver todo» lo termina.
- **Obras del cuarto**: mientras un cuarto está aislado, el panel izquierdo (`RoomWorksPanel.tsx`) muestra sus elementos registrados y «Lo que se va a hacer», el registro de obras; desde ahí se cambia el estado de una obra y se agrega otra.
- **Capas de obra**: los elementos de `/api/v1/spatial-data` se dibujan como cajas sobre el modelo, sin prueba de profundidad para que se vean a través de los muros: estructura en cian, instalaciones en magenta, acabados en ámbar y lo que se va a demoler en rojo; lo previsto es translúcido. Cada capa se puede ocultar. «Resaltar» atenúa el resto del modelo: en «Estructura» deja columnas, vigas y muros, en «Acabados» los elementos con un material distinto al predeterminado y en «Instalaciones» atenúa todo el modelo. Un clic sobre una caja la muestra en el inspector.
- **Vista interior**: con un cuarto aislado, «Vista interior» lleva la cámara adentro, a 1,60 m del piso, y dibuja las paredes también por dentro. Si la parada trae `view_config.camera`, usa esa posición y ese objetivo; si no, mira desde una esquina hacia la opuesta.
- **Modelos glTF bajo demanda**: si un cuarto tiene `mesh_ref` (una dirección `https://` o una ruta de `/api/v1/`), su modelo se descarga al aislarlo. El cargador (`GLTFLoader`) va en un archivo aparte que el navegador solo pide en ese momento, así que no pesa en la carga inicial. No hay texturas `.ktx2` porque el proyecto no usa archivos de textura: las superficies son procedurales.
- **Despiece**: el control separa los niveles en vertical con una transición amortiguada; el techo y las capas de obra suben con su nivel.
- **Árboles**: todos comparten tres mallas instanciadas (tronco y dos copas), así que cuestan tres llamadas de dibujo sin importar cuántos haya.

- El eje `y` del plano pasa a ser `-z` en la escena. Así la altura queda en `y` y el modelo no sale reflejado.
- Las losas se generan por extrusión del contorno, que corrige el sentido de los vértices; por eso las caras quedan hacia afuera aunque el lote se haya escrito en sentido horario.
- Las sombras usan `PCFShadowMap`, que en la versión instalada de Three.js ya filtra los bordes; `PCFSoftShadowMap` se retiró de la librería y solo producía un aviso en la consola. La luz del sol lleva además `shadow.radius` para suavizar el borde.
- **Iluminación**: una luz direccional hace de sol y proyecta las sombras, una `HemisphereLight` rellena con el color del cielo y del suelo, y un mapa de entorno (`RoomEnvironment` procesado con `PMREMGenerator`) da los reflejos que necesitan el vidrio y el metal; sin él un material metálico se ve negro. En el modo oscuro se suman dos luces puntuales de acento, cian `#00F0FF` y magenta `#FF007F`, a lados opuestos del modelo; en el modo claro están apagadas (`accent` en `SCENE_PALETTES`).
- **Geometría de un cuarto**: ya no es una caja maciza. `src/three/roomGeometry.ts` arma cuatro muros con espesor (20 cm, o menos en cuartos pequeños) extruyendo el alzado de cada lado con un hueco por ventana o puerta, más una losa de piso y otra de techo, y los une en una sola geometría. En cada vano van un marco metálico oscuro y un vidrio translúcido (`opacity` 0,4, `roughness` 0,1, `metalness` 0,8) o la hoja de la puerta. Las líneas de arista son las doce de la caja exterior más el rectángulo de cada vano. Los volúmenes y los componentes siguen siendo cajas.
- **Relieve**: los materiales rugosos (concreto, ladrillo, revoque, piedra y, más suave, madera) llevan una textura de ruido generada por código al crear el visor (`buildGrain`, 128 × 128 px, sin archivos de imagen), que se usa como mapa de rugosidad y de relieve (`roughnessMap` y `bumpMap`). El vidrio y el acero quedan lisos. Para que el grano tenga el mismo tamaño en una columna y en un muro largo, las coordenadas de textura se reescriben en metros (`applyMetricUVs`). En los modos Tipo, Coste y Alertas el relieve se quita.
- Los planos `near` y `far` de la cámara y la cámara de sombras de la luz se ajustan al tamaño del modelo. Junto con `polygonOffset` en los materiales evita el parpadeo entre caras que coinciden (z-fighting) y las sombras recortadas.
- La cámara se encuadra solo la primera vez y con el botón «Restablecer vista». Al agregar o editar un cuarto el modelo se reconstruye, pero la cámara se queda donde el usuario la dejó.
- **Selección**: un clic sobre un cuarto lo selecciona con un rayo desde la cámara (`Raycaster`). Si el puntero se movió más de 4 px entre pulsar y soltar se considera un giro de cámara y no una selección. El elemento seleccionado no lo guarda la escena sino el estado compartido (`src/state/appState.ts`), así que la lista de niveles y el inspector muestran siempre lo mismo que el modelo; la lista permite además seleccionar con el teclado.
- **Materiales**: los cuartos usan `MeshPhysicalMaterial` en color ladrillo con una capa de barniz (`clearcoat`) muy suave; los volúmenes y los componentes usan `MeshStandardMaterial`, los componentes con la rugosidad alta del hormigón. El terreno es verde.
- **Material de superficie**: el inspector tiene un selector «Material» para el elemento seleccionado, con siete opciones: concreto, ladrillo, revoque, vidrio arquitectónico, acero, madera y piedra. El catálogo está en `src/utils/surfaceMaterials.ts`: cada material es un color, una rugosidad, un brillo metálico y una opacidad (solo el vidrio es translúcido). Un elemento sin elección usa el predeterminado de su tipo: ladrillo para un cuarto, revoque para un volumen y concreto para columnas, vigas y muros. La escena recibe el mapa de elemento a material (`setSurfaces`) y cambia las propiedades del material que ya existe, sin reconstruir el modelo.
  - La elección se guarda en el backend con `PATCH /projects/{id}/structure/{kind}/{element_id}/surface` y cuerpo `{"surface": "glass"}`; responde 204. `kind` es `room`, `volume`, `column`, `beam` o `wall`. Va en la columna `surface` (migración `008_element_surfaces.sql`) de `rooms` o de `structural_components`; la de un volumen va en `plans`, porque un volumen es un plano sin cuartos. La columna admite nulo, que significa «el predeterminado del tipo», y la respuesta de `GET /projects/{id}/structure` trae el campo `surface` en cada elemento. Responde 404 si el elemento no existe, no es de ese tipo o no es de ese proyecto, y 422 si el material o el tipo no están en la lista.
  - El visor cambia el modelo al instante y guarda después: si la petición falla, vuelve al material anterior y lo avisa en el inspector. Es `PATCH` y no `PUT` porque la configuración de CORS del backend solo admite `GET`, `POST`, `PATCH` y `DELETE`.
  - Es un dato visual: no interviene en el coste ni en la lista de Materiales del proyecto, que son partidas de presupuesto.
  - En los modos Tipo, Coste y Alertas manda el color del modo; el color y la transparencia del material solo se ven en Realista.
- **Color**: el panel «Color» ofrece cuatro modos. La escena solo recibe un mapa de elemento a color (`setColors`); los cálculos están en `src/utils/elementColors.ts`.
  - Realista: los colores de los materiales anteriores.
  - Tipo: un color por cuarto, volumen, columna, viga y muro.
  - Coste: una rampa de azul a rojo según el coste estimado de cada elemento, que también aparece en el inspector. Es un reparto: el costo total de los materiales del proyecto se divide entre los elementos según su volumen, porque un material no guarda a qué elemento pertenece. Los cuartos se llevan casi todo, ya que su volumen es el del espacio y no el del muro.
  - Alertas: cada elemento toma el color de la prioridad más alta entre las recomendaciones que lo mencionan por su nombre exacto (`C1` no coincide con `C10`); los demás quedan en gris. El inspector lista esas recomendaciones. Una recomendación que no nombra el elemento no se enlaza.
- **Estado compartido**: `appState.ts` es un almacén pequeño, sin librerías (`useSyncExternalStore`), que guarda del proyecto abierto sus materiales, sus recomendaciones, el elemento seleccionado, el modo de color y el material de superficie de cada elemento. El visor lo lee y lo recarga al abrirse; los paneles de Materiales y de Recomendaciones publican en él su lista cada vez que cambia; el asistente lee de él la selección. Al cambiar de proyecto se vacía, salvo el modo de color; los materiales de superficie se vuelven a leer de la respuesta de `structure`. Como las pestañas del proyecto se muestran de una en una, el cambio se ve al volver a Modelo 3D. Los demás paneles siguen cargando sus datos con `useAsync`.
- **Elementos decorativos**: para que el modelo se lea como una edificación, el visor añade ventanas, una puerta, un techo a dos aguas y árboles. No son datos del proyecto: se calculan al dibujar y no se guardan ni se pueden seleccionar. Las ventanas y la puerta son vanos reales en el muro: se ve el interior a través del vidrio.
  - Ventanas: en las caras de un cuarto que dan al exterior de su nivel (las que coinciden con el borde del rectángulo que envuelve el nivel), una cada 3 m. La puerta reemplaza la primera ventana del frente en la planta baja. La regla está en `src/utils/openings.ts` y la comparten las plantas y las fachadas generadas.
  - Techo: sobre el nivel más alto. Por defecto es a dos aguas, con la cumbrera a lo largo del lado mayor; el selector «Cubierta» de la barra inferior lo cambia a plana, que es una losa con un pretil de 50 cm alrededor. La elección es del proyecto: se guarda con `PATCH /projects/{id}/structure/roof` y cuerpo `{"roof": "flat"}` (responde 204; 422 si no es `gable` ni `flat`) en la columna `roof` de `projects` (migración `009_project_roof.sql`), y `GET /projects/{id}/structure` la devuelve en el campo `roof`. El visor cambia la cubierta al instante y, si no se puede guardar, vuelve a la anterior y lo avisa. Las fachadas y el corte generados leen el mismo campo y dibujan la cubierta plana como una banda.
  - Losas: cada cuarto lleva en su parte alta el canto de la losa que lo cubre, 12 cm por fuera de los muros, para que los pisos se lean desde fuera. Se oculta con los cuartos.
  - Árboles: en el fondo y en un costado de cada terreno, donde no haya cuartos ni componentes. Cada uno es un tronco cilíndrico con dos copas facetadas, y su tamaño varía según su posición.
  - Suelo y cielo: un disco de suelo alrededor del terreno recibe las sombras, y una cúpula pasa del color del horizonte al del cielo. Una niebla del mismo color que el horizonte desvanece el suelo y la cuadrícula a lo lejos, de modo que no se ve dónde terminan.
- **Cámara**: cuatro vistas (isométrica, frontal, lateral y superior), botones para acercar y alejar, el porcentaje de zoom y pantalla completa. El zoom se calcula comparando la distancia de la cámara con la distancia de encuadre.
- **Capas**: cuatro casillas muestran u ocultan cuartos, techo, árboles y cuadrícula. Al ocultar los cuartos queda a la vista la estructura; un elemento oculto tampoco se puede seleccionar con un clic.
- Al cambiar de modelo o salir de la pestaña se liberan geometrías, materiales, el mapa de sombras, los eventos y el contexto WebGL (`dispose`). Los dos visores recorren la escena con la misma función, `disposeObject` de `src/three/dispose.ts`, que respeta los materiales compartidos (`userData.shared`). Las texturas solo se liberan si se pide (`textures: true`): se hace con un modelo glTF, que trae las suyas, y no con los elementos del edificio, que comparten la textura de grano.
- Three.js se carga solo al abrir la pestaña (`lazy` en `ProjectDetailPage.tsx`), para no aumentar la carga inicial.
- **Paneles que no tapan el modelo**: Niveles, Inspector y Color son `<details>` que se pliegan a su título; Color abre plegado y muestra el modo activo en el título. Inspector y Color comparten una columna a la derecha (`.hud-dock`) que nunca llega a la barra inferior. La barra inferior va centrada, en grupos (vista, corrida, corte y despiece con su porcentaje), y las casillas de capas y la cubierta se abren desde el botón «Capas». Las ayudas de la barra son `data-tip`, un texto que aparece sobre el control al pasar el cursor o al enfocarlo con el teclado. Los paneles son sólidos, sin desenfoque, en los dos temas (`--glass` es ahora un color opaco).
- Los paneles flotantes (vistas, niveles, inspector, color y barra inferior) usan los mismos colores que el resto de la aplicación (clases `.structure-stage` y `.hud` en `src/styles/viewer.css`). El cielo, la niebla, el suelo y la cuadrícula de la escena cambian con el modo claro u oscuro (`setPalette`); el elemento bajo el cursor se resalta en azul y el seleccionado lleva un contorno cian `#00F0FF` de 3 px (`LineSegments2`), en todos los modos de color y sin teñir el elemento, para que se vea su material o el color del dato. Ese contorno y las dos luces de acento del modo oscuro son el único neón de la aplicación. En pantallas estrechas los paneles pasan debajo del modelo.

- **Pendiente.** El terreno se dibuja inclinado según su pendiente, a lo largo de su fondo, igual que en los esquemas del terreno. La losa no se gira sino que se cizalla: cada vértice conserva su sitio en planta y solo cambia de altura, así el contorno sigue coincidiendo con los planos. El suelo toca el nivel 0 en el muro posterior de la edificación: cae hacia el frente, donde un zócalo bajo cada cuarto de la planta baja llena el hueco, y sube por detrás, de modo que la casa nunca queda enterrada. Los árboles y el borde del lote siguen la pendiente. La respuesta de `structure` todavía no trae la pendiente, así que `structureApi.get` la lee de la lista de terrenos (una petición más) y, si no puede, dibuja el modelo plano.

Simplificaciones: la pendiente va siempre en el sentido del fondo del lote. En un lote con vértices no se dibuja el volumen de un plano sin cuartos, igual que en el plano de implantación; los cuartos sí se dibujan siempre.

## Plantas generadas y ocupación del lote

La pestaña Planos muestra, entre la lista de planos y el plano de implantación, dos paneles que se calculan en el frontend con la respuesta de `GET /projects/{id}/structure`. No guardan nada ni añaden rutas.

- **Plantas generadas** (`src/components/FloorPlan.tsx`): una planta en SVG por cada nivel del modelo, sobre una retícula, con los cuartos a escala, su nombre y su área. El frente del lote queda abajo, igual que en el plano de implantación. Cada planta se descarga en SVG con sus colores dentro. Lleva:
  - **Ejes**: una línea por cada borde de cuarto, con burbujas de letras (A, B, C…) arriba y de números (1, 2, 3…) a la izquierda. Los ejes salen de ordenar las coordenadas de los bordes y quitar las repetidas.
  - **Cotas**: la distancia entre cada par de ejes seguidos y, encima, la medida total. Una cota de un tramo muy corto no se escribe para que los textos no se monten.
  - **Muros**: línea gruesa en las caras exteriores y fina en las interiores.
  - **Ventanas y puerta**: las mismas del modelo 3D, con el arco de apertura de la puerta.
  - Columnas y muros estructurales en blanco, vigas en línea discontinua, peldaños en los cuartos cuyo nombre contiene «escalera», el nivel (`N+2.80`) y una escala gráfica.
- **Ocupación del lote**: huella construida, área construida, área libre, COS y CUS (`buildingIndicators` en `src/utils/building.ts`).
  - COS = área de la planta baja ÷ área del lote. CUS = área de todos los niveles ÷ área del lote.
  - El área del lote es la del contorno del primer terreno del modelo, calculada con la fórmula de Gauss; es el mismo terreno sobre el que se colocan los cuartos.
  - Agrupar los cuartos por nivel y sumar sus áreas es un recorrido de la lista: O(n).
  - Los máximos de COS y CUS se escriben en la pantalla, con 0,6 y 1,8 como valores iniciales, y se recuerdan por proyecto en este navegador, igual que el retiro del plano de implantación: el proyecto no tiene la norma del municipio.
  - **Cuartos solapados.** El área de un nivel es el suelo que cubren sus cuartos, contando una sola vez lo que dos comparten (la unión de sus rectángulos, con `polygon-clipping`). Si dos cuartos del mismo nivel se solapan más de 0,01 m², un aviso sobre los indicadores dice cuáles y cuánto, del mayor al menor (`roomOverlaps` en `src/utils/building.ts`).

La pestaña Elevaciones añade el panel **Fachadas y corte generados** (`src/components/ElevationDrawing.tsx`), con cinco dibujos: fachada frontal, posterior, lateral izquierda, lateral derecha y un corte esquemático.

- Una fachada dibuja cada nivel como un rectángulo con su altura, las ventanas y la puerta de ese lado, el techo y las cotas de nivel. En las fachadas posterior e izquierda el eje horizontal se invierte, porque se miran desde el otro lado.
- El techo se ve como un triángulo cuando se mira de frente a la cumbrera y como un rectángulo cuando se mira de costado.
- El corte pasa por la mitad del ancho de la edificación y muestra, con su nombre, los cuartos que atraviesa.
- El cálculo está en `src/utils/elevations.ts` y devuelve una lista de rectángulos en metros; el componente solo los pasa a píxeles.

Las ventanas, la puerta y el techo se calculan en un solo lugar, `src/utils/openings.ts`, que usan el modelo 3D, las plantas y las fachadas. Por eso los tres dibujos coinciden: una ventana que se ve en el modelo está en el mismo sitio en la planta y en la fachada.

Simplificaciones: las plantas no dibujan mobiliario ni puertas interiores, y solo hay una puerta, la de entrada. Los ejes pasan por los bordes de los cuartos, no por las columnas. El corte dibuja el terreno con su pendiente y, bajo la edificación, lo que sostiene el piso donde el suelo baja; no dibuja la cimentación. Mientras el proyecto no tiene cuartos, los volúmenes de relleno cuentan como área construida.

## Organización de la interfaz

El menú lateral tiene doce módulos (`MODULES` en `src/components/Sidebar.tsx`): los once de `docs/DISENO_ARQUILA.md` más el Asistente IA. La página de Inicio muestra los mismos como accesos rápidos, a partir de esa misma lista.

### Planos 2D, Iluminación y clima, Renderizado y Gestión de tareas

Las cuatro pantallas trabajan sobre un proyecto que se elige arriba (`ToolHead.tsx`); la elección se recuerda mientras la pestaña del navegador siga abierta (`useProjectChoice`, en `sessionStorage`), así que al pasar de Iluminación a Renderizado se sigue en el mismo proyecto.

- **Planos 2D** (`/planos`, `PlansPage.tsx`). Reúne en pestañas los dibujos que ya se generaban dentro del proyecto: plantas con ocupación del lote, fachadas y corte, e implantación. Son los mismos componentes, así que se miden y se descargan igual. No es un editor de dibujo: los planos salen de los terrenos y los cuartos, y se cambian editando esos datos en el proyecto.
- **Iluminación y clima** (`/iluminacion`, `LightingPage.tsx`). Hora del día, orientación solar, intensidad, temperatura de color, cielo (según la hora, día, atardecer o noche), nubosidad, exposición y sombras. Cada control cambia la escena real: `src/three/lightingPalette.ts` convierte los ajustes en la paleta, la posición del sol, la exposición y las sombras que recibe el motor (`setPalette`, `setSun` con elevación, `setExposure`, `setShadows`).
    - El recorrido del sol es un arco de 6:00 a 18:00 (`sunPosition` en `src/utils/lighting.ts`). **No es un cálculo solar**: el proyecto no guarda latitud ni fecha, y por eso no hay control de fecha.
    - La nubosidad quita luz al sol, se la da al cielo y agrisa el cielo y el horizonte. No se dibujan nubes ni hay entorno HDRI.
    - Es la luz **de presentación**. El editor 3D del proyecto conserva su luz de trabajo, que sigue al tema. Los ajustes se guardan por proyecto en `localStorage` (`arquila:lighting:<id>`), porque la API no tiene dónde guardarlos.
- **Renderizado** (`/renderizado`, `RenderPage.tsx`). Se elige la vista, la proyección, la relación de aspecto, la resolución (hasta 3840 px de lado mayor), la calidad y el formato (PNG, JPEG o WebP); el encuadre se ajusta girando el modelo dentro de un marco con las proporciones de la imagen.
    - La imagen la dibuja el mismo motor del visor (`renderStill` en `BuildingSceneManager.ts`) al tamaño pedido. Con más de una pasada, cada una desplaza la cámara una fracción de píxel y el sol una fracción de grado, y se promedian en un lienzo: los bordes salen suaves y las sombras con penumbra. «Alta» usa además un mapa de sombras de 4096 px.
    - El progreso es real: cuenta las pasadas terminadas. «Cancelar» corta entre dos pasadas y no deja ninguna imagen.
    - **No es trazado de rayos** y la pantalla lo dice: no hay profundidad de campo ni reflejos trazados. El archivo se genera en el navegador; no se guarda en el servidor.
- **Gestión de tareas** (`/tareas`, `TasksPage.tsx`). Las tareas son las obras del registro (`renovation_logs`) de todos los proyectos, las mismas que se ven al aislar un cuarto en el modelo. Se muestran en un tablero por estado, con búsqueda y filtros por proyecto y capa; el estado se cambia con `PATCH /api/v1/interior-walkthrough/logs/{id}` y una tarea nueva se crea con `POST /api/v1/interior-walkthrough/logs`, sin cuarto asignado.
    - El avance es terminadas ÷ (total − canceladas), y «atrasada» es una tarea sin terminar cuya fecha de fin ya pasó (`src/utils/tasks.ts`).
    - No hay responsables: el registro guarda quién creó la tarea, no a quién se asigna.

Comprobación: `npm run capturas` cambia la hora a las 18:00, comprueba que el cielo pasa a atardecer, abre Renderizado con esa luz, genera una imagen de 1920 × 1080 px y la descarga; `npm run accesibilidad` pasa axe por las cuatro pantallas.

- **Terrenos** y **Materiales** reúnen los datos de todos los proyectos del usuario, con métricas y, en Materiales, el costo por categoría. Son de consulta: el botón «Abrir» lleva a la pestaña correspondiente del proyecto, donde se editan. La API no tiene una ruta que liste terrenos o materiales de todos los proyectos, así que el frontend pide la lista de proyectos y luego la de cada uno en paralelo (`loadAcrossProjects` en `services/api.ts`). Es una petición por proyecto; con muchos proyectos convendría una ruta propia en el backend.
- **Visualización 3D** y **Asistente IA** piden elegir un proyecto y muestran su modelo o su asistente, los mismos componentes de las pestañas del proyecto. Three.js sigue cargándose solo al abrir el modelo.
- **Recorrido interior** es una escena de muestra que no usa los datos de ningún proyecto: un loft de doble altura con entrepiso, escalera, la ciudad al atardecer tras el ventanal y líneas de neón. Vive en `src/three/interior/` (`loftScene.ts` la geometría y las luces, `cityBackdrop.ts` el cielo y la ciudad, `textures.ts` las texturas pintadas en un lienzo, `interiorCamera.ts` la cámara) y `InteriorViewer.tsx` dibuja encima la barra de título y la de controles. La geometría es procedural, hecha de cajas fusionadas por material; no hay modelos ni imágenes que descargar. La cámara no sale de las paredes ni entra en el entrepiso, en la escalera o en los muebles grandes.
- **Configuración** muestra la cuenta, permite pedir el enlace de cambio de contraseña y cerrar sesión, e informa del proveedor de IA activo y del estado de la API. No edita el nombre ni el correo ni guarda preferencias, porque la API no tiene rutas para eso.

Los mensajes de error del backend están en inglés. El frontend los traduce al español en `src/utils/errors.ts`; un mensaje que no esté en esa lista se muestra tal cual. Si cualquier petición responde 401, la aplicación vuelve a la pantalla de inicio de sesión.

### Proyectos, terrenos y materiales

- **Portadas.** `ProjectCover.tsx` dibuja en SVG un edificio distinto para cada proyecto a partir de su identificador y su nombre (pisos, ancho, cubierta, árboles), con el aspecto del alzado de una lámina: líneas finas sobre retícula, ejes con su burbuja, el suelo rayado y una línea de cota. No lleva ninguna cifra, porque un número ahí se leería como una medida real. El dibujo varía **solo por el identificador y el nombre**: no representa un tipo de proyecto, porque la API no tiene ese campo, ni nada del edificio real (una casa de una planta puede recibir un dibujo de tres). Si se cambia el nombre, cambia la portada. Es un emblema para distinguir tarjetas. Con un campo `type` o `cover_url` en el backend, la portada podría reflejar algo real.
- **Terrenos.** Fichas con el contorno real del lote (sus vértices o su ancho y largo), filtros por nombre, proyecto y suelo, y un panel de detalle. Lo que no está registrado se muestra como «Sin registrar»; no se inventan coordenadas.
- **Materiales.** Además del listado con filtros, «Superficies del modelo 3D» muestra los acabados que el motor puede aplicar (`utils/surfaceMaterials.ts`) con sus valores reales de rugosidad, metalicidad y opacidad, y una vista ampliada. Las favoritas se guardan en `localStorage` (`arquila:favorite-surfaces`), solo en ese navegador. (Rehecho en la fase 4 del 18 de octubre: ver «Proyectos, materiales y terrenos».)
- **Listas de todos los proyectos.** `loadAcrossProjects` pide los proyectos y luego la lista de cada uno en paralelo, y guarda la respuesta 30 segundos. Cualquier escritura (`onWrite` en `services/http.ts`) vacía esa caché, y una carga fallida no se recuerda.

### Visor 3D y planos: lo que hacen y lo que no

- **Proyección.** «Ortográfica» dibuja y selecciona con una `THREE.OrthographicCamera` real. Los controles de órbita siguen moviendo la cámara en perspectiva; la ortográfica se coloca en su misma posición y ajusta su encuadre para mostrar, a la distancia del punto de órbita, lo mismo que la de perspectiva (`syncOrthographic` en `BuildingSceneManager.ts`). Por eso acercarse o alejarse hace zoom también en ortográfica y cambiar de proyección no desencuadra el modelo. El pase de oclusión ambiental cambia de modo con la cámara (`setCamera` en `postprocessing.ts`).
- **Techo.** El techo es una sola pieza apoyada en los cuartos de la última planta. Si se oculta alguno de ellos con su ojo, el techo se oculta también (`topFloorHasHiddenRoom`), en vez de quedar flotando, y el panel «Objetos» lo avisa. Vuelve al mostrar el cuarto.
- **Estado.** La barra inferior muestra la selección, la proyección y el guardado («Guardando…», «Cambios guardados», «Error al guardar») de lo único que el visor guarda en el servidor: el material de un elemento y la cubierta.
- **Lo que no hay.** No existe deshacer/rehacer ni mover, rotar o escalar, porque el modelo se genera a partir de los planos y no hay historial que deshacer.
- **Barra vertical de herramientas.** Antes se descartó porque tendría una sola herramienta. Ahora reúne las acciones sobre la selección que estaban repartidas entre el inspector y la barra inferior: enfocar, aislar cuarto, corte, vista interior, guardar imagen y atajos (`viewer/ToolRail.tsx`). Está en la celda de la escena, pegada a su borde izquierdo, y en el móvil pasa a ser una fila. Una herramienta que no aplica no se oculta: queda atenuada, sigue recibiendo el foco y su ayuda dice qué hacer («Selecciona un cuarto para aislarlo», «Aísla un cuarto para entrar a la vista interior»). Se usa `aria-disabled` y no `disabled` precisamente para que el motivo se pueda leer con el teclado y con un lector de pantalla.
- **Atajos.** `1` a `4` cambian la vista, `F` enfoca lo seleccionado, `I` aísla el cuarto seleccionado (o vuelve a mostrar todo) y `Esc` retrocede un paso: sale de la vista interior, luego del cuarto aislado y luego suelta la selección. `?` abre la ayuda (`viewer/ShortcutsDialog.tsx`). No se disparan mientras se escribe en un campo, con una ventana abierta ni con Ctrl, Alt o Cmd pulsados (`shortcutsBlocked` en `viewer/shortcuts.ts`), y la vista previa del inicio no escucha el teclado. La barra de estado añade un consejo que cambia con la selección.
- **Comprobación.** Ocultar objetos, girar el sol, la cámara ortográfica (incluida la selección con un clic) y la descarga en PNG se prueban en un navegador contra el motor real con `npm run capturas`. `StructureViewer.test.tsx` cubre que cada control llama al motor con lo que debe; el motor en sí no se puede ejecutar en jsdom.
- **Plantas generadas.** `PlanViewport.tsx` es un visor técnico: zoom (botones, `+` y `−`), desplazamiento (arrastre o flechas) y medición entre dos puntos en metros. Lee el dibujo generado; no es un editor de dibujo, que necesitaría un modelo de datos de trazos que la API no tiene.

### Apariencia y recorrido de muestra

- **Tema.** En Configuración se elige Claro, Oscuro o Automático (`state/theme.ts`). Automático sigue al sistema y cambia con él. La barra superior tiene las mismas tres opciones (y, en el móvil, el cajón «Más»).
- **Reducir movimiento.** El interruptor de Configuración (`state/motion.ts`) se suma al ajuste del sistema: quita las transiciones de la interfaz y hace que la cámara del modelo 3D y la del recorrido salten en vez de animarse. Ambas preferencias se guardan en `localStorage`, no en la cuenta.
- **Recorrido interior.** Está rotulado como «Escena de muestra» porque no usa datos de ningún proyecto. Las líneas de luz dejaron el cian y el magenta y usan el lima y un ámbar de la paleta; el botón se llama «Luces de acento». Las ventanas de la ciudad del fondo conservan sus colores.

### Capturas y comprobación en navegador

`npm run capturas` (`scripts/capturas.mjs`) abre el navegador instalado con Playwright, responde la API con datos de muestra y guarda en `docs/capturas/` nueve pantallas en claro y oscuro, a 1366 y a 390 px de ancho, más el inicio de sesión. Después usa el visor 3D como una persona: oculta un objeto con su ojo, gira el sol a 180°, cambia a la cámara ortográfica y selecciona con un clic, y descarga el PNG; falla si alguno de los pasos no responde.

### Pendientes de backend

Lo que la interfaz no puede ofrecer hasta que la API lo soporte:

- Rutas globales `GET /terrains` y `GET /materials`: hoy es una petición por proyecto.
- Imagen de portada y tipo de proyecto.
- Duplicar proyecto, versiones e historial de cambios. Responsable de una tarea.
- Luz de presentación guardada en la cuenta (hoy vive en el navegador) y renders guardados en el proyecto.
- Avance o progreso de un proyecto: no hay ningún campo que lo mida, así que las tarjetas muestran solo la insignia de estado (borrador, activo, archivado) y no una barra de progreso.
- Notificaciones.
- Favoritos y preferencias guardados en la cuenta.
- Miniaturas o fotos de materiales.

### Direcciones

Cada pantalla tiene su URL (`src/routes.ts`): `/`, `/proyectos`, `/terrenos`, `/materiales`, `/planos`, `/visor`, `/iluminacion`, `/recorrido`, `/renderizado`, `/tareas`, `/asistente` y `/configuracion`. Un proyecto se abre en `/proyectos/:id/:pestaña` (`terreno`, `planos`, `modelo-3d`, `elevaciones`, `materiales`, `analisis`, `archivos`, `asistente`), así que se puede enlazar a una pestaña concreta y el botón atrás del navegador funciona. `App.tsx` no guarda la pantalla actual: la lee de la dirección.

- Si la sesión no existe o caduca (401), se muestra el inicio de sesión **sin cambiar la dirección**; al entrar, el usuario queda en la pantalla que pidió. Cerrar sesión sí vuelve a `/`.
- Una dirección desconocida muestra «Página no encontrada» con un botón al inicio.
- En Vercel, `vercel.json` reenvía `/api` al backend y cualquier otra ruta a `index.html`; los archivos estáticos se sirven antes que esas reglas.
- La única dependencia añadida es `react-router`.
- **`modelo-3d`.** La pestaña del modelo se llamaba `/modelo`. Un enlace guardado con esa dirección sigue abriendo: `canonicalPath` (en `routes.ts`) devuelve la dirección actual y `App.tsx` la reemplaza sin añadir una entrada al historial, para que el botón atrás no rebote.
- **Migas de pan.** La cabecera del proyecto muestra «Proyectos › nombre › pestaña» (`ui/Breadcrumbs.tsx`); sustituyen al botón «← Proyectos». Solo están dentro de un proyecto, que es donde hay más de un nivel: en las demás pantallas el menú lateral ya dice dónde se está.
- **Paleta de comandos.** `Ctrl+K` (o `⌘K`), o el botón al final del buscador, abre un campo único (`CommandPalette.tsx`) para saltar a una pantalla, a una pestaña del proyecto abierto o a un proyecto por nombre, y para crear un proyecto, cambiar de tema o cerrar sesión. Ignora las tildes («analisis» encuentra «Análisis»). Los proyectos se buscan con la misma llamada del buscador (`useProjectSearch`, que espera 250 ms tras la última tecla). Es un `combobox` con su `listbox`: las flechas mueven la opción activa y Enter la ejecuta. La tecla `/` sigue llevando al buscador.

### Identidad visual

- **Tipografía.** Inter variable, alojada en el proyecto con `@fontsource-variable/inter` (sin peticiones a terceros, `font-display: swap`). Los títulos de página van a 28 px con peso 720; las cifras usan numerales tabulares.
- **Tres niveles de superficie.** Fondo, panel y tarjeta tienen tonos distintos en cada tema (`--bg`, `--panel`, `--panel-raised` en `styles/tokens.css`).
- **Un foco de lima por zona.** El lima queda para la acción principal y el elemento activo; el avatar, los puntos de los indicadores y los monogramas ya no lo usan.
- **Navegación.** Los módulos se agrupan en «Trabajo», «Visualización» y «Asistencia y cuenta».
- **Imagen protagonista.** La portada y el inicio de sesión muestran la casa de muestra dibujada por el propio visor 3D de ARQUILA: de día en el tema claro (`house-day.jpg`) y de noche en el oscuro (`house-night.jpg`), rotulada «Modelo de muestra · visor 3D» porque no es un proyecto del usuario. Las dos imágenes se regeneran con `npm run renders` (`scripts/renders.mjs`), que usa el visor como una persona: oculta los paneles, se acerca, desplaza el edificio a la derecha y pulsa «Guardar imagen». Ya no se usan las imágenes del recorrido interior. Para poner renders propios basta sustituir esos dos archivos en `src/assets/renders/`.
- **Inicio.** (Sustituido en la fase 3 del 18 de octubre: ver «Inicio de sesión y dashboard».) Hero a ancho completo con el saludo a 44–60 px y los indicadores reales de la API en una franja sobre la imagen; los accesos rápidos son una acción principal y una lista compacta. El velo oscuro sigue al texto y no al hero: sus paradas van en píxeles (opaco hasta 440 px, transparente a los 720 px), así que el resto de la escena queda a la vista. El contraste del texto se midió píxel a píxel sobre la imagen a 390, 820, 1024, 1366 y 1920 px: el peor punto del párrafo da 4,6:1 y el del saludo 5,6:1. La escena nocturna se usa también en el tema claro.
- **Inicio de sesión.** (Sustituido en la fase 3 del 18 de octubre.) Titular grande sobre la imagen y formulario sin tarjeta. No hay franja de datos porque sin sesión no hay ningún dato real que mostrar.

### Pantallas interiores

Las pantallas interiores abren con un título tipográfico grande, sus cifras y su acción principal, sin caja (`styles/pages/head.css`). La banda verde (`PageBand`) que conservaba Materiales se retiró en la fase 4 del 18 de octubre.

- **Proyectos.** Sin banda: el título es el total («4 proyectos», de 32 a 44 px) con el reparto por estado debajo, y ambos salen de `GET /summary`, no de la lista, porque la lista puede estar filtrada. Debajo va una barra con búsqueda, estado, orden y el conmutador de vista, y luego las tarjetas directamente sobre el fondo. «Crear proyecto» abre el formulario en un panel que se cierra al crear; «Ejemplos» es un botón secundario que solo aparece si `GET /templates` devuelve alguno. En esta pantalla el botón «Nuevo proyecto» de la cabecera deja el lima, para que haya un solo foco.
    - Tarjeta: portada de 180 px, insignia de estado sobre la portada con icono y palabra (`Badge.tsx`), nombre a 16 px y metadatos a 12 px. La vista de lista es una tabla ligera con filas de 56 px y la portada en miniatura (`layout="list"` en `ProjectCard.tsx`).
    - Mientras carga se ven marcadores con la forma de las tarjetas o de las filas (`skeleton` en `AsyncStatus.tsx`). Si no hay proyectos, el vacío ofrece crear el primero; si es el filtro el que no deja nada, ofrece quitarlo.
- **Detalle de proyecto.** Cabecera de 160 px con la portada del proyecto difuminada de fondo, el nombre a 36 px, el estado, la ubicación y las fechas de creación y actualización; las acciones (estado, editar, eliminar) van agrupadas a la derecha y «Deshacer» solo aparece cuando hay algo que deshacer. Las pestañas van subrayadas y sin caja, pegadas a la cabecera y fijas al desplazarse; una línea se desliza hasta la pestaña abierta (`Tabs.tsx` mide su posición) y en pantallas estrechas la fila se desplaza sola hasta ella. Los vacíos de Terreno, Planos y Materiales llevan título y un botón que lleva el cursor al primer campo del formulario del mismo panel (`FocusFormButton`).
- **Foco y detalle.** El foco de teclado en botones es un anillo lima de 2 px sobre otro verde oscuro, para que se vea tanto en fondo claro como oscuro; el lima solo sobre blanco no llega a 3:1 (`styles/polish.css`).
- **Terrenos.** Título con el total y, a su lado, una franja de una línea con el área total, la pendiente máxima y cuántos tienen pendiente registrada. Fichas con el contorno del lote a 160 px sobre una retícula y, a la derecha, un panel fijo con el terreno elegido (al entrar, el primero). Hasta 1024 px de ancho ese panel es una hoja que sube desde abajo solo cuando se elige un terreno, y se cierra con «Cerrar». Lo que no está registrado sigue diciendo «Sin registrar».
- **Materiales.** (Sustituido en la fase 4 del 18 de octubre: ver «Proyectos, materiales y terrenos».)
- **Configuración.** Una columna de 720 px sin cajas: la cuenta con un avatar de 64 px y «Cerrar sesión», y debajo Apariencia, Contraseña y Sistema separadas por una línea. El tema se elige entre tres opciones con una miniatura de cómo se ve cada una; siguen siendo botones con `aria-pressed`. «Reducir movimiento» es una casilla nativa dibujada como interruptor.
- **Inicio.** Bajo el hero hay dos bloques con datos reales: «Continuar donde lo dejaste», con el último proyecto no archivado y accesos directos a su modelo 3D, sus planos y sus materiales; y «Proyectos por estado», una barra repartida según `GET /summary` con su leyenda en texto.
- **Inicio de sesión.** Bajo el titular se listan tres cosas que la aplicación hace de verdad (modelo 3D, planos con cotas y costos), y el formulario abre con una frase que cambia según se entre, se cree la cuenta o se recupere la contraseña.
- **Editor 3D.** El visor ocupa el alto de la ventana que dejan la cabecera, las pestañas y el título (`styles/editor.css`). El texto que explicaba cómo se arma el modelo pasó a un botón de ayuda («Cómo se arma el modelo»), que es un `<details>`. Los paneles sobre la escena son oscuros en los dos temas (`data-theme="dark"` en la capa de paneles), de 216 y 232 px de ancho, con texto de 13 px y metadatos de 12 px. La barra de vistas va en una sola fila con iconos; por debajo de 1680 px el nombre de cada vista queda solo para lectores de pantalla y como `title`. La barra de estado está fija abajo y dice la selección, la cámara, la proyección, el zoom y el guardado. No cambió ningún control ni su nombre accesible: selección, cámaras, corte, despiece, capas, sol y descarga PNG siguen igual.
- **Tablero de dibujo.** El área de trabajo lleva una retícula muy tenue de 32 px, y los paneles, tablas y formularios de las pestañas del proyecto usan la misma escala que las pantallas nuevas (filas de 44 px, etiquetas de 12 px, formulario de alta apartado bajo su tabla).
- **Materiales con patrón.** El ladrillo, la madera y la piedra de los muros, las tejas de la cubierta y el césped del lote ya no son colores planos: `src/three/patterns.ts` genera por código, sin archivos de imagen, un mapa de color y otro de relieve para cada uno (ladrillo a soga con sus juntas, tablas, sillares, hiladas de tejas, manchas de césped), a escala real gracias a las coordenadas de textura en metros. En los modos Tipo, Coste y Alertas y al atenuar un elemento se vuelve al color plano, porque ahí manda el dato. Los árboles tienen tronco afinado y una copa de cuatro masas redondeadas, cada uno con su giro, su tamaño y su tono de verde; siguen siendo mallas instanciadas (cinco llamadas de dibujo en total).
- **Gizmo de orientación.** En la esquina inferior del visor, tres ejes giran con la cámara (`viewer/ViewGizmo.tsx`): X a lo ancho del lote, Y hacia el fondo y Z hacia arriba, igual que las coordenadas que se escriben en los planos. El motor avisa de la dirección de la cámara en grados (`onOrbit` en `BuildingSceneManager.ts`) y el gizmo se redibuja tocando el SVG directamente, sin volver a pintar React en cada giro.
- **Asistente desde cualquier pestaña.** Dentro de un proyecto, el botón «Asistente» de la barra superior abre a la derecha el mismo `AssistantPanel` de la pestaña Asistente IA, con la primera pregunta sugerida según la pestaña abierta (y, si hay un elemento seleccionado en el modelo, sobre ese elemento). Las respuestas vienen de la API (`POST /conversations/{id}/messages`); el panel dice siempre quién responde, un modelo local o las reglas fijas, y marca cada respuesta dada por reglas. No hay ninguna respuesta generada en el navegador.
- **Modelo en vivo en el inicio.** La tarjeta «Continuar donde lo dejaste» dibuja el modelo 3D real del último proyecto (`ProjectPreview.tsx`, que usa `StructureViewer` con `preview` para mostrar solo la escena, sin paneles). Se puede girar con el puntero. Three.js se descarga solo entonces; si el proyecto no tiene nada que dibujar o el navegador no tiene WebGL, queda la portada dibujada.
- **Cifras que cuentan.** Las cifras del inicio suben desde cero hasta su valor real al aparecer (`CountUp.tsx`); con «reducir movimiento» aparecen directamente.
- **Profundidad y movimiento.** `styles/rich.css` da luz a la barra lateral, deja la cabecera translúcida sobre el contenido, hace llegar las listas elemento a elemento y da a las tarjetas una sombra por capas, un acercamiento de la portada y una línea lima al pasar el cursor. Todas esas animaciones duran menos de medio segundo y se anulan con «reducir movimiento».
- **Título de la pestaña.** Cada pantalla pone su nombre en el título del navegador (`document.title` en `App.tsx`).
- **Móvil.** Los destinos de la navegación y de la cabecera miden al menos 44 px.- **Foco y detalle.** El foco de teclado en botones es un anillo lima de 2 px sobre otro verde oscuro, para que se vea tanto en fondo claro como oscuro; el lima solo sobre blanco no llega a 3:1 (`styles/polish.css`).
- **Terrenos.** Lista a la izquierda y, a la derecha, el terreno elegido con su contorno a escala sobre una retícula y sus datos en fichas; al entrar se muestra el primero. Lo que no está registrado sigue diciendo «Sin registrar».
- **Materiales.** (Sustituido en la fase 4 del 18 de octubre.)
- **Configuración.** La banda lleva la cuenta y «Cerrar sesión»; cada preferencia es una fila con su explicación a la izquierda y su control a la derecha. «Reducir movimiento» es una casilla nativa dibujada como interruptor.

El contraste del texto de las bandas se midió sobre la captura, píxel a píxel, igual que el del hero; ninguna pantalla se desborda a lo ancho a 390, 820, 1024 y 1366 px.

### Organización de los estilos y del visor

- **Estilos por área.** `src/styles/ui.css` solo tiene los componentes compartidos; lo demás se repartió en `design-system.css`, `projects.css`, `terrains.css`, `materials.css`, `plans.css` y `shell-phone.css`, y las pantallas nuevas en `src/styles/pages/` (un archivo por pantalla y `responsive.css`). `src/main.tsx` los importa en el mismo orden que tenían dentro de los archivos originales, porque en CSS plano el orden decide qué regla gana. El reparto se comprobó comparando las capturas byte a byte antes y después: 45 de 48 idénticas, y las tres restantes son de Proyectos, que ya varían entre dos ejecuciones iguales.
- **Visor 3D en piezas.** `StructureViewer.tsx` conserva el estado y la relación con el motor; lo que se dibuja encima vive en `src/components/viewer/`: `ViewBar` (vistas, zoom, proyección), `ObjectTree` (objetos por nivel), `ScenePanel` (capas, corte, despiece, sol, cubierta), `Toolbar` y `StatusBar`. Cada pieza recibe valores y funciones; ninguna habla con el motor. El inspector y el panel de color siguen dentro de `StructureViewer.tsx`.
- **Accesibilidad automática.** `npm run accesibilidad` (`scripts/accesibilidad.mjs`) pasa axe-core por nueve pantallas en claro y oscuro con las reglas WCAG 2.1 A y AA, y falla si hay alguna infracción grave o crítica. Usa los mismos datos de muestra que las capturas (`scripts/datos-de-muestra.mjs`). `axe-core` es dependencia de desarrollo.

### Sistema de diseño

Los tokens están en `src/styles/tokens.css` para los dos temas y son la única fuente de colores, tamaños, radios, sombras y duraciones: escala tipográfica `--fs-12` a `--fs-36` con 14 px de base, espaciado `--space-1` a `--space-8` en múltiplos de 4 px, radios `--r-sm` 6 (controles), `--r-md` 10 (tarjetas) y `--r-lg` 14 (diálogos), dos sombras (`--shadow` en reposo y `--shadow-float` para lo que flota) y tres duraciones (`--dur-fast` 120 ms, `--dur` 180 ms y `--dur-slow` 240 ms).

- **Qué se normalizó.** Los tamaños de letra escritos en `rem` o en píxeles pasaron al valor más cercano de la escala, con 12 px como mínimo; los radios y las duraciones de las transiciones, a sus tokens. Quedan fuera, a propósito: los tamaños fluidos de los titulares (`clamp()`), los textos de los dibujos SVG (van en unidades del dibujo, no en píxeles de pantalla), los radios de 2 a 4 px de barras y trazos, y las animaciones en bucle (indicador de carga, marcadores), que duran más que una transición.
- **Colores.** No quedan colores hexadecimales fuera de `tokens.css`, con una excepción: `src/utils/drawingPalette.ts`, la paleta de los planos generados. Un plano se descarga en SVG y se imprime, así que sus colores van escritos dentro del archivo y no como variables. Las portadas de proyecto sí usan variables (`--cover-*`).
- **Cifras.** Áreas, cotas, costos, niveles y conteos usan JetBrains Mono con numerales tabulares (`styles/numbers.css`), para que las columnas se alineen y una cifra se lea como dato. La fuente va alojada en el proyecto con `@fontsource-variable/jetbrains-mono`.
- **Contraste.** `npm run contraste` (`scripts/contraste.mjs`) lee los tokens y calcula el contraste de cada par texto/fondo en los dos temas; falla si alguno no llega a 4,5:1. Solo hubo que corregir uno: el verde de éxito del tema claro sobre el fondo (4,36:1), que pasó de `#1e7b4d` a `#1a7145` (4,98:1).
- **Iconos.** Todos salen de lucide-react a través de `Icon.tsx`, con trazo de 1,5; los sitios de uso no cambiaron. Las vistas frontal, lateral y superior no existen en el set y se dibujan con su misma fábrica (`createLucideIcon`), así que comparten trazo y tamaño.
- **Ventanas.** `ui/Dialog.tsx` sustituye a `Modal` y usa `@radix-ui/react-dialog`: mantiene el foco dentro, cierra con Escape o con un clic fuera y devuelve el foco al control que la abrió. Radix se usa solo aquí y en la paleta de comandos.
- **CSS Modules, poco a poco.** `Dialog`, `Card`, `Tooltip`, `Breadcrumbs`, `CommandPalette`, `ToolRail` y `ShortcutsDialog` tienen su hoja `*.module.css`. Los componentes anteriores siguen con clases globales: sus reglas están repartidas en varias hojas que se pisan por orden de importación (`.badge-status` tiene reglas en cinco archivos), y moverlas de golpe cambiaría el aspecto. Se migra un componente cada vez, comparando capturas.
- **Componentes nuevos de `ui/`.** `Card` (superficie), `Tooltip` (ayuda al pasar el cursor o al enfocar, enlazada con `aria-describedby`, que se cierra con Escape), `Skeleton` (extraído de `AsyncStatus`), `Input` y `Select` (el control nativo ya unido a `Field`) y `Breadcrumbs`. `Badge`, `Panel` y `MetricCard` se movieron a `ui/` sin cambiar.

Un tema se puede aplicar a cualquier contenedor con `data-theme`, no solo a la página. Los componentes compartidos viven en `src/components/ui/`: `Button` (primario, secundario, terciario, destructivo y estado de carga), `Field` (etiqueta, ayuda y error unidos al control), `Tabs`, `Menu` (menú contextual sobre `<details>`), `ProgressBar` y `EmptyState`. Junto con `Panel`, `Dialog`, `Badge`, `MetricCard`, `AsyncStatus`, `Toasts` y `ProjectCard` se muestran, en claro y en oscuro, en `/design-system`. Esa página solo existe en desarrollo (`npm run dev`); la compilación de producción no la incluye.

### Identidad visual y navegación

La identidad sigue `docs/DISENO_ARQUILA.md`: verde bosque (`#0B211A`, `#12382A`), verde de interacción (`#236B42`) y verde lima (`#B8F36B`) solo para lo seleccionado, lo activo y la acción principal. Todos los colores son variables de `src/styles/tokens.css`, definidas para el tema claro y el oscuro. Los estilos están en `src/styles/`, en archivos por área que `src/main.tsx` importa en orden; ese orden importa, porque los últimos (`hierarchy`, `states`, `media`) afinan lo que definen los primeros.

- **Sin Tailwind.** El documento pide no añadir dependencias sin justificarlas; la interfaz sigue en una sola hoja de estilos con variables.
- **Menú lateral.** Mantiene el verde bosque en los dos temas, se contrae a una columna de iconos (se recuerda en `localStorage`, clave `arquila:sidebar`) y entre 721 y 1024 px se contrae solo. Con doce módulos, en una ventana baja la lista se desplaza sola y la cuenta queda siempre a la vista. Todos los módulos tienen pantalla real.
- **Cabecera.** Ver «Barra superior» en la sección de la fase 2 del 18 de octubre. El buscador (`GlobalSearch.tsx`) busca proyectos por nombre con `GET /projects?search=`.
- **Avisos.** Crear, archivar, reactivar o eliminar un proyecto confirma con un aviso breve abajo a la derecha (`state/toasts.ts`, `Toasts.tsx`); los errores siguen junto al control que falló. La tecla `/` lleva el foco al buscador.
- **Tema inicial.** Mientras el usuario no elija uno, se usa el que pide el sistema (`prefers-color-scheme`).
- **Imágenes.** `src/assets/renders/` tiene dos renders (día y noche) de una casa de muestra, hechos con el propio visor 3D de ARQUILA; no son fotos de terceros ni el modelo de ningún proyecto. `RenderImage.tsx` los muestra en la portada (según el tema) y en el inicio de sesión, con aparición suave y, si la imagen no carga, la ilustración vectorial de `ArchitectureArt.tsx`.
- **Portadas.** La API no guarda imagen de portada, así que `ProjectCard.tsx` pone las iniciales del proyecto sobre uno de esos renders oscurecido: es decoración, no una imagen del proyecto.
- **Proyectos.** Orden y vista de cuadrícula o lista en el cliente; archivar, reactivar y eliminar (con confirmación) usan `PATCH` y `DELETE /projects/{id}`. No hay «duplicar» porque la API no lo ofrece. (Fase 4 del 18 de octubre: también vista de cronograma y confirmación en ventana.)
- **Modelo 3D.** El panel «Objetos» agrupa por nivel en espacios y estructura, permite buscar y ocultar cada objeto (`setHidden` en `BuildingSceneManager.ts`). El tema oscuro es una escena nocturna y el claro una diurna; la oclusión ambiental (`GTAOPass` en `postprocessing.ts`) deja fuera vidrios, elementos atenuados, líneas y el cielo. El control «Sol» gira la luz alrededor del modelo (`setSun`) y «Guardar imagen» descarga la vista como PNG (`capture`); ninguno de los dos se guarda en el servidor. Mover, rotar o escalar objetos no existe: el modelo se genera a partir de los planos.

### Sistema visual y navegación (fase 2 del 18 de octubre de 2026)

Encargo de cerrar huecos frente a una apariencia de software profesional de arquitectura. Commits `80a2788`, `f3b4a21` y `93b1bbf`.

**Paleta.** El tema claro usa los valores del encargo: fondo `#F4F6F2`, paneles blancos, bordes `#DFE5DE` y texto secundario `#68736B`. Ese gris pasa 4,5:1 sobre el fondo (4,54) pero no sobre la superficie elevada anterior `#F2F5EF` (4,49), así que `--panel-raised` pasó a `#F8FAF6` (4,70). El tema oscuro no cambió. `npm run contraste` da todos los pares por encima de 4,5:1.

**Superficies sólidas.** No queda ningún `backdrop-filter`: los paneles del visor y del recorrido, la cabecera, la franja de cifras del inicio (ahora con un velo del 86 %) y el fondo de los diálogos son opacos. Las sombras son dos y discretas (`--shadow`, `--shadow-float`); los bordes de 1 px marcan los límites, como en una lámina. Se quitaron los brillos y degradados de los botones principales, de la tarjeta «Continuar», del estado vacío, del formulario de acceso y de la barra lateral.

**Densidad.** `--row-height` (44 px) y `--row-head-height` (36 px) miden las filas de las tablas. Con `data-density="compact"` en `<html>` pasan a 36 y 32 px y los controles a 32 px. Todavía no hay un control que lo active: se conecta en Configuración en la fase 7.

**Componentes nuevos de `ui/`** (con su `*.module.css`, pruebas en `ui.test.tsx` y muestra en `/design-system`):

- `Drawer`: panel lateral o inferior sobre Radix Dialog. Es modal; el asistente conserva su panel no modal porque tiene que dejar usar el visor mientras está abierto.
- `ConfirmDialog`: `alertdialog` que abre con el foco en «Cancelar», para que pulsar Enter por costumbre no borre nada, y que no se puede cancelar mientras la acción está en curso. Los `window.confirm` existentes se sustituyen pantalla por pantalla en las fases 3 y 4.
- `SegmentedControl`: grupo de radio con una sola parada de tabulación y flechas, para el tema y para cuadrícula o lista.
- `Switch` (casilla nativa con `role="switch"`), `Spinner` (decorativo, o anunciado si lleva etiqueta) y `SaveIndicator` (guardando, guardado o error, siempre con palabra e icono).
- `DataTable`: cabecera fija, orden natural («Lote 2» antes que «Lote 10») con `aria-sort`, vacíos al final en los dos sentidos y `data-label` para la vista de fichas del móvil. `FilterBar`: búsqueda, filtros, recuento anunciado y «Quitar filtros».

**Barra superior** (`TopBar.tsx`). Dice dónde se está (el título es el único `h1`), tiene el buscador de proyectos, un hueco para los controles de la pantalla abierta, «Nuevo proyecto» (lima salvo en Proyectos), el tema en tres opciones y un menú de cuenta con quién ha entrado, la configuración y «Cerrar sesión». Por debajo de 1280 px el nombre del usuario deja solo el avatar, y por debajo de 1100 px «Nuevo proyecto» y «Asistente» quedan como iconos con su nombre accesible. No hay notificaciones porque la API no tiene.

- **Hueco de la pantalla.** `TopBar` entrega su elemento a `App`, que lo pasa con `TopBarSlotProvider` (`state/topBarSlot.ts`). Un proyecto pone ahí, con un portal, su estado de guardado y el botón «Asistente». Sin barra superior (una prueba de la pantalla sola) los dibuja encima del proyecto.
- **Estado de guardado.** Refleja las escrituras del proyecto que pasan por `run` en `ProjectDetailPage.tsx` (terrenos, planos, cuartos, materiales, archivos, recomendaciones, estado): «Guardando…», «Cambios guardados» o «Error al guardar». Desde la fase 5 cubre también lo que guarda el editor 3D (material de un elemento, cubierta, mover y redimensionar).
- **Asistente.** El botón dejó de flotar en la esquina, donde tapaba Editar y Eliminar de las tablas, las vistas del visor y el selector de cubierta. El panel sigue a la derecha y en el móvil sube desde encima de la barra inferior.
- **Paleta de comandos.** El nombre accesible del botón «Ctrl K» empieza por su texto visible («Ctrl K: abrir la paleta de comandos», WCAG 2.5.3). Era el fallo grave que axe marcaba en todas las pantallas con sesión.

**Barra inferior del móvil** (`MobileNav.tsx`). Hasta 720 px la barra lateral se oculta y abajo quedan Inicio, Proyectos, Planos, Tareas y «Más»: lo que más se consulta desde un teléfono. «Más» abre un cajón con los demás módulos, el tema y la cuenta, y se marca cuando el módulo abierto está dentro. El componente solo se dibuja cuando la consulta de medios coincide (`useMediaQuery`), así que en escritorio no hay dos navegaciones para un lector de pantalla. El contenido y los avisos dejan sitio para la barra.

**Barra lateral.** Fondo plano verde bosque; el módulo abierto lleva fondo `#12382A`, una línea lima a la izquierda y el icono lima, sin brillo. Los grupos se separan con una línea fina. Las flechas, Inicio y Fin mueven el foco entre módulos (Tab sigue recorriéndolos uno a uno). Cuando solo se ven los iconos (contraída, o entre 721 y 1024 px) el nombre del módulo aparece a su lado al pasar el cursor o al enfocarlo; se dibuja con posición fija para que la lista desplazable no lo recorte, y se cierra con Escape.

**Lista de comprobación visual.** Se revisa en cada fase, pantalla por pantalla, en claro y oscuro:

1. Todas las pantallas comparten la misma identidad visual.
2. El inicio tiene una jerarquía clara y los renders tienen protagonismo.
3. El editor 3D prioriza el área de trabajo.
4. Los planos 2D se leen como una herramienta técnica.
5. La biblioteca de materiales es visual y fácil de explorar.
6. Formularios legibles, paneles de propiedades ordenados, tablas y listas sin saturación.
7. Estados de carga y de error diseñados.
8. El móvil tiene una distribución propia, no una versión apretada del escritorio.

Al cerrar la fase 2 se miraron Inicio, Proyectos, la pestaña Materiales, el Modelo 3D y Configuración a 1280, 820 y 390 px en los dos temas (`npm run capturas` con `CAPTURAS_SALIDA`, sin tocar `docs/capturas/`). Visto y sin corregir todavía: a 820 px la tabla de materiales del proyecto se sale de su panel por la derecha (fase 4).

### Inicio de sesión y dashboard (fase 3 del 18 de octubre de 2026)

Commits `c8cb02e` (acceso) y `9402e69` (inicio).

**Inicio de sesión** (`AuthScreen.tsx`, `LoginPage.tsx`, cada uno con su `*.module.css`).

- **Composición.** En escritorio el render va a la izquierda, entero y sin velo, con el texto debajo sobre verde bosque sólido; el formulario va a la derecha. En la página el formulario va primero, así que en el móvil y para un lector de pantalla es lo primero; la imagen queda después. Antes el texto iba sobre la imagen con un velo que tapaba casi toda la casa.
- **Formulario.** Sin tarjeta: título, una línea de contexto, los campos, el ojo dentro del campo de contraseña (un solo nombre, «Mostrar contraseña», y `aria-pressed` dice si se ve), «Olvidé mi contraseña» bajo el campo y el botón lima, que se bloquea y muestra su carga mientras se envía. Los errores y avisos llevan icono y texto. La validación es la de `LiveForm`, al salir de cada campo.
- **Autenticación.** El mismo flujo: `POST /auth/login`, `/auth/register` y `/auth/password-reset`; la cookie la pone el backend y el navegador no guarda nada. Recuperar la contraseña se muestra porque la API lo soporta; «Recordar sesión» no, porque la API no tiene una duración de sesión que elegir (`CAMBIOS_BACKEND.md`, punto 7).
- **Imagen.** La misma de antes (`RenderImage`), con su rótulo «Modelo de muestra · visor 3D» y la ilustración vectorial si no carga.
- **Tema.** Las tres opciones están también antes de entrar.
- Se quitaron `styles/auth.css`, `styles/pages/auth.css` y las reglas `.auth*` del resto de hojas.

**Entrada de la aplicación** (`BrandIntro.tsx`, `BrandMark.tsx`). Las cuatro barras lima de la marca se colocan una tras otra, como muros en una planta (el suelo crece desde la izquierda, el muro hacia arriba, el dintel desde la derecha y el poste hacia abajo), y aparece el nombre; luego todo se desvanece. Dura menos de un segundo, solo con `transform` y `opacity`. No captura clics (`pointer-events: none`), cualquier tecla o clic la termina, se muestra una vez por pestaña (`sessionStorage`, clave `arquila:intro`) y nunca con movimiento reducido, del sistema o de Configuración. Es decorativa (`aria-hidden`). La marca pasó a SVG para poder animar cada barra; la barra lateral sigue dibujándola en CSS.

**Dashboard** (`HomePage.tsx`, `HomePage.module.css`).

- **Héroe.** El saludo, el texto y las dos acciones van sobre verde bosque con una línea lima a la izquierda; el render va a su lado, entero. «Crear proyecto» abre el formulario de creación (antes solo llevaba a la lista) y «Explorar proyectos» lleva a la lista. En el móvil el saludo va primero y la imagen debajo.
- **Cifras.** Tres tarjetas bajo el héroe con lo que devuelve `GET /summary`: proyectos (con el reparto por estado), terrenos (con el área total) y costo de materiales. El encargo pedía también en progreso, completados, materiales guardados y planos creados: la API no tiene estado «completado», no cuenta planos ni materiales y solo da el costo, así que esas cifras no se muestran. «Activo» es el estado de la API, no «en progreso». Las palabras concuerdan con la cifra («1 activo», «1 archivado»). La fila guarda su alto mientras carga.
- **Proyectos recientes.** La tarjeta muestra la portada (la miniatura del modelo o la portada dibujada), el nombre, el estado, la ubicación y la fecha de actualización. No hay tipo de proyecto ni avance, porque la API no los tiene. El menú tiene Abrir, Ver el modelo 3D, Archivar o Reactivar y **Eliminar…**, que pide confirmación (`ConfirmDialog`) y dice que se borran también terrenos, planos, cuartos, materiales y archivos; se comprobó en el esquema (`ON DELETE CASCADE`) y en el servicio, que borra los archivos guardados. Duplicar no está porque la API no lo ofrece.
- **Accesos rápidos.** Las descripciones ocupan hasta dos líneas en vez de cortarse.
- Se quitaron las reglas `.hero*` del héroe anterior.

**Tabla de materiales a 820 px.** No se corrigió. La tabla no desborda la página, sino su panel, que se desplaza en horizontal y deja la columna de acciones cortada. Se probaron dos cambios pequeños y ninguno bastó:

| Intento | Materiales a 820 px | Terreno a 760 px |
|---|---|---|
| Sin cambios | se sale | se sale |
| Texto de las celdas en varias líneas | sobran 77 px y se lee peor | — |
| Celdas más estrechas y «Editar»/«Eliminar» apilados | sobran 46 px | sobran 71 px |

A 1024 y 1100 px no se sale ninguna tabla. Queda para la fase 4: pasar a fichas antes de 720 px o recoger las acciones en un menú.

### Proyectos, materiales y terrenos (fase 4 del 18 de octubre de 2026)

Commits `96d07d3` (CLS de Materiales), `fcdf74a` (proyectos), `234c10d` (materiales) y `f92000a` (terrenos).

**Proyectos** (`ProjectsPage.tsx`).

- `FilterBar` con búsqueda, estado y orden (actualizados, creados, nombre) y un `SegmentedControl` para la vista: cuadrícula, lista (`DataTable`, ordenable por columna) y cronograma. Eliminar pide confirmación en `ConfirmDialog`.
- **Cronograma** (`ProjectTimeline.tsx`, `utils/timeline.ts`). Usa solo las fechas de las tareas: `planned_start`, `planned_end` y `completed_at`. Una barra necesita las dos fechas previstas; con una sola es un rombo en ese día y el texto dice «sin la otra fecha»; el día en que se terminó es un punto; una línea marca hoy si cae dentro. Las tareas sin ninguna fecha se listan aparte y se nombran los proyectos sin tareas. La API no tiene fechas de proyecto: un proyecto dura lo que duran sus tareas. Respeta los filtros de la página. Las tareas se piden solo al abrir el cronograma, una petición por proyecto, con la misma caché que Tareas (`loadProjectTasks`). Para los lectores de pantalla cada tarea lleva sus fechas en palabras.
- No hay duplicar ni tipo de proyecto (`CAMBIOS_BACKEND.md`, punto 11).

**Biblioteca de materiales** (`MaterialsPage.tsx`, `SurfaceLibrary.tsx`, `SurfaceSwatch.tsx`). Dos pestañas, porque son dos catálogos distintos que existen de verdad:

- **Superficies del modelo 3D**, la que abre: las siete del motor, con búsqueda, filtro por acabado (con relieve, lisas, metálicas, translúcidas), orden por nombre, rugosidad o metalicidad, y favoritas de este navegador. Las muestras se dibujan con los mismos píxeles que las texturas del motor: los generadores de ladrillo, tablas y sillares pasaron de `three/patterns.ts` a `utils/patternPixels.ts`, sin three.js, y el motor solo los convierte en `DataTexture`. Así la biblioteca no carga el motor (la página pesa 11 kB). La vista ampliada es un `Drawer` con color base, rugosidad, metalicidad, opacidad, relieve, mapa normal (no hay: el motor usa bump) y repetición a escala real. Los controles para editar esos valores aparecen deshabilitados y dicen por qué: las superficies son fijas y la API no guarda materiales propios (punto 8). «Aplicar a un elemento» explica que se hace en el inspector del editor 3D y abre el editor.
- **Materiales de obra**: las partidas de presupuesto de todos los proyectos, en `DataTable` con búsqueda, categoría y orden; el nombre del proyecto es el enlace que lo abre. Debajo, el costo por categoría.
- Las categorías del encargo que no son superficies del motor (cerámica, mármol, pinturas, textiles, personalizados) no se muestran. La banda verde de cabecera (`PageBand`) desapareció: Materiales era su único uso.

**Terrenos** (`TerrainsPage.tsx`). `FilterBar` con búsqueda, proyecto, suelo y orden (nombre, mayor área, mayor pendiente; las pendientes sin registrar van al final). El detalle añade dimensiones (la envolvente si el lote es un polígono), perímetro y número de lados, el desnivel del fondo (fondo × pendiente, la misma regla que la vista lateral), la ubicación del proyecto, la orientación y las coordenadas.

- **Orientación.** Es el norte que el usuario fija en el plano de implantación; se guarda en este navegador (`state/siteSettings.ts`) y la ficha lo dice. Sin él, «Sin registrar».
- **Mapa.** No hay mapa incrustado: no hay una integración cartográfica en el proyecto y no se añade una dependencia. Con coordenadas, un enlace abre OpenStreetMap en otra pestaña.

**Tablas que pasan a fichas por el ancho de su panel.** Antes la regla era la ventana (720 px) y una tabla de seis columnas en un panel de tableta se salía (Materiales a 820 px, Terreno a 760 px). Ahora los paneles con una tabla y `DataTable` son contenedores (`container: table-host / inline-size`) y la tabla pasa a fichas cuando su contenedor mide menos de 760 px, sea cual sea la ventana. Con sitio para dos, las fichas van en dos columnas (`auto-fit`, así una ficha sola ocupa toda la fila). Medido en 1440, 1024, 820, 768, 760 y 390 px: ninguna tabla se sale; tabla a partir de 1024 px y fichas por debajo de 820 px. La tabla de Materiales de obra tenía siete columnas y se salía 21 px a 1024; se quitó la columna «Abrir» haciendo del proyecto el enlace, en vez de mover el umbral.

**Lista de comprobación visual en estas pantallas** (claro y oscuro, a 1440, 1024, 768 y 390 px):

| Estándar | Proyectos | Materiales | Terrenos |
|---|---|---|---|
| 1. Misma identidad visual | Sí | Sí | Sí |
| 2. Inicio con jerarquía y render protagonista | — (fase 3) | — | — |
| 3. Editor 3D prioriza el área de trabajo | — (fase 5) | — | — |
| 4. Planos como herramienta técnica | — (fase 5) | — | — |
| 5. Biblioteca visual y fácil de explorar | — | Sí: muestras grandes con el dibujo del motor, filtros y vista ampliada | — |
| 6. Formularios, propiedades, tablas y listas sin saturación | Sí | Sí | Sí, el detalle en dos columnas de datos |
| 7. Carga y error diseñados | Sí, también en el cronograma | Sí | Sí |
| 8. Móvil con distribución propia | Sí: fichas, cronograma con la etiqueta sobre su pista | Sí: tarjetas en una columna, tabla en fichas | Sí: lista y hoja de detalle |

Visto y pendiente: a 768 px el título de la barra superior se corta («Proye…») porque los controles de la derecha ocupan el resto; va a la fase 7 (responsive).

### Editor 3D, planos e iluminación (fase 5 del 18 de octubre de 2026)

Commits `d055d41` (editor 3D), `6c9dc05` (planos) y el de iluminación.

**Editor 3D** (`/visor`, `StructureViewer.tsx`, `styles/workspace.css`). Los paneles se acoplan alrededor de la escena en una rejilla: barra superior (proyecto, estado de guardado, deshacer, rehacer, mostrar u ocultar Objetos e Inspector), herramientas en vertical, árbol de objetos por nivel y categoría (seleccionar, mostrar u ocultar, buscar), la escena en el centro, el inspector a la derecha (posición, medidas, material, visibilidad) y abajo la cámara (vistas frontal, lateral, superior e isométrica, zoom, perspectiva u ortográfica, encuadre, pantalla completa) y el estado. Cada lado se pliega por separado. El árbol es una lista plana (las filas no llevan borde salvo al pasar el cursor) y los paneles miden 216 y 264 px.

- **Transformaciones.** X, Y, ancho, fondo y alto de un cuarto se guardan con `PATCH /rooms/{id}`, ajustados a una cuadrícula elegible (0,05 a 1 m). Mover y redimensionar se deshacen y rehacen (Ctrl+Z, Ctrl+Y) con peticiones reales. «Rotar» aparece deshabilitado: la API no guarda un ángulo (`CAMBIOS_BACKEND.md`, punto 12).
- **Materiales.** El inspector aplica a cada elemento una de las siete superficies del motor con `PATCH …/surface`; no hay materiales propios (punto 8).
- **Estado de guardado.** Uno por proyecto (`state/projectSave.ts`): lo alimentan los formularios de las pestañas, el material de un elemento, la cubierta y los movimientos. Se ve en la barra del editor y, fuera de él, en la barra superior. La barra de estado del visor ya no tiene su propio aviso.

**Planos 2D** (`/planos`, `PlansPage.tsx`, `PlanViewport.tsx`). Un tablero: láminas a la izquierda, agrupadas en plantas (una por nivel), fachadas y corte, e implantación (una por terreno); la lámina en el centro; propiedades, exportación, ocupación del lote y herramientas de dibujo a la derecha. Por debajo de 1100 px las láminas pasan a una fila sobre el dibujo y las propiedades van debajo.

- **Visor técnico** en todas las láminas: zoom (botones, + y −), desplazamiento (arrastrar o flechas), «Centrar plano», medir entre dos puntos, cuadrícula de un metro (cinco si un metro mide menos de 8 px), reglas en metros desde el borde de la lámina que siguen al zoom, y escala gráfica en la esquina. Los ejes estructurales (A, B… y 1, 2…) están en las plantas.
- **Exportar.** SVG con sus colores (la prueba e2e comprueba que el archivo se abre como SVG y lleva el dibujo) e impresión del navegador para guardar como PDF. No hay DXF ni PNG.
- **Herramientas de dibujo** (muros, habitaciones, puertas, ventanas, líneas, cotas, textos, duplicar, eliminar): deshabilitadas con el motivo, porque las láminas se generan con cuartos y terrenos y la API no guarda trazos (punto 14). Un botón lleva al editor 3D, donde los cuartos sí se mueven.

**Iluminación y clima** (`/iluminacion`, `LightingPage.tsx`, `utils/lighting.ts`). La escena ocupa la altura de la ventana y el panel va a su lado (debajo por debajo de 900 px).

- **Sol real.** Con la latitud y la longitud del primer terreno que las tenga (`useSolarSite`), `solarPosition` calcula la altura y el azimut del sol con las ecuaciones de la NOAA para la fecha y la hora. La hora es la del huso de la longitud (15° por hora): UTC−5 en Casa Mirador. El rótulo del visor dice la hora, la fecha, el cielo, «Sol a 60° · azimut 118° (SE)» y si hay sombras.
- **Norte del terreno.** Grados desde el fondo del lote, en el sentido del reloj (la misma convención que la implantación). Si la implantación tiene otro norte guardado, el panel lo dice y ofrece usarlo.
- **Sin coordenadas** el sol sigue el arco de 6:00 a 18:00 de antes, el control se llama «Orientación solar» y la fecha queda deshabilitada con el motivo.
- **Controles.** Fecha, hora, norte, intensidad, temperatura (deshabilitada de noche, con el motivo), cielo, nubosidad, exposición y sombras. Se comprobó en el navegador que cada uno cambia la imagen (ver `PROGRESO.md`). Renderizado usa la misma luz y el mismo sol.

**Recursos de Three.js.** El motor libera geometrías, materiales y texturas al cambiar de proyecto (`clear` y `disposeObject`) y, al desmontarse, todo lo demás y el contexto WebGL (`dispose` con `forceContextLoss`). Las pantallas sin visor no cargan three.js: el motor se importa bajo demanda.

**Lista de comprobación visual** (claro y oscuro, a 1440, 1024, 768 y 390 px):

| Estándar | Editor 3D | Planos 2D | Iluminación |
|---|---|---|---|
| 1. Misma identidad visual | Sí | Sí | Sí |
| 2. Inicio con jerarquía y render protagonista | — | — | — |
| 3. Editor 3D prioriza el área de trabajo | En parte: paneles acoplados y plegables, pero a 1440 px con el menú abierto la escena mide 614 px | — | Sí: la escena ocupa la altura y casi todo el ancho |
| 4. Planos como herramienta técnica | — | Sí: reglas, cuadrícula, escala, medir, láminas | — |
| 5. Biblioteca visual y fácil de explorar | — | — | — |
| 6. Formularios, propiedades, tablas y listas sin saturación | Sí: árbol como lista, inspector por secciones plegables | Sí | Sí: lugar, sol, cielo, imagen y ajustes rápidos |
| 7. Carga y error diseñados | Sí | Sí, también «Todavía no hay láminas» | Sí, y el caso sin coordenadas |
| 8. Móvil con distribución propia | En parte: herramientas en fila y paneles debajo, pero el modelo se encuadra pequeño y en la parte baja de la escena | Sí: láminas en una fila desplazable | Sí: escena arriba, panel debajo |

### Movimiento

El movimiento explica un cambio (qué apareció, qué se movió, qué se guardó); no decora. Todo sale de `src/styles/motion.css`.

- **Qué se anima.** Solo `transform` y `opacity`, para que nada desplace la maquetación. Ejemplos: el subrayado de las pestañas ya no cambia de ancho, sino que se estira con `scaleX`; la barra de progreso se llena con `scaleX`; los paneles del visor se pliegan deslizándose y sus celdas conservan el tamaño. La única excepción es el plegado del menú lateral, que cambia la columna de la rejilla (`grid-template-columns`): ahí el contenido sí debe ganar el ancho que el menú suelta.
- **Duraciones.** Tres, en `tokens.css`: 120 ms (pasar el cursor, foco, pulsar), 180 ms (paneles, menús, ayudas) y 240 ms (ventanas, cambios de pantalla). Nada de la interfaz dura más. Una presentación (un gráfico o el modelo que se arma) puede llegar a 600 ms (`--dur-show`). Los bucles que significan «trabajando» (el indicador de carga y el brillo de los marcadores) tienen su propio periodo.
- **Curvas.** `--ease-out` para lo que entra, `--ease-in` para lo que sale y `--ease-in-out` para lo que pasa de un estado a otro. Lo que entra dura más que lo que sale.
- **Un solo interruptor.** Si el sistema pide reducir el movimiento, o lo apagas en Configuración, todas las animaciones y transiciones terminan al instante en su estado final. Está en `motion.css` y ningún componente lo repite.
- **Lo que hay.**
    - Cambio de pantalla: la pantalla nueva sube 8 px mientras aparece (`.content > *`), también con el botón atrás. Donde el navegador tiene View Transitions, además el contenido anterior se desvanece (`state/viewTransition.ts`): solo el área de contenido, que lleva `view-transition-name`; la cabecera y el menú no se mueven. Para que el navegador capture la pantalla nueva y no la anterior, el router va con `useTransitions={false}`: así React la dibuja dentro de `flushSync`.
    - Ventanas, menús, ayudas y paleta: crecen desde el 96 % y salen más rápido. Para que una ventana pueda salir antes de desaparecer, `useAnimatedClose` retrasa el cierre hasta que termina su animación.
    - Listas y tarjetas: llegan una tras otra con 35 ms de diferencia, solo las ocho primeras; una tarjeta sube 2 px al pasar el cursor.
    - Avisos: entran desde el borde, muestran en una barra el tiempo que les queda, esperan mientras el cursor o el foco están encima y salen deslizándose (`state/toasts.ts`).
    - Guardar: el botón del formulario que se envió pasa a «Guardando…» y luego a «Guardado» con un check (`FormActions`, que escucha `state/saveStatus.ts`).
    - Tema: los colores se cruzan en 180 ms. El lienzo 3D queda fuera, y en la primera carga no se anima nada.
    - Formularios: el mensaje de error aparece con fundido y el campo se sacude una vez.
    - Cifras y gráficos: las cifras del inicio y de «Ocupación del lote» cuentan hasta su valor; las barras de los gráficos y de progreso se dibujan al aparecer.
    - Modelo 3D: la primera vez que se muestra, los niveles parten un cuarto separados y se asientan (el mismo despiece amortiguado, unos 600 ms). El visor sigue dibujando solo mientras dura.
    - Planos: los ejes aparecen con fundido y las cotas se trazan. Solo en pantalla: un plano descargado o impreso no lleva hoja de estilos y sale siempre completo.
- **Sin saltos al cargar.** Inicio, Proyectos, Terrenos, Materiales y Modelo 3D ocupan su forma final desde el primer momento, con marcadores, y el contenido los sustituye sin mover lo demás.
- **Cómo se comprueba.** `styles/motion.test.ts` lee todas las hojas de estilo y falla si alguna, fuera de `motion.css`, define una curva, un keyframe o una duración a mano, o pone una transición sobre el ancho, el alto, la posición o los márgenes. Solo mira las hojas `.css`: las duraciones que viven en el código (el conteo de cifras, el dibujo de los gráficos, la vida de un aviso) no las ve. `npm run movimiento` (`scripts/movimiento.mjs`) abre siete pantallas en el navegador: con movimiento reducido no puede quedar ninguna animación en marcha, y con movimiento normal mide el desplazamiento de la maquetación (CLS) con la API respondiendo 350 ms tarde, para que la carga se vea siempre. Resultado del 13 de octubre de 2026: 0,0000 en Inicio, Proyectos, Modelo 3D, Terrenos y Configuración; 0,0131 en Materiales y 0,0414 en la pestaña Planos, donde la tabla que llega empuja su formulario.
- **Demostración.** `/design-system` tiene una muestra de cada animación con un botón para repetirla.

### Miniaturas, gráficos, validación y fallos del visor

- **Miniatura del modelo.** La portada de una tarjeta de proyecto es la imagen de su modelo 3D. El visor la toma dos segundos después de dibujar el modelo (`capture()`), la reduce a un JPEG de 480 × 270 px y la guarda en `localStorage` (`state/thumbnails.ts`). Solo se toma del modelo completo tal como abre: no de un cuarto aislado, de una selección ni de una luz de presentación. Se conservan las de los últimos 24 proyectos, para no llenar el almacenamiento, y si aun así está lleno la imagen simplemente no se guarda. Un proyecto que no se ha abierto en ese navegador sigue mostrando la portada dibujada. Guardarla en la cuenta necesita backend (`CAMBIOS_BACKEND.md`).
- **Costo por categoría.** El gráfico de Materiales, en la pantalla general y en la pestaña del proyecto, es de Recharts (`CostChart.tsx`): una barra horizontal por categoría con su importe, y el porcentaje al pasar el cursor. Recharts pesa unos 107 kB comprimido, así que se carga aparte y solo cuando hay algo que dibujar. Las mismas cifras van en una tabla que solo leen los lectores de pantalla; el dibujo lleva `aria-hidden`. Los colores salen de los tokens a través de clases, no de valores escritos en el componente.
- **Validación en vivo.** Todos los formularios son `LiveForm` (`ui/LiveForm.tsx`). Un campo se comprueba al salir de él y, desde entonces, con cada tecla, de modo que el mensaje desaparece en cuanto el valor es correcto; salir de un campo vacío que nunca se tocó no es todavía un error. Al enviar se comprueban todos y el cursor va al primero que falla. Las reglas son los atributos que cada campo ya tenía (`required`, `min`, `type="email"`…); `utils/validation.ts` convierte el veredicto del navegador en una frase que dice qué hacer («El valor más bajo que se admite es 0,01»). Una regla propia de la pantalla se pone con `setCustomValidity`. El mensaje es un nodo que `LiveForm` añade a mano tras el campo, y no un componente de React: así los catorce formularios lo reciben sin reescribir sus campos.
- **Si el modelo no se puede dibujar.** El visor tiene su propia red de seguridad, aparte de la global (`viewer/ViewerBoundary.tsx`). Si el dibujo falla, o si el navegador retira el contexto gráfico (pasa al suspender el equipo o con muchas pestañas abiertas; el motor avisa con `onContextLost`), la escena se sustituye por una explicación y el botón «Volver a cargar el modelo», que reconstruye el visor sin recargar la página. Las pestañas, los cuartos y los formularios del proyecto siguen funcionando. En la vista previa del inicio no se muestra nada: queda la portada que hay detrás.

### Estados de carga y de error

- Cada lectura de datos pasa por `useAsync` (`src/hooks/useAsync.ts`) y se muestra con `AsyncStatus`: «Cargando…» mientras llega la respuesta, el texto de lista vacía si no hay datos y, si falla, el mensaje de error con un botón «Reintentar» que repite la petición.
- Cada escritura (crear, editar, eliminar) bloquea su botón mientras se envía o muestra «Guardando…», y si falla deja el formulario como estaba y muestra el error. Dentro de un proyecto, una segunda acción se ignora hasta que termina la primera, para no enviar dos veces lo mismo.
- Si el cierre de sesión falla por un problema de red, la aplicación vuelve igualmente a la pantalla de inicio de sesión.

### Pantallas pequeñas

Por debajo de 720 px de ancho el menú lateral se sustituye por una barra inferior (`MobileNav.tsx`, ver «Sistema visual y navegación»), las tablas se muestran como fichas (desde la fase 4 del 18 de octubre, según el ancho de su panel y no de la ventana) con el nombre de cada columna junto a su valor y los controles del modelo 3D se colocan debajo del visor. Comprobado el 4 de octubre de 2026 a 390, 820 y 1280 px en todos los módulos y pestañas: ninguna vista se desborda a lo ancho.

### Accesibilidad

- Todos los campos de formulario tienen su etiqueta (`<label>`), y los botones que solo se distinguen por la fila, como «Editar» o «Eliminar», llevan `aria-label` con el nombre del elemento.
- Los colores de texto cumplen el contraste mínimo de WCAG AA (4,5:1) en el tema claro y en el oscuro. Se midió en el navegador sobre cada vista.
- Toda la aplicación se puede usar con el teclado: los controles son botones y campos nativos, el foco se ve con un contorno, hay un enlace «Saltar al contenido» al principio de la página y las ventanas usan `<dialog>`, que devuelve el foco al cerrarse. En el modelo 3D, la lista de niveles permite seleccionar cada elemento sin usar el ratón.
- Los mensajes de carga y de aviso usan `role="status"` y los de error `role="alert"`, para que un lector de pantalla los anuncie.
- Si el sistema pide reducir el movimiento, se desactivan las transiciones y el desplazamiento suave.
- Un botón responde al pulsarlo: baja 1 px y se oscurece un poco (`button:active`), además del brillo al pasar el cursor.
- No se ha probado con un lector de pantalla real.

En desarrollo, Vite reenvía las peticiones `/api/*` al backend en `localhost:8000`, por lo que la cookie de sesión funciona en el mismo origen. Si el frontend se sirve desde otro origen (`VITE_API_URL` con la dirección completa de la API), el backend lo admite por CORS solo si está en `CORS_ORIGINS`; no se usa `*` porque las peticiones llevan la cookie de sesión. Los tipos de `src/types/api.ts` reflejan los de `BACKEND-ARQUILA/app/schemas.py` y deben mantenerse sincronizados.
