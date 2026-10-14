import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

const DEFAULT_PROXY_TARGET = "http://localhost:8000";

/**
 * Libraries that only some screens need go in their own files, which the browser asks for when
 * one of those screens opens and keeps cached across releases of the app:
 * - `react`: React and the router, needed by every screen and seldom changed.
 * - `three`: the engine, for any 3D view.
 * - `three-post`: the glow and ambient occlusion passes of the viewer.
 * - `three-gltf`: the loader of a room's own 3D model, asked for when such a room is isolated.
 * - `charts`: Recharts and the d3 pieces it brings, for the cost chart.
 * - `geometry`: polygon-clipping, for the buildable area and the overlap of rooms.
 */
function chunkOf(id: string): string | undefined {
    if (!id.includes("node_modules")) {
        return undefined;
    }

    if (
        id.includes("three/examples/jsm/postprocessing") ||
        id.includes("three/examples/jsm/shaders")
    ) {
        return "three-post";
    }

    if (id.includes("three/examples/jsm/loaders")) {
        return "three-gltf";
    }

    if (id.includes("node_modules/three/")) {
        return "three";
    }

    // React is named first. A library placed in a chunk by hand takes with it whatever it needs
    // that has no chunk of its own, and Recharts needs React: without this line React itself
    // would move into the charts file and the first load would have to fetch all of it.
    if (
        /node_modules\/(react|react-dom|scheduler|react-router|use-sync-external-store)\//.test(id)
    ) {
        return "react";
    }

    if (
        /node_modules\/(recharts|d3-[^/]+|victory-vendor|internmap|decimal\.js-light|react-redux|@reduxjs\/toolkit|redux|redux-thunk|immer|reselect|es-toolkit|eventemitter3|tiny-invariant|react-is)\//.test(
            id,
        )
    ) {
        return "charts";
    }

    if (/node_modules\/(polygon-clipping|splaytree|robust-predicates)\//.test(id)) {
        return "geometry";
    }

    return undefined;
}

export default defineConfig(({ mode }) => ({
    plugins: [
        react(),
        // `npm run analizar` writes dist/bundle.html, a map of what each file of the build weighs.
        ...(process.env.ANALYZE === "1"
            ? [visualizer({ filename: "dist/bundle.html", gzipSize: true, template: "treemap" })]
            : []),
    ],
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
                manualChunks: (id: string) => chunkOf(id.replace(/\\/g, "/")),
            },
        },
    },
    test: {
        // The browser flows in e2e/ are run by Playwright, not by Vitest.
        exclude: ["node_modules/**", "dist/**", "e2e/**"],
        coverage: {
            provider: "v8",
            include: ["src/**/*.{ts,tsx}"],
            exclude: [
                "src/**/*.test.{ts,tsx}",
                "src/test/**",
                "src/main.tsx",
                // WebGL scenes: jsdom cannot run them, and they are checked in a real browser
                // by `npm run capturas`. Their pure helpers do have unit tests.
                "src/three/**",
                // Development-only page.
                "src/pages/DesignSystemPage.tsx",
                "src/components/MotionDemos.tsx",
                "src/types/**",
            ],
            reporter: ["text-summary", "html"],
            // Set a little under what the suite reaches today, so coverage can only go up.
            thresholds: {
                statements: 60,
                branches: 58,
                functions: 53,
                lines: 60,
            },
        },
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
