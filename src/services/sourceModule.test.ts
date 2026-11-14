import { describe, expect, it } from "vitest";

import { sourceModuleOf } from "./sourceModule";

describe("sourceModuleOf", () => {
    it("names the module of a project section", () => {
        expect(sourceModuleOf("/proyectos/7/modelo-3d")).toBe("viewer");
        expect(sourceModuleOf("/proyectos/7/planos")).toBe("plans");
        expect(sourceModuleOf("/proyectos/7/archivos")).toBe("files");
        expect(sourceModuleOf("/proyectos/7/versiones")).toBe("versions");
        expect(sourceModuleOf("/proyectos/7/historial")).toBe("history");
    });

    it("names the module of a top-level screen", () => {
        expect(sourceModuleOf("/")).toBe("home");
        expect(sourceModuleOf("/recorrido")).toBe("viewer");
    });

    it("gives null outside of any module", () => {
        expect(sourceModuleOf("/no-existe")).toBeNull();
    });
});
