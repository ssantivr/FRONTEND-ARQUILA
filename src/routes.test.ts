import { describe, expect, it } from "vitest";

import { canonicalPath, parsePath, projectPath, viewPath } from "./routes";

describe("routes", () => {
    it("gives every screen its own address and reads it back", () => {
        expect(viewPath("home")).toBe("/");
        expect(parsePath("/")).toEqual({ kind: "view", view: "home" });
        expect(parsePath(viewPath("materials"))).toEqual({ kind: "view", view: "materials" });
        expect(parsePath("/configuracion/")).toEqual({ kind: "view", view: "settings" });
    });

    it("links to a project and to one of its tabs", () => {
        expect(projectPath(7, "model")).toBe("/proyectos/7/modelo-3d");
        expect(parsePath("/proyectos/7/modelo-3d")).toEqual({
            kind: "project",
            id: 7,
            section: "model",
        });
        expect(parsePath("/proyectos/7/modelo")).toEqual({
            kind: "project",
            id: 7,
            section: "model",
        });
        // A project opens on its summary.
        expect(projectPath(7)).toBe("/proyectos/7/resumen");
        expect(parsePath("/proyectos/7")).toEqual({ kind: "project", id: 7, section: "summary" });
    });

    it("gives the tasks, versions and history of a project their own address", () => {
        expect(projectPath(7, "tasks")).toBe("/proyectos/7/tareas");
        expect(projectPath(7, "versions")).toBe("/proyectos/7/versiones");
        expect(projectPath(7, "activity")).toBe("/proyectos/7/historial");
        expect(parsePath("/proyectos/7/historial")).toEqual({
            kind: "project",
            id: 7,
            section: "activity",
        });
    });

    it("rewrites the old address of the 3D model and leaves the others alone", () => {
        expect(canonicalPath("/proyectos/7/modelo")).toBe("/proyectos/7/modelo-3d");
        expect(canonicalPath("/proyectos/7/modelo/")).toBe("/proyectos/7/modelo-3d");
        expect(canonicalPath("/proyectos/7/modelo-3d")).toBeNull();
        expect(canonicalPath("/proyectos/7")).toBeNull();
        expect(canonicalPath("/terrenos")).toBeNull();
        expect(canonicalPath("/no-existe")).toBeNull();
    });

    it("does not guess when the address is not one of the app's", () => {
        expect(parsePath("/proyectos/abc")).toEqual({ kind: "unknown" });
        expect(parsePath("/proyectos/7/inventada")).toEqual({ kind: "unknown" });
        expect(parsePath("/proyectos/7/modelo/extra")).toEqual({ kind: "unknown" });
        expect(parsePath("/no-existe")).toEqual({ kind: "unknown" });
        expect(parsePath("/proyectos/7/constructor")).toEqual({ kind: "unknown" });
        expect(parsePath("/proyectos/7/toString")).toEqual({ kind: "unknown" });
        expect(canonicalPath("/proyectos/7/__proto__")).toBeNull();
    });
});
