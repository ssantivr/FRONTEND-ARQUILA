# Cambios que necesita el backend

Lo que la interfaz no puede resolver sola. Nada de esto se ha tocado en `BACKEND-ARQUILA`: cada punto dice qué ruta haría falta y cómo se las arregla la interfaz mientras tanto, para que siga funcionando con la API de hoy.

## 1. Portada del proyecto

- **Para qué:** que la tarjeta de un proyecto muestre su modelo 3D en cualquier navegador, no solo en el que lo abrió.
- **Ruta:** `PUT /projects/{id}/cover`
- **Cuerpo:** `multipart/form-data` con el campo `image` (JPEG de 480 × 270 px, hasta 200 kB).
- **Respuesta:** `204`. `GET /projects` y `GET /projects/{id}` añadirían `cover_url: string | null`.
- **Mientras tanto:** la interfaz toma una imagen del modelo al abrirlo y la guarda en `localStorage` (`arquila:thumb:{id}`, las últimas 24). Un proyecto que nunca se abrió en ese navegador muestra la portada dibujada.

## 2. Área y niveles en la lista de proyectos

- **Para qué:** mostrar en cada tarjeta el área del lote y el número de niveles sin pedir el modelo de cada proyecto.
- **Ruta:** `GET /projects` (la misma), con dos campos más por proyecto.
- **Respuesta:** `terrain_area_m2: number | null` y `levels: number`.
- **Mientras tanto:** las tarjetas no muestran esas dos cifras. Pedir `GET /projects/{id}/structure` por cada tarjeta sería una petición por proyecto, justo lo que se quiere evitar.

## 3. Vértices al deshacer la eliminación de un terreno

- **Para qué:** que un lote no rectangular vuelva completo.
- **Ruta:** `POST /projects/{id}/undo` (la misma).
- **Cambio:** al restaurar un terreno, restaurar también sus filas de `terrain_points`.
- **Mientras tanto:** la interfaz guarda los vértices al eliminar (en `sessionStorage`) y, después de deshacer, los reenvía con `PATCH /terrains/{id}` y cuerpo `{"points": [...]}`. No sirve si se deshace desde otro navegador o después de cerrar la pestaña.

## 4. Retiro, norte y máximos de COS y CUS por proyecto

- **Para qué:** que lo que se configura en los planos se vea igual en cualquier equipo.
- **Rutas:**
    - `PATCH /terrains/{id}` admitiría `setback_m: number | null` y `north_deg: number | null` (0 = hacia el fondo, en sentido horario), y `GET` los devolvería.
    - `PATCH /projects/{id}` admitiría `max_cos: number | null` y `max_cus: number | null`.
- **Respuesta:** los mismos objetos de hoy con esos campos.
- **Mientras tanto:** `localStorage`, clave `arquila:site:{id del proyecto}`.

## 5. Pendiente en el modelo

- **Para qué:** dibujar el terreno inclinado sin una petición adicional.
- **Ruta:** `GET /projects/{id}/structure` (la misma).
- **Respuesta:** cada elemento de `terrains` añadiría `slope_percent: number | null`.
- **Mientras tanto:** si el campo no viene, la interfaz pide `GET /projects/{id}/terrains` y lo toma de ahí; cuando venga, deja de pedirlo sola.

## 6. La API, en el mismo origen o por HTTPS

- **Para qué:** que el navegador deje hablar a la interfaz con la API. `vercel.json` envía una Content-Security-Policy con `connect-src 'self' https:`.
- **Ruta:** ninguna nueva. Hoy no hace falta cambiar nada: en Vercel, `/api/*` se reescribe hacia `https://arquila-backend.vercel.app`, así que el navegador la ve en el mismo origen.
- **Qué lo rompería:** apuntar `VITE_API_URL` a una API por `http://` en otro dominio. Si algún día se llama a la API directamente desde otro dominio, el backend tendrá que aceptar CORS con credenciales para ese origen, porque las peticiones van con `credentials: "include"`.
- **Mientras tanto:** nada que hacer.

## 7. Recordar la sesión

