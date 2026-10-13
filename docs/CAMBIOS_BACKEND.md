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
