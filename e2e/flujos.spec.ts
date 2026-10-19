import { expect, test } from "@playwright/test";

import { mockApi } from "./api";

// The 3D engine is a large file of its own; the development server compiles it on first use.
const MODEL_TIMEOUT_MS = 45_000;

test.describe("entrar", () => {
    test("pide la sesión y, al entrar, lleva a la pantalla que se había pedido", async ({
        page,
    }) => {
        await mockApi(page, { signedIn: false });
        await page.goto("/proyectos/1/materiales");

        await expect(page.getByRole("button", { name: "Entrar", exact: true })).toBeVisible();
        // The address is kept while the login is shown, so signing in returns to it.
        await expect(page).toHaveURL(/\/proyectos\/1\/materiales$/);

        await page.getByLabel("Correo").fill("demo@example.com");
        await page.getByLabel("Contraseña", { exact: true }).fill("arquila-demo");
        await page.getByRole("button", { name: "Entrar", exact: true }).click();

        await expect(page.getByRole("heading", { name: "Casa Mirador" })).toBeVisible();
        await expect(page.getByRole("navigation", { name: "Migas de pan" })).toContainText(
            "Materiales",
        );
    });

    test("explica un correo incompleto en cuanto se sale del campo", async ({ page }) => {
        await mockApi(page, { signedIn: false });
        await page.goto("/");

        await page.getByLabel("Correo").fill("demo@");
        await page.getByLabel("Contraseña", { exact: true }).focus();

        await expect(page.getByRole("alert")).toHaveText(
            "Escribe el correo completo, como nombre@ejemplo.com.",
        );
    });
});

test.describe("crear un proyecto", () => {
    test("lo crea desde la cabecera, lo confirma y lo deja en la lista", async ({ page }) => {
        await mockApi(page);
        await page.goto("/");

        await page.getByRole("button", { name: "Nuevo proyecto" }).click();
        await expect(page).toHaveURL(/\/proyectos$/);

        await page.getByRole("textbox", { name: "Nombre", exact: true }).fill("Casa del Lago");
        await page.getByRole("button", { name: "Crear", exact: true }).click();

        await expect(page.getByText("Proyecto creado.")).toBeVisible();
        await expect(page.getByRole("button", { name: /Casa del Lago/ })).toBeVisible();
    });

    test("llega a un proyecto por su nombre desde la paleta de comandos", async ({ page }) => {
        await mockApi(page);
        await page.goto("/");

        // The shortcut belongs to the app, so the app must be on screen before it is pressed.
        await expect(page.getByRole("heading", { name: /Hola/ })).toBeVisible();
        await page.keyboard.press("Control+K");

        const palette = page.getByRole("dialog", { name: "Paleta de comandos" });

        await palette.getByRole("combobox").fill("guadua");
        await palette.getByRole("option", { name: /Estudio Guadua/ }).click();

        await expect(page).toHaveURL(/\/proyectos\/2\/terreno$/);
    });
});

