import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { MODULES, Sidebar } from "./Sidebar";

describe("Sidebar", () => {
    it("lists every module inside a labelled navigation", () => {
        render(<Sidebar current="home" onNavigate={() => undefined} />);

        const navigation = screen.getByRole("navigation", { name: "Navegación principal" });
        const buttons = within(navigation).getAllByRole("button");

        expect(buttons.map((button) => button.textContent)).toEqual(
            MODULES.map((module) => module.label),
        );
    });

    it("marks only the current module", () => {
        render(<Sidebar current="materials" onNavigate={() => undefined} />);

        expect(screen.getByRole("button", { name: "Biblioteca de materiales" })).toHaveAttribute(
            "aria-current",
            "page",
        );
        expect(screen.getByRole("button", { name: "Inicio" })).not.toHaveAttribute("aria-current");
    });

    it("navigates with a click", async () => {
        const onNavigate = vi.fn();

        render(<Sidebar current="home" onNavigate={onNavigate} />);
        await userEvent.click(screen.getByRole("button", { name: "Terrenos" }));

        expect(onNavigate).toHaveBeenCalledWith("terrains");
    });

    it("navigates with the keyboard alone", async () => {
        const onNavigate = vi.fn();
        const user = userEvent.setup();

        render(<Sidebar current="home" onNavigate={onNavigate} />);

        await user.tab();
        expect(screen.getByRole("button", { name: "Inicio" })).toHaveFocus();

        await user.tab();
        expect(screen.getByRole("button", { name: "Proyectos" })).toHaveFocus();

        await user.keyboard("{Enter}");
        expect(onNavigate).toHaveBeenCalledWith("projects");
    });

    it("offers the account, sign-out and a toggle when the shell provides them", async () => {
        const onToggle = vi.fn();
        const onLogout = vi.fn();

        render(
            <Sidebar
                current="home"
                onNavigate={() => undefined}
                onToggle={onToggle}
                onLogout={onLogout}
                user={{ name: "Ana Torres", email: "ana@example.com" }}
            />,
        );

        expect(screen.getByText("ana@example.com")).toBeInTheDocument();

        await userEvent.click(screen.getByRole("button", { name: "Contraer el menú" }));
        await userEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));

        expect(onToggle).toHaveBeenCalledTimes(1);
        expect(onLogout).toHaveBeenCalledTimes(1);
    });

    it("moves between the modules with the arrows, wrapping at the ends", async () => {
        const user = userEvent.setup();

        render(<Sidebar current="home" onNavigate={() => undefined} />);

        screen.getByRole("button", { name: "Inicio" }).focus();
        await user.keyboard("{ArrowDown}");
        expect(screen.getByRole("button", { name: "Proyectos" })).toHaveFocus();

        await user.keyboard("{ArrowUp}{ArrowUp}");
        expect(screen.getByRole("button", { name: "Configuración" })).toHaveFocus();

        await user.keyboard("{Home}");
        expect(screen.getByRole("button", { name: "Inicio" })).toHaveFocus();
    });

    it("shows the name of a module beside its icon when collapsed, and Escape hides it", async () => {
        const user = userEvent.setup();
        const { container } = render(
            <Sidebar current="home" onNavigate={() => undefined} collapsed />,
        );

        act(() => screen.getByRole("button", { name: "Terrenos" }).focus());
        expect(container.querySelector("[data-sidebar-tip]")).toHaveTextContent("Terrenos");

        await user.keyboard("{Escape}");
        expect(container.querySelector("[data-sidebar-tip]")).toBeNull();
    });

    it("shows no names beside the icons while the labels are in view", () => {
        const { container } = render(<Sidebar current="home" onNavigate={() => undefined} />);

        act(() => screen.getByRole("button", { name: "Terrenos" }).focus());

        expect(container.querySelector("[data-sidebar-tip]")).toBeNull();
    });

    it("names the toggle after what it will do once collapsed", () => {
        render(
            <Sidebar
                current="home"
                onNavigate={() => undefined}
                collapsed
                onToggle={() => undefined}
            />,
        );

        expect(screen.getByRole("button", { name: "Expandir el menú" })).toHaveAttribute(
            "aria-expanded",
            "false",
        );
    });

    it("names the brand and keeps every module named while only the icons show", () => {
        render(<Sidebar current="home" onNavigate={() => undefined} collapsed />);

        expect(screen.getByText("ARQUILA")).toBeInTheDocument();

        for (const module of MODULES) {
            expect(screen.getByRole("button", { name: module.label })).toBeInTheDocument();
        }
    });
});
