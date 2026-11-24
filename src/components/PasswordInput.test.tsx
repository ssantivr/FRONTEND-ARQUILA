import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { PasswordInput } from "./PasswordInput";

function field(concealed = false) {
    return (
        <PasswordInput
            label="Contraseña"
            value="secret-value"
            onChange={() => undefined}
            autoComplete="current-password"
            concealed={concealed}
        />
    );
}

describe("PasswordInput", () => {
    it("starts hidden, with a button that says what it does", () => {
        render(field());

        expect(screen.getByLabelText("Contraseña")).toHaveAttribute("type", "password");
        const toggle = screen.getByRole("button", { name: "Mostrar contraseña" });
        expect(toggle).toHaveAttribute("aria-pressed", "false");
        expect(toggle).toHaveAttribute("type", "button");
    });

    it("shows and hides the password", async () => {
        render(field());

        await userEvent.click(screen.getByRole("button", { name: "Mostrar contraseña" }));
        expect(screen.getByLabelText("Contraseña")).toHaveAttribute("type", "text");

        await userEvent.click(screen.getByRole("button", { name: "Ocultar contraseña" }));
        expect(screen.getByLabelText("Contraseña")).toHaveAttribute("type", "password");
    });

    it("hides it again when the form is sent", async () => {
        const view = render(field());

        await userEvent.click(screen.getByRole("button", { name: "Mostrar contraseña" }));
        view.rerender(field(true));
        view.rerender(field(false));

        expect(screen.getByLabelText("Contraseña")).toHaveAttribute("type", "password");
    });
});
