import { BoxGeometry, LineSegments, Mesh, MeshStandardMaterial } from "three";
import { describe, expect, it, vi } from "vitest";

import { disposeObject } from "../dispose";
import { createResources } from "../engine/resources";
import { createSceneContents } from "./contents";
import type { ElementMesh } from "./elements";
import { createRenderModes } from "./renderMode";
import { SCENE_PALETTES } from "../lightingPalette";

function element(): ElementMesh {
    return new Mesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial());
}

describe("render modes", () => {
    it("draw the wireframe over each element only in the wireframe mode", () => {
        const contents = createSceneContents(SCENE_PALETTES.dark);
        const modes = createRenderModes(contents, createResources(), []);
        const mesh = element();

        contents.elements = [mesh];
        modes.sync();
        expect(mesh.children).toHaveLength(0);

        contents.renderMode = "wireframe";
        modes.sync();
        const wire = mesh.children[0];
        expect(wire).toBeInstanceOf(LineSegments);
        expect(wire.visible).toBe(true);

        contents.renderMode = "solid";
        modes.sync();
        expect(mesh.children).toEqual([wire]);
        expect(wire.visible).toBe(false);
    });

    it("free the wires with their element and the shared material with the engine", () => {
        const contents = createSceneContents(SCENE_PALETTES.dark);
        const resources = createResources();
        const modes = createRenderModes(contents, resources, []);
        const mesh = element();

        contents.elements = [mesh];
        contents.renderMode = "wireframe";
        modes.sync();

        const wire = mesh.children[0] as LineSegments;
        const geometry = vi.spyOn(wire.geometry, "dispose");
        const material = vi.spyOn(wire.material as MeshStandardMaterial, "dispose");

        disposeObject(mesh);
        expect(geometry).toHaveBeenCalled();
        expect(material).not.toHaveBeenCalled();

        resources.disposeAll();
        expect(material).toHaveBeenCalled();
        expect(resources.count()).toBe(0);
    });

    it("are never what a click picks", () => {
        const contents = createSceneContents(SCENE_PALETTES.dark);
        const modes = createRenderModes(contents, createResources(), []);
        const mesh = element();

        contents.elements = [mesh];
        contents.renderMode = "wireframe";
        modes.sync();

        const hits: unknown[] = [];
        mesh.children[0].raycast({} as never, hits as never);
        expect(hits).toEqual([]);
    });
});
