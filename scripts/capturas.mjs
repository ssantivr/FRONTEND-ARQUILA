// Screenshots of the main screens, in both themes and at desktop and phone sizes, plus a real
// click-through of the 3D viewer. Run it with the dev server up:  npm run dev  →  npm run capturas
//
// The API is answered here with sample data, so the pictures never show a real account and the
// script works without a backend. Nothing in this file ships with the app.
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const BASE = process.env.CAPTURAS_URL ?? "http://localhost:5173";
const OUT = new URL("../docs/capturas/", import.meta.url);
const NOW = "2026-10-05T10:00:00Z";

const user = { id: 1, name: "Ana Torres", email: "ana@example.com", created_at: NOW };
const projects = ["Casa Andina", "Oficina Central", "Loft Norte", "Vivienda Mirador"].map(
    (name, index) => ({
        id: index + 1,
        owner_id: 1,
        name,
        description: "Vivienda de dos niveles con patio interior.",
        location: index === 1 ? null : "Quito",
        status: ["active", "draft", "archived", "active"][index],
        created_at: NOW,
        updated_at: `2026-10-0${index + 1}T10:00:00Z`,
    }),
);
const terrains = [
    {
        id: 1,
        project_id: 1,
        name: "Lote principal",
        area_m2: 480,
        width_m: 24,
        length_m: 20,
        points: [
            { x_m: 0, y_m: 0 },
            { x_m: 24, y_m: 0 },
            { x_m: 24, y_m: 14 },
            { x_m: 14, y_m: 20 },
            { x_m: 0, y_m: 20 },
        ],
        slope_percent: 4,
        soil_type: "Arcilloso",
        latitude: null,
        longitude: null,
        created_at: NOW,
    },
];
const materials = [
    ["Ladrillo", "Mampostería", "u", 4200, 0.35],
    ["Cemento", "Estructura", "saco", 180, 8.2],
    ["Acero corrugado", "Estructura", "kg", 950, 1.4],
    ["Porcelanato", "Acabados", "m²", 120, 22],
].map(([name, category, unit, quantity, unit_cost], index) => ({
    id: index + 1,
    project_id: 1,
    name,
    category,
    unit,
    quantity,
    unit_cost,
    created_at: NOW,
}));
const room = (id, name, level, x, y) => ({
    kind: "room",
    id,
    plan_id: level,
    plan_title: level === 1 ? "Planta baja" : "Planta alta",
    name,
    level: String(level),
    x_m: x,
    y_m: y,
    base_m: (level - 1) * 3,
    width_m: 6,
    depth_m: 5,
    height_m: 2.8,
    surface: null,
});
const structure = {
    project_id: 1,
    roof: "gable",
    terrains: [
        {
            id: 1,
            name: "Lote principal",
            outline: [
                { x_m: -6, y_m: -5 },
                { x_m: 18, y_m: -5 },
                { x_m: 18, y_m: 15 },
                { x_m: -6, y_m: 15 },
            ],
        },
    ],
    rooms: [
        room(1, "Sala", 1, 3, 2.5),
        room(2, "Cocina", 1, 9, 2.5),
        room(3, "Comedor", 1, 3, 7.5),
        room(4, "Dormitorio", 2, 3, 2.5),
        room(5, "Baño", 2, 9, 2.5),
    ],
    components: [],
};

function answer(path) {
    if (path === "/auth/me") return user;
    if (path === "/summary") {
        return {
            projects: 4,
            draft_projects: 1,
            active_projects: 2,
            archived_projects: 1,
            terrains: 1,
            total_area_m2: 480,
            materials_total_cost: 6916,
        };
    }
    if (path === "/projects") return projects;
    if (/^\/projects\/\d+$/.test(path)) return projects[0];
    if (path.endsWith("/structure")) return structure;
    if (path.endsWith("/terrains")) return path.startsWith("/projects/1/") ? terrains : [];
    if (path.endsWith("/materials")) return path.startsWith("/projects/1/") ? materials : [];
    if (path.includes("spatial-data")) {
        return {
            project_id: 1,
            counts: { structure: 0, installations: 0, finishes: 0 },
            elements: [],
        };
    }
    if (path.includes("interior-walkthrough")) {
        return { project_id: 1, steps: [], renovation_logs: [] };
    }
    if (path === "/assistant/status") return { provider: "demo", available: true };

    return [];
}

const SCREENS = [
    ["inicio", "/"],
    ["proyectos", "/proyectos"],
    ["proyecto-materiales", "/proyectos/1/materiales"],
    ["proyecto-planos", "/proyectos/1/planos"],
    ["proyecto-modelo-3d", "/proyectos/1/modelo"],
    ["terrenos", "/terrenos"],
    ["materiales", "/materiales"],
    ["recorrido", "/recorrido"],
    ["configuracion", "/configuracion"],
];
const SIZES = {
    escritorio: { width: 1366, height: 900 },
    movil: { width: 390, height: 844 },
};

async function open(browser, { theme, size, signedIn = true }) {
    const context = await browser.newContext({ viewport: SIZES[size], deviceScaleFactor: 1 });

    await context.addInitScript((value) => localStorage.setItem("arquila:theme", value), theme);
    await context.route("**/api/**", (route) => {
        const path = new URL(route.request().url()).pathname.replace(/^\/api/, "");

        return signedIn
            ? route.fulfill({ json: answer(path) })
            : route.fulfill({ status: 401, json: { detail: "Not authenticated" } });
    });

    return context;
}

async function shoot(page, name) {
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(900);
    await page.screenshot({
        path: fileURLToPath(new URL(`${name}.jpg`, OUT)),
        type: "jpeg",
        quality: 82,
    });
    console.log(`  ${name}.jpg`);
}

/** Uses the 3D viewer the way a person would and reports what the engine did. */
async function checkViewer(browser) {
    const context = await open(browser, { theme: "light", size: "escritorio" });
    const page = await context.newPage();
    const results = [];

    await page.goto(`${BASE}/proyectos/1/modelo`);
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

        for (const [name, path] of SCREENS) {
            await page.goto(`${BASE}${path}`);
            await shoot(page, `${name}-${suffix}`);
        }

        await context.close();
    }

    const anonymous = await open(browser, { theme, size: "escritorio", signedIn: false });
    const login = await anonymous.newPage();

    await login.goto(`${BASE}/`);
    await shoot(login, `inicio-de-sesion-${theme === "light" ? "claro" : "oscuro"}-escritorio`);
    await anonymous.close();
}

console.log("comprobación del visor 3D:");

const results = await checkViewer(browser);

for (const [label, ok] of results) {
    console.log(`  ${ok ? "ok   " : "FALLA"} ${label}`);
}

await browser.close();
process.exitCode = results.every(([, ok]) => ok) ? 0 : 1;