- **Para qué:** que quien entra desde su propio equipo no tenga que volver a escribir la contraseña cada vez que caduca la sesión, y que en un equipo compartido la sesión acabe al cerrar el navegador.
- **Ruta:** `POST /auth/login` (la misma).
- **Cuerpo:** `{"email": "...", "password": "...", "remember": true}`. Con `remember: true`, la cookie de sesión llevaría `Max-Age` (por ejemplo 30 días); con `false` o sin el campo, sería una cookie de sesión del navegador, sin `Max-Age`.
- **Respuesta:** la de hoy (`User`), con la cookie `HttpOnly` según lo pedido.
- **Mientras tanto:** el formulario no muestra la casilla «Recordar sesión», porque no haría nada. Recuperar la contraseña sí aparece: `POST /auth/password-reset` y `/auth/password-reset/confirm` existen.

## 8. Materiales propios del modelo 3D (valores PBR editables)

- **Para qué:** que la biblioteca permita crear o ajustar un acabado (color base, rugosidad, metalicidad, opacidad, repetición) y aplicarlo a un elemento, en vez de elegir solo entre las siete superficies fijas del motor.
- **Rutas:**
    - `GET /surfaces` → `[{ id, name, category, color: "#rrggbb", roughness, metalness, opacity, tile_m, pattern: "brick" | "wood" | "stone" | null, owner_id | null }]`. Las siete del motor vendrían con `owner_id: null`.
    - `POST /surfaces` y `PATCH /surfaces/{id}` con esos campos (validando 0–1 en rugosidad, metalicidad y opacidad); `DELETE /surfaces/{id}` solo para las propias.
    - `PATCH /projects/{id}/structure/{kind}/{element_id}/surface` (la de hoy) aceptaría también el `id` de una superficie propia.
- **Respuesta:** `201` con la superficie creada; `422` si un valor está fuera de rango.
- **Mientras tanto:** la vista ampliada muestra los valores con que dibuja el motor y los controles deshabilitados, con el motivo. Las categorías de la biblioteca (madera, piedra, concreto, metal, vidrio, ladrillo) son las siete superficies del motor; cerámica, mármol, pinturas, textiles y personalizados no se muestran porque no existen.

## 9. Favoritos de la biblioteca en la cuenta

- **Para qué:** que las superficies favoritas sigan al usuario a otro equipo.
- **Ruta:** `GET /me/favorites/surfaces` → `["brick", "wood"]`; `PUT /me/favorites/surfaces` con la lista completa.
- **Respuesta:** `204` al guardar.
- **Mientras tanto:** se guardan en `localStorage` (`arquila:favorite-surfaces`) y la pantalla dice que solo valen en ese navegador.

## 10. Materiales de obra con imagen

- **Para qué:** mostrar una miniatura de cada partida de presupuesto (un producto concreto: un bloque, una teja).
- **Ruta:** `PUT /materials/{id}/image` (`multipart/form-data`, campo `image`); `GET /materials` añadiría `image_url: string | null`.
- **Mientras tanto:** «Materiales de obra» es una tabla sin imágenes; no se inventa una foto por categoría.

## 11. Fechas, tipo y duplicado de un proyecto

- **Para qué:** que el cronograma muestre el plazo del proyecto y no solo el de sus tareas; filtrar por tipo (vivienda, oficina…); duplicar un proyecto como punto de partida de otro.
- **Rutas:**
    - `PATCH /projects/{id}` y `POST /projects` admitirían `start_date`, `end_date` (`YYYY-MM-DD`, nulos) y `kind` (texto de una lista cerrada); `GET` los devolvería.
    - `POST /projects/{id}/duplicate` con `{"name": "..."}` → `201` con el proyecto nuevo, copiando terrenos, planos, cuartos, componentes y materiales (no los archivos ni las conversaciones).
- **Mientras tanto:** el cronograma usa solo las fechas de las tareas, no hay filtro por tipo y no se ofrece duplicar.

## 12. Giro y transformación de elementos en el editor 3D

- **Para qué:** rotar un cuarto o un componente, y mover o redimensionar columnas, vigas y muros desde el visor, con deshacer y rehacer.
- **Rutas:**
    - `PATCH /rooms/{id}` admitiría `rotation_deg: number` (giro en planta, alrededor de su esquina de origen, de 0 a 360). `GET /projects/{id}/structure` lo devolvería en cada cuarto.
    - `PATCH /components/{id}` ya admite posición y medidas; con `rotation_deg` también, el visor podría transformarlos igual que a los cuartos.
