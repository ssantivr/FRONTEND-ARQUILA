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
