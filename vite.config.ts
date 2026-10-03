import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// In development the browser calls /api/* and Vite forwards it to FastAPI,
// so the backend does not need CORS configuration.
export default defineConfig({
    plugins: [react()],
    server: {
        proxy: {
            "/api": {
                target: "http://localhost:8000",
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api/, ""),
            },
        },
    },
});
