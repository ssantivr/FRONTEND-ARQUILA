import { describe, expect, it } from "vitest";

import { translateError } from "./errors";

describe("translateError", () => {
    it("translates known backend messages", () => {
        expect(translateError("Project already has a material with this name")).toBe(
            "El proyecto ya tiene un material con ese nombre.",
        );
        expect(translateError("Invalid email or password")).toBe(
            "Correo o contraseña incorrectos.",
        );
    });

    it("translates messages that carry a value", () => {
        expect(translateError('Cannot restore "Clay brick": it conflicts with existing data')).toBe(
            "No se puede restaurar «Clay brick»: ya existe un registro que entra en conflicto.",
        );
        expect(translateError('Cannot restore "Cocina": its plan no longer exists')).toBe(
            "No se puede restaurar «Cocina»: su plano ya no existe.",
        );
        expect(translateError("File exceeds the 20 MB limit")).toBe(
            "El archivo supera el límite de 20 MB.",
        );
    });

    it("leaves unknown messages untouched", () => {
        expect(translateError("area_m2: Input should be greater than 0")).toBe(
            "area_m2: Input should be greater than 0",
        );
    });
});
