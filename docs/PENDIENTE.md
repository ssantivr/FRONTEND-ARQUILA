# Pendiente

Lo que la interfaz no muestra porque el backend todavía no lo permite. Cada punto dice qué falta y qué hace hoy el frontend en su lugar, para no simularlo. Las peticiones al backend con más detalle están en `CAMBIOS_BACKEND.md`.

| Qué | Por qué no está | Qué hace hoy la interfaz | Qué haría falta |
|---|---|---|---|
| **Recordar sesión** (casilla en el inicio de sesión) | La API no lo permite: `POST /auth/login` crea siempre una sesión de la misma duración y no recibe ninguna opción para alargarla o acortarla (`CAMBIOS_BACKEND.md`, punto 7). | No hay casilla. Una casilla que no cambia nada sería un control falso. | Un campo en `LoginRequest` (por ejemplo `remember: bool`) que decida la duración de la cookie `HttpOnly`. Con eso, la casilla va en `LoginPage.tsx`, debajo de la contraseña. |
| **Tipo de proyecto** (casa, edificio, comercial, uso mixto) en las tarjetas del dashboard y de Proyectos | Pendiente de `project_type` en el backend: la columna existe en el modelo (`Project.project_type`), pero `ProjectRead` no la devuelve y `ProjectCreate`/`ProjectUpdate` no la reciben. El filtro `GET /projects?type=` mira las propiedades del proyecto, no el proyecto. | No se muestra ningún tipo; las tarjetas enseñan nombre, estado, lugar, avance y fecha. | Añadir `project_type` a `ProjectRead`, `ProjectCreate` y `ProjectUpdate`. Con eso: tipo opcional en `types/api.ts`, etiqueta en `ProjectTile.tsx` cuando venga, y campo en el formulario de creación y en `ProjectEditForm.tsx`. |
