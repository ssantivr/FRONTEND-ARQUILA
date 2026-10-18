// Checks the movement of the interface in a real browser. Run it with the app being served:
//   npm run dev  →  npm run movimiento
//
// 1. With «reduce motion» on, nothing may be moving on any screen, nor in the command palette.
// 2. With normal motion, no screen may shift its layout while it loads (CLS must be 0).
//
// The API is answered with the same sample data as the screenshots, so no backend is needed.
/* global document, window -- used inside the page */
import { chromium } from "playwright-core";

import { answer } from "./datos-de-muestra.mjs";

const BASE = process.env.CAPTURAS_URL ?? "http://localhost:5173";
// «?sin-sesion» makes the API answer 401, so the sign-in screen is measured too.
const SIGNED_OUT = "sin-sesion";
const SCREENS = [
    ["inicio de sesión", `/?${SIGNED_OUT}`],
    ["inicio", "/"],
    ["proyectos", "/proyectos"],
    ["proyecto: planos", "/proyectos/1/planos"],
    ["proyecto: modelo 3D", "/proyectos/1/modelo-3d"],
    ["planos 2D", "/planos"],
    ["editor 3D", "/visor"],
    ["materiales", "/materiales"],
    ["terrenos", "/terrenos"],
    ["configuración", "/configuracion"],
];
// The API answers late on purpose: every screen then shows its loading state before its content,
// which is when a layout jumps. Without the delay the result would depend on the speed of the run.
const API_DELAY_MS = 350;
// The home page and the sign-in screen must not move at all; under this a shift is sub-pixel
// rounding of the header while the font arrives. The other screens must stay within what web.dev
// calls «good».
const CLS_HOME = 0.001;
const CLS_GOOD = 0.1;

async function open(browser, reducedMotion) {
    const context = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        reducedMotion,
    });

    await context.addInitScript(() => {
        localStorage.setItem("arquila:theme", "light");
        window.__shift = 0;
        new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                if (!entry.hadRecentInput) {
                    window.__shift += entry.value;
                }
            }
        }).observe({ type: "layout-shift", buffered: true });
    });
    await context.route("**/api/**", async (route) => {
        await new Promise((resolve) =>
            setTimeout(resolve, reducedMotion === "reduce" ? 0 : API_DELAY_MS),
        );

        const url = new URL(route.request().url());

        if ((route.request().headers().referer ?? "").includes(SIGNED_OUT)) {
            return route.fulfill({ status: 401, json: { detail: "Not authenticated" } });
        }

        return route.fulfill({
            json: answer(url.pathname.replace(/^\/api/, ""), url.searchParams),
        });
    });

    return context;
}

/** Animations and transitions still running, with what they are attached to. */
function moving() {
    return document
        .getAnimations()
        .filter((animation) => {
            const timing = animation.effect?.getComputedTiming();

            return (
                animation.playState === "running" &&
                timing !== undefined &&
                (timing.duration > 1 || timing.iterations === Infinity)
            );
        })
        .map((animation) => {
            const target = animation.effect?.target;
            const name = animation.animationName ?? animation.transitionProperty ?? "animación";

            return `${name} en <${target?.tagName.toLowerCase()} class="${target?.className}">`;
        });
}

const browser = await chromium.launch({
    channel: process.env.CAPTURAS_NAVEGADOR ?? "msedge",
    args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader", "--ignore-gpu-blocklist"],
});
const failures = [];

console.log("Con «reducir movimiento»: nada debe moverse");

const still = await open(browser, "reduce");
const stillPage = await still.newPage();

for (const [name, path] of SCREENS) {
    await stillPage.goto(`${BASE}${path}`);
    await stillPage.waitForLoadState("networkidle");
    await stillPage.waitForTimeout(400);

    const found = await stillPage.evaluate(moving);

    console.log(`  ${found.length === 0 ? "ok   " : "FALLA"} ${name}`);
    found.forEach((item) => console.log(`        ${item}`));

    if (found.length > 0) {
        failures.push(`${name}: ${found.length} animaciones con movimiento reducido`);
    }
}

await stillPage.keyboard.press("Control+K");
await stillPage.getByRole("combobox").waitFor();
await stillPage.waitForTimeout(100);

const inPalette = await stillPage.evaluate(moving);

console.log(`  ${inPalette.length === 0 ? "ok   " : "FALLA"} paleta de comandos`);

if (inPalette.length > 0) {
    failures.push("paleta de comandos: se anima con movimiento reducido");
}

await still.close();

console.log("Con movimiento normal: nada debe desplazar la maquetación (CLS)");

const lively = await open(browser, "no-preference");
const livelyPage = await lively.newPage();

for (const [name, path] of SCREENS) {
    await livelyPage.goto(`${BASE}${path}`);
    await livelyPage.waitForLoadState("networkidle");
    await livelyPage.waitForTimeout(2500);

    const shift = await livelyPage.evaluate(() => window.__shift);
    const ok = shift <= (path === "/" || path.startsWith("/?") ? CLS_HOME : CLS_GOOD);

    console.log(`  ${ok ? "ok   " : "FALLA"} ${name}: CLS ${shift.toFixed(4)}`);

    if (!ok) {
        failures.push(`${name}: CLS ${shift.toFixed(4)}`);
    }
}

await lively.close();
await browser.close();

console.log(
    failures.length === 0
        ? "Movimiento comprobado: sin animaciones con movimiento reducido y sin desplazamientos."
        : `${failures.length} problemas:\n  ${failures.join("\n  ")}`,
);
process.exitCode = failures.length === 0 ? 0 : 1;
