# FRONTEND

Este documento explica las decisiones de la interfaz. El código no lleva comentarios, así que el porqué de cada decisión está aquí. Las decisiones de la API están en `BACKEND-ARQUILA/docs/BACKEND_Y_API.md`.

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
- No se comprueba que el contorno no se cruce a sí mismo.
- Al deshacer la eliminación de un terreno se recuperan sus datos, pero no sus vértices.

Simplificaciones: la superficie es un plano inclinado y se asume que la pendiente va en el sentido del largo (el eje `y`). El ancho y el largo son opcionales; si faltan, el esquema muestra qué dato falta. El área se guarda aparte porque un lote real puede no ser rectangular; el formulario la propone como ancho por largo si se deja vacía.

## Plano de implantación

La pestaña Planos dibuja, debajo de la lista de planos, un plano de implantación en SVG por cada terreno (`src/components/SitePlan.tsx`). Usa solo los datos del terreno:

- **Límite del terreno**: el contorno del lote a escala, con una cota en cada lado. La longitud de cada lado y hacia dónde queda el exterior se calculan recorriendo los vértices una vez: O(n) (`edges` en `src/utils/geometry.ts`).
- **Área edificable**: el rectángulo que queda al descontar un retiro igual en los cuatro lados. El retiro se elige con un control (de 0 a 10 m; al abrir vale 3 m, o menos si el lote es estrecho, para que siempre quede área edificable) y el plano muestra el área resultante.
- **Acceso**: una marca en el frente del lote.
- **Norte**: una flecha cuya dirección se elige con un control.
- **Leyenda** y botón **Descargar plano (SVG)**. El archivo descargado lleva sus colores dentro, así que se ve igual fuera de la aplicación.
- Botón **Imprimir o guardar como PDF**: abre la impresión del navegador con el plano solo, en una hoja A4 horizontal. Para obtener el PDF se elige «Guardar como PDF» como impresora. No usa ninguna librería.

Simplificaciones:

- El retiro y el norte no se guardan: el proyecto no tiene esos datos y vuelven a su valor inicial al recargar.
- El acceso se asume por el frente, el lado más bajo, igual que en la vista frontal del terreno.
- El área edificable solo se calcula en lotes rectangulares. En un lote con vértices se dibujan el contorno y las cotas, sin área edificable.
- No se dibujan vivienda, áreas verdes, andenes ni parqueadero, porque el proyecto no guarda esos datos.

## Modelo 3D

La pestaña Modelo 3D muestra el proyecto en tres dimensiones con Three.js. Los datos salen de `GET /projects/{id}/structure` (`BACKEND-ARQUILA/app/services/structure_service.py`), que arma la respuesta con los terrenos, los planos, los cuartos y los componentes estructurales del proyecto, en metros.

- **Terrenos**: cada terreno con contorno (vértices, o ancho y largo) es una losa. Los terrenos se colocan uno al lado del otro sobre el eje `x`, separados 5 m, porque cada uno guarda sus coordenadas desde su propio origen.
- **Niveles**: un plano es un nivel si tiene cuartos o componentes, o si su campo Nivel es un número (`0`, `1`, `-1`, `0.5`). Así un plano de implantación o de detalles, con el nivel vacío o con texto, no se apila como si fuera un piso. Los niveles se apilan en el orden en que se crearon los planos, no por el número. Un plano con cuartos muestra sus cuartos (`kind: "room"`). El nivel mide lo que su cuarto, columna o muro más alto, o 3 m si no tiene ninguno. Mientras el proyecto no tenga ningún cuarto ni componente, cada nivel se dibuja como un volumen de 3 m (`kind: "volume"`) sobre el área edificable del primer terreno rectangular, con el mismo retiro inicial del plano de implantación (3 m, o menos si el lote es estrecho). En cuanto hay un cuarto o un componente, los volúmenes dejan de dibujarse: un nivel vacío conserva sus 3 m de altura, pero queda en blanco, para no mezclar cuartos reales con un volumen de relleno.

- **Componentes**: las columnas y los muros se apoyan en el piso de su nivel. Una viga se cuelga del techo: su base es la altura del nivel menos el alto de la viga.

En el frontend, `src/three/BuildingSceneManager.ts` arma la escena y no depende de React; `StructureViewer.tsx` la crea al montar, la destruye al desmontar y dibuja encima los paneles flotantes. Tres módulos vecinos se reparten el resto: `cameraRig.ts` (controles, límites y vuelos de la cámara), `postprocessing.ts` (resplandor) y `vegetation.ts` (árboles). Decisiones del visor:

