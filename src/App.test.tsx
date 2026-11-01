import { act, render, renderHook, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation, useNavigate, type NavigateFunction } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "./App";
import { forgetProjects, rememberProjects, useKnownProjects } from "./state/knownProjects";
import { ApiError, request } from "./services/http";

vi.mock("./services/http", async (original) => ({
    ...(await original<typeof import("./services/http")>()),
    request: vi.fn(),
}));

const user = { id: 1, name: "Ana Torres", email: "ana@example.com", created_at: "2026-10-01" };
const project = {
    id: 7,
    owner_id: 1,
    name: "Casa Andina",
    description: null,
    location: "Quito",
    status: "active" as const,
    created_at: "2026-10-01T12:00:00Z",
    updated_at: "2026-10-04T12:00:00Z",
};
const summary = {
    projects: 1,
    draft_projects: 0,
    active_projects: 1,
    archived_projects: 0,
    terrains: 0,
    total_area_m2: 0,
    materials_total_cost: 0,
};

let signedIn = true;
let navigate: NavigateFunction = () => undefined;

function Probe() {
    navigate = useNavigate();

    return <output data-testid="path">{useLocation().pathname}</output>;
}

function renderAt(path: string) {
    render(
        <MemoryRouter initialEntries={[path]}>
            <App />
            <Probe />
        </MemoryRouter>,
    );
}

beforeEach(() => {
    signedIn = true;
    vi.mocked(request).mockImplementation((path: string) => {
        if (path === "/auth/login") {
            signedIn = true;

            return Promise.resolve(user);
        }

        if (path === "/auth/me") {
            return signedIn
                ? Promise.resolve(user)
                : Promise.reject(new ApiError(401, "Not authenticated"));
        }

        if (path === "/summary") {
            return Promise.resolve(summary);
        }

        return Promise.resolve(path === "/projects/7" ? project : []);
    });
});

function trail() {
    return screen.getByRole("navigation", { name: "Migas de pan" });
}

describe("App shell", () => {
    beforeEach(() => {
        window.localStorage.clear();
        forgetProjects();
    });

    it("keeps the menu collapsed after a reload, from its toggle and from the palette", async () => {
        const { unmount } = render(
            <MemoryRouter>
                <App />
            </MemoryRouter>,
        );

        await userEvent.click(await screen.findByRole("button", { name: "Contraer el menú" }));
        expect(window.localStorage.getItem("arquila:sidebar")).toBe("collapsed");
        unmount();

        renderAt("/");
        expect(await screen.findByRole("button", { name: "Expandir el menú" })).toHaveAttribute(
            "aria-expanded",
            "false",
        );

        await userEvent.keyboard("{Control>}k{/Control}");
        await userEvent.click(await screen.findByRole("option", { name: "Expandir el menú" }));
        expect(window.localStorage.getItem("arquila:sidebar")).toBe("expanded");
    });

    it("finds a project already loaded in the palette, without asking the server", async () => {
        renderAt("/terrenos");
        await screen.findByRole("navigation", { name: "Migas de pan" });
        rememberProjects([project]);

        await userEvent.keyboard("{Control>}k{/Control}");
        vi.mocked(request).mockClear();
        await userEvent.type(await screen.findByRole("combobox"), "andina");

        expect(await screen.findByRole("option", { name: /Casa Andina/ })).toBeInTheDocument();
        // The screen below may still be loading its own list: what must not exist is a search.
        expect(JSON.stringify(vi.mocked(request).mock.calls)).not.toContain("andina");
    });

    it("forgets the projects of the account at sign-out", async () => {
        renderAt("/terrenos");
        await screen.findByRole("navigation", { name: "Migas de pan" });
        rememberProjects([project]);

        const known = renderHook(() => useKnownProjects());

        expect(known.result.current).toHaveLength(1);

        await userEvent.click(screen.getAllByRole("button", { name: "Cerrar sesión" })[0]);

        await waitFor(() => expect(known.result.current).toEqual([]));
    });

    it("opens the list of shortcuts with «?», and not while writing", async () => {
        renderAt("/terrenos");
        await screen.findByRole("navigation", { name: "Migas de pan" });

        await userEvent.click(screen.getByRole("searchbox", { name: "Buscar proyectos" }));
        await userEvent.keyboard("?");
        expect(screen.queryByRole("dialog", { name: "Atajos de teclado" })).not.toBeInTheDocument();

        await userEvent.click(document.body);
        (document.activeElement as HTMLElement | null)?.blur();
        await userEvent.keyboard("?");

        const help = await screen.findByRole("dialog", { name: "Atajos de teclado" });

        expect(help).toHaveTextContent("Abrir la paleta de comandos");
        expect(help).toHaveTextContent("Vista isométrica");
    });
});

