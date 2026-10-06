# FRONTEND-ARQUILA

Interfaz web de ARQUILA, una aplicación para organizar proyectos de arquitectura. Es una de las tres partes del proyecto:

```text
ARQUILA
├── FRONTEND-ARQUILA        Este repositorio
├── BACKEND-ARGUILA-        API (FastAPI)
└── BASE-DE-DATOS-ARQUILA   Migraciones y datos de ejemplo (PostgreSQL)
```

## Tecnología

TypeScript, React 18 y Vite, con Three.js para el modelo 3D. Vitest y Testing Library para las pruebas; ESLint y Prettier para el estilo.

## Requisitos

- Node 24 con `npm`.
- El backend de `BACKEND-ARGUILA-` en marcha.

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
| `API_PROXY_TARGET` | Backend al que el servidor de desarrollo reenvía `/api`. | `http://localhost:8000` |

Para cambiarlas, copiar `.env.example` a `.env`. El archivo `.env` no se sube al repositorio.

- **Desarrollo.** No hay que definir nada: el navegador llama a `/api` y Vite lo reenvía al backend del puerto 8000. Si el backend está en otra dirección, cambiar `API_PROXY_TARGET`.
- **Despliegue.** `VITE_API_URL` se fija al compilar (`npm run build`). Lo más sencillo es servir la API bajo `/api` en el mismo dominio que la interfaz. Si se usa otro dominio, poner su dirección completa en `VITE_API_URL` y añadir el origen de la interfaz a `APP_URL` o `CORS_ORIGINS` en el backend.

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

Si se cargaron los datos de ejemplo de `BASE-DE-DATOS-ARQUILA`, se puede entrar con `demo@example.com`, contraseña `arquila-demo` (credencial pública, solo para desarrollo).
