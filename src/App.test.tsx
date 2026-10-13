import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation, useNavigate, type NavigateFunction } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "./App";
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
    status: "active",
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

describe("App routing", () => {
    it("opens a project on the tab named in the address", async () => {
        renderAt("/proyectos/7/materiales");

        expect(await screen.findByRole("heading", { name: "Casa Andina" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Materiales", current: "page" })).toHaveClass(
            "tab",
        );
    });

    it("moves the address with the navigation and comes back with the back button", async () => {
        renderAt("/");

        await userEvent.click(await screen.findByRole("button", { name: "Terrenos" }));
        expect(screen.getByTestId("path")).toHaveTextContent("/terrenos");
        expect(screen.getByRole("heading", { level: 1, name: "Terrenos" })).toBeInTheDocument();

        act(() => void navigate(-1));

        expect(screen.getByTestId("path")).toHaveTextContent("/");
        expect(screen.getByRole("heading", { level: 1, name: "Inicio" })).toBeInTheDocument();
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

        expect(
            await screen.findByRole("heading", { level: 1, name: "Configuración" }),
        ).toBeInTheDocument();
        expect(screen.getByTestId("path")).toHaveTextContent("/configuracion");
    });

    it("takes Nuevo proyecto to the creation form with the cursor in its name", async () => {
        renderAt("/terrenos");

        await userEvent.click(await screen.findByRole("button", { name: "Nuevo proyecto" }));

        expect(screen.getByTestId("path")).toHaveTextContent("/proyectos");
        expect(await screen.findByLabelText("Nombre")).toHaveFocus();
    });

    it("says so when the address is not a screen of the app", async () => {
        renderAt("/no-existe");

        expect(
            await screen.findByRole("heading", { name: "Página no encontrada" }),
        ).toBeInTheDocument();
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

        await userEvent.click(within(trail).getByRole("button", { name: "Proyectos" }));

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