describe("App routing", () => {
    it("opens a project on the tab named in the address", async () => {
        renderAt("/proyectos/7/materiales");

        expect(await screen.findByRole("heading", { name: "Casa Andina" })).toBeInTheDocument();
        const tabs = screen.getByRole("navigation", { name: "Secciones del proyecto" });

        expect(within(tabs).getByRole("button", { name: "Materiales" })).toHaveAttribute(
            "aria-current",
            "page",
        );
    });

    it("moves the address with the navigation and comes back with the back button", async () => {
        renderAt("/");

        await userEvent.click(await screen.findByRole("button", { name: "Terrenos" }));
        expect(screen.getByTestId("path")).toHaveTextContent("/terrenos");
        expect(trail()).toHaveTextContent("InicioTerrenos");

        act(() => void navigate(-1));

        expect(screen.getByTestId("path")).toHaveTextContent("/");
        expect(trail()).toHaveTextContent("Inicio");
        expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent("Hola");
    });

    it("opens the edit form of a project from «Editar» on the dashboard", async () => {
        const answer = vi.mocked(request).getMockImplementation();

        vi.mocked(request).mockImplementation((path: string, options) =>
            path === "/projects" ? Promise.resolve([project]) : answer!(path, options),
        );
        renderAt("/");

        await userEvent.click(await screen.findByTitle("Acciones de Casa Andina"));
        await userEvent.click(screen.getByRole("button", { name: "Editar" }));

        expect(await screen.findByRole("heading", { name: "Editar proyecto" })).toBeInTheDocument();
        expect(screen.getByTestId("path")).toHaveTextContent("/proyectos/7/resumen");
    });

    it("puts the open tab of a project in the address", async () => {
        renderAt("/proyectos/7/materiales");

        await userEvent.click(await screen.findByRole("button", { name: "Archivos" }));

        expect(screen.getByTestId("path")).toHaveTextContent("/proyectos/7/archivos");
    });

    it("asks to sign in without losing the address and returns to it afterwards", async () => {
        signedIn = false;
        renderAt("/configuracion");

        await userEvent.type(await screen.findByLabelText("Correo"), "ana@example.com");
        await userEvent.type(screen.getByLabelText("Contraseña"), "correct-horse");
        await userEvent.click(screen.getByRole("button", { name: "Entrar" }));

        expect(await screen.findByRole("navigation", { name: "Migas de pan" })).toHaveTextContent(
            "Configuración",
        );
        expect(screen.getByTestId("path")).toHaveTextContent("/configuracion");
    });

    it("takes «Crear un proyecto» of the palette to the form, with the cursor in its name", async () => {
        renderAt("/terrenos");
        await screen.findByRole("navigation", { name: "Migas de pan" });

        await userEvent.keyboard("{Control>}k{/Control}");
        await userEvent.click(await screen.findByRole("option", { name: "Crear un proyecto" }));

        expect(screen.getByTestId("path")).toHaveTextContent("/proyectos");
        expect(await screen.findByLabelText("Nombre")).toHaveFocus();
    });

    it("says when the API cannot be reached and asks for the session again", async () => {
        let reachable = false;

        vi.mocked(request).mockImplementation((path: string) => {
            if (path === "/auth/me") {
                return reachable
                    ? Promise.resolve(user)
                    : Promise.reject(new Error("Failed to fetch"));
            }

            return Promise.resolve(path === "/summary" ? summary : []);
        });
        renderAt("/");

        expect(
            await screen.findByRole("heading", { name: "No se pudo conectar con ARQUILA" }),
        ).toBeInTheDocument();
        expect(screen.getByText(/No se pudo conectar con el servidor/)).toBeInTheDocument();

        reachable = true;
        await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));

        expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent("Hola");
    });

    it("says so when the address is not a screen of the app", async () => {
        renderAt("/no-existe");

        expect(
            await screen.findByRole("heading", { level: 1, name: "Página no encontrada" }),
        ).toBeInTheDocument();
    });

    it("gives every screen one level-one heading, and the project its own", async () => {
        renderAt("/proyectos/7/materiales");

        expect(
            await screen.findByRole("heading", { level: 1, name: "Casa Andina" }),
        ).toBeInTheDocument();
        expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    });

    it("rewrites the old address of the 3D model", async () => {
        renderAt("/proyectos/7/modelo");

        expect(await screen.findByRole("heading", { name: "Casa Andina" })).toBeInTheDocument();
        expect(screen.getByTestId("path")).toHaveTextContent("/proyectos/7/modelo-3d");
    });

    it("shows where a project tab sits and goes back through the breadcrumbs", async () => {
        renderAt("/proyectos/7/materiales");

        const trail = await screen.findByRole("navigation", { name: "Migas de pan" });

        expect(trail).toHaveTextContent("ProyectosCasa AndinaMateriales");

        await userEvent.click(within(trail).getByRole("link", { name: "Proyectos" }));

        expect(screen.getByTestId("path")).toHaveTextContent("/proyectos");
    });

    it("opens the command palette with Ctrl+K and jumps to a screen from it", async () => {
        renderAt("/");

        await screen.findByRole("button", { name: "Terrenos" });
        await userEvent.keyboard("{Control>}k{/Control}");

        await userEvent.type(screen.getByRole("combobox"), "config{Enter}");

        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        expect(screen.getByTestId("path")).toHaveTextContent("/configuracion");
    });
});
