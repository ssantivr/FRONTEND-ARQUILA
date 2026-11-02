// Screenshots of the real viewer on the real API: Casa Los Arrayanes of the demo account, driven
// the way a person would. With the servers up on 5180 and 8010:  node scripts/capturas-3d.ts
//
// CAPTURAS_SALIDA=<folder> writes somewhere else. CAPTURAS_COMPARAR=<folder> also compares each
// picture with its namesake there and reports the share of pixels that changed, which is how a
// refactor proves it left the scene alone. CAPTURAS_CALIDAD=low|medium|high answers the account's
// `preview_quality` without touching it. Pictures stay out of git.
import { mkdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { Browser, Page } from "playwright-core";
import { chromium } from "playwright-core";

const BASE = process.env.CAPTURAS_URL ?? "http://localhost:5180";
const OUT = resolve(process.env.CAPTURAS_SALIDA ?? "docs/capturas-3d");
const COMPARE = process.env.CAPTURAS_COMPARAR;
const PROJECT = process.env.CAPTURAS_PROYECTO ?? "Casa Los Arrayanes";
const ACCOUNT = {
    email: process.env.CAPTURAS_CORREO ?? "demo@example.com",
    password: process.env.CAPTURAS_CLAVE ?? "arquila-demo",
};
const QUALITY = process.env.CAPTURAS_CALIDAD;
const SETTLE_MS = Number(process.env.CAPTURAS_ESPERA ?? 2500);
// A channel's difference below this is noise of the software renderer, not a change.
const CHANNEL_TOLERANCE = 12;

const pictures: string[] = [];
const errors: string[] = [];

async function shoot(page: Page, name: string): Promise<void> {
    await page.waitForTimeout(SETTLE_MS);
    await page.screenshot({ path: resolve(OUT, `${name}.png`) });
    pictures.push(name);
    console.log(`  ${name}.png`);
}

async function open(browser: Browser, theme: string, width: number, height: number): Promise<Page> {
    const context = await browser.newContext({
        viewport: { width, height },
        deviceScaleFactor: 1,
        reducedMotion: "reduce",
    });

    await context.addInitScript((value) => localStorage.setItem("arquila:theme", value), theme);
    await context.request.post(`${BASE}/api/auth/login`, { data: ACCOUNT, failOnStatusCode: true });

    const answer = await context.request.get(`${BASE}/api/projects`, { failOnStatusCode: true });
    const body = (await answer.json()) as
        { id: number; name: string }[] | { items: { id: number; name: string }[] };
    const projects = Array.isArray(body) ? body : body.items;
    const project = projects.find((item) => item.name === PROJECT);

    if (project === undefined) {
        throw new Error(`The demo account has no project called ${PROJECT}`);
    }

    const page = await context.newPage();

    if (QUALITY !== undefined) {
        await page.route("**/api/users/me/preferences", (route) =>
            route.fulfill({ json: { preview_quality: QUALITY } }),
        );
    }

    page.on("pageerror", (error) => errors.push(`${theme} ${width}: ${error.message}`));
    page.on("console", (message) => {
        if (message.type() === "error") {
            errors.push(`${theme} ${width}: ${message.text()}`);
        }
    });
    await page.goto(`${BASE}/proyectos/${project.id}/modelo-3d`);
    await page.locator(".structure-viewer canvas").first().waitFor();
    await page.waitForLoadState("networkidle");

    return page;
}

async function walkThrough(page: Page, suffix: string): Promise<void> {
    await shoot(page, `isometrica-${suffix}`);

    for (const [key, view] of [
        ["2", "frontal"],
        ["3", "lateral"],
        ["4", "superior"],
    ]) {
        await page.keyboard.press(key);
        await shoot(page, `${view}-${suffix}`);
    }

    await page.keyboard.press("1");
    await page.getByRole("button", { name: "Ortográfica" }).click();
    await shoot(page, `ortografica-${suffix}`);
    await page.getByRole("button", { name: "Ortográfica" }).click();

    await page.locator(".hud-tree-row button:not(.hud-eye)").first().click();
    await shoot(page, `seleccion-${suffix}`);
    await page.keyboard.press("i");
    await shoot(page, `aislado-${suffix}`);
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
}

/** Share of the pixels of two PNGs that differ, computed in the browser to need no library. */
async function difference(page: Page, name: string, folder: string): Promise<string> {
    const encode = async (path: string) => (await readFile(path)).toString("base64");

    return page.evaluate(
        async ([before, after, tolerance]) => {
            const pixels = async (data: string) => {
                const image = new Image();

                image.src = `data:image/png;base64,${data}`;
                await image.decode();

                const canvas = new OffscreenCanvas(image.width, image.height);
                const context = canvas.getContext("2d");

                context?.drawImage(image, 0, 0);

                return context?.getImageData(0, 0, image.width, image.height).data;
            };
            const [a, b] = [await pixels(before as string), await pixels(after as string)];

            if (a === undefined || b === undefined || a.length !== b.length) {
                return "distinto tamaño";
            }

            let changed = 0;
            let largest = 0;

            for (let index = 0; index < a.length; index += 4) {
                const gap = Math.max(
                    Math.abs(a[index] - b[index]),
                    Math.abs(a[index + 1] - b[index + 1]),
                    Math.abs(a[index + 2] - b[index + 2]),
                );

                largest = Math.max(largest, gap);
                changed += gap > (tolerance as number) ? 1 : 0;
            }

            return `${((changed / (a.length / 4)) * 100).toFixed(3)} % (máx. ${largest}/255)`;
        },
        [
            await encode(resolve(folder, `${name}.png`)),
            await encode(resolve(OUT, `${name}.png`)),
            CHANNEL_TOLERANCE,
        ] as const,
    );
}

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({
    channel: process.env.CAPTURAS_NAVEGADOR ?? "msedge",
    args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader", "--ignore-gpu-blocklist"],
});

try {
    for (const theme of ["light", "dark"]) {
        const name = theme === "light" ? "claro" : "oscuro";
        const desktop = await open(browser, theme, 1440, 900);

        await walkThrough(desktop, `${name}-escritorio`);
        await desktop.context().close();

        const phone = await open(browser, theme, 390, 844);

        await shoot(phone, `isometrica-${name}-movil`);
        await phone.context().close();
    }

    if (COMPARE !== undefined) {
        const page = await browser.newPage();

        for (const name of pictures) {
            console.log(`  ${name}: ${await difference(page, name, resolve(COMPARE))}`);
        }
    }
} finally {
    await browser.close();
}

if (errors.length > 0) {
    console.log(`Errores de consola:\n${[...new Set(errors)].join("\n")}`);
    process.exitCode = 1;
}
