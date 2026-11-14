import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

function sources(directory: string): string[] {
    return readdirSync(directory).flatMap((name) => {
        const path = join(directory, name);

        if (statSync(path).isDirectory()) {
            return sources(path);
        }

        return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
    });
}

describe("one 3D engine for every module (master model rule)", () => {
    const files = sources("src").map((path) => ({
        name: relative("src", path).split("\\").join("/"),
        code: readFileSync(path, "utf8"),
    }));

    it("creates the WebGL renderer only in ExperienceEngine", () => {
        const creators = files
            .filter((file) => /new\s+(?:THREE\.)?WebGLRenderer\s*\(/.test(file.code))
            .map((file) => file.name);

        expect(creators).toEqual(["three/engine/ExperienceEngine.ts"]);
    });

    it("builds the scene of a project only through the structure viewer", () => {
        const builders = files
            .filter((file) => /createStructureViewer\s*\(/.test(file.code))
            .map((file) => file.name)
            .filter((name) => name !== "three/BuildingSceneManager.ts");

        expect(builders).toEqual(["components/StructureViewer.tsx"]);
    });
});
