// Screenshots of the main screens, in both themes and at desktop and phone sizes, plus a real
// click-through of the 3D viewer. Run it with the dev server up:  npm run dev  →  npm run capturas
//
// The API is answered here with sample data, so the pictures never show a real account and the
// script works without a backend. Nothing in this file ships with the app.
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright-core";

import { answer } from "./datos-de-muestra.mjs";

const BASE = process.env.CAPTURAS_URL ?? "http://localhost:5173";
// CAPTURAS_SALIDA=C:\otra\carpeta writes somewhere else, to compare two runs without touching the docs.
const OUT =
    process.env.CAPTURAS_SALIDA === undefined
        ? new URL("../docs/capturas/", import.meta.url)
        : pathToFileURL(`${resolve(process.env.CAPTURAS_SALIDA)}/`);
// CAPTURAS_SOLO=inicio,inicio-de-sesion regenerates only those screens and skips the viewer check.
const ONLY = (process.env.CAPTURAS_SOLO ?? "").split(",").filter(Boolean);
const wanted = (name) => ONLY.length === 0 || ONLY.includes(name);

const SCREENS = [
    ["inicio", "/"],
    ["proyectos", "/proyectos"],
    ["proyecto-materiales", "/proyectos/1/materiales"],
    ["proyecto-planos", "/proyectos/1/planos"],
    ["proyecto-modelo-3d", "/proyectos/1/modelo-3d"],
    ["proyecto-terreno", "/proyectos/1/terreno"],
    ["proyecto-elevaciones", "/proyectos/1/elevaciones"],
    ["terrenos", "/terrenos"],
    ["materiales", "/materiales"],
    ["recorrido", "/recorrido"],
    ["planos", "/planos"],
    ["iluminacion", "/iluminacion"],
    ["renderizado", "/renderizado"],
    ["tareas", "/tareas"],
    ["configuracion", "/configuracion"],
];
const SIZES = {
    escritorio: { width: 1440, height: 900 },
    tablet: { width: 1024, height: 768 },
    movil: { width: 390, height: 844 },
};

async function open(browser, { theme, size, signedIn = true }) {
    // Reduced motion: every picture shows the settled screen, not a frame of an animation.
    const context = await browser.newContext({
        viewport: SIZES[size],
        deviceScaleFactor: 1,
        reducedMotion: "reduce",
    });

    await context.addInitScript((value) => localStorage.setItem("arquila:theme", value), theme);
    await context.route("**/api/**", (route) => {
        const url = new URL(route.request().url());
        const path = url.pathname.replace(/^\/api/, "");

        return signedIn
            ? route.fulfill({ json: answer(path, url.searchParams) })
            : route.fulfill({ status: 401, json: { detail: "Not authenticated" } });
    });

    return context;
}

async function shoot(page, name) {
    await page.waitForLoadState("networkidle");
    // A picture still decoding would be caught halfway through its fade-in.
    await page.waitForFunction("[...document.images].every((image) => image.complete)");
    await page.waitForTimeout(900);
    await page.screenshot({
        path: fileURLToPath(new URL(`${name}.jpg`, OUT)),
        type: "jpeg",
        quality: 82,
    });
    console.log(`  ${name}.jpg`);
}

/** The states a plain visit does not show: the command palette and the tools of the 3D viewer. */
async function shootStates(browser, theme) {
    const suffix = `${theme === "light" ? "claro" : "oscuro"}-escritorio`;
    const context = await open(browser, { theme, size: "escritorio" });
    const page = await context.newPage();

    await page.goto(`${BASE}/proyectos/1/planos`);
    await page.getByRole("navigation", { name: "Migas de pan" }).waitFor();
    await page.keyboard.press("Control+K");
    await page.getByRole("combobox").fill("mod");
    await shoot(page, `estado-paleta-de-comandos-${suffix}`);
    await page.keyboard.press("Escape");

    await page.goto(`${BASE}/proyectos/1/modelo-3d`);
    await page.locator(".structure-viewer canvas").waitFor();
    await page.getByRole("button", { name: "Sala", exact: true }).click();
    await page.keyboard.press("i");
    await page.waitForTimeout(1200);
    await shoot(page, `estado-modelo-3d-cuarto-aislado-${suffix}`);

    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Corte", exact: true }).click();
    await page.waitForTimeout(900);
    await shoot(page, `estado-modelo-3d-corte-${suffix}`);

    await page.getByRole("button", { name: "Corte", exact: true }).click();
    await page.keyboard.press("?");
    await page.getByRole("dialog", { name: "Atajos de teclado" }).waitFor();
    await shoot(page, `estado-modelo-3d-atajos-${suffix}`);
    await context.close();
}