- **Dibujo bajo demanda**: la escena solo se vuelve a dibujar cuando algo cambia (la cámara, la selección, una capa, el tamaño). En reposo no gasta GPU.
- **Cámara**: cambiar de vista, hacer zoom con los botones o enfocar un elemento (doble clic o el botón «Enfocar») mueve la cámara con una transición; arrastrar la cancela, y con «reducir movimiento» activado en el sistema el cambio es inmediato. El punto que orbita la cámara no puede alejarse del modelo.
- **Resplandor**: en el modo oscuro el contorno de la selección y el borde del lote llevan un color más brillante que el blanco, y un pase de `UnrealBloomPass` hace brillar solo lo que supera ese umbral. En el modo claro el pase no se crea y se dibuja directo al lienzo.
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
- Al cambiar de modelo o salir de la pestaña se liberan geometrías, materiales, el mapa de sombras, los eventos y el contexto WebGL (`dispose`).
- Three.js se carga solo al abrir la pestaña (`lazy` en `ProjectDetailPage.tsx`), para no aumentar la carga inicial.
- Los paneles flotantes (vistas, niveles, inspector, color y barra inferior) usan los mismos colores que el resto de la aplicación (clases `.structure-stage` y `.hud` en `styles.css`). El cielo, la niebla, el suelo y la cuadrícula de la escena cambian con el modo claro u oscuro (`setPalette`); el elemento bajo el cursor se resalta en azul y el seleccionado lleva un contorno cian `#00F0FF` de 3 px (`LineSegments2`), en todos los modos de color y sin teñir el elemento, para que se vea su material o el color del dato. Ese contorno y las dos luces de acento del modo oscuro son el único neón de la aplicación. En pantallas estrechas los paneles pasan debajo del modelo.

Simplificaciones: la pendiente del terreno no se representa. En un lote con vértices no se dibuja el volumen de un plano sin cuartos, igual que en el plano de implantación; los cuartos sí se dibujan siempre.

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
  - Los máximos de COS y CUS se escriben en la pantalla, con 0,6 y 1,8 como valores iniciales, y no se guardan, igual que el retiro del plano de implantación: el proyecto no tiene la norma del municipio.

La pestaña Elevaciones añade el panel **Fachadas y corte generados** (`src/components/ElevationDrawing.tsx`), con cinco dibujos: fachada frontal, posterior, lateral izquierda, lateral derecha y un corte esquemático.

- Una fachada dibuja cada nivel como un rectángulo con su altura, las ventanas y la puerta de ese lado, el techo y las cotas de nivel. En las fachadas posterior e izquierda el eje horizontal se invierte, porque se miran desde el otro lado.
- El techo se ve como un triángulo cuando se mira de frente a la cumbrera y como un rectángulo cuando se mira de costado.
- El corte pasa por la mitad del ancho de la edificación y muestra, con su nombre, los cuartos que atraviesa.
- El cálculo está en `src/utils/elevations.ts` y devuelve una lista de rectángulos en metros; el componente solo los pasa a píxeles.

Las ventanas, la puerta y el techo se calculan en un solo lugar, `src/utils/openings.ts`, que usan el modelo 3D, las plantas y las fachadas. Por eso los tres dibujos coinciden: una ventana que se ve en el modelo está en el mismo sitio en la planta y en la fachada.

Simplificaciones: el área de un nivel es la suma de las áreas de sus cuartos, así que dos cuartos solapados contarían dos veces. Las plantas no dibujan mobiliario ni puertas interiores, y solo hay una puerta, la de entrada. Los ejes pasan por los bordes de los cuartos, no por las columnas. El corte no dibuja el terreno inclinado ni la cimentación. Mientras el proyecto no tiene cuartos, los volúmenes de relleno cuentan como área construida.

## Organización de la interfaz

El menú lateral tiene ocho módulos (`MODULES` en `src/components/Sidebar.tsx`); la página de Inicio muestra los mismos como tarjetas, a partir de esa misma lista.