test.describe("ver el modelo 3D", () => {
    test("dibuja el modelo y responde a los atajos y a la barra de herramientas", async ({
        page,
    }) => {
        await mockApi(page);
        await page.goto("/proyectos/1/modelo-3d");

        await expect(page.locator(".structure-viewer canvas")).toBeVisible({
            timeout: MODEL_TIMEOUT_MS,
        });
        await expect(page.getByRole("button", { name: "Aislar cuarto" })).toHaveAttribute(
            "aria-disabled",
            "true",
        );

        await page.getByRole("button", { name: "Sala", exact: true }).click();
        await expect(page.getByRole("status", { name: "Estado del modelo" })).toContainText("Sala");

        await page.keyboard.press("i");
        await expect(page.getByRole("button", { name: "Aislar cuarto" })).toHaveAttribute(
            "aria-pressed",
            "true",
        );

        await page.keyboard.press("Escape");
        await page.keyboard.press("4");
        await expect(page.getByRole("button", { name: "Superior" })).toHaveAttribute(
            "aria-pressed",
            "true",
        );

        await page.keyboard.press("?");
        await expect(page.getByRole("dialog", { name: "Atajos de teclado" })).toBeVisible();
    });

    test("mueve un cuarto con PATCH sobre la cuadrícula, y lo deshace y rehace", async ({
        page,
    }) => {
        await mockApi(page);
        await page.goto("/proyectos/1/modelo-3d");
        await expect(page.locator(".structure-viewer canvas")).toBeVisible({
            timeout: MODEL_TIMEOUT_MS,
        });

        await page.getByRole("button", { name: "Sala", exact: true }).click();

        const transform = page.getByRole("region", { name: "Posición y medidas de Sala" });
        const x = transform.getByLabel("X");
        const sent = (body: Record<string, number>) =>
            page.waitForRequest(
                (request) =>
                    request.method() === "PATCH" &&
                    request.url().endsWith("/api/rooms/1") &&
                    request.postDataJSON().x_m === body.x_m,
            );

        // 1,1 m lands on the grid of 0,25 m: 1 m.
        await x.fill("1,1");
        const moved = sent({ x_m: 1 });
        await x.press("Enter");
        expect((await moved).postDataJSON()).toMatchObject({ x_m: 1, y_m: 0, width_m: 6 });
        await expect(
            page.getByRole("status").filter({ hasText: "Cambios guardados" }),
        ).toBeVisible();
        await expect(x).toHaveValue("1");

        const undone = sent({ x_m: 0 });
        await page.getByRole("button", { name: "Deshacer" }).click();
        await undone;
        await expect(x).toHaveValue("0");

        const redone = sent({ x_m: 1 });
        await page.getByRole("button", { name: "Rehacer" }).click();
        await redone;
        await expect(x).toHaveValue("1");

        // There is no angle in the API: rotating is offered, off, with the reason.
        await expect(transform.getByRole("button", { name: "Rotar" })).toHaveAttribute(
            "aria-disabled",
            "true",
        );
    });

    test("la dirección anterior del modelo sigue abriendo", async ({ page }) => {
        await mockApi(page);
        await page.goto("/proyectos/1/modelo");

        await expect(page).toHaveURL(/\/proyectos\/1\/modelo-3d$/);
        await expect(page.locator(".structure-viewer canvas")).toBeVisible({
            timeout: MODEL_TIMEOUT_MS,
        });
    });
});

test.describe("planos 2D", () => {
    test("mide sobre la lámina y descarga un SVG que se puede abrir", async ({ page }) => {
        await mockApi(page);
        await page.goto("/planos");

        await page.getByRole("button", { name: "Fachada principal" }).click();
        await page.getByRole("button", { name: "Planta baja" }).click();
        await expect(page.getByRole("img", { name: /Planta baja/ })).toBeVisible();

        await page.getByRole("button", { name: "Medir" }).click();
        const stage = page.locator(".plan-stage");
        const box = await stage.boundingBox();

        if (box === null) {
            throw new Error("Sin lámina");
        }

        await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.5);
        await page.mouse.click(box.x + box.width * 0.6, box.y + box.height * 0.5);
        await expect(
            page.getByRole("status").filter({ hasText: /Distancia: [\d,]+ m/ }),
        ).toBeVisible();

        const download = page.waitForEvent("download");
        await page.getByRole("button", { name: /Descargar planta/ }).click();
        const file = await download;
        const source = await (await file.createReadStream()).toArray();
        const text = Buffer.concat(source).toString("utf8");

        // A valid file: it parses as SVG and carries the drawing.
        const parsed = await page.evaluate((svg) => {
            const doc = new DOMParser().parseFromString(svg, "image/svg+xml");

            return {
                error: doc.querySelector("parsererror") !== null,
                root: doc.documentElement.nodeName,
                shapes: doc.querySelectorAll("rect, line, polygon, path").length,
            };
        }, text);

        expect(file.suggestedFilename()).toMatch(/\.svg$/);
        expect(parsed).toMatchObject({ error: false, root: "svg" });
        expect(parsed.shapes).toBeGreaterThan(10);
    });
});

