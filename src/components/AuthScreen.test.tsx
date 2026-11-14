import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { AuthScreen } from "./AuthScreen";

function renderScreen() {
    return render(
        <AuthScreen>
            <form aria-label="Formulario de muestra">
                <input aria-label="Correo electrónico" />
            </form>
        </AuthScreen>,
    );
}

describe("AuthScreen", () => {
    it("puts the form first in the page, before the showcase and its claim", () => {
        renderScreen();

        const form = screen.getByRole("form", { name: "Formulario de muestra" });
        const claim = screen.getByRole("heading", {
            name: "Construye tus ideas. Visualiza el futuro.",
        });

        expect(form.compareDocumentPosition(claim) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it("is always in the dark theme of ARQUILA", () => {
        renderScreen();

        expect(screen.getByRole("main")).toHaveAttribute("data-theme", "dark");
    });

    it("shows the new logo with its slogan and the security note", () => {
        renderScreen();

        expect(screen.getByText("ARQUILA")).toBeInTheDocument();
        expect(screen.getByText("Diseña · Visualiza · Construye")).toBeInTheDocument();
        expect(screen.getByText("Tu información está segura con ARQUILA")).toBeInTheDocument();
    });

    it("names the three pillars, and the photograph is decoration", () => {
        const { container } = renderScreen();

        for (const pillar of ["Modelo 3D avanzado", "IA arquitectónica", "Gestión integral"]) {
            expect(screen.getByText(pillar)).toBeInTheDocument();
        }

        expect(container.querySelector("img")).toHaveAttribute("alt", "");
    });

    it("takes the user to the form from «Acceder»", async () => {
        renderScreen();

        await userEvent.click(screen.getByRole("button", { name: "Acceder" }));

        expect(screen.getByLabelText("Correo electrónico")).toHaveFocus();
    });
});
