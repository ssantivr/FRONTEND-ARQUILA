import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { SOURCE_MODULES, sourceModuleOf } from "./sourceModule";

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

describe("SOURCE_MODULES", () => {
    it("matches the contract in docs/DECISIONS.md (H4), shared with the backend", () => {
        const text = readFileSync(join(process.cwd(), "docs/DECISIONS.md"), "utf8");
        const section = text.split("### H4 · Source modules")[1].split("\n### ")[0];
        const line = section.split(/\r?\n/).find((row) => row.startsWith("Modules:")) ?? "";
        const contract = [...line.matchAll(/`([a-z]+)`/g)].map((match) => match[1]);

        expect(contract).toHaveLength(18);
        expect([...SOURCE_MODULES].sort()).toEqual([...contract].sort());
    });
});
