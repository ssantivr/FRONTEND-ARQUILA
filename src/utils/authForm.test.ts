import { describe, expect, it } from "vitest";

import { checkEmail, checkName, checkPassword, checkRepeated } from "./authForm";

describe("rules of the sign-in forms", () => {
    it("ask for a complete e-mail, as the backend does", () => {
        expect(checkEmail("")).toBe("Escribe tu correo.");
        expect(checkEmail("ana@")).toBe("Escribe el correo completo, como nombre@ejemplo.com.");
        // The backend wants a dot after the at sign: «ana@localhost» would be refused there.
        expect(checkEmail("ana@localhost")).not.toBeNull();
        expect(checkEmail("  ana@estudio.co  ")).toBeNull();
        expect(checkEmail(`${"a".repeat(251)}@b.co`)).toMatch(/como máximo 255/);
    });

    it("need a name that is not only spaces", () => {
        expect(checkName("   ")).toBe("Escribe tu nombre.");
        expect(checkName("Ana")).toBeNull();
        expect(checkName("a".repeat(121))).toMatch(/como máximo 120/);
    });

    it("ask eight characters of a new password, and none of one already chosen", () => {
        expect(checkPassword("corta", true)).toBe("Usa al menos 8 caracteres.");
        expect(checkPassword("corta", false)).toBeNull();
        expect(checkPassword("", false)).toBe("Escribe tu contraseña.");
        expect(checkPassword("x".repeat(129), false)).toMatch(/como máximo 128/);
    });

    it("compare the repeated password", () => {
        expect(checkRepeated("", "correct-horse")).toBe("Escribe la contraseña otra vez.");
        expect(checkRepeated("correct-hors", "correct-horse")).toBe(
            "Las dos contraseñas no coinciden.",
        );
        expect(checkRepeated("correct-horse", "correct-horse")).toBeNull();
    });
});
