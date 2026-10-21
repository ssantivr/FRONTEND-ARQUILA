import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState, type ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MobileNav } from "./MobileNav";

const user = { name: "Ana Torres", email: "ana@example.com" };

type Props = Omit<ComponentProps<typeof MobileNav>, "menuOpen" | "onMenuChange" | "onOpenSettings">;

/** The app keeps the menu open or closed; here a small owner does it. */
function Nav(props: Props & { onOpenSettings?: () => void }) {
    const [open, setOpen] = useState(false);

    return (
        <MobileNav
            onOpenSettings={() => undefined}
            {...props}
            menuOpen={open}
            onMenuChange={setOpen}
        />
    );
}

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
        render(<Nav current="home" onNavigate={() => undefined} onLogout={vi.fn()} user={user} />);

        expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    });

    it("has the four main modules and «Más», marking the open one", async () => {
        const onNavigate = vi.fn();

        render(<Nav current="plans" onNavigate={onNavigate} onLogout={vi.fn()} user={user} />);

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

    it("opens the menu with every module, the theme and the account from «Más»", async () => {
        const onNavigate = vi.fn();
        const onLogout = vi.fn();

        render(<Nav current="lighting" onNavigate={onNavigate} onLogout={onLogout} user={user} />);

        const more = screen.getByRole("button", { name: "Más" });

        // A module that lives in «Más» lights up «Más» itself.
        expect(more).toHaveAttribute("data-active", "true");

        await userEvent.click(more);

        const sheet = screen.getByRole("dialog", { name: "Menú" });
        const all = within(sheet).getByRole("navigation", { name: "Todos los módulos" });

        expect(within(all).getByRole("button", { name: "Iluminación y clima" })).toHaveAttribute(
            "aria-current",
            "page",
        );
        // The same list as the sidebar, by group, so nothing is only reachable on a wide screen.
        expect(within(all).getByRole("button", { name: "Inicio" })).toBeInTheDocument();
        expect(within(all).getByText("Visualización")).toBeInTheDocument();
        expect(within(sheet).getByRole("radiogroup", { name: "Tema" })).toBeInTheDocument();
        expect(sheet).toHaveTextContent("ana@example.com");

        await userEvent.click(within(all).getByRole("button", { name: "Terrenos" }));
        expect(onNavigate).toHaveBeenCalledWith("terrains");
        // Choosing a module closes the menu.
        expect(screen.queryByRole("dialog", { name: "Menú" })).not.toBeInTheDocument();
    });

    it("reaches the settings and signs out from the menu", async () => {
        const onOpenSettings = vi.fn();
        const onLogout = vi.fn();

        render(
            <Nav
                current="home"
                onNavigate={() => undefined}
                onOpenSettings={onOpenSettings}
                onLogout={onLogout}
                user={user}
            />,
        );

        await userEvent.click(screen.getByRole("button", { name: "Más" }));
        await userEvent.click(screen.getByRole("button", { name: "Cuenta y configuración" }));
        expect(onOpenSettings).toHaveBeenCalledTimes(1);

        await userEvent.click(screen.getByRole("button", { name: "Más" }));
        await userEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));
        expect(onLogout).toHaveBeenCalledTimes(1);
    });
});
