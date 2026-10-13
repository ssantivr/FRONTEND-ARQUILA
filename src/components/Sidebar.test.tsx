import { render, screen, within } from "@testing-library/react";
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
});
