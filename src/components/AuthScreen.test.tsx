import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AuthScreen } from "./AuthScreen";

describe("AuthScreen", () => {
    it("puts the form first in the page, before the picture and the claim", () => {
        render(
            <AuthScreen>
                <form aria-label="Formulario de muestra" />
            </AuthScreen>,
        );

        const form = screen.getByRole("form", { name: "Formulario de muestra" });
        const claim = screen.getByRole("heading", {
            name: "Diseña, organiza y visualiza tu arquitectura.",
        });

        expect(form.compareDocumentPosition(claim) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it("says the picture is a sample model, not a project of the user", () => {
        render(
            <AuthScreen>
                <p>Formulario</p>
            </AuthScreen>,
        );

        expect(screen.getByRole("img", { name: /Modelo de muestra/ })).toBeInTheDocument();
        expect(screen.getByText("Modelo de muestra · visor 3D")).toBeInTheDocument();
    });

    it("lets the theme be chosen before signing in", () => {
        render(
            <AuthScreen>
                <p>Formulario</p>
            </AuthScreen>,
        );

        expect(screen.getAllByRole("radio")).toHaveLength(3);
    });
});
