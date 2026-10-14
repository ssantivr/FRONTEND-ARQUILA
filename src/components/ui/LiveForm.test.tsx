import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { LiveForm } from "./LiveForm";

function setup() {
    const onSubmit = vi.fn((event: { preventDefault: () => void }) => event.preventDefault());

    render(
        <LiveForm onSubmit={onSubmit}>
            <label>
                Nombre
                <input required maxLength={160} />
            </label>
            <label>
                Correo
                <input type="email" />
            </label>
            <label>
                Área
                <input type="number" min="0.01" step="0.01" />
            </label>
            <label>
                Suelo
                <select required defaultValue="">
                    <option value="">Sin elegir</option>
                    <option value="roca">Roca</option>
                </select>
            </label>
            <button type="submit">Guardar</button>
        </LiveForm>,
    );

    return onSubmit;
}

describe("LiveForm", () => {
    it("says nothing while a field has not been used", async () => {
        setup();

        await userEvent.tab();
        await userEvent.tab();

        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("checks a field when the user leaves it and clears the message once it is right", async () => {
        setup();
        const email = screen.getByRole("textbox", { name: /Correo/ });

        await userEvent.type(email, "ana@");
        await userEvent.tab();

        expect(screen.getByRole("alert")).toHaveTextContent(
            "Escribe el correo completo, como nombre@ejemplo.com.",
        );
        expect(email).toBeInvalid();
        expect(email).toHaveAttribute("aria-errormessage", screen.getByRole("alert").id);

        await userEvent.type(email, "example.com");

        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
        expect(email).not.toHaveAttribute("aria-invalid");
    });

    it("explains a number below the minimum in the user's own notation", async () => {
        setup();
        const area = screen.getByRole("spinbutton", { name: /Área/ });

        await userEvent.type(area, "0");
        await userEvent.tab();

        expect(screen.getByRole("alert")).toHaveTextContent(
            "El valor más bajo que se admite es 0,01.",
        );
    });

    it("stops the sending, marks every wrong field and goes to the first", async () => {
        const onSubmit = setup();

        await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

        expect(onSubmit).not.toHaveBeenCalled();
        expect(screen.getAllByRole("alert").map((alert) => alert.textContent)).toEqual([
            "Este dato es obligatorio.",
            "Elige una opción.",
        ]);
        expect(screen.getByRole("textbox", { name: /Nombre/ })).toHaveFocus();
    });

    it("sends once everything is right", async () => {
        const onSubmit = setup();

        await userEvent.type(screen.getByRole("textbox", { name: /Nombre/ }), "Lote esquinero");
        await userEvent.selectOptions(screen.getByRole("combobox", { name: /Suelo/ }), "roca");
        await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

        expect(onSubmit).toHaveBeenCalledTimes(1);
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("shows a rule of the screen set with setCustomValidity", async () => {
        setup();
        const name = screen.getByRole<HTMLInputElement>("textbox", { name: /Nombre/ });

        await userEvent.type(name, "Lote");
        name.setCustomValidity("Ya hay un terreno con ese nombre.");
        fireEvent.blur(name);

        expect(screen.getByRole("alert")).toHaveTextContent("Ya hay un terreno con ese nombre.");
    });

    it("drops a message about a value the screen itself replaced", async () => {
        function Editable() {
            const [name, setName] = useState("");

            return (
                <LiveForm onSubmit={(event) => event.preventDefault()}>
                    <label>
                        Correo
                        <input
                            type="email"
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                        />
                    </label>
                    <button type="button" onClick={() => setName("")}>
                        Cancelar
                    </button>
                    {/* Only somewhere to move to: jsdom cannot open another page. */}
                    <a href="/otra" onClick={(event) => event.preventDefault()}>
                        Otra parte
                    </a>
                </LiveForm>
            );
        }

        render(<Editable />);
        const email = screen.getByRole("textbox", { name: /Correo/ });

        await userEvent.type(email, "ana@");
        await userEvent.click(screen.getByRole("link", { name: "Otra parte" }));

        expect(screen.getByRole("alert")).toBeInTheDocument();
        expect(email).toHaveAccessibleDescription(
            "Escribe el correo completo, como nombre@ejemplo.com.",
        );

        await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
        expect(email).not.toHaveAttribute("aria-invalid");
        expect(email).not.toHaveAttribute("aria-describedby");
    });

    it("does not judge a field when the user goes from it straight to a button of the form", async () => {
        render(
            <LiveForm onSubmit={(event) => event.preventDefault()}>
                <label>
                    Correo
                    <input type="email" />
                </label>
                <button type="button">Cancelar</button>
            </LiveForm>,
        );

        await userEvent.type(screen.getByRole("textbox", { name: /Correo/ }), "ana@");
        await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
});