/** Uses the 3D viewer the way a person would and reports what the engine did. */
async function checkViewer(browser) {
    const context = await open(browser, { theme: "light", size: "escritorio" });
    const page = await context.newPage();
    const results = [];

    await page.goto(`${BASE}/proyectos/1/modelo-3d`);
    await page.getByRole("button", { name: "Ocultar Dormitorio" }).click();
    results.push([
        "ojo del árbol: oculta y ofrece volver a mostrar",
        await page.getByRole("button", { name: "Mostrar Dormitorio" }).isVisible(),
    ]);
    await page.waitForTimeout(600);
    await shoot(page, "comprobacion-objeto-oculto");

    await page.getByRole("slider", { name: /Sol/ }).fill("180");
    results.push(["control del sol: marca 180°", await page.getByText("180°").isVisible()]);
    await page.waitForTimeout(600);
    await shoot(page, "comprobacion-sol-180");

    // Real picking through the orthographic camera: a click on the model must select something.
    await page.getByRole("button", { name: "Mostrar Dormitorio" }).click();
    await page.getByRole("button", { name: "Ortográfica" }).click();
    await page.waitForTimeout(600);

    const canvas = page.locator(".structure-viewer canvas");
    const status = page.getByRole("status", { name: "Estado del modelo" });
    const box = await canvas.boundingBox();

    // The canvas is taller than the window, so the click is given relative to it and scrolled to.
    await canvas.click({ position: { x: box.width / 2, y: box.height / 2 } });
    await page.waitForTimeout(400);
    const statusText = await status.innerText();

    results.push([
        `cámara ortográfica: un clic en el modelo selecciona (${statusText.split("\n")[0]})`,
        statusText.includes("Ortográfica") && !statusText.includes("Sin selección"),
    ]);
    await shoot(page, "comprobacion-ortografica");

    const [download] = await Promise.all([
        page.waitForEvent("download"),
        page.getByRole("button", { name: "Guardar imagen" }).click(),
    ]);
    const file = fileURLToPath(new URL("comprobacion-descarga.png", OUT));

    await download.saveAs(file);
    results.push([
        `descarga PNG: ${download.suggestedFilename()}`,
        download.suggestedFilename() === "arquila-proyecto-1.png",
    ]);
    await context.close();

    return results;
}

/** Changes the light and renders a still, and checks the file that comes out. */
async function checkStudio(browser) {
    const context = await open(browser, { theme: "light", size: "escritorio" });
    const page = await context.newPage();
    const results = [];

    await page.goto(`${BASE}/iluminacion`);
    await page.locator(".structure-viewer canvas").waitFor();
    await page.getByRole("slider", { name: /Hora del día/ }).fill("18");
    await page.getByRole("slider", { name: /Nubosidad/ }).fill("40");
    results.push([
        "iluminación: a las 18:00 el cielo pasa a atardecer",
        await page.locator(".studio-caption").getByText("Atardecer").isVisible(),
    ]);
    await page.waitForTimeout(900);
    await shoot(page, "comprobacion-atardecer");

    // The light is kept per project, so the render screen must open with it.
    await page.getByRole("button", { name: "Renderizar con esta luz" }).click();
    await page.locator(".structure-viewer canvas").waitFor();
    results.push([
        "render: usa la luz elegida en iluminación",
        await page.getByText("Luz de las 18:00, atardecer").isVisible(),
    ]);
    await page.getByRole("button", { name: "Iniciar render" }).click();

    const image = page.getByRole("img", { name: /Render del proyecto/ });

    await image.waitFor({ timeout: 180_000 });
    const drawn = await image.evaluate(async (element) => {
        await element.decode();

        return `${element.naturalWidth}x${element.naturalHeight}`;
    });

    results.push([`render: imagen de ${drawn} px`, drawn === "1920x1080"]);

    const [download] = await Promise.all([
        page.waitForEvent("download"),
        page.getByRole("link", { name: "Descargar" }).click(),
    ]);

    await download.saveAs(fileURLToPath(new URL("comprobacion-render.png", OUT)));
    results.push([
        `render: descarga ${download.suggestedFilename()}`,
        download.suggestedFilename() === "arquila-Casa-Andina-1920x1080.png",
    ]);
    await shoot(page, "comprobacion-render-pantalla");
    await context.close();

    return results;
}

const browser = await chromium.launch({
    channel: process.env.CAPTURAS_NAVEGADOR ?? "msedge",
    args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader", "--ignore-gpu-blocklist"],
});

await mkdir(OUT, { recursive: true });

for (const theme of ["light", "dark"]) {
    for (const size of Object.keys(SIZES)) {
        const context = await open(browser, { theme, size });
        const page = await context.newPage();
        const suffix = `${theme === "light" ? "claro" : "oscuro"}-${size}`;

        console.log(`${suffix}:`);

        for (const [name, path] of SCREENS.filter(([screen]) => wanted(screen))) {
            await page.goto(`${BASE}${path}`);
            await shoot(page, `${name}-${suffix}`);
        }

        await context.close();
    }

    if (wanted("estados")) {
        await shootStates(browser, theme);
    }

    if (wanted("inicio-de-sesion")) {
        for (const size of Object.keys(SIZES)) {
            const anonymous = await open(browser, { theme, size, signedIn: false });
            const login = await anonymous.newPage();

            await login.goto(`${BASE}/`);
            await shoot(
                login,
                `inicio-de-sesion-${theme === "light" ? "claro" : "oscuro"}-${size}`,
            );
            await anonymous.close();
        }
    }
}

console.log("comprobación del visor 3D:");

// CAPTURAS_SOLO=estudio runs only the lighting and render check.
const results = [
    ...(ONLY.length === 0 ? await checkViewer(browser) : []),
    ...(ONLY.length === 0 || ONLY.includes("estudio") ? await checkStudio(browser) : []),
];

for (const [label, ok] of results) {
    console.log(`  ${ok ? "ok   " : "FALLA"} ${label}`);
}

await browser.close();
process.exitCode = results.every(([, ok]) => ok) ? 0 : 1;