test.describe("iluminación", () => {
    test("calcula el sol con las coordenadas del terreno y la fecha", async ({ page }) => {
        await mockApi(page);
        await page.goto("/iluminacion");

        await expect(page.getByText("5,07° N · 75,51° O")).toBeVisible();
        await expect(page.locator(".studio-stage canvas")).toBeVisible({
            timeout: MODEL_TIMEOUT_MS,
        });

        const caption = page.getByRole("status").filter({ hasText: "azimut" });
        await page.getByLabel("Fecha").fill("2026-06-21");
        await page.getByRole("slider", { name: "Hora del día" }).fill("12");
        // Near the equator in June the noon sun is high and to the north.
        await expect(caption).toContainText(/Sol a 7\d° · azimut \d+° \(N\)/);

        await page.getByRole("slider", { name: "Hora del día" }).fill("23");
        await expect(caption).toContainText("Noche");
        await expect(page.getByRole("slider", { name: "Temperatura de color" })).toBeDisabled();
    });
});

test.describe("tema y paleta de comandos", () => {
    test("cambia de tema con el botón y con la paleta, y lo recuerda al volver", async ({
        page,
    }) => {
        await page.emulateMedia({ colorScheme: "dark" });
        await mockApi(page);
        await page.goto("/");
        await expect(page.getByRole("heading", { name: /Hola/ })).toBeVisible();

        const root = page.locator("html");
        const body = page.locator("body");

        // With no choice saved, the app follows the system.
        await expect(root).toHaveAttribute("data-theme", "dark");
        const dark = await body.evaluate((element) => getComputedStyle(element).backgroundColor);

        const themes = page.getByRole("radiogroup", { name: "Tema" });

        await themes.getByRole("radio", { name: "Tema claro" }).click();
        await expect(root).toHaveAttribute("data-theme", "light");
        await expect(themes.getByRole("radio", { name: "Tema claro" })).toBeChecked();
        await expect(themes.getByRole("radio", { name: "Tema oscuro" })).not.toBeChecked();
        // The colours settle a frame or two after the attribute changes.
        await expect(body).not.toHaveCSS("background-color", dark);

        // The choice outlives a reload, even though the system still asks for dark.
        await page.reload();
        await expect(page.getByRole("heading", { name: /Hola/ })).toBeVisible();
        await expect(root).toHaveAttribute("data-theme", "light");

        const palette = page.getByRole("dialog", { name: "Paleta de comandos" });

        await page.keyboard.press("Control+K");
        await expect(palette).toBeVisible();
        await palette.getByRole("combobox").fill("modo oscuro");
        await palette.getByRole("option", { name: "Cambiar al modo oscuro" }).click();

        await expect(palette).toBeHidden();
        await expect(root).toHaveAttribute("data-theme", "dark");
        await expect(body).toHaveCSS("background-color", dark);
    });

    test("se abre y se cierra con Ctrl+K y con Cmd+K", async ({ page }) => {
        await mockApi(page);
        await page.goto("/");
        await expect(page.getByRole("heading", { name: /Hola/ })).toBeVisible();

        const palette = page.getByRole("dialog", { name: "Paleta de comandos" });

        for (const shortcut of ["Control+K", "Meta+K"]) {
            await page.keyboard.press(shortcut);
            await expect(palette).toBeVisible();
            await expect(palette.getByRole("combobox")).toBeFocused();

            await page.keyboard.press(shortcut);
            await expect(palette).toBeHidden();
        }

        // Escape closes it too.
        await page.keyboard.press("Control+K");
        await expect(palette).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(palette).toBeHidden();
    });
});
