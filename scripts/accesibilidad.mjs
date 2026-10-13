// Automatic accessibility check with axe-core on the main screens, in both themes.
// Run it with the dev server up:  npm run dev  →  npm run accesibilidad
//
// It fails on serious and critical WCAG 2 A/AA violations and lists the rest. The API is
// answered with sample data, so it works without a backend.
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

import { answer } from "./datos-de-muestra.mjs";

const BASE = process.env.CAPTURAS_URL ?? "http://localhost:5173";
const AXE = fileURLToPath(new URL("../node_modules/axe-core/axe.min.js", import.meta.url));
const SCREENS = [
    ["inicio de sesión", "/", false],
    ["inicio", "/", true],
    ["proyectos", "/proyectos", true],
    ["proyecto: terreno", "/proyectos/1/terreno", true],
    ["proyecto: materiales", "/proyectos/1/materiales", true],
    ["proyecto: modelo 3D", "/proyectos/1/modelo", true],
    ["terrenos", "/terrenos", true],
    ["materiales", "/materiales", true],
    ["planos", "/planos", true],
    ["iluminación", "/iluminacion", true],
    ["renderizado", "/renderizado", true],
    ["tareas", "/tareas", true],
    ["configuración", "/configuracion", true],
];
const BLOCKING = ["serious", "critical"];

const browser = await chromium.launch({
    channel: process.env.CAPTURAS_NAVEGADOR ?? "msedge",
    args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader", "--ignore-gpu-blocklist"],
});
let blocking = 0;

for (const theme of ["light", "dark"]) {
    for (const [name, path, signedIn] of SCREENS) {
        const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

        await context.addInitScript((value) => localStorage.setItem("arquila:theme", value), theme);
        await context.route("**/api/**", (route) => {
            const url = new URL(route.request().url());
            const apiPath = url.pathname.replace(/^\/api/, "");

            return signedIn
                ? route.fulfill({ json: answer(apiPath, url.searchParams) })
                : route.fulfill({ status: 401, json: { detail: "Not authenticated" } });
        });

        const page = await context.newPage();

        await page.goto(`${BASE}${path}`);
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(1200);
        await page.addScriptTag({ path: AXE });

        const { violations, passed } = await page.evaluate(
            "axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }).then((result) => ({ passed: result.passes.length, violations: result.violations.map((item) => ({ id: item.id, impact: item.impact, help: item.help, nodes: item.nodes.map((node) => node.target.join(' ')) })) }))",
        );
        const label = `${theme === "light" ? "claro" : "oscuro"} · ${name}`;

        if (violations.length === 0) {
            console.log(`ok     ${label} (${passed} reglas comprobadas)`);
        }

        for (const violation of violations) {
            const stops = BLOCKING.includes(violation.impact);

            blocking += stops ? 1 : 0;
            console.log(
                `${stops ? "FALLA " : "aviso "} ${label}: ${violation.id} (${violation.impact}) — ${violation.help}`,
            );

            for (const node of violation.nodes.slice(0, 4)) {
                console.log(`         ${node}`);
            }
        }

        await context.close();
    }
}

await browser.close();
console.log(blocking === 0 ? "Sin fallos graves." : `${blocking} fallos graves.`);
process.exitCode = blocking === 0 ? 0 : 1;
