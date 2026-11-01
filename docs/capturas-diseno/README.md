# Capturas de diseño

Las imágenes de esta carpeta no se versionan. Sirven para comparar el diseño entre fases.

Para regenerarlas, con el servidor de desarrollo en el puerto 5173 (`npm run dev`):

```bash
CAPTURAS_SALIDA=docs/capturas-diseno \
CAPTURAS_SOLO=inicio,proyectos,proyecto-materiales,proyecto-planos,proyecto-modelo-3d,proyecto-terreno,proyecto-elevaciones,terrenos,materiales,recorrido,planos,iluminacion,renderizado,tareas,configuracion,inicio-de-sesion,estados \
node scripts/capturas.ts
```

`CAPTURAS_SOLO` es necesario: sin él, el script llega a `checkStudio`, que no termina (`docs/SCRIPTS_PENDIENTES.md`).

Salen 104 archivos: 15 pantallas en 2 temas y 3 tamaños (1280, 820 y 390 px), 8 estados y 6 de inicio de sesión. Usan los datos de muestra de `scripts/datos-de-muestra.ts`, no una cuenta real.
