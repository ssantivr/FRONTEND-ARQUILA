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

    test("la dirección anterior del modelo sigue abriendo", async ({ page }) => {
        await mockApi(page);
        await page.goto("/proyectos/1/modelo");

        await expect(page).toHaveURL(/\/proyectos\/1\/modelo-3d$/);
        await expect(page.locator(".structure-viewer canvas")).toBeVisible({
            timeout: MODEL_TIMEOUT_MS,
        });
    });
});