- **Respuesta:** el objeto actualizado; `422` si el ángulo está fuera de rango.
- **Mientras tanto:** el editor mueve y redimensiona cuartos con `PATCH /rooms/{id}` (x, y, ancho, fondo, alto), con ajuste a cuadrícula y deshacer y rehacer. «Rotar» aparece deshabilitado con el motivo. Los componentes se editan en su tabla. Un volumen sin cuartos no se transforma: sale de un plano sin cuartos.

## 13. Historial de cambios del proyecto

- **Para qué:** deshacer también después de recargar la página o desde otro equipo, y ver quién cambió qué.
- **Ruta:** `GET /projects/{id}/history` → `[{ id, at, user_id, entity, entity_id, before, after }]`; `POST /projects/{id}/history/{id}/revert`.
- **Mientras tanto:** deshacer y rehacer viven en la sesión del editor: cada paso es una petición real a la API, pero la lista se pierde al cerrar la pestaña.

## 14. Entidades de dibujo en los planos 2D

- **Para qué:** dibujar sobre una lámina como en un programa CAD: muros, puertas y ventanas sueltas, líneas, cotas y textos, y duplicar o eliminar esos trazos.
- **Rutas:**
    - `GET /plans/{id}/entities` → `[{ id, kind: "wall" | "door" | "window" | "line" | "dimension" | "text", points: [[x_m, y_m], ...], props: {...} }]`.
    - `POST /plans/{id}/entities`, `PATCH /plan-entities/{id}` y `DELETE /plan-entities/{id}`.
- **Respuesta:** `201` con la entidad; `422` si los puntos no corresponden a su tipo.
- **Mientras tanto:** las láminas se generan con los cuartos y los terrenos y la API no guarda trazos. Planos 2D muestra esas nueve herramientas deshabilitadas con el motivo y envía al editor 3D, donde los cuartos sí se mueven y redimensionan. Medir, zoom, desplazamiento, cuadrícula, reglas, escala gráfica, centrar, el SVG y la impresión a PDF funcionan. No se ofrecen DXF ni PNG: no están hechos, y la regla es no mostrar una exportación que no genere un archivo válido.

## 15. Luz de presentación y zona horaria del terreno

- **Para qué:** que la luz elegida en Iluminación y clima (fecha, hora, norte, intensidad, temperatura, cielo, nubosidad, exposición, sombras) siga al proyecto en otro equipo, y que la hora sea la oficial del lugar.
- **Rutas:**
    - `GET /projects/{id}/lighting` y `PUT /projects/{id}/lighting` con `{ date, hour, orientation_deg, intensity, temperature_k, sky, clouds, exposure, shadows }`.
    - `PATCH /terrains/{id}` admitiría `time_zone` (nombre IANA, p. ej. `America/Bogota`) y `north_deg`; `GET` los devolvería.
- **Respuesta:** `200` con la luz guardada; `422` si un valor está fuera de rango.
- **Mientras tanto:** la luz se guarda en `localStorage` por proyecto. El sol se calcula con la latitud y la longitud del primer terreno que las tenga (ecuaciones de la NOAA); la hora se toma como la del huso que corresponde a la longitud (15° por hora), que coincide con la oficial en Colombia pero no en todos los países. Sin coordenadas, el sol sigue un arco simple de 6:00 a 18:00 y la fecha queda deshabilitada con el motivo. El norte de la implantación (también en `localStorage`) se puede copiar a la luz con un botón.

## 16. Render fotorrealista en el servidor

- **Para qué:** imágenes con trazado de rayos (reflejos, refracción, luz indirecta y profundidad de campo), que el motor del visor no hace.
- **Rutas:**
    - `POST /projects/{id}/renders` con `{ camera: { position, target, fov, projection }, width, height, samples, lighting: {...}, format: "png" | "jpeg" }` → `202` con `{ id, status: "queued" }`.
    - `GET /renders/{id}` → `{ status: "queued" | "running" | "done" | "failed" | "cancelled", progress: 0..1, error? }`; `DELETE /renders/{id}` para cancelar; `GET /renders/{id}/file` con la imagen.
- **Mientras tanto:** Renderizado genera una «Captura de la vista» con el motor del visor: el mismo encuadre, la luz del proyecto, varias pasadas promediadas (el progreso es el de esas pasadas, real) y el archivo en PNG, JPEG o WebP si el navegador lo genera. La pantalla dice que no es un render fotorrealista. Profundidad de campo y reflejos trazados no se ofrecen.
