# FRONTEND-ARQUILA

Interfaz web de ARQUILA, una aplicación para organizar proyectos de arquitectura. Es una de las tres partes del proyecto:

```text
ARQUILA
├── FRONTEND-ARQUILA        Este repositorio
├── BACKEND-ARQUILA         API (FastAPI)
└── BASE-DE-DATOS-ARQUILA   Migraciones y datos de ejemplo (PostgreSQL)
```

## Tecnología

TypeScript, React 18 y Vite, con Three.js para el modelo 3D. Vitest y Testing Library para las pruebas; ESLint y Prettier para el estilo.

## Requisitos

- Node 24 con `npm` (la versión está en `.nvmrc`).
- El backend de `BACKEND-ARQUILA` en marcha.

## Instalación e inicio

```bash
npm install
npm run dev
```

La interfaz queda en `http://localhost:5173`.

## Conexión con el backend

Todas las llamadas HTTP salen de `src/services/http.ts`, que toma la dirección de la API de una variable de entorno. No hay direcciones escritas en los componentes.

| Variable | Uso | Por defecto |
|---|---|---|
| `VITE_API_URL` | Dirección base de la API que usa el navegador. | `/api` |
| `API_PROXY_TARGET` | Backend al que el servidor de desarrollo reenvía `/api`. | `http://localhost:8010` |

Para cambiarlas, copiar `.env.example` a `.env`. El archivo `.env` no se sube al repositorio.

- **Desarrollo local.** Copia `.env.example` a `.env`, inicia PostgreSQL y el backend en el puerto
  8010 y ejecuta `npm run dev`. El navegador llama a `/api`; Vite lo reenvía a
  `http://localhost:8010`. Si la API usa otra dirección, cambia `API_PROXY_TARGET`.
- **Vercel.** La interfaz está publicada en <https://arquila-app.vercel.app>. El archivo `vercel.json` reenvía `/api` a `https://arquila-backend-juan.onrender.com`, así que la interfaz y la API comparten dominio y `VITE_API_URL` se queda en `/api`.
- **Otro despliegue.** `VITE_API_URL` se fija al compilar (`npm run build`). Lo más sencillo es servir la API bajo `/api` en el mismo dominio que la interfaz. Si se usa otro dominio, poner su dirección completa en `VITE_API_URL` y añadir el origen de la interfaz a `APP_URL` o `CORS_ORIGINS` en el backend.

La sesión viaja en una cookie `HttpOnly` que pone el backend; la interfaz no guarda tokens y envía todas las peticiones con `credentials: "include"`. Cuando la API responde 401, la interfaz vuelve a la pantalla de inicio de sesión.

## Organización

```text
src/
├── pages/        Pantallas
├── components/   Paneles, planos y visores
├── three/        Escenas 3D
├── services/     Cliente HTTP y llamadas a la API
├── state/        Estado de la aplicación y tema
├── hooks/        Carga de datos
├── types/        Tipos de la API y de la interfaz
└── utils/        Cálculos y formato
```

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo. |
| `npm run build` | Comprueba los tipos y compila en `dist/`. |
| `npm run preview` | Sirve la compilación. |
| `npm test` | Pruebas. |
| `npm run lint` | Reglas de ESLint. |
| `npm run format` / `npm run format:check` | Formato con Prettier. |

Las cuentas de demostración solo se usan con bases locales; nunca habilites credenciales de prueba en producción.

## Documentación

- `docs/FRONTEND.md`: decisiones de la interfaz (esquemas del terreno, planos, modelo 3D, estados de carga, pantallas pequeñas y accesibilidad).
- Las decisiones de la API están en `docs/BACKEND_Y_API.md` del repositorio [BACKEND-ARQUILA](https://github.com/ssantivr/BACKEND-ARQUILA).
- La documentación general del proyecto está en el repositorio [ARQUILA](https://github.com/ssantivr/ARQUILA).

Para que Prettier formatee los archivos antes de cada commit, instalar [pre-commit](https://pre-commit.com) y activar los hooks una vez con `pre-commit install`.

## Despliegue

`vercel.json`, además de reenviar `/api`, añade encabezados de seguridad a todas las respuestas y guarda en caché por un año los archivos de `/assets`, que llevan un hash en el nombre. Al compilar, React y Three.js quedan en archivos separados del código de la aplicación para que el navegador los reutilice entre despliegues.
