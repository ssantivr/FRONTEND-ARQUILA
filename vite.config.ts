import react from "@vitejs/plugin-react";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

const DEFAULT_PROXY_TARGET = "http://localhost:8000";

export default defineConfig(({ mode }) => ({
    plugins: [react()],
    server: {
        proxy: {
            "/api": {
                target: loadEnv(mode, ".", "API_").API_PROXY_TARGET ?? DEFAULT_PROXY_TARGET,
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api/, ""),
            },
        },
    },
    build: {
        // The three.js core cannot be split further. It gets its own chunk, which only loads when
        // a 3D view opens and stays cached across releases of the app; the limit is set just
        // above its size so that any other chunk growing past it still warns.
        chunkSizeWarningLimit: 700,
        rollupOptions: {
            output: {
                manualChunks: (id: string) =>
                    id.includes("node_modules/three/build/") ? "three" : undefined,
            },
        },
    },
    test: {
        projects: [
            {
                extends: true,
                test: {
                    name: "logic",
                    environment: "node",
                    include: ["src/**/*.test.ts"],
                },
            },
            {
                extends: true,
                test: {
                    name: "components",
                    environment: "jsdom",
                    include: ["src/**/*.test.tsx"],
                    setupFiles: ["src/test/setup.ts"],
                },
            },
        ],
    },
}));
