import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { setThemePreference } from "../state/theme";
import { TopBar } from "./TopBar";

vi.mock("../services/api", () => ({
    projectsApi: { list: vi.fn().mockResolvedValue([]) },
}));

function renderBar(overrides: Partial<Parameters<typeof TopBar>[0]> = {}) {
    const props = {
        eyebrow: "ARQUILA",
        title: "Terrenos",
        user: { name: "Ana Torres", email: "ana@example.com" },
        onOpenProject: vi.fn(),
        onOpenCommands: vi.fn(),
        onCreateProject: vi.fn(),
        createIsSecondary: false,
        onOpenSettings: vi.fn(),
        onLogout: vi.fn(),
        onSlot: vi.fn(),
        ...overrides,
    };

    render(<TopBar {...props} />);

    return props;
}

afterEach(() => setThemePreference("auto"));

describe("TopBar", () => {
    it("says where you are with the only level-one heading", () => {
        renderBar();

        expect(screen.getByRole("heading", { level: 1, name: "Terrenos" })).toBeInTheDocument();
        expect(screen.getByRole("searchbox", { name: "Buscar proyectos" })).toBeInTheDocument();
    });

    it("offers the three themes and applies the one chosen at once", async () => {
        renderBar();

        const themes = screen.getByRole("radiogroup", { name: "Tema" });

        expect(within(themes).getAllByRole("radio")).toHaveLength(3);

        await userEvent.click(within(themes).getByRole("radio", { name: "Tema oscuro" }));
        expect(document.documentElement.dataset.theme).toBe("dark");
        expect(within(themes).getByRole("radio", { name: "Tema oscuro" })).toBeChecked();

        await userEvent.click(within(themes).getByRole("radio", { name: "Tema claro" }));
        expect(document.documentElement.dataset.theme).toBe("light");
    });

    it("keeps «Nuevo proyecto» as the lime action except on the projects screen", () => {
        const props = renderBar();

        const create = screen.getByRole("button", { name: "Nuevo proyecto" });

        expect(create).toHaveClass("button-lime");
        create.click();
        expect(props.onCreateProject).toHaveBeenCalledTimes(1);
    });

    it("opens the account menu with who is signed in, the settings and sign-out", async () => {
        const props = renderBar();

        // The visible name is part of the accessible name of the trigger (WCAG 2.5.3).
        await userEvent.click(screen.getByText("Ana Torres", { selector: "span" }));

        const menu = screen.getByRole("group", { name: "Ana Torres: cuenta y sesión" });

        expect(menu).toHaveTextContent("ana@example.com");

        await userEvent.click(within(menu).getByRole("button", { name: "Cuenta y configuración" }));
        expect(props.onOpenSettings).toHaveBeenCalledTimes(1);

        await userEvent.click(screen.getByText("Ana Torres", { selector: "span" }));
        await userEvent.click(within(menu).getByRole("button", { name: "Cerrar sesión" }));
        expect(props.onLogout).toHaveBeenCalledTimes(1);
    });

    it("hands the open screen a place for its own controls", () => {
        const props = renderBar();

        expect(props.onSlot).toHaveBeenCalledWith(expect.any(HTMLDivElement));
    });
});
