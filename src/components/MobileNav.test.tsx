import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MobileNav } from "./MobileNav";

const user = { name: "Ana Torres", email: "ana@example.com" };

function phone(matches: boolean) {
    vi.stubGlobal(
        "matchMedia",
        vi.fn((media: string) => ({
            matches,
            media,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        })),
    );
}

beforeEach(() => phone(true));
afterEach(() => vi.unstubAllGlobals());

describe("MobileNav", () => {
    it("is not drawn on a wide screen, where the sidebar navigates", () => {
        phone(false);
        render(
            <MobileNav
                current="home"
                onNavigate={() => undefined}
                onLogout={vi.fn()}
                user={user}
            />,
        );

        expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    });

    it("has the four main modules and «Más», marking the open one", async () => {
        const onNavigate = vi.fn();

        render(
            <MobileNav current="plans" onNavigate={onNavigate} onLogout={vi.fn()} user={user} />,
        );

        const bar = screen.getByRole("navigation", { name: "Navegación principal (móvil)" });

        expect(
            within(bar)
                .getAllByRole("button")
                .map((button) => button.textContent),
        ).toEqual(["Inicio", "Proyectos", "Planos", "Tareas", "Más"]);
        expect(within(bar).getByRole("button", { name: "Planos" })).toHaveAttribute(
            "aria-current",
            "page",
        );

        await userEvent.click(within(bar).getByRole("button", { name: "Tareas" }));
        expect(onNavigate).toHaveBeenCalledWith("tasks");
    });

    it("opens the other modules, the theme and the account from «Más»", async () => {
        const onNavigate = vi.fn();
        const onLogout = vi.fn();

        render(
            <MobileNav
                current="lighting"
                onNavigate={onNavigate}
                onLogout={onLogout}
                user={user}
            />,
        );

        const more = screen.getByRole("button", { name: "Más" });

        // A module that lives in «Más» lights up «Más» itself.
        expect(more).toHaveAttribute("data-active", "true");

        await userEvent.click(more);

        const sheet = screen.getByRole("dialog", { name: "Más" });
        const others = within(sheet).getByRole("navigation", { name: "Otros módulos" });

        expect(within(others).getByRole("button", { name: "Iluminación y clima" })).toHaveAttribute(
            "aria-current",
            "page",
        );
        expect(within(others).queryByRole("button", { name: "Inicio" })).not.toBeInTheDocument();
        expect(within(sheet).getByRole("radiogroup", { name: "Tema" })).toBeInTheDocument();
        expect(sheet).toHaveTextContent("ana@example.com");

        await userEvent.click(within(others).getByRole("button", { name: "Terrenos" }));
        expect(onNavigate).toHaveBeenCalledWith("terrains");
    });
});