- **Terrenos** y **Materiales** reúnen los datos de todos los proyectos del usuario, con métricas y, en Materiales, el costo por categoría. Son de consulta: el botón «Abrir» lleva a la pestaña correspondiente del proyecto, donde se editan. La API no tiene una ruta que liste terrenos o materiales de todos los proyectos, así que el frontend pide la lista de proyectos y luego la de cada uno en paralelo (`loadAcrossProjects` en `services/api.ts`). Es una petición por proyecto; con muchos proyectos convendría una ruta propia en el backend.
- **Visualización 3D** y **Asistente IA** piden elegir un proyecto y muestran su modelo o su asistente, los mismos componentes de las pestañas del proyecto. Three.js sigue cargándose solo al abrir el modelo.
- **Recorrido interior** es una escena de muestra que no usa los datos de ningún proyecto: un loft de doble altura con entrepiso, escalera, la ciudad al atardecer tras el ventanal y líneas de neón. Vive en `src/three/interior/` (`loftScene.ts` la geometría y las luces, `cityBackdrop.ts` el cielo y la ciudad, `textures.ts` las texturas pintadas en un lienzo, `interiorCamera.ts` la cámara) y `InteriorViewer.tsx` dibuja encima la barra de título y la de controles. La geometría es procedural, hecha de cajas fusionadas por material; no hay modelos ni imágenes que descargar. La cámara no sale de las paredes ni entra en el entrepiso, en la escalera o en los muebles grandes.
- **Configuración** muestra la cuenta, permite pedir el enlace de cambio de contraseña y cerrar sesión, e informa del proveedor de IA activo y del estado de la API. No edita el nombre ni el correo ni guarda preferencias, porque la API no tiene rutas para eso.

Los mensajes de error del backend están en inglés. El frontend los traduce al español en `src/utils/errors.ts`; un mensaje que no esté en esa lista se muestra tal cual. Si cualquier petición responde 401, la aplicación vuelve a la pantalla de inicio de sesión.

### Estados de carga y de error

- Cada lectura de datos pasa por `useAsync` (`src/hooks/useAsync.ts`) y se muestra con `AsyncStatus`: «Cargando…» mientras llega la respuesta, el texto de lista vacía si no hay datos y, si falla, el mensaje de error con un botón «Reintentar» que repite la petición.
- Cada escritura (crear, editar, eliminar) bloquea su botón mientras se envía o muestra «Guardando…», y si falla deja el formulario como estaba y muestra el error. Dentro de un proyecto, una segunda acción se ignora hasta que termina la primera, para no enviar dos veces lo mismo.
- Si el cierre de sesión falla por un problema de red, la aplicación vuelve igualmente a la pantalla de inicio de sesión.

### Pantallas pequeñas

Por debajo de 720 px de ancho el menú lateral pasa a ser una fila desplazable sobre el contenido, las tablas se muestran como fichas con el nombre de cada columna junto a su valor y los controles del modelo 3D se colocan debajo del visor. Comprobado el 4 de octubre de 2026 a 390, 820 y 1280 px en todos los módulos y pestañas: ninguna vista se desborda a lo ancho.

### Accesibilidad

- Todos los campos de formulario tienen su etiqueta (`<label>`), y los botones que solo se distinguen por la fila, como «Editar» o «Eliminar», llevan `aria-label` con el nombre del elemento.
- Los colores de texto cumplen el contraste mínimo de WCAG AA (4,5:1) en el tema claro y en el oscuro. Se midió en el navegador sobre cada vista.
- Toda la aplicación se puede usar con el teclado: los controles son botones y campos nativos, el foco se ve con un contorno, hay un enlace «Saltar al contenido» al principio de la página y las ventanas usan `<dialog>`, que devuelve el foco al cerrarse. En el modelo 3D, la lista de niveles permite seleccionar cada elemento sin usar el ratón.
- Los mensajes de carga y de aviso usan `role="status"` y los de error `role="alert"`, para que un lector de pantalla los anuncie.
- Si el sistema pide reducir el movimiento, se desactivan las transiciones y el desplazamiento suave.
- No se ha probado con un lector de pantalla real.

En desarrollo, Vite reenvía las peticiones `/api/*` al backend en `localhost:8000`, por lo que la cookie de sesión funciona en el mismo origen. Si el frontend se sirve desde otro origen (`VITE_API_URL` con la dirección completa de la API), el backend lo admite por CORS solo si está en `CORS_ORIGINS`; no se usa `*` porque las peticiones llevan la cookie de sesión. Los tipos de `src/types/api.ts` reflejan los de `BACKEND-ARQUILA/app/schemas.py` y deben mantenerse sincronizados.
