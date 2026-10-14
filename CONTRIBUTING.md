# Cómo trabajar en el proyecto

Los comandos exactos para comprobar en local lo mismo que comprueba CI (`.github/workflows/ci.yml`). Se necesita Node 24 (el de CI) y npm 11.

## Instalar

```sh
npm ci
```

npm 11 bloquea por defecto los scripts de instalación de las dependencias que no estén aprobados en el campo `allowScripts` de `package.json`. Está aprobado solo `esbuild@0.25.12`. Si una actualización trae otra versión de esbuild, `npm ci` vuelve a avisar: hay que revisarla y cambiar la versión en `allowScripts` a mano. No uses `npm install-scripts approve --dry-run`, que en npm 11.19.0 sí escribe en `package.json` (ver `docs/DECISIONES.md`).

Las variables de entorno están en `.env.example`. Para desarrollar no hace falta ninguna: `/api` se reenvía a `http://localhost:8000`.

### Windows con Smart App Control

Si Smart App Control bloquea el binario nativo de Rollup (`rollup.win32-x64-msvc.node`), `vite build` y Vitest no arrancan. En ese caso, después de **cada** instalación:

```sh
npm ci
npm run local:wasm
```

`local:wasm` (`scripts/local-wasm.mjs`) cambia `node_modules/rollup` por `@rollup/wasm-node` de la misma versión, que es el mismo Rollup compilado a WebAssembly. No cambia ningún archivo del repositorio: `package.json` y `package-lock.json` siguen con el Rollup nativo que usan CI y Vercel, y el siguiente `npm ci` lo vuelve a poner. Fuera de Windows no hace nada. Si `git status` muestra cambios en esos dos archivos después de usarlo, algo salió mal: no los subas.

## Ver la app sin backend

```sh
npm run demo
```

Abre http://localhost:5174/ con la sesión iniciada y los datos de muestra de Casa Mirador. MSW responde la API dentro del navegador. Lo que se crea o se borra dura hasta recargar la página. Para volver a entrar después de cerrar sesión sirve cualquier correo y cualquier contraseña.

## Comprobar todo, en el orden de CI

```sh
npm run format:check
npm run lint
npm run typecheck
npm run contraste
npm run test:cobertura
npm run build
npm run test:e2e
```

- `test:cobertura` falla si la cobertura baja de los umbrales de `vite.config.ts`: los globales y los de cada utilidad crítica (`geometry`, `building`, `elevations`, `errors`, `appState`, `services/http`). Los umbrales solo se suben.
- `test:e2e` levanta su propio servidor en el puerto 5180 y responde la API con los datos de muestra de `scripts/datos-de-muestra.mjs`, así que no necesita backend. En local usa Edge. Para usar el Chromium de Playwright, como CI:

    ```sh
    npx playwright install chromium
    E2E_CANAL=chromium npm run test:e2e
    ```

    En PowerShell: `$env:E2E_CANAL = "chromium"; npm run test:e2e`.

## Comprobaciones en el navegador

Necesitan el servidor de desarrollo en marcha (`npm run dev`, puerto 5173) y usan los mismos datos de muestra:

| Comando | Qué hace |
|---|---|
| `npm run capturas` | Guarda en `docs/capturas/` las pantallas principales a 1280, 820 y 390 px en los dos temas, y prueba el visor 3D con clics reales. |
| `npm run accesibilidad` | Pasa axe-core por las pantallas principales. |
| `npm run movimiento` | Con movimiento reducido nada se anima, y ninguna pantalla salta al cargar. |

## Commits

- Mensajes convencionales (`feat`, `fix`, `test`, `docs`, `chore`, `build`, `ci`, `perf`), en español y un commit por tema.
- El hook de pre-commit pasa Prettier: `pre-commit install` una vez.
- Nunca se suben `.env` ni `.env.*` (salvo `.env.example`): están en `.gitignore`.
