import { expect, test, type Page } from "@playwright/test";

import { mockApi } from "./api";

/** Opens the menu of actions of a project card and chooses one of its items. */
async function chooseAction(page: Page, project: string, action: string) {
    await page.getByTitle(`Acciones de ${project}`).click();
    await page
        .getByRole("group", { name: `Acciones de ${project}` })
        .getByRole("button", { name: action })
        .click();
}

test.describe("proyectos", () => {
    test("busca en la API, archiva, muestra los archivados y desarchiva", async ({ page }) => {
        await mockApi(page);
        await page.goto("/proyectos");

        const list = page.getByRole("region", { name: "Lista de proyectos" });

        await expect(list.getByRole("button", { name: /Estudio Guadua/ })).toBeVisible();

        // The search goes to GET /projects as `q`, and finds by the place too.
        const searched = page.waitForRequest((request) => request.url().includes("q=pereira"));

        await page.getByLabel("Buscar por nombre, descripción o lugar").fill("pereira");
        await searched;
        await expect(list.getByRole("button", { name: /Casa Mirador/ })).toHaveCount(0);
        await expect(list.getByRole("button", { name: /Estudio Guadua/ })).toBeVisible();
        await page.getByRole("button", { name: "Quitar filtros" }).click();

        await chooseAction(page, "Estudio Guadua", "Archivar");
        await expect(page.getByText("Proyecto archivado.")).toBeVisible();
        await expect(list.getByRole("button", { name: /Estudio Guadua/ })).toHaveCount(0);

        await page.getByLabel("Qué proyectos mostrar").selectOption("archived");
        await expect(list.getByRole("button", { name: /Estudio Guadua/ })).toBeVisible();

        await chooseAction(page, "Estudio Guadua", "Desarchivar");
        await expect(page.getByText("Proyecto desarchivado.")).toBeVisible();
        await expect(list.getByText("Ningún proyecto coincide")).toBeVisible();
    });

    test("edita un proyecto en su ventana y duplica otro", async ({ page }) => {
        await mockApi(page);
        await page.goto("/proyectos");

        await chooseAction(page, "Casa Mirador", "Editar…");

        const dialog = page.getByRole("dialog", { name: "Editar «Casa Mirador»" });

        await dialog.getByLabel("Avance (%)").fill("55");
        await dialog.getByRole("button", { name: "Guardar cambios" }).click();
        await expect(dialog).toBeHidden();
        await expect(page.getByText("Cambios guardados.")).toBeVisible();
        await expect(
            page.getByRole("button", { name: /Casa Mirador/ }).getByRole("progressbar"),
        ).toHaveAttribute("aria-valuenow", "55");

        await chooseAction(page, "Estudio Guadua", "Duplicar");
        await expect(
            page.getByText("Proyecto duplicado como «Estudio Guadua (copia)»."),
        ).toBeVisible();
        await expect(page.getByRole("button", { name: /Estudio Guadua \(copia\)/ })).toBeVisible();
    });
});

test.describe("ficha del proyecto", () => {
    test("abre en el resumen y lleva a las tareas", async ({ page }) => {
        await mockApi(page);
        await page.goto("/proyectos/1");

        // Without a tab in the address, the project opens on its summary.
        await expect(page.getByRole("heading", { name: "Resumen" })).toBeVisible();
        await expect(
            page
                .getByRole("navigation", { name: "Secciones del proyecto" })
                .getByRole("button", { name: "Resumen" }),
        ).toHaveAttribute("aria-current", "page");

        await page
            .getByRole("navigation", { name: "Ir a una sección del proyecto" })
            .getByRole("button", { name: "Tareas" })
            .click();
        await expect(page).toHaveURL(/\/proyectos\/1\/tareas$/);
        await expect(page.getByText("1 de 3 hechas")).toBeVisible();
    });

    test("crea una tarea, la marca hecha y la elimina", async ({ page }) => {
        await mockApi(page);
        await page.goto("/proyectos/1/tareas");

        await page.getByRole("button", { name: "Nueva tarea" }).click();
        await page.getByLabel("Título").fill("Revisar planos eléctricos");
        await page.getByRole("button", { name: "Crear tarea" }).click();
        await expect(page.getByText("Tarea creada.")).toBeVisible();

        const tasks = page.getByRole("list", { name: "Tareas del proyecto" });
        const task = tasks.getByRole("listitem").filter({ hasText: "Revisar planos eléctricos" });

        await task.getByLabel("Estado de «Revisar planos eléctricos»").selectOption("done");
        await expect(task.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");

        await task.getByRole("button", { name: "Eliminar «Revisar planos eléctricos»" }).click();
        await page.getByRole("button", { name: "Eliminar la tarea" }).click();
        await expect(page.getByText("Tarea eliminada.")).toBeVisible();
        await expect(task).toHaveCount(0);
    });

    test("guarda una versión, restaura otra y lo deja en el historial", async ({ page }) => {
        await mockApi(page);
        await page.goto("/proyectos/1/versiones");

        await page.getByLabel(/Etiqueta de la versión/).fill("Entrega al cliente");
        await page.getByRole("button", { name: "Guardar versión" }).click();
        await expect(page.getByText("Versión 2 · Entrega al cliente")).toBeVisible();

        await page.getByRole("button", { name: "Restaurar la versión 1" }).click();
        await page.getByRole("alertdialog").getByRole("button", { name: "Restaurar" }).click();
        await expect(page.getByText("Versión 1 restaurada.")).toBeVisible();
        await expect(page.getByText("Versión 3 · Antes de restaurar la versión 1")).toBeVisible();

        await page.goto("/proyectos/1/historial");
        const history = page.getByRole("list", { name: "Cambios del proyecto" });

        await expect(history.getByText("Se restauró la versión 1")).toBeVisible();
        await expect(history.getByText("Se guardó la versión 2")).toBeVisible();
    });
});

test.describe("materiales y terrenos", () => {
    test("aplica una superficie a un cuarto del modelo con PATCH", async ({ page }) => {
        await mockApi(page);
        await page.goto("/materiales");

        await page.getByLabel("Filtrar por categoría").selectOption("Madera");
        await page.getByRole("button", { name: /^Madera/ }).click();

        const panel = page.getByRole("dialog", { name: "Madera" });

        await panel.getByLabel("Proyecto").selectOption({ label: "Casa Mirador" });
        await panel.getByLabel("Elemento del modelo").selectOption({ index: 1 });

        const saved = page.waitForRequest(
            (request) => request.method() === "PATCH" && request.url().endsWith("/surface"),
        );

        await panel.getByRole("button", { name: /^Aplicar «Madera» a / }).click();
        expect((await saved).postDataJSON()).toEqual({ surface: "wood" });
        await expect(page.getByText(/«Madera» aplicada a /)).toBeVisible();
    });

    test("filtra los terrenos con coordenadas y enlaza su ubicación", async ({ page }) => {
        await mockApi(page);
        await page.goto("/terrenos");

        await page.getByLabel("Solo con coordenadas").check();
        await expect(page.getByRole("button", { name: /Estudio Guadua/ })).toHaveCount(0);
        await expect(page.getByRole("link", { name: /Ver en OpenStreetMap/ })).toBeVisible();
    });
});
