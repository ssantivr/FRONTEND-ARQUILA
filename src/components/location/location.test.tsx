import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderWithModals } from "../../test/render";
import { LocationField } from "./LocationField";
import { parseCoordinate, positionOf, type Place } from "./place";

vi.mock("./MapCanvas", () => ({ default: () => null }));

async function openPicker(value: Place = { label: "", position: null }) {
    const onChange = vi.fn();
    const onSubmit = vi.fn((event: { preventDefault: () => void }) => event.preventDefault());

    renderWithModals(
        <form onSubmit={onSubmit}>
            <LocationField value={value} onChange={onChange} />
        </form>,
    );
    await userEvent.click(screen.getByRole("button", { name: /Ubicación/ }));

    return { onChange, onSubmit };
}

describe("parseCoordinate", () => {
    it.each([
        ["-0.22", 90, -0.22],
        ["-78,5125", 180, -78.5125],
        ["90", 90, 90],
    ] as const)("reads %s", (text, limit, expected) => {
        expect(parseCoordinate(text, limit)).toBe(expected);
    });

    it.each([
        ["90.1", 90],
        ["-180.5", 180],
        ["", 90],
        ["4 norte", 90],
        ["1e2", 180],
    ] as const)("rejects %j", (text, limit) => {
        expect(parseCoordinate(text, limit)).toBeUndefined();
    });

    it("has no position without both coordinates", () => {
        expect(positionOf({ latitude: 1, longitude: null })).toBeNull();
        expect(positionOf({})).toBeNull();
    });
});

describe("LocationField", () => {
    it("saves typed coordinates when the map is not used", async () => {
        const { onChange } = await openPicker();

        await userEvent.type(await screen.findByLabelText("Latitud"), "-0.22");
        await userEvent.type(screen.getByLabelText("Longitud"), "-78.5125");
        await userEvent.click(screen.getByRole("button", { name: "Guardar ubicación" }));

        expect(onChange).toHaveBeenCalledWith({
            label: "",
            position: { latitude: -0.22, longitude: -78.5125, zoom: 15 },
        });
    });

    it("shows the saved marker when it opens again", async () => {
        await openPicker({
            label: "Quito",
            position: { latitude: -0.22, longitude: -78.5125, zoom: 13 },
        });

        expect(await screen.findByLabelText("Latitud")).toHaveValue("-0.22");
        expect(screen.getByLabelText("Nombre del lugar")).toHaveValue("Quito");
    });

    it("refuses half a position", async () => {
        await openPicker();

        await userEvent.type(await screen.findByLabelText("Latitud"), "4");

        expect(screen.getByRole("button", { name: "Guardar ubicación" })).toBeDisabled();
        expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    it("does not send the form behind it with Enter", async () => {
        const { onSubmit } = await openPicker();

        await userEvent.type(await screen.findByLabelText("Nombre del lugar"), "Pasto{Enter}");

        expect(onSubmit).not.toHaveBeenCalled();
    });
});
