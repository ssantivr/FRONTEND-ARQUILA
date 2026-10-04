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

        expect(screen.getByRole("button", { name: "Materiales" })).toHaveAttribute(
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
});
