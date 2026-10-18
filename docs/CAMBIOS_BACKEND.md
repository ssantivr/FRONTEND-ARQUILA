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
